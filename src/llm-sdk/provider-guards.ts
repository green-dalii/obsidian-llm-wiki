// v1.24.0: Shared derivation helpers for provider auth-mode decisions.
//
// Previously these predicates were duplicated inline across main.ts,
// auto-maintain.ts, settings.ts, and their tests — the tests
// re-implemented the same logic and would keep passing even when
// production drifted. Centralized here so all consumers (prod + test)
// import the same function.

/**
 * Default AWS region for the Amazon Bedrock provider when the user
 * hasn't picked one. Used at BedrockSdkClient construction time and
 * in the settings tab's write-through default. Kept in sync with
 * BEDROCK_REGIONS[0] in types.ts.
 */
export const BEDROCK_DEFAULT_REGION = 'us-east-1';

/**
 * Minimal shape needed by the guards below — a slice of LLMWikiSettings.
 * Kept structural so tests don't need to construct a full settings object.
 */
export interface ProviderGuardSettings {
  provider?: string;
  apiKey?: string;
  bedrockAuthMode?: 'bearer' | 'profile';
}

/**
 * True when the provider is Amazon Bedrock in AWS Profile / SSO mode.
 * In this mode credentials come from ~/.aws (or the AWS credential
 * chain) — no apiKey field is required.
 */
export function isBedrockProfileMode(settings: ProviderGuardSettings): boolean {
  return settings.provider === 'bedrock' && settings.bedrockAuthMode === 'profile';
}

/**
 * True when the provider does NOT require an apiKey at all.
 * Covers: Ollama (localhost, no auth), LMStudio (localhost, api key
 * optional but plugin treats as no-key path), and Bedrock in profile
 * mode (credentials come from AWS SDK chain).
 */
export function isLocalNoKeyProvider(settings: ProviderGuardSettings): boolean {
  return settings.provider === 'ollama' || settings.provider === 'lmstudio';
}

/**
 * True when the current settings need a non-empty apiKey to function.
 * Used by pre-flight guards in main.ts.initializeLLMClient,
 * main.ts.testLLMConnection, main.ts.loadSettings migration path,
 * schema/auto-maintain.ts.probeLlm, and the settings-tab UI to
 * decide whether to render the API Key input.
 */
export function requiresApiKey(settings: ProviderGuardSettings): boolean {
  if (isLocalNoKeyProvider(settings)) return false;
  if (isBedrockProfileMode(settings)) return false;
  return true;
}

/**
 * Derive the effective Bedrock auth mode used at runtime, applying
 * the mobile gate. On mobile devices ~/.aws is unavailable, so
 * profile mode is forced to bearer regardless of the persisted
 * setting. Non-bedrock providers always resolve to 'bearer' (the
 * value is meaningless but simplifies the call sites).
 */
export function deriveBedrockAuthMode(
  settings: ProviderGuardSettings,
  isMobile: boolean
): 'bearer' | 'profile' {
  if (settings.provider !== 'bedrock') return 'bearer';
  if (isMobile) return 'bearer';
  return settings.bedrockAuthMode ?? 'bearer';
}
