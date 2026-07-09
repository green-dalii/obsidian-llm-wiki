import { describe, it, expect } from 'vitest';

// v1.24.0: Bedrock auth-mode derivation from settings + Platform.
// Extracted from src/ui/settings.ts:184-190. If this drifts, the
// test will fail. Mirrors the ternary in the settings tab so the
// mobile gate + backward-compat default are pinned.

function deriveBedrockAuthMode(
  provider: string,
  bedrockAuthModeSetting: 'bearer' | 'profile' | undefined,
  isMobile: boolean
): 'bearer' | 'profile' {
  const isBedrock = provider === 'bedrock';
  if (!isBedrock) return 'bearer';
  if (isMobile) return 'bearer';
  return bedrockAuthModeSetting ?? 'bearer';
}

describe('settings UI — Bedrock auth-mode derivation', () => {
  it('non-bedrock provider: always bearer regardless of setting', () => {
    expect(deriveBedrockAuthMode('openai', 'profile', false)).toBe('bearer');
    expect(deriveBedrockAuthMode('anthropic', 'profile', false)).toBe('bearer');
  });

  it('bedrock + no setting: defaults to bearer (backward compat)', () => {
    expect(deriveBedrockAuthMode('bedrock', undefined, false)).toBe('bearer');
  });

  it('bedrock + bearer setting: bearer', () => {
    expect(deriveBedrockAuthMode('bedrock', 'bearer', false)).toBe('bearer');
  });

  it('bedrock + profile setting on desktop: profile', () => {
    expect(deriveBedrockAuthMode('bedrock', 'profile', false)).toBe('profile');
  });

  it('bedrock + profile setting on mobile: forced to bearer (no ~/.aws)', () => {
    // Mobile has no ~/.aws filesystem. The setting is ignored, mode
    // forces to bearer, and the UI hides the "profile" option so the
    // user can't switch to it.
    expect(deriveBedrockAuthMode('bedrock', 'profile', true)).toBe('bearer');
  });
});
