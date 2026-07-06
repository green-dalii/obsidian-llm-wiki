// v3.1 split: pure rendering state extracted from history-modal.ts
// (was lines 227-523 — 8 helpers + renderHistoryEntries top-level pure function).
//
// All functions in this file are pure (no DOM, no Obsidian API). The only
// inputs are: LogEntry[], HistoryTexts, HistoryRenderParams, and a few indices.
// This file is consumed by:
//   - HistoryModal-class.ts (calls renderHistoryEntries)
//   - unit tests in __tests__/ui/history-modal.test.ts (already passing)
//
// Behavior MUST be identical to the original inline implementation in
// history-modal.ts:renderHistoryEntries (lines 452-523). Any change here is a
// behavior regression unless explicitly called out in a release commit.

import type { LogEntry, KpiSummary } from '../../core/log-parser';
import type {
  EntryInsight, HistoryDayGroup, HistoryFilter, HistoryRenderParams,
  HistoryRenderResult, HistoryTexts, KpiDelta, RenderedEntry, TimeRange,
} from './types';

const HISTORY_LIMIT = 50;

/**
 * Build the delta chip string ('↗ +3', '↘ -1', '→ same'). Returns undefined
 * if there is no previous entry to compare against.
 *
 * Pure function — used by renderCriticalKpiCards to compose the per-KPI chip.
 */
export function deltaChip(d: KpiDelta | undefined, t: HistoryTexts): string | undefined {
  if (!d || d.prev === undefined) return undefined;
  if (d.delta === 0) return t.historyTrendSame;
  if (d.delta > 0) return t.historyTrendUp.replace('{delta}', `+${d.delta}`);
  return t.historyTrendDown.replace('{delta}', String(d.delta));
}

/**
 * Format a byte count as a short human-readable string (e.g. "1.2MB", "456KB",
 * "789B"). Pure function — used by renderIngestMetricCards.
 */
export function formatBytesShort(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}

// ── Insight computation (pure) ────────────────────────────────────

/**
 * Build the 1-line insight for a maintenance entry. Replaces raw "Wiki 维护报告"
 * with a meaningful summary like "19 dead links · 2 orphans · 1 tag issue".
 */
export function maintenanceInsight(e: LogEntry, t: HistoryTexts): EntryInsight {
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
export function fixInsight(e: LogEntry, _t: HistoryTexts): EntryInsight {
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
export function ingestInsight(e: LogEntry, t: HistoryTexts): EntryInsight {
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
export function otherInsight(e: LogEntry): EntryInsight {
  return { primary: e.operation, severity: 'none' };
}

/**
 * Compute per-KPI deltas by comparing each KPI to the previous maintenance
 * entry's same KPI. The 'prev' entry must be the most-recent earlier entry
 * with the same operation kind.
 */
export function computeKpiDeltas(
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

export function matchesSearch(e: LogEntry, search: string): boolean {
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

export function matchesFilter(e: LogEntry, filter: HistoryFilter): boolean {
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
export function matchesTimeRange(
  e: LogEntry, range: TimeRange, nowMs: number,
  customFrom?: string, customTo?: string,
): boolean {
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

export function badgeForKind(kind: LogEntry['kind'], t: HistoryTexts): string {
  switch (kind) {
    case 'ingest': return t.historyBadgeIngestShort;
    case 'maintenance': return t.historyBadgeMaintenanceShort;
    case 'fix': return t.historyBadgeFixShort;
    case 'other': return t.historyBadgeOtherShort;
  }
}

export function kindLabelFor(kind: LogEntry['kind'], t: HistoryTexts): string {
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
export function computeGlobalInsight(
  entries: LogEntry[], t: HistoryTexts,
): HistoryRenderResult extends infer R
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
