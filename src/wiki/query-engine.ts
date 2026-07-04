// Query Engine - Conversational Wiki Query Modal

import { App, Modal, ItemView, WorkspaceLeaf, Notice, MarkdownRenderer, Component } from 'obsidian';
import LLMWikiPlugin from '../main';
import { TEXTS } from '../texts';
import { WIKI_LANGUAGES } from '../types';
import { PROMPTS } from '../prompts';
import { parseJsonResponse } from '../core/json';
import { parseIndexForPages } from '../core/index-search';
import { normalizeWikiLinkContent } from '../core/prompt-builders';
import { extractThinkingBlocks } from '../core/markdown';
import { buildTurnIndicator, observeVisibleTurn, scrollTurnToStart } from './turn-indicator';
import { MAX_PAGE_CONTENT_CHARS, TOKENS_QUERY_LLM_SELECT, TOKENS_QUERY_SAVE_DEDUP, NOTICE_BRIEF, NOTICE_NORMAL, NOTICE_ERROR } from '../constants';
import { pprCascade, type PageRef } from '../core/ppr-cascade';
import { buildGraphFromContent, type LoadedPage } from '../core/build-graph';
import { extractSummaryFromPage } from '../core/section-extractor';
import { getSectionLabels } from './system-prompts';

/**
 * v1.20.0: Render extracted thinking blocks as a <details> collapsible
 * panel, ChatGPT/Claude.ai style. The summary line is localized via the
 * TEXTS table (with English fallback). Returns null when there are no
 * blocks so the caller can skip the wrapper entirely.
 *
 * Pure DOM construction — no Obsidian API dependency, fully testable
 * under jsdom. Tested by src/__tests__/wiki/query-thinking-ui.test.ts.
 */
