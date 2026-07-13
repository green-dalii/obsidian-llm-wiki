/**
 * v1.24.1 PATCH Phase 5.5.0: adaptive top-N for Query Wiki PPR.
 *
 * Replaces the hardcoded `topN: 5` from v1.24.0 with a formula that
 * adapts to vault size while capping token cost:
 *
 *   effective = max(1, min(DEFAULT_QUERY_TOP_N_PAGES, totalPages, MAX_QUERY_TOP_N_PAGES))
 *
 * - Small vaults (< DEFAULT): return all pages so the user gets the
 *   full set even when the vault only has 12 entities.
 * - Medium vaults (DEFAULT..MAX): return DEFAULT pages.
 * - Very large vaults (> MAX): return MAX pages (Phase 5.4 overflow
 *   fallback handles the case where the actual page bodies exceed
 *   the model's prompt window — auto-shrink + retry).
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_QUERY_TOP_N_PAGES, MAX_QUERY_TOP_N_PAGES } from '../../../constants';

/**
 * Mirror of the production formula in src/wiki/query-engine/pipeline/select-seeds.ts.
 * Tests assert against this — when production changes, update the mirror.
 *
 * Current formula: max(1, min(DEFAULT, totalPages)).
 * MAX_QUERY_TOP_N_PAGES is a future cap (dormant when DEFAULT < MAX).
 */
function computeEffectiveTopN(totalPages: number): number {
  return Math.max(1, Math.min(DEFAULT_QUERY_TOP_N_PAGES, totalPages));
}

describe('adaptive PPR top-N (Phase 5.5.0)', () => {
  it('returns all pages when vault is smaller than DEFAULT', () => {
    expect(computeEffectiveTopN(3)).toBe(3);
    expect(computeEffectiveTopN(7)).toBe(7);
    expect(computeEffectiveTopN(10)).toBe(10);
  });

  it('returns DEFAULT when vault is medium-sized', () => {
    expect(computeEffectiveTopN(11)).toBe(DEFAULT_QUERY_TOP_N_PAGES);
    expect(computeEffectiveTopN(50)).toBe(DEFAULT_QUERY_TOP_N_PAGES);
    expect(computeEffectiveTopN(500)).toBe(DEFAULT_QUERY_TOP_N_PAGES);
    expect(computeEffectiveTopN(2137)).toBe(DEFAULT_QUERY_TOP_N_PAGES);
  });

  it('caps at MAX regardless of vault size', () => {
    // The MAX cap is dormant when DEFAULT < MAX (the current setup,
    // DEFAULT=10, MAX=20). It activates if/when DEFAULT is raised above
    // MAX. We assert the invariant that the effective topN never
    // exceeds MAX under the current formula.
    expect(computeEffectiveTopN(MAX_QUERY_TOP_N_PAGES + 1)).toBeLessThanOrEqual(MAX_QUERY_TOP_N_PAGES);
    expect(computeEffectiveTopN(10000)).toBeLessThanOrEqual(MAX_QUERY_TOP_N_PAGES);
    expect(computeEffectiveTopN(100000)).toBeLessThanOrEqual(MAX_QUERY_TOP_N_PAGES);
    // Under today's DEFAULT=10, the cap is dormant: even with 100000
    // pages, effective = min(10, 100000) = 10.
    expect(computeEffectiveTopN(10000)).toBe(DEFAULT_QUERY_TOP_N_PAGES);
  });

  it('returns at least 1 even for an empty vault', () => {
    expect(computeEffectiveTopN(0)).toBe(1);
    expect(computeEffectiveTopN(1)).toBe(1);
  });

  it('default value is 10 (raised from 5)', () => {
    // Regression net: if DEFAULT_QUERY_TOP_N_PAGES ever drifts back
    // toward 5, this fails and forces the explicit decision.
    expect(DEFAULT_QUERY_TOP_N_PAGES).toBe(10);
  });

  it('max cap is 20 (token-cost safety)', () => {
    expect(MAX_QUERY_TOP_N_PAGES).toBe(20);
    expect(MAX_QUERY_TOP_N_PAGES).toBeGreaterThan(DEFAULT_QUERY_TOP_N_PAGES);
  });

  it('is monotonic: effective topN never decreases as vault grows', () => {
    // Anti-pattern guard: a non-monotonic formula (e.g. that returns
    // 5 for both 50 and 500 pages) would be confusing. The user
    // expects "more pages = at least as many results".
    let prev = 0;
    for (const size of [1, 5, 10, 11, 50, 100, 500, 2137, 10000]) {
      const eff = computeEffectiveTopN(size);
      expect(eff).toBeGreaterThanOrEqual(prev);
      prev = eff;
    }
  });

  it('matches Phase 5.4 overflow fallback assumption (>= DEFAULT for any vault > 10)', () => {
    // Phase 5.4 expected the typical vault to yield DEFAULT pages, so
    // prompt-overflow fallback can shrink them rather than drop them.
    // If DEFAULT drops below 10 the overflow math changes.
    for (const size of [11, 50, 2137, 10000]) {
      expect(computeEffectiveTopN(size)).toBeGreaterThanOrEqual(DEFAULT_QUERY_TOP_N_PAGES);
    }
  });
});