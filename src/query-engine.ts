// Query Engine - Conversational Wiki Query Modal

import { App, Modal, Notice, MarkdownRenderer } from 'obsidian';
import LLMWikiPlugin from '../main';
import { TEXTS } from './texts';
import { parseJsonResponse } from './utils';

export class QueryModal extends Modal {
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

    this.modalEl.style.width = '800px';
    this.modalEl.style.height = '780px';
    contentEl.style.height = '100%';

    const container = contentEl.createDiv({
      attr: {
        style: 'display: flex; flex-direction: column; height: 100%; overflow: hidden;'
      }
    });

    const header = container.createDiv({
      attr: {
        style: 'background: #4caf50; color: white; padding: 12px; font-weight: bold; font-size: 16px; flex-shrink: 0;'
      }
    });
    header.setText(texts.queryModalTitle);

    const hintText = container.createDiv({
      attr: {
        style: 'background: #fff3e0; padding: 8px 16px; font-size: 13px; color: #666; flex-shrink: 0;'
      }
    });
    hintText.setText(texts.queryModalHint);

    this.historyContainer = container.createDiv({
      attr: {
        style: 'flex: 1; min-height: 0; overflow-y: auto; padding: 16px; background: #f9f9f9;'
      }
    });

    this.history.messages.forEach(msg => {
      this.renderHistoryMessage(msg.role, msg.content);
    });

    const inputContainer = container.createDiv({
      attr: {
        style: 'border-top: 2px solid #ddd; padding: 16px; background: white; flex-shrink: 0;'
      }
    });

    this.inputArea = inputContainer.createEl('textarea', {
      attr: {
        placeholder: texts.queryModalPlaceholder,
        rows: '3',
        style: 'width: 100%; resize: none; font-size: 14px; padding: 8px;'
      }
    });

    this.inputArea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        if (this.inputArea.value.trim() && !this.isStreaming) {
          this.sendMessage(this.inputArea.value);
          this.inputArea.value = '';
        }
      }
    });

    const buttonRow = inputContainer.createDiv({
      attr: {
        style: 'display: flex; gap: 8px; margin-top: 8px;'
      }
    });

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

    buttonRow.createEl('button', {
      text: texts.queryModalSaveButton,
      attr: {
        style: 'flex: 1; background: var(--interactive-accent); color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      if (this.history.messages.length > 0) {
        this.saveToWiki();
      }
    });

    buttonRow.createEl('button', {
      text: texts.queryModalClearButton,
      attr: {
        style: 'background: #999; color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      this.clearHistory();
    });

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

    this.plugin.settings.queryHistory = this.history.messages;
    this.plugin.saveSettings();

    contentEl.empty();
  }

  async sendMessage(userMessage: string) {
    if (!userMessage.trim() || this.isStreaming) return;

    const texts = TEXTS[this.plugin.settings.language];

    this.history.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    this.renderHistoryMessage('user', userMessage);

    this.limitHistory();

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

    const streamingIndicator = this.currentResponseDiv.createDiv({
      text: texts.queryModalStreaming,
      attr: {
        style: 'font-size: 11px; color: #4caf50; margin-top: 4px;'
      }
    });

    this.isStreaming = true;
    this.accumulatedResponse = '';

    const wikiContext = await this.buildWikiContext(userMessage);

    const conversationMessages = this.history.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      if (this.plugin.llmClient?.createMessageStream) {
        const fullResponse = await this.plugin.llmClient.createMessageStream({
          model: this.plugin.settings.model,
          max_tokens: 3000,
          system: wikiContext,
          messages: conversationMessages,
          language: this.plugin.settings.language,
          onChunk: (chunk) => {
            this.accumulatedResponse += chunk;
            this.renderMarkdownContent(this.accumulatedResponse, contentDiv);
          }
        });

        this.history.messages.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now()
        });

        streamingIndicator.remove();
        this.currentResponseDiv.style.border = '1px solid #e0e0e0';

      } else {
        const response = await this.plugin.llmClient!.createMessage({
          model: this.plugin.settings.model,
          max_tokens: 3000,
          system: wikiContext,
          messages: conversationMessages
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

    const currentRounds = Math.floor(this.history.messages.length / 2);
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', currentRounds.toString())
        .replace('{}', maxRounds.toString())
    );
  }

  renderMarkdownContent(content: string, container: HTMLElement) {
    container.empty();

    MarkdownRenderer.renderMarkdown(
      content,
      container,
      '',
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

    messageBubble.createEl('strong', {
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
      this.renderMarkdownContent(content, contentDiv);
    } else {
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
      await this.plugin.wikiEngine.ingestConversation(this.history);
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

    this.plugin.settings.queryHistory = [];
    this.plugin.saveSettings();

    new Notice(
      this.plugin.settings.language === 'en'
        ? 'History cleared'
        : '历史已清空',
      2000
    );

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

      console.log('[步骤2] 让LLM选择相关页面...');
      const relevantPages = await this.selectRelevantPagesWithLLM(userMessage, indexContent);
      console.log('[步骤2] LLM选择的页面:', relevantPages);

      console.log('[步骤3] 加载相关页面内容...');
      const pagesContent = await this.loadRelevantPages(relevantPages);
      console.log('[步骤3] 加载的页面内容数量:', pagesContent.length);
      pagesContent.forEach((content, i) => {
        console.log(`[步骤3] 页面${i+1}内容长度:`, content.length);
      });

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

      const parsed = await parseJsonResponse(response);
      const pages = parsed?.relevant_pages || [];

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

      const pagePath = `${this.plugin.settings.wikiFolder}/${title}.md`;

      console.log(`[加载页面] 完整路径: "${pagePath}"`);

      const content = await this.plugin.wikiEngine.tryReadFile(pagePath);
      console.log(`[加载页面] 文件是否存在: ${content ? '是' : '否'}`);

      if (content) {
        console.log(`[加载页面] 内容长度: ${content.length}`);
        console.log(`[加载页面] 内容前100字符: ${content.substring(0, 100)}`);
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
