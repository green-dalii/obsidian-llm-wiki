// url-fallback.test.ts — TDD tests for custom baseURL fallback mechanism
//
// Tested invariants:
//   1. generateUrlCandidates: always tries original first, then sensible variations
//   2. cache get/set/invalidate: module-level static, persists across client instances
//   3. isUrlError: only 404 (resource not found) is retryable; 401/403/429/5xx are NOT
//   4. resolveBaseUrlWithFallback: try original → try candidates with 300ms delay → cache → retry
//
// v1.23.0 P1.5 follow-up: Kimi Coding Plan Anthropic-compatible baseURL
// `https://api.kimi.com/coding/` returns 404 because AI-SDK appends
// `/messages` but Kimi expects `/v1/messages`. The fallback adds `/v1`.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateUrlCandidates,
  getCachedUrl,
  cacheResolvedUrl,
  invalidateCache,
  isUrlError,
  resolveBaseUrlWithFallback,
  RETRY_DELAY_MS,
  fetchModelsWithFallback,
} from '../../core/url-fallback';

describe('generateUrlCandidates', () => {
  it('returns empty array for empty input', () => {
    expect(generateUrlCandidates('')).toEqual([]);
  });

  it('always includes the original URL as the first candidate', () => {
    expect(generateUrlCandidates('https://api.kimi.com/coding/')[0]).toBe('https://api.kimi.com/coding/');
    expect(generateUrlCandidates('https://api.kimi.com/coding/v1')[0]).toBe('https://api.kimi.com/coding/v1');
  });

  it('adds /v1 when missing (Kimi Coding Plan case)', () => {
    const candidates = generateUrlCandidates('https://api.kimi.com/coding/');
    expect(candidates).toContain('https://api.kimi.com/coding/v1');
  });

  it('strips trailing slash and adds /v1 (localhost case)', () => {
    const candidates = generateUrlCandidates('http://localhost:1234');
    expect(candidates).toContain('http://localhost:1234/v1');
    // Should NOT include duplicate `http://localhost:1234/` since stripping slash yields same as original
    expect(candidates.filter(c => c === 'http://localhost:1234/')).toHaveLength(0);
  });

  it('does not duplicate when URL already ends with /v1', () => {
    const candidates = generateUrlCandidates('https://api.kimi.com/coding/v1');
    // Only the original — no need to vary
    expect(candidates).toEqual(['https://api.kimi.com/coding/v1']);
  });

  it('handles URL with trailing slash that has /v1', () => {
    const candidates = generateUrlCandidates('https://api.kimi.com/coding/v1/');
    // Strip trailing slash → `https://api.kimi.com/coding/v1` (different from original)
    // Already has /v1 → no /v1 appended
    expect(candidates).toEqual([
      'https://api.kimi.com/coding/v1/',
      'https://api.kimi.com/coding/v1',
    ]);
  });

  it('does not contain the same URL twice', () => {
    const candidates = generateUrlCandidates('https://api.kimi.com/coding/');
    const unique = new Set(candidates);
    expect(unique.size).toBe(candidates.length);
  });

  it('preserves query string and fragment if present', () => {
    const candidates = generateUrlCandidates('https://api.example.com/?token=abc#section');
    // Strip query/fragment from the path before adding /v1
    expect(candidates).toContain('https://api.example.com/?token=abc#section');
  });
});

describe('cache (module-level static)', () => {
  beforeEach(() => {
    invalidateCache();
  });

  it('returns undefined when nothing cached', () => {
    expect(getCachedUrl('https://example.com')).toBeUndefined();
  });

  it('stores and retrieves a resolved URL', () => {
    cacheResolvedUrl('https://example.com/', 'https://example.com/v1');
    expect(getCachedUrl('https://example.com/')).toBe('https://example.com/v1');
  });

  it('survives across simulated client re-creation (settings change)', () => {
    cacheResolvedUrl('https://api.kimi.com/coding/', 'https://api.kimi.com/coding/v1');
    // Simulate SDK client disposal + recreation
    expect(getCachedUrl('https://api.kimi.com/coding/')).toBe('https://api.kimi.com/coding/v1');
  });

  it('invalidate clears specific URL', () => {
    cacheResolvedUrl('https://a.com', 'https://a.com/v1');
    cacheResolvedUrl('https://b.com', 'https://b.com/v1');
    invalidateCache('https://a.com');
    expect(getCachedUrl('https://a.com')).toBeUndefined();
    expect(getCachedUrl('https://b.com')).toBe('https://b.com/v1');
  });

  it('invalidate without argument clears all', () => {
    cacheResolvedUrl('https://a.com', 'https://a.com/v1');
    cacheResolvedUrl('https://b.com', 'https://b.com/v1');
    invalidateCache();
    expect(getCachedUrl('https://a.com')).toBeUndefined();
    expect(getCachedUrl('https://b.com')).toBeUndefined();
  });
});

