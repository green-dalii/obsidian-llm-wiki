// v1.23.0 P1-7: Unit tests for the new createLLMClientFromSettings factory.
//
// Verifies the provider-id → client-class dispatch matches the legacy
// behavior in main.ts. Uses the async factory (which dynamically imports
// the SDK modules) — the sync factory is exercised by integration tests
// after `preloadLLMClientModules()` runs.

import { describe, it, expect, vi } from 'vitest';
import { createLLMClientFromSettings } from '../../llm-sdk/create-llm-client';
import { OpenAISdkClient } from '../../llm-sdk/openai-sdk-client';
import { AnthropicSdkClient } from '../../llm-sdk/anthropic-sdk-client';
import { OpenAICompatSdkClient } from '../../llm-sdk/openai-compat-sdk-client';
import { BedrockSdkClient } from '../../llm-sdk/bedrock-sdk-client';

// Spy on fromNodeProviderChain so we can assert exactly what args
// the factory passes when profile mode is active. Uses vi.mock which
// hoists — importActual is used so the real function still executes.
vi.mock('@aws-sdk/credential-providers', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/credential-providers')>('@aws-sdk/credential-providers');
  return {
    ...actual,
    fromNodeProviderChain: vi.fn(actual.fromNodeProviderChain),
  };
});

async function importFromNodeProviderChainMock() {
  const mod = await import('@aws-sdk/credential-providers');
  return vi.mocked(mod.fromNodeProviderChain);
}

