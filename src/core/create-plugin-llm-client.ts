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
import type { LLMWikiSettings, LLMClient } from '../types';

export function createLLMClient(settings: LLMWikiSettings): LLMClient {
  const client: LLMClient = createLLMClientFromSettingsSync({
    provider: settings.provider,
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
  });

  return wrapWithAdvancedSettings(client, {
    maxTokensPerCall: settings.maxTokensPerCall,
    extractionTemperature: settings.extractionTemperature,
    chatTemperature: settings.chatTemperature,
    repetitionPenalty: settings.repetitionPenalty,
  });
}
