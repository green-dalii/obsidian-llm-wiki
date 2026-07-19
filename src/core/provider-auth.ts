import { isLocalNoKeyProvider } from './local-no-key-provider';

export const OPENAI_CODEX_PROVIDER_ID = 'openai-codex';

export interface ProviderCredentialState {
  provider: string;
  apiKey: string;
  model: string;
  hasCodexCredential: boolean;
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
  if (!providerRequiresApiKey(input.provider)) return true;
  return input.apiKey.trim().length > 0;
}
