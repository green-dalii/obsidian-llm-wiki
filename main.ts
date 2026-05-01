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
import { LLMWikiSettingTab } from './src/settings';
import { WikiEngine } from './src/wiki-engine';
import { QueryModal } from './src/query-engine';
import { FileSuggestModal, FolderSuggestModal, LintReportModal, IngestReportModal, LintFixCallbacks, LintCounts } from './src/modals';
import { SchemaManager } from './src/schema-manager';
import { AutoMaintainManager } from './src/auto-maintain';
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

    // 注册命令
    this.addCommand({
      id: 'ingest-source',
      name: 'Ingest single source',
      callback: () => this.selectSourceToIngest()
    });

    this.addCommand({
      id: 'ingest-folder',
      name: 'Ingest from folder',
      callback: () => this.selectFolderToIngest()
    });

    this.addCommand({
      id: 'query-wiki',
      name: 'Query wiki',
      callback: () => this.queryWiki()
    });

    this.addCommand({
      id: 'lint-wiki',
      name: 'Lint wiki',
      callback: () => this.lintWiki()
    });

    this.addCommand({
      id: 'regenerate-index',
      name: 'Regenerate index',
      callback: () => {
        void (async () => {
          new Notice('Regenerating index...');
          try {
            await this.wikiEngine.generateIndexFromEngine();
            new Notice('Index regenerated successfully.');
          } catch (err) {
            console.error('Regenerate index failed:', err);
            new Notice(`Failed to regenerate index: ${err instanceof Error ? err.message : String(err)}`);
          }
        })();
      }
    });

    this.addCommand({
      id: 'suggest-schema-update',
      name: 'Suggest schema updates',
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeLLMClient();
    this.schemaManager?.updateSettings(this.settings);
    if (this.wikiEngine) {
      this.wikiEngine.settings = this.settings;
    }
    // Sync auto-maintain features with updated settings
    if (this.autoMaintainManager) {
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
      new Notice('Please configure API key first');
      return;
    }

    new FileSuggestModal(this.app, (file) => {
      this.wikiEngine.ingestSource(file).catch(e => console.error(e));
    }).open();
  }

  selectFolderToIngest() {
    if (!this.llmClient) {
      new Notice('Please configure API key first');
      return;
    }

    new FolderSuggestModal(this.app, (folder) => {
      void (async () => {
      const files = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(folder.path));

      if (files.length === 0) {
        const msg = TEXTS[this.settings.language].selectFolderNoMdFiles.replace('{path}', folder.path);
        new Notice(msg);
        return;
      }

      const totalFiles = files.length;
      let successCount = 0;
      let failedCount = 0;
      const failedFiles: string[] = [];

      // Suppress per-file modal + progress dismissal during batch
      this.wikiEngine.setDoneCallback(() => {});

      this.showProgress(`[0/${totalFiles}] Starting...`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          this.showProgress(`[${i + 1}/${totalFiles}] ${file.basename}`);
          console.debug(`(${i + 1}/${totalFiles}) 开始摄入: ${file.path}`);
          await this.wikiEngine.ingestSource(file);
          console.debug(`(${i + 1}/${totalFiles}) 摄入成功: ${file.path}`);
        } catch (error) {
          failedCount++;
          failedFiles.push(file.path);
          console.error(`(${i + 1}/${totalFiles}) 摄入失败: ${file.path}`, error);
        }
      }

      // Restore single-file report callback
      this.wikiEngine.setDoneCallback((report: IngestReport) => this.onIngestDone(report));

      this.dismissProgress();

      // Batch summary
      const texts = TEXTS[this.settings.language];
      const summary = texts.batchIngestComplete
        .replace('{success}', successCount.toString())
        .replace('{total}', totalFiles.toString())
        .replace('{fail}', failedCount.toString());
      new Notice(summary, 10000);
      console.debug(summary);

      if (failedFiles.length > 0) {
        console.debug('失败的文件列表:', failedFiles);
        const failedNotice = `${texts.batchIngestFailedFiles}\n${failedFiles.slice(0, 5).join('\n')}${failedFiles.length > 5 ? '\n...' : ''}`;
        new Notice(failedNotice, 15000);
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
                     !f.path.includes('log.md'));

      // ---- 1. Programmatic checks ----

      // Collect all page contents and titles
      const pageMap = new Map<string, { path: string; content: string; basename: string }>();
      for (const file of wikiFiles) {
        const content = await this.app.vault.read(file);
        pageMap.set(file.path, { path: file.path, content, basename: file.basename });
      }

      // Build set of all known page targets for dead-link detection
      const knownTargets = new Set<string>();
      for (const { path, basename } of pageMap.values()) {
        knownTargets.add(basename);
        // Also add relative path (e.g. "entities/SomeName")
        const relPath = path.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
        knownTargets.add(relPath);
      }

      // Dead links: parse all [[...]] and check against known targets
      const deadLinks: Array<{ source: string; target: string }> = [];
      const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
      for (const { path, content } of pageMap.values()) {
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(content)) !== null) {
          const target = match[1].trim();
          if (!knownTargets.has(target)) {
            deadLinks.push({
              source: path.replace(this.settings.wikiFolder + '/', '').replace('.md', ''),
              target
            });
          }
        }
        linkRegex.lastIndex = 0;
      }

      // Empty / near-empty pages
      const emptyPages: string[] = [];
      for (const { path, content } of pageMap.values()) {
        const textBody = content.replace(/---[\s\S]*?---/, '').replace(/[#*\-\s\n]/g, '').trim();
        if (textBody.length < 50) {
          emptyPages.push(path.replace(this.settings.wikiFolder + '/', '').replace('.md', ''));
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
        const hasIncoming = incomingLinks.has(basename) || incomingLinks.has(relPath);
        if (!hasIncoming) {
          orphans.push(relPath);
        }
      }

      // ---- 2. Build programmatic findings report ----
      let progReport = '';
      if (deadLinks.length > 0) {
        progReport += `## 断链 (程序检测)\n\n`;
        const showDead = deadLinks.slice(0, 20);
        for (const dl of showDead) {
          progReport += `- [[${dl.source}]] → **${dl.target}** (页面不存在)\n`;
        }
        if (deadLinks.length > 20) progReport += `- ... 共 ${deadLinks.length} 处断链\n`;
        progReport += '\n';
      }
      if (emptyPages.length > 0) {
        progReport += `## 空洞页面 (程序检测)\n\n`;
        for (const ep of emptyPages) {
          progReport += `- [[${ep}]] — 内容不足 50 字符\n`;
        }
        progReport += '\n';
      }
      if (orphans.length > 0) {
        progReport += `## 孤立页面 (程序检测)\n\n`;
        for (const op of orphans) {
          progReport += `- [[${op}]] — 无其他 Wiki 页面链接至此\n`;
        }
        progReport += '\n';
      }
      if (!deadLinks.length && !emptyPages.length && !orphans.length) {
        progReport += `✅ 程序检测未发现断链、空洞或孤立页面。\n\n`;
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
        contradictionsReport = `## 矛盾 (程序检测)\n\n`;
        contradictionsReport += `- 开放矛盾：${remaining.length} 个`;
        const resolvedCount = openContradictions.length - remaining.length;
        if (resolvedCount > 0) {
          contradictionsReport += `（本次自动修复 ${resolvedCount} 个）`;
        }
        contradictionsReport += '\n';
        for (const c of remaining) {
          const relPath = c.path.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          const statusLabel = c.status === 'detected' ? '待处理' :
                              c.status === 'pending_fix' ? '待修复' : c.status;
          contradictionsReport += `- [${statusLabel}] [[${relPath}]] — ${c.claim.substring(0, 80)}\n`;
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

      const prompt = `你是一个 Wiki 维护助手。请基于以下信息检查 Wiki 的健康状况。

Wiki 索引：
${indexContent}

Wiki 页面内容样本（共 ${wikiFiles.length} 页，展示 ${samplePages.length} 页）：
${contentSample}

程序检测结果（已验证，请勿重复报告）：
${progReport || '程序检测未发现问题'}

请检查以下方面（跳过程序已检测的断链/空洞/孤立）：
1. **矛盾** — 不同页面对同一事实的说法是否矛盾
2. **过时** — 是否有声明明显过时
3. **缺失** — 哪些重要概念缺少独立页面
4. **结构** — 页面结构是否合理，交叉引用是否充分

输出格式：使用 Markdown，以 "## LLM 分析" 开头。每个发现用一行 "- [具体问题]"。如无问题则写 "✅ 未发现明显问题。"`;

      const llmReport = await this.llmClient.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      const cleanedLLM = cleanMarkdownResponse(llmReport);

      // ---- 4. Combine and display ----
      const fullReport = `# Wiki 维护报告\n\n> 共 ${wikiFiles.length} 个 Wiki 页面\n\n${progReport}${contradictionsReport}${cleanedLLM.startsWith('##') ? '' : '## LLM 分析\n\n'}${cleanedLLM}`;

      const counts: LintCounts = {
        deadLinks: deadLinks.length,
        emptyPages: emptyPages.length,
        orphans: orphans.length
      };

      const fixCallbacks: LintFixCallbacks = {
        onFixDeadLinks: deadLinks.length > 0 ? () => {
          void (async () => {
            let fixed = 0;
            for (const dl of deadLinks) {
              fixed++;
              new Notice(`Fixing dead links: ${fixed}/${deadLinks.length}...`);
              try {
                const sourcePath = `${this.settings.wikiFolder}/${dl.source}.md`;
                const result = await this.wikiEngine.fixDeadLink(sourcePath, dl.target);
                console.debug(`Dead link fix: ${dl.source} -> ${dl.target}: ${result}`);
              } catch (e) {
                console.error(`Failed to fix dead link: ${dl.source} -> ${dl.target}`, e);
              }
            }
            new Notice(`Dead link fix complete. Fixed ${fixed} items.`);
          })();
        } : undefined,
        onFillEmptyPages: emptyPages.length > 0 ? () => {
          void (async () => {
            let filled = 0;
            for (const ep of emptyPages) {
              filled++;
              new Notice(`Expanding empty pages: ${filled}/${emptyPages.length}...`);
              try {
                const pagePath = `${this.settings.wikiFolder}/${ep}.md`;
                await this.wikiEngine.fillEmptyPage(pagePath);
              } catch (e) {
                console.error(`Failed to expand empty page: ${ep}`, e);
              }
            }
            new Notice(`Page expansion complete. Filled ${filled} pages.`);
          })();
        } : undefined,
        onLinkOrphans: orphans.length > 0 ? () => {
          void (async () => {
            let linked = 0;
            for (const op of orphans) {
              linked++;
              new Notice(`Linking orphans: ${linked}/${orphans.length}...`);
              try {
                const orphanPath = `${this.settings.wikiFolder}/${op}.md`;
                await this.wikiEngine.linkOrphanPage(orphanPath);
              } catch (e) {
                console.error(`Failed to link orphan: ${op}`, e);
              }
            }
            new Notice(`Orphan linking complete. Linked ${linked} pages.`);
          })();
        } : undefined,
        onAnalyzeSchema: () => { void this.suggestSchemaUpdate(); }
      };

      new LintReportModal(this.app, fullReport, fixCallbacks, counts).open();
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

