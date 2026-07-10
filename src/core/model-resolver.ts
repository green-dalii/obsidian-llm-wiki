// v1.24.0 #208: per-task model resolution.
//
// Single point of truth for "which model should this LLM call use?".
// Used by all 27 LLM call sites that previously read `settings.model`
// directly. Encapsulates the fallback chain
//   perTaskModel?.trim() || settings.model
// so the call sites stay in sync and the UI never has to reason about
// fallback chains on its own.
//
// Backward-compat invariant: when no per-task fields are set (the
// default for pre-v1.24.0 data.json, where these fields are absent),
// every task resolves to `settings.model` — bit-identical to pre-#208
// behavior. Pin in src/__tests__/core/model-resolver.test.ts.

import type { LLMWikiSettings } from '../types';

/**
 * LLM task category for #208 per-task model resolution.
 *
 * - `ingest`: extract / summarize / create / merge (all content-generation
 *   and schema-side work).
 * - `lint`:   analysis / dedup / fix-* / link-orphan / merge-duplicates /
 *   contradictions (all `src/wiki/lint/` plus `contradictions.ts`).
 * - `query`:  Query Wiki chat (3 QueryView send sites) + save-to-wiki
 *   evaluation.
 *
 * `main.ts` Test Connection is intentionally NOT in this enum — it must
 * use `settings.model` directly (the probe verifies the user's currently
 * selected unified model, regardless of which per-task overrides apply).
 */
export type LLMTask = 'ingest' | 'lint' | 'query';

/**
 * Minimal settings shape required by the resolver. Accepts any object
 * with `model` plus the 3 per-task override fields — callers that only
 * carry a subset (e.g. `SeedSelectorSettings`) still type-check.
 *
 * `Pick<LLMWikiSettings, ...>` is the canonical shape; structural
 * compatibility lets partial settings satisfy the contract.
 */
export type ModelResolverSettings = Pick<
  LLMWikiSettings,
  'model' | 'ingestModel' | 'lintModel' | 'queryModel'
>;

/**
 * Resolve the model string for a given LLM task.
 *
 * Fallback chain per task:
 *   `<task>Model` (with whitespace trimmed) → `settings.model`
 *
 * Empty string and whitespace-only per-task values are treated as
 * "use unified model" and fall through to `settings.model` — this
 * matches the UI convention where '' is the user-facing "use default"
 * choice in the dropdown.
 *
 * Pure function. No IO. Safe to call inline at every LLM call site.
 */
export function resolveModelForTask(
  settings: ModelResolverSettings,
  task: LLMTask,
): string {
  switch (task) {
    case 'ingest':
      return settings.ingestModel?.trim() || settings.model;
    case 'lint':
      return settings.lintModel?.trim() || settings.model;
    case 'query':
      return settings.queryModel?.trim() || settings.model;
  }
}