// v1.24.0: contradiction-phase extraction from controller.ts:runLintWiki.
//
// The original implementation in controller.ts (lines 372-407) does 3 things:
//   1. Fetch open contradictions
//   2. Auto-resolve items in 'review_ok' status
//   3. Render the contradiction section of the Lint report
//
// This phase extracts the work into a single async function returning a
// structured result. The pure helper `formatContradictionReport` is
// testable in isolation; the integration tests use a stub wikiEngine.

import { describe, it, expect, vi } from 'vitest';
import {
  formatContradictionReport,
  runContradictionPhase,
  type ContradictionPhaseResult,
} from '../../../../wiki/lint/llm-phases/contradiction-phase';
import type { LintPhaseContext } from '../../../../wiki/lint/types';

// ── Pure helper: formatContradictionReport ──────────────────────

describe('formatContradictionReport', () => {
  const t = {
    lintContradictionSection: 'Contradictions (detected)',
    lintContradictionOpen: 'Open contradictions: {count}',
    lintContradictionAutoFixed: '({count} auto-fixed)',
    lintContradictionStatusDetected: 'Detected',
    lintContradictionStatusPendingFix: 'Pending',
    lintContradictionItem: '- [{status}] {page} — {claim}',
  };

  it('returns empty string when there are no remaining contradictions', () => {
    const result = formatContradictionReport([], t, 'wiki');
    expect(result).toBe('');
  });

  it('renders a single contradiction as a markdown bullet', () => {
    const result = formatContradictionReport(
      [{ path: 'wiki/entities/foo.md', status: 'detected', claim: 'this contradicts something' }],
      t,
      'wiki',
    );
    expect(result).toContain('## Contradictions');
    expect(result).toContain('Open contradictions: 1');
    expect(result).toContain('Detected');
    expect(result).toContain('foo');
    expect(result).toContain('this contradicts something');
  });

  it('renders multiple contradictions, one bullet per line', () => {
    const result = formatContradictionReport(
      [
        { path: 'wiki/entities/a.md', status: 'detected', claim: 'claim 1' },
        { path: 'wiki/entities/b.md', status: 'pending_fix', claim: 'claim 2' },
      ],
      t,
      'wiki',
    );
    expect(result).toContain('Open contradictions: 2');
    expect(result).toContain('Detected');
    expect(result).toContain('entities/a');
    expect(result).toContain('Pending');
    expect(result).toContain('entities/b');
  });

  it('truncates claim to 80 characters', () => {
    const longClaim = 'x'.repeat(120);
    const result = formatContradictionReport(
      [{ path: 'wiki/entities/foo.md', status: 'detected', claim: longClaim }],
      t,
      'wiki',
    );
    // 80 chars + 1 whitespace = 81 chars of 'x' in the claim portion
    const xMatch = result.match(/x+/);
    expect(xMatch).not.toBeNull();
    expect(xMatch![0].length).toBe(80);
  });

  it('includes auto-fixed count when resolvedCount > 0', () => {
    const result = formatContradictionReport(
      [{ path: 'wiki/entities/a.md', status: 'detected', claim: 'c' }],
      t,
      'wiki',
      3, // 3 items were auto-resolved
    );
    expect(result).toContain('3 auto-fixed');
  });

  it('omits auto-fixed text when resolvedCount is 0', () => {
    const result = formatContradictionReport(
      [{ path: 'wiki/entities/a.md', status: 'detected', claim: 'c' }],
      t,
      'wiki',
      0,
    );
    expect(result).not.toContain('auto-fixed');
  });

  it('strips wikiFolder prefix from path to produce a relPath', () => {
    const result = formatContradictionReport(
      [{ path: 'wiki/entities/foo.md', status: 'detected', claim: 'c' }],
      t,
      'wiki',
    );
    expect(result).not.toContain('wiki/entities/foo.md');
    expect(result).toContain('entities/foo');
  });

  it('uses localized status label for pending_fix', () => {
    const result = formatContradictionReport(
      [{ path: 'wiki/entities/foo.md', status: 'pending_fix', claim: 'c' }],
      t,
      'wiki',
    );
    expect(result).toContain('Pending');
  });
});

// ── runContradictionPhase integration tests ─────────────────────

function makeLintPhaseContext(wikiEngine: LintPhaseContext['wikiEngine']): LintPhaseContext {
  return {
    app: {} as LintPhaseContext['app'],
    settings: { wikiFolder: 'wiki', language: 'en' } as LintPhaseContext['settings'],
    llmClient: () => null,
    wikiEngine,
    checkCancelled: () => {},
    stageNotice: { setMessage: () => {} },
    totalPages: 0,
    buildSystemPrompt: async () => undefined,
  };
}

