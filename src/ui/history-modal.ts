// Operation History Panel (#122) — Insight-driven info viz, not log dump.
//
// Design principle (anchored 2026-06-21 by user feedback):
//   The user could always open log.md directly. The Modal exists only if it
//   adds value beyond a flat read. Every layer must answer: what insight does
//   this convey that the raw log does not?
//
// Layered rendering:
//   1. Global insight card (top of modal) — one sentence about Wiki state
//   2. Per-entry insight line — "19 dead links ↗3 vs prev" not "Lint — ..."
//   3. Expandable detail:
//      a. 4 critical KPI cards with delta (Dead/Orphans/Duration/Pages)
//      b. Per-kind section rendering:
//         - deadLinks: table (Source → Missing)
//         - tagViolation: chip + 1-line per item
//         - orphan/empty: chip + 1-line per item
//         - llmAnalysis: type-chip grouping + severity color
//      c. For ingest: page-type grouped chips (entity/concept/source)
//   4. "Open in log.md" footer — escape hatch to raw log
//
// Pure rendering logic in renderHistoryEntries() (no DOM, no Obsidian API).
// HistoryModal wraps it with Obsidian Modal + DOM construction.

import type {
  LogEntry, KpiSummary, ReportSection, SectionItem, DetailRow, IngestMetrics,
} from '../core/log-parser';
import { TEXTS } from '../texts';

// ── Types ──────────────────────────────────────────────────────────

export type HistoryFilter = 'all' | 'ingest' | 'maintenance' | 'fix' | 'contradictions';

/** Time-range filter applied in addition to the kind filter. */
export type TimeRange = 'all' | '1d' | '3d' | '1w' | '1m' | 'custom';

export interface HistoryRenderParams {
  search: string;
  filter: HistoryFilter;
  /** Optional time-range filter; 'all' means no time bound. */
  timeRange?: TimeRange;
  /** Reference "now" (ms epoch) for time-range math. Test injection point. */
  nowMs?: number;
  /** For custom range: start date (YYYY-MM-DD, inclusive). */
  customFrom?: string;
  /** For custom range: end date (YYYY-MM-DD, inclusive). */
  customTo?: string;
}

/** Delta of a KPI vs the previous entry of the same kind (e.g. +3 dead links). */
export interface KpiDelta {
  /** Previous entry's value (undefined if no prior entry to compare). */
  prev?: number;
  /** Current value. */
  current: number;
  /** Difference = current - prev. */
  delta: number;
}

/** Single line of insight that summarizes a log entry (replaces raw op name). */
export interface EntryInsight {
  /** Short primary text, e.g. "19 dead links · 2 orphans". */
  primary: string;
  /** Optional secondary delta line, e.g. "↗ +3 vs 2026-06-17 (3d ago)". */
  delta?: string;
  /** Localized severity hint: high / medium / low (used for color tier). */
  severity: 'high' | 'medium' | 'low' | 'none';
}

/** Per-entry rendered line. */
export interface RenderedEntry {
  kind: 'ingest' | 'maintenance' | 'fix' | 'other';
  date: string;
  time?: string;
  operation: string;
  sourceTitle?: string;
  /** Computed 1-line insight (replaces raw operation name in top row). */
  insight: EntryInsight;
  createdPages: string[];
  updatedPages: string[];
  /** Ingest-specific metrics (duration, model, source size). */
  ingestMetrics?: IngestMetrics;
  /** 4 critical KPIs (always present for maintenance; partial for fix). */
  kpi?: KpiSummary;
  /** Per-KPI delta vs previous maintenance entry. */
  kpiDeltas?: {
    totalPages?: KpiDelta;
    deadLinks?: KpiDelta;
    orphans?: KpiDelta;
    durationSeconds?: KpiDelta;
  };
  /** Structured report sections (only for maintenance entries). */
  sections: ReportSection[];
  details: DetailRow[];
  rawDetails?: string;
  /** Universal emoji badge. */
  badge: string;
  /** Localized kind label (with emoji prefix). */
  kindLabel: string;
}

export interface HistoryDayGroup {
  date: string;
  entries: RenderedEntry[];
}

export type HistoryRenderResult =
  | { kind: 'empty' }
  | { kind: 'noMatch' }
  | {
      kind: 'groups';
      groups: HistoryDayGroup[];
      overflow: number;
      totalFiltered: number;
      /** Global insight derived from the most-recent maintenance entry. */
      globalInsight?: { kind: 'clean' | 'withData' | 'noData'; primary: string };
    };

// ── Texts interface ────────────────────────────────────────────────

