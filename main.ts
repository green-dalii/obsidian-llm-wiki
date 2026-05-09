import { Plugin, Notice } from 'obsidian';

import {
  PREDEFINED_PROVIDERS,
  DEFAULT_SETTINGS,
  LLMWikiSettings,
  LLMClient,
  IngestReport
} from './src/types';
import { AnthropicClient, AnthropicCompatibleClient, OpenAIClient } from './src/llm-client';
import { TEXTS } from './src/texts';
import { cleanMarkdownResponse } from './src/utils';
import { isPageEmpty } from './src/wiki/lint-fixes';
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
    const savedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

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

  selectSourceToIngest() {
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new FileSuggestModal(this.app, this.settings.wikiFolder, (file) => {
      new Notice(`Ingesting "${file.basename}" — this may take a while. Watch the wiki folder for new pages.`, 6000);
      this.wikiEngine.ingestSource(file).catch(e => console.error(e));
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

      const totalFiles = files.length;
      const reports: IngestReport[] = [];

      // Collect per-file reports for aggregated summary
      this.wikiEngine.setDoneCallback((report: IngestReport) => {
        reports.push(report);
      });

      this.showProgress(`[0/${totalFiles}] Starting...`);

      new Notice(`Ingesting ${totalFiles} file(s) from "${folder.name}" — this may take several minutes. A report will appear when complete.`, 8000);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          this.showProgress(`[${i + 1}/${totalFiles}] ${file.basename}`);
          console.debug(`(${i + 1}/${totalFiles}) 开始摄入: ${file.path}`);
          await this.wikiEngine.ingestSource(file);
          console.debug(`(${i + 1}/${totalFiles}) 摄入成功: ${file.path}`);
        } catch (error) {
          console.error(`(${i + 1}/${totalFiles}) 摄入失败: ${file.path}`, error);
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
          elapsedSeconds: totalElapsed
        };

        new IngestReportModal(this.app, aggregated, this.settings.language).open();
      } else {
        const texts = TEXTS[this.settings.language];
        new Notice(texts.batchIngestComplete
          .replace('{success}', '0')
          .replace('{total}', String(totalFiles))
          .replace('{fail}', String(totalFiles)), 10000);
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
      const pageMap = new Map<string, { path: string; content: string; basename: string }>();
      for (const file of wikiFiles) {
        const content = await this.app.vault.read(file);
        pageMap.set(file.path, { path: file.path, content, basename: file.basename });
      }

      // Dead links: parse all [[...]] in wiki pages and check against ALL vault files
      const deadLinks: Array<{ source: string; target: string }> = [];
      const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
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

      // ---- 2. Build programmatic findings report ----
      const t = TEXTS[this.settings.language];
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
      if (!deadLinks.length && !emptyPages.length && !orphans.length) {
        progReport += `${t.lintNoIssuesFound}\n\n`;
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
        orphans: orphans.length
      };

      const fixCallbacks: LintFixCallbacks = {
        onFixDeadLinks: deadLinks.length > 0 ? () => {
          void (async () => {
            // Deduplicate: same source+target appears once per wikilink occurrence in page
            const seen = new Set<string>();
            const unique = deadLinks.filter(dl => {
              const key = `${dl.source}::${dl.target}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            let fixed = 0;
            const results: string[] = [];
            for (const dl of unique) {
              new Notice(t.lintFixProgress.replace('{current}', String(fixed)).replace('{total}', String(unique.length)));
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
              }
            }
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
            for (let i = 0; i < emptyPages.length; i++) {
              const ep = emptyPages[i];
              new Notice(t.lintFillProgress.replace('{current}', String(i + 1)).replace('{total}', String(emptyPages.length)));
              try {
                const summary = await this.wikiEngine.fillEmptyPage(ep.path, ep.content);
                filled++;
                results.push(`- ${summary}`);
              } catch (e) {
                console.error(`Failed to expand empty page: ${ep.path}`, e);
                new Notice(t.lintFillFailed.replace('{page}', ep.path));
              }
            }
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
            let linked = 0;
            const results: string[] = [];
            for (const op of orphans) {
              linked++;
              new Notice(t.lintLinkProgress.replace('{current}', String(linked)).replace('{total}', String(orphans.length)));
              try {
                const linkedPages = await this.wikiEngine.linkOrphanPage(op);
                const opRel = op.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
                if (linkedPages.length > 0) {
                  results.push(`- [[${opRel}]] linked from: ${linkedPages.map(p => `[[${p}]]`).join(', ')}`);
                } else {
                  results.push(`- [[${opRel}]]: no suitable linking targets found`);
                }
              } catch (e) {
                console.error(`Failed to link orphan: ${op}`, e);
              }
            }
            new Notice(t.lintLinkComplete.replace('{linked}', String(linked)));
            if (results.length > 0) {
              await this.wikiEngine.generateIndexFromEngine();
              const details = results.join('\n');
              await this.wikiEngine.logLintFix('Link Orphan Pages', details);
              new Notice(t.lintFixIndexUpdated);
            }
          })();
        } : undefined,
        onAnalyzeSchema: () => { void this.suggestSchemaUpdate(); }
      };

      new LintReportModal(this.app, fullReport, fixCallbacks, counts, this.settings.language).open();
      // Always regenerate index after lint — the report reflects current state
      await this.wikiEngine.generateIndexFromEngine();
      new Notice(TEXTS[this.settings.language].lintWikiComplete);

    } catch (error) {
      new Notice(TEXTS[this.settings.language].lintWikiFailed);
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
      new Notice(TEXTS[this.settings.language].schemaSuggestionFailed);
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

