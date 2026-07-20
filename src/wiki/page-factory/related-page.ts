// page-factory/related-page.ts — update an existing wiki page that's
// topically related to a newly-ingested source.
//
// Extracted from the original page-factory.ts god-class so the three-branch
// routing logic (no-new-info / reviewed / normal) is independently testable.
//
// Behavior (v1.24.1 Phase 2 refactor — preserved verbatim):
//   - No matching entity/concept in the analysis → only re-merge frontmatter
//     (sources + updated). Issue #131 fix: skip the LLM entirely to avoid the
//     no-op rewrite that corrupts verbatim text (#131).
//   - reviewed: true page → route to `appendToReviewedPage` so the curated
//     body is preserved verbatim and only genuinely-new content lands in
//     ## New Information. Parity with the createOrUpdatePage routing.
//   - Normal path → LLM rewrites the body via the updateRelatedPage prompt.

import { TFile } from 'obsidian';
import type { SourceAnalysis, LLMWikiSettings, LLMClient } from '../../types';
import { PROMPTS } from '../../prompts';
import { TOKENS_PAGE_GENERATION } from '../../constants';
import { resolveModelForTask } from '../../core/model-resolver';
import { cleanMarkdownResponse } from '../../core/markdown';
import { mergeFrontmatter, parseFrontmatter } from '../../core/frontmatter';
import { stripMentionsSection } from '../../core/mentions-parser';
import {
  canonicalizeSectionHeaders,
  preserveExistingSections,
} from '../../core/section-header-canonicalizer';
import { correctRelatedLinkPrefixes } from '../../core/related-link-corrector';
import { getSectionLabels } from '../system-prompts';
import { getExistingWikiPages } from '../lint/get-existing-pages';
import { UNIVERSAL_LINK_CONSTRAINTS } from '../prompts/constraints';
import { appendToReviewedPage, type MergeContext } from './merge-page';
import { assembleFinalContent } from './mentions-integration';

/**
 * Minimal context contract required by `updateRelatedPage`. Mirrors the real
 * EngineContext shape for the small subset this function uses.
 */
export interface RelatedPageContext extends MergeContext {
  app: {
    vault: {
      getAbstractFileByPath(path: string): unknown;
      read(file: TFile): Promise<string>;
    };
  };
  settings: LLMWikiSettings;
  getClient(): LLMClient | null;
  buildSystemPrompt(mode: 'full' | 'compact' | 'merge' | 'related'): Promise<string>;
  createOrUpdateFile(path: string, content: string): Promise<void>;
}

/**
 * Update an existing wiki page that's topically related to a newly-ingested
 * source. Returns false when the related page doesn't exist (or isn't a
 * regular TFile); returns true on any successful write.
 */
export async function updateRelatedPage(
  ctx: RelatedPageContext,
  pageName: string,
  analysis: SourceAnalysis,
  sourceFile: TFile | { path: string; basename: string },
  sourceSlug?: string,
): Promise<boolean> {
  const existingPages = await getExistingWikiPages(
    ctx.app as never,
    ctx.settings.wikiFolder,
  );
  const page = existingPages.find(p => p.title === pageName);

  if (!page) {
    console.debug('Related page not found:', pageName);
    return false;
  }

  const abstractFile = ctx.app.vault.getAbstractFileByPath(page.path);
  if (!(abstractFile instanceof TFile)) {
    console.debug('Related page is not a file:', pageName);
    return false;
  }

  const existingContent = await ctx.app.vault.read(abstractFile);

  // 1. Programmatic frontmatter merge (sources + updated).
  // Issue #155: cite the canonical source PAGE link (disambiguated slug).
  const { frontmatter, body: existingBody } = mergeFrontmatter(
    existingContent,
    sourceSlug ? `sources/${sourceSlug}` : sourceFile.path,
  );

  // Issue #131: when the source extracted nothing matching this page, skip the
  // LLM entirely — record the new source in frontmatter and leave the body
  // untouched (a no-op rewrite corrupts verbatim text).
  const newInfo =
    analysis.entities.find(e => e.name === pageName) ||
    analysis.concepts.find(c => c.name === pageName);
  if (!newInfo) {
    await ctx.createOrUpdateFile(page.path, `${frontmatter}\n\n${existingBody}`);
    return true;
  }

  // Parity with createOrUpdatePage: a `reviewed: true` page must never have its
  // body LLM-rewritten — even when a different source extracts it here.
  if (parseFrontmatter(existingContent)?.reviewed === true) {
    await appendToReviewedPage(ctx, newInfo, sourceFile, existingContent, page.path);
    return true;
  }

  const labels = getSectionLabels(ctx.settings);

  // The Mentions section is programmatic since #244 and must never be
  // LLM-rewritten. Strip it from the prompt body so the model cannot drift its
  // format; it is re-attached deterministically by assembleFinalContent below.
  const promptBody = stripMentionsSection(existingBody, labels.mentions_in_source);

  const prompt = PROMPTS.updateRelatedPage
    .replace('{{page_name}}', pageName)
    .replace('{{existing_body}}', promptBody)
    .replace('{{source_basename}}', sourceFile.basename)
    .replace('{{new_info}}', JSON.stringify(newInfo))
    .replace('{{constraints}}', UNIVERSAL_LINK_CONSTRAINTS);

  const client = ctx.getClient();
  if (!client) throw new Error('LLM client not initialized');

  const updatedBody = await client.createMessage({
    model: resolveModelForTask(ctx.settings, 'ingest'),
    max_tokens: TOKENS_PAGE_GENERATION,
    system: await ctx.buildSystemPrompt('related'),
    messages: [{ role: 'user', content: prompt }],
    ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
  });

  const cleanedBody = cleanMarkdownResponse(updatedBody);

  // Parity with createNewPage / mergePage: this path used to persist the model's
  // reply verbatim, so it ran neither the header canonicalizer (#241) nor the
  // related-link prefix corrector (#187). A garbled section label therefore
  // stayed garbled — and Tier-B retrieval matches labels exactly — while a
  // `sources/`-mis-prefixed link in a Related section was never re-typed.
  const canonicalizedBody = canonicalizeSectionHeaders(cleanedBody, Object.values(labels));
  const correctedBody = correctRelatedLinkPrefixes(
    canonicalizedBody,
    newInfo.related_entities,
    newInfo.related_concepts,
    labels.related_entities,
    labels.related_concepts,
    ctx.settings.slugCase === 'preserve',
  );

  // Completeness is the schema's call, not the model's: restore any canonical
  // section that carried content before the rewrite and is wholly absent from
  // it. `promptBody` is the mentions-stripped body the model actually saw, so
  // the Mentions section is never a candidate here — assembleFinalContent
  // re-attaches it below.
  const guardedBody = preserveExistingSections(
    promptBody,
    correctedBody,
    Object.values(labels),
  );

  // 2. Assemble: programmatic frontmatter + LLM body + Mentions section.
  // Issue #267 established a non-lossy re-ingest on the merge path, but this
  // path never had it: the Mentions section lives in the body handed to the LLM,
  // so a rewrite that failed to reproduce it destroyed every accumulated quote.
  // Route through assembleFinalContent exactly as mergePage does — it unions the
  // page's mentions with this source's, and falls back to preserving an
  // unparseable section verbatim. `existingBody` (not promptBody) is passed so
  // the accumulated mentions are recovered from the unstripped page.
  await ctx.createOrUpdateFile(
    page.path,
    await assembleFinalContent(ctx, frontmatter, guardedBody, newInfo, sourceFile, existingBody),
  );
  return true;
}