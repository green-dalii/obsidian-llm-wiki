// PR #3 split: renderThinkingBlocksUI extracted from query-engine.ts (28-65).
//
// Pure DOM construction — no Obsidian API dependency beyond `activeDocument`,
// fully testable under jsdom. Tested by src/__tests__/wiki/query-thinking-ui.test.ts.
//
// Re-exported from `query-engine/index.ts` so existing callers
// (`import { renderThinkingBlocksUI } from './wiki/query-engine'`) keep working.

import { TEXTS } from '../../../texts';

/**
 * v1.20.0: Render extracted thinking blocks as a <details> collapsible
 * panel, ChatGPT/Claude.ai style. The summary line is localized via the
 * TEXTS table (with English fallback). Returns null when there are no
 * blocks so the caller can skip the wrapper entirely.
 */
export function renderThinkingBlocksUI(
  thinkingBlocks: string[],
  language: string,
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
  // Top-level <details> — no parent yet, so use createEl on the Document
  // (declared in src/types/obsidian-dom.d.ts; set up at runtime by
  // `installObsidianDomHelpers` in src/__tests__/__support__/dom-helpers.ts
  // and by Obsidian itself in production).
  const details = doc.createEl('details', {
    cls: 'llm-wiki-query-thinking-block',
  });

  const count = thinkingBlocks.length;
  const summaryText = count > 1
    ? `💭 ${summaryLabel} (${count} ${stepsLabel})`
    : `💭 ${summaryLabel}`;
  // createEl appends to its host, so we don't need to capture or append
  // the summary / pre children separately — details.createEl does it.
  details.createEl('summary', { text: summaryText });

  for (const block of thinkingBlocks) {
    details.createEl('pre', {
      cls: 'llm-wiki-query-thinking-content',
      text: block,
    });
  }

  return details;
}
