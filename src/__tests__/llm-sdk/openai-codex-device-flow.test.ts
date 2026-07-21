import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeDeviceAuthorization, requestDeviceCode } from '../../llm-sdk/openai-codex/device-flow';
import { CODEX_OAUTH_CLIENT_ID, CODEX_TOKEN_URL } from '../../llm-sdk/openai-codex/constants';
import type { FetchLike } from '../../llm-sdk/openai-codex/types';
import { jwt } from './openai-codex-test-helpers';

const authorization = { deviceAuthId: 'dev-1', userCode: 'ABCD-EFGH', intervalMs: 1000 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function tokenResponse(accountId = 'acct-1'): Response {
  return jsonResponse({ access_token: 'opaque-access', refresh_token: 'refresh', expires_in: 3600, id_token: jwt(accountId) });
}

function stringBody(init: RequestInit | undefined): string {
  if (typeof init?.body !== 'string') throw new Error('Expected a string request body');
  return init.body;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Codex device flow', () => {
  it('requests a user code and uses the server polling interval', async () => {
    const fetchFn = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ device_auth_id: 'dev-1', user_code: 'ABCD-EFGH', interval: '5' }));
    await expect(requestDeviceCode(fetchFn)).resolves.toEqual({ deviceAuthId: 'dev-1', userCode: 'ABCD-EFGH', intervalMs: 5000 });
    expect(fetchFn).toHaveBeenCalledWith('https://auth.openai.com/api/accounts/deviceauth/usercode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CODEX_OAUTH_CLIENT_ID }) });
  });

  it('passes cancellation to the underlying user-code request', async () => {
    const controller = new AbortController();
    let fetchAborted = false;
    const fetchFn = vi.fn<FetchLike>().mockImplementation((_url, init) => {
      if (!init?.signal) throw new Error('Missing user-code abort signal');
      return new Promise<Response>((_resolve, reject) => { init.signal?.addEventListener('abort', () => { fetchAborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true }); });
    });
    const pending = requestDeviceCode(fetchFn, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchAborted).toBe(true);
  });

  it('rejects a failed or malformed user-code response', async () => {
    const denied = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ error: 'denied' }, 401));
    const malformed = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ device_auth_id: 'dev-1', user_code: 'ABCD', interval: 0 }));
    await expect(requestDeviceCode(denied)).rejects.toThrow('Device authorization failed: 401');
    await expect(requestDeviceCode(malformed)).rejects.toThrow('Invalid device authorization response');
  });

  it('polls a pending response and exchanges the authorization code', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<FetchLike>().mockResolvedValueOnce(new Response('', { status: 403 })).mockResolvedValueOnce(jsonResponse({ authorization_code: 'code', code_verifier: 'verifier' })).mockResolvedValueOnce(tokenResponse());
    const pending = completeDeviceAuthorization({ fetchFn, authorization, signal: new AbortController().signal, now: () => 1000 });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual({ accessToken: 'opaque-access', refreshToken: 'refresh', accountId: 'acct-1', expiresAt: 3601000, idToken: jwt('acct-1') });
    const [pollUrl, pollInit] = fetchFn.mock.calls[1];
    expect(pollUrl).toBe('https://auth.openai.com/api/accounts/deviceauth/token');
    expect(JSON.parse(stringBody(pollInit))).toEqual({ device_auth_id: 'dev-1', user_code: 'ABCD-EFGH' });
    const [tokenUrl, tokenInit] = fetchFn.mock.calls[2];
    expect(tokenUrl).toBe(CODEX_TOKEN_URL);
    expect(new URLSearchParams(stringBody(tokenInit))).toEqual(new URLSearchParams({ grant_type: 'authorization_code', client_id: CODEX_OAUTH_CLIENT_ID, code: 'code', redirect_uri: 'https://auth.openai.com/deviceauth/callback', code_verifier: 'verifier' }));
  });

  it('treats both 403 and 404 polling responses as pending', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<FetchLike>().mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(new Response('', { status: 403 })).mockResolvedValueOnce(jsonResponse({ authorization_code: 'code', code_verifier: 'verifier' })).mockResolvedValueOnce(tokenResponse());
    const pending = completeDeviceAuthorization({ fetchFn, authorization });
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toMatchObject({ accountId: 'acct-1' });
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('rejects a denial response without exchanging a token', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ error: 'access_denied' }, 400));
    const pending = completeDeviceAuthorization({ fetchFn, authorization });
    const rejection = expect(pending).rejects.toThrow('Device authorization failed: 400');
    await vi.advanceTimersByTimeAsync(1000);
    await rejection;
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('stops immediately when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchFn = vi.fn<FetchLike>();
    await expect(completeDeviceAuthorization({ fetchFn, authorization, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('stops a pending wait when its signal aborts', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchFn = vi.fn<FetchLike>();
    const pending = completeDeviceAuthorization({ fetchFn, authorization, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('stops an in-flight poll when fetch ignores its abort signal', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchFn = vi.fn<FetchLike>().mockImplementation(() => new Promise<Response>(() => undefined));
    const pending = completeDeviceAuthorization({ fetchFn, authorization, signal: controller.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    controller.abort();
    await rejection;
  });

  it('stops an in-flight token exchange when fetch ignores its abort signal', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchFn = vi.fn<FetchLike>().mockResolvedValueOnce(jsonResponse({ authorization_code: 'code', code_verifier: 'verifier' })).mockImplementationOnce(() => new Promise<Response>(() => undefined));
    const pending = completeDeviceAuthorization({ fetchFn, authorization, signal: controller.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    controller.abort();
    await rejection;
  });

  it('stops in-flight token response parsing when its signal aborts', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const token = tokenResponse();
    vi.spyOn(token, 'json').mockImplementation(() => new Promise<unknown>(() => undefined));
    const fetchFn = vi.fn<FetchLike>().mockResolvedValueOnce(jsonResponse({ authorization_code: 'code', code_verifier: 'verifier' })).mockResolvedValueOnce(token);
    const pending = completeDeviceAuthorization({ fetchFn, authorization, signal: controller.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    controller.abort();
    await rejection;
  });

  it('rejects malformed poll and token responses', async () => {
    vi.useFakeTimers();
    const malformedPoll = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ authorization_code: 'code' }));
    const pollPending = completeDeviceAuthorization({ fetchFn: malformedPoll, authorization });
    const pollRejection = expect(pollPending).rejects.toThrow('Invalid device authorization response');
    await vi.advanceTimersByTimeAsync(1000);
    await pollRejection;
    const malformedToken = vi.fn<FetchLike>().mockResolvedValueOnce(jsonResponse({ authorization_code: 'code', code_verifier: 'verifier' })).mockResolvedValueOnce(jsonResponse({ access_token: 'not-a-jwt', refresh_token: 'refresh', expires_in: 3600 }));
    const tokenPending = completeDeviceAuthorization({ fetchFn: malformedToken, authorization });
    const tokenRejection = expect(tokenPending).rejects.toThrow('Token response missing account id');
    await vi.advanceTimersByTimeAsync(1000);
    await tokenRejection;
  });

  it('rejects a failed token exchange', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<FetchLike>().mockResolvedValueOnce(jsonResponse({ authorization_code: 'code', code_verifier: 'verifier' })).mockResolvedValueOnce(jsonResponse({ error: 'invalid_grant' }, 401));
    const pending = completeDeviceAuthorization({ fetchFn, authorization });
    const rejection = expect(pending).rejects.toThrow('Token exchange failed: 401');
    await vi.advanceTimersByTimeAsync(1000);
    await rejection;
  });

  it('times out after 15 minutes of pending responses', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<FetchLike>().mockResolvedValue(new Response('', { status: 403 }));
    const pending = completeDeviceAuthorization({ fetchFn, authorization: { ...authorization, intervalMs: 300000 } });
    const rejection = expect(pending).rejects.toThrow('Device authorization timed out');
    await vi.advanceTimersByTimeAsync(900000);
    await rejection;
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('times out while a polling fetch never resolves', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<FetchLike>().mockImplementation(() => new Promise<Response>(() => undefined));
    const pending = completeDeviceAuthorization({ fetchFn, authorization: { ...authorization, intervalMs: 899000 } });
    const rejection = expect(pending).rejects.toThrow('Device authorization timed out');
    await vi.advanceTimersByTimeAsync(900000);
    await rejection;
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('aborts an in-flight poll when the 15-minute bound expires', async () => {
    vi.useFakeTimers();
    let fetchAborted = false;
    const fetchFn = vi.fn<FetchLike>((_url, init) => new Promise<Response>((_resolve, reject) => {
      if (!init?.signal) throw new Error('Missing device timeout signal');
      init.signal.addEventListener('abort', () => { fetchAborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    }));
    const pending = completeDeviceAuthorization({ fetchFn, authorization: { ...authorization, intervalMs: 899000 } });
    const rejection = expect(pending).rejects.toThrow('Device authorization timed out');
    await vi.advanceTimersByTimeAsync(900000);
    await rejection;
    expect(fetchAborted).toBe(true);
  });

  it('rejects a polling response that arrives after the deadline', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<FetchLike>().mockImplementation(() => new Promise<Response>((resolve) => window.setTimeout(() => resolve(jsonResponse({ authorization_code: 'code', code_verifier: 'verifier' })), 2000)));
    const pending = completeDeviceAuthorization({ fetchFn, authorization: { ...authorization, intervalMs: 899000 } });
    const rejection = expect(pending).rejects.toThrow('Device authorization timed out');
    await vi.advanceTimersByTimeAsync(901000);
    await rejection;
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
