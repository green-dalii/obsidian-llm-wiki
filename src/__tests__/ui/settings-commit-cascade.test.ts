/**
 * v1.24.1 PATCH Phase 5.5.0 hotfix fix-1: belt-and-suspenders cascade
 * at commitTempSettings time.
 *
 * Root cause (e2e 2026-07-13): the unified-model cascade was triggered
 * only by `setFieldValue('model', ...)`, but the Fetch Models button
 * (settings.ts:597 originally) and provider-change reset (line 406)
 * write `tempSettings.model` DIRECTLY, bypassing the cascade. Result:
 * per-task overrides stayed pinned to old values after Fetch Models
 * or provider change.
 *
 * Fix: at commitTempSettings time, re-run the cascade if unified model
 * is non-empty. Idempotent — already-empty fields stay empty.
 *
 * This test pins the policy at the data-flow level using a minimal
 * settings shape. The real LLMWikiSettingTab requires the full
 * Obsidian app context, so we mirror the cascade logic.
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
};

/**
 * Mirror of the production commit-time cascade guard in
 * src/ui/settings.ts:commitTempSettings. The production code calls
 * `this.cascadeUnifiedModelChange()` after checking
 * `this.tempSettings.model.trim()`. This helper replicates the
 * policy so we can test the data flow without instantiating the UI.
 */
function commitWithCascadeGuard(
  tempSettings: SettingsShape,
): { cleared: number; finalSettings: SettingsShape } {
  const clearedBefore = countNonEmptyOverrides(tempSettings);
  if (tempSettings.model.trim()) {
    const fields: Array<'ingestModel' | 'lintModel' | 'queryModel'> = [
      'ingestModel',
      'lintModel',
      'queryModel',
    ];
    for (const f of fields) {
      const current = (tempSettings as unknown as Record<string, string | undefined>)[f];
      if (current !== undefined && current !== '') {
        (tempSettings as unknown as Record<string, string | undefined>)[f] = '';
        const flag = `${f}UseCustom`;
        (tempSettings as unknown as Record<string, boolean | undefined>)[flag] = false;
      }
    }
  }
  return {
    cleared: clearedBefore - countNonEmptyOverrides(tempSettings),
    finalSettings: tempSettings,
  };
}

function countNonEmptyOverrides(s: SettingsShape): number {
  let count = 0;
  for (const f of ['ingestModel', 'lintModel', 'queryModel'] as const) {
    const v = s[f];
    if (v !== undefined && v !== '') count++;
  }
  return count;
}

describe('commitTempSettings cascade guard (Phase 5.5.0 hotfix)', () => {
  it('clears per-task overrides when unified model is set (Fetch Models auto-pick scenario)', () => {
    // This is the exact e2e bug shape: user has stale per-task overrides
    // (left over from a previous session) and then Fetch Models picks a
    // new unified model — pre-fix, the per-task values stayed pinned.
    const s: SettingsShape = {
      model: 'new-unified-model',
      ingestModel: 'old-ingest',
      lintModel: 'old-lint',
      queryModel: 'old-query',
      ingestModelUseCustom: true,
      lintModelUseCustom: true,
      queryModelUseCustom: true,
    };
    const { cleared, finalSettings } = commitWithCascadeGuard(s);
    expect(cleared).toBe(3);
    expect(finalSettings.ingestModel).toBe('');
    expect(finalSettings.lintModel).toBe('');
    expect(finalSettings.queryModel).toBe('');
    const final = finalSettings as unknown as {
      ingestModelUseCustom: boolean;
      lintModelUseCustom: boolean;
      queryModelUseCustom: boolean;
    };
    expect(final.ingestModelUseCustom).toBe(false);
    expect(final.lintModelUseCustom).toBe(false);
    expect(final.queryModelUseCustom).toBe(false);
  });

  it('does NOT clear per-task overrides when unified model is blank (safety)', () => {
    // The blank guard prevents accidental per-task wipeout when the user
    // is intentionally clearing the unified model field.
    const s: SettingsShape = {
      model: '',
      ingestModel: 'kept',
      lintModel: 'kept',
      queryModel: 'kept',
    };
    const { cleared, finalSettings } = commitWithCascadeGuard(s);
    expect(cleared).toBe(0);
    expect(finalSettings.ingestModel).toBe('kept');
    expect(finalSettings.lintModel).toBe('kept');
    expect(finalSettings.queryModel).toBe('kept');
  });

  it('treats whitespace-only unified model as blank (no cascade)', () => {
    const s: SettingsShape = {
      model: '   ',
      ingestModel: 'kept',
      queryModel: 'kept',
    };
    const { cleared, finalSettings } = commitWithCascadeGuard(s);
    expect(cleared).toBe(0);
    expect(finalSettings.ingestModel).toBe('kept');
    expect(finalSettings.queryModel).toBe('kept');
  });

  it('is a no-op when no per-task overrides are set (common case for unified-mode users)', () => {
    const s: SettingsShape = { model: 'new-unified-model' };
    const { cleared, finalSettings } = commitWithCascadeGuard(s);
    expect(cleared).toBe(0);
    expect(finalSettings.model).toBe('new-unified-model');
  });

  it('clears only the non-empty per-task overrides (partial state)', () => {
    const s: SettingsShape = {
      model: 'new',
      ingestModel: 'old-ingest',
      // lintModel undefined
      queryModel: '', // explicitly empty
    };
    const { cleared, finalSettings } = commitWithCascadeGuard(s);
    expect(cleared).toBe(1);
    expect(finalSettings.ingestModel).toBe('');
    expect(finalSettings.lintModel).toBeUndefined();
    expect(finalSettings.queryModel).toBe('');
  });

  it('preserves the unified model through the cascade (no overwrite)', () => {
    const s: SettingsShape = {
      model: 'the-unified',
      queryModel: 'stale',
    };
    const { finalSettings } = commitWithCascadeGuard(s);
    expect(finalSettings.model).toBe('the-unified');
    expect(finalSettings.queryModel).toBe('');
  });
});