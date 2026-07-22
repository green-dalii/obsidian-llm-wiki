// page-factory/merge-triage.ts — Issue #216 merge triage: ask the LLM whether
// the new entity/concept info should be merged, skipped, appended as
// complementary content, or treated as contradictory. Also builds the
// compact `{{new_info}}` payload the triage prompt consumes.
//
// Extracted from the original page-factory.ts god-class so the LLM triage
// validation rules (defensive shape checks on `strategy` / `items`) are
// independently testable.
//
// Behavior (v1.24.1 Phase 2 refactor — preserved verbatim):
//   - classifyMergeNeed renders the merge analysis prompt with the localized
//     section labels, calls the LLM, parses JSON, and validates the strategy
//     string and complementary-item shape. Any validation failure throws
//     so the caller can fall back to the default merge path.
//   - buildNewInfoSummary mirrors the fields the full merge prompt uses but
//     kept tight to control classify-token cost.

import { TFile } from 'obsidian';
import type { EntityInfo, ConceptInfo, LLMWikiSettings } from '../../types';
import { PROMPTS } from '../../prompts';
import { parseJsonResponse } from '../../core/json';
import { TOKENS_MERGE_TRIAGE } from '../../constants';
import { resolveModelForTask } from '../../core/model-resolver';
import { getSectionLabels, applySectionLabels } from '../system-prompts';
import { firstQuotesForPrompt } from './contextualize';

/** Strategy selected by the LLM for handling new information vs. an existing page. */
export type MergeStrategy = 'merge' | 'skip' | 'complementary' | 'contradictory';

/** A single complementary append item (only populated when strategy === 'complementary'). */
export interface ComplementaryItem {
  kind: 'complementary';
  content: string;
  target_section: string;
  reason?: string;
}

/**
 * Single source of truth for the runtime list of valid strategies. Derived
 * from the `MergeStrategy` union literal so adding a new strategy to the
 * type forces a runtime check update at compile time.
 */
export const MERGE_STRATEGIES = ['merge', 'skip', 'complementary', 'contradictory'] as const satisfies readonly MergeStrategy[];

/** Result of classifyMergeNeed. */
export interface MergeTriageResult {
  strategy: MergeStrategy;
  items: ComplementaryItem[];
  reason: string;
}

/**
 * Minimal context contract required by `classifyMergeNeed`. Production
 * callers pass the real EngineContext; tests inject a mock with the same
 * shape.
 */
export interface MergeTriageContext {
  settings: LLMWikiSettings;
  getClient(): { createMessage: (...args: unknown[]) => Promise<string> } | null;
  buildSystemPrompt(mode: 'full' | 'compact' | 'merge'): Promise<string>;
}

/**
 * Ask the LLM whether the new info should be merged, skipped, appended as
 * complementary content, or treated as contradictory.
 *
 * Throws on invalid response shapes (unknown strategy, complementary with
 * empty items, missing content / target_section) so the caller can fall
 * back to the default merge path.
 */
export async function classifyMergeNeed(
  ctx: MergeTriageContext,
  info: EntityInfo | ConceptInfo,
  pageType: 'entity' | 'concept',
  sourceFile: TFile | { path: string; basename: string },
  existingContent: string,
): Promise<MergeTriageResult> {
  const client = ctx.getClient();
  if (!client) throw new Error('LLM client not initialized');

  // Tier-2: include the localized section labels so the LLM returns
  // target_section values that match the existing page's headers
  // (matters for i18n wikis where labels are translated).
  const labels = getSectionLabels(ctx.settings);
  const sectionLabelsList = Object.values(labels).join('\n- ');

  const triagePrompt = PROMPTS.mergeAnalysis
    .replace('{{page_name}}', info.name)
    .replace('{{page_type}}', pageType)
    .replace('{{existing_content}}', existingContent)
    .replace('{{new_info}}', buildNewInfoSummary(info, sourceFile))
    .replace('{{section_labels}}', `- ${sectionLabelsList}`);

  // Issue #328 Phase 1 follow-up: removed appendTagVocabularyToPrompt wrapper
  // because the system layer now always injects the same section once.
  const finalPrompt = applySectionLabels(triagePrompt, ctx.settings);

  const response = await client.createMessage({
    model: resolveModelForTask(ctx.settings, 'ingest'),
    max_tokens: TOKENS_MERGE_TRIAGE,
    system: await ctx.buildSystemPrompt('merge'),
    messages: [{ role: 'user', content: finalPrompt }],
    response_format: { type: 'json_object' },
    ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
  });

  const parsed = (await parseJsonResponse(response)) as {
    strategy?: string;
    items?: Array<{
      kind?: string;
      content?: string;
      target_section?: string;
      reason?: string;
    }>;
    reason?: string;
  } | null;

  if (!parsed) throw new Error('merge triage: empty response');
  if (!(MERGE_STRATEGIES as readonly string[]).includes(parsed.strategy ?? '')) {
    throw new Error(`merge triage: invalid strategy "${parsed.strategy}"`);
  }
  const strategy = parsed.strategy as MergeStrategy;
  const reason = typeof parsed.reason === 'string' ? parsed.reason : '';

  // Items are populated only for the complementary path. Validate the
  // shape defensively — invalid items throw so the caller falls back.
  const items: ComplementaryItem[] = [];
  if (strategy === 'complementary') {
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    if (rawItems.length === 0) {
      // Defensive: classify said complementary but no items — caller falls back.
      throw new Error('merge triage: complementary strategy with empty items');
    }
    for (const item of rawItems) {
      if (
        typeof item?.content !== 'string' || item.content.trim() === '' ||
        typeof item?.target_section !== 'string' || item.target_section.trim() === ''
      ) {
        throw new Error('merge triage: invalid complementary item');
      }
      items.push({
        kind: 'complementary',
        content: item.content,
        target_section: item.target_section,
        reason: typeof item.reason === 'string' ? item.reason : undefined,
      });
    }
  }

  return { strategy, items, reason };
}

/**
 * v1.24.0 #216 — build the compact `{{new_info}}` payload for the triage
 * prompt. Mirrors the fields the full merge prompt uses, but kept tight to
 * control classify-token cost.
 */
export function buildNewInfoSummary(
  info: EntityInfo | ConceptInfo,
  sourceFile: TFile | { path: string; basename: string },
): string {
  const parts: string[] = [];
  parts.push(`Source: ${sourceFile.basename}`);
  parts.push(`Summary: ${info.summary}`);
  if (info.related_entities?.length) {
    parts.push(`Related entities: ${info.related_entities.join(', ')}`);
  }
  if (info.related_concepts?.length) {
    parts.push(`Related concepts: ${info.related_concepts.join(', ')}`);
  }
  const quotes = firstQuotesForPrompt(info);
  if (quotes) parts.push(`Key details: ${quotes}`);
  return parts.join('\n');
}