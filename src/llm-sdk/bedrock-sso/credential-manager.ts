/**
 * #425 Bedrock Stage 2 — credential orchestration.
 *
 * One object the plugin owns (mirrors codexAuthManager): dispatches
 * between static IAM keys and the SSO path, caches temporary
 * credentials in memory (never persisted) with a 2-minute expiry skew,
 * dedupes concurrent exchanges, orchestrates the device login, and
 * clears everything on sign-out. A lapsed SSO token ALWAYS throws
 * BedrockSsoExpiredError — a re-login prompt, never a silent retry storm.
 */

import { BEDROCK_TEMP_CRED_SKEW_MS } from './constants';
import { BedrockIamCredentialStore } from './credential-store';
import { BedrockSsoCredentialStore } from './credential-store';
import type { SecretStorageLike } from '../openai-codex/types';
import {
  completeDeviceAuthorization,
  registerClient,
  startDeviceAuthorization,
} from './sso-oidc';
import { getRoleCredentials, listAccountRoles, listAccounts } from './role-credentials';
import { BedrockSsoExpiredError, type BedrockCredentials, type BedrockIamKeys } from './types';

export interface BedrockAuthManagerOptions {
  ssoSecretId: string;
  iamSecretId: string;
  secretStorage: SecretStorageLike;
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  now?: () => number;
}

export interface BedrockAuthConfig {
  method: 'api-key' | 'sso' | 'iam';
  region: string;
  accountId?: string;
  roleName?: string;
}

export interface DeviceLoginSession {
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  /** Resolves once CreateToken succeeds AND the token is persisted. */
  complete: Promise<{ accessToken: string; expiresAt: number }>;
  cancel(): void;
}

interface TempCredEntry extends BedrockCredentials {
  cachedExpiry: number;
}

function cacheKeyOf(ssoRegion: string, config: BedrockAuthConfig): string {
  return `${ssoRegion}|${config.accountId ?? ''}|${config.roleName ?? ''}`;
}

export class BedrockAuthManager {
  private readonly ssoStore: BedrockSsoCredentialStore;
  private readonly iamStore: BedrockIamCredentialStore;
  private readonly fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  private readonly now: () => number;
  /** Temporary credentials — memory only, keyed by account+role+region. */
  private readonly tempCredCache = new Map<string, TempCredEntry>();
  private readonly inFlight = new Map<string, Promise<BedrockCredentials>>();
  /** Mirror of the IAM store — avoids a SecretStorage read per request. */
  private iamKeyMirror: BedrockIamKeys | null = null;

  constructor(options: BedrockAuthManagerOptions) {
    this.ssoStore = new BedrockSsoCredentialStore(options.secretStorage, options.ssoSecretId);
    this.iamStore = new BedrockIamCredentialStore(options.secretStorage, options.iamSecretId);
    this.fetchFn = options.fetchFn;
    this.now = options.now ?? Date.now;
  }

  hasSsoToken(): boolean {
    return this.ssoStore.hasToken();
  }

  ssoTokenExpiry(): number | null {
    return this.ssoStore.load()?.expiresAt ?? null;
  }

  hasIamKeys(): boolean {
    return this.iamStore.hasKeys();
  }

