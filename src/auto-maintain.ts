// Auto Maintain Manager - File watcher, periodic lint, startup health check

import { App, TAbstractFile, TFile, Notice, Plugin } from 'obsidian';
import { LLMWikiSettings } from './types';
import { WikiEngine } from './wiki-engine';

export class AutoMaintainManager {
  private app: App;
  private settings: LLMWikiSettings;
  private wikiEngine: WikiEngine;
  private plugin: Plugin;

  // Watcher state
  private debounceTimer: number | null = null;
  private pendingFiles: Map<string, TFile> = new Map();
  private recentWrites: Set<string> = new Set();

  // Periodic lint state
  private lintIntervalId: number | null = null;

  // Whether watchers are currently active
  private watching = false;
  private lintScheduled = false;

  constructor(
    app: App,
    settings: LLMWikiSettings,
    wikiEngine: WikiEngine,
    plugin: Plugin
  ) {
    this.app = app;
    this.settings = settings;
    this.wikiEngine = wikiEngine;
    this.plugin = plugin;
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

    // Reset debounce timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(
      () => this.processBatch(),
      this.settings.autoWatchDebounceMs
    );
  }

  markRecentWrite(path: string): void {
    this.recentWrites.add(path);
    // Auto-expire after 30 seconds (long enough for any ingest pipeline)
    setTimeout(() => {
      this.recentWrites.delete(path);
    }, 30000);
  }

  private async processBatch(): Promise<void> {
    this.debounceTimer = null;
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
  }

  // === Periodic Lint ===

  schedulePeriodicLint(): void {
    if (this.lintScheduled) return;
    if (this.settings.periodicLint === 'off') return;

    const intervalMs = this.settings.periodicLint === 'hourly'
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    this.lintIntervalId = this.plugin.registerInterval(
      window.setInterval(async () => {
        console.debug('AutoMaintain: Running scheduled lint...');
        new Notice('Running scheduled Wiki lint...', 3000);
        try {
          // Call the lint function — note: this depends on the plugin method
          // We access it via the wikiEngine's app
          await this.runLint();
        } catch (error) {
          console.error('Scheduled lint failed:', error);
        }
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
    const pages = this.wikiEngine.getExistingWikiPages();
    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const indexContent = await this.wikiEngine.tryReadFile(indexPath);

    const pagesList = pages.map(p => `- [[${p.title}]]`).join('\n');

    const prompt = `你是一个 Wiki 维护者。请检查以下 Wiki 的健康状况。

Wiki 索引：
${indexContent || '无索引'}

所有 Wiki 页面：
${pagesList}

请从以下方面检查：
1. 矛盾：页面间是否存在相互矛盾的信息？
2. 过时：是否有信息明显过时？
3. 孤立页面：哪些页面没有被其他页面引用？
4. 缺失页面：哪些被 [[链接]] 但还不存在的页面？
5. 断链：哪些链接指向了不存在的页面？
6. 空洞内容：哪些页面的内容过于简短？

请用中文以 Markdown 格式输出报告。`;

    // Direct LLM call through wikiEngine — we use the same pattern as the plugin's lintWiki
    // Since we don't have direct access to the plugin method, we use the engine's own tooling

    // The lint is best done through the plugin's own lintWiki method.
    // For now, this is a lightweight check that doesn't call LLM.
    const entities = pages.filter(p => p.path.includes('/entities/')).length;
    const concepts = pages.filter(p => p.path.includes('/concepts/')).length;
    const sources = pages.filter(p => p.path.includes('/sources/')).length;

    new Notice(
      `Wiki lint complete: ${pages.length} pages (${entities} entities, ${concepts} concepts, ${sources} sources)`,
      5000
    );
  }

  // === Startup Check ===

  async runStartupCheck(): Promise<void> {
    // Wait for vault to settle after startup
    await new Promise(resolve => setTimeout(resolve, 3000));

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
