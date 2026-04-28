import { Plugin, Notice } from 'obsidian';

import {
  PREDEFINED_PROVIDERS,
  DEFAULT_SETTINGS,
  LLMWikiSettings,
  LLMClient,
  IngestReport
} from './src/types';
import { AnthropicClient, OpenAIClient } from './src/llm-client';
import { TEXTS } from './src/texts';
import { cleanMarkdownResponse } from './src/utils';
import { LLMWikiSettingTab } from './src/settings';
import { WikiEngine } from './src/wiki-engine';
import { QueryModal } from './src/query-engine';
import { FileSuggestModal, FolderSuggestModal, LintReportModal, IngestReportModal } from './src/modals';
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
      this.autoMaintainManager.runStartupCheck();
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
      callback: () => this.wikiEngine.generateIndexFromEngine()
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
    this.schemaManager?.invalidateCache();
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
        // Anthropic 使用自己的 SDK
        this.llmClient = new AnthropicClient(this.settings.apiKey.trim());
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
    new IngestReportModal(this.app, report).open();
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
        new Notice(`文件夹 ${folder.path} 中没有 Markdown 文件`);
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
      const summary = `批量摄入完成: 成功 ${successCount}/${totalFiles}, 失败 ${failedCount}`;
      new Notice(summary, 10000);
      console.debug(summary);

      if (failedFiles.length > 0) {
        console.debug('失败的文件列表:', failedFiles);
        new Notice(`失败的文件:\n${failedFiles.slice(0, 5).join('\n')}${failedFiles.length > 5 ? '\n...' : ''}`, 15000);
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
      new Notice('请先配置 API key');
      return;
    }

    new Notice('开始维护 wiki...');

    try {
      const wikiFiles = this.wikiEngine.getExistingWikiPages();
      const indexContent = await this.wikiEngine.tryReadFile(`${this.settings.wikiFolder}/index.md`) || '';

      const prompt = `你是一个 Wiki 维护助手。请检查以下 Wiki 的健康状况。

Wiki 索引：
${indexContent}

Wiki 页面列表：
${wikiFiles.map(p => `- [[${p.title}]]`).join('\n')}

请检查：
1. 矛盾 - 页面间内容矛盾
2. 过时 - 声明可能已过时
3. 孤立 - 无入链的孤立页面
4. 缺失 - 重要概念缺少独立页面
5. 断链 - 双向链接指向不存在的页面
6. 空洞 - 页面内容不足

输出格式：
## 矛盾
- [列出发现的矛盾]

## 过时内容
- [列出过时的声明]

## 孤立页面
- [列出孤立页面]

## 缺失页面
- [建议创建的页面]

## 断链
- [列出断开的链接]

## 其他建议
- [其他维护建议]`;

      const report = await this.llmClient.createMessage({
        model: this.settings.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const cleanedReport = cleanMarkdownResponse(report);
      new LintReportModal(this.app, cleanedReport, () => this.suggestSchemaUpdate()).open();
      new Notice('维护完成');

    } catch (error) {
      new Notice('维护失败');
      console.error(error);
    }
  }

  async suggestSchemaUpdate() {
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    new Notice('正在分析 Wiki 并生成 Schema 建议...');
    try {
      const result = await this.schemaManager.suggestSchemaUpdate('Wiki lint analysis');
      if (result?.changes_needed) {
        new Notice('Schema 建议已生成，请查看 wiki/schema/suggestions.md', 8000);
      } else {
        new Notice('未检测到 Schema 需要更新。', 5000);
      }
    } catch (error) {
      console.error('Schema suggestion failed:', error);
      new Notice('Schema 建议生成失败');
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

