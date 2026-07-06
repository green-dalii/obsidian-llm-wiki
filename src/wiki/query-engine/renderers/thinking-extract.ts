// PR #3 split: extractThinkingPanel extracted from query-engine.ts (787-810).
//
// Splits content into thinking blocks (rendered as collapsible <details>)
// and visible content (passed to MarkdownRenderer). Pure DOM construction;
// returns plain data so the caller (QueryView.renderMarkdownContent) can
// own the Component lifecycle.

import { renderThinkingBlocksUI } from './thinking-block';
import { normalizeWikiLinkContent } from '../../../core/prompt-builders';
import { extractThinkingBlocks } from '../../../core/markdown';

export interface ThinkingPanelResult {
  /** DOM element to prepend (a <details> collapsible panel) — null when no blocks. */
  thinkingEl: HTMLElement | null;
  /** Content after thinking blocks removed + wiki-links normalized — what MarkdownRenderer sees. */
  normalized: string;
}

/**
 * Extract <details> collapsible thinking panel + normalize the visible body.
 * Fast guard: skip the regex pass when no delimiters are present (the common
 * case during streaming when no reasoning content has yet arrived).
 *
 * `wikiFolder` is required — without it, `normalizeWikiLinkContent` skips
 * the prefix substitution and falls back to the test default. Caller
 * (QueryView.renderMarkdownContent) supplies the user's wiki folder.
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
  const normalized = normalizeWikiLinkContent(visibleContent, wikiFolder);
  return {
    thinkingEl: renderThinkingBlocksUI(thinkingBlocks, language),
    normalized,
  };
}
