import { describe, it, expect } from 'vitest';
import { parseIndexForPages, localKeywordMatch, matchExtractedToExisting } from '../../core/index-search';

describe('parseIndexForPages', () => {
  it('parses wiki links with optional aliases', () => {
    const index = '- [[wiki/entities/foo|Foo]] `aliases: FOO, FOO2`\n- [[wiki/concepts/bar]]';
    const pages = parseIndexForPages(index);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual({ path: 'wiki/entities/foo', title: 'foo', aliases: ['FOO', 'FOO2'], summary: '' });
    expect(pages[1]).toEqual({ path: 'wiki/concepts/bar', title: 'bar', aliases: [], summary: '' });
  });

  it('extracts summary text after " - " separator', () => {
    const index = '- [[wiki/entities/foo|Foo]] - Brief description of foo.\n- [[wiki/concepts/bar|Bar]] `aliases: b` - Bar is a concept.';
    const pages = parseIndexForPages(index);
    expect(pages).toHaveLength(2);
    expect(pages[0].summary).toBe('Brief description of foo.');
    expect(pages[1].summary).toBe('Bar is a concept.');
    expect(pages[1].aliases).toEqual(['b']);
  });

  it('returns empty array for non-matching content', () => {
    expect(parseIndexForPages('')).toEqual([]);
    expect(parseIndexForPages('no links here')).toEqual([]);
  });
});

describe('localKeywordMatch', () => {
  it('scores title matches higher than alias matches', () => {
    const pages = [
      { path: 'a', title: 'Deep Learning', aliases: [] },
      { path: 'b', title: 'Other', aliases: ['Deep Learning'] },
    ];
    const results = localKeywordMatch('deep learning', pages);
    expect(results[0].path).toBe('a');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('returns empty array when no keywords match', () => {
    const pages = [{ path: 'a', title: 'Foo', aliases: [] }];
    expect(localKeywordMatch('bar', pages)).toEqual([]);
  });
});

describe('matchExtractedToExisting', () => {
  it('matches by title slug', () => {
    const existing = [{ title: 'Deep Learning', aliases: [] }];
    expect(matchExtractedToExisting(['Deep Learning'], existing)).toEqual(['Deep Learning']);
  });

  it('matches by alias slug', () => {
    const existing = [{ title: 'Other', aliases: ['Deep Learning'] }];
    expect(matchExtractedToExisting(['Deep Learning'], existing)).toEqual(['Other']);
  });

  it('returns empty when nothing matches', () => {
    expect(matchExtractedToExisting(['Foo'], [{ title: 'Bar', aliases: [] }])).toEqual([]);
  });
});
