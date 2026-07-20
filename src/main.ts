import { Plugin, Notice } from 'obsidian';

import {
  LLMWikiSettings,
  LLMClient,
  IngestReport,
} from './types';
import { NOTICE_NORMAL, NOTICE_ABORT } from './constants';
import { preloadLLMClientModules } from './llm-sdk/create-llm-client';
import { allowsEmptyApiKey } from './core/local-no-key-provider';
import { createLLMClient } from './core/create-plugin-llm-client';

// v1.23.0 P1-7: AI-SDK migration. Eagerly preload SDK modules on plugin
// load so sync `createLLMClient` works without blocking. Failure is
// non-fatal: falls back to legacy llm-client at createLLMClient time.
const aiSdkModulesLoaded: Promise<void> = preloadLLMClientModules();
void aiSdkModulesLoaded.catch((err) => {
  console.warn('[v1.23.0 LLM migration] Failed to preload AI-SDK modules:', err);
});
import { TEXTS } from './texts';
import { getText } from './core/i18n';
import { applySettingsMigrations } from './core/settings-migrations';
import { normalizeVocabularyCsv } from './core/tag-vocab';
import { detectStaleWikiFolders } from './core/query-history-migration-check';
import { BatchProgress } from './core/status-bar';
import { IngestQueue } from './core/ingest-queue';
import { decideProgressDisplay, ProgressScope } from './core/progress-notification';
import { WikiEngine } from './wiki/wiki-engine';
import { QueryView, VIEW_TYPE_QUERY } from './wiki/query-engine';
import { IngestReportModal, ConfirmModal } from './ui/modals';
import { SchemaManager } from './schema/schema-manager';
import { AutoMaintainManager } from './schema/auto-maintain';

