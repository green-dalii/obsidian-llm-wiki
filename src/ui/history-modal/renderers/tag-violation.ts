// v3.1 split: tag violation section extracted from history-modal.ts
// (renderTagViolationSection was at 1191-1212).
//
// Renders a tight list of tag-violation items as chip + 1-line entries.

import type { ReportSection } from '../../../core/log-parser';
import type { HistoryTexts } from '../types';
import { renderSectionTitle } from './footer';
import { createWikiLink, type RendererContext } from './link-helpers';

export function renderTagViolationSection(
  body: HTMLElement,
  section: ReportSection,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  const label = t.historySectionTagViolations.replace('{count}', String(section.items.length));
  renderSectionTitle(body, label, 'medium');
  const list = body.createEl('ul', {
    attr: { style: 'margin: 0; padding-left: 20px; list-style: none;' },
  });
  for (const item of section.items) {
    const li = list.createEl('li', {
      attr: { style: 'margin: 2px 0; color: var(--text-warning);' },
    });
    const firstLink = item.links[0];
    if (firstLink) {
      createWikiLink(li, { path: firstLink.path }, ctx);
    }
    li.appendText(' — ' + item.text);
  }
}
