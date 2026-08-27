// page-factory/path-resolution.ts — resolve the file path for a new entity/
// concept page and build the LLM candidate list shown to dedup prompts.
//
// Extracted from the original page-factory.ts god-class so the slug-vs-LLM
// resolution logic and the LLM candidate-list shape are independently
// testable.
//
// Behavior (v1.24.1 Phase 2 refactor — preserved verbatim):
//   - resolvePagePath: exact-slug fast path → ConflictResolver (same-type
//     slug/alias match) → LLM semantic dedup fallback. Issue #472: matching is
//     scoped to the item's own type throughout — a designator is `(letters,
//     type)`, so the same letters in the opposite folder denote a different
//     thing and are never consulted.
//   - buildPagesListForPrompt: filters out sources/ by default (#234) and
//     polluted basenames (L2); caps at MAX_PAGES=50 with entity/concept
//     bias based on includePaths; emits a "(truncated)" suffix when the cap
//     fires; optionally appends includePaths that aren't already in the
//     list.

import { WIKI_SUBFOLDERS, TOKENS_DEDUP_RESOLUTION, DEDUP_CANDIDATE_TOP_K } from '../../constants';
import { slugify } from '../../core/slug';
import { ConflictResolver } from '../../core/conflict-resolver';
import { selectCandidateWindow } from '../../core/candidate-window';
import { getExistingWikiPages } from '../lint/get-existing-pages';
import { PROMPTS } from '../../prompts';
import { parseJsonResult } from '../../core/json';
import { normalizeLLMPath } from '../../core/prompt-builders';
import { renderTemplate } from '../../core/template-renderer';
import { resolveModelForTask } from '../../core/model-resolver';
import { appendAliases, aliasClaimsFromPages, type AliasesContext } from './aliases';
import { PathResolutionLLMSchema } from '../../llm-sdk/output-schemas';
import { callLlm } from '../../core/llm-dispatch';

/** Page shape consumed by the dedup candidate pre-filter. */
export interface DedupCandidatePage {
  path: string;
  title: string;
  aliases?: string[];
  /** The page's prose, lower-cased — ranks the window by what the page says. */
  text?: string;
}

/**
 * Pre-filter the same-type page list before it is rendered into the
 * semantic dedup prompt: the top-K of the shared candidate window
 * (`core/candidate-window.ts`), ranked on title, aliases AND the page's own
 * prose against the candidate's name and summary.
 *
 * This used to fall back to the FULL same-type list whenever the name shared
 * no token with any title — "recall over cost", on the reasoning that a
 * missed duplicate becomes a duplicate page. Measured, the fallback fired on
 * 61 % of entity candidates (41 % of concepts) at ~40K prompt tokens each,
 * and the model found a synonym's target in that list 0 of 18 times while it
 * found the same targets 9 of 9 times in a 30-entry window that contained
 * them. The list held the target; it did not deliver it. The prose signal is
 * what moves the target into the window: 42 % of hidden-alias trials against
 * 25 % for the name gate, and 7 of 10 synonym cases against 2 of 10.
 */
export function selectDedupCandidates(
  name: string,
  summary: string,
  sameTypePages: DedupCandidatePage[],
): DedupCandidatePage[] {
  return selectCandidateWindow({ name, context: summary }, sameTypePages, DEDUP_CANDIDATE_TOP_K);
}

/** Mirrors the subset of PageCreationResult we return. */
export interface ResolvedPathResult {
  path: string | null;
}

/**
 * Minimal context contract required by `resolvePagePath` and
 * `buildPagesListForPrompt`. Production callers pass the real EngineContext;
 * tests inject a mock with the same shape. Accepts the full `LLMWikiSettings`
 * shape (no index signature) since production callers want type-safe access
 * to other settings (provider, model, etc.).
 */
export interface PathResolutionContext extends AliasesContext {
  app: unknown;
  settings: import('../../types').LLMWikiSettings;
  getClient(): {
    createMessage: (...args: unknown[]) => Promise<string>;
    // v1.26.3 PATCH Issue #443 expanded scope: typed-output path. Optional
    // so legacy clients (Anthropic/OpenAI/Codex) and test mocks without the
    // method still type-check; the call site falls back to createMessage.
    createMessageWithOutput?: (...args: unknown[]) => Promise<{ text: string }>;
  } | null;
  buildSystemPrompt(mode: 'full' | 'compact' | 'merge' | 'index'): Promise<string>;
}

