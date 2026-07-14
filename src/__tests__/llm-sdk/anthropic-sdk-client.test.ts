// v1.23.0 P1-7: Unit tests for AnthropicSdkClient.
//
// Strategy: mock `ai.generateText` / `ai.streamText` and
// `@ai-sdk/anthropic`'s createAnthropic to verify the client forwards
// the right params and unwraps the result correctly.
//
// Critical regression coverage:
//   - #141 (Anthropic prefill): AI-SDK handles the detection
//   - #147 (Anthropic system role): system stays at top-level, NOT in messages
//   - #143 (max_tokens): AI-SDK abstracts token-key field name per model

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICallError } from 'ai';

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(),
  };
});

vi.mock('../../core/obsidian-fetch-bridge', async () => {
  const actual = await vi.importActual<typeof import('../../core/obsidian-fetch-bridge')>('../../core/obsidian-fetch-bridge');
  return {
    ...actual,
    obsidianFetchBridge: vi.fn(actual.obsidianFetchBridge),
  };
});

vi.mock('@ai-sdk/anthropic', async () => {
  const actual = await vi.importActual<typeof import('@ai-sdk/anthropic')>('@ai-sdk/anthropic');
  return {
    ...actual,
    createAnthropic: vi.fn(actual.createAnthropic),
  };
});

