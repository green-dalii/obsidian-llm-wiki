// Settings panel UI for LLM Wiki Plugin

import { App, PluginSettingTab, Setting, Notice, TFile, requestUrl } from 'obsidian';
import OpenAI from 'openai';
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

  getText(key: string): string {
    const lang = this.tempSettings.language;
    const texts = TEXTS[lang];
    return (texts as unknown as Record<string, string>)[key] || (TEXTS.en as unknown as Record<string, string>)[key] || key;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    // ==========================================
    // 1. Language & Save
    // ==========================================

    new Setting(containerEl)
      .setName(this.getText('languageTitle'))
      .setDesc(this.getText('languageDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('en', this.getText('languageEn'));
        dropdown.addOption('zh', this.getText('languageZh'));
        dropdown.setValue(this.tempSettings.language);
        dropdown.onChange((value: 'en' | 'zh') => {
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
            new Notice(this.getText('savedNotice'), 3000);
          })();
        }));

    // ==========================================
    // 2. LLM Provider (highest priority — must configure first)
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
          const config = PREDEFINED_PROVIDERS[value];
          if (config) {
            this.tempSettings.model = config.defaultModel;
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
            .onChange((value) => { this.tempSettings.apiKey = value; });
          text.inputEl.type = 'password';
        });
    } else {
      containerEl.createEl('p', {
        text: this.getText('ollamaHint'),
        attr: { style: 'color: #666; margin: 10px 0; font-size: 13px;' }
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
          .onChange((value) => { this.tempSettings.baseUrl = value; }));
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
              const tempClient = new OpenAI({ apiKey, baseURL: baseUrl || 'https://api.openai.com/v1', dangerouslyAllowBrowser: true });
              const models = await tempClient.models.list();
              this.tempSettings.availableModels = models.data.map((m: { id: string }) => m.id).filter(modelFilter).sort().slice(0, 100);
            }
            if (this.tempSettings.availableModels.length > 0) {
              new Notice(this.getText('fetchSuccess').replace('{}', this.tempSettings.availableModels.length.toString()), 5000);
              if (!this.tempSettings.model || !this.tempSettings.availableModels.includes(this.tempSettings.model)) {
                this.tempSettings.model = this.tempSettings.availableModels[0];
              }
            } else {
              new Notice(this.getText('fetchFailed'), 5000);
              this.tempSettings.useCustomModel = true;
            }
            this.display();
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            new Notice(this.getText('errorFetchFailed').replace('{}', errorMsg), 8000);
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
          : providerConfig ? this.getText('modelDescRecommended').replace('{}', providerConfig.defaultModel) : this.getText('modelDescManual'))
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
          button.setButtonText(this.getText('testButton'));
          button.setDisabled(false);
          new Notice(result.message, result.success ? 5000 : 8000);
        }));

    // Status
    const clientStatus = this.plugin.llmClient ? this.getText('statusInitialized') : this.getText('statusNotInitialized');
    const currentProvider = providerConfig
      ? (this.tempSettings.language === 'en' ? providerConfig.nameEn : providerConfig.nameZh) : 'Custom';
    containerEl.createEl('p', {
      text: `${this.getText('statusTitle')}: ${clientStatus} | ${this.getText('currentProvider')}: ${currentProvider}`,
      attr: { style: 'margin: 16px 0 8px; font-size: 13px; color: #666;' }
    });

    // ==========================================
    // 3. Wiki Output Language
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
    // 4. Wiki Folder
    // ==========================================
    new Setting(containerEl).setName(this.getText('wikiSection')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('wikiFolderName'))
      .setDesc(this.getText('wikiFolderDesc'))
      .addText(text => text
        .setPlaceholder(this.getText('wikiFolderPlaceholder'))
        .setValue(this.tempSettings.wikiFolder)
        .onChange((value) => { this.tempSettings.wikiFolder = value; }));

    // ==========================================
    // 5. Extraction
    // ==========================================
    new Setting(containerEl).setName(this.getText('extractionSectionTitle')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('extractionGranularityName'))
      .setDesc(this.getText('extractionGranularityDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('fine', this.getText('extractionGranularityFine'));
        dropdown.addOption('standard', this.getText('extractionGranularityStandard'));
        dropdown.addOption('coarse', this.getText('extractionGranularityCoarse'));
        dropdown.setValue(this.tempSettings.extractionGranularity || 'standard');
        dropdown.onChange((value: string) => { this.tempSettings.extractionGranularity = value as 'fine' | 'standard' | 'coarse'; });
      });

    // ==========================================
    // 6. Ingestion Acceleration
    // ==========================================
    new Setting(containerEl).setName(this.getText('accelerationSectionTitle')).setHeading();

    const concurrencyValue = this.tempSettings.pageGenerationConcurrency ?? 1;
    const concurrencyLabel = concurrencyValue === 1
      ? this.getText('concurrencyValueSingular').replace('{}', String(concurrencyValue))
      : this.getText('concurrencyValuePlural').replace('{}', String(concurrencyValue));

    new Setting(containerEl)
      .setName(this.getText('pageGenerationConcurrencyName'))
      .setDesc(this.getText('pageGenerationConcurrencyDesc') + ' ' + concurrencyLabel)
      .addSlider(slider => slider
        .setLimits(1, 5, 1)
        .setValue(concurrencyValue)
        .setDynamicTooltip()
        .onChange((value) => {
          this.tempSettings.pageGenerationConcurrency = value;
          this.display();
        }));

    new Setting(containerEl)
      .setName(this.getText('batchDelayName'))
      .setDesc(this.getText('batchDelayDesc'))
      .addSlider(slider => slider
        .setLimits(100, 2000, 50)
        .setValue(this.tempSettings.batchDelayMs ?? 300)
        .setDynamicTooltip()
        .onChange((value) => { this.tempSettings.batchDelayMs = value; }));

    // ==========================================
    // 7. Query
    // ==========================================
    new Setting(containerEl).setName(this.getText('querySectionTitle')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('maxConversationHistoryName'))
      .setDesc(this.getText('maxConversationHistoryDesc'))
      .addText(text => text
        .setValue(this.tempSettings.maxConversationHistory.toString())
        .setPlaceholder('10')
        .onChange((value) => {
          const parsed = parseInt(value);
          if (parsed >= 1 && parsed <= 50) this.tempSettings.maxConversationHistory = parsed;
          else new Notice(this.getText('numberRangeValidation'), 3000);
        }));

    // ==========================================
    // 7. Schema
    // ==========================================
    new Setting(containerEl).setName(this.getText('schemaSection')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('enableSchemaName'))
      .setDesc(this.getText('enableSchemaDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.enableSchema)
        .onChange((value) => { this.tempSettings.enableSchema = value; }));

    new Setting(containerEl)
      .addButton(button => button
        .setButtonText(this.getText('viewSchemaButton'))
        .onClick(() => {
          const schemaPath = `${this.tempSettings.wikiFolder}/schema/config.md`;
          const file = this.app.vault.getAbstractFileByPath(schemaPath);
          if (file instanceof TFile) void this.app.workspace.getLeaf().openFile(file);
          else new Notice(this.getText('schemaNotFoundNotice'), 5000);
        }))
      .addButton(button => button
        .setButtonText(this.getText('regenerateSchemaButton'))
        .onClick(async () => {
          await this.plugin.wikiEngine.regenerateDefaultSchema();
          new Notice(this.getText('schemaRegeneratedNotice'), 3000);
        }));

    // ==========================================
    // 8. Auto Maintenance
    // ==========================================
    new Setting(containerEl).setName(this.getText('autoMaintainSection')).setHeading();

    const betaDiv = containerEl.createDiv({
      attr: { style: 'background: #e8f0fe; border: 1px solid #4285f4; border-radius: 6px; padding: 8px 14px; margin-bottom: 12px; font-size: 12px; line-height: 1.5; color: #174ea6; font-weight: 500;' }
    });
    betaDiv.setText('🧪 ' + this.getText('autoMaintainBetaBadge'));

    const warningDiv = containerEl.createDiv({
      attr: { style: 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.5; color: #664d03;' }
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
          attr: { style: 'color: #888; font-size: 13px; margin: 0 0 8px 0;' }
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
        .addText(text => text
          .setValue(this.tempSettings.autoWatchDebounceMs.toString())
          .onChange((value) => {
            const parsed = parseInt(value);
            if (parsed >= 1000 && parsed <= 60000) this.tempSettings.autoWatchDebounceMs = parsed;
          }));
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