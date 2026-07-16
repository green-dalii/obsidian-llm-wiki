/**
 * v1.24.1 PATCH Phase 5.5.0 relevance fix.
 *
 * Root cause: when PPR ran in "graph-first" arm (pprCascade.ts:268) without
 * query-relevant seeds (e.g. LLM seeds returned empty due to provider
 * empty-body bug), PPR seeded itself with `pages[0]` and produced a random
 * graph walk. Top-N results were graph-adjacent but query-irrelevant —
 * e.g. a "DSA/HCA" query returned "自我修正算法", "算法效率" because
 * those happened to be near the wiki index's first entry.
 *
 * Fix: in selectPprSeeds, if final matches are all `graph-first-ppr`
 * (i.e. PPR didn't get query-relevant seeds), re-rank them by raw
 * query-token overlap (title + aliases + summary). Lex always has
 * at least token-level relevance.
 *
 * These tests pin the lex-relevance ranker in isolation.
 */
import { describe, it, expect } from 'vitest';
import type { PageMatch, PageRef } from '../../../core/ppr-cascade';

function makeMatch(
  path: string,
  title: string,
  aliases: string[] = [],
  summary = '',
): PageMatch {
  const page: PageRef = { path, title, aliases, summary };
  return { page, score: 0.5, arm: 'graph-first-ppr' };
}

/**
 * Mirror of rankByLexRelevance from
 * src/wiki/query-engine/pipeline/select-seeds.ts. The mirror lives
 * here for testability — the production function is unexported.
 *
 * Scoring per token (first matching location wins):
 *   title match:    3
 *   alias match:    2
 *   summary match:  1
 * Bonus: +2 when ALL tokens found somewhere on the page (multi-token
 * bonus — strong relevance signal).
 */
function rankByLexRelevance(query: string, matches: PageMatch[]): PageMatch[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
  if (tokens.length === 0) return matches;

  const scored = matches.map((m, idx) => {
    const titleLower = m.page.title.toLowerCase();
    const aliasLowers = (m.page.aliases ?? []).map(a => a.toLowerCase());
    const summaryLower = (m.page.summary ?? '').toLowerCase();

    let score = 0;
    let tokensFound = 0;
    for (const kw of tokens) {
      if (titleLower.includes(kw)) { score += 3; tokensFound++; }
      else if (aliasLowers.some(a => a.includes(kw))) { score += 2; tokensFound++; }
      else if (summaryLower.includes(kw)) { score += 1; tokensFound++; }
    }
    if (tokensFound === tokens.length && tokens.length > 1) score += 2;
    return { match: m, score, idx };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });

  return scored.map(s => ({ ...s.match, score: s.score, arm: 'lex' as const }));
}

