/**
 * v1.25.1 Phase C-PR2: Provider section renderer.
 *
 * Extracted from `LLMWikiSettingTab.display()`. Renders the LLM
 * Provider configuration block:
 *
 *   - Provider dropdown
 *   - API key input (hidden for ollama/lmstudio; lmstudio shows hint)
 *   - Base URL input (always shown for custom/anthropic-compatible;
 *     otherwise only when override differs from default)
 *   - Bedrock region dropdown (only when provider is bedrock-*)
 *   - Page Generation Concurrency slider
 *   - Batch Delay slider
 *
 * Why extracted:
 *   - 130 LOC of provider-config side effects. Splitting into its own
 *     module makes the provider-specific rendering path inspectable
 *     without scrolling through unrelated Model / Advanced / Wiki code.
 *
 * Invariants preserved:
 *   - Switching provider resets llmReady + availableModels + model +
 *     useCustomModel (clears stale-client state).
 *   - Switching to a native-PDF provider (anthropic / openai /
 *     bedrock-*) auto-resets forcePdfSupport to false (v1.25.0 PR3
 *     universal escape hatch UX invariant).
 *   - baseUrl is set to PREDEFINED_PROVIDERS.baseUrl when switching to
 *     a known provider; user can override afterwards.
 *   - API key input is hidden for ollama / lmstudio (no key needed).
 *   - Concurrency description swaps between singular/plural based on
 *     the live value (UX nicety preserved).
 */

import { Platform, Setting } from 'obsidian';
import type { LLMWikiSettingTab } from '../settings';
import { PREDEFINED_PROVIDERS } from '../../types';
import { BEDROCK_REGIONS, BEDROCK_DEFAULT_REGION, NATIVE_PDF_PROVIDER_IDS } from '../../constants';
import { renderRangeSlider } from '../settings-helpers';
import { getCodexAuthUiState } from '../openai-codex-auth-controls';

