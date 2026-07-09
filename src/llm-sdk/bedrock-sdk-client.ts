// v1.24.0: Amazon Bedrock provider client backed by Vercel AI-SDK v6.
//
// Bearer API-key auth only (no AWS SigV4/IAM Access Key support — see
// docs/superpowers/specs/2026-07-09-amazon-bedrock-provider-design.md
// for the auth-method decision rationale). Structured identically to
// AnthropicSdkClient since both are Claude-capable providers with the
// same extended-thinking provider-options shape (just a different
// options key: `reasoningConfig` instead of `thinking`).
//
// Architecture: implements LLMClient, uses obsidianFetchBridge,
// lazy-loads @ai-sdk/amazon-bedrock. No URL-fallback logic — Bedrock
// has no user-entered baseURL in this design (endpoint is derived
// from `region`), so resolveBaseUrlWithFallback/isUrlError don't apply.

import { type LanguageModel } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { LLMClient } from '../types';
import { obsidianFetchBridge, streamWithFallback } from '../core/obsidian-fetch-bridge';
import { mapAiSdkError } from './openai-sdk-client';

export interface BedrockSdkClientOptions {
  apiKey: string;
  /** AWS region for the Bedrock provider. Defaults to 'us-east-1'. */
  region?: string;
  /** Override non-streaming fetch (used in tests with a mocked bridge). */
  fetch?: typeof obsidianFetchBridge;
  /**
   * Override streaming fetch (default: streamWithFallback). Mostly
   * for tests; production should leave this unset.
   */
  streamFetch?: typeof streamWithFallback;
}

export class BedrockSdkClient implements LLMClient {
  private readonly apiKey: string;
  private readonly region: string;
  private readonly fetchImpl: typeof obsidianFetchBridge;
  private readonly streamFetchImpl: typeof streamWithFallback;

  constructor(opts: BedrockSdkClientOptions) {
    this.apiKey = opts.apiKey;
    this.region = opts.region ?? 'us-east-1';
    this.fetchImpl = opts.fetch ?? obsidianFetchBridge;
    this.streamFetchImpl = opts.streamFetch ?? streamWithFallback;
  }

  private getProvider(modelId: string, fetchFn: typeof obsidianFetchBridge | typeof streamWithFallback = this.streamFetchImpl): LanguageModel {
    const provider = createAmazonBedrock({
      apiKey: this.apiKey,
      region: this.region,
      fetch: fetchFn as unknown as typeof fetch,
    });
    return provider(modelId);
  }

  async createMessage(params: LLMClient['createMessage'] extends (p: infer P) => unknown ? P : never): Promise<string> {
    const { model, max_tokens, system, messages, temperature, repetition_penalty, enableThinking } = params;

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
        }) as unknown as Parameters<typeof generateText>[0]['providerOptions'],
        ...(temperature !== undefined ? { temperature } : {}),
      });
      return result.text;
    } catch (err) {
      throw mapAiSdkError(err);
    }
  }

  /**
   * Map AI-SDK options → Bedrock provider options.
   *
   * Bedrock extended thinking: AI-SDK exposes
   * `providerOptions.bedrock.reasoningConfig` with
   * `{type: 'enabled' | 'disabled' | 'adaptive', budgetTokens?: number}`.
   * We map `enableThinking=false` → `{type: 'disabled'}`, mirroring
   * AnthropicSdkClient's `thinking: {type: 'disabled'}` mapping.
   */
  private buildProviderOptions(opts: {
    enableThinking?: boolean;
    repetitionPenalty?: number;
  }): Record<string, Record<string, unknown>> {
    const bedrockOpts: Record<string, unknown> = {};

    if (opts.enableThinking === false) {
      bedrockOpts.reasoningConfig = { type: 'disabled' };
    }

    return Object.keys(bedrockOpts).length > 0 ? { bedrock: bedrockOpts } : {};
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
      for await (const chunk of result.textStream) {
        fullText += chunk;
        onChunk(chunk);
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      }

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
      throw mapAiSdkError(err);
    }
  }

  async listModels(): Promise<string[]> {
    return [];
  }
}
