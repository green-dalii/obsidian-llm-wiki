/**
 * #425 Bedrock Stage 2 — SecretStorage-backed credential stores.
 *
 * Two independent blobs (SSO session token / static IAM keys), same
 * validated-parse discipline as the codex credential store. Values live
 * ONLY in Obsidian SecretStorage — never in settings, data.json, logs
 * or Notices.
 */

// One-contract invariant (see provider-secret-store.ts): the storage
// surface is codex's SecretStorageLike re-exported ecosystem-wide.
import type { SecretStorageLike } from '../openai-codex/types';

import type { BedrockIamKeys, BedrockSsoToken } from './types';

function parseStoredObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function requireString(value: Record<string, unknown>, field: string): string | null {
  const candidate = value[field];
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
}

export class BedrockSsoCredentialStore {
  constructor(private readonly storage: SecretStorageLike, private readonly secretId: string) {}

  load(): BedrockSsoToken | null {
    const value = parseStoredObject(this.storage.getSecret(this.secretId));
    if (!value) return null;
    const accessToken = requireString(value, 'accessToken');
    const region = requireString(value, 'region');
    const startUrl = requireString(value, 'startUrl');
    if (!accessToken || !region || !startUrl) return null;
    if (typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt)) return null;
    return { accessToken, expiresAt: value.expiresAt, region, startUrl };
  }

  save(token: BedrockSsoToken): void {
    // Rebuild the object so unknown keys never survive a round-trip.
    this.storage.setSecret(this.secretId, JSON.stringify({
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      region: token.region,
      startUrl: token.startUrl,
    }));
  }

  clear(): void {
    this.storage.setSecret(this.secretId, '');
  }

  hasToken(): boolean {
    return this.load() !== null;
  }
}

export class BedrockIamCredentialStore {
  constructor(private readonly storage: SecretStorageLike, private readonly secretId: string) {}

  load(): BedrockIamKeys | null {
    const value = parseStoredObject(this.storage.getSecret(this.secretId));
    if (!value) return null;
    const accessKeyId = requireString(value, 'accessKeyId');
    const secretAccessKey = requireString(value, 'secretAccessKey');
    if (!accessKeyId || !secretAccessKey) return null;
    const sessionToken = requireString(value, 'sessionToken');
    return sessionToken ? { accessKeyId, secretAccessKey, sessionToken } : { accessKeyId, secretAccessKey };
  }

  save(keys: BedrockIamKeys): void {
    const stored: BedrockIamKeys = { accessKeyId: keys.accessKeyId, secretAccessKey: keys.secretAccessKey };
    if (keys.sessionToken) stored.sessionToken = keys.sessionToken;
    this.storage.setSecret(this.secretId, JSON.stringify(stored));
  }

  clear(): void {
    this.storage.setSecret(this.secretId, '');
  }

  hasKeys(): boolean {
    return this.load() !== null;
  }
}
