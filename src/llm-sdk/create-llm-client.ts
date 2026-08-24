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
import { resolveProviderApiKey } from './provider-api-key-resolver';
import type { ProviderSecretStorage } from './provider-secret-store';
import { obsidianFetchBridge, type ObsidianFetchInit } from '../core/obsidian-fetch-bridge';
import { createSigV4SigningFetch } from './bedrock-sso/signing-fetch';
import type { BedrockAuthManager } from './bedrock-sso/credential-manager';

export interface ProviderSettings {
  provider: string;
  apiKey: string;
  /**
   * v1.25.3 #182: stable ID for the provider API key in Obsidian
   * SecretStorage. When the migration has run, the live key lives in
   * SecretStorage under this ID; `apiKey` is the empty-string fallback
   * for tests and un-migrated installs.
   */
  providerApiKeySecretId: string;
  /**
   * v1.25.3 #182: optional SecretStorage surface. When provided, the
   * factory reads the live key from it; when null, falls back to the
   * legacy `apiKey` field.
   */
  secretStorage?: ProviderSecretStorage | null;
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
  /**
   * #425 Bedrock Stage 2 — auth mode for the two `bedrock-*` provider
   * ids. Default `'api-key'` = Stage-1 bearer, unchanged.
   */
  bedrockAuthMethod?: 'api-key' | 'sso' | 'iam';
  /** #425 — target account id for GetRoleCredentials (SSO mode). */
  bedrockSsoAccountId?: string;
  /** #425 — role name to assume (SSO mode). */
  bedrockSsoRoleName?: string;
  /**
   * #425 — plugin-owned credential orchestrator. Required when a
   * `bedrock-*` provider runs in `'sso'` or `'iam'` mode; production
   * hosts pass it next to codexAuth.
   */
  bedrockAuthManager?: BedrockAuthManager;
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
 * region-scoped bedrock-mantle baseURL.
 *
 * #425 Stage 2: when `bedrockAuthMethod` is `'sso'`/`'iam'`, a SigV4
 * signing wrapper replaces bearer auth on BOTH fetch seams (non-stream
 * and streaming); the apiKey argument is then inert (''). The default
 * `'api-key'` mode is byte-for-byte Stage 1.
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
  const authMethod = settings.bedrockAuthMethod ?? 'api-key';
  let signingFetch: ((url: string, init?: ObsidianFetchInit) => Promise<Response>) | undefined;
  if (authMethod !== 'api-key') {
    if (!settings.bedrockAuthManager) {
      throw new Error('Bedrock SSO/IAM auth requires the plugin-managed BedrockAuthManager');
    }
    const manager = settings.bedrockAuthManager;
    signingFetch = createSigV4SigningFetch({
      delegate: obsidianFetchBridge,
      getCredentials: () => manager.getCredentials({
        method: authMethod,
        region,
        accountId: settings.bedrockSsoAccountId,
        roleName: settings.bedrockSsoRoleName,
      }),
    });
  }
  const authOverrides = signingFetch ? { fetch: signingFetch, streamFetch: signingFetch } : {};
  if (protocol === 'anthropic') {
    return new providers.AnthropicSdkClient({
      apiKey,
      baseURL: bedrockMantleMessagesUrl(region),
      ...authOverrides,
    });
  }
  return new providers.OpenAICompatSdkClient({
    apiKey,
    baseURL: bedrockMantleChatCompletionsUrl(region),
    provider: settings.provider,
    ...authOverrides,
  });
}

/**
 * #425 Stage 2 — true when the selected provider+mode signs requests
 * with AWS credentials instead of a bearer API key, so the shared
 * key resolver must be skipped entirely (no SecretStorage lookup of
 * the shared provider slot, no misleading "missing API key" errors).
 */
function usesBedrockAwsCredentials(provider: string, settings: ProviderSettings): boolean {
  return provider.startsWith('bedrock-') && (settings.bedrockAuthMethod ?? 'api-key') !== 'api-key';
}

/**
 * Async factory used by callers that can await (Test Connection,
 * settings change handlers, ingestion init).
 */
export async function createLLMClientFromSettings(
  settings: ProviderSettings,
  pendingApiKey?: string,
): Promise<LLMClient> {
  const { OpenAISdkClient } = await import('./openai-sdk-client');
  const { AnthropicSdkClient } = await import('./anthropic-sdk-client');
  const { OpenAICompatSdkClient } = await import('./openai-compat-sdk-client');
  const { OpenAICodexSdkClient } = await import('./openai-codex-sdk-client');

  const provider = settings.provider;
  // v1.25.3 #182: read the key through the resolver so SecretStorage is
  // preferred over the (now-empty) settings.apiKey. Falls back to the
  // legacy plaintext for un-migrated installs and tests.
  // v1.25.7 PATCH: forward the optional pendingApiKey (tab.tempSettings.apiKey
  // in the Test Connection flow) so the freshly-typed key wins over the
  // stale SecretStorage value. Production callers pass undefined.
  // #425 Stage 2: in bedrock sso/iam modes AWS credentials sign every
  // request, so no bearer key is resolved at all.
  const apiKey = usesBedrockAwsCredentials(provider, settings) ? '' : resolveProviderApiKey(
    { apiKey: settings.apiKey, providerApiKeySecretId: settings.providerApiKeySecretId },
    settings.secretStorage ?? null,
    pendingApiKey,
  );
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
export function createLLMClientFromSettingsSync(
  settings: ProviderSettings,
  pendingApiKey?: string,
): LLMClient {
  if (!preloadedModules) {
    throw new Error(
      '[v1.23.0 LLM migration] SDK modules not preloaded. ' +
      'Call `await preloadLLMClientModules()` during plugin onload() before any LLM call.'
    );
  }
  const { OpenAISdkClient, AnthropicSdkClient, OpenAICompatSdkClient, OpenAICodexSdkClient } = preloadedModules;

  const provider = settings.provider;
  // v1.25.3 #182: read the key through the resolver so SecretStorage is
  // preferred over the (now-empty) settings.apiKey. Falls back to the
  // legacy plaintext for un-migrated installs and tests.
  // v1.25.7 PATCH: forward the optional pendingApiKey (tab.tempSettings.apiKey
  // in the Test Connection flow) so the freshly-typed key wins over the
  // stale SecretStorage value. Production callers pass undefined.
  // #425 Stage 2: in bedrock sso/iam modes AWS credentials sign every
  // request, so no bearer key is resolved at all.
  const apiKey = usesBedrockAwsCredentials(provider, settings) ? '' : resolveProviderApiKey(
    { apiKey: settings.apiKey, providerApiKeySecretId: settings.providerApiKeySecretId },
    settings.secretStorage ?? null,
    pendingApiKey,
  );
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
