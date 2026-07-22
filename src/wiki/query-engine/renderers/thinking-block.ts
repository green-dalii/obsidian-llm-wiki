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
 *
 * v1.25.2 PATCH: takes a `parent` HTMLElement so the <details> is built
 * via the parent's `createEl` helper — Obsidian runtime's
 * `HTMLDocument.createEl` auto-attaches to `document.body`, which
 * collides with `renderMarkdownContent`'s later
 * `container.appendChild(thinkingEl)` and trips the runtime check
 * "Only one element on document allowed" the moment we try to
 * append the first nested `details.createEl('summary')`. Building
 * against a Node-typed parent sidesteps the issue entirely and
 * restores the ChatGPT-style collapsible panel.
 */
export function renderThinkingBlocksUI(
  thinkingBlocks: string[],
  language: string,
  parent: HTMLElement,
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

  const details = parent.createEl('details', {
    cls: 'llm-wiki-query-thinking-block',
  });

  const count = thinkingBlocks.length;
  const summaryText = count > 1
    ? `💭 ${summaryLabel} (${count} ${stepsLabel})`
    : `💭 ${summaryLabel}`;
  details.createEl('summary', { text: summaryText });

  for (const block of thinkingBlocks) {
    details.createEl('pre', {
      cls: 'llm-wiki-query-thinking-content',
      text: block,
    });
  }

  return details;
}
