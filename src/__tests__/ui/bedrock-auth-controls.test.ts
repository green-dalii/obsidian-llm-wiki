// Truth-table and flow tests for the Bedrock SSO UI controls (#425).

import { describe, expect, it, vi } from 'vitest';
import {
  copyBedrockUserCode,
  getBedrockAuthUiState,
  runBedrockDeviceAuth,
  runBedrockSignOut,
  type BedrockDevicePrompt,
} from '../../ui/bedrock-auth-controls';

describe('getBedrockAuthUiState', () => {
  it('busy hides everything', () => {
    expect(getBedrockAuthUiState({ isBusy: true, isSignedIn: true })).toEqual({ showLogin: false, showSignOut: false });
    expect(getBedrockAuthUiState({ isBusy: true, isSignedIn: false })).toEqual({ showLogin: false, showSignOut: false });
  });

  it('signed-in shows only sign-out', () => {
    expect(getBedrockAuthUiState({ isBusy: false, isSignedIn: true })).toEqual({ showLogin: false, showSignOut: true });
  });

  it('signed-out shows only login', () => {
    expect(getBedrockAuthUiState({ isBusy: false, isSignedIn: false })).toEqual({ showLogin: true, showSignOut: false });
  });
});

describe('runBedrockDeviceAuth', () => {
  function baseInput() {
    return {
      showError: vi.fn(),
      setBusy: vi.fn(),
      setReady: vi.fn(),
      render: vi.fn(),
      openExternal: vi.fn().mockResolvedValue(undefined),
      setPrompt: vi.fn(),
      beginLogin: vi.fn(),
    };
  }

  function makePrompt(): BedrockDevicePrompt {
    return { userCode: 'ABCD-EFGH', verificationUri: 'https://v', verificationUriComplete: 'https://v?user_code=ABCD-EFGH', complete: Promise.resolve(), cancel: vi.fn() };
  }

  it('opens the verificationUriComplete (code pre-filled) and clears the prompt on success', async () => {
    const input = baseInput();
    const prompt = makePrompt();
    input.beginLogin = vi.fn().mockResolvedValue(prompt);
    await runBedrockDeviceAuth({ ...input, beginLogin: input.beginLogin });
    expect(input.openExternal).toHaveBeenCalledWith('https://v?user_code=ABCD-EFGH');
    await prompt.complete;
    expect(input.setPrompt).toHaveBeenLastCalledWith(null);
    expect(input.setBusy).toHaveBeenLastCalledWith(false);
    expect(input.showError).not.toHaveBeenCalled();
  });

  it('falls back to verificationUri when no complete URL exists', async () => {
    const input = baseInput();
    const { verificationUriComplete: _omit, ...partial } = makePrompt();
    input.beginLogin = vi.fn().mockResolvedValue(partial);
    await runBedrockDeviceAuth({ ...input, beginLogin: input.beginLogin });
    expect(input.openExternal).toHaveBeenCalledWith('https://v');
  });

  it('cancels a zombie poll when opening the browser fails, and stays silent on AbortError', async () => {
    const input = baseInput();
    const prompt = makePrompt();
    input.openExternal = vi.fn().mockRejectedValue(new Error('no browser'));
    input.beginLogin = vi.fn().mockResolvedValue(prompt);
    await runBedrockDeviceAuth({ ...input, beginLogin: input.beginLogin });
    expect(prompt.cancel).toHaveBeenCalled();
    expect(input.showError).toHaveBeenCalledTimes(1);

    const aborting = baseInput();
    aborting.beginLogin = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await runBedrockDeviceAuth({ ...aborting, beginLogin: aborting.beginLogin });
    expect(aborting.showError).not.toHaveBeenCalled();
  });
});

describe('copy + sign-out delegation', () => {
  it('copies the user code through the clipboard port', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    await copyBedrockUserCode('ABCD-EFGH', clipboard);
    expect(clipboard.writeText).toHaveBeenCalledWith('ABCD-EFGH');
  });

  it('sign-out keeps codex semantics: busy lock, confirm gate, error path', async () => {
    const calls: string[] = [];
    await runBedrockSignOut({
      isBusy: () => false,
      isSignedIn: () => false,
      confirm: async () => { calls.push('confirm'); return true; },
      signOut: async () => { calls.push('signOut'); },
      showError: vi.fn(),
      setBusy: vi.fn(),
      setReady: vi.fn(),
      render: vi.fn(),
    });
    expect(calls).toEqual(['confirm', 'signOut']);
  });
});
