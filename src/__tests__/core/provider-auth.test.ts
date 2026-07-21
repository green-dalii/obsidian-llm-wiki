import { describe, expect, it } from 'vitest';
import { isProviderConfigured, providerRequiresApiKey, providerSupportsOAuth } from '../../core/provider-auth';
import { PREDEFINED_PROVIDERS } from '../../types';

describe('provider auth policy', () => {
  it('keeps OpenAI on API-key auth', () => {
    expect(providerRequiresApiKey('openai')).toBe(true);
    expect(providerSupportsOAuth('openai')).toBe(false);
  });
  it('configures openai-codex only with a stored credential and model', () => {
    expect(isProviderConfigured({ provider: 'openai-codex', apiKey: '', model: 'gpt-5.5', hasCodexCredential: false })).toBe(false);
    expect(isProviderConfigured({ provider: 'openai-codex', apiKey: '', model: 'gpt-5.5', hasCodexCredential: true })).toBe(true);
  });
  it('preserves keyless local providers', () => {
    expect(isProviderConfigured({ provider: 'ollama', apiKey: '', model: 'qwen3', hasCodexCredential: false })).toBe(true);
    expect(isProviderConfigured({ provider: 'lmstudio', apiKey: '', model: 'local', hasCodexCredential: false })).toBe(true);
  });
  it('uses the required ChatGPT Plan label for Codex OAuth', () => {
    expect(PREDEFINED_PROVIDERS['openai-codex'].name).toBe('ChatGPT Plan (Codex OAuth)');
    expect(PREDEFINED_PROVIDERS['openai-codex'].nameEn).toBe('ChatGPT Plan (Codex OAuth)');
    expect(PREDEFINED_PROVIDERS['openai-codex'].nameZh).toBe('ChatGPT Plan (Codex OAuth)');
  });
});
