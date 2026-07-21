import { describe, expect, it } from 'vitest';
import { normalizeCodexRequest } from '../../llm-sdk/openai-codex/request-adapter';

const access = { accessToken: 'oauth-secret', accountId: 'acct' };

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') throw new Error('Expected a string body');
  return JSON.parse(body) as unknown;
}

describe('normalizeCodexRequest', () => {
  it('rewrites Responses requests and applies truthful OAuth headers', () => {
    const result = normalizeCodexRequest({ url: 'https://api.openai.com/v1/responses', init: { method: 'POST', headers: { Authorization: 'Bearer dummy' }, body: JSON.stringify({ model: 'gpt-5.5', max_output_tokens: 100, temperature: 0.2, stream: true }) }, access, sessionId: 'session-1', version: '1.24.1' });
    const headers = new Headers(result.init.headers);
    expect(result.url).toBe('https://chatgpt.com/backend-api/codex/responses');
    expect(headers.get('Authorization')).toBe('Bearer oauth-secret');
    expect(headers.get('ChatGPT-Account-Id')).toBe('acct');
    expect(headers.get('originator')).toBe('karpathywiki');
    expect(headers.get('User-Agent')).toBe('karpathywiki/1.24.1');
    expect(headers.get('session-id')).toBe('session-1');
    expect(parseBody(result.init.body)).toEqual({ model: 'gpt-5.5', stream: true, store: false });
  });
  it('preserves supported Responses fields and unrelated request options', () => {
    const signal = new AbortController().signal;
    const body = { model: 'gpt-5.5', input: [{ role: 'user', content: 'hello' }], tools: [{ type: 'web_search' }], text: { format: { type: 'json_object' } }, reasoning: { effort: 'high' }, stream: false, metadata: { source: 'test' }, top_p: 0.9 };
    const result = normalizeCodexRequest({ url: 'https://example.test/wrong', init: { method: 'POST', body: JSON.stringify(body), signal, credentials: 'omit' }, access, sessionId: 'session-2', version: '1.25.0' });
    expect(result.init.method).toBe('POST');
    expect(result.init.signal).toBe(signal);
    expect(result.init.credentials).toBe('omit');
    expect(parseBody(result.init.body)).toEqual({ model: 'gpt-5.5', input: body.input, tools: body.tools, text: body.text, reasoning: body.reasoning, stream: false, metadata: body.metadata, store: false });
  });
  it('removes unsupported sampling and output-limit fields and forces store false', () => {
    const result = normalizeCodexRequest({ url: 'https://api.openai.com/v1/responses', init: { body: JSON.stringify({ max_output_tokens: 1, temperature: 0, top_p: 0, store: true }) }, access, sessionId: 'session-3', version: '1.25.0' });
    expect(parseBody(result.init.body)).toEqual({ store: false });
  });
  it('rejects invalid JSON without exposing request contents', () => {
    const secret = 'private-token-value';
    expect(() => normalizeCodexRequest({ url: 'https://api.openai.com/v1/responses', init: { body: `{${secret}` }, access, sessionId: 'session-4', version: '1.25.0' })).toThrow('Invalid Codex Responses request JSON');
    try {
      normalizeCodexRequest({ url: 'https://api.openai.com/v1/responses', init: { body: `{${secret}` }, access, sessionId: 'session-4', version: '1.25.0' });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
  it('rejects non-string bodies without exposing access tokens', () => {
    expect(() => normalizeCodexRequest({ url: 'https://api.openai.com/v1/responses', init: { body: new Uint8Array([1, 2]) }, access, sessionId: 'session-5', version: '1.25.0' })).toThrow('Codex Responses request body must be a JSON string');
    expect(() => normalizeCodexRequest({ url: 'https://api.openai.com/v1/responses', init: {}, access, sessionId: 'session-5', version: '1.25.0' })).toThrow('Codex Responses request body must be a JSON string');
  });
});
