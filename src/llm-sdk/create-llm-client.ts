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

import { LLMClient } from '../types';
import type { CodexAuthManager } from './openai-codex/auth-manager';
import {
  bedrockMantleChatCompletionsUrl,
  bedrockMantleMessagesUrl,
  BEDROCK_DEFAULT_REGION,
  type BedrockRegion,
} from '../constants';

export interface ProviderSettings {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  /**
   * v1.24.1 PATCH Bedrock Stage 1 — AWS region used by the two
   * `bedrock-*` provider ids. Ignored when provider is anything else.
   * Falls back to BEDROCK_DEFAULT_REGION (us-east-1) when unset.
   */
  bedrockRegion?: string;
  useOfficialOpenAI?: boolean;
  codexAuth?: CodexAuthManager;
  codexVersion?: string;
  codexQuotaMessage?: string;
}

/**
 * v1.24.1 PATCH Bedrock Stage 1 — resolve the AWS region from settings,
 * narrowing `string | undefined` to the typed `BedrockRegion` union.
 * Settings UI dropdown only emits `BEDROCK_REGIONS` values, so runtime
 * is sound; the cast is here for TS-only safety.
 */
function resolveBedrockRegion(settings: ProviderSettings): BedrockRegion {
  return (settings.bedrockRegion as BedrockRegion | undefined) || BEDROCK_DEFAULT_REGION;
}

/**
 * v1.24.1 PATCH Bedrock Stage 1 — construct a Bedrock-backed LLM client
 * for either the Anthropic Messages protocol or the OpenAI Chat
 * Completions protocol. Both reuse existing SDK clients via the
 * region-scoped bedrock-mantle baseURL; bearer auth is wired by the
 * underlying SDK.
 *
 * The class constructors are injected (rather than dynamic-imported)
 * so the same helper works for both the async factory (which does
 * dynamic imports inside) and the sync factory (which reads from
 * preloadedModules). Either way, the resolved client is identical.
 */
function createBedrockClient(
  providers: {
    AnthropicSdkClient: typeof import('./anthropic-sdk-client').AnthropicSdkClient;
    OpenAICompatSdkClient: typeof import('./openai-compat-sdk-client').OpenAICompatSdkClient;
  },
  settings: ProviderSettings,
  apiKey: string,
  protocol: 'anthropic' | 'openai',
): LLMClient {
  const region = resolveBedrockRegion(settings);
  if (protocol === 'anthropic') {
    return new providers.AnthropicSdkClient({
      apiKey,
      baseURL: bedrockMantleMessagesUrl(region),
    });
  }
  return new providers.OpenAICompatSdkClient({
    apiKey,
    baseURL: bedrockMantleChatCompletionsUrl(region),
    provider: settings.provider,
  });
}

/**
 * Async factory used by callers that can await (Test Connection,
 * settings change handlers, ingestion init).
 */
export async function createLLMClientFromSettings(settings: ProviderSettings): Promise<LLMClient> {
  const { OpenAISdkClient } = await import('./openai-sdk-client');
  const { AnthropicSdkClient } = await import('./anthropic-sdk-client');
  const { OpenAICompatSdkClient } = await import('./openai-compat-sdk-client');
  const { OpenAICodexSdkClient } = await import('./openai-codex-sdk-client');

  const provider = settings.provider;
  const apiKey = settings.apiKey.trim();
  const baseUrl = settings.baseUrl?.trim() || undefined;

  if (provider === 'openai-codex') {
    if (!settings.codexAuth) throw new Error('Codex auth manager is required');
    return new OpenAICodexSdkClient({ auth: settings.codexAuth, sessionId: () => crypto.randomUUID(), version: settings.codexVersion ?? 'unknown', quotaMessage: settings.codexQuotaMessage });
  }
  // v1.24.1 PATCH Bedrock Stage 1 — region-scoped bedrock-mantle endpoint,
  // reusing existing SDK clients via custom baseURL.
  if (provider === 'bedrock-anthropic') {
    return createBedrockClient(
      { AnthropicSdkClient, OpenAICompatSdkClient },
      settings,
      apiKey,
      'anthropic',
    );
  }

  if (provider === 'bedrock-openai') {
    return createBedrockClient(
      { AnthropicSdkClient, OpenAICompatSdkClient },
      settings,
      apiKey,
      'openai',
    );
  }

  if (provider === 'anthropic') {
    return new AnthropicSdkClient({ apiKey });
  }

  if (provider === 'anthropic-compatible') {
    return new AnthropicSdkClient({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
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
  OpenAICodexSdkClient: typeof import('./openai-codex-sdk-client').OpenAICodexSdkClient;
}

let preloadedModules: PreloadedSdkModules | null = null;

/**
 * Eagerly load all three SDK modules. Called once during plugin
 * `onload()` so subsequent sync `createLLMClientFromSettingsSync`
 * calls don't need to await dynamic imports (which would block the
 * sync API contract).
 */
export async function preloadLLMClientModules(): Promise<void> {
  const [openai, anthropic, compat, codex] = await Promise.all([
    import('./openai-sdk-client'),
    import('./anthropic-sdk-client'),
    import('./openai-compat-sdk-client'),
    import('./openai-codex-sdk-client'),
  ]);
  preloadedModules = {
    OpenAISdkClient: openai.OpenAISdkClient,
    AnthropicSdkClient: anthropic.AnthropicSdkClient,
    OpenAICompatSdkClient: compat.OpenAICompatSdkClient,
    OpenAICodexSdkClient: codex.OpenAICodexSdkClient,
  };
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
  const { OpenAISdkClient, AnthropicSdkClient, OpenAICompatSdkClient, OpenAICodexSdkClient } = preloadedModules;

  const provider = settings.provider;
  const apiKey = settings.apiKey.trim();
  const baseUrl = settings.baseUrl?.trim() || undefined;

  if (provider === 'openai-codex') {
    if (!settings.codexAuth) throw new Error('Codex auth manager is required');
    return new OpenAICodexSdkClient({ auth: settings.codexAuth, sessionId: () => crypto.randomUUID(), version: settings.codexVersion ?? 'unknown', quotaMessage: settings.codexQuotaMessage });
  }
  // v1.24.1 PATCH Bedrock Stage 1 — region-scoped bedrock-mantle endpoint,
  // reusing existing SDK clients via custom baseURL.
  if (provider === 'bedrock-anthropic') {
    return createBedrockClient(
      { AnthropicSdkClient, OpenAICompatSdkClient },
      settings,
      apiKey,
      'anthropic',
    );
  }

  if (provider === 'bedrock-openai') {
    return createBedrockClient(
      { AnthropicSdkClient, OpenAICompatSdkClient },
      settings,
      apiKey,
      'openai',
    );
  }

  if (provider === 'anthropic') {
    return new AnthropicSdkClient({ apiKey });
  }

  if (provider === 'anthropic-compatible') {
    return new AnthropicSdkClient({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
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
