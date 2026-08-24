// BedrockAuthManager tests (#425): credential dispatch, caching with
// skew, single-flight dedupe, device-login orchestration, sign-out.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { BedrockAuthManager } from '../../llm-sdk/bedrock-sso/credential-manager';
import { BEDROCK_IAM_SECRET_ID, BEDROCK_SSO_SECRET_ID } from '../../llm-sdk/bedrock-sso/constants';
import { BedrockSsoExpiredError } from '../../llm-sdk/bedrock-sso/types';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  writable: true,
  value: webcrypto,
});

function memoryStorage(): Map<string, string> {
  return new Map<string, string>();
}

const START = 1_756_000_000_000; // fixed epoch ms
// Temp credentials expire 1 h out; skew is 2 min — inside that window
// the cache is still considered fresh.
const NOW = () => START;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeManager(overrides: Partial<{ storage: Map<string, string>; now: () => number; fetchFn: (url: string, init?: RequestInit) => Promise<Response> }> = {}) {
  const storage = overrides.storage ?? memoryStorage();
  const now = overrides.now ?? NOW;
  const fetchFn = overrides.fetchFn ?? vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
  const manager = new BedrockAuthManager({
    ssoSecretId: BEDROCK_SSO_SECRET_ID,
    iamSecretId: BEDROCK_IAM_SECRET_ID,
    secretStorage: {
      getSecret: (id: string) => storage.get(id) ?? null,
      setSecret: (id: string, value: string) => { storage.set(id, value); },
    },
    fetchFn,
    now,
  });
  return { manager, storage, fetchFn };
}

const SSO_CONFIG = { method: 'sso' as const, region: 'eu-central-1', accountId: '123456789012', roleName: 'PowerUserAccess' };

describe('BedrockAuthManager — IAM dispatch', () => {
  it('returns static keys from the IAM store', async () => {
    const { manager } = makeManager();
    manager.saveIamKeys({ accessKeyId: 'AKIA', secretAccessKey: 'sk' });
    await expect(manager.getCredentials({ method: 'iam', region: 'us-east-1' }))
      .resolves.toEqual({ accessKeyId: 'AKIA', secretAccessKey: 'sk' });
  });

  it('throws when IAM keys are absent', async () => {
    const { manager } = makeManager();
    await expect(manager.getCredentials({ method: 'iam', region: 'us-east-1' }))
      .rejects.toThrow('IAM access keys are not configured');
  });
});

