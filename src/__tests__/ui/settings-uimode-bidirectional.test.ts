/**
 * v1.24.1 PATCH Phase 5.5.0 hotfix: bidirectional sync between
 * unified ↔ per-task model modes + LLM-stale marker.
 *
 * Rules per user direction (2026-07-13):
 *   1. per-task → unified: cascade-clear all 3 per-task overrides
 *      so every task falls back to the unified model.
 *   2. unified → per-task: prefill all 3 per-task fields with the
 *      current unified model so the user has consistent starting
 *      state and can edit from there.
 *   3. Any model-field or provider change: set llmReady=false so
 *      the user is prompted to re-run Test Connection before the
 *      next LLM call (prevents stale-client bug).
 *
 * These tests pin the policy at the data-flow level. The real
 * LLMWikiSettingTab requires the full Obsidian app context, so we
 * mirror the logic here for testability.
 */
import { describe, it, expect } from 'vitest';

type SettingsShape = {
  model: string;
  ingestModel?: string;
  lintModel?: string;
  queryModel?: string;
  ingestModelUseCustom?: boolean;
  lintModelUseCustom?: boolean;
  queryModelUseCustom?: boolean;
  llmReady?: boolean;
  availableModels?: string[];
};

function cascadeUnifiedModelChange(s: SettingsShape): { cleared: number } {
  // Mirror the production guard: only cascade when unified model is
  // non-blank. If the unified model is empty, the user is in the
  // middle of clearing the field — don't wipe their per-task overrides.
  if (!s.model.trim()) return { cleared: 0 };
  const fields: Array<'ingestModel' | 'lintModel' | 'queryModel'> = [
    'ingestModel', 'lintModel', 'queryModel',
  ];
  let cleared = 0;
  for (const f of fields) {
    const current = (s as unknown as Record<string, string | undefined>)[f];
    if (current !== undefined && current !== '') {
      (s as unknown as Record<string, string | undefined>)[f] = '';
      const flag = `${f}UseCustom`;
      (s as unknown as Record<string, boolean | undefined>)[flag] = false;
      cleared++;
    }
  }
  return { cleared };
}

function prefillPerTaskFromUnified(s: SettingsShape): void {
  const unified = s.model.trim();
  const fields: Array<'ingestModel' | 'lintModel' | 'queryModel'> = [
    'ingestModel', 'lintModel', 'queryModel',
  ];
  for (const f of fields) {
    (s as unknown as Record<string, string | undefined>)[f] = unified;
    const flag = `${f}UseCustom`;
    (s as unknown as Record<string, boolean | undefined>)[flag] = false;
  }
}

function markLLMConfigStale(s: SettingsShape): void {
  // v1.24.1 PATCH Phase 5.5.0 fix-2: do NOT clear availableModels.
  // Doing so regresses the dropdown ↔ text-input switcher to text-
  // input only (shouldRenderModelDropdown requires the list to be
  // non-empty). The fetched list is per-provider, but stays valid
  // for the same provider even after a model edit. Re-fetching on
  // every model change is needless network traffic.
  s.llmReady = false;
}

describe('uiMode switch: per-task → unified (Rule 1)', () => {
  it('clears all 3 per-task overrides', () => {
    const s: SettingsShape = {
      model: 'unified-model',
      ingestModel: 'old-ingest',
      lintModel: 'old-lint',
      queryModel: 'old-query',
    };
    const { cleared } = cascadeUnifiedModelChange(s);
    expect(cleared).toBe(3);
    expect(s.ingestModel).toBe('');
    expect(s.lintModel).toBe('');
    expect(s.queryModel).toBe('');
  });

  it('preserves the unified model itself (no overwrite)', () => {
    const s: SettingsShape = {
      model: 'unified-model',
      queryModel: 'old-query',
    };
    cascadeUnifiedModelChange(s);
    expect(s.model).toBe('unified-model');
  });

  it('does NOT cascade when unified model is blank', () => {
    const s: SettingsShape = {
      model: '',
      ingestModel: 'kept',
      queryModel: 'kept',
    };
    const { cleared } = cascadeUnifiedModelChange(s);
    expect(cleared).toBe(0);
    expect(s.ingestModel).toBe('kept');
    expect(s.queryModel).toBe('kept');
  });

  it('resets all 3 *UseCustom flags to false', () => {
    const s: SettingsShape = {
      model: 'unified',
      ingestModel: 'old',
      lintModel: 'old',
      queryModel: 'old',
      ingestModelUseCustom: true,
      lintModelUseCustom: true,
      queryModelUseCustom: true,
    };
    cascadeUnifiedModelChange(s);
    const final = s as unknown as {
      ingestModelUseCustom: boolean;
      lintModelUseCustom: boolean;
      queryModelUseCustom: boolean;
    };
    expect(final.ingestModelUseCustom).toBe(false);
    expect(final.lintModelUseCustom).toBe(false);
    expect(final.queryModelUseCustom).toBe(false);
  });

  it('handles the e2e bug shape: per-task stale values + unified = v4-flash', () => {
    // The exact e2e 2026-07-13 scenario: user had queryModel='v4-pro'
    // from a previous session, switched to unified mode, set model=v4-flash.
    // Pre-fix: queryModel stayed 'v4-pro', query used old model.
    // Post-fix: cascade clears queryModel → resolver falls back to v4-flash.
    const s: SettingsShape = {
      model: 'v4-flash',
      ingestModel: 'v4-pro',
      lintModel: 'v4-pro',
      queryModel: 'v4-pro',
    };
    cascadeUnifiedModelChange(s);
    // Simulate resolver (perTask?.trim() || settings.model):
    const resolvedQuery = (s.queryModel?.trim() || s.model);
    expect(resolvedQuery).toBe('v4-flash');
  });
});

