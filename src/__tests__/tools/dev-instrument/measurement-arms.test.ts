// Measurement-arm validation (PR #511 review, DocTpoint finding 3).
//
// `applyMeasurementArms` applies the env-only arms (WIKI_THINKING_MODE /
// WIKI_TEMP / WIKI_TOP_P) to the loaded settings. The contract under test:
// an arm that cannot be honored must THROW, not silently no-op. Before the
// fix, `WIKI_THINKING_MODE=off` did nothing while the `[cli]` header printed
// `thinking-mode=off` — a run whose own log claimed an arm it never ran.
// Same rationale as parseTaskPolicySpec (src/core/task-policy.ts): the
// header is the only record of which arm a number came from.

import { describe, it, expect } from 'vitest';
import { applyMeasurementArms } from '../../../../tools/dev-instrument/src/measurement-arms';
import type { LLMWikiSettings } from '../../../../src/types';

function baseSettings(): LLMWikiSettings {
  return {
    disableThinking: false,
    extractionTemperature: undefined,
    extractionTopP: undefined,
  } as unknown as LLMWikiSettings;
}

describe('applyMeasurementArms', () => {
  it('leaves settings untouched when no arm is set', () => {
    const settings = baseSettings();
    applyMeasurementArms(settings, {});
    expect(settings.disableThinking).toBe(false);
    expect(settings.extractionTemperature).toBeUndefined();
    expect(settings.extractionTopP).toBeUndefined();
  });

  it('data-json is a deliberate no-op (use whatever data.json says)', () => {
    const settings = baseSettings();
    applyMeasurementArms(settings, { WIKI_THINKING_MODE: 'data-json' });
    expect(settings.disableThinking).toBe(false);
  });

  it('plugin-off forces disableThinking on', () => {
    const settings = baseSettings();
    applyMeasurementArms(settings, { WIKI_THINKING_MODE: 'plugin-off' });
    expect(settings.disableThinking).toBe(true);
  });

  it('server-default forces disableThinking off (overriding data.json)', () => {
    const settings = baseSettings();
    settings.disableThinking = true;
    applyMeasurementArms(settings, { WIKI_THINKING_MODE: 'server-default' });
    expect(settings.disableThinking).toBe(false);
  });

  it('throws on an unknown thinking mode instead of silently no-opping', () => {
    const settings = baseSettings();
    expect(() =>
      applyMeasurementArms(settings, { WIKI_THINKING_MODE: 'off' }),
    ).toThrow(/WIKI_THINKING_MODE="off".*data-json \| plugin-off \| server-default/);
    // And the settings must not have been touched by the failed arm.
    expect(settings.disableThinking).toBe(false);
  });

  it('applies numeric WIKI_TEMP / WIKI_TOP_P arms', () => {
    const settings = baseSettings();
    applyMeasurementArms(settings, { WIKI_TEMP: '0.7', WIKI_TOP_P: '0.9' });
    expect(settings.extractionTemperature).toBe(0.7);
    expect(settings.extractionTopP).toBe(0.9);
  });

  it('throws on a non-numeric WIKI_TEMP instead of silently ignoring it', () => {
    const settings = baseSettings();
    expect(() =>
      applyMeasurementArms(settings, { WIKI_TEMP: 'warm' }),
    ).toThrow(/WIKI_TEMP="warm" is not a number/);
    expect(settings.extractionTemperature).toBeUndefined();
  });

  it('throws on a non-numeric WIKI_TOP_P', () => {
    const settings = baseSettings();
    expect(() =>
      applyMeasurementArms(settings, { WIKI_TOP_P: 'high' }),
    ).toThrow(/WIKI_TOP_P="high" is not a number/);
  });

  it('treats an empty-string arm as unset (shell `WIKI_TEMP=` exports)', () => {
    // Number('') === 0 — without the empty-string guard, `WIKI_TEMP=` would
    // silently pin temperature to 0, the worst possible silent arm.
    const settings = baseSettings();
    applyMeasurementArms(settings, { WIKI_TEMP: '', WIKI_TOP_P: '' });
    expect(settings.extractionTemperature).toBeUndefined();
    expect(settings.extractionTopP).toBeUndefined();
  });
});
