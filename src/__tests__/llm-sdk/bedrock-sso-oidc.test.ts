// IAM Identity Center OIDC device flow tests (#425).
//
// Response shapes follow the AWS sso-oidc REST-JSON API (RegisterClient,
// StartDeviceAuthorization, CreateToken). CreateToken error responses
// arrive as HTTP 400 + JSON body {"error": "authorization_pending" |
// "slow_down" | "expired_token" | "invalid_grant" | ...}. Polling
// machinery mirrors the proven codex device-flow skeleton (same fake
// timer technique as openai-codex-device-flow.test.ts).

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bedrockOidcBaseUrl,
} from '../../llm-sdk/bedrock-sso/constants';
import {
  completeDeviceAuthorization,
  registerClient,
  startDeviceAuthorization,
  type BedrockDeviceAuthorization,
} from '../../llm-sdk/bedrock-sso/sso-oidc';

const REGION = 'us-east-1';
const OIDC = bedrockOidcBaseUrl(REGION);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function stringBody(init: RequestInit | undefined): string {
  if (typeof init?.body !== 'string') throw new Error('Expected a string request body');
  return init.body;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('registerClient', () => {
  it('POSTs a public client registration and parses camelCase fields', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({ clientId: 'cid-1', clientSecret: 'csec-1', clientIdIssuedAt: 100, clientSecretExpiresAt: 100 + 90 * 86400 }),
    );
    await expect(registerClient(fetchFn, REGION)).resolves.toEqual({ clientId: 'cid-1', clientSecret: 'csec-1' });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${OIDC}/client/register`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(stringBody(init))).toEqual({ clientName: 'obsidian-llm-wiki', clientType: 'public' });
  });

  it('rejects a malformed registration response', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ clientId: 'cid-1' }));
    await expect(registerClient(fetchFn, REGION)).rejects.toThrow('Invalid RegisterClient response');
  });
});

describe('startDeviceAuthorization', () => {
  it('parses the device code payload (interval seconds → ms)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        deviceCode: 'dev-1',
        userCode: 'ABCD-EFGH',
        verificationUri: 'https://view.awsapps.com/start#/device',
        verificationUriComplete: 'https://view.awsapps.com/start#/device?user_code=ABCD-EFGH',
        expiresIn: 600,
        interval: 5,
      }),
    );
    const authorization: BedrockDeviceAuthorization = await startDeviceAuthorization(
      fetchFn, REGION, 'cid-1', 'csec-1', 'https://d-abc.awsapps.com/start',
    );
    expect(authorization.userCode).toBe('ABCD-EFGH');
    expect(authorization.intervalMs).toBe(5000);
    expect(authorization.verificationUriComplete).toContain('user_code=ABCD-EFGH');
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${OIDC}/device_authorization`);
    expect(JSON.parse(stringBody(init))).toEqual({
      clientId: 'cid-1', clientSecret: 'csec-1', startUrl: 'https://d-abc.awsapps.com/start',
    });
  });

  it('rejects a payload missing the user code', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ deviceCode: 'dev-1' }));
    await expect(startDeviceAuthorization(fetchFn, REGION, 'cid', 'csec', 'https://x/start'))
      .rejects.toThrow('Invalid StartDeviceAuthorization response');
  });
});

describe('completeDeviceAuthorization — CreateToken polling', () => {
  const registration = { clientId: 'cid-1', clientSecret: 'csec-1' };
  const authorization: BedrockDeviceAuthorization = {
    deviceCode: 'dev-1',
    userCode: 'ABCD-EFGH',
    verificationUri: 'https://view.awsapps.com/start#/device',
    intervalMs: 5000,
    expiresAtMs: Number.POSITIVE_INFINITY,
  };

  function tokenResponse(): Response {
    return jsonResponse({ accessToken: 'sso-token', tokenType: 'Bearer', expiresIn: 28800 });
  }

  it('polls through authorization_pending then succeeds', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authorization_pending' }, 400))
      .mockResolvedValueOnce(jsonResponse({ error: 'authorization_pending' }, 400))
      .mockResolvedValueOnce(tokenResponse());
    const pending = completeDeviceAuthorization({
      fetchFn, region: REGION, registration, authorization, now: () => 0,
    });
    await vi.advanceTimersByTimeAsync(15000);
    await expect(pending).resolves.toEqual({ accessToken: 'sso-token', expiresAt: 28800000 });
    // Three POSTs to /token with the device-code grant.
    expect(fetchFn).toHaveBeenCalledTimes(3);
    const [url, init] = fetchFn.mock.calls[2];
    expect(url).toBe(`${OIDC}/token`);
    expect(JSON.parse(stringBody(init))).toEqual({
      clientId: 'cid-1',
      clientSecret: 'csec-1',
      deviceCode: 'dev-1',
      grantType: 'urn:ietf:params:oauth:grant-type:device_code',
    });
  });

  it('backs off five extra seconds after slow_down', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'slow_down' }, 400))
      .mockResolvedValueOnce(tokenResponse());
    const pending = completeDeviceAuthorization({
      fetchFn, region: REGION, registration, authorization, now: () => 0,
    });
    // First poll fires at t=5000 and answers slow_down.
    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchFn).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    // Backed-off interval is 10s: a plain retry would fire at t=10000,
    // the RFC backoff only at t=15000.
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toMatchObject({ accessToken: 'sso-token' });
  });

  it('rejects hard errors without retrying', async () => {
    vi.useFakeTimers();
    for (const awsError of ['expired_token', 'invalid_grant']) {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: awsError }, 400));
      const pending = completeDeviceAuthorization({
        fetchFn, region: REGION, registration, authorization, now: () => 0,
      });
      await vi.advanceTimersByTimeAsync(5000); // first poll interval elapses
      await expect(pending).rejects.toThrow(awsError);
      expect(fetchFn).toHaveBeenCalledTimes(1); // no retry after a hard error
    }
  });

  it('rejects when the device code expires before approval', async () => {
    vi.useFakeTimers(); // Date.now is mocked and tracks the fake clock
    // expiresAtMs is an absolute epoch — derive it from the MOCKED clock.
    const expiring: BedrockDeviceAuthorization = { ...authorization, expiresAtMs: Date.now() + 600_000 };
    // Fresh Response per call — a Response body can be consumed once.
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'authorization_pending' }, 400));
    const pending = completeDeviceAuthorization({
      fetchFn, region: REGION, registration, authorization: expiring,
    });
    const rejection = expect(pending).rejects.toThrow('AWS SSO device authorization timed out');
    await vi.advanceTimersByTimeAsync(600_500);
    await rejection;
    expect(fetchFn.mock.calls.length).toBeGreaterThan(0);
  });

  it('propagates abort while waiting between polls', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: 'authorization_pending' }, 400));
    const pending = completeDeviceAuthorization({
      fetchFn, region: REGION, registration, authorization, signal: controller.signal, now: () => 0,
    });
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejection;
  });
});
