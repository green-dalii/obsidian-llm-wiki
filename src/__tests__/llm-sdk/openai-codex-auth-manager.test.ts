import { describe, expect, it, vi } from 'vitest';
import { CodexAuthManager } from '../../llm-sdk/openai-codex/auth-manager';
import type { CodexCredential } from '../../llm-sdk/openai-codex/types';
import { expiredCredential, freshCredential, memoryCredentialStore } from './openai-codex-test-helpers';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve = (_value: T): void => undefined;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function statusError(status: number): Error & { status: number } {
  return Object.assign(new Error(`refresh failed: ${status}`), { status });
}

describe('CodexAuthManager', () => {
  it('returns a fresh access token without refreshing', async () => {
    const store = memoryCredentialStore(freshCredential());
    const refresh = vi.fn<(credential: CodexCredential) => Promise<CodexCredential>>();
    const manager = new CodexAuthManager({ store, refresh, now: () => 1000 });
    await expect(manager.getAccess()).resolves.toEqual({ accessToken: 'access', accountId: 'acct-1' });
    expect(refresh).not.toHaveBeenCalled();
  });
  it('refreshes an access token near expiry', async () => {
    const store = memoryCredentialStore(expiredCredential());
    const refresh = vi.fn(async () => freshCredential('rotated'));
    const manager = new CodexAuthManager({ store, refresh, now: () => 5000 });
    await expect(manager.getAccess()).resolves.toEqual({ accessToken: 'access', accountId: 'acct-1' });
    expect(refresh).toHaveBeenCalledOnce();
    expect(store.load()?.refreshToken).toBe('rotated');
  });
  it('single-flights concurrent refresh and persists token rotation', async () => {
    const store = memoryCredentialStore(expiredCredential());
    const pending = deferred<CodexCredential>();
    const refresh = vi.fn(() => pending.promise);
    const manager = new CodexAuthManager({ store, refresh, now: () => 5000 });
    const first = manager.getAccess();
    const second = manager.getAccess();
    pending.resolve({ ...freshCredential('new-refresh'), accessToken: 'new-access' });
    await expect(Promise.all([first, second])).resolves.toEqual([{ accessToken: 'new-access', accountId: 'acct-1' }, { accessToken: 'new-access', accountId: 'acct-1' }]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(store.load()?.refreshToken).toBe('new-refresh');
  });
  it('starts a credential-scoped refresh when a new login replaces an in-flight refresh', async () => {
    const credentialA = { ...freshCredential('refresh-a'), accessToken: 'access-a', expiresAt: 1 };
    const credentialB = { ...freshCredential('refresh-b'), accessToken: 'access-b' };
    const refreshedB = { ...freshCredential('refresh-b-rotated'), accessToken: 'access-b-refreshed' };
    const pendingA = deferred<CodexCredential>();
    const refresh = vi.fn((credential: CodexCredential) => credential.accessToken === 'access-a' ? pendingA.promise : Promise.resolve(refreshedB));
    const store = memoryCredentialStore(credentialA);
    const manager = new CodexAuthManager({ store, refresh, browserLogin: async () => credentialB, now: () => 5000 });
    const oldAccess = manager.getAccess();
    const oldRejection = expect(oldAccess).rejects.toThrow('ChatGPT sign-in required');
    await manager.loginWithBrowser();
    const retry = manager.refreshAfterUnauthorized('access-b', 401);
    pendingA.resolve({ ...credentialA, expiresAt: 3605000 });
    await oldRejection;
    await expect(retry).resolves.toEqual({ accessToken: 'access-b-refreshed', accountId: 'acct-1' });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(store.load()?.refreshToken).toBe('refresh-b-rotated');
  });
  it('suppresses refresh for an unauthorized stale bearer', async () => {
    const store = memoryCredentialStore({ ...freshCredential(), accessToken: 'new-access' });
    const refresh = vi.fn<(credential: CodexCredential) => Promise<CodexCredential>>();
    const manager = new CodexAuthManager({ store, refresh, now: () => 1000 });
    await expect(manager.refreshAfterUnauthorized('old-access', 401)).resolves.toEqual({ accessToken: 'new-access', accountId: 'acct-1' });
    expect(refresh).not.toHaveBeenCalled();
  });
  it('does not clear credentials for quota errors', async () => {
    const store = memoryCredentialStore(freshCredential('refresh'));
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), now: () => 1000 });
    await expect(manager.refreshAfterUnauthorized('access', 429)).rejects.toThrow('quota');
    expect(store.hasCredential()).toBe(true);
  });
  it.each([401, 403])('clears credentials when refresh fails with status %s', async (status) => {
    const store = memoryCredentialStore(freshCredential());
    const refresh = vi.fn().mockRejectedValue(statusError(status));
    const manager = new CodexAuthManager({ store, refresh, now: () => 1000 });
    await expect(manager.refreshAfterUnauthorized('access', 401)).rejects.toThrow(`refresh failed: ${status}`);
    expect(store.hasCredential()).toBe(false);
  });
  it('allows browser reauthentication to complete after the old refresh credential is rejected', async () => {
    const store = memoryCredentialStore(freshCredential());
    const browser = deferred<CodexCredential>();
    const manager = new CodexAuthManager({ store, refresh: async () => { throw statusError(401); }, browserLogin: () => browser.promise });
    const login = manager.loginWithBrowser();
    await expect(manager.refreshAfterUnauthorized('access', 401)).rejects.toThrow('refresh failed: 401');
    browser.resolve({ ...freshCredential('new-browser-refresh'), accessToken: 'new-browser-access' });
    await expect(login).resolves.toMatchObject({ accessToken: 'new-browser-access', refreshToken: 'new-browser-refresh' });
    expect(store.load()?.accessToken).toBe('new-browser-access');
  });
  it('allows device reauthentication to complete after the old refresh credential is rejected', async () => {
    const store = memoryCredentialStore(freshCredential());
    const device = deferred<CodexCredential>();
    const manager = new CodexAuthManager({ store, refresh: async () => { throw statusError(403); }, requestDeviceAuthorization: async () => ({ deviceAuthId: 'device', userCode: 'CODE', intervalMs: 1000 }), completeDeviceLogin: () => device.promise });
    const prompt = await manager.loginWithDeviceCode();
    await expect(manager.refreshAfterUnauthorized('access', 401)).rejects.toThrow('refresh failed: 403');
    device.resolve({ ...freshCredential('new-device-refresh'), accessToken: 'new-device-access' });
    await expect(prompt.complete).resolves.toMatchObject({ accessToken: 'new-device-access', refreshToken: 'new-device-refresh' });
    expect(store.load()?.accessToken).toBe('new-device-access');
  });
  it('persists browser login credentials', async () => {
    const store = memoryCredentialStore();
    const browserLogin = vi.fn(async () => freshCredential('browser-refresh'));
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), browserLogin });
    await expect(manager.loginWithBrowser()).resolves.toEqual(freshCredential('browser-refresh'));
    expect(store.load()?.refreshToken).toBe('browser-refresh');
  });
  it('rejects concurrent login attempts without cancelling the active login', async () => {
    const store = memoryCredentialStore();
    const browser = deferred<CodexCredential>();
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), browserLogin: () => browser.promise });
    const first = manager.loginWithBrowser();
    await expect(manager.loginWithDeviceCode()).rejects.toThrow('Codex authorization is already in progress');
    browser.resolve(freshCredential('browser-refresh'));
    await expect(first).resolves.toEqual(freshCredential('browser-refresh'));
  });
  it('returns a cancellable device login prompt and persists completion', async () => {
    const store = memoryCredentialStore();
    const authorization = { deviceAuthId: 'device', userCode: 'ABCD-EFGH', intervalMs: 1000 };
    const requestDeviceAuthorization = vi.fn(async () => authorization);
    const completeDeviceLogin = vi.fn(async () => freshCredential('device-refresh'));
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), requestDeviceAuthorization, completeDeviceLogin });
    const prompt = await manager.loginWithDeviceCode();
    expect(prompt.verificationUrl).toBe('https://auth.openai.com/codex/device');
    expect(prompt.userCode).toBe('ABCD-EFGH');
    await expect(prompt.complete).resolves.toEqual(freshCredential('device-refresh'));
    expect(store.load()?.refreshToken).toBe('device-refresh');
    expect(completeDeviceLogin).toHaveBeenCalledWith(authorization, expect.any(AbortSignal));
  });
  it('cancels device login without clearing an existing credential', async () => {
    const store = memoryCredentialStore(freshCredential());
    const completeDeviceLogin = vi.fn((_authorization: { deviceAuthId: string; userCode: string; intervalMs: number }, signal: AbortSignal) => new Promise<CodexCredential>((_resolve, reject) => { signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }); }));
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), requestDeviceAuthorization: async () => ({ deviceAuthId: 'device', userCode: 'CODE', intervalMs: 1000 }), completeDeviceLogin });
    const prompt = await manager.loginWithDeviceCode();
    prompt.cancel();
    await expect(prompt.complete).rejects.toMatchObject({ name: 'AbortError' });
    expect(store.hasCredential()).toBe(true);
  });
  it('signs out and cancels an active browser login', async () => {
    const store = memoryCredentialStore(freshCredential());
    const browserLogin = vi.fn((signal: AbortSignal) => new Promise<CodexCredential>((_resolve, reject) => { signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }); }));
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), browserLogin });
    const login = manager.loginWithBrowser();
    manager.signOut();
    await expect(login).rejects.toMatchObject({ name: 'AbortError' });
    expect(store.hasCredential()).toBe(false);
  });
  it('dispose cancels an active login without clearing credentials', async () => {
    const store = memoryCredentialStore(freshCredential());
    const browserLogin = vi.fn((signal: AbortSignal) => new Promise<CodexCredential>((_resolve, reject) => { signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }); }));
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), browserLogin });
    const login = manager.loginWithBrowser();
    manager.dispose();
    await expect(login).rejects.toMatchObject({ name: 'AbortError' });
    expect(store.hasCredential()).toBe(true);
  });
  it('dispose aborts the underlying device user-code request without clearing credentials', async () => {
    const store = memoryCredentialStore(freshCredential());
    let requestAborted = false;
    const requestDeviceAuthorization = (signal: AbortSignal): Promise<never> => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => { requestAborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true }); });
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), requestDeviceAuthorization, completeDeviceLogin: vi.fn() });
    const login = manager.loginWithDeviceCode();
    manager.dispose();
    await expect(login).rejects.toMatchObject({ name: 'AbortError' });
    expect(requestAborted).toBe(true);
    expect(store.hasCredential()).toBe(true);
  }, 100);
  it('sign-out aborts the underlying device user-code request and clears credentials', async () => {
    const store = memoryCredentialStore(freshCredential());
    let requestAborted = false;
    const requestDeviceAuthorization = (signal: AbortSignal): Promise<never> => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => { requestAborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true }); });
    const manager = new CodexAuthManager({ store, refresh: vi.fn(), requestDeviceAuthorization, completeDeviceLogin: vi.fn() });
    const login = manager.loginWithDeviceCode();
    manager.signOut();
    await expect(login).rejects.toMatchObject({ name: 'AbortError' });
    expect(requestAborted).toBe(true);
    expect(store.hasCredential()).toBe(false);
  }, 100);
  });