describe('isUrlError', () => {
  it('detects 404 status as retryable URL error', () => {
    const err = Object.assign(new Error('status 404: The requested resource was not found'), { statusCode: 404 });
    expect(isUrlError(err)).toBe(true);
  });

  it('does not retry 401 (auth error)', () => {
    const err = Object.assign(new Error('status 401: Invalid API key'), { statusCode: 401 });
    expect(isUrlError(err)).toBe(false);
  });

  it('does not retry 403 (forbidden)', () => {
    const err = Object.assign(new Error('status 403: Forbidden'), { statusCode: 403 });
    expect(isUrlError(err)).toBe(false);
  });

  it('does not retry 429 (rate limit — would worsen it)', () => {
    const err = Object.assign(new Error('status 429: Too Many Requests'), { statusCode: 429 });
    expect(isUrlError(err)).toBe(false);
  });

  it('does not retry 5xx (server error)', () => {
    const err = Object.assign(new Error('status 500: Internal Server Error'), { statusCode: 500 });
    expect(isUrlError(err)).toBe(false);
  });

  it('handles errors without statusCode property', () => {
    const err = new Error('Network error: fetch failed');
    expect(isUrlError(err)).toBe(false);
  });

  it('detects 404 via message text fallback when statusCode missing', () => {
    const err = new Error('status 404: Not Found');
    expect(isUrlError(err)).toBe(true);
  });

  it('does not retry OpenRouter model 404 as a URL error', () => {
    const err = Object.assign(
      new Error('status 404: No endpoints found for openrouter/retired-model'),
      { statusCode: 404 },
    );
    const responseBodyErr = Object.assign(
      new Error('Provider returned error 404'),
      {
        statusCode: 404,
        responseBody: '{"error":{"message":"No endpoints found for openrouter/retired-model"}}',
      },
    );
    expect(isUrlError(err)).toBe(false);
    expect(isUrlError(responseBodyErr)).toBe(false);
  });
});

