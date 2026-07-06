// v3.1 split: per-entry rendering extracted from history-modal.ts
// (renderEntry was at 807-902).
//
// The per-entry card: row 1 (badge + time + kind label + source title),
// row 2 (1-line insight), row 3 (delta), expandable details (dispatch by
// kind to maintenance / ingest / fix / other).

import type { HistoryTexts, RenderedEntry } from '../types';
import { renderMaintenanceDetails } from './maintenance-details';
import { renderIngestDetails } from './ingest-details';
import { renderFixDetails } from './fix-details';
import { renderOpenInLogLink } from './link-helpers';
import type { RendererContext } from './link-helpers';

export function renderEntry(
  parent: HTMLElement,
  entry: RenderedEntry,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  // Border color per kind for visual scanability.
  const borderColor =
    entry.kind === 'ingest' ? 'var(--text-accent)'
    : entry.kind === 'maintenance' ? 'var(--text-warning)'
    : entry.kind === 'fix' ? 'var(--text-success)'
    : 'var(--text-faint)';
  const entryEl = parent.createDiv({
    attr: {
      style:
        `padding: 8px 12px; border-left: 3px solid ${borderColor}; ` +
        'margin-bottom: 6px; border-radius: 0 4px 4px 0; ' +
        'background: var(--background-secondary);',
    },
  });

  // Row 1: badge + time + kind label + (source title for ingest)
  const row1 = entryEl.createDiv({
    attr: { style: 'display: flex; gap: 8px; align-items: baseline; margin-bottom: 2px;' },
  });
  row1.createEl('span', {
    text: entry.badge,
    attr: { style: 'font-size: 1em;' },
  });
  row1.createEl('span', {
    text: entry.kindLabel,
    attr: { style: 'font-size: 0.75em; color: var(--text-muted); font-weight: 500;' },
  });
  if (entry.time) {
    row1.createEl('span', {
      text: entry.time,
      attr: { style: 'color: var(--text-muted); font-size: 0.8em;' },
    });
  }
  if (entry.kind === 'ingest' && entry.sourceTitle) {
    row1.createEl('span', {
      text: entry.sourceTitle,
      attr: { style: 'font-weight: 500;' },
    });
  }

  // Row 2: 1-line INSIGHT (replaces raw operation name + summary)
  const insightColor =
    entry.insight.severity === 'high' ? 'var(--text-warning)'
    : entry.insight.severity === 'medium' ? 'var(--text-normal)'
    : 'var(--text-muted)';
  entryEl.createEl('div', {
    text: entry.insight.primary,
    attr: {
      style:
        `font-size: 0.95em; color: ${insightColor}; ` +
        (entry.insight.severity === 'high' ? 'font-weight: 600;' : ''),
    },
  });

  // Row 3 (optional): delta vs previous
  if (entry.insight.delta) {
    entryEl.createEl('div', {
      text: entry.insight.delta,
      attr: { style: 'font-size: 0.8em; color: var(--text-faint); margin-top: 2px;' },
    });
  }

  // Expandable details
  const detailsEl = entryEl.createEl('details', {
    attr: { style: 'margin-top: 6px;' },
  });
  detailsEl.createEl('summary', {
    text: t.historyEntrySectionDetails,
    attr: { style: 'cursor: pointer; font-size: 0.8em; color: var(--text-faint); user-select: none;' },
  });
  const detailsBody = detailsEl.createDiv({
    attr: { style: 'padding: 8px 0 0 0; font-size: 0.85em;' },
  });

  if (entry.kind === 'maintenance') {
    renderMaintenanceDetails(detailsBody, entry, t, ctx);
  } else if (entry.kind === 'ingest') {
    renderIngestDetails(detailsBody, entry, t, ctx);
  } else if (entry.kind === 'fix') {
    renderFixDetails(detailsBody, entry, t, ctx);
  } else {
    // other — raw text
    detailsBody.createEl('div', {
      text: entry.rawDetails || entry.operation,
      attr: { style: 'white-space: pre-wrap; color: var(--text-muted); margin-left: 8px;' },
    });
  }

  // Footer: Open in log.md
  renderOpenInLogLink(detailsBody, t, ctx);
}
