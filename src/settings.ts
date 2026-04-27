// Settings panel UI for LLM Wiki Plugin

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
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
    containerEl.createEl('h2', { text: this.getText('pluginTitle') });

    const introDiv = containerEl.createDiv({ cls: 'llm-wiki-intro' });
    introDiv.createEl('p', {
      text: this.getText('pluginIntro'),
      attr: { style: 'margin-bottom: 10px; font-size: 14px;' }
    });
    introDiv.createEl('p', {
      text: `${this.getText('conceptOrigin')} [Andrej Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)`,
      attr: { style: 'margin-bottom: 15px; font-size: 13px; color: #666;' }
    });
    introDiv.createEl('p', {
      text: this.getText('featuresTitle'),
      attr: { style: 'margin-bottom: 5px; font-size: 14px; font-weight: bold;' }
    });

    const features = [
      this.getText('feature1'),
      this.getText('feature2'),
      this.getText('feature3'),
      this.getText('feature4'),
      this.getText('feature5'),
      this.getText('feature6')
    ];
    features.forEach(f => {
      introDiv.createEl('p', {
        text: f,
        attr: { style: 'margin: 3px 0; font-size: 12px;' }
      });
    });

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
    containerEl.createEl('h3', { text: this.getText('providerSection') });

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
    const providerConfig = PREDEFINED_PROVIDERS[this.tempSettings.provider];
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
    if (this.tempSettings.provider === 'custom' || (providerConfig && this.tempSettings.baseUrl !== providerConfig.baseUrl)) {
      new Setting(containerEl)
        .setName(this.getText('baseUrlName'))
        .setDesc(this.tempSettings.provider === 'custom'
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
    containerEl.createEl('h4', {
      text: this.getText('modelSection'),
      attr: { style: 'margin-top: 20px; color: #888; font-size: 13px;' }
    });

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
            // Temporarily initialize client to fetch models
            let tempClient: any;
            const apiKey = isOllama ? 'ollama' : this.tempSettings.apiKey.trim();
            const baseUrl = this.tempSettings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;

            if (this.tempSettings.provider === 'anthropic') {
              const Anthropic = require('@anthropic-ai/sdk').default;
              tempClient = new Anthropic({ apiKey: this.tempSettings.apiKey.trim() });
              // Anthropic doesn't have listModels API, return preset list
              this.tempSettings.availableModels = [
                'claude-sonnet-4-6',
                'claude-opus-4-7',
                'claude-haiku-4-5-20251001'
              ];
            } else {
              const OpenAI = require('openai').default;
              tempClient = new OpenAI({
                apiKey,
                baseURL: baseUrl || 'https://api.openai.com/v1',
                dangerouslyAllowBrowser: true
              });
              const models = await tempClient.models.list();
              this.tempSettings.availableModels = models.data
                .map((m: any) => m.id)
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
          } catch (error: any) {
            console.error('Failed to fetch model list:', error);
            new Notice(this.getText('errorFetchFailed').replace('{}', error.message), 8000);
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
    containerEl.createEl('h3', { text: this.getText('wikiSection') });

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
    containerEl.createEl('h3', { text: this.getText('querySectionTitle') });

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
  }
}