export interface HistoryTexts {
  historyModalSubtitle: string;
  historyReadError: string;
  historyEmpty: string;
  historyEntryKindIngest: string;
  historyEntryKindMaintenance: string;
  historyEntryKindFix: string;
  historyEntryKindOther: string;
  historyEntryTime: string;
  historyEntryTimeNoTime: string;
  historyEntrySource: string;
  historyEntrySourceUnknown: string;
  historyEntryCreatedLabel: string;
  historyEntryUpdatedLabel: string;
  historyEntryCreatedCount: string;
  historyEntryUpdatedCount: string;
  historyEntryNoChanges: string;
  historyEntryContradictions: string;
  historyEntrySectionCreated: string;
  historyEntrySectionUpdated: string;
  historyEntrySectionContradictions: string;
  historyEntrySectionDetails: string;
  historyEntrySectionReport: string;
  historyEntryOpenPage: string;
  historyEntryDetailsNoContradictions: string;
  historySearchPlaceholder: string;
  historyFilterAll: string;
  historyFilterIngest: string;
  historyFilterMaintenance: string;
  historyFilterFix: string;
  historyFilterContradictions: string;
  historyRefreshButton: string;
  historyExpandDay: string;
  historyCollapseDay: string;
  historyShowMore: string;
  historyNoMatch: string;
  historyCloseButton: string;
  historyLimit: number;
  historyBadgeIngestShort: string;
  historyBadgeMaintenanceShort: string;
  historyBadgeFixShort: string;
  historyBadgeOtherShort: string;
  // KPI labels
  historyKpiPages: string;
  historyKpiDeadLinks: string;
  historyKpiOrphans: string;
  historyKpiEmpty: string;
  historyKpiDuplicates: string;
  historyKpiTagViolations: string;
  historyKpiUnsourced: string;
  historyKpiDuration: string;
  historyKpiDurationSec: string;
  // v3 — section labels
  historySectionDeadLinks: string;
  historySectionTagViolations: string;
  historySectionOrphans: string;
  historySectionEmptyPages: string;
  historySectionLlmAnalysis: string;
  historyDeadLinkSource: string;
  historyDeadLinkTarget: string;
  historyOpenInLog: string;
  historyShowMoreItems: string;
  // v3 — trend
  historyTrendUp: string;
  historyTrendDown: string;
  historyTrendSame: string;
  // v3 — LLM analysis chips
  historyChipContradiction: string;
  historyChipOutdated: string;
  historyChipMissing: string;
  historyChipStructure: string;
  // v3 — severity
  historySeverityHigh: string;
  historySeverityMedium: string;
  historySeverityLow: string;
  // v3 — page type chips (used in ingest grouping)
  historyPageTypeEntity: string;
  historyPageTypeConcept: string;
  historyPageTypeSource: string;
  // v3 — global insight
  historyGlobalInsight: string;
  historyGlobalInsightClean: string;
  historyGlobalInsightNoData: string;
  // v3.1 — modal title + subtitle w/ count + time range filter
  historyModalHeaderTitle: string;
  historyModalSubtitleWithCount: string;
  historyTimeRangeAll: string;
  historyTimeRange1d: string;
  historyTimeRange3d: string;
  historyTimeRange1w: string;
  historyTimeRange1m: string;
  historyTimeRangeCustom: string;
  historyCustomRangeFrom: string;
  historyCustomRangeTo: string;
  historyCustomRangeApply: string;
  historyCustomRangeClear: string;
  // v3.1 — ingest metric cards
  historyIngestTotal: string;
  historyIngestByType: string;
  historyIngestSource: string;
  historyIngestNoTimestamp: string;
  historyIngestFirstTime: string;
  historyIngestLatestTime: string;
}

const HISTORY_LIMIT = 50;

// ── Insight computation (pure) ────────────────────────────────────

/**
 * Build the 1-line insight for a maintenance entry. Replaces raw "Wiki 维护报告"
 * with a meaningful summary like "19 dead links · 2 orphans · 1 tag issue".
 */
function maintenanceInsight(e: LogEntry, t: HistoryTexts): EntryInsight {
  if (!e.kpi) {
    return {
      primary: e.operation,
      severity: 'none',
    };
  }
  const k = e.kpi;
  const parts: string[] = [];
  if (typeof k.deadLinks === 'number' && k.deadLinks > 0) {
    parts.push(`${k.deadLinks} ${t.historyKpiDeadLinks}`);
  }
  if (typeof k.orphans === 'number' && k.orphans > 0) {
    parts.push(`${k.orphans} ${t.historyKpiOrphans}`);
  }
  if (typeof k.emptyPages === 'number' && k.emptyPages > 0) {
    parts.push(`${k.emptyPages} ${t.historyKpiEmpty}`);
  }
  if (typeof k.tagViolations === 'number' && k.tagViolations > 0) {
    parts.push(`${k.tagViolations} ${t.historyKpiTagViolations}`);
  }
  if (typeof k.duplicates === 'number' && k.duplicates > 0) {
    parts.push(`${k.duplicates} ${t.historyKpiDuplicates}`);
  }
  // If everything is 0, surface the duration as the (positive) insight.
  if (parts.length === 0) {
    if (typeof k.durationSeconds === 'number') {
      parts.push(`✓ ${t.historyKpiDurationSec.replace('{seconds}', String(k.durationSeconds))}`);
    }
    return {
      primary: parts.join(' · ') || t.historyKpiDuration,
      severity: 'none',
    };
  }
  // Severity based on the worst present issue.
  const severity: EntryInsight['severity'] =
    (k.deadLinks && k.deadLinks > 10) ? 'high'
    : (k.deadLinks || k.tagViolations || k.emptyPages) ? 'medium'
    : 'low';
  return { primary: parts.join(' · '), severity };
}

/** Build a 1-line insight for a fix entry. */
function fixInsight(e: LogEntry, _t: HistoryTexts): EntryInsight {
  const itemCount = e.details.length;
  if (itemCount === 0) {
    return { primary: e.operation, severity: 'none' };
  }
  return {
    primary: `${itemCount} item${itemCount > 1 ? 's' : ''} fixed`,
    severity: 'low',
  };
}

/** Build a 1-line insight for an ingest entry. */
function ingestInsight(e: LogEntry, t: HistoryTexts): EntryInsight {
  const total = e.createdPages.length + e.updatedPages.length;
  const parts: string[] = [];
  if (e.createdPages.length > 0) {
    parts.push(t.historyEntryCreatedCount.replace('{count}', String(e.createdPages.length)));
  }
  if (e.updatedPages.length > 0) {
    parts.push(t.historyEntryUpdatedCount.replace('{count}', String(e.updatedPages.length)));
  }
  // Append duration when available so the user sees an insight-style line
  // ("12 created · 5 updated · 28s") without opening details.
  if (typeof e.ingestMetrics?.durationSec === 'number') {
    parts.push(`${e.ingestMetrics.durationSec}s`);
  }
  return {
    primary: parts.join(' · ') || t.historyEntryNoChanges,
    severity: total === 0 ? 'low' : 'none',
  };
}