describe('runContradictionPhase', () => {
  it('returns empty result when there are no open contradictions', async () => {
    const wikiEngine = {
      getOpenContradictions: vi.fn().mockResolvedValue([]),
      resolveContradiction: vi.fn(),
      updateContradictionStatus: vi.fn(),
    } as unknown as LintPhaseContext['wikiEngine'];
    const ctx = makeLintPhaseContext(wikiEngine);
    const result: ContradictionPhaseResult = await runContradictionPhase(ctx);
    expect(result).toEqual({ report: '', autoResolved: 0, remaining: 0 });
  });

  it('auto-resolves all review_ok items in one pass', async () => {
    const reviewOkItems = [
      { path: 'wiki/entities/a.md', status: 'review_ok', claim: 'c1' },
      { path: 'wiki/entities/b.md', status: 'review_ok', claim: 'c2' },
    ];
    // First call (initial) returns review_ok items; second call (after resolve)
    // returns [] because all were resolved.
    const getOpen = vi.fn()
      .mockResolvedValueOnce(reviewOkItems)
      .mockResolvedValueOnce([]);
    const resolve = vi.fn();
    const updateStatus = vi.fn();
    const wikiEngine = {
      getOpenContradictions: getOpen,
      resolveContradiction: resolve,
      updateContradictionStatus: updateStatus,
    } as unknown as LintPhaseContext['wikiEngine'];
    const ctx = makeLintPhaseContext(wikiEngine);
    const result = await runContradictionPhase(ctx);
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(updateStatus).toHaveBeenCalledWith('wiki/entities/a.md', 'resolved');
    expect(updateStatus).toHaveBeenCalledWith('wiki/entities/b.md', 'resolved');
    // v1.24.0 W4 fix: autoResolved = (initial open count) - (remaining open count).
    // Both review_ok items disappeared from the open list → 2 auto-resolved.
    expect(result.autoResolved).toBe(2);
    expect(result.remaining).toBe(0);
    expect(result.report).toBe('');
  });

  it('marks auto-resolve failure as pending_fix instead of resolved', async () => {
    const reviewOkItems = [
      { path: 'wiki/entities/a.md', status: 'review_ok', claim: 'c1' },
      { path: 'wiki/entities/b.md', status: 'review_ok', claim: 'c2' },
    ];
    const getOpen = vi.fn()
      .mockResolvedValueOnce(reviewOkItems)
      .mockResolvedValueOnce([{ path: 'wiki/entities/a.md', status: 'detected', claim: 'c1' }]);
    const resolve = vi.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValueOnce(undefined);
    const updateStatus = vi.fn();
    const wikiEngine = {
      getOpenContradictions: getOpen,
      resolveContradiction: resolve,
      updateContradictionStatus: updateStatus,
    } as unknown as LintPhaseContext['wikiEngine'];
    const ctx = makeLintPhaseContext(wikiEngine);
    const result = await runContradictionPhase(ctx);
    expect(updateStatus).toHaveBeenCalledWith('wiki/entities/a.md', 'pending_fix');
    expect(updateStatus).toHaveBeenCalledWith('wiki/entities/b.md', 'resolved');
    // v1.24.0 W4: autoResolved = initialOpen - remainingOpen = 2 - 1 = 1.
    // (Same number as the v1.24.0 first-pass implementation because
    // the rejected review_ok stays in the open list — but the SEMANTIC
    // shifted: first-pass counted "successful resolves", this counts
    // "items that disappeared from the open list".)
    expect(result.autoResolved).toBe(1);
  });

  it('renders report when there are remaining contradictions after auto-resolve', async () => {
    // Initial fetch: 3 items, 1 review_ok + 2 detected. After resolving the
    // review_ok, 2 detected remain.
    const initial = [
      { path: 'wiki/entities/a.md', status: 'review_ok', claim: 'c1' },
      { path: 'wiki/entities/b.md', status: 'detected', claim: 'c2' },
      { path: 'wiki/entities/c.md', status: 'detected', claim: 'c3' },
    ];
    const remaining = [
      { path: 'wiki/entities/b.md', status: 'detected', claim: 'c2' },
      { path: 'wiki/entities/c.md', status: 'detected', claim: 'c3' },
    ];
    const getOpen = vi.fn()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(remaining);
    const wikiEngine = {
      getOpenContradictions: getOpen,
      resolveContradiction: vi.fn(),
      updateContradictionStatus: vi.fn(),
    } as unknown as LintPhaseContext['wikiEngine'];
    const ctx = makeLintPhaseContext(wikiEngine);
    const result = await runContradictionPhase(ctx);
    expect(result.autoResolved).toBe(1);
    expect(result.remaining).toBe(2);
    expect(result.report).toContain('## Contradictions');
    expect(result.report).toContain('Open contradictions: 2');
  });
});
