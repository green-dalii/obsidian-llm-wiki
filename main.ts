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
      baseURL: baseUrl || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true // Obsidian 是 Electron 应用，允许在浏览器环境中使用
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
    console.log('插件加载完成，当前设置:', {
      provider: this.settings.provider,
      apiKey: this.settings.apiKey ? '已配置' : '未配置',
      model: this.settings.model,
      openaiBaseUrl: this.settings.openaiBaseUrl || '默认'
    });
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
    console.log('LLM Client 状态:', this.llmClient ? '已初始化' : '未初始化');
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
  initializeLLMClient() {
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
      // 确保 wiki 文件夹存在
      try {
        await this.app.vault.createFolder(this.settings.wikiFolder);
        console.log(`创建 Wiki 文件夹: ${this.settings.wikiFolder}`);
      } catch (error) {
        // 文件夹已存在，忽略错误
        console.log('Wiki 文件夹已存在');
      }

      const sourceFolder = this.settings.sourceFolder;
      const files = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(sourceFolder));

      console.log(`找到 ${files.length} 个源文件`);

      if (files.length === 0) {
        new Notice(`源文件夹 ${sourceFolder} 中没有找到文件`);
        console.log('提示：请在源文件夹中添加 Markdown 文件');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
        try {
          await this.processSourceFile(file);
          successCount++;
          console.log(`成功处理: ${file.basename} (${successCount}/${files.length})`);
        } catch (error) {
          failCount++;
          console.error(`处理失败: ${file.basename}`, error);
        }
      }

      await this.generateIndex();

      const message = `处理完成: ${successCount} 成功, ${failCount} 失败`;
      new Notice(message, 5000);
      console.log(message);

    } catch (error) {
      console.error('摄入失败:', error);
      new Notice(`摄入失败: ${(error as any).message || '未知错误'}`, 8000);
    }
  }

  // 处理单个源文件
  async processSourceFile(file: TFile) {
    if (!this.llmClient) {
      throw new Error('LLM client not initialized');
    }

    console.log('开始处理文件:', file.path);

    // 确保 wiki 文件夹存在
    try {
      await this.app.vault.createFolder(this.settings.wikiFolder);
      console.log(`创建文件夹: ${this.settings.wikiFolder}`);
    } catch (error) {
      // 文件夹已存在，忽略错误
    }

    const content = await this.app.vault.read(file);
    console.log('文件内容长度:', content.length);

    console.log('调用 LLM API...');
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

    console.log('LLM 响应长度:', wikiContent.length);

    // 保存到 Wiki 文件夹
    const wikiPath = `${this.settings.wikiFolder}/${file.basename}.md`;
    const wikiFile = this.app.vault.getAbstractFileByPath(wikiPath);

    if (wikiFile instanceof TFile) {
      await this.app.vault.modify(wikiFile, wikiContent);
      console.log('Wiki 文件已更新:', wikiPath);
    } else {
      await this.app.vault.create(wikiPath, wikiContent);
      console.log('Wiki 文件已创建:', wikiPath);
    }

    // 更新日志
    await this.updateLog(`摄入: ${file.basename}`);
    console.log('文件处理完成:', file.basename);
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
    const indexPath = `${this.settings.wikiFolder}/index.md`;

    // 确保 wiki 文件夹存在
    try {
      await this.app.vault.createFolder(this.settings.wikiFolder);
      console.log(`创建文件夹: ${this.settings.wikiFolder}`);
    } catch (error) {
      // 文件夹已存在，忽略错误
      if (!(error as any).message?.includes('already exists')) {
        console.log('文件夹已存在或创建失败:', error);
      }
    }

    // 获取所有 Wiki 文件
    const wikiFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(this.settings.wikiFolder) && f.basename !== 'index');

    let indexContent = '# Wiki 索引\n\n';
    indexContent += '## 最近更新\n\n';

    for (const file of wikiFiles) {
      try {
        const stat = await this.app.vault.adapter.stat(file.path);
        if (stat) {
          const mtime = new Date(stat.mtime);
          indexContent += `- [[${file.basename}]] (更新于 ${mtime.toLocaleDateString()})\n`;
        }
      } catch (error) {
        console.log('获取文件信息失败:', file.path, error);
      }
    }

    // 创建或更新索引文件
    const indexFile = this.app.vault.getAbstractFileByPath(indexPath);
    if (indexFile instanceof TFile) {
      await this.app.vault.modify(indexFile, indexContent);
      console.log('索引文件已更新:', indexPath);
    } else {
      await this.app.vault.create(indexPath, indexContent);
      console.log('索引文件已创建:', indexPath);
    }
  }

  // 更新日志
  async updateLog(action: string) {
    const logPath = `${this.settings.wikiFolder}/log.md`;
    const timestamp = new Date().toISOString();
    const entry = `- ${timestamp}: ${action}\n`;

    // 确保 wiki 文件夹存在
    try {
      await this.app.vault.createFolder(this.settings.wikiFolder);
    } catch (error) {
      // 文件夹已存在，忽略错误
    }

    // 创建或更新日志文件
    const logFile = this.app.vault.getAbstractFileByPath(logPath);
    if (logFile instanceof TFile) {
      const content = await this.app.vault.read(logFile);
      await this.app.vault.modify(logFile, content + entry);
    } else {
      await this.app.vault.create(logPath, `# 操作日志\n\n${entry}`);
    }
  }

  // 测试 LLM Provider 连接
  async testLLMConnection(): Promise<{ success: boolean; message: string }> {
    console.log('测试 LLM 连接...');
    console.log('当前配置:', {
      provider: this.settings.provider,
      apiKey: this.settings.apiKey ? '已配置' : '未配置',
      model: this.settings.model,
      openaiBaseUrl: this.settings.openaiBaseUrl || '默认'
    });

    if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
      return {
        success: false,
        message: 'API Key 未配置'
      };
    }

    try {
      // 临时初始化客户端进行测试
      let testClient: LLMClient;
      if (this.settings.provider === 'anthropic') {
        testClient = new AnthropicClient(this.settings.apiKey.trim());
      } else {
        testClient = new OpenAIClient(
          this.settings.apiKey.trim(),
          this.settings.openaiBaseUrl?.trim() || undefined
        );
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

      console.log('测试响应:', testResponse);

      return {
        success: true,
        message: `连接成功！响应: "${testResponse.substring(0, 50)}..."`
      };
    } catch (error: any) {
      console.error('连接测试失败:', error);
      return {
        success: false,
        message: `连接失败: ${error.message || '未知错误'}`
      };
    }
  }
}