// v1.25.1 Phase C-PR3: Mixin method implementations.
import { pdfCacheCommands } from './main-commands/pdf-cache-commands';
import type { PdfCacheMethods } from './main-commands/pdf-cache-commands';
import { connectionCommands } from './main-commands/connection-commands';
import type { ConnectionCommandsMethods } from './main-commands/connection-commands';
import { schemaCommands } from './main-commands/schema-commands';
import type { SchemaCommandsMethods } from './main-commands/schema-commands';
import { queryLintCommands } from './main-commands/query-lint-commands';
import type { QueryLintMethods } from './main-commands/query-lint-commands';
import { ingestCommands } from './main-commands/ingest-commands';
import type { IngestMethods } from './main-commands/ingest-commands';
import { registerWikiCommands } from './main-commands/command-registry';

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- C-PR3: intentional interface+class merge for mixin pattern
export class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;
  wikiEngine: WikiEngine;
  schemaManager: SchemaManager;
  autoMaintainManager: AutoMaintainManager;
  ingestQueue: IngestQueue = new IngestQueue();
  progressNotice: Notice | null = null;
  ingestStatusBar: HTMLElement | null = null;
  batchProgress: BatchProgress | null = null;

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
      // but the variable is assigned below. By the time wikiEngine calls
      // this callback (during file writes), autoMaintainManager is guaranteed
      // to exist. This is intentional — reordering the assignments would break it.
      (path: string) => this.autoMaintainManager.watchWrite(path),
      (msg: string) => {
        if (this.ingestStatusBar) {
          this.ingestStatusBar.setText(msg);
          this.ingestStatusBar.removeClass('llm-wiki-status-bar-hidden');
        }
        this.showProgressFor(ProgressScope.IngestAutoWatch, msg);
      },
      (report: IngestReport) => this.onIngestDoneDispatch(report),
      (typeof activeWindow !== 'undefined' ? activeWindow.crypto : undefined)?.subtle
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
      () => this.lintWiki('auto')
    );

    void this.performPdfCacheHousekeeping();

    if (this.settings.autoWatchSources) {
      this.autoMaintainManager.startWatching();
    }
    this.autoMaintainManager.schedulePeriodicLint();
    void this.autoMaintainManager.runStartupCheck();

    this.registerView(
      VIEW_TYPE_QUERY,
      (leaf) => new QueryView(leaf, this)
    );

    // v1.25.1 Phase C-PR3: command registration, ribbon icons, status
    // bar, and wiki-engine callbacks extracted to command-registry.ts.
    registerWikiCommands(this);

    this.checkQueryHistoryForStaleFolders();

    console.debug('LLM Wiki Plugin loaded - Karpathy implementation');
  }

  private checkQueryHistoryForStaleFolders(): void {
    const history = this.settings.queryHistory;
    if (!Array.isArray(history) || history.length === 0) return;
    const detection = detectStaleWikiFolders(history, this.settings.wikiFolder);
    if (!detection || !detection.hasStale) return;
    new Notice(getText(this.settings.language, 'queryHistoryMigrationNotice'), NOTICE_NORMAL);
  }

  onunload() {
    this.autoMaintainManager?.stop();
    console.debug('LLM Wiki Plugin unloaded');
  }

  async loadSettings() {
    const savedData = await this.loadData() as Partial<LLMWikiSettings> | null;
    const { settings, applied } = applySettingsMigrations(savedData);
    this.settings = settings;

    if (savedData && !savedData.wikiLanguage) {
      this.settings.wikiLanguage = this.settings.language;
      await this.saveData(this.settings);
    }

    if (!Array.isArray(this.settings.watchedFolders)) {
      this.settings.watchedFolders = [];
      console.debug('loadSettings: watchedFolders was not an array, reset to []');
    }

    if (applied.length > 0) {
      console.debug(`loadSettings: applied migrations: ${applied.join(', ')}`);
    }

    console.debug(
      '[main.loadSettings] settings.queryHistory =',
      Array.isArray(this.settings.queryHistory) ? `${this.settings.queryHistory.length} messages` : 'NOT an array'
    );

    if (savedData && !('llmReady' in savedData)) {
      const hasConfig = savedData.provider
        && allowsEmptyApiKey(savedData.provider, savedData.apiKey)
        && savedData.model;
      this.settings.llmReady = !!hasConfig;
      if (hasConfig) {
        console.debug('loadSettings: existing user with config detected, llmReady = true');
      }
    }
  }

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
      const wikiFolderChanged = this.wikiEngine.updateSettings(this.settings);
      console.debug('[saveSettings] wikiEngine provider updated to:', this.settings.provider);
      if (wikiFolderChanged) {
        this.invalidateAllQueryGraphs();
        this.checkQueryHistoryForStaleFolders();
      }
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
    if (!allowsEmptyApiKey(this.settings.provider, this.settings.apiKey)) {
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

  // ==================== Progress helpers ====================

  private showProgress(msg: string): void {
    this.showProgressFor(ProgressScope.IngestManual, msg);
  }

  private showProgressFor(scope: ProgressScope, msg: string): void {
    const decision = decideProgressDisplay(scope, false, true);
    if (decision.display === 'notice+status-bar') {
      if (this.progressNotice) {
        this.progressNotice.setMessage(msg);
      } else {
        this.progressNotice = new Notice(msg, 0);
      }
    }
    this.ingestStatusBar?.removeClass('llm-wiki-status-bar-hidden');
  }

  private dismissProgress(): void {
    if (this.progressNotice) {
      this.progressNotice.hide();
      this.progressNotice = null;
    }
  }

  // ==================== Ingest dispatch ====================

  private onIngestDoneDispatch(report: IngestReport): void {
    this.invalidateAllQueryGraphs();
    if (report.trigger === 'auto') {
      this.onAutoIngestDone(report);
    } else {
      this.dismissProgress();
      new IngestReportModal(this.app, report, this.settings.language).open();
    }
  }

  private onAutoIngestDone(report: IngestReport): void {
    this.dismissProgress();
    const level = this.settings.autoIngestNotificationLevel;
    if (level === 'modal') {
      new IngestReportModal(this.app, report, this.settings.language).open();
      return;
    }
    const texts = TEXTS[this.settings.language];
    const summary = report.createdPages?.length > 0
      ? texts.ingestionCreatedPages.replace('{count}', String(report.createdPages.length))
      : texts.ingestionUpdatedPages.replace('{count}', String(report.updatedPages.length));
    const hint = getText(this.settings.language, 'ingestionNoticeHistoryHint');
    new Notice(`✅ ${report.sourceFile}: ${summary}. ${hint}`, NOTICE_ABORT);
  }
}

// v1.25.1 Phase C-PR3: Interface merge — makes tsc see mixed-in
// method signatures on the LLMWikiPlugin instance type.
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- C-PR3 mixin pattern
export interface LLMWikiPlugin extends PdfCacheMethods, ConnectionCommandsMethods,
  SchemaCommandsMethods, QueryLintMethods, IngestMethods {}

// v1.25.1 Phase C-PR3: prototype injection — copies runtime
// implementations from each mixin module onto the class prototype.
Object.assign(LLMWikiPlugin.prototype, pdfCacheCommands, connectionCommands,
  schemaCommands, queryLintCommands, ingestCommands);

export default LLMWikiPlugin;
