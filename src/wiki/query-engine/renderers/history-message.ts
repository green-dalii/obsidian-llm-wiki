// PR #3 split: renderHistoryMessage + addCopyButton extracted from
// query-engine.ts (913-939 + 941-955).
//
// Used to render assistant/user message bubbles during streaming and on
// history re-hydration. Pure DOM construction — caller passes the
// history container. The markdown content render path (renderMarkdownContent)
// stays on QueryView because it's tied to the MarkdownRenderer Component
// lifecycle.

/**
 * Build a single message div (user or assistant) inside `historyContainer`.
 * For assistant messages, callers should subsequently invoke the markdown
 * render path (MarkdownRenderer.render) and add the copy button.
 *
 * `turnIdx` is OPTIONAL — mirrors the original QueryView.renderHistoryMessage
 * signature where the data-turn attribute was set only when explicitly
 * provided (default behavior of leaves the attribute unset, so that
 * downstream selectors that check `[data-turn]` can identify pre-render
 * or single-bubble messages by attribute absence).
 */
export function renderHistoryMessage(
  historyContainer: HTMLElement,
  role: 'user' | 'assistant',
  content: string,
  turnIdx?: number,
): HTMLElement {
  const messageDiv = historyContainer.createDiv({
    cls: ['llm-wiki-query-message-wrapper', role === 'user' ? 'llm-wiki-query-message-user' : 'llm-wiki-query-message-assistant'],
  });
  if (turnIdx !== undefined) {
    messageDiv.setAttribute('data-turn', String(turnIdx));
  }

  messageDiv.createDiv({
    cls: 'llm-wiki-query-message-label',
    text: role === 'user' ? '👤 You' : '🤖 Wiki',
  });

  const bodyDiv = messageDiv.createDiv({
    cls: role === 'user' ? 'llm-wiki-query-message-body' : 'llm-wiki-query-message-body markdown-reading-view',
  });

  if (role === 'assistant') {
    bodyDiv.setAttribute('data-raw-content', content);
  } else {
    bodyDiv.setText(content);
  }

  return messageDiv;
}

/**
 * Add a copy button to a message wrapper. Click invokes navigator.clipboard.writeText
 * with the body div's data-raw-content; UI feedback swaps the label to "Copied!"
 * for 1.5s then back. Failure path shows "Failed".
 */
export function addCopyButton(messageWrapper: HTMLElement, bodyDiv: HTMLElement): void {
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
