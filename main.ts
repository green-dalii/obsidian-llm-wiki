import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, Modal } from 'obsidian';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// 统一 LLM 客户端接口
interface LLMClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string>;
}

// Anthropic 客户端实现
class AnthropicClient implements LLMClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    const response = await this.client.messages.create(params);
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}

// OpenAI 客户端实现
class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl || 'https://api.openai.com/v1'
    });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    });
    return response.choices[0]?.message?.content || '';
  }
}

// 插件设置接口
interface LLMWikiSettings {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  openaiBaseUrl?: string;
  sourceFolder: string;
  wikiFolder: string;
  schemaFolder: string;
  autoUpdateInterval: number;
  model: string;
}

const DEFAULT_SETTINGS: LLMWikiSettings = {
  provider: 'anthropic',
  apiKey: '',
  openaiBaseUrl: '',
  sourceFolder: 'sources',
  wikiFolder: 'wiki',
  schemaFolder: 'schema',
  autoUpdateInterval: 3600000,
  model: 'claude-sonnet-4-6'
}

// 主插件类
export default class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;
  updateInterval: number | null = null;

  async onload() {
    await this.loadSettings();
    this.initializeLLMClient();

    // 添加命令到命令面板
    this.addCommand({
      id: 'ingest-sources',
      name: '摄入新资料 (Ingest Sources)',
      callback: () => this.ingestSources()
    });

    this.addCommand({
      id: 'query-wiki',
      name: '查询 Wiki (Query Wiki)',
      callback: () => this.queryWiki()
    });

    this.addCommand({
      id: 'lint-wiki',
      name: '维护 Wiki (Lint Wiki)',
      callback: () => this.lintWiki()
    });

    this.addCommand({
      id: 'generate-index',
      name: '生成索引 (Generate Index)',
      callback: () => this.generateIndex()
    });

    // 添加设置面板
    this.addSettingTab(new LLMWikiSettingTab(this.app, this));

    // 如果设置了自动更新，启动定时器
    if (this.settings.autoUpdateInterval > 0) {
      this.startAutoUpdate();
    }

    console.log('LLM Wiki Plugin loaded');
  }

  onunload() {
    if (this.updateInterval) {
      window.clearInterval(this.updateInterval);
    }
    console.log('LLM Wiki Plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    console.log('设置已持久化');
    this.initializeLLMClient();
    if (this.llmClient && this.settings.apiKey) {
      new Notice('LLM 配置已保存成功');
    }
  }

  // 初始化 LLM 客户端
  private initializeLLMClient() {
    console.log('初始化 LLM 客户端...');
    console.log('Provider:', this.settings.provider);
    console.log('API Key:', this.settings.apiKey ? '已设置' : '未设置');
    console.log('OpenAI Base URL:', this.settings.openaiBaseUrl);

    if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
      console.log('API Key 为空，客户端初始化失败');
      this.llmClient = null;
      return;
    }

    try {
      if (this.settings.provider === 'anthropic') {
        this.llmClient = new AnthropicClient(this.settings.apiKey.trim());
        console.log('Anthropic 客户端初始化成功');
      } else if (this.settings.provider === 'openai') {
        const baseUrl = this.settings.openaiBaseUrl?.trim() || undefined;
        this.llmClient = new OpenAIClient(
          this.settings.apiKey.trim(),
          baseUrl
        );
        console.log('OpenAI 客户端初始化成功，Base URL:', baseUrl || '默认');
      }
    } catch (error) {
      console.error('客户端初始化失败:', error);
      this.llmClient = null;
    }
  }

  // 启动自动更新
  startAutoUpdate() {
    if (this.updateInterval) {
      window.clearInterval(this.updateInterval);
    }
    this.updateInterval = window.setInterval(() => {
      this.lintWiki();
    }, this.settings.autoUpdateInterval);
  }

  // 摄入新资料
  async ingestSources() {
    console.log('摄入命令触发');
    console.log('LLM Client:', this.llmClient ? '已初始化' : '未初始化');
    console.log('Settings:', {
      provider: this.settings.provider,
      apiKey: this.settings.apiKey ? '已设置' : '未设置',
      model: this.settings.model
    });

    if (!this.llmClient) {
      new Notice('请先配置 API Key 并保存设置');
      console.log('客户端未初始化，请检查设置');
      return;
    }

    new Notice('开始摄入资料...');

    try {
      const sourceFolder = this.settings.sourceFolder;
      const files = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(sourceFolder));

      for (const file of files) {
        await this.processSourceFile(file);
      }

      new Notice(`成功摄入 ${files.length} 个文件`);
      await this.generateIndex();
    } catch (error) {
      console.error('摄入失败:', error);
      new Notice('摄入失败，请查看控制台');
    }
  }

  // 处理单个源文件
  async processSourceFile(file: TFile) {
    if (!this.llmClient) {
      throw new Error('LLM client not initialized');
    }

    const content = await this.app.vault.read(file);

    const wikiContent = await this.llmClient.createMessage({
      model: this.settings.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `请分析以下内容，提取关键信息并生成结构化的 Wiki 页面。包括：
1. 核心概念和定义
2. 关键实体及其关系
3. 重要观点和结论
4. 相关主题链接

原始内容：
${content}

请以 Markdown 格式输出，包含适当的 [[双向链接]]。`
      }]
    });

    // 保存到 Wiki 文件夹
    const wikiPath = `${this.settings.wikiFolder}/${file.basename}.md`;
    await this.app.vault.create(wikiPath, wikiContent);

    // 更新日志
    await this.updateLog(`摄入: ${file.basename}`);
  }

  // 查询 Wiki
  async queryWiki() {
    if (!this.llmClient) {
      new Notice('请先配置 API Key');
      return;
    }

    const client = this.llmClient; // 保存引用避免 null 检查

    // 创建查询模态框
    new QueryModal(this.app, async (query) => {
      try {
        if (!client) {
          new Notice('LLM 客户端未初始化');
          return;
        }

        // 收集相关的 Wiki 页面
        const wikiFiles = this.app.vault.getMarkdownFiles()
          .filter(f => f.path.startsWith(this.settings.wikiFolder));

        let context = '';
        for (const file of wikiFiles) {
          const content = await this.app.vault.read(file);
          context += `\n\n---\n## ${file.basename}\n${content}`;
        }

        const answer = await client.createMessage({
          model: this.settings.model,
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `基于以下 Wiki 内容回答问题。如果答案有价值，考虑生成新的 Wiki 页面保存分析。

Wiki 内容：
${context}

问题：${query}`
          }]
        });

        // 显示答案
        new AnswerModal(this.app, answer).open();

      } catch (error) {
        console.error('查询失败:', error);
        new Notice('查询失败，请查看控制台');
      }
    }).open();
  }

  // 维护 Wiki
  async lintWiki() {
    if (!this.llmClient) {
      new Notice('请先配置 API Key');
      return;
    }

    const client = this.llmClient; // 保存引用避免 null 检查

    new Notice('开始维护 Wiki...');

    try {
      const wikiFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(this.settings.wikiFolder));

      // 收集所有 Wiki 内容
      let allContent = '';
      for (const file of wikiFiles) {
        const content = await this.app.vault.read(file);
        allContent += `\n\n---\n## ${file.basename}\n${content}`;
      }

      const issues = await client.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `请分析以下 Wiki 内容，识别：
1. 内容矛盾或不一致的地方
2. 过时或需要更新的声明
3. 孤立的页面（缺少入链）
4. 缺失的重要链接

Wiki 内容：
${allContent}

请以结构化格式输出发现的问题。`
        }]
      });

      // 显示维护建议
      new LintReportModal(this.app, issues).open();

      new Notice('维护完成');
    } catch (error) {
      console.error('维护失败:', error);
      new Notice('维护失败，请查看控制台');
    }
  }

  // 生成索引
  async generateIndex() {
    const wikiFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(this.settings.wikiFolder));

    let indexContent = '# Wiki 索引\n\n';
    indexContent += '## 最近更新\n\n';

    for (const file of wikiFiles) {
      const stat = await this.app.vault.adapter.stat(file.path);
      if (stat) {
        const mtime = new Date(stat.mtime);
        indexContent += `- [[${file.basename}]] (更新于 ${mtime.toLocaleDateString()})\n`;
      }
    }

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    try {
      await this.app.vault.create(indexPath, indexContent);
    } catch {
      await this.app.vault.modify(
        this.app.vault.getAbstractFileByPath(indexPath) as TFile,
        indexContent
      );
    }
  }

  // 更新日志
  async updateLog(action: string) {
    const logPath = `${this.settings.wikiFolder}/log.md`;
    const timestamp = new Date().toISOString();
    const entry = `- ${timestamp}: ${action}\n`;

    try {
      const file = this.app.vault.getAbstractFileByPath(logPath) as TFile;
      const content = await this.app.vault.read(file);
      await this.app.vault.modify(file, content + entry);
    } catch {
      await this.app.vault.create(logPath, `# 操作日志\n\n${entry}`);
    }
  }
}