export function renderThinkingBlocksUI(
  thinkingBlocks: string[],
  language: string
): HTMLElement | null {
  if (!thinkingBlocks || thinkingBlocks.length === 0) return null;

  const langTexts = (TEXTS as unknown as Record<string, Record<string, string>>)[language]
    ?? (TEXTS as unknown as Record<string, Record<string, string>>).en;
  const summaryLabel = langTexts?.queryThinkingSummary
    ?? (language === 'zh' || language === 'ja' || language === 'ko'
      ? '思考过程'
      : 'Thinking process');
  const stepsLabel = langTexts?.queryThinkingSteps
    ?? (language === 'zh' ? '步' : language === 'ja' ? 'ステップ' : 'steps');

  // v1.20.0: use activeDocument for popout-window compatibility.
  // Test environment stubs activeDocument on globalThis (see setup.ts).
  const doc = activeDocument;
  if (!doc) return null;
  const details = doc.createElement('details');
  details.className = 'llm-wiki-query-thinking-block';

  const summary = doc.createElement('summary');
  const count = thinkingBlocks.length;
  summary.textContent = count > 1
    ? `💭 ${summaryLabel} (${count} ${stepsLabel})`
    : `💭 ${summaryLabel}`;
  details.appendChild(summary);

  for (const block of thinkingBlocks) {
    const pre = doc.createElement('pre');
    pre.className = 'llm-wiki-query-thinking-content';
    pre.textContent = block;
    details.appendChild(pre);
  }

  return details;
}

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
      const summary = texts.saveSummary
        .replace('{entities}', String(report.entitiesCreated))
        .replace('{concepts}', String(report.conceptsCreated))
        .replace('{pages}', String(report.createdPages.length));
      new Notice(`${texts.saveToWikiSuccess}\n${summary}`, NOTICE_NORMAL);
    } catch (error) {
      console.error('Save failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      new Notice(texts.queryModalErrorPrefix + errorMsg, NOTICE_ERROR);
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

// ---- Query View (right-docked side panel) ----

export const VIEW_TYPE_QUERY = 'llm-wiki-query-view';

export class QueryView extends ItemView {
  plugin: LLMWikiPlugin;
  history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  };
  isStreaming: boolean;
  aborted: boolean;
  accumulatedResponse: string;
  currentResponseDiv: HTMLElement | null;
  historyContainer: HTMLElement;
  inputArea: HTMLTextAreaElement;
  sendBtn: HTMLButtonElement;
  historyCountDisplay: HTMLElement;
  private pendingInput: string;
  private activeRenderComponent: Component | null;
  /** Cached graph for PPR — built lazily from loaded page content. */
  private _graph: ReturnType<typeof buildGraphFromContent> | null = null;
  /** Cached section labels for Tier B extraction (settings don't change mid-query). */
  private _sectionLabels: ReturnType<typeof getSectionLabels> | null = null;
  /** Last PPR cascade result — for displaying retrieval source in the response UI. */
  private _lastRetrieval: { arm: string; count: number; topPaths: string[] } | null = null;
  private _turnIndicator: HTMLElement | null = null;
  private _turnObserver: IntersectionObserver | null = null;
  /**
   * v1.23.0 P2: Persistence health fix — when the user explicitly clears
   * history, onClose must NOT clobber the cleared state by writing
   * `this.history.messages` (which is `[]`) over the just-saved empty
   * array. In practice the read-back is the same, but the fire-and-forget
   * saveSettings in onClose could race with a concurrent sendMessage
   * completion and resurrect stale messages. Tracks the last
   * user-initiated clear timestamp so onClose skips the redundant write.
   */
  private _lastClearTimestamp: number = 0;
  /**
   * v1.23.0 P2: rAF batching for streaming DOM updates — coalesce
   * multiple onChunk calls within the same animation frame into a
   * single textContent write + scroll. Without this, 100+ chunks
   * in a single rAF window trigger 100+ layout/paint cycles and the
   * browser can drop intermediate frames, making the stream look
   * "一次性" even though the data is genuinely incremental.
   */
  private _streamRafHandle: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: LLMWikiPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.history = {
      messages: plugin.settings.queryHistory || []
    };
    this.isStreaming = false;
    this.aborted = false;
    this.accumulatedResponse = '';
    this.currentResponseDiv = null;
    this.historyContainer = null as unknown as HTMLElement;
    this.inputArea = null as unknown as HTMLTextAreaElement;
    this.sendBtn = null as unknown as HTMLButtonElement;
    this.historyCountDisplay = null as unknown as HTMLElement;
    this.activeRenderComponent = new Component();
    this.pendingInput = '';
  }

  getViewType(): string {
    return VIEW_TYPE_QUERY;
  }

  getDisplayText(): string {
    return TEXTS[this.plugin.settings.language].queryModalTitle;
  }

  getIcon(): string {
    return 'message-circle';
  }

  /**
   * v1.23.2 (review-C P0): Invalidate the cached PPR graph + last
   * retrieval result so the next sendMessage rebuilds against whatever
   * wiki/ state is current. Called from main.ts onIngestDoneDispatch
   * across every open QueryView. Idempotent.
   */
  public invalidateGraph(): void {
    type InternalView = {
      _graph: unknown;
      _lastRetrieval: unknown;
    };
    const self = this as unknown as InternalView;
    self._graph = null;
    self._lastRetrieval = null;
    console.debug('[QueryView] graph + last retrieval invalidated');
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const texts = TEXTS[this.plugin.settings.language];

    // v1.23.0 P2: Diagnostic — log actual queryHistory state when the
    // view is (re-)opened. Helps debug "history not loading on restart"
    // by showing exactly what plugin.settings has when onOpen runs.
    // Will be removed in v1.24.0 once the regression is confirmed fixed.
    console.debug(
      '[QueryView.onOpen] settings.queryHistory.length =',
      this.plugin.settings.queryHistory?.length ?? 'undefined',
      '| this.history.messages.length =',
      this.history.messages.length,
      '| isArray =',
      Array.isArray(this.plugin.settings.queryHistory)
    );

    // v1.23.0 P2: Refresh history from the latest settings on every
    // onOpen. The constructor captures the value once at instantiation,
    // but Obsidian may restore a cached view state where the settings
    // have since been updated (e.g. by another view writing, or by
    // loadData() after a hot-reload during dev). Re-reading here ensures
    // the user always sees the most recent persisted history.
    const persisted = this.plugin.settings.queryHistory;
    if (Array.isArray(persisted) && persisted.length !== this.history.messages.length) {
      this.history.messages = persisted.slice();
      console.debug(
        '[QueryView.onOpen] re-synced this.history.messages from settings:',
        this.history.messages.length
      );
    }

    contentEl.addClass('llm-wiki-query-view');
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

    this.history.messages.forEach((msg, idx) => {
      const turnIdx = Math.floor(idx / 2);
      this.renderHistoryMessage(msg.role, msg.content, turnIdx);
    });

    // 自动滚动到最新的消息底部
    this.scrollToBottom();

    this.rebuildTurnIndicator();

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

    // v1.23.0 P2: Unified Ctrl+Enter across all platforms (Mac/Win/Linux).
    // Previous design used Cmd+Enter on Mac (Platform.isMacOS), but
    // Electron's global menu intercepts Cmd+Enter on macOS before the
    // textarea keydown fires. Accepting both metaKey+ctrlKey OR-ed
    // caused inconsistent UX (some users only Ctrl, some only Cmd).
    // Unifying on Ctrl+Enter is the simplest cross-platform contract
    // and matches Obsidian's own send-message shortcuts.
    const modKey = 'Ctrl';

    this.inputArea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && evt.ctrlKey) {
        evt.preventDefault();
        if (this.isStreaming) {
          this.stopGeneration();
        } else if (this.inputArea.value.trim()) {
          void this.sendMessage(this.inputArea.value);
        }
      }
    });

    const buttonRow = inputContainer.createDiv({
      cls: 'llm-wiki-query-button-row'
    });

    this.sendBtn = buttonRow.createEl('button', {
      text: `${texts.queryModalSendButton} (${modKey}+Enter)`,
      cls: 'llm-wiki-query-send-btn mod-cta'
    });
    this.sendBtn.addEventListener('click', () => {
      if (this.isStreaming) {
        this.stopGeneration();
      } else if (this.inputArea.value.trim()) {
        void this.sendMessage(this.inputArea.value);
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
      void this.clearHistory();
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

  async onClose() {
    const { contentEl } = this;

    if (this.activeRenderComponent) {
      this.activeRenderComponent.unload();
      this.activeRenderComponent = null;
    }

    // v1.23.0 P2: Cancel any pending rAF that might fire after the
    // view is being torn down (would touch a detached DOM node).
    if (this._streamRafHandle !== null) {
      window.cancelAnimationFrame(this._streamRafHandle);
      this._streamRafHandle = null;
    }

    // v1.23.0 P2: Skip persisting queryHistory on close if the user just
    // cleared it. clearHistory already awaits saveSettings; re-saving
    // here (with `this.history.messages` which is `[]`) is technically
    // a no-op BUT it can race with concurrent sendMessage completions
    // that may have pushed new messages between the clear and close.
    // Belt-and-braces: only skip if a clear happened within the last
    // 5 seconds (i.e. the user almost certainly intended the cleared state).
    if (Date.now() - this._lastClearTimestamp > 5000) {
      this.plugin.settings.queryHistory = this.history.messages;
      await this.plugin.saveSettings();
    }

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
        max_tokens: TOKENS_QUERY_SAVE_DEDUP,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        ...(this.plugin.settings.disableThinking ? { enableThinking: false } : {}),
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

    const userTurnIdx = Math.floor((this.history.messages.length - 1) / 2);
    this.renderHistoryMessage('user', userMessage, userTurnIdx);
    this.scrollToBottom();

    this.limitHistory();

    // Switch button to stop mode
    this.isStreaming = true;
    this.aborted = false;
    this.pendingInput = '';
    this.inputArea.value = '';
    this.sendBtn.setText(texts.queryModalStopButton);
    this.sendBtn.className = 'llm-wiki-query-stop-btn';

    // ChatGPT-style flat layout: full-width message div
    const assistantTurnIdx = Math.floor((this.history.messages.length - 1) / 2);
    const messageDiv = this.historyContainer.createDiv({
      cls: 'llm-wiki-query-message-wrapper llm-wiki-query-message-assistant llm-wiki-query-response-live',
      attr: { 'data-turn': String(assistantTurnIdx) }
    });

    messageDiv.createDiv({
      cls: 'llm-wiki-query-message-label',
      text: '🤖 Wiki'
    });

    const contentDiv = messageDiv.createDiv({
      cls: 'llm-wiki-query-message-body markdown-reading-view'
    });

    // v1.23.0 P2: Streaming-aware rendering — during accumulation, append
    // raw text to a plain-text element; only run the full MarkdownRenderer
    // pass when the stream completes. This avoids 70+ empty()+render cycles
    // per query (which caused "一次性输出" appearance despite real streaming).
    const streamTextDiv = messageDiv.createDiv({
      cls: 'llm-wiki-query-stream-text',
    });

    const statusIndicator = messageDiv.createDiv({
      cls: 'llm-wiki-query-status',
      text: texts.queryPhaseSearching
    });

    this.accumulatedResponse = '';

    // Track found pages info to merge into generating phase
    let foundPagesInfo = '';
    const foundPrefix = texts.queryPhaseFoundPages.split('{count}')[0];

    // Phase 1 & 2: Build wiki context (search → found → context ready)
    const wikiContext = await this.buildWikiContext(userMessage, (phase: string) => {
      if (phase.startsWith(foundPrefix)) {
        foundPagesInfo = phase;
      }
      statusIndicator.setText(phase);
    });

    if (this.aborted) {
      statusIndicator.remove();
      this.finishGeneration(texts as unknown as Record<string, string>);
      return;
    }

    // Phase 3: Generate response with elapsed timer
    const conversationMessages = this.history.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const startTime = Date.now();
    let statusTemplate = foundPagesInfo
      ? `${foundPagesInfo}, ${texts.queryPhaseGenerating}`
      : texts.queryPhaseGenerating;
    const timerInterval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      statusIndicator.setText(statusTemplate.replace('{time}', elapsed.toString()));
    }, 1000);

    const cleanupTimer = () => {
      window.clearInterval(timerInterval);
      statusIndicator.remove();
    };

    try {
      if (this.plugin.llmClient?.createMessageStream) {
        let fullResponse = '';
        try {
          fullResponse = await this.plugin.llmClient.createMessageStream({
            model: this.plugin.settings.model,
            max_tokens: TOKENS_QUERY_LLM_SELECT,
            system: wikiContext,
            messages: conversationMessages,
            onChunk: (chunk) => {
              if (this.aborted) return;
              this.accumulatedResponse += chunk;
              // v1.23.0 P2: Streaming-aware — coalesce DOM updates into
              // a single rAF frame so the browser can paint each batch
              // as a separate visible step. Direct textContent writes
              // in tight succession cause 70+ layout cycles that the
              // browser can coalesce into a single visible render.
              this.scheduleStreamRender(streamTextDiv);
            },
            ...(this.plugin.settings.disableThinking ? { enableThinking: false } : {}),
            ...(this.plugin.settings.chatTemperature !== undefined ? { temperature: this.plugin.settings.chatTemperature } : {}),
          });
          cleanupTimer();
        } catch (streamErr) {
          if (this.aborted) {
            cleanupTimer();
            this.finishGeneration(texts as unknown as Record<string, string>);
            return;
          }
          console.warn('Streaming query failed, falling back to non-streaming:', streamErr);
          statusTemplate = foundPagesInfo
            ? `${foundPagesInfo}, ${texts.queryPhaseNonStreaming}`
            : texts.queryPhaseNonStreaming;
          // Fallback: try non-streaming if streaming fails
          if (this.plugin.llmClient?.createMessage) {
            try {
              fullResponse = await this.plugin.llmClient.createMessage({
                model: this.plugin.settings.model,
                max_tokens: TOKENS_QUERY_LLM_SELECT,
                system: wikiContext,
                messages: conversationMessages,
                ...(this.plugin.settings.disableThinking ? { enableThinking: false } : {}),
                ...(this.plugin.settings.chatTemperature !== undefined ? { temperature: this.plugin.settings.chatTemperature } : {}),
              });
              if (this.aborted) {
                cleanupTimer();
                this.finishGeneration(texts as unknown as Record<string, string>);
                return;
              }
              // v1.23.0 P2: Streaming never started — remove the preview div.
              streamTextDiv.remove();
              this.renderMarkdownContent(fullResponse, contentDiv);
              this.scrollToBottom();
            } catch (fallbackErr) {
              console.error('Non-streaming fallback also failed:', fallbackErr);
              const errMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
              streamTextDiv.remove();
              contentDiv.createEl('p', {
                text: texts.queryModalErrorPrefix + errMsg,
                cls: 'llm-wiki-query-error'
              });
              cleanupTimer();
              this.finishGeneration(texts as unknown as Record<string, string>);
              return;
            }
          } else {
            const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
            contentDiv.createEl('p', {
              text: texts.queryModalErrorPrefix + errMsg,
              cls: 'llm-wiki-query-error'
            });
            cleanupTimer();
            this.finishGeneration(texts as unknown as Record<string, string>);
            return;
          }
          cleanupTimer();
        }

        // v1.20.0: Final render with fullResponse (includes <think> blocks
        // from reasoning_content). During streaming, onChunk only received
        // delta.text — the thinking content was accumulated separately by
        // createMessageStream and prepended as <think> tags in the return value.
        // v1.23.0 P2: Remove streaming plain-text preview, then run the full
        // MarkdownRenderer pass into contentDiv. Cancel any pending rAF
        // from the streaming phase first — the final renderMarkdownContent
        // call below replaces whatever the rAF was about to paint.
        if (this._streamRafHandle !== null) {
          window.cancelAnimationFrame(this._streamRafHandle);
          this._streamRafHandle = null;
        }
        if (fullResponse !== undefined && fullResponse !== null) {
          streamTextDiv.remove();
          this.renderMarkdownContent(fullResponse, contentDiv);
          this.scrollToBottom();
        }

        if (!this.aborted) {
          this.history.messages.push({
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now()
          });
          // v1.23.0 P2: Persist queryHistory after each completed turn
          // so that an abrupt Obsidian close (which may not trigger
          // onClose) doesn't lose the conversation. This is the
          // "crash-safe" persistence path that complements the
          // onClose write-back.
          this.plugin.settings.queryHistory = this.history.messages;
          void this.plugin.saveSettings();
          console.debug(
            '[QueryView.sendMessage] persisted queryHistory, length =',
            this.plugin.settings.queryHistory.length
          );
        }
      } else {
        statusTemplate = foundPagesInfo
          ? `${foundPagesInfo}, ${texts.queryPhaseNonStreaming}`
          : texts.queryPhaseNonStreaming;
        const response = await this.plugin.llmClient!.createMessage({
          model: this.plugin.settings.model,
          max_tokens: TOKENS_QUERY_LLM_SELECT,
          system: wikiContext,
          messages: conversationMessages,
          ...(this.plugin.settings.disableThinking ? { enableThinking: false } : {}),
          ...(this.plugin.settings.chatTemperature !== undefined ? { temperature: this.plugin.settings.chatTemperature } : {}),
        });

        if (this.aborted) {
          cleanupTimer();
          this.finishGeneration(texts as unknown as Record<string, string>);
          return;
        }

        this.history.messages.push({
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        });
        // v1.23.0 P2: Crash-safe persistence (see streaming branch above).
        this.plugin.settings.queryHistory = this.history.messages;
        void this.plugin.saveSettings();
        console.debug(
          '[QueryView.sendMessage:non-stream] persisted queryHistory, length =',
          this.plugin.settings.queryHistory.length
        );

        this.renderMarkdownContent(response, contentDiv);
        this.scrollToBottom();
        cleanupTimer();
      }

    } catch (error) {
      console.error('Query failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      contentDiv.createEl('p', {
        text: texts.queryModalErrorPrefix + errorMsg,
        cls: 'llm-wiki-query-error'
      });
      cleanupTimer();
    }

    // Add copy button to live response
    const lastMsg = this.history.messages[this.history.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && messageDiv) {
      contentDiv.setAttribute('data-raw-content', lastMsg.content);
      this.addCopyButton(messageDiv, contentDiv);
      this.addRetrievalLabel(messageDiv);
      messageDiv.removeClass('llm-wiki-query-response-live');
    }

    this.finishGeneration(texts as unknown as Record<string, string>);
  }

  stopGeneration() {
    this.aborted = true;
    this.pendingInput = this.inputArea.value;
    // v1.23.0 P2: Cancel any pending rAF so the aborted state is
    // reflected immediately rather than after the next paint frame.
    if (this._streamRafHandle !== null) {
      window.cancelAnimationFrame(this._streamRafHandle);
      this._streamRafHandle = null;
    }
  }

  private finishGeneration(texts: Record<string, string>) {
    this.isStreaming = false;
    this.currentResponseDiv = null;
    this.sendBtn.setText(`${texts.queryModalSendButton} (Ctrl+Enter)`);
    this.sendBtn.className = 'llm-wiki-query-send-btn mod-cta';

    // Restore pending input if user stopped generation
    if (this.pendingInput) {
      this.inputArea.value = this.pendingInput;
      this.pendingInput = '';
    }

    const currentRounds = Math.floor(this.history.messages.length / 2);
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', currentRounds.toString())
        .replace('{}', maxRounds.toString())
    );

    // v1.23.2 (#221 Variant 2): scroll-to-start on completion so the
    // user lands at the beginning of the answer, not the very bottom.
    this.scrollToStartOfCurrentTurn();

    this.rebuildTurnIndicator();
  }

  private scrollToStartOfCurrentTurn(): void {
    const lastTurnIdx = Math.floor((this.history.messages.length - 2) / 2);
    if (lastTurnIdx < 0) return;
    // Scroll to the USER question of the current turn, not the assistant
    // answer, so the user sees the question that triggered this response.
    const target = this.historyContainer.querySelector(
      `.llm-wiki-query-message-user[data-turn="${lastTurnIdx}"]`
    );
    if (target) {
      scrollTurnToStart(target as HTMLElement);
    }
  }

  renderMarkdownContent(content: string, container: HTMLElement) {
    container.empty();

    // v1.20.0: extract thinking blocks BEFORE rendering so the visible
    // markdown goes to MarkdownRenderer and the reasoning goes into a
    // collapsible <details> panel above it (default collapsed, ChatGPT-style).
    // Fast guard: skip regex during streaming (onChunk only receives text deltas,
    // never <think> tags). Only run the full extraction when delimiters are present.
    const lower = content.toLowerCase();
    const hasThinkTags = lower.includes('<think');
    const { thinkingBlocks, visibleContent } = hasThinkTags
      ? extractThinkingBlocks(content)
      : { thinkingBlocks: [] as string[], visibleContent: content };
    const normalizedContent = normalizeWikiLinkContent(
      visibleContent,
      this.plugin.settings.wikiFolder
    );

    // If reasoning is present, render the collapsible panel first so it
    // appears above the visible answer.
    if (thinkingBlocks.length > 0) {
      const thinkingEl = renderThinkingBlocksUI(
        thinkingBlocks,
        this.plugin.settings.language
      );
      if (thinkingEl) container.appendChild(thinkingEl);
    }

    // Dispose previous render component to avoid stale/orphaned components
    if (this.activeRenderComponent) {
      this.activeRenderComponent.unload();
      this.activeRenderComponent = null;
    }

    this.activeRenderComponent = new Component();
    this.activeRenderComponent.load();

    const sourcePath = this.plugin.settings.wikiFolder;

    void MarkdownRenderer.render(
      this.app,
      normalizedContent,
      container,
      sourcePath,
      this.activeRenderComponent
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

  scrollToBottom() {
    this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
  }

  /**
   * v1.23.2 (#221 Variant 2): rebuild the right-edge turn indicator
   * whenever the conversation changes. Clicking a dot scrolls that
   * turn to the top of the history container.
   */
  private rebuildTurnIndicator(): void {
    if (this._turnObserver) {
      this._turnObserver.disconnect();
      this._turnObserver = null;
    }

    const turnCount = Math.floor(this.history.messages.length / 2);
    if (turnCount === 0) {
      if (this._turnIndicator) {
        this._turnIndicator.remove();
        this._turnIndicator = null;
      }
      return;
    }

    const turnLabels: string[] = [];
    for (let i = 0; i < this.history.messages.length; i += 2) {
      const userMsg = this.history.messages[i];
      turnLabels.push(userMsg?.role === 'user' ? userMsg.content.slice(0, 120) : '');
    }

    this._turnIndicator = buildTurnIndicator(
      this.historyContainer,
      turnCount - 1,
      turnLabels,
      (idx) => this.scrollToTurn(idx)
    );
    this._turnObserver = observeVisibleTurn(this.historyContainer, this._turnIndicator);
  }

  private scrollToTurn(idx: number): void {
    const target = this.historyContainer.querySelector(
      `.llm-wiki-query-message-user[data-turn="${idx}"]`
    );
    if (!target) return;
    scrollTurnToStart(target as HTMLElement);
  }

  /**
   * v1.23.0 P2: rAF-coalesced streaming render. Each onChunk call
   * appends to accumulatedResponse and schedules a single
   * requestAnimationFrame callback. If more chunks arrive before the
   * rAF fires, they share the same DOM write — guaranteeing one paint
   * per frame instead of one per chunk. This is the canonical fix
   * for "streamed data appears to render in one go" when the producer
   * (AI-SDK's textStream) yields faster than the browser can paint.
   */
  private scheduleStreamRender(streamTextDiv: HTMLElement): void {
    if (this._streamRafHandle !== null) return; // already scheduled
    this._streamRafHandle = window.requestAnimationFrame(() => {
      this._streamRafHandle = null;
      if (this.aborted) return;
      streamTextDiv.textContent = this.accumulatedResponse;
      this.scrollToBottom();
    });
  }

  renderHistoryMessage(role: 'user' | 'assistant', content: string, turnIdx?: number) {

    const messageDiv = this.historyContainer.createDiv({
      cls: ['llm-wiki-query-message-wrapper', role === 'user' ? 'llm-wiki-query-message-user' : 'llm-wiki-query-message-assistant']
    });

    if (turnIdx !== undefined) {
      messageDiv.setAttribute('data-turn', String(turnIdx));
    }

    messageDiv.createDiv({
      cls: 'llm-wiki-query-message-label',
      text: role === 'user' ? '👤 You' : '🤖 Wiki'
    });

    const bodyDiv = messageDiv.createDiv({
      cls: role === 'user' ? 'llm-wiki-query-message-body' : 'llm-wiki-query-message-body markdown-reading-view'
    });

    if (role === 'assistant') {
      bodyDiv.setAttribute('data-raw-content', content);
      this.renderMarkdownContent(content, bodyDiv);
      this.addCopyButton(messageDiv, bodyDiv);
    } else {
      bodyDiv.setText(content);
    }
  }

  private addCopyButton(messageWrapper: HTMLElement, bodyDiv: HTMLElement) {
    const copyBtn = messageWrapper.createDiv({ cls: 'llm-wiki-query-copy-btn' });
    copyBtn.setText('Copy');
    copyBtn.addEventListener('click', (evt) => {
      evt.stopPropagation();
      const raw = bodyDiv.getAttribute('data-raw-content') || '';
      navigator.clipboard.writeText(raw).then(() => {
        copyBtn.setText('Copied!');
        window.setTimeout(() => copyBtn.setText('Copy'), 1500);
      }).catch(() => {
        copyBtn.setText('Failed');
        window.setTimeout(() => copyBtn.setText('Copy'), 1500);
      });
    });
  }

  /**
   * Add a persistent retrieval-arm label below the message body.
   * Surfaces the PPR cascade arm choice so users (and devs reading the
   * rendered chat) can see which retrieval method was used.
   * Skipped silently if no retrieval metadata was captured.
   */
  private addRetrievalLabel(messageWrapper: HTMLElement): void {
    if (!this._lastRetrieval) return;
    const r = this._lastRetrieval;
    const armDisplay = r.arm === 'none'
      ? '—'
      : r.arm
          .split('/')
          .map(a => {
            if (a === 'PPR+LLM') return '🔗 PPR+LLM';
            if (a === 'PPR') return '🔗 PPR';
            if (a === 'PPR+') return '🔗 PPR+';
            return '📇 index';
          })
          .join(' · ');
    const label = messageWrapper.createDiv({
      cls: 'llm-wiki-query-retrieval-label',
    });
    label.setText(`🔍 ${r.count} page(s) · ${armDisplay}`);
    // v1.23.2: click to expand/collapse the list of retrieved pages
    // inline below the label (no Notice).
    const detail = messageWrapper.createDiv({
      cls: 'llm-wiki-query-retrieval-detail',
    });
    r.topPaths.forEach(p => {
      const rel = p.replace(this.plugin.settings.wikiFolder + '/', '').replace('.md', '');
      const pageDiv = detail.createDiv({ cls: 'llm-wiki-query-retrieval-page' });
      pageDiv.setText(`📄 [[${rel}]]`);
    });

    label.addClass('llm-wiki-query-retrieval-label-clickable');
    label.addEventListener('click', (evt) => {
      evt.stopPropagation();
      detail.classList.toggle('llm-wiki-query-retrieval-detail-open');
    });
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
      this.history.messages.forEach((msg, idx) => {
        const turnIdx = Math.floor(idx / 2);
        this.renderHistoryMessage(msg.role, msg.content, turnIdx);
      });
      this.rebuildTurnIndicator();
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
      new Notice(`${texts.saveToWikiSuccess}\n${summary}`, NOTICE_NORMAL);
    } catch (error) {
      console.error('Save failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const texts = TEXTS[this.plugin.settings.language];
      new Notice(texts.queryModalErrorPrefix + errorMsg, NOTICE_ERROR);
    } finally {
      progressNotice.hide();
      this.plugin.wikiEngine.setProgressCallback(origProgress);
    }
  }

  async clearHistory() {
    const beforeLen = this.history.messages.length;
    this.history.messages = [];
    this.historyContainer.empty();

    this.plugin.settings.queryHistory = [];
    // v1.23.0 P2: Await the save so the empty state is guaranteed to hit
    // disk before this method returns. The previous `void this.plugin.saveSettings()`
    // was fire-and-forget — if the user closed Obsidian immediately after
    // clicking Clear, the write could be lost. Awaiting closes that window.
    await this.plugin.saveSettings();
    this._lastClearTimestamp = Date.now();

    // v1.23.0 P2: Diagnostic — log the clear so user can verify in
    // DevTools that the empty array reached disk.
    console.debug(
      '[QueryView.clearHistory] cleared',
      beforeLen,
      'messages; settings.queryHistory after save =',
      JSON.stringify(this.plugin.settings.queryHistory)
    );

    const texts = TEXTS[this.plugin.settings.language];
    new Notice(texts.historyCleared, NOTICE_BRIEF);

    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', '0')
        .replace('{}', maxRounds.toString())
    );
  }

  async buildWikiContext(userMessage: string, onProgress?: (phase: string) => void): Promise<string> {
    console.debug('=== buildWikiContext started ===');
    console.debug('User question:', userMessage);

    const texts = TEXTS[this.plugin.settings.language];

    try {
      const indexPath = `${this.plugin.settings.wikiFolder}/index.md`;
      console.debug('[Step 1] Index path:', indexPath);
      const indexContent = await this.plugin.wikiEngine.tryReadFile(indexPath);
      console.debug('[Step 1] Index content:', indexContent ? 'loaded' : 'not found');

      if (!indexContent) {
        console.debug('[Step 1] Wiki is empty, returning hint');
        const lang = this.plugin.settings.wikiLanguage || 'en';
        const langName = WIKI_LANGUAGES[lang] || lang;
        return `IMPORTANT: You MUST write ALL responses in ${langName}.\n\nYou are a Wiki assistant. The Wiki is empty. Please answer based on your knowledge and suggest the user ingest sources first.`;
      }

      // Phase: Searching for relevant pages — PPR cascade
      onProgress?.(texts.queryPhaseSearching);

      // Step 2: Parse index into PageRef[] for the pprCascade.
      const allPages = parseIndexForPages(indexContent);
      const pageRefs: PageRef[] = allPages.map(p => ({
        path: p.path,
        title: p.title,
        aliases: p.aliases,
        summary: p.summary,
      }));
      const allPaths = new Set(allPages.map(p => p.path));

      // === Tier 1: FAST PATH (lex-based) ===
      // Run the PPR cascade first — uses lex + graph structure.
      const matches = pprCascade(userMessage, pageRefs, {
        graph: this._graph ?? undefined,
        topN: 5,
      });

      // === Tier 2: LLM AUGMENTATION (only when fast path is weak) ===
      // Trigger: lex returned no hits OR top hit has score < 2 (i.e.
      // matched only in summary, not title/alias). At that point the
      // LLM's semantic understanding gives better seeds than lex alone.
      const maxScore = matches.length > 0 ? matches[0].score : 0;
      const needsLLMSeeds = matches.length === 0 || maxScore < 2;
      let finalMatches = matches;
      if (needsLLMSeeds) {
        console.debug(`[Step 2b] LLM seed selection triggered (maxScore=${maxScore}, lexHits=${matches.length})`);
        const llmSeeds = await this.selectSeedsWithLLM(userMessage, pageRefs);
        console.debug(`[Step 2b] LLM returned ${llmSeeds.length} seeds:`, llmSeeds);
        if (llmSeeds.length > 0) {
          // Re-run cascade with LLM-provided seeds.
          finalMatches = pprCascade(userMessage, pageRefs, {
            graph: this._graph ?? undefined,
            topN: 5,
            seeds: llmSeeds,
          });
          console.debug(`[Step 2b] Cascade with LLM seeds returned ${finalMatches.length} pages`);
        }
      }

      let relevantPages = finalMatches.map(m => m.page.path);

      // === PPR cascade debug signals ===
      const arms = new Set(finalMatches.map(m => m.arm));
      const armInfo = [...arms].map(a =>
        a === 'graph-first-ppr' ? 'PPR' : a === 'lex-seeded-ppr' ? 'PPR+' : 'index'
      ).join('/');
      const llmAugmented = needsLLMSeeds && finalMatches.some(m => m.score > 0);
      const armDisplay = llmAugmented ? `${armInfo}+LLM` : armInfo;
      const pageNames = relevantPages.map(p => p.split('/').pop() || p).join(', ');
      const foundText = texts.queryPhaseFoundPages
        .replace('{count}', relevantPages.length.toString())
        .replace('{pages}', pageNames);
      onProgress?.(`${foundText} · ${armDisplay}`);
      console.debug(`[Step 2] PPR cascade selected ${relevantPages.length} pages (arm: ${armDisplay || 'none'})`);
      console.debug(`[Step 2]   top-5 paths:`, finalMatches.slice(0, 5).map(m => `${m.page.path} (${m.arm}, score=${m.score.toFixed(3)})`));
      console.debug(`[Step 2]   query tokens:`, userMessage.toLowerCase().split(/\s+/).filter(k => k.length > 0));
      console.debug(`[Step 2]   graph state: ${this._graph ? `${this._graph.nodes.length} nodes / ${this._graph.edges.size} edges` : 'none'}`);
      console.debug(`[Step 2]   LLM augmentation: ${needsLLMSeeds ? 'triggered' : 'skipped (fast path sufficient)'}`);

      // Persist retrieval metadata for the response UI label.
      this._lastRetrieval = {
        arm: armDisplay || 'none',
        count: relevantPages.length,
        topPaths: relevantPages.slice(0, 5),
      };

      // Phase: Loading pages
      onProgress?.(texts.queryPhaseLoadingPages);

      console.debug('[Step 3] Loading page content...');
      const rawLoadedPages = await this.loadRelevantPages(relevantPages);
      console.debug('[Step 3] Pages loaded:', rawLoadedPages.length);

      // Build the graph from loaded pages (first query only, then cached).
      if (!this._graph) {
        const loadedForGraph: LoadedPage[] = relevantPages.map((path, i) => ({
          path,
          content: rawLoadedPages[i] || '',
        }));
        this._graph = buildGraphFromContent(loadedForGraph, allPaths, this.plugin.settings.wikiFolder);
        console.debug('[Step 3] Graph built:', this._graph.nodes.length, 'nodes,', this._graph.edges.size, 'edges');
      }

      // Phase: Context ready, about to generate
      onProgress?.(texts.queryPhaseContextReady);

      const lang = this.plugin.settings.wikiLanguage || 'en';
      const langName = WIKI_LANGUAGES[lang] || lang;
      const langDirective = `IMPORTANT: You MUST write ALL responses in ${langName}. Every answer, explanation, and label must be in ${langName}.`;

      // Build a shorter note for the context: which arm was used.
      const retrievalNote = matches.length > 0
        ? `(Pages selected via ${armInfo} retrieval.)`
        : '(No relevant pages found. The LLM should answer from general knowledge.)';

      const wikiContext = `${langDirective}

You are a Wiki assistant with access to a structured knowledge base.

Wiki Index:
${indexContent}

Relevant Wiki Pages (loaded with full content):
${rawLoadedPages.length > 0 ? rawLoadedPages.join('\n\n---\n\n') : 'No directly relevant pages found in Wiki.'}

${retrievalNote}

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

CITATION REQUIREMENTS:
- When referencing specific information from a Wiki page, include an inline wiki-link
- At the end of your answer, add a "## References" section (or "## 参考文献" for Chinese) listing all wiki pages you cited
- Format each reference as: [[${this.plugin.settings.wikiFolder}/path/page-name|Display Name]] — brief description
- Example:
  ## References
  1. [[${this.plugin.settings.wikiFolder}/concepts/example-concept|Example Concept]] — Core mechanism explanation
  2. [[${this.plugin.settings.wikiFolder}/entities/example-entity|Example Entity]] — Background and history

If Wiki lacks relevant information:
- Acknowledge it and suggest ingesting more sources
- Do NOT make up information outside Wiki

Respond in ${langName}`;

      console.debug('[Step 4] Wiki context built');
      console.debug('[Step 4] Context length:', wikiContext.length);
      return wikiContext;
    } catch (error) {
      console.error('[Error] buildWikiContext failed:', error);
      const lang2 = this.plugin.settings.wikiLanguage || 'en';
      const langName2 = WIKI_LANGUAGES[lang2] || lang2;
      return `IMPORTANT: You MUST write ALL responses in ${langName2}.\n\nYou are a Wiki assistant. Failed to load Wiki context. Please answer based on your knowledge.`;
    }
  }

  async loadRelevantPages(pageTitles: string[]): Promise<string[]> {
    console.debug('=== loadRelevantPages started ===');
    console.debug('Page titles:', pageTitles);

    const pages: string[] = [];

    const wikiPrefix = this.plugin.settings.wikiFolder + '/';

    // Section labels for extractSummaryFromPage (Tier B).
    // Cache on first call because settings don't change mid-query.
    if (!this._sectionLabels) {
      this._sectionLabels = getSectionLabels(this.plugin.settings);
    }
    const sectionLabels = this._sectionLabels;

    for (const title of pageTitles) {
      console.debug(`[Load Page] Processing title: "${title}"`);

      // Strip wiki folder prefix if path has it (e.g., "wiki/entities/xxx" → "entities/xxx")
      const normalizedTitle = title.startsWith(wikiPrefix) ? title.slice(wikiPrefix.length) : title;
      const pagePath = `${this.plugin.settings.wikiFolder}/${normalizedTitle}.md`;

      console.debug(`[Load Page] Full path: "${pagePath}"`);

      const content = await this.plugin.wikiEngine.tryReadFile(pagePath);
      console.debug(`[Load Page] File exists: ${content ? 'yes' : 'no'}`);

      if (content) {
        const displayTitle = `${this.plugin.settings.wikiFolder}/${normalizedTitle}`;

        // Determine the page type from path: "entities/xxx" → entity, "concepts/xxx" → concept, else source.
        const pathSegment = normalizedTitle.split('/')[0];
        const pageTypeHint = pathSegment === 'entities' ? 'entity' : pathSegment === 'concepts' ? 'concept' : null;

        let body: string;

        // Tier B: extract summary section for entity/concept pages (zero LLM).
        if (pageTypeHint && sectionLabels.description && sectionLabels.definition) {
          const summary = extractSummaryFromPage(content, {
            descriptionLabel: sectionLabels.description,
            definitionLabel: sectionLabels.definition,
            pageType: pageTypeHint,
            maxChars: Math.floor(MAX_PAGE_CONTENT_CHARS / 3), // shorter summary
          });
          if (summary) {
            body = summary;
            console.debug(`[Load Page] Tier B summary extracted (${body.length} chars)`);
          } else {
            // Fall back to truncated full content if no summary section found.
            body = content.length > MAX_PAGE_CONTENT_CHARS
              ? content.substring(0, MAX_PAGE_CONTENT_CHARS) + '\n\n... (truncated)'
              : content;
            console.debug(`[Load Page] No summary section found, using full content (${body.length} chars)`);
          }
        } else {
          body = content.length > MAX_PAGE_CONTENT_CHARS
            ? content.substring(0, MAX_PAGE_CONTENT_CHARS) + '\n\n... (truncated)'
            : content;
          console.debug(`[Load Page] Source page or unknown type, using full content (${body.length} chars)`);
        }

        pages.push(`## ${displayTitle}\n\n${body}`);
      } else {
        console.warn(`[Load Page] Cannot read page: ${pagePath}`);
      }
    }

    console.debug(`[Load Page] Successfully loaded pages`);
    return pages;
  }

  /**
   * Tier 2: LLM-based semantic seed selection.
   *
   * Called when the Tier 1 lex fast path returns no hits or weak signals.
   * Sends the user's query + a compact list of (path, summary) pairs to
   * the LLM, which returns up to 3 page paths as seeds. The LLM is the
   * primary semantic matcher here — it's the layer that handles
   * synonyms, cross-language aliases, and abstract queries that pure
   * string matching can't reach.
   *
   * Graceful degradation: returns empty array on any failure (LLM
   * unavailable, parse error, network timeout). Caller falls back to
   * whatever the lex fast path returned.
   */
  async selectSeedsWithLLM(query: string, pageRefs: PageRef[]): Promise<string[]> {
    if (!this.plugin.llmClient) return [];
    if (pageRefs.length === 0) return [];

    // Build compact (path, summary) list — cap at 50 pages to keep
    // prompt bounded.
    const pagesList = pageRefs
      .slice(0, 50)
      .map(p => `- ${p.path}: ${p.summary || '(no summary)'}`)
      .join('\n');

    const prompt = PROMPTS.seedSelection
      .replace('{{query}}', query)
      .replace('{{pages}}', pagesList);

    try {
      const response = await this.plugin.llmClient.createMessage({
        model: this.plugin.settings.model,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        ...(this.plugin.settings.disableThinking ? { enableThinking: false } : {}),
      });
      const parsed = await parseJsonResponse(response) as { seeds?: string[] } | null;
      const rawSeeds = parsed?.seeds || [];
      // Validate against pageRefs — drop any paths that don't exist.
      const validPaths = new Set(pageRefs.map(p => p.path));
      return rawSeeds.filter(s => validPaths.has(s));
    } catch (error) {
      console.warn('[LLM seed selection failed]', error);
      return [];
    }
  }
}
