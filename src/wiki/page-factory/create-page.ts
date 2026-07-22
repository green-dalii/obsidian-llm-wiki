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
import type { EntityInfo, ConceptInfo, PageCreationResult, LLMWikiSettings, LLMClient } from '../../types';
import { PROMPTS } from '../../prompts';
import { TOKENS_PAGE_GENERATION } from '../../constants';
import { resolveModelForTask } from '../../core/model-resolver';
import { cleanMarkdownResponse } from '../../core/markdown';
import { canonicalizeSectionHeaders } from '../../core/section-header-canonicalizer';
import { correctRelatedLinkPrefixes } from '../../core/related-link-corrector';
import { parseFrontmatter, enforceFrontmatterConstraints } from '../../core/frontmatter';
import { injectMentionsSection } from '../../core/mentions-injector';
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
  buildSystemPrompt(mode: 'full' | 'compact' | 'merge' | 'entity' | 'concept'): Promise<string>;
  createOrUpdateFile(path: string, content: string): Promise<void>;
  tryReadFile(path: string): Promise<string | null>;
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
          await mergePage(ctx, info, targetType, sourceFile, existingContent, extraPagePaths, targetPath, sourceSlug);
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

  const mergedPath = await mergePage(ctx, info, pageType, sourceFile, existingContent, extraPagePaths, result.path, sourceSlug);
  return { path: mergedPath, created: false };
}

/**
 * Public wrapper: create or update an entity page. Delegates to the
 * generic createOrUpdatePage router.
 */
export async function createOrUpdateEntityPage(
  ctx: CreatePageContext,
  entity: EntityInfo,
  _analysis: unknown,
  sourceFile: TFile | { path: string; basename: string },
  extraPagePaths: string[] = [],
  sourceSlug?: string,
): Promise<PageCreationResult> {
  return createOrUpdatePage(ctx, entity, 'entity', sourceFile, extraPagePaths, sourceSlug);
}

/**
 * Public wrapper: create or update a concept page. Delegates to the
 * generic createOrUpdatePage router.
 */
export async function createOrUpdateConceptPage(
  ctx: CreatePageContext,
  concept: ConceptInfo,
  _analysis: unknown,
  sourceFile: TFile | { path: string; basename: string },
  extraPagePaths: string[] = [],
  sourceSlug?: string,
): Promise<PageCreationResult> {
  return createOrUpdatePage(ctx, concept, 'concept', sourceFile, extraPagePaths, sourceSlug);
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

    const prompt = generatePrompt
      .replace('{{entity_name}}', info.name)
      .replace('{{concept_name}}', info.name)
      .replace('{{entity_type}}', info.type)
      .replace('{{concept_type}}', info.type)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{concept_summary}}', info.summary)
      .replace('{{extraction_aliases}}', info.aliases?.length
        ? `[${info.aliases.join(', ')}]` : 'None')
      .replace('{{related_entities}}', info.related_entities?.join(', ') || 'No related entities')
      .replace('{{related_concepts}}', info.related_concepts?.join(', ') || 'No related concepts')
      .replace('{{existing_pages}}', await buildPagesListForPrompt(ctx, extraPagePaths))
      .replace('{{related_content}}', 'No existing content')
      .replace('{{merge_strategy}}', 'New page, no merge needed.')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      // Issue #155: entity/concept pages cite the canonical source PAGE
      // ([[sources/<slug>]]), not the raw note path — so a collision-
      // disambiguated source slug is honored and the normalizer passes it
      // through unchanged.
      .replace(/\{\{source_file\}\}/g, sourceSlug ? `sources/${sourceSlug}` : sourceFile.path);

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
    await ctx.createOrUpdateFile(path, mentionsInjectedContent);
    return path;
  } catch (error) {
    throw contextualizeError(error, info.name, pageType);
  }
}