// v1.22.1 #199: extract settings migration logic from main.ts so the
// historical migrations (and any future ones) can be unit-tested
// without standing up the full Plugin/App harness.
//
// The full migration table is the single source of truth for "what
// loadSettings does to savedData before it becomes `this.settings`".
// Keep the pure function append-only — never delete an old migration,
// because old data on disk may still be from that version.

import { DEFAULT_SETTINGS, type LLMWikiSettings } from '../types';

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

  return { settings, applied };
}