/** Build a 1-line insight for an 'other' entry. */
function otherInsight(e: LogEntry): EntryInsight {
  return { primary: e.operation, severity: 'none' };
}

/**
 * Compute per-KPI deltas by comparing each KPI to the previous maintenance
 * entry's same KPI. The 'prev' entry must be the most-recent earlier entry
 * with the same operation kind.
 */
function computeKpiDeltas(
  entries: LogEntry[],
  currentIdx: number,
): RenderedEntry['kpiDeltas'] {
  // Find the previous maintenance entry in time order.
  let prev: LogEntry | undefined;
  for (let j = currentIdx - 1; j >= 0; j--) {
    if (entries[j].kind === 'maintenance') { prev = entries[j]; break; }
  }
  const current = entries[currentIdx];
  if (!current.kpi) return undefined;
  const mk = (key: keyof KpiSummary): KpiDelta | undefined => {
    const cur = current.kpi?.[key];
    if (typeof cur !== 'number') return undefined;
    const pv = prev?.kpi?.[key];
    return {
      current: cur,
      prev: typeof pv === 'number' ? pv : undefined,
      delta: typeof pv === 'number' ? cur - pv : 0,
    };
  };
  return {
    totalPages: mk('totalPages'),
    deadLinks: mk('deadLinks'),
    orphans: mk('orphans'),
    durationSeconds: mk('durationSeconds'),
  };
}

// ── Search / filter ────────────────────────────────────────────────

function matchesSearch(e: LogEntry, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  if (e.sourceTitle && e.sourceTitle.toLowerCase().includes(q)) return true;
  if (e.operation.toLowerCase().includes(q)) return true;
  for (const p of e.createdPages) if (p.toLowerCase().includes(q)) return true;
  for (const p of e.updatedPages) if (p.toLowerCase().includes(q)) return true;
  for (const sec of e.sections) {
    if (sec.heading.toLowerCase().includes(q)) return true;
    for (const it of sec.items) {
      if (it.text.toLowerCase().includes(q)) return true;
      if (it.raw.toLowerCase().includes(q)) return true;
    }
  }
  if (e.rawDetails && e.rawDetails.toLowerCase().includes(q)) return true;
  return false;
}

function matchesFilter(e: LogEntry, filter: HistoryFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'ingest': return e.kind === 'ingest';
    case 'maintenance': return e.kind === 'maintenance';
    case 'fix': return e.kind === 'fix';
    case 'contradictions': return e.kind === 'ingest';
  }
}

/**
 * Time-range filter: keep only entries with `date` falling within the window
 * ending at `nowMs`. 'all' is a no-op. 'custom' uses explicit from/to dates.
 */
function matchesTimeRange(e: LogEntry, range: TimeRange, nowMs: number, customFrom?: string, customTo?: string): boolean {
  if (range === 'all') return true;
  if (range === 'custom') {
    if (!customFrom && !customTo) return true;
    const entryMs = Date.parse(`${e.date}T00:00:00Z`);
    const fromMs = customFrom ? Date.parse(`${customFrom}T00:00:00Z`) : 0;
    const toMs = customTo ? Date.parse(`${customTo}T23:59:59Z`) : Infinity;
    return entryMs >= fromMs && entryMs <= toMs;
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const days = range === '1d' ? 1 : range === '3d' ? 3 : range === '1w' ? 7 : 30;
  const cutoffMs = nowMs - days * dayMs;
  const entryMs = Date.parse(`${e.date}T23:59:59Z`);
  return entryMs >= cutoffMs;
}

function badgeForKind(kind: LogEntry['kind'], t: HistoryTexts): string {
  switch (kind) {
    case 'ingest': return t.historyBadgeIngestShort;
    case 'maintenance': return t.historyBadgeMaintenanceShort;
    case 'fix': return t.historyBadgeFixShort;
    case 'other': return t.historyBadgeOtherShort;
  }
}

function kindLabelFor(kind: LogEntry['kind'], t: HistoryTexts): string {
  switch (kind) {
    case 'ingest': return t.historyEntryKindIngest;
    case 'maintenance': return t.historyEntryKindMaintenance;
    case 'fix': return t.historyEntryKindFix;
    case 'other': return t.historyEntryKindOther;
  }
}

// ── Global insight (top of modal) ──────────────────────────────────

/**
 * Compute the single-sentence global insight from the most-recent maintenance
 * entry. This is what the user sees at the very top of the modal — the
 * one-line "Wiki health" summary.
 */
function computeGlobalInsight(entries: LogEntry[], t: HistoryTexts): HistoryRenderResult extends infer R
  ? R extends { globalInsight?: infer G } ? G : never : never {
  const latestMaint = entries.find((e) => e.kind === 'maintenance' && e.kpi);
  if (!latestMaint || !latestMaint.kpi) {
    return { kind: 'noData', primary: t.historyGlobalInsightNoData } as never;
  }
  const k = latestMaint.kpi;
  const dead = typeof k.deadLinks === 'number' ? k.deadLinks : 0;
  const orphans = typeof k.orphans === 'number' ? k.orphans : 0;
  const tags = typeof k.tagViolations === 'number' ? k.tagViolations : 0;
  const dur = typeof k.durationSeconds === 'number'
    ? t.historyKpiDurationSec.replace('{seconds}', String(k.durationSeconds))
    : '—';
  if (dead === 0 && orphans === 0 && tags === 0) {
    return { kind: 'clean', primary: t.historyGlobalInsightClean } as never;
  }
  const primary = t.historyGlobalInsight
    .replace('{dead}', String(dead))
    .replace('{orphans}', String(orphans))
    .replace('{tags}', String(tags))
    .replace('{duration}', dur);
  return { kind: 'withData', primary } as never;
}

// ── Top-level pure function ────────────────────────────────────────

/**
 * Pure function: render history entries into grouped, filtered, paginated
 * result with insight-driven summary lines and per-section metadata.
 */
export function renderHistoryEntries(
  entries: LogEntry[],
  t: HistoryTexts,
  params: HistoryRenderParams,
): HistoryRenderResult {
  if (entries.length === 0) {
    return { kind: 'empty' };
  }
  const nowMs = params.nowMs ?? Date.now();
  const range = params.timeRange ?? 'all';
  const filtered = entries.filter(
    (e) => matchesFilter(e, params.filter)
      && matchesSearch(e, params.search)
      && matchesTimeRange(e, range, nowMs, params.customFrom, params.customTo),
  );
  if (filtered.length === 0) {
    return { kind: 'noMatch' };
  }
  const limit = t.historyLimit || HISTORY_LIMIT;
  const visible = filtered.slice(0, limit);
  const overflow = filtered.length - visible.length;

  // Group by date (most recent first).
  const groupMap = new Map<string, LogEntry[]>();
  for (const e of visible) {
    const list = groupMap.get(e.date);
    if (list) list.push(e); else groupMap.set(e.date, [e]);
  }
  // Compute deltas: walk entries in their original order (which is chronological
  // since log.md is appended chronologically).
  const idxByEntry = new Map(entries.map((e, i) => [e, i] as const));
  const groups: HistoryDayGroup[] = [...groupMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEntries]) => ({
      date,
      entries: dayEntries.map((e) => {
        const insight =
          e.kind === 'maintenance' ? maintenanceInsight(e, t)
          : e.kind === 'fix' ? fixInsight(e, t)
          : e.kind === 'ingest' ? ingestInsight(e, t)
          : otherInsight(e);
        return {
          kind: e.kind,
          date: e.date,
          time: e.time,
          operation: e.operation,
          sourceTitle: e.sourceTitle,
          insight,
          createdPages: e.createdPages,
          updatedPages: e.updatedPages,
          kpi: e.kpi,
          kpiDeltas: e.kind === 'maintenance'
            ? computeKpiDeltas(entries, idxByEntry.get(e) ?? 0)
            : undefined,
          sections: e.sections,
          details: e.details,
          rawDetails: e.rawDetails,
          ingestMetrics: e.ingestMetrics,
          badge: badgeForKind(e.kind, t),
          kindLabel: kindLabelFor(e.kind, t),
        };
      }),
    }));

  return {
    kind: 'groups',
    groups,
    overflow,
    totalFiltered: filtered.length,
    globalInsight: computeGlobalInsight(filtered, t),
  };
}

