// v1.23.0 P1-7: Unit tests for OpenAICompatSdkClient.
//
// Covers the 6 baseURLs in PREDEFINED_PROVIDERS (Gemini / OpenRouter /
// DeepSeek / MiniMax / Moonshot / GLM / Ollama / LMStudio) by
// parameterizing over their baseURLs.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICallError } from 'ai';
import { requestUrl, type RequestUrlResponse } from 'obsidian';
import type * as OpenAISdkModule from '@ai-sdk/openai';

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

vi.mock('@ai-sdk/openai-compatible', async () => {
  const actual = await vi.importActual<typeof import('@ai-sdk/openai-compatible')>('@ai-sdk/openai-compatible');
  return {
    ...actual,
    createOpenAICompatible: vi.fn(actual.createOpenAICompatible),
  };
});

vi.mock('@ai-sdk/openai', async () => {
  const actual = await vi.importActual<typeof OpenAISdkModule>('@ai-sdk/openai');
  return {
    ...actual,
    createOpenAI: vi.fn(actual.createOpenAI),
  };
});

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { OpenAICompatSdkClient } from '../../llm-sdk/openai-compat-sdk-client';
import { PDF_EXTRACTION_PROMPT } from '../../core/pdf-support';

const mockGenerateText = vi.mocked(generateText);
const mockCreateOpenAICompatible = vi.mocked(createOpenAICompatible);
const mockCreateOpenAI = vi.mocked(createOpenAI);
const mockRequestUrl = vi.mocked(requestUrl);

