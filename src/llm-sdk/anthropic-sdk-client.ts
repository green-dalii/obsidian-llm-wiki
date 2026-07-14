// v1.23.0 P1-7: Anthropic provider client backed by Vercel AI-SDK v6.
//
// Replaces the hand-rolled AnthropicClient + AnthropicCompatibleClient
// (~547 LOC combined) accumulated across v1.20.0 (#141 prefill) → v1.20.1
// (#141 prefill auto-fallback) → v1.20.2 (#141/#147 system role fix).
//
// Key migration notes:
//   1. system role: AI-SDK abstracts Anthropic's "system at top-level"
//      convention — no manual [system, ...msgs] restructuring needed.
//   2. assistant prefill: AI-SDK handles the "older Claude models reject
//      prefill" detection via its own validation; we don't need a
//      prefillingNotSupported flag.
//   3. baseURL: createAnthropic supports custom baseURL — covers
//      Coding Plan, z.ai, GLM-Anthropic, MiniMax-Anthropic, etc.
//   4. Thinking control: providerOptions.anthropic.thinking controls
//      extended thinking (type: 'enabled' | 'disabled').
//
// Architecture: same shape as OpenAISdkClient — implements LLMClient,
// uses obsidianFetchBridge, lazy-loads @ai-sdk/anthropic.

import { type LanguageModel } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { LLMClient } from '../types';
import { obsidianFetchBridge, streamWithFallback } from '../core/obsidian-fetch-bridge';
import { mapAiSdkError } from './openai-sdk-client';
import {
  getCachedUrl,
  resolveBaseUrlWithFallback,
  isUrlError,
} from '../core/url-fallback';
import { isDocumentUnsupportedError, PdfUnsupportedError } from '../core/pdf-support';
import { sendDocumentRequest } from './document-reader';

// Re-export for callers that import from anthropic-sdk-client only.
// Reuse the same error mapper as OpenAI — AI-SDK's APICallError shape is
// provider-agnostic, so the same "status <code>: <body message>"
// formatting applies. Anthropic's error body is
// `{type: "error", error: {type: "...", message: "..."}}` —
// extractProviderMessage handles both via the same nested lookup.
export { mapAiSdkError };

export interface AnthropicSdkClientOptions {
  apiKey: string;
  /**
   * Custom baseURL for Anthropic-compatible endpoints (Coding Plan,
   * z.ai, GLM-Anthropic, MiniMax-Anthropic, etc.).
   * Omit to use official api.anthropic.com.
   */
  baseURL?: string;
  /** Override non-streaming fetch (used in tests with a mocked bridge). */
  fetch?: typeof obsidianFetchBridge;
  /**
   * Override streaming fetch (default: streamWithFallback). Mostly
   * for tests; production should leave this unset.
   */
  streamFetch?: typeof streamWithFallback;
}

export class AnthropicSdkClient implements LLMClient {
  private readonly apiKey: string;
  private readonly baseURL: string | undefined;
  private readonly fetchImpl: typeof obsidianFetchBridge;
  private readonly streamFetchImpl: typeof streamWithFallback;

  constructor(opts: AnthropicSdkClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseURL = opts.baseURL;
    this.fetchImpl = opts.fetch ?? obsidianFetchBridge;
    this.streamFetchImpl = opts.streamFetch ?? streamWithFallback;
  }

  private getProvider(modelId: string, fetchFn: typeof obsidianFetchBridge | typeof streamWithFallback = this.streamFetchImpl, baseURLOverride?: string): LanguageModel {
    // v1.23.0 P1.5: baseURLOverride lets the fallback retry path pass a
    // corrected URL (e.g., `/v1` appended for Kimi Coding Plan) without
    // mutating this.baseURL. Cached resolved URLs flow through this.
    const effectiveBaseURL = baseURLOverride ?? getCachedUrl(this.baseURL ?? '') ?? this.baseURL;
    const provider = createAnthropic({
      apiKey: this.apiKey,
      ...(effectiveBaseURL ? { baseURL: effectiveBaseURL } : {}),
      fetch: fetchFn as unknown as typeof fetch,
    });
    return provider(modelId);
  }

