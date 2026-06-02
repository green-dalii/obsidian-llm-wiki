import { describe, it, expect } from 'vitest';
import { bigrams, normalizeForMatch, computeJaccard } from './duplicate-detection';

describe('Duplicate Detection — Pure Functions', () => {
  describe('bigrams', () => {
    it('extracts character bigrams from string', () => {
      const result = bigrams('hello');
      expect(result).toEqual(new Set(['he', 'el', 'll', 'lo']));
    });

    it('handles empty string', () => {
      const result = bigrams('');
      expect(result).toEqual(new Set());
    });

    it('handles single character', () => {
      const result = bigrams('a');
      expect(result).toEqual(new Set());
    });

    it('normalizes to lowercase', () => {
      const result = bigrams('HeLLo');
      expect(result).toEqual(new Set(['he', 'el', 'll', 'lo']));
    });

    it('filters non-alphanumeric except CJK', () => {
      const result = bigrams('hello-world!');
      // hello-world! → helloworld → he, el, ll, lo, ow, wo, or, rl, ld
      expect(result).toEqual(new Set(['he', 'el', 'll', 'lo', 'ow', 'wo', 'or', 'rl', 'ld']));
    });

    it('handles CJK characters', () => {
      const result = bigrams('中文测试');
      expect(result).toEqual(new Set(['中文', '文测', '测试']));
    });
  });

  describe('normalizeForMatch', () => {
    it('lowercases string', () => {
      expect(normalizeForMatch('Hello')).toBe('hello');
    });

    it('removes spaces', () => {
      expect(normalizeForMatch('hello world')).toBe('helloworld');
    });

    it('removes hyphens', () => {
      expect(normalizeForMatch('hello-world')).toBe('helloworld');
    });

    it('removes underscores', () => {
      expect(normalizeForMatch('hello_world')).toBe('helloworld');
    });

    it('removes special characters', () => {
      expect(normalizeForMatch('hello@world!')).toBe('helloworld');
    });

    it('preserves CJK characters', () => {
      expect(normalizeForMatch('中文测试')).toBe('中文测试');
    });

    it('handles mixed content', () => {
      expect(normalizeForMatch('LLM-Model (v1)')).toBe('llmmodelv1');
    });
  });

  describe('computeJaccard', () => {
    it('computes Jaccard similarity', () => {
      const a = new Set(['a', 'b', 'c']);
      const b = new Set(['b', 'c', 'd']);
      // intersection=2, union=4, similarity=0.5
      expect(computeJaccard(a, b)).toBe(0.5);
    });

    it('returns 0 for no intersection', () => {
      const a = new Set(['a', 'b']);
      const b = new Set(['c', 'd']);
      expect(computeJaccard(a, b)).toBe(0);
    });

    it('returns 1 for identical sets', () => {
      const a = new Set(['a', 'b', 'c']);
      const b = new Set(['a', 'b', 'c']);
      expect(computeJaccard(a, b)).toBe(1);
    });

    it('returns 0 if either set is empty', () => {
      expect(computeJaccard(new Set(), new Set(['a']))).toBe(0);
      expect(computeJaccard(new Set(['a']), new Set())).toBe(0);
    });

    it('handles both empty sets', () => {
      expect(computeJaccard(new Set(), new Set())).toBe(0);
    });
  });
});