// 设置面板
class LLMWikiSettingTab extends PluginSettingTab {
  plugin: LLMWikiPlugin;

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'LLM Wiki 设置' });

    // Provider 选择
    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('选择使用的 LLM 提供商')
      .addDropdown(dropdown => dropdown
        .addOption('anthropic', 'Anthropic (Claude)')
        .addOption('openai', 'OpenAI / OpenAI Compatible')
        .setValue(this.plugin.settings.provider)
        .onChange(async (value: 'anthropic' | 'openai') => {
          this.plugin.settings.provider = value;
          if (value === 'anthropic') {
            this.plugin.settings.model = 'claude-sonnet-4-6';
          } else {
            this.plugin.settings.model = 'gpt-4o';
          }
          await this.plugin.saveSettings();
          this.display();
        }));

    // API Key
    new Setting(containerEl)
      .setName('API Key')
      .setDesc(this.plugin.settings.provider === 'anthropic'
        ? 'Anthropic API Key'
        : 'OpenAI API Key')
      .addText(text => text
        .setPlaceholder(this.plugin.settings.provider === 'anthropic'
          ? 'sk-ant-...'
          : 'sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          console.log('API Key onChange 触发，值:', value ? '已输入' : '空');
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
          console.log('设置已保存');
        }));

    // OpenAI Base URL（仅在 OpenAI provider 时显示）
    if (this.plugin.settings.provider === 'openai') {
      new Setting(containerEl)
        .setName('OpenAI Base URL')
        .setDesc('自定义 API endpoint（可选，默认使用官方 API）')
        .addText(text => text
          .setPlaceholder('https://api.openai.com/v1')
          .setValue(this.plugin.settings.openaiBaseUrl || '')
          .onChange(async (value) => {
            this.plugin.settings.openaiBaseUrl = value;
            await this.plugin.saveSettings();
          }));
    }

    // Model
    new Setting(containerEl)
      .setName('模型名称')
      .setDesc(this.plugin.settings.provider === 'anthropic'
        ? 'Claude 模型（如：claude-sonnet-4-6）'
        : 'GPT 模型（如：gpt-4o, gpt-4o-mini）')
      .addText(text => text
        .setPlaceholder(this.plugin.settings.provider === 'anthropic'
          ? 'claude-sonnet-4-6'
          : 'gpt-4o')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        }));

    // 源文件夹
    new Setting(containerEl)
      .setName('源文件夹')
      .setDesc('存放原始资料的文件夹')
      .addText(text => text
        .setPlaceholder('sources')
        .setValue(this.plugin.settings.sourceFolder)
        .onChange(async (value) => {
          this.plugin.settings.sourceFolder = value;
          await this.plugin.saveSettings();
        }));

    // Wiki 文件夹
    new Setting(containerEl)
      .setName('Wiki 文件夹')
      .setDesc('存放生成的 Wiki 页面')
      .addText(text => text
        .setPlaceholder('wiki')
        .setValue(this.plugin.settings.wikiFolder)
        .onChange(async (value) => {
          this.plugin.settings.wikiFolder = value;
          await this.plugin.saveSettings();
        }));

    // 自动更新间隔
    new Setting(containerEl)
      .setName('自动更新间隔（毫秒）')
      .setDesc('自动维护 Wiki 的时间间隔（0 表示禁用）')
      .addText(text => text
        .setPlaceholder('3600000')
        .setValue(String(this.plugin.settings.autoUpdateInterval))
        .onChange(async (value) => {
          this.plugin.settings.autoUpdateInterval = Number(value);
          await this.plugin.saveSettings();
        }));
  }
}

