/**
 * #425 Bedrock Stage 2 — pure UI-control helpers for the Bedrock SSO
 * auth section. Mirrors openai-codex-auth-controls.ts so the settings
 * tab stays thin and the async/abort/busy semantics stay unit-tested.
 */

import { runCodexSignOut, type CodexSignOutInput } from './openai-codex-auth-controls';

export interface BedrockAuthUiInput {
  isBusy: boolean;
  isSignedIn: boolean;
}

export interface BedrockAuthUiState {
  showLogin: boolean;
  showSignOut: boolean;
}

export function getBedrockAuthUiState(input: BedrockAuthUiInput): BedrockAuthUiState {
  if (input.isBusy) return { showLogin: false, showSignOut: false };
  if (input.isSignedIn) return { showLogin: false, showSignOut: true };
  return { showLogin: true, showSignOut: false };
}

export interface BedrockDevicePrompt {
  userCode: string;
  verificationUri: string;
  /** Pre-fills the code in the browser — preferred over verificationUri. */
  verificationUriComplete?: string;
  complete: Promise<unknown>;
  cancel(): void;
}

export interface BedrockAsyncControlInput {
  showError(error: unknown): void;
  setBusy(value: boolean): void;
  setReady(value: boolean): void;
  render(): void;
}

export interface BedrockDeviceAuthInput extends BedrockAsyncControlInput {
  beginLogin(): Promise<BedrockDevicePrompt>;
  openExternal(url: string): void | Promise<void>;
  setPrompt(prompt: BedrockDevicePrompt | null): void;
}

/**
 * Drive one device login: begin → surface prompt → open browser →
 * await completion. Cancellation and aborts are silent; everything
 * else reports through showError. On a failure to even OPEN the
 * browser, the pending poll is cancelled so no zombie loop remains.
 */
export async function runBedrockDeviceAuth(input: BedrockDeviceAuthInput): Promise<void> {
  let prompt: BedrockDevicePrompt | null = null;
  let opened = false;
  input.setBusy(true);
  input.render();
  try {
    prompt = await input.beginLogin();
    input.setPrompt(prompt);
    input.render();
    await input.openExternal(prompt.verificationUriComplete ?? prompt.verificationUri);
    opened = true;
    await prompt.complete;
    input.setReady(false);
  } catch (error) {
    if (prompt && !opened) {
      prompt.cancel();
      void prompt.complete.catch(() => undefined);
    }
    if (!(error instanceof DOMException && error.name === 'AbortError')) input.showError(error);
  } finally {
    input.setPrompt(null);
    input.setBusy(false);
    input.render();
  }
}

export interface BedrockClipboard {
  writeText(value: string): Promise<void>;
}

export async function copyBedrockUserCode(code: string, clipboard: BedrockClipboard): Promise<void> {
  await clipboard.writeText(code);
}

/**
 * Sign-out flow is semantically identical to Codex's (async ConfirmModal,
 * busy lock against double-click) — delegate instead of duplicating.
 */
export async function runBedrockSignOut(input: CodexSignOutInput): Promise<void> {
  await runCodexSignOut(input);
}
