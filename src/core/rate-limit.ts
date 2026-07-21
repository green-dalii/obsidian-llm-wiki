import { getText } from './i18n';

export interface RateLimitInfo {
  count: number;
  rateLimitNames: string[];
  suggestedConcurrency: number;
  suggestedDelay: number;
}

export function detectRateLimitFailures(
  failedItems: Array<{ reason?: string; name?: string; type?: string }>,
  currentConcurrency: number,
  currentBatchDelay: number,
): RateLimitInfo | null {
  const rateLimitFailures = failedItems.filter(f =>
    /429|rate.?limit|too many requests|throttl/i.test(f.reason || '')
  );

  if (rateLimitFailures.length === 0) return null;

  return {
    count: rateLimitFailures.length,
    rateLimitNames: rateLimitFailures.map(f => f.name || f.reason || 'unknown'),
    suggestedConcurrency: Math.max(1, currentConcurrency - 1),
    suggestedDelay: currentBatchDelay < 100
      ? 500
      : Math.min(2000, Math.round(currentBatchDelay * 2))
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
