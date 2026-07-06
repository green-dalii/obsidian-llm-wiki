// v3.1 split: fix details extracted from history-modal.ts
// (renderFixDetails was at 1483-1500).
//
// Simple list of fix entry details. Renders the structured `details` array
// if non-empty, otherwise falls back to the raw text.

import type { HistoryTexts, RenderedEntry } from '../types';
import { renderLineWithLinks } from './link-helpers';
import type { RendererContext } from './link-helpers';

export function renderFixDetails(
  body: HTMLElement,
  entry: RenderedEntry,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  body.createEl('div', {
    text: `${t.historyEntrySectionDetails} (${entry.details.length})`,
    attr: { style: 'font-weight: 600; margin-bottom: 4px; font-size: 0.9em;' },
  });
  if (entry.details.length === 0 && entry.rawDetails) {
    body.createEl('div', {
      text: entry.rawDetails,
      attr: { style: 'white-space: pre-wrap; color: var(--text-muted); margin-left: 8px;' },
    });
    return;
  }
  const list = body.createEl('ul', {
    attr: { style: 'margin: 0; padding-left: 20px; list-style: disc;' },
  });
  for (const row of entry.details) {
    const li = list.createEl('li', { attr: { style: 'margin: 2px 0; color: var(--text-muted);' } });
    renderLineWithLinks(li, row.raw, ctx);
  }
}
