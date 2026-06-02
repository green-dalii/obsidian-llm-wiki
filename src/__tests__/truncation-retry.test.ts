import { describe, it, expect, vi } from 'vitest';
import { withTruncationRetry } from '../core/truncation-retry';

/**
 * Pure function tests for withTruncationRetry helper.
 * No Obsidian runtime, no LLM client — just the truncation retry policy.
 *
 * Policy tested:
 * - If isTruncated returns true, call retryFn with doubled maxTokens (capped at maxCap)
 * - If isTruncated returns false, return initial result directly
 * - If retry throws, propagate the error
 * - Math.min(currentMax * 2, maxCap) is the doubling cap
 */

describe('withTruncationRetry', () => {
  type Response = { text: string; stop_reason: string };

  it('returns initial result when not truncated (no retry call)', async () => {
    const initial: () => Promise<Response> = vi.fn().mockResolvedValue({ text: 'complete', stop_reason: 'end_turn' });
    const retry: (t: number) => Promise<Response> = vi.fn().mockResolvedValue({ text: 'retry', stop_reason: 'end_turn' });

    const result = await withTruncationRetry({
      initialFn: initial,
      retryFn: retry,
      isTruncated: (r) => r.stop_reason === 'max_tokens',
      extractText: (r) => r.text,
      getMaxTokens: () => 100,
      label: 'Test API',
    });

    expect(result).toBe('complete');
    expect(initial).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });

  it('calls retryFn with doubled maxTokens when truncated', async () => {
    const initial: () => Promise<Response> = vi.fn().mockResolvedValue({ text: 'partial', stop_reason: 'max_tokens' });
    const retry: (t: number) => Promise<Response> = vi.fn().mockResolvedValue({ text: 'full', stop_reason: 'end_turn' });

    const result = await withTruncationRetry({
      initialFn: initial,
      retryFn: retry,
      isTruncated: (r) => r.stop_reason === 'max_tokens',
      extractText: (r) => r.text,
      getMaxTokens: () => 100,
      label: 'Test API',
    });

    expect(result).toBe('full');
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledWith(200);
  });

  it('caps retry maxTokens at maxCap when doubled value exceeds it', async () => {
    const initial: () => Promise<Response> = vi.fn().mockResolvedValue({ text: 'partial', stop_reason: 'max_tokens' });
    const retry: (t: number) => Promise<Response> = vi.fn().mockResolvedValue({ text: 'full', stop_reason: 'end_turn' });

    await withTruncationRetry({
      initialFn: initial,
      retryFn: retry,
      isTruncated: (r) => r.stop_reason === 'max_tokens',
      extractText: (r) => r.text,
      getMaxTokens: () => 15000,
      maxCap: 16000,
      label: 'Test API',
    });

    expect(retry).toHaveBeenCalledWith(16000);
  });

  it('uses default cap of 16000 when maxCap not specified', async () => {
    const initial: () => Promise<Response> = vi.fn().mockResolvedValue({ text: 'partial', stop_reason: 'max_tokens' });
    const retry: (t: number) => Promise<Response> = vi.fn().mockResolvedValue({ text: 'full', stop_reason: 'end_turn' });

    await withTruncationRetry({
      initialFn: initial,
      retryFn: retry,
      isTruncated: (r) => r.stop_reason === 'max_tokens',
      extractText: (r) => r.text,
      getMaxTokens: () => 100000,
      label: 'Test API',
    });

    expect(retry).toHaveBeenCalledWith(16000);
  });

  it('propagates error from retryFn', async () => {
    const initial: () => Promise<Response> = vi.fn().mockResolvedValue({ text: 'partial', stop_reason: 'max_tokens' });
    const retry: (t: number) => Promise<Response> = vi.fn().mockRejectedValue(new Error('retry failed'));

    const promise = withTruncationRetry({
      initialFn: initial,
      retryFn: retry,
      isTruncated: (r) => r.stop_reason === 'max_tokens',
      extractText: (r) => r.text,
      getMaxTokens: () => 100,
      label: 'Test API',
    });
    await expect(promise).rejects.toThrow('retry failed');
  });

  it('logs warning with stop_reason when truncation is detected and retried', async () => {
    const initial: () => Promise<Response> = vi.fn().mockResolvedValue({ text: 'partial', stop_reason: 'max_tokens' });
    const retry: (t: number) => Promise<Response> = vi.fn().mockResolvedValue({ text: 'full', stop_reason: 'end_turn' });
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await withTruncationRetry({
      initialFn: initial,
      retryFn: retry,
      isTruncated: (r) => r.stop_reason === 'max_tokens',
      extractText: (r) => r.text,
      getStopReason: (r) => r.stop_reason,
      getMaxTokens: () => 100,
      label: 'Test API',
    });

    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Test API'));
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('100'));
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('200'));
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('(max_tokens)'));

    consoleWarn.mockRestore();
  });

  it('does not call retryFn when isTruncated returns false', async () => {
    const initial: () => Promise<Response> = vi.fn().mockResolvedValue({ text: 'complete', stop_reason: 'stop_sequence' });
    const retry: (t: number) => Promise<Response> = vi.fn();

    const result = await withTruncationRetry({
      initialFn: initial,
      retryFn: retry,
      isTruncated: (r) => r.stop_reason === 'max_tokens',
      extractText: (r) => r.text,
      getMaxTokens: () => 100,
      label: 'Test API',
    });

    expect(result).toBe('complete');
    expect(retry).not.toHaveBeenCalled();
  });
});
