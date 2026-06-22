import { Plugin, Notice, TFile } from 'obsidian';

import {
  PREDEFINED_PROVIDERS,
  DEFAULT_SETTINGS,
  LLMWikiSettings,
  LLMClient,
  IngestReport
} from './types';
import { TOKENS_QUERY_MODEL_DETECT, NOTICE_NORMAL, NOTICE_ERROR, COMPATIBLE_SOURCE_EXTENSIONS } from './constants';
import { AnthropicClient, AnthropicCompatibleClient, OpenAICompatibleClient } from './llm-client';
import { wrapWithAdvancedSettings } from './llm-client-wrapper';
import { runSchemaAnalyze } from './schema/analyze';

// Issue #243: derive a consistent cache key for the thinking-control cache.
// Used in both the read (createLLMClient) and write (testLLMConnection) paths
// so they stay aligned when the user picks a predefined provider without
// overriding baseUrl.
function getThinkingControlCacheKey(settings: LLMWikiSettings): string {
  return settings.baseUrl?.trim() || PREDEFINED_PROVIDERS[settings.provider]?.baseUrl || '';
}

// Exported for unit tests (see src/__tests__/root/main.test.ts).
// Issue #99 / #128 / #128 follow-up: thin wrapper that injects only the
// advanced settings the user has configured; otherwise the call passes
// through unchanged to preserve the provider default.
export function createLLMClient(settings: LLMWikiSettings): LLMClient {
  let client: LLMClient;

  if (settings.provider === 'anthropic') {
    client = new AnthropicClient(settings.apiKey.trim());
  } else if (settings.provider === 'anthropic-compatible') {
    const baseUrl = settings.baseUrl?.trim();
    if (baseUrl) {
      client = new AnthropicCompatibleClient(settings.apiKey.trim(), baseUrl);
    } else {
      client = new AnthropicClient(settings.apiKey.trim());
    }
  } else {
    const providerConfig = PREDEFINED_PROVIDERS[settings.provider];
    const baseUrl = settings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;
    const apiKey = (settings.provider === 'ollama' || settings.provider === 'lmstudio')
      ? (settings.apiKey.trim() || 'lmstudio')
      : settings.apiKey.trim();
    client = new OpenAICompatibleClient(apiKey, baseUrl);
  }

  // Sync thinking control cache from settings to client
  // #137: lazy-migrate v1.19.0 boolean cache values to dialect strings.
  //   true  → 'anthropic' (backend accepts thinking.type='disabled')
  //   false → 'none'      (backend rejected thinking; skip field entirely)
  if (client instanceof OpenAICompatibleClient) {
    const cacheKey = getThinkingControlCacheKey(settings);
    console.debug('[CREATE-LLM] cacheKey:', cacheKey, 'has cache?', cacheKey && settings.thinkingControlCache?.[cacheKey] !== undefined, 'cache value:', settings.thinkingControlCache?.[cacheKey]);
    if (cacheKey && settings.thinkingControlCache?.[cacheKey] !== undefined) {
      const cached = settings.thinkingControlCache[cacheKey];
      client.thinkingControlDialect =
        typeof cached === 'boolean' ? (cached ? 'anthropic' : 'none') : cached;
      console.debug('[CREATE-LLM] set dialect to:', client.thinkingControlDialect);
    }
    // #137: thread language so queueFallbackNotice can resolve the
    // per-locale fallback-notice templates (fallbackThinkingDialect /
    // fallbackThinkingNone / fallbackParamStripped). Previously hard-coded
    // TEXTS.en, which made 7/8 translations invisible to users.
    client.language = settings.language;
  }

  // Wrap createMessage so user-configured advanced settings are applied.
  // v1.20.0: by default the plugin does NOT inject any thinking-control
  // field. The provider decides its own reasoning behavior. The wrapper
  // only injects the explicit opt-in fields (temperature, repetitionPenalty)
  // when the user has configured a value in Custom Advanced Settings.
  return wrapWithAdvancedSettings(client, {
    maxTokensPerCall: settings.maxTokensPerCall,
    extractionTemperature: settings.extractionTemperature,
    chatTemperature: settings.chatTemperature,
    repetitionPenalty: settings.repetitionPenalty,
  });
}
import { TEXTS } from './texts';
import { getText } from './core/i18n';
import { slugify } from './core/slug';
import { parseFrontmatter } from './core/frontmatter';
import { normalizeVocabularyCsv } from './core/tag-vocab';
import { buildIngestStatusBarText, BatchProgress } from './core/status-bar';
import { LLMWikiSettingTab } from './ui/settings';
import { WikiEngine } from './wiki/wiki-engine';
import { QueryModal } from './wiki/query-engine';
import { FileSuggestModal, FolderSuggestModal, IngestReportModal, ConfirmModal } from './ui/modals';
import { HistoryModal } from './ui/history-modal';
import { SchemaManager } from './schema/schema-manager';
import { AutoMaintainManager } from './schema/auto-maintain';
import { runLintWiki } from './wiki/lint/controller';

