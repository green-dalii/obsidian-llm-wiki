// v1.24.0: contradiction-phase extracted from controller.ts:runLintWiki
// (lines 372-407).
//
// This phase performs the contradiction-tracking step:
//   1. Fetch all open contradictions from the wiki engine.
//   2. For items in 'review_ok' status, attempt to auto-resolve them
//      (resolve + mark status='resolved'). On failure, mark as 'pending_fix'
//      so the user can investigate manually.
//   3. Re-fetch the open contradictions; any that remain (non-review_ok or
//      failed-to-resolve) are rendered into a markdown section that the
//      controller appends to the Lint report.
//
// Pure helper (`formatContradictionReport`) is exported for unit testing;
// `runContradictionPhase` is the integration entrypoint.

import { TEXTS } from '../../../texts';
import type { LintPhaseContext } from '../types';

export interface ContradictionItem {
  path: string;
  status: string;
  claim: string;
}

export interface ContradictionTexts {
  lintContradictionSection: string;
  lintContradictionOpen: string;
  lintContradictionAutoFixed: string;
  lintContradictionStatusDetected: string;
  lintContradictionStatusPendingFix: string;
  lintContradictionItem: string;
}

export interface ContradictionPhaseResult {
  /** Markdown report; empty when nothing to report. */
  report: string;
  /** Number of 'review_ok' items successfully auto-resolved. */
  autoResolved: number;
  /** Number of remaining open contradictions after this run. */
  remaining: number;
}

/**
 * Pure helper: render the contradiction section markdown.
 *
 * Returns empty string when `remaining` is empty. Otherwise produces a
 * `## <section>` header + bullet list, including an "auto-fixed" annotation
 * when `resolvedCount > 0`.
 */
export function formatContradictionReport(
  remaining: ContradictionItem[],
  t: ContradictionTexts,
  wikiFolder: string,
  resolvedCount: number = 0,
): string {
  if (remaining.length === 0) return '';

  const lines: string[] = [];
  lines.push(`## ${t.lintContradictionSection}`);
  lines.push('');
  lines.push(`- ${t.lintContradictionOpen.replace('{count}', String(remaining.length))}`);
  if (resolvedCount > 0) {
    lines[lines.length - 1] += ` ${t.lintContradictionAutoFixed.replace('{count}', String(resolvedCount))}`;
  }
  lines.push('');
  for (const c of remaining) {
    const relPath = c.path.replace(wikiFolder + '/', '').replace('.md', '');
    const statusLabel = c.status === 'detected' ? t.lintContradictionStatusDetected
      : c.status === 'pending_fix' ? t.lintContradictionStatusPendingFix
      : c.status;
    lines.push(t.lintContradictionItem
      .replace('{status}', statusLabel)
      .replace('{page}', relPath)
      .replace('{claim}', c.claim.substring(0, 80)));
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Run the contradiction-tracking phase. Returns a structured result; the
 * caller is responsible for appending `result.report` to the Lint report.
 *
 * Behavior mirrors controller.ts:runLintWiki lines 372-407:
 * - `getOpenContradictions` is called twice: once before, once after the
 *   resolve loop. This double-call is intentional — it lets the report
 *   reflect state AFTER auto-resolve (so a fully-resolved wiki produces
 *   an empty contradiction section).
 * - On resolve failure, the item is marked 'pending_fix' so the user can
 *   see it in the lint UI; the success counter is NOT incremented.
 */
export async function runContradictionPhase(
  ctx: LintPhaseContext,
): Promise<ContradictionPhaseResult> {
  const openContradictions: ContradictionItem[] = await ctx.wikiEngine.getOpenContradictions();

  // Step 1: auto-resolve 'review_ok' items
  const reviewOkItems = openContradictions.filter(c => c.status === 'review_ok');
  for (const c of reviewOkItems) {
    try {
      await ctx.wikiEngine.resolveContradiction(c.path);
      await ctx.wikiEngine.updateContradictionStatus(c.path, 'resolved');
    } catch (error) {
      // v1.24.0 W11: preserve diagnostic output. The OLD controller.ts catch
      // logged `console.error('Failed to resolve contradiction:', c.path, error)`
      // which supports debugging transient wikiEngine failures; without it,
      // repeated 'pending_fix' transitions were silent in production.
      console.error('Failed to resolve contradiction:', c.path, error);
      // Don't crash the whole phase for one bad item; mark for manual review.
      await ctx.wikiEngine.updateContradictionStatus(c.path, 'pending_fix');
    }
  }

  // Step 2: re-fetch and render the report
  const remaining: ContradictionItem[] = await ctx.wikiEngine.getOpenContradictions();
  // v1.24.0 W4: autoResolved count semantic matches the OLD controller.ts
  // behavior — `openContradictions.length - remaining.length`. This counts
  // every item that was in the open list at phase start and is no longer
  // there at phase end, regardless of whether the in-phase `resolve` +
  // `updateStatus` succeeded or whether a concurrent process reclassified
  // the item. The v1.24.0 first-pass implementation counted only the
  // in-phase successful resolves, silently undercounting when a transient
  // wikiEngine error left a review_ok item still in the open list. This
  // test pin: the report's "(N auto-fixed)" annotation should reflect the
  // user's perception of "items that disappeared while I was looking".
  const autoResolved = openContradictions.length - remaining.length;
  const lang = ctx.settings.language;
  const t = TEXTS[lang] as unknown as ContradictionTexts;
  const wikiFolder = ctx.settings.wikiFolder;
  const report = formatContradictionReport(remaining, t, wikiFolder, autoResolved);

  return { report, autoResolved, remaining: remaining.length };
}
