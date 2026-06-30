// v1.22.5: Responses API routing for OpenAI reasoning model family (Issue #207 follow-up).
//
// Background: v1.22.4 fixed `max_tokens` ↔ `max_completion_tokens` schema switching via
// runtime probe, but did NOT change the endpoint. OpenAI's GPT-5.5 / GPT-5.1+
// reasoning models "work best in the Responses API" (per OpenAI's official GPT-5.5
// migration guide) and Chat Completions has compatibility issues for the
// reasoning model family. gpt-5-chat-latest works on Chat Completions (it's a
// non-reasoning chat model); gpt-5.1-chat-latest and gpt-5.5 fail on Chat
// Completions.
//
// v1.22.5 hotfix: route the reasoning model family to /v1/responses with
// `reasoning: {effort: 'low'}` in the body. Non-reasoning models stay on
// /v1/chat/completions (existing path, no behavior change for the 99%).
//
// Detection: model name prefix matches the OpenAI reasoning family:
//   - gpt-5.1 / gpt-5.2 / gpt-5.3 / gpt-5.4 / gpt-5.5 / gpt-5.6 (dot-naming, all reasoning)
//   - o1 / o1-mini / o1-preview (reasoning family)
//   - o3 / o3-mini / o3-pro (reasoning family)
//   - o4-mini (reasoning family)
// Excludes:
//   - gpt-5-chat-latest (chat model, not reasoning — user reports it works)
//   - gpt-4.x / gpt-3.5 (non-reasoning family)
//   - All non-OpenAI models (DeepSeek, etc.)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestUrl } from 'obsidian';
import { OpenAICompatibleClient } from '../../llm-client';

const mockRequestUrl = vi.mocked(requestUrl);

// /v1/responses success response shape (per OpenAI docs, simplified).
function makeResponses200(content: string): Awaited<ReturnType<typeof requestUrl>> {
  return {
    status: 200,
    text: JSON.stringify({
      id: 'resp_test',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: content }],
        },
      ],
    }),
    json: {
      id: 'resp_test',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: content }],
        },
      ],
    },
    headers: {},
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Awaited<ReturnType<typeof requestUrl>>;
}

// /v1/chat/completions success response shape (existing).
function makeChat200(content: string): Awaited<ReturnType<typeof requestUrl>> {
  return {
    status: 200,
    text: JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }),
    json: { choices: [{ message: { content }, finish_reason: 'stop' }] },
    headers: {},
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Awaited<ReturnType<typeof requestUrl>>;
}

