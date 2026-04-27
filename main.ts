import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, Notice, Modal, FuzzySuggestModal, MarkdownRenderer } from 'obsidian';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Import modular components from src directory
import {
  PREDEFINED_PROVIDERS,
  DEFAULT_SETTINGS,
  LLMWikiSettings,
  LLMClient,
  SourceAnalysis,
  EntityInfo,
  ConceptInfo,
  ContradictionInfo,
  WikiPage
} from './src/types';
import { AnthropicClient, OpenAIClient } from './src/llm-client';
import { TEXTS } from './src/texts';
import { PROMPTS } from './src/prompts';
import { slugify, parseJsonResponse, cleanMarkdownResponse } from './src/utils';
import { LLMWikiSettingTab } from './src/settings';
import { WikiEngine } from './src/wiki-engine';
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
      name: 'Ingest Single Source (摄入单个源文件)',
      callback: () => this.selectSourceToIngest()
    });

    this.addCommand({
      id: 'ingest-folder',
      name: 'Ingest from Folder (从文件夹批量摄入)',
      callback: () => this.selectFolderToIngest()
    });

    this.addCommand({
      id: 'query-wiki',
      name: 'Query Wiki (查询 Wiki)',
      callback: () => this.queryWiki()
    });

    this.addCommand({
      id: 'lint-wiki',
      name: 'Lint Wiki (维护 Wiki)',
      callback: () => this.lintWiki()
    });

    this.addCommand({
      id: 'regenerate-index',
      name: 'Regenerate Index (重新生成索引)',
      callback: () => this.wikiEngine.generateIndexFromEngine()
    });

    // 设置面板
    this.addSettingTab(new LLMWikiSettingTab(this.app, this));

    console.log('LLM Wiki Plugin loaded - Karpathy implementation');
  }

  onunload() {
    console.log('LLM Wiki Plugin unloaded');
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

      console.log('LLM Client initialized:', this.settings.provider, 'baseUrl:', this.settings.baseUrl || PREDEFINED_PROVIDERS[this.settings.provider]?.baseUrl);
    } catch (error) {
      console.error('LLM Client initialization failed:', error);
      this.llmClient = null;
    }
  }

  // ==================== 核心功能实现 ====================

  async selectSourceToIngest() {
    if (!this.llmClient) {
      new Notice('⚠️ Please configure API Key first (请先配置 API Key)');
      return;
    }

    new FileSuggestModal(this.app, async (file) => {
      await this.wikiEngine.ingestSource(file);
    }).open();
  }

  async selectFolderToIngest() {
    if (!this.llmClient) {
      new Notice('⚠️ Please configure API Key first (请先配置 API Key)');
      return;
    }

    new FolderSuggestModal(this.app, async (folder) => {
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
          console.log(`${progress} 开始摄入: ${file.path}`);
          await this.wikiEngine.ingestSource(file);
          successCount++;
          console.log(`${progress} 摄入成功: ${file.path}`);
        } catch (error: any) {
          failedCount++;
          failedFiles.push(file.path);
          console.error(`${progress} 摄入失败: ${file.path}`, error);
          new Notice(`${progress} 摄入失败: ${file.basename}`, 3000);
        }
      }

      // 最终统计报告
      const summary = `批量摄入完成: 成功 ${successCount}/${totalFiles}, 失败 ${failedCount}`;
      new Notice(summary, 10000);
      console.log(summary);

      if (failedFiles.length > 0) {
        console.log('失败的文件列表:', failedFiles);
        new Notice(`失败的文件:\n${failedFiles.slice(0, 5).join('\n')}${failedFiles.length > 5 ? '\n...' : ''}`, 15000);
      }
    }).open();
  }
  async queryWiki() {
    if (!this.llmClient) {
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    // Open new conversational QueryModal
    new QueryModal(this.app, this).open();
  }

  async lintWiki() {
    if (!this.llmClient) {
      new Notice('请先配置 API Key');
      return;
    }

    new Notice('开始维护 Wiki...');

    try {
      const wikiFiles = await this.wikiEngine.getExistingWikiPages();
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

      const report = await this.llmClient!.createMessage({
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

  // Convert conversation to Wiki knowledge
  async ingestConversation(history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  }): Promise<void> {
    if (!this.llmClient) {
      throw new Error('LLM Client not initialized');
    }

    console.log('=== Starting conversation extraction ===');

    // Get actual system date
    const actualDate = new Date().toISOString().split('T')[0];
    console.log('[系统时间]', actualDate);

    // Read Wiki index for entity/concept name validation
    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const existingWikiIndex = await this.wikiEngine.tryReadFile(indexPath) || 'Wiki is empty';
    console.log('[Wiki索引]', existingWikiIndex ? '已读取' : '为空');

    // 1. Format conversation to structured text
    const conversationText = this.formatConversation(history);

    // 2. LLM analysis (generate semantic title, extract knowledge)
    const analysisPrompt = this.settings.language === 'en'
      ? `You are a Wiki knowledge extraction assistant.

Existing Wiki Index (use this as reference for entity/concept names):
${existingWikiIndex}

User conversation with AI:
${conversationText}

Convert this conversation into structured Wiki pages.

Focus on:
1. Extracting key knowledge points (not full conversation log)
2. Identifying core concepts and entities discussed
3. Summarizing conversation topic and conclusions
4. Entity/concept names should match existing Wiki pages if possible

Actual conversation date: ${actualDate} (use this, do not generate date yourself)

Output JSON format:
{
  "source_title": "Semantic Topic Title (no date, describe the discussion topic)",
  "summary": "Conversation topic summary",
  "entities": [
    {
      "name": "Short Reference Name",
      "type": "person|organization|project|other",
      "summary": "Entity information summary",
      "mentions_in_source": ["Specific mentions in conversation"]
    }
  ],
  "concepts": [
    {
      "name": "Concept Name",
      "type": "theory|method|technology|term|other",
      "summary": "Concept definition",
      "mentions_in_source": ["Specific mentions in conversation"],
      "related_concepts": ["Related Concept 1", "Related Concept 2"]
    }
  ],
  "key_points": ["Point 1", "Point 2"],
  "created_pages": [],
  "updated_pages": []
}

CRITICAL RULES:
- source_title: Semantic title describing discussion topic (NOT date-based generic title)
- entity.name: Choose or extract appropriate name from Wiki index (maintain consistency with existing Wiki)
- concept.name: Same principle - reference Wiki index for concept names
- mentions_in_source: REQUIRED field - list actual mentions in conversation text
- If no entities/concepts found, use empty arrays [] (never omit the field)
- Names should be suitable for [[wiki-links]] referencing (judge appropriate naming based on Wiki index)`
      : `你是Wiki知识提取助手。

现有Wiki索引（作为实体/概念名称参考）：
${existingWikiIndex}

用户与AI的对话：
${conversationText}

将此对话转化为结构化Wiki页面。

重点：
1. 提取关键知识点（非完整对话日志）
2. 识别讨论的核心概念和实体
3. 总结对话主题和结论
4. 实体/概念名称应尽量匹配现有Wiki页面

实际对话日期：${actualDate}（请使用此日期，不要自己生成）

输出JSON格式：
{
  "source_title": "语义化主题标题（不含日期，描述讨论主题）",
  "summary": "对话主题总结",
  "entities": [
    {
      "name": "简短引用名称",
      "type": "person|organization|project|other",
      "summary": "实体信息总结",
      "mentions_in_source": ["在对话中的具体提及"]
    }
  ],
  "concepts": [
    {
      "name": "概念名称",
      "type": "theory|method|technology|term|other",
      "summary": "概念定义",
      "mentions_in_source": ["在对话中的具体提及"],
      "related_concepts": ["相关概念1", "相关概念2"]
    }
  ],
  "key_points": ["要点1", "要点2"],
  "created_pages": [],
  "updated_pages": []
}

关键规则：
- source_title：语义化标题，描述讨论主题（不要用日期作为标题）
- entity.name：从Wiki索引中选择或提取合适名称（与现有Wiki保持一致，便于双向链接引用）
- concept.name：同理，参考Wiki索引中的概念名称
- mentions_in_source：必填字段 - 列出在对话中的具体提及内容
- 如果没有实体/概念，用空数组[]（绝不能省略字段）
- 名称应简短且便于[[wiki-links]]引用（根据Wiki索引判断合适的命名方式）`;

    const analysis = await this.llmClient!.createMessage({
      model: this.settings.model,
      max_tokens: 5000,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    });

    // 3. Parse JSON
    const parsed = parseJsonResponse(analysis);
    if (!parsed) {
      throw new Error('Conversation analysis JSON parsing failed');
    }

    console.log('[LLM分析结果]', parsed);
    console.log('[生成的标题]', parsed.source_title);

    // 4. Create conversation summary page with semantic filename
    await this.wikiEngine.ensureWikiStructure();

    // Generate semantic filename from title
    const semanticSlug = slugify(parsed.source_title);
    const summaryPath = `${this.settings.wikiFolder}/sources/${semanticSlug}.md`;
    console.log('[语义化文件路径]', summaryPath);

    // Format: match standard source page structure (generateSummaryPage)
    const tags = parsed.concepts.map((c: any) => c.name).join(', ');
    const summaryContent = `---
type: source
created: ${actualDate}
source_file: Conversation Extract - ${actualDate}
tags: [${tags}]
---

# ${parsed.source_title}

## 来源
- 对话日期：${actualDate}
- 来源类型：用户查询提炼
- 语义路径：[[${summaryPath.replace(this.settings.wikiFolder + '/', '')}]]

## 核心内容

${parsed.summary}

## 关键实体

${parsed.entities.map((e: any) => `- [[entities/${slugify(e.name)}|${e.name}]] - ${e.summary}`).join('\n')}

## 关键概念

${parsed.concepts.map((c: any) => `- [[concepts/${slugify(c.name)}|${c.name}]] - ${c.summary}`).join('\n')}

## 主要观点

${parsed.key_points.map((p: string) => `- ${p}`).join('\n')}

---
更新日期：${actualDate}`;

    await this.wikiEngine.createOrUpdateFile(summaryPath, summaryContent);
    parsed.created_pages.push(summaryPath);

    // 5. Create entity pages (reuse existing logic)
    for (const entity of parsed.entities) {
      const entityPage = await this.wikiEngine.createOrUpdateEntityPage(entity, parsed, { path: summaryPath, basename: semanticSlug } as any);
      if (entityPage) {
        parsed.created_pages.push(entityPage);
      }
    }

    // 6. Create concept pages (reuse existing logic)
    for (const concept of parsed.concepts) {
      const conceptPage = await this.wikiEngine.createOrUpdateConceptPage(concept, parsed, { path: summaryPath, basename: semanticSlug } as any);
      if (conceptPage) {
        parsed.created_pages.push(conceptPage);
      }
    }

    // 7. Update index and log
    await this.wikiEngine.generateIndexFromEngine();
    parsed.contradictions = parsed.contradictions || [];
    await this.wikiEngine.updateLog('conversation', parsed);

    console.log('=== Conversation extraction complete ===');
    console.log('Created pages:', parsed.created_pages);
  }

  // Helper: format conversation history to text
  formatConversation(history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  }): string {
    return history.messages.map(msg => {
      const role = msg.role === 'user' ? '👤 User' : '🤖 Wiki';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      return `### ${role} (${time})\n\n${msg.content}\n\n---\n`;
    }).join('\n');
  }

  // Test LLM Provider connection
  async testLLMConnection(): Promise<{ success: boolean; message: string }> {
    console.log('测试 LLM 连接...');
    console.log('当前配置:', {
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

      console.log('测试响应:', testResponse);

      return {
        success: true,
        message: `✅ 连接成功！提供商: ${providerConfig?.name || this.settings.provider}`
      };
    } catch (error: any) {
      console.error('连接测试失败:', error);
      return {
        success: false,
        message: `❌ 连接失败: ${error.message || '未知错误'}`
      };
    }
  }
}

// ==================== UI 模态框 ====================
class FileSuggestModal extends FuzzySuggestModal<TFile> {
  onSelect: (file: TFile) => void;

  constructor(app: App, onSelect: (file: TFile) => void) {
    super(app);
    this.onSelect = onSelect;
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles()
      .filter(f => !f.path.startsWith('wiki') && !f.path.startsWith('.obsidian'));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onSelect(file);
  }
}

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  onSelect: (folder: TFolder) => void;

  constructor(app: App, onSelect: (folder: TFolder) => void) {
    super(app);
    this.onSelect = onSelect;
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const root = this.app.vault.getRoot();

    const collect = (folder: TFolder) => {
      if (!folder.path.startsWith('.obsidian') && !folder.path.startsWith('wiki')) {
        folders.push(folder);
      }
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          collect(child);
        }
      }
    };
    collect(root);
    return folders;
  }

  getItemText(folder: TFolder): string {
    return folder.path;
  }

  onChooseItem(folder: TFolder): void {
    this.onSelect(folder);
  }
}

