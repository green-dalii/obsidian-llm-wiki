import { describe, it, expect } from 'vitest';
import { applySettingsMigrations } from '../../core/settings-migrations';

describe('applySettingsMigrations — historical (#199 regression guard)', () => {
  it('uses the stable Codex secret ID for new settings', () => {
    expect(applySettingsMigrations(null).settings.openAICodexSecretId).toBe('karpathywiki-openai-codex');
  });

  it('preserves the old provider while clearing the legacy plaintext API key (v1.25.3 #182 migration, v1.25.4 #339 phase-1-only)', async () => {
    // v1.25.3 #182: legacy plaintext apiKey in data.json is moved into
    // Obsidian SecretStorage (the actual write happens in main.ts; this
    // helper just stashes the legacy value on a transient field).
    //
    // v1.25.4 #339: Phase 1 (stash) does NOT clear settings.apiKey any
    // more — the wipe is deferred to commitSettingsMigrationV1_25_3()
    // which main.ts calls ONLY after the SecretStorage write succeeds.
    // This prevents the "both stores empty" failure mode on IO failure.
    const { settings, applied } = applySettingsMigrations({ provider: 'openai', apiKey: 'existing-key' });
    expect(settings.provider).toBe('openai');
    expect(settings.apiKey).toBe('existing-key');                     // v1.25.4 #339: NOT cleared in phase 1
    expect(settings.openAICodexSecretId).toBe('karpathywiki-openai-codex');
    expect(settings._migrated_v1_25_3_secret_storage).toBe(true);     // marker set (phase 1 complete)
    expect(applied).toContain('v1.25.3-secret-storage');
    // Legacy value stashed for main.ts to consume (NOT a real settings field).
    const stashed = (settings as unknown as { _legacyApiKeyForSecretStorage?: string })._legacyApiKeyForSecretStorage;
    expect(stashed).toBe('existing-key');
    // Phase 2: simulate what main.ts does after SecretStorage IO succeeds
    const { commitSettingsMigrationV1_25_3 } = await import('../../core/settings-migrations');
    commitSettingsMigrationV1_25_3(settings);
    expect(settings.apiKey).toBe('');                                  // cleared by phase 2
  });

  it('repairs a blank legacy Codex secret ID', () => {
    const { settings, applied } = applySettingsMigrations({ openAICodexSecretId: '' });
    expect(settings.openAICodexSecretId).toBe('karpathywiki-openai-codex');
    expect(applied).toContain('v1.25.0-codex-settings');
  });

  it('never copies token-shaped fields into settings', () => {
    const savedData = { provider: 'openai-codex', accessToken: 'access-secret', refreshToken: 'refresh-secret', idToken: 'id-secret' };
    const { settings: migrated, applied } = applySettingsMigrations(savedData);
    const settings = migrated as unknown as Record<string, unknown>;
    expect(settings.accessToken).toBeUndefined();
    expect(settings.refreshToken).toBeUndefined();
    expect(settings.idToken).toBeUndefined();
    expect(applied).toContain('v1.25.0-codex-settings');
  });

  it('v1.23.0 migration overrides historical startupCheck:false to true (with silent Notice)', () => {
    // Historical behavior (#199): the v1.18.3 migration silently overrode
    // startupCheck:false on every load. After #199, that override was
    // removed and the user's preference was respected.
    // v1.23.0 changes the model: startupCheck is permanently on (QuickFixes
    // always runs), but the user's "I want to suppress the Notice" intent
    // is preserved by routing them to startupCheckNoticeLevel="silent".
    const savedData: Partial<import('../../types').LLMWikiSettings> = { startupCheck: false };
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.startupCheck).toBe(true);                       // pinned on
    expect(settings.startupCheckNoticeLevel).toBe('silent');        // opt-out honored
    expect(settings._migrated_v1_23_0_startup_notice).toBe(true);
    expect(applied).toContain('v1.23.0-startup-notice');
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

  it('preserves startupCheck: true across MULTIPLE invocations (idempotency of the migration)', () => {
    // After the v1.23.0 migration fires once, subsequent loads keep
    // startupCheck:true (it was pinned) without re-applying.
    let snapshot: Partial<import('../../types').LLMWikiSettings> = { startupCheck: false };
    for (let i = 0; i < 5; i++) {
      const { settings } = applySettingsMigrations(snapshot);
      expect(settings.startupCheck).toBe(true);
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

  it('v1.22.2: migrates retired periodicLint "hourly" to "daily"', () => {
    const oldSaved = { periodicLint: 'hourly' as unknown } as Partial<import('../../types').LLMWikiSettings>;
    const { settings, applied } = applySettingsMigrations(oldSaved);

    expect(settings.periodicLint).toBe('daily');
    expect(applied).toContain('v1.22.2-periodicLint-hourly');
  });

  it('v1.22.2: leaves valid periodicLint values untouched', () => {
    for (const value of ['off', 'daily', 'weekly', 'monthly'] as const) {
      const { settings, applied } = applySettingsMigrations({ periodicLint: value });
      expect(settings.periodicLint).toBe(value);
      expect(applied).not.toContain('v1.22.2-periodicLint-hourly');
    }
  });
});

describe('applySettingsMigrations (v1.23.0 — startupCheckNoticeLevel)', () => {
  it('migrates explicit startupCheck:false users to startupCheckNoticeLevel="silent"', () => {
    // Old user behavior was "I want to suppress the startup-check Notice"
    // (via toggle=false). v1.23.0 makes QuickFixes permanent; we honor
    // their original intent by routing them to the new silent mode.
    const savedData: Partial<import('../../types').LLMWikiSettings> = { startupCheck: false };
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.startupCheck).toBe(true);                       // pinned on
    expect(settings.startupCheckNoticeLevel).toBe('silent');        // old opt-out preserved
    expect(settings._migrated_v1_23_0_startup_notice).toBe(true);
    expect(applied).toContain('v1.23.0-startup-notice');
  });

  it('migrates startupCheck:true users to startupCheckNoticeLevel="visible"', () => {
    // Default + explicit-true users get the visible mode (new feature
    // should be visible to them so they know QuickFixes is running).
    const savedData: Partial<import('../../types').LLMWikiSettings> = { startupCheck: true };
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.startupCheck).toBe(true);
    expect(settings.startupCheckNoticeLevel).toBe('visible');
    expect(settings._migrated_v1_23_0_startup_notice).toBe(true);
    expect(applied).toContain('v1.23.0-startup-notice');
  });

  it('migrates users with no startupCheck on disk to startupCheckNoticeLevel="visible" (defaults applied)', () => {
    // Brand-new user has no savedData for this field; DEFAULT_SETTINGS
    // supplies startupCheck:true. The migration should treat them as
    // "explicit-true" and route to visible.
    const savedData: Partial<import('../../types').LLMWikiSettings> = {};
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.startupCheckNoticeLevel).toBe('visible');
    expect(applied).toContain('v1.23.0-startup-notice');
  });

  it('does not re-migrate on subsequent loads (idempotent via marker)', () => {
    // First load migrates; subsequent loads must NOT re-route the user
    // even if their savedData shape is unchanged.
    let snapshot: Partial<import('../../types').LLMWikiSettings> = { startupCheck: false };
    let result = applySettingsMigrations(snapshot);
    snapshot = result.settings;

    for (let i = 0; i < 3; i++) {
      result = applySettingsMigrations(snapshot);
      // Marker is preserved; no re-route.
      expect(result.settings._migrated_v1_23_0_startup_notice).toBe(true);
      expect(result.applied).not.toContain('v1.23.0-startup-notice');
      snapshot = result.settings;
    }
    // Final state: silent + pinned-on, preserved across all loads.
    expect(result.settings.startupCheckNoticeLevel).toBe('silent');
    expect(result.settings.startupCheck).toBe(true);
  });

  it('does NOT migrate if marker already present (e.g. user just edited the value manually)', () => {
    // User who already updated to v1.23.0 then re-saved has the marker.
    // Their explicit choice of 'visible' must be preserved.
    const savedData: Partial<import('../../types').LLMWikiSettings> = {
      startupCheck: false,
      _migrated_v1_23_0_startup_notice: true,
      startupCheckNoticeLevel: 'visible',  // they hand-edited it
    };
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.startupCheckNoticeLevel).toBe('visible');  // not overwritten to silent
    expect(applied).not.toContain('v1.23.0-startup-notice');
  });
});

