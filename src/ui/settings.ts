import { NOTICE_NORMAL, NOTICE_ERROR, NOTICE_SHORT, CUSTOM_LIMIT_MAX, CUSTOM_LIMIT_MIN } from '../constants';
// Settings panel UI for LLM Wiki Plugin

import { App, PluginSettingTab, Setting, Notice, TFile, requestUrl, BaseComponent, Platform } from 'obsidian';
import LLMWikiPlugin from '../main';
import { PREDEFINED_PROVIDERS, LLMWikiSettings, WIKI_LANGUAGES, VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS } from '../types';
import { TEXTS } from '../texts';
import { BEDROCK_REGIONS, BEDROCK_DEFAULT_REGION, NATIVE_PDF_PROVIDER_IDS } from '../constants';
import { FolderSuggestModal } from './modals';
import { HistoryModal } from './history-modal';
import { classifyFetchError } from './settings-helpers';
import {
  resolveModelTaskUiMode,
  resolveDisplayedModelForTask,
  shouldRenderModelDropdown,
  type ModelTaskUiMode,
  type ModelFieldKey,
} from './settings-per-task-helpers';
import { TagChipInputComponent } from './tag-chip-input';
import { fetchModelsWithFallback } from '../core/url-fallback';
import { applyCodexModelPolicy, copyCodexDeviceCode, getCodexAuthUiState, preserveCodexRuntimeModelState, runCodexDeviceAuth, runCodexModelRefresh, runCodexSignOut } from './openai-codex-auth-controls';
import type { CodexDevicePrompt } from './openai-codex-auth-controls';