/**
 * Determine the actual file path for a new entity/concept, using slug-based
 * matching first and falling back to LLM semantic resolution.
 *
 * Issue #472: the opposite folder is never consulted. A page there carrying
 * the same letters is a different designator, so it can neither be a merge
 * target nor a reason to withhold this one.
 */
export async function resolvePagePath(
  ctx: PathResolutionContext,
  name: string,
  pageType: 'entity' | 'concept',
  summary: string,
  tags?: string[],
): Promise<ResolvedPathResult> {
  const folder = pageType === 'entity' ? WIKI_SUBFOLDERS.entities : WIKI_SUBFOLDERS.concepts;
  const slug = slugify(name, ctx.settings.slugCase === 'preserve');
  const slugPath = `${ctx.settings.wikiFolder}/${folder}/${slug}.md`;

  // Issue #446: what this call falls back to when it reaches no decision.
  // `slugPath` (create a new page) for the ordinary case; for an ambiguous
  // designator the matching pages demonstrably exist, so a new page is the one
  // answer that is certainly wrong — it is replaced by the top-ranked
  // candidate below, which is also what the pre-#446 code merged into, minus
  // the dependency on vault iteration order.
  let fallbackPath = slugPath;

  // The ambiguous fallback deliberately does NOT latch the designator as an
  // alias on the page it falls back to. The latch is the pre-#446 behaviour of
  // the *decided* merge paths and stays there; on an ambiguous designator it
  // cannot do what it does on a decided match, because ConflictResolver matches
  // over slug keys (`slugMatchKeys`): an alias whose slug the page already
  // carries adds no key, `slugMatches.length > 1` still holds, and the next
  // ingest reaches this same fallback. What it would do is write the designator
  // onto whichever candidate ranked first this time — and onto the next one
  // when the ranking moves — so an unanswered question would spread as a global
  // claim across the candidates. See the ConflictResolver test for the
  // measurement.

  // Fast path: exact slug match (same type folder)
  const existing = await ctx.tryReadFile(slugPath);
  if (existing !== null) {
    // Issue #472: a page in the opposite folder that happens to carry the same
    // letters is a different designator, not a duplicate of this one. It is
    // neither read nor written here — the previous code bridged the two with an
    // alias, which wrote this name into the other type's namespace and made the
    // two pages match each other on every later ingest.
    return { path: slugPath };
  }

  // Fast path 2 + Slow path: share sameTypePages across slug-match and LLM resolution
  try {
    const allPages = await getExistingWikiPages(ctx.app as never, ctx.settings.wikiFolder);

    // Use ConflictResolver for deterministic slug/alias matching before LLM fallback.
    const resolver = new ConflictResolver(ctx.settings.wikiFolder, allPages);
    const cr = resolver.resolve({ name, slug, pageType, tags });

    if (cr.action === 'merge') {
      // f9a680e's cross-page gate, fed for the first time: `allPages` is
      // already in scope, so the name is only appended when no OTHER page's
      // basename or alias claims it — a duplicated claim would silently merge
      // every future occurrence of the name into whichever page matches first.
      await appendAliases(ctx, cr.targetPath, [name], aliasClaimsFromPages(allPages, cr.targetPath));
      return { path: cr.targetPath };
    }

    // Issue #446: more than one same-type page carries this designator. The
    // deterministic gate cannot say which one is meant — tags rank the
    // candidates, they never decide identity — so the question goes to the
    // semantic dedup below with the ranked candidates at the head of the
    // list. Before this, `find` returned whichever page the vault happened to
    // yield first and the ambiguity left no trace.
    const ambiguous = cr.action === 'disambiguate' ? cr.candidates ?? [] : [];
    if (ambiguous.length > 0) {
      fallbackPath = cr.targetPath;
      console.debug(`Entity resolution: ${cr.reason}`);
    }

    const sameTypePages = allPages
      .filter(p => p.path.includes(`/${folder}/`))
      .filter(p => {
        // Purge polluted entries from LLM input (L2)
        const bn = p.title || '';
        return !/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.test(bn);
      })
      // Append-only ordering (ctime ascending): pages created during a run
      // join the rendered list at the END, so consecutive dedup calls keep a
      // byte-identical prefix and a local KV prefix cache can reuse it.
      // Alphabetical or vault-iteration order inserts new pages mid-list and
      // re-pays the prefill from the insertion point. Stable sort: pages
      // without ctime keep their relative order.
      .sort((a, b) => (a.ctime ?? 0) - (b.ctime ?? 0));

    // Same-type slug/alias match is handled above by ConflictResolver.
    // Remaining path: LLM-based semantic dedup for pages that don't match by slug/alias.

    if (sameTypePages.length === 0) return { path: slugPath };

    const selected = selectDedupCandidates(name, summary, sameTypePages);
    // The pages that actually carry the designator lead the list; the lexical
    // pre-filter supplies the rest as context.
    const pagesList = (ambiguous.length > 0
      ? [...ambiguous, ...selected.filter(p => !ambiguous.some(c => c.path === p.path))]
      : selected)
      .map(p => {
        const aliasBlock = p.aliases?.length
          ? `\n  aliases: ${p.aliases.join(', ')}`
          : '';
        return `- path: ${p.path}\n  title: ${p.title}${aliasBlock}`;
      })
      .join('\n');

    const client = ctx.getClient();
    if (!client) return { path: fallbackPath };

    const prompt = renderTemplate(PROMPTS.resolveEntityDedup, {
      wikiFolder: ctx.settings.wikiFolder,
      entity_name: name,
      entity_type: pageType,
      entity_summary: summary.substring(0, 300),
      page_type: pageType,
      existing_pages: pagesList,
    });

    const resolveArgs = {
      task: 'dedup' as const,
      model: resolveModelForTask(ctx.settings, 'ingest'),
      max_tokens: TOKENS_DEDUP_RESOLUTION,
      // Slim selector: the dedup decision is same-type and the matching
      // criteria are fully stated in the user prompt — only the Wiki
      // Structure section is load-bearing here. 'full' (~8.5K chars of
      // templates/naming/maintenance) added pure prefill cost per call.
      system: await ctx.buildSystemPrompt('index'),
      messages: [{ role: 'user' as const, content: prompt }],
      // v1.26.3 PATCH Issue #443 expanded scope: typed-output path.
      // PathResolutionLLMSchema ({match?: boolean, path?: string|null}) on the
      // wire as Tier 0 json_schema — LMStudio accepts, no parse-error fallback
      // to slugPath.
      response_format: { type: 'json_object' as const, schema: PathResolutionLLMSchema },
      ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
    };
    const response = await callLlm(client, resolveArgs);

    const parsed = await parseJsonResult(response);

    if (!parsed.ok) {
      // #407 Stage 1. Until now this path returned `null` and joined the
      // `match === false` branch below, so an unreadable reply was recorded as
      // "no existing page matches" and a new page was written for an entity
      // that may already have one — without leaving a trace, because the
      // `catch` further down only sees thrown errors.
      //
      // The fallback is deliberately unchanged: this function must return a
      // path, and `slugPath` is still it. What changes is that the fallback is
      // now taken as a failure to read the reply, not as an answer to the
      // question. What to do about it beyond reporting — retry on `empty`,
      // surface the uncertainty to the caller — needs a return channel this
      // signature does not have, and is left to the later stages.
      const detail =
        parsed.reason === 'exception'
          ? `exception: ${String(parsed.error)}`
          : `${parsed.reason}, raw length ${parsed.rawLength}`;
      console.error(
        `Entity resolution for "${name}": dedup reply unreadable (${detail}) — using ${fallbackPath}, no match decided`,
      );
      return { path: fallbackPath };
    }

    const result = parsed.value as { match?: boolean; path?: string | null };

    if (result.match && result.path) {
      const normalizedPath = normalizeLLMPath(result.path, ctx.settings.wikiFolder);
      console.debug(`Entity resolution: "${name}" matched existing page "${normalizedPath}"`);
      // Append the new name as an alias to the existing page to prevent future
      // duplicates — through the same cross-page gate as the deterministic
      // merge above (`allPages` is still in scope here).
      await appendAliases(ctx, normalizedPath, [name], aliasClaimsFromPages(allPages, normalizedPath));
      return { path: normalizedPath };
    }
  } catch (error) {
    console.debug(`Entity resolution for "${name}" failed, using ${fallbackPath}:`, error);
  }

  // Also the `match === false` exit: for an ambiguous designator this is the
  // one place where "neither candidate is it" would create a third page for a
  // name that is already an alias twice, so it resolves to the top-ranked
  // candidate instead. For every other call `fallbackPath` is `slugPath`.
  return { path: fallbackPath };
}