describe('uiMode switch: unified → per-task (Rule 2)', () => {
  it('prefills all 3 per-task fields with the unified model', () => {
    const s: SettingsShape = { model: 'v4-flash' };
    prefillPerTaskFromUnified(s);
    expect(s.ingestModel).toBe('v4-flash');
    expect(s.lintModel).toBe('v4-flash');
    expect(s.queryModel).toBe('v4-flash');
  });

  it('overwrites stale per-task overrides so all 3 tasks start in sync', () => {
    const s: SettingsShape = {
      model: 'unified-model',
      ingestModel: 'old-ingest',
      lintModel: 'old-lint',
      queryModel: 'old-query',
    };
    prefillPerTaskFromUnified(s);
    expect(s.ingestModel).toBe('unified-model');
    expect(s.lintModel).toBe('unified-model');
    expect(s.queryModel).toBe('unified-model');
  });

  it('treats whitespace-only unified model as empty (all 3 per-task = "")', () => {
    const s: SettingsShape = { model: '   ' };
    prefillPerTaskFromUnified(s);
    expect(s.ingestModel).toBe('');
    expect(s.lintModel).toBe('');
    expect(s.queryModel).toBe('');
  });

  it('resets all 3 *UseCustom flags so dropdown re-anchors on the unified value', () => {
    const s: SettingsShape & {
      ingestModelUseCustom: boolean;
      lintModelUseCustom: boolean;
      queryModelUseCustom: boolean;
    } = {
      model: 'unified',
      ingestModelUseCustom: true,
      lintModelUseCustom: true,
      queryModelUseCustom: true,
    };
    prefillPerTaskFromUnified(s);
    const final = s as unknown as {
      ingestModelUseCustom: boolean;
      lintModelUseCustom: boolean;
      queryModelUseCustom: boolean;
    };
    expect(final.ingestModelUseCustom).toBe(false);
    expect(final.lintModelUseCustom).toBe(false);
    expect(final.queryModelUseCustom).toBe(false);
  });

  it('is idempotent: prefill twice yields the same state', () => {
    const s: SettingsShape = { model: 'unified' };
    prefillPerTaskFromUnified(s);
    prefillPerTaskFromUnified(s);
    expect(s.ingestModel).toBe('unified');
    expect(s.lintModel).toBe('unified');
    expect(s.queryModel).toBe('unified');
  });
});

describe('markLLMConfigStale (Rule 3)', () => {
  it('sets llmReady=false on unified model change', () => {
    const s: SettingsShape = { model: 'old', llmReady: true, availableModels: ['a', 'b'] };
    markLLMConfigStale(s);
    expect(s.llmReady).toBe(false);
  });

  it('does NOT clear availableModels (preserves dropdown ↔ input switcher)', () => {
    // Regression net for v1.24.1 PATCH Phase 5.5.0 fix-2: a previous
    // version cleared availableModels here, which made
    // `shouldRenderModelDropdown` return false for every field, so
    // ALL model fields dropped to text-input only. The user lost
    // the ability to switch between dropdown ↔ free-form text.
    const s: SettingsShape = { model: 'old', availableModels: ['a', 'b', 'c'] };
    markLLMConfigStale(s);
    expect(s.availableModels).toEqual(['a', 'b', 'c']);
  });

  it('runs on unified→per-task switch so user must re-test', () => {
    // The combined operation: mode switch + prefill both mark stale.
    const s: SettingsShape = {
      model: 'v4-flash',
      llmReady: true,
      availableModels: ['v4-pro', 'v4-flash'],
    };
    prefillPerTaskFromUnified(s);
    markLLMConfigStale(s);
    expect(s.llmReady).toBe(false);
    // Prefill still happened.
    expect(s.queryModel).toBe('v4-flash');
    // availableModels preserved (dropdown still works).
    expect(s.availableModels).toEqual(['v4-pro', 'v4-flash']);
  });

  it('runs on per-task→unified switch so user must re-test', () => {
    const s: SettingsShape = {
      model: 'v4-flash',
      queryModel: 'old',
      llmReady: true,
      availableModels: ['v4-pro', 'v4-flash'],
    };
    cascadeUnifiedModelChange(s);
    markLLMConfigStale(s);
    expect(s.llmReady).toBe(false);
    // Cascade still happened.
    expect(s.queryModel).toBe('');
    // availableModels preserved.
    expect(s.availableModels).toEqual(['v4-pro', 'v4-flash']);
  });
});