// ==================== Conversational Query Modal ====================

class QueryModal extends Modal {
  plugin: LLMWikiPlugin;
  history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  };
  isStreaming: boolean;
  accumulatedResponse: string;
  currentResponseDiv: HTMLElement | null;
  historyContainer: HTMLElement;
  inputArea: HTMLTextAreaElement;
  historyCountDisplay: HTMLElement;

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app);
    this.plugin = plugin;
    // Load persisted history from settings
    this.history = {
      messages: plugin.settings.queryHistory || []
    };
    this.isStreaming = false;
    this.accumulatedResponse = '';
    this.currentResponseDiv = null;
    this.historyContainer = null as any;
    this.inputArea = null as any;
    this.historyCountDisplay = null as any;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const texts = TEXTS[this.plugin.settings.language];

    // Modal styling (ChatGPT-style dimensions)
    this.modalEl.style.width = '800px';
    this.modalEl.style.height = '600px';
    contentEl.style.height = '100%';

    // Create container with flex layout
    const container = contentEl.createDiv({
      attr: {
        style: 'display: flex; flex-direction: column; height: 100%; overflow: hidden;'
      }
    });

    // Header (fixed)
    const header = container.createDiv({
      attr: {
        style: 'background: #4caf50; color: white; padding: 12px; font-weight: bold; font-size: 16px; flex-shrink: 0;'
      }
    });
    header.setText(texts.queryModalTitle);

    // Hint text below header
    const hintText = container.createDiv({
      attr: {
        style: 'background: #fff3e0; padding: 8px 16px; font-size: 13px; color: #666; flex-shrink: 0;'
      }
    });
    hintText.setText(texts.queryModalHint);

    // History container (scrollable)
    this.historyContainer = container.createDiv({
      attr: {
        style: 'flex: 1; min-height: 0; overflow-y: auto; padding: 16px; background: #f9f9f9;'
      }
    });

    // Render existing history (if any)
    this.history.messages.forEach(msg => {
      this.renderHistoryMessage(msg.role, msg.content);
    });

    // Fixed bottom input area
    const inputContainer = container.createDiv({
      attr: {
        style: 'border-top: 2px solid #ddd; padding: 16px; background: white; flex-shrink: 0;'
      }
    });

    // Textarea input
    this.inputArea = inputContainer.createEl('textarea', {
      attr: {
        placeholder: texts.queryModalPlaceholder,
        rows: '3',
        style: 'width: 100%; resize: none; font-size: 14px; padding: 8px;'
      }
    });

    // Enter key to send
    this.inputArea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        if (this.inputArea.value.trim() && !this.isStreaming) {
          this.sendMessage(this.inputArea.value);
          this.inputArea.value = '';
        }
      }
    });

    // Button row
    const buttonRow = inputContainer.createDiv({
      attr: {
        style: 'display: flex; gap: 8px; margin-top: 8px;'
      }
    });

    // Send button
    buttonRow.createEl('button', {
      text: texts.queryModalSendButton,
      attr: {
        style: 'flex: 2; background: #2196f3; color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      if (this.inputArea.value.trim() && !this.isStreaming) {
        this.sendMessage(this.inputArea.value);
        this.inputArea.value = '';
      }
    });

    // Save to Wiki button
    buttonRow.createEl('button', {
      text: texts.queryModalSaveButton,
      attr: {
        style: 'flex: 1; background: #4caf50; color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      if (this.history.messages.length > 0) {
        this.saveToWiki();
      }
    });

    // Clear history button
    buttonRow.createEl('button', {
      text: texts.queryModalClearButton,
      attr: {
        style: 'background: #999; color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      this.clearHistory();
    });

    // History count display
    this.historyCountDisplay = inputContainer.createDiv({
      attr: {
        style: 'margin-top: 8px; font-size: 11px; color: #999;'
      }
    });
    const currentRounds = Math.floor(this.history.messages.length / 2);
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', currentRounds.toString())
        .replace('{}', maxRounds.toString())
    );
  }

  onClose() {
    const { contentEl } = this;

    // Save history to settings before closing
    this.plugin.settings.queryHistory = this.history.messages;
    this.plugin.saveSettings();

    contentEl.empty();
  }

  // Placeholder methods (implemented in Tasks 6-7)
  async sendMessage(userMessage: string) {
    if (!userMessage.trim() || this.isStreaming) return;

    const texts = TEXTS[this.plugin.settings.language];

    // 1. Add user message to history
    this.history.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // 2. Render user message
    this.renderHistoryMessage('user', userMessage);

    // 3. Limit history length
    this.limitHistory();

    // 4. Create streaming response container
    const wrapperDiv = this.historyContainer.createDiv({
      attr: {
        style: 'margin-bottom: 16px; display: flex; justify-content: flex-start;'
      }
    });

    this.currentResponseDiv = wrapperDiv.createDiv({
      attr: {
        style: 'background: white; padding: 12px 16px; border-radius: 12px 12px 12px 0; border: 1px solid #e0e0e0; max-width: 80%;'
      }
    });

    this.currentResponseDiv.createEl('strong', {
      text: '🤖 Wiki:',
      attr: {
        style: 'color: #4caf50;'
      }
    });

    const contentDiv = this.currentResponseDiv.createDiv({
      attr: {
        style: 'margin-top: 8px;'
      }
    });

    // Streaming indicator
    const streamingIndicator = this.currentResponseDiv.createDiv({
      text: texts.queryModalStreaming,
      attr: {
        style: 'font-size: 11px; color: #4caf50; margin-top: 4px;'
      }
    });

    this.isStreaming = true;
    this.accumulatedResponse = '';

    // 5. Build Wiki context as system prompt
    const wikiContext = await this.buildWikiContext(userMessage);

    // Conversation history (only user/assistant messages)
    const conversationMessages = this.history.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 6. Call streaming API with system prompt
    try {
      // Check if streaming is supported
      if (this.plugin.llmClient?.createMessageStream) {
        const fullResponse = await this.plugin.llmClient.createMessageStream({
          model: this.plugin.settings.model,
          max_tokens: 3000,
          system: wikiContext, // System prompt (independent parameter)
          messages: conversationMessages, // Only conversation history
          language: this.plugin.settings.language,
          onChunk: (chunk) => {
            this.accumulatedResponse += chunk;
            this.renderMarkdownContent(this.accumulatedResponse, contentDiv);
          }
        });

        // 7. Add to history
        this.history.messages.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now()
        });

        // Remove streaming indicator
        streamingIndicator.remove();
        this.currentResponseDiv.style.border = '1px solid #e0e0e0';

      } else {
        // Fallback to non-streaming
        const response = await this.plugin.llmClient!.createMessage({
          model: this.plugin.settings.model,
          max_tokens: 3000,
          system: wikiContext, // System prompt
          messages: conversationMessages // Only conversation history
        });

        this.history.messages.push({
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        });

        this.renderMarkdownContent(response, contentDiv);
        streamingIndicator.remove();
      }

    } catch (error: any) {
      console.error('Query failed:', error);
      contentDiv.setText(`Error: ${error.message}`);
      streamingIndicator.remove();
    }

    this.isStreaming = false;
    this.currentResponseDiv = null;

    // Update history count display
    const currentRounds = Math.floor(this.history.messages.length / 2);
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', currentRounds.toString())
        .replace('{}', maxRounds.toString())
    );
  }
  streamResponse(chunk: string) {
    // Accumulate and render (already handled in sendMessage)
    this.accumulatedResponse += chunk;
  }

  renderMarkdownContent(content: string, container: HTMLElement) {
    container.empty();

    // Use Obsidian's built-in MarkdownRenderer
    // sourcePath: '' (vault root) - links must include full path from vault root
    // Link format: [[wiki/entities/page]] or [[wiki/concepts/page]]
    // This ensures links resolve to actual files regardless of wiki folder location

    MarkdownRenderer.renderMarkdown(
      content,
      container,
      '',  // Vault root - links resolve from vault root
      this.plugin
    );
  }
  renderHistoryMessage(role: 'user' | 'assistant', content: string) {
    const texts = TEXTS[this.plugin.settings.language];

    const messageWrapper = this.historyContainer.createDiv({
      attr: {
        style: role === 'user'
          ? 'margin-bottom: 16px; display: flex; justify-content: flex-end;'
          : 'margin-bottom: 16px; display: flex; justify-content: flex-start;'
      }
    });

    const messageBubble = messageWrapper.createDiv({
      attr: {
        style: role === 'user'
          ? 'background: #2196f3; color: white; padding: 12px 16px; border-radius: 12px 12px 0 12px; max-width: 80%;'
          : 'background: white; padding: 12px 16px; border-radius: 12px 12px 12px 0; border: 1px solid #e0e0e0; max-width: 80%;'
      }
    });

    const roleLabel = messageBubble.createEl('strong', {
      text: role === 'user' ? '👤 You:' : '🤖 Wiki:',
      attr: {
        style: role === 'user' ? 'color: white;' : 'color: #4caf50;'
      }
    });

    const contentDiv = messageBubble.createDiv({
      attr: {
        style: 'margin-top: 8px;'
      }
    });

    if (role === 'assistant') {
      // Render Markdown for assistant messages
      this.renderMarkdownContent(content, contentDiv);
    } else {
      // Plain text for user messages
      contentDiv.setText(content);
    }
  }
  limitHistory() {
    const texts = TEXTS[this.plugin.settings.language];
    const max = this.plugin.settings.maxConversationHistory;
    const totalMessages = this.history.messages.length;

    if (totalMessages > max * 2) {
      const keepCount = max * 2;
      this.history.messages = this.history.messages.slice(-keepCount);

      new Notice(
        this.plugin.settings.language === 'en'
          ? `History truncated to last ${max} rounds`
          : `历史已截断至最近${max}轮对话`,
        3000
      );

      // Re-render history container
      this.historyContainer.empty();
      this.history.messages.forEach(msg => {
        this.renderHistoryMessage(msg.role, msg.content);
      });
    }
  }
  async saveToWiki() {
    if (this.history.messages.length === 0) return;

    const texts = TEXTS[this.plugin.settings.language];
    new Notice(
      this.plugin.settings.language === 'en'
        ? 'Saving conversation to Wiki...'
        : '正在保存对话到Wiki...',
      3000
    );

    try {
      await this.plugin.ingestConversation(this.history);
      new Notice(
        this.plugin.settings.language === 'en'
          ? 'Conversation saved to Wiki!'
          : '对话已保存到Wiki！',
        5000
      );
    } catch (error: any) {
      console.error('Save failed:', error);
      new Notice(
        this.plugin.settings.language === 'en'
          ? `Save failed: ${error.message}`
          : `保存失败: ${error.message}`,
        8000
      );
    }
  }
  clearHistory() {
    this.history.messages = [];
    this.historyContainer.empty();

    // Clear persisted history in settings
    this.plugin.settings.queryHistory = [];
    this.plugin.saveSettings();

    new Notice(
      this.plugin.settings.language === 'en'
        ? 'History cleared'
        : '历史已清空',
      2000
    );

    // Update count display
    const texts = TEXTS[this.plugin.settings.language];
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', '0')
        .replace('{}', maxRounds.toString())
    );
  }

  async buildWikiContext(userMessage: string): Promise<string> {
    console.log('=== buildWikiContext开始 ===');
    console.log('用户问题:', userMessage);

    try {
      // 1. Read index.md
      const indexPath = `${this.plugin.settings.wikiFolder}/index.md`;
      console.log('[步骤1] 读取index.md路径:', indexPath);
      const indexContent = await this.plugin.wikiEngine.tryReadFile(indexPath);
      console.log('[步骤1] index.md内容:', indexContent ? '已读取' : '不存在');

      if (!indexContent) {
        console.log('[步骤1] Wiki为空，返回提示');
        return this.plugin.settings.language === 'en'
          ? 'You are a Wiki assistant. The Wiki is empty. Please answer based on your knowledge and suggest the user ingest sources first.'
          : '你是Wiki助手。Wiki目前为空。请基于你的知识回答，并建议用户先摄入源文件。';
      }

      // 2. Use LLM to select relevant pages from index
      console.log('[步骤2] 让LLM选择相关页面...');
      const relevantPages = await this.selectRelevantPagesWithLLM(userMessage, indexContent);
      console.log('[步骤2] LLM选择的页面:', relevantPages);

      // 3. Load relevant page content
      console.log('[步骤3] 加载相关页面内容...');
      const pagesContent = await this.loadRelevantPages(relevantPages);
      console.log('[步骤3] 加载的页面内容数量:', pagesContent.length);
      pagesContent.forEach((content, i) => {
        console.log(`[步骤3] 页面${i+1}内容长度:`, content.length);
      });

      // 4. Build Wiki context system message
      const wikiContext = this.plugin.settings.language === 'en'
        ? `You are a Wiki assistant with access to a structured knowledge base.

Wiki Index:
${indexContent}

Relevant Wiki Pages (loaded with full content):
${pagesContent.length > 0 ? pagesContent.join('\n\n---\n\n') : 'No directly relevant pages found in Wiki.'}

Instructions:
- Answer based on the Wiki pages above (not general knowledge)
- Use ONLY Obsidian's wiki-link syntax: [[wiki/entities/page-name]] (NOT HTML links)
- Link format MUST include wiki folder: [[${this.plugin.settings.wikiFolder}/entities/page-name]]

CRITICAL RULES:
✅ CORRECT: [[wiki/entities/太阳化忌]], [[wiki/concepts/机器学习]]
❌ WRONG: <a href="...">, [link text](url), [[太阳化忌]], [[entities/太阳化忌]]
- Obsidian wiki-links use DOUBLE brackets: [[path]]
- NO HTML: Never use <a href="...">text</a>
- NO Markdown external links: Never use [text](url)
- Include wiki/ prefix: Links must start with [[wiki/...

If Wiki lacks relevant information:
- Acknowledge it and suggest ingesting more sources
- Do NOT make up information outside Wiki

Respond in the same language as the user's question`
        : `你是Wiki助手，拥有结构化知识库的访问权限。

Wiki索引：
${indexContent}

相关Wiki页面（已加载完整内容）：
${pagesContent.length > 0 ? pagesContent.join('\n\n---\n\n') : '未在Wiki中找到直接相关的页面。'}

指令：
- 基于上述Wiki页面内容回答问题（而非通用知识）
- 使用Obsidian特有的双向链接语法：[[wiki/entities/页面名]]（不是HTML链接）
- 链接格式必须包含wiki文件夹：[[${this.plugin.settings.wikiFolder}/entities/页面名]]

关键规则：
✅ 正确：[[wiki/entities/太阳化忌]], [[wiki/concepts/机器学习]]
❌ 错误：<a href="...">, [链接文字](url), [[太阳化忌]], [[entities/太阳化忌]]
- Obsidian双向链接使用双层方括号：[[路径]]
- 禁止HTML：绝不使用<a href="...">文字</a>
- 禁止Markdown外链：绝不使用[文字](url)
- 包含wiki/前缀：链接必须以[[wiki/开头

如果Wiki缺少相关信息：
- 如实说明并建议摄入更多源文件
- 不要编造Wiki之外的信息

请用与用户提问相同的语言回答`;

      console.log('[步骤4] Wiki上下文构建完成');
      console.log('[步骤4] 上下文长度:', wikiContext.length);
      return wikiContext;
    } catch (error: any) {
      console.error('[错误] buildWikiContext失败:', error);
      return this.plugin.settings.language === 'en'
        ? 'You are a Wiki assistant. Failed to load Wiki context. Please answer based on your knowledge.'
        : '你是Wiki助手。加载Wiki上下文失败。请基于你的知识回答。';
    }
  }

  async selectRelevantPagesWithLLM(query: string, indexContent: string): Promise<string[]> {
    console.log('=== LLM选择相关页面开始 ===');

    const prompt = this.plugin.settings.language === 'en'
      ? `You are a Wiki page selector. Given a user query and the Wiki index, select the most relevant pages.

User Query: "${query}"

Wiki Index:
${indexContent}

Task:
1. Read the Wiki index above
2. Identify pages that are MOST relevant to the user's query
3. Consider page titles, summaries, and semantic relevance
4. Select top 3-5 most relevant pages

Output Format (strict JSON):
{
  "relevant_pages": [
    "entities/page-name-1",
    "concepts/page-name-2",
    "sources/page-name-3"
  ]
}

Important:
- Output ONLY the JSON object, no other text
- Page paths should match the format in Wiki links: "entities/name", "concepts/name", "sources/name"
- If no pages are relevant, output: {"relevant_pages": []}`
      : `你是Wiki页面选择器。根据用户问题和Wiki索引，选择最相关的页面。

用户问题："${query}"

Wiki索引：
${indexContent}

任务：
1. 阅读上述Wiki索引
2. 识别与用户问题最相关的页面
3. 考虑页面标题、摘要和语义相关性
4. 选择最相关的3-5个页面

输出格式（严格JSON）：
{
  "relevant_pages": [
    "entities/页面名称1",
    "concepts/页面名称2",
    "sources/页面名称3"
  ]
}

重要：
- 仅输出JSON对象，不要有其他文本
- 页面路径格式应与Wiki链接一致："entities/名称"、"concepts/名称"、"sources/名称"
- 如果没有相关页面，输出：{"relevant_pages": []}`;

    try {
      console.log('[LLM调用] 发送选择请求...');
      const response = await this.plugin.llmClient!.createMessage({
        model: this.plugin.settings.model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      console.log('[LLM响应] 原始响应:', response);

      // Parse JSON response
      const cleanedResponse = response.trim();
      const jsonMatch = cleanedResponse.match(/\{[^}]*"relevant_pages"[^}]*\}/);

      if (!jsonMatch) {
        console.error('[解析失败] 未找到JSON对象');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const pages = parsed.relevant_pages || [];

      console.log('[解析成功] 页面列表:', pages);
      return pages;
    } catch (error: any) {
      console.error('[LLM选择失败]', error);
      return [];
    }
  }

  async loadRelevantPages(pageTitles: string[]): Promise<string[]> {
    console.log('=== loadRelevantPages开始 ===');
    console.log('页面标题列表:', pageTitles);

    const pages: string[] = [];

    for (const title of pageTitles) {
      console.log(`[加载页面] 处理标题: "${title}"`);

      // Handle both "entities/page-name" and "page-name" formats
      const pagePath = title.includes('/')
        ? `${this.plugin.settings.wikiFolder}/${title}.md`
        : `${this.plugin.settings.wikiFolder}/${title}.md`;

      console.log(`[加载页面] 完整路径: "${pagePath}"`);

      const content = await this.plugin.wikiEngine.tryReadFile(pagePath);
      console.log(`[加载页面] 文件是否存在: ${content ? '是' : '否'}`);

      if (content) {
        console.log(`[加载页面] 内容长度: ${content.length}`);
        console.log(`[加载页面] 内容前100字符: ${content.substring(0, 100)}`);
        // Display full vault path in title so LLM knows correct link format
        // title可能是 "entities/page", 显示为 "wiki/entities/page"
        const displayTitle = title.startsWith(this.plugin.settings.wikiFolder + '/')
          ? title
          : `${this.plugin.settings.wikiFolder}/${title}`;
        pages.push(`## ${displayTitle}\n\n${content}`);
      } else {
        console.warn(`[加载页面] 无法读取页面: ${pagePath}`);
      }
    }

    console.log(`[加载页面] 成功加载${pages.length}个页面`);
    return pages;
  }
}

class LintReportModal extends Modal {
  report: string;

  constructor(app: App, report: string) {
    super(app);
    this.report = report;
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: 'Wiki 维护报告' });
    this.contentEl.createEl('div', {
      text: this.report,
      attr: { style: 'white-space: pre-wrap; max-height: 60vh; overflow-y: auto;' }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}