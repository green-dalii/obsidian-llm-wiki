import { getText } from './i18n';
import { MAX_BATCH_DELAY_MS } from '../constants';

export interface RateLimitInfo {
  count: number;
  rateLimitNames: string[];
  suggestedConcurrency: number;
  suggestedDelay: number;
}

/**
 * v1.26.0 (#382 item 1, Batch 2): single source of truth for the
 * "is this failure reason a 429-style rate limit?" predicate. Previously
 * the regex literal lived only inside `detectRateLimitFailures`; the
 * dedup-phase non-rate-limit diagnostic (added in the same commit)
 * needed the same predicate with inverted semantics. Exported here so
 * the regex cannot drift between callers.
 *
 * Adding/removing markers (e.g. 'quota exceeded') is a one-line edit
 * here; both consumers pick up the change automatically.
 */
const RATE_LIMIT_MARKER_RE = /429|rate.?limit|too many requests|throttl/i;

/**
 * v1.26.0 Batch 7 + CR-3 fix: accept a structured failure item (with
 * optional `type` discriminator). If the item carries
 * `type: 'parse-failure'`, return false UNCONDITIONALLY — the free-text
 * `reason` is irrelevant for rate-limit grouping. parse-failures are
 * mid-response (LLM returned a body but JSON parse failed) and have no
 * relationship to 429 / rate limiting.
 *
 * Items without `type` fall back to the original prose-string match
 * (preserves the v1.23.0 P1.5 contract for non-parse-failure callers
 * in `src/core/json.ts`, `src/llm-sdk/url-fallback.ts`, etc.).
 */
export function isRateLimitFailure(
  reasonOrItem: string | undefined | { reason?: string; type?: string },
): boolean {
  // Structured form: bail early if caller tagged the failure kind.
  if (typeof reasonOrItem === 'object' && reasonOrItem !== null) {
    if (reasonOrItem.type === 'parse-failure') return false;
    return RATE_LIMIT_MARKER_RE.test(reasonOrItem.reason || '');
  }
  // Plain string form: original contract.
  return RATE_LIMIT_MARKER_RE.test(reasonOrItem || '');
}

export function detectRateLimitFailures(
  failedItems: Array<{ reason?: string; name?: string; type?: string }>,
  currentConcurrency: number,
  currentBatchDelay: number,
): RateLimitInfo | null {
  // v1.26.0 Batch 7 + CR-3 fix (PR #411 simplify review 2026-08-05):
  // pass the full item so `isRateLimitFailure` can honor the
  // `type: 'parse-failure'` discriminator added in commit 6e6388a.
  // Before this fix the structured-form branch was unreachable — only
  // the free-text regex matched, which is exactly what the CR-3 fix
  // was meant to bypass.
  const rateLimitFailures = failedItems.filter(f => isRateLimitFailure(f));

  if (rateLimitFailures.length === 0) return null;

  return {
    count: rateLimitFailures.length,
    rateLimitNames: rateLimitFailures.map(f => f.name || f.reason || 'unknown'),
    suggestedConcurrency: Math.max(1, currentConcurrency - 1),
    suggestedDelay: currentBatchDelay < 100
      ? 500
      : Math.min(MAX_BATCH_DELAY_MS, Math.round(currentBatchDelay * 2))
  };
}

export function formatRateLimitNotice(
  info: RateLimitInfo,
  language: string,
): string {
  return getText(language, 'rateLimitDetected')
    .replace('{count}', String(info.count))
    .replace('{suggestedConcurrency}', String(info.suggestedConcurrency))
    .replace('{suggestedDelay}', String(info.suggestedDelay));
}
