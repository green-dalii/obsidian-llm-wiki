import { extractTokenResponseAccountId, parseTokenResponse } from './auth-core';
import { CODEX_DEVICE_URL, CODEX_OAUTH_CLIENT_ID, CODEX_TOKEN_URL } from './constants';
import { completeDeviceAuthorization, requestDeviceCode } from './device-flow';
import { runLoopbackLogin } from './loopback-flow';
import type { DeviceAuthorization } from './device-flow';
import type { CodexAccess, CodexCredential, CodexCredentialStoreLike, FetchLike } from './types';

const ACCESS_EXPIRY_SKEW_MS = 120000;

type RefreshCredential = (credential: CodexCredential, signal?: AbortSignal) => Promise<CodexCredential>;
type BrowserLogin = (signal: AbortSignal) => Promise<CodexCredential>;
type RequestDeviceAuthorization = (signal: AbortSignal) => Promise<DeviceAuthorization>;
type CompleteDeviceLogin = (authorization: DeviceAuthorization, signal: AbortSignal) => Promise<CodexCredential>;

export interface CodexAuthManagerOptions {
  store: CodexCredentialStoreLike;
  refresh?: RefreshCredential;
  fetchFn?: FetchLike;
  openExternal?: (url: string) => void | Promise<void>;
  browserLogin?: BrowserLogin;
  requestDeviceAuthorization?: RequestDeviceAuthorization;
  completeDeviceLogin?: CompleteDeviceLogin;
  now?: () => number;
}

export interface DeviceLoginPrompt {
  verificationUrl: string;
  userCode: string;
  complete: Promise<CodexCredential>;
  cancel(): void;
}

class RefreshHttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Token refresh failed: ${status}`);
    this.name = 'RefreshHttpError';
    this.status = status;
  }
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError');
}

function accessFrom(credential: CodexCredential): CodexAccess {
  return { accessToken: credential.accessToken, accountId: credential.accountId };
}

function errorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid token response');
  }
}

function raceWithAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const finish = (): void => signal.removeEventListener('abort', onAbort);
    const onAbort = (): void => { finish(); reject(abortError()); };
    signal.addEventListener('abort', onAbort, { once: true });
    operation.then((value) => { finish(); resolve(value); }, (error: unknown) => { finish(); reject(error instanceof Error ? error : new Error('Codex OAuth operation failed')); });
  });
}

export class CodexAuthManager {
  private refreshOperation: { accessToken: string; refreshToken: string; promise: Promise<CodexCredential> } | null = null;
  private loginAbort: AbortController | null = null;
  private credentialGeneration = 0;
  private readonly now: () => number;
  constructor(private readonly options: CodexAuthManagerOptions) {
    this.now = options.now ?? Date.now;
  }
  hasCredential(): boolean {
    return this.options.store.hasCredential();
  }
  currentAccountId(): string | null {
    return this.options.store.load()?.accountId ?? null;
  }
  async getAccess(): Promise<CodexAccess> {
    const credential = this.options.store.load();
    if (!credential) throw new Error('ChatGPT sign-in required');
    const current = credential.expiresAt - this.now() > ACCESS_EXPIRY_SKEW_MS ? credential : await this.refresh(credential);
    return accessFrom(current);
  }
  async refreshAfterUnauthorized(failedBearer: string, status: number): Promise<CodexAccess> {
    if (status === 429) throw new Error('ChatGPT quota exceeded');
    if (status !== 401 && status !== 403) throw new Error(`ChatGPT request failed: ${status}`);
    const credential = this.options.store.load();
    if (!credential) throw new Error('ChatGPT sign-in required');
    if (credential.accessToken !== failedBearer) return accessFrom(credential);
    return accessFrom(await this.refresh(credential));
  }
  async loginWithBrowser(): Promise<CodexCredential> {
    const controller = this.startLogin();
    const generation = this.credentialGeneration;
    const login = this.options.browserLogin ?? ((signal: AbortSignal) => runLoopbackLogin({ fetchFn: this.requireFetch(), openExternal: this.requireOpenExternal(), signal, now: this.now }));
    try {
      const credential = await login(controller.signal);
      return this.completeLogin(credential, controller, generation);
    } finally {
      if (this.loginAbort === controller) this.loginAbort = null;
    }
  }
  async loginWithDeviceCode(): Promise<DeviceLoginPrompt> {
    const controller = this.startLogin();
    const generation = this.credentialGeneration;
    const requestAuthorization = this.options.requestDeviceAuthorization ?? ((signal: AbortSignal) => requestDeviceCode(this.requireFetch(), signal));
    try {
      const authorization = await raceWithAbort(requestAuthorization(controller.signal), controller.signal);
      if (controller.signal.aborted) throw abortError();
      const finish = this.options.completeDeviceLogin ?? ((value: DeviceAuthorization, signal: AbortSignal) => completeDeviceAuthorization({ fetchFn: this.requireFetch(), authorization: value, signal, now: this.now }));
      const complete = finish(authorization, controller.signal).then((credential) => this.completeLogin(credential, controller, generation)).finally(() => { if (this.loginAbort === controller) this.loginAbort = null; });
      return { verificationUrl: CODEX_DEVICE_URL, userCode: authorization.userCode, complete, cancel: () => { controller.abort(); if (this.loginAbort === controller) this.loginAbort = null; } };
    } catch (error) {
      if (this.loginAbort === controller) this.loginAbort = null;
      throw error;
    }
  }
  signOut(): void {
    this.cancelLogin();
    this.credentialGeneration += 1;
    this.options.store.clear();
  }
  dispose(): void {
    this.cancelLogin();
    this.credentialGeneration += 1;
  }
  private async refresh(credential: CodexCredential): Promise<CodexCredential> {
    const active = this.refreshOperation;
    if (active?.accessToken === credential.accessToken && active.refreshToken === credential.refreshToken) return active.promise;
    const generation = this.credentialGeneration;
    const operation = this.options.refresh ?? ((value: CodexCredential, signal?: AbortSignal) => this.refreshWithFetch(value, signal));
    const pending = operation(credential).then((next) => {
      const stored = this.options.store.load();
      if (generation !== this.credentialGeneration || !stored) throw new Error('ChatGPT sign-in required');
      if (stored.accessToken !== credential.accessToken || stored.refreshToken !== credential.refreshToken) return stored;
      this.options.store.save(next);
      return next;
    }).catch((error: unknown) => {
      const stored = this.options.store.load();
      const matches = stored?.accessToken === credential.accessToken && stored.refreshToken === credential.refreshToken;
      if (matches && generation === this.credentialGeneration && (errorStatus(error) === 401 || errorStatus(error) === 403)) {
        this.options.store.clear();
      }
      throw error;
    }).finally(() => { if (this.refreshOperation?.promise === pending) this.refreshOperation = null; });
    this.refreshOperation = { accessToken: credential.accessToken, refreshToken: credential.refreshToken, promise: pending };
    return pending;
  }
  private async refreshWithFetch(credential: CodexCredential, signal?: AbortSignal): Promise<CodexCredential> {
    const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: CODEX_OAUTH_CLIENT_ID, refresh_token: credential.refreshToken });
    const response = await this.requireFetch()(CODEX_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(), signal });
    if (!response.ok) throw new RefreshHttpError(response.status);
    const token = parseTokenResponse(await responseJson(response));
    const refreshed: CodexCredential = { accessToken: token.access_token, refreshToken: token.refresh_token, accountId: extractTokenResponseAccountId(token) ?? credential.accountId, expiresAt: this.now() + token.expires_in * 1000 };
    const idToken = token.id_token ?? credential.idToken;
    if (idToken !== undefined) refreshed.idToken = idToken;
    return refreshed;
  }
  private startLogin(): AbortController {
    if (this.loginAbort) throw new Error('Codex authorization is already in progress');
    const controller = new AbortController();
    this.loginAbort = controller;
    return controller;
  }
  private completeLogin(credential: CodexCredential, controller: AbortController, generation: number): CodexCredential {
    if (controller.signal.aborted || generation !== this.credentialGeneration) throw abortError();
    this.credentialGeneration += 1;
    this.options.store.save(credential);
    return credential;
  }
  private cancelLogin(): void {
    this.loginAbort?.abort();
    this.loginAbort = null;
  }
  private requireFetch(): FetchLike {
    if (!this.options.fetchFn) throw new Error('Codex OAuth fetch is not configured');
    return this.options.fetchFn;
  }
  private requireOpenExternal(): (url: string) => void | Promise<void> {
    if (!this.options.openExternal) throw new Error('Codex OAuth browser opener is not configured');
    return this.options.openExternal;
  }
}
