import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestUrl } from 'obsidian';
import { AnthropicClient } from '../../llm-client';

// v1.20.1 hotfix: AnthropicClient prefill-not-supported fallback.
//
// Background: Claude Opus 4.8, 4.7, 4.6, Sonnet 4.6, Claude Fable 5,
// Claude Mythos 5, Claude Mythos Preview do not support assistant message
// prefilling (Anthropic API returns 400 "Prefilling assistant messages is
// not supported for this model.").
//
// See: https://platform.claude.com/docs/en/api/errors#common-validation-errors

const mockRequestUrl = vi.mocked(requestUrl);

function makePrefillErrorResponse(): Awaited<ReturnType<typeof requestUrl>> {
  return {
    status: 400,
    text: JSON.stringify({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'Prefilling assistant messages is not supported for this model.',
      },
    }),
    json: {
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'Prefilling assistant messages is not supported for this model.',
      },
    },
    headers: {},
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Awaited<ReturnType<typeof requestUrl>>;
}

function makeSuccessResponse(text: string): Awaited<ReturnType<typeof requestUrl>> {
  return {
    status: 200,
    text: JSON.stringify({ content: [{ type: 'text', text }], stop_reason: 'end_turn' }),
    json: { content: [{ type: 'text', text }], stop_reason: 'end_turn' },
    headers: {},
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Awaited<ReturnType<typeof requestUrl>>;
}

function getBodyFromCall(callIndex: number): { messages: Array<{ role: string }> } {
  const callArgs = mockRequestUrl.mock.calls[callIndex][0] as unknown as { body: string };
  return JSON.parse(callArgs.body) as { messages: Array<{ role: string }> };
}

describe('AnthropicClient prefill-not-supported fallback (#141, #147)', () => {
  beforeEach(() => {
    mockRequestUrl.mockReset();
  });

  it('retries without prefill when 400 "Prefilling not supported" is returned', async () => {
    mockRequestUrl
      .mockResolvedValueOnce(makePrefillErrorResponse())
      .mockResolvedValueOnce(makeSuccessResponse('{"result": "ok"}'));

    const client = new AnthropicClient('test-key', 'https://api.anthropic.com');
    const result = await client.createMessage({
      model: 'claude-opus-4-8',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Analyze this source' }],
      response_format: { type: 'json_object' },
    });

    expect(result).toContain('ok');

    const firstBody = getBodyFromCall(0);
    expect(firstBody.messages.some(m => m.role === 'assistant')).toBe(true);

    const secondBody = getBodyFromCall(1);
    expect(secondBody.messages.some(m => m.role === 'assistant')).toBe(false);
  });

  it('preserves response_format hint after prefill fallback', async () => {
    mockRequestUrl
      .mockResolvedValueOnce(makePrefillErrorResponse())
      .mockResolvedValueOnce(makeSuccessResponse('{"ok": true}'));

    const client = new AnthropicClient('test-key', 'https://api.anthropic.com');
    await client.createMessage({
      model: 'claude-opus-4-8',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'test' }],
      response_format: { type: 'json_object' },
    });

    const secondBody = getBodyFromCall(1);
    expect(secondBody.messages).toHaveLength(1);
    expect(secondBody.messages[0].role).toBe('user');
  });

  it('caches prefill-not-supported to avoid future 400s', async () => {
    mockRequestUrl
      .mockResolvedValueOnce(makePrefillErrorResponse())
      .mockResolvedValueOnce(makeSuccessResponse('{"first": true}'));

    const client = new AnthropicClient('test-key', 'https://api.anthropic.com');
    await client.createMessage({
      model: 'claude-opus-4-8',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'test' }],
      response_format: { type: 'json_object' },
    });

    mockRequestUrl.mockResolvedValueOnce(makeSuccessResponse('{"second": true}'));
    await client.createMessage({
      model: 'claude-opus-4-8',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'test 2' }],
      response_format: { type: 'json_object' },
    });

    // 3 calls total (not 4): first 400 + fallback + second (no prefill)
    expect(mockRequestUrl).toHaveBeenCalledTimes(3);

    const thirdBody = getBodyFromCall(2);
    expect(thirdBody.messages.some(m => m.role === 'assistant')).toBe(false);
  });

  it('does not affect requests without response_format (no prefill)', async () => {
    mockRequestUrl.mockResolvedValueOnce(makeSuccessResponse('plain text'));

    const client = new AnthropicClient('test-key', 'https://api.anthropic.com');
    const result = await client.createMessage({
      model: 'claude-opus-4-8',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result).toBe('plain text');
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);

    const body = getBodyFromCall(0);
    expect(body.messages.every(m => m.role === 'user')).toBe(true);
  });
});