// v1.23.0 P1-7: OpenAI-compatible provider client backed by Vercel AI-SDK v6.
//
// Replaces the OpenAICompatibleClient's role as the catch-all for any
// non-Anthropic, non-Official-OpenAI provider. Covers 6 baseURLs from
// PREDEFINED_PROVIDERS:
//
//   - gemini:      https://generativelanguage.googleapis.com/v1beta/openai
//   - openrouter:  https://openrouter.ai/api/v1
//   - deepseek:    https://api.deepseek.com/v1
//   - minimaxi:    https://api.minimaxi.com/v1
//   - moonshot:    https://api.moonshot.cn/v1
//   - glm:         https://open.bigmodel.cn/api/paas/v4
//   - ollama:      http://localhost:11434/v1
//   - lmstudio:    http://localhost:1234/v1
//
// Architecture: thin wrapper around `@ai-sdk/openai-compatible`'s
// `createOpenAICompatible`. Per-baseURL `providerOptions` (e.g.
// `supportsStructuredOutputs`, `includeUsage`) are set automatically
// based on the `provider` id we pass in.

import { type LanguageModel, APICallError } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { LLMClient } from '../types';
import { obsidianFetchBridge, streamWithFallback } from '../core/obsidian-fetch-bridge';
import { mapAiSdkError } from './openai-sdk-client';
import {
  getCachedUrl,
  resolveBaseUrlWithFallback,
  isUrlError,
} from '../core/url-fallback';
import { TokenKeyProber } from './token-key-probe';
import { reportFinish } from './finish-reason';

export interface OpenAICompatSdkClientOptions {
  apiKey: string;
  baseURL: string;
  /** Provider id used as the `name` (e.g. 'gemini', 'openrouter'). */
  provider: string;
  /** Override non-streaming fetch (used in tests). */
  fetch?: typeof obsidianFetchBridge;
  /** Override streaming fetch (default: streamWithFallback). */
  streamFetch?: typeof streamWithFallback;
}