describe('applySettingsMigrations (v1.27.0 MINOR — #404 follow-up: rename pdfConversionBackend → markdownConversionBackend)', () => {
  it('preserves a legacy pdfConversionBackend="mineru" choice (seamless upgrade for existing MinerU users)', () => {
    // v1.27.0 MINOR: the setting was renamed. A user who already selected
    // MinerU before the upgrade MUST keep their selection — silently
    // falling back to native would re-introduce native-PDF-only routing
    // for files they had explicitly chosen to route through MinerU.
    // Cast to the legacy shape because the field was removed from
    // LLMWikiSettings — this test is the proof that the migration handles
    // an in-the-wild pre-rename data.json correctly.
    const savedData = { pdfConversionBackend: 'mineru' } as unknown as Partial<import('../../types').LLMWikiSettings>;
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.markdownConversionBackend).toBe('mineru');
    expect(settings._migrated_v1_27_0_markdown_conversion_backend).toBe(true);
    expect(applied).toContain('v1.27.0-markdown-conversion-backend');
  });

  it('preserves a legacy pdfConversionBackend="native" choice (no behavior change for the default path)', () => {
    const savedData = { pdfConversionBackend: 'native' } as unknown as Partial<import('../../types').LLMWikiSettings>;
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.markdownConversionBackend).toBe('native');
    expect(applied).toContain('v1.27.0-markdown-conversion-backend');
  });

  it('drops an unrecognized legacy value and falls back to the default "native"', () => {
    // Pre-fix risk: a corrupted data.json with an unexpected value would
    // have crashed the migration. Post-fix: skip the unknown value, the
    // default 'native' (DEFAULT_SETTINGS.markdownConversionBackend) wins.
    const savedData = { pdfConversionBackend: 'experimental' } as unknown as Partial<import('../../types').LLMWikiSettings>;
    const { settings, applied } = applySettingsMigrations(savedData);

    expect(settings.markdownConversionBackend).toBe('native');
    expect(applied).toContain('v1.27.0-markdown-conversion-backend');
  });

  it('does not re-migrate on subsequent loads (idempotent via the marker)', () => {
    const savedData = { pdfConversionBackend: 'mineru' } as unknown as Partial<import('../../types').LLMWikiSettings>;
    const firstPass = applySettingsMigrations(savedData);
    // Simulate a second load: the user's data.json now has the marker and
    // the NEW field name. The legacy `pdfConversionBackend` is gone.
    const secondPass = applySettingsMigrations(firstPass.settings);

    expect(secondPass.settings.markdownConversionBackend).toBe('mineru');
    expect(secondPass.applied).not.toContain('v1.27.0-markdown-conversion-backend');
  });

  it('does not migrate users who never had the legacy field (brand-new install)', () => {
    const { settings, applied } = applySettingsMigrations({});

    // The marker is still set (so future loads skip), but no value
    // migration happened — the default 'native' from DEFAULT_SETTINGS
    // stands.
    expect(settings.markdownConversionBackend).toBe('native');
    expect(settings._migrated_v1_27_0_markdown_conversion_backend).toBe(true);
    expect(applied).toContain('v1.27.0-markdown-conversion-backend');
  });
});
