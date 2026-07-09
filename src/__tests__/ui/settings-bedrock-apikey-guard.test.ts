import { describe, it, expect } from 'vitest';
import { requiresApiKey } from '../../llm-sdk/provider-guards';

// v1.24.0: bedrock+profile exemption for the apiKey-required guards.
// Tests import the SAME `requiresApiKey` used in production
// (main.ts:loadSettings, main.ts:initializeLLMClient,
// main.ts:testLLMConnection, schema/auto-maintain.ts:probeLlm) so
// drift is impossible.

describe('provider-guards.requiresApiKey', () => {
  it('openai / anthropic / bedrock-bearer: require apiKey', () => {
    expect(requiresApiKey({ provider: 'openai' })).toBe(true);
    expect(requiresApiKey({ provider: 'anthropic' })).toBe(true);
    expect(requiresApiKey({ provider: 'bedrock', bedrockAuthMode: 'bearer' })).toBe(true);
    // Default (undefined) bedrockAuthMode is backward-compat bearer.
    expect(requiresApiKey({ provider: 'bedrock' })).toBe(true);
  });

  it('ollama / lmstudio: never require apiKey', () => {
    expect(requiresApiKey({ provider: 'ollama' })).toBe(false);
    expect(requiresApiKey({ provider: 'lmstudio' })).toBe(false);
  });

  it('bedrock + profile mode: does NOT require apiKey (credentials come from ~/.aws)', () => {
    expect(requiresApiKey({ provider: 'bedrock', bedrockAuthMode: 'profile' })).toBe(false);
  });

  it('bedrockAuthMode="profile" on a non-bedrock provider is ignored', () => {
    // Defensive: a stale bedrockAuthMode setting must not exempt other
    // providers from the apiKey requirement.
    expect(requiresApiKey({ provider: 'openai', bedrockAuthMode: 'profile' })).toBe(true);
  });
});