export class LLMWikiSettingTab extends PluginSettingTab {
  plugin: LLMWikiPlugin;
  tempSettings: LLMWikiSettings;
  private codexAuthBusy = false;
  private codexDevicePrompt: CodexDevicePrompt | null = null;
  private codexModelRefreshAttemptedAt = 0;

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.tempSettings = {
      ...plugin.settings,
      watchedFolders: [...(plugin.settings.watchedFolders || [])]
    };
  }

  // Issue #137: merge tempSettings → plugin.settings, preserving any
  // fields the form does not track but Test Connection mutates.
  // v1.23.0: thinkingControlCache is @deprecated (AI-SDK v6 handles
  // internally) but still preserved here for data.json forward-compat.
  // Called by hide() (auto-save) and the explicit Save button. Adding
  // a new probe-mutated field only requires extending this one helper,
  // not every save site.
  private commitTempSettings(): void {
    // v1.24.1 PATCH Phase 5.5.0 hotfix fix: belt-and-suspenders cascade.
    // setFieldValue already triggers cascadeUnifiedModelChange on a
    // dropdown/text-input edit, but there are at least 3 other write
    // sites that mutate tempSettings.model directly (provider change →
    // '', fetch-models auto-pick → availableModels[0], bedrock region
    // change → ''). To guarantee unified-model edits always clear stale
    // per-task overrides, re-run the cascade here at commit time if
    // the unified model is non-empty.
    //
    // Safety: idempotent (the cascade itself skips fields already at ''),
    // and the whitespace check matches setFieldValue's gate, so an
    // explicit blank-edit never triggers a per-task reset.
    if (this.tempSettings.model.trim()) {
      this.cascadeUnifiedModelChange();
    }
    this.plugin.settings = {
      ...this.tempSettings,
      watchedFolders: [...(this.tempSettings.watchedFolders || [])],
      thinkingControlCache: this.plugin.settings.thinkingControlCache,
    };
  }

  // Auto-save when user navigates away from settings tab
  hide(): void {
    const hasChanges = JSON.stringify(this.tempSettings) !== JSON.stringify(this.plugin.settings);
    if (hasChanges) {
      this.commitTempSettings();
      void this.plugin.saveSettings();
      console.debug('Settings auto-saved on tab close');
    }
  }

  getText(key: keyof typeof TEXTS.en): string {
    const texts = TEXTS[this.tempSettings.language];
    return (texts[key] as string) ?? TEXTS.en[key] ?? key;
  }

  /**
   * v1.24.0 #208: shared model-picker renderer for all 4 model fields
   * (unified `model` + per-task `ingestModel` / `lintModel` / `queryModel`).
   *
   * Renders either a dropdown (when a fetched list is available AND the
   * field's `*UseCustom` flag is false) or a free-form text input (in
   * all other cases). The dropdown carries a sentinel option that, when
   * picked, either switches to text input mode (unified: `__custom__` →
   * `useCustomModel=true`) or clears the per-task value to fall back to
   * `settings.model` (per-task: `__unified__` → `field = ''`).
   *
   * Why a shared helper: the existing unified picker and the new
   * per-task pickers share identical dropdown↔input switching logic.
   * Implementing it inline 4 times would diverge over time (every
   * pre-existing bug in the unified picker would reappear in the new
   * pickers). One helper, four call sites — see settings-per-task-helpers.ts
   * for the pure rendering policy (`shouldRenderModelDropdown`).
   */
  private renderModelField(
    containerEl: HTMLElement,
    field: ModelFieldKey,
    options: {
      name: string;
      desc: string;
      dropdownSentinel: string;
      dropdownSentinelLabel: string;
      allowCustom?: boolean;
    },
  ): void {
    const setting = new Setting(containerEl)
      .setName(options.name)
      .setDesc(options.desc);
    const useDropdown = shouldRenderModelDropdown(this.tempSettings, field);
    if (useDropdown) {
      setting.addDropdown(dropdown => {
        (this.tempSettings.availableModels || []).forEach(model => {
          dropdown.addOption(model, model);
        });
        if (options.allowCustom !== false) dropdown.addOption(options.dropdownSentinel, options.dropdownSentinelLabel);
        const currentVal = this.getCurrentModelValue(field);
        // If the current value is empty OR not in the fetched list, default
        // the dropdown to the sentinel option. This covers two cases:
        //   1. User hasn't picked a per-task value yet (field === '') →
        //      shows sentinel so user can choose "Custom input..." or
        //      pick from the list.
        //   2. User previously typed a custom model ID that isn't in the
        //      fetched list → showing the sentinel matches the actual
        //      state (the value is preserved in the field, just not in
        //      the dropdown's visible options).
        const displayVal = currentVal.trim() && (this.tempSettings.availableModels || []).includes(currentVal.trim())
          ? currentVal.trim()
          : options.allowCustom === false ? this.tempSettings.availableModels?.[0] ?? '' : options.dropdownSentinel;
        dropdown.setValue(displayVal);
        dropdown.onChange((value) => {
          if (options.allowCustom !== false && value === options.dropdownSentinel) {
            // Unified picker: switch to text input (preserves field value).
            // Per-task picker: also switch to text input — same UX. The
            // "use unified model" semantic is expressed by *leaving the
            // text input blank*, not by a separate sentinel option.
            // (v1.24.0 #208 UX fix: previously per-task pickers cleared
            // the field on sentinel pick, which made "use unified model"
            // accidental — user couldn't tell the two states apart.)
            if (field === 'model') {
              this.tempSettings.useCustomModel = true;
            } else {
              this.setUseCustomFlag(field, true);
            }
            this.display();
          } else {
            // Pick a real model from the fetched list.
            if (field === 'model') {
              this.tempSettings.useCustomModel = false;
            } else {
              this.setUseCustomFlag(field, false);
            }
            this.setFieldValue(field, value);
          }
        });
      });
    } else {
      // Free-form text input. Show "use dropdown" button only when a
      // fetched list exists — otherwise there is no dropdown to switch to.
      const hasFetched = (this.tempSettings.availableModels?.length ?? 0) > 0;
      setting.addText(text => text
        .setPlaceholder(this.getText('modelInputPlaceholder'))
        .setValue(this.getCurrentModelValue(field))
        .onChange((value) => { this.setFieldValue(field, value); }));
      if (hasFetched && options.allowCustom !== false) {
        setting.addExtraButton(button => button
          .setIcon('list')
          .setTooltip(this.getText('useDropdownButton'))
          .onClick(() => {
            if (field === 'model') {
              this.tempSettings.useCustomModel = false;
            } else {
              this.setUseCustomFlag(field, false);
            }
            this.display();
          }));
      }
    }
  }

  private codexAuthError(error: unknown): string {
    return this.getText('codexAuthFailed').replace('{}', error instanceof Error ? error.message : String(error));
  }

  private syncCodexModelsFromPlugin(): void {
    this.tempSettings.openAICodexModels = (this.plugin.settings.openAICodexModels ?? []).map((entry) => ({ ...entry, supportedReasoningLevels: [...entry.supportedReasoningLevels], additionalSpeedTiers: [...entry.additionalSpeedTiers], serviceTiers: entry.serviceTiers.map((tier) => ({ ...tier })) }));
    this.tempSettings.openAICodexModelsFetchedAt = this.plugin.settings.openAICodexModelsFetchedAt ?? 0;
    this.tempSettings.openAICodexUnavailableModels = [...(this.plugin.settings.openAICodexUnavailableModels ?? [])];
    applyCodexModelPolicy(this.tempSettings);
  }

  private async refreshOpenAICodexModels(force: boolean, showSuccess: boolean): Promise<void> {
    await runCodexModelRefresh({ refresh: () => this.plugin.refreshOpenAICodexModels(force), sync: () => { this.syncCodexModelsFromPlugin(); }, showSuccess: (count) => { if (showSuccess) new Notice(this.getText('codexModelsRefreshSuccess').replace('{}', String(count)), NOTICE_NORMAL); }, showError: (error) => { new Notice(this.getText('codexModelsRefreshFailed').replace('{}', error instanceof Error ? error.message : String(error)), NOTICE_ERROR); }, setBusy: (value) => { this.codexAuthBusy = value; }, render: () => { this.display(); } });
  }

  private queueStaleCodexModelRefresh(): void {
    const now = Date.now();
    const lastSuccessful = this.plugin.settings.openAICodexModelsFetchedAt ?? 0;
    if (this.codexAuthBusy || now - Math.max(lastSuccessful, this.codexModelRefreshAttemptedAt) < 5 * 60 * 1000) return;
    this.codexModelRefreshAttemptedAt = now;
    void this.refreshOpenAICodexModels(false, false);
  }

  private async loginOpenAICodexBrowser(): Promise<void> {
    this.codexAuthBusy = true;
    this.display();
    try {
      await this.plugin.loginOpenAICodexBrowser();
      this.syncCodexModelsFromPlugin();
      this.tempSettings.llmReady = false;
    } catch (error) {
      new Notice(this.codexAuthError(error), NOTICE_ERROR);
    } finally {
      this.codexAuthBusy = false;
      this.display();
    }
  }

  private async loginOpenAICodexDevice(): Promise<void> {
    await runCodexDeviceAuth({ beginLogin: () => this.plugin.beginOpenAICodexDeviceLogin(), openExternal: (url) => this.plugin.openExternal(url), setPrompt: (prompt) => { this.codexDevicePrompt = prompt; }, showError: (error) => { new Notice(this.codexAuthError(error), NOTICE_ERROR); }, setBusy: (value) => { this.codexAuthBusy = value; }, setReady: (value) => { this.tempSettings.llmReady = value; }, render: () => { this.display(); } });
    this.syncCodexModelsFromPlugin();
  }

  private async copyOpenAICodexDeviceCode(): Promise<void> {
    if (!this.codexDevicePrompt) return;
    try {
      await copyCodexDeviceCode(this.codexDevicePrompt.userCode, navigator.clipboard);
    } catch (error) {
      new Notice(this.codexAuthError(error), NOTICE_ERROR);
    }
  }

  private confirmOpenAICodexSignOut(): boolean {
    // eslint-disable-next-line no-alert
    return window.confirm(`${this.getText('codexAuthSignOutButton')}?`);
  }

  private async signOutOpenAICodex(): Promise<void> {
    await runCodexSignOut({ isBusy: () => this.codexAuthBusy, isSignedIn: () => this.plugin.codexAuthManager?.hasCredential() === true, confirm: () => this.confirmOpenAICodexSignOut(), signOut: () => this.plugin.signOutOpenAICodex(), showError: (error) => { new Notice(this.codexAuthError(error), NOTICE_ERROR); }, setBusy: (value) => { this.codexAuthBusy = value; }, setReady: (value) => { this.tempSettings.llmReady = value; }, render: () => { this.display(); } });
    this.syncCodexModelsFromPlugin();
  }

  /** Read the current model string for any of the 4 model fields. */
  private getCurrentModelValue(field: ModelFieldKey): string {
    if (field === 'model') return this.tempSettings.model;
    const task = field === 'ingestModel' ? 'ingest' : field === 'lintModel' ? 'lint' : 'query';
    return resolveDisplayedModelForTask(this.tempSettings, task);
  }

  /**
   * Write a model string into any of the 4 model fields.
   *
   * v1.24.1 PATCH Phase 5.5.0 hotfix: when the user changes the
   * unified `model` field, cascade-clear the per-task override fields
   * (`ingestModel` / `lintModel` / `queryModel`) so all tasks
   * immediately use the new unified model. Prior behavior left the
   * per-task values untouched, so a unified-model edit could change
   * the displayed picker while leaving live task routing still pinned
   * to the old per-task model. UX bug reported 2026-07-13.
   *
   * Cascade only fires when:
   *  - `field === 'model'`, AND
   *  - the new value is non-empty (don't cascade-clear on blank-edit).
   *
   * Edge case: if a user explicitly opts into per-task mode later, they
   * can re-populate the per-task fields via the per-task pickers. The
   * cascade ensures UNIFIED → UNIFIED is atomic. PER_TASK editing is
   * not affected (those calls go through this same setter but bypass
   * the cascade block via the `field === 'model'` guard).
   */
  private setFieldValue(field: ModelFieldKey, value: string): void {
    if (field === 'model') {
      this.tempSettings.model = value;
      if (value.trim()) {
        this.cascadeUnifiedModelChange();
      }
    } else {
      (this.tempSettings as unknown as Record<string, string | undefined>)[field] = value;
    }
    // v1.24.1 PATCH Phase 5.5.0 hotfix: ANY model-field edit marks the
    // LLM config stale so the user must re-run Test Connection before
    // the next LLM call. Without this, the user could change model
    // in the UI but the existing llmClient would still use the old
    // model (no rebuild until saveSettings → initializeLLMClient).
    this.markLLMConfigStale();
  }

  /**
   * v1.24.1 PATCH Phase 5.5.0 hotfix: reset all per-task model override
   * fields so unified-model edits propagate to every task. Fires one
   * Notice to inform the user about the reset. Idempotent — calling
   * repeatedly with the overrides already empty is a no-op for both
   * the field writes and the Notice guard.
   */
  private cascadeUnifiedModelChange(): void {
    const fields: Array<'ingestModel' | 'lintModel' | 'queryModel'> = [
      'ingestModel',
      'lintModel',
      'queryModel',
    ];
    let cleared = 0;
    for (const f of fields) {
      const current = (this.tempSettings as unknown as Record<string, string | undefined>)[f];
      if (current !== undefined && current !== '') {
        (this.tempSettings as unknown as Record<string, string | undefined>)[f] = '';
        // Per-task *UseCustom flag also cleared so the per-task dropdown
        // re-anchors on the unified model instead of stale free-form text.
        this.setUseCustomFlag(f, false);
        cleared++;
      }
    }
    // v1.24.1 PATCH Phase 5.5.0 hotfix: silent cascade (no Notice spam
    // every time the user clicks Save). The fact that per-task values
    // were cleared is already visible in the Settings UI (the per-task
    // fields become empty), so an extra toast adds noise without
    // information. If the user wants to verify, they can look at the
    // per-task fields directly.
    void cleared;
  }

  /**
   * v1.24.1 PATCH Phase 5.5.0 hotfix: prefill the 3 per-task model
   * fields with the current unified model. Triggered when the user
   * switches UI mode from unified → per-task so the per-task pickers
   * open with consistent starting state. The user can then edit
   * individual tasks without first having to type or pick each one.
   *
   * Behavior:
   *  - All 3 per-task fields are set to the unified model string
   *    (NOT cleared) so fallback indirection is unnecessary.
   *  - All 3 `*UseCustom` flags are reset to false so the dropdown
   *    re-anchors on the unified value (instead of stale free-form
   *    text from a previous session).
   *  - Idempotent — re-running is a no-op when the per-task fields
   *    already match the unified value.
   */
  private prefillPerTaskFromUnified(): void {
    const unified = this.tempSettings.model.trim();
    const fields: Array<'ingestModel' | 'lintModel' | 'queryModel'> = [
      'ingestModel',
      'lintModel',
      'queryModel',
    ];
    for (const f of fields) {
      (this.tempSettings as unknown as Record<string, string | undefined>)[f] = unified;
      this.setUseCustomFlag(f, false);
    }
  }

  /**
   * v1.24.1 PATCH Phase 5.5.0 hotfix: mark the LLM config as
   * unverified whenever the user changes the provider, the unified
   * model, or any per-task model. This forces the user to re-run
   * Test Connection so the underlying `llmClient` is rebuilt with
   * the new settings — preventing stale-client bugs where a model
   * edit silently went out with the previous model.
   *
   * Also clears `availableModels` since the fetched list is per-
   * provider; the next Test Connection will re-fetch.
   */
  private markLLMConfigStale(): void {
    this.tempSettings.llmReady = false;
  }

  /** Toggle the <field>UseCustom flag for per-task fields; no-op for unified. */
  private setUseCustomFlag(field: ModelFieldKey, value: boolean): void {
    if (field === 'model') return; // useCustomModel is owned by the unified picker
    const flagKey = `${field}UseCustom`;
    (this.tempSettings as unknown as Record<string, boolean | undefined>)[flagKey] = value;
  }

  /**
   * Check if wiki folder structure exists (entities, concepts, sources, schema).
   * Uses IO inspection — no persistent flag.
   */
  private isWikiInitialized(): boolean {
    const wikiFolder = this.tempSettings.wikiFolder || 'wiki';
    return !!(
      this.app.vault.getAbstractFileByPath(`${wikiFolder}/entities`) &&
      this.app.vault.getAbstractFileByPath(`${wikiFolder}/concepts`) &&
      this.app.vault.getAbstractFileByPath(`${wikiFolder}/sources`) &&
      this.app.vault.getAbstractFileByPath(`${wikiFolder}/schema`)
    );
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    // ==========================================
    // 1. Language Settings
    // ==========================================

    new Setting(containerEl)
      .setName(this.getText('languageTitle'))
      .setDesc(this.getText('languageDesc'))
      .addDropdown(dropdown => {
        // v1.22.0: use WIKI_LANGUAGES (BCP-47 → native name) as the single
        // source of truth for BOTH dropdowns. Previously the Interface
        // Language dropdown hardcoded 9 `addOption('xx', getText('languageXxx'))`
        // lines, which (a) required manual sync when a locale was added, and
        // (b) could show locale-translated labels (e.g. '日文') that didn't
        // match the canonical name used in Wiki Output Language. Sharing
        // WIKI_LANGUAGES means a single edit covers both dropdowns and every
        // label is the language's own native name — same convention as
        // BCP-47 + IANA subtag registry.
        for (const [key, label] of Object.entries(WIKI_LANGUAGES)) {
          dropdown.addOption(key, label);
        }
        dropdown.setValue(this.tempSettings.language);
        dropdown.onChange((value: 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt' | 'it') => {
          this.tempSettings.language = value;
          this.display();
        });
      })
      .addButton(button => button
        .setButtonText(this.getText('saveButton'))
        .setCta()
        .onClick(() => {
          void (async () => {
            this.commitTempSettings();
            await this.plugin.saveSettings();
            new Notice(this.getText('savedNotice'), NOTICE_SHORT);
          })();
        }));

    // ==========================================
    // 2. Wiki Output Language
    // ==========================================
    new Setting(containerEl).setName(this.getText('wikiLanguageName')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('wikiLanguageName'))
      .setDesc(this.getText('wikiLanguageDesc'))
      .addDropdown(dropdown => {
        for (const [key, label] of Object.entries(WIKI_LANGUAGES)) dropdown.addOption(key, label);
        dropdown.addOption('__custom__', this.getText('customWikiLanguageOption'));
        // Priority: if custom mode is active, show '__custom__' regardless of wikiLanguage value
        if (this.tempSettings.useCustomWikiLanguage) {
          dropdown.setValue('__custom__');
        } else {
          const currentLang = this.tempSettings.wikiLanguage;
          if (currentLang && WIKI_LANGUAGES[currentLang]) dropdown.setValue(currentLang);
          else if (currentLang) dropdown.setValue('__custom__');
          else dropdown.setValue('en');
        }
        dropdown.onChange((value: string) => {
          if (value === '__custom__') {
            this.tempSettings.useCustomWikiLanguage = true;
            // Keep existing wikiLanguage value for display in custom input, or clear if it was a standard language
            if (WIKI_LANGUAGES[this.tempSettings.wikiLanguage || '']) {
              this.tempSettings.wikiLanguage = '';
            }
          } else {
            this.tempSettings.wikiLanguage = value;
            this.tempSettings.useCustomWikiLanguage = false;
          }
          this.display();
        });
      });

    if (this.tempSettings.useCustomWikiLanguage) {
      new Setting(containerEl)
        .setName(this.getText('wikiLanguageName') + ' (Custom)')
        .setDesc(this.getText('customWikiLanguageHint'))
        .addText(text => text
          .setPlaceholder(this.getText('customWikiLanguagePlaceholder'))
          .setValue(this.tempSettings.wikiLanguage && !WIKI_LANGUAGES[this.tempSettings.wikiLanguage] ? this.tempSettings.wikiLanguage : '')
          .onChange((value) => { this.tempSettings.wikiLanguage = value.trim(); }));
    }

    // ==========================================
    // 2.5 LLM-Wiki Status indicators (inline, before LLM Configuration)
    // ==========================================
    const readyStatus = this.tempSettings.llmReady
      ? '✅ ' + (this.getText('statusReady') || 'Ready')
      : '⚠️ ' + (this.getText('statusNotReady') || 'Not configured — please complete setup below');
    const clientStatus = this.plugin.llmClient ? this.getText('statusInitialized') : this.getText('statusNotInitialized');
    const wikiInitCheck = this.isWikiInitialized();
    const wikiInitStatus = wikiInitCheck
      ? '✅ ' + (this.getText('wikiInitStatusReady') || 'Wiki initialized')
      : '⚠️ ' + (this.getText('wikiInitStatusNotReady') || 'Wiki not initialized — will auto-create on first ingestion');

    // Use a Setting row with description for native Obsidian styling (matches other settings)
    new Setting(containerEl)
      .setName(this.getText('llmWikiStatusSection'))
      .setDesc(`${readyStatus} | ${clientStatus}  •  ${wikiInitStatus}`);

    // ==========================================
    // 3. LLM Provider (highest priority — must configure first)
    // ==========================================
    new Setting(containerEl).setName(this.getText('providerSection')).setHeading();

    const providerConfig = PREDEFINED_PROVIDERS[this.tempSettings.provider];
    const isOllama = this.tempSettings.provider === 'ollama';
    const isLmStudio = this.tempSettings.provider === 'lmstudio';
    const isCodex = this.tempSettings.provider === 'openai-codex';
    if (isCodex) applyCodexModelPolicy(this.tempSettings);
    const isBedrock = this.tempSettings.provider === 'bedrock-anthropic'
      || this.tempSettings.provider === 'bedrock-openai';

    // Provider Dropdown
    new Setting(containerEl)
      .setName(this.getText('providerName'))
      .setDesc(this.getText('providerDesc'))
      .addDropdown(dropdown => {
        Object.values(PREDEFINED_PROVIDERS).forEach(config => {
          // Provider name i18n: use nameZh for Chinese, nameEn for all other languages.
          // English provider names (Anthropic, OpenAI, DeepSeek, etc.) are international
          // technical conventions — no per-language translation needed.
          const lang = this.tempSettings.language;
          const displayName = lang === 'zh' ? config.nameZh : config.nameEn;
          dropdown.addOption(config.id, displayName);
        });
        dropdown.setValue(this.tempSettings.provider);
        dropdown.onChange((value) => {
          this.tempSettings.provider = value;
          this.tempSettings.llmReady = false;
          this.tempSettings.availableModels = [];
          this.tempSettings.useCustomModel = false;
          this.tempSettings.model = '';
          const config = PREDEFINED_PROVIDERS[value];
          if (config && value !== 'custom') this.tempSettings.baseUrl = config.baseUrl;
          if (value === 'openai-codex') applyCodexModelPolicy(this.tempSettings);
          // Reset stale PDF escape-hatch state when switching to a native-PDF provider.
          if ((NATIVE_PDF_PROVIDER_IDS as readonly string[]).includes(value)) {
            this.tempSettings.forcePdfSupport = false;
          }
          this.display();
        });
      });

    // API Key
    if (isCodex) {
      const isSignedIn = this.plugin.codexAuthManager?.hasCredential() === true;
      const authState = getCodexAuthUiState({ isDesktop: !Platform.isMobile, isSignedIn, isBusy: this.codexAuthBusy });
      const status = this.codexAuthBusy ? this.getText('codexAuthBusy') : authState.showSignOut ? this.getText('codexAuthSignedIn') : this.getText('codexAuthSignedOut');
      const authSetting = new Setting(containerEl).setName(this.getText('codexAuthName')).setDesc(`${this.getText('codexAuthDesc')} ${this.getText('codexAuthExperimental')} ${status}`);
      if (authState.showBrowser) authSetting.addButton(button => button.setButtonText(this.getText('codexAuthBrowserButton')).onClick(() => { void this.loginOpenAICodexBrowser(); }));
      if (authState.showDevice) authSetting.addButton(button => button.setButtonText(this.getText('codexAuthDeviceButton')).onClick(() => { void this.loginOpenAICodexDevice(); }));
      if (authState.showSignOut) authSetting.addButton(button => button.setButtonText(this.getText('codexAuthSignOutButton')).setWarning().onClick(() => { void this.signOutOpenAICodex(); }));
      if (isSignedIn) new Setting(containerEl).setName(this.getText('codexModelsRefreshName')).setDesc(this.getText('codexModelsRefreshDesc')).addButton(button => button.setButtonText(this.codexAuthBusy ? this.getText('codexModelsRefreshing') : this.getText('codexModelsRefreshButton')).setDisabled(this.codexAuthBusy).onClick(() => { void this.refreshOpenAICodexModels(true, true); }));
      if (this.codexDevicePrompt) {
        const prompt = this.codexDevicePrompt;
        new Setting(containerEl).setName(this.getText('codexAuthDeviceInstructions').replace('{}', prompt.userCode)).setDesc(prompt.verificationUrl).addButton(button => button.setButtonText(this.getText('codexAuthCopyCode')).onClick(() => { void this.copyOpenAICodexDeviceCode(); })).addButton(button => button.setButtonText(this.getText('cancelButton')).setWarning().onClick(() => { prompt.cancel(); }));
      }
      if (isSignedIn) this.queueStaleCodexModelRefresh();
    } else if (!isOllama && !isLmStudio) {
      new Setting(containerEl)
        .setName(this.getText('apiKeyName'))
        .setDesc(this.getText('apiKeyDesc'))
        .addText(text => {
          text.setPlaceholder(this.getText('apiKeyPlaceholder'))
            .setValue(this.tempSettings.apiKey)
            .onChange((value) => { this.tempSettings.apiKey = value; this.tempSettings.llmReady = false; });
          text.inputEl.type = 'password';
        });
    } else if (isLmStudio) {
      containerEl.createEl('p', {
        text: this.getText('lmstudioHint'),
        cls: 'llm-wiki-ollama-hint'
      });
    } else {
      containerEl.createEl('p', {
        text: this.getText('ollamaHint'),
        cls: 'llm-wiki-ollama-hint'
      });
    }

    // Base URL
    if (this.tempSettings.provider === 'custom' || this.tempSettings.provider === 'anthropic-compatible' || (providerConfig && this.tempSettings.baseUrl !== providerConfig.baseUrl)) {
      new Setting(containerEl)
        .setName(this.getText('baseUrlName'))
        .setDesc(this.tempSettings.provider === 'custom' || this.tempSettings.provider === 'anthropic-compatible'
          ? this.getText('baseUrlDescCustom') : this.getText('baseUrlDescOverride'))
        .addText(text => text
          .setPlaceholder(providerConfig?.baseUrl || 'https://api.example.com/v1')
          .setValue(this.tempSettings.baseUrl)
          .onChange((value) => { this.tempSettings.baseUrl = value; this.tempSettings.llmReady = false; }));
    }

    // v1.24.1 PATCH Bedrock Stage 1 — region selector (only when provider
    // is one of the two bedrock-* ids). Region drives the baseURL the
    // factory resolves; the user does NOT edit baseURL for Bedrock.
    if (isBedrock) {
      const currentRegion = this.tempSettings.bedrockRegion || BEDROCK_DEFAULT_REGION;
      new Setting(containerEl)
        .setName(this.getText('bedrockRegionName'))
        .setDesc(`${this.getText('bedrockRegionDesc')} ${this.getText('bedrockRegionHint')}`)
        .addDropdown(dropdown => {
          BEDROCK_REGIONS.forEach(region => {
            dropdown.addOption(region, region);
          });
          dropdown.setValue(currentRegion);
          dropdown.onChange((value) => {
            // Region change alters the resolved baseURL → models fetched
            // for the previous region are now stale (mirror the provider
            // dropdown's reset).
            this.tempSettings.bedrockRegion = value;
            this.tempSettings.llmReady = false;
            this.tempSettings.availableModels = [];
            this.tempSettings.useCustomModel = false;
            this.tempSettings.model = '';
          });
        });
    }

    // LLM execution controls (concurrency + batch delay) — Issue #81 layout refactor
    // Page Generation Concurrency
    const concurrencyValue = this.tempSettings.pageGenerationConcurrency ?? 3;
    const concurrencyDesc = concurrencyValue === 1
      ? this.getText('concurrencyValueSingular').replace('{}', String(concurrencyValue))
      : this.getText('concurrencyValuePlural').replace('{}', String(concurrencyValue));

    let concurrencySetting: Setting;
    new Setting(containerEl)
      .setName(this.getText('pageGenerationConcurrencyName'))
      .setDesc(this.getText('pageGenerationConcurrencyDesc') + ' ' + concurrencyDesc)
      .addSlider(slider => slider
        .setLimits(1, 5, 1)
        .setValue(concurrencyValue)
        .setDynamicTooltip()
        .onChange((value) => {
          this.tempSettings.pageGenerationConcurrency = value;
          const desc = value === 1
            ? this.getText('concurrencyValueSingular').replace('{}', String(value))
            : this.getText('concurrencyValuePlural').replace('{}', String(value));
          concurrencySetting.setDesc(this.getText('pageGenerationConcurrencyDesc') + ' ' + desc);
        }))
      .then(s => { concurrencySetting = s; });

    // Batch Delay
    const batchDelayValue = this.tempSettings.batchDelayMs ?? 300;
    let batchDelaySetting: Setting;
    new Setting(containerEl)
      .setName(this.getText('batchDelayName'))
      .setDesc(this.getText('batchDelayDesc').replace('{}', String(batchDelayValue)))
      .addSlider(slider => slider
        .setLimits(100, 2000, 50)
        .setValue(batchDelayValue)
        .setDynamicTooltip()
        .onChange((value) => {
          this.tempSettings.batchDelayMs = value;
          batchDelaySetting.setDesc(this.getText('batchDelayDesc').replace('{}', String(value)));
        }))
      .then(s => { batchDelaySetting = s; });

    // Model section
    new Setting(containerEl).setName(this.getText('modelSection')).setHeading();

    // Fetch Models button
    if (!isCodex) new Setting(containerEl)
      .setName(this.getText('fetchModelsName'))
      .setDesc(this.getText('fetchModelsDesc'))
      .addButton(button => button
        .setButtonText(this.getText('fetchModelsButton'))
        .onClick(async () => {
          button.setButtonText(this.getText('fetchingModels'));
          button.setDisabled(true);
          try {
            const apiKey = isOllama ? 'ollama' : this.tempSettings.apiKey.trim();
            const baseUrl = this.tempSettings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;

            // Smart filter based on provider: OpenRouter allows '/', Ollama allows ':'
            const getModelFilter = (provider: string) => {
              if (provider === 'openrouter') {
                return (id: string) => !id.includes(':'); // Keep '/', filter ':'
              } else if (provider === 'ollama') {
                return (id: string) => !id.includes('/'); // Keep ':', filter '/'
              } else {
                return (id: string) => !id.includes(':') && !id.includes('/'); // Filter both
              }
            };
            const modelFilter = getModelFilter(this.tempSettings.provider);

            // v1.23.0 P1.5: use fetchModelsWithFallback for all providers
            // (anthropic-compatible, openai-compatible, openai, anthropic).
            // Unified fallback handles missing /v1 suffix (Kimi Anthropic
            // case) — Test Connection and Fetch Models share the same
            // module-level cache, so a resolved URL from one path
            // applies to the other.
            const providerForFallback =
              this.tempSettings.provider === 'openai' ? 'openai' :
              this.tempSettings.provider === 'anthropic' ? 'anthropic' :
              this.tempSettings.provider as 'openai-compatible' | 'anthropic-compatible';

            const fetchOneUrl = async (modelsUrl: string): Promise<string[]> => {
              try {
                const response = await requestUrl({
                  url: modelsUrl,
                  method: 'GET',
                  headers: this.tempSettings.provider === 'anthropic' || this.tempSettings.provider === 'anthropic-compatible'
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
              this.tempSettings.provider === 'anthropic' ? 'https://api.anthropic.com/v1' :
              this.tempSettings.provider === 'openai' ? 'https://api.openai.com/v1' :
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

            this.tempSettings.availableModels = models.filter(modelFilter).sort();
            if (this.tempSettings.availableModels.length > 0) {
              new Notice(this.getText('fetchSuccess').replace('{}', this.tempSettings.availableModels.length.toString()), NOTICE_NORMAL);
              if (!this.tempSettings.model || !this.tempSettings.availableModels.includes(this.tempSettings.model)) {
                // v1.24.1 PATCH Phase 5.5.0 hotfix fix: route the auto-pick
                // through setFieldValue so the unified-model cascade fires
                // (clears stale per-task overrides). Previously this
                // direct assignment bypassed the cascade, leaving old
                // per-task model values pinned after Fetch Models.
                this.setFieldValue('model', this.tempSettings.availableModels[0]);
              }
              // Auto-switch from text input to dropdown on successful fetch
              this.tempSettings.useCustomModel = false;
            } else {
              new Notice(this.getText('fetchFailed'), NOTICE_NORMAL);
              this.tempSettings.useCustomModel = true;
            }
            this.display();
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const category = classifyFetchError(errorMsg);
            new Notice(this.getText(`fetchError${category}`), NOTICE_ERROR);
            this.tempSettings.useCustomModel = true;
            this.tempSettings.availableModels = [];
            this.display();
          }
          button.setButtonText(this.getText('fetchModelsButton'));
          button.setDisabled(false);
        }));

    // Model Selection — see renderModelField call below.
    // v1.24.0 #208 unified picker is rendered by the shared helper used
    // for all 4 model fields (model / ingestModel / lintModel / queryModel).
    // Sentinel mapping:
    //   unified:  '__custom__' → useCustomModel=true (switch to text input)
    //   per-task: '__unified__' → field = '' (fall back to settings.model)
    // Hidden per-task values are preserved on toggle off.

    // v1.24.0 #208: "Model Scope" dropdown — unified vs per-task mode.
    // In unified mode, only the unified model picker is shown.
    // In per-task mode, the unified picker re-labels to "Ingest model"
    // and 2 additional (lint + query) pickers render below.
    new Setting(containerEl)
      .setName(this.getText('modelTaskModeName'))
      .setDesc(this.getText('modelTaskModeDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('unified', this.getText('modelTaskModeUnified'));
        dropdown.addOption('per-task', this.getText('modelTaskModePerTask'));
        dropdown.setValue(resolveModelTaskUiMode(this.tempSettings));
        dropdown.onChange((value) => {
          const nextMode: ModelTaskUiMode = value === 'per-task' ? 'per-task' : 'unified';
          this.tempSettings.usePerTaskModels = nextMode === 'per-task';
          // v1.24.1 PATCH Phase 5.5.0 hotfix: bidirectional sync between
          // unified ↔ per-task modes.
          //
          // The previous behavior preserved per-task overrides across
          // mode switches (rationale: user might toggle back). This was
          // LOGICALLY WRONG: a per-task value silently overrides the
          // unified model even after the user explicitly chose unified
          // mode, producing a UI/value mismatch that the user couldn't
          // see without inspecting data.json.
          //
          // New rules (per user direction, 2026-07-13):
          //   1. per-task → unified: clear all 3 per-task overrides so
          //      every task falls back to the unified model. Optional
          //      safety: write the unified model value into the per-task
          //      fields directly (so even an out-of-band read sees the
          //      same value, no fallback indirection).
          //   2. unified → per-task: prefill all 3 per-task fields with
          //      the current unified model so the user sees consistent
          //      starting state and can edit per-task values from there.
          //   3. ANY model-field or provider change: set llmReady=false
          //      so the user is prompted to re-test the connection
          //      (instead of running with stale creds/model).
          if (nextMode === 'unified') {
            this.cascadeUnifiedModelChange();
          } else {
            this.prefillPerTaskFromUnified();
          }
          this.markLLMConfigStale();
          this.display(); // re-render to show/hide per-task pickers
        });
      });

    // Unified model picker — re-labeled as "Ingest model" when per-task
    // mode is active. Per-task lint/query pickers render only in per-task
    // mode. All 4 pickers share the same `renderModelField` helper.
    this.renderModelField(containerEl, 'model', {
      name: resolveModelTaskUiMode(this.tempSettings) === 'per-task'
        ? this.getText('perTaskIngestModelName')
        : this.getText('selectModelName'),
      desc: resolveModelTaskUiMode(this.tempSettings) === 'per-task'
        ? this.getText('perTaskIngestModelDesc')
        : this.getText('selectModelDesc').replace('{}', String(this.tempSettings.availableModels?.length ?? 0)),
      // Unified picker keeps "Custom input..." → switches to text mode.
      // Per-task picker keeps "__unified__" → falls back to settings.model.
      dropdownSentinel: '__custom__',
      dropdownSentinelLabel: this.getText('customInputOption'),
      allowCustom: !isCodex,
    });

    if (resolveModelTaskUiMode(this.tempSettings) === 'per-task') {
      // Lint + Query pickers (per-task only). Each carries its own
      // <field>UseCustom flag so dropdown↔input switching is independent
      // per field (no cross-talk with the unified picker).
      //
      // v1.24.0 #208 (UX fix): the sentinel option is `__custom__`
      // ("Custom input...") — IDENTICAL to the unified picker — NOT
      // `__unified__`. Picking it switches to a text input where the
      // user can type any model ID (including "leave blank to fall back
      // to settings.model"). The "use unified model" semantic is
      // expressed by *leaving the text input empty*, not by a separate
      // sentinel option. One dropdown shape across all 4 fields.
      this.renderModelField(containerEl, 'lintModel', {
        name: this.getText('perTaskLintModelName'),
        desc: this.getText('perTaskLintModelDesc'),
        dropdownSentinel: '__custom__',
        dropdownSentinelLabel: this.getText('customInputOption'),
        allowCustom: !isCodex,
      });
      this.renderModelField(containerEl, 'queryModel', {
        name: this.getText('perTaskQueryModelName'),
        desc: this.getText('perTaskQueryModelDesc'),
        dropdownSentinel: '__custom__',
        dropdownSentinelLabel: this.getText('customInputOption'),
        allowCustom: !isCodex,
      });
    }

    // Issue #75: max tokens per call — shown for local/custom providers only

    // Issue #75: max tokens per call — shown for local/custom providers only Issue #75: max tokens per call — shown for local/custom providers only
    const localLikeProviders = ['ollama', 'lmstudio', 'custom', 'anthropic-compatible'];
    if (localLikeProviders.includes(this.tempSettings.provider)) {
      const tokenOptions = [0, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576];
      const tokenLabels = ['0 (No limit)', '4K', '8K', '16K', '32K', '64K', '128K', '256K', '512K', '1M'];
      const currentVal = this.tempSettings.maxTokensPerCall ?? 0;
      new Setting(containerEl)
        .setName(this.getText('maxTokensPerCallName'))
        .setDesc(this.getText('maxTokensPerCallDesc'))
        .addDropdown(dropdown => {
          tokenOptions.forEach((val, idx) => {
            dropdown.addOption(String(val), tokenLabels[idx]);
          });
          dropdown.setValue(String(currentVal));
          dropdown.onChange((value) => {
            this.tempSettings.maxTokensPerCall = parseInt(value);
          });
        });
    }

    // Advanced LLM settings — hidden behind a Default/Custom dropdown
    // v1.20.0 inverted semantics: default mode = no provider-specific
    // overrides (provider decides its own behavior). Custom mode = user
    // explicitly opts in to disable thinking / temperature / repetition
    // penalty overrides.
    new Setting(containerEl)
      .setName(this.getText('advancedSettingsModeName'))
      .setDesc(this.getText('advancedSettingsModeDesc'))
      .addDropdown(dropdown => {
        dropdown
          .addOption('default', this.getText('advancedSettingsDefault'))
          .addOption('custom', this.getText('advancedSettingsCustom'))
          .setValue(this.tempSettings.advancedSettingsMode || 'default')
          .onChange((value: string) => {
            this.tempSettings.advancedSettingsMode = value as 'default' | 'custom';
            if (value === 'default') {
              // Default mode: no overrides — provider decides its own behavior
              this.tempSettings.disableThinking = false;
              this.tempSettings.extractionTemperature = undefined;
              this.tempSettings.chatTemperature = undefined;
              this.tempSettings.repetitionPenalty = undefined;
              // v1.25.0 PR3: reset forcePdfSupport — it's rendered only inside
              // the Advanced block, so hiding the block without resetting
              // the value would leave users with a no-UI-affordance setting.
              this.tempSettings.forcePdfSupport = false;
              // writePdfMarkdownToVault lives in Wiki Configuration (always
              // visible) and is NOT reset here.
            }
            this.display();
          });
      });

    if (this.tempSettings.advancedSettingsMode === 'custom') {
    new Setting(containerEl)
      .setName(this.getText('disableThinkingName'))
      .setDesc(this.getText('disableThinkingDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.disableThinking === true)
        .onChange((value) => {
          // v1.20.0: opt-in. When enabled, the LLM client walks the 3-tier
          // dialect fallback (anthropic → openai → none) on 400.
          this.tempSettings.disableThinking = value;
        }));

    new Setting(containerEl)
      .setName(this.getText('extractionTemperatureName'))
      .setDesc(this.getText('extractionTemperatureDesc'))
      .addText(text => {
        text
          .setPlaceholder(this.getText('temperaturePlaceholder'))
          .setValue(this.tempSettings.extractionTemperature?.toString() ?? '')
          .onChange((value) => {
            const trimmed = value.trim();
            if (trimmed === '') {
              this.tempSettings.extractionTemperature = undefined;
            } else {
              const parsed = parseFloat(trimmed);
              if (!isNaN(parsed)) {
                this.tempSettings.extractionTemperature = parsed;
              }
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '0';
        text.inputEl.max = '2';
        text.inputEl.step = '0.05';
        text.inputEl.classList.add('llm-wiki-number-input');
      });

    new Setting(containerEl)
      .setName(this.getText('chatTemperatureName'))
      .setDesc(this.getText('chatTemperatureDesc'))
      .addText(text => {
        text
          .setPlaceholder(this.getText('temperaturePlaceholder'))
          .setValue(this.tempSettings.chatTemperature?.toString() ?? '')
          .onChange((value) => {
            const trimmed = value.trim();
            if (trimmed === '') {
              this.tempSettings.chatTemperature = undefined;
            } else {
              const parsed = parseFloat(trimmed);
              if (!isNaN(parsed)) {
                this.tempSettings.chatTemperature = parsed;
              }
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '0';
        text.inputEl.max = '2';
        text.inputEl.step = '0.05';
        text.inputEl.classList.add('llm-wiki-number-input');
      });

    new Setting(containerEl)
      .setName(this.getText('repetitionPenaltyName'))
      .setDesc(this.getText('repetitionPenaltyDesc'))
      .addText(text => {
        text
          .setPlaceholder(this.getText('temperaturePlaceholder'))
          .setValue(this.tempSettings.repetitionPenalty?.toString() ?? '')
          .onChange((value) => {
            const trimmed = value.trim();
            if (trimmed === '') {
              this.tempSettings.repetitionPenalty = undefined;
            } else {
              const parsed = parseFloat(trimmed);
              if (!isNaN(parsed)) {
                this.tempSettings.repetitionPenalty = parsed;
              }
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '0';
        text.inputEl.max = '2';
        text.inputEl.step = '0.05';
        text.inputEl.classList.add('llm-wiki-number-input');
      });

    // v1.25.0 PR3: PDF force-support toggle — universal escape hatch.
    // Gated by Advanced mode (default off; user must opt into Custom to see).
    // Renders for ANY non-native provider (custom / anthropic-compatible /
    // ollama / lmstudio / deepseek / glm / kimi / gemini / openrouter).
    // When the user opts in, the converter attempts the LLM call; if the
    // endpoint rejects PDF input, the error propagates as a localized
    // `sourceRejectedPdfUnsupported` Notice guiding the user to disable
    // the toggle or check their endpoint. Native-PDF providers
    // (anthropic / openai / bedrock-*) hide this toggle since they
    // already route through the native branch.
    if (!(NATIVE_PDF_PROVIDER_IDS as readonly string[]).includes(this.tempSettings.provider)) {
      new Setting(containerEl)
        .setName(this.getText('forcePdfSupportName'))
        .setDesc(this.getText('forcePdfSupportDesc'))
        .addToggle(toggle => toggle
          .setValue(this.tempSettings.forcePdfSupport === true)
          .onChange((value) => { this.tempSettings.forcePdfSupport = value; }));
    }
    }

    // Test Connection
    new Setting(containerEl)
      .setName(this.getText('testConnectionName'))
      .setDesc(this.getText('testConnectionDesc'))
      .addButton(button => button
        .setButtonText(this.getText('testButton'))
        .onClick(async () => {
          button.setButtonText(this.getText('testing'));
          button.setDisabled(true);
          const testSettings = { ...this.tempSettings };
          const oldSettings = this.plugin.settings;
          this.plugin.settings = testSettings;
          this.plugin.initializeLLMClient();
          this.plugin.wikiEngine?.updateSettings(testSettings);
          const result = await this.plugin.testLLMConnection();
          if (!result.success) {
            // Restore live settings on test failure — do not persist broken config
            if (testSettings.provider === 'openai-codex') {
              preserveCodexRuntimeModelState(oldSettings, this.plugin.settings);
              preserveCodexRuntimeModelState(this.tempSettings, this.plugin.settings);
            }
            this.plugin.settings = oldSettings;
            this.plugin.initializeLLMClient();
            this.plugin.wikiEngine?.updateSettings(oldSettings);
            await this.plugin.saveSettings();
          } else {
            // Issue #137: on test success, sync every field testLLMConnection
            // may have written back into tempSettings so that the auto-save
            // on tab close (and any later explicit Save click) preserves them.
            // v1.23.0: thinkingControlCache is @deprecated (AI-SDK v6
            // handles internally) but we still sync it here in case
            // legacy code paths mutate it.
            this.tempSettings.thinkingControlCache = this.plugin.settings.thinkingControlCache;
            if (this.plugin.settings.provider === 'openai-codex') {
              this.syncCodexModelsFromPlugin();
              this.tempSettings.model = this.plugin.settings.model;
              this.tempSettings.ingestModel = this.plugin.settings.ingestModel;
              this.tempSettings.lintModel = this.plugin.settings.lintModel;
              this.tempSettings.queryModel = this.plugin.settings.queryModel;
            }
            // v1.24.1 PATCH Phase 5.5.0 hotfix: commit + persist immediately
            // on Test Connection success. Previously the test only synced
            // a couple of probe-mutated fields (thinkingControlCache) into
            // tempSettings; the user had to click Save (or close the tab to
            // trigger hide() auto-save) before the new model became the
            // live one. That mismatch caused confusion: the Settings UI
            // showed the new model, but LLM calls still used the old model
            // because plugin.settings.model hadn't been written.
            //
            // On success: commitTempSettings propagates the temp (already
            // updated to the new model by the user's earlier edit) into
            // plugin.settings; saveData() persists it to disk so the
            // settings survive an Obsidian restart; initializeLLMClient()
            // rebuilds the live client with the new model so subsequent
            // queries/ingest calls use it without waiting for the user
            // to click Save. Failure path above already rolls back, so
            // this only fires on verified-good config.
            this.commitTempSettings();
            await this.plugin.saveSettings();
          }
          this.tempSettings.llmReady = result.success;
          button.setButtonText(this.getText('testButton'));
          button.setDisabled(false);
          this.display();
          new Notice(result.message, result.success ? NOTICE_NORMAL : NOTICE_ERROR);
        }));

    // ==========================================
    // 4. Wiki Configuration
    // ==========================================
    new Setting(containerEl).setName(this.getText('wikiSection')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('wikiFolderName'))
      .setDesc(this.getText('wikiFolderDesc'))
      .addText(text => text
        .setPlaceholder(this.getText('wikiFolderPlaceholder'))
        .setValue(this.tempSettings.wikiFolder)
        .onChange((value) => { this.tempSettings.wikiFolder = value; }));

    // v1.25.0 PR3: opt-in sidecar write. Lives under Wiki Configuration
    // (alongside wikiFolder / slugCase) because it controls where converted
    // PDF markdown lands on disk — a vault-storage decision, not an LLM
    // configuration decision. Always visible (not gated by Advanced).
    new Setting(containerEl)
      .setName(this.getText('writePdfMarkdownToVaultName'))
      .setDesc(this.getText('writePdfMarkdownToVaultDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.writePdfMarkdownToVault === true)
        .onChange((value) => { this.tempSettings.writePdfMarkdownToVault = value; }));

    new Setting(containerEl)
      .setName(this.getText('slugCaseName'))
      .setDesc(this.getText('slugCaseDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('lower', this.getText('slugCaseLower'));
        dropdown.addOption('preserve', this.getText('slugCasePreserve'));
        dropdown.setValue(this.tempSettings.slugCase || 'lower');
        dropdown.onChange((value: string) => {
          this.tempSettings.slugCase = value as 'lower' | 'preserve';
        });
      });

    // Granularity setting with conditional custom inputs
    let customEntitySetting: Setting | null = null;
    let customConceptSetting: Setting | null = null;

    const updateCustomVisibility = (value: string) => {
      const isCustom = value === 'custom';
      if (customEntitySetting) {
        customEntitySetting.settingEl.style.display = isCustom ? 'flex' : 'none';
      }
      if (customConceptSetting) {
        customConceptSetting.settingEl.style.display = isCustom ? 'flex' : 'none';
      }
    };

    new Setting(containerEl)
      .setName(this.getText('extractionGranularityName'))
      .setDesc(this.getText('extractionGranularityDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('fine', this.getText('extractionGranularityFine'));
        dropdown.addOption('standard', this.getText('extractionGranularityStandard'));
        dropdown.addOption('coarse', this.getText('extractionGranularityCoarse'));
        dropdown.addOption('minimal', this.getText('extractionGranularityMinimal'));
        dropdown.addOption('custom', this.getText('extractionGranularityCustom'));
        dropdown.setValue(this.tempSettings.extractionGranularity || 'standard');
        dropdown.onChange((value: string) => {
          this.tempSettings.extractionGranularity = value as 'fine' | 'standard' | 'coarse' | 'minimal' | 'custom';
          updateCustomVisibility(value);
        });
      });

    // Custom entity limit (shown only when custom is selected)
    customEntitySetting = new Setting(containerEl)
      .setName(this.getText('customEntityLimitName'))
      .setDesc(this.getText('customEntityLimitDesc'))
      .addText(text => {
        text
          .setPlaceholder('5')
          .setValue(String(this.tempSettings.customEntityLimit ?? 5))
          .onChange((value) => {
            const parsed = parseInt(value);
            if (parsed > CUSTOM_LIMIT_MAX) {
              this.tempSettings.customEntityLimit = CUSTOM_LIMIT_MAX;
              text.setValue(String(CUSTOM_LIMIT_MAX));
              new Notice(this.getText('numberRangeClamped').replace('{}', String(CUSTOM_LIMIT_MAX)), NOTICE_SHORT);
            } else if (parsed < CUSTOM_LIMIT_MIN) {
              this.tempSettings.customEntityLimit = CUSTOM_LIMIT_MIN;
              text.setValue(String(CUSTOM_LIMIT_MIN));
              new Notice(this.getText('numberRangeClamped').replace('{}', String(CUSTOM_LIMIT_MIN)), NOTICE_SHORT);
            } else if (!isNaN(parsed)) {
              this.tempSettings.customEntityLimit = parsed;
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = String(CUSTOM_LIMIT_MIN);
        text.inputEl.max = String(CUSTOM_LIMIT_MAX);
        text.inputEl.classList.add('llm-wiki-number-input');
      });
    customEntitySetting.settingEl.style.display =
      this.tempSettings.extractionGranularity === 'custom' ? 'flex' : 'none';

    // Custom concept limit (shown only when custom is selected)
    customConceptSetting = new Setting(containerEl)
      .setName(this.getText('customConceptLimitName'))
      .setDesc(this.getText('customConceptLimitDesc'))
      .addText(text => {
        text
          .setPlaceholder('5')
          .setValue(String(this.tempSettings.customConceptLimit ?? 5))
          .onChange((value) => {
            const parsed = parseInt(value);
            if (parsed > CUSTOM_LIMIT_MAX) {
              this.tempSettings.customConceptLimit = CUSTOM_LIMIT_MAX;
              text.setValue(String(CUSTOM_LIMIT_MAX));
              new Notice(this.getText('numberRangeClamped').replace('{}', String(CUSTOM_LIMIT_MAX)), NOTICE_SHORT);
            } else if (parsed < CUSTOM_LIMIT_MIN) {
              this.tempSettings.customConceptLimit = CUSTOM_LIMIT_MIN;
              text.setValue(String(CUSTOM_LIMIT_MIN));
              new Notice(this.getText('numberRangeClamped').replace('{}', String(CUSTOM_LIMIT_MIN)), NOTICE_SHORT);
            } else if (!isNaN(parsed)) {
              this.tempSettings.customConceptLimit = parsed;
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = String(CUSTOM_LIMIT_MIN);
        text.inputEl.max = String(CUSTOM_LIMIT_MAX);
        text.inputEl.classList.add('llm-wiki-number-input');
      });
    customConceptSetting.settingEl.style.display =
      this.tempSettings.extractionGranularity === 'custom' ? 'flex' : 'none';

    // Issue #85 v2: Tag Vocabulary (chip input UX, no separate heading)
    // The single setting below fuses the previously-separate name
    // ("Tag Vocabulary") and the mode-toggle row. The desc text is
    // dynamic: default mode shows the concrete default list inline;
    // custom mode is terse. Both modes prefix the same lead sentence
    // that explains what tag vocabulary is.
    let customEntityTagsSetting: Setting | null = null;
    let customConceptTagsSetting: Setting | null = null;

    const updateTagVocabularyVisibility = (mode: 'default' | 'custom') => {
      const isCustom = mode === 'custom';
      if (customEntityTagsSetting) {
        customEntityTagsSetting.settingEl.style.display = isCustom ? 'flex' : 'none';
      }
      if (customConceptTagsSetting) {
        customConceptTagsSetting.settingEl.style.display = isCustom ? 'flex' : 'none';
      }
    };

    // v1.21.0 Phase 1.4: Settings UI description should reflect the active
    // vocabulary, not just the hardcoded defaults. When the user has typed
    // custom tags but hasn't yet toggled to Custom mode, show them in the
    // Default-mode description as a preview (avoids the "settings UI drift"
    // found in the v1.21.0 Schema audit).
    const customEntities = (this.tempSettings.customEntityTags ?? '').trim();
    const customConcepts = (this.tempSettings.customConceptTags ?? '').trim();
    const hasCustomInput = customEntities.length > 0 || customConcepts.length > 0;
    // Effective list shows user values whenever they've been typed,
    // regardless of mode. The activation hint clarifies if the mode
    // hasn't been switched yet (avoids Settings UI / runtime drift).
    const effectiveEntityTags = customEntities.length > 0
      ? customEntities.split(',').map(t => t.trim()).filter(Boolean)
      : VALID_ENTITY_TAGS;
    const effectiveConceptTags = customConcepts.length > 0
      ? customConcepts.split(',').map(t => t.trim()).filter(Boolean)
      : VALID_CONCEPT_TAGS;
    const effectiveListDesc = hasCustomInput
      ? `${effectiveEntityTags.join(', ')} (entities) / ${effectiveConceptTags.join(', ')} (concepts)${this.tempSettings.tagVocabularyMode === 'default' ? ' — custom values shown above (toggle to Custom to activate)' : ''}`
      : `${VALID_ENTITY_TAGS.join(', ')} (entities) / ${VALID_CONCEPT_TAGS.join(', ')} (concepts)`;
    const leadDesc = this.getText('tagVocabularyInlineDesc');
    const modeDesc = this.tempSettings.tagVocabularyMode === 'custom'
      ? `${leadDesc}\n${this.getText('tagVocabularyModeDescCustom')}`
      : `${leadDesc}\n${this.getText('tagVocabularyModeDescDefault').replace('{}', effectiveListDesc)}`;

    new Setting(containerEl)
      .setName(this.getText('tagVocabularyModeName'))
      .setDesc(modeDesc)
      .addDropdown(dropdown => {
        dropdown
          .addOption('default', this.getText('tagVocabularyModeDefault'))
          .addOption('custom', this.getText('tagVocabularyModeCustom'))
          .setValue(this.tempSettings.tagVocabularyMode || 'default')
          .onChange((value: string) => {
            this.tempSettings.tagVocabularyMode = value as 'default' | 'custom';
            // Re-render so the desc text refreshes and chip inputs re-init.
            this.display();
          });
      });

    customEntityTagsSetting = new Setting(containerEl)
      .setName(this.getText('customEntityTagsName'))
      .setDesc(this.getText('customEntityTagsDesc'))
      .addComponent(el => new TagChipInputComponent({
        controlEl: el,
        initialTags: this.tempSettings.customEntityTags || '',
        placeholder: this.getText('customEntityTagsPlaceholder'),
        ariaLabel: this.getText('customEntityTagsName'),
        duplicateHint: this.getText('chipDuplicateHint'),
        defaultTags: VALID_ENTITY_TAGS,
        onChange: (csv) => { this.tempSettings.customEntityTags = csv; },
      }) as unknown as BaseComponent);

    customConceptTagsSetting = new Setting(containerEl)
      .setName(this.getText('customConceptTagsName'))
      .setDesc(this.getText('customConceptTagsDesc'))
      .addComponent(el => new TagChipInputComponent({
        controlEl: el,
        initialTags: this.tempSettings.customConceptTags || '',
        placeholder: this.getText('customConceptTagsPlaceholder'),
        ariaLabel: this.getText('customConceptTagsName'),
        duplicateHint: this.getText('chipDuplicateHint'),
        defaultTags: VALID_CONCEPT_TAGS,
        onChange: (csv) => { this.tempSettings.customConceptTags = csv; },
      }) as unknown as BaseComponent);

    updateTagVocabularyVisibility(this.tempSettings.tagVocabularyMode || 'default');

    // Max Conversation History — Issue #244 manual fix: switched from a free-form
// text input (clamped to 1–50) to a dropdown of common presets (1/10/30/50/100/500).
// The soft-cap behavior is unchanged: when history exceeds the limit during a
// multi-turn conversation, the oldest messages are dropped (see query-engine.ts
// history trim logic). The preset values let power users opt into much longer
// context windows without typing arbitrary numbers.
    new Setting(containerEl)
      .setName(this.getText('maxConversationHistoryName'))
      .setDesc(this.getText('maxConversationHistoryDesc'))
      .addDropdown(dropdown => {
        const presets = [1, 10, 30, 50, 100, 500];
        for (const n of presets) {
          dropdown.addOption(n.toString(), n.toString());
        }
        // Default to current value, but fall back to 50 if it's a legacy
        // value not in the preset list (e.g. user typed 25 pre-update).
        const current = this.tempSettings.maxConversationHistory;
        const currentStr = presets.includes(current) ? current.toString() : '50';
        dropdown.setValue(currentStr);
        dropdown.onChange((value) => {
          const parsed = parseInt(value);
          if (!isNaN(parsed) && parsed >= 1) {
            this.tempSettings.maxConversationHistory = parsed;
          }
        });
      });

    // Schema Management
    new Setting(containerEl)
      .setName(this.getText('schemaSection'))
      .setDesc(this.getText('enableSchemaDesc'))
      .addButton(button => button
        .setButtonText(this.getText('viewSchemaButton'))
        .onClick(() => {
          const schemaPath = `${this.tempSettings.wikiFolder}/schema/config.md`;
          const file = this.app.vault.getAbstractFileByPath(schemaPath);
          if (file instanceof TFile) void this.app.workspace.getLeaf().openFile(file);
          else new Notice(this.getText('schemaNotFoundNotice'), NOTICE_NORMAL);
        }))
      .addButton(button => button
        .setButtonText(this.getText('regenerateSchemaButton'))
        .onClick(async () => {
          try {
            // Ensure wiki structure exists before regenerating schema
            if (!this.isWikiInitialized()) {
              await this.plugin.wikiEngine.ensureWikiStructure();
            }
            await this.plugin.wikiEngine.regenerateDefaultSchema();
            new Notice(this.getText('schemaRegeneratedNotice'), NOTICE_SHORT);
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            new Notice(`${this.getText('schemaRegenerateFailed') || 'Schema generation failed'}: ${msg}`, NOTICE_ERROR);
          }
        }));

    // Ingestion History (#122) — sits inside Wiki Configuration (next to Schema
    // Management) because it reads wiki/log.md, a wiki-internal artifact. Same
    // visual style as its neighbors: name + desc + button, no emoji on the name.
    new Setting(containerEl)
      .setName(this.getText('historyButton'))
      .setDesc(this.getText('historyButtonDesc'))
      .addButton(button => button
        .setButtonText(this.getText('historyButtonOpen'))
        .onClick(() => {
          new HistoryModal(this.app, {
            language: this.tempSettings.language,
            wikiFolder: this.tempSettings.wikiFolder || 'wiki',
          }).open();
        }));

    // ==========================================
    // 5. Auto Maintenance
    // ==========================================
    new Setting(containerEl).setName(this.getText('autoMaintainSection')).setHeading();

    // 5.0 Startup quick fixes (Issue #81, refined v1.23.0) — first item in this section.
    // v1.23.0: the `startupCheck` toggle is gone. The pipeline always runs;
    // the user-facing control is now a "show result Notice" dropdown
    // (silent / visible). Old users with `startupCheck: false` on disk
    // were auto-migrated to 'silent' (see applySettingsMigrations).
    new Setting(containerEl)
      .setName(this.getText('startupCheckNoticeLevelName'))
      .setDesc(this.getText('startupCheckNoticeLevelDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('visible', this.getText('startupCheckNoticeVisible'))
        .addOption('silent', this.getText('startupCheckNoticeSilent'))
        .setValue(this.tempSettings.startupCheckNoticeLevel)
        .onChange((value: 'visible' | 'silent') => { this.tempSettings.startupCheckNoticeLevel = value; }));

    const betaDiv = containerEl.createDiv({
      cls: 'llm-wiki-blue-infobox'
    });
    betaDiv.setText('🧪 ' + this.getText('autoMaintainBetaBadge'));

    const warningDiv = containerEl.createDiv({
      cls: 'llm-wiki-yellow-infobox'
    });
    warningDiv.setText(this.getText('autoMaintainCostWarning'));

    new Setting(containerEl)
      .setName(this.getText('autoWatchName'))
      .setDesc(this.getText('autoWatchDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.autoWatchSources)
        .onChange((value) => { this.tempSettings.autoWatchSources = value; this.display(); }));

    if (this.tempSettings.autoWatchSources) {
      if (!this.tempSettings.watchedFolders) this.tempSettings.watchedFolders = [];

      new Setting(containerEl)
        .setName(this.getText('watchedFoldersName'))
        .setDesc(this.getText('watchedFoldersDesc'))
        .addButton(button => button
          .setButtonText(this.getText('addWatchedFolderButton'))
          .setCta()
          .onClick(() => {
            new FolderSuggestModal(this.app, this.tempSettings.wikiFolder, (folder) => {
              const folderPath = folder.path.endsWith('/') ? folder.path : `${folder.path}/`;
              if (!this.tempSettings.watchedFolders.includes(folderPath)) {
                this.tempSettings.watchedFolders.push(folderPath);
                this.display();
              }
            }).open();
          }));

      if (this.tempSettings.watchedFolders.length === 0) {
        containerEl.createEl('p', {
          text: this.getText('noWatchedFoldersHint'),
          cls: 'llm-wiki-section-hint'
        });
      }

      for (let i = 0; i < this.tempSettings.watchedFolders.length; i++) {
        const idx = i;
        new Setting(containerEl)
          .setName(this.tempSettings.watchedFolders[i])
          .addButton(button => button
            .setButtonText(this.getText('removeWatchedFolderButton'))
            .onClick(() => { this.tempSettings.watchedFolders.splice(idx, 1); this.display(); }));
      }

      const hasClippings = this.tempSettings.watchedFolders.includes('Clippings/');
      new Setting(containerEl)
        .setName(this.getText('webClipperPresetName'))
        .setDesc(this.getText('webClipperPresetDesc'))
        .addToggle(toggle => toggle
          .setValue(hasClippings)
          .onChange((value) => {
            if (value && !this.tempSettings.watchedFolders.includes('Clippings/')) this.tempSettings.watchedFolders.push('Clippings/');
            else if (!value) { const ci = this.tempSettings.watchedFolders.indexOf('Clippings/'); if (ci >= 0) this.tempSettings.watchedFolders.splice(ci, 1); }
            this.display();
          }));

      new Setting(containerEl)
        .setName(this.getText('autoWatchModeName'))
        .setDesc(this.getText('autoWatchModeDesc'))
        .addDropdown(dropdown => {
          dropdown.addOption('notify', this.getText('watchModeNotify'));
          dropdown.addOption('auto', this.getText('watchModeAuto'));
          dropdown.setValue(this.tempSettings.autoWatchMode);
          dropdown.onChange((value: 'notify' | 'auto') => { this.tempSettings.autoWatchMode = value; this.display(); });
        });

      if (this.tempSettings.autoWatchMode === 'auto') {
        new Setting(containerEl)
          .setName(this.getText('autoIngestLevelName'))
          .setDesc(this.getText('autoIngestLevelDesc'))
          .addDropdown(dropdown => {
            dropdown.addOption('notice', this.getText('autoIngestLevelNotice'));
            dropdown.addOption('modal', this.getText('autoIngestLevelModal'));
            dropdown.setValue(this.tempSettings.autoIngestNotificationLevel);
            dropdown.onChange((value: 'notice' | 'modal') => { this.tempSettings.autoIngestNotificationLevel = value; });
          });
      }

      new Setting(containerEl)
        .setName(this.getText('autoWatchDebounceName'))
        .setDesc(this.getText('autoWatchDebounceDesc'))
        .addText(text => {
        text
          .setValue(String(Math.round(this.tempSettings.autoWatchDebounceMs / 1000)))
          .onChange((value) => {
            const parsed = parseInt(value);
            if (parsed > 60) {
              this.tempSettings.autoWatchDebounceMs = 60000;
              text.setValue('60');
              new Notice(this.getText('numberRangeClamped').replace('{}', '60'), NOTICE_SHORT);
            } else if (parsed < 1) {
              this.tempSettings.autoWatchDebounceMs = 1000;
              text.setValue('1');
              new Notice(this.getText('numberRangeClamped').replace('{}', '1'), NOTICE_SHORT);
            } else if (!isNaN(parsed)) {
              this.tempSettings.autoWatchDebounceMs = parsed * 1000;
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '1';
        text.inputEl.max = '60';
        text.inputEl.classList.add('llm-wiki-number-input');
      });
    }

    new Setting(containerEl)
      .setName(this.getText('periodicLintName'))
      .setDesc(this.getText('periodicLintDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('off', this.getText('periodicLintOff'));
        dropdown.addOption('daily', this.getText('periodicLintDaily'));
        dropdown.addOption('weekly', this.getText('periodicLintWeekly'));
        dropdown.addOption('monthly', this.getText('periodicLintMonthly'));
        dropdown.setValue(this.tempSettings.periodicLint);
        dropdown.onChange((value: 'off' | 'daily' | 'weekly' | 'monthly') => { this.tempSettings.periodicLint = value; });
      });

    new Setting(containerEl)
      .setName(this.getText('autoSmartFixName'))
      .setDesc(this.getText('autoSmartFixDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.autoSmartFix)
        .onChange((value) => { this.tempSettings.autoSmartFix = value; }));

    // v1.23.0 Phase 5.1.5: first-run Welcome note toggle. Sits next to
    // autoSmartFix because both are "auto behaviors on plugin load" knobs.
    new Setting(containerEl)
      .setName(this.getText('welcomeNoteSettingsToggle'))
      .setDesc(this.getText('welcomeNoteSettingsToggleDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.createWelcomeNote)
        .onChange((value) => { this.tempSettings.createWelcomeNote = value; }));

  }
}
