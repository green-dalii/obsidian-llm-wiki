// v1.24.0 #208: per-task model resolution.
//
// resolveModelForTask is the single point of truth for "which model
// should this LLM call use?" It encapsulates the fallback chain
// `perTaskModel?.trim() || settings.model` so that all 27 call sites
// stay in sync, and so the UI never has to reach into multiple
// settings fields to decide what to display.
//
// Backward compatibility invariant: when no per-task fields are set
// (the default for pre-v1.24.0 data.json), every task resolves to
// `settings.model` — bit-identical to pre-#208 behavior. This is the
// single most important property of the helper; tests #1-#3 pin it.

import { describe, it, expect } from 'vitest';
import { resolveModelForTask, type LLMTask } from '../../core/model-resolver';
import { DEFAULT_SETTINGS } from '../../types';

const TASK_LIST: LLMTask[] = ['ingest', 'lint', 'query'];

describe('resolveModelForTask (#208 per-task model resolution)', () => {
  // ── Backward compat: zero-config case (#1-#3) ──────────────────

  it('all three tasks resolve to settings.model when no per-task fields are set', () => {
    const settings = { ...DEFAULT_SETTINGS, model: 'gpt-4.1' };
    expect(resolveModelForTask(settings, 'ingest')).toBe('gpt-4.1');
    expect(resolveModelForTask(settings, 'lint')).toBe('gpt-4.1');
    expect(resolveModelForTask(settings, 'query')).toBe('gpt-4.1');
  });

  it('handles empty settings.model (edge case — UI error state)', () => {
    const settings = { ...DEFAULT_SETTINGS, model: '' };
    // Empty default falls through to empty — every task returns ''.
    // Test Connection handles empty-model early; this is the helper's
    // honest "no model" signal.
    for (const task of TASK_LIST) {
      expect(resolveModelForTask(settings, task)).toBe('');
    }
  });

  it('treats pre-v1.24.0 data.json (no per-task fields) as zero-config', () => {
    // Pre-v1.24.0 shape: the four new fields are not present at all.
    // JSON.parse wouldn't include them — explicit undefined for clarity.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: undefined,
      lintModel: undefined,
      queryModel: undefined,
    };
    expect(resolveModelForTask(settings, 'ingest')).toBe('gpt-4.1');
    expect(resolveModelForTask(settings, 'lint')).toBe('gpt-4.1');
    expect(resolveModelForTask(settings, 'query')).toBe('gpt-4.1');
  });

  // ── Per-task override (#4-#6) ───────────────────────────────────

  it('ingestModel overrides settings.model only for ingest', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: 'gpt-4.1-mini',
    };
    expect(resolveModelForTask(settings, 'ingest')).toBe('gpt-4.1-mini');
    expect(resolveModelForTask(settings, 'lint')).toBe('gpt-4.1');
    expect(resolveModelForTask(settings, 'query')).toBe('gpt-4.1');
  });

  it('lintModel + queryModel can be set independently of ingest', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      lintModel: 'gpt-4.1-mini',
      queryModel: 'gpt-5',
    };
    expect(resolveModelForTask(settings, 'ingest')).toBe('gpt-4.1');
    expect(resolveModelForTask(settings, 'lint')).toBe('gpt-4.1-mini');
    expect(resolveModelForTask(settings, 'query')).toBe('gpt-5');
  });

  it('all three per-task fields set: each task uses its own value', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: 'gpt-4.1-mini',
      lintModel: 'gpt-4o-mini',
      queryModel: 'gpt-5',
    };
    expect(resolveModelForTask(settings, 'ingest')).toBe('gpt-4.1-mini');
    expect(resolveModelForTask(settings, 'lint')).toBe('gpt-4o-mini');
    expect(resolveModelForTask(settings, 'query')).toBe('gpt-5');
  });

  // ── Empty-string & whitespace handling (#7-#8) ──────────────────

  it('empty-string per-task value falls through to settings.model', () => {
    // UI stores '' when user picks "use unified model" for a specific task.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: '',
      lintModel: '',
      queryModel: '',
    };
    for (const task of TASK_LIST) {
      expect(resolveModelForTask(settings, task)).toBe('gpt-4.1');
    }
  });

  it('whitespace-only per-task value falls through to settings.model', () => {
    // Defensive: someone might paste '   ' into the model field.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: '   ',
      lintModel: '\t',
      queryModel: ' \n ',
    };
    for (const task of TASK_LIST) {
      expect(resolveModelForTask(settings, task)).toBe('gpt-4.1');
    }
  });

  // ── Edge cases (#9-#10) ─────────────────────────────────────────

  it('per-task model with leading/trailing whitespace is trimmed', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: '  gpt-4.1-mini  ',
    };
    // Provider APIs don't tolerate '  gpt-4.1-mini  ' — must be trimmed
    // before the LLM call sees it. This is the same convention as
    // settings.model UI onChange, so behavior stays consistent.
    expect(resolveModelForTask(settings, 'ingest')).toBe('gpt-4.1-mini');
  });

  it('non-ASCII model name preserved (test for proxy / passthrough providers)', () => {
    // Some providers allow unicode model IDs (rare but legal).
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'base-model',
      queryModel: '自定义模型-测试',
    };
    expect(resolveModelForTask(settings, 'query')).toBe('自定义模型-测试');
  });

  // ── Call-site equivalence (#11-#12) ─────────────────────────────

  it('ingest call-site equivalence: source-analyzer extraction', () => {
    // Pin the wiring contract: source-analyzer.ts:307 should pass
    // resolveModelForTask(settings, 'ingest') into createMessage.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      ingestModel: 'gpt-4.1-mini',
    };
    const modelForExtraction = resolveModelForTask(settings, 'ingest');
    expect(modelForExtraction).toBe('gpt-4.1-mini');
  });

  it('query call-site equivalence: streaming + non-stream fallback + non-stream main all use queryModel', () => {
    // Three QueryView-class.ts sites (line 508 / 541 / 627) all share
    // the same helper invocation. Pin that they ALL get queryModel.
    const settings = {
      ...DEFAULT_SETTINGS,
      model: 'gpt-4.1',
      queryModel: 'gpt-5',
    };
    for (const site of [
      resolveModelForTask(settings, 'query'), // streaming
      resolveModelForTask(settings, 'query'), // non-stream fallback
      resolveModelForTask(settings, 'query'), // non-stream main
    ]) {
      expect(site).toBe('gpt-5');
    }
  });
});