import { describe, expect, it } from 'vitest';
import { CodexCredentialStore } from '../../llm-sdk/openai-codex/credential-store';

function backendWith(raw?: string): { values: Map<string, string>; getSecret: (id: string) => string | null; setSecret: (id: string, value: string) => void } {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set('karpathywiki-openai-codex', raw);
  return { values, getSecret: (id) => values.get(id) ?? null, setSecret: (id, value) => { values.set(id, value); } };
}

describe('CodexCredentialStore', () => {
  it('round-trips and clears the plugin-owned secret', () => {
    const backend = backendWith();
    const store = new CodexCredentialStore(backend, 'karpathywiki-openai-codex');
    store.save({ accessToken: 'access', refreshToken: 'refresh', accountId: 'acct', expiresAt: 1234 });
    expect(store.load()?.refreshToken).toBe('refresh');
    expect(store.hasCredential()).toBe(true);
    store.clear();
    expect(store.load()).toBeNull();
    expect(store.hasCredential()).toBe(false);
    expect(backend.values.get('karpathywiki-openai-codex')).toBe('');
  });

  it('overwrites an existing credential', () => {
    const backend = backendWith();
    const store = new CodexCredentialStore(backend, 'karpathywiki-openai-codex');
    store.save({ accessToken: 'first', refreshToken: 'first', accountId: 'acct', expiresAt: 1 });
    store.save({ accessToken: 'second', refreshToken: 'second', accountId: 'acct', expiresAt: 2, idToken: 'id' });
    expect(store.load()).toEqual({ accessToken: 'second', refreshToken: 'second', accountId: 'acct', expiresAt: 2, idToken: 'id' });
  });

  it('binds a model catalog to the current secret account and drops the binding on account change', () => {
    const backend = backendWith();
    const store = new CodexCredentialStore(backend, 'karpathywiki-openai-codex');
    store.save({ accessToken: 'first', refreshToken: 'first', accountId: 'acct-a', expiresAt: 1 });
    store.bindModelCatalog('acct-a');
    expect(store.isModelCatalogBound('acct-a')).toBe(true);
    store.save({ accessToken: 'second', refreshToken: 'second', accountId: 'acct-a', expiresAt: 2 });
    expect(store.isModelCatalogBound('acct-a')).toBe(true);
    store.save({ accessToken: 'third', refreshToken: 'third', accountId: 'acct-b', expiresAt: 3 });
    expect(store.isModelCatalogBound('acct-b')).toBe(false);
  });

  it('returns null for an empty or malformed secret', () => {
    expect(new CodexCredentialStore(backendWith(''), 'karpathywiki-openai-codex').load()).toBeNull();
    expect(new CodexCredentialStore(backendWith('{'), 'karpathywiki-openai-codex').load()).toBeNull();
  });

  it('returns null when required fields are absent or invalid', () => {
    const missing = JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', expiresAt: 1 });
    const invalid = JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', accountId: 'acct', expiresAt: '1' });
    expect(new CodexCredentialStore(backendWith(missing), 'karpathywiki-openai-codex').load()).toBeNull();
    expect(new CodexCredentialStore(backendWith(invalid), 'karpathywiki-openai-codex').load()).toBeNull();
  });
});
