// v1.25.3 #182: small helper that resolves the effective provider API
// key. Reads from Obsidian SecretStorage first (the new authoritative
// source), falls back to `settings.apiKey` for legacy data or test
// environments without a stubbed secretStorage.
//
// Why a helper instead of inline `getSecret(...) ?? settings.apiKey`
// at every call site:
//   - 7+ call sites need the same fallback chain — centralizing
//     avoids drift (one site forgets to trim, one forgets to handle
//     null, etc.)
//   - Tests can mock the helper instead of stubbing app.secretStorage
//     in every fixture
//   - Future migrations (e.g. per-provider secretIds) only need to
//     touch this one file

import type { ProviderSecretStorage } from './provider-secret-store';

/**
 * Minimal settings shape the resolver needs. Avoids pulling the full
 * LLMWikiSettings type so the helper can be reused by callers that
 * only know the relevant subset (tests, isolated modules).
 */
export interface ApiKeySettings {
  apiKey: string;
  providerApiKeySecretId: string;
}

/**
 * Resolve the effective provider API key.
 *
 * Order:
 *   1. SecretStorage.getSecret(providerApiKeySecretId) — trimmed,
 *      non-empty → returned as-is.
 *   2. settings.apiKey.trim() — legacy plaintext fallback. After
 *      the v1.25.3 migration this is normally '' but tests and
 *      un-migrated installs still rely on this path.
 *   3. '' — both sources empty; caller treats as "no key configured".
 *
 * @param settings - the LLMWikiSettings-like object (only `apiKey` and
 *   `providerApiKeySecretId` are read).
 * @param secretStorage - the live Obsidian SecretStorage, or null in
 *   environments where it's not available (some unit tests, server-side
 *   fixtures). When null, only the settings.apiKey fallback is used.
 */
export function resolveProviderApiKey(
  settings: ApiKeySettings,
  secretStorage: ProviderSecretStorage | null,
): string {
  if (secretStorage !== null) {
    try {
      const raw = secretStorage.getSecret(settings.providerApiKeySecretId);
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.length > 0) return trimmed;
      }
    } catch {
      // Obsidian's SecretStorage can throw on rare platform errors
      // (locked keychain, denied permission). Fall through to the
      // settings.apiKey fallback so the plugin keeps working in a
      // degraded mode rather than crashing loadSettings.
    }
  }
  return (settings.apiKey ?? '').trim();
}