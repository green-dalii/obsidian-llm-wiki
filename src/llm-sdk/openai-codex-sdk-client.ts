import { createOpenAI } from '@ai-sdk/openai';
import { Output, streamText, type LanguageModel } from 'ai';
import { obsidianFetchBridge } from '../core/obsidian-fetch-bridge';
import type { LLMClient } from '../types';
import { mapAiSdkError } from './openai-sdk-client';
import type { CodexAuthManager } from './openai-codex/auth-manager';
import { CODEX_MODELS } from './openai-codex/constants';
import { normalizeCodexRequest } from './openai-codex/request-adapter';

type CodexAuth = Pick<CodexAuthManager, 'getAccess' | 'refreshAfterUnauthorized'>;
type CodexFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface OpenAICodexSdkClientOptions {
  auth: CodexAuth;
  fetch?: CodexFetch;
  streamFetch?: CodexFetch;
  sessionId: () => string;
  version: string;
  quotaMessage?: string;
}

interface CodexRequestFetchOptions {
  auth: CodexAuth;
  fetchImpl: CodexFetch;
  sessionId: () => string;
  version: string;
  quotaMessage?: string;
}

const AUTH_FORBIDDEN_CODES = new Set(['authentication_error', 'expired_token', 'invalid_authentication', 'invalid_token', 'token_expired', 'unauthorized']);
const DEFAULT_CODEX_QUOTA_MESSAGE = 'ChatGPT Codex allowance reached. Wait for the displayed reset period and try again.';

async function cancelResponseBody(response: Response): Promise<void> {
  if (!response.body || response.bodyUsed || response.body.locked) return;
  try {
    await response.body.cancel();
  } catch {
    return;
  }
}

function throwIfAborted(signal: AbortSignal | null | undefined): void {
  if (signal?.aborted) signal.throwIfAborted();
}

function structuredErrorCode(input: unknown): string | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const nested = typeof value.error === 'object' && value.error !== null && !Array.isArray(value.error) ? value.error as Record<string, unknown> : null;
  for (const candidate of [nested?.code, nested?.type, value.code, value.type]) {
    if (typeof candidate === 'string') return candidate.toLowerCase();
  }
  return null;
}

async function isAuthenticationForbidden(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  if (response.headers.has('www-authenticate')) return true;
  try {
    const code = structuredErrorCode(await response.clone().json());
    if (code !== null) return AUTH_FORBIDDEN_CODES.has(code);
  } catch {
    if (response.headers.has('cf-ray') || response.headers.get('server')?.toLowerCase().includes('cloudflare')) return false;
  }
  return false;
}

export function createCodexRequestFetch(options: CodexRequestFetchOptions): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const access = await options.auth.getAccess();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const sessionId = options.sessionId();
    const normalized = normalizeCodexRequest({ url, init: init ?? {}, access, sessionId, version: options.version });
    const response = await options.fetchImpl(normalized.url, normalized.init);
    if (response.status === 429) {
      await cancelResponseBody(response);
      throw new Error(options.quotaMessage ?? DEFAULT_CODEX_QUOTA_MESSAGE);
    }
    const authenticationFailure = response.status === 401 || await isAuthenticationForbidden(response);
    if (!authenticationFailure) return response;
    await cancelResponseBody(response);
    throwIfAborted(init?.signal);
    const refreshed = await options.auth.refreshAfterUnauthorized(access.accessToken, response.status);
    throwIfAborted(init?.signal);
    const replay = normalizeCodexRequest({ url, init: init ?? {}, access: refreshed, sessionId, version: options.version });
    return options.fetchImpl(replay.url, replay.init);
  };
}

export class OpenAICodexSdkClient implements LLMClient {
  private readonly auth: CodexAuth;
  private readonly streamFetchImpl: CodexFetch;
  private readonly sessionId: () => string;
  private readonly version: string;
  private readonly quotaMessage: string;
  constructor(options: OpenAICodexSdkClientOptions) {
    this.auth = options.auth;
    this.streamFetchImpl = options.streamFetch ?? options.fetch ?? (obsidianFetchBridge as unknown as CodexFetch);
    this.sessionId = options.sessionId;
    this.version = options.version;
    this.quotaMessage = options.quotaMessage ?? DEFAULT_CODEX_QUOTA_MESSAGE;
  }
  async createMessage(params: Parameters<LLMClient['createMessage']>[0]): Promise<string> {
    const model = this.getModel(params.model, this.streamFetchImpl);
    try {
      let streamError: unknown;
      const result = streamText({ model, ...(params.system ? { system: params.system } : {}), messages: params.messages.map((message) => ({ role: message.role, content: message.content })), maxOutputTokens: params.max_tokens, ...(params.temperature !== undefined ? { temperature: params.temperature } : {}), ...(params.response_format?.type === 'json_object' ? { output: Output.json() } : {}), providerOptions: this.providerOptions(params.enableThinking), maxRetries: 0, onError: ({ error }) => { streamError = error; } });
      let text = '';
      for await (const chunk of result.textStream) text += chunk;
      if (streamError !== undefined) throw streamError instanceof Error ? streamError : new Error(typeof streamError === 'string' ? streamError : 'Codex stream failed');
      return text;
    } catch (error) {
      throw mapAiSdkError(error);
    }
  }
  async createMessageStream(params: Parameters<NonNullable<LLMClient['createMessageStream']>>[0]): Promise<string> {
    const model = this.getModel(params.model, this.streamFetchImpl);
    try {
      const result = streamText({ model, ...(params.system ? { system: params.system } : {}), messages: params.messages.map((message) => ({ role: message.role, content: message.content })), maxOutputTokens: params.max_tokens, ...(params.temperature !== undefined ? { temperature: params.temperature } : {}), providerOptions: this.providerOptions(params.enableThinking), maxRetries: 0 });
      let text = '';
      for await (const chunk of result.textStream) {
        text += chunk;
        params.onChunk(chunk);
      }
      return text;
    } catch (error) {
      throw mapAiSdkError(error);
    }
  }
  async listModels(): Promise<string[]> {
    return [...CODEX_MODELS];
  }
  private getModel(modelId: string, fetchImpl: CodexFetch): LanguageModel {
    const provider = createOpenAI({ apiKey: 'codex-oauth', fetch: createCodexRequestFetch({ auth: this.auth, fetchImpl, sessionId: this.sessionId, version: this.version, quotaMessage: this.quotaMessage }) });
    return provider.responses(modelId);
  }
  private providerOptions(enableThinking: boolean | undefined): Record<string, Record<string, string>> {
    return enableThinking === false ? { openai: { reasoningEffort: 'low' } } : {};
  }
}
