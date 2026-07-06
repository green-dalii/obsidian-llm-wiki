// v3.1 split: maintenance details extracted from history-modal.ts
// (renderMaintenanceDetails was at 906-936, renderCriticalKpiCards at 944-1075,
//  renderReportSection at 1091-1104).
//
// This is the "rich viz" section: 4-8 KPI cards with delta chips, plus
// per-section rich rendering (deadLinks / tagViolation / orphan / empty /
// llmAnalysis). The renderer composes the per-section leaf renderers from
// sibling files (dead-link-table, tag-violation, simple-list, llm-analysis).
//
// deltaChip (per-KPI chip string) is imported from render-state — it's a
// pure function shared with no other renderer.

import type { KpiSummary, ReportSection } from '../../../core/log-parser';
import type { HistoryTexts, RenderedEntry } from '../types';
import { deltaChip } from '../render-state';
import { renderSectionTitle } from './footer';
import { renderDeadLinkSection } from './dead-link-table';
import { renderTagViolationSection } from './tag-violation';
import { renderSimpleListSection } from './simple-list';
import { renderLlmAnalysisSection } from './llm-analysis';
import type { RendererContext } from './link-helpers';

export function renderMaintenanceDetails(
  body: HTMLElement,
  entry: RenderedEntry,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  // 4 critical KPI cards with delta
  if (entry.kpi) {
    renderCriticalKpiCards(body, entry.kpi, entry.kpiDeltas, t);
  }
  // Per-section rich rendering
  if (entry.sections.length > 0) {
    body.createEl('div', {
      text: t.historyEntrySectionReport,
      attr: {
        style:
          'font-weight: 600; margin-top: 12px; margin-bottom: 6px; ' +
          'color: var(--text-normal); font-size: 0.9em;',
      },
    });
    for (const section of entry.sections) {
      renderReportSection(body, section, t, ctx);
    }
  }
  // Raw fallback
  if (!entry.kpi && entry.sections.length === 0 && entry.rawDetails) {
    body.createEl('div', {
      text: entry.rawDetails,
      attr: { style: 'white-space: pre-wrap; color: var(--text-muted); margin-left: 8px;' },
    });
  }
}

/**
 * Render the 8 KPI cards. Each card shows its delta vs the previous
 * maintenance entry in a small arrow chip. 8 cards in a 4×2 grid is
 * information-dense but still scannable — each cell is wide enough for
 * a single short label, and the user can spot outliers at a glance.
 */
