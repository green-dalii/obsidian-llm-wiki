import { describe, it, expect } from 'vitest';
import { truncateMentions, parseIndexForPages, localKeywordMatch } from '../utils';

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

// ── parseIndexForPages ─────────────────────────────────────────

describe('parseIndexForPages', () => {
  it('parses entity entries without aliases', () => {
    const index = '- [[entities/Machine Learning|Machine Learning]] - A summary';
    const pages = parseIndexForPages(index);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ path: 'entities/Machine Learning', title: 'Machine Learning', aliases: [] });
  });

  it('parses entries with aliases in backticks', () => {
    const index = '- [[concepts/Deep Learning|Deep Learning]] `aliases: DL, deep-learning` - Summary';
    const pages = parseIndexForPages(index);
    expect(pages).toHaveLength(1);
    expect(pages[0].aliases).toEqual(['DL', 'deep-learning']);
  });

  it('parses entries without display text in wiki-link', () => {
    const index = '- [[entities/Foo]] - Summary';
    const pages = parseIndexForPages(index);
    expect(pages[0].path).toBe('entities/Foo');
    expect(pages[0].title).toBe('Foo');
  });

  it('returns empty array for content with no wiki-links', () => {
    expect(parseIndexForPages('# Header\n\nNo links here')).toEqual([]);
  });

  it('parses multiple entries', () => {
    const index = '- [[entities/A|A]] `aliases: a1` - S\n- [[concepts/B|B]] - S2';
    expect(parseIndexForPages(index)).toHaveLength(2);
  });
});

// ── localKeywordMatch ──────────────────────────────────────────

describe('localKeywordMatch', () => {
  const pages = [
    { path: 'entities/Machine Learning', title: 'Machine Learning', aliases: ['ML', 'supervised learning'] },
    { path: 'concepts/Deep Learning', title: 'Deep Learning', aliases: ['DL'] },
    { path: 'entities/Reinforcement', title: 'Reinforcement', aliases: ['RL'] },
  ];

  it('matches exact title keyword with score 3', () => {
    const result = localKeywordMatch('machine', pages);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('entities/Machine Learning');
    expect(result[0].score).toBe(3);
  });

  it('matches alias keyword with score 2', () => {
    const result = localKeywordMatch('DL', pages);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('concepts/Deep Learning');
    expect(result[0].score).toBe(2);
  });

  it('scores higher for title+alias combined match', () => {
    const result = localKeywordMatch('Learning', pages);
    // "Machine Learning" hits title (3) + alias "supervised learning" (2) = 5
    // "Deep Learning" hits title (3) = 3
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('entities/Machine Learning');
    expect(result[0].score).toBe(5);
  });

  it('returns empty array when nothing matches', () => {
    expect(localKeywordMatch('xyzabc', pages)).toEqual([]);
  });

  it('sorts by descending score', () => {
    const result = localKeywordMatch('learning', pages);
    expect(result[0].score).toBeGreaterThanOrEqual(result[result.length - 1].score);
  });
});
