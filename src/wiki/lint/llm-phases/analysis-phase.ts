// v1.24.0: analysis-phase extracted from controller.ts:runLintWiki
// (lines 409-470).
//
// This phase performs the LLM-assisted health analysis step:
//   1. Read the wiki index.md
//   2. Build a content sample from the first 8 pages (600 chars each)
//   3. Construct the LLM analysis prompt by substituting 5 placeholders
//      and applying user settings (extractionGranularity, tagVocabulary)
//   4. Call the LLM with max_tokens = TOKENS_LINT_DEDUP_LLM
//   5. Clean the response markdown and return the result string
//
// Pure helpers (`buildContentSample`, `buildAnalysisPrompt`) are exported
// for unit testing.

import { getText } from '../../../core/i18n';
import { TEXTS } from '../../../texts';
import { cleanMarkdownResponse } from '../../../core/markdown';
import { appendGranularityToPrompt } from '../../system-prompts';
import { TOKENS_LINT_DEDUP_LLM } from '../../../constants';
import { resolveModelForTask } from '../../../core/model-resolver';
import type { LintPhaseContext, ScannerPage } from '../types';

export interface AnalysisPhaseInput {
  wikiFiles: Array<{ path: string; basename: string }>;
  pageMap: Map<string, ScannerPage>;
  /** Programmatic findings report (output of buildLintReport) */
  progReport: string;
}

/**
 * Pure helper: build a content sample string for the LLM analysis prompt.
 *
 * Format: for each of the first 8 wiki files, emit `\n### <basename>\n<body>\n`
 * where body is the first 600 characters of the page content. Pages missing
 * from the pageMap are silently skipped.
 */
export function buildContentSample(
  wikiFiles: Array<{ path: string; basename: string }>,
  pageMap: Map<string, ScannerPage>,
  maxPages: number = 8,
  maxChars: number = 600,
): string {
  const samplePages = wikiFiles.slice(0, maxPages);
  let contentSample = '';
  for (const file of samplePages) {
    const info = pageMap.get(file.path);
    if (info) {
      const body = info.content.substring(0, maxChars);
      contentSample += `\n### ${info.basename}\n${body}\n`;
    }
  }
  return contentSample;
}

/**
 * Pure helper: substitute the 5 placeholders in the analysis prompt and
 * apply user settings (extractionGranularity + tag vocabulary).
 *
 * When `progReport` is empty, the placeholder is filled with the caller-
 * supplied `emptySentinel` (typically a localized string — see W2 fix
 * for l10n plumbing). The LLM then sees a prompt in the user's language
 * instead of an English sentinel leaking into a zh/ja/ko LLM call.
 */
export function buildAnalysisPrompt(
  template: string,
  settings: LintPhaseContext['settings'],
  indexContent: string,
  contentSample: string,
  progReport: string,
  totalPages: number,
  sampleCount: number,
  emptySentinel: string,
): string {
  const withPlaceholders = template
    .replace('{index}', indexContent)
    .replace('{total}', String(totalPages))
    .replace('{sample}', String(sampleCount))
    .replace('{contentSample}', contentSample)
    .replace('{progReport}', progReport || emptySentinel);

  // #328 Phase 1 follow-up: user-layer tag-vocab removed — system layer injects once.
  return appendGranularityToPrompt(withPlaceholders, settings);
}

/**
 * Run the LLM-assisted health analysis phase. Returns the cleaned LLM
 * response as a markdown string. Caller is responsible for inserting it
 * into the Lint report (controller decides heading + position).
 *
 * Behavior mirrors controller.ts:runLintWiki lines 435-470:
 * - Throws (rather than returning '') if `ctx.llmClient` is null, matching
 *   the OLD inline code where the unguarded `ctx.llmClient.createMessage`
 *   would throw a TypeError. The controller's outer try/catch surfaces the
 *   error as a Notice. v1.24.0 first-pass silently returned '' which
 *   produced a "no LLM analysis" report with no error indicator — review
 *   finding W3 rejected this.
 * - Calls `checkCancelled()` immediately before the LLM call so users
 *   can cancel mid-analysis. v1.24.0 first-pass dropped this hook —
 *   review finding B2 restored it.
 */
export async function runAnalysisPhase(
  ctx: LintPhaseContext,
  input: AnalysisPhaseInput,
  checkCancelled: () => void,
): Promise<string> {
  // B3 fix: invoke the getter closure. The earlier top-level `ctx.llmClient`
  // read captured a snapshot; the getter form observes mid-lint settings
  // changes (e.g. user swaps API key in Settings).
  if (!ctx.llmClient()) {
    throw new Error('runAnalysisPhase: LLM client not available');
  }

  // v1.24.0 (B2): honor cancellation early so the user can abort
  // the 30-90s LLM call from the status bar.
  checkCancelled();

  const t = TEXTS[ctx.settings.language];
  const indexContent = (await ctx.wikiEngine.tryReadFile(`${ctx.settings.wikiFolder}/index.md`)) || '';

  const contentSample = buildContentSample(input.wikiFiles, input.pageMap);
  const totalPages = input.wikiFiles.length;

  // v1.24.0 (W2): localize the "No issues detected" sentinel so non-EN
  // users don't see English in their LLM prompt. The text key is added
  // to each locale; falls back to EN if a locale forgets it.
  const progReportSentinel = getText(ctx.settings.language, 'lintAnalysisProgReportEmpty');
  const prompt = buildAnalysisPrompt(
    t.lintAnalysisPrompt,
    ctx.settings,
    indexContent,
    contentSample,
    input.progReport,
    totalPages,
    Math.min(8, totalPages),
    progReportSentinel,
  );

  // Status updates — mirrors controller.ts:runLintWiki lines 460-461
  ctx.stageNotice?.setMessage(t.lintAnalyzingLLM);
  ctx.wikiEngine.updateStatusBar(getText(ctx.settings.language, 'lintStatusAnalyzing'));

  // v1.24.0 (B2): cancel check again right before the LLM call
  // because tryReadFile could have taken noticeable time on a slow vault.
  checkCancelled();

  // v1.24.0 B3: call the getter closure `ctx.llmClient()` instead of
  // dereferencing `ctx.llmClient` directly — the getter form observes
  // settings changes mid-lint (e.g. user swaps API key in Settings).
  const llm = ctx.llmClient();
  if (!llm) {
    throw new Error('runAnalysisPhase: LLM client not available');
  }
  // v1.24.0: compose the system prompt through the shared buildSystemPrompt
  // composer (language directive + schema context + active tag vocabulary),
  // matching the other lint LLM calls (fill-empty-page, fix-dead-link,
  // link-orphan, merge-duplicates).
  const systemPrompt = await ctx.buildSystemPrompt('lint');
  // v1.24.0 #208: log the resolved lint model so e2e verification of
  // per-task routing is visible from console output (the lint phase
  // is otherwise silent about which model it called).
  const lintModel = resolveModelForTask(ctx.settings, 'lint');
  console.debug('[runAnalysisPhase] lint model:', lintModel);
  const response = await llm.createMessage({
    model: lintModel,
    max_tokens: TOKENS_LINT_DEDUP_LLM,
    messages: [{ role: 'user', content: prompt }],
    ...(systemPrompt ? { system: systemPrompt } : {}),
    ...(ctx.settings.disableThinking ? { enableThinking: false } : {}),
  });

  return cleanMarkdownResponse(response);
}
