import { describe, it, expect } from 'vitest';

// v1.24.0: bedrock+profile exemption for the apiKey-required guards.
// Mirrors the derivation used in:
//   - src/main.ts:initializeLLMClient()
//   - src/main.ts:testLLMConnection()
//   - src/schema/auto-maintain.ts:probeLlm()
//
// The three call-sites all answer the same question: "given the current
// settings, does the plugin need a non-empty apiKey to proceed?".
// Bedrock in 'profile' mode resolves credentials from ~/.aws via
// fromNodeProviderChain, so the answer is "no" — the same as the
// existing 'ollama' / 'lmstudio' local-no-key providers.

function needsApiKey(
  provider: string,
  bedrockAuthMode: 'bearer' | 'profile' | undefined
): boolean {
  const isLocalNoKeyProvider = provider === 'ollama' || provider === 'lmstudio';
  const isBedrockProfile = provider === 'bedrock' && bedrockAuthMode === 'profile';
  return !isLocalNoKeyProvider && !isBedrockProfile;
}

describe('settings pre-flight — apiKey requirement derivation', () => {
  it('openai / anthropic / bedrock-bearer: require apiKey', () => {
    expect(needsApiKey('openai', undefined)).toBe(true);
    expect(needsApiKey('anthropic', undefined)).toBe(true);
    expect(needsApiKey('bedrock', 'bearer')).toBe(true);
    // Default (undefined) bedrockAuthMode is backward-compat bearer.
    expect(needsApiKey('bedrock', undefined)).toBe(true);
  });

  it('ollama / lmstudio: never require apiKey', () => {
    expect(needsApiKey('ollama', undefined)).toBe(false);
    expect(needsApiKey('lmstudio', undefined)).toBe(false);
  });

  it('bedrock + profile mode: does NOT require apiKey (credentials come from ~/.aws)', () => {
    expect(needsApiKey('bedrock', 'profile')).toBe(false);
  });

  it('bedrockAuthMode="profile" on a non-bedrock provider is ignored', () => {
    // Defensive: a stale bedrockAuthMode setting must not exempt other
    // providers from the apiKey requirement.
    expect(needsApiKey('openai', 'profile')).toBe(true);
  });
});
