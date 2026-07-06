// v3.1 split: types extracted from history-modal.ts (was lines 29-223).
//
// All type declarations that were previously inlined in history-modal.ts now
// live here. They are pure type-level (no runtime impact), so existing tests
// continue to pass without modification.
//
// HistoryTexts is a structural sub-shape of TEXTS[lang] — the TEXTS runtime
// object has more keys, but only these are consumed by history-modal.
// Importing the keys via this interface keeps the i18n contract explicit.

import type {
  KpiSummary, ReportSection, DetailRow, IngestMetrics,
} from '../../core/log-parser';

// Re-export the upstream types so existing consumers that imported them
// from history-modal.ts keep working. Callers like main.ts and settings.ts
// only consume the `HistoryModal` class, so this re-export is defensive.
export type {
  LogEntry, KpiSummary, ReportSection, SectionItem, DetailRow, IngestMetrics,
} from '../../core/log-parser';

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

/** Shared i18n text surface used by every history-modal renderer. */
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
