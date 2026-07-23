// v1.25.3 #182: tests for the central API-key resolver. Mirrors the
// provider-secret-store.test.ts backend factory shape.

import { describe, expect, it } from 'vitest';
import { resolveProviderApiKey } from '../../llm-sdk/provider-api-key-resolver';
import type { ProviderSecretStorage } from '../../llm-sdk/provider-secret-store';

function backendWith(raw?: string): ProviderSecretStorage {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set('karpathywiki-provider-api-key', raw);
  return {
    getSecret: (id) => values.get(id) ?? null,
    setSecret: (id, value) => { values.set(id, value); },
  };
}

const SETTINGS = { apiKey: '', providerApiKeySecretId: 'karpathywiki-provider-api-key' };

describe('resolveProviderApiKey (#182)', () => {
  it('returns the trimmed SecretStorage value when present', () => {
    expect(resolveProviderApiKey(SETTINGS, backendWith('  sk-secret-123  '))).toBe('sk-secret-123');
  });

  it('falls back to settings.apiKey when SecretStorage is empty', () => {
    expect(resolveProviderApiKey({ ...SETTINGS, apiKey: 'sk-fallback' }, backendWith())).toBe('sk-fallback');
  });

  it('falls back to settings.apiKey when SecretStorage is whitespace-only', () => {
    expect(resolveProviderApiKey({ ...SETTINGS, apiKey: 'sk-fallback' }, backendWith('   '))).toBe('sk-fallback');
  });

  it('returns empty string when both sources are empty', () => {
    expect(resolveProviderApiKey(SETTINGS, backendWith())).toBe('');
    expect(resolveProviderApiKey(SETTINGS, null)).toBe('');
  });

  it('returns empty string when SecretStorage is null and settings.apiKey is empty', () => {
    expect(resolveProviderApiKey(SETTINGS, null)).toBe('');
  });

  it('SecretStorage wins over settings.apiKey when both populated', () => {
    expect(
      resolveProviderApiKey({ ...SETTINGS, apiKey: 'sk-legacy' }, backendWith('sk-new')),
    ).toBe('sk-new');
  });

  it('does not throw when SecretStorage.getSecret throws (locked keychain)', () => {
    const broken: ProviderSecretStorage = {
      getSecret: () => { throw new Error('keychain locked'); },
      setSecret: () => {},
    };
    expect(resolveProviderApiKey({ ...SETTINGS, apiKey: 'sk-fallback' }, broken)).toBe('sk-fallback');
  });
});