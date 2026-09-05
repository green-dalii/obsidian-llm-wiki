// SecretStorage blob round-trip tests for the Bedrock credential
// stores (#425). Mirrors the codex credential-store test discipline:
// validated parse, corrupt JSON → null, clear → empty.

import { describe, expect, it, vi } from 'vitest';
import { BedrockIamCredentialStore, BedrockSsoCredentialStore } from '../../../llm-sdk/bedrock-sso/credential-store';
import { BEDROCK_IAM_SECRET_ID, BEDROCK_SSO_SECRET_ID } from '../../../llm-sdk/bedrock-sso/constants';

function memoryStorage(): {
  getSecret: ReturnType<typeof vi.fn<(id: string) => string | null>>;
  setSecret: ReturnType<typeof vi.fn<(id: string, value: string) => void>>;
  backing: Map<string, string>;
} {
  const backing = new Map<string, string>();
  return {
    backing,
    getSecret: vi.fn((id: string): string | null => backing.get(id) ?? null),
    setSecret: vi.fn((id: string, value: string): void => { backing.set(id, value); }),
  };
}

describe('BedrockSsoCredentialStore', () => {
  it('round-trips the token blob under its dedicated secret id', () => {
    const storage = memoryStorage();
    const store = new BedrockSsoCredentialStore(storage, BEDROCK_SSO_SECRET_ID);
    store.save({ accessToken: 'tok', expiresAt: 1234567890, region: 'eu-central-1', startUrl: 'https://x/start' });
    expect(storage.setSecret).toHaveBeenCalledWith(BEDROCK_SSO_SECRET_ID, expect.stringContaining('"accessToken":"tok"'));
    expect(store.load()).toMatchObject({ accessToken: 'tok', region: 'eu-central-1' });
    expect(store.hasToken()).toBe(true);
  });

  it('drops unknown extra keys when loading', () => {
    const storage = memoryStorage();
    storage.backing.set(BEDROCK_SSO_SECRET_ID, JSON.stringify({
      accessToken: 'tok', expiresAt: 1, region: 'r', startUrl: 'u', injectedJunk: 'nope',
    }));
    const store = new BedrockSsoCredentialStore(storage, BEDROCK_SSO_SECRET_ID);
    const loaded = store.load();
    expect(loaded).not.toHaveProperty('injectedJunk');
  });

  it('returns null for corrupt or missing blobs and clears by overwriting', () => {
    const storage = memoryStorage();
    const store = new BedrockSsoCredentialStore(storage, BEDROCK_SSO_SECRET_ID);
    expect(store.load()).toBeNull();
    storage.backing.set(BEDROCK_SSO_SECRET_ID, '{not json');
    expect(store.load()).toBeNull();
    storage.backing.set(BEDROCK_SSO_SECRET_ID, JSON.stringify({ accessToken: 'tok' }));
    expect(store.load()).toBeNull(); // missing required fields
    store.clear();
    expect(storage.backing.get(BEDROCK_SSO_SECRET_ID)).toBe('');
    expect(store.hasToken()).toBe(false);
  });
});

describe('BedrockIamCredentialStore', () => {
  it('round-trips static keys including an optional session token', () => {
    const storage = memoryStorage();
    const store = new BedrockIamCredentialStore(storage, BEDROCK_IAM_SECRET_ID);
    store.save({ accessKeyId: 'AKIA', secretAccessKey: 'sk' });
    expect(store.load()).toEqual({ accessKeyId: 'AKIA', secretAccessKey: 'sk' });
    store.save({ accessKeyId: 'ASIA', secretAccessKey: 'sk2', sessionToken: 'st' });
    expect(store.load()).toEqual({ accessKeyId: 'ASIA', secretAccessKey: 'sk2', sessionToken: 'st' });
    expect(store.hasKeys()).toBe(true);
  });

  it('rejects blobs missing the secret key', () => {
    const storage = memoryStorage();
    storage.backing.set(BEDROCK_IAM_SECRET_ID, JSON.stringify({ accessKeyId: 'AKIA' }));
    const store = new BedrockIamCredentialStore(storage, BEDROCK_IAM_SECRET_ID);
    expect(store.load()).toBeNull();
  });
});
