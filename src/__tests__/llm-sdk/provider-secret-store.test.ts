// v1.25.3 #182: Persistent API key storage via Obsidian SecretStorage.
// Mirrors the CodexCredentialStore test pattern — same backend factory
// shape (Map-backed getSecret/setSecret) so tests share infrastructure.

import { describe, expect, it } from 'vitest';
import { ProviderSecretStore } from '../../llm-sdk/provider-secret-store';

function backendWith(raw?: string): { values: Map<string, string>; getSecret: (id: string) => string | null; setSecret: (id: string, value: string) => void } {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set('karpathywiki-provider-api-key', raw);
  return { values, getSecret: (id) => values.get(id) ?? null, setSecret: (id, value) => { values.set(id, value); } };
}

describe('ProviderSecretStore (#182)', () => {
  const SECRET_ID = 'karpathywiki-provider-api-key';

  it('round-trips a trimmed key and clears via clear()', () => {
    const backend = backendWith();
    const store = new ProviderSecretStore(backend, SECRET_ID);
    store.save('sk-test-key-12345');
    expect(store.load()).toBe('sk-test-key-12345');
    expect(store.hasKey()).toBe(true);
    store.clear();
    expect(store.load()).toBeNull();
    expect(store.hasKey()).toBe(false);
    expect(backend.values.get(SECRET_ID)).toBe('');
  });

  it('trims whitespace on save and on load', () => {
    const backend = backendWith();
    const store = new ProviderSecretStore(backend, SECRET_ID);
    store.save('  sk-padded-key  ');
    expect(backend.values.get(SECRET_ID)).toBe('sk-padded-key');
    expect(store.load()).toBe('sk-padded-key');
  });

  it('overwrites an existing key', () => {
    const backend = backendWith('sk-first-key');
    const store = new ProviderSecretStore(backend, SECRET_ID);
    store.save('sk-second-key');
    expect(store.load()).toBe('sk-second-key');
    expect(backend.values.get(SECRET_ID)).toBe('sk-second-key');
  });

  it('returns null for empty, whitespace-only, or missing secret', () => {
    expect(new ProviderSecretStore(backendWith(''), SECRET_ID).load()).toBeNull();
    expect(new ProviderSecretStore(backendWith('   '), SECRET_ID).load()).toBeNull();
    expect(new ProviderSecretStore(backendWith(), SECRET_ID).load()).toBeNull();
  });

  it('treats save("") as a clear (matches Codex clear convention)', () => {
    const backend = backendWith('sk-existing');
    const store = new ProviderSecretStore(backend, SECRET_ID);
    store.save('');
    expect(store.load()).toBeNull();
    expect(backend.values.get(SECRET_ID)).toBe('');
  });

  it('treats save("   ") as a clear (whitespace-only save → clear)', () => {
    const backend = backendWith('sk-existing');
    const store = new ProviderSecretStore(backend, SECRET_ID);
    store.save('   ');
    expect(store.load()).toBeNull();
    expect(backend.values.get(SECRET_ID)).toBe('');
  });

  it('uses the configured secretId to namespace the secret', () => {
    const backend = backendWith();
    const storeA = new ProviderSecretStore(backend, 'slot-a');
    const storeB = new ProviderSecretStore(backend, 'slot-b');
    storeA.save('key-a');
    storeB.save('key-b');
    expect(storeA.load()).toBe('key-a');
    expect(storeB.load()).toBe('key-b');
    expect(backend.values.get('slot-a')).toBe('key-a');
    expect(backend.values.get('slot-b')).toBe('key-b');
  });
});

// v1.25.4 #339: throw-on-demand contracts. On a Windows 10 / Obsidian
// 1.12.7 Credential Manager failure, setSecret/getSecret throw
// synchronously. The wrapper must surface writes as ProviderSecretStorageError
// (so the user-typed key is NEVER silently dropped) and degrade reads to
// null (matching the existing "no key" contract the resolver already
// interprets as "fall back to settings.apiKey").
describe('ProviderSecretStore (#339 throw-on-demand)', () => {
  const SECRET_ID = 'karpathywiki-provider-api-key';

  function throwingBackend(message = 'keychain locked'): { getSecret: (id: string) => string | null; setSecret: (id: string, value: string) => void } {
    return {
      getSecret: () => { throw new Error(message); },
      setSecret: () => { throw new Error(message); },
    };
  }

  it('save() throws ProviderSecretStorageError when setSecret throws (caller must retry, no silent loss)', async () => {
    const { ProviderSecretStorageError } = await import('../../llm-sdk/provider-secret-store');
    const backend = throwingBackend('Windows Credential Manager is locked');
    const store = new ProviderSecretStore(backend, SECRET_ID);
    expect(() => store.save('sk-user-key-12345')).toThrow(ProviderSecretStorageError);
  });

  it('load() returns null when getSecret throws (resolver falls through to settings.apiKey)', () => {
    const backend = throwingBackend('locked');
    const store = new ProviderSecretStore(backend, SECRET_ID);
    expect(store.load()).toBeNull();
    expect(store.hasKey()).toBe(false);
  });

  it('clear() throws ProviderSecretStorageError when setSecret throws', async () => {
    const { ProviderSecretStorageError } = await import('../../llm-sdk/provider-secret-store');
    const backend = throwingBackend('clear failed');
    const store = new ProviderSecretStore(backend, SECRET_ID);
    expect(() => store.clear()).toThrow(ProviderSecretStorageError);
  });
});