describe('resolveBaseUrlWithFallback', () => {
  beforeEach(() => {
    invalidateCache();
  });

  it('returns the user URL when testFn succeeds on first try', async () => {
    const testFn = vi.fn().mockResolvedValue(true);
    const result = await resolveBaseUrlWithFallback({
      baseUrl: 'https://api.kimi.com/coding/v1',
      testFn,
    });
    expect(result).toBe('https://api.kimi.com/coding/v1');
    expect(testFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to /v1 variant when original fails (Kimi case)', async () => {
    const testFn = vi.fn()
      .mockImplementation((url: string) => Promise.resolve(url === 'https://api.kimi.com/coding/v1'));
    const result = await resolveBaseUrlWithFallback({
      baseUrl: 'https://api.kimi.com/coding/',
      testFn,
    });
    expect(result).toBe('https://api.kimi.com/coding/v1');
    // Called: original (failed) + stripped (failed) + /v1 (success)
    expect(testFn).toHaveBeenCalledTimes(3);
    expect(testFn).toHaveBeenNthCalledWith(1, 'https://api.kimi.com/coding/');
    expect(testFn).toHaveBeenNthCalledWith(2, 'https://api.kimi.com/coding');
    expect(testFn).toHaveBeenNthCalledWith(3, 'https://api.kimi.com/coding/v1');
  });

  it('uses cached URL on subsequent calls without retrying', async () => {
    const testFn = vi.fn().mockResolvedValue(true);
    await resolveBaseUrlWithFallback({
      baseUrl: 'https://api.kimi.com/coding/',
      testFn: vi.fn().mockImplementation((url: string) => Promise.resolve(url === 'https://api.kimi.com/coding/v1')),
    });
    // Second call should hit cache, no testFn calls
    testFn.mockClear();
    const result = await resolveBaseUrlWithFallback({
      baseUrl: 'https://api.kimi.com/coding/',
      testFn,
    });
    expect(result).toBe('https://api.kimi.com/coding/v1');
    expect(testFn).not.toHaveBeenCalled();
  });

  it('throws original error when all candidates fail', async () => {
    const testFn = vi.fn().mockResolvedValue(false);
    const originalError = new Error('status 404: not found');
    await expect(
      resolveBaseUrlWithFallback({
        baseUrl: 'https://api.kimi.com/coding/',
        testFn,
        originalError,
      })
    ).rejects.toThrow('not found');
  });

  it('applies delay between candidate attempts (rate limit protection)', async () => {
    const start = Date.now();
    const testFn = vi.fn()
      .mockImplementation((url: string) => Promise.resolve(url === 'https://api.kimi.com/coding/v1'));
    await resolveBaseUrlWithFallback({
      baseUrl: 'https://api.kimi.com/coding/',
      testFn,
    });
    const elapsed = Date.now() - start;
    // 2 candidates tried after original fails: at least 2 × RETRY_DELAY_MS
    expect(elapsed).toBeGreaterThanOrEqual(RETRY_DELAY_MS * 2);
    expect(testFn).toHaveBeenCalledTimes(3);
  });
});

describe('fetchModelsWithFallback', () => {
  beforeEach(() => {
    invalidateCache();
  });

  it('returns models from the user-entered baseURL on first try', async () => {
    const modelsUrl = 'https://api.kimi.com/coding/v1/models';
    const fetchFn = vi.fn()
      .mockImplementation((url: string) => Promise.resolve(url === modelsUrl ? ['kimi-for-coding'] : []));
    const models = await fetchModelsWithFallback({
      baseUrl: 'https://api.kimi.com/coding/v1',
      provider: 'anthropic-compatible',
      fetchFn,
    });
    expect(models).toEqual(['kimi-for-coding']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('tries /v1 suffix when original URL fails (Kimi Anthropic case)', async () => {
    // User enters Kimi Anthropic URL without /v1
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://api.kimi.com/coding/v1/models') {
        return Promise.resolve(['kimi-for-coding']);
      }
      return Promise.resolve([]); // other URLs return empty
    });
    const models = await fetchModelsWithFallback({
      baseUrl: 'https://api.kimi.com/coding/',
      provider: 'anthropic-compatible',
      fetchFn,
    });
    expect(models).toEqual(['kimi-for-coding']);
    // Original `/coding/` strips trailing → `/coding` (try both /v1/models and /models)
    // Then `/coding/v1` (try both /v1/models and /models)
    // First working: `/coding/v1/models` → succeeds
    const fetchedUrls = fetchFn.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(fetchedUrls).toContain('https://api.kimi.com/coding/v1/models');
  });

  it('tries both OpenAI and Anthropic header variants for ambiguous URLs', async () => {
    // Kimi Coding Plan accepts both /v1/messages (Anthropic) and /v1/chat/completions (OpenAI)
    // The /models endpoint exists at both /v1/models (Anthropic-style) and /models (OpenAI-style)
    // Anthropic-compatible should hit Anthropic-style first; OpenAI-compat should hit OpenAI-style first
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      // For OpenAI-compatible Kimi: only /v1/models works
      if (url === 'https://api.kimi.com/coding/v1/models') {
        return Promise.resolve(['kimi-for-coding']);
      }
      return Promise.resolve([]);
    });
    const models = await fetchModelsWithFallback({
      baseUrl: 'https://api.kimi.com/coding/v1',
      provider: 'openai-compatible',
      fetchFn,
    });
    expect(models).toEqual(['kimi-for-coding']);
  });

  it('uses cached URL on subsequent calls (cross-call sharing)', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(url === 'https://api.kimi.com/coding/v1/models' ? ['kimi-for-coding'] : [])
    );
    // First call resolves /v1
    await fetchModelsWithFallback({
      baseUrl: 'https://api.kimi.com/coding/',
      provider: 'anthropic-compatible',
      fetchFn,
    });
    expect(getCachedUrl('https://api.kimi.com/coding/')).toBe('https://api.kimi.com/coding/v1');

    // Second call: cache hit, fetchFn called fewer times
    fetchFn.mockClear();
    const models = await fetchModelsWithFallback({
      baseUrl: 'https://api.kimi.com/coding/',
      provider: 'anthropic-compatible',
      fetchFn,
    });
    expect(models).toEqual(['kimi-for-coding']);
    // Only the resolved URL is tried (cache hit → single attempt)
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when all candidates fail', async () => {
    const fetchFn = vi.fn().mockResolvedValue([]);
    const models = await fetchModelsWithFallback({
      baseUrl: 'https://invalid.example.com',
      provider: 'anthropic-compatible',
      fetchFn,
    });
    expect(models).toEqual([]);
  });

  it('returns empty array for empty baseUrl', async () => {
    const fetchFn = vi.fn();
    const models = await fetchModelsWithFallback({
      baseUrl: '',
      provider: 'openai-compatible',
      fetchFn,
    });
    expect(models).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // B1 fix (v1.26.3 PATCH follow-up): when fetchFn throws an error with
  // HTTP status info (e.g., fetchOneUrl in model-section.ts throws
  // "HTTP 401: ..." for an invalid API key), the orchestrator must
  // re-throw that last error after all candidates fail. Otherwise the
  // classifier at settings-helpers.ts:7 never sees the 401 status code
  // and every fetch failure is misreported as "fetchErrorNetwork".
  describe('fetchFn throws with HTTP status', () => {
    it('re-throws the last HTTP-status error when all candidates fail', async () => {
      const authError = new Error('HTTP 401: {"error":{"message":"Invalid API Key"}}');
      const fetchFn = vi.fn().mockRejectedValue(authError);
      await expect(
        fetchModelsWithFallback({
          baseUrl: 'https://api.example.com/v1',
          provider: 'openai-compatible',
          fetchFn,
        })
      ).rejects.toThrow(/HTTP 401/);
    });

    it('re-throws the last HTTP 404 error when all candidates fail (wrong baseURL)', async () => {
      const notFoundError = new Error('HTTP 404: Not Found');
      const fetchFn = vi.fn().mockRejectedValue(notFoundError);
      await expect(
        fetchModelsWithFallback({
          baseUrl: 'https://wrong.example.com',
          provider: 'openai-compatible',
          fetchFn,
        })
      ).rejects.toThrow(/HTTP 404/);
    });

    it('re-throws the last HTTP 500 error when all candidates fail', async () => {
      const serverError = new Error('HTTP 500: Internal Server Error');
      const fetchFn = vi.fn().mockRejectedValue(serverError);
      await expect(
        fetchModelsWithFallback({
          baseUrl: 'https://api.example.com/v1',
          provider: 'openai-compatible',
          fetchFn,
        })
      ).rejects.toThrow(/HTTP 500/);
    });

    it('still returns empty array when fetchFn returns [] (no status info)', async () => {
      // No throw, no status — old behavior preserved.
      const fetchFn = vi.fn().mockResolvedValue([]);
      const models = await fetchModelsWithFallback({
        baseUrl: 'https://api.example.com/v1',
        provider: 'openai-compatible',
        fetchFn,
      });
      expect(models).toEqual([]);
    });

    // B1 (v1.26.3 PATCH, DocT CR): a genuine network failure (DNS,
    // refused, timeout) is wrapped as "Network error: …" by fetchOneUrl
    // (model-section.ts), which does NOT match /^HTTP \d+/. Previously the
    // orchestrator forgot it and returned [], so the caller's
    // `empty model list` throw → classifyFetchError → fetchErrorEmpty —
    // a disconnected user was told "Provider has no model list endpoint".
    // The network error must be remembered and re-thrown → fetchErrorNetwork.
    it('re-throws the last network error when all candidates fail (no HTTP status)', async () => {
      const networkError = new Error('Network error: fetch failed (ECONNREFUSED)');
      const fetchFn = vi.fn().mockRejectedValue(networkError);
      await expect(
        fetchModelsWithFallback({
          baseUrl: 'https://api.example.com/v1',
          provider: 'openai-compatible',
          fetchFn,
        })
      ).rejects.toThrow(/Network error: fetch failed/);
    });

    it('prefers the HTTP-status error over a network error when both occur', async () => {
      // First candidate URL: network failure; a later one: HTTP 401. The
      // HTTP status carries more signal — it must win the final throw.
      // baseUrl without /v1 so generateUrlCandidates produces ≥2 URLs and
      // fetchFn is invoked multiple times.
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error: fetch failed'))
        .mockRejectedValue(new Error('HTTP 401: {"error":{"message":"Invalid API Key"}}'));
      await expect(
        fetchModelsWithFallback({
          baseUrl: 'https://api.example.com',
          provider: 'openai-compatible',
          fetchFn,
        })
      ).rejects.toThrow(/HTTP 401/);
    });
  });
});
