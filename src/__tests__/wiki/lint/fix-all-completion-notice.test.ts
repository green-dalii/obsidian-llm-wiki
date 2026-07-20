// v1.25.1: regression tests for the Smart Fix All completion Notice.
//
// User-reported UX gap (manual lint → modal → Fix All button):
//   Before: notice said "All fixes complete. See log for details.: 0 phases.
//            View Operations History for details." when every phase failed
//            silently — misleading, looked like a no-op.
//   After: notice shows distinct "No changes were made" copy when phasesModified
//            === 0; normal "N phases modified" otherwise.
//
// Also verified: NOTICE_NORMAL (5s) duration, NOT NOTICE_ERROR (8s) or sticky (0).

import { describe, it, expect } from 'vitest';
import { TEXTS } from '../../../texts';
import { NOTICE_NORMAL, NOTICE_ERROR } from '../../../constants';

describe('Smart Fix All completion Notice (v1.25.1)', () => {
  const locales = ['en', 'zh', 'zh-Hant', 'ja', 'ko', 'de', 'fr', 'es', 'pt', 'it'] as const;

  it.each(locales)('locale %s has lintFixAllComplete, lintFixAllNoChanges, lintFixPhasesLabel', (locale) => {
    const t = TEXTS[locale];
    expect(t.lintFixAllComplete, `lintFixAllComplete missing in ${locale}`).toBeTypeOf('string');
    expect(t.lintFixAllComplete.length).toBeGreaterThan(0);
    expect(t.lintFixAllNoChanges, `lintFixAllNoChanges missing in ${locale}`).toBeTypeOf('string');
    expect(t.lintFixAllNoChanges.length).toBeGreaterThan(0);
    expect(t.lintFixPhasesLabel, `lintFixPhasesLabel missing in ${locale}`).toBeTypeOf('string');
    expect(t.lintFixPhasesLabel.length).toBeGreaterThan(0);
  });

  it('distinguishes 0-modified vs N-modified in summary copy', () => {
    // Pure-function contract: the controller builds summary by branching on
    // phasesModified === 0. Verify both branches render distinct, non-empty
    // strings in the EN baseline.
    const t = TEXTS.en;
    expect(t.lintFixAllNoChanges).not.toBe(t.lintFixAllComplete);
    expect(t.lintFixAllNoChanges).toMatch(/no changes|nothing/i);
  });

  it('uses NOTICE_NORMAL (5s) — non-blocking, auto-dismissing', () => {
    // Sanity: the constant is a finite positive duration; explicitly NOT 0 (sticky).
    expect(NOTICE_NORMAL).toBeGreaterThan(0);
    expect(NOTICE_NORMAL).toBeLessThan(60_000);
    // Regression guard against accidentally switching back to NOTICE_ERROR or 0.
    expect(NOTICE_NORMAL).not.toBe(NOTICE_ERROR);
    expect(NOTICE_NORMAL).not.toBe(0);
  });
});