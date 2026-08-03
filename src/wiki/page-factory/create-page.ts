// page-factory/create-page.ts — create or update entity/concept pages.
//
// Extracted from the original page-factory.ts god-class. Contains 4
// functions: 3 public (createOrUpdateEntityPage / createOrUpdateConceptPage
// / createNewPage) and 1 private router (createOrUpdatePage).
//
// Behavior (v1.24.1 Phase 2 refactor — preserved verbatim):
//   - createOrUpdatePage resolves the path first (slug match / LLM dedup
//     fallback / cross-type collision detection).
//   - collision branch: merge into the EXISTING page in the opposite
//     folder (preserves the cross-type information; reviewed pages use
//     appendToReviewedPage, non-reviewed use mergePage).
//   - new-file branch: LLM generates the body (entity or concept prompt).
//   - existing-file branch: reviewed pages route to appendToReviewedPage;
//     other pages route to mergePage.
//
// Issue #244: Mentions section is injected programmatically post-LLM (in
// createNewPage and mergePage) so the LLM cannot drift the citation format.
// Conversation sources emit a single synthetic citation line.

import { TFile } from 'obsidian';
import type {
  EntityInfo,
  ConceptInfo,
  PageCreationResult,
  LLMWikiSettings,
  LLMClient,
  SourceAnalysis,
  SourceContext,
} from '../../types';
import { PROMPTS } from '../../prompts';
import { TOKENS_PAGE_GENERATION } from '../../constants';
import { resolveModelForTask } from '../../core/model-resolver';
import { cleanMarkdownResponse } from '../../core/markdown';
import { canonicalizeSectionHeaders } from '../../core/section-header-canonicalizer';
import { correctRelatedLinkPrefixes } from '../../core/related-link-corrector';
import { parseFrontmatter, enforceFrontmatterConstraints } from '../../core/frontmatter';
import { injectMentionsSection } from '../../core/mentions-injector';
import { renderTemplate } from '../../core/template-renderer';
import { applySectionLabels, getSectionLabels } from '../system-prompts';
import { resolvePagePath, buildPagesListForPrompt, type PathResolutionContext } from './path-resolution';
import { mergePage } from './merge-page';
import { appendToReviewedPage } from './merge-page';
import { isConversationSource, contextualizeError } from './contextualize';

/**
 * Minimal context contract required by createOrUpdatePage / createNewPage.
 */
export interface CreatePageContext extends PathResolutionContext {
  settings: LLMWikiSettings;
  getClient(): LLMClient | null;
  buildSystemPrompt(mode: 'full' | 'compact' | 'merge' | 'entity' | 'concept' | 'index'): Promise<string>;
  createOrUpdateFile(path: string, content: string): Promise<void>;
  tryReadFile(path: string): Promise<string | null>;
}

/**
 * Issue #312 — lift the ingest-side source facts out of the analysis object
 * the engine already hands to this module. Returns undefined when there is no
 * analysis (lint-side callers), which keeps the merge path unchanged for them.
 */
export function sourceContextFromAnalysis(
  analysis: SourceAnalysis | undefined,
): SourceContext | undefined {
  if (!analysis) return undefined;
  return {
    sourceTitle: analysis.source_title,
    summary: analysis.summary,
    sourcePath: analysis.source_file,
    noteAliases: analysis.source_note_aliases,
  };
}

/**
 * Generic page CRUD (entity/concept unified). Returns:
 *   - { path } when a page was written.
 *   - { path: null } when the name was empty.
 *   - { path: null, collision: {...} } when a cross-type collision was
 *     detected and merged into the existing page.
 */
