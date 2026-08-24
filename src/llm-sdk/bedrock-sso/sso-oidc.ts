/**
 * #425 Bedrock Stage 2 — IAM Identity Center OIDC device flow.
 *
 * RegisterClient → StartDeviceAuthorization → (user approves in
 * browser) → CreateToken polling. All calls are UNSIGNED HTTPS POSTs to
 * the public `oidc.{region}.amazonaws.com` endpoints — plain OAuth, no
 * SigV4 involved. Polling/abort/deadline machinery mirrors the proven
 * openai-codex device-flow skeleton.
 */

import { BEDROCK_DEVICE_FLOW_TIMEOUT_MS, bedrockOidcBaseUrl } from './constants';

export interface RegisterClientResult {
  clientId: string;
  clientSecret: string;
}

export interface BedrockDeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  intervalMs: number;
  /** Epoch ms after which the device code is dead (now + expiresIn). */
  expiresAtMs: number;
}

export interface CompleteDeviceInput {
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  region: string;
  registration: RegisterClientResult;
  authorization: BedrockDeviceAuthorization;
  signal?: AbortSignal;
  now?: () => number;
}

export interface SsoTokenResult {
  accessToken: string;
  /** Epoch ms: caller now + expiresIn * 1000. */
  expiresAt: number;
}

/** RFC 8628 device grant for the AWS SSO profile flow. */
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

function abortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError');
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortError();
}

function requiredString(value: Record<string, unknown>, field: string, message: string): string {
  const candidate = value[field];
  if (typeof candidate !== 'string' || candidate.length === 0) throw new Error(message);
  return candidate;
}

