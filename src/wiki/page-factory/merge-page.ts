// page-factory/merge-page.ts — merge new info into an EXISTING page.
//
// Extracted from the original page-factory.ts god-class. Contains the two
// merge paths:
//
//   - mergePage: the main path. Runs triage (skip / complementary / merge /
//     contradictory), then either preserves the body (skip), appends per-
//     section (complementary), or rewrites the body via the LLM
//     (merge / contradictory).
//   - appendToReviewedPage: a stripped-down variant for `reviewed: true`
//     pages. The page's existing content is locked; we only ask the LLM
//     to draft a small new block.
//
// Both share Issue #244 programmatic Mentions injection via
// `assembleFinalContent` (mentions-integration.ts) so conversation-source
// citation and the #267 union logic apply uniformly.
//
// Behavior (v1.24.1 Phase 2 refactor — preserved verbatim):
//   - mergePage's triage failure is non-fatal — it falls through to the
//     merge path (backward compatible). The actual `createOrUpdateFile`
//     write happens INSIDE the try so a triage failure cannot be
//     misclassified as a write failure (and trigger a double-write).
//   - The complementary-path NO_NEW_CONTENT fallback: if every per-section
//     LLM call returned NO_NEW_CONTENT, fall through to the merge path
//     so the new info isn't silently lost.
//   - appendToReviewedPage: writes the new block + locks the existing
//     Mentions section (pageIsReviewed: true).

import { TFile } from 'obsidian';
import type { EntityInfo, ConceptInfo, LLMWikiSettings, LLMClient } from '../../types';
import {
  TOKENS_PAGE_GENERATION,
  TOKENS_APPEND_REVIEWED,
} from '../../constants';
import { PROMPTS } from '../../prompts';
import { resolveModelForTask } from '../../core/model-resolver';
import { cleanMarkdownResponse } from '../../core/markdown';
import {
  canonicalizeSectionHeaders,
  preserveExistingSections,
} from '../../core/section-header-canonicalizer';
import { stripMentionsSection } from '../../core/mentions-parser';
import { correctRelatedLinkPrefixes } from '../../core/related-link-corrector';
import { mergeFrontmatter } from '../../core/frontmatter';
import { injectMentionsSection } from '../../core/mentions-injector';
import { applySectionLabels, appendTagVocabularyToPrompt, getSectionLabels } from '../system-prompts';
import { UNIVERSAL_LINK_CONSTRAINTS } from '../prompts/constraints';
import { buildPagesListForPrompt } from './path-resolution';
import { classifyMergeNeed } from './merge-triage';
import { assembleFinalContent } from './mentions-integration';
import { applyComplementaryAppends } from './complementary-appends';
import { firstQuotesForPrompt, isConversationSource, mergeError } from './contextualize';

/**
 * Minimal context contract required by mergePage / appendToReviewedPage.
 * Production callers pass the real EngineContext.
 */
export interface MergeContext {
  app: unknown;
  settings: LLMWikiSettings;
  getClient(): LLMClient | null;
  buildSystemPrompt(mode: 'full' | 'compact' | 'merge'): Promise<string>;
  createOrUpdateFile(path: string, content: string): Promise<void>;
  tryReadFile(path: string): Promise<string | null>;
}

/**
 * Issue #216 merge path: triage new info, then route to one of
 *   skip — preserve body, only re-merge frontmatter
 *   complementary — append per-section via the Tier-2 LLM calls
 *   merge / contradictory — rewrite the body via the main LLM call
 *
 * Returns the path that was written, or null on a hard failure (NO_NEW_CONTENT
 * is treated as success and returns the path unchanged).
 */
