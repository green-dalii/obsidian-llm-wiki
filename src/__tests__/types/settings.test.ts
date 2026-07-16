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
});