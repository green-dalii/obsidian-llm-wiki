import { extractTokenResponseAccountId, parseTokenResponse } from './auth-core';
import { CODEX_OAUTH_CLIENT_ID, CODEX_OAUTH_ISSUER, CODEX_TOKEN_URL } from './constants';
import type { CodexCredential, FetchLike } from './types';

const DEVICE_CALLBACK_URI = `${CODEX_OAUTH_ISSUER}/deviceauth/callback`;
const DEVICE_TIMEOUT_MS = 15 * 60 * 1000;

export interface DeviceAuthorization {
  deviceAuthId: string;
  userCode: string;
  intervalMs: number;
}

export interface CompleteDeviceAuthorizationInput {
  fetchFn: FetchLike;
  authorization: DeviceAuthorization;
  signal?: AbortSignal;
  now?: () => number;
}

interface DeviceAuthorizationCode {
  authorizationCode: string;
  codeVerifier: string;
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError');
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortError();
}

function requiredString(value: Record<string, unknown>, field: string): string {
  const candidate = value[field];
  if (typeof candidate !== 'string' || candidate.length === 0) throw new Error('Invalid device authorization response');
  return candidate;
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  let input: unknown;
  try {
    input = await response.json();
  } catch {
    throw new Error('Invalid device authorization response');
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error('Invalid device authorization response');
  return input as Record<string, unknown>;
}

async function tokenResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid token response');
  }
}

function parseDeviceAuthorization(value: Record<string, unknown>): DeviceAuthorization {
  const deviceAuthId = requiredString(value, 'device_auth_id');
  const userCode = requiredString(value, 'user_code');
  const intervalSeconds = typeof value.interval === 'string' && value.interval.trim().length > 0 ? Number(value.interval) : value.interval;
  if (typeof intervalSeconds !== 'number' || !Number.isFinite(intervalSeconds) || intervalSeconds <= 0) throw new Error('Invalid device authorization response');
  return { deviceAuthId, userCode, intervalMs: intervalSeconds * 1000 };
}

function parseAuthorizationCode(value: Record<string, unknown>): DeviceAuthorizationCode {
  return { authorizationCode: requiredString(value, 'authorization_code'), codeVerifier: requiredString(value, 'code_verifier') };
}

function waitFor(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = (): void => {
      window.clearTimeout(timer);
      reject(abortError());
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function raceWithBounds<T>(operation: Promise<T>, signal: AbortSignal | undefined, deadlineAt: number, now: () => number): Promise<T> {
  throwIfAborted(signal);
  let timer: number | undefined;
  let removeAbortListener = (): void => undefined;
  const cancellation = new Promise<never>((_resolve, reject) => {
    const abort = (): void => reject(abortError());
    removeAbortListener = (): void => signal?.removeEventListener('abort', abort);
    signal?.addEventListener('abort', abort, { once: true });
    const remainingMs = deadlineAt - now();
    if (remainingMs <= 0) {
      reject(new Error('Device authorization timed out'));
      return;
    }
    timer = window.setTimeout(() => reject(new Error('Device authorization timed out')), remainingMs);
  });
  try {
    return await Promise.race([operation, cancellation]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
    removeAbortListener();
  }
}

async function pollAuthorizationCode(input: CompleteDeviceAuthorizationInput, now: () => number, deadlineAt: number): Promise<DeviceAuthorizationCode> {
  while (true) {
    const remainingMs = deadlineAt - now();
    if (remainingMs <= 0) throw new Error('Device authorization timed out');
    await waitFor(Math.min(input.authorization.intervalMs, remainingMs), input.signal);
    if (now() >= deadlineAt) throw new Error('Device authorization timed out');
    throwIfAborted(input.signal);
    const response = await raceWithBounds(input.fetchFn(`${CODEX_OAUTH_ISSUER}/api/accounts/deviceauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_auth_id: input.authorization.deviceAuthId, user_code: input.authorization.userCode }), signal: input.signal }), input.signal, deadlineAt, now);
    if (response.status === 403 || response.status === 404) continue;
    if (!response.ok) throw new Error(`Device authorization failed: ${response.status}`);
    return parseAuthorizationCode(await raceWithBounds(responseJson(response), input.signal, deadlineAt, now));
  }
}

async function exchangeAuthorizationCode(input: CompleteDeviceAuthorizationInput, code: DeviceAuthorizationCode, now: () => number, deadlineAt: number): Promise<CodexCredential> {
  throwIfAborted(input.signal);
  const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: CODEX_OAUTH_CLIENT_ID, code: code.authorizationCode, redirect_uri: DEVICE_CALLBACK_URI, code_verifier: code.codeVerifier });
  const response = await raceWithBounds(input.fetchFn(CODEX_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(), signal: input.signal }), input.signal, deadlineAt, now);
  if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);
  const rawToken = await raceWithBounds(tokenResponseJson(response), input.signal, deadlineAt, now);
  const token = parseTokenResponse(rawToken);
  const accountId = extractTokenResponseAccountId(token);
  if (accountId === null) throw new Error('Token response missing account id');
  const credential: CodexCredential = { accessToken: token.access_token, refreshToken: token.refresh_token, accountId, expiresAt: now() + token.expires_in * 1000 };
  if (token.id_token !== undefined) credential.idToken = token.id_token;
  return credential;
}

export async function requestDeviceCode(fetchFn: FetchLike, signal?: AbortSignal): Promise<DeviceAuthorization> {
  throwIfAborted(signal);
  const response = await fetchFn(`${CODEX_OAUTH_ISSUER}/api/accounts/deviceauth/usercode`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CODEX_OAUTH_CLIENT_ID }), signal });
  if (!response.ok) throw new Error(`Device authorization failed: ${response.status}`);
  return parseDeviceAuthorization(await responseJson(response));
}

export async function completeDeviceAuthorization(input: CompleteDeviceAuthorizationInput): Promise<CodexCredential> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  if (input.signal?.aborted) controller.abort();
  else input.signal?.addEventListener('abort', abort, { once: true });
  const boundedInput: CompleteDeviceAuthorizationInput = { ...input, signal: controller.signal };
  const now = input.now ?? Date.now;
  try {
    throwIfAborted(controller.signal);
    const deadlineAt = now() + DEVICE_TIMEOUT_MS;
    const code = await pollAuthorizationCode(boundedInput, now, deadlineAt);
    return await exchangeAuthorizationCode(boundedInput, code, now, deadlineAt);
  } finally {
    controller.abort();
    input.signal?.removeEventListener('abort', abort);
  }
}
