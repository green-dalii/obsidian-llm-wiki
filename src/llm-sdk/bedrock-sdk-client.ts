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
import { BEDROCK_DEFAULT_REGION } from './provider-guards';

/**
 * AWS credential provider signature — an async function returning
 * temporary credentials. Compatible with `fromNodeProviderChain` from
 * `@aws-sdk/credential-providers` (which returns credentials plus
 * optional `expiration`/`accountId` fields — ignored via structural
 * subtyping).
 */
export type BedrockCredentialProvider = () => Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}>;

export interface BedrockSdkClientOptions {
  /**
   * Bearer API key (long-lived Bedrock API key). Mutually exclusive
   * with `credentialProvider` — pass exactly one.
   */
  apiKey?: string;
  /**
   * AWS credential provider — typically `fromNodeProviderChain({profile})`
   * from `@aws-sdk/credential-providers`. Handles SSO refresh
   * transparently. Mutually exclusive with `apiKey`. Held by
   * reference and invoked lazily by the AI-SDK per request; the
   * caller is responsible for constructing it once (so the
   * memoization in `fromNodeProviderChain` isn't defeated).
   */
  credentialProvider?: BedrockCredentialProvider;
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
  private readonly apiKey: string | undefined;
  private readonly credentialProvider: BedrockCredentialProvider | undefined;
  private readonly region: string;
  private readonly fetchImpl: typeof obsidianFetchBridge;
  private readonly streamFetchImpl: typeof streamWithFallback;

  constructor(opts: BedrockSdkClientOptions) {
    const hasApiKey = typeof opts.apiKey === 'string' && opts.apiKey.length > 0;
    const hasCredentialProvider = typeof opts.credentialProvider === 'function';
    if (hasApiKey === hasCredentialProvider) {
      throw new Error(
        'BedrockSdkClient: exactly one of apiKey or credentialProvider must be provided.'
      );
    }
    this.apiKey = opts.apiKey;
    this.credentialProvider = opts.credentialProvider;
    // Trim + fall back so hand-edited data.json with whitespace or an
    // empty-string region resolves to the default rather than being
    // passed through to createAmazonBedrock.
    this.region = opts.region?.trim() || BEDROCK_DEFAULT_REGION;
    this.fetchImpl = opts.fetch ?? obsidianFetchBridge;
    this.streamFetchImpl = opts.streamFetch ?? streamWithFallback;
  }

  private getProvider(modelId: string, fetchFn: typeof obsidianFetchBridge | typeof streamWithFallback): LanguageModel {
    // @ai-sdk/amazon-bedrock: `apiKey` and `credentialProvider` are
    // mutually exclusive at the SDK level (see dist/index.js — the
    // provider picks one code path based on which is set). Constructor
    // enforces the invariant; here we just pass through whichever is
    // set.
    const provider = this.apiKey
      ? createAmazonBedrock({
          apiKey: this.apiKey,
          region: this.region,
          fetch: fetchFn as unknown as typeof fetch,
        })
      : createAmazonBedrock({
          credentialProvider: this.credentialProvider,
          region: this.region,
          fetch: fetchFn as unknown as typeof fetch,
        });
    return provider(modelId);
  }

  async createMessage(params: LLMClient['createMessage'] extends (p: infer P) => unknown ? P : never): Promise<string> {
    // Bedrock's Converse/Invoke APIs have no repetition_penalty parameter
    // for any hosted model family (Claude/Llama/Nova), so we drop it
    // from the request. AnthropicSdkClient forwards it because
    // Anthropic-compatible proxies (GLM/z.ai) accept the field.
    const { model, max_tokens, system, messages, temperature, enableThinking } = params;

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
   * `{type: 'enabled' | 'disabled', budgetTokens?: number}`.
   * We map `enableThinking=false` → `{type: 'disabled'}`, mirroring
   * AnthropicSdkClient's `thinking: {type: 'disabled'}` mapping.
   */
  private buildProviderOptions(opts: {
    enableThinking?: boolean;
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
    // repetition_penalty accepted for LLMClient signature parity but
    // dropped — Bedrock has no equivalent request field (see
    // createMessage above).
    const { model, max_tokens, system, messages, onChunk, temperature, enableThinking } = params;

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
        }) as unknown as Parameters<typeof streamText>[0]['providerOptions'],
        ...(temperature !== undefined ? { temperature } : {}),
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
        onChunk(chunk);
        // Yield to the event loop between chunks so DOM streaming
        // render + user input stay responsive during long generations.
        // Matches the pattern used in openai-compat-sdk-client + anthropic-sdk-client.
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