export function renderCriticalKpiCards(
  body: HTMLElement,
  kpi: KpiSummary,
  deltas: RenderedEntry['kpiDeltas'],
  t: HistoryTexts,
): void {
  const grid = body.createDiv({
    attr: {
      style:
        'display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); ' +
        'gap: 6px; margin-bottom: 8px;',
    },
  });

  interface Card {
    label: string;
    value: number | string;
    severity: 'high' | 'medium' | 'low' | 'none';
    deltaChip?: string;
  }

  const cards: Card[] = [];
  const deadLinks = kpi.deadLinks;
  if (typeof deadLinks === 'number') {
    const sev: Card['severity'] = deadLinks > 10 ? 'high' : deadLinks > 0 ? 'medium' : 'none';
    cards.push({
      label: t.historyKpiDeadLinks,
      value: deadLinks,
      severity: sev,
      deltaChip: deltaChip(deltas?.deadLinks, t),
    });
  }
  const orphans = kpi.orphans;
  if (typeof orphans === 'number') {
    cards.push({
      label: t.historyKpiOrphans,
      value: orphans,
      severity: orphans > 0 ? 'low' : 'none',
      deltaChip: deltaChip(deltas?.orphans, t),
    });
  }
  const emptyPages = kpi.emptyPages;
  if (typeof emptyPages === 'number') {
    cards.push({
      label: t.historyKpiEmpty,
      value: emptyPages,
      severity: emptyPages > 0 ? 'low' : 'none',
      deltaChip: undefined,
    });
  }
  const duplicates = kpi.duplicates;
  if (typeof duplicates === 'number') {
    cards.push({
      label: t.historyKpiDuplicates,
      value: duplicates,
      severity: duplicates > 0 ? 'medium' : 'none',
      deltaChip: undefined,
    });
  }
  const tagViolations = kpi.tagViolations;
  if (typeof tagViolations === 'number') {
    cards.push({
      label: t.historyKpiTagViolations,
      value: tagViolations,
      severity: tagViolations > 0 ? 'medium' : 'none',
      deltaChip: undefined,
    });
  }
  const unsourced = kpi.unsourced;
  if (typeof unsourced === 'number') {
    cards.push({
      label: t.historyKpiUnsourced,
      value: unsourced,
      severity: unsourced > 0 ? 'low' : 'none',
      deltaChip: undefined,
    });
  }
  if (typeof kpi.durationSeconds === 'number') {
    cards.push({
      label: t.historyKpiDuration,
      value: t.historyKpiDurationSec.replace('{seconds}', String(kpi.durationSeconds)),
      severity: 'none',
      deltaChip: deltaChip(deltas?.durationSeconds, t),
    });
  }
  if (typeof kpi.totalPages === 'number') {
    cards.push({
      label: t.historyKpiPages,
      value: kpi.totalPages,
      severity: 'none',
      deltaChip: deltaChip(deltas?.totalPages, t),
    });
  }

  for (const card of cards) {
    const valueColor =
      card.severity === 'high' ? 'var(--text-error)' // red-ish
      : card.severity === 'medium' ? 'var(--text-warning)'
      : card.severity === 'low' ? 'var(--text-accent)'
      : 'var(--text-normal)';
    const cardEl = grid.createDiv({
      attr: {
        style:
          'padding: 8px 10px; border-radius: 4px; ' +
          'background: var(--background-primary); ' +
          'border: 1px solid var(--background-modifier-border); ' +
          'position: relative;',
      },
    });
    cardEl.createEl('div', {
      text: String(card.value),
      attr: {
        style:
          `font-size: 1.3em; font-weight: 700; line-height: 1.2; color: ${valueColor};`,
      },
    });
    cardEl.createEl('div', {
      text: card.label,
      attr: { style: 'font-size: 0.7em; color: var(--text-muted); margin-top: 2px;' },
    });
    if (card.deltaChip) {
      cardEl.createEl('div', {
        text: card.deltaChip,
        attr: {
          style:
            'position: absolute; top: 4px; right: 6px; font-size: 0.7em; ' +
            'font-weight: 600; color: var(--text-muted);',
        },
      });
    }
  }
}

/**
 * Dispatch on section.kind and render appropriately. This is where the
 * "信息可视化" happens — each section type gets its own visual treatment.
 */
export function renderReportSection(
  body: HTMLElement,
  section: ReportSection,
  t: HistoryTexts,
  ctx: RendererContext,
): void {
  switch (section.kind) {
    case 'deadLinks': renderDeadLinkSection(body, section, t, ctx); break;
    case 'tagViolation': renderTagViolationSection(body, section, t, ctx); break;
    case 'orphan': renderSimpleListSection(body, section, t.historySectionOrphans, t, ctx); break;
    case 'empty': renderSimpleListSection(body, section, t.historySectionEmptyPages, t, ctx); break;
    case 'llmAnalysis': renderLlmAnalysisSection(body, section, t, ctx); break;
    default: renderSimpleListSection(body, section, section.heading, t, ctx); break;
  }
}

// re-export renderSectionTitle to satisfy the renderSectionTitle usage in
// this file (it's defined in footer.ts but imported here for the dead-link
// section title etc.). Kept as a re-export so the call site imports
// everything it needs from one place.
export { renderSectionTitle };
