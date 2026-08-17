// page-factory/path-resolution.ts — resolve the file path for a new entity/
// concept page and build the LLM candidate list shown to dedup prompts.
//
// Extracted from the original page-factory.ts god-class so the slug-vs-LLM
// resolution logic and the LLM candidate-list shape are independently
// testable.
//
// Behavior (v1.24.1 Phase 2 refactor — preserved verbatim):
//   - resolvePagePath: exact-slug fast path → ConflictResolver (slug/alias
//     match, including cross-type collision) → LLM semantic dedup fallback.
//     Returns `{ path: null, collision: {...} }` when a cross-type collision
//     is detected so callers merge into the existing page instead of
//     creating a new file.
//   - buildPagesListForPrompt: filters out sources/ by default (#234) and
//     polluted basenames (L2); caps at MAX_PAGES=50 with entity/concept
//     bias based on includePaths; emits a "(truncated)" suffix when the cap
//     fires; optionally appends includePaths that aren't already in the
//     list.

import { WIKI_SUBFOLDERS, TOKENS_DEDUP_RESOLUTION, DEDUP_CANDIDATE_TOP_K } from '../../constants';
import { slugify } from '../../core/slug';
import { ConflictResolver } from '../../core/conflict-resolver';
import { localKeywordMatch } from '../../core/index-search';
import { getExistingWikiPages } from '../lint/get-existing-pages';
import { PROMPTS } from '../../prompts';
import { parseJsonResult } from '../../core/json';
import { normalizeLLMPath } from '../../core/prompt-builders';
import { renderTemplate } from '../../core/template-renderer';
import { resolveModelForTask } from '../../core/model-resolver';
import { appendAliases, type AliasesContext } from './aliases';
import { PathResolutionLLMSchema } from '../../llm-sdk/output-schemas';
import { callLlm } from '../../core/llm-dispatch';

/** Page shape consumed by the dedup candidate pre-filter. */
export interface DedupCandidatePage {
  path: string;
  title: string;
  aliases?: string[];
}

/**
 * Pre-filter the same-type page list before it is rendered into the
 * semantic dedup prompt. The full list grows with the vault and made the
 * call prefill-bound (~40K prompt tokens for a 16-token answer), so only
 * the top-K lexically ranked candidates are kept.
 *
 * Recall guard (binding): the fallback to the FULL list is gated on the
 * candidate's NAME alone, not on the ranked result. Summary tokens are
 * ranking signal only — incidental substrings ("in" ⊂ "institute") make
 * the ranked list non-empty for almost any query on a large vault, so a
 * ranked-list-empty check would never fire and the translation/initialism
 * case ("MIT" vs "Massachusetts Institute of Technology", "Tsinghua
 * University" vs "清华大学") would silently lose its true duplicate. A
 * missed duplicate becomes a duplicate page, so that rare case pays the
 * old full-list cost instead of risking correctness.
 *
 * The name is additionally matched with hyphens/underscores split so
 * compound candidates share tokens with reordered variants
 * ("Diabetes-mellitus-Typ-2" ↔ "Typ-2-Diabetes").
 */
export function selectDedupCandidates(
  name: string,
  summary: string,
  sameTypePages: DedupCandidatePage[],
): DedupCandidatePage[] {
  const normalized = sameTypePages.map(p => ({
    path: p.path,
    title: p.title,
    aliases: p.aliases ?? [],
  }));
  const nameQuery = `${name} ${name.split(/[-_]+/).join(' ')}`;
  const nameHits = localKeywordMatch(nameQuery, normalized);
  if (nameHits.length === 0) return sameTypePages;
  const ranked = localKeywordMatch(`${nameQuery} ${summary.substring(0, 300)}`, normalized);
  const byPath = new Map(sameTypePages.map(p => [p.path, p]));
  return ranked
    .slice(0, DEDUP_CANDIDATE_TOP_K)
    .map(r => byPath.get(r.path))
    .filter((p): p is DedupCandidatePage => p !== undefined);
}

/** Mirrors the subset of PageCreationResult we return. */
export interface ResolvedPathResult {
  path: string | null;
  collision?: {
    name: string;
    sourceType: 'entity' | 'concept';
    targetType: 'entity' | 'concept';
    targetPath: string;
  };
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
 * Returns `{ path: null, collision: {...} }` when a cross-type collision
 * is detected (same name exists in the opposite folder). Callers must NOT
 * create a new file in that case, but should merge the new content into
 * `collision.targetPath` so no information from the source is lost.
 */
export async function resolvePagePath(
  ctx: PathResolutionContext,
  name: string,
  pageType: 'entity' | 'concept',
  summary: string,
  tags?: string[],
): Promise<ResolvedPathResult> {
  const folder = pageType === 'entity' ? WIKI_SUBFOLDERS.entities : WIKI_SUBFOLDERS.concepts;
  const otherFolder = pageType === 'entity' ? WIKI_SUBFOLDERS.concepts : WIKI_SUBFOLDERS.entities;
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
    // Check for historical cross-type duplicate: if the same name exists in the
    // opposite folder, it means an earlier ingestion classified this item differently.
    // Append the new name as an alias to bridge the two pages (Bug #1 fix).
    const otherSlugPath = `${ctx.settings.wikiFolder}/${otherFolder}/${slug}.md`;
    const otherExisting = await ctx.tryReadFile(otherSlugPath);
    if (otherExisting !== null) {
      console.warn(`Historical cross-type duplicate detected: ${folder}/${slug}.md and ${otherFolder}/${slug}.md both exist — appending alias`);
      await appendAliases(ctx, otherSlugPath, [name]);
    }
    return { path: slugPath };
  }

  // Fast path 2 + Slow path: share sameTypePages across slug-match and LLM resolution
  try {
    const allPages = await getExistingWikiPages(ctx.app as never, ctx.settings.wikiFolder);

    // Use ConflictResolver for deterministic slug/alias matching before LLM fallback.
    const resolver = new ConflictResolver(ctx.settings.wikiFolder, allPages);
    const cr = resolver.resolve({ name, slug, pageType, tags });

    if (cr.action === 'merge' && !cr.reason.includes('Cross-type')) {
      await appendAliases(ctx, cr.targetPath, [name]);
      return { path: cr.targetPath };
    }

    if (cr.action === 'merge' && cr.reason.includes('Cross-type')) {
      await appendAliases(ctx, cr.targetPath, [name]);
      return {
        path: null,
        collision: {
          name,
          sourceType: pageType,
          targetType: cr.existingType || (otherFolder === WIKI_SUBFOLDERS.entities ? 'entity' : 'concept'),
          targetPath: cr.targetPath,
        },
      };
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
      // Append the new name as an alias to the existing page to prevent future duplicates
      await appendAliases(ctx, normalizedPath, [name]);
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
