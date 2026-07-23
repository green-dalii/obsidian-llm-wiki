/**
 * v1.25.1 Phase C-PR2: Model section renderer.
 *
 * Extracted from `LLMWikiSettingTab.display()`. Renders the Model
 * selection block:
 *
 *   - "Model" H2 heading
 *   - Fetch Models button (with fallback URL resolution)
 *   - Model Scope dropdown (unified vs per-task)
 *   - Unified model picker (rendered via tab.renderModelField)
 *   - Lint + Query model pickers (only in per-task mode)
 *   - Max Tokens Per Call dropdown (only for local-like providers)
 *
 * Why extracted:
 *   - 230 LOC of model-picker side effects with the most subtle
 *     UX invariants in the codebase (v1.24.1 PATCH Phase 5.5.0
 *     bidirectional cascade, v1.24.0 #208 sentinel-option UX).
 *     Extracting gives them their own file for focused review.
 *
 * Invariants preserved:
 *   - Switch unified -> per-task: prefill 3 per-task fields with
 *     settings.model (consistent starting state).
 *   - Switch per-task -> unified: cascade-clear 3 per-task overrides.
 *   - Any model-field / provider change: set llmReady=false to force
 *     user re-test (prevents stale-client bugs).
 *   - Fetch Models: uses fetchModelsWithFallback for all providers
 *     (Kimi Anthropic /v1 suffix case); only auto-picks the first
 *     model via setFieldValue (which triggers the cascade).
 *   - MaxTokens dropdown renders only for ollama/lmstudio/custom/
 *     anthropic-compatible (preserves native provider defaults).
 */

import { Setting, Notice, requestUrl } from 'obsidian';
import type { LLMWikiSettingTab } from '../settings';
import { PREDEFINED_PROVIDERS } from '../../types';
import { resolveModelTaskUiMode } from '../settings-per-task-helpers';
import { fetchModelsWithFallback } from '../../core/url-fallback';
import { resolveProviderApiKey } from '../../llm-sdk/provider-api-key-resolver';
import { classifyFetchError } from '../settings-helpers';
import { NOTICE_NORMAL, NOTICE_ERROR } from '../../constants';

