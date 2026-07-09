// v1.23.0 P1-7: Provider-agnostic factory that maps settings.provider
// to the appropriate AI-SDK-backed client.
//
// Replaces the hand-rolled factory in main.ts that constructed
// OpenAICompatibleClient / AnthropicClient / AnthropicCompatibleClient
// based on `settings.provider`.
//
// Decision tree (matches PREDEFINED_PROVIDERS in types.ts):
//   - 'anthropic'              → AnthropicSdkClient  (api.anthropic.com)
//   - 'anthropic-compatible'   → AnthropicSdkClient with custom baseURL
//   - 'openai'                 → OpenAISdkClient (official)
//   - everything else          → OpenAICompatSdkClient (8 OpenAI-compatible baseURLs)
//
// B1 strategy: the three SDK modules are loaded via dynamic import.
// `createLLMClientFromSettings` is async; `createLLMClientFromSettingsSync`
// is a sync shim that uses pre-loaded modules (loaded eagerly by
// `preloadLLMClientModules` on plugin startup). This keeps the call
// sites in main.ts / wiki-engine.ts / query-engine.ts unchanged
// (they all expect a sync `LLMClient` instance).

import { Platform } from 'obsidian';
import { LLMClient } from '../types';

export interface ProviderSettings {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  region?: string;
  /**
   * v1.24.0: Amazon Bedrock auth mode. 'bearer' (default) uses the
   * apiKey field; 'profile' resolves credentials via AWS SDK's
   * fromNodeProviderChain (~/.aws + SSO cache). Desktop-only.
   */
  bedrockAuthMode?: 'bearer' | 'profile';
  awsProfile?: string;
  useOfficialOpenAI?: boolean;
}

/**
 * Async factory used by callers that can await (Test Connection,
 * settings change handlers, ingestion init).
 */
