import { NOTICE_SHORT, NOTICE_WATCHER } from '../constants';
// Auto Maintain Manager - File watcher, periodic lint, startup quick fixes

import { App, TAbstractFile, TFile, Notice, Plugin } from 'obsidian';
import { LLMWikiSettings } from '../types';
import { WikiEngine } from '../wiki/wiki-engine';
import { TEXTS } from '../texts';
import { fixPollutedSources, scanPollutedSources } from '../core/sources-normalizer';
import { findIncompletePages, cleanIncompletePages } from '../core/incomplete-page-cleaner';
import { needsLogHeaderMigration, migrateLogHeader } from '../core/log-header';
import { ensureWelcomeNote, type EnsureResult, type VaultAdapter, type VaultCandidate } from '../core/ensure-welcome-note';
import type { LLMClient } from '../types';

export class AutoMaintainManager {
  private app: App;
  settings: LLMWikiSettings;
  private wikiEngine: WikiEngine;
  private plugin: Plugin;

  // Watcher state
  private debounceTimer: number | null = null;
  private pendingFiles: Map<string, TFile> = new Map();
  private recentWrites: Set<string> = new Set();
  private firstChangeTimestamp = 0;
  private readonly MAX_DEBOUNCE_MS = 60000; // Hard cap to prevent indefinite delay

  // Periodic lint state
  private lintIntervalId: number | null = null;
  private lastLintTimestamp = 0;
  private lintCallback: (() => Promise<void>) | null = null;

  // Whether watchers are currently active
  private watching = false;
  private lintScheduled = false;

  constructor(
    app: App,
    settings: LLMWikiSettings,
    wikiEngine: WikiEngine,
    plugin: Plugin,
    lintCallback?: () => Promise<void>
  ) {
    this.app = app;
    this.settings = settings;
    this.wikiEngine = wikiEngine;
    this.plugin = plugin;
    this.lintCallback = lintCallback || null;
  }

  // === File Watcher ===

  // Listen to four event types to cover all file-creation scenarios:
  // - vault.on('create')  → new files within Obsidian (Cmd+N, right-click→New)
  // - vault.on('rename')  → files MOVED into watched folder (drag in file explorer)
  // - vault.on('modify')  → content changes in watched files
  // - metadataCache.on('resolved') → external drag-drop, copy-paste from OS
  // workspace.onLayoutReady prevents startup noise from existing files.
  startWatching(): void {
    if (this.watching) return;

    this.app.workspace.onLayoutReady(() => {
      if (this.watching) return;

      this.plugin.registerEvent(
        this.app.vault.on('create', (file: TAbstractFile) => {
          this.onFileChanged(file);
        })
      );
      this.plugin.registerEvent(
        this.app.vault.on('rename', (file: TAbstractFile, _oldPath: string) => {
          this.onFileChanged(file);
        })
      );
      this.plugin.registerEvent(
        this.app.vault.on('modify', (file: TAbstractFile) => {
          this.onFileChanged(file);
        })
      );
      this.plugin.registerEvent(
        this.app.metadataCache.on('resolved', ((file: TFile) => {
          this.onFileChanged(file);
        }) as unknown as () => void)
      );

      this.watching = true;
      console.debug('AutoMaintain: File watcher started (create+rename+modify+resolved)');
      const texts = TEXTS[this.settings.language];
      new Notice(texts.watcherActiveNotice, NOTICE_WATCHER);
    });
  }

  stopWatching(): void {
    // registerEvent handles cleanup via plugin lifecycle;
    // we just clear our own state
    this.clearDebounce();
    this.pendingFiles.clear();
    this.watching = false;
    console.debug('AutoMaintain: File watcher stopped');
  }

  // Check if a path falls within any watched folder
  private isWatched(path: string): boolean {
    if (this.settings.watchedFolders.length === 0) return false;
    return this.settings.watchedFolders.some(folder => {
      const prefix = folder.endsWith('/') ? folder : `${folder}/`;
      return path.startsWith(prefix);
    });
  }

  // Avoid re-processing on repeated metadataCache events for the same file version
  private lastSeenPaths: Set<string> = new Set();

