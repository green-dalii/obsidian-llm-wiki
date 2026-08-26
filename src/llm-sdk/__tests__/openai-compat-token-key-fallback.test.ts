// openai-compat-token-key-fallback.test.ts
//
// Integration test: on ANY HTTP 400 from an OpenAI-compatible gateway,
// the client should retry once with the alternate token key.
// No error-body inspection needed — just status 400 → swap → retry.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICallError } from 'ai';

type GenerateTextResult = { text: string };
const mockGenerateText = vi.fn<(...args: unknown[]) => Promise<GenerateTextResult>>();

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  };
});

import { OpenAICompatSdkClient } from '../openai-compat-sdk-client';

describe('OpenAICompatSdkClient — token-key fallback integration', () => {
  let client: OpenAICompatSdkClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenAICompatSdkClient({
      apiKey: 'test-key',
      baseURL: 'https://gateway.example.com/v1',
      provider: 'custom',
    });
  });

  it('retries with alt key when first call gets HTTP 400 (any body shape)', async () => {
    // This simulates ANY gateway rejection — no specific error format.
    // Just status 400 with simple body. The client should retry once.
    mockGenerateText
      .mockRejectedValueOnce(new APICallError({
        message: 'status 400',
        statusCode: 400,
        responseBody: '{"error":{"message":"bad request"}}',
        responseHeaders: {},
        url: 'https://gateway.example.com/v1/chat/completions',
        requestBodyValues: { model: 'gpt-5.5', max_tokens: 100 },
      }))
      .mockResolvedValueOnce({ text: 'hello after fallback' });

    const result = await client.createMessage({
      model: 'gpt-5.5',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('hello after fallback');
    // Exactly 2 calls: original + 1 retry
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it('caches the resolved key so subsequent calls skip the retry', async () => {
    mockGenerateText
      .mockRejectedValueOnce(new APICallError({
        message: 'status 400', statusCode: 400, responseBody: '{}',
        responseHeaders: {}, url: 'https://gateway.example.com/v1/chat/completions',
        requestBodyValues: {},
      }))
      .mockResolvedValueOnce({ text: 'ok' });

    // Call 1: triggers retry, caches alt key
    await client.createMessage({
      model: 'gpt-5.5',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    // Call 2: cache hit — only one generateText call, no retry
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValueOnce({ text: 'ok2' });

    const result = await client.createMessage({
      model: 'gpt-5.5',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi again' }],
    });

    expect(result).toBe('ok2');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 401 (auth error)', async () => {
    mockGenerateText.mockRejectedValue(new APICallError({
      message: 'status 401', statusCode: 401, responseBody: '{}',
      responseHeaders: {}, url: '', requestBodyValues: {},
    }));

    await expect(client.createMessage({
      model: 'gpt-5.5', max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    })).rejects.toThrow();

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 429 (rate limit)', async () => {
    mockGenerateText.mockRejectedValue(new APICallError({
      message: 'status 429', statusCode: 429, responseBody: '{}',
      responseHeaders: {}, url: '', requestBodyValues: {},
    }));

    await expect(client.createMessage({
      model: 'gpt-5.5', max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    })).rejects.toThrow();

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry twice when both keys fail', async () => {
    // First call: 400 → triggers retry
    // Second call (alt key): also 400 → throw (don't retry a third time)
    const fourHundred = new APICallError({
      message: 'status 400', statusCode: 400, responseBody: '{}',
      responseHeaders: {}, url: '', requestBodyValues: {},
    });
    mockGenerateText.mockRejectedValue(fourHundred);

    await expect(client.createMessage({
      model: 'gpt-5.5', max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    })).rejects.toThrow();

    // 2 attempts: original + 1 fallback (which also failed)
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it('treats different baseURLs independently', async () => {
    const client2 = new OpenAICompatSdkClient({
      apiKey: 'test-key',
      baseURL: 'https://other-gateway.example.com/v1',
      provider: 'custom',
    });

    // client (gateway.example.com) needs fallback
    mockGenerateText
      .mockRejectedValueOnce(new APICallError({
        message: 'status 400', statusCode: 400, responseBody: '{}',
        responseHeaders: {}, url: '', requestBodyValues: {},
      }))
      .mockResolvedValueOnce({ text: 'gateway-ok' })
      // client2 should succeed on first attempt
      .mockResolvedValueOnce({ text: 'other-ok' });

    await client.createMessage({
      model: 'gpt-5.5', max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    // client2 uses different baseURL — should not inherit client's cache
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValueOnce({ text: 'other-ok' });

    const result = await client2.createMessage({
      model: 'gpt-5.5', max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('other-ok');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('lets a sibling model probe after another model populated the cache (#551)', async () => {
    // mockReset (not clearAllMocks): the previous test leaves a consumed-
    // once queue behind, and clearAllMocks does not drop queued
    // implementations.
    mockGenerateText.mockReset();
    // Model A on the gateway rejects max_tokens: 400 → retry succeeds →
    // the cache now holds a verdict for (baseURL, model-a).
    mockGenerateText
      .mockRejectedValueOnce(new APICallError({
        message: 'status 400', statusCode: 400, responseBody: '{}',
        responseHeaders: {}, url: 'https://gateway.example.com/v1/chat/completions',
        requestBodyValues: {},
      }))
      .mockResolvedValueOnce({ text: 'a-ok' });

    await client.createMessage({
      model: 'model-a', max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(mockGenerateText).toHaveBeenCalledTimes(2);

    // Model B on the SAME gateway also 400s on its first call. With the
    // per-baseURL cache the retry guard `!getCachedKey(baseURL)` was
    // already false — B's 400 was thrown and the repair path was
    // permanently disabled for the whole gateway. Per (baseURL, model)
    // B gets its own probe: retry fires and succeeds.
    vi.clearAllMocks();
    mockGenerateText
      .mockRejectedValueOnce(new APICallError({
        message: 'status 400', statusCode: 400, responseBody: '{}',
        responseHeaders: {}, url: 'https://gateway.example.com/v1/chat/completions',
        requestBodyValues: {},
      }))
      .mockResolvedValueOnce({ text: 'b-ok' });

    const result = await client.createMessage({
      model: 'model-b', max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('b-ok');
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });
});
