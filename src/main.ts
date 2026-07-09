import { Plugin, Notice, TFile } from 'obsidian';

import {
  PREDEFINED_PROVIDERS,
  LLMWikiSettings,
  LLMClient,
  IngestReport
} from './types';
import { TOKENS_QUERY_MODEL_DETECT, NOTICE_NORMAL, NOTICE_ERROR, NOTICE_ABORT, NOTICE_RATE_LIMIT, COMPATIBLE_SOURCE_EXTENSIONS } from './constants';
import { wrapWithAdvancedSettings } from './llm-client-wrapper';
import { createLLMClientFromSettingsSync, preloadLLMClientModules } from './llm-sdk/create-llm-client';
import { runSchemaAnalyze } from './schema/analyze';

// v1.23.0 P1-7: AI-SDK migration. Eagerly preload SDK modules on plugin
// load so sync `createLLMClient` works without blocking. Failure is
// non-fatal: falls back to legacy llm-client at createLLMClient time.
const aiSdkModulesLoaded: Promise<void> = preloadLLMClientModules();
void aiSdkModulesLoaded.catch((err) => {
  console.warn('[v1.23.0 LLM migration] Failed to preload AI-SDK modules:', err);
});

// Exported for unit tests (see src/__tests__/root/main.test.ts).
// Issue #99 / #128 / #128 follow-up: thin wrapper that injects only the
// advanced settings the user has configured; otherwise the call passes
// through unchanged to preserve the provider default.
//
// v1.23.0 P1-7: AI-SDK migration. The provider dispatch logic was
// rewritten to use Vercel AI-SDK v6 — see src/llm-sdk/create-llm-client.ts.
// The old hand-rolled OpenAICompatibleClient / Anthropic* classes are
// retained as legacy fallbacks in src/llm-client.ts for v1.23.0 backward
// compat (will be removed in v1.24.0 once we've validated the new path
// in production).
export function createLLMClient(settings: LLMWikiSettings): LLMClient {
  // v1.23.0 P1-7: use the AI-SDK-backed factory. Sync shim delegates
  // to the preloaded SDK modules (loaded by preloadLLMClientModules
  // at module-load time above). No more legacy hand-rolled classes.
  const client: LLMClient = createLLMClientFromSettingsSync({
    provider: settings.provider,
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    region: settings.region,
    bedrockAuthMode: settings.bedrockAuthMode,
    awsProfile: settings.awsProfile,
  });

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
import { applySettingsMigrations } from './core/settings-migrations';
import { normalizeVocabularyCsv } from './core/tag-vocab';
import { detectStaleWikiFolders } from './core/query-history-migration-check';
import { buildIngestStatusBarText, BatchProgress } from './core/status-bar';
import { IngestQueue } from './core/ingest-queue';
import { decideProgressDisplay, ProgressScope } from './core/progress-notification';
import { LLMWikiSettingTab } from './ui/settings';
import { WikiEngine } from './wiki/wiki-engine';
import { QueryView, VIEW_TYPE_QUERY } from './wiki/query-engine';
import { FileSuggestModal, FolderSuggestModal, MultiFileSuggestModal, IngestReportModal, ConfirmModal } from './ui/modals';
import { HistoryModal } from './ui/history-modal';
import { SchemaDiffModal } from './ui/schema-diff-modal';
import { applySchemaSuggestion } from './schema/apply-suggestion';
import { SchemaManager } from './schema/schema-manager';
import { AutoMaintainManager } from './schema/auto-maintain';
import { runLintWiki } from './wiki/lint/controller';

export default class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;
  wikiEngine: WikiEngine;
  schemaManager: SchemaManager;
  autoMaintainManager: AutoMaintainManager;
  /**
   * v1.23.0 Phase 5.1.5: single source of truth for the current
   * ingest session. Replaces the old "selected: TFile[]" inside the
   * Multi-File Suggest modal. The modal subscribes to this queue to
   * render a real-time right pane (pending / running / completed /
   * failed). The ingest pipeline (runBatchIngest) calls start() /
   * complete() / remove() around each file's wikiEngine.ingestSource
   * call. Pure data layer; no IO lives here.
   */
  private ingestQueue: IngestQueue = new IngestQueue();
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
      (msg: string) => this.showProgressFor(ProgressScope.IngestAutoWatch, msg),
      // v1.22.6 #204: Dispatch based on report.trigger so watch-mode
      // auto-ingest goes through onAutoIngestDone (Notice) while
      // manual ingest keeps the legacy IngestReportModal behavior.
      (report: IngestReport) => this.onIngestDoneDispatch(report)
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
      // v1.22.6 #204: pass trigger='auto' so periodic/auto lint
      // completion routes to Notice, not LintReportModal.
      () => this.lintWiki('auto')
    );

    if (this.settings.autoWatchSources) {
      this.autoMaintainManager.startWatching();
    }
    this.autoMaintainManager.schedulePeriodicLint();
    // v1.23.0: QuickFixes (Phase 0-4.5) always run on plugin start.
    // The user-facing control is `startupCheckNoticeLevel` (visible/silent)
    // — see settings.ts. The old `startupCheck: boolean` toggle is now
    // permanently on (migrated from any historical false → true).
    void this.autoMaintainManager.runStartupCheck();

    this.registerView(
      VIEW_TYPE_QUERY,
      (leaf) => new QueryView(leaf, this)
    );

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

    // v1.23.0 (#130): multi-file picker. User selects N specific
    // source notes from a two-pane modal (no folder containment),
    // toggles each, then runs them through the same batch pipeline
    // as folder ingest. Fixes the "move notes to a staging folder"
    // workaround: the in-place queue doesn't relocate anything, so
    // the source-path provenance in generated wiki pages stays
    // stable across re-ingest cycles.
    this.addCommand({
      id: 'ingest-multiple-files',
      name: t.cmdIngestMultipleFiles,
      callback: () => this.selectMultipleFilesToIngest()
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

    // v1.22.0 #97: command entry removed — Schema suggestion MUST
    // follow a Lint analysis so the LLM has real data to work with.
    // Direct invocation from the command palette always produces
    // changes_needed=false (no context), which is a confusing no-op.
    // The only valid entry point is the Lint Report Modal's "Suggest
    // Schema Updates" button, which supplies lint findings as context.

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

    // v1.23.0 Phase 5.1.5: Recreate Welcome Note. Useful for users who
    // want to re-run onboarding after changing their domain focus, or
    // who just want to see a freshly-localized copy. Existing file is
    // trashed first so ensure-welcome-note re-creates with current
    // candidates + LLM config. Implementation lives in auto-maintain.ts
    // (the Phase 0 owner).
    this.addCommand({
      id: 'recreate-welcome-note',
      name: t.welcomeNoteRecreateCommand,
      callback: () => void this.autoMaintainManager.recreateWelcomeNote(),
    });

    this.addRibbonIcon('sticker', t.cmdIngestActiveFile, () => {
      this.ingestActiveFile();
    });

    this.addRibbonIcon('message-circle', t.cmdQueryWiki, () => {
      this.queryWiki();
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
      (filename?: string) => {
        const label = getText(this.settings.language, 'lintStatusBar');
        if (this.ingestStatusBar) {
          const text = filename
            ? `${filename} · ${label}`
            : label;
          this.ingestStatusBar.setText(text);
          this.ingestStatusBar.removeClass('llm-wiki-status-bar-hidden');
        }
      },
      () => {
        if (this.ingestStatusBar) {
          this.ingestStatusBar.addClass('llm-wiki-status-bar-hidden');
        }
      }
    );

    // v1.23.2: Wire wikiEngine.updateStatusBar() so fix-runners' dynamic
    // progress messages (e.g. "[3/10] fixing: path/to/file") reach the
    // status bar, not just the static lint label.
    this.wikiEngine.setStatusBarUpdateCallback(
      (text: string) => {
        if (this.ingestStatusBar) {
          this.ingestStatusBar.setText(text);
          this.ingestStatusBar.removeClass('llm-wiki-status-bar-hidden');
        }
      }
    );

    this.addSettingTab(new LLMWikiSettingTab(this.app, this));

    // v1.23.0: First-run Welcome note is now Phase 0 of runStartupCheck
    // (see auto-maintain.ts). Triggered by the unconditional
    // runStartupCheck() above. The standalone runOnboarding() method
    // is gone — single owner = single source of truth.

    // v1.24.0 (Bug C 3.4 / plan C): gradual migration. Pre-v1.24.0
    // chat history contains real wikiFolder-prefixed links. The
    // placeholder scheme (Bug C 3.0) handles new turns correctly, but
    // legacy entries still render the old path. We do NOT auto-migrate
    // (guessing all historical folders is fragile); we show a one-time
    // Notice so the user can decide whether to Clear history.
    this.checkQueryHistoryForStaleFolders();

    console.debug('LLM Wiki Plugin loaded - Karpathy implementation');
  }

  /**
   * Show a one-time Notice when persisted query history contains
   * wiki-link prefixes from a wikiFolder the user is no longer using.
   * Pure check + side-effect free except for the Notice itself; safe
   * to call once on startup.
   */
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

    // v1.18.3 migration REMOVED in v1.22.1 (#199). Previous code at this
    // location unconditionally forced `savedData.startupCheck === false`
    // back to `true` on every plugin load, silently undoing the user's
    // toggle for ~2 years. Migration logic moved to
    // `core/settings-migrations.ts` and then removed entirely. Anyone with
    // `startupCheck: false` on disk today has explicitly chosen that
    // value and we respect it.
    //
    // v1.20.0 migration (disableThinking default flip) now lives in
    // `applySettingsMigrations`. See that file for the version-key gate.
    if (applied.length > 0) {
      console.debug(`loadSettings: applied migrations: ${applied.join(', ')}`);
    }

    // v1.23.0 P2: Diagnostic — log actual queryHistory state on plugin
    // load. Helps confirm whether the persisted history is reaching
    // settings correctly on restart. Will be removed in v1.24.0.
    console.debug(
      '[main.loadSettings] settings.queryHistory =',
      Array.isArray(this.settings.queryHistory) ? `${this.settings.queryHistory.length} messages` : 'NOT an array'
    );

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
      const wikiFolderChanged = this.wikiEngine.updateSettings(this.settings);
      console.debug('[saveSettings] wikiEngine provider updated to:', this.settings.provider);
      // Bug C 3.1: extend wikiFolder-change invalidation to open QueryView
      // PPR graphs (engine handles its own path-keyed caches).
      if (wikiFolderChanged) {
        this.invalidateAllQueryGraphs();
        // Bug C 3.4 / plan C: when the user changes wikiFolder mid-session,
        // the onload Notice won't fire (already shown at startup). Re-run
        // the detection so the user gets the "stale history" prompt
        // immediately, not after the next Obsidian restart.
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
    // Backward-compatible alias: callers without a scope default to manual ingest.
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

  // v1.22.6 #204: Dispatch ingest completion by trigger. Routes
  // watch-mode auto-ingest (trigger='auto') to onAutoIngestDone
  // (Notice, respects autoIngestNotificationLevel), and manual
  // ingest (trigger='manual' or undefined) to the legacy
  // IngestReportModal. Keeps backward compatibility — legacy
  // callers without trigger default to 'manual'.
  /**
   * Drop the engine-level PPR graph cache in WikiEngine and the last-retrieval
   * state in every open QueryView. Used by `onIngestDoneDispatch` (v1.23.2
   * review-C P0) and by `saveSettings` when `wikiFolder` changes (Bug C 3.1).
   * v1.24.0 Bug A: the graph cache is now engine-level (shared), so the engine
   * invalidation is the critical call; per-view invalidation only clears UI state.
   */
  private invalidateAllQueryGraphs(): void {
    const viewLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_QUERY);
    for (const leaf of viewLeaves) {
      if (leaf.view instanceof QueryView) {
        leaf.view.invalidateGraph();
      }
    }
  }

  private onIngestDoneDispatch(report: IngestReport): void {
    // v1.23.2 (review-C P0): any ingest that touches wiki/ invalidates the
    // cached PPR graph in every open QueryView. Without this, a user who
    // ingests new content and then asks a query in the same session
    // answers against the pre-ingest graph (and its pre-ingest neighbors).
    // We walk all leaves of VIEW_TYPE_QUERY because Obsidian lets the user
    // dock multiple Query panels in the workspace.
    this.invalidateAllQueryGraphs();

    if (report.trigger === 'auto') {
      this.onAutoIngestDone(report);
    } else {
      this.dismissProgress();
      new IngestReportModal(this.app, report, this.settings.language).open();
    }
  }

  // v1.22.2 #204: notification-level done callback for watch-mode auto-ingest.
  // When autoIngestNotificationLevel === 'notice' (default), summary is a
  // transient Notice with History Panel hint rather than a blocking modal.
  // When 'modal', opens the full IngestReportModal (unchanged legacy behaviour).
  private onAutoIngestDone(report: IngestReport): void {
    this.dismissProgress();
    const level = this.settings.autoIngestNotificationLevel;
    if (level === 'modal') {
      new IngestReportModal(this.app, report, this.settings.language).open();
      return;
    }
    // 'notice' (default): transient notification + pointer to history panel
    const texts = TEXTS[this.settings.language];
    const summary = report.createdPages?.length > 0
      ? texts.ingestionCreatedPages.replace('{count}', String(report.createdPages.length))
      : texts.ingestionUpdatedPages.replace('{count}', String(report.updatedPages.length));
    const hint = getText(this.settings.language, 'ingestionNoticeHistoryHint');
    new Notice(`✅ ${report.sourceFile}: ${summary}. ${hint}`, NOTICE_ABORT);
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
      this.showProgressFor(ProgressScope.IngestManual, `Ingesting: ${file.basename}`);
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
    this.showProgressFor(ProgressScope.IngestManual, `Ingesting: ${activeFile.basename}`);
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

      void this.runBatchIngest(files, [], `${files.length} files from ${folder.path}`);
    }).open();
  }

  /**
   * v1.23.0 (#130): open the multi-file picker modal. User selects
   * individual source notes via checkbox, dedup happens automatically
   * (toggling a checked file un-checks it). The "Start Ingest" button
   * then runs the same `runBatchIngest` pipeline that folder ingest
   * uses, so the per-file loop, dedup context, and IngestReportModal
   * are shared (no code duplication).
   */
  selectMultipleFilesToIngest() {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new MultiFileSuggestModal(
      this.app,
      this.settings,
      this.ingestQueue,
      // v1.23.0 Phase 5.1.5 stage 5: pass the already-issued job
      // ids to runBatchIngest. The modal does the enqueue (it
      // owns the queue UI), and the worker uses those ids to
      // publish start/complete transitions. Without passing the
      // ids, runBatchIngest used to call enqueue() itself — but
      // enqueue is idempotent against in-flight jobs, so the
      // second call returned no ids and the loop never updated
      // job statuses, leaving every job stuck in 'pending'.
      (ids: string[], files: TFile[]) => {
        if (files.length === 0 || ids.length === 0) return;
        void this.runBatchIngest(files, ids, `${files.length} manually-selected files`);
      },
    ).open();
  }

  /**
   * Shared batch-ingest pipeline used by:
   *   - selectFolderToIngest (folder batch)
   *   - selectMultipleFilesToIngest (#130 — picker)
   *   - (any future entry point that has a flat list of TFile)
   *
   * Responsibilities:
   *   1. Filter out already-ingested files (#184 skip check) and
   *      surface a Notice if any were skipped.
   *   2. Run each remaining file through wikiEngine.ingestSource with
   *      a SHARED batch context (#164: catches in-batch content
   *      duplicates and cross-batch duplicates against existing wiki).
   *   3. Aggregate per-file IngestReports into a single
   *      IngestReportModal at the end (or a Notice when no work was
   *      done). Cancellation between files is respected.
   *
   * `sourceLabel` is the human-readable identifier for the
   * aggregated report (e.g. "12 files from notes/2024" or
   * "3 manually-selected files"). It is NOT used for any file system
   * operation — the in-place ingest path leaves source notes
   * untouched (per #130, fixes the original "move to staging folder"
   * workaround).
   */
  private async runBatchIngest(files: TFile[], jobIds: string[], sourceLabel: string): Promise<void> {
    this.showProgressFor(ProgressScope.IngestManual, 'Checking for already-ingested files...');
    const alreadyIngestedFiles: TFile[] = [];
    const newFiles: TFile[] = [];
    // Aligned with `files` by index — only entries whose id is in
    // jobIds keep their jobId; already-ingested files map to ''.
    // The modal pre-issued the ids; this method is now the
    // single consumer of those ids (it used to enqueue itself,
    // which was a no-op once the modal had already enqueued).
    const alignedJobIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const jobId = jobIds[i] ?? '';
      if (await this.isAlreadyIngested(file)) {
        alreadyIngestedFiles.push(file);
      } else {
        newFiles.push(file);
        alignedJobIds.push(jobId);
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
    this.showProgressFor(ProgressScope.IngestManual, texts.batchIngestStarting
      .replace('{count}', String(ingestCount))
      .replace('{folder}', sourceLabel));

    // #164: shared dedup context for this batch — catches content duplicates
    // within the run and against pages already in the wiki.
    const batchCtx = this.wikiEngine.createBatchContext();

    // v1.23.0 Phase 5.1.5 stage 5: resolve the job ids for this
    // batch. Two paths:
    //
    //   - Modal path: caller already issued ids via
    //     ingestQueue.enqueue (so the modal's "Add to queue" click
    //     immediately reflects in the queue snapshot). Use those
    //     ids directly. alignedJobIds[] was built above aligned by
    //     index with newFiles[] (already-ingested files drop out,
    //     keeping the alignment).
    //
    //   - Folder / "everything else" path: caller passed an empty
    //     jobIds array (the call site doesn't know ids yet). Issue
    //     them here. enqueue() is idempotent against in-flight
    //     duplicates, so re-enqueueing during an active batch is
    //     safe.
    let resolvedJobIds: string[];
    if (jobIds.length > 0) {
      resolvedJobIds = alignedJobIds;
      console.debug(
        `[runBatchIngest] using pre-issued ids (${sourceLabel}):`,
        resolvedJobIds.length, 'jobs'
      );
    } else {
      resolvedJobIds = this.ingestQueue.enqueue(newFiles);
      console.debug(
        `[runBatchIngest] enqueued ${resolvedJobIds.length}/${newFiles.length} jobs (${sourceLabel})`
      );
    }

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const jobId = resolvedJobIds[i];

      try {
        // Mark running BEFORE the await so the modal (if open) sees
        // a 'running' state for this file rather than a 'pending' that
        // never resolves. The job is the only way to address the
        // record across this await boundary.
        if (jobId) {
          this.ingestQueue.start(jobId);
          console.debug(
            `[runBatchIngest] [${i + 1}/${newFiles.length}] start ${file.path} (jobId=${jobId})`
          );
        }
        this.batchProgress = { current: i + 1, total: ingestCount };
        this.showProgressFor(ProgressScope.IngestManual, `[${i + 1}/${ingestCount}] ${file.basename}`);
        console.debug(`(${i + 1}/${ingestCount}) ingesting: ${file.path}`);
        await this.wikiEngine.ingestSource(file, { batchCtx });
        if (this.wikiEngine.wasCancelled) {
          console.debug(`Batch ingestion cancelled at file ${i + 1}/${ingestCount}`);
          // Mark the cancelled job as failed so the right pane
          // shows the cancellation rather than leaving it as 'running'.
          if (jobId) {
            this.ingestQueue.complete(jobId, false, 'Cancelled by user');
            console.debug(`[runBatchIngest] cancelled ${file.path} (jobId=${jobId})`);
          }
          break;
        }
        console.debug(`(${i + 1}/${ingestCount}) ingestion success: ${file.path}`);
        if (jobId) {
          this.ingestQueue.complete(jobId, true);
          console.debug(
            `[runBatchIngest] [${i + 1}/${newFiles.length}] complete ${file.path} (jobId=${jobId})`
          );
        }
      } catch (error) {
        console.error(`(${i + 1}/${ingestCount}) ingestion failed: ${file.path}`, error);
        const errMsg = error instanceof Error ? error.message : String(error);
        new Notice(texts.errorIngestFailed + file.basename + ': ' + errMsg, NOTICE_ERROR);
        if (jobId) this.ingestQueue.complete(jobId, false, errMsg);
      }
    }

    this.batchProgress = null;
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
        sourceFile: sourceLabel,
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
  }

  // ==================== Query ====================

  queryWiki() {
    if (!this.requireLLMReady()) return;
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    void this.activateQueryView();
  }

  private async activateQueryView(): Promise<void> {
    const { workspace } = this.app;

    const existing = workspace.getLeavesOfType(VIEW_TYPE_QUERY);
    if (existing.length > 0) {
      await workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE_QUERY, active: true });
    await workspace.revealLeaf(leaf);
  }

  // ==================== Lint ====================

  async lintWiki(trigger: 'auto' | 'manual' = 'manual'): Promise<void> {
    if (!this.requireLLMReady()) return;
    const signal = this.wikiEngine.startLintOperation();
    try {
      await runLintWiki({
        app: this.app,
        settings: this.settings,
        llmClient: this.llmClient,
        wikiEngine: this.wikiEngine,
        onAnalyzeSchema: (context?: string) => { void this.suggestSchemaUpdate(context); },
      }, signal, trigger);
    } finally {
      this.wikiEngine.endLintOperation();
    }
  }

  // ==================== Schema ====================

  async suggestSchemaUpdate(context?: string) {
    // ROADMAP v1.17.0 P1 #1: delegate to runSchemaAnalyze so the status bar's
    // "click to cancel" works for both this call site and the Lint Report
    // Modal's "Suggest Schema Updates" button (both ultimately reach here).
    //
    // v1.22.0 #97: when the LLM returns new_schema_body, the orchestrator
    // opens the SchemaDiffModal (IDE-style diff + Apply / Regenerate / Cancel).
    await runSchemaAnalyze({
      settings: this.settings,
      llmClient: this.llmClient,
      wikiEngine: this.wikiEngine,
      schemaManager: this.schemaManager,
      requireLLMReady: () => this.requireLLMReady(),
      openSchemaDiffModal: (suggestion) => this.openSchemaDiffModal(suggestion),
      lintAnalysisContext: context,
    });
  }

  /** v1.22.0 #97: open the SchemaDiffModal with the LLM's proposed new body. */
  private openSchemaDiffModal(suggestion: import('./types').SchemaSuggestion): Promise<void> | void {
    const t = (TEXTS as unknown as Record<string, Record<string, string>>)[this.settings.language]
      ?? TEXTS.en as unknown as Record<string, string>;
    // TEMP DEBUG
    console.debug('[SchemaDiffModal] suggestion.suggestions =', JSON.stringify(suggestion.suggestions), 'changes_needed =', suggestion.changes_needed, 'newSchemaBody length =', suggestion.newSchemaBody?.length);
    // v1.22.0 #97: when the LLM reports changes_needed=false, we still
    // open the Modal (so the user can read the LLM's rationale) but
    // disable the Apply button (nothing to apply). The Modal hands
    // back Regenerate (re-prompt) and Cancel as alternatives.
    const isEmpty = !suggestion.changes_needed;
    const modal = new SchemaDiffModal(this.app, {
      currentBody: '',
      newBody: suggestion.newSchemaBody ?? '',
      language: this.settings.language,
      isEmpty,
      rationale: suggestion.suggestions,
      onOpenFile: () => {
        // v1.22.0 #97: hand-edit path. Opens wiki/schema/config.md in
        // the active Obsidian leaf and closes the Modal. The user
        // can tweak the file and then either re-run Suggest Schema
        // Updates or just save — either way the change sticks
        // because the file IS the schema.
        const path = `${this.settings.wikiFolder}/schema/config.md`;
        void this.app.workspace.openLinkText(path, '', false);
      },
      onApply: async () => {
        const result = await applySchemaSuggestion({
          app: this.app,
          currentPath: `${this.settings.wikiFolder}/schema/config.md`,
          newBody: suggestion.newSchemaBody ?? '',
          onCacheInvalidate: () => this.schemaManager.invalidateCache(),
        });
        if (result.success) {
          // v1.22.0 #97: persistent Notice with the backup path so the
          // user has a clear way to recover. The path is what
          // applySchemaSuggestion returned (it contains the ISO timestamp),
          // and a short hint tells them how to restore.
          const restore = t.schemaDiffRestoreHint
            ? t.schemaDiffRestoreHint.replace('{path}', result.backupPath)
            : `Backup saved to ${result.backupPath}. To restore, rename that file back to wiki/schema/config.md in your file explorer.`;
          new Notice(restore, NOTICE_RATE_LIMIT);
        } else {
          new Notice(t.schemaDiffFailed ?? 'Schema apply failed: ' + result.reason, NOTICE_ERROR);
        }
      },
      onRegenerate: async (userHint: string) => {
        const newSuggestion = await this.regenerateSchemaWithHint(suggestion, userHint);
        if (newSuggestion?.newSchemaBody) {
          // v1.22.0 #97: also sync the rationale + isEmpty flag so the
          // modal re-renders both the "why" section and the dual-pane
          // diff. The LLM may have changed its reasoning or decided
          // (this round) that no changes are needed at all.
          modal.setNewBody(newSuggestion.newSchemaBody, {
            rationale: newSuggestion.suggestions,
            isEmpty: !newSuggestion.changes_needed,
          });
        } else {
          new Notice(t.schemaRegenerateNoBody ?? 'Regeneration succeeded but the LLM did not return a new body.', NOTICE_ERROR);
        }
      },
    });
    // Load the current body asynchronously, then push it into the modal.
    // The modal opens immediately with currentBody='' so the user can
    // see the LLM's proposal right away; when loadSchema() resolves the
    // diff is recomputed against the real current body.
    modal.open();
    void this.schemaManager.loadSchema().then((loaded) => {
      modal.setCurrentBody(loaded?.body ?? '');
    });
  }

  /** v1.22.0 #97: re-call the LLM with the user's refinement hint. */
  private async regenerateSchemaWithHint(
    baseSuggestion: import('./types').SchemaSuggestion,
    userHint: string
  ): Promise<import('./types').SchemaSuggestion | null> {
    const ctx = `${baseSuggestion.suggestions || ''}\n\nUser refinement: ${userHint || '(none)'}`;
    return await this.schemaManager.suggestSchemaUpdate(ctx);
  }

  // ==================== Connection Test ====================

  async testLLMConnection(): Promise<{ success: boolean; message: string }> {
    const t = TEXTS[this.settings.language] || TEXTS.en;

    const localNoKeyProviders = ['ollama', 'lmstudio'];
    const isLocalNoKeyProvider = localNoKeyProviders.includes(this.settings.provider);
    if (!isLocalNoKeyProvider && (!this.settings.apiKey || this.settings.apiKey.trim() === '')) {
      return { success: false, message: t.errorNoApiKey || 'API Key is not configured' };
    }

    try {
      const testClient = createLLMClient(this.settings);

      // v1.23.0 P1-7: response is used as a "did it work" probe. AI-SDK's
      // error mapper enriches failures with the provider body, surfaced
      // in the Notice below. The successful response text is discarded.
      await testClient.createMessage({
        model: this.settings.model,
        max_tokens: TOKENS_QUERY_MODEL_DETECT,
        messages: [{
          role: 'user',
          content: 'Test connection. Please reply "Connection successful".'
        }]
      });

      // v1.23.0 P1-7: AI-SDK migration. The 3-tier thinking-control
      // probe (v1.20.0) and advanced-parameter probe (v1.20.0) were
      // hand-rolled to discover per-provider field names. AI-SDK
      // handles this internally (OpenAISdkClient sends
      // reasoningEffort: 'low' for enableThinking=false, AI-SDK
      // abstracts field name selection per model). The probes are
      // no longer needed and have been removed.
      // The Test Connection simply verifies the client returns a
      // 200 (already validated by the createMessage call above).
      this.settings.llmReady = true;
      void this.saveSettings();

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

      // v1.23.0: re-create the shared client so any settings change takes
      // effect immediately. The testClient is a temporary instance that
      // only lives for the probe; the shared client used by wiki-engine,
      // page-factory, query-engine, etc. must also reflect the change.
      // (Previously this comment mentioned "freshly-cached
      // thinkingControlDialect" — that field is @deprecated in v1.23.0
      // because AI-SDK v6 handles thinking-control internally per
      // provider/model. The shared client re-init is still useful for
      // non-thinking-control settings changes like baseURL/apiKey.)
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
