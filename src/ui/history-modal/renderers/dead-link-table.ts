// v3.1 split: dead link rendering extracted from history-modal.ts
// (renderDeadLinkSection was at 1107-1130, renderDeadLinkTable at 1132-1188).
//
// Default collapsed if > 10 — insight panel principle: don't dump 19 bullets.
// Each link is clickable; the click handler uses ctx.app.workspace.openLinkText
// to navigate to the source page.

import type { ReportSection, SectionItem } from '../../../core/log-parser';
import type { HistoryTexts } from '../types';
import { renderSectionTitle } from './footer';
import { createWikiLink, type RendererContext } from './link-helpers';

export function renderDeadLinkSection(
  body: HTMLElement,
  section: ReportSection,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  const label = t.historySectionDeadLinks.replace('{count}', String(section.items.length));
  renderSectionTitle(body, label, 'high');
  if (section.items.length === 0) {
    body.createDiv({
      text: '✓',
      attr: { style: 'color: var(--text-success); margin-left: 12px;' },
    });
    return;
  }
  const collapsed = section.items.length > 10;
  if (collapsed) {
    const details = body.createEl('details', { attr: { style: 'margin-left: 4px;' } });
    details.createEl('summary', {
      text: t.historyShowMoreItems.replace('{count}', String(section.items.length)),
      attr: { style: 'cursor: pointer; color: var(--text-accent); user-select: none;' },
    });
    const inner = details.createDiv({ attr: { style: 'margin-top: 4px;' } });
    renderDeadLinkTable(inner, section.items, t, ctx);
  } else {
    renderDeadLinkTable(body, section.items, t, ctx);
  }
}

export function renderDeadLinkTable(
  body: HTMLElement,
  items: SectionItem[],
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  const table = body.createEl('table', {
    attr: {
      style:
        'width: 100%; border-collapse: collapse; margin-top: 4px; ' +
        'font-size: 0.85em;',
    },
  });
  const thead = table.createEl('thead');
  const headRow = thead.createEl('tr');
  headRow.createEl('th', {
    text: t.historyDeadLinkSource,
    attr: { style: 'text-align: left; padding: 4px 8px; color: var(--text-muted); font-weight: 500; font-size: 0.85em; border-bottom: 1px solid var(--background-modifier-border);' },
  });
  headRow.createEl('th', {
    text: '→',
    attr: { style: 'width: 24px; border-bottom: 1px solid var(--background-modifier-border);' },
  });
  headRow.createEl('th', {
    text: t.historyDeadLinkTarget,
    attr: { style: 'text-align: left; padding: 4px 8px; color: var(--text-muted); font-weight: 500; font-size: 0.85em; border-bottom: 1px solid var(--background-modifier-border);' },
  });
  const tbody = table.createEl('tbody');
  for (const item of items) {
    const row = tbody.createEl('tr');
    row.createEl('td', {
      attr: { style: 'padding: 3px 8px; border-bottom: 1px solid var(--background-modifier-border);' },
    });
    // First link is the source page; make it clickable.
    const sourceCell = row.cells[0];
    const firstLink = item.links[0];
    if (firstLink) {
      createWikiLink(sourceCell, { path: firstLink.path }, ctx);
    } else {
      sourceCell.textContent = item.raw.split('→')[0].trim();
    }
    row.createEl('td', {
      text: '→',
      attr: { style: 'padding: 3px 8px; color: var(--text-muted); text-align: center; border-bottom: 1px solid var(--background-modifier-border);' },
    });
    row.createEl('td', {
      text: item.targetPage ?? item.raw,
      attr: {
        style:
          'padding: 3px 8px; color: var(--text-error); ' +
          'border-bottom: 1px solid var(--background-modifier-border);',
      },
    });
  }
}