// 查询模态框
class QueryModal extends Modal {
  onSubmit: (query: string) => void;
  query: string = '';

  constructor(app: App, onSubmit: (query: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '查询 Wiki' });

    const input = contentEl.createEl('textarea', {
      attr: {
        placeholder: '输入你的问题...',
        rows: '5',
        style: 'width: 100%; margin: 10px 0;'
      }
    });

    input.addEventListener('input', (e) => {
      this.query = (e.target as HTMLTextAreaElement).value;
    });

    const button = contentEl.createEl('button', { text: '查询' });
    button.addEventListener('click', () => {
      this.onSubmit(this.query);
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// 答案模态框
class AnswerModal extends Modal {
  answer: string;

  constructor(app: App, answer: string) {
    super(app);
    this.answer = answer;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '回答' });
    contentEl.createEl('div', {
      text: this.answer,
      attr: {
        style: 'white-space: pre-wrap; max-height: 60vh; overflow-y: auto;'
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// 维护报告模态框
class LintReportModal extends Modal {
  issues: string;

  constructor(app: App, issues: string) {
    super(app);
    this.issues = issues;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '维护建议' });
    contentEl.createEl('div', {
      text: this.issues,
      attr: {
        style: 'white-space: pre-wrap; max-height: 60vh; overflow-y: auto;'
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}