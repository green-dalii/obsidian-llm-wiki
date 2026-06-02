import { Plugin, Notice, TFile } from 'obsidian';

import {
  PREDEFINED_PROVIDERS,
  DEFAULT_SETTINGS,
  LLMWikiSettings,
  LLMClient,
  IngestReport
} from './types';
import { TOKENS_QUERY_MODEL_DETECT, NOTICE_NORMAL, NOTICE_ERROR } from './constants';
import { AnthropicClient, AnthropicCompatibleClient, OpenAICompatibleClient } from './llm-client';

function createLLMClient(settings: LLMWikiSettings): LLMClient {
  if (settings.provider === 'anthropic') {
    return new AnthropicClient(settings.apiKey.trim());
  }
  if (settings.provider === 'anthropic-compatible') {
    const baseUrl = settings.baseUrl?.trim();
    if (baseUrl) {
      return new AnthropicCompatibleClient(settings.apiKey.trim(), baseUrl);
    }
    return new AnthropicClient(settings.apiKey.trim());
  }
  const providerConfig = PREDEFINED_PROVIDERS[settings.provider];
  const baseUrl = settings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;
  const apiKey = settings.provider === 'ollama' ? 'ollama' : settings.apiKey.trim();
  return new OpenAICompatibleClient(apiKey, baseUrl);
}
import { TEXTS } from './texts';
import { slugify, parseFrontmatter, getText } from './utils';
import { LLMWikiSettingTab } from './ui/settings';
import { WikiEngine } from './wiki/wiki-engine';
import { QueryModal } from './wiki/query-engine';
import { FileSuggestModal, FolderSuggestModal, IngestReportModal } from './ui/modals';
import { SchemaManager } from './schema/schema-manager';
import { AutoMaintainManager } from './schema/auto-maintain';
import { runLintWiki } from './wiki/lint-controller';