describe('v1.22.5: Responses API routing for reasoning model family', () => {
  beforeEach(() => {
    mockRequestUrl.mockReset();
  });

  describe('endpoint routing', () => {
    it.each([
      'gpt-5.5',
      'gpt-5.1',
      'gpt-5.2',
      'gpt-5.3',
      'gpt-5.4',
      'gpt-5.6',
      'o1',
      'o1-mini',
      'o1-preview',
      'o3',
      'o3-mini',
      'o3-pro',
      'o4-mini',
      // v1.22.6 #207: -pro variants are Responses-API-only per
      // OpenAI's gpt-5-pro model page ("available in the Responses
      // API only"). Previous regex missed the trailing -pro suffix.
      // Note: `gpt-5-pro` (no dot version) is not in OpenAI's
      // documented model list — only `gpt-5.x-pro` for x≥1 is.
      'gpt-5.5-pro',
      'gpt-5.4-pro',
      'gpt-5.2-pro',
      'gpt-5.1-pro',
    ])('routes %s to /v1/responses endpoint', async (model) => {
      mockRequestUrl.mockResolvedValue(makeResponses200('hello from responses'));

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await client.createMessage({
        model,
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const url = (mockRequestUrl.mock.calls[0][0] as { url: string }).url;
      expect(url).toBe('https://api.openai.com/v1/responses');
    });

    it.each([
      'gpt-5-chat-latest',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo',
    ])('keeps %s on /v1/chat/completions (existing path)', async (model) => {
      mockRequestUrl.mockResolvedValue(makeChat200('hello from chat'));

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await client.createMessage({
        model,
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const url = (mockRequestUrl.mock.calls[0][0] as { url: string }).url;
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });
  });

  describe('Responses API request body', () => {
    it('sends `reasoning: {effort: "low"}` for gpt-5.5', async () => {
      mockRequestUrl.mockResolvedValue(makeResponses200('ok'));

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const body = JSON.parse((mockRequestUrl.mock.calls[0][0] as { body: string }).body) as Record<string, unknown>;
      expect(body).toHaveProperty('reasoning');
      expect(body.reasoning).toEqual({ effort: 'low' });
    });

    it('uses `input` field (not `messages`) for Responses API', async () => {
      mockRequestUrl.mockResolvedValue(makeResponses200('ok'));

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const body = JSON.parse((mockRequestUrl.mock.calls[0][0] as { body: string }).body) as Record<string, unknown>;
      expect(body).toHaveProperty('input');
      expect(body).not.toHaveProperty('messages');
      // input is an array of message objects (Responses API format).
      expect(Array.isArray(body.input)).toBe(true);
      expect((body.input as Array<{ role: string; content: string }>)[0]).toEqual({
        role: 'user',
        content: 'hi',
      });
    });

    it('passes max_tokens as max_output_tokens for Responses API', async () => {
      mockRequestUrl.mockResolvedValue(makeResponses200('ok'));

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const body = JSON.parse((mockRequestUrl.mock.calls[0][0] as { body: string }).body) as Record<string, unknown>;
      expect(body).toHaveProperty('max_output_tokens', 100);
    });
  });

  describe('Responses API response parsing', () => {
    it('extracts text from Responses API output_text content array', async () => {
      mockRequestUrl.mockResolvedValue(makeResponses200('extracted-text-from-responses'));

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      const text = await client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      expect(text).toBe('extracted-text-from-responses');
    });
  });

  describe('non-OpenAI endpoints (custom baseUrl) — reasoning routing disabled', () => {
    it('does NOT route gpt-5.5 to /v1/responses when baseUrl is non-OpenAI (Ollama / LM Studio / etc.)', async () => {
      // Custom baseUrl providers may not implement /v1/responses. Stay on chat
      // completions for backward compatibility. The user can still use OpenAI
      // officially via baseUrl = https://api.openai.com/v1.
      mockRequestUrl.mockResolvedValue(makeChat200('ok'));

      const client = new OpenAICompatibleClient('test-key', 'http://localhost:11434/v1');
      await client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const url = (mockRequestUrl.mock.calls[0][0] as { url: string }).url;
      expect(url).toBe('http://localhost:11434/v1/chat/completions');
    });
  });

  describe('withRetry wrapping (Fix 1: 429 backoff)', () => {
    it('retries 429 responses up to 3 attempts then surfaces provider error', async () => {
      // v1.22.5 Fix 1: Responses API code path must be wrapped in withRetry
      // so 429 rate-limit hits get the same exponential backoff as
      // Chat Completions (1s, 2s, 4s + jitter). Without this, a transient
      // 429 immediately aborts and the user sees a bare status code.
      mockRequestUrl.mockResolvedValue({
        status: 429,
        text: JSON.stringify({ error: { message: 'Rate limit reached for requests' } }),
        json: { error: { message: 'Rate limit reached for requests' } },
        headers: {},
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Awaited<ReturnType<typeof requestUrl>>);

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await expect(client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      })).rejects.toThrow(/Rate limit reached/);

      // 3 total attempts (0, 1, 2) — MAX_RETRIES = 2 in src/constants.ts.
      expect(mockRequestUrl.mock.calls.length).toBe(3);
    });
  });

  describe('error message enrichment (Fix 2: provider body into Notice UI)', () => {
    it('includes the provider error message in the thrown error for 4xx', async () => {
      // v1.22.5 Fix 2: Test Connection UI should show OpenAI's actual
      // diagnostic (e.g. "You exceeded your current quota") instead of
      // a bare "status 429". Provider response body is merged into the
      // thrown Error.message.
      mockRequestUrl.mockResolvedValue({
        status: 429,
        text: JSON.stringify({ error: { message: 'You exceeded your current quota, please check your plan and billing details' } }),
        json: { error: { message: 'You exceeded your current quota, please check your plan and billing details' } },
        headers: {},
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Awaited<ReturnType<typeof requestUrl>>);

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await expect(client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      })).rejects.toThrow(/quota, please check your plan and billing/);
    });

    it('falls back to raw text when error.message is missing in 4xx response', async () => {
      // Some providers return plain-text 4xx (no JSON, no error.message).
      // We must still surface something useful so the user can debug.
      mockRequestUrl.mockResolvedValue({
        status: 429,
        text: 'plain text 429 body from provider',
        json: null as unknown as never, // intentionally null
        headers: {},
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Awaited<ReturnType<typeof requestUrl>>);

      const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
      await expect(client.createMessage({
        model: 'gpt-5.5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      })).rejects.toThrow(/plain text 429 body from provider/);
    });

    it('extracts provider error body when requestUrl THROWS on 4xx (Obsidian real-world path)', async () => {
      // v1.22.5 Fix 2 (real): Obsidian's requestUrl THROWS on 4xx
      // (including 429) WITHOUT populating err.json or err.text. We
      // re-fetch via native window.fetch (which IS available in Obsidian's
      // renderer context) and merge the provider body into the thrown
      // Error.message so the Test Connection Notice shows "status 429:
      // You exceeded your current quota..." instead of a bare status.
      const error429 = Object.assign(
        new Error('Request failed, status 429'),
        { status: 429 }, // no .json / .text — matches Obsidian's actual behavior
      );
      mockRequestUrl.mockRejectedValue(error429);

      // Mock window.fetch to simulate Obsidian's renderer fetch API.
      // window.fetch is the only path through which we can read the body.
      const fakeFetchResponse = {
        status: 429,
        text: async () => Promise.resolve(JSON.stringify({
          error: {
            message: 'You exceeded your current quota, please check your plan and billing details',
            type: 'insufficient_quota',
          },
        })),
      };
      const originalFetch = window.fetch;
      window.fetch = vi.fn().mockResolvedValue(fakeFetchResponse) as typeof window.fetch;

      try {
        const client = new OpenAICompatibleClient('test-key', 'https://api.openai.com/v1');
        await expect(client.createMessage({
          model: 'gpt-5.5',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'hi' }],
        })).rejects.toThrow(/quota, please check your plan and billing/);
        // requestUrl was called 3 times (withRetry 0/1/2) — RETRYABLE regex
        // matches "status 429" so all attempts fire before final throw.
        expect(mockRequestUrl.mock.calls.length).toBe(3);
      } finally {
        window.fetch = originalFetch;
      }
    });
  });
});