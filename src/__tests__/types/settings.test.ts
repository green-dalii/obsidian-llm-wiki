// v1.25.0 PR3 follow-up #2 (P1 #4): defaults test for the two new PDF
// toggles. ROADMAP.md §145 listed this file as a PR3 deliverable; the
// file was missing until this follow-up commit.
//
// What this catches:
//   - A future refactor accidentally flipping a default (e.g. setting
//     writePdfMarkdownToVault=true) would silently change vault artifacts
//     for every existing user on upgrade — a hard regression for the
//     cache-only architecture.
//   - A migration that drops the field from DEFAULT_SETTINGS would make
//     applySettingsMigrations pass undefined into the typed shape.
//
// Why DEFAULT_SETTINGS-only (not type-level): the type allows `?` so the
// settings layer is forgiving of undefined. The contract users actually
// observe is what DEFAULT_SETTINGS supplies.
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types';

describe('v1.25.0 PR3 PDF settings — defaults', () => {
  it('forcePdfSupport defaults to false (no surprise enablement on upgrade)', () => {
    expect(DEFAULT_SETTINGS.forcePdfSupport).toBe(false);
  });

  it('writePdfMarkdownToVault defaults to false (cache-only architecture)', () => {
    expect(DEFAULT_SETTINGS.writePdfMarkdownToVault).toBe(false);
  });

  it('both fields are present on DEFAULT_SETTINGS (not undefined)', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('forcePdfSupport');
    expect(DEFAULT_SETTINGS).toHaveProperty('writePdfMarkdownToVault');
  });
  it('defaults PDF conversion to the native backend', () => {
    expect(DEFAULT_SETTINGS.pdfConversionBackend).toBe('native');
    expect(DEFAULT_SETTINGS.mineruApiToken).toBe('');
    expect(DEFAULT_SETTINGS.mineruApiTokenSecretId).toBe('karpathywiki-mineru-mineru-api-token');
    expect(DEFAULT_SETTINGS.providerApiKeySecretId).toBe('karpathywiki-mineru-provider-api-key');
    expect(DEFAULT_SETTINGS.mineruTaskTimeoutMinutes).toBe(30);
  });
});

// v1.26.0 (#382 item 2): dedup threshold overrides — three optional
// Settings fields default to undefined so the production coalesce falls
// through to the named constants in src/constants.ts. JSON.stringify
// drops undefined keys, so first-install data.json does not persist
// these values; users opt in by setting advancedSettingsMode = 'custom'.
describe('v1.26.0 dedup threshold settings — defaults', () => {
  it('lintJaccardLinkThreshold defaults to undefined (constant is the default)', () => {
    expect(DEFAULT_SETTINGS.lintJaccardLinkThreshold).toBeUndefined();
  });

  it('lintJaccardBodyGate defaults to undefined', () => {
    expect(DEFAULT_SETTINGS.lintJaccardBodyGate).toBeUndefined();
  });

  it('lintBigramThreshold defaults to undefined', () => {
    expect(DEFAULT_SETTINGS.lintBigramThreshold).toBeUndefined();
  });

  it('all three fields are present on DEFAULT_SETTINGS (not dropped)', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('lintJaccardLinkThreshold');
    expect(DEFAULT_SETTINGS).toHaveProperty('lintJaccardBodyGate');
    expect(DEFAULT_SETTINGS).toHaveProperty('lintBigramThreshold');
  });
});

// v1.26.0 (#382 item 2): Advanced Settings panel toggle (bottom of the
// Settings tab). Defaults to false so the lint dedup threshold inputs and
// other advanced-user settings stay hidden unless the user opts in.
// Independent of advancedSettingsMode (that gates LLM sampling in the
// Advanced section; this gates the generic advanced-user panel).
describe('v1.26.0 Advanced Settings panel — default', () => {
  it('showAdvancedSettings defaults to false (advanced-user panel hidden)', () => {
    expect(DEFAULT_SETTINGS.showAdvancedSettings).toBe(false);
  });

  it('field is present on DEFAULT_SETTINGS (not dropped)', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('showAdvancedSettings');
  });
});