export class OpenAICompatSdkClient implements LLMClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly provider: string;
  private readonly fetchImpl: typeof obsidianFetchBridge;
  private readonly streamFetchImpl: typeof streamWithFallback;
  /**
   * v1.23.0 P1.5 follow-up: runtime probe-then-cache for token-key
   * preference (max_tokens vs max_completion_tokens). Owned per client
   * so cache lifetime == client lifetime. When the user changes baseURL
   * or API key in settings, a new client is constructed and probing
   * starts fresh.
   */
  private readonly tokenKeyProber = new TokenKeyProber();

  constructor(opts: OpenAICompatSdkClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseURL = opts.baseURL;
    this.provider = opts.provider;
    this.fetchImpl = opts.fetch ?? obsidianFetchBridge;
    this.streamFetchImpl = opts.streamFetch ?? streamWithFallback;
  }

  /**
   * Build the AI-SDK provider for a given model.
   *
   * `fetchFn` is the fetch adapter. Pass the streaming variant
   * (`streamFetchImpl`) for createMessageStream, the non-stream
   * variant (`fetchImpl`) for createMessage / listModels. When
   * omitted, defaults to streamFetchImpl — both are URL-based and
   * the streamFetchImpl's fallback handles CORS for cloud, so it's
   * safe to use for non-stream too (AI-SDK just doesn't iterate
   * the body stream). However, calling createMessage with
   * streamFetchImpl pulls in a bit more code path; tests that
   * want to mock non-stream fetch pass fetchImpl explicitly.
   */
  private getProvider(modelId: string, fetchFn: typeof obsidianFetchBridge | typeof streamWithFallback = this.streamFetchImpl, baseURLOverride?: string): LanguageModel {
    // v1.23.0 P1.5: baseURLOverride lets the fallback retry path pass a
    // corrected URL (e.g., `/v1` appended for Kimi Coding Plan) without
    // mutating this.baseURL. Cached resolved URLs flow through this.
    const effectiveBaseURL = baseURLOverride ?? getCachedUrl(this.baseURL) ?? this.baseURL;
    const provider = createOpenAICompatible({
      name: this.provider,
      baseURL: effectiveBaseURL,
      apiKey: this.apiKey,
      fetch: (fetchFn ?? this.streamFetchImpl) as unknown as typeof fetch,
      // includeUsage: Some OpenAI-compatible providers (DeepSeek, GLM)
      // don't return usage unless asked. AI-SDK's default is true for
      // OpenAI; we set it explicitly to ensure consistent token tracking.
      includeUsage: true,
      // v1.23.0 P1.5 follow-up: token-key probe hook. Read the
      // current cached key for this baseURL at request time — this
      // closure captures `this` so each request consults the latest
      // probe result. If we have no cached entry, the transform is
      // a no-op and the request goes out with the AI-SDK default
      // (max_tokens). On rejection we probe + cache + next request
      // uses the swapped key.
      transformRequestBody: (args: Record<string, unknown>) => {
        const cached = this.tokenKeyProber.getCachedKey(this.baseURL);
        if (!cached) return args;
        if (cached === 'max_tokens') return args;
        // cached === 'max_completion_tokens'
        const body = { ...args };
        if (body.max_tokens !== undefined) {
          body.max_completion_tokens = body.max_tokens;
          delete body.max_tokens;
        }
        return body;
      },
    });
    return provider(modelId);
  }

  /**
   * Probe whether a baseURL works for OpenAI-compatible chat endpoint.
   * Used by the URL fallback to test candidate URLs without committing
   * the original request payload. Sends a minimal 1-token message and
   * treats 404 as "wrong URL" (return false), all other errors as
   * "auth/server error" (throw to propagate).
   */
  private async probeBaseURL(baseURL: string): Promise<boolean> {
    try {
      const languageModel = this.getProvider('gpt-4o-mini', this.fetchImpl, baseURL);
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
    const { model, max_tokens, system, messages, temperature, repetition_penalty, enableThinking, response_format, onFinish } = params;

    try {
      const languageModel = this.getProvider(model, this.fetchImpl);
      const { generateText } = await import('ai');

      const result = await generateText({
        model: languageModel,
        ...(system ? { system } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        maxOutputTokens: max_tokens,
        providerOptions: this.buildProviderOptions({
          enableThinking,
          repetitionPenalty: repetition_penalty,
          responseFormat: response_format,
        }) as unknown as Parameters<typeof generateText>[0]['providerOptions'],
        ...(temperature !== undefined ? { temperature } : {}),
      });
      reportFinish(onFinish, result.finishReason);
      return result.text;
    } catch (err) {
      // v1.23.0 P1.5: URL fallback for custom baseURLs.
      // If user's baseURL is missing /v1, AI-SDK sends to wrong path
      // and gets 404. Try candidate URLs and cache the first working
      // one. Subsequent calls (Ingest/Lint/Query) reuse the cache.
      if (isUrlError(err)) {
        const mappedErr = mapAiSdkError(err);
        const resolved = await resolveBaseUrlWithFallback({
          baseUrl: this.baseURL,
          testFn: (url) => this.probeBaseURL(url),
          originalError: mappedErr,
        });
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
            responseFormat: response_format,
          }) as unknown as Parameters<typeof generateText>[0]['providerOptions'],
          ...(temperature !== undefined ? { temperature } : {}),
        });
        reportFinish(onFinish, result.finishReason);
        return result.text;
      }

      // v1.23.0 P1.5 follow-up: token-key probe-then-retry fallback.
      //
      // On ANY HTTP 400 from the gateway, try the alternate token key
      // exactly once. No error-body inspection needed: status 400 is
      // sufficient signal that "something went wrong", and the cost
      // of a false-positive retry is one extra HTTP call (<1s LAN).
      //
      // Guard: skip retry if we already have a cached key for this
      // baseURL — means the first retry already happened (and failed),
      // so retrying again would loop.
      if (APICallError.isInstance(err) && err.statusCode === 400 && !this.tokenKeyProber.getCachedKey(this.baseURL)) {
        // The default wire format is `max_tokens`. If the gateway
        // rejected it, try `max_completion_tokens`.
        this.tokenKeyProber.setCachedKey(this.baseURL, 'max_completion_tokens');
        const retryLanguageModel = this.getProvider(model, this.fetchImpl);
        const { generateText } = await import('ai');
        const result = await generateText({
          model: retryLanguageModel,
          ...(system ? { system } : {}),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          maxOutputTokens: max_tokens,
          providerOptions: this.buildProviderOptions({
            enableThinking,
            repetitionPenalty: repetition_penalty,
            responseFormat: response_format,
          }) as unknown as Parameters<typeof generateText>[0]['providerOptions'],
          ...(temperature !== undefined ? { temperature } : {}),
        });
        reportFinish(onFinish, result.finishReason);
        return result.text;
      }

      throw mapAiSdkError(err);
    }
  }

  /**
   * Map AI-SDK options → OpenAI-compatible provider options.
   *
   * Same shape as OpenAISdkClient (these providers all speak the
   * OpenAI Chat Completions format). `enableThinking=false` maps to
   * `reasoningEffort='low'` for reasoning-capable providers (DeepSeek
   * V3, o1-style on OpenRouter, GLM-Z1).
   */
  private buildProviderOptions(opts: {
    enableThinking?: boolean;
    repetitionPenalty?: number;
    responseFormat?: { type: 'json_object' };
  }): Record<string, Record<string, unknown>> {
    const openaiOpts: Record<string, unknown> = {};

    if (opts.enableThinking === false) {
      // DeepSeek / Moonshot Kimi / GLM-4.6+ all use
      // `thinking.type: 'disabled'` per their official docs:
      //   - DeepSeek: https://api-docs.deepseek.com/zh-cn/guides/thinking_mode
      //   - Kimi k2.5/2.6: https://platform.kimi.com/docs/guide/use-kimi-k2-thinking-model
      //   - GLM-4.6:智谱 BigModel thinking 模型文档
      //
      // Earlier we used `reasoningEffort: 'low'` (OpenAI gpt-5.x
      // style) but DeepSeek's reasoning_effort only accepts
      // 'high'/'max' — 'low' is silently mapped to 'high', so the
      // disable-thinking intent was lost. Switched to
      // `thinking.type: 'disabled'` which all 3 providers accept.
      //
      // OpenRouter is an exception — it routes reasoning models via
      // `reasoning: { enabled: false }`. Users on OpenRouter with
      // reasoning models should disable enableThinking via the
      // plugin's Custom Advanced Settings (which can pass through
      // a different providerOptions shape in v1.24.0).
      openaiOpts.thinking = { type: 'disabled' };
    }

    if (opts.repetitionPenalty !== undefined) {
      openaiOpts.repetitionPenalty = opts.repetitionPenalty;
    }

    if (opts.responseFormat?.type === 'json_object') {
      openaiOpts.response_format = { type: 'json_object' };
    }

    return Object.keys(openaiOpts).length > 0 ? { openaiCompatible: openaiOpts } : {};
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

    // v1.23.0 P1-7 follow-up: stream path uses streamWithFallback
    // (real streaming via window.fetch with CORS fallback to
    // requestUrl). See obsidian-fetch-bridge.ts for rationale.
    const languageModel = this.getProvider(model, this.streamFetchImpl);
    const { streamText } = await import('ai');

    try {
      // v1.23.0 P2: AI-SDK v6 stream consumption fix.
      //
      // Root cause of "一次性" (batch) streaming UX:
      // The previous code iterated `result.fullStream` first to collect
      // reasoning-delta events, THEN iterated `result.textStream` to
      // forward text chunks. AI-SDK v6's fullStream and textStream share
      // the same underlying event source — iterating fullStream causes
      // the framework to buffer all text-delta events internally and
      // yield them to textStream all at once when the stream completes.
      // Result: onChunk fires N times in ~50ms, UI shows a single render.
      //
      // Fix: consume ONLY textStream. For reasoning content (DeepSeek
      // doesn't emit reasoning; OpenAI o1-series does), read from
      // `result.reasoning` (a Promise<string>) after stream completes —
      // this is the AI-SDK v6 recommended pattern.
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
      // v1.23.0 P2: Force a macrotask yield between chunks so the
      // browser can paint each onChunk's DOM update as a separate
      // frame. Without this, AI-SDK's async iterator drains the
      // entire response in a single microtask batch (all onChunk
      // calls complete before the next requestAnimationFrame fires),
      // making the UI appear to render the final state in one go.
      //
      // v1.24.1 PATCH Phase 5.5.0: removed per-chunk console.debug
      // (was noisy + triggered DevTools forced-reflow on long
      // streams). chunkCount is now used only by the post-loop
      // summary line below; we still append each chunk to fullText.
      for await (const chunk of result.textStream) {
        chunkCount++;
        fullText += chunk;
        onChunk(chunk);
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      }
      console.debug(`[STREAM-CHUNK] total chunks forwarded: ${chunkCount} in ${Date.now() - streamStartTime}ms`);

      // Collect reasoning content (if any) from the post-stream Promise.
      // OpenAI o-series and reasoning-capable providers populate this.
      let reasoningContent = '';
      try {
        const reasoning = await result.reasoning;
        if (typeof reasoning === 'string' && reasoning) {
          reasoningContent = reasoning;
        } else if (Array.isArray(reasoning)) {
          reasoningContent = reasoning.map((r) => (r as { text?: string }).text || '').join('');
        }
      } catch {
        // No reasoning field for this provider (DeepSeek, etc.) — ignore.
      }

      if (reasoningContent) {
        fullText = `<think>\n${reasoningContent}\n</think>\n\n${fullText}`;
      }
      return fullText;
    } catch (err) {
      // v1.23.0 P1.5: URL fallback for streaming (Query Wiki) — same
      // logic as createMessage. If 404 on wrong URL, resolve to the
      // correct baseURL via the module-level cache and retry.
      if (isUrlError(err)) {
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

      // v1.23.0 P1.5 follow-up: token-key probe-then-retry for streaming.
      // Same logic as createMessage — cache the alt key for this
      // baseURL and retry. No error-body inspection.
      if (APICallError.isInstance(err) && err.statusCode === 400 && !this.tokenKeyProber.getCachedKey(this.baseURL)) {
        this.tokenKeyProber.setCachedKey(this.baseURL, 'max_completion_tokens');
        const retryLanguageModel = this.getProvider(model, this.streamFetchImpl);
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