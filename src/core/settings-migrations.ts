// v1.22.1 #199: extract settings migration logic from main.ts so the
// historical migrations (and any future ones) can be unit-tested
// without standing up the full Plugin/App harness.
//
// The full migration table is the single source of truth for "what
// loadSettings does to savedData before it becomes `this.settings`".
// Keep the pure function append-only — never delete an old migration,
// because old data on disk may still be from that version.

import { DEFAULT_SETTINGS, type LLMWikiSettings } from '../types';

const LEGACY_CODEX_TOKEN_FIELDS = ['accessToken', 'refreshToken', 'idToken', 'access_token', 'refresh_token', 'id_token'] as const;

export interface MigrationResult {
  settings: LLMWikiSettings;
  /** True iff a migration rule fired (for tests + future observability). */
  applied: string[];
}

/**
 * Apply all known migrations to a `savedData` snapshot from
 * `plugin.loadData()`. Pure function; no IO, no Date.now(),
 * no side effects. Callers (e.g. `main.ts loadSettings`) assign the
 * returned `settings` to `this.settings` and then persist on
 * `applied.length > 0`.
 */
export function applySettingsMigrations(
  savedData: Partial<LLMWikiSettings> | null,
): MigrationResult {
  const applied: string[] = [];
  const settings: LLMWikiSettings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});
  const savedRecord = savedData;
  const hasLegacyCodexToken = savedRecord !== null && LEGACY_CODEX_TOKEN_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(savedRecord, field));
  const needsCodexSettingsMigration = savedRecord !== null && (typeof savedRecord.openAICodexSecretId !== 'string' || savedRecord.openAICodexSecretId.trim().length === 0 || hasLegacyCodexToken);
  if (!settings.openAICodexSecretId.trim()) settings.openAICodexSecretId = 'karpathywiki-openai-codex';
  const untrustedSettings = settings as unknown as Record<string, unknown>;
  for (const field of LEGACY_CODEX_TOKEN_FIELDS) delete untrustedSettings[field];
  if (needsCodexSettingsMigration) applied.push('v1.25.0-codex-settings');

  // v1.20.0 migration: reset disableThinking from old default (true) to
  // new default (false). Old behavior sent thinking.type='disabled' which
  // Anthropic rejects at the API level. Users who explicitly enabled
  // "disable thinking" later than v1.20.0 keep their preference.
  if (savedData && savedData.disableThinking === true && !savedData._migrated_v1_20_0_thinking) {
    settings.disableThinking = false;
    settings.advancedSettingsMode = 'default';
    settings._migrated_v1_20_0_thinking = true;
    applied.push('v1.20.0-thinking');
  }

  // v1.18.3 migration REMOVED in v1.22.1 (#199). Previous code was:
  //
  //   if (savedData && savedData.startupCheck === false) {
  //     this.settings.startupCheck = true;
  //   }
  //
  // The intent was a one-time nudge for users who'd had `startupCheck: false`
  // in their disk data since before v1.18.3. The gate `=== false` meant
  // every successful "user toggled off" persisted `false` was re-overridden
  // on the next load — silently undoing the user's preference for ~2 years.
  //
  // Removed entirely. Anyone with `startupCheck: false` on disk today has
  // explicitly chosen that value and we respect it.
  //
  // If we ever need a re-nudge in the future, use a version-key gate
  // (see the v1.20.0 pattern above) so the migration is truly one-time.

  // v1.22.2 migration: the 'hourly' periodicLint option is retired.
  // Fall back to 'daily' so old saved data stays valid without a breaking change.
  if (savedData && (savedData as { periodicLint?: string }).periodicLint === 'hourly') {
    settings.periodicLint = 'daily';
    applied.push('v1.22.2-periodicLint-hourly');
  }

  // v1.23.0 migration (Phase 5.1.5 → followup): the `startupCheck` toggle
  // is now permanently on (the 4-phase QuickFixes pipeline always runs).
  // The new `startupCheckNoticeLevel` ('visible' | 'silent') replaces the
  // toggle as the user-facing control. Existing users who had
  // `startupCheck: false` on disk were explicitly opting out of the
  // Notice noise — honor that preference by routing them to 'silent'.
  // Users who had `startupCheck: true` (the v1.18.3+ default) get 'visible'.
  // Brand-new users (no savedData for this field) follow DEFAULT_SETTINGS
  // which is 'visible' (we want new users to see QuickFixes happening).
  if (savedData && !savedData._migrated_v1_23_0_startup_notice) {
    // `=== false` is a user-explicit choice (the default is true).
    // Anything else (true / undefined) follows defaults → 'visible'.
    const hadExplicitOptOut = savedData.startupCheck === false;
    settings.startupCheckNoticeLevel = hadExplicitOptOut ? 'silent' : 'visible';
    settings.startupCheck = true;  // Pin permanently on.
    settings._migrated_v1_23_0_startup_notice = true;
    applied.push('v1.23.0-startup-notice');
  }

  // v1.25.3 #182 migration: move the legacy plaintext `apiKey` out of
  // data.json into Obsidian SecretStorage. Pure-function side: detect,
  // stash the plaintext on a transient field, clear the plaintext in
  // `settings`, mark the migration done. The actual SecretStorage
  // write happens in `main.ts loadSettings` after this helper returns
  // — applySettingsMigrations must stay pure (no IO).
  //
  // Idempotency: `_migrated_v1_25_3_secret_storage` is set on the
  // returned settings object, then persisted to data.json via
  // saveData(). On the next load, the flag suppresses re-runs even
  // if the SecretStorage write failed (failed-write → empty secretId
  // slot, user re-prompts; the helper still treats this as "done"
  // because the data.json side is settled).
  if (savedData && !savedData._migrated_v1_25_3_secret_storage) {
    const legacy = typeof savedData.apiKey === 'string' ? savedData.apiKey.trim() : '';
    if (legacy.length > 0) {
      // Stash for main.ts to read. NOT a settings field — main.ts is
      // expected to delete this after the SecretStorage write succeeds.
      (settings as unknown as { _legacyApiKeyForSecretStorage?: string })._legacyApiKeyForSecretStorage = legacy;
      settings.apiKey = '';
      applied.push('v1.25.3-secret-storage');
    }
    // Mark even when no plaintext exists, so the helper's behavior is
    // deterministic across all v1.25.3+ loads.
    settings._migrated_v1_25_3_secret_storage = true;
  }

  return { settings, applied };
}
