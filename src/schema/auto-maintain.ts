// Auto Maintain Manager - File watcher, periodic lint, startup health check

import { App, TAbstractFile, TFile, Notice, Plugin } from 'obsidian';
import { LLMWikiSettings } from '../types';
import { WikiEngine } from '../wiki/wiki-engine';

export class AutoMaintainManager {
  private app: App;
  private settings: LLMWikiSettings;
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

  startWatching(): void {
    if (this.watching) return;

    this.plugin.registerEvent(
      this.app.vault.on('create', (file: TAbstractFile) => this.onFileChanged(file))
    );
    this.plugin.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => this.onFileChanged(file))
    );

    this.watching = true;
    console.debug('AutoMaintain: File watcher started');
  }

  stopWatching(): void {
    // registerEvent handles cleanup via plugin lifecycle;
    // we just clear our own state
    this.clearDebounce();
    this.pendingFiles.clear();
    this.watching = false;
    console.debug('AutoMaintain: File watcher stopped');
  }

  private onFileChanged(file: TAbstractFile): void {
    if (!(file instanceof TFile)) return;
    if (!file.path.endsWith('.md')) return;

    // Only watch files in sources/ folder
    const sourcesPrefix = `${this.settings.wikiFolder}/sources/`;
    if (!file.path.startsWith(sourcesPrefix)) return;

    // Skip files we just wrote ourselves (ingest loop prevention)
    if (this.recentWrites.has(file.path)) return;

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
    activeWindow.setTimeout(() => {
      this.recentWrites.delete(path);
    }, 120000);
  }

  // Register a write that auto-maintain should not re-trigger on.
  // Called externally (e.g. from wiki-engine callbacks) for files
  // created outside the watcher→ingest flow (like ingestConversation).
  watchWrite(path: string): void {
    if (path.startsWith(`${this.settings.wikiFolder}/sources/`)) {
      this.markRecentWrite(path);
    }
  }

  private async processBatch(): Promise<void> {
    this.debounceTimer = null;
    this.firstChangeTimestamp = 0;
    const files = Array.from(this.pendingFiles.values());
    this.pendingFiles.clear();

    if (files.length === 0) return;

    const sourcesPrefix = `${this.settings.wikiFolder}/sources/`;
    const sourceFiles = files.filter(f => f.path.startsWith(sourcesPrefix));
    if (sourceFiles.length === 0) return;

    if (this.settings.autoWatchMode === 'notify') {
      new Notice(
        `Wiki: ${sourceFiles.length} file(s) changed in sources/. Run "Ingest Sources" to process.`,
        8000
      );
    } else {
      new Notice(`Auto-ingesting ${sourceFiles.length} changed file(s)...`, 3000);

      let successCount = 0;
      let failCount = 0;

      for (const file of sourceFiles) {
        try {
          this.markRecentWrite(file.path);
          await this.wikiEngine.ingestSource(file);
          successCount++;
        } catch (error) {
          console.error(`Auto-ingest failed for ${file.path}:`, error);
          failCount++;
        }
      }

      new Notice(
        `Auto-ingest complete: ${successCount} succeeded, ${failCount} failed`,
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

    const intervalMs = this.settings.periodicLint === 'hourly'
      ? 60 * 60 * 1000
      : this.settings.periodicLint === 'daily'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

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

    new Notice('Running scheduled wiki lint...', 3000);
    this.lastLintTimestamp = Date.now();

    if (this.lintCallback) {
      await this.lintCallback();
    } else {
      // Fallback: lightweight page count if no callback provided
      const pages = this.wikiEngine.getExistingWikiPages();
      const entities = pages.filter(p => p.path.includes('/entities/')).length;
      const concepts = pages.filter(p => p.path.includes('/concepts/')).length;
      const sources = pages.filter(p => p.path.includes('/sources/')).length;

      new Notice(
        `Wiki lint: ${pages.length} pages (${entities} entities, ${concepts} concepts, ${sources} sources)`,
        5000
      );
    }
  }

  private hasSourceFilesChanged(): boolean {
    const sourcesPrefix = `${this.settings.wikiFolder}/sources/`;
    const allFiles = this.app.vault.getMarkdownFiles();
    const sourceFiles = allFiles.filter(f => f.path.startsWith(sourcesPrefix));

    for (const file of sourceFiles) {
      if (file.stat.mtime > this.lastLintTimestamp) {
        return true;
      }
    }
    return false;
  }

  // === Startup Check ===

  async runStartupCheck(): Promise<void> {
    // Wait for vault to settle after startup
    await new Promise(resolve => activeWindow.setTimeout(resolve, 3000));

    const pages = this.wikiEngine.getExistingWikiPages();
    const entities = pages.filter(p => p.path.includes('/entities/')).length;
    const concepts = pages.filter(p => p.path.includes('/concepts/')).length;
    const sources = pages.filter(p => p.path.includes('/sources/')).length;

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const hasIndex = await this.wikiEngine.tryReadFile(indexPath);

    new Notice(
      `Wiki health: ${pages.length} pages (${entities} entities, ${concepts} concepts, ${sources} sources)${hasIndex ? '' : ' — index.md missing'}`,
      6000
    );
  }

  // === Full Stop ===

  stop(): void {
    this.stopWatching();
    this.clearPeriodicLint();
    this.clearDebounce();
    this.pendingFiles.clear();
  }
}
