// PR #3 split: extractThinkingPanel extracted from query-engine.ts (787-810).
//
// Splits content into thinking blocks (rendered as collapsible <details>)
// and visible content (passed to MarkdownRenderer). Pure DOM construction;
// returns plain data so the caller (QueryView.renderMarkdownContent) can
// own the Component lifecycle.

import { renderThinkingBlocksUI } from './thinking-block';
import { normalizeWikiLinkContent, substituteWikiFolderPlaceholder } from '../../../core/prompt-builders';
import { extractThinkingBlocks } from '../../../core/markdown';

export interface ThinkingPanelResult {
  /** DOM element to prepend (a <details> collapsible panel) — null when no blocks. */
  thinkingEl: HTMLElement | null;
  /** Content after thinking blocks removed + wiki-links normalized + placeholder substituted — what MarkdownRenderer sees. */
  normalized: string;
}

/**
 * Extract <details> collapsible thinking panel + normalize the visible body.
 * Fast guard: skip the regex pass when no delimiters are present (the common
 * case during streaming when no reasoning content has yet arrived).
 *
 * v1.24.0 (Bug C 3.0): pipeline order is
 *   1. `normalizeWikiLinkContent` — collapse the LLM's emitted folder prefix
 *      (current wikiFolder or the literal default 'wiki') into the placeholder
 *      `__WIKI_FOLDER__`. This makes the rendered-text history invariant across
 *      wikiFolder changes.
 *   2. `substituteWikiFolderPlaceholder` — replace `__WIKI_FOLDER__` with the
 *      user's CURRENT `wikiFolder` so the user sees a clickable Obsidian link.
 * `wikiFolder` is required — without it, both steps become no-ops and we
 * fall through with whatever the LLM emitted (caller is `QueryView.renderMarkdownContent`).
 */
export function extractThinkingPanel(
  content: string,
  language: string,
  wikiFolder: string,
): ThinkingPanelResult {
  const lower = content.toLowerCase();
  const hasThinkTags = lower.includes('<think');
  const { thinkingBlocks, visibleContent } = hasThinkTags
    ? extractThinkingBlocks(content)
    : { thinkingBlocks: [] as string[], visibleContent: content };
  // Collapse the LLM's folder back to the placeholder, then substitute the
  // real folder at the very end. Doing these in the wrong order would lose
  // information (substitute first would lock the current folder into history).
  const withPlaceholder = normalizeWikiLinkContent(visibleContent, wikiFolder);
  const normalized = substituteWikiFolderPlaceholder(withPlaceholder, wikiFolder);
  return {
    thinkingEl: renderThinkingBlocksUI(thinkingBlocks, language),
    normalized,
  };
}
