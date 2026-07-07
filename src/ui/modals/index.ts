// Public entry point for the modals/ directory (replaces the old
// `src/ui/modals.ts` god file).
//
// Re-exports the 7 modal classes + 3 shared types originally declared
// in the monolith. External callers (`main.ts`, `settings.ts`,
// `lint/controller.ts`) keep importing from `./modals` / `../../ui/modals`
// and TypeScript's directory import resolution automatically picks up
// this `index.ts` — zero caller changes needed.

export { FileSuggestModal, FolderSuggestModal } from './suggest-modals';
export { ConfirmModal } from './ConfirmModal-class';
export { LintReportModal } from './LintReportModal-class';
export { IngestReportModal } from './IngestReportModal-class';
export { FixReportModal } from './FixReportModal-class';
export { MultiFileSuggestModal } from './MultiFileSuggestModal-class';

export type { LintFixCallbacks, LintCounts, FixReportPhase } from './types';