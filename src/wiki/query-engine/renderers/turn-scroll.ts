// PR #3 split: 3 scroll helpers extracted from query-engine.ts.
//
// - scrollToBottom: scrolls historyContainer to its last position.
// - scrollToStartOfCurrentTurn: scrolls to the user message of the
//   most-recently-completed turn.
// - scrollToTurn: same as above, but for any turn index (used by the
//   right-edge turn indicator dot click handler).

import { scrollTurnToStart } from '../../turn-indicator';

/** Scroll historyContainer to its bottom — used after each stream chunk finishes. */
export function scrollToBottom(historyContainer: HTMLElement): void {
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

/**
 * Scroll to the user message of the most-recently-completed turn.
 * Used by QueryView.finishGeneration to anchor the user at the question
 * that triggered this response, not the (often very long) assistant answer.
 */
export function scrollToStartOfCurrentTurn(
  historyContainer: HTMLElement,
  messageCount: number,
): void {
  const lastTurnIdx = Math.floor((messageCount - 2) / 2);
  if (lastTurnIdx < 0) return;
  const target = historyContainer.querySelector(
    `.llm-wiki-query-message-user[data-turn="${lastTurnIdx}"]`,
  );
  if (target) {
    scrollTurnToStart(target as HTMLElement);
  }
}

/** Scroll to a specific turn (0-indexed) within the history container. */
export function scrollToTurn(historyContainer: HTMLElement, idx: number): void {
  const target = historyContainer.querySelector(
    `.llm-wiki-query-message-user[data-turn="${idx}"]`,
  );
  if (!target) return;
  scrollTurnToStart(target as HTMLElement);
}
