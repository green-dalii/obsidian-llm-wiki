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

export class ProviderSecretStore implements ProviderSecretStoreLike {
  constructor(
    private readonly storage: ProviderSecretStorage,
    private readonly secretId: string,
  ) {}

  /**
   * Read the stored key, trim whitespace, and return null when nothing
   * is configured (null / empty / whitespace-only). Callers receive a
   * normalized value they can pass directly to the LLM SDK.
   */
  load(): string | null {
    const raw = this.storage.getSecret(this.secretId);
    if (raw === null || raw === undefined) return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  /**
   * Persist a key. Whitespace-only or empty input is normalized to a
   * clear (matches `CodexCredentialStore.clear()` convention of writing
   * `''` to the secretId rather than deleting it — keeps the slot
   * registered with the OS credential manager).
   */
  save(key: string): void {
    const trimmed = (key ?? '').trim();
    if (trimmed.length === 0) {
      this.storage.setSecret(this.secretId, '');
      return;
    }
    this.storage.setSecret(this.secretId, trimmed);
  }

  /**
   * Erase the stored key. Writes an empty string to keep the secretId
   * slot registered with the OS credential manager — Obsidian's
   * SecretStorage doesn't expose a delete API, so empty-string is the
   * canonical "clear" (same convention as CodexCredentialStore).
   */
  clear(): void {
    this.storage.setSecret(this.secretId, '');
  }

  hasKey(): boolean {
    return this.load() !== null;
  }
}