export async function createLLMClientFromSettings(settings: ProviderSettings): Promise<LLMClient> {
  const { OpenAISdkClient } = await import('./openai-sdk-client');
  const { AnthropicSdkClient } = await import('./anthropic-sdk-client');
  const { OpenAICompatSdkClient } = await import('./openai-compat-sdk-client');
  const { BedrockSdkClient } = await import('./bedrock-sdk-client');

  const provider = settings.provider;
  const apiKey = settings.apiKey.trim();
  const baseUrl = settings.baseUrl?.trim() || undefined;

  if (provider === 'anthropic') {
    return new AnthropicSdkClient({ apiKey });
  }

  if (provider === 'anthropic-compatible') {
    return new AnthropicSdkClient({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
  }

  if (provider === 'bedrock') {
    if (settings.bedrockAuthMode === 'profile') {
      if (Platform.isMobile) {
        throw new Error(
          'Bedrock AWS Profile / SSO mode requires Obsidian desktop (mobile has no ~/.aws filesystem). Switch to Bearer API key mode in Settings.'
        );
      }
      const { fromNodeProviderChain } = await import('@aws-sdk/credential-providers');
      const credentialProvider = fromNodeProviderChain(
        settings.awsProfile ? { profile: settings.awsProfile } : {}
      );
      return new BedrockSdkClient({
        credentialProvider,
        ...(settings.region ? { region: settings.region } : {}),
      });
    }
    return new BedrockSdkClient({
      apiKey,
      ...(settings.region ? { region: settings.region } : {}),
    });
  }

  if (provider === 'openai' || settings.useOfficialOpenAI) {
    return new OpenAISdkClient({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
  }

  return new OpenAICompatSdkClient({
    apiKey,
    baseURL: baseUrl ?? 'http://localhost:11434/v1',
    provider,
  });
}

/**
 * Synchronous factory for callers that can't await (legacy main.ts
 * `createLLMClient`, page-factory, source-analyzer). Requires the
 * three SDK modules to be pre-loaded via `preloadLLMClientModules()`
 * at plugin startup, otherwise throws.
 */
export interface PreloadedSdkModules {
  OpenAISdkClient: typeof import('./openai-sdk-client').OpenAISdkClient;
  AnthropicSdkClient: typeof import('./anthropic-sdk-client').AnthropicSdkClient;
  OpenAICompatSdkClient: typeof import('./openai-compat-sdk-client').OpenAICompatSdkClient;
  BedrockSdkClient: typeof import('./bedrock-sdk-client').BedrockSdkClient;
  /**
   * v1.24.0: fromNodeProviderChain from @aws-sdk/credential-providers.
   * Present only on desktop — mobile does not preload this module
   * (see preloadLLMClientModules). Used by the sync factory when
   * settings.bedrockAuthMode === 'profile'.
   */
  fromNodeProviderChain?: typeof import('@aws-sdk/credential-providers').fromNodeProviderChain;
}

let preloadedModules: PreloadedSdkModules | null = null;

/**
 * Eagerly load all SDK modules. Called once during plugin `onload()`
 * so subsequent sync `createLLMClientFromSettingsSync` calls don't
 * need to await dynamic imports (which would block the sync API
 * contract). @aws-sdk/credential-providers is only preloaded on
 * desktop (mobile has no ~/.aws filesystem and Node builtins).
 */
export async function preloadLLMClientModules(): Promise<void> {
  const [openai, anthropic, compat, bedrock] = await Promise.all([
    import('./openai-sdk-client'),
    import('./anthropic-sdk-client'),
    import('./openai-compat-sdk-client'),
    import('./bedrock-sdk-client'),
  ]);
  const modules: PreloadedSdkModules = {
    OpenAISdkClient: openai.OpenAISdkClient,
    AnthropicSdkClient: anthropic.AnthropicSdkClient,
    OpenAICompatSdkClient: compat.OpenAICompatSdkClient,
    BedrockSdkClient: bedrock.BedrockSdkClient,
  };
  if (!Platform.isMobile) {
    const credProviders = await import('@aws-sdk/credential-providers');
    modules.fromNodeProviderChain = credProviders.fromNodeProviderChain;
  }
  preloadedModules = modules;
}

/**
 * Sync factory used by main.ts and legacy call sites. Requires
 * `preloadLLMClientModules()` to have been awaited at plugin startup.
 * If not preloaded, throws — this signals a bug in the plugin init
 * order, not a runtime config issue.
 */
export function createLLMClientFromSettingsSync(settings: ProviderSettings): LLMClient {
  if (!preloadedModules) {
    throw new Error(
      '[v1.23.0 LLM migration] SDK modules not preloaded. ' +
      'Call `await preloadLLMClientModules()` during plugin onload() before any LLM call.'
    );
  }
  const { OpenAISdkClient, AnthropicSdkClient, OpenAICompatSdkClient, BedrockSdkClient, fromNodeProviderChain } = preloadedModules;

  const provider = settings.provider;
  const apiKey = settings.apiKey.trim();
  const baseUrl = settings.baseUrl?.trim() || undefined;

  if (provider === 'anthropic') {
    return new AnthropicSdkClient({ apiKey });
  }

  if (provider === 'anthropic-compatible') {
    return new AnthropicSdkClient({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
  }

  if (provider === 'bedrock') {
    if (settings.bedrockAuthMode === 'profile') {
      if (Platform.isMobile) {
        throw new Error(
          'Bedrock AWS Profile / SSO mode requires Obsidian desktop (mobile has no ~/.aws filesystem). Switch to Bearer API key mode in Settings.'
        );
      }
      if (!fromNodeProviderChain) {
        throw new Error(
          '[v1.24.0 Bedrock SSO] @aws-sdk/credential-providers was not preloaded. Ensure preloadLLMClientModules() ran during plugin onload().'
        );
      }
      const credentialProvider = fromNodeProviderChain(
        settings.awsProfile ? { profile: settings.awsProfile } : {}
      );
      return new BedrockSdkClient({
        credentialProvider,
        ...(settings.region ? { region: settings.region } : {}),
      });
    }
    return new BedrockSdkClient({
      apiKey,
      ...(settings.region ? { region: settings.region } : {}),
    });
  }

  if (provider === 'openai' || settings.useOfficialOpenAI) {
    return new OpenAISdkClient({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
  }

  return new OpenAICompatSdkClient({
    apiKey,
    baseURL: baseUrl ?? 'http://localhost:11434/v1',
    provider,
  });
}

/**
 * Test helper: reset preloaded module cache (used by unit tests that
 * want to exercise the lazy-path).
 */
export function _resetPreloadedModulesForTests(): void {
  preloadedModules = null;
}