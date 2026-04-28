import { Plugin, Notice } from 'obsidian';

import {
  PREDEFINED_PROVIDERS,
  DEFAULT_SETTINGS,
  LLMWikiSettings,
  LLMClient
} from './src/types';
import { AnthropicClient, OpenAIClient } from './src/llm-client';
import { TEXTS } from './src/texts';
import { cleanMarkdownResponse } from './src/utils';
import { LLMWikiSettingTab } from './src/settings';
import { WikiEngine } from './src/wiki-engine';
import { QueryModal } from './src/query-engine';
import { FileSuggestModal, FolderSuggestModal, LintReportModal } from './src/modals';
export default class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;
  wikiEngine: WikiEngine;

  async onload() {
    await this.loadSettings();
    this.initializeLLMClient();

    this.wikiEngine = new WikiEngine(
      this.app,
      this.settings,
      () => this.llmClient
    );

    // 注册命令
    this.addCommand({
      id: 'ingest-source',
      name: 'Ingest single source (摄入单个源文件)',
      callback: () => this.selectSourceToIngest()
    });

    this.addCommand({
      id: 'ingest-folder',
      name: 'Ingest from folder (从文件夹批量摄入)',
      callback: () => this.selectFolderToIngest()
    });

    this.addCommand({
      id: 'query-wiki',
      name: 'Query wiki (查询 Wiki)',
      callback: () => this.queryWiki()
    });

    this.addCommand({
      id: 'lint-wiki',
      name: 'Lint wiki (维护 Wiki)',
      callback: () => this.lintWiki()
    });

    this.addCommand({
      id: 'regenerate-index',
      name: 'Regenerate index (重新生成索引)',
      callback: () => this.wikiEngine.generateIndexFromEngine()
    });

    // 设置面板
    this.addSettingTab(new LLMWikiSettingTab(this.app, this));

    console.debug('LLM Wiki Plugin loaded - Karpathy implementation');
  }

  onunload() {
    console.debug('LLM Wiki Plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeLLMClient();
    if (this.wikiEngine) {
      this.wikiEngine.settings = this.settings;
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

  // ==================== 核心功能实现 ====================

  selectSourceToIngest() {
    if (!this.llmClient) {
      new Notice('⚠️ Please configure API key first (请先配置 API key)');
      return;
    }

    new FileSuggestModal(this.app, (file) => {
      this.wikiEngine.ingestSource(file).catch(e => console.error(e));
    }).open();
  }

  selectFolderToIngest() {
    if (!this.llmClient) {
      new Notice('⚠️ Please configure API key first (请先配置 API key)');
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

      new Notice(`开始批量摄入 ${totalFiles} 个文件...`, 10000);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = `(${i + 1}/${totalFiles})`;

        try {
          console.debug(`${progress} 开始摄入: ${file.path}`);
          await this.wikiEngine.ingestSource(file);
          successCount++;
          console.debug(`${progress} 摄入成功: ${file.path}`);
        } catch (error) {
          failedCount++;
          failedFiles.push(file.path);
          console.error(`${progress} 摄入失败: ${file.path}`, error);
          new Notice(`${progress} 摄入失败: ${file.basename}`, 3000);
        }
      }

      // 最终统计报告
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
      new LintReportModal(this.app, cleanedReport).open();
      new Notice('维护完成');

    } catch (error) {
      new Notice('维护失败');
      console.error(error);
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

