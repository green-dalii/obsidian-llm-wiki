import { describe, it, expect } from 'vitest';
import { applySettingsMigrations } from '../../core/settings-migrations';

describe('applySettingsMigrations (#199 root-cause regression)', () => {
  it('preserves a user who has set startupCheck: false — the v1.18.3 migration is gone', () => {
    // The v1.18.3 migration was: if (savedData.startupCheck === false) { set true }
    // — which silently undid the user's toggle on every load for ~2 years.
    // (#199) The fix: that override is removed entirely. Anyone with
    // startupCheck: false on disk today has explicitly chosen that value
    // and we respect it.
    const savedData: Partial<import('../../types').LLMWikiSettings> = { startupCheck: false };
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.startupCheck).toBe(false);  // preserved
    expect(applied).not.toContain('v1.18.3-startupCheck');
  });

  it('starts with startupCheck: true for a brand-new install (no saved data)', () => {
    const { settings } = applySettingsMigrations(null);
    expect(settings.startupCheck).toBe(true);  // DEFAULT_SETTINGS
  });

  it('respects startupCheck: true on disk (no override either way)', () => {
    const { settings } = applySettingsMigrations({ startupCheck: true });
    expect(settings.startupCheck).toBe(true);
  });

  it('preserves startupCheck: false across MULTIPLE invocations (idempotency of the no-op)', () => {
    // The bug was: every load re-overrode false→true. After the fix,
    // every load should leave false as false.
    let snapshot: Partial<import('../../types').LLMWikiSettings> = { startupCheck: false };
    for (let i = 0; i < 5; i++) {
      const { settings } = applySettingsMigrations(snapshot);
      expect(settings.startupCheck).toBe(false);
      snapshot = settings;
    }
  });

  it('keeps the v1.20.0 disableThinking migration in place (regression guard for unrelated fix)', () => {
    // The v1.20.0 migration (reset disableThinking true→false on old data)
    // is a separate, version-key-gated migration. Make sure the #199 fix
    // didn't accidentally remove it.
    const oldSaved: Partial<import('../../types').LLMWikiSettings> = { disableThinking: true };
    const { settings, applied } = applySettingsMigrations(oldSaved);

    expect(settings.disableThinking).toBe(false);
    expect(settings.advancedSettingsMode).toBe('default');
    expect(applied).toContain('v1.20.0-thinking');
  });
});
