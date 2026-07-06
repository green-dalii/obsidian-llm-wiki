// PR #3 split: public entry point for the query-engine subsystem.
//
// Original `src/wiki/query-engine.ts` (1373 LOC) is now this directory.
// Re-exports the 3 public symbols consumed by main.ts + tests:
//   - QueryView (Obsidian ItemView, right-docked chat panel)
//   - VIEW_TYPE_QUERY (string constant for plugin.registerView)
//   - renderThinkingBlocksUI (pure DOM, tested by query-thinking-ui.test.ts)
//
// External callers (main.ts, the 2 test files) keep their existing
// `import { ... } from './wiki/query-engine'` import path; TypeScript
// resolves the directory import to this index.ts.

export { QueryView, VIEW_TYPE_QUERY } from './QueryView-class';
export { renderThinkingBlocksUI } from './renderers/thinking-block';
