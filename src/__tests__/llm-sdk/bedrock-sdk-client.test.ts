// v1.24.0: Unit tests for BedrockSdkClient.
//
// Strategy: mock `ai.generateText` / `ai.streamText` and
// `@ai-sdk/amazon-bedrock`'s createAmazonBedrock to verify the client
// forwards the right params and unwraps the result correctly. Mirrors
// anthropic-sdk-client.test.ts's structure since BedrockSdkClient is
// intentionally shaped the same way.

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

vi.mock('@ai-sdk/amazon-bedrock', async () => {
  const actual = await vi.importActual<typeof import('@ai-sdk/amazon-bedrock')>('@ai-sdk/amazon-bedrock');
  return {
    ...actual,
    createAmazonBedrock: vi.fn(actual.createAmazonBedrock),
  };
});

import { generateText, streamText } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { BedrockSdkClient } from '../../llm-sdk/bedrock-sdk-client';

const mockGenerateText = vi.mocked(generateText);
const mockStreamText = vi.mocked(streamText);
const mockCreateAmazonBedrock = vi.mocked(createAmazonBedrock);

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
    response: { id: 'resp_test', timestamp: new Date(), modelId: 'us.anthropic.claude-sonnet-5', headers: {}, body: {} },
    providerMetadata: undefined,
    experimental_providerMetadata: undefined,
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

describe('BedrockSdkClient', () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
    mockGenerateText.mockResolvedValue(makeGenerateTextResult('hello from bedrock'));
  });

  describe('createMessage happy path', () => {
    it('returns text from generateText result', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      const text = await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });
      expect(text).toBe('hello from bedrock');
    });

    it('forwards model + max_tokens', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 200,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.model).toBeDefined();
      expect(call.maxOutputTokens).toBe(200);
    });
  });

  describe('system role convention', () => {
    it('keeps system at top-level when provided (NOT in messages[0])', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        system: 'You are Claude, a helpful assistant.',
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.system).toBe('You are Claude, a helpful assistant.');
      const messages = call.messages as Array<{ role: string }>;
      for (const m of messages) {
        expect(m.role).not.toBe('system');
      }
    });

    it('omits system when not provided', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect('system' in call ? call.system : undefined).toBeUndefined();
    });
  });

  describe('region configuration', () => {
    beforeEach(() => {
      mockCreateAmazonBedrock.mockClear();
    });

    it('passes the configured region to createAmazonBedrock', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key', region: 'eu-central-1' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const callOpts = mockCreateAmazonBedrock.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(callOpts.region).toBe('eu-central-1');
      expect(callOpts.apiKey).toBe('bedrock-test-key');
    });

    it('defaults to us-east-1 when region is not provided', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const callOpts = mockCreateAmazonBedrock.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(callOpts.region).toBe('us-east-1');
    });
  });

  describe('enableThinking behavior', () => {
    it('does NOT send reasoningConfig when enableThinking is undefined', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.providerOptions).toEqual({});
    });

    it('sends reasoningConfig: {type:"disabled"} when enableThinking is false', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        enableThinking: false,
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.providerOptions).toEqual({
        bedrock: { reasoningConfig: { type: 'disabled' } },
      });
    });

    it('does NOT send reasoningConfig when enableThinking is true (rely on model default)', async () => {
      // Strict `=== false` guard: true must produce empty options, so
      // the model's own default reasoning behavior applies.
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        enableThinking: true,
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.providerOptions).toEqual({});
    });
  });

  describe('parameter forwarding', () => {
    it('forwards temperature when provided', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        temperature: 0.7,
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.temperature).toBe(0.7);
    });

    it('drops repetition_penalty (Bedrock has no equivalent)', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      await client.createMessage({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        repetition_penalty: 1.5,
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      // repetition_penalty must NOT leak into providerOptions.bedrock
      // (there is no Bedrock Converse/Invoke field for it).
      expect(call.providerOptions).toEqual({});
    });
  });

  describe('error mapping', () => {
    it('enriches APICallError with provider body', async () => {
      const apiErr = new APICallError({
        message: 'Provider returned error',
        statusCode: 400,
        responseHeaders: {},
        url: 'https://bedrock-runtime.us-east-1.amazonaws.com',
        requestBodyValues: {},
        responseBody: JSON.stringify({
          message: 'The model does not support the requested operation.',
        }),
      });
      mockGenerateText.mockReset();
      mockGenerateText.mockRejectedValue(apiErr);

      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      // Assert the enriched provider body is surfaced (not just any
      // "status 400" — the mapper must extract responseBody.message).
      await expect(
        client.createMessage({
          model: 'us.anthropic.claude-sonnet-5',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'hi' }],
        })
      ).rejects.toThrow(/The model does not support the requested operation\./);
    });
  });

  describe('createMessageStream', () => {
    function makeStreamResult(chunks: string[], opts: { reasoning?: string } = {}) {
      return {
        textStream: (async function* () {
          for (const c of chunks) yield c;
        })(),
        fullStream: (async function* () {
          for (const c of chunks) yield { type: 'text-delta', textDelta: c } as never;
        })(),
        text: chunks.join(''),
        reasoning: opts.reasoning !== undefined
          ? Promise.resolve(opts.reasoning)
          : Promise.resolve(undefined),
        usage: Promise.resolve({ inputTokens: 10, outputTokens: 20, totalTokens: 30 }),
        finishReason: Promise.resolve('stop'),
        response: Promise.resolve({
          id: 'resp_test',
          timestamp: new Date(),
          modelId: 'us.anthropic.claude-sonnet-5',
          headers: {},
          body: {},
        }),
      } as unknown as ReturnType<typeof streamText>;
    }

    beforeEach(() => {
      mockStreamText.mockReset();
    });

    it('calls onChunk with each text delta', async () => {
      mockStreamText.mockReturnValue(makeStreamResult(['hello', ' ', 'world']));

      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      const chunks: string[] = [];
      const result = await client.createMessageStream({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: (c: string) => chunks.push(c),
      });

      expect(chunks).toEqual(['hello', ' ', 'world']);
      expect(result).toBe('hello world');
    });

    it('prepends <think>...</think> wrap when reasoning content is present', async () => {
      // Bedrock Claude models can return extended-thinking output; the
      // client wraps it in <think> so downstream chat rendering can
      // fold it. Regression protection for the wrap format.
      mockStreamText.mockReturnValue(
        makeStreamResult(['answer text'], { reasoning: 'chain of thought' })
      );

      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      const result = await client.createMessageStream({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: () => {},
      });

      expect(result).toBe('<think>\nchain of thought\n</think>\n\nanswer text');
    });

    it('does NOT wrap when reasoning is absent (empty string)', async () => {
      mockStreamText.mockReturnValue(makeStreamResult(['plain answer']));

      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      const result = await client.createMessageStream({
        model: 'us.anthropic.claude-sonnet-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        onChunk: () => {},
      });

      expect(result).toBe('plain answer');
      expect(result).not.toContain('<think>');
    });
  });

  describe('listModels', () => {
    it('returns empty array (no live model list — curated list lives in settings UI)', async () => {
      const client = new BedrockSdkClient({ apiKey: 'bedrock-test-key' });
      expect(await client.listModels()).toEqual([]);
    });
  });
});
