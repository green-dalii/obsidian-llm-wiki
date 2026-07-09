import { describe, it, expect } from 'vitest';
import { deriveBedrockAuthMode } from '../../llm-sdk/provider-guards';

// v1.24.0: Bedrock auth-mode derivation from settings + Platform.
// Tests import the SAME `deriveBedrockAuthMode` used in production
// (src/ui/settings.ts) so drift is impossible.

describe('provider-guards.deriveBedrockAuthMode', () => {
  it('non-bedrock provider: always bearer regardless of setting', () => {
    expect(deriveBedrockAuthMode({ provider: 'openai', bedrockAuthMode: 'profile' }, false)).toBe('bearer');
    expect(deriveBedrockAuthMode({ provider: 'anthropic', bedrockAuthMode: 'profile' }, false)).toBe('bearer');
  });

  it('bedrock + no setting: defaults to bearer (backward compat)', () => {
    expect(deriveBedrockAuthMode({ provider: 'bedrock' }, false)).toBe('bearer');
  });

  it('bedrock + bearer setting: bearer', () => {
    expect(deriveBedrockAuthMode({ provider: 'bedrock', bedrockAuthMode: 'bearer' }, false)).toBe('bearer');
  });

  it('bedrock + profile setting on desktop: profile', () => {
    expect(deriveBedrockAuthMode({ provider: 'bedrock', bedrockAuthMode: 'profile' }, false)).toBe('profile');
  });

  it('bedrock + profile setting on mobile: forced to bearer (no ~/.aws)', () => {
    // Mobile has no ~/.aws filesystem. The setting is ignored, mode
    // forces to bearer, and the UI hides the "profile" option so the
    // user can't switch to it.
    expect(deriveBedrockAuthMode({ provider: 'bedrock', bedrockAuthMode: 'profile' }, true)).toBe('bearer');
  });
});
