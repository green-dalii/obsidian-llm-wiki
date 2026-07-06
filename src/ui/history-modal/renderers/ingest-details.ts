// v3.1 split: ingest details extracted from history-modal.ts
// (renderIngestDetails was at 1330-1370, renderIngestMetricCards at 1373-1413,
//  renderPageTypeGroup at 1421-1479).
//
// Ingest: group Created/Updated pages by page type (entity/concept/source)
// with count chips. This replaces 30-line flat lists with a 3-row summary.

import type { HistoryTexts, RenderedEntry } from '../types';
import { formatBytesShort } from '../render-state';
import { createWikiLink, type RendererContext } from './link-helpers';

export function renderIngestDetails(
  body: HTMLElement,
  entry: RenderedEntry,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  // 1) Metric cards (duration, model, source size, total pages)
  if (entry.ingestMetrics && (
    typeof entry.ingestMetrics.durationSec === 'number'
    || entry.ingestMetrics.model
    || typeof entry.ingestMetrics.sourceBytes === 'number'
  )) {
    renderIngestMetricCards(body, entry, t);
  }
  // 2) Time + source heading (so the user knows when + which file)
  if (entry.time) {
    body.createEl('div', {
      text: `${t.historyIngestLatestTime}: ${entry.date} ${entry.time}`,
      attr: { style: 'color: var(--text-muted); font-size: 0.8em; margin: 6px 0 4px 0;' },
    });
  } else {
    body.createEl('div', {
      text: `${t.historyIngestLatestTime}: ${entry.date} · ${t.historyIngestNoTimestamp}`,
      attr: { style: 'color: var(--text-faint); font-size: 0.8em; margin: 6px 0 4px 0;' },
    });
  }
  if (entry.sourceTitle) {
    body.createEl('div', {
      text: `${t.historyIngestSource}: ${entry.sourceTitle}`,
      attr: { style: 'color: var(--text-muted); font-size: 0.85em; margin-bottom: 6px;' },
    });
  }
  // 3) Page-type grouped chips
  if (entry.createdPages.length > 0) {
    renderPageTypeGroup(body, entry.createdPages, t.historyEntrySectionCreated, t, ctx);
  }
  if (entry.updatedPages.length > 0) {
    renderPageTypeGroup(body, entry.updatedPages, t.historyEntrySectionUpdated, t, ctx);
  }
  if (entry.createdPages.length === 0 && entry.updatedPages.length === 0) {
    body.createEl('div', {
      text: t.historyEntryNoChanges,
      attr: { style: 'color: var(--text-faint); margin-left: 8px;' },
    });
  }
}

/** Render ingest metric cards: total pages, duration, model, source size. */
export function renderIngestMetricCards(
  body: HTMLElement,
  entry: RenderedEntry,
  t: HistoryTexts,
): void {
  const grid = body.createDiv({
    attr: {
      style:
        'display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); ' +
        'gap: 6px; margin: 4px 0 8px 0;',
    },
  });
  const cards: Array<{ label: string; value: string }> = [];
  const total = entry.createdPages.length + entry.updatedPages.length;
  cards.push({ label: t.historyIngestTotal, value: String(total) });
  if (typeof entry.ingestMetrics?.durationSec === 'number') {
    cards.push({ label: t.historyKpiDuration, value: `${entry.ingestMetrics.durationSec}s` });
  }
  if (entry.ingestMetrics?.model) {
    cards.push({ label: 'model', value: entry.ingestMetrics.model });
  }
  if (typeof entry.ingestMetrics?.sourceBytes === 'number') {
    cards.push({ label: t.historyIngestSource, value: formatBytesShort(entry.ingestMetrics.sourceBytes) });
  }
  for (const c of cards) {
    const card = grid.createDiv({
      attr: {
        style:
          'padding: 6px 8px; border-radius: 4px; ' +
          'background: var(--background-primary); ' +
          'border: 1px solid var(--background-modifier-border);',
      },
    });
    card.createEl('div', {
      text: c.value,
      attr: {
        style: 'font-size: 1em; font-weight: 600; line-height: 1.2; color: var(--text-normal); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
      },
    });
    card.createEl('div', {
      text: c.label,
      attr: { style: 'font-size: 0.7em; color: var(--text-muted); margin-top: 2px;' },
    });
  }
}

export function renderPageTypeGroup(
  body: HTMLElement,
  pages: string[],
  sectionLabel: string,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  body.createEl('div', {
    text: `${sectionLabel} (${pages.length})`,
    attr: {
      style: 'font-weight: 600; margin-top: 8px; margin-bottom: 4px; font-size: 0.9em;',
    },
  });
  // Group by type.
  const byType = new Map<string, string[]>();
  for (const p of pages) {
    const type = p.startsWith('entities/') ? 'entity'
      : p.startsWith('concepts/') ? 'concept'
      : p.startsWith('sources/') ? 'source'
      : 'other';
    const list = byType.get(type);
    if (list) list.push(p); else byType.set(type, [p]);
  }
  const order = ['entity', 'concept', 'source', 'other'] as const;
  for (const type of order) {
    const list = byType.get(type);
    if (!list || list.length === 0) continue;
    const labelText =
      type === 'entity' ? t.historyPageTypeEntity
      : type === 'concept' ? t.historyPageTypeConcept
      : type === 'source' ? t.historyPageTypeSource
      : 'other';
    const row = body.createDiv({
      attr: { style: 'margin: 4px 0; display: flex; gap: 6px; align-items: flex-start;' },
    });
    row.createEl('span', {
      text: `${labelText} ×${list.length}`,
      attr: {
        style:
          'flex-shrink: 0; padding: 2px 8px; border-radius: 10px; ' +
          'background: var(--background-modifier-border); ' +
          'font-size: 0.7em; font-weight: 600; color: var(--text-muted);',
      },
    });
    const linksContainer = row.createDiv({
      attr: { style: 'display: flex; flex-wrap: wrap; gap: 4px 10px;' },
    });
    for (const page of list) {
      const displayPath = page.replace(/^(entities|concepts|sources)\//, '');
      createWikiLink(linksContainer, { path: page, text: displayPath, extraStyle: 'font-size: 0.85em;' }, ctx);
    }
  }
}
