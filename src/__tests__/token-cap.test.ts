import { describe, it, expect } from 'vitest';
import { capMaxTokens } from '../core/token-cap';

/**
 * Tests for Issue #75: maxTokensPerCall cap helper.
 *
 * Pure function that applies a user-configurable cap to LLM max_tokens requests.
 * Default (cap=0) means no cap, preserving cloud-model behavior.
 * Non-zero cap protects local models (LM Studio 8K, Ollama 4K) from
 * 400 errors when the requested tokens exceed the model's context window.
 */
describe('capMaxTokens (Issue #75)', () => {
  it('returns requested unchanged when cap is 0 (default, no cap)', () => {
    expect(capMaxTokens(8000, { maxTokensPerCall: 0 })).toBe(8000);
  });

  it('returns requested unchanged when cap is undefined (defensive)', () => {
    expect(capMaxTokens(8000, {})).toBe(8000);
  });

  it('caps requested to ceiling when requested > ceiling', () => {
    expect(capMaxTokens(8000, { maxTokensPerCall: 4096 })).toBe(4096);
  });

  it('returns requested unchanged when requested < ceiling (no up-cap)', () => {
    expect(capMaxTokens(2000, { maxTokensPerCall: 4096 })).toBe(2000);
  });

  it('returns requested unchanged when requested === ceiling', () => {
    expect(capMaxTokens(4096, { maxTokensPerCall: 4096 })).toBe(4096);
  });

  it('handles small cap values (e.g. 512 for very limited models)', () => {
    expect(capMaxTokens(8000, { maxTokensPerCall: 512 })).toBe(512);
  });

  it('handles cap = 1 (edge case)', () => {
    expect(capMaxTokens(8000, { maxTokensPerCall: 1 })).toBe(1);
  });
});