export async function mergePage(
  ctx: MergeContext,
  info: EntityInfo | ConceptInfo,
  pageType: 'entity' | 'concept',
  sourceFile: TFile | { path: string; basename: string },
  existingContent: string,
  extraPagePaths: string[],
  path: string,
  sourceSlug?: string,
): Promise<string | null> {
  const client = ctx.getClient();
  if (!client) throw new Error('LLM client not initialized');

  try {
    // 0. Hoist frontmatter + body above triage so both skip and merge paths share them.
    const { frontmatter, body: existingBody } = mergeFrontmatter(
      existingContent,
      sourceSlug ? `sources/${sourceSlug}` : sourceFile.path,
    );

    // 1. v1.24.0 #216 — classify-then-route triage.
    let shouldSkip = false;
    let complementaryBody: string | null = null;
    try {
      const triage = await classifyMergeNeed(ctx, info, pageType, sourceFile, existingBody);
      if (triage.strategy === 'skip') {
        console.debug(
          `[mergePage] triage=skip reason="${triage.reason}" — preserving existing body for ${path}`,
        );
        shouldSkip = true;
      } else if (triage.strategy === 'complementary' && triage.items.length > 0) {
        console.debug(
          `[mergePage] triage=complementary items=${triage.items.length} — appending to existing sections for ${path}`,
        );
        complementaryBody = await applyComplementaryAppends(
          ctx,
          triage.items,
          existingBody,
          info,
          sourceFile,
        );
        if (complementaryBody === existingBody) {
          console.debug(
            `[mergePage] complementary path produced no per-section appends — falling back to body-merge for ${path}`,
          );
        } else {
          shouldSkip = true; // signal "use existing frontmatter + write complementaryBody"
        }
      }
      // strategy === 'merge' | 'contradictory': fall through to body rewrite.
    } catch (triageError) {
      console.warn(
        `[mergePage] triage failed (${triageError instanceof Error ? triageError.message : String(triageError)}) — falling back to merge path`,
      );
    }

    if (shouldSkip) {
      const bodyToWrite = complementaryBody ?? existingBody;
      await ctx.createOrUpdateFile(
        path,
        await assembleFinalContent(ctx, frontmatter, bodyToWrite, info, sourceFile, existingBody),
      );
      return path;
    }

    // 2. LLM intelligent body merge.
    const mergePrompt = pageType === 'entity' ? PROMPTS.mergeEntityPage : PROMPTS.mergeConceptPage;

    const prompt = mergePrompt
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{concept_summary}}', info.summary)
      .replace('{{related_entities}}', info.related_entities?.join(', ') || '')
      .replace('{{related_concepts}}', info.related_concepts?.join(', ') || '')
      .replace('{{key_details}}', firstQuotesForPrompt(info))
      .replace('{{existing_pages}}', await buildPagesListForPrompt(ctx, extraPagePaths));

    const finalPrompt = appendTagVocabularyToPrompt(applySectionLabels(prompt, ctx.settings), ctx.settings);

    const mergedBody = await client.createMessage({
      model: resolveModelForTask(ctx.settings, 'ingest'),
      max_tokens: TOKENS_PAGE_GENERATION,
      system: await ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }],
      ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedBody = cleanMarkdownResponse(mergedBody);

    if (cleanedBody.trim() === 'NO_NEW_CONTENT') {
      console.debug(`${pageType} page merge returned NO_NEW_CONTENT, keeping existing:`, path);
      return path;
    }

    // 3. Assemble final content (re-assert related-link types deterministically).
    const labels = getSectionLabels(ctx.settings);
    const canonicalizedBody = canonicalizeSectionHeaders(cleanedBody, Object.values(labels));
    const correctedBody = correctRelatedLinkPrefixes(
      canonicalizedBody,
      info.related_entities,
      info.related_concepts,
      labels.related_entities,
      labels.related_concepts,
      ctx.settings.slugCase === 'preserve',
    );
    // Completeness is the schema's call, not the model's: restore any canonical
    // section that carried content before the rewrite and is wholly absent from
    // it. The old body is mentions-stripped first so that section is never a
    // candidate here — assembleFinalContent re-attaches it below.
    const guardedBody = preserveExistingSections(
      stripMentionsSection(existingBody, labels.mentions_in_source),
      correctedBody,
      Object.values(labels),
    );
    await ctx.createOrUpdateFile(
      path,
      await assembleFinalContent(ctx, frontmatter, guardedBody, info, sourceFile, existingBody),
    );
    return path;
  } catch (error) {
    throw mergeError(error, info.name, pageType);
  }
}

/**
 * Issue #216 — append-only path for `reviewed: true` pages. The existing
 * content is locked (the Mentions section is preserved by the pageIsReviewed
 * flag); we only ask the LLM to draft a small new block, then assemble.
 */
export async function appendToReviewedPage(
  ctx: MergeContext,
  info: EntityInfo | ConceptInfo,
  sourceFile: TFile | { path: string; basename: string },
  existingContent: string,
  path: string,
  sourceSlug?: string,
): Promise<string | null> {
  const client = ctx.getClient();
  if (!client) throw new Error('LLM client not initialized');

  try {
    // 1. Programmatic frontmatter merge
    // Issue #155: record the canonical source PAGE link (disambiguated slug).
    const { frontmatter, body: existingBody } = mergeFrontmatter(
      existingContent,
      sourceSlug ? `sources/${sourceSlug}` : sourceFile.path,
    );

    // 2. Minimal LLM check for genuinely new content.
    const prompt = PROMPTS.appendToReviewedPage
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{key_details}}', firstQuotesForPrompt(info))
      .replace('{{constraints}}', UNIVERSAL_LINK_CONSTRAINTS);

    const finalPrompt = appendTagVocabularyToPrompt(applySectionLabels(prompt, ctx.settings), ctx.settings);

    const newContent = await client.createMessage({
      model: resolveModelForTask(ctx.settings, 'ingest'),
      max_tokens: TOKENS_APPEND_REVIEWED,
      system: await ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }],
      ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedContent = cleanMarkdownResponse(newContent);

    if (cleanedContent.trim() === 'NO_NEW_CONTENT') {
      console.debug('Reviewed page has no new content, preserving existing:', path);
      return path;
    }

    // 3. Assemble final content (Issue #244: programmatic Mentions injection).
    const labels = getSectionLabels(ctx.settings);
    // B2: prefer structured provenance when present; only fall back to legacy
    // mentions_in_source if the structured form is absent (not just empty).
    const isConv = isConversationSource(sourceFile, ctx.settings.wikiFolder);
    const appendMentionsForInject = isConv
      ? []
      : (info.mentions_with_provenance?.length
        ? info.mentions_with_provenance
        : info.mentions_in_source);
    const cleanedContentWithMentions = injectMentionsSection(
      cleanedContent,
      appendMentionsForInject,
      sourceFile.path,
      {
        sectionLabel: labels.mentions_in_source,
        conversationMode: isConv,
        conversationLabel: `Conversation: ${sourceFile.basename}`,
        // This path only runs for `reviewed: true` pages (page-factory routing
        // at createOrUpdatePage): the existing Mentions section is protected
        // and must not be overwritten (replaces the <!-- reviewed: keep --> marker).
        pageIsReviewed: true,
      },
    );
    const finalContent = `${frontmatter}\n\n${cleanedContentWithMentions}`;
    await ctx.createOrUpdateFile(path, finalContent);
    return path;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update reviewed page "${info.name}": ${msg}`);
  }
}