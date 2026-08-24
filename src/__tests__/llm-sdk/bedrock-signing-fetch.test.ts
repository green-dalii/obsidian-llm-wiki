// Wire-shape tests for the SigV4 signing fetch wrapper (#425).
//
// The wrapper sits between the AI-SDK clients and obsidianFetchBridge:
// bedrock-mantle hosts get signed (bearer headers stripped, AWS
// Authorization attached), every other host passes through untouched.
// Signing MATH is proven by bedrock-sigv4.test.ts against official AWS
// vectors; here we pin what reaches the wire at the seam.

import { describe, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import type { ObsidianFetchInit } from '../../core/obsidian-fetch-bridge';
import { createSigV4SigningFetch } from '../../llm-sdk/bedrock-sso/signing-fetch';
import type { BedrockCredentials } from '../../llm-sdk/bedrock-sso/types';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  writable: true,
  value: webcrypto,
});

const CREDS: BedrockCredentials = { accessKeyId: 'AKID-test', secretAccessKey: 'secret-test' };
const FIXED_NOW = new Date(Date.UTC(2026, 7, 25, 10, 0, 0));

function capturingDelegate(response: Response = new Response('{}', { status: 200 })) {
  const calls: Array<{ url: string; init?: ObsidianFetchInit }> = [];
  const delegate = vi.fn(async (url: string, init?: ObsidianFetchInit) => {
    calls.push({ url, init });
    return response;
  });
  return { delegate, calls };
}

describe('createSigV4SigningFetch', () => {
  it('passes foreign hosts through byte-identical', async () => {
    const { delegate, calls } = capturingDelegate();
    const fetchFn = createSigV4SigningFetch({
      delegate,
      getCredentials: async () => CREDS,
      now: () => FIXED_NOW,
    });
    const init: ObsidianFetchInit = {
      method: 'POST',
      headers: { authorization: 'Bearer leak-me' },
      body: '{"x":1}',
    };
    await fetchFn('https://openrouter.ai/api/v1/chat/completions', init);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
    // Untouched — including the original bearer header.
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe('Bearer leak-me');
  });

  it('signs bedrock-mantle hosts and strips bearer headers before signing', async () => {
    const { delegate, calls } = capturingDelegate();
    const fetchFn = createSigV4SigningFetch({
      delegate,
      getCredentials: async () => CREDS,
      now: () => FIXED_NOW,
    });
    await fetchFn('https://bedrock-mantle.eu-central-1.api.aws/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': 'sdk-set-key',
        Authorization: 'Bearer sdk-bearer',
        'content-type': 'application/json',
      },
      body: '{"model":"x"}',
    });

    expect(calls).toHaveLength(1);
    const sent = calls[0].init!;
    const headers = sent.headers as Record<string, string>;
    expect(headers['authorization']).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID-test\//);
    expect(headers['authorization']).not.toContain('sdk-bearer');
    expect(headers['authorization']).not.toContain('sdk-set-key');
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['x-amz-date']).toBe('20260825T100000Z');
    // Credential scope carries the region captured FROM THE HOST.
    expect(headers['authorization']).toContain('/20260825/eu-central-1/bedrock/aws4_request');
    // Body and content-type still reach the wire unchanged.
    expect(sent.body).toBe('{"model":"x"}');
    expect(headers['content-type']).toBe('application/json');
    expect(headers['authorization']).toContain('SignedHeaders=content-type;host;x-amz-date');
  });

  it('adds x-amz-security-token when credentials carry a session token', async () => {
    const { delegate, calls } = capturingDelegate();
    const fetchFn = createSigV4SigningFetch({
      delegate,
      getCredentials: async () => ({ ...CREDS, sessionToken: 'tok-123' }),
      now: () => FIXED_NOW,
    });
    await fetchFn('https://bedrock-mantle.us-east-1.api.aws/', { method: 'POST' });

    const headers = calls[0].init!.headers as Record<string, string>;
    expect(headers['x-amz-security-token']).toBe('tok-123');
    expect(headers['authorization']).toContain('SignedHeaders=host;x-amz-date;x-amz-security-token');
  });

  it('propagates credential-resolution failures instead of sending unsigned requests', async () => {
    const { delegate, calls } = capturingDelegate();
    const fetchFn = createSigV4SigningFetch({
      delegate,
      getCredentials: async () => {
        throw new Error('AWS SSO session has expired');
      },
      now: () => FIXED_NOW,
    });
    await expect(
      fetchFn('https://bedrock-mantle.us-east-1.api.aws/', { method: 'POST' }),
    ).rejects.toThrow('AWS SSO session has expired');
    // Nothing unsigned ever hit the wire.
    expect(calls).toHaveLength(0);
  });
});