export async function createOrUpdatePage(
  ctx: CreatePageContext,
  info: EntityInfo | ConceptInfo,
  pageType: 'entity' | 'concept',
  sourceFile: TFile | { path: string; basename: string },
  extraPagePaths: string[] = [],
  sourceSlug?: string,
  sourceContext?: SourceContext,
): Promise<PageCreationResult> {
  if (!info.name || info.name.trim().length === 0) {
    console.warn(`${pageType} name is empty, skipping creation`);
    return { path: null, created: false };
  }

  console.debug(`=== Creating/Updating ${pageType} page ===`);
  console.debug('name:', info.name);
  console.debug('type:', info.type);

  const result = await resolvePagePath(ctx, info.name, pageType, info.summary);
  if (result.path === null) {
    if (result.collision) {
      // Cross-type collision: a page for this item already exists in the
      // opposite folder. Don't create a duplicate file, but merge the new
      // content into the existing page so the source's summary / mentions
      // / sources aren't lost. Use the EXISTING page's type for the merge
      // so it keeps its classification.
      const { targetPath, targetType } = result.collision;
      const existingContent = await ctx.tryReadFile(targetPath);
      if (existingContent) {
        const isReviewed = parseFrontmatter(existingContent)?.reviewed === true;
        if (isReviewed) {
          await appendToReviewedPage(ctx, info, sourceFile, existingContent, targetPath, sourceSlug);
        } else {
          await mergePage(ctx, info, targetType, sourceFile, existingContent, extraPagePaths, targetPath, sourceSlug, sourceContext);
        }
        console.debug(`Cross-type collision: merged "${info.name}" content into ${targetType} page ${targetPath}`);
      }
    }
    // Either nothing was written, or the content was merged into a page that
    // already existed in the opposite folder — never a creation.
    return { ...result, created: false };
  }
  console.debug('Resolved path:', result.path);

  const existingContent = await ctx.tryReadFile(result.path);

  if (!existingContent) {
    const createdPath = await createNewPage(ctx, info, pageType, sourceFile, extraPagePaths, result.path, sourceSlug);
    return { path: createdPath, created: true };
  }

  const isReviewed = parseFrontmatter(existingContent)?.reviewed === true;

  if (isReviewed) {
    console.debug(`${pageType} page has reviewed: true, using minimal append mode:`, result.path);
    const updatedPath = await appendToReviewedPage(ctx, info, sourceFile, existingContent, result.path, sourceSlug);
    return { path: updatedPath, created: false };
  }

  const mergedPath = await mergePage(ctx, info, pageType, sourceFile, existingContent, extraPagePaths, result.path, sourceSlug, sourceContext);
  return { path: mergedPath, created: false };
}

/**
 * Public wrapper: create or update an entity page. Delegates to the
 * generic createOrUpdatePage router.
 */
export async function createOrUpdateEntityPage(
  ctx: CreatePageContext,
  entity: EntityInfo,
  analysis: SourceAnalysis | undefined,
  sourceFile: TFile | { path: string; basename: string },
  extraPagePaths: string[] = [],
  sourceSlug?: string,
): Promise<PageCreationResult> {
  return createOrUpdatePage(
    ctx, entity, 'entity', sourceFile, extraPagePaths, sourceSlug,
    sourceContextFromAnalysis(analysis),
  );
}

/**
 * Public wrapper: create or update a concept page. Delegates to the
 * generic createOrUpdatePage router.
 */
export async function createOrUpdateConceptPage(
  ctx: CreatePageContext,
  concept: ConceptInfo,
  analysis: SourceAnalysis | undefined,
  sourceFile: TFile | { path: string; basename: string },
  extraPagePaths: string[] = [],
  sourceSlug?: string,
): Promise<PageCreationResult> {
  return createOrUpdatePage(
    ctx, concept, 'concept', sourceFile, extraPagePaths, sourceSlug,
    sourceContextFromAnalysis(analysis),
  );
}

/**
 * Generate a brand-new entity/concept page body via the LLM. Used when
 * the resolved path doesn't exist yet. Issues #244 and #85:
 *   - #85: pass settings so custom tag vocabulary is honored.
 *   - #244: programmatically inject the Mentions section so the LLM cannot
 *     drift the citation format or leak note-folder prefixes into the body.
 *
 * Throws via `contextualizeError` on any failure, wrapping the entity/concept
 * name + page type for easier triage.
 */
