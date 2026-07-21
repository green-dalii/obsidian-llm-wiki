import { describe, expect, it } from 'vitest';
import { buildAuthorizationUrl, extractAccountId, extractTokenResponseAccountId, generateOAuthState, generatePkce, parseTokenResponse } from '../../llm-sdk/openai-codex/auth-core';
import { CODEX_DEVICE_URL, CODEX_MODELS, CODEX_OAUTH_CLIENT_ID, CODEX_OAUTH_ISSUER, CODEX_REDIRECT_URI, CODEX_RESPONSES_URL, CODEX_SECRET_ID, CODEX_TOKEN_URL } from '../../llm-sdk/openai-codex/constants';

function encodedPayload(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

describe('Codex OAuth core', () => {
  it('creates an S256 PKCE pair and complete authorize URL', async () => {
    const pkce = await generatePkce(new Uint8Array(32).fill(7));
    const url = new URL(buildAuthorizationUrl('state-1', pkce));
    expect(url.origin).toBe('https://auth.openai.com');
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe(CODEX_OAUTH_CLIENT_ID);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge')).toBe(pkce.challenge);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:1455/auth/callback');
    expect(url.searchParams.get('scope')).toBe('openid profile email offline_access');
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('originator')).toBe('karpathywiki');
  });

  it('uses injected entropy for deterministic OAuth state', () => {
    expect(generateOAuthState(new Uint8Array(32).fill(7))).toHaveLength(43);
  });

  it('rejects injected OAuth entropy shorter than 32 bytes', async () => {
    await expect(generatePkce(new Uint8Array(31))).rejects.toThrow('at least 32 bytes');
    expect(() => generateOAuthState(new Uint8Array(31))).toThrow('at least 32 bytes');
  });

  it('pins the complete Codex OAuth and model contract', () => {
    expect(CODEX_OAUTH_CLIENT_ID).toBe('app_EMoamEEZ73f0CkXaXp7hrann');
    expect(CODEX_OAUTH_ISSUER).toBe('https://auth.openai.com');
    expect(CODEX_TOKEN_URL).toBe('https://auth.openai.com/oauth/token');
    expect(CODEX_DEVICE_URL).toBe('https://auth.openai.com/codex/device');
    expect(CODEX_RESPONSES_URL).toBe('https://chatgpt.com/backend-api/codex/responses');
    expect(CODEX_REDIRECT_URI).toBe('http://localhost:1455/auth/callback');
    expect(CODEX_SECRET_ID).toBe('karpathywiki-openai-codex');
    expect([...CODEX_MODELS]).toEqual(['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex-spark']);
  });

  it('rejects an incomplete token response', () => {
    expect(() => parseTokenResponse({ access_token: 'a' })).toThrow('missing refresh_token');
  });

  it('rejects non-string token fields', () => {
    expect(() => parseTokenResponse({ access_token: 'a', refresh_token: 1, expires_in: 3600 })).toThrow('missing refresh_token');
    expect(() => parseTokenResponse({ access_token: 'a', refresh_token: 'r', expires_in: '3600' })).toThrow('missing expires_in');
  });

  it('accepts a complete token response', () => {
    expect(parseTokenResponse({ access_token: 'a', refresh_token: 'r', expires_in: 3600, id_token: 'i' })).toEqual({ access_token: 'a', refresh_token: 'r', expires_in: 3600, id_token: 'i' });
  });

  it('extracts nested and top-level ChatGPT account id claims', () => {
    const nested = encodedPayload({ 'https://api.openai.com/auth': { chatgpt_account_id: 'acct-1' } });
    const topLevel = encodedPayload({ chatgpt_account_id: 'acct-2' });
    expect(extractAccountId(`x.${nested}.y`)).toBe('acct-1');
    expect(extractAccountId(`x.${topLevel}.y`)).toBe('acct-2');
  });

  it('prefers explicit account claims over organization fallback', () => {
    const access = `x.${encodedPayload({ chatgpt_account_id: 'acct-access' })}.y`;
    const id = `x.${encodedPayload({ organizations: [{ id: 'acct-org' }] })}.y`;
    expect(extractTokenResponseAccountId({ access_token: access, refresh_token: 'refresh', expires_in: 3600, id_token: id })).toBe('acct-access');
    expect(extractTokenResponseAccountId({ access_token: access, refresh_token: 'refresh', expires_in: 3600 })).toBe('acct-access');
  });

  it('rejects conflicting explicit account claims', () => {
    const access = `x.${encodedPayload({ chatgpt_account_id: 'acct-access' })}.y`;
    const id = `x.${encodedPayload({ chatgpt_account_id: 'acct-id' })}.y`;
    expect(() => extractTokenResponseAccountId({ access_token: access, refresh_token: 'refresh', expires_in: 3600, id_token: id })).toThrow('conflicting account');
  });

  it('returns null for malformed or incomplete JWT claims', () => {
    const missing = encodedPayload({ sub: 'user-1' });
    expect(extractAccountId('not-a-jwt')).toBeNull();
    expect(extractAccountId(`x.${missing}.y`)).toBeNull();
  });
});