import { generateText, streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { AnthropicSdkClient } from '../../llm-sdk/anthropic-sdk-client';
import { PDF_EXTRACTION_PROMPT } from '../../core/pdf-support';

const mockGenerateText = vi.mocked(generateText);
const mockStreamText = vi.mocked(streamText);
const mockCreateAnthropic = vi.mocked(createAnthropic);

function makeGenerateTextResult(text: string): Awaited<ReturnType<typeof generateText>> {
  return {
    text,
    content: [],
    reasoning: [],
    reasoningText: undefined,
    files: [],
    sources: [],
    toolCalls: [],
    toolResults: [],
    finishReason: 'stop',
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, reasoningTokens: undefined, cachedInputTokens: undefined },
    warnings: [],
    request: {},
    response: { id: 'resp_test', timestamp: new Date(), modelId: 'claude-sonnet-4-5', headers: {}, body: {} },
    providerMetadata: undefined,
    experimental_providerMetadata: undefined,
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

describe('AnthropicSdkClient', () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
    mockGenerateText.mockResolvedValue(makeGenerateTextResult('hello from claude'));
  });

  describe('createMessage happy path', () => {
    it('returns text from generateText result', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      const text = await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });
      expect(text).toBe('hello from claude');
    });

    it('forwards model + max_tokens', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.model).toBeDefined();
      expect(call.maxOutputTokens).toBe(200);
    });
  });

  describe('system role convention (Issue #147 regression test)', () => {
    // #147 fix: all 4 Anthropic retry paths keep system as top-level
    // field, NOT in messages array. AI-SDK preserves this invariant
    // — verify the call shape forwards system at top-level.
    it('keeps system at top-level when provided (NOT in messages[0])', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        system: 'You are Claude, a helpful assistant.',
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.system).toBe('You are Claude, a helpful assistant.');
      // Messages must NOT contain a synthetic system role entry.
      const messages = call.messages as Array<{ role: string }>;
      for (const m of messages) {
        expect(m.role).not.toBe('system');
      }
    });

    it('omits system when not provided', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect('system' in call ? call.system : undefined).toBeUndefined();
    });
  });

  describe('enableThinking behavior', () => {
    it('does NOT send thinking field when enableThinking is undefined', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.providerOptions).toEqual({});
    });

    it('sends thinking: {type:"disabled"} when enableThinking is false (Anthropic)', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        enableThinking: false,
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.providerOptions).toEqual({
        anthropic: { thinking: { type: 'disabled' } },
      });
    });
  });

  describe('custom baseURL for Anthropic-compatible providers (Coding Plan / z.ai / GLM-Antropic)', () => {
    beforeEach(() => {
      mockCreateAnthropic.mockClear();
    });

    it('passes baseURL to createAnthropic', async () => {
      const client = new AnthropicSdkClient({
        apiKey: 'sk-ant-test',
        baseURL: 'https://api.z.ai/v1',
      });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      // Verify the last createAnthropic call received baseURL.
      const callOpts = mockCreateAnthropic.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(callOpts.baseURL).toBe('https://api.z.ai/v1');
    });

    it('omits baseURL when not provided (uses Anthropic default)', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const callOpts = mockCreateAnthropic.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(callOpts.baseURL).toBeUndefined();
    });

    // v1.23.0 Day 3.5: Coding Plan verify — multiple Anthropic-compatible
    // baseURLs (z.ai, GLM, DeepSeek) all accepted by createAnthropic and
    // forwarded unchanged. Code-level only; no real HTTP call.
    it.each([
      ['z.ai', 'https://api.z.ai/v1'],
      ['GLM-Anthropic', 'https://api.glm.ai/v1/anthropic'],
      ['DeepSeek Anthropic-compat', 'https://api.deepseek.com/anthropic'],
      ['MiniMax-Anthropic', 'https://api.MiniMax.chat/anthropic'],
      ['OpenRouter Anthropic', 'https://openrouter.ai/api/v1/anthropic'],
    ])('forwards %s baseURL unchanged to createAnthropic', async (_name, baseURL) => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test', baseURL });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const callOpts = mockCreateAnthropic.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(callOpts.baseURL).toBe(baseURL);
      // createAnthropic should also receive the apiKey alongside baseURL.
      expect(callOpts.apiKey).toBe('sk-ant-test');
    });

    it('forwards the obsidian-fetch-bridge to createAnthropic (so baseURL hits the right host)', async () => {
      // The fetch impl is what determines WHICH URL is hit. If
      // createAnthropic is called without our bridge, the call would go to
      // a different fetch implementation that may not respect the user's
      // baseURL override. Verify the bridge is wired in.
      const client = new AnthropicSdkClient({
        apiKey: 'sk-ant-test',
        baseURL: 'https://api.z.ai/v1',
      });
      await client.createMessage({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const callOpts = mockCreateAnthropic.mock.calls.at(-1)![0] as Record<string, unknown>;
      // The fetch field should be set (not undefined) — this is the
      // bridge that carries activeDocument and respects the baseURL.
      expect(callOpts.fetch).toBeDefined();
      expect(typeof callOpts.fetch).toBe('function');
    });
  });

  describe('error mapping', () => {
    it('enriches APICallError with provider body (Issue #141/#147 preservation)', async () => {
      const apiErr = new APICallError({
        message: 'Provider returned error',
        statusCode: 400,
        responseHeaders: {},
        url: 'https://api.anthropic.com/v1',
        requestBodyValues: {},
        responseBody: JSON.stringify({
          type: 'error',
          error: { type: 'invalid_request_error', message: 'messages: first message must be from user' },
        }),
      });
      mockGenerateText.mockReset();
      mockGenerateText.mockRejectedValue(apiErr);

      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      await expect(
        client.createMessage({
          model: 'claude-sonnet-4-5',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'hi' }],
        })
      ).rejects.toThrow(/status 400.*first message must be from user/);
    });
    function makeStreamResult(chunks: string[]) {
      return {
        textStream: (async function* () {
          for (const c of chunks) yield c;
        })(),
        fullStream: (async function* () {
          for (const c of chunks) yield { type: 'text-delta', textDelta: c } as never;
        })(),
        text: chunks.join(''),
        usage: Promise.resolve({ inputTokens: 10, outputTokens: 20, totalTokens: 30 }),
        finishReason: Promise.resolve('stop'),
        response: Promise.resolve({
          id: 'resp_test',
          timestamp: new Date(),
          modelId: 'claude-sonnet-4-5',
          headers: {},
          body: {},
        }),
      } as unknown as Awaited<ReturnType<typeof streamText>>;
    }

    beforeEach(() => {
      mockStreamText.mockReset();
    });

    it('calls onChunk with each text delta', async () => {
      mockStreamText.mockReturnValue(makeStreamResult(['hello', ' ', 'world']));

      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      const chunks: string[] = [];
      // LLMClient interface declares createMessageStream as optional (?),
      // but AnthropicSdkClient always implements it. The non-null
      // assertion here is the canonical pattern for testing optional
      // interface methods that we know are present on this class.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const result = await client.createMessageStream!({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: (c: string) => chunks.push(c),
      });

      expect(chunks).toEqual(['hello', ' ', 'world']);
      expect(result).toBe('hello world');
    });

    it('keeps system at top-level during streaming (Issue #147 regression test)', async () => {
      mockStreamText.mockReturnValue(makeStreamResult(['hi']));

      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      // LLMClient declares createMessageStream as optional (?). The
      // non-null assertion is the canonical pattern when the
      // implementation is known to provide it.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      await client.createMessageStream!({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        system: 'You are helpful.',
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: () => {},
      });

      const call = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.system).toBe('You are helpful.');
      const messages = call.messages as Array<{ role: string }>;
      for (const m of messages) {
        expect(m.role).not.toBe('system');
      }
    });
  });

  describe('listModels', () => {
    it('returns empty array (placeholder)', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      // LLMClient declares listModels as optional (?). Non-null assertion
      // is the canonical pattern when the implementation provides it.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      expect(await client.listModels!()).toEqual([]);
    });
  });

  describe('readDocument', () => {
    it('sends the original PDF ArrayBuffer as an AI SDK file part', async () => {
      const client = new AnthropicSdkClient({ apiKey: 'sk-ant-test' });
      const data = new Uint8Array([37, 80, 68, 70]).buffer;

      await expect(client.readDocument({ model: 'claude-sonnet-4-5', max_tokens: 321, data })).resolves.toBe('hello from claude');

      expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({
        maxOutputTokens: 321,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PDF_EXTRACTION_PROMPT },
            { type: 'file', data, mediaType: 'application/pdf' },
          ],
        }],
      }));
    });
  });
});