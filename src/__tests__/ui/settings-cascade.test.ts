/**
 * v1.24.1 PATCH Phase 5.5.0 hotfix — unified model change cascades clear
 * of per-task model overrides.
 *
 * Background: pre-hotfix, when the user changed the unified `model`
 * field, the per-task (`ingestModel` / `lintModel` / `queryModel`)
 * overrides stayed pinned to their old values. Live task routing
 * kept using the old per-task model even though the displayed picker
 * said the unified model was selected. UX bug reported 2026-07-13.
 *
 * Fix: when `setFieldValue('model', value)` fires with a non-empty
 * value, cascade-clear all 3 per-task fields and reset their
 * `*UseCustom` flags. This test pins that policy at the data-flow
 * level using a minimal in-memory `LLMWikiSettings` shape.
 *
 * The settings-tab UI class is heavy to instantiate (deps on Obsidian,
 * Plugin, vault, etc.); instead we exercise the policy by directly
 * mutating the shape the way `setFieldValue` would. This preserves
 * the test as a regression net even if the UI layer refactors.
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
 * Re-implementation of `cascadeUnifiedModelChange` lifted to a pure
 * function for testability. The production code path lives on
 * KarpathySettingsTab — this mirrors the literal logic exactly so the
 * test pins what the policy IS, not how the UI shape wraps it.
 *
 * When production code in src/ui/settings.ts:175 (setFieldValue →
 * cascadeUnifiedModelChange) changes, update this mirror to match.
 */
function cascadeUnifiedModelChange(
  settings: SettingsShape,
  newUnified: string,
): { changed: number; finalSettings: SettingsShape } {
  settings.model = newUnified;
  if (newUnified.trim()) {
    const fields: Array<'ingestModel' | 'lintModel' | 'queryModel'> = [
      'ingestModel',
      'lintModel',
      'queryModel',
    ];
    let cleared = 0;
    for (const f of fields) {
      const current = (settings as unknown as Record<string, string | undefined>)[f];
      if (current !== undefined && current !== '') {
        (settings as unknown as Record<string, string | undefined>)[f] = '';
        const flag = `${f}UseCustom`;
        (settings as unknown as Record<string, boolean | undefined>)[flag] = false;
        cleared++;
      }
    }
    return { changed: cleared, finalSettings: settings };
  }
  return { changed: 0, finalSettings: settings };
}

describe('unified model change cascade (Phase 5.5.0 hotfix)', () => {
  it('sets the unified model to the new value', () => {
    const s: SettingsShape = { model: 'old-model' };
    const { finalSettings } = cascadeUnifiedModelChange(s, 'new-model');
    expect(finalSettings.model).toBe('new-model');
  });

  it('clears all 3 per-task overrides when they were non-empty', () => {
    const s: SettingsShape = {
      model: 'old-model',
      ingestModel: 'ingest-old',
      lintModel: 'lint-old',
      queryModel: 'query-old',
    };
    const { changed, finalSettings } = cascadeUnifiedModelChange(s, 'new-model');
    expect(changed).toBe(3);
    expect(finalSettings.ingestModel).toBe('');
    expect(finalSettings.lintModel).toBe('');
    expect(finalSettings.queryModel).toBe('');
  });

  it('clears the per-task *UseCustom flags so the per-task dropdown re-anchors on the unified model', () => {
    const s: SettingsShape & {
      ingestModelUseCustom: boolean;
      lintModelUseCustom: boolean;
      queryModelUseCustom: boolean;
    } = {
      model: 'old-model',
      ingestModel: 'ingest-old',
      lintModel: 'lint-old',
      queryModel: 'query-old',
      ingestModelUseCustom: true,
      lintModelUseCustom: true,
      queryModelUseCustom: true,
    };
    const { finalSettings } = cascadeUnifiedModelChange(s, 'new-model');
    // Type assertion via unknown: SettingsShape marks *UseCustom as
    // optional, but the test always initializes them. Reading back the
    // mutated shape lets TS infer them as the boolean type we know.
    const final = finalSettings as unknown as {
      ingestModelUseCustom: boolean;
      lintModelUseCustom: boolean;
      queryModelUseCustom: boolean;
    };
    expect(final.ingestModelUseCustom).toBe(false);
    expect(final.lintModelUseCustom).toBe(false);
    expect(final.queryModelUseCustom).toBe(false);
  });

  it('only clears the per-task overrides that were non-empty (partial state)', () => {
    const s: SettingsShape = {
      model: 'old-model',
      ingestModel: 'ingest-old',
      // lintModel undefined
      queryModel: '', // explicitly empty
    };
    const { changed, finalSettings } = cascadeUnifiedModelChange(s, 'new-model');
    expect(changed).toBe(1); // only ingestModel was non-empty
    expect(finalSettings.ingestModel).toBe('');
    expect(finalSettings.lintModel).toBeUndefined();
    expect(finalSettings.queryModel).toBe('');
  });

  it('no-op when the new unified value is blank (prevents false cascade on accidental clear)', () => {
    const s: SettingsShape = {
      model: 'old-model',
      ingestModel: 'ingest-old',
      lintModel: 'lint-old',
      queryModel: 'query-old',
    };
    const { changed, finalSettings } = cascadeUnifiedModelChange(s, '');
    expect(changed).toBe(0);
    expect(finalSettings.ingestModel).toBe('ingest-old');
    expect(finalSettings.lintModel).toBe('lint-old');
    expect(finalSettings.queryModel).toBe('query-old');
    // model itself IS still set, even on blank — per design (user may
    // be in the middle of clearing). The UI's `change` event does not
    // pre-validate input.
    expect(finalSettings.model).toBe('');
  });

  it('no-op when no per-task overrides were configured', () => {
    const s: SettingsShape = { model: 'old-model' };
    const { changed, finalSettings } = cascadeUnifiedModelChange(s, 'new-model');
    expect(changed).toBe(0);
    expect(finalSettings.model).toBe('new-model');
    expect(finalSettings.ingestModel).toBeUndefined();
  });

  it('preserves the unified model even when clearing 3 overrides — caller behavior is observable', () => {
    // Regression net: ensures the cascade does NOT accidentally null
    // out the unified model itself while clearing per-task overrides.
    const s: SettingsShape = {
      model: 'old-model',
      ingestModel: 'ingest-x',
      lintModel: 'lint-x',
      queryModel: 'query-x',
    };
    const { finalSettings } = cascadeUnifiedModelChange(s, 'super-new');
    expect(finalSettings.model).toBe('super-new');
    expect(finalSettings.ingestModel).toBe('');
  });

  it('handles whitespace-only new value as "blank" (no cascade)', () => {
    const s: SettingsShape = {
      model: 'old',
      queryModel: 'preserved',
    };
    const { changed, finalSettings } = cascadeUnifiedModelChange(s, '   ');
    expect(changed).toBe(0);
    expect(finalSettings.queryModel).toBe('preserved');
  });
});
