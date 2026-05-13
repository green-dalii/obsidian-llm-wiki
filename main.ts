import { Plugin, Notice, TFile } from 'obsidian';

import {
  PREDEFINED_PROVIDERS,
  DEFAULT_SETTINGS,
  LLMWikiSettings,
  LLMClient,
  IngestReport
} from './src/types';
import { AnthropicClient, AnthropicCompatibleClient, OpenAIClient } from './src/llm-client';
import { TEXTS } from './src/texts';
import { PROMPTS } from './src/prompts';
import { cleanMarkdownResponse, slugify, parseFrontmatter, parseJsonResponse } from './src/utils';
import { isPageEmpty, generateDuplicateCandidates } from './src/wiki/lint-fixes';
import { LLMWikiSettingTab } from './src/ui/settings';
import { WikiEngine } from './src/wiki/wiki-engine';
import { QueryModal } from './src/wiki/query-engine';
import { FileSuggestModal, FolderSuggestModal, LintReportModal, IngestReportModal, LintFixCallbacks, LintCounts } from './src/ui/modals';
import { SchemaManager } from './src/schema/schema-manager';
import { AutoMaintainManager } from './src/schema/auto-maintain';
export default class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;
  wikiEngine: WikiEngine;
  schemaManager: SchemaManager;
  autoMaintainManager: AutoMaintainManager;
  private progressNotice: Notice | null = null;

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

    // Wire write-notification callback to prevent watcher loops:
    // every file wiki-engine writes to sources/ is marked as a recent write
    // (wired via constructor above)

    // Initialize auto-maintenance features based on settings
    if (this.settings.autoWatchSources) {
      this.autoMaintainManager.startWatching();
    }
    this.autoMaintainManager.schedulePeriodicLint();
    if (this.settings.startupCheck) {
      void this.autoMaintainManager.runStartupCheck();
    }

    // Register commands (names use i18n — won't update until plugin reload)
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
          new Notice(t.cmdRegenerateIndex + '...');
          try {
            await this.wikiEngine.generateIndexFromEngine();
            new Notice(t.cmdRegenerateIndex + ' ' + 'completed.');
          } catch (err) {
            console.error('Regenerate index failed:', err);
            new Notice(`Failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        })();
      }
    });

    this.addCommand({
      id: 'suggest-schema-update',
      name: t.cmdSuggestSchema,
      callback: () => this.suggestSchemaUpdate()
    });

    // 设置面板
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

    // Backward compatibility: if wikiLanguage was never set, inherit from existing language setting
    if (savedData && !savedData.wikiLanguage) {
      this.settings.wikiLanguage = this.settings.language;
      await this.saveData(this.settings);
    }

    // Backward compat: ensure watchedFolders is an array (older versions had single watchedFolder string)
    if (!Array.isArray(this.settings.watchedFolders)) {
      this.settings.watchedFolders = [];
      console.debug('loadSettings: watchedFolders was not an array, reset to []');
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
    // Sync auto-maintain features with updated settings
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
      // Ollama 不需要 API Key
      this.llmClient = null;
      return;
    }

    try {
      const providerConfig = PREDEFINED_PROVIDERS[this.settings.provider];

      if (this.settings.provider === 'anthropic') {
        // Native Anthropic SDK
        this.llmClient = new AnthropicClient(this.settings.apiKey.trim());
      } else if (this.settings.provider === 'anthropic-compatible') {
        // requestUrl-based client to bypass CORS
        const baseUrl = this.settings.baseUrl?.trim();
        if (baseUrl) {
          this.llmClient = new AnthropicCompatibleClient(this.settings.apiKey.trim(), baseUrl);
        } else {
          this.llmClient = new AnthropicClient(this.settings.apiKey.trim());
        }
      } else {
        // 其他提供商都使用 OpenAI SDK（兼容接口）
        const baseUrl = this.settings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;
        const apiKey = this.settings.provider === 'ollama' ? 'ollama' : this.settings.apiKey.trim();

        this.llmClient = new OpenAIClient(apiKey, baseUrl);
      }

      console.debug('LLM Client initialized:', this.settings.provider, 'baseUrl:', this.settings.baseUrl || PREDEFINED_PROVIDERS[this.settings.provider]?.baseUrl);
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

  // ==================== 核心功能实现 ====================

  /**
   * Check if a source file has already been ingested into the Wiki.
   * Primary check: wiki/sources/${slug}.md exists → considered ingested.
   * Secondary check (optional): if frontmatter.sources exists, verify it contains this file.
   * If frontmatter is missing, still skip (user may have edited manually).
   */
  private async isAlreadyIngested(sourceFile: TFile): Promise<boolean> {
    const slug = slugify(sourceFile.basename);
    const wikiPath = `${this.settings.wikiFolder}/sources/${slug}.md`;

    try {
      const file = this.app.vault.getAbstractFileByPath(wikiPath);
      if (!(file instanceof TFile)) return false; // No corresponding wiki page

      // Primary: wiki page exists, consider it ingested
      // Secondary: optionally verify sources frontmatter, but don't fail if missing
      try {
        const content = await this.app.vault.read(file);
        const fm = parseFrontmatter(content);
        if (fm && fm.sources) {
          // Normalize: sources can be [[path]] or plain path
          const normalizedSources = fm.sources.map(s => {
            const trimmed = s.trim();
            if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
              return trimmed.slice(2, -2).trim();
            }
            return trimmed;
          });
          // Strict: check if this exact file is in sources
          return normalizedSources.includes(sourceFile.path);
        }
        // Frontmatter missing or sources field empty → still consider ingested (page exists)
        return true;
      } catch {
        // Can't read the file, but it exists → still skip to be safe
        return true;
      }
    } catch {
      return false;
    }
  }

  selectSourceToIngest() {
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new FileSuggestModal(this.app, this.settings.wikiFolder, (file) => {
      this.showProgress(`Ingesting: ${file.basename}`);
      this.wikiEngine.ingestSource(file).catch(e => {
        console.error('Single ingest failed:', e);
        const errMsg = e instanceof Error ? e.message : String(e);
        new Notice(TEXTS[this.settings.language].errorIngestFailed + errMsg, 8000);
      });
    }).open();
  }

  selectFolderToIngest() {
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

      // Smart skip: check which files are already ingested
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
        new Notice(texts.batchIngestAllIngested.replace('{total}', String(totalFiles)), 5000);
        return;
      }

      const reports: IngestReport[] = [];

      // Collect per-file reports for aggregated summary
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
          console.debug(`(${i + 1}/${ingestCount}) 开始摄入: ${file.path}`);
          await this.wikiEngine.ingestSource(file);
          console.debug(`(${i + 1}/${ingestCount}) 摄入成功: ${file.path}`);
        } catch (error) {
          console.error(`(${i + 1}/${ingestCount}) 摄入失败: ${file.path}`, error);
          const errMsg = error instanceof Error ? error.message : String(error);
          new Notice(texts.errorIngestFailed + file.basename + ': ' + errMsg, 8000);
        }
      }

      // Restore normal single-file report callback
      this.wikiEngine.setDoneCallback((report: IngestReport) => this.onIngestDone(report));

      this.dismissProgress();

      // Aggregate reports
      if (reports.length > 0) {
        const allCreated = [...new Set(reports.flatMap(r => r.createdPages))];
        const allUpdated = [...new Set(reports.flatMap(r => r.updatedPages))];
        const totalEntities = reports.reduce((sum, r) => sum + r.entitiesCreated, 0);
        const totalConcepts = reports.reduce((sum, r) => sum + r.conceptsCreated, 0);
        const totalContradictions = reports.reduce((sum, r) => sum + r.contradictionsFound, 0);
        const totalElapsed = reports.reduce((sum, r) => sum + (r.elapsedSeconds || 0), 0);
        const allFailedItems = reports.flatMap(r => r.failedItems);
        const allSuccess = reports.every(r => r.success);

        const aggregated: IngestReport = {
          sourceFile: `${reports.length} files from ${folder.path}`,
          createdPages: allCreated,
          updatedPages: allUpdated,
          entitiesCreated: totalEntities,
          conceptsCreated: totalConcepts,
          failedItems: allFailedItems,
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
  queryWiki() {
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    // Open new conversational QueryModal
    new QueryModal(this.app, this).open();
  }

  async lintWiki() {
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new Notice(TEXTS[this.settings.language].lintWikiStart);

    let stageNotice: Notice | null = null;

    try {
      const wikiFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(this.settings.wikiFolder) &&
                     !f.path.includes('index.md') &&
                     !f.path.includes('log.md') &&
                     !f.path.includes('/schema/') &&
                     !f.path.includes('/contradictions/'));

      // ---- 1. Programmatic checks ----

      // Build knownTargets from ALL vault markdown files — wikilinks can point
      // anywhere in the vault, not just inside the wiki folder.
      // Also build a case-folded set for macOS case-insensitive matching.
      const allVaultFiles = this.app.vault.getMarkdownFiles();
      const knownTargets = new Set<string>();
      const knownTargetsLower = new Set<string>();
      for (const file of allVaultFiles) {
        const nameWithoutExt = file.basename.replace('.md', '');
        const addTarget = (t: string) => {
          knownTargets.add(t);
          knownTargetsLower.add(t.toLowerCase());
        };
        addTarget(file.basename);
        addTarget(nameWithoutExt);

        // Register vault-relative path (with and without .md)
        const relPath = file.path.replace('.md', '');
        addTarget(relPath);
        addTarget(file.path);

        // Register all sub-path suffixes so partial-path wikilinks also match
        const parts = relPath.split('/');
        for (let i = 1; i < parts.length; i++) {
          const subPath = parts.slice(i).join('/');
          addTarget(subPath);
          addTarget(subPath + '.md');
        }
      }

      // Collect wiki pages (for scanning and page-level checks)
      const t = TEXTS[this.settings.language];
      const pageMap = new Map<string, { path: string; content: string; basename: string }>();
      stageNotice = new Notice('', 0);
      stageNotice.setMessage(t.lintReadingPages.replace('{count}', String(wikiFiles.length)));
      console.debug(`lintWiki: reading ${wikiFiles.length} wiki pages`);
      let readCount = 0;
      const totalPages = wikiFiles.length;
      for (const file of wikiFiles) {
        const content = await this.app.vault.read(file);
        pageMap.set(file.path, { path: file.path, content, basename: file.basename });
        readCount++;
        if (readCount % 10 === 0 || readCount === totalPages) {
          stageNotice.setMessage(t.lintReadingPagesProgress
            .replace('{current}', String(readCount))
            .replace('{total}', String(totalPages)));
          console.debug(`lintWiki: read ${readCount}/${totalPages} pages`);
        }
      }

      // Dead links: parse all [[...]] in wiki pages and check against ALL vault files
      stageNotice.setMessage(t.lintScanningLinks);
      console.debug('lintWiki: scanning dead links');
      const deadLinks: Array<{ source: string; target: string }> = [];
      const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
      let scanCount = 0;
      for (const { path, content } of pageMap.values()) {
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(content)) !== null) {
          const target = match[1].trim();
          // Exact match first, then case-insensitive (macOS uses case-insensitive FS)
          if (!knownTargets.has(target) && !knownTargetsLower.has(target.toLowerCase())) {
            deadLinks.push({
              source: path.replace(this.settings.wikiFolder + '/', '').replace('.md', ''),
              target
            });
          }
        }
        linkRegex.lastIndex = 0;
        scanCount++;
        if (scanCount % 10 === 0 || scanCount === totalPages) {
          stageNotice.setMessage(t.lintScanningLinksProgress
            .replace('{current}', String(scanCount))
            .replace('{total}', String(totalPages)));
        }
      }

      // Empty / near-empty pages (Bug 1 fix: uses isPageEmpty which properly strips
      // blockquotes, wiki-links, and other non-substantive markdown syntax)
      // Store BOTH path and content so fix callbacks can pass content directly —
      // avoids re-resolving path→TFile which can fail on vault cache inconsistency.
      const emptyPages: Array<{path: string, content: string}> = [];
      for (const { path, content } of pageMap.values()) {
        if (isPageEmpty(content)) {
          emptyPages.push({path, content});
        }
      }

      // Orphan pages (no incoming links from other wiki pages)
      const incomingLinks = new Map<string, string[]>();
      for (const { path, content } of pageMap.values()) {
        const sourceRel = path.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(content)) !== null) {
          const target = match[1].trim();
          if (!incomingLinks.has(target)) incomingLinks.set(target, []);
          incomingLinks.get(target)!.push(sourceRel);
        }
        linkRegex.lastIndex = 0;
      }
      const orphans: string[] = [];
      for (const { path, basename } of pageMap.values()) {
        const relPath = path.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
        const nameWithoutExt = basename.replace('.md', '');
        // Check all possible forms: any of them might appear in incomingLinks
        const forms = [basename, nameWithoutExt, relPath];
        const parts = relPath.split('/');
        for (let i = 1; i < parts.length; i++) {
          const subPath = parts.slice(i).join('/');
          forms.push(subPath);
          forms.push(subPath + '.md');
        }
        const hasIncoming = forms.some(f => incomingLinks.has(f));
        if (!hasIncoming) {
          orphans.push(path);
        }
      }

      // Duplicate detection: three-layer approach
      // Layer 1: Programmatic candidates (shared sources, shared links, title bigram)
      // Layer 2: LLM title scan (cross-lingual, translations, abbreviations)
      // Layer 3: LLM content verification of merged candidates
      let duplicates: Array<{target: string, source: string, reason: string}> = [];
      const entityConceptFiles = wikiFiles.filter(f =>
        f.path.includes('/entities/') || f.path.includes('/concepts/')
      );
      if (entityConceptFiles.length >= 2 && this.llmClient) {
        stageNotice.setMessage(t.lintCheckingDuplicates);
        try {
          // Build page data for candidate generation
          const pagesForDedup: Array<{ path: string; content: string; title: string }> = [];
          for (const file of entityConceptFiles) {
            const info = pageMap.get(file.path);
            if (info) {
              pagesForDedup.push({ path: file.path, content: info.content, title: file.basename });
            }
          }

          // Layer 1: Programmatic candidate generation
          const progCandidates = generateDuplicateCandidates(pagesForDedup);
          console.debug(`lintWiki: programmatic candidates: ${progCandidates.length} pairs`);

          // Layer 2: LLM title scan for cross-lingual/translation duplicates
          const titleList = pagesForDedup.map(p => `- ${p.path} (${p.title})`).join('\n');
          const titleScanPrompt = PROMPTS.lintTitleScanCandidates
            .replace('{{title_list}}', titleList)
            .replace('{{total}}', String(pagesForDedup.length));

          const titleScanResponse = await this.llmClient.createMessage({
            model: this.settings.model,
            max_tokens: 2000,
            messages: [{ role: 'user', content: titleScanPrompt }]
          });

          const titleScanResult = await parseJsonResponse(titleScanResponse) as {
            candidates?: string[][]
          } | null;

          const llmCandidates: Array<{target: string, source: string, reason: string}> = [];
          if (titleScanResult?.candidates?.length) {
            for (const pair of titleScanResult.candidates) {
              if (pair.length === 2) {
                llmCandidates.push({ target: pair[0], source: pair[1], reason: 'Title scan (possible translation/abbreviation)' });
              }
            }
            console.debug(`lintWiki: LLM title scan candidates: ${llmCandidates.length} pairs`);
          }

          // Merge candidates (dedup by sorted pair key)
          const candidateMap = new Map<string, {target: string, source: string, reason: string}>();
          for (const c of [...progCandidates, ...llmCandidates]) {
            const key = [c.target, c.source].sort().join('|||');
            if (!candidateMap.has(key)) candidateMap.set(key, c);
          }
          const mergedCandidates = Array.from(candidateMap.values());
          console.debug(`lintWiki: merged candidates: ${mergedCandidates.length} pairs`);

          // Layer 3: LLM verification of merged candidates
          if (mergedCandidates.length > 0) {
            const candidateList = mergedCandidates.map(c =>
              `- Candidate A: ${c.target}\n  Candidate B: ${c.source}\n  Signal: ${c.reason}`
            ).join('\n');

            const dedupPrompt = PROMPTS.lintDuplicateDetection
              .replace('{{candidates}}', candidateList)
              .replace('{{total}}', String(pagesForDedup.length));

            const dedupResponse = await this.llmClient.createMessage({
              model: this.settings.model,
              max_tokens: 2000,
              messages: [{ role: 'user', content: dedupPrompt }]
            });

            const dedupResult = await parseJsonResponse(dedupResponse) as {
              duplicates?: Array<{target: string, source: string, reason: string}>
            } | null;

            if (dedupResult?.duplicates?.length) {
              duplicates = dedupResult.duplicates;
              console.debug(`lintWiki: LLM confirmed ${duplicates.length} duplicate pairs`);
            }
          }
        } catch (e) {
          console.error('Duplicate detection failed:', e);
          const errMsg = e instanceof Error ? e.message : String(e);
          const errNotice = new Notice(t.lintDuplicateCheckFailedDetail.replace('{step}', 'Layer 2/3 (LLM scan/verify)').replace('{error}', errMsg), 0);
          // Auto-hide after 10s so it doesn't block the report
          window.setTimeout(() => errNotice.hide(), 10000);
        }
      }

      // ---- 2. Build programmatic findings report ----
      let progReport = '';
      if (deadLinks.length > 0) {
        progReport += `## ${t.lintDeadLinkSection}\n\n`;
        const showDead = deadLinks.slice(0, 20);
        for (const dl of showDead) {
          progReport += t.lintDeadLinkItem.replace('{source}', dl.source).replace('{target}', dl.target) + '\n';
        }
        if (deadLinks.length > 20) progReport += t.lintDeadLinkMore.replace('{count}', String(deadLinks.length)) + '\n';
        progReport += '\n';
      }
      if (emptyPages.length > 0) {
        progReport += `## ${t.lintEmptyPageSection}\n\n`;
        for (const ep of emptyPages) {
          const epRel = ep.path.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          progReport += t.lintEmptyPageItem.replace('{page}', epRel) + '\n';
        }
        progReport += '\n';
      }
      if (orphans.length > 0) {
        progReport += `## ${t.lintOrphanSection}\n\n`;
        for (const op of orphans) {
          const opRel = op.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          progReport += t.lintOrphanItem.replace('{page}', opRel) + '\n';
        }
        progReport += '\n';
      }
      if (!deadLinks.length && !emptyPages.length && !orphans.length && !duplicates.length) {
        progReport += `${t.lintNoIssuesFound}\n\n`;
      }

      // Add duplicate section
      if (duplicates.length > 0) {
        progReport += `## ${t.lintDuplicateSection}\n\n`;
        for (const d of duplicates) {
          const targetRel = d.target.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          const sourceRel = d.source.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          progReport += t.lintDuplicateItem
            .replace('{target}', targetRel)
            .replace('{source}', sourceRel)
            .replace('{reason}', d.reason) + '\n';
        }
        progReport += '\n';
      }

      // ---- 2.5 Contradiction scanning ----
      const openContradictions = await this.wikiEngine.getOpenContradictions();
      let contradictionsReport = '';

      // Process review_ok contradictions (user-approved auto-fix)
      const reviewOkItems = openContradictions.filter(c => c.status === 'review_ok');
      for (const c of reviewOkItems) {
        try {
          await this.wikiEngine.resolveContradiction(c.path);
          await this.wikiEngine.updateContradictionStatus(c.path, 'resolved');
          console.debug('Auto-resolved contradiction:', c.path);
        } catch (error) {
          console.error('Failed to resolve contradiction:', c.path, error);
          await this.wikiEngine.updateContradictionStatus(c.path, 'pending_fix');
        }
      }

      // Re-read after processing review_ok items
      const remaining = await this.wikiEngine.getOpenContradictions();
      if (remaining.length > 0) {
        contradictionsReport = `## ${t.lintContradictionSection}\n\n`;
        contradictionsReport += `- ${t.lintContradictionOpen.replace('{count}', String(remaining.length))}`;
        const resolvedCount = openContradictions.length - remaining.length;
        if (resolvedCount > 0) {
          contradictionsReport += ` ${t.lintContradictionAutoFixed.replace('{count}', String(resolvedCount))}`;
        }
        contradictionsReport += '\n';
        for (const c of remaining) {
          const relPath = c.path.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          const statusLabel = c.status === 'detected' ? t.lintContradictionStatusDetected :
                              c.status === 'pending_fix' ? t.lintContradictionStatusPendingFix : c.status;
          contradictionsReport += t.lintContradictionItem
            .replace('{status}', statusLabel)
            .replace('{page}', relPath)
            .replace('{claim}', c.claim.substring(0, 80)) + '\n';
        }
        contradictionsReport += '\n';
      }

      // ---- 3. LLM analysis with page contents ----
      const indexContent = await this.wikiEngine.tryReadFile(`${this.settings.wikiFolder}/index.md`) || '';

      // Send a representative sample of page contents (up to ~6000 chars)
      let contentSample = '';
      const samplePages = wikiFiles.slice(0, 8);
      for (const file of samplePages) {
        const info = pageMap.get(file.path);
        if (info) {
          const body = info.content.substring(0, 600);
          contentSample += `\n### ${info.basename}\n${body}\n`;
        }
      }

      const prompt = t.lintAnalysisPrompt
        .replace('{index}', indexContent)
        .replace('{total}', String(wikiFiles.length))
        .replace('{sample}', String(samplePages.length))
        .replace('{contentSample}', contentSample)
        .replace('{progReport}', progReport || 'No issues detected by programmatic checks.');

      stageNotice.setMessage(t.lintAnalyzingLLM);
      const llmReport = await this.llmClient.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      const cleanedLLM = cleanMarkdownResponse(llmReport);

      // ---- 4. Combine and display ----
      const fullReport = `# ${t.lintReportTitle}\n\n> ${t.lintReportPageCount.replace('{count}', String(wikiFiles.length))}\n\n${progReport}${contradictionsReport}${cleanedLLM.startsWith('##') ? '' : t.lintLLMAnalysisHeading + '\n\n'}${cleanedLLM}`;

      const counts: LintCounts = {
        deadLinks: deadLinks.length,
        emptyPages: emptyPages.length,
        orphans: orphans.length,
        duplicates: duplicates.length
      };

      const fixCallbacks: LintFixCallbacks = {
        onFixDeadLinks: deadLinks.length > 0 ? () => {
          void (async () => {
            const seen = new Set<string>();
            const unique = deadLinks.filter(dl => {
              const key = `${dl.source}::${dl.target}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            let fixed = 0;
            const results: string[] = [];
            const fixNotice = new Notice('', 0);
            for (let i = 0; i < unique.length; i++) {
              const dl = unique[i];
              fixNotice.setMessage(t.lintFixProgress.replace('{current}', String(i + 1)).replace('{total}', String(unique.length)).replace('{target}', dl.target));
              console.debug(`lintFix: dead link ${i + 1}/${unique.length}: ${dl.source} -> ${dl.target}`);
              try {
                const sourcePath = `${this.settings.wikiFolder}/${dl.source}.md`;
                const result = await this.wikiEngine.fixDeadLink(sourcePath, dl.target);
                console.debug(`Dead link fix: ${dl.source} -> ${dl.target}: ${result}`);
                if (!result.includes(t.lintFixNoAction)) {
                  fixed++;
                  results.push(`- [[${dl.source}]]: \`[[${dl.target}]]\` → ${result}`);
                }
              } catch (e) {
                console.error(`Failed to fix dead link: ${dl.source} -> ${dl.target}`, e);
                const errMsg = e instanceof Error ? e.message : String(e);
                new Notice(t.lintFixItemFailed.replace('{target}', dl.target).replace('{error}', errMsg), 8000);
              }
            }
            fixNotice.hide();
            new Notice(t.lintFixDeadComplete.replace('{fixed}', String(fixed)).replace('{total}', String(unique.length)));
            if (fixed > 0) {
              await this.wikiEngine.generateIndexFromEngine();
              const details = results.join('\n');
              await this.wikiEngine.logLintFix('Fix Dead Links', details);
              new Notice(t.lintFixIndexUpdated);
            }
          })();
        } : undefined,
        onFillEmptyPages: emptyPages.length > 0 ? () => {
          void (async () => {
            let filled = 0;
            const results: string[] = [];
            const fixNotice = new Notice('', 0);
            for (let i = 0; i < emptyPages.length; i++) {
              const ep = emptyPages[i];
              fixNotice.setMessage(t.lintFillProgress.replace('{current}', String(i + 1)).replace('{total}', String(emptyPages.length)).replace('{page}', ep.path));
              console.debug(`lintFix: fill empty page ${i + 1}/${emptyPages.length}: ${ep.path}`);
              try {
                const summary = await this.wikiEngine.fillEmptyPage(ep.path, ep.content);
                filled++;
                results.push(`- ${summary}`);
              } catch (e) {
                console.error(`Failed to expand empty page: ${ep.path}`, e);
                const errMsg = e instanceof Error ? e.message : String(e);
                new Notice(t.lintFillFailed.replace('{page}', ep.path).replace('{error}', errMsg), 8000);
              }
            }
            fixNotice.hide();
            new Notice(t.lintFillComplete.replace('{filled}', String(filled)).replace('{total}', String(emptyPages.length)));
            if (filled > 0) {
              await this.wikiEngine.generateIndexFromEngine();
              const details = results.join('\n');
              await this.wikiEngine.logLintFix('Expand Empty Pages', details);
              new Notice(t.lintFixIndexUpdated);
            }
          })();
        } : undefined,
        onLinkOrphans: orphans.length > 0 ? () => {
          void (async () => {
            const results: string[] = [];
            const fixNotice = new Notice('', 0);
            for (let i = 0; i < orphans.length; i++) {
              const op = orphans[i];
              const opRel = op.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
              fixNotice.setMessage(t.lintLinkProgress.replace('{current}', String(i + 1)).replace('{total}', String(orphans.length)).replace('{page}', opRel));
              console.debug(`lintFix: link orphan ${i + 1}/${orphans.length}: ${op}`);
              try {
                const linkedPages = await this.wikiEngine.linkOrphanPage(op);
                if (linkedPages.length > 0) {
                  results.push(`- [[${opRel}]] linked from: ${linkedPages.map(p => `[[${p}]]`).join(', ')}`);
                } else {
                  results.push(`- [[${opRel}]]: no suitable linking targets found`);
                }
              } catch (e) {
                console.error(`Failed to link orphan: ${op}`, e);
                const errMsg = e instanceof Error ? e.message : String(e);
                new Notice(t.lintLinkItemFailed.replace('{page}', opRel).replace('{error}', errMsg), 8000);
              }
            }
            fixNotice.hide();
            new Notice(t.lintLinkComplete.replace('{linked}', String(results.length)));
            if (results.length > 0) {
              await this.wikiEngine.generateIndexFromEngine();
              const details = results.join('\n');
              await this.wikiEngine.logLintFix('Link Orphan Pages', details);
              new Notice(t.lintFixIndexUpdated);
            }
          })();
        } : undefined,
        onAnalyzeSchema: () => { void this.suggestSchemaUpdate(); },
        onMergeDuplicates: duplicates.length > 0 ? () => {
          void (async () => {
            let merged = 0;
            const results: string[] = [];
            const fixNotice = new Notice('', 0);
            for (let i = 0; i < duplicates.length; i++) {
              const d = duplicates[i];
              const sourceRel = d.source.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
              const targetRel = d.target.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
              fixNotice.setMessage(t.lintMergeProgress.replace('{current}', String(i + 1)).replace('{total}', String(duplicates.length)).replace('{source}', sourceRel).replace('{target}', targetRel));
              console.debug(`lintFix: merge duplicates ${i + 1}/${duplicates.length}: ${d.source} → ${d.target}`);
              try {
                const result = await this.wikiEngine.mergeDuplicatePages(d.target, d.source);
                merged++;
                results.push(`- ${d.source} → ${d.target}: ${result}`);
              } catch (e) {
                console.error(`Failed to merge duplicates: ${d.source} → ${d.target}`, e);
                const errMsg = e instanceof Error ? e.message : String(e);
                new Notice(t.lintMergeItemFailed.replace('{source}', sourceRel).replace('{target}', targetRel).replace('{error}', errMsg), 8000);
              }
            }
            fixNotice.hide();
            new Notice(t.lintMergeComplete.replace('{merged}', String(merged)).replace('{total}', String(duplicates.length)));
            if (merged > 0) {
              await this.wikiEngine.generateIndexFromEngine();
              const details = results.join('\n');
              await this.wikiEngine.logLintFix('Merge Duplicate Pages', details);
              new Notice(t.lintFixIndexUpdated);
            }
          })();
        } : undefined,
      };

      stageNotice.hide();
      new LintReportModal(this.app, fullReport, fixCallbacks, counts, this.settings.language).open();
      // Always regenerate index after lint — the report reflects current state
      await this.wikiEngine.generateIndexFromEngine();
      new Notice(TEXTS[this.settings.language].lintWikiComplete);

    } catch (error) {
      stageNotice?.hide();
      const errMsg = error instanceof Error ? error.message : String(error);
      new Notice(TEXTS[this.settings.language].lintWikiFailed + ': ' + errMsg, 0);
      console.error(error);
    }
  }

  async suggestSchemaUpdate() {
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new Notice(TEXTS[this.settings.language].analyzingSchema);
    try {
      const result = await this.schemaManager.suggestSchemaUpdate('Wiki lint analysis');
      if (result?.changes_needed) {
        new Notice(TEXTS[this.settings.language].schemaSuggestionGenerated, 8000);
      } else {
        new Notice(TEXTS[this.settings.language].noSchemaUpdateNeeded, 5000);
      }
    } catch (error) {
      console.error('Schema suggestion failed:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      new Notice(TEXTS[this.settings.language].schemaSuggestionFailed + ': ' + errMsg, 8000);
    }
  }

  // Test LLM Provider connection
  async testLLMConnection(): Promise<{ success: boolean; message: string }> {
    console.debug('测试 LLM 连接...');
    console.debug('当前配置:', {
      provider: this.settings.provider,
      apiKey: this.settings.apiKey ? '已配置' : '未配置',
      baseUrl: this.settings.baseUrl || PREDEFINED_PROVIDERS[this.settings.provider]?.baseUrl || '默认',
      model: this.settings.model
    });

    // Ollama 不需要 API Key
    const isOllama = this.settings.provider === 'ollama';
    if (!isOllama && (!this.settings.apiKey || this.settings.apiKey.trim() === '')) {
      return {
        success: false,
        message: 'API Key 未配置'
      };
    }

    try {
      // 临时初始化客户端进行测试
      let testClient: LLMClient;
      const providerConfig = PREDEFINED_PROVIDERS[this.settings.provider];

      if (this.settings.provider === 'anthropic') {
        testClient = new AnthropicClient(this.settings.apiKey.trim());
      } else if (this.settings.provider === 'anthropic-compatible') {
        const testBaseUrl = this.settings.baseUrl?.trim();
        if (testBaseUrl) {
          testClient = new AnthropicCompatibleClient(this.settings.apiKey.trim(), testBaseUrl);
        } else {
          testClient = new AnthropicClient(this.settings.apiKey.trim());
        }
      } else {
        const baseUrl = this.settings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;
        const apiKey = isOllama ? 'ollama' : this.settings.apiKey.trim();
        testClient = new OpenAIClient(apiKey, baseUrl);
      }

      // 发送测试请求
      const testResponse = await testClient.createMessage({
        model: this.settings.model,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: '测试连接，请回复"连接成功"'
        }]
      });

      console.debug('测试响应:', testResponse);

      return {
        success: true,
        message: `✅ 连接成功！提供商: ${providerConfig?.name || this.settings.provider}`
      };
    } catch (error) {
      console.error('连接测试失败:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `❌ 连接失败: ${errorMsg || '未知错误'}`
      };
    }
  }
}