export default class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;
  wikiEngine: WikiEngine;
  schemaManager: SchemaManager;
  autoMaintainManager: AutoMaintainManager;
  private progressNotice: Notice | null = null;
  private ingestStatusBar: HTMLElement | null = null;

  async onload() {
    await this.loadSettings();
    this.initializeLLMClient();

    this.schemaManager = new SchemaManager(
      this.app,
      this.settings,
      () => this.llmClient
    );

    this.wikiEngine = new WikiEngine(
      this.app,
      this.settings,
      () => this.llmClient,
      this.schemaManager,
      // Delayed evaluation: this closure captures autoMaintainManager by reference,
      // but the variable is assigned at :68 below. By the time wikiEngine calls
      // this callback (during file writes), autoMaintainManager is guaranteed
      // to exist. This is intentional — reordering the assignments would break it.
      (path: string) => this.autoMaintainManager.watchWrite(path),
      (msg: string) => this.showProgress(msg),
      (report: IngestReport) => this.onIngestDone(report)
    );

    this.autoMaintainManager = new AutoMaintainManager(
      this.app,
      this.settings,
      this.wikiEngine,
      this,
      () => this.lintWiki()
    );

    if (this.settings.autoWatchSources) {
      this.autoMaintainManager.startWatching();
    }
    this.autoMaintainManager.schedulePeriodicLint();
    if (this.settings.startupCheck) {
      void this.autoMaintainManager.runStartupCheck();
    }

    const t = TEXTS[this.settings.language];
    this.addCommand({
      id: 'ingest-source',
      name: t.cmdIngestSource,
      callback: () => this.selectSourceToIngest()
    });

    this.addCommand({
      id: 'ingest-folder',
      name: t.cmdIngestFolder,
      callback: () => this.selectFolderToIngest()
    });

    this.addCommand({
      id: 'query-wiki',
      name: t.cmdQueryWiki,
      callback: () => this.queryWiki()
    });

    this.addCommand({
      id: 'lint-wiki',
      name: t.cmdLintWiki,
      callback: () => this.lintWiki()
    });

    this.addCommand({
      id: 'regenerate-index',
      name: t.cmdRegenerateIndex,
      callback: () => {
        void (async () => {
          new Notice(getText(this.settings.language, 'regenerateIndexCompleted') + '...');
          try {
            await this.wikiEngine.generateIndexFromEngine();
            new Notice(getText(this.settings.language, 'regenerateIndexCompleted'));
          } catch (err) {
            console.error('Regenerate index failed:', err);
            new Notice(getText(this.settings.language, 'operationFailed') + (err instanceof Error ? err.message : String(err)));
          }
        })();
      }
    });

    this.addCommand({
      id: 'suggest-schema-update',
      name: t.cmdSuggestSchema,
      callback: () => this.suggestSchemaUpdate()
    });

    this.addCommand({
      id: 'cancel-ingestion',
      name: t.cmdCancelIngestion,
      callback: () => {
        if (this.wikiEngine.isIngesting()) {
          this.wikiEngine.cancelIngestion();
        } else if (this.wikiEngine.isLintRunning()) {
          this.wikiEngine.cancelLint();
        }
      }
    });

    this.addCommand({
      id: 'ingest-active-file',
      name: t.cmdIngestActiveFile,
      callback: () => this.ingestActiveFile()
    });

    this.addRibbonIcon('sticker', t.cmdIngestActiveFile, () => {
      this.ingestActiveFile();
    });

    this.ingestStatusBar = this.addStatusBarItem();
    this.ingestStatusBar.addClass('llm-wiki-status-bar');
    this.ingestStatusBar.addClass('llm-wiki-status-bar-hidden');
    this.ingestStatusBar.setText('LLM wiki');
    this.ingestStatusBar.onclick = () => {
      if (this.wikiEngine.isIngesting()) {
        this.wikiEngine.cancelIngestion();
      } else if (this.wikiEngine.isLintRunning()) {
        this.wikiEngine.cancelLint();
      }
    };

    this.wikiEngine.setIngestionCallbacks(
      () => {
        const label = getText(this.settings.language, 'ingestionStatusBar');
        if (this.ingestStatusBar) {
          this.ingestStatusBar.setText(label);
          this.ingestStatusBar.removeClass('llm-wiki-status-bar-hidden');
        }
      },
      () => {
        if (this.ingestStatusBar) {
          this.ingestStatusBar.addClass('llm-wiki-status-bar-hidden');
        }
      }
    );

    this.wikiEngine.setLintCallbacks(
      () => {
        const label = getText(this.settings.language, 'lintStatusBar');
        if (this.ingestStatusBar) {
          this.ingestStatusBar.setText(label);
          this.ingestStatusBar.removeClass('llm-wiki-status-bar-hidden');
        }
      },
      () => {
        if (this.ingestStatusBar) {
          this.ingestStatusBar.addClass('llm-wiki-status-bar-hidden');
        }
      }
    );

    this.addSettingTab(new LLMWikiSettingTab(this.app, this));

    console.debug('LLM Wiki Plugin loaded - Karpathy implementation');
  }

  onunload() {
    this.autoMaintainManager?.stop();
    console.debug('LLM Wiki Plugin unloaded');
  }

  async loadSettings() {
    const savedData = await this.loadData() as Partial<LLMWikiSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});

    console.debug('loadSettings: loaded watchedFolders =', JSON.stringify(this.settings.watchedFolders));

    if (savedData && !savedData.wikiLanguage) {
      this.settings.wikiLanguage = this.settings.language;
      await this.saveData(this.settings);
    }

    if (!Array.isArray(this.settings.watchedFolders)) {
      this.settings.watchedFolders = [];
      console.debug('loadSettings: watchedFolders was not an array, reset to []');
    }

    // Migrate existing users: if they already have a working config, trust it
    if (savedData && !('llmReady' in savedData)) {
      const hasConfig = savedData.provider && (savedData.apiKey?.trim() || savedData.provider === 'ollama') && savedData.model;
      this.settings.llmReady = !!hasConfig;
      if (hasConfig) {
        console.debug('loadSettings: existing user with config detected, llmReady = true');
      }
    }
  }

  async saveSettings() {
    console.debug('saveSettings: watchedFolders =', JSON.stringify(this.settings.watchedFolders));
    await this.saveData(this.settings);
    console.debug('saveSettings: data saved to data.json');
    this.initializeLLMClient();
    this.schemaManager?.updateSettings(this.settings);
    if (this.wikiEngine) {
      this.wikiEngine.settings = this.settings;
    }
    if (this.autoMaintainManager) {
      this.autoMaintainManager.settings = this.settings;
      this.autoMaintainManager.stop();
      if (this.settings.autoWatchSources) {
        this.autoMaintainManager.startWatching();
      }
      this.autoMaintainManager.schedulePeriodicLint();
    }
  }

  initializeLLMClient() {
    if (!this.settings.apiKey?.trim() && this.settings.provider !== 'ollama') {
      this.llmClient = null;
      return;
    }

    try {
      this.llmClient = createLLMClient(this.settings);
      console.debug('LLM Client initialized:', this.settings.provider);
    } catch (error) {
      console.error('LLM Client initialization failed:', error);
      this.llmClient = null;
    }
  }

  private showProgress(msg: string): void {
    if (this.progressNotice) {
      this.progressNotice.setMessage(msg);
    } else {
      this.progressNotice = new Notice(msg, 0);
    }
  }

  private dismissProgress(): void {
    if (this.progressNotice) {
      this.progressNotice.hide();
      this.progressNotice = null;
    }
  }

  private onIngestDone(report: IngestReport): void {
    this.dismissProgress();
    new IngestReportModal(this.app, report, this.settings.language).open();
  }

  // ==================== Ingestion ====================

  private async isAlreadyIngested(sourceFile: TFile): Promise<boolean> {
    const slug = slugify(sourceFile.basename);
    const wikiPath = `${this.settings.wikiFolder}/sources/${slug}.md`;

    try {
      const file = this.app.vault.getAbstractFileByPath(wikiPath);
      if (!(file instanceof TFile)) return false;

      try {
        const content = await this.app.vault.read(file);
        const fm = parseFrontmatter(content);
        if (fm && fm.sources) {
          const normalizedSources = fm.sources.map(s => {
            const trimmed = s.trim();
            if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
              return trimmed.slice(2, -2).trim();
            }
            return trimmed;
          });
          return normalizedSources.includes(sourceFile.path);
        }
        return true;
      } catch {
        return true;
      }
    } catch {
      return false;
    }
  }

  selectSourceToIngest() {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new FileSuggestModal(this.app, this.settings.wikiFolder, (file) => {
      this.showProgress(`Ingesting: ${file.basename}`);
      this.wikiEngine.ingestSource(file).catch(e => {
        console.error('Single ingest failed:', e);
        const errMsg = e instanceof Error ? e.message : String(e);
        new Notice(TEXTS[this.settings.language].errorIngestFailed + errMsg, NOTICE_ERROR);
      });
    }).open();
  }

  ingestActiveFile() {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice(getText(this.settings.language, 'noActiveFile'), NOTICE_NORMAL);
      return;
    }

    if (activeFile.extension !== 'md') {
      new Notice(getText(this.settings.language, 'mdOnlyFile'), NOTICE_NORMAL);
      return;
    }

    this.showProgress(`Ingesting: ${activeFile.basename}`);
    this.wikiEngine.ingestSource(activeFile).catch(e => {
      console.error('Ingest active file failed:', e);
      const errMsg = e instanceof Error ? e.message : String(e);
      new Notice(TEXTS[this.settings.language].errorIngestFailed + errMsg, NOTICE_ERROR);
    });
  }

  selectFolderToIngest() {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new FolderSuggestModal(this.app, this.settings.wikiFolder, (folder) => {
      void (async () => {
      const files = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(folder.path));

      if (files.length === 0) {
        const msg = TEXTS[this.settings.language].selectFolderNoMdFiles.replace('{path}', folder.path);
        new Notice(msg);
        return;
      }

      this.showProgress('Checking for already-ingested files...');
      const alreadyIngestedFiles: TFile[] = [];
      const newFiles: TFile[] = [];

      for (const file of files) {
        if (await this.isAlreadyIngested(file)) {
          alreadyIngestedFiles.push(file);
        } else {
          newFiles.push(file);
        }
      }

      const totalFiles = files.length;
      const skippedCount = alreadyIngestedFiles.length;
      const ingestCount = newFiles.length;

      if (skippedCount > 0) {
        const texts = TEXTS[this.settings.language];
        new Notice(
          texts.batchIngestSkipNotice
            .replace('{skipped}', String(skippedCount))
            .replace('{total}', String(totalFiles))
            .replace('{new}', String(ingestCount)),
          6000
        );
      }

      if (ingestCount === 0) {
        const texts = TEXTS[this.settings.language];
        new Notice(texts.batchIngestAllIngested.replace('{total}', String(totalFiles)), NOTICE_NORMAL);
        return;
      }

      const reports: IngestReport[] = [];

      this.wikiEngine.setDoneCallback((report: IngestReport) => {
        reports.push(report);
      });

      const texts = TEXTS[this.settings.language];
      this.showProgress(texts.batchIngestStarting
        .replace('{count}', String(ingestCount))
        .replace('{folder}', folder.name));

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];

        try {
          this.showProgress(`[${i + 1}/${ingestCount}] ${file.basename}`);
          console.debug(`(${i + 1}/${ingestCount}) ingesting: ${file.path}`);
          await this.wikiEngine.ingestSource(file);
          if (this.wikiEngine.wasCancelled) {
            console.debug(`Folder ingestion cancelled at file ${i + 1}/${ingestCount}`);
            break;
          }
          console.debug(`(${i + 1}/${ingestCount}) ingestion success: ${file.path}`);
        } catch (error) {
          console.error(`(${i + 1}/${ingestCount}) ingestion failed: ${file.path}`, error);
          const errMsg = error instanceof Error ? error.message : String(error);
          new Notice(texts.errorIngestFailed + file.basename + ': ' + errMsg, NOTICE_ERROR);
        }
      }

      this.wikiEngine.setDoneCallback((report: IngestReport) => this.onIngestDone(report));

      this.dismissProgress();

      if (reports.length > 0) {
        const allCreated = [...new Set(reports.flatMap(r => r.createdPages))];
        const allUpdated = [...new Set(reports.flatMap(r => r.updatedPages))];
        const totalEntities = reports.reduce((sum, r) => sum + r.entitiesCreated, 0);
        const totalConcepts = reports.reduce((sum, r) => sum + r.conceptsCreated, 0);
        const totalContradictions = reports.reduce((sum, r) => sum + r.contradictionsFound, 0);
        const totalElapsed = reports.reduce((sum, r) => sum + (r.elapsedSeconds || 0), 0);
        const allFailedItems = reports.flatMap(r => r.failedItems);
        const allCollisions = reports.flatMap(r => r.collisions || []);
        const allSuccess = reports.every(r => r.success);

        const aggregated: IngestReport = {
          sourceFile: `${reports.length} files from ${folder.path}`,
          createdPages: allCreated,
          updatedPages: allUpdated,
          entitiesCreated: totalEntities,
          conceptsCreated: totalConcepts,
          failedItems: allFailedItems,
          collisions: allCollisions,
          contradictionsFound: totalContradictions,
          success: allSuccess,
          elapsedSeconds: totalElapsed,
          skippedFiles: skippedCount,
          totalFilesInFolder: totalFiles,
        };

        new IngestReportModal(this.app, aggregated, this.settings.language).open();
      } else {
        const texts = TEXTS[this.settings.language];
        new Notice(texts.batchIngestComplete
          .replace('{success}', '0')
          .replace('{total}', String(ingestCount))
          .replace('{fail}', String(ingestCount)), 10000);
      }
    })().catch(e => console.error(e));
    }).open();
  }

  // ==================== Query ====================

  queryWiki() {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new QueryModal(this.app, this).open();
  }

  // ==================== Lint ====================

  async lintWiki() {
    if (!this.requireLLMReady()) return;
    const signal = this.wikiEngine.startLintOperation();
    try {
      await runLintWiki({
        app: this.app,
        settings: this.settings,
        llmClient: this.llmClient,
        wikiEngine: this.wikiEngine,
        onAnalyzeSchema: () => { void this.suggestSchemaUpdate(); },
      }, signal);
    } finally {
      this.wikiEngine.endLintOperation();
    }
  }

  // ==================== Schema ====================

  async suggestSchemaUpdate() {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new Notice(TEXTS[this.settings.language].analyzingSchema);
    try {
      const result = await this.schemaManager.suggestSchemaUpdate('Wiki lint analysis');
      if (result?.changes_needed) {
        new Notice(TEXTS[this.settings.language].schemaSuggestionGenerated, NOTICE_ERROR);
      } else {
        new Notice(TEXTS[this.settings.language].noSchemaUpdateNeeded, NOTICE_NORMAL);
      }
    } catch (error) {
      console.error('Schema suggestion failed:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      new Notice(TEXTS[this.settings.language].schemaSuggestionFailed + ': ' + errMsg, NOTICE_ERROR);
    }
  }

  // ==================== Connection Test ====================

  async testLLMConnection(): Promise<{ success: boolean; message: string }> {
    const t = TEXTS[this.settings.language] || TEXTS.en;

    const isOllama = this.settings.provider === 'ollama';
    if (!isOllama && (!this.settings.apiKey || this.settings.apiKey.trim() === '')) {
      return { success: false, message: t.errorNoApiKey || 'API Key is not configured' };
    }

    try {
      const testClient = createLLMClient(this.settings);

      const testResponse = await testClient.createMessage({
        model: this.settings.model,
        max_tokens: TOKENS_QUERY_MODEL_DETECT,
        messages: [{
          role: 'user',
          content: 'Test connection. Please reply "Connection successful".'
        }]
      });

      console.debug('Test response:', testResponse);
      this.settings.llmReady = true;
      await this.saveSettings();

      // Auto-initialize wiki structure after first successful connection
      if (this.wikiEngine) {
        const isInit = await this.isWikiInitialized();
        if (!isInit) {
          try {
            await this.wikiEngine.ensureWikiStructure();
            console.debug('Wiki structure auto-initialized');
          } catch (initError) {
            console.warn('Auto wiki init failed:', initError);
            // Non-fatal: user can still use plugin, just needs manual init
          }
        }
      }

      const providerName = (PREDEFINED_PROVIDERS[this.settings.provider]?.nameEn || this.settings.provider);

      return {
        success: true,
        message: `✅ ${t.testConnectionSuccessful || 'Connection successful'}${t.testConnectionProvider ? ': ' : ''}${providerName}`
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
  }

  /**
   * Check if wiki structure exists by IO inspection (no persistent flag).
   * Handles custom wikiFolder changes gracefully.
   */
  private async isWikiInitialized(): Promise<boolean> {
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
  }

  private requireLLMReady(): boolean {
    if (this.settings.llmReady) return true;
    new Notice(getText(this.settings.language, 'llmNotReady'), NOTICE_ERROR);
    return false;
  }
}
