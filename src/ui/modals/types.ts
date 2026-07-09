// Shared types for the modals/ directory.
//
// Pure type declarations extracted from the original `src/ui/modals.ts` so
// that callers (lint controller, settings tab, main.ts) can keep importing
// them from `./modals` (which resolves to `./modals/index.ts` after the
// split) without an extra re-organization step.

export interface LintFixCallbacks {
  onCompleteAliases?: () => void;
  onFixDeadLinks?: () => void;
  onFillEmptyPages?: () => void;
  onDeleteEmptyStubs?: () => void;
  onLinkOrphans?: () => void;
  onAnalyzeSchema?: () => void;
  onMergeDuplicates?: () => void;
  onFixAll?: () => void;
  onFixPollutedPages?: () => void;
  // Issue #85 v7: LLM-assisted retag of pages with out-of-vocabulary tags
  onRetagViolations?: () => void;
}

export interface LintCounts {
  deadLinks: number;
  emptyPages: number;
  orphans: number;
  duplicates: number;
  pagesMissingAliases: number;
  pollutedPages: number;
  // Issue #85 v7: out-of-vocabulary tag count
  tagViolations: number;
  // Issue #126: quotes not found in source files
  ungroundedQuotes: number;
}

export interface FixReportPhase {
  label: string;
  detail: string;
}