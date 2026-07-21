import { vi } from 'vitest';
import type { LLMClient } from '../../types';
import type { CodexCredential, CodexCredentialStoreLike, FetchLike } from '../../llm-sdk/openai-codex/types';

export function jwt(accountId: string): string {
  const payload = btoa(JSON.stringify({ 'https://api.openai.com/auth': { chatgpt_account_id: accountId } })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
  return `x.${payload}.y`;
}

export function freshCredential(refreshToken = 'refresh'): CodexCredential {
  return { accessToken: 'access', refreshToken, accountId: 'acct-1', expiresAt: 3601000 };
}

export function expiredCredential(): CodexCredential {
  return { ...freshCredential(), expiresAt: 1 };
}

export function memoryCredentialStore(initial: CodexCredential | null = null): CodexCredentialStoreLike {
  let credential = initial;
  return { load: () => credential, save: (value) => { credential = value; }, clear: () => { credential = null; }, hasCredential: () => credential !== null };
}

export function fakeAuthManager(): {
  getAccess: ReturnType<typeof vi.fn<() => Promise<{ accessToken: string; accountId: string }>>>;
  refreshAfterUnauthorized: ReturnType<typeof vi.fn<() => Promise<{ accessToken: string; accountId: string }>>>;
} {
  return {
    getAccess: vi.fn(async () => ({ accessToken: 'access', accountId: 'acct-1' })),
    refreshAfterUnauthorized: vi.fn(async () => ({ accessToken: 'refreshed-access', accountId: 'acct-1' })),
  };
}

export function errorResponse(status: number): Response {
  return new Response(JSON.stringify({ error: { message: `Request failed with status ${status}` } }), { status, headers: { 'Content-Type': 'application/json' } });
}

export function textResponse(text: string): Response {
  return new Response(JSON.stringify({ id: 'response-1', created_at: 1, model: 'gpt-5.5', output: [{ type: 'message', id: 'message-1', role: 'assistant', content: [{ type: 'output_text', text, annotations: [] }] }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export function messageParams(): Parameters<LLMClient['createMessage']>[0] {
  return { model: 'gpt-5.5', max_tokens: 128, messages: [{ role: 'user', content: 'Hello' }] };
}

export interface FakeLoopbackServerInput {
  requestUrl?: string;
  startError?: Error;
  waitForCallback?: () => Promise<string>;
  close: () => void;
}

export function fakeLoopbackServer(input: FakeLoopbackServerInput): { start: () => Promise<void>; waitForCallback: () => Promise<string>; close: () => void } {
  return { start: async () => { if (input.startError) throw input.startError; }, waitForCallback: input.waitForCallback ?? (async () => input.requestUrl ?? '/auth/callback'), close: () => { input.close(); } };
}

export const failingFetch: FetchLike = async () => {
  throw new Error('Token exchange failed');
};