async function responseJson(response: Response, message: string): Promise<Record<string, unknown>> {
  let input: unknown;
  try {
    input = await response.json();
  } catch {
    throw new Error(message);
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error(message);
  return input as Record<string, unknown>;
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

async function raceWithBounds<T>(
  operation: Promise<T>,
  signal: AbortSignal | undefined,
  deadlineAt: number,
  now: () => number,
  timeoutMessage: string,
): Promise<T> {
  throwIfAborted(signal);
  let timer: number | undefined;
  let removeAbortListener = (): void => undefined;
  // Contain the losing side: when the deadline/abort wins the race, the
  // still-pending operation settles later on its own — a bare rejection
  // here would register as an unhandled rejection.
  const guarded = operation.then(
    value => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  const cancellation = new Promise<never>((_resolve, reject) => {
    const abort = (): void => reject(abortError());
    removeAbortListener = (): void => signal?.removeEventListener('abort', abort);
    signal?.addEventListener('abort', abort, { once: true });
    const remainingMs = deadlineAt - now();
    if (remainingMs <= 0) {
      reject(new Error(timeoutMessage));
      return;
    }
    timer = window.setTimeout(() => reject(new Error(timeoutMessage)), remainingMs);
  });
  try {
    const raced = await Promise.race([guarded, cancellation]);
    if (!raced.ok) throw raced.error;
    return raced.value;
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
    removeAbortListener();
  }
}

async function postJson(
  fetchFn: CompleteDeviceInput['fetchFn'],
  url: string,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
): Promise<Response> {
  return fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * Step 1 — register a public OIDC client. v1 re-registers on every
 * login; the ~90-day registration validity buys nothing interactive.
 */
export async function registerClient(
  fetchFn: CompleteDeviceInput['fetchFn'],
  region: string,
  signal?: AbortSignal,
): Promise<RegisterClientResult> {
  throwIfAborted(signal);
  const message = 'Invalid RegisterClient response';
  const response = await postJson(fetchFn, `${bedrockOidcBaseUrl(region)}/client/register`, { clientName: 'obsidian-llm-wiki', clientType: 'public' }, signal);
  if (!response.ok) throw new Error(`RegisterClient failed: ${response.status}`);
  const value = await responseJson(response, message);
  return { clientId: requiredString(value, 'clientId', message), clientSecret: requiredString(value, 'clientSecret', message) };
}

/**
 * Step 2 — start the device authorization and hand back everything the
 * UI needs (user code, verification URL, poll interval, expiry).
 */
export async function startDeviceAuthorization(
  fetchFn: CompleteDeviceInput['fetchFn'],
  region: string,
  clientId: string,
  clientSecret: string,
  startUrl: string,
  signal?: AbortSignal,
  now: () => number = Date.now,
): Promise<BedrockDeviceAuthorization> {
  throwIfAborted(signal);
  const message = 'Invalid StartDeviceAuthorization response';
  const response = await postJson(
    fetchFn,
    `${bedrockOidcBaseUrl(region)}/device_authorization`,
    { clientId, clientSecret, startUrl },
    signal,
  );
  if (!response.ok) throw new Error(`StartDeviceAuthorization failed: ${response.status}`);
  const value = await responseJson(response, message);
  const intervalSeconds = typeof value.interval === 'number' ? value.interval : Number(value.interval);
  const expiresIn = typeof value.expiresIn === 'number' ? value.expiresIn : Number(value.expiresIn);
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0 || !Number.isFinite(expiresIn)) throw new Error(message);
  const result: BedrockDeviceAuthorization = {
    deviceCode: requiredString(value, 'deviceCode', message),
    userCode: requiredString(value, 'userCode', message),
    verificationUri: requiredString(value, 'verificationUri', message),
    intervalMs: intervalSeconds * 1000,
    expiresAtMs: now() + expiresIn * 1000,
  };
  if (typeof value.verificationUriComplete === 'string' && value.verificationUriComplete.length > 0) {
    result.verificationUriComplete = value.verificationUriComplete;
  }
  return result;
}

/**
 * Step 3 — poll CreateToken until the user approves. authorization_pending
 * keeps polling at the server interval; slow_down adds five seconds per
 * RFC 8628 §3.5; expired_token / invalid_grant / access_denied fail hard.
 */
export async function completeDeviceAuthorization(input: CompleteDeviceInput): Promise<SsoTokenResult> {
  const { fetchFn, region, registration, authorization, signal } = input;
  const now = input.now ?? Date.now;
  const deadlineMessage = 'AWS SSO device authorization timed out';
  // Overall cap: whichever comes first, the device-code expiry or our floor.
  const deadlineAt = Math.min(authorization.expiresAtMs, now() + BEDROCK_DEVICE_FLOW_TIMEOUT_MS);
  let intervalMs = authorization.intervalMs;

  while (true) {
    const remainingMs = deadlineAt - now();
    if (remainingMs <= 0) throw new Error(deadlineMessage);
    await waitFor(Math.min(intervalMs, remainingMs), signal);
    if (now() >= deadlineAt) throw new Error(deadlineMessage);
    throwIfAborted(signal);

    const response = await raceWithBounds(
      postJson(fetchFn, `${bedrockOidcBaseUrl(region)}/token`, {
        clientId: registration.clientId,
        clientSecret: registration.clientSecret,
        deviceCode: authorization.deviceCode,
        grantType: DEVICE_GRANT,
      }, signal),
      signal,
      deadlineAt,
      now,
      deadlineMessage,
    );

    if (response.ok) {
      const value = await raceWithBounds(responseJson(response, 'Invalid CreateToken response'), signal, deadlineAt, now, deadlineMessage);
      const accessToken = requiredString(value, 'accessToken', 'Invalid CreateToken response');
      const expiresIn = typeof value.expiresIn === 'number' ? value.expiresIn : Number(value.expiresIn);
      if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('Invalid CreateToken response');
      return { accessToken, expiresAt: now() + expiresIn * 1000 };
    }

    const errorBody = await responseJson(response, `CreateToken failed: ${response.status}`).catch(() => {
      throw new Error(`CreateToken failed: ${response.status}`);
    });
    const awsError = typeof errorBody.error === 'string' ? errorBody.error : '';
    if (response.status === 400 && awsError === 'authorization_pending') continue;
    if (response.status === 400 && awsError === 'slow_down') {
      intervalMs += 5000;
      continue;
    }
    // expired_token | invalid_grant | invalid_client | access_denied | …
    throw new Error(awsError.length > 0 ? `AWS SSO sign-in failed: ${awsError}` : `CreateToken failed: ${response.status}`);
  }
}