// 设置面板
class LLMWikiSettingTab extends PluginSettingTab {
  plugin: LLMWikiPlugin;
  tempSettings: LLMWikiSettings; // 临时设置，用于编辑

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.tempSettings = { ...plugin.settings }; // 初始化临时设置
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'LLM Wiki 设置' });

    // 状态提示
    const statusDiv = containerEl.createDiv({ cls: 'llm-wiki-status' });
    const clientStatus = this.plugin.llmClient ? '✅ 已初始化' : '❌ 未初始化';
    statusDiv.createEl('p', {
      text: `LLM Client 状态: ${clientStatus}`,
      attr: { style: 'margin-bottom: 20px; font-weight: bold;' }
    });

    // Provider 选择
    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('选择使用的 LLM 提供商')
      .addDropdown(dropdown => dropdown
        .addOption('anthropic', 'Anthropic (Claude)')
        .addOption('openai', 'OpenAI / OpenAI Compatible')
        .setValue(this.tempSettings.provider)
        .onChange((value: 'anthropic' | 'openai') => {
          this.tempSettings.provider = value;
          if (value === 'anthropic') {
            this.tempSettings.model = 'claude-sonnet-4-6';
          } else {
            this.tempSettings.model = 'gpt-4o';
          }
          this.display(); // 重新渲染面板
        }));

    // API Key
    new Setting(containerEl)
      .setName('API Key')
      .setDesc(this.tempSettings.provider === 'anthropic'
        ? 'Anthropic API Key'
        : 'OpenAI API Key')
      .addText(text => text
        .setPlaceholder(this.tempSettings.provider === 'anthropic'
          ? 'sk-ant-...'
          : 'sk-...')
        .setValue(this.tempSettings.apiKey)
        .onChange((value) => {
          this.tempSettings.apiKey = value;
        }));

    // OpenAI Base URL（仅在 OpenAI provider 时显示）
    if (this.tempSettings.provider === 'openai') {
      new Setting(containerEl)
        .setName('OpenAI Base URL')
        .setDesc('自定义 API endpoint（可选，默认使用官方 API）')
        .addText(text => text
          .setPlaceholder('https://api.openai.com/v1')
          .setValue(this.tempSettings.openaiBaseUrl || '')
          .onChange((value) => {
            this.tempSettings.openaiBaseUrl = value;
          }));
    }

    // Model
    new Setting(containerEl)
      .setName('模型名称')
      .setDesc(this.tempSettings.provider === 'anthropic'
        ? 'Claude 模型（如：claude-sonnet-4-6）'
        : 'GPT 模型（如：gpt-4o, gpt-4o-mini）')
      .addText(text => text
        .setPlaceholder(this.tempSettings.provider === 'anthropic'
          ? 'claude-sonnet-4-6'
          : 'gpt-4o')
        .setValue(this.tempSettings.model)
        .onChange((value) => {
          this.tempSettings.model = value;
        }));

    // 分隔线
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });

    // 操作按钮区域
    const buttonContainer = containerEl.createDiv({ cls: 'llm-wiki-buttons' });

    // 测试连接按钮
    new Setting(buttonContainer)
      .setName('测试连接')
      .setDesc('验证当前配置是否能成功连接到 LLM Provider')
      .addButton(button => button
        .setButtonText('测试连接')
        .onClick(async () => {
          button.setButtonText('测试中...');
          button.setDisabled(true);

          // 先保存临时设置到插件设置
          this.plugin.settings = { ...this.tempSettings };
          this.plugin.initializeLLMClient();

          const result = await this.plugin.testLLMConnection();

          button.setButtonText('测试连接');
          button.setDisabled(false);

          if (result.success) {
            new Notice(result.message, 5000);
          } else {
            new Notice(result.message, 8000);
          }
        }));

    // 保存设置按钮
    new Setting(buttonContainer)
      .setName('保存设置')
      .setDesc('保存当前配置到插件数据文件')
      .addButton(button => button
        .setButtonText('保存设置')
        .setCta() // 突出显示主要按钮
        .onClick(async () => {
          // 保存临时设置到插件设置
          this.plugin.settings = { ...this.tempSettings };
          await this.plugin.saveSettings();

          new Notice('设置已保存成功！', 3000);

          // 刷新面板以显示最新状态
          this.display();
        }));

    // 分隔线
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });

    // 其他设置
    containerEl.createEl('h3', { text: '文件夹配置' });

    // 源文件夹
    new Setting(containerEl)
      .setName('源文件夹')
      .setDesc('存放原始资料的文件夹')
      .addText(text => text
        .setPlaceholder('sources')
        .setValue(this.tempSettings.sourceFolder)
        .onChange((value) => {
          this.tempSettings.sourceFolder = value;
        }));

    // Wiki 文件夹
    new Setting(containerEl)
      .setName('Wiki 文件夹')
      .setDesc('存放生成的 Wiki 页面')
      .addText(text => text
        .setPlaceholder('wiki')
        .setValue(this.tempSettings.wikiFolder)
        .onChange((value) => {
          this.tempSettings.wikiFolder = value;
        }));

    // 自动更新间隔
    new Setting(containerEl)
      .setName('自动更新间隔（毫秒）')
      .setDesc('自动维护 Wiki 的时间间隔（0 表示禁用）')
      .addText(text => text
        .setPlaceholder('3600000')
        .setValue(String(this.tempSettings.autoUpdateInterval))
        .onChange((value) => {
          this.tempSettings.autoUpdateInterval = Number(value);
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