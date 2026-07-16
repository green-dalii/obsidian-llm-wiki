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

import { WIKI_SUBFOLDERS, TOKENS_DEDUP_RESOLUTION } from '../../constants';
import { slugify } from '../../core/slug';
import { ConflictResolver } from '../../core/conflict-resolver';
import { getExistingWikiPages } from '../lint/get-existing-pages';
import { PROMPTS } from '../../prompts';
import { parseJsonResponse } from '../../core/json';
import { normalizeLLMPath } from '../../core/prompt-builders';
import { resolveModelForTask } from '../../core/model-resolver';
import { appendAliases, type AliasesContext } from './aliases';

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
  getClient(): { createMessage: (...args: unknown[]) => Promise<string> } | null;
  buildSystemPrompt(mode: 'full' | 'compact' | 'merge'): Promise<string>;
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
): Promise<ResolvedPathResult> {
  const folder = pageType === 'entity' ? WIKI_SUBFOLDERS.entities : WIKI_SUBFOLDERS.concepts;
  const otherFolder = pageType === 'entity' ? WIKI_SUBFOLDERS.concepts : WIKI_SUBFOLDERS.entities;
  const slug = slugify(name, ctx.settings.slugCase === 'preserve');
  const slugPath = `${ctx.settings.wikiFolder}/${folder}/${slug}.md`;

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
    const cr = resolver.resolve({ name, slug, pageType });

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

    const sameTypePages = allPages
      .filter(p => p.path.includes(`/${folder}/`))
      .filter(p => {
        // Purge polluted entries from LLM input (L2)
        const bn = p.title || '';
        return !/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.test(bn);
      });

    // Same-type slug/alias match is handled above by ConflictResolver.
    // Remaining path: LLM-based semantic dedup for pages that don't match by slug/alias.

    if (sameTypePages.length === 0) return { path: slugPath };

    const pagesList = sameTypePages
      .map(p => {
        const aliasBlock = p.aliases?.length
          ? `\n  aliases: ${p.aliases.join(', ')}`
          : '';
        return `- path: ${p.path}\n  title: ${p.title}${aliasBlock}`;
      })
      .join('\n');

    const client = ctx.getClient();
    if (!client) return { path: slugPath };

    const prompt = PROMPTS.resolveEntityDedup
      .replace('{{wikiFolder}}', ctx.settings.wikiFolder)
      .replace('{{entity_name}}', name)
      .replace('{{entity_type}}', pageType)
      .replace('{{entity_summary}}', summary.substring(0, 300))
      .replace('{{page_type}}', pageType)
      .replace('{{existing_pages}}', pagesList);

    const response = await client.createMessage({
      model: resolveModelForTask(ctx.settings, 'ingest'),
      max_tokens: TOKENS_DEDUP_RESOLUTION,
      system: await ctx.buildSystemPrompt('full'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const result = (await parseJsonResponse(response)) as {
      match?: boolean;
      path?: string | null;
    } | null;

    if (result?.match && result?.path) {
      const normalizedPath = normalizeLLMPath(result.path, ctx.settings.wikiFolder);
      console.debug(`Entity resolution: "${name}" matched existing page "${normalizedPath}"`);
      // Append the new name as an alias to the existing page to prevent future duplicates
      await appendAliases(ctx, normalizedPath, [name]);
      return { path: normalizedPath };
    }
  } catch (error) {
    console.debug(`Entity resolution for "${name}" failed, using slug path:`, error);
  }

  return { path: slugPath };
}

/**
 * Build the page list shown to the LLM in dedup/seed-selection prompts.
 *
 * @param includePaths    Additional paths to append to the list (e.g. the
 *                        just-created sources/ page so the LLM considers it).
 * @param options.excludeSources  When true (default), sources/ pages are
 *                        filtered out — they are reserved for the YAML
 *                        `sources:` field (#234) and the dedup prompt should
 *                        not surface them as candidates.
 */
export async function buildPagesListForPrompt(
  ctx: PathResolutionContext,
  includePaths: string[] = [],
  options: { excludeSources?: boolean } = { excludeSources: true },
): Promise<string> {
  const allPages = await getExistingWikiPages(ctx.app as never, ctx.settings.wikiFolder);
  // #234 (DocTpoint): sources/ pages are reserved for the YAML frontmatter
  // `sources:` field — constraints.ts forbids them in body text. Filter them
  // out of the LLM candidate list by default so weak local models don't
  // fuzzy-match onto sources/ entries. getExistingWikiPages itself is
  // unchanged: source-analyzer.ts:421 still needs sources/ for the
  // program-generated related-page matching. Pass
  // `{ excludeSources: false }` to opt out (future analytical surfaces
  // that legitimately want to mention sources).
  const promptPages = options.excludeSources
    ? allPages.filter(p => !p.path.includes('/sources/'))
    : allPages;
  // Filter out pages with polluted basenames before showing to LLM (L2)
  const cleanPages = promptPages.filter(p => {
    const bn = p.title || '';
    return !/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.test(bn);
  });
  const MAX_PAGES = 50;
  let pages = cleanPages;
  let truncated = false;
  if (cleanPages.length > MAX_PAGES) {
    const hasEntityExtra = includePaths.some(p => p.includes('/entities/'));
    const hasConceptExtra = includePaths.some(p => p.includes('/concepts/'));
    if (hasEntityExtra && !hasConceptExtra) {
      pages = promptPages.filter(p => p.path.includes('/entities/')).slice(0, MAX_PAGES);
    } else if (hasConceptExtra && !hasEntityExtra) {
      pages = promptPages.filter(p => p.path.includes('/concepts/')).slice(0, MAX_PAGES);
    } else {
      pages = promptPages.slice(0, MAX_PAGES);
    }
    truncated = true;
  }
  const list = pages.map(p => {
    const aliasSuffix = p.aliases?.length ? ` \`aliases: ${p.aliases.join(', ')}\`` : '';
    return `- ${p.wikiLink}${aliasSuffix}`;
  }).join('\n');
  let result = list;
  if (includePaths.length > 0) {
    const newPages = includePaths.map(p => {
      const relPath = p.replace(ctx.settings.wikiFolder + '/', '').replace('.md', '');
      const name = relPath.split('/').pop() || relPath;
      return `- [[${relPath}|${name}]]`;
    }).filter(entry => !list.includes(entry));
    if (newPages.length > 0) {
      result = list + '\n' + newPages.join('\n');
    }
  }
  if (truncated) {
    result += `\n(Wiki has ${allPages.length} pages total; showing first ${MAX_PAGES}. See index.md for the full list.)`;
  }
  return result;
}