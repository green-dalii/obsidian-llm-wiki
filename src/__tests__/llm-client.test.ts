import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestUrl } from 'obsidian';

// Mock the Anthropic SDK at the module level. The factory runs before AnthropicClient
// is loaded, so the constructor's `new Anthropic({...})` call receives our mock.
const mockMessagesCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockMessagesCreate };
      // Constructor receives { apiKey, baseURL? } — just store for inspection
      constructor(_config: { apiKey: string; baseURL?: string }) {
        // no-op; mockMessagesCreate is what tests assert against
      }
    }
  };
});

import { AnthropicClient, AnthropicCompatibleClient, OpenAICompatibleClient } from '../llm-client';

const mockRequestUrl = vi.mocked(requestUrl);

function makeAnthropicResponse(text: string, stopReason?: string, statusCode = 200) {
  const payload = {
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
  };
  return {
    status: statusCode,
    text: JSON.stringify(payload),
    json: payload,
    headers: {},
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Awaited<ReturnType<typeof requestUrl>>;
}

function makeOpenAIResponse(text: string, finishReason?: string, statusCode = 200) {
  const payload = {
    choices: [{ message: { content: text }, finish_reason: finishReason }],
  };
  return {
    status: statusCode,
    text: JSON.stringify(payload),
    json: payload,
    headers: {},
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Awaited<ReturnType<typeof requestUrl>>;
}

describe('AnthropicCompatibleClient.createMessage', () => {
  beforeEach(() => {
    mockRequestUrl.mockClear();
  });

  it('returns text on successful non-truncated response', async () => {
    mockRequestUrl.mockResolvedValueOnce(makeAnthropicResponse('Hello world'));
    const client = new AnthropicCompatibleClient('key', 'https://api.example.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toBe('Hello world');
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
  });

  it('detects truncation and retries with doubled max_tokens', async () => {
    mockRequestUrl.mockResolvedValueOnce(makeAnthropicResponse('Hello', 'max_tokens'));
    mockRequestUrl.mockResolvedValueOnce(makeAnthropicResponse('Hello world'));

    const client = new AnthropicCompatibleClient('key', 'https://api.example.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello world');
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);

    const retryCall: { body: string } = mockRequestUrl.mock.calls[1][0] as { body: string };
    const retryBody: { max_tokens: number } = JSON.parse(retryCall.body) as { max_tokens: number };
    expect(retryBody.max_tokens).toBe(200);
  });

  it('outer retry on retryable network error (status 500)', async () => {
    mockRequestUrl.mockRejectedValueOnce(new Error('status 500: server error'));
    mockRequestUrl.mockResolvedValueOnce(makeAnthropicResponse('Hello'));

    const client = new AnthropicCompatibleClient('key', 'https://api.example.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello');
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
  });

  it('outer retry wraps truncation: network failure during truncation triggers full retry', async () => {
    // Attempt 0: truncated, then truncation call fails with 503
    mockRequestUrl.mockResolvedValueOnce(makeAnthropicResponse('Hello', 'max_tokens'));
    mockRequestUrl.mockRejectedValueOnce(new Error('status 503: service unavailable'));
    // Attempt 1 (outer retry): success
    mockRequestUrl.mockResolvedValueOnce(makeAnthropicResponse('Hello world'));

    const client = new AnthropicCompatibleClient('key', 'https://api.example.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello world');
    expect(mockRequestUrl).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-retryable errors (status 400)', async () => {
    mockRequestUrl.mockRejectedValueOnce(new Error('status 400: bad request'));

    const client = new AnthropicCompatibleClient('key', 'https://api.example.com');
    await expect(client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    })).rejects.toThrow('status 400: bad request');

    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
  });

  it('restores prefill brace if stripped by provider', async () => {
    // Simulate provider that stripped the leading '{' from prefill
    mockRequestUrl.mockResolvedValueOnce(makeAnthropicResponse('"key": "value"}'));

    const client = new AnthropicCompatibleClient('key', 'https://api.example.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
      response_format: { type: 'json_object' },
    });

    expect(result).toBe('{"key": "value"}');
  });
});

