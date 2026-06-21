// Structured renderer helpers for HistoryModal details (#122).
//
// The lint details field of a log entry is **multi-line Markdown** that the
// modal renders as structured rows (clickable wiki links + summary text).
// All parsing logic lives in core/log-parser.ts; this module only re-exports
// the parser-side types and provides parseContradictionRows() for ingesting
// the per-line contradiction text inside an ingest entry.
//
// Pure functions only. No Obsidian API. Fully testable.

import { extractWikiLinks, stripWikiLinks as _stripWikiLinks } from './log-parser';

export type { DetailLink, KpiSummary, ReportSection, OperationKind } from './log-parser';
export { parseDetailRows, extractWikiLinks } from './log-parser';
// Note: DetailRow is intentionally re-exported via log-parser — no re-export here.

interface ContradictionRow {
  /** Line text with `[[path]]` markers removed. */
  text: string;
  /** Wiki link targets found in the line. */
  links: ReturnType<typeof extractWikiLinks>;
}

/**
 * Parse the contradiction body (one line = one contradiction). Each non-empty
 * line has its wiki links extracted so the renderer can make them clickable.
 */
export function parseContradictionRows(contradictions: string[]): ContradictionRow[] {
  return contradictions
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .map((c) => ({ text: _stripWikiLinks(c).trim(), links: extractWikiLinks(c) }));
}