export async function createNewPage(
  ctx: CreatePageContext,
  info: EntityInfo | ConceptInfo,
  pageType: 'entity' | 'concept',
  sourceFile: TFile | { path: string; basename: string },
  extraPagePaths: string[],
  path: string,
  sourceSlug?: string,
): Promise<string | null> {
  const client = ctx.getClient();
  if (!client) throw new Error('LLM client not initialized');

  try {
    const generatePrompt = pageType === 'entity' ? PROMPTS.generateEntityPage : PROMPTS.generateConceptPage;

    const prompt = renderTemplate(generatePrompt, {
      entity_name: info.name,
      concept_name: info.name,
      entity_type: info.type,
      concept_type: info.type,
      entity_summary: info.summary,
      concept_summary: info.summary,
      extraction_aliases: info.aliases?.length ? `[${info.aliases.join(', ')}]` : 'None',
      related_entities: info.related_entities?.join(', ') || 'No related entities',
      related_concepts: info.related_concepts?.join(', ') || 'No related concepts',
      existing_pages: await buildPagesListForPrompt(ctx, extraPagePaths),
      related_content: 'No existing content',
      merge_strategy: 'New page, no merge needed.',
      date: new Date().toISOString().split('T')[0],
      // Issue #155: entity/concept pages cite the canonical source PAGE
      // ([[sources/<slug>]]), not the raw note path — so a collision-
      // disambiguated source slug is honored and the normalizer passes it
      // through unchanged.
      source_file: sourceSlug ? `sources/${sourceSlug}` : sourceFile.path,
    });

    // #328 Phase 1 follow-up: user-layer tag-vocab removed — system layer injects once.
    const finalPrompt = applySectionLabels(prompt, ctx.settings);

    const pageContent = await client.createMessage({
      model: resolveModelForTask(ctx.settings, 'ingest'),
      max_tokens: TOKENS_PAGE_GENERATION,
      system: await ctx.buildSystemPrompt(pageType),
      messages: [{ role: 'user', content: finalPrompt }],
      ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    // Issue #85: pass settings so custom tag vocabulary is honored.
    // Issue #388: no `preserveCreated` — this page is being created, so there is
    // no prior file and no real creation date to preserve. Anything `created:`
    // in the model's reply says about the past is invented by construction.
    const enforcedContent = enforceFrontmatterConstraints(cleanedContent, pageType, ctx.settings);
    const labels = getSectionLabels(ctx.settings);
    // Re-assert the known section labels before the link corrector runs, so a
    // garbled `## Verwandte …` header still resolves its section for prefix
    // correction.
    const canonicalizedContent = canonicalizeSectionHeaders(enforcedContent, Object.values(labels));
    const correctedContent = correctRelatedLinkPrefixes(
      canonicalizedContent,
      info.related_entities,
      info.related_concepts,
      labels.related_entities,
      labels.related_concepts,
      ctx.settings.slugCase === 'preserve',
    );
    // Issue #244: programmatically inject the Mentions section.
    const isConv = isConversationSource(sourceFile, ctx.settings.wikiFolder);
    const mentionsForInject = isConv
      ? []
      : (info.mentions_with_provenance?.length
        ? info.mentions_with_provenance
        : info.mentions_in_source);
    const mentionsInjectedContent = injectMentionsSection(
      correctedContent,
      mentionsForInject,
      sourceFile.path,
      {
        sectionLabel: labels.mentions_in_source,
        conversationMode: isConv,
        conversationLabel: `Conversation: ${sourceFile.basename}`,
      },
    );
    // #365 v1.25.11 PATCH: stamp `sources:` provenance on every freshly
    // generated page. `enforceFrontmatterConstraints` rewrites the
    // frontmatter block from a fixed allowlist (`type/created/updated/tags/
    // aliases/reviewed`), so the `sources:` that `merge-page.ts:93` writes
    // is stripped here. Splice `mergeFrontmatter` AFTER every transform step
    // (last thing before the write). We use the SAME helper that
    // `merge-page.ts:95` uses, so the byte-shape of the `sources:` entry is
    // identical regardless of which code path produced the page — bit-
    // identical `[[sources/<slug>]]` wikilink form (line 490 of frontmatter.ts
    // rewraps every entry). This is the Plan-A path: smallest blast radius
    // because the only thing the surrounding code learns is that
    // `createNewPage` now goes through `mergeFrontmatter` before the write;
    // we do not touch `enforceFrontmatterConstraints` (which 8+ callers
    // depend on, including the fix-runners that re-touch pages and would
    // otherwise need to relearn this rule).
    //
    // Guarded by `sourceSlug` truthiness so the two non-ingest call sites
    // (conversation-ingest.ts:251 / :270 do not pass sourceSlug) leave the
    // content unchanged — they never had a source-stamp in the LLM prompt,
    // and synthesising `sources/undefined` would be a hard regression on the
    // conversation-source path.
    //
    // If `enforceFrontmatterConstraints` returned content without a
    // parseable frontmatter block (LLM drift on the very rare path),
    // `mergeFrontmatter` reports `wasMerged:false` — we leave the content
    // unchanged rather than synthesise a thin frontmatter block. The
    // sources stamp is a best-effort add-on; it is strictly less risky than
    // the primary write.
    // Inline source-stamp to avoid `mergeFrontmatter`'s 4× regex pass
    // (parseFrontmatter + extractBody + extractPassthroughLines +
    // serializeFrontmatter rebuild). `enforceFrontmatterConstraints`
    // already produced a clean YAML block; we only need to splice
    // `sources: [[[sources/<slug>]]]` into the existing block without
    // re-serializing type/created/updated/tags/aliases. The original
    // `mergeFrontmatter` helper still owns the merge-page.ts path
    // (which has different requirements: emit a fresh `updated:`
    // stamp and full re-serialization).
    const sourcedContent = sourceSlug
      ? appendSourceSlugToFrontmatter(mentionsInjectedContent, sourceSlug)
      : mentionsInjectedContent;
    await ctx.createOrUpdateFile(path, sourcedContent);
    return path;
  } catch (error) {
    throw contextualizeError(error, info.name, pageType);
  }
}

/**
 * v1.25.11 PATCH #365 source-stamp helper (Plan A): splice a single
 * `[[sources/<slug>]]` entry into the document's existing frontmatter
 * block without re-serializing the whole YAML. Designed to be called
 * AFTER `enforceFrontmatterConstraints` has produced a clean block
 * (so the byte-shape of type/created/updated/tags/aliases is already
 * canonical). Falls back to returning the input unchanged when the
 * content has no parseable frontmatter — same semantics as
 * `mergeFrontmatter.wasMerged=false`.
 *
 * The dedup contract matches `mergeFrontmatter` line 484-490: a Set
 * of normalized wikilink forms, re-wrapped as `[[name]]`. The slug
 * input here is the bare source slug (no `sources/` prefix and no
 * `[[]]` wrapper); we add both to keep the wire format identical to
 * what `merge-page.ts:95` would have produced.
 */
// Exported for direct unit-test coverage of the flow-style detection path
// added for #399. Not part of the plugin's public API — call sites live in
// createOrUpdatePage / createNewPage above.
export function appendSourceSlugToFrontmatter(content: string, sourceSlug: string): string {
  if (!content.startsWith('---')) return content;
  const fmEnd = content.indexOf('\n---\n', 3);
  if (fmEnd === -1) return content;
  const fmText = content.substring(3, fmEnd);
  const body = content.substring(fmEnd + 5);
  const sourceEntry = `[[sources/${sourceSlug}]]`;

  const lines = fmText.split('\n');

  // First, handle inline flow-style `sources: ["[[...]]", ...]`. Prior to
  // this fix, we only matched the block-style form `^sources:\s*$`, so a
  // flow-style existing key would fall through to the "no sources yet"
  // branch and get a NEW block-style key inserted — producing two
  // top-level `sources:` keys, which is invalid YAML and breaks the
  // Properties panel. See #399. Detect the flow-style form, extract its
  // wikilink entries, add the new one if absent, then re-emit as
  // block-style (canonical shape used elsewhere in the plugin).
  const flowIdx = lines.findIndex(l => /^sources:\s*\[.*\]\s*$/.test(l));
  if (flowIdx !== -1) {
    const flowMatch = lines[flowIdx].match(/^sources:\s*\[(.*)\]\s*$/);
    const entries: string[] = [];
    if (flowMatch && flowMatch[1].trim().length > 0) {
      const linkPattern = /\[\[([^\]]+)\]\]/g;
      let m;
      while ((m = linkPattern.exec(flowMatch[1])) !== null) {
        entries.push(m[1]);
      }
    }
    const targetLink = sourceEntry.slice(2, -2);
    if (entries.includes(targetLink)) return content;
    entries.push(targetLink);
    const blockLines = ['sources:', ...entries.map(e => `  - [[${e}]]`)];
    lines.splice(flowIdx, 1, ...blockLines);
    return `---\n${lines.join('\n')}\n---\n${body}`;
  }

  const sourcesIdx = lines.findIndex(l => /^sources:\s*$/.test(l));
  if (sourcesIdx === -1) {
    // No existing `sources:` key — insert one. Anchor on `tags:` so the
    // block order (type / created / updated / sources / tags / aliases /
    // reviewed) matches the canonical layout produced by
    // `enforceFrontmatterConstraints` + `serializeFrontmatter`.
    const tagsIdx = lines.findIndex(l => /^tags:\s*$/.test(l));
    const insertAt = tagsIdx === -1 ? lines.length : tagsIdx;
    lines.splice(insertAt, 0, `sources:\n  - ${sourceEntry}`);
  } else {
    // Existing `sources:` block — append the new entry if not already
    // present. Scan only indented continuation lines (same semantics
    // as `mergeFrontmatter`'s Set dedup, lines 484-490).
    const existing = new Set<string>();
    for (let i = sourcesIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('- ')) break;
      const entry = line.substring(2).trim();
      if (entry.startsWith('[[') && entry.endsWith(']]')) {
        existing.add(entry.slice(2, -2).trim());
      }
    }
    if (existing.has(sourceEntry.slice(2, -2))) return content;
    // Find the first non-`sources:` continuation line — that's where we
    // append. If no continuation lines exist yet, insert immediately
    // after the `sources:` key.
    let insertAt = sourcesIdx + 1;
    while (insertAt < lines.length && lines[insertAt].trim().startsWith('- ')) {
      insertAt++;
    }
    lines.splice(insertAt, 0, `  - ${sourceEntry}`);
  }
  return `---\n${lines.join('\n')}\n---\n${body}`;
}