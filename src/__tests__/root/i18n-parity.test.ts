import { describe, it, expect } from 'vitest';
import { TEXTS } from '../../texts';
import { WIKI_LANGUAGES } from '../../types';
import { SECTION_LABELS } from '../../wiki/system-prompts';

/**
 * i18n parity guard.
 *
 * getText() falls back to EN_TEXTS when a key is missing in the target
 * language, so a language file with missing keys would silently degrade to
 * English at runtime with no type error (keys are typed off TEXTS.en only).
 * This test makes such gaps fail loudly at build time.
 *
 * Added alongside the Italian (it) locale so every locale stays at full parity.
 */

const EN_KEYS = Object.keys(TEXTS.en).sort();
const LOCALES = Object.keys(TEXTS) as Array<keyof typeof TEXTS>;
const CODEX_AUTH_ENGLISH = {
  codexAuthName: 'ChatGPT Plan sign-in',
  codexAuthDesc: 'Experimental Codex OAuth access using your ChatGPT plan allowance. OpenAI Platform API billing remains separate.',
  codexAuthSignedOut: 'Not signed in',
  codexAuthSignedIn: 'Signed in',
  codexAuthBrowserButton: 'Sign in with browser',
  codexAuthDeviceButton: 'Use device code',
  codexAuthDeviceInstructions: 'Enter this code on the OpenAI page: {}',
  codexAuthSignOutButton: 'Sign out',
  codexAuthBusy: 'Waiting for OpenAI authorization...',
  codexAuthRequired: 'Sign in to ChatGPT Plan before testing the connection.',
  codexAuthFailed: 'ChatGPT authorization failed: {}',
  codexAuthQuota: 'ChatGPT Codex allowance reached. Wait for the displayed reset period and try again.',
  codexAuthExperimental: 'Experimental: availability follows OpenAI Codex authentication and model policies.',
} as const;

describe('UI text parity across all locales', () => {
  it('defines the canonical English Codex authentication copy', () => {
    for (const [key, value] of Object.entries(CODEX_AUTH_ENGLISH)) expect(TEXTS.en[key as keyof typeof TEXTS.en]).toBe(value);
  });

  it.each(LOCALES)('locale "%s" defines every Codex authentication key', (locale) => {
    const texts = TEXTS[locale] as unknown as Record<string, unknown>;
    for (const key of Object.keys(CODEX_AUTH_ENGLISH)) expect(typeof texts[key], `missing ${key} in ${locale}`).toBe('string');
  });

  // The contract getText() relies on: every locale must cover every EN key,
  // otherwise it silently falls back to English at runtime. (Extra keys are
  // harmless dead entries — some pre-existing locales carry orphan keys — so
  // this guard intentionally checks only for *missing* keys here.)
  it.each(LOCALES)('locale "%s" covers every en key', (locale) => {
    const keys = Object.keys(TEXTS[locale]);
    const missing = EN_KEYS.filter((k) => !keys.includes(k));
    expect(missing, `missing keys in ${locale}`).toEqual([]);
  });

  it.each(LOCALES)('locale "%s" has no empty string values', (locale) => {
    const empties = Object.entries(TEXTS[locale])
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k);
    expect(empties, `empty values in ${locale}`).toEqual([]);
  });

  // Every locale (including the legacy ones) is held to strict bidirectional
  // parity: no missing keys and no extra keys versus en. Real-world hit:
  // ZH had `lintReportPageCount` as an orphan from PR #110 (status-bar
  // mirror) without an EN counterpart — exactly the bug this guard exists
  // to prevent. Italian's check is now part of this parameterization
  // (instead of a one-off) so any new locale automatically gets the same
  // strict coverage.
  it.each(LOCALES)('locale "%s" is at exact bidirectional parity with en', (locale) => {
    const keys = Object.keys(TEXTS[locale]).sort();
    expect(keys).toEqual(EN_KEYS);
  });
});

describe('Italian locale wiring', () => {
  it('exposes the Italian UI locale', () => {
    expect(TEXTS.it).toBeDefined();
    expect(TEXTS.it.languageIt).toBe('Italiano');
  });

  it('registers Italian as a selectable wiki output language', () => {
    expect(WIKI_LANGUAGES.it).toBe('Italiano');
  });

  it('provides Italian wiki section labels with full coverage', () => {
    expect(SECTION_LABELS.it).toBeDefined();
    const enLabelKeys = Object.keys(SECTION_LABELS.en).sort();
    const itLabelKeys = Object.keys(SECTION_LABELS.it).sort();
    expect(itLabelKeys).toEqual(enLabelKeys);
    for (const value of Object.values(SECTION_LABELS.it)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});

// === v1.22.0: Traditional Chinese (zh-Hant) locale — 10th language ===
// BCP-47 distinguishes zh-Hans (Simplified) from zh-Hant (Traditional).
// Target users: Hong Kong / Macao / Taiwan / Malaysia / Singapore.
//
// TEXTS uses BCP-47 keys to match settings.language / WIKI_LANGUAGES exactly
// (vs. the previous CamelCase convention). This keeps every consumer
// `TEXTS[settings.language]` type-safe without per-language aliases.
describe('Traditional Chinese (zh-Hant) locale wiring', () => {
  it('exposes the Traditional Chinese UI locale (TEXTS["zh-Hant"])', () => {
    expect(TEXTS['zh-Hant']).toBeDefined();
    // Self-naming key follows the existing `languageXxx` convention.
    // Cast through `unknown` to bypass the deeply-inferred nested type
    // (TS otherwise complains about indexLabels and other sub-records).
    const hantTexts = TEXTS['zh-Hant'] as unknown as Record<string, string>;
    expect(hantTexts.languageZhHant).toBe('繁體中文');
  });

  it('registers zh-Hant as a selectable wiki output language with BCP-47 tag', () => {
    expect(WIKI_LANGUAGES['zh-Hant']).toBe('繁體中文');
  });

  it('provides Traditional Chinese wiki section labels with full coverage', () => {
    expect(SECTION_LABELS['zh-Hant']).toBeDefined();
    const enLabelKeys = Object.keys(SECTION_LABELS.en).sort();
    const hantLabelKeys = Object.keys(SECTION_LABELS['zh-Hant']).sort();
    expect(hantLabelKeys).toEqual(enLabelKeys);
    for (const value of Object.values(SECTION_LABELS['zh-Hant'])) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
