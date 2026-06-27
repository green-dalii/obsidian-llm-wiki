// Pure-function tests for smoke-test.ts
//
// The smoke-test runs a minimal LLM call to verify plugin
// configuration is correct. It's a side-effectful operation
// (network I/O), so we invert dependencies: the test accepts an
// injected probe function, not a real LLMClient.
//
// Production wiring (in main.ts / ensure-welcome-note.ts):
//   const status = await smokeTest(() => llmClient, settings);
//
// Tests inject a mock probe that resolves to a LlmConfigStatus.

import { describe, it, expect } from 'vitest';
import { smokeTest } from '../../core/smoke-test';

describe('smokeTest — happy path', () => {
  it('returns ok=true with provider and model when probe succeeds', async () => {
    const status = await smokeTest(async () => ({
      ok: true,
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
    }));
    expect(status.ok).toBe(true);
    expect(status.provider).toBe('OpenAI');
    expect(status.model).toBe('gpt-4o-mini');
  });
});

describe('smokeTest — error paths', () => {
  it('returns ok=false with error message when probe returns failure', async () => {
    const status = await smokeTest(async () => ({
      ok: false,
      error: 'API key not configured',
    }));
    expect(status.ok).toBe(false);
    expect(status.error).toBe('API key not configured');
  });

  it('returns ok=false when probe throws (catches errors, never re-throws)', async () => {
    const status = await smokeTest(async () => {
      throw new Error('Network unreachable');
    });
    expect(status.ok).toBe(false);
    expect(status.error).toMatch(/Network unreachable/);
  });

  it('returns ok=false with generic message when probe throws non-Error', async () => {
    const status = await smokeTest(async () => {
      // Cast through unknown to bypass the only-throw-error rule.
      // We want to verify the wrapper handles non-Error throws.
      throw 'plain string error' as unknown;
    });
    expect(status.ok).toBe(false);
    expect(status.error).toBeDefined();
  });
});

describe('smokeTest — LlmConfigStatus shape', () => {
  it('always returns an object with ok: boolean', async () => {
    const a = await smokeTest(async () => ({ ok: true, provider: 'X', model: 'Y' }));
    const b = await smokeTest(async () => ({ ok: false, error: 'fail' }));
    expect(typeof a.ok).toBe('boolean');
    expect(typeof b.ok).toBe('boolean');
  });
});