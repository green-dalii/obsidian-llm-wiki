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

import { type LanguageModel } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { LLMClient } from '../types';
import { obsidianFetchBridge, streamWithFallback } from '../core/obsidian-fetch-bridge';
import { mapAiSdkError } from './openai-sdk-client';

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
  private getProvider(modelId: string, fetchFn: typeof obsidianFetchBridge | typeof streamWithFallback = this.streamFetchImpl): LanguageModel {
    const provider = createOpenAICompatible({
      name: this.provider,
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      fetch: (fetchFn ?? this.streamFetchImpl) as unknown as typeof fetch,
      // includeUsage: Some OpenAI-compatible providers (DeepSeek, GLM)
      // don't return usage unless asked. AI-SDK's default is true for
      // OpenAI; we set it explicitly to ensure consistent token tracking.
      includeUsage: true,
    });
    return provider(modelId);
  }

  async createMessage(params: LLMClient['createMessage'] extends (p: infer P) => unknown ? P : never): Promise<string> {
    const { model, max_tokens, system, messages, temperature, repetition_penalty, enableThinking, response_format } = params;

    const languageModel = this.getProvider(model, this.fetchImpl);
    const { generateText } = await import('ai');

    try {
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
      return result.text;
    } catch (err) {
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
      for await (const chunk of result.textStream) {
        chunkCount++;
        // v1.23.0 P2: Print elapsed ms so we can see whether chunks are
        // truly spread out in time (real streaming) or all arrive in the
        // same macrotask (batched). If the elapsed values are 0/1ms for
        // many chunks in a row, the stream is being yielded in a tight
        // loop and the browser is too busy to paint between chunks.
        const elapsed = Date.now() - streamStartTime;
        console.debug(`[STREAM-CHUNK] chunk#${chunkCount} +${elapsed}ms len=${chunk.length} chars: "${chunk.substring(0, 80)}"`);
        fullText += chunk;
        onChunk(chunk);
        // v1.23.0 P2: Force a macrotask yield between chunks so the
        // browser can paint each onChunk's DOM update as a separate
        // frame. Without this, AI-SDK's async iterator drains the
        // entire response in a single microtask batch (all onChunk
        // calls complete before the next requestAnimationFrame fires),
        // making the UI appear to render the final state in one go.
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
      throw mapAiSdkError(err);
    }
  }

  async listModels(): Promise<string[]> {
    return [];
  }
}