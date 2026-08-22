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
import type { EntityInfo, ConceptInfo, LLMWikiSettings, LLMClient, SourceContext } from '../../types';
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
  reassertH1,
} from '../../core/section-header-canonicalizer';
import { correctRelatedLinkPrefixes } from '../../core/related-link-corrector';
import { mergeFrontmatter, parseFrontmatter } from '../../core/frontmatter';
import { appendContradictedByMarker } from '../../core/contradicted-marker';
import { injectMentionsSection } from '../../core/mentions-injector';
import { renderTemplate } from '../../core/template-renderer';
import { applySectionLabels, getSectionLabels } from '../system-prompts';
import { UNIVERSAL_LINK_CONSTRAINTS } from '../prompts/constraints';
import { getExistingWikiPages } from '../lint/get-existing-pages';
import { classifyMergeNeed, isSourceOwnPageLemma } from './merge-triage';
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
  sourceContext?: SourceContext,
): Promise<string | null> {
  const client = ctx.getClient();
  if (!client) throw new Error('LLM client not initialized');

  try {
    // 0. Hoist frontmatter + body above triage so both skip and merge paths share them.
    const { frontmatter, body: existingBody } = mergeFrontmatter(
      existingContent,
      sourceSlug ? `sources/${sourceSlug}` : sourceFile.path,
    );

    // Issue #312 part 2 — deterministic, no LLM: is this source the page's own
    // subject? Compared against the page FILE name (the page's identity) plus
    // its curated aliases; slug comparison on both sides, so "Silent
    // Inflammation.md" matches the page "Silent-Inflammation".
    const pageBasename = path.split('/').pop()?.replace(/\.md$/i, '') ?? '';
    const existingAliases = parseFrontmatter(existingContent)?.aliases;
    const sourceOwnsPage = isSourceOwnPageLemma({
      pageName: pageBasename,
      pageAliases: Array.isArray(existingAliases) ? existingAliases : undefined,
      sourceBasename: sourceFile.basename,
      sourceContext,
    });

    // 1. v1.24.0 #216 — classify-then-route triage.
    let shouldSkip = false;
    let complementaryBody: string | null = null;
    // v1.25.10 PATCH DocTpoint §4: track whether the rewrite path was
    // triggered by a contradiction so we can stamp the frontmatter
    // marker. Default to 'merge' (no marker) when triage fails or is
    // not classified.
    let contradictedSourcePath: string | null = null;
    try {
      const triage = await classifyMergeNeed(ctx, info, pageType, sourceFile, existingBody, sourceContext);

      // #312 part 2: a page's own primary source must not be dropped on a
      // novelty judgement — that is how an incidental mention keeps a
      // definition it wrote first. Route it to the body merge, which is the
      // prompt's own stated default whenever the call is not clear-cut.
      // Deliberately narrow: only `skip` is overridden. `complementary`
      // already writes the new facts, and rerouting it would trade a targeted
      // append for a full rewrite without cause.
      const strategy = triage.strategy === 'skip' && sourceOwnsPage ? 'merge' : triage.strategy;
      if (strategy !== triage.strategy) {
        console.debug(
          `[mergePage] triage=skip overridden to merge — "${sourceFile.basename}" carries this page's own lemma (#312) for ${path}`,
        );
      }

      if (strategy === 'skip') {
        console.debug(
          `[mergePage] triage=skip reason="${triage.reason}" — preserving existing body for ${path}`,
        );
        shouldSkip = true;
      } else if (strategy === 'complementary' && triage.items.length > 0) {
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
      } else if (strategy === 'contradictory') {
        // v1.25.10 PATCH DocTpoint §4 — flag the frontmatter for the
        // downstream call below. We fall through to the body-rewrite
        // path; the marker is stamped just before the assemble call.
        contradictedSourcePath = sourceFile.path;
        console.debug(
          `[mergePage] triage=contradictory — will stamp frontmatter marker for ${path} (source=${sourceFile.path})`,
        );
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

    const prompt = renderTemplate(mergePrompt, {
      existing_body: existingBody,
      new_source: sourceFile.basename,
      entity_summary: info.summary,
      concept_summary: info.summary,
      related_entities: info.related_entities?.join(', ') || '',
      related_concepts: info.related_concepts?.join(', ') || '',
      key_details: firstQuotesForPrompt(info),
    });

    // #328 Phase 1 follow-up: user-layer tag-vocab removed — system layer injects once.
    const finalPrompt = applySectionLabels(prompt, ctx.settings);

    const mergedBody = await client.createMessage({
      task: 'merge-body',
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
      // #482 stage 2: the merge prompt no longer carries a page list, so the
      // link targets are resolved here — against every page, not a window.
      { wikiFolder: ctx.settings.wikiFolder, pages: await getExistingWikiPages(ctx.app as never, ctx.settings.wikiFolder) },
    );
    // Completeness is the schema's call, not the model's: restore any canonical
    // section that carried content before the rewrite and is wholly absent from
    // it. The Mentions section is re-attached by assembleFinalContent below.
    const guardedBody = preserveExistingSections(
      existingBody,
      correctedBody,
      Object.values(labels),
      labels.mentions_in_source,
    );

    // #419: the guard above owns `##` blocks only, so the title line falls
    // between the layers — the model is asked for the whole body and the reply
    // routinely starts at the first `##`. Restore the page's own H1.
    const titledBody = reassertH1(existingBody, guardedBody);
    await ctx.createOrUpdateFile(
      path,
      await assembleFinalContent(
        ctx,
        // v1.25.10 PATCH DocTpoint §4 — when triage returned `contradictory`,
        // stamp the source on the rewritten frontmatter so Lint can surface
        // pages whose rewrite was triggered by a conflict rather than a
        // routine merge. Unknown-field preservation (PR A Step 2) keeps the
        // marker across subsequent re-touches; the helper dedupes by
        // sourcePath so idempotent re-runs are safe.
        contradictedSourcePath
          ? appendContradictedByMarker(frontmatter, contradictedSourcePath)
          : frontmatter,
        titledBody,
        info,
        sourceFile,
        existingBody,
      ),
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
    const prompt = renderTemplate(PROMPTS.appendToReviewedPage, {
      existing_body: existingBody,
      new_source: sourceFile.basename,
      entity_summary: info.summary,
      key_details: firstQuotesForPrompt(info),
      constraints: UNIVERSAL_LINK_CONSTRAINTS,
    });

    // #328 Phase 1 follow-up: user-layer tag-vocab removed — system layer injects once.
    const finalPrompt = applySectionLabels(prompt, ctx.settings);

    const newContent = await client.createMessage({
      task: 'reviewed-append',
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