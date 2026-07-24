// v1.25.3 #182: Persistent API key storage via Obsidian SecretStorage
// (OS keychain). Mirrors CodexCredentialStore (openai-codex/credential-store.ts)
// but stores a single string rather than a structured credential object.
//
// Why this exists:
//   - Provider API keys previously lived in plain text inside data.json.
//     The user's vault often gets backed up to git/cloud-sync, which leaks
//     secrets. Obsidian's SecretStorage delegates to the OS credential
//     manager (macOS Keychain / Windows Credential Manager / Linux
//     Secret Service) and is encrypted at rest with hardware keys.
//   - One secretId across providers is enough: the user's *active*
//     provider is recorded in `settings.provider`. Switching providers
//     overwrites the same secret slot — only the most-recently-used
//     key needs to survive a restart in practice (LLM Wiki re-prompts
//     for a key when the slot is empty, same as before).

// Re-export Codex's SecretStorageLike so the contract lives in one place.
// Both this module and openai-codex/credential-store.ts use the same
// Obsidian App.secretStorage surface (`getSecret`/`setSecret`); aliasing
// keeps the two stores' signatures compatible without depending on the
// Codex OAuth module from this file (the import is type-only, so it is
// erased at runtime — no circular-dep risk at link time).
import type { SecretStorageLike } from './openai-codex/types';

/**
 * v1.25.3 #182: minimal storage primitive matching Obsidian's
 * `App.secretStorage` surface (`getSecret(id)` / `setSecret(id, value)`).
 * Aliased to Codex's `SecretStorageLike` to keep the two stores' type
 * contracts in sync without coupling at runtime.
 */
export type ProviderSecretStorage = SecretStorageLike;

/**
 * v1.25.3 #182: provider-API-key storage contract. Modeled on
 * `CodexCredentialStoreLike` — `load` returns the trimmed key or null,
 * `save` and `clear` are side-effecting, `hasKey` is the cheap probe.
 */
export interface ProviderSecretStoreLike {
  load(): string | null;
  save(key: string): void;
  clear(): void;
  hasKey(): boolean;
}

/**
 * v1.25.4 #339: typed error for SecretStorage platform failures
 * (Windows 10 Credential Manager locked / service unavailable / macOS
 * Keychain access denied / Linux Secret Service timeout). Surfaces as
 * a constructor so callers can `instanceof` without coupling to the
 * underlying OS error message, which varies by platform.
 */
export class ProviderSecretStorageError extends Error {
  constructor(public readonly cause: unknown, message = 'SecretStorage IO failed') {
    super(message);
    this.name = 'ProviderSecretStorageError';
  }
}

export class ProviderSecretStore implements ProviderSecretStoreLike {
  constructor(
    private readonly storage: ProviderSecretStorage,
    private readonly secretId: string,
  ) {}

  /**
   * Read the stored key, trim whitespace, and return null when nothing
   * is configured (null / empty / whitespace-only). Callers receive a
   * normalized value they can pass directly to the LLM SDK.
   *
   * v1.25.4 #339: swallows getSecret platform throws and returns null
   * so the resolver's existing "fall through to settings.apiKey" path
   * kicks in. We never want a transient Credential Manager error to
   * brick LLM initialization on the read path.
   */
  load(): string | null {
    let raw: string | null;
    try {
      raw = this.storage.getSecret(this.secretId);
    } catch {
      return null;
    }
    if (raw === null || raw === undefined) return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  /**
   * Persist a key. Whitespace-only or empty input is normalized to a
   * clear (matches `CodexCredentialStore.clear()` convention of writing
   * `''` to the secretId rather than deleting it — keeps the slot
   * registered with the OS credential manager).
   *
   * v1.25.4 #339: rethrows setSecret platform throws as
   * `ProviderSecretStorageError`. Silent-skip would drop the user-typed
   * key on the floor — the documented #339 failure mode. Callers must
   * decide whether to surface a Notice, retry, or refuse the save.
   */
  save(key: string): void {
    const trimmed = (key ?? '').trim();
    try {
      this.storage.setSecret(this.secretId, trimmed.length === 0 ? '' : trimmed);
    } catch (error: unknown) {
      throw wrapStorageError(error);
    }
  }

  /**
   * Erase the stored key. Writes an empty string to keep the secretId
   * slot registered with the OS credential manager — Obsidian's
   * SecretStorage doesn't expose a delete API, so empty-string is the
   * canonical "clear" (same convention as CodexCredentialStore).
   *
   * v1.25.4 #339: same throw contract as `save()`.
   */
  clear(): void {
    try {
      this.storage.setSecret(this.secretId, '');
    } catch (error: unknown) {
      throw wrapStorageError(error);
    }
  }

  hasKey(): boolean {
    return this.load() !== null;
  }
}

function wrapStorageError(cause: unknown): ProviderSecretStorageError {
  return new ProviderSecretStorageError(cause, cause instanceof Error ? cause.message : undefined);
}