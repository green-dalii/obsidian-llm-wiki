import { describe, it, expect } from 'vitest';
import { truncateMentions } from '../utils';

// ── truncateMentions ──────────────────────────────────────────

describe('truncateMentions', () => {
  it('returns empty string for undefined', () => {
    expect(truncateMentions(undefined)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(truncateMentions([])).toBe('');
  });

  it('returns all mentions when under budget', () => {
    const mentions = ['Short mention A', 'Short mention B'];
    expect(truncateMentions(mentions)).toBe('Short mention A\nShort mention B');
  });

  it('truncates at 500 chars by default', () => {
    const mentions = ['A'.repeat(300), 'B'.repeat(300)];
    const result = truncateMentions(mentions);
    expect(result).toBe('A'.repeat(300)); // only first fits
    expect(result.length).toBeLessThan(500);
  });

  it('handles single mention over budget', () => {
    const mentions = ['X'.repeat(800)];
    const result = truncateMentions(mentions, 200);
    expect(result).toBe('X'.repeat(200));
  });

  it('respects custom budget', () => {
    const mentions = ['abc', 'def', 'ghi'];
    // abc(3) + \n + def(3) = 7 chars. abc(3) + \n + def(3) + \n + ghi(3) = 11 > 9
    expect(truncateMentions(mentions, 9)).toBe('abc\ndef');
  });

  it('joins mentions with newlines', () => {
    const mentions = ['First', 'Second'];
    expect(truncateMentions(mentions, 100)).toBe('First\nSecond');
  });

  it('includes at least one mention even if over budget', () => {
    const mentions = ['A'.repeat(100), 'B'];
    const result = truncateMentions(mentions, 5);
    // First mention is 100 chars > 5 budget, so it gets truncated to 5
    expect(result).toBe('A'.repeat(5));
  });
});
