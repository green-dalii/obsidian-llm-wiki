// v1.24.0 #208: UI helpers for the per-task model picker.
//
// Extracted from src/ui/settings.ts so the conditional rendering logic
// can be unit-tested without rendering the full PluginSettingTab (which
// depends on Obsidian App + Plugin + Setting class — heavy module graph).
//
// Pure functions only. No DOM, no IO, no Obsidian imports.

import type { LLMWikiSettings } from '../types';

// ───────────────────────────────────────────────────────────────────
// UI mode: unified vs per-task
// ───────────────────────────────────────────────────────────────────

/**
 * Whether the per-task model picker is currently visible.
 *
 * `false` (default) → "use unified model" — only the existing single
 * model dropdown shows. Pre-v1.24.0 data.json without `usePerTaskModels`
 * is treated as `false` (fallback to unified model).
 *
 * `true` → 3 per-task pickers render (ingest / lint / query), with
 * the original model dropdown re-labeled as "Ingest model" and
 * pre-filled with the previous unified value.
 */
export type ModelTaskUiMode = 'unified' | 'per-task';

export function resolveModelTaskUiMode(settings: LLMWikiSettings): ModelTaskUiMode {
  return settings.usePerTaskModels === true ? 'per-task' : 'unified';
}

/**
 * Build the displayed model name for a per-task field, given the
 * current `usePerTaskModels` toggle.
 *
 * - In unified mode: returns `settings.model` (one value, shown once).
 * - In per-task mode: returns the per-task override if non-empty,
 *   otherwise falls back to `settings.model` (UI pre-fill behavior —
 *   "make ingest the new default unless user picks something else").
 *
 * `undefined` per-task values are coerced to `settings.model` so the
 * UI dropdown always has a valid selection.
 */
export function resolveDisplayedModelForTask(
  settings: LLMWikiSettings,
  task: 'ingest' | 'lint' | 'query',
): string {
  const uiMode = resolveModelTaskUiMode(settings);
  if (uiMode === 'unified') return settings.model;
  const override = task === 'ingest' ? settings.ingestModel
    : task === 'lint' ? settings.lintModel
    : settings.queryModel;
  return override?.trim() || settings.model;
}

/**
 * Normalize per-task model values on toggle transitions.
 *
 * Policy: hidden per-task values are PRESERVED, not cleared. When the
 * user toggles `usePerTaskModels` from `true` back to `false`, the
 * ingest/lint/query strings stay in data.json (re-surfacing on the
 * next toggle-on). This is what the user requested (don't lose their
 * previously picked values).
 *
 * Returns the same object reference if no normalization is needed
 * (no mutation). Otherwise returns a new object with empty-string
 * per-task fields preserved verbatim — this function intentionally
 * performs NO mutation, so callers can use it as a "did the user
 * touch anything?" check.
 */
export function normalizePerTaskModelsOnToggle<T extends LLMWikiSettings>(
  settings: T,
  nextMode: ModelTaskUiMode,
): T {
  if (nextMode === 'per-task') return settings; // no-op
  // Going back to unified — keep ingestModel/lintModel/queryModel as-is.
  // This is a pure no-op for now; the function exists to pin the
  // "preserve hidden values" policy in tests. If a future policy change
  // ever clears the values, this is the one place to update.
  return settings;
}

// ───────────────────────────────────────────────────────────────────
// Per-field dropdown vs text-input rendering
// ───────────────────────────────────────────────────────────────────

/**
 * Names of settings fields that hold a model string. Used to coordinate
 * the unified "useCustomModel" toggle vs the per-task pickers' own
 * dropdown↔input state without stomping on each other.
 *
 * Convention: the UNIFIED field uses `useCustomModel` (existing v1.19
 * pattern). Each per-task field tracks its own custom-state via a
 * sibling field (`ingestModelUseCustom`, etc.) — so per-task pickers
 * can independently switch to text input without affecting the unified
 * picker or each other.
 */
export type ModelFieldKey = 'model' | 'ingestModel' | 'lintModel' | 'queryModel';

/**
 * Decide whether to render a dropdown (vs a free-form text input) for
 * a model field, given the current available-models list.
 *
 * Rules:
 * - No fetched list → must be text input.
 * - Fetched list available AND the field's `*UseCustom` flag is unset
 *   or false → dropdown.
 * - `*UseCustom` flag set → text input (user wants to type a model ID
 *   not in the fetched list).
 *
 * The unified field reads `useCustomModel`; per-task fields read
 * `ingestModelUseCustom` / `lintModelUseCustom` / `queryModelUseCustom`.
 *
 * This helper is pure — no Obsidian imports — so the policy is
 * testable in isolation.
 */
export function shouldRenderModelDropdown(
  settings: LLMWikiSettings,
  field: ModelFieldKey,
): boolean {
  const hasFetched = (settings.availableModels?.length ?? 0) > 0;
  if (!hasFetched) return false;
  const useCustomFlag = field === 'model'
    ? settings.useCustomModel
    : (settings as unknown as Record<string, boolean | undefined>)[`${field}UseCustom`];
  return useCustomFlag !== true;
}