describe('createLLMClientFromSettings (async)', () => {
  describe('official providers', () => {
    it('returns AnthropicSdkClient for provider="anthropic"', async () => {
      const c = await createLLMClientFromSettings({ provider: 'anthropic', apiKey: 'sk-ant' });
      expect(c).toBeInstanceOf(AnthropicSdkClient);
    });

    it('returns OpenAISdkClient for provider="openai"', async () => {
      const c = await createLLMClientFromSettings({ provider: 'openai', apiKey: 'sk-test' });
      expect(c).toBeInstanceOf(OpenAISdkClient);
    });
  });

  describe('Anthropic-compatible (Coding Plan / z.ai / GLM-Anthropic)', () => {
    it('returns AnthropicSdkClient with baseURL for provider="anthropic-compatible"', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'anthropic-compatible',
        apiKey: 'sk-test',
        baseUrl: 'https://api.z.ai/v1',
      });
      expect(c).toBeInstanceOf(AnthropicSdkClient);
    });

    it('falls back to AnthropicSdkClient (default baseURL) when anthropic-compatible has no baseUrl', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'anthropic-compatible',
        apiKey: 'sk-test',
      });
      expect(c).toBeInstanceOf(AnthropicSdkClient);
    });
  });

  describe('Amazon Bedrock', () => {
    it('returns BedrockSdkClient for provider="bedrock"', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'bedrock',
        apiKey: 'bedrock-test-key',
      });
      expect(c).toBeInstanceOf(BedrockSdkClient);
    });

    it('returns BedrockSdkClient with region for provider="bedrock"', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'bedrock',
        apiKey: 'bedrock-test-key',
        region: 'eu-central-1',
      });
      expect(c).toBeInstanceOf(BedrockSdkClient);
      // Verify region actually propagates — an instanceof-only assertion
      // would pass even if the factory dropped the region spread.
      expect((c as unknown as { region: string }).region).toBe('eu-central-1');
    });

    it('defaults region to us-east-1 when omitted from settings', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'bedrock',
        apiKey: 'bedrock-test-key',
      });
      expect((c as unknown as { region: string }).region).toBe('us-east-1');
    });

    it('bearer mode: constructs client with apiKey, no credentialProvider', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'bedrock',
        apiKey: 'bedrock-test-key',
        bedrockAuthMode: 'bearer',
      });
      expect(c).toBeInstanceOf(BedrockSdkClient);
      const client = c as unknown as {
        apiKey: string | undefined;
        credentialProvider: unknown;
      };
      expect(client.apiKey).toBe('bedrock-test-key');
      expect(client.credentialProvider).toBeUndefined();
    });

    it('profile mode: constructs client with credentialProvider, no apiKey', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'bedrock',
        apiKey: '',
        bedrockAuthMode: 'profile',
        awsProfile: 'dev-sso',
        region: 'us-west-2',
      });
      expect(c).toBeInstanceOf(BedrockSdkClient);
      const client = c as unknown as {
        apiKey: string | undefined;
        credentialProvider: (() => Promise<unknown>) | undefined;
      };
      expect(client.apiKey).toBeUndefined();
      expect(typeof client.credentialProvider).toBe('function');
    });

    it('profile mode without awsProfile: uses default profile chain', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'bedrock',
        apiKey: '',
        bedrockAuthMode: 'profile',
      });
      expect(c).toBeInstanceOf(BedrockSdkClient);
      const client = c as unknown as {
        credentialProvider: (() => Promise<unknown>) | undefined;
      };
      expect(typeof client.credentialProvider).toBe('function');
    });

    it('profile mode on mobile: throws desktop-only error', async () => {
      const obsidianMock = await import('obsidian') as { Platform: { isMobile: boolean } };
      const wasMobile = obsidianMock.Platform.isMobile;
      obsidianMock.Platform.isMobile = true;
      try {
        await expect(
          createLLMClientFromSettings({
            provider: 'bedrock',
            apiKey: '',
            bedrockAuthMode: 'profile',
          })
        ).rejects.toThrow(/desktop/i);
      } finally {
        obsidianMock.Platform.isMobile = wasMobile;
      }
    });
  });

  describe('OpenAI-compatible backends (8 PREDEFINED_PROVIDERS + custom)', () => {
    it.each([
      ['gemini', 'https://generativelanguage.googleapis.com/v1beta/openai'],
      ['openrouter', 'https://openrouter.ai/api/v1'],
      ['deepseek', 'https://api.deepseek.com/v1'],
      ['minimax', 'https://api.minimaxi.com/v1'],
      ['moonshot', 'https://api.moonshot.cn/v1'],
      ['glm', 'https://open.bigmodel.cn/api/paas/v4'],
      ['ollama', 'http://localhost:11434/v1'],
      ['lmstudio', 'http://localhost:1234/v1'],
    ])('returns OpenAICompatSdkClient for provider=%s', async (provider, baseURL) => {
      const c = await createLLMClientFromSettings({
        provider,
        apiKey: 'test-key',
        baseUrl: baseURL,
      });
      expect(c).toBeInstanceOf(OpenAICompatSdkClient);
    });

    it('returns OpenAICompatSdkClient for unknown provider with custom baseUrl', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'custom-provider',
        apiKey: 'test-key',
        baseUrl: 'https://my-custom.example.com/v1',
      });
      expect(c).toBeInstanceOf(OpenAICompatSdkClient);
    });
  });

  describe('useOfficialOpenAI override', () => {
    it('returns OpenAISdkClient regardless of provider id when useOfficialOpenAI=true', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'deepseek',
        apiKey: 'sk-test',
        baseUrl: 'https://api.deepseek.com/v1',
        useOfficialOpenAI: true,
      });
      expect(c).toBeInstanceOf(OpenAISdkClient);
    });
  });

  describe('input handling', () => {
    it('trims apiKey whitespace', async () => {
      const c = await createLLMClientFromSettings({ provider: 'anthropic', apiKey: '  sk-ant  ' });
      expect(c).toBeInstanceOf(AnthropicSdkClient);
    });

    it('treats empty baseUrl as undefined', async () => {
      const c = await createLLMClientFromSettings({
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: '   ',
      });
      expect(c).toBeInstanceOf(OpenAISdkClient);
    });
  });
});