  /**
   * Probe whether a baseURL works for Anthropic messages endpoint.
   * Used by the URL fallback to test candidate URLs without committing
   * the original request payload. Sends a minimal 1-token message and
   * treats 404 as "wrong URL" (return false), all other errors as
   * "auth/server error" (throw to propagate).
   */
  private async probeBaseURL(baseURL: string): Promise<boolean> {
    try {
      const languageModel = this.getProvider('claude-haiku-4-5', this.fetchImpl, baseURL);
      const { generateText } = await import('ai');
      await generateText({
        model: languageModel,
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 1,
      });
      return true;
    } catch (err) {
      if (isUrlError(err)) return false;
      throw err;
    }
  }

  async createMessage(params: LLMClient['createMessage'] extends (p: infer P) => unknown ? P : never): Promise<string> {
    const { model, max_tokens, system, messages, temperature, repetition_penalty, enableThinking } = params;

    try {
      const languageModel = this.getProvider(model, this.fetchImpl);
      const { generateText } = await import('ai');

      const result = await generateText({
        model: languageModel,
        // Anthropic accepts system at top-level; AI-SDK abstracts this.
        ...(system ? { system } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        maxOutputTokens: max_tokens,
        providerOptions: this.buildProviderOptions({
          enableThinking,
          repetitionPenalty: repetition_penalty,
        }) as unknown as Parameters<typeof generateText>[0]['providerOptions'],
        ...(temperature !== undefined ? { temperature } : {}),
      });
      return result.text;
    } catch (err) {
      // v1.23.0 P1.5: URL fallback for custom baseURLs (Kimi / z.ai / GLM).
      // If the user's baseURL is missing /v1, AI-SDK sends to a wrong
      // path and gets 404. Try candidate URLs and cache the first
      // working one — subsequent calls (Ingest/Lint/Query) reuse it.
      if (isUrlError(err) && this.baseURL) {
        const mappedErr = mapAiSdkError(err);
        const resolved = await resolveBaseUrlWithFallback({
          baseUrl: this.baseURL,
          testFn: (url) => this.probeBaseURL(url),
          originalError: mappedErr,
        });
        // Retry with the resolved URL — separate try block so the
        // fallback result is returned even if the retry somehow fails.
        const retryLanguageModel = this.getProvider(model, this.fetchImpl, resolved);
        const { generateText } = await import('ai');
        const result = await generateText({
          model: retryLanguageModel,
          ...(system ? { system } : {}),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          maxOutputTokens: max_tokens,
          providerOptions: this.buildProviderOptions({
            enableThinking,
            repetitionPenalty: repetition_penalty,
          }) as unknown as Parameters<typeof generateText>[0]['providerOptions'],
          ...(temperature !== undefined ? { temperature } : {}),
        });
        return result.text;
      }
      throw mapAiSdkError(err);
    }
  }

  async readDocument(params: {
    model: string;
    max_tokens: number;
    data: ArrayBuffer;
    enableThinking?: boolean;
  }): Promise<string> {
    try {
      return await sendDocumentRequest({
        languageModel: this.getProvider(params.model, this.fetchImpl),
        data: params.data,
        maxOutputTokens: params.max_tokens,
        providerOptions: this.buildProviderOptions({ enableThinking: params.enableThinking }),
      });
    } catch (err) {
      if (isUrlError(err) && this.baseURL) {
        try {
          const resolved = await resolveBaseUrlWithFallback({
            baseUrl: this.baseURL,
            testFn: (url) => this.probeBaseURL(url),
            originalError: mapAiSdkError(err),
          });
          return await sendDocumentRequest({
            languageModel: this.getProvider(params.model, this.fetchImpl, resolved),
            data: params.data,
            maxOutputTokens: params.max_tokens,
            providerOptions: this.buildProviderOptions({ enableThinking: params.enableThinking }),
          });
        } catch (fallbackError) {
          const mapped = mapAiSdkError(fallbackError);
          if (isDocumentUnsupportedError(mapped)) throw new PdfUnsupportedError(mapped.message);
          throw mapped;
        }
      }

      const mapped = mapAiSdkError(err);
      if (isDocumentUnsupportedError(mapped)) throw new PdfUnsupportedError(mapped.message);
      throw mapped;
    }
  }

  /**
   * Map AI-SDK options → Anthropic provider options.
   *
   * Anthropic thinking: AI-SDK exposes `providerOptions.anthropic.thinking`
   * with `{type: 'enabled' | 'disabled', budgetTokens?: number}`.
   * We map `enableThinking=false` → `{type: 'disabled'}` for parity
   * with the OpenAI reasoningEffort='low' path.
   */
  private buildProviderOptions(opts: {
    enableThinking?: boolean;
    repetitionPenalty?: number;
  }): Record<string, Record<string, unknown>> {
    const anthropicOpts: Record<string, unknown> = {};

    if (opts.enableThinking === false) {
      anthropicOpts.thinking = { type: 'disabled' };
    }

    if (opts.repetitionPenalty !== undefined) {
      // llama.cpp extension — Anthropic doesn't natively support but we
      // pass through; compatible proxies (GLM-Anthropic, etc.) handle it.
      anthropicOpts.repetitionPenalty = opts.repetitionPenalty;
    }

    return Object.keys(anthropicOpts).length > 0 ? { anthropic: anthropicOpts } : {};
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    onChunk: (chunk: string) => void;
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
  }): Promise<string> {
    const { model, max_tokens, system, messages, onChunk, temperature, repetition_penalty, enableThinking } = params;

    // v1.23.0 P1.5: same URL fallback as createMessage, so streaming
    // (Query Wiki) is consistent with non-streaming (Ingest / Lint /
    // Fix). Use cached resolved URL when present; on 404, fall back
    // to candidate URLs and retry.
    try {
      const languageModel = this.getProvider(model, this.streamFetchImpl);
      const { streamText } = await import('ai');

      const result = streamText({
        model: languageModel,
        ...(system ? { system } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        maxOutputTokens: max_tokens,
        providerOptions: this.buildProviderOptions({
          enableThinking,
          repetitionPenalty: repetition_penalty,
        }) as unknown as Parameters<typeof streamText>[0]['providerOptions'],
        ...(temperature !== undefined ? { temperature } : {}),
      });

      let fullText = '';
      let chunkCount = 0;
      const streamStartTime = Date.now();
      for await (const chunk of result.textStream) {
        chunkCount++;
        fullText += chunk;
        onChunk(chunk);
        // v1.23.0 P2: Force a macrotask yield between chunks (see
        // openai-compat-sdk-client.ts for rationale).
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      }
      console.debug(`[STREAM-CHUNK] [anthropic] total chunks forwarded: ${chunkCount} in ${Date.now() - streamStartTime}ms`);

      // v1.23.0 P2: Collect Anthropic extended thinking content (Opus 4.6+)
      // from the post-stream Promise. Mirrors the OpenAI SDK pattern.
      let reasoningContent = '';
      try {
        const reasoning = await result.reasoning;
        if (typeof reasoning === 'string' && reasoning) {
          reasoningContent = reasoning;
        } else if (Array.isArray(reasoning)) {
          reasoningContent = reasoning.map((r) => (r as { text?: string }).text || '').join('');
        }
      } catch {
        // No reasoning for this model — ignore.
      }
      if (reasoningContent) {
        fullText = `<think>\n${reasoningContent}\n</think>\n\n${fullText}`;
      }
      return fullText;
    } catch (err) {
      // URL fallback for streaming — same logic as createMessage.
      if (isUrlError(err) && this.baseURL) {
        const mappedErr = mapAiSdkError(err);
        const resolved = await resolveBaseUrlWithFallback({
          baseUrl: this.baseURL,
          testFn: (url) => this.probeBaseURL(url),
          originalError: mappedErr,
        });
        const retryLanguageModel = this.getProvider(model, this.streamFetchImpl, resolved);
        const { streamText } = await import('ai');

        const result = streamText({
          model: retryLanguageModel,
          ...(system ? { system } : {}),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          maxOutputTokens: max_tokens,
          providerOptions: this.buildProviderOptions({
            enableThinking,
            repetitionPenalty: repetition_penalty,
          }) as unknown as Parameters<typeof streamText>[0]['providerOptions'],
          ...(temperature !== undefined ? { temperature } : {}),
        });

        let fullText = '';
        for await (const chunk of result.textStream) {
          fullText += chunk;
          onChunk(chunk);
        }
        let reasoningContent = '';
        try {
          const reasoning = await result.reasoning;
          if (typeof reasoning === 'string' && reasoning) {
            reasoningContent = reasoning;
          } else if (Array.isArray(reasoning)) {
            reasoningContent = reasoning.map((r) => (r as { text?: string }).text || '').join('');
          }
        } catch { /* no reasoning */ }
        if (reasoningContent) {
          fullText = `<think>\n${reasoningContent}\n</think>\n\n${fullText}`;
        }
        return fullText;
      }
      throw mapAiSdkError(err);
    }
  }

  async listModels(): Promise<string[]> {
    return [];
  }
}