function makeResult(text: string): Awaited<ReturnType<typeof generateText>> {
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
    response: { id: 'resp_test', timestamp: new Date(), modelId: 'test', headers: {}, body: {} },
    providerMetadata: undefined,
    experimental_providerMetadata: undefined,
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

function makeKimiResponse(status: number, text = '', json: unknown = {}): RequestUrlResponse {
  return {
    status,
    text,
    json,
    headers: {},
    arrayBuffer: new TextEncoder().encode(text).buffer,
  };
}

const PRESETS = [
  { id: 'gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  { id: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet' },
  { id: 'deepseek', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'minimax', baseURL: 'https://api.minimaxi.com/v1', model: 'MiniMax-Text-01' },
  { id: 'moonshot', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { id: 'glm', baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  { id: 'ollama', baseURL: 'http://localhost:11434/v1', model: 'llama3.1' },
  { id: 'lmstudio', baseURL: 'http://localhost:1234/v1', model: 'qwen2.5-7b' },
];

describe('OpenAICompatSdkClient', () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
    mockGenerateText.mockResolvedValue(makeResult('hello'));
    mockCreateOpenAICompatible.mockClear();
    mockCreateOpenAI.mockClear();
    mockRequestUrl.mockReset();
  });

  describe.each(PRESETS)('for provider "$id" ($baseURL)', (preset) => {
    it('forwards baseURL + name to createOpenAICompatible', async () => {
      const client = new OpenAICompatSdkClient({
        apiKey: 'test-key',
        baseURL: preset.baseURL,
        provider: preset.id,
      });
      await client.createMessage({
        model: preset.model,
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const callOpts = mockCreateOpenAICompatible.mock.calls.at(-1)![0] as unknown as Record<string, unknown>;
      expect(callOpts.baseURL).toBe(preset.baseURL);
      expect(callOpts.name).toBe(preset.id);
      expect(callOpts.apiKey).toBe('test-key');
    });

    it('creates the model with the given id', async () => {
      const client = new OpenAICompatSdkClient({
        apiKey: 'test-key',
        baseURL: preset.baseURL,
        provider: preset.id,
      });
      await client.createMessage({
        model: preset.model,
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.model).toBeDefined();
      expect(typeof call.model).toBe('object');
    });
  });

  // v1.23.0: For OpenAI-compatible providers that support thinking
  // models (DeepSeek, Moonshot Kimi k2.5/2.6, GLM-4.6+), the
  // disable-thinking signal uses `thinking.type: 'disabled'` per
  // their official documentation:
  //   - DeepSeek: https://api-docs.deepseek.com/zh-cn/guides/thinking_mode
  //   - Kimi: https://platform.kimi.com/docs/guide/use-kimi-k2-thinking-model
  //   - GLM: 智谱 BigModel thinking 模型文档
  //
  // Earlier we sent `reasoningEffort: 'low'` (OpenAI gpt-5.x style)
  // but DeepSeek's reasoning_effort only accepts 'high'/'max' —
  // 'low' is silently mapped to 'high', so the disable intent was
  // lost. Switched to `thinking.type: 'disabled'` which all three
  // providers accept.
  //
  // Note: OpenRouter is an exception (uses `reasoning: { enabled:
  // false }`); v1.24.0 can add per-provider overrides.
  describe('enableThinking handling (thinking.type=disabled for OpenAI-compatible)', () => {
    it('sends thinking.type="disabled" when enableThinking is false', async () => {
      const client = new OpenAICompatSdkClient({
        apiKey: 'sk-test',
        baseURL: 'https://api.deepseek.com/v1',
        provider: 'deepseek',
      });
      await client.createMessage({
        model: 'deepseek-chat',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
        enableThinking: false,
      });

      const call = mockGenerateText.mock.calls[0][0] as unknown as Record<string, unknown>;
      expect(call.providerOptions).toEqual({
        openaiCompatible: { thinking: { type: 'disabled' } },
      });
    });

    it('omits reasoningEffort when enableThinking is undefined', async () => {
      const client = new OpenAICompatSdkClient({
        apiKey: 'sk-test',
        baseURL: 'https://api.deepseek.com/v1',
        provider: 'deepseek',
      });
      await client.createMessage({
        model: 'deepseek-chat',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'hi' }],
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.providerOptions).toEqual({});
    });
  });

  describe('response_format support', () => {
    it('forwards response_format via providerOptions.openaiCompatible', async () => {
      const client = new OpenAICompatSdkClient({
        apiKey: 'sk-test',
        baseURL: 'https://api.deepseek.com/v1',
        provider: 'deepseek',
      });
      await client.createMessage({
        model: 'deepseek-chat',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'JSON' }],
        response_format: { type: 'json_object' },
      });

      const call = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(call.providerOptions).toEqual({
        openaiCompatible: { response_format: { type: 'json_object' } },
      });
    });
  });

  describe('error mapping (preserves v1.22.5 error body UX)', () => {
    it('enriches APICallError with provider body for 4xx responses', async () => {
      mockGenerateText.mockReset();
      mockGenerateText.mockRejectedValue(new APICallError({
        message: 'Provider returned error',
        statusCode: 429,
        responseHeaders: {},
        url: 'https://api.deepseek.com/v1',
        requestBodyValues: {},
        responseBody: JSON.stringify({
          error: { message: 'You exceeded your current quota, please check your plan and billing details' },
        }),
      }));

      const client = new OpenAICompatSdkClient({
        apiKey: 'sk-test',
        baseURL: 'https://api.deepseek.com/v1',
        provider: 'deepseek',
      });
      await expect(
        client.createMessage({
          model: 'deepseek-chat',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'hi' }],
        })
      ).rejects.toThrow(/status 429/);
      await expect(
        client.createMessage({
          model: 'deepseek-chat',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'hi' }],
        })
      ).rejects.toThrow(/quota/);
    });
  });

  describe('readDocument', () => {
    it('sends the original PDF ArrayBuffer without token-key probing', async () => {
      const client = new OpenAICompatSdkClient({
        apiKey: 'test-key',
        baseURL: 'https://example.test/v1',
        provider: 'custom',
      });
      const data = new Uint8Array([37, 80, 68, 70]).buffer;

      await expect(client.readDocument({ model: 'compatible-model', max_tokens: 321, data })).resolves.toBe('hello');

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
      expect(mockCreateOpenAI).toHaveBeenCalledWith(expect.objectContaining({
        apiKey: 'test-key',
        baseURL: 'https://example.test/v1',
      }));
      expect(mockCreateOpenAICompatible).not.toHaveBeenCalled();
    });

    it('uses Kimi Files API instead of sending a file part to chat completions', async () => {
      mockRequestUrl
        .mockResolvedValueOnce(makeKimiResponse(200, '', { id: 'file-kimi-123' }))
        .mockResolvedValueOnce(makeKimiResponse(200, 'Kimi extracted text'))
        .mockResolvedValueOnce(makeKimiResponse(200, '', { id: 'file-kimi-123', deleted: true }));
      const client = new OpenAICompatSdkClient({
        apiKey: 'kimi-test-key',
        baseURL: 'https://api.moonshot.cn/v1',
        provider: 'kimi',
      });

      await expect(client.readDocument({
        model: 'kimi-k2.6',
        max_tokens: 321,
        data: new ArrayBuffer(1),
        filename: 'paper.pdf',
      })).resolves.toBe('Kimi extracted text');

      expect(mockGenerateText).not.toHaveBeenCalled();
      expect(mockRequestUrl).toHaveBeenCalledTimes(3);
    });
  });
});