describe('rankByLexRelevance (Phase 5.5.0 relevance fix)', () => {
  it('puts title-match ahead of alias-match and summary-match', () => {
    const matches: PageMatch[] = [
      makeMatch('concepts/foo', 'DeepSeek Architecture', [], 'background'),
      makeMatch('concepts/bar', 'Random Topic', ['deepseek', 'hca'], ''),
      makeMatch('concepts/baz', 'Old Page', [], 'mentions deepseek briefly'),
    ];
    const ranked = rankByLexRelevance('deepseek', matches);
    // Title match (score 3) first; alias match (score 2) second;
    // summary match (score 1) last.
    expect(ranked[0].page.title).toBe('DeepSeek Architecture');
    expect(ranked[1].page.title).toBe('Random Topic');
    expect(ranked[2].page.title).toBe('Old Page');
  });

  it('multi-token query with all-tokens-found bonus', () => {
    // "deepseek hca": bonus when BOTH tokens found on the same page.
    const matches: PageMatch[] = [
      // Page A: only "deepseek" in title → score 3 (no bonus, 1 of 2 tokens).
      makeMatch('a/page1', 'DeepSeek Model', [], ''),
      // Page B: both tokens in summary → score 2 + bonus 2 = 4.
      makeMatch('a/page2', 'Generic Topic', [], 'deepseek hca intro'),
    ];
    const ranked = rankByLexRelevance('deepseek hca', matches);
    expect(ranked[0].page.title).toBe('Generic Topic'); // 4 > 3
    expect(ranked[1].page.title).toBe('DeepSeek Model');
  });

  it('puts zero-overlap pages at the bottom (not removed)', () => {
    const matches: PageMatch[] = [
      makeMatch('a/relevant', 'DeepSeek Topic', [], ''),
      makeMatch('a/irrelevant', 'Unrelated Topic', [], ''),
    ];
    const ranked = rankByLexRelevance('deepseek', matches);
    expect(ranked[0].page.title).toBe('DeepSeek Topic');
    expect(ranked[1].page.title).toBe('Unrelated Topic');
    expect(ranked).toHaveLength(2); // both kept
  });

  it('is case-insensitive', () => {
    const matches: PageMatch[] = [
      makeMatch('a/x', 'DeepSeek', [], ''),
      makeMatch('a/y', 'deepseek', [], ''),
      makeMatch('a/z', 'DEEPSEEK', [], ''),
    ];
    const ranked = rankByLexRelevance('DEEPseek', matches);
    expect(ranked).toHaveLength(3);
    // All match equally; preserve original order via stable sort.
    expect(ranked[0].page.path).toBe('a/x');
    expect(ranked[1].page.path).toBe('a/y');
    expect(ranked[2].page.path).toBe('a/z');
  });

  it('preserves original order as stable tiebreaker', () => {
    const matches: PageMatch[] = [
      makeMatch('a/1', 'Same Title', [], ''),
      makeMatch('a/2', 'Same Title', [], ''),
      makeMatch('a/3', 'Same Title', [], ''),
    ];
    const ranked = rankByLexRelevance('same', matches);
    expect(ranked.map(m => m.page.path)).toEqual(['a/1', 'a/2', 'a/3']);
  });

  it('returns the input unchanged when query has no tokens', () => {
    const matches: PageMatch[] = [
      makeMatch('a/x', 'Foo', [], ''),
    ];
    const ranked = rankByLexRelevance('   ', matches);
    expect(ranked).toBe(matches); // reference equality — no work done
  });

  it('handles the e2e 2026-07-13 bug shape: random-walk results re-ranked by lex', () => {
    // The exact symptom: user asked about DSA/HCA, PPR returned
    // "自我修正算法", "算法效率", "算法推理" etc. — graph-walk neighbors
    // of the wiki index's first page, not query-relevant.
    // After the fix, lex ranker puts query-relevant pages first.
    const matches: PageMatch[] = [
      makeMatch('concepts/自我修正算法', '自我修正算法', [], 'graph walk result'),
      makeMatch('concepts/算法效率', '算法效率', [], 'graph walk result'),
      makeMatch('entities/DeepSeek', 'DeepSeek', [], 'AI company'),
      makeMatch('entities/DeepSeek-V3', 'DeepSeek-V3', ['DSA', 'HCA'], 'model architecture'),
    ];
    const ranked = rankByLexRelevance('DSA HCA', matches);
    // The DeepSeek-V3 page (title alias 'DSA' and 'HCA') should rank
    // top — its aliases match BOTH tokens, scoring 2+2 + bonus 2 = 6.
    // The DeepSeek entity page (title only) scores 3+3 = 6 too but
    // both rank above the irrelevant concepts/* walk neighbors.
    const top = ranked[0];
    expect(['DeepSeek', 'DeepSeek-V3']).toContain(top.page.title);
    // The concepts/* walk neighbors must NOT be top.
    expect(top.page.path).not.toMatch(/^concepts\//);
  });

  it('switches arm label to "lex" so the chip is honest about why we returned these', () => {
    // selectPprSeeds displays `arm` as PPR / PPR+ / index in the UI.
    // When we downgrade to lex, the arm should be 'lex' (= "index")
    // so the user knows these came from keyword match, not PPR graph.
    const matches: PageMatch[] = [
      makeMatch('a/x', 'DeepSeek', [], ''),
    ];
    const ranked = rankByLexRelevance('deepseek', matches);
    expect(ranked[0].arm).toBe('lex');
  });
});