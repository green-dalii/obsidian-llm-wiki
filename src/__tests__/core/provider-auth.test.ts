// provider-auth Bedrock auth-mode gate tests (#425).
//
// isProviderConfigured must treat an AWS credential (SSO token or IAM
// keys) as satisfying the configuration requirement for bedrock-*
// providers running in sso/iam mode — otherwise initializeLLMClient
// nulls the client despite valid credentials and the feature is dead
// on arrival. api-key mode keeps the exact legacy semantics.

import { describe, expect, it } from 'vitest';
import { isProviderConfigured, type ProviderCredentialState } from '../../core/provider-auth';

function base(overrides: Partial<ProviderCredentialState>): ProviderCredentialState {
  return { provider: 'bedrock-anthropic', apiKey: '', model: 'anthropic.claude-x', hasCodexCredential: false, ...overrides };
}

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
