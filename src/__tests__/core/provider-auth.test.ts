// provider-auth tests: legacy policy invariants (restored — the #425
// review caught them being replaced rather than extended) + the Bedrock
// auth-mode gate.
//
// The bedrock half: isProviderConfigured must treat an AWS credential
// (SSO token or IAM keys) as satisfying the configuration requirement
// for bedrock-* providers running in sso/iam mode — otherwise
// initializeLLMClient nulls the client despite valid credentials and
// the feature is dead on arrival. api-key mode keeps the exact legacy
// semantics.

import { describe, expect, it } from 'vitest';
import {
  isProviderConfigured,
  providerRequiresApiKey,
  providerSupportsOAuth,
  usesBedrockAwsCredentials,
  type ProviderCredentialState,
} from '../../core/provider-auth';
import { PREDEFINED_PROVIDERS } from '../../types';

function base(overrides: Partial<ProviderCredentialState>): ProviderCredentialState {
  return { provider: 'bedrock-anthropic', apiKey: '', model: 'anthropic.claude-x', hasCodexCredential: false, ...overrides };
}

describe('provider auth policy (legacy invariants)', () => {
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

describe('usesBedrockAwsCredentials (#425 single predicate)', () => {
  it('holds only for bedrock providers outside api-key mode', () => {
    expect(usesBedrockAwsCredentials('bedrock-anthropic', 'sso')).toBe(true);
    expect(usesBedrockAwsCredentials('bedrock-openai', 'iam')).toBe(true);
    expect(usesBedrockAwsCredentials('bedrock-anthropic', 'api-key')).toBe(false);
    expect(usesBedrockAwsCredentials('bedrock-anthropic', undefined)).toBe(false);
    expect(usesBedrockAwsCredentials('openai', 'sso')).toBe(false);
    expect(usesBedrockAwsCredentials('ollama', undefined)).toBe(false);
  });
});

describe('isProviderConfigured — bedrock auth modes (#425)', () => {
  it('api-key mode (default) keeps legacy behavior: blank key = unconfigured', () => {
    expect(isProviderConfigured(base({ bedrockAuthMethod: 'api-key', hasBedrockCredential: false }))).toBe(false);
  });

  it('sso mode with a signed-in token counts as configured', () => {
    expect(isProviderConfigured(base({ bedrockAuthMethod: 'sso', hasBedrockCredential: true }))).toBe(true);
  });

  it('sso mode WITHOUT a token is unconfigured', () => {
    expect(isProviderConfigured(base({ bedrockAuthMethod: 'sso', hasBedrockCredential: false }))).toBe(false);
  });

  it('iam mode with saved keys counts as configured', () => {
    expect(isProviderConfigured(base({
      provider: 'bedrock-openai',
      bedrockAuthMethod: 'iam',
      hasBedrockCredential: true,
    }))).toBe(true);
  });

  it('a blank model still blocks every mode', () => {
    expect(isProviderConfigured(base({ model: '', bedrockAuthMethod: 'sso', hasBedrockCredential: true }))).toBe(false);
  });
});
