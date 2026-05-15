// Query Engine - Conversational Wiki Query Modal

import { App, Modal, Notice, MarkdownRenderer, Component } from 'obsidian';
import LLMWikiPlugin from '../main';
import { TEXTS } from '../texts';
import { WIKI_LANGUAGES } from '../types';
import { PROMPTS } from '../prompts';
import { parseJsonResponse } from '../utils';

// ---- Suggest Save Modal (post-query feedback) ----

class SuggestSaveModal extends Modal {
  private plugin: LLMWikiPlugin;
  private history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  };
  private reason: string;

  constructor(
    app: App,
    plugin: LLMWikiPlugin,
    history: { messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> },
    reason?: string
  ) {
    super(app);
    this.plugin = plugin;
    this.history = history;
    this.reason = reason || '';
  }

  onOpen() {
    const { contentEl } = this;
    const texts = TEXTS[this.plugin.settings.language];

    contentEl.addClass('llm-wiki-suggest-save-modal');

    contentEl.createEl('h3', { text: texts.querySuggestSaveTitle });
    contentEl.createEl('p', { text: texts.querySuggestSaveDesc });

    if (this.reason) {
      const reasonBox = contentEl.createDiv({ cls: 'llm-wiki-suggest-save-reason' });
      reasonBox.createEl('strong', { text: 'Reason: ' });
      reasonBox.createSpan({ text: this.reason });
    }

    const buttonRow = contentEl.createDiv({ cls: 'llm-wiki-suggest-save-buttons' });

    buttonRow.createEl('button', { text: texts.querySuggestSaveYes, cls: 'mod-cta' })
      .addEventListener('click', () => {
        this.close();
        void this.doSave();
      });

    buttonRow.createEl('button', { text: texts.querySuggestSaveNo })
      .addEventListener('click', () => {
        this.close();
      });
  }

  private async doSave(): Promise<void> {
    const texts = TEXTS[this.plugin.settings.language];
    const progressNotice = new Notice(texts.savingToWiki, 0);

    const origProgress = this.plugin.wikiEngine.getProgressCallback();
    this.plugin.wikiEngine.setProgressCallback((msg: string) => {
      progressNotice.setMessage(msg);
    });

    try {
      const report = await this.plugin.wikiEngine.ingestConversation(this.history);
      this.plugin.settings.lastOfferedQueryHash = JSON.stringify(this.history.messages);
      void this.plugin.saveSettings();
      const lang = this.plugin.settings.language;
      const summary = lang === 'en'
        ? `${report.entitiesCreated} entities, ${report.conceptsCreated} concepts, ${report.createdPages.length} pages`
        : `${report.entitiesCreated} 实体, ${report.conceptsCreated} 概念, ${report.createdPages.length} 页`;
      new Notice(`${texts.saveToWikiSuccess}\n${summary}`, 5000);
    } catch (error) {
      console.error('Save failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(texts.queryModalErrorPrefix + errorMsg, 8000);
    } finally {
      progressNotice.hide();
      this.plugin.wikiEngine.setProgressCallback(origProgress);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ---- Query Modal ----

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
  private renderComponent: Component;

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app);
    this.plugin = plugin;
    this.history = {
      messages: plugin.settings.queryHistory || []
    };
    this.isStreaming = false;
    this.accumulatedResponse = '';
    this.currentResponseDiv = null;
    this.historyContainer = null as unknown as HTMLElement;
    this.inputArea = null as unknown as HTMLTextAreaElement;
    this.historyCountDisplay = null as unknown as HTMLElement;
    this.renderComponent = new Component();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const texts = TEXTS[this.plugin.settings.language];

    this.modalEl.addClass('llm-wiki-query-modal');
    contentEl.addClass('llm-wiki-query-content');

    const container = contentEl.createDiv({
      cls: 'llm-wiki-query-container'
    });

    const header = container.createDiv({
      cls: 'llm-wiki-query-header'
    });
    header.setText(texts.queryModalTitle);

    const hintText = container.createDiv({
      cls: 'llm-wiki-query-hint'
    });
    hintText.setText(texts.queryModalHint);

    this.historyContainer = container.createDiv({
      cls: 'llm-wiki-query-history'
    });

    this.history.messages.forEach(msg => {
      this.renderHistoryMessage(msg.role, msg.content);
    });

    const inputContainer = container.createDiv({
      cls: 'llm-wiki-query-input-container'
    });

    this.inputArea = inputContainer.createEl('textarea', {
      attr: {
        placeholder: texts.queryModalPlaceholder,
        rows: '3'
      },
      cls: 'llm-wiki-query-textarea'
    });

    this.inputArea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        if (this.inputArea.value.trim() && !this.isStreaming) {
          void this.sendMessage(this.inputArea.value);
          this.inputArea.value = '';
        }
      }
    });

    const buttonRow = inputContainer.createDiv({
      cls: 'llm-wiki-query-button-row'
    });

    buttonRow.createEl('button', {
      text: texts.queryModalSendButton,
      cls: 'llm-wiki-query-send-btn'
    }).addEventListener('click', () => {
      if (this.inputArea.value.trim() && !this.isStreaming) {
        void this.sendMessage(this.inputArea.value);
        this.inputArea.value = '';
      }
    });

    buttonRow.createEl('button', {
      text: texts.queryModalSaveButton,
      cls: 'llm-wiki-query-save-btn'
    }).addEventListener('click', () => {
      if (this.history.messages.length > 0) {
        void this.saveToWiki();
      }
    });

    buttonRow.createEl('button', {
      text: texts.queryModalClearButton,
      cls: 'llm-wiki-query-clear-btn'
    }).addEventListener('click', () => {
      this.clearHistory();
    });

    this.historyCountDisplay = inputContainer.createDiv({
      cls: 'llm-wiki-query-count'
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
    void this.plugin.saveSettings();

    // Evaluate conversation value for potential Wiki save
    void this.evaluateAndSuggestSave();

    contentEl.empty();
  }

  private evaluateAndSuggestSave(): void {
    const assistantMessages = this.history.messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length < 1) return;

    // Skip if this conversation was already offered for save and hasn't changed
    const hash = this.computeConversationHash();
    if (hash === this.plugin.settings.lastOfferedQueryHash) return;

    // Always use LLM to evaluate conversation value semantically
    void this.evaluateWithLLM();
  }

  private computeConversationHash(): string {
    return JSON.stringify(this.history.messages);
  }

  private async evaluateWithLLM(): Promise<void> {
    if (!this.plugin.llmClient) return;

    try {
      const conversationText = this.plugin.wikiEngine.formatConversation(this.history);
      const prompt = PROMPTS.evaluateConversationValue
        .replace('{{conversation}}', conversationText.substring(0, 3000));

      const response = await this.plugin.llmClient.createMessage({
        model: this.plugin.settings.model,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const parsed = await parseJsonResponse(response) as { valuable?: boolean; reason?: string } | null;
      if (parsed?.valuable) {
        this.plugin.settings.lastOfferedQueryHash = this.computeConversationHash();
        void this.plugin.saveSettings();
        new SuggestSaveModal(this.app, this.plugin, this.history, parsed.reason || '').open();
      }
    } catch {
      // LLM evaluation failed, skip suggestion
    }
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
      cls: 'llm-wiki-query-response-wrapper'
    });

    this.currentResponseDiv = wrapperDiv.createDiv({
      cls: 'llm-wiki-query-response-bubble'
    });

    this.currentResponseDiv.createEl('strong', {
      text: 'Wiki:',
      cls: 'llm-wiki-query-response-strong'
    });

    const contentDiv = this.currentResponseDiv.createDiv({
      cls: 'llm-wiki-query-response-content'
    });

    const streamingIndicator = this.currentResponseDiv.createDiv({
      text: texts.queryModalStreaming,
      cls: 'llm-wiki-query-streaming-indicator'
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
        let fullResponse = '';
        try {
          fullResponse = await this.plugin.llmClient.createMessageStream({
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
        } catch (streamErr) {
          console.warn('Streaming query failed, falling back to non-streaming:', streamErr);
          // Update indicator to tell user streaming is not supported
          streamingIndicator.setText(texts.queryModalFallbackStreaming);
          // Fallback: try non-streaming if streaming fails (e.g., SSE not supported)
          if (this.plugin.llmClient?.createMessage) {
            try {
              fullResponse = await this.plugin.llmClient.createMessage({
                model: this.plugin.settings.model,
                max_tokens: 3000,
                system: wikiContext,
                messages: conversationMessages
              });
              this.renderMarkdownContent(fullResponse, contentDiv);
            } catch (fallbackErr) {
              console.error('Non-streaming fallback also failed:', fallbackErr);
              const errMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
              contentDiv.createEl('p', {
                text: texts.queryModalErrorPrefix + errMsg,
                cls: 'llm-wiki-query-error'
              });
              streamingIndicator.remove();
              this.isStreaming = false;
              return;
            }
          } else {
            const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
            contentDiv.createEl('p', {
              text: texts.queryModalErrorPrefix + errMsg,
              cls: 'llm-wiki-query-error'
            });
            streamingIndicator.remove();
            this.isStreaming = false;
            return;
          }
        }

        this.history.messages.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now()
        });

        streamingIndicator.remove();

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

    } catch (error) {
      console.error('Query failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      contentDiv.createEl('p', {
        text: texts.queryModalErrorPrefix + errorMsg,
        cls: 'llm-wiki-query-error'
      });
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

    const sourcePath = this.plugin.settings.wikiFolder;


    void MarkdownRenderer.render(
      this.app,
      content,
      container,
      sourcePath,
      this.renderComponent
    );

    // Bind click handlers on wiki-links so they work inside the Modal.
    // Obsidian's global delegated handler on document.body may not see
    // events from Modal DOM, so we attach per-link listeners manually.
    container.querySelectorAll('.internal-link').forEach(link => {
      const el = link as HTMLAnchorElement;
      const href = el.getAttribute('data-href') || el.getAttribute('href');
      if (!href) return;

      el.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        void this.app.workspace.openLinkText(href, sourcePath);
      });
    });
  }

  renderHistoryMessage(role: 'user' | 'assistant', content: string) {

    const messageWrapper = this.historyContainer.createDiv({
      cls: ['llm-wiki-query-message-wrapper', role === 'user' ? 'llm-wiki-query-message-wrapper-user' : 'llm-wiki-query-message-wrapper-assistant']
    });

    const messageBubble = messageWrapper.createDiv({
      cls: role === 'user' ? 'llm-wiki-query-message-bubble-user' : 'llm-wiki-query-message-bubble-assistant'
    });

    const strongEl = messageBubble.createEl('strong', {
      text: role === 'user' ? '👤 You:' : '🤖 Wiki:'
    });
    if (role === 'assistant') {
      strongEl.addClass('llm-wiki-query-response-strong');
    }

    const contentDiv = messageBubble.createDiv({
      cls: 'llm-wiki-query-response-content'
    });

    if (role === 'assistant') {
      this.renderMarkdownContent(content, contentDiv);
    } else {
      contentDiv.setText(content);
    }
  }

  limitHistory() {
    const max = this.plugin.settings.maxConversationHistory;
    const totalMessages = this.history.messages.length;

    if (totalMessages > max * 2) {
      const keepCount = max * 2;
      this.history.messages = this.history.messages.slice(-keepCount);

      const texts = TEXTS[this.plugin.settings.language];
      new Notice(
        texts.historyTruncated.replace('{max}', String(max)),
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
    const progressNotice = new Notice(texts.savingToWiki, 0);

    // Wire progress callback to update the sticky notice
    const origProgress = this.plugin.wikiEngine.getProgressCallback();
    this.plugin.wikiEngine.setProgressCallback((msg: string) => {
      progressNotice.setMessage(msg);
    });

    try {
      const report = await this.plugin.wikiEngine.ingestConversation(this.history);
      this.plugin.settings.lastOfferedQueryHash = this.computeConversationHash();
      void this.plugin.saveSettings();
      const lang = this.plugin.settings.language;
      const summary = lang === 'en'
        ? `${report.entitiesCreated} entities, ${report.conceptsCreated} concepts, ${report.createdPages.length} pages`
        : `${report.entitiesCreated} 实体, ${report.conceptsCreated} 概念, ${report.createdPages.length} 页`;
      new Notice(`${texts.saveToWikiSuccess}\n${summary}`, 5000);
    } catch (error) {
      console.error('Save failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const texts = TEXTS[this.plugin.settings.language];
      new Notice(texts.queryModalErrorPrefix + errorMsg, 8000);
    } finally {
      progressNotice.hide();
      this.plugin.wikiEngine.setProgressCallback(origProgress);
    }
  }

  clearHistory() {
    this.history.messages = [];
    this.historyContainer.empty();

    this.plugin.settings.queryHistory = [];
    void this.plugin.saveSettings();

    const texts = TEXTS[this.plugin.settings.language];
    new Notice(texts.historyCleared, 2000);

    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', '0')
        .replace('{}', maxRounds.toString())
    );
  }

  async buildWikiContext(userMessage: string): Promise<string> {
    console.debug('=== buildWikiContext开始 ===');
    console.debug('用户问题:', userMessage);

    try {
      const indexPath = `${this.plugin.settings.wikiFolder}/index.md`;
      console.debug('[步骤1] 读取index.md路径:', indexPath);
      const indexContent = await this.plugin.wikiEngine.tryReadFile(indexPath);
      console.debug('[步骤1] index.md内容:', indexContent ? '已读取' : '不存在');

      if (!indexContent) {
        console.debug('[步骤1] Wiki为空，返回提示');
        const lang = this.plugin.settings.wikiLanguage || 'en';
        const langName = WIKI_LANGUAGES[lang] || lang;
        return `IMPORTANT: You MUST write ALL responses in ${langName}.\n\nYou are a Wiki assistant. The Wiki is empty. Please answer based on your knowledge and suggest the user ingest sources first.`;
      }

      console.debug('[步骤2] 让LLM选择相关页面...');
      const relevantPages = await this.selectRelevantPagesWithLLM(userMessage, indexContent);
      console.debug('[步骤2] LLM选择的页面:', relevantPages);

      console.debug('[步骤3] 加载相关页面内容...');
      const pagesContent = await this.loadRelevantPages(relevantPages);
      console.debug('[步骤3] 加载的页面内容数量:', pagesContent.length);
      pagesContent.forEach((content, i) => {
        console.debug(`[步骤3] 页面${i+1}内容长度:`, content.length);
      });

      const lang = this.plugin.settings.wikiLanguage || 'en';
      const langName = WIKI_LANGUAGES[lang] || lang;
      const langDirective = `IMPORTANT: You MUST write ALL responses in ${langName}. Every answer, explanation, and label must be in ${langName}.`;
      const wikiContext = `${langDirective}

You are a Wiki assistant with access to a structured knowledge base.

Wiki Index:
${indexContent}

Relevant Wiki Pages (loaded with full content):
${pagesContent.length > 0 ? pagesContent.join('\n\n---\n\n') : 'No directly relevant pages found in Wiki.'}

Instructions:
- Answer based on the Wiki pages above (not general knowledge)
- Use ONLY Obsidian's wiki-link syntax: [[${this.plugin.settings.wikiFolder}/entities/page-name]] (NOT HTML links)
- Link format MUST include wiki folder: [[${this.plugin.settings.wikiFolder}/entities/page-name]]

CRITICAL RULES:
✅ CORRECT: [[${this.plugin.settings.wikiFolder}/entities/example-page]], [[${this.plugin.settings.wikiFolder}/concepts/example-concept]]
❌ WRONG: <a href="...">, [link text](url), [[example-page]], [[entities/example-page]]
- Obsidian wiki-links use DOUBLE brackets: [[path]]
- NO HTML: Never use <a href="...">text</a>
- NO Markdown external links: Never use [text](url)
- Include ${this.plugin.settings.wikiFolder}/ prefix: Links must start with [[${this.plugin.settings.wikiFolder}/...

If Wiki lacks relevant information:
- Acknowledge it and suggest ingesting more sources
- Do NOT make up information outside Wiki

Respond in ${langName}`;

      console.debug('[步骤4] Wiki上下文构建完成');
      console.debug('[步骤4] 上下文长度:', wikiContext.length);
      return wikiContext;
    } catch (error) {
      console.error('[错误] buildWikiContext失败:', error);
      const lang2 = this.plugin.settings.wikiLanguage || 'en';
      const langName2 = WIKI_LANGUAGES[lang2] || lang2;
      return `IMPORTANT: You MUST write ALL responses in ${langName2}.\n\nYou are a Wiki assistant. Failed to load Wiki context. Please answer based on your knowledge.`;
    }
  }

  async selectRelevantPagesWithLLM(query: string, indexContent: string): Promise<string[]> {
    console.debug('=== LLM选择相关页面开始 ===');

    const prompt = `You are a Wiki page selector. Given a user query and the Wiki index, select the most relevant pages.

User Query: "${query}"

Wiki Index:
${indexContent}

Task:
1. Read the Wiki index above
2. Identify pages that are MOST relevant to the user's query
3. Pay special attention to \`[aliases]\` in backtick-brackets after page names — these are alternative names, abbreviations, or translations. A user asking "DSA" may be referring to a page with alias "DSA" under a different title.
4. Consider page titles, summaries, aliases, and semantic relevance
5. Select top 3-5 most relevant pages

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
- If no pages are relevant, output: {"relevant_pages": []}`;

    try {
      console.debug('[LLM调用] 发送选择请求...');
      const response = await this.plugin.llmClient!.createMessage({
        model: this.plugin.settings.model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      console.debug('[LLM响应] 原始响应:', response);

      const parsed = await parseJsonResponse(response) as { relevant_pages?: string[] } | null;
      const pages = parsed?.relevant_pages || [];

      console.debug('[解析成功] 页面列表:', pages);
      return pages;
    } catch (error) {
      console.error('[LLM选择失败]', error);
      return [];
    }
  }

  async loadRelevantPages(pageTitles: string[]): Promise<string[]> {
    console.debug('=== loadRelevantPages开始 ===');
    console.debug('页面标题列表:', pageTitles);

    const pages: string[] = [];

    const wikiPrefix = this.plugin.settings.wikiFolder + '/';

    for (const title of pageTitles) {
      console.debug(`[加载页面] 处理标题: "${title}"`);

      // Strip wiki folder prefix if LLM returned it (e.g., "wiki/entities/xxx" → "entities/xxx")
      const normalizedTitle = title.startsWith(wikiPrefix) ? title.slice(wikiPrefix.length) : title;
      const pagePath = `${this.plugin.settings.wikiFolder}/${normalizedTitle}.md`;

      console.debug(`[加载页面] 完整路径: "${pagePath}"`);

      const content = await this.plugin.wikiEngine.tryReadFile(pagePath);
      console.debug(`[加载页面] 文件是否存在: ${content ? '是' : '否'}`);

      if (content) {
        console.debug(`[加载页面] 内容长度: ${content.length}`);
        console.debug(`[加载页面] 内容前100字符: ${content.substring(0, 100)}`);
        const displayTitle = `${this.plugin.settings.wikiFolder}/${normalizedTitle}`;
        pages.push(`## ${displayTitle}\n\n${content}`);
      } else {
        console.warn(`[加载页面] 无法读取页面: ${pagePath}`);
      }
    }

    console.debug(`[加载页面] 成功加载${pages.length}个页面`);
    return pages;
  }
}
