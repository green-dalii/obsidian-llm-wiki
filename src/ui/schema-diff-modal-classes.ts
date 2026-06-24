// v1.22.1: Pure helper functions for the SchemaDiffModal class lifecycle.
// Lives in its own file (no `obsidian` dep) so tests can import without
// triggering Vite's import-analysis failure on the real Modal class.
//
// The CSS selector `.modal.llm-wiki-schema-diff-modal` sizes the outer
// container; the inner class drives content-level styles
// (`min-width: 720px`). Replaces the previous CSS `:has()` selector
// (Obsidian review warning: `:has()` causes broad selector
// invalidation → significant perf cost when content changes).

export const DIFF_MODAL_CLASS = 'llm-wiki-schema-diff-modal';

export interface DiffModalLike {
  addClass: (cls: string) => void;
  removeClass: (cls: string) => void;
  empty: () => void;
}

/** Apply the modal-wide class to BOTH outer `.modal` and inner content. */
export function applyDiffModalClasses(
  modalEl: DiffModalLike,
  contentEl: DiffModalLike,
): void {
  modalEl.addClass(DIFF_MODAL_CLASS);
  contentEl.empty();
  contentEl.addClass(DIFF_MODAL_CLASS);
}

/** Remove the outer modal class on close so it doesn't leak to the next modal. */
export function removeDiffModalClasses(modalEl: DiffModalLike): void {
  modalEl.removeClass(DIFF_MODAL_CLASS);
}

/**
 * v1.22.0 #97: When the LLM reports `changes_needed=false`, the Modal
 * should show the *current* schema in BOTH panes (left and right) so
 * the user can read the schema as it stands today alongside the LLM's
 * rationale. A blank right pane is confusing because the eye has
 * nothing to anchor on.
 *
 * Implementation: the Modal constructor (or main.ts) normalizes empty-mode
 * `newBody` to `currentBody` BEFORE lineDiff runs, so the resulting diff
 * is all "eq" rows. Exported for unit testing in isolation.
 */
export function normalizeEmptyMode(opts: {
  isEmpty: boolean;
  currentBody: string;
  newBody: string;
}): string {
  return opts.isEmpty ? opts.currentBody : opts.newBody;
}