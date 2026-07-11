import { describe, it, expect } from 'vitest';
import {
  LOCAL_NO_KEY_PROVIDERS,
  isLocalNoKeyProvider,
  allowsEmptyApiKey,
} from '../../core/local-no-key-provider';

describe('local-no-key-provider', () => {
  it('lists ollama and lmstudio as the only no-key local providers', () => {
    expect([...LOCAL_NO_KEY_PROVIDERS]).toEqual(['ollama', 'lmstudio']);
  });

  it('isLocalNoKeyProvider identifies ollama and lmstudio', () => {
    expect(isLocalNoKeyProvider('ollama')).toBe(true);
    expect(isLocalNoKeyProvider('lmstudio')).toBe(true);
    expect(isLocalNoKeyProvider('openai')).toBe(false);
    expect(isLocalNoKeyProvider('custom')).toBe(false);
  });

  it('allowsEmptyApiKey: lmstudio with empty key is allowed', () => {
    expect(allowsEmptyApiKey('lmstudio', '')).toBe(true);
    expect(allowsEmptyApiKey('lmstudio', '   ')).toBe(true);
    expect(allowsEmptyApiKey('lmstudio', null)).toBe(true);
    expect(allowsEmptyApiKey('lmstudio', undefined)).toBe(true);
  });

  it('allowsEmptyApiKey: ollama with empty key is allowed', () => {
    expect(allowsEmptyApiKey('ollama', '')).toBe(true);
  });

  it('allowsEmptyApiKey: cloud providers still require a key', () => {
    expect(allowsEmptyApiKey('openai', '')).toBe(false);
    expect(allowsEmptyApiKey('openai', '   ')).toBe(false);
    expect(allowsEmptyApiKey('anthropic', undefined)).toBe(false);
    expect(allowsEmptyApiKey('openai', 'sk-test')).toBe(true);
  });
});
