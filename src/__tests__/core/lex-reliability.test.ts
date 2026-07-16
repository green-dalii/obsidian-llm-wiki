/**
 * v1.24.1 PATCH Phase 5.5.0: lexIsReliability threshold.
 *
 * Per user direction (2026-07-13): avoid hardcoded CJK regex
 * detection. The fundamental signal is the distribution of token
 * LENGTHS in the tokenized query.
 *
 * Lex scoring is reliable when:
 *   1. At least 2 tokens are multi-character (≥ 2 chars).
 *   2. AND at least 50% of tokens are multi-character.
 *
 * Both conditions together — count AND proportion — give a robust
 * "is this lex-query worth trusting?" signal without enumerating
 * any character range.
 */
import { describe, it, expect } from 'vitest';
import { lexIsReliable, tokenizeQuery } from '../../core/ppr-cascade';

describe('lexIsReliable — token-length distribution heuristic (Phase 5.5.0)', () => {
  it('reliable: pure Latin query with multiple multi-char tokens', () => {
    expect(lexIsReliable(tokenizeQuery('DeepSeek DSA HCA'))).toBe(true);
    expect(lexIsReliable(tokenizeQuery('hello world'))).toBe(true);
    expect(lexIsReliable(tokenizeQuery('what is the meaning of life'))).toBe(true);
  });

  it('unreliable: single Latin word — only 1 multi-char token (no cross-validation)', () => {
    // "DSA" → tokens=["dsa"] — 1 multi-char token. No way to break
    // ties among pages that contain "dsa" — score is binary.
    expect(lexIsReliable(tokenizeQuery('DSA'))).toBe(false);
    expect(lexIsReliable(tokenizeQuery('deepseek'))).toBe(false);
    expect(lexIsReliable(tokenizeQuery('hello'))).toBe(false);
  });

  it('unreliable: pure CJK query — only 1 multi-char token (no cross-validation)', () => {
    // "你好世界" → tokens=["你好世界"] — 1 multi-char token.
    // Per first-principles (2026-07-13): CJK tokenization now extracts
    // continuous runs (≥2 chars) instead of single chars. A single
    // multi-char CJK run gives lex scoring no way to break ties among
    // pages containing that substring — score is binary.
    const nihaoTokens = tokenizeQuery('你好世界');
    expect(nihaoTokens).toContain('你好世界');
    expect(lexIsReliable(nihaoTokens)).toBe(false);

    // The full e2e query (CJK + ASCII mix): now tokenizes to 3 ASCII
    // multi-char tokens (deepseek, dsa, hca) + a few CJK runs. The
    // multi-char count is exactly 3, ratio ≥ 50% → RELIABLE (good:
    // this query has cross-validation signal).
    const e2eTokens = tokenizeQuery('为我梳理DeepSeek的DSA和HCA、还有其他高效算法的介绍');
    expect(lexIsReliable(e2eTokens)).toBe(true);
  });

  it('unreliable: empty / whitespace / punctuation-only query', () => {
    expect(lexIsReliable(tokenizeQuery(''))).toBe(false);
    expect(lexIsReliable(tokenizeQuery('   '))).toBe(false);
    // "???!!" → tokens=["???!!"] (1 multi-char from whitespace split,
    // because "???!!" has length 5 ≥ 2). But that's still only 1 token
    // → unreliable due to count, not ratio.
    expect(lexIsReliable(tokenizeQuery('???!!'))).toBe(false);
  });

  it('reliable: mixed query with multiple multi-char tokens', () => {
    expect(lexIsReliable(tokenizeQuery('deepseek, dsa; hca.'))).toBe(true);
    expect(lexIsReliable(tokenizeQuery('DSA HCA architecture overview'))).toBe(true);
  });

  it('reliable: Japanese kana query with multiple multi-char tokens', () => {
    // "こんにちは 世界" tokenizes to ["こんにちは", "世界"] (both are
    // CJK runs ≥ 2 chars). 2 multi-char / 2 total = 100% → RELIABLE.
    //
    // Per first-principles (2026-07-13): CJK tokenization now extracts
    // continuous runs, not single chars. "こんにちは" is a single
    // meaningful kana word, not 5 noise particles.
    const tokens = tokenizeQuery('こんにちは 世界');
    expect(tokens).toContain('こんにちは');
    expect(tokens).toContain('世界');
    expect(lexIsReliable(tokens)).toBe(true);
  });

  it('boundary: at exactly 50% ratio with ≥ 2 multi-char → reliable', () => {
    // Synthetic token lists to test the boundary precisely.
    // The threshold is BOTH:
    //   - multi-char count >= 2
    //   - multi-char ratio >= 0.5
    // Only when both pass do we get reliable.
    expect(lexIsReliable(['aa', 'a'])).toBe(false);   // count=1, ratio=50% — fails count
    expect(lexIsReliable(['aa', 'bb'])).toBe(true);   // count=2, ratio=100% ✓
    expect(lexIsReliable(['aa', 'bb', 'a', 'b'])).toBe(true); // count=2, ratio=50% ✓
    expect(lexIsReliable(['aa', 'a', 'b'])).toBe(false); // count=1, ratio=33% ✗
    expect(lexIsReliable(['aa', 'a', 'b', 'c'])).toBe(false); // count=1, ratio=25% ✗
    expect(lexIsReliable(['aa', 'a', 'b', 'c', 'd', 'e'])).toBe(false); // count=1 ✗
  });

  it('is monotonic: appending more multi-char tokens can flip unreliable → reliable', () => {
    expect(lexIsReliable(tokenizeQuery('DSA'))).toBe(false);
    expect(lexIsReliable(tokenizeQuery('DSA architecture overview'))).toBe(true);
  });

  it('is stable: same input → same output (pure function)', () => {
    const tokens = tokenizeQuery('test query');
    expect(lexIsReliable(tokens)).toBe(lexIsReliable(tokens));
  });
});