// ── Obsidian Modal wrapper ─────────────────────────────────────────

import { App, Modal, Component } from 'obsidian';
import { parseLogEntries } from '../core/log-parser';

/**
 * HistoryModal: Obsidian Modal that renders the operation history panel.
 *
 * Public API:
 *   new HistoryModal(app, { language, wikiFolder }).open()
 */
export class HistoryModal extends Modal {
  private language: string;
  private logPath: string;
  private renderComponent: Component | null = null;

  constructor(app: App, opts: { language: string; wikiFolder: string }) {
    super(app);
    this.language = opts.language;
    this.logPath = `${opts.wikiFolder}/log.md`;
  }

  onOpen() {
    const { contentEl } = this;
    this.renderComponent = new Component();
    this.renderComponent.load();
    void this.renderContent(contentEl);
  }

  onClose() {
    this.renderComponent?.unload();
    this.contentEl.empty();
  }

  private async renderContent(container: HTMLElement) {
    const locale = this.language in TEXTS ? this.language : 'en';
    const t: HistoryTexts = (TEXTS as Record<string, HistoryTexts>)[locale];

    // ── Header ──
    container.createEl('h2', {
      text: t.historyModalHeaderTitle,
      attr: { style: 'margin: 0 0 4px 0;' },
    });
    // Subtitle is updated after we know the entry count (render() rewrites it).
    const subtitle = container.createEl('p', {
      text: t.historyModalSubtitle,
      attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin: 0 0 12px 0;' },
    });

    // ── Read log.md ──
    let rawContent: string;
    try {
      rawContent = await this.app.vault.adapter.read(this.logPath);
    } catch {
      container.createEl('p', {
        text: t.historyReadError.replace('{error}', 'file not found'),
        attr: { style: 'color: var(--text-warning); padding: 12px;' },
      });
      container.createEl('p', {
        text: t.historyGlobalInsightNoData,
        attr: { style: 'color: var(--text-muted); text-align: center; padding: 24px 0;' },
      });
      this.renderCloseFooter(container, t);
      return;
    }
    const entries = parseLogEntries(rawContent);

    // ── State ──
    let currentSearch = '';
    let currentFilter: HistoryFilter = 'all';
    let currentRange: TimeRange = 'all';
    let customFrom: string | undefined;
    let customTo: string | undefined;

    // ── Controls ──
    const controls = container.createDiv({
      attr: { style: 'display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;' },
    });
    const searchInput = controls.createEl('input', {
      type: 'text',
      placeholder: t.historySearchPlaceholder,
      attr: { style: 'flex: 1; min-width: 200px; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });
    const filterSelect = controls.createEl('select', {
      attr: { style: 'padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });
    filterSelect.createEl('option', { value: 'all', text: t.historyFilterAll });
    filterSelect.createEl('option', { value: 'ingest', text: t.historyFilterIngest });
    filterSelect.createEl('option', { value: 'maintenance', text: t.historyFilterMaintenance });
    filterSelect.createEl('option', { value: 'fix', text: t.historyFilterFix });
    filterSelect.createEl('option', { value: 'contradictions', text: t.historyFilterContradictions });
    // ── Time-range filter (independent of kind filter) ──
    const rangeSelect = controls.createEl('select', {
      attr: { style: 'padding: 6px 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border);' },
    });
    rangeSelect.createEl('option', { value: 'all', text: t.historyTimeRangeAll });
    rangeSelect.createEl('option', { value: '1d', text: t.historyTimeRange1d });
    rangeSelect.createEl('option', { value: '3d', text: t.historyTimeRange3d });
    rangeSelect.createEl('option', { value: '1w', text: t.historyTimeRange1w });
    rangeSelect.createEl('option', { value: '1m', text: t.historyTimeRange1m });
    rangeSelect.createEl('option', { value: 'custom', text: t.historyTimeRangeCustom });
    // ── Custom range inputs (hidden by default) ──
    const customRangeContainer = controls.createDiv({
      cls: 'llm-wiki-custom-range',
    });
    customRangeContainer.createEl('span', {
      text: t.historyCustomRangeFrom,
      attr: { style: 'font-size: 0.85em; color: var(--text-muted);' },
    });
    const fromDate = customRangeContainer.createEl('input', {
      type: 'date',
      cls: 'llm-wiki-date-input',
    });
    customRangeContainer.createEl('span', {
      text: t.historyCustomRangeTo,
      attr: { style: 'font-size: 0.85em; color: var(--text-muted);' },
    });
    const toDate = customRangeContainer.createEl('input', {
      type: 'date',
      cls: 'llm-wiki-date-input',
    });
    const applyBtn = customRangeContainer.createEl('button', {
      text: t.historyCustomRangeApply,
      attr: { style: 'padding: 4px 12px; border-radius: 4px; cursor: pointer;' },
    });
    const clearBtn = customRangeContainer.createEl('button', {
      text: t.historyCustomRangeClear,
      attr: { style: 'padding: 4px 12px; border-radius: 4px; cursor: pointer;' },
    });
    // ── Refresh button ──
    const refreshBtn = controls.createEl('button', {
      text: t.historyRefreshButton,
      attr: { style: 'padding: 6px 12px; border-radius: 4px; cursor: pointer;' },
    });

    const resultsContainer = container.createDiv();

    const render = () => {
      resultsContainer.empty();
      const result = renderHistoryEntries(entries, t, {
        search: currentSearch,
        filter: currentFilter,
        timeRange: currentRange,
        customFrom,
        customTo,
      });

      // Update the subtitle to include the entry count (informs user how
      // much data is in scope before they start scrolling).
      subtitle.textContent = t.historyModalSubtitleWithCount.replace(
        '{count}', String(entries.length),
      );

      // ── Empty / noMatch ──
      if (result.kind === 'empty') {
        resultsContainer.createEl('p', {
          text: t.historyEmpty,
          attr: { style: 'color: var(--text-muted); text-align: center; padding: 24px 0;' },
        });
        return;
      }
      if (result.kind === 'noMatch') {
        resultsContainer.createEl('p', {
          text: t.historyNoMatch,
          attr: { style: 'color: var(--text-muted); text-align: center; padding: 24px 0;' },
        });
        return;
      }

      // ── Global insight card ──
      if (result.globalInsight) {
        this.renderGlobalInsight(resultsContainer, result.globalInsight, t);
      }

      // ── Day groups ──
      for (const group of result.groups) {
        const dayEl = resultsContainer.createDiv({
          attr: { style: 'margin-bottom: 16px;' },
        });
        dayEl.createEl('strong', {
          text: group.date,
          attr: { style: 'display: block; font-size: 0.9em; color: var(--text-muted); margin-bottom: 6px;' },
        });
        for (const entry of group.entries) {
          this.renderEntry(dayEl, entry, t);
        }
      }

      // ── Overflow / Show more ──
      if (result.overflow > 0) {
        const showMoreBtn = resultsContainer.createEl('button', {
          text: t.historyShowMore.replace('{count}', String(result.overflow)),
          attr: { style: 'margin-top: 8px; padding: 6px 12px; border-radius: 4px; cursor: pointer;' },
        });
        showMoreBtn.addEventListener('click', () => {
          // TODO: lazy-load expansion (out of scope for v3)
        });
      }
    };

    // ── Event wiring ──
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value.trim();
      render();
    });
    filterSelect.addEventListener('change', () => {
      currentFilter = filterSelect.value as HistoryFilter;
      render();
    });
    rangeSelect.addEventListener('change', () => {
      currentRange = rangeSelect.value as TimeRange;
      // Show/hide custom range inputs using class toggle
      if (currentRange === 'custom') {
        customRangeContainer.classList.add('llm-wiki-custom-range-visible');
      } else {
        customRangeContainer.classList.remove('llm-wiki-custom-range-visible');
      }
      render();
    });
    applyBtn.addEventListener('click', () => {
      if (fromDate.value || toDate.value) {
        customFrom = fromDate.value || undefined;
        customTo = toDate.value || undefined;
        render();
      }
    });
    clearBtn.addEventListener('click', () => {
      fromDate.value = '';
      toDate.value = '';
      customFrom = undefined;
      customTo = undefined;
      render();
    });
    refreshBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const updatedContent = await this.app.vault.adapter.read(this.logPath);
          const newEntries = parseLogEntries(updatedContent);
          entries.length = 0;
          entries.push(...newEntries);
          render();
        } catch { /* silent fail */ }
      })();
    });