describe('createLLMClientFromSettingsSync (preloaded)', () => {
  // The sync factory requires preloadLLMClientModules() to have run.
  // Since we already invoked the async factory in the tests above, the
  // modules are already in the module cache (Node.js caches them).
  // The sync shim's internal preloadedModules variable, however, is
  // separate. We test it by explicitly calling preloadLLMClientModules.
  it('throws when modules not preloaded', async () => {
    const { createLLMClientFromSettingsSync, _resetPreloadedModulesForTests } = await import(
      '../../llm-sdk/create-llm-client'
    );
    _resetPreloadedModulesForTests();
    expect(() =>
      createLLMClientFromSettingsSync({ provider: 'openai', apiKey: 'sk-test' })
    ).toThrow(/SDK modules not preloaded/);
  });

  it('returns BedrockSdkClient with forwarded region after preload', async () => {
    // Production path: main.ts calls createLLMClientFromSettingsSync
    // after preloadLLMClientModules() has run during plugin onload().
    // A regression that dropped the bedrock branch from the sync
    // factory would only surface at runtime — this test pins the
    // preloaded-modules path.
    const { createLLMClientFromSettingsSync, preloadLLMClientModules } = await import(
      '../../llm-sdk/create-llm-client'
    );
    await preloadLLMClientModules();
    const c = createLLMClientFromSettingsSync({
      provider: 'bedrock',
      apiKey: 'bedrock-test-key',
      region: 'ap-northeast-1',
    });
    expect(c).toBeInstanceOf(BedrockSdkClient);
    expect((c as unknown as { region: string }).region).toBe('ap-northeast-1');
  });

  it('constructs Bedrock profile-mode client via preloaded credential-providers', async () => {
    // Sync-factory production path when user has bedrockAuthMode='profile'.
    // Requires @aws-sdk/credential-providers to be in the preloaded
    // module map alongside the AI-SDK clients.
    const { createLLMClientFromSettingsSync, preloadLLMClientModules } = await import(
      '../../llm-sdk/create-llm-client'
    );
    await preloadLLMClientModules();
    const c = createLLMClientFromSettingsSync({
      provider: 'bedrock',
      apiKey: '',
      bedrockAuthMode: 'profile',
      awsProfile: 'default',
      region: 'us-east-1',
    });
    expect(c).toBeInstanceOf(BedrockSdkClient);
    const client = c as unknown as {
      apiKey: string | undefined;
      credentialProvider: (() => Promise<unknown>) | undefined;
    };
    expect(client.apiKey).toBeUndefined();
    expect(typeof client.credentialProvider).toBe('function');
  });

  it('sync-factory profile mode on mobile: throws desktop-only error', async () => {
    // Regression guard: the sync path (production entry via main.ts)
    // has its own mobile check separate from the async factory's.
    // Both must remain in place.
    const { createLLMClientFromSettingsSync, preloadLLMClientModules } = await import(
      '../../llm-sdk/create-llm-client'
    );
    await preloadLLMClientModules();
    const obsidianMock = await import('obsidian') as { Platform: { isMobile: boolean } };
    const wasMobile = obsidianMock.Platform.isMobile;
    obsidianMock.Platform.isMobile = true;
    try {
      expect(() =>
        createLLMClientFromSettingsSync({
          provider: 'bedrock',
          apiKey: '',
          bedrockAuthMode: 'profile',
        })
      ).toThrow(/desktop/i);
    } finally {
      obsidianMock.Platform.isMobile = wasMobile;
    }
  });
});

describe('createLLMClientFromSettings — fromNodeProviderChain args', () => {
  it('passes {profile: awsProfile} when awsProfile is set', async () => {
    const mock = await importFromNodeProviderChainMock();
    mock.mockClear();
    await createLLMClientFromSettings({
      provider: 'bedrock',
      apiKey: '',
      bedrockAuthMode: 'profile',
      awsProfile: 'dev-sso',
    });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith({ profile: 'dev-sso' });
  });

  it('passes {} when awsProfile is omitted (default profile via chain)', async () => {
    const mock = await importFromNodeProviderChainMock();
    mock.mockClear();
    await createLLMClientFromSettings({
      provider: 'bedrock',
      apiKey: '',
      bedrockAuthMode: 'profile',
    });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith({});
  });

  it('passes {} when awsProfile is whitespace-only (trimmed at boundary)', async () => {
    // Boundary defense: hand-edited data.json with "   " must not
    // resolve as literal-whitespace profile — should fall through to
    // the default-profile chain.
    const mock = await importFromNodeProviderChainMock();
    mock.mockClear();
    await createLLMClientFromSettings({
      provider: 'bedrock',
      apiKey: '',
      bedrockAuthMode: 'profile',
      awsProfile: '   ',
    });
    expect(mock).toHaveBeenCalledWith({});
  });

  it('is NOT called in bearer mode', async () => {
    const mock = await importFromNodeProviderChainMock();
    mock.mockClear();
    await createLLMClientFromSettings({
      provider: 'bedrock',
      apiKey: 'bedrock-key',
      bedrockAuthMode: 'bearer',
    });
    expect(mock).not.toHaveBeenCalled();
  });
});