describe('BedrockAuthManager — SSO dispatch and caching', () => {
  function seedSsoToken(storage: Map<string, string>, expiresAt: number): void {
    storage.set(BEDROCK_SSO_SECRET_ID, JSON.stringify({
      accessToken: 'sso-token', expiresAt, region: 'eu-central-1', startUrl: 'https://x/start',
    }));
  }

  function portalSuccess() {
    return vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({
      roleCredentials: { accessKeyId: 'ASIA-x', secretAccessKey: 'sk-x', sessionToken: 'st-x', expiration: START + 3600_000 },
    }));
  }

  it('throws the re-login error when no SSO token exists', async () => {
    const { manager } = makeManager();
    await expect(manager.getCredentials(SSO_CONFIG)).rejects.toBeInstanceOf(BedrockSsoExpiredError);
  });

  it('throws when the stored token is past its expiry minus skew', async () => {
    const storage = memoryStorage();
    seedSsoToken(storage, START + 60_000); // only 60 s left < 120 s skew
    const { manager } = makeManager({ storage });
    await expect(manager.getCredentials(SSO_CONFIG)).rejects.toBeInstanceOf(BedrockSsoExpiredError);
  });

  it('exchanges the token once and serves repeat calls from the cache', async () => {
    const storage = memoryStorage();
    seedSsoToken(storage, START + 8 * 3600_000);
    const fetchFn = portalSuccess();
    const { manager } = makeManager({ storage, fetchFn });
    const first = await manager.getCredentials(SSO_CONFIG);
    expect(first).toEqual({
      accessKeyId: 'ASIA-x',
      secretAccessKey: 'sk-x',
      sessionToken: 'st-x',
      expiration: START + 3600_000,
    });
    await manager.getCredentials(SSO_CONFIG);
    await manager.getCredentials(SSO_CONFIG);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url] = fetchFn.mock.calls[0];
    expect(String(url)).toContain('/federation/credentials');
  });

  it('refetches once the cached credentials cross the skew boundary', async () => {
    const storage = memoryStorage();
    seedSsoToken(storage, START + 8 * 3600_000);
    let t = START;
    const fetchFn = vi.fn(async () => jsonResponse({
      roleCredentials: { accessKeyId: 'ASIA-y', secretAccessKey: 'sk-y', expiration: t + 3600_000 },
    }));
    const { manager } = makeManager({ storage, fetchFn, now: () => t });
    await manager.getCredentials(SSO_CONFIG);
    t += 3600_000 - 120_000 - 1; // just before the skew boundary
    await manager.getCredentials(SSO_CONFIG);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    t += 2; // crosses it
    const refreshed = await manager.getCredentials(SSO_CONFIG);
    expect(refreshed.accessKeyId).toBe('ASIA-y');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent exchanges into one portal call', async () => {
    const storage = memoryStorage();
    seedSsoToken(storage, START + 8 * 3600_000);
    let release!: (value: Response) => void;
    const fetchFn = vi.fn(async () => new Promise<Response>(resolve => { release = resolve; }));
    const { manager } = makeManager({ storage, fetchFn });
    const first = manager.getCredentials(SSO_CONFIG);
    const second = manager.getCredentials(SSO_CONFIG);
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    release(jsonResponse({
      roleCredentials: { accessKeyId: 'ASIA-z', secretAccessKey: 'sk-z', expiration: START + 3600_000 },
    }));
    const [a, b] = await Promise.all([first, second]);
    expect(a.accessKeyId).toBe('ASIA-z');
    expect(b).toEqual(a);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('BedrockAuthManager — device login orchestration', () => {
  it('runs register → device_authorization → token poll and persists the token', async () => {
    // Fake timers must be installed BEFORE the login starts so every
    // poll wait is driven by the fake clock.
    vi.useFakeTimers();
    try {
      const storage = memoryStorage();
      let callIndex = 0;
      const fetchFn = vi.fn(async (url: string) => {
        callIndex += 1;
        if (url.endsWith('/client/register')) return jsonResponse({ clientId: 'cid', clientSecret: 'csec' });
        if (url.endsWith('/device_authorization')) {
          return jsonResponse({ deviceCode: 'dev', userCode: 'ABCD-EFGH', verificationUri: 'https://view.awsapps.com/start#/device', verificationUriComplete: 'https://view.awsapps.com/start#/device?user_code=ABCD-EFGH', expiresIn: 600, interval: 5 });
        }
        if (callIndex === 3) return jsonResponse({ error: 'authorization_pending' }, 400);
        return jsonResponse({ accessToken: 'new-sso-token', tokenType: 'Bearer', expiresIn: 28800 });
      });
      const { manager } = makeManager({ storage, fetchFn });
      const session = await manager.beginDeviceLogin('https://x/start', 'eu-central-1');
      expect(session.userCode).toBe('ABCD-EFGH');
      expect(session.verificationUriComplete).toContain('user_code=');
      const done = expect(session.complete).resolves.toMatchObject({ accessToken: 'new-sso-token' });
      await vi.advanceTimersByTimeAsync(10_000);
      await done;
      const persisted = JSON.parse(storage.get(BEDROCK_SSO_SECRET_ID)!);
      expect(persisted).toMatchObject({ accessToken: 'new-sso-token', startUrl: 'https://x/start' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('signOut clears both stores and the credential cache', async () => {
    const storage = memoryStorage();
    storage.set(BEDROCK_IAM_SECRET_ID, JSON.stringify({ accessKeyId: 'A', secretAccessKey: 'B' }));
    const { manager } = makeManager({ storage });
    expect(manager.hasIamKeys()).toBe(true);
    manager.signOut();
    expect(manager.hasIamKeys()).toBe(false);
    expect(manager.hasSsoToken()).toBe(false);
    expect(storage.get(BEDROCK_IAM_SECRET_ID)).toBe('');
  });
});
