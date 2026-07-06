// v3.1 split: public entry point for the history modal subsystem.
//
// The original `src/ui/history-modal.ts` is now a directory with
//   - types.ts: type declarations
//   - render-state.ts: pure data helpers + top-level renderHistoryEntries
//   - renderers/: pure DOM renderers (12 modules + index)
//   - HistoryModal-class.ts: thin Obsidian Modal wrapper that delegates
//     visual layer to the renderer modules
//
// Callers (main.ts, settings.ts) still import `HistoryModal` from
// './ui/history-modal' — TypeScript resolves the directory import to this
// file.

export { HistoryModal } from './HistoryModal-class';
export { renderHistoryEntries } from './render-state';
export type {
  LogEntry, KpiSummary, ReportSection, SectionItem, DetailRow, IngestMetrics,
  HistoryFilter, TimeRange, HistoryRenderParams, KpiDelta, EntryInsight,
  RenderedEntry, HistoryDayGroup, HistoryRenderResult, HistoryTexts,
} from './types';
