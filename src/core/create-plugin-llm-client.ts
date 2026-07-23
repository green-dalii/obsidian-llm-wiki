/**
 * v1.25.1 Phase C-PR3: Plugin-level LLM client factory.
 *
 * Extracted from main.ts to break the circular dependency between
 * main.ts and main-commands/connection-commands.ts: the connection
 * test commands need to call createLLMClient without main.ts
 * importing from them in return.
 *
 * Pure function — no class or plugin state. Exists solely to inject
 * user-configured advanced settings (temperature, repetitionPenalty)
 * into the AI-SDK-backed client.
 */

import { wrapWithAdvancedSettings } from '../llm-client-wrapper';
import { createLLMClientFromSettingsSync } from '../llm-sdk/create-llm-client';
import { getText } from './i18n';
import type { CodexAuthManager } from '../llm-sdk/openai-codex/auth-manager';
import type { ProviderSecretStorage } from '../llm-sdk/provider-secret-store';
import type { LLMWikiSettings, LLMClient } from '../types';

export function createLLMClient(
  settings: LLMWikiSettings,
  codexAuth?: CodexAuthManager,
  codexVersion?: string,
  // v1.25.3 #182: when provided, the SDK factory prefers the live key
  // from Obsidian SecretStorage over the (now-empty) settings.apiKey.
  // Pass `plugin.app.secretStorage` from production code; tests that
  // don't have one can omit it (resolver falls back to settings.apiKey).
  secretStorage?: ProviderSecretStorage | null,
): LLMClient {
  const client: LLMClient = createLLMClientFromSettingsSync({
    provider: settings.provider,
    apiKey: settings.apiKey,
    providerApiKeySecretId: settings.providerApiKeySecretId,
    secretStorage: secretStorage ?? null,
    baseUrl: settings.baseUrl,
    codexAuth,
    codexVersion,
    codexQuotaMessage: getText(settings.language, 'codexAuthQuota'),
  });

  return wrapWithAdvancedSettings(client, {
    maxTokensPerCall: settings.maxTokensPerCall,
    extractionTemperature: settings.extractionTemperature,
    chatTemperature: settings.chatTemperature,
    repetitionPenalty: settings.repetitionPenalty,
  });
}
