import type { CodexCredential, CodexCredentialStoreLike, SecretStorageLike } from './types';

function parseStoredCredential(input: unknown): CodexCredential | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (typeof value.accessToken !== 'string' || value.accessToken.length === 0) return null;
  if (typeof value.refreshToken !== 'string' || value.refreshToken.length === 0) return null;
  if (typeof value.accountId !== 'string' || value.accountId.length === 0) return null;
  if (typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt)) return null;
  if (value.idToken !== undefined && (typeof value.idToken !== 'string' || value.idToken.length === 0)) return null;
  const credential: CodexCredential = { accessToken: value.accessToken, refreshToken: value.refreshToken, accountId: value.accountId, expiresAt: value.expiresAt };
  if (typeof value.idToken === 'string') credential.idToken = value.idToken;
  return credential;
}

export class CodexCredentialStore implements CodexCredentialStoreLike {
  constructor(private readonly storage: SecretStorageLike, private readonly secretId: string) {}
  private loadRaw(): Record<string, unknown> | null {
    const raw = this.storage.getSecret(this.secretId);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  load(): CodexCredential | null {
    return parseStoredCredential(this.loadRaw());
  }
  save(credential: CodexCredential): void {
    const catalogAccountId = this.loadRaw()?.catalogAccountId;
    const stored = catalogAccountId === credential.accountId ? { ...credential, catalogAccountId } : credential;
    this.storage.setSecret(this.secretId, JSON.stringify(stored));
  }
  bindModelCatalog(accountId: string): void {
    const credential = this.load();
    if (!credential || credential.accountId !== accountId) throw new Error('Cannot bind model catalog to a different account');
    this.storage.setSecret(this.secretId, JSON.stringify({ ...credential, catalogAccountId: accountId }));
  }
  isModelCatalogBound(accountId: string): boolean {
    return this.loadRaw()?.catalogAccountId === accountId;
  }
  clear(): void {
    this.storage.setSecret(this.secretId, '');
  }
  hasCredential(): boolean {
    return this.load() !== null;
  }
}
