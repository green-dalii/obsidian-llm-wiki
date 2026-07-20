/**
 * v1.25.1 Phase C-PR3: Connection test commands.
 *
 * Extracted from main.ts. Probes the live LLM endpoint and checks
 * wiki structure readiness.
 *
 * `testLLMConnection` is directly called by tests
 * (test-connection-gate.test.ts) and settings test-connection-section
 * via `plugin.testLLMConnection()` — the mixin pattern preserves
 * this call surface with zero sites changed.
 */

import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type {
  LLMWikiSettings,
  LLMClient,
} from '../types';
import {
  PREDEFINED_PROVIDERS,
} from '../types';
import type { LLMTask } from '../core/model-resolver';
import { TEXTS } from '../texts';
import { getText } from '../core/i18n';
import { createLLMClient } from '../core/create-plugin-llm-client';
import { allowsEmptyApiKey } from '../core/local-no-key-provider';
import { resolveModelForTask } from '../core/model-resolver';
import { TOKENS_QUERY_MODEL_DETECT, NOTICE_ERROR } from '../constants';

/**
 * Host interface: fields/methods these commands need from the Plugin
 * instance. Declares the class-side methods they call so mixin
 * `this: ConnectionCommandsHost` compiles correctly.
 */
export interface ConnectionCommandsHost {
  app: App;
  settings: LLMWikiSettings;
  llmClient: LLMClient | null;
  wikiEngine: import('../wiki/wiki-engine').WikiEngine;
  initializeLLMClient(): void;
  saveSettings(): Promise<void>;
  isWikiInitialized(): Promise<boolean>;
}

/** Method signatures merged into LLMWikiPlugin via interface augmentation. */
export interface ConnectionCommandsMethods {
  testLLMConnection(): Promise<{ success: boolean; message: string }>;
  requireLLMReady(): boolean;
  isWikiInitialized(): Promise<boolean>;
}

export const connectionCommands = {
  async testLLMConnection(
    this: ConnectionCommandsHost,
  ): Promise<{ success: boolean; message: string }> {
    const t = TEXTS[this.settings.language] || TEXTS.en;

    if (!allowsEmptyApiKey(this.settings.provider, this.settings.apiKey)) {
      return { success: false, message: t.errorNoApiKey || 'API Key is not configured' };
    }

    const tasksToProbe: LLMTask[] = this.settings.usePerTaskModels === true
      ? ['ingest', 'lint', 'query']
      : [];
    const probePlan: Array<{ label: string; model: string }> = tasksToProbe.length === 0
      ? [{ label: 'unified', model: this.settings.model }]
      : tasksToProbe.map(task => ({ label: task, model: resolveModelForTask(this.settings, task) }));

    console.debug('[testLLMConnection] probe plan:', probePlan.map(p => `${p.label}=${p.model}`).join(', '));

    try {
      const testClient = createLLMClient(this.settings);

      for (const probe of probePlan) {
        await testClient.createMessage({
          model: probe.model,
          max_tokens: TOKENS_QUERY_MODEL_DETECT,
          messages: [{
            role: 'user',
            content: 'Test connection. Please reply "Connection successful".'
          }]
        });
      }

      this.settings.llmReady = true;
      void this.saveSettings();

      // Auto-initialize wiki structure after first successful connection.
      // Preserved from original main.ts — defensive: ensures the expected
      // folder tree exists before the user attempts their first ingest.
      if (this.wikiEngine) {
        const isInit = await this.isWikiInitialized();
        if (!isInit) {
          try {
            await this.wikiEngine.ensureWikiStructure();
            console.debug('Wiki structure auto-initialized');
          } catch (initError) {
            console.warn('Auto wiki init failed:', initError);
          }
        }
      }

      const providerName = (PREDEFINED_PROVIDERS[this.settings.provider]?.nameEn || this.settings.provider);

      this.initializeLLMClient();

      const probeSummary = probePlan.length === 1
        ? `${providerName} (${probePlan[0].model})`
        : `${providerName} (ingest=${probePlan[0].model}, lint=${probePlan[1].model}, query=${probePlan[2].model})`;

      return {
        success: true,
        message: `✅ ${t.testConnectionSuccessful || 'Connection successful'}: ${probeSummary}`
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      this.settings.llmReady = false;
      await this.saveSettings();
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `❌ ${t.testConnectionFailed || 'Connection failed'}: ${errorMsg || t.errorUnknown || 'Unknown error'}`
      };
    }
  },

  requireLLMReady(this: ConnectionCommandsHost): boolean {
    if (this.settings.llmReady) return true;
    new Notice(getText(this.settings.language, 'llmNotReady'), NOTICE_ERROR);
    return false;
  },

  async isWikiInitialized(this: ConnectionCommandsHost): Promise<boolean> {
    const wikiFolder = this.settings.wikiFolder || 'wiki';
    const requiredFolders = [
      `${wikiFolder}/entities`,
      `${wikiFolder}/concepts`,
      `${wikiFolder}/sources`,
      `${wikiFolder}/schema`
    ];
    for (const folder of requiredFolders) {
      const folderObj = this.app.vault.getAbstractFileByPath(folder);
      if (!folderObj) return false;
    }
    return true;
  },
};
