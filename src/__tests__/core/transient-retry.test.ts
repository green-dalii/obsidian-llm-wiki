import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTransientRetry } from '../../core/transient-retry';

/**
 * Pure-function tests for withTransientRetry.
 *
 * Bug B (v1.24.0 P2): seed-selector.ts returned [] on any failure, including
 * transient empty-string LLM responses (response length: 0). None of the
 * existing retry helpers (withTruncationRetry, url-fallback, token-key-probe)
 * handle this class of failure. withTransientRetry fills that gap.
 *
 * Policy tested:
 * - Happy path: no retry needed
 * - Retry on: thrown network/timeout, empty-string response, JSON.parse throws
 * - No retry on: auth (401/403), rate-limit (429)
 * - Bounded retry: maxAttempts, exponential backoff with jitter
 * - Final giveup: returns last result / throws last error
 */

describe('withTransientRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the value on first success (no retry call)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await withTransientRetry({ fn, label: 'Test' });

    expect(result.value).toBe('ok');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on thrown network/timeout error and returns first success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network: timeout'))
      .mockResolvedValueOnce('ok');

    const promise = withTransientRetry({ fn, label: 'Test' });
    // Advance past backoff (250ms * 2^0 + jitter)
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result.value).toBe('ok');
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries when isTransientEmpty returns true (e.g. empty string)', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('ok');

    const promise = withTransientRetry({
      fn,
      label: 'Test',
      isTransientEmpty: (v) => v === '' || (typeof v === 'string' && v.trim() === ''),
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result.value).toBe('ok');
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries when validate throws (e.g. JSON.parse fails on empty response)', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce('not json{')
      .mockResolvedValueOnce('{"seeds":["a"]}');

    const validate = (v: string) => {
      JSON.parse(v);
    };

    const promise = withTransientRetry({
      fn,
      label: 'Test',
      validate,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result.value).toBe('{"seeds":["a"]}');
    expect(result.attempts).toBe(2);
  });

  it('does not retry on auth error (401/403) — surface immediately', async () => {
    const authError = Object.assign(new Error('status 401'), { statusCode: 401 });
    const fn = vi.fn().mockRejectedValue(authError);

    const result = await withTransientRetry({
      fn,
      label: 'Test',
      isAuthError: (e) => (e as { statusCode?: number }).statusCode === 401 || (e as { statusCode?: number }).statusCode === 403,
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.error).toBe(authError);
  });

  it('does not retry on rate-limit (429) — surface immediately', async () => {
    const rateLimitError = Object.assign(new Error('status 429'), { statusCode: 429 });
    const fn = vi.fn().mockRejectedValue(rateLimitError);

    const result = await withTransientRetry({
      fn,
      label: 'Test',
      isRateLimitError: (e) => (e as { statusCode?: number }).statusCode === 429,
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.error).toBe(rateLimitError);
  });

  it('gives up after maxAttempts and returns the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network: timeout'));

    const promise = withTransientRetry({ fn, label: 'Test', maxAttempts: 3, jitterMs: 0 });
    // Advance past 2 backoffs: 250ms + 500ms = 750ms (deterministic with jitter:0).
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(3);
    expect(result.attempts).toBe(3);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('network: timeout');
  });

  it('gives up when all attempts return transient empty and returns last empty', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = vi.fn().mockResolvedValue('');

    const promise = withTransientRetry({
      fn,
      label: 'Test',
      isTransientEmpty: (v) => v === '',
      maxAttempts: 3,
      jitterMs: 0,
    });
    // Advance past 2 backoffs: 250ms + 500ms = 750ms.
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(3);
    expect(result.attempts).toBe(3);
    expect(result.value).toBe('');
    expect(result.error).toBeUndefined();
    // Should log a final "giving up" warning even on the empty path so
    // operators can distinguish "still trying" from "exhausted retries".
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringMatching(/\[LLM retry\] Test giving up after 3 attempts: transient empty response/),
    );

    consoleWarn.mockRestore();
  });

  it('uses exponential backoff between attempts (250ms × 2^(n-1) ± jitter)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok');

    const start = Date.now();
    const promise = withTransientRetry({ fn, label: 'Test', jitterMs: 0 });

    // First backoff: 250ms × 2^0 = 250ms
    await vi.advanceTimersByTimeAsync(250);
    // Second backoff: 250ms × 2^1 = 500ms
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result.value).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    // With jitter:0 the backoff should total 750ms (deterministic).
    expect(result.totalBackoffMs).toBe(750);
    void start; // not used directly; this is just to silence "unused" lints
  });

  it('respects custom maxAttempts (5 attempts allowed)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await withTransientRetry({ fn, label: 'Test', maxAttempts: 5 });

    expect(result.attempts).toBe(1);
    expect(result.value).toBe('ok');
  });

  it('logs a diagnostic warning per retry attempt with attempt number and reason', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network: timeout'))
      .mockResolvedValueOnce('ok');

    const promise = withTransientRetry({ fn, label: 'Seed selection', jitterMs: 0 });
    await vi.advanceTimersByTimeAsync(250);
    const result = await promise;

    expect(consoleWarn).toHaveBeenCalledWith(expect.stringMatching(/\[LLM retry\] Seed selection attempt 1\/3 failed: network: timeout/));
    expect(result.value).toBe('ok');

    consoleWarn.mockRestore();
  });

  it('logs final giveup warning when all attempts fail', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

    const promise = withTransientRetry({ fn, label: 'Seed selection', maxAttempts: 2, jitterMs: 0 });
    // Advance past 1 backoff: 250ms.
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(consoleWarn).toHaveBeenCalledWith(expect.stringMatching(/\[LLM retry\] Seed selection giving up after 2 attempts/));
    expect(result.error).toBeInstanceOf(Error);

    consoleWarn.mockRestore();
  });

  it('surfaces errors rejected by shouldRetry without another attempt', async () => {
    const unsupported = Object.assign(new Error('PDF file input is not supported'), { statusCode: 400 });
    const fn = vi.fn().mockRejectedValue(unsupported);

    const result = await withTransientRetry({
      fn,
      label: 'PDF extraction',
      shouldRetry: (error) => {
        if (!(error instanceof Error) || !('statusCode' in error)) return false;
        return error.statusCode === 429 || (typeof error.statusCode === 'number' && error.statusCode >= 500);
      },
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.error).toBe(unsupported);
  });

  it('uses defaults: maxAttempts=3, backoffBaseMs=250 when not specified', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('transient'));

    const promise = withTransientRetry({ fn, label: 'Test' });
    // Advance past 2 default backoffs: 250ms + 500ms = 750ms (jitter may add up to 100ms each).
    await vi.advanceTimersByTimeAsync(1500);
    const result = await promise;

    expect(fn).toHaveBeenCalledTimes(3);
    expect(result.attempts).toBe(3);
  });
});
