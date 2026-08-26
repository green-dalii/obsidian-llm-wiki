// token-key-probe.test.ts
//
// TDD for the simplified runtime probe-then-cache mechanism:
// no error-body parsing, no regex matching.
// Just "status 400 → try the other key once".
//
// Issue #551: the cache is keyed per (baseURL, model) — the wire format
// is a property of the backend behind the model, not of the gateway URL.

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenKeyProber } from '../token-key-probe';

const MODEL = 'qwen3-30b';
const SIBLING = 'gemma-4-26b';

describe('TokenKeyProber', () => {
  let prober: TokenKeyProber;

  beforeEach(() => {
    prober = new TokenKeyProber();
  });

  describe('altKey()', () => {
    it('returns max_completion_tokens for max_tokens', () => {
      expect(prober.altKey('max_tokens')).toBe('max_completion_tokens');
    });

    it('returns max_tokens for max_completion_tokens', () => {
      expect(prober.altKey('max_completion_tokens')).toBe('max_tokens');
    });
  });

  describe('getCachedKey() / setCachedKey()', () => {
    it('returns undefined for unseen (baseURL, model)', () => {
      expect(prober.getCachedKey('https://api.example.com/v1', MODEL)).toBeUndefined();
    });

    it('stores and retrieves cached key', () => {
      prober.setCachedKey('https://api.example.com/v1', MODEL, 'max_completion_tokens');
      expect(prober.getCachedKey('https://api.example.com/v1', MODEL)).toBe('max_completion_tokens');
    });

    it('treats different baseURLs independently', () => {
      prober.setCachedKey('https://api.openai.com/v1', MODEL, 'max_completion_tokens');
      prober.setCachedKey('https://api.example.com/v1', MODEL, 'max_tokens');
      expect(prober.getCachedKey('https://api.openai.com/v1', MODEL)).toBe('max_completion_tokens');
      expect(prober.getCachedKey('https://api.example.com/v1', MODEL)).toBe('max_tokens');
    });

    it('does not let one model\'s verdict bind its sibling on the same gateway (#551)', () => {
      prober.setCachedKey('https://api.example.com/v1', MODEL, 'max_completion_tokens');
      expect(prober.getCachedKey('https://api.example.com/v1', SIBLING)).toBeUndefined();
    });
  });

  describe('invalidate()', () => {
    it('removes every model probed behind a baseURL', () => {
      prober.setCachedKey('https://api.example.com/v1', MODEL, 'max_completion_tokens');
      prober.setCachedKey('https://api.example.com/v1', SIBLING, 'max_tokens');
      prober.invalidate('https://api.example.com/v1');
      expect(prober.getCachedKey('https://api.example.com/v1', MODEL)).toBeUndefined();
      expect(prober.getCachedKey('https://api.example.com/v1', SIBLING)).toBeUndefined();
    });

    it('clears all entries when called without arg', () => {
      prober.setCachedKey('https://api.openai.com/v1', MODEL, 'max_completion_tokens');
      prober.setCachedKey('https://api.example.com/v1', MODEL, 'max_tokens');
      prober.invalidate();
      expect(prober.getCachedKey('https://api.openai.com/v1', MODEL)).toBeUndefined();
      expect(prober.getCachedKey('https://api.example.com/v1', MODEL)).toBeUndefined();
    });

    it('does not affect other baseURLs after specific invalidation', () => {
      prober.setCachedKey('https://api.openai.com/v1', MODEL, 'max_completion_tokens');
      prober.setCachedKey('https://api.example.com/v1', MODEL, 'max_tokens');
      prober.invalidate('https://api.openai.com/v1');
      expect(prober.getCachedKey('https://api.example.com/v1', MODEL)).toBe('max_tokens');
    });

    it('does not treat a baseURL sharing a prefix as a match', () => {
      // The composite key joins with '::' — 'https://a' must not clear
      // 'https://a.example.com'.
      prober.setCachedKey('https://a.example.com/v1', MODEL, 'max_tokens');
      prober.invalidate('https://a');
      expect(prober.getCachedKey('https://a.example.com/v1', MODEL)).toBe('max_tokens');
    });
  });
});