  saveIamKeys(keys: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }): void {
    this.iamStore.save(keys);
    this.iamKeyMirror = keys;
  }

  /** Wipes ONLY the static IAM keys — the SSO token is untouched. */
  clearIamKeys(): void {
    this.iamStore.clear();
    this.iamKeyMirror = null;
  }

  /**
   * Kick off the device flow. Returns the user-code payload for the UI
   * immediately; `complete` settles after CreateToken succeeds and the
   * token is persisted (and the temp-cred cache is invalidated).
   */
  async beginDeviceLogin(startUrl: string, region: string, signal?: AbortSignal): Promise<DeviceLoginSession> {
    const registration = await registerClient(this.fetchFn, region, signal);
    const authorization = await startDeviceAuthorization(
      this.fetchFn, region, registration.clientId, registration.clientSecret, startUrl, signal,
    );
    const controller = new AbortController();
    const abort = (): void => controller.abort(new DOMException('Cancelled', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });

    const complete = (async () => {
      try {
        const result = await completeDeviceAuthorization({
          fetchFn: this.fetchFn,
          region,
          registration,
          authorization,
          signal: controller.signal,
          now: this.now,
        });
        this.ssoStore.save({
          accessToken: result.accessToken,
          expiresAt: result.expiresAt,
          region,
          startUrl,
        });
        // Any cached credentials minted under the previous token are void.
        this.tempCredCache.clear();
        return result;
      } finally {
        signal?.removeEventListener('abort', abort);
      }
    })();

    return {
      userCode: authorization.userCode,
      verificationUri: authorization.verificationUri,
      ...(authorization.verificationUriComplete !== undefined && {
        verificationUriComplete: authorization.verificationUriComplete,
      }),
      complete,
      cancel: abort,
    };
  }

  async getCredentials(config: BedrockAuthConfig): Promise<BedrockCredentials> {
    if (config.method === 'api-key') {
      throw new Error('bedrockAuthMethod "api-key" never resolves AWS credentials');
    }
    if (config.method === 'iam') {
      if (this.iamKeyMirror) return { ...this.iamKeyMirror };
      const keys = this.iamStore.load();
      if (!keys) throw new Error('IAM access keys are not configured — enter them in Settings');
      // Mirror after the first read so the Gate-4 invariant "SecretStorage
      // reads only on auth actions" holds on this path too; saveIamKeys and
      // clearIamKeys keep the mirror fresh.
      this.iamKeyMirror = keys;
      return { ...keys };
    }

    const token = this.ssoStore.load();
    if (!token || token.expiresAt - this.now() <= BEDROCK_TEMP_CRED_SKEW_MS) {
      throw new BedrockSsoExpiredError();
    }
    // The credential exchange is homed in the Identity Center region
    // (persisted on the token at login), NOT the inference region. IdC
    // lives in exactly one region per org (AWS separates sso_region from
    // region for this reason): keying on config.region would break any org
    // whose IdC differs from its inference region, and a region-dropdown
    // switch after login would surface as a misleading "SSO expired" (401).
    const ssoRegion = token.region;
    const accountId = config.accountId ?? '';
    const roleName = config.roleName ?? '';
    if (accountId.length === 0 || roleName.length === 0) {
      throw new Error('AWS SSO needs an Account ID and Role Name in Settings');
    }

    const key = cacheKeyOf(ssoRegion, config);
    const cached = this.tempCredCache.get(key);
    if (cached && cached.cachedExpiry - this.now() > BEDROCK_TEMP_CRED_SKEW_MS) {
      return { ...cached };
    }
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const exchange = getRoleCredentials(
      this.fetchFn, ssoRegion, token.accessToken, accountId, roleName,
    )
      .then(creds => {
        // Cache against the portal-reported expiry when present,
        // otherwise assume the standard 1 h temporary lifetime.
        const cachedExpiry = typeof creds.expiration === 'number'
          ? creds.expiration
          : this.now() + 3600_000;
        this.tempCredCache.set(key, { ...creds, cachedExpiry });
        return creds;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, exchange);
    return exchange;
  }

  /**
   * Post-login discovery for the UI prefill: resolves ONLY when exactly
   * one account and one role are visible to the token — any ambiguity
   * returns null so manual entry stays authoritative. Never throws.
   */
  async discoverAccountRole(): Promise<{ accountId: string; roleName: string } | null> {
    try {
      const token = this.ssoStore.load();
      if (!token || token.expiresAt - this.now() <= BEDROCK_TEMP_CRED_SKEW_MS) return null;
      const accounts = await listAccounts(this.fetchFn, token.region, token.accessToken);
      if (accounts.length !== 1) return null;
      const roles = await listAccountRoles(this.fetchFn, token.region, token.accessToken, accounts[0].accountId);
      if (roles.length !== 1) return null;
      return { accountId: accounts[0].accountId, roleName: roles[0] };
    } catch {
      // Discovery is best-effort sugar; failures fall back to manual input.
      return null;
    }
  }

  /**
   * SSO sign-out (the Settings SSO-section button): wipes ONLY the SSO
   * token and the temp-credential cache. Static IAM keys are a separate
   * auth path with their own Clear button (clearIamKeys) — destroying them
   * here would silently lock out a user who configured both modes.
   */
  signOut(): void {
    this.ssoStore.clear();
    this.tempCredCache.clear();
  }

  /**
   * Plugin-unload cleanup: drops in-memory state ONLY — the persisted
   * SSO token and IAM keys survive so the user stays signed in across
   * Obsidian restarts. Never confuse with signOut().
   */
  dispose(): void {
    this.tempCredCache.clear();
    this.inFlight.clear();
    this.iamKeyMirror = null;
  }
}