export function renderProviderSection(tab: LLMWikiSettingTab, containerEl: HTMLElement): void {
  const { tempSettings } = tab;
  const providerConfig = PREDEFINED_PROVIDERS[tempSettings.provider];
  const isOllama = tempSettings.provider === 'ollama';
  const isLmStudio = tempSettings.provider === 'lmstudio';
  const isCodex = tempSettings.provider === 'openai-codex';
  const isBedrock = tempSettings.provider === 'bedrock-anthropic'
    || tempSettings.provider === 'bedrock-openai';

  // LLM Provider (highest priority - must configure first).
  // v1.25.1 Phase C-PR2 fix: this heading was previously emitted from
  // LLMWikiSettingTab.display() and lost when the section was extracted.
  // Restoring it preserves the pre-PR2 Settings tab layout users have
  // muscle memory for.
  new Setting(containerEl).setName(tab.getText('providerSection')).setHeading();

  // Provider dropdown
  new Setting(containerEl)
    .setName(tab.getText('providerName'))
    .setDesc(tab.getText('providerDesc'))
    .addDropdown(dropdown => {
      Object.values(PREDEFINED_PROVIDERS).forEach(config => {
        const lang = tempSettings.language;
        const displayName = lang === 'zh' ? config.nameZh : config.nameEn;
        dropdown.addOption(config.id, displayName);
      });
      dropdown.setValue(tempSettings.provider);
      dropdown.onChange((value) => {
        tempSettings.provider = value;
        tempSettings.llmReady = false;
        tempSettings.availableModels = [];
        tempSettings.useCustomModel = false;
        tempSettings.model = '';
        const config = PREDEFINED_PROVIDERS[value];
        if (config && value !== 'custom') tempSettings.baseUrl = config.baseUrl;
        // v1.25.0 PR3: if the user just switched to a native-PDF provider
        // (anthropic / openai / bedrock-*), reset forcePdfSupport so they
        // don't carry a stale escape-hatch value that no longer applies.
        if ((NATIVE_PDF_PROVIDER_IDS as readonly string[]).includes(value)) {
          tempSettings.forcePdfSupport = false;
        }
        tab.display();
      });
    });

  // API Key (or hint for ollama/lmstudio)
  if (isCodex) {
    const isSignedIn = tab.plugin.codexAuthManager?.hasCredential() === true;
    const authState = getCodexAuthUiState({ isDesktop: !Platform.isMobile, isSignedIn, isBusy: tab.codexAuthBusy });
    const status = tab.codexAuthBusy ? tab.getText('codexAuthBusy') : authState.showSignOut ? tab.getText('codexAuthSignedIn') : tab.getText('codexAuthSignedOut');
    const authSetting = new Setting(containerEl).setName(tab.getText('codexAuthName')).setDesc(`${tab.getText('codexAuthDesc')} ${tab.getText('codexAuthExperimental')} ${status}`);
    if (authState.showBrowser) authSetting.addButton(button => button.setButtonText(tab.getText('codexAuthBrowserButton')).onClick(() => { void tab.loginOpenAICodexBrowser(); }));
    if (authState.showDevice) authSetting.addButton(button => button.setButtonText(tab.getText('codexAuthDeviceButton')).onClick(() => { void tab.loginOpenAICodexDevice(); }));
    if (authState.showSignOut) authSetting.addButton(button => button.setButtonText(tab.getText('codexAuthSignOutButton')).setWarning().onClick(() => { void tab.signOutOpenAICodex(); }));
    if (isSignedIn) new Setting(containerEl).setName(tab.getText('codexModelsRefreshName')).setDesc(tab.getText('codexModelsRefreshDesc')).addButton(button => button.setButtonText(tab.codexAuthBusy ? tab.getText('codexModelsRefreshing') : tab.getText('codexModelsRefreshButton')).setDisabled(tab.codexAuthBusy).onClick(() => { void tab.refreshOpenAICodexModels(true, true); }));
    if (tab.codexDevicePrompt) {
      const prompt = tab.codexDevicePrompt;
      new Setting(containerEl).setName(tab.getText('codexAuthDeviceInstructions').replace('{}', prompt.userCode)).setDesc(prompt.verificationUrl).addButton(button => button.setButtonText(tab.getText('codexAuthCopyCode')).onClick(() => { void tab.copyOpenAICodexDeviceCode(); })).addButton(button => button.setButtonText(tab.getText('cancelButton')).setWarning().onClick(() => { prompt.cancel(); }));
    }
    if (isSignedIn) tab.queueStaleCodexModelRefresh();
  } else if (!isOllama && !isLmStudio) {
    new Setting(containerEl)
      .setName(tab.getText('apiKeyName'))
      .setDesc(tab.getText('apiKeyDesc'))
      .addText(text => {
        text.setPlaceholder(tab.getText('apiKeyPlaceholder'))
          .setValue(tempSettings.apiKey)
          .onChange((value) => { tempSettings.apiKey = value; tempSettings.llmReady = false; });
        text.inputEl.type = 'password';
      });
  } else if (isLmStudio) {
    containerEl.createEl('p', {
      text: tab.getText('lmstudioHint'),
      cls: 'llm-wiki-ollama-hint'
    });
  } else {
    containerEl.createEl('p', {
      text: tab.getText('ollamaHint'),
      cls: 'llm-wiki-ollama-hint'
    });
  }

  // Base URL
  if (tempSettings.provider === 'custom' || tempSettings.provider === 'anthropic-compatible' || (providerConfig && tempSettings.baseUrl !== providerConfig.baseUrl)) {
    new Setting(containerEl)
      .setName(tab.getText('baseUrlName'))
      .setDesc(tempSettings.provider === 'custom' || tempSettings.provider === 'anthropic-compatible'
        ? tab.getText('baseUrlDescCustom') : tab.getText('baseUrlDescOverride'))
      .addText(text => text
        .setPlaceholder(providerConfig?.baseUrl || 'https://api.example.com/v1')
        .setValue(tempSettings.baseUrl)
        .onChange((value) => { tempSettings.baseUrl = value; tempSettings.llmReady = false; }));
  }

  // v1.24.1 PATCH Bedrock Stage 1 - region selector (only when provider
  // is one of the two bedrock-* ids). Region drives the baseURL the
  // factory resolves; the user does NOT edit baseURL for Bedrock.
  if (isBedrock) {
    const currentRegion = tempSettings.bedrockRegion || BEDROCK_DEFAULT_REGION;
    new Setting(containerEl)
      .setName(tab.getText('bedrockRegionName'))
      .setDesc(`${tab.getText('bedrockRegionDesc')} ${tab.getText('bedrockRegionHint')}`)
      .addDropdown(dropdown => {
        BEDROCK_REGIONS.forEach(region => {
          dropdown.addOption(region, region);
        });
        dropdown.setValue(currentRegion);
        dropdown.onChange((value) => {
          tempSettings.bedrockRegion = value;
          tempSettings.llmReady = false;
          tempSettings.availableModels = [];
          tempSettings.useCustomModel = false;
          tempSettings.model = '';
        });
      });
  }

  // Page Generation Concurrency + Batch Delay — both rendered via the
  // shared renderRangeSlider helper (v1.25.1 Phase C-PR2 simplify pass).
  renderRangeSlider(containerEl, {
    name: tab.getText('pageGenerationConcurrencyName'),
    desc: tab.getText('pageGenerationConcurrencyDesc'),
    initialValue: tempSettings.pageGenerationConcurrency ?? 3,
    min: 1,
    max: 5,
    step: 1,
    formatDesc: (v) => tab.getText(v === 1 ? 'concurrencyValueSingular' : 'concurrencyValuePlural').replace('{}', String(v)),
    onChange: (v) => { tempSettings.pageGenerationConcurrency = v; },
  });

  renderRangeSlider(containerEl, {
    name: tab.getText('batchDelayName'),
    desc: tab.getText('batchDelayDesc'),
    initialValue: tempSettings.batchDelayMs ?? 300,
    min: 100,
    max: 2000,
    step: 50,
    formatDesc: (v) => tab.getText('batchDelayDesc').replace('{}', String(v)),
    onChange: (v) => { tempSettings.batchDelayMs = v; },
  });
}