    render();
    this.renderCloseFooter(container, t);
  }

  // ── Global insight card ──

  private renderGlobalInsight(
    parent: HTMLElement,
    insight: { kind: 'clean' | 'withData' | 'noData'; primary: string },
    t: HistoryTexts,
  ): void {
    const isClean = insight.kind === 'clean';
    const isNoData = insight.kind === 'noData';
    // Use a neutral background with a colored left border + accent icon.
    // Previously used --background-modifier-error-hover, which is too red and
    // dominates the visual hierarchy. Per user feedback (2026-06-21):
    // "modal 中的警示 background 太红了，可以直接不要这么红的填充，保持默认即可".
    const bg = 'var(--background-secondary)';
    const borderColor =
      isClean ? 'var(--text-success)'
      : isNoData ? 'var(--text-faint)'
      : 'var(--text-warning)';
    const icon = isClean ? '✅' : isNoData ? 'ℹ️' : '⚠️';
    parent.createDiv({
      attr: {
        style:
          `padding: 12px 14px; margin-bottom: 16px; border-radius: 6px; ` +
          `background: ${bg}; border-left: 4px solid ${borderColor}; font-size: 0.95em;`,
      },
    }).createEl('div', {
      text: `${icon}  ${insight.primary}`,
    });
    void t;
  }

  // ── Per-entry rendering ──

  private renderEntry(
    parent: HTMLElement,
    entry: RenderedEntry,
    t: HistoryTexts,
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

    // ── Row 1: badge + time + kind label + (source title for ingest) ──
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

    // ── Row 2: 1-line INSIGHT (replaces raw operation name + summary) ──
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

    // ── Row 3 (optional): delta vs previous ──
    if (entry.insight.delta) {
      entryEl.createEl('div', {
        text: entry.insight.delta,
        attr: { style: 'font-size: 0.8em; color: var(--text-faint); margin-top: 2px;' },
      });
    }

    // ── Expandable details ──
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
      this.renderMaintenanceDetails(detailsBody, entry, t);
    } else if (entry.kind === 'ingest') {
      this.renderIngestDetails(detailsBody, entry, t);
    } else if (entry.kind === 'fix') {
      this.renderFixDetails(detailsBody, entry, t);
    } else {
      // other — raw text
      detailsBody.createEl('div', {
        text: entry.rawDetails || entry.operation,
        attr: { style: 'white-space: pre-wrap; color: var(--text-muted); margin-left: 8px;' },
      });
    }

    // ── Footer: Open in log.md ──
    this.renderOpenInLogLink(detailsBody, t);
  }

  // ── Maintenance details (the rich viz layer) ──

  private renderMaintenanceDetails(
    body: HTMLElement,
    entry: RenderedEntry,
    t: HistoryTexts,
  ): void {
    // ── 4 critical KPI cards with delta ──
    if (entry.kpi) {
      this.renderCriticalKpiCards(body, entry.kpi, entry.kpiDeltas, t);
    }
    // ── Per-section rich rendering ──
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
        this.renderReportSection(body, section, t);
      }
    }
    // ── Raw fallback ──
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
  private renderCriticalKpiCards(
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
        deltaChip: this.deltaChip(deltas?.deadLinks, t),
      });
    }
    const orphans = kpi.orphans;
    if (typeof orphans === 'number') {
      cards.push({
        label: t.historyKpiOrphans,
        value: orphans,
        severity: orphans > 0 ? 'low' : 'none',
        deltaChip: this.deltaChip(deltas?.orphans, t),
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
        deltaChip: this.deltaChip(deltas?.durationSeconds, t),
      });
    }
    if (typeof kpi.totalPages === 'number') {
      cards.push({
        label: t.historyKpiPages,
        value: kpi.totalPages,
        severity: 'none',
        deltaChip: this.deltaChip(deltas?.totalPages, t),
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

  /** Build the delta chip string ('↗ +3', '↘ -1', '→ same'). Returns undefined if no previous entry. */
  private deltaChip(d: KpiDelta | undefined, t: HistoryTexts): string | undefined {
    if (!d || d.prev === undefined) return undefined;
    if (d.delta === 0) return t.historyTrendSame;
    if (d.delta > 0) return t.historyTrendUp.replace('{delta}', `+${d.delta}`);
    return t.historyTrendDown.replace('{delta}', String(d.delta));
  }

  // ── Per-section rich rendering ──

  /**
   * Dispatch on section.kind and render appropriately. This is where the
   * "信息可视化" happens — each section type gets its own visual treatment.
   */
  private renderReportSection(
    body: HTMLElement,
    section: ReportSection,
    t: HistoryTexts,
  ): void {
    switch (section.kind) {
      case 'deadLinks': this.renderDeadLinkSection(body, section, t); break;
      case 'tagViolation': this.renderTagViolationSection(body, section, t); break;
      case 'orphan': this.renderSimpleListSection(body, section, t.historySectionOrphans, t); break;
      case 'empty': this.renderSimpleListSection(body, section, t.historySectionEmptyPages, t); break;
      case 'llmAnalysis': this.renderLlmAnalysisSection(body, section, t); break;
      default: this.renderSimpleListSection(body, section, section.heading, t); break;
    }
  }

  /** Dead links rendered as a 2-column table (Source → Missing). */
  private renderDeadLinkSection(body: HTMLElement, section: ReportSection, t: HistoryTexts): void {
    const label = t.historySectionDeadLinks.replace('{count}', String(section.items.length));
    this.renderSectionTitle(body, label, 'high');
    if (section.items.length === 0) {
      body.createEl('div', {
        text: '✓',
        attr: { style: 'color: var(--text-success); margin-left: 12px;' },
      });
      return;
    }
    // Default collapsed if > 10 — insight panel principle: don't dump 19 bullets.
    const collapsed = section.items.length > 10;
    if (collapsed) {
      const details = body.createEl('details', { attr: { style: 'margin-left: 4px;' } });
      details.createEl('summary', {
        text: t.historyShowMoreItems.replace('{count}', String(section.items.length)),
        attr: { style: 'cursor: pointer; color: var(--text-accent); user-select: none;' },
      });
      const inner = details.createDiv({ attr: { style: 'margin-top: 4px;' } });
      this.renderDeadLinkTable(inner, section.items, t);
    } else {
      this.renderDeadLinkTable(body, section.items, t);
    }
  }

  private renderDeadLinkTable(body: HTMLElement, items: SectionItem[], t: HistoryTexts): void {
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
      if (item.links[0]) {
        const sourceLink = sourceCell.createEl('a', {
          text: item.links[0].path,
          href: '#',
          attr: { style: 'color: var(--text-accent); cursor: pointer; text-decoration: none;' },
        });
        sourceLink.addEventListener('click', (ev) => {
          ev.preventDefault();
          void this.app.workspace.openLinkText(item.links[0].path, this.logPath);
        });
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

  /** Tag violations rendered as a tight list with chip + warning color. */
  private renderTagViolationSection(body: HTMLElement, section: ReportSection, t: HistoryTexts): void {
    const label = t.historySectionTagViolations.replace('{count}', String(section.items.length));
    this.renderSectionTitle(body, label, 'medium');
    const list = body.createEl('ul', { attr: { style: 'margin: 0; padding-left: 20px; list-style: none;' } });
    for (const item of section.items) {
      const li = list.createEl('li', {
        attr: { style: 'margin: 2px 0; color: var(--text-warning);' },
      });
      if (item.links[0]) {
        const link = li.createEl('a', {
          text: item.links[0].path,
          href: '#',
          attr: { style: 'color: var(--text-accent); cursor: pointer; text-decoration: none;' },
        });
        link.addEventListener('click', (ev) => {
          ev.preventDefault();
          void this.app.workspace.openLinkText(item.links[0].path, this.logPath);
        });
      }
      li.appendText(' — ' + item.text);
    }
  }

  /** Orphan / empty sections: simple chip + one-line list. */
  private renderSimpleListSection(
    body: HTMLElement,
    section: ReportSection,
    labelText: string,
    t: HistoryTexts,
  ): void {
    void t;
    const finalLabel = section.heading || labelText.replace('{count}', String(section.items.length));
    this.renderSectionTitle(body, finalLabel, 'low');
    const list = body.createEl('ul', { attr: { style: 'margin: 0; padding-left: 20px; list-style: none;' } });
    for (const item of section.items) {
      const li = list.createEl('li', { attr: { style: 'margin: 2px 0;' } });
      if (item.links[0]) {
        const link = li.createEl('a', {
          text: item.links[0].path,
          href: '#',
          attr: { style: 'color: var(--text-accent); cursor: pointer; text-decoration: none;' },
        });
        link.addEventListener('click', (ev) => {
          ev.preventDefault();
          void this.app.workspace.openLinkText(item.links[0].path, this.logPath);
        });
      }
      li.appendText(' — ' + item.text);
    }
  }

  /**
   * LLM analysis: group items by type chip (矛盾/过时/缺失/结构), each in its
   * own collapsible group. This is the most info-dense section so we collapse
   * by default when >5 items.
   */
  private renderLlmAnalysisSection(body: HTMLElement, section: ReportSection, t: HistoryTexts): void {
    const label = t.historySectionLlmAnalysis.replace('{count}', String(section.items.length));
    this.renderSectionTitle(body, label, 'medium');

    // Group by llmType.
    const groups = new Map<string, SectionItem[]>();
    for (const item of section.items) {
      const key = item.llmType ?? 'other';
      const list = groups.get(key);
      if (list) list.push(item); else groups.set(key, [item]);
    }

    const chipLabel = (type: string): { label: string; color: string } => {
      if (type.includes('矛盾') || type.toLowerCase().includes('contradiction')) {
        return { label: t.historyChipContradiction, color: 'var(--text-error)' };
      }
      if (type.includes('过时') || type.toLowerCase().includes('outdated')) {
        return { label: t.historyChipOutdated, color: 'var(--text-warning)' };
      }
      if (type.includes('缺失') || type.toLowerCase().includes('missing')) {
        return { label: t.historyChipMissing, color: 'var(--text-accent)' };
      }
      if (type.includes('结构') || type.toLowerCase().includes('structure')) {
        return { label: t.historyChipStructure, color: 'var(--text-muted)' };
      }
      return { label: type, color: 'var(--text-muted)' };
    };

    const sortedTypes = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [type, items] of sortedTypes) {
      const { label: chipText, color } = chipLabel(type);
      const groupEl = body.createDiv({
        attr: { style: 'margin: 6px 0 0 0; padding-left: 4px; border-left: 2px solid ' + color + ';' },
      });
      const header = groupEl.createDiv({
        attr: { style: 'display: flex; gap: 6px; align-items: center;' },
      });
      header.createEl('span', {
        text: chipText,
        attr: {
          style:
            `font-size: 0.7em; font-weight: 600; padding: 2px 8px; ` +
            `border-radius: 10px; background: ${color}; color: var(--text-on-accent);`,
        },
      });
      header.createEl('span', {
        text: String(items.length),
        attr: { style: 'font-size: 0.85em; color: var(--text-muted);' },
      });
      // Items — collapse by default if many.
      const itemsContainer = groupEl.createDiv({ attr: { style: 'margin-top: 4px;' } });
      if (items.length > 5) {
        const det = itemsContainer.createEl('details');
        det.createEl('summary', {
          text: t.historyShowMoreItems.replace('{count}', String(items.length)),
          attr: { style: 'cursor: pointer; color: var(--text-accent); user-select: none;' },
        });
        const inner = det.createDiv({ attr: { style: 'margin-top: 4px; padding-left: 8px;' } });
        this.renderLlmItems(inner, items);
      } else {
        this.renderLlmItems(itemsContainer, items);
      }
    }
  }

  private renderLlmItems(parent: HTMLElement, items: SectionItem[]): void {
    const list = parent.createEl('ul', {
      attr: { style: 'margin: 0; padding-left: 16px; list-style: disc;' },
    });
    for (const item of items) {
      const li = list.createEl('li', {
        attr: { style: 'margin: 3px 0; color: var(--text-muted); line-height: 1.4;' },
      });
      this.renderLineWithLinks(li, item.raw);
    }
  }

  // ── Ingest details ──

  /**
   * Ingest: group Created/Updated pages by page type (entity/concept/source)
   * with count chips. This replaces 30-line flat lists with a 3-row summary.
   */
  private renderIngestDetails(body: HTMLElement, entry: RenderedEntry, t: HistoryTexts): void {
    // 1) Metric cards (duration, model, source size, total pages)
    if (entry.ingestMetrics && (
      typeof entry.ingestMetrics.durationSec === 'number'
      || entry.ingestMetrics.model
      || typeof entry.ingestMetrics.sourceBytes === 'number'
    )) {
      this.renderIngestMetricCards(body, entry, t);
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
      this.renderPageTypeGroup(body, entry.createdPages, t.historyEntrySectionCreated, t);
    }
    if (entry.updatedPages.length > 0) {
      this.renderPageTypeGroup(body, entry.updatedPages, t.historyEntrySectionUpdated, t);
    }
    if (entry.createdPages.length === 0 && entry.updatedPages.length === 0) {
      body.createEl('div', {
        text: t.historyEntryNoChanges,
        attr: { style: 'color: var(--text-faint); margin-left: 8px;' },
      });
    }
  }

  /** Render ingest metric cards: total pages, duration, model, source size. */
  private renderIngestMetricCards(body: HTMLElement, entry: RenderedEntry, t: HistoryTexts): void {
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
      cards.push({ label: t.historyIngestSource, value: this.formatBytesShort(entry.ingestMetrics.sourceBytes) });
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

  private formatBytesShort(n: number): string {
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
    return `${n}B`;
  }

  private renderPageTypeGroup(
    body: HTMLElement,
    pages: string[],
    sectionLabel: string,
    t: HistoryTexts,
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
        const link = linksContainer.createEl('a', {
          text: page.replace(/^(entities|concepts|sources)\//, ''),
          href: '#',
          attr: { style: 'color: var(--text-accent); cursor: pointer; text-decoration: none; font-size: 0.85em;' },
        });
        link.addEventListener('click', (ev) => {
          ev.preventDefault();
          void this.app.workspace.openLinkText(page, this.logPath);
        });
      }
    }
  }

  // ── Fix details ──

  private renderFixDetails(body: HTMLElement, entry: RenderedEntry, t: HistoryTexts): void {
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
    const list = body.createEl('ul', { attr: { style: 'margin: 0; padding-left: 20px; list-style: disc;' } });
    for (const row of entry.details) {
      const li = list.createEl('li', { attr: { style: 'margin: 2px 0; color: var(--text-muted);' } });
      this.renderLineWithLinks(li, row.raw);
    }
  }

  // ── Helpers ──

  private renderSectionTitle(body: HTMLElement, label: string, severity: 'high' | 'medium' | 'low' | 'none'): void {
    const color =
      severity === 'high' ? 'var(--text-error)'
      : severity === 'medium' ? 'var(--text-warning)'
      : severity === 'low' ? 'var(--text-accent)'
      : 'var(--text-muted)';
    body.createEl('div', {
      text: label,
      attr: {
        style:
          `font-weight: 600; margin-top: 10px; margin-bottom: 4px; ` +
          `color: ${color}; font-size: 0.85em;`,
      },
    });
  }

  private renderOpenInLogLink(body: HTMLElement, t: HistoryTexts): void {
    const footer = body.createDiv({
      attr: {
        style:
          'margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--background-modifier-border); ' +
          'display: flex; justify-content: flex-end;',
      },
    });
    const link = footer.createEl('a', {
      text: t.historyOpenInLog,
      href: '#',
      attr: {
        style:
          'font-size: 0.8em; color: var(--text-accent); cursor: pointer; text-decoration: none;',
      },
    });
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      void this.app.workspace.openLinkText(this.logPath, '');
    });
  }

  /** Render a raw line with `[[path]]` and `[[path|alias]]` markers replaced by clickable spans. */
  private renderLineWithLinks(parent: HTMLElement, rawLine: string): void {
    let cursor = 0;
    const re = /\[\[([^\]|#]+?)(?:#\^?[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(rawLine)) !== null) {
      if (m.index > cursor) parent.appendText(rawLine.substring(cursor, m.index));
      const path = m[1].trim();
      const alias = m[2]?.trim() ?? path;
      const link = parent.createEl('a', {
        text: alias,
        href: '#',
        attr: { style: 'color: var(--text-accent); cursor: pointer; text-decoration: none;' },
      });
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        void this.app.workspace.openLinkText(path, this.logPath);
      });
      cursor = m.index + m[0].length;
    }
    if (cursor < rawLine.length) parent.appendText(rawLine.substring(cursor));
  }

  private renderCloseFooter(container: HTMLElement, t: HistoryTexts): void {
    const footer = container.createDiv({
      attr: {
        style:
          'display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 12px; ' +
          'border-top: 1px solid var(--background-modifier-border);',
      },
    });
    const closeBtn = footer.createEl('button', {
      text: t.historyCloseButton,
      attr: { style: 'padding: 6px 16px; border-radius: 4px; cursor: pointer;' },
    });
    closeBtn.addEventListener('click', () => this.close());
  }
}