describe('OpenAICompatibleClient.createMessage', () => {
  beforeEach(() => {
    mockRequestUrl.mockClear();
  });

  it('returns text on successful non-truncated response', async () => {
    mockRequestUrl.mockResolvedValueOnce(makeOpenAIResponse('Hello world'));
    const client = new OpenAICompatibleClient('key', 'https://api.openai.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toBe('Hello world');
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
  });

  it('detects truncation (finish_reason=length) and retries with doubled max_tokens', async () => {
    mockRequestUrl.mockResolvedValueOnce(makeOpenAIResponse('Hello', 'length'));
    mockRequestUrl.mockResolvedValueOnce(makeOpenAIResponse('Hello world'));

    const client = new OpenAICompatibleClient('key', 'https://api.openai.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello world');
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);

    const retryCall: { body: string } = mockRequestUrl.mock.calls[1][0] as { body: string };
    const retryBody: { max_tokens: number } = JSON.parse(retryCall.body) as { max_tokens: number };
    expect(retryBody.max_tokens).toBe(200);
  });

  it('outer retry on retryable network error', async () => {
    mockRequestUrl.mockRejectedValueOnce(new Error('status 429: rate limited'));
    mockRequestUrl.mockResolvedValueOnce(makeOpenAIResponse('Hello'));

    const client = new OpenAICompatibleClient('key', 'https://api.openai.com');
    const result = await client.createMessage({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello');
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
  });
});

// Helper: build a mock Anthropic SDK response (mirrors the SDK's Message shape)
function makeAnthropicSdkResponse(text: string, stopReason: string | null = 'end_turn') {
  return {
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
  };
}

describe('AnthropicClient.createMessage', () => {
  beforeEach(() => {
    mockMessagesCreate.mockClear();
  });

  it('returns text on successful non-truncated response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeAnthropicSdkResponse('Hello world', 'end_turn')
    );

    const client = new AnthropicClient('test-key');
    const result = await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello world');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('detects truncation (stop_reason=max_tokens) and retries with doubled max_tokens', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeAnthropicSdkResponse('Hello', 'max_tokens'))
      .mockResolvedValueOnce(makeAnthropicSdkResponse('Hello world', 'end_turn'));

    const client = new AnthropicClient('test-key');
    const result = await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello world');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);

    // Second call should use doubled max_tokens
    const retryCall = mockMessagesCreate.mock.calls[1][0] as { max_tokens: number };
    expect(retryCall.max_tokens).toBe(200);
  });

  it('does not retry when stop_reason is not max_tokens (e.g. end_turn, stop_sequence)', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeAnthropicSdkResponse('Complete answer', 'end_turn')
    );

    const client = new AnthropicClient('test-key');
    const result = await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Complete answer');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1); // no retry
  });

  it('outer retry on retryable network error (status 500)', async () => {
    mockMessagesCreate
      .mockRejectedValueOnce(new Error('status 500: server error'))
      .mockResolvedValueOnce(makeAnthropicSdkResponse('Hello', 'end_turn'));

    const client = new AnthropicClient('test-key');
    const result = await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result).toBe('Hello');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable error (status 400)', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('status 400: bad request'));

    const client = new AnthropicClient('test-key');
    await expect(client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    })).rejects.toThrow('status 400: bad request');

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('restores prefill brace if stripped by provider in truncation retry path', async () => {
    // First call: truncated, response starts with content (no leading {)
    mockMessagesCreate
      .mockResolvedValueOnce(makeAnthropicSdkResponse('"key": "value"}', 'max_tokens'))
      // Retry call: successful, again stripped leading {
      .mockResolvedValueOnce(makeAnthropicSdkResponse('"key": "value"}', 'end_turn'));

    const client = new AnthropicClient('test-key');
    const result = await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
      response_format: { type: 'json_object' },
    });

    // Both responses are missing leading { — both should be restored
    expect(result).toBe('{"key": "value"}');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });

  it('caps retry max_tokens at MAX_TOKENS_BATCH (16000) when doubled exceeds it', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeAnthropicSdkResponse('truncated', 'max_tokens'))
      .mockResolvedValueOnce(makeAnthropicSdkResponse('full response', 'end_turn'));

    const client = new AnthropicClient('test-key');
    await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 15000, // doubled = 30000, but should cap at 16000
      messages: [{ role: 'user', content: 'hi' }],
    });

    const retryCall = mockMessagesCreate.mock.calls[1][0] as { max_tokens: number };
    expect(retryCall.max_tokens).toBe(16000);
  });

  it('passes through response_format prefill brace correctly when not truncated', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeAnthropicSdkResponse('"key": "value"}', 'end_turn') // missing leading {
    );

    const client = new AnthropicClient('test-key');
    const result = await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
      response_format: { type: 'json_object' },
    });

    expect(result).toBe('{"key": "value"}');
  });

  it('passes cacheBreakpoint through to messages.create', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      makeAnthropicSdkResponse('cached response', 'end_turn')
    );

    const client = new AnthropicClient('test-key');
    await client.createMessage({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'long prompt that should be split for caching' }
      ],
      cacheBreakpoint: 10,
    });

    const callArgs = mockMessagesCreate.mock.calls[0][0] as { messages: unknown[] };
    expect(callArgs.messages).toHaveLength(1);
    // After caching split, single message becomes array of content blocks
    const firstMsg = callArgs.messages[0] as { content: unknown };
    expect(Array.isArray(firstMsg.content)).toBe(true);
  });
});
