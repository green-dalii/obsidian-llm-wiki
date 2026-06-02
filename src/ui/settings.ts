import { NOTICE_NORMAL, NOTICE_ERROR, NOTICE_SHORT } from '../constants';
// Settings panel UI for LLM Wiki Plugin

import { App, PluginSettingTab, Setting, Notice, TFile, requestUrl } from 'obsidian';
import LLMWikiPlugin from '../main';
import { PREDEFINED_PROVIDERS, LLMWikiSettings, WIKI_LANGUAGES } from '../types';
import { TEXTS } from '../texts';
import { FolderSuggestModal } from './modals';

export class LLMWikiSettingTab extends PluginSettingTab {
  plugin: LLMWikiPlugin;
  tempSettings: LLMWikiSettings;

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.tempSettings = {
      ...plugin.settings,
      watchedFolders: [...(plugin.settings.watchedFolders || [])]
    };
  }

  // Auto-save when user navigates away from settings tab
  hide(): void {
    const hasChanges = JSON.stringify(this.tempSettings) !== JSON.stringify(this.plugin.settings);
    if (hasChanges) {
      this.plugin.settings = {
        ...this.tempSettings,
        watchedFolders: [...(this.tempSettings.watchedFolders || [])]
      };
      void this.plugin.saveSettings();
      console.debug('Settings auto-saved on tab close');
    }
  }

  getText(key: keyof typeof TEXTS.en): string {
    const texts = TEXTS[this.tempSettings.language];
    return (texts[key] as string) ?? TEXTS.en[key] ?? key;
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
        dropdown.addOption('en', this.getText('languageEn'));
        dropdown.addOption('zh', this.getText('languageZh'));
        dropdown.addOption('ja', this.getText('languageJa'));
        dropdown.addOption('ko', this.getText('languageKo'));
        dropdown.addOption('de', this.getText('languageDe'));
        dropdown.addOption('fr', this.getText('languageFr'));
        dropdown.addOption('es', this.getText('languageEs'));
        dropdown.addOption('pt', this.getText('languagePt'));
        dropdown.setValue(this.tempSettings.language);
        dropdown.onChange((value: 'en' | 'zh' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt') => {
          this.tempSettings.language = value;
          this.display();
        });
      })
      .addButton(button => button
        .setButtonText(this.getText('saveButton'))
        .setCta()
        .onClick(() => {
          void (async () => {
            this.plugin.settings = {
              ...this.tempSettings,
              watchedFolders: [...(this.tempSettings.watchedFolders || [])]
            };
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
    // 3. LLM Provider (highest priority — must configure first)
    // ==========================================
    new Setting(containerEl).setName(this.getText('providerSection')).setHeading();

    const providerConfig = PREDEFINED_PROVIDERS[this.tempSettings.provider];
    const isOllama = this.tempSettings.provider === 'ollama';

    // Provider Dropdown
    new Setting(containerEl)
      .setName(this.getText('providerName'))
      .setDesc(this.getText('providerDesc'))
      .addDropdown(dropdown => {
        Object.values(PREDEFINED_PROVIDERS).forEach(config => {
          const displayName = this.tempSettings.language === 'en'
            ? config.nameEn : config.nameZh;
          dropdown.addOption(config.id, displayName);
        });
        dropdown.setValue(this.tempSettings.provider);
        dropdown.onChange((value) => {
          this.tempSettings.provider = value;
          this.tempSettings.llmReady = false;
          const config = PREDEFINED_PROVIDERS[value];
          if (config) {
            this.tempSettings.model = config.defaultModel || '';
            if (value !== 'custom') this.tempSettings.baseUrl = config.baseUrl;
          }
          this.display();
        });
      });

    // API Key
    if (!isOllama) {
      new Setting(containerEl)
        .setName(this.getText('apiKeyName'))
        .setDesc(this.getText('apiKeyDesc'))
        .addText(text => {
          text.setPlaceholder(this.getText('apiKeyPlaceholder'))
            .setValue(this.tempSettings.apiKey)
            .onChange((value) => { this.tempSettings.apiKey = value; this.tempSettings.llmReady = false; });
          text.inputEl.type = 'password';
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

    // Model section
    new Setting(containerEl).setName(this.getText('modelSection')).setHeading();

    // Fetch Models button
    new Setting(containerEl)
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

            if (this.tempSettings.provider === 'anthropic' || this.tempSettings.provider === 'anthropic-compatible') {
              if (this.tempSettings.provider === 'anthropic-compatible' && this.tempSettings.baseUrl?.trim()) {
                const rawBase = this.tempSettings.baseUrl.trim();
                const cleanBase = rawBase.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
                const modelsUrl = cleanBase + '/v1/models';
                try {
                  const response = await requestUrl({ url: modelsUrl, headers: { 'x-api-key': apiKey, 'Anthropic-Version': '2023-06-01' } });
                  if (response.status >= 200 && response.status < 300) {
                    const data = response.json as { data?: Array<{ id: string }> };
                    if (data.data?.length) {
                      this.tempSettings.availableModels = data.data.map(m => m.id).filter(modelFilter).sort();
                    } else throw new Error('empty model list');
                  } else throw new Error(`HTTP ${response.status}`);
                } catch {
                  const altUrl = cleanBase + '/models';
                  const altResponse = await requestUrl({ url: altUrl, headers: { 'Authorization': `Bearer ${apiKey}` } });
                  if (altResponse.status >= 200 && altResponse.status < 300) {
                    const altData = altResponse.json as { data?: Array<{ id: string }> };
                    if (altData.data?.length) {
                      this.tempSettings.availableModels = altData.data.map(m => m.id).filter(modelFilter).sort();
                    } else throw new Error('empty model list');
                  } else throw new Error(`HTTP ${altResponse.status}`);
                }
              } else {
                this.tempSettings.availableModels = ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001'];
              }
            } else {
              const modelsUrl = (baseUrl || 'https://api.openai.com/v1') + '/models';
              const response = await requestUrl({
                url: modelsUrl,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
              });
              const data = response.json as { data?: Array<{ id: string }> };
              if (data.data?.length) {
                this.tempSettings.availableModels = data.data.map(m => m.id).filter(modelFilter).sort().slice(0, 100);
              } else throw new Error('empty model list');
            }
            if (this.tempSettings.availableModels.length > 0) {
              new Notice(this.getText('fetchSuccess').replace('{}', this.tempSettings.availableModels.length.toString()), NOTICE_NORMAL);
              if (!this.tempSettings.model || !this.tempSettings.availableModels.includes(this.tempSettings.model)) {
                this.tempSettings.model = this.tempSettings.availableModels[0];
              }
            } else {
              new Notice(this.getText('fetchFailed'), NOTICE_NORMAL);
              this.tempSettings.useCustomModel = true;
            }
            this.display();
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            new Notice(this.getText('errorFetchFailed').replace('{}', errorMsg), NOTICE_ERROR);
            this.tempSettings.useCustomModel = true;
            this.display();
          }
          button.setButtonText(this.getText('fetchModelsButton'));
          button.setDisabled(false);
        }));

    // Model Selection
    if (this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0 && !this.tempSettings.useCustomModel) {
      new Setting(containerEl)
        .setName(this.getText('selectModelName'))
        .setDesc(this.getText('selectModelDesc').replace('{}', this.tempSettings.availableModels.length.toString()))
        .addDropdown(dropdown => {
          (this.tempSettings.availableModels || []).forEach(model => { dropdown.addOption(model, model); });
          dropdown.addOption('__custom__', this.getText('customInputOption'));
          dropdown.setValue(this.tempSettings.model);
          dropdown.onChange((value) => {
            if (value === '__custom__') { this.tempSettings.useCustomModel = true; this.display(); }
            else { this.tempSettings.model = value; this.tempSettings.useCustomModel = false; }
          });
        });
    } else {
      const useDropdown = (this.tempSettings.availableModels?.length ?? 0) > 0;
      new Setting(containerEl)
        .setName(this.getText('modelName'))
        .setDesc(this.tempSettings.availableModels?.length
          ? this.getText('modelDescCustom')
          : providerConfig ? this.getText('modelDescRecommended').replace('{}', providerConfig.defaultModel || '') : this.getText('modelDescManual'))
        .addText(text => text
          .setPlaceholder(providerConfig?.defaultModel || 'model-name')
          .setValue(this.tempSettings.model)
          .onChange((value) => { this.tempSettings.model = value; }))
        .addExtraButton(button => {
          if (useDropdown) {
            button
              .setIcon('list')
              .setTooltip(this.getText('useDropdownButton'))
              .onClick(() => { this.tempSettings.useCustomModel = false; this.display(); });
          }
        });
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
          this.plugin.settings = testSettings;
          this.plugin.initializeLLMClient();
          const result = await this.plugin.testLLMConnection();
          this.tempSettings.llmReady = result.success;
          button.setButtonText(this.getText('testButton'));
          button.setDisabled(false);
          this.display();
          new Notice(result.message, result.success ? NOTICE_NORMAL : NOTICE_ERROR);
        }));

    // Status — connection readiness
    const readyStatus = this.tempSettings.llmReady
      ? '✅ ' + (this.getText('statusReady') || 'Ready')
      : '⚠️ ' + (this.getText('statusNotReady') || 'Not configured — please complete setup above');
    containerEl.createEl('p', {
      text: readyStatus,
      cls: `llm-wiki-connection-status ${this.tempSettings.llmReady ? 'llm-wiki-status-ready' : 'llm-wiki-status-notready'}`
    });
    const clientStatus = this.plugin.llmClient ? this.getText('statusInitialized') : this.getText('statusNotInitialized');
    const currentProvider = providerConfig
      ? (this.tempSettings.language === 'en' ? providerConfig.nameEn : providerConfig.nameZh) : 'Custom';
    containerEl.createEl('p', {
      text: `${this.getText('statusTitle')}: ${clientStatus} | ${this.getText('currentProvider')}: ${currentProvider}`,
      cls: 'llm-wiki-plugin-info'
    });

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

    new Setting(containerEl)
      .setName(this.getText('useSubfoldersName'))
      .setDesc(this.getText('useSubfoldersDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.useSubfolders !== false)
        .onChange((value) => { this.tempSettings.useSubfolders = value; }));

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
            if (parsed > 300) {
              this.tempSettings.customEntityLimit = 300;
              text.setValue('300');
              new Notice(this.getText('numberRangeClamped').replace('{}', '300'), NOTICE_SHORT);
            } else if (parsed < 1) {
              this.tempSettings.customEntityLimit = 1;
              text.setValue('1');
              new Notice(this.getText('numberRangeClamped').replace('{}', '1'), NOTICE_SHORT);
            } else if (!isNaN(parsed)) {
              this.tempSettings.customEntityLimit = parsed;
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '1';
        text.inputEl.max = '300';
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
            if (parsed > 300) {
              this.tempSettings.customConceptLimit = 300;
              text.setValue('300');
              new Notice(this.getText('numberRangeClamped').replace('{}', '300'), NOTICE_SHORT);
            } else if (parsed < 1) {
              this.tempSettings.customConceptLimit = 1;
              text.setValue('1');
              new Notice(this.getText('numberRangeClamped').replace('{}', '1'), NOTICE_SHORT);
            } else if (!isNaN(parsed)) {
              this.tempSettings.customConceptLimit = parsed;
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '1';
        text.inputEl.max = '300';
        text.inputEl.classList.add('llm-wiki-number-input');
      });
    customConceptSetting.settingEl.style.display =
      this.tempSettings.extractionGranularity === 'custom' ? 'flex' : 'none';

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

    // Max Conversation History
    new Setting(containerEl)
      .setName(this.getText('maxConversationHistoryName'))
      .setDesc(this.getText('maxConversationHistoryDesc'))
      .addText(text => {
        text
          .setValue(this.tempSettings.maxConversationHistory.toString())
          .setPlaceholder('30')
          .onChange((value) => {
            const parsed = parseInt(value);
            if (parsed > 50) {
              this.tempSettings.maxConversationHistory = 50;
              text.setValue('50');
              new Notice(this.getText('numberRangeClamped').replace('{}', '50'), NOTICE_SHORT);
            } else if (parsed < 1) {
              this.tempSettings.maxConversationHistory = 1;
              text.setValue('1');
              new Notice(this.getText('numberRangeClamped').replace('{}', '1'), NOTICE_SHORT);
            } else if (!isNaN(parsed)) {
              this.tempSettings.maxConversationHistory = parsed;
            }
          });
        text.inputEl.type = 'number';
        text.inputEl.min = '1';
        text.inputEl.max = '50';
        text.inputEl.classList.add('llm-wiki-number-input');
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
          await this.plugin.wikiEngine.regenerateDefaultSchema();
          new Notice(this.getText('schemaRegeneratedNotice'), NOTICE_SHORT);
        }));

    // ==========================================
    // 5. Auto Maintenance
    // ==========================================
    new Setting(containerEl).setName(this.getText('autoMaintainSection')).setHeading();

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
          dropdown.onChange((value: 'notify' | 'auto') => { this.tempSettings.autoWatchMode = value; });
        });

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
        dropdown.addOption('hourly', this.getText('periodicLintHourly'));
        dropdown.addOption('daily', this.getText('periodicLintDaily'));
        dropdown.addOption('weekly', this.getText('periodicLintWeekly'));
        dropdown.setValue(this.tempSettings.periodicLint);
        dropdown.onChange((value: 'off' | 'hourly' | 'daily' | 'weekly') => { this.tempSettings.periodicLint = value; });
      });

    new Setting(containerEl)
      .setName(this.getText('startupCheckName'))
      .setDesc(this.getText('startupCheckDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.startupCheck)
        .onChange((value) => { this.tempSettings.startupCheck = value; }));
  }
}