export function renderModelSection(tab: LLMWikiSettingTab, containerEl: HTMLElement): void {
  const { tempSettings } = tab;
  const providerConfig = PREDEFINED_PROVIDERS[tempSettings.provider];
  const isOllama = tempSettings.provider === 'ollama';
  const isCodex = tempSettings.provider === 'openai-codex';

  // Model section heading
  new Setting(containerEl).setName(tab.getText('modelSection')).setHeading();

  // Fetch Models button
  if (!isCodex) new Setting(containerEl)
    .setName(tab.getText('fetchModelsName'))
    .setDesc(tab.getText('fetchModelsDesc'))
    .addButton(button => button
      .setButtonText(tab.getText('fetchModelsButton'))
      .onClick(async () => {
        button.setButtonText(tab.getText('fetchingModels'));
        button.setDisabled(true);
        try {
          // v1.25.3 #182: resolve the effective API key from SecretStorage
          // so Fetch Models works post-migration (tempSettings.apiKey is
          // normally '' — the plaintext was moved to OS keychain).
          const effectiveApiKey = resolveProviderApiKey(
            { apiKey: tempSettings.apiKey, providerApiKeySecretId: tempSettings.providerApiKeySecretId },
            tab.plugin.app.secretStorage,
          );
          const apiKey = isOllama ? 'ollama' : effectiveApiKey;
          const baseUrl = tempSettings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;

          // Smart filter based on provider: OpenRouter allows '/', Ollama allows ':'
          const getModelFilter = (provider: string) => {
            if (provider === 'openrouter') return (id: string) => !id.includes(':');
            else if (provider === 'ollama') return (id: string) => !id.includes('/');
            else return (id: string) => !id.includes(':') && !id.includes('/');
          };
          const modelFilter = getModelFilter(tempSettings.provider);

          // v1.23.0 P1.5: use fetchModelsWithFallback for all providers.
          // Unified fallback handles missing /v1 suffix (Kimi Anthropic
          // case) - Test Connection and Fetch Models share the same
          // module-level cache.
          const providerForFallback =
            tempSettings.provider === 'openai' ? 'openai' :
            tempSettings.provider === 'anthropic' ? 'anthropic' :
            tempSettings.provider as 'openai-compatible' | 'anthropic-compatible';

          const fetchOneUrl = async (modelsUrl: string): Promise<string[]> => {
            try {
              const response = await requestUrl({
                url: modelsUrl,
                method: 'GET',
                headers: tempSettings.provider === 'anthropic' || tempSettings.provider === 'anthropic-compatible'
                  ? { 'x-api-key': apiKey, 'Anthropic-Version': '2023-06-01' }
                  : { 'Authorization': `Bearer ${apiKey}` },
                throw: false,
              });
              if (response.status >= 200 && response.status < 300) {
                const data = response.json as { data?: Array<{ id: string }> };
                if (data.data?.length) {
                  return data.data.map((m: { id: string }) => m.id);
                }
              }
              return [];
            } catch {
              return [];
            }
          };

          const effectiveBaseUrl = baseUrl ?? (
            tempSettings.provider === 'anthropic' ? 'https://api.anthropic.com/v1' :
            tempSettings.provider === 'openai' ? 'https://api.openai.com/v1' :
            ''
          );

          let models: string[];
          try {
            models = await fetchModelsWithFallback({
              baseUrl: effectiveBaseUrl,
              provider: providerForFallback,
              fetchFn: fetchOneUrl,
            });
            if (models.length === 0) throw new Error('empty model list');
          } catch {
            throw new Error('All URL candidates failed');
          }

          tempSettings.availableModels = models.filter(modelFilter).sort();
          if (tempSettings.availableModels.length > 0) {
            new Notice(tab.getText('fetchSuccess').replace('{}', tempSettings.availableModels.length.toString()), NOTICE_NORMAL);
            if (!tempSettings.model || !tempSettings.availableModels.includes(tempSettings.model)) {
              tab.setFieldValue('model', tempSettings.availableModels[0]);
            }
            tempSettings.useCustomModel = false;
          } else {
            new Notice(tab.getText('fetchFailed'), NOTICE_NORMAL);
            tempSettings.useCustomModel = true;
          }
          tab.display();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const category = classifyFetchError(errorMsg);
          new Notice(tab.getTextDynamic(`fetchError${category}`), NOTICE_ERROR);
          tempSettings.useCustomModel = true;
          tempSettings.availableModels = [];
          tab.display();
        }
        button.setButtonText(tab.getText('fetchModelsButton'));
        button.setDisabled(false);
      }));

  // Model Scope dropdown (unified vs per-task)
  new Setting(containerEl)
    .setName(tab.getText('modelTaskModeName'))
    .setDesc(tab.getText('modelTaskModeDesc'))
    .addDropdown(dropdown => {
      dropdown.addOption('unified', tab.getText('modelTaskModeUnified'));
      dropdown.addOption('per-task', tab.getText('modelTaskModePerTask'));
      dropdown.setValue(resolveModelTaskUiMode(tempSettings));
      dropdown.onChange((value) => {
        const nextMode: 'unified' | 'per-task' = value === 'per-task' ? 'per-task' : 'unified';
        tempSettings.usePerTaskModels = nextMode === 'per-task';
        if (nextMode === 'unified') {
          tab.cascadeUnifiedModelChange();
        } else {
          tab.prefillPerTaskFromUnified();
        }
        tab.markLLMConfigStale();
        tab.display();
      });
    });

  // Unified model picker
  tab.renderModelField(containerEl, 'model', {
    name: resolveModelTaskUiMode(tempSettings) === 'per-task'
      ? tab.getText('perTaskIngestModelName')
      : tab.getText('selectModelName'),
    desc: resolveModelTaskUiMode(tempSettings) === 'per-task'
      ? tab.getText('perTaskIngestModelDesc')
      : tab.getText('selectModelDesc').replace('{}', String(tempSettings.availableModels?.length ?? 0)),
    dropdownSentinel: '__custom__',
    dropdownSentinelLabel: tab.getText('customInputOption'),
    allowCustom: !isCodex,
  });

  // Lint + Query pickers (per-task only)
  if (resolveModelTaskUiMode(tempSettings) === 'per-task') {
    tab.renderModelField(containerEl, 'lintModel', {
      name: tab.getText('perTaskLintModelName'),
      desc: tab.getText('perTaskLintModelDesc'),
      dropdownSentinel: '__custom__',
      dropdownSentinelLabel: tab.getText('customInputOption'),
      allowCustom: !isCodex,
    });
    tab.renderModelField(containerEl, 'queryModel', {
      name: tab.getText('perTaskQueryModelName'),
      desc: tab.getText('perTaskQueryModelDesc'),
      dropdownSentinel: '__custom__',
      dropdownSentinelLabel: tab.getText('customInputOption'),
      allowCustom: !isCodex,
    });
  }

  // Max Tokens Per Call (local-like providers only)
  const localLikeProviders = ['ollama', 'lmstudio', 'custom', 'anthropic-compatible'];
  if (localLikeProviders.includes(tempSettings.provider)) {
    const tokenOptions = [0, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576];
    const tokenLabels = ['0 (No limit)', '4K', '8K', '16K', '32K', '64K', '128K', '256K', '512K', '1M'];
    const currentVal = tempSettings.maxTokensPerCall ?? 0;
    new Setting(containerEl)
      .setName(tab.getText('maxTokensPerCallName'))
      .setDesc(tab.getText('maxTokensPerCallDesc'))
      .addDropdown(dropdown => {
        tokenOptions.forEach((val, idx) => {
          dropdown.addOption(String(val), tokenLabels[idx]);
        });
        dropdown.setValue(String(currentVal));
        dropdown.onChange((value) => {
          tempSettings.maxTokensPerCall = parseInt(value);
        });
      });
  }
}
