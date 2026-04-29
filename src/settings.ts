// Settings panel UI for LLM Wiki Plugin

import { App, PluginSettingTab, Setting, Notice, TFile, requestUrl } from 'obsidian';
import OpenAI from 'openai';
import LLMWikiPlugin from '../main';
import { PREDEFINED_PROVIDERS, LLMWikiSettings } from './types';
import { TEXTS } from './texts';

export class LLMWikiSettingTab extends PluginSettingTab {
  plugin: LLMWikiPlugin;
  tempSettings: LLMWikiSettings;

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.tempSettings = { ...plugin.settings };
  }

  getText(key: string): string {
    const lang = this.tempSettings.language;
    const texts = TEXTS[lang];
    return texts[key as keyof typeof texts] || TEXTS.en[key as keyof typeof TEXTS.en] || key;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    // ===== Language Switcher =====
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
      });

    // ===== Plugin Introduction =====
    new Setting(containerEl).setName(this.getText('pluginTitle')).setHeading();

    const introDiv = containerEl.createDiv({ cls: 'llm-wiki-intro' });

    // Merged intro paragraph with Karpathy link
    const introP = introDiv.createEl('p', {
      attr: { style: 'margin-bottom: 12px; font-size: 14px; line-height: 1.6;' }
    });

    const linkText = this.getText('karpathyLinkText');
    const fullIntro = this.getText('pluginIntro');
    const parts = fullIntro.split('{{link}}');

    introP.createSpan({ text: parts[0] });
    introP.createEl('a', {
      text: linkText,
      href: 'https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f',
    });
    introP.createSpan({ text: parts[1] });

    // How It Works
    introDiv.createEl('p', {
      text: this.getText('featuresTitle'),
      attr: { style: 'margin-bottom: 8px; font-size: 14px; font-weight: bold;' }
    });

    for (let i = 1; i <= 3; i++) {
      const item = introDiv.createDiv({ attr: { style: 'margin: 6px 0;' } });
      item.createEl('strong', {
        text: this.getText(`workflow${i}Title`),
        attr: { style: 'font-size: 13px;' }
      });
      item.createSpan({
        text: ` — ${this.getText(`workflow${i}Desc`)}`,
        attr: { style: 'font-size: 13px; color: #666;' }
      });
    }

    // ===== Status Display =====
    const statusDiv = containerEl.createDiv({ cls: 'llm-wiki-status' });
    const clientStatus = this.plugin.llmClient ? this.getText('statusInitialized') : this.getText('statusNotInitialized');
    const providerConfig = PREDEFINED_PROVIDERS[this.tempSettings.provider];
    const currentProvider = providerConfig
      ? (this.tempSettings.language === 'en' ? providerConfig.nameEn : providerConfig.nameZh)
      : 'Custom';
    statusDiv.createEl('p', {
      text: `${this.getText('statusTitle')}: ${clientStatus} | ${this.getText('currentProvider')}: ${currentProvider}`,
      attr: { style: 'margin-top: 20px; margin-bottom: 20px; font-weight: bold; font-size: 14px;' }
    });

    // ===== Provider Configuration =====
    new Setting(containerEl).setName(this.getText('providerSection')).setHeading();

    // 1. Provider Dropdown
    new Setting(containerEl)
      .setName(this.getText('providerName'))
      .setDesc(this.getText('providerDesc'))
      .addDropdown(dropdown => {
        Object.values(PREDEFINED_PROVIDERS).forEach(config => {
          const displayName = this.tempSettings.language === 'en'
            ? config.nameEn
            : config.nameZh;
          dropdown.addOption(config.id, displayName);
        });
        dropdown.setValue(this.tempSettings.provider);
        dropdown.onChange((value) => {
          this.tempSettings.provider = value;
          const config = PREDEFINED_PROVIDERS[value];

          if (config) {
            this.tempSettings.model = config.defaultModel;
            if (value !== 'custom') {
              this.tempSettings.baseUrl = config.baseUrl;
            }
          }

          this.display();
        });
      });

    // 2. API Key Input
    const isOllama = this.tempSettings.provider === 'ollama';

    if (!isOllama) {
      new Setting(containerEl)
        .setName(this.getText('apiKeyName'))
        .setDesc(this.getText('apiKeyDesc'))
        .addText(text => text
          .setPlaceholder(this.getText('apiKeyPlaceholder'))
          .setValue(this.tempSettings.apiKey)
          .onChange((value) => {
            this.tempSettings.apiKey = value;
          }));
    } else {
      containerEl.createEl('p', {
        text: this.getText('ollamaHint'),
        attr: { style: 'color: #666; margin: 10px 0; font-size: 13px;' }
      });
    }

    // 3. Base URL
    if (this.tempSettings.provider === 'custom' || this.tempSettings.provider === 'anthropic-compatible' || (providerConfig && this.tempSettings.baseUrl !== providerConfig.baseUrl)) {
      new Setting(containerEl)
        .setName(this.getText('baseUrlName'))
        .setDesc(this.tempSettings.provider === 'custom' || this.tempSettings.provider === 'anthropic-compatible'
          ? this.getText('baseUrlDescCustom')
          : this.getText('baseUrlDescOverride'))
        .addText(text => text
          .setPlaceholder(providerConfig?.baseUrl || 'https://api.example.com/v1')
          .setValue(this.tempSettings.baseUrl)
          .onChange((value) => {
            this.tempSettings.baseUrl = value;
          }));
    }

    // 4. Model Selection
    new Setting(containerEl).setName(this.getText('modelSection')).setHeading();

    // Fetch Model List Button
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

            if (this.tempSettings.provider === 'anthropic' || this.tempSettings.provider === 'anthropic-compatible') {
              if (this.tempSettings.provider === 'anthropic-compatible' && this.tempSettings.baseUrl?.trim()) {
                // Try to fetch models from the custom endpoint
                // Anthropic API: GET {baseURL}/v1/models, auth: x-api-key
                // Also support OpenAI-compatible proxies: GET {baseURL}/models, auth: Bearer
                const rawBase = this.tempSettings.baseUrl.trim();
                // Normalize: strip trailing /v1 for consistent path construction
                const cleanBase = rawBase.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
                const modelsUrl = cleanBase + '/v1/models';
                try {
                  const response = await requestUrl({
                    url: modelsUrl,
                    headers: {
                      'x-api-key': apiKey,
                      'Anthropic-Version': '2023-06-01'
                    }
                  });
                  if (response.status >= 200 && response.status < 300) {
                    const data = response.json as { data?: Array<{ id: string }> };
                    if (data.data?.length) {
                      this.tempSettings.availableModels = data.data
                        .map(m => m.id)
                        .filter(id => !id.includes(':') && !id.includes('/'))
                        .sort();
                    } else {
                      throw new Error('empty model list');
                    }
                  } else {
                    throw new Error(`HTTP ${response.status}`);
                  }
                } catch (fetchErr) {
                  console.debug('Anthropic Compatible model fetch via /v1/models failed:', fetchErr);
                  // Fallback: try /models without /v1 prefix (OpenAI-compatible proxy)
                  try {
                    const altUrl = cleanBase + '/models';
                    const altResponse = await requestUrl({
                      url: altUrl,
                      headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    if (altResponse.status >= 200 && altResponse.status < 300) {
                      const altData = altResponse.json as { data?: Array<{ id: string }> };
                      if (altData.data?.length) {
                        this.tempSettings.availableModels = altData.data
                          .map(m => m.id)
                          .filter(id => !id.includes(':') && !id.includes('/'))
                          .sort();
                      } else {
                        throw new Error('empty model list');
                      }
                    } else {
                      throw new Error(`HTTP ${altResponse.status}`);
                    }
                  } catch (altErr) {
                    console.debug('Anthropic Compatible model fetch via /models also failed:', altErr);
                    // No hardcoded defaults — incompatible with non-Claude endpoints
                    this.tempSettings.availableModels = [];
                    this.tempSettings.useCustomModel = true;
                  }
                }
              } else {
                // Native Anthropic: use hardcoded list (API has no standard models endpoint)
                this.tempSettings.availableModels = [
                  'claude-sonnet-4-6',
                  'claude-opus-4-7',
                  'claude-haiku-4-5-20251001'
                ];
              }
            } else {
              const tempClient = new OpenAI({
                apiKey,
                baseURL: baseUrl || 'https://api.openai.com/v1',
                dangerouslyAllowBrowser: true
              });
              const models = await tempClient.models.list();
              this.tempSettings.availableModels = models.data
                .map((m: { id: string }) => m.id)
                .filter((id: string) => !id.includes(':') && !id.includes('/'))
                .sort()
                .slice(0, 100);
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
            console.error('Failed to fetch model list:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            new Notice(this.getText('errorFetchFailed').replace('{}', errorMsg), 8000);
            this.tempSettings.useCustomModel = true;
            this.display();
          }

          button.setButtonText(this.getText('fetchModelsButton'));
          button.setDisabled(false);
        }));

    // Model Selection Dropdown or Custom Input
    if (this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0 && !this.tempSettings.useCustomModel) {
      new Setting(containerEl)
        .setName(this.getText('selectModelName'))
        .setDesc(this.getText('selectModelDesc').replace('{}', this.tempSettings.availableModels.length.toString()))
        .addDropdown(dropdown => {
          (this.tempSettings.availableModels || []).forEach(model => {
            dropdown.addOption(model, model);
          });
          dropdown.addOption('__custom__', this.getText('customInputOption'));
          dropdown.setValue(this.tempSettings.model);
          dropdown.onChange((value) => {
            if (value === '__custom__') {
              this.tempSettings.useCustomModel = true;
              this.display();
            } else {
              this.tempSettings.model = value;
              this.tempSettings.useCustomModel = false;
            }
          });
        });

      containerEl.createEl('p', {
        text: this.getText('customInputHint'),
        attr: { style: 'color: #666; margin: 5px 0; font-size: 12px;' }
      });
    } else {
      new Setting(containerEl)
        .setName(this.getText('modelName'))
        .setDesc(this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0
          ? this.getText('modelDescCustom')
          : providerConfig
            ? this.getText('modelDescRecommended').replace('{}', providerConfig.defaultModel)
            : this.getText('modelDescManual'))
        .addText(text => text
          .setPlaceholder(providerConfig?.defaultModel || 'model-name')
          .setValue(this.tempSettings.model)
          .onChange((value) => {
            this.tempSettings.model = value;
          }));

      if (this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0) {
        new Setting(containerEl)
          .setName(this.getText('switchToDropdown'))
          .setDesc('')
          .addButton(button => button
            .setButtonText(this.getText('useDropdownButton'))
            .onClick(() => {
              this.tempSettings.useCustomModel = false;
              this.display();
            }));
      }
    }

    // ===== Test and Save Buttons =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });

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

          if (result.success) {
            new Notice(result.message, 5000);
          } else {
            new Notice(result.message, 8000);
          }
        }));

    new Setting(containerEl)
      .setName(this.getText('saveSettingsName'))
      .setDesc(this.getText('saveSettingsDesc'))
      .addButton(button => button
        .setButtonText(this.getText('saveButton'))
        .setCta()
        .onClick(async () => {
          this.plugin.settings = { ...this.tempSettings };
          await this.plugin.saveSettings();

          new Notice(this.getText('savedNotice'), 3000);
          this.display();
        }));

    // ===== Wiki Configuration =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    new Setting(containerEl).setName(this.getText('wikiSection')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('wikiFolderName'))
      .setDesc(this.getText('wikiFolderDesc'))
      .addText(text => text
        .setPlaceholder(this.getText('wikiFolderPlaceholder'))
        .setValue(this.tempSettings.wikiFolder)
        .onChange((value) => {
          this.tempSettings.wikiFolder = value;
        }));

    // ===== Query Configuration =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    new Setting(containerEl).setName(this.getText('querySectionTitle')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('maxConversationHistoryName'))
      .setDesc(this.getText('maxConversationHistoryDesc'))
      .addText(text => text
        .setValue(this.tempSettings.maxConversationHistory.toString())
        .setPlaceholder('10')
        .onChange((value) => {
          const parsed = parseInt(value);
          if (parsed >= 1 && parsed <= 50) {
            this.tempSettings.maxConversationHistory = parsed;
          } else {
            new Notice(this.getText('numberRangeValidation'), 3000);
          }
        }));

    containerEl.createEl('p', {
      text: this.getText('maxConversationHistoryHint'),
      attr: {
        style: 'color: #999; font-size: 11px; margin: 5px 0;'
      }
    });

    // ===== Schema Configuration =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    new Setting(containerEl).setName(this.getText('schemaSection')).setHeading();

    new Setting(containerEl)
      .setName(this.getText('enableSchemaName'))
      .setDesc(this.getText('enableSchemaDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.enableSchema)
        .onChange((value) => {
          this.tempSettings.enableSchema = value;
        }));

    new Setting(containerEl)
      .setName(this.getText('viewSchemaButton'))
      .addButton(button => button
        .setButtonText(this.getText('viewSchemaButton'))
        .onClick(() => {
          const schemaPath = `${this.tempSettings.wikiFolder}/schema/config.md`;
          const file = this.app.vault.getAbstractFileByPath(schemaPath);
          if (file instanceof TFile) {
            void this.app.workspace.getLeaf().openFile(file);
          } else {
            new Notice('Schema file not found. Enable schema to create it.', 5000);
          }
        }));

    new Setting(containerEl)
      .setName(this.getText('regenerateSchemaButton'))
      .addButton(button => button
        .setButtonText(this.getText('regenerateSchemaButton'))
        .onClick(async () => {
          await this.plugin.wikiEngine.regenerateDefaultSchema();
          new Notice(this.getText('schemaRegeneratedNotice'), 3000);
        }));

    // ===== Auto Maintenance =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    new Setting(containerEl).setName(this.getText('autoMaintainSection')).setHeading();

    // Beta badge
    const betaDiv = containerEl.createDiv({
      attr: {
        style: 'background: #e8f0fe; border: 1px solid #4285f4; border-radius: 6px; padding: 8px 14px; margin-bottom: 12px; font-size: 12px; line-height: 1.5; color: #174ea6; font-weight: 500;'
      }
    });
    betaDiv.setText('🧪 ' + this.getText('autoMaintainBetaBadge'));

    // Cost warning banner
    const warningDiv = containerEl.createDiv({
      attr: {
        style: 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.5; color: #664d03;'
      }
    });
    warningDiv.setText(this.getText('autoMaintainCostWarning'));

    new Setting(containerEl)
      .setName(this.getText('autoWatchName'))
      .setDesc(this.getText('autoWatchDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.autoWatchSources)
        .onChange((value) => {
          this.tempSettings.autoWatchSources = value;
          this.display();
        }));

    if (this.tempSettings.autoWatchSources) {
      new Setting(containerEl)
        .setName(this.getText('autoWatchModeName'))
        .setDesc(this.getText('autoWatchModeDesc'))
        .addDropdown(dropdown => {
          dropdown.addOption('notify', this.getText('watchModeNotify'));
          dropdown.addOption('auto', this.getText('watchModeAuto'));
          dropdown.setValue(this.tempSettings.autoWatchMode);
          dropdown.onChange((value: 'notify' | 'auto') => {
            this.tempSettings.autoWatchMode = value;
          });
        });

      new Setting(containerEl)
        .setName(this.getText('autoWatchDebounceName'))
        .setDesc(this.getText('autoWatchDebounceDesc'))
        .addText(text => text
          .setValue(this.tempSettings.autoWatchDebounceMs.toString())
          .onChange((value) => {
            const parsed = parseInt(value);
            if (parsed >= 1000 && parsed <= 60000) {
              this.tempSettings.autoWatchDebounceMs = parsed;
            }
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
        dropdown.onChange((value: 'off' | 'hourly' | 'daily' | 'weekly') => {
          this.tempSettings.periodicLint = value;
        });
      });

    new Setting(containerEl)
      .setName(this.getText('startupCheckName'))
      .setDesc(this.getText('startupCheckDesc'))
      .addToggle(toggle => toggle
        .setValue(this.tempSettings.startupCheck)
        .onChange((value) => {
          this.tempSettings.startupCheck = value;
        }));
  }
}