// v3.1 split: simple list section extracted from history-modal.ts
// (renderSimpleListSection was at 1215-1240).
//
// Used for orphan / empty / "default" section kinds — tight list of items
// with clickable first link. Title is supplied by the caller (different
// labels for orphan vs empty).

import type { ReportSection } from '../../../core/log-parser';
import type { HistoryTexts } from '../types';
import { renderSectionTitle } from './footer';
import { createWikiLink, type RendererContext } from './link-helpers';

export function renderSimpleListSection(
  body: HTMLElement,
  section: ReportSection,
  labelText: string,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  void t;
  const finalLabel = section.heading || labelText.replace('{count}', String(section.items.length));
  renderSectionTitle(body, finalLabel, 'low');
  const list = body.createEl('ul', {
    attr: { style: 'margin: 0; padding-left: 20px; list-style: none;' },
  });
  for (const item of section.items) {
    const li = list.createEl('li', { attr: { style: 'margin: 2px 0;' } });
    const firstLink = item.links[0];
    if (firstLink) {
      createWikiLink(li, { path: firstLink.path }, ctx);
    }
    li.appendText(' — ' + item.text);
  }
}
