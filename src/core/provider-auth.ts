import { isLocalNoKeyProvider } from './local-no-key-provider';

export const OPENAI_CODEX_PROVIDER_ID = 'openai-codex';

export interface ProviderCredentialState {
  provider: string;
  apiKey: string;
  model: string;
  hasCodexCredential: boolean;
  /**
   * #425 Bedrock Stage 2 — auth mode of the active bedrock-* provider.
   * Absent for every other provider (and for api-key mode).
   */
  bedrockAuthMethod?: 'api-key' | 'sso' | 'iam';
  /** #425 — true when an SSO token or IAM keys are actually present. */
  hasBedrockCredential?: boolean;
}

export function providerRequiresApiKey(provider: string): boolean {
  return provider !== OPENAI_CODEX_PROVIDER_ID && !isLocalNoKeyProvider(provider);
}

export function providerSupportsOAuth(provider: string): boolean {
  return provider === OPENAI_CODEX_PROVIDER_ID;
}

export function isProviderConfigured(input: ProviderCredentialState): boolean {
  if (!input.model.trim()) return false;
  if (input.provider === OPENAI_CODEX_PROVIDER_ID) return input.hasCodexCredential;
  // #425: in sso/iam modes AWS credentials replace the bearer key —
  // presence of the credential, not a key string, decides readiness.
  if ((input.bedrockAuthMethod === 'sso' || input.bedrockAuthMethod === 'iam') && input.provider.startsWith('bedrock-')) {
    return input.hasBedrockCredential === true;
  }
  if (!providerRequiresApiKey(input.provider)) return true;
  return input.apiKey.trim().length > 0;
}