export default class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;
  wikiEngine: WikiEngine;
  schemaManager: SchemaManager;
  autoMaintainManager: AutoMaintainManager;
  private progressNotice: Notice | null = null;
  private ingestStatusBar: HTMLElement | null = null;
  // Tracks the current document position during a folder batch ingest so the
  // status bar can show "[current/total] <doc> · …". Null for single-file ingest.
  private batchProgress: BatchProgress | null = null;

  async onload() {
    await this.loadSettings();
    this.cleanupVocabularyTags();
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

    // #164: when an interactive ingest hits a duplicate, ask the user whether to
    // re-ingest. Folder/watcher ingests leave this unused and auto-skip.
    this.wikiEngine.onConfirmReingest = (file) => new Promise<boolean>((resolve) => {
      const lang = this.settings.language;
      new ConfirmModal(this.app, {
        title: getText(lang, 'reingestConfirmTitle'),
        body: getText(lang, 'reingestConfirmBody').replace('{filename}', file.basename),
        confirmText: getText(lang, 'reingestConfirmYes'),
        cancelText: getText(lang, 'reingestConfirmNo'),
        onChoice: resolve,
      }).open();
    });

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

    // Ingestion History (#122) — command palette entry.
    // Most discoverable way to reach the history panel; the Settings-tab button
    // is a secondary entry point for users exploring configuration.
    this.addCommand({
      id: 'view-ingestion-history',
      name: t.cmdViewHistory,
      callback: () => {
        new HistoryModal(this.app, {
          language: this.settings.language,
          wikiFolder: this.settings.wikiFolder || 'wiki',
        }).open();
      }
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
      (filename?: string) => {
        const label = getText(this.settings.language, 'ingestionStatusBar');
        if (this.ingestStatusBar) {
          this.ingestStatusBar.setText(
            buildIngestStatusBarText(label, filename, this.batchProgress)
          );
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

    if (savedData && !savedData.wikiLanguage) {
      this.settings.wikiLanguage = this.settings.language;
      await this.saveData(this.settings);
    }

    if (!Array.isArray(this.settings.watchedFolders)) {
      this.settings.watchedFolders = [];
      console.debug('loadSettings: watchedFolders was not an array, reset to []');
    }

    // v1.18.3 migration: force startupCheck to true for existing users who
    // previously had it off. The startup scan is safe (~100ms, no token
    // cost) and prevents silent format pollution between restarts. User
    // can toggle off after this one-time migration.
    if (savedData && savedData.startupCheck === false) {
      this.settings.startupCheck = true;
    }

    // v1.20.0 migration: reset disableThinking from old default (true) to
    // new default (false). Old behavior sent thinking.type='disabled' which
    // caused HTTP 400 on many providers (OpenAI, Gemini, Ollama, etc.).
    // New behavior: disableThinking=false means "don't send any thinking
    // control field" — the provider decides its own default. This is safe
    // for all providers and eliminates the 400 cascade. Users who
    // explicitly want thinking control can re-enable it in Custom mode.
    // Also reset advancedSettingsMode to 'default' so Custom-mode remnants
    // (temperature, repetition_penalty, thinking toggle) don't leak into
    // the new "provider decides" behavior.
    if (savedData && savedData.disableThinking === true) {
      this.settings.disableThinking = false;
      this.settings.advancedSettingsMode = 'default';
      console.debug('loadSettings: v1.20.0 migration — reset disableThinking to false, advancedSettingsMode to default');
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

  /**
   * Issue #85 v2: Migrate v1 textarea CSV (which may contain untrimmed
   * whitespace, empty entries, or case-variant duplicates from manual
   * editing) into the canonical form the chip input uses. Idempotent.
   * Called once on onload() before any UI renders so users see clean
   * chips immediately on first reload after upgrade.
   */
  private cleanupVocabularyTags(): void {
    const fields: ('customEntityTags' | 'customConceptTags')[] = [
      'customEntityTags',
      'customConceptTags',
    ];
    let changed = false;
    for (const field of fields) {
      const current = this.settings[field];
      if (!current) continue;
      const cleaned = normalizeVocabularyCsv(current);
      if (cleaned !== current) {
        this.settings[field] = cleaned;
        changed = true;
      }
    }
    if (changed) void this.saveSettings();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeLLMClient();
    this.schemaManager?.updateSettings(this.settings);
    if (this.wikiEngine) {
      this.wikiEngine.updateSettings(this.settings);
      console.debug('[saveSettings] wikiEngine provider updated to:', this.settings.provider);
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
    const slug = slugify(sourceFile.basename, this.settings.slugCase === 'preserve');
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
      this.wikiEngine.ingestSource(file, { interactive: true }).catch(e => {
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

    // File-type validation is handled centrally by the ingest gate (#164),
    // which accepts the text allowlist (.md, .txt, …) and shows a localized
    // notice for anything else.
    this.showProgress(`Ingesting: ${activeFile.basename}`);
    this.wikiEngine.ingestSource(activeFile, { interactive: true }).catch(e => {
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
      // #164: scan the compatible text-file allowlist (not just .md), so .txt
      // sources in the folder are picked up too. The ingest gate is the final
      // arbiter of type/empty/duplicate.
      const allowedExts: readonly string[] = COMPATIBLE_SOURCE_EXTENSIONS;
      const files = this.app.vault.getFiles()
        .filter(f => f.path.startsWith(folder.path) && allowedExts.includes(f.extension.toLowerCase()));

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
        this.wikiEngine.setDoneCallback((report: IngestReport) => this.onIngestDone(report));
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

      // #164: shared dedup context for this batch — catches content duplicates
      // within the run and against pages already in the wiki.
      const batchCtx = this.wikiEngine.createBatchContext();

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];

        try {
          this.batchProgress = { current: i + 1, total: ingestCount };
          this.showProgress(`[${i + 1}/${ingestCount}] ${file.basename}`);
          console.debug(`(${i + 1}/${ingestCount}) ingesting: ${file.path}`);
          await this.wikiEngine.ingestSource(file, { batchCtx });
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

      this.batchProgress = null;
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
        const allRejectedFiles = reports.flatMap(r => r.rejectedFiles || []);
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
          rejectedFiles: allRejectedFiles,
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
    // ROADMAP v1.17.0 P1 #1: delegate to runSchemaAnalyze so the status bar's
    // "click to cancel" works for both this call site and the Lint Report
    // Modal's "Suggest Schema Updates" button (both ultimately reach here).
    await runSchemaAnalyze({
      settings: this.settings,
      llmClient: this.llmClient,
      wikiEngine: this.wikiEngine,
      schemaManager: this.schemaManager,
      requireLLMReady: () => this.requireLLMReady(),
    });
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

      // Probe: which thinking-control dialect does this provider accept?
      //
      // #137: 3-tier probe.
      //   Tier 1 (anthropic): thinking.type='disabled'  → OpenAI/DeepSeek/xAI
      //   Tier 2 (openai):    reasoning_effort='none'    → Gemini OpenAI-compat
      //   Tier 3 (none):      no field accepted           → strict backends
      //
      // The result is cached as a dialect string in settings so subsequent
      // LLM calls skip the 400 probe round-trip. The in-request fallback
      // chain still handles any mismatch between probe and runtime.
      // v1.20.0: skip the thinking-control probe when disableThinking is
      // false (default). No thinking field will ever be sent in this mode,
      // so probing wastes requests and can trigger rate limits (e.g. MiniMax
      // 429). The probe is only needed when the user explicitly enables
      // "Disable thinking" in Custom Advanced Settings.
      if (
        this.settings.disableThinking &&
        (testClient instanceof OpenAICompatibleClient || testClient instanceof AnthropicCompatibleClient || testClient instanceof AnthropicClient)
      ) {
        let detectedDialect: 'anthropic' | 'openai' | 'none' = 'anthropic';
        let probeSucceeded = false;

        // Tier 1: anthropic dialect
        try {
          await testClient.createMessage({
            model: this.settings.model,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'think' }],
            enableThinking: false,
          });
          detectedDialect = 'anthropic';
          probeSucceeded = true;
        } catch {
          // Tier 2: openai dialect (force-send reasoning_effort instead of thinking)
          // Temporarily override the dialect so the probe sends reasoning_effort.
          if (testClient instanceof OpenAICompatibleClient) {
            const savedDialect = testClient.thinkingControlDialect;
            testClient.thinkingControlDialect = 'openai';
            try {
              await testClient.createMessage({
                model: this.settings.model,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'think' }],
                enableThinking: false,
              });
              detectedDialect = 'openai';
              probeSucceeded = true;
            } catch {
              // Tier 3: no dialect works.
              detectedDialect = 'none';
            } finally {
              // Don't keep the temporary 'openai' assignment on the client — the
              // in-request fallback chain will probe and re-cache it on first
              // real request if our probe was wrong.
              testClient.thinkingControlDialect = savedDialect;
            }
          } else {
            // AnthropicCompat / AnthropicClient: only 'anthropic' dialect is supported.
            detectedDialect = 'none';
          }
        }

        const cacheKey = getThinkingControlCacheKey(this.settings);
        if (probeSucceeded) {
          if (testClient instanceof OpenAICompatibleClient) {
            testClient.thinkingControlDialect = detectedDialect;
          }
          // Issue #243: skip writing when cacheKey is empty to avoid
          // polluting the cache with an unusable key.
          if (cacheKey) {
            this.settings.thinkingControlCache = {
              ...this.settings.thinkingControlCache,
              [cacheKey]: detectedDialect,
            };
            console.debug(`Thinking control dialect for ${cacheKey}: ${detectedDialect}`);
          }
        } else {
          // Probe failed: cache 'none' so subsequent real calls skip the
          // thinking-control field entirely (no more 400 round-trips on
          // a backend that rejected both anthropic and openai dialects).
          if (testClient instanceof OpenAICompatibleClient) {
            testClient.thinkingControlDialect = 'none';
          }
          if (cacheKey) {
            this.settings.thinkingControlCache = {
              ...this.settings.thinkingControlCache,
              [cacheKey]: 'none',
            };
            console.debug(`Thinking control dialect for ${cacheKey}: none (both probed tiers failed)`);
          }
        }

        // Issue #137: optional advanced-parameter compatibility probe.
        // Only runs when advancedSettingsMode === 'custom' AND the user has
        // actually configured repetitionPenalty or temperature — default
        // mode never sends these, so probing them is wasted LLM tokens.
        if (
          probeSucceeded &&
          testClient instanceof OpenAICompatibleClient &&
          this.settings.advancedSettingsMode === 'custom' &&
          cacheKey &&
          (this.settings.repetitionPenalty !== undefined && this.settings.repetitionPenalty !== 0 ||
            this.settings.extractionTemperature !== undefined ||
            this.settings.chatTemperature !== undefined)
        ) {
          try {
            await testClient.createMessage({
              model: this.settings.model,
              max_tokens: 1,
              messages: [{ role: 'user', content: 'param-probe' }],
              enableThinking: false,
              temperature: this.settings.extractionTemperature ?? this.settings.chatTemperature,
              repetition_penalty: this.settings.repetitionPenalty,
            });
            console.debug('Advanced parameters accepted by', cacheKey);
          } catch (probeErr) {
            // unsupportedFields was populated by the client; user will see
            // a one-time Notice when the next real request runs.
            console.debug(
              `Advanced parameters probe failed for ${cacheKey}; unsupported fields cached. Error: ${(probeErr as Error).message}`
            );
          }
        }
      }
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

      // Issue #137: re-create the shared client so it picks up the
      // freshly-cached thinkingControlDialect. The testClient is a temporary
      // instance that only lives for the probe; the shared client used by
      // wiki-engine, page-factory, query-engine, etc. must also reflect the
      // probe result.
      this.initializeLLMClient();

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