  private onFileChanged(file: TAbstractFile): void {
    // metadataCache may fire with undefined during plugin load/unload lifecycle
    if (!file) return;

    console.debug(`[AutoMaintain] event: ${file.path}, TFile: ${file instanceof TFile}`);

    if (!(file instanceof TFile)) return;
    if (!file.path.endsWith('.md')) return;

    if (!this.isWatched(file.path)) {
      console.debug(`[AutoMaintain] SKIP: ${file.path} (not watched). Watched: ${JSON.stringify(this.settings.watchedFolders)}`);
      return;
    }

    if (this.recentWrites.has(file.path)) {
      console.debug(`[AutoMaintain] SKIP: ${file.path} (recent write)`);
      return;
    }

    // metadataCache may re-fire for the same file version; dedupe by mtime
    const mtime = file.stat?.mtime || 0;
    const fileKey = `${file.path}::${mtime}`;
    if (this.lastSeenPaths.has(fileKey)) {
      console.debug(`[AutoMaintain] SKIP: ${file.path} (same mtime already seen)`);
      return;
    }
    this.lastSeenPaths.add(fileKey);
    window.setTimeout(() => { this.lastSeenPaths.delete(fileKey); }, 600000);

    console.debug(`[AutoMaintain] DETECTED: ${file.path}, pending: ${this.pendingFiles.size + 1}`);

    // Add to pending batch
    this.pendingFiles.set(file.path, file);

    // Track first change for max-debounce cap
    if (this.firstChangeTimestamp === 0) {
      this.firstChangeTimestamp = Date.now();
    }

    // Calculate delay with max-debounce hard cap
    const elapsed = Date.now() - this.firstChangeTimestamp;
    const delay = Math.max(0, Math.min(
      this.settings.autoWatchDebounceMs,
      this.MAX_DEBOUNCE_MS - elapsed
    ));

    // Reset debounce timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    if (delay <= 0) {
      // Max wait exceeded, process immediately
      void this.processBatch();
    } else {
      this.debounceTimer = window.setTimeout(
        () => { void this.processBatch(); },
        delay
      );
    }
  }

  markRecentWrite(path: string): void {
    this.recentWrites.add(path);
    // Auto-expire after 120 seconds (covers slow LLM responses)
    window.setTimeout(() => {
      this.recentWrites.delete(path);
    }, 120000);
  }

  // Register a write that auto-maintain should not re-trigger on.
  // Called externally (e.g. from wiki-engine callbacks) for files
  // created outside the watcher→ingest flow (like ingestConversation).
  watchWrite(path: string): void {
    if (this.isWatched(path)) {
      this.markRecentWrite(path);
    }
  }

  private async processBatch(): Promise<void> {
    this.debounceTimer = null;
    this.firstChangeTimestamp = 0;
    const files = Array.from(this.pendingFiles.values());
    this.pendingFiles.clear();

    if (files.length === 0) return;

    const sourceFiles = files.filter(f => this.isWatched(f.path));
    if (sourceFiles.length === 0) return;

    const texts = TEXTS[this.settings.language];

    if (this.settings.autoWatchMode === 'notify') {
      new Notice(
        texts.watchIngestNotice.replace('{count}', String(sourceFiles.length)),
        8000
      );
    } else {
      new Notice(texts.autoIngestRunning.replace('{count}', String(sourceFiles.length)), NOTICE_SHORT);

      let successCount = 0;
      let failCount = 0;

      // #164: shared dedup context for this watcher batch — mirrors the folder
      // ingest in main.ts. Catches identical content across files in one run and
      // builds the ingested-hash snapshot once instead of per file.
      const batchCtx = this.wikiEngine.createBatchContext();

      for (const file of sourceFiles) {
        try {
          this.markRecentWrite(file.path);
          await this.wikiEngine.ingestSource(file, { batchCtx });
          successCount++;
        } catch (error) {
          console.error(`Auto-ingest failed for ${file.path}:`, error);
          failCount++;
        }
      }

      new Notice(
        texts.autoIngestComplete
          .replace('{success}', String(successCount))
          .replace('{fail}', String(failCount)),
        failCount > 0 ? 8000 : 5000
      );
    }
  }

  private clearDebounce(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.firstChangeTimestamp = 0;
  }

  // === Periodic Lint ===

  schedulePeriodicLint(): void {
    if (this.lintScheduled) return;
    if (this.settings.periodicLint === 'off') return;

    const intervalMs = this.settings.periodicLint === 'daily'
      ? 24 * 60 * 60 * 1000
      : this.settings.periodicLint === 'weekly'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    this.lintIntervalId = this.plugin.registerInterval(
      window.setInterval(() => {
        void (async () => {
          console.debug('AutoMaintain: Periodic lint tick...');
          try {
            await this.runLint();
          } catch (error) {
            console.error('Scheduled lint failed:', error);
          }
        })();
      }, intervalMs)
    );

    this.lintScheduled = true;
    console.debug(`AutoMaintain: Periodic lint scheduled (${this.settings.periodicLint})`);
  }

  clearPeriodicLint(): void {
    // registerInterval handles cleanup; we just track state
    this.lintScheduled = false;
    console.debug('AutoMaintain: Periodic lint cleared');
  }

  private async runLint(): Promise<void> {
    // Check if any source files have changed since last lint
    const hasChanges = this.hasSourceFilesChanged();
    if (!hasChanges && this.lastLintTimestamp > 0) {
      console.debug('AutoMaintain: No source changes since last lint, skipping');
      return;
    }

    const texts = TEXTS[this.settings.language];
    new Notice(texts.scheduledLintRunning, NOTICE_SHORT);
    this.lastLintTimestamp = Date.now();

    if (this.lintCallback) {
      await this.lintCallback();
    } else {
      // Fallback: lightweight page count if no callback provided
      const pages = await this.wikiEngine.getExistingWikiPages();
      const entities = pages.filter(p => p.path.includes('/entities/')).length;
      const concepts = pages.filter(p => p.path.includes('/concepts/')).length;
      const sources = pages.filter(p => p.path.includes('/sources/')).length;

      new Notice(
        texts.wikiLintStats
          .replace('{pages}', String(pages.length))
          .replace('{entities}', String(entities))
          .replace('{concepts}', String(concepts))
          .replace('{sources}', String(sources)),
        5000
      );
    }
  }

  private hasSourceFilesChanged(): boolean {
    if (this.settings.watchedFolders.length === 0) return true; // no folders configured, always run
    const allFiles = this.app.vault.getMarkdownFiles();
    const sourceFiles = allFiles.filter(f => this.isWatched(f.path));

    for (const file of sourceFiles) {
      if (file.stat.mtime > this.lastLintTimestamp) {
        return true;
      }
    }
    return false;
  }

  // === Startup Quick Fixes ===
  // Runs low-level programmatic fixes on plugin load:
  // - Sources field normalize (Issue #81)
  // - Wiki folder structure verify
  // All operations are read-only unless a file actually needs fixing.

  async runStartupCheck(): Promise<void> {
    // Wait for vault to settle after startup
    await new Promise(resolve => window.setTimeout(resolve, 3000));

    const texts = TEXTS[this.settings.language];
    console.debug('[QuickFixes] ===== Startup quick fixes START =====');
    console.debug(`[QuickFixes] Settings: wikiFolder="${this.settings.wikiFolder}", startupCheck=${this.settings.startupCheck}, language=${this.settings.language}`);

    // ---- Phase 0 (v1.23.0): First-run Welcome note ----
    // Onboarding orchestrator runs FIRST so a freshly-loaded plugin:
    //   - Tier A (empty vault, LLM configured): create Welcome as LLM smoke test
    //   - Tier A (empty vault, no LLM):          Notice only — no Welcome (no useful content)
    //   - Tier B (existing vault, no wiki):     create Welcome with seed candidates
    //   - Tier C (existing wiki):               silent — skip entirely
    // Failures here must NOT block Phase 1+ — wrap in try/catch.
    let welcomeCreated = false;
    let welcomeNotePath: string | undefined;
    try {
      const result = await this.runOnboardingPhase();
      welcomeCreated = !!result.welcomeNotePath;
      welcomeNotePath = result.welcomeNotePath;
      console.debug(`[QuickFixes] Phase 0: Welcome note ${welcomeCreated ? 'CREATED at ' + welcomeNotePath : 'skipped'} (tier=${result.tier})`);
    } catch (e) {
      console.warn('[QuickFixes] Phase 0 failed:', e);
    }

    // ---- Phase 1: Wiki structure check ----
    const wikiFolder = this.settings.wikiFolder;
    const requiredFolders = [
      `${wikiFolder}/entities`,
      `${wikiFolder}/concepts`,
      `${wikiFolder}/sources`,
      `${wikiFolder}/schema`,
    ];
    let structureOk = true;
    const missingFolders: string[] = [];
    for (const folder of requiredFolders) {
      const folderObj = this.app.vault.getAbstractFileByPath(folder);
      if (!folderObj) {
        structureOk = false;
        missingFolders.push(folder);
      }
    }
    // Phase 0 (onboarding) just ran ensureWelcomeNote — if it created
    // the wikiFolder + entities/ subfolder for a fresh-vault Tier B,
    // Phase 1 should now see entities/ present. Otherwise the
    // "missingFolders" report is a true signal to the user.
    console.debug(`[QuickFixes] Phase 1: Wiki structure ${structureOk ? 'OK' : 'INCOMPLETE'}` +
      (missingFolders.length > 0 ? `, missing: ${missingFolders.join(', ')}` : ''));

    // ---- Phase 2: Sources field normalize (Issue #81) ----
    // Scans only files in wikiFolder, only writes files that need fixing.
    let sourcesFilesCleaned = 0;
    let sourcesEntriesCleaned = 0;
    let sourcesFilesScanned = 0;
    let sourcesFilesPolluted = 0;
    try {
      const wikiFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(wikiFolder));
      console.debug(`[QuickFixes] Phase 2: scanning ${wikiFiles.length} files in "${wikiFolder}"`);
      const sourcesPreserveCase = this.settings.slugCase === 'preserve';
      for (const file of wikiFiles) {
        sourcesFilesScanned += 1;
        const content = await this.app.vault.read(file);
        if (!scanPollutedSources(content, wikiFolder, sourcesPreserveCase)) continue;
        sourcesFilesPolluted += 1;
        console.debug(`[QuickFixes] Polluted sources detected in ${file.path}`);
        const { fixed, content: fixedContent } = fixPollutedSources(content, wikiFolder, sourcesPreserveCase);
        if (fixed > 0) {
          await this.app.vault.process(file, () => fixedContent);
          sourcesFilesCleaned += 1;
          sourcesEntriesCleaned += fixed;
          console.debug(`[QuickFixes] Fixed ${file.path} (${fixed} entry normalization)`);
        } else {
          console.debug(`[QuickFixes] Scan reported polluted but fix returned 0 for ${file.path} — possible bug`);
        }
      }
      console.debug(`[QuickFixes] Phase 2 complete: ${sourcesFilesScanned} scanned, ${sourcesFilesPolluted} polluted, ${sourcesFilesCleaned} fixed (${sourcesEntriesCleaned} entries)`);
    } catch (e) {
      console.warn('[QuickFixes] Phase 2 failed:', e);
    }

    // ---- Phase 3: Incomplete-page cleanup (Issue #170) ----
    // Scan wiki/{entities,concepts,sources} for pages whose `generation_complete`
    // flag is stuck at `false` (interrupted ingest, partial write). Archive them
    // so the user can recover from .trash if needed. Pages WITHOUT the field
    // are treated as legacy (preserved) — never wipe existing wikis on upgrade.
    let incompleteFilesScanned = 0;
    let incompleteFilesArchived = 0;
    try {
      const incomplete = await findIncompletePages(this.app, wikiFolder);
      incompleteFilesScanned = incomplete.length;
      if (incomplete.length > 0) {
        incompleteFilesArchived = await cleanIncompletePages(this.app, incomplete);
        console.debug(`[QuickFixes] Phase 3: ${incompleteFilesScanned} incomplete pages found, ${incompleteFilesArchived} archived`);
      } else {
        console.debug('[QuickFixes] Phase 3: no incomplete pages found');
      }
    } catch (e) {
      console.warn('[QuickFixes] Phase 3 failed:', e);
    }

    // ---- Phase 4: Health summary (existing) ----
    const pages = await this.wikiEngine.getExistingWikiPages();
    const entities = pages.filter(p => p.path.includes('/entities/')).length;
    const concepts = pages.filter(p => p.path.includes('/concepts/')).length;
    const sources = pages.filter(p => p.path.includes('/sources/')).length;

    const indexPath = `${wikiFolder}/index.md`;
    const hasIndex = await this.wikiEngine.tryReadFile(indexPath);
    const indexStatus = hasIndex ? '' : ' — index.md missing';
    console.debug(`[QuickFixes] Phase 4: Wiki health — ${pages.length} pages (entities=${entities}, concepts=${concepts}, sources=${sources})${indexStatus}`);

    // ---- Phase 4.5: log.md old-format auto-migration (v1.22.2) ----
    // Non-destructive: replaces the legacy single-line header with the
    // new multi-line header (which now points to Operation History Panel).
    // All existing ## [date time] entries are preserved.
    try {
      const logPath = `${wikiFolder}/log.md`;
      const existingLog = await this.wikiEngine.tryReadFile(logPath);
      const lang = this.settings.language;
      if (existingLog && needsLogHeaderMigration(existingLog, lang)) {
        const migrated = migrateLogHeader(existingLog, lang);
        if (migrated !== null && migrated !== existingLog) {
          await this.wikiEngine.createOrUpdateFile(logPath, migrated);
          console.debug(`[QuickFixes] Phase 4.5: log.md header migrated to v1.22.2 format`);
        }
      }
    } catch (e) {
      console.warn('[QuickFixes] Phase 4.5 failed:', e);
    }

    // ---- Phase 5: Build notice ----
    const structureLabel = structureOk
      ? texts.startupCheckStructureOk
      : texts.startupCheckStructureMissing;
    const sourcesLabel = sourcesFilesCleaned > 0
      ? texts.startupCheckSourcesCleaned
          .replace('{files}', String(sourcesFilesCleaned))
          .replace('{entries}', String(sourcesEntriesCleaned))
      : texts.startupCheckSourcesClean;
    const incompleteLabel = incompleteFilesArchived > 0
      ? texts.startupCheckIncompleteArchived
          .replace('{count}', String(incompleteFilesArchived))
      : texts.startupCheckIncompleteClean;

    const summary = `${texts.startupCheckTitle}\n` +
      `${texts.startupCheckStructureLabel}: ${structureLabel}\n` +
      `${texts.startupCheckSourcesLabel}: ${sourcesLabel}\n` +
      `${incompleteLabel}\n` +
      (welcomeCreated
        ? `${texts.startupCheckWelcomeCreated
            ?.replace('{path}', welcomeNotePath ?? '')}\n`
        : '') +
      `${texts.startupCheckSummary
        .replace('{pages}', String(pages.length))
        .replace('{entities}', String(entities))
        .replace('{concepts}', String(concepts))
        .replace('{sources}', String(sources))}\n` +
      `${texts.startupCheckDisableHint}`;

    console.debug('[QuickFixes] Notice payload:\n' + summary.split('\n').map(l => '  ' + l).join('\n'));
    console.debug('[QuickFixes] ===== Startup quick fixes COMPLETE =====');

    // v1.23.0 follow-up: QuickFixes always runs (the old `startupCheck`
    // toggle is now permanently on). The user-facing control is now
    // `startupCheckNoticeLevel` — 'visible' shows the summary Notice
    // (existing behavior), 'silent' only logs to console + records an
    // entry for the Operation History Panel (added below when implemented).
    if (this.settings.startupCheckNoticeLevel === 'visible') {
      new Notice(summary, 10000);  // 10s — give user time to read
    } else {
      console.debug('[QuickFixes] Notice suppressed by startupCheckNoticeLevel=silent');
    }
  }

  // === Phase 0: Onboarding Welcome Note (v1.23.0) ===

  /**
   * Phase 0 of runStartupCheck. Calls ensureWelcomeNote with a real
   * VaultAdapter over the Obsidian vault + the live LLM client (via
   * the plugin's lazy `() => this.plugin.llmClient` accessor).
   *
   * Returns the EnsureResult so the caller (runStartupCheck) can
   * include the path in the summary Notice.
   */
  private async runOnboardingPhase(): Promise<EnsureResult> {
    const vault = this.makeVaultAdapter();
    const llmClient = (this.plugin as unknown as { llmClient: LLMClient | null }).llmClient;
    return ensureWelcomeNote({
      vault,
      settings: {
        wikiFolder: this.settings.wikiFolder || 'wiki',
        createWelcomeNote: this.settings.createWelcomeNote,
      },
      targetLanguage: this.settings.wikiLanguage || 'en',
      createdAt: new Date().toISOString().slice(0, 10),
      // smokeTestProbe wraps the sync probe in a resolved Promise so
      // the ensure-welcome-note signature is satisfied.
      smokeTestProbe: async () => this.probeLlm(),
      llmClient: llmClient ?? undefined,
      model: this.settings.model,
    });
  }

  /**
   * v1.23.0 Phase 5.1.5 → followup: command-palette entry to delete and
   * re-create the Welcome note with current vault state + LLM config.
   * Used when the user changes wikiFolder or wants a freshly-localized
   * copy.
   */
  async recreateWelcomeNote(): Promise<void> {
    const welcomePath = `${this.settings.wikiFolder || 'wiki'}/Welcome.md`;
    const existing = this.app.vault.getAbstractFileByPath(welcomePath);
    if (existing && existing instanceof TFile) {
      try {
        await this.app.fileManager.trashFile(existing);
      } catch (e) {
        console.error('Failed to delete existing Welcome note:', e);
        new Notice(
          `${TEXTS[this.settings.language].operationFailed ?? 'Operation failed: '}` +
            (e instanceof Error ? e.message : String(e)),
          0
        );
        return;
      }
    }
    const result = await this.runOnboardingPhase();
    if (result.welcomeNotePath) {
      // Show a 5s auto-dismissing confirmation (NOT 0 — that would be
      // sticky). Use NOTICE_NORMAL for transient feedback.
      new Notice(
        `${TEXTS[this.settings.language].welcomeNoteRecreated?.replace('{path}', result.welcomeNotePath) ?? `Welcome note recreated at ${result.welcomeNotePath}`}`,
        5000
      );
    } else {
      new Notice(
        TEXTS[this.settings.language].welcomeNoteNotRecreated ??
          'Welcome note was not recreated. Check LLM configuration.',
        5000
      );
    }
  }

  /**
   * Build a VaultAdapter over the real Obsidian vault. Captures the
   * vault at call-time so vault changes during plugin lifetime are
   * reflected.
   */
  private makeVaultAdapter(): VaultAdapter {
    return {
      exists: async (path: string): Promise<boolean> => {
        return this.app.vault.getAbstractFileByPath(path) !== null;
      },
      listMarkdown: async (): Promise<VaultCandidate[]> => {
        return this.app.vault.getMarkdownFiles().map(f => ({
          path: f.path,
          title: f.basename,
          size: f.stat?.size ?? 0,
        }));
      },
      create: async (path: string, content: string): Promise<void> => {
        const folder = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
        if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
          await this.app.vault.createFolder(folder);
        }
        await this.app.vault.create(path, content);
      },
    };
  }

  /**
   * Local-only LLM configuration probe for the Welcome note's
   * "Configuration Test" section. PURE-LOCAL — does NOT send a real
   * LLM request. We check that the configuration fields are
   * populated; the actual LLM reachability is verified the first time
   * the user runs an ingest / query / lint (which uses the same
   * llmClient that the Welcome translation would use).
   *
   * Why no real call:
   *   1. Avoids burning tokens on every onload just to show a "✅ OK"
   *      indicator. The user's real business call (ingest) is the
   *      proof of life.
   *   2. Thinking-capable models can return empty content for tiny
   *      `max_tokens: 1` probes, which produces a misleading
   *      "⚠️ Failed" even when the user's setup is correct.
   *   3. Keeps the probe independent of LLMClient interface quirks
   *      (no need to invent a max_tokens / enableThinking value).
   *
   * Returns the provider/model name on success, or a structured
   * error message naming the missing field on failure. Never throws
   * — ensure-welcome-note wraps this with try/catch anyway, but
   * defensive-by-default is cheaper.
   */
  private probeLlm(): { ok: boolean; provider?: string; model?: string; error?: string } {
    const llmClient = (this.plugin as unknown as { llmClient: LLMClient | null }).llmClient;
    if (!llmClient) {
      return { ok: false, error: 'LLM client not configured. Open Settings → LLM Provider.' };
    }
    if (!this.settings.apiKey) {
      return { ok: false, error: 'API key not configured.' };
    }
    if (!this.settings.model) {
      return { ok: false, error: 'Model not selected.' };
    }
    return {
      ok: true,
      provider: this.settings.provider,
      model: this.settings.model,
    };
  }

  // === Full Stop ===

  stop(): void {
    this.stopWatching();
    this.clearPeriodicLint();
    this.clearDebounce();
    this.pendingFiles.clear();
  }
}
