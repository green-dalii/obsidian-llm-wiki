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
import { BedrockSsoCredentialStore, type SecretStorageLike } from './credential-store';
import {
  completeDeviceAuthorization,
  registerClient,
  startDeviceAuthorization,
} from './sso-oidc';
import { getRoleCredentials } from './role-credentials';
import { BedrockSsoExpiredError, type BedrockCredentials } from './types';

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

function cacheKeyOf(config: BedrockAuthConfig): string {
  return `${config.region}|${config.accountId ?? ''}|${config.roleName ?? ''}`;
}

export class BedrockAuthManager {
  private readonly ssoStore: BedrockSsoCredentialStore;
  private readonly iamStore: BedrockIamCredentialStore;
  private readonly fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  private readonly now: () => number;
  /** Temporary credentials — memory only, keyed by account+role+region. */
  private readonly tempCredCache = new Map<string, TempCredEntry>();
  private readonly inFlight = new Map<string, Promise<BedrockCredentials>>();

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
      const keys = this.iamStore.load();
      if (!keys) throw new Error('IAM access keys are not configured — enter them in Settings');
      return keys;
    }

    const token = this.ssoStore.load();
    if (!token || token.expiresAt - this.now() <= BEDROCK_TEMP_CRED_SKEW_MS) {
      throw new BedrockSsoExpiredError();
    }
    const accountId = config.accountId ?? '';
    const roleName = config.roleName ?? '';
    if (accountId.length === 0 || roleName.length === 0) {
      throw new Error('AWS SSO needs an Account ID and Role Name in Settings');
    }

    const key = cacheKeyOf(config);
    const cached = this.tempCredCache.get(key);
    if (cached && cached.cachedExpiry - this.now() > BEDROCK_TEMP_CRED_SKEW_MS) {
      return { ...cached };
    }
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const exchange = getRoleCredentials(
      this.fetchFn, config.region, token.accessToken, accountId, roleName,
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

  signOut(): void {
    this.ssoStore.clear();
    this.iamStore.clear();
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
  }
}
