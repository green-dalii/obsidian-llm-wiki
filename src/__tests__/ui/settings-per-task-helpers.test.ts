// v1.24.0 #208: UI helpers for the per-task model picker (settings tab).
//
// Tests pin three policies:
//   1. `resolveModelTaskUiMode` — boolean toggle → UI mode label
//   2. `resolveDisplayedModelForTask` — pre-fill behavior (per-task
//      override > unified fallback, in per-task mode; always unified
//      in unified mode)
//   3. `normalizePerTaskModelsOnToggle` — hidden values preserved
//      on toggle off (the user explicitly asked for this)

import { describe, it, expect } from 'vitest';
import {
  resolveModelTaskUiMode,
  resolveDisplayedModelForTask,
  normalizePerTaskModelsOnToggle,
} from '../../ui/settings-per-task-helpers';
import { DEFAULT_SETTINGS } from '../../types';

describe('settings-per-task-helpers (#208 per-task model picker UI)', () => {
  // ── resolveModelTaskUiMode (#1-#4) ──────────────────────────────

  it('defaults to unified when usePerTaskModels is undefined (pre-v1.24.0 data)', () => {
    const settings = { ...DEFAULT_SETTINGS, model: 'gpt-4.1' };
    expect(resolveModelTaskUiMode(settings)).toBe('unified');
  });

  it('unified mode when usePerTaskModels is false (explicit off)', () => {
    const settings = { ...DEFAULT_SETTINGS, model: 'gpt-4.1', usePerTaskModels: false };
    expect(resolveModelTaskUiMode(settings)).toBe('unified');
  });

  it('per-task mode when usePerTaskModels is true', () => {
    const settings = { ...DEFAULT_SETTINGS, model: 'gpt-4.1', usePerTaskModels: true };
    expect(resolveModelTaskUiMode(settings)).toBe('per-task');
  });

  it('per-task mode requires strict true (truthy non-boolean is rejected)', () => {
    // Defensive: someone might write `usePerTaskModels: 'yes'` from a
    // hand-edited data.json. We must treat only literal true as on.
    const settings = { ...DEFAULT_SETTINGS, usePerTaskModels: 'yes' as unknown as boolean };
    expect(resolveModelTaskUiMode(settings)).toBe('unified');
  });

  // ── resolveDisplayedModelForTask (#5-#10) ────────────────────────

  it('unified mode: every task displays settings.model', () => {
    const settings = { ...DEFAULT_SETTINGS, model: 'gpt-4.1' };
    expect(resolveDisplayedModelForTask(settings, 'ingest')).toBe('gpt-4.1');
    expect(resolveDisplayedModelForTask(settings, 'lint')).toBe('gpt-4.1');
    expect(resolveDisplayedModelForTask(settings, 'query')).toBe('gpt-4.1');
  });

  it('per-task mode with no overrides: pre-fills all three with settings.model', () => {
    // User toggled "使用不同模型" but hasn't picked anything yet —
    // the dropdowns should default to the unified value, not be blank.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      usePerTaskModels: true,
    };
    expect(resolveDisplayedModelForTask(settings, 'ingest')).toBe('gpt-4.1');
    expect(resolveDisplayedModelForTask(settings, 'lint')).toBe('gpt-4.1');
    expect(resolveDisplayedModelForTask(settings, 'query')).toBe('gpt-4.1');
  });

  it('per-task mode: ingest override shown in ingest dropdown, lint/query fall back to unified', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: 'gpt-4.1-mini',
      usePerTaskModels: true,
    };
    expect(resolveDisplayedModelForTask(settings, 'ingest')).toBe('gpt-4.1-mini');
    expect(resolveDisplayedModelForTask(settings, 'lint')).toBe('gpt-4.1');
    expect(resolveDisplayedModelForTask(settings, 'query')).toBe('gpt-4.1');
  });

  it('per-task mode: all three overrides surface independently', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: 'gpt-4.1-mini',
      lintModel: 'gpt-4o-mini',
      queryModel: 'gpt-5',
      usePerTaskModels: true,
    };
    expect(resolveDisplayedModelForTask(settings, 'ingest')).toBe('gpt-4.1-mini');
    expect(resolveDisplayedModelForTask(settings, 'lint')).toBe('gpt-4o-mini');
    expect(resolveDisplayedModelForTask(settings, 'query')).toBe('gpt-5');
  });

  it('per-task mode: whitespace-only override falls back to unified (UI hygiene)', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: '   ',
      lintModel: '\t',
      queryModel: ' \n ',
      usePerTaskModels: true,
    };
    expect(resolveDisplayedModelForTask(settings, 'ingest')).toBe('gpt-4.1');
    expect(resolveDisplayedModelForTask(settings, 'lint')).toBe('gpt-4.1');
    expect(resolveDisplayedModelForTask(settings, 'query')).toBe('gpt-4.1');
  });

  it('per-task mode: empty-string override falls back to unified (UI hygiene)', () => {
    // User previously picked "use unified model" for one task — stored as ''.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: '',
      usePerTaskModels: true,
    };
    expect(resolveDisplayedModelForTask(settings, 'ingest')).toBe('gpt-4.1');
  });

  // ── normalizePerTaskModelsOnToggle (#11-#13) ─────────────────────

  it('toggle ON (per-task): returns same reference, no mutation', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: 'gpt-4.1-mini',
    };
    const result = normalizePerTaskModelsOnToggle(settings, 'per-task');
    expect(result).toBe(settings); // identity check — no clone, no mutation
    expect(settings.ingestModel).toBe('gpt-4.1-mini'); // preserved
  });

  it('toggle OFF (unified): PRESERVES hidden per-task values (not cleared)', () => {
    // This is the user-mandated policy: don't lose what they typed.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: 'gpt-4.1-mini',
      lintModel: 'gpt-4o-mini',
      queryModel: 'gpt-5',
      usePerTaskModels: true,
    };
    const result = normalizePerTaskModelsOnToggle(settings, 'unified');
    expect(result.ingestModel).toBe('gpt-4.1-mini');
    expect(result.lintModel).toBe('gpt-4o-mini');
    expect(result.queryModel).toBe('gpt-5');
  });

  it('toggle round-trip: ingest/lint/query survive off → on transition', () => {
    // User flow: enable per-task, set 3 values, disable, re-enable.
    // The 3 values must still be there on re-enable.
    let settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      usePerTaskModels: true,
      ingestModel: 'gpt-4.1-mini',
      lintModel: 'gpt-4o-mini',
      queryModel: 'gpt-5',
    };
    settings = normalizePerTaskModelsOnToggle(settings, 'unified');
    expect(settings.ingestModel).toBe('gpt-4.1-mini');
    settings = normalizePerTaskModelsOnToggle(settings, 'per-task');
    expect(settings.ingestModel).toBe('gpt-4.1-mini');
    expect(settings.lintModel).toBe('gpt-4o-mini');
    expect(settings.queryModel).toBe('gpt-5');
  });
});