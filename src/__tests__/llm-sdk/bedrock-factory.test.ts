// v1.24.1 PATCH — Bedrock Stage 1 factory tests.
//
// Verifies that the two new `bedrock-*` provider ids in
// PREDEFINED_PROVIDERS dispatch to the correct underlying client
// (AnthropicSdkClient for Messages, OpenAICompatSdkClient for Chat
// Completions) and that the resolved baseURL points at the region-scoped
// bedrock-mantle endpoint.
//
// Strategy: exercise the async factory end-to-end (it dynamically imports
// the SDK modules just like production). The factory is the only place
// `bedrockRegion` is consumed, so the baseURL assertion has to live here.
// We reach the private `baseURL` field via a structural `unknown` cast —
// AnthropicSdkClient and OpenAICompatSdkClient both store it as a
// `private readonly` field, so a structural cast is the natural fit.

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicSdkClient } from '../../llm-sdk/anthropic-sdk-client';
import { OpenAICompatSdkClient } from '../../llm-sdk/openai-compat-sdk-client';
import {
  createLLMClientFromSettings,
  createLLMClientFromSettingsSync,
  preloadLLMClientModules,
} from '../../llm-sdk/create-llm-client';

function privateBaseURL(client: unknown): string | undefined {
  // Both client classes store baseURL as `private readonly baseURL`.
  // Standard TS idiom for reaching private fields in tests: structural
  // cast through `unknown`. Branch on typeof to keep the result
  // accurate when the optional field is absent.
  const c = client as { baseURL?: unknown };
  return typeof c.baseURL === 'string' ? c.baseURL : undefined;
}

describe('Bedrock Stage 1 factory (v1.24.1 PATCH)', () => {
  beforeAll(async () => {
    await preloadLLMClientModules();
  });

  describe('async factory', () => {
    it('bedrock-anthropic dispatches to AnthropicSdkClient with region-scoped baseURL', async () => {
      const client = await createLLMClientFromSettings({
        provider: 'bedrock-anthropic',
        apiKey: 'ABSK-test',
        bedrockRegion: 'us-east-1',
      });
      expect(client).toBeInstanceOf(AnthropicSdkClient);
      expect(privateBaseURL(client)).toBe('https://bedrock-mantle.us-east-1.api.aws');
    });

    it('bedrock-openai dispatches to OpenAICompatSdkClient with /v1 region-scoped baseURL', async () => {
      const client = await createLLMClientFromSettings({
        provider: 'bedrock-openai',
        apiKey: 'ABSK-test',
        bedrockRegion: 'eu-central-1',
      });
      expect(client).toBeInstanceOf(OpenAICompatSdkClient);
      expect(privateBaseURL(client)).toBe('https://bedrock-mantle.eu-central-1.api.aws/v1');
    });
  });

  describe('sync factory (after preload)', () => {
    it('bedrock-anthropic dispatches to AnthropicSdkClient with default region when unspecified', () => {
      const client = createLLMClientFromSettingsSync({
        provider: 'bedrock-anthropic',
        apiKey: 'ABSK-test',
      });
      expect(client).toBeInstanceOf(AnthropicSdkClient);
      // Default region is us-east-1 (broadest Bedrock model coverage).
      expect(privateBaseURL(client)).toBe('https://bedrock-mantle.us-east-1.api.aws');
    });

    it('bedrock-openai dispatches to OpenAICompatSdkClient honoring custom region', () => {
      const client = createLLMClientFromSettingsSync({
        provider: 'bedrock-openai',
        apiKey: 'ABSK-test',
        bedrockRegion: 'ap-northeast-2',
      });
      expect(client).toBeInstanceOf(OpenAICompatSdkClient);
      expect(privateBaseURL(client)).toBe('https://bedrock-mantle.ap-northeast-2.api.aws/v1');
    });
  });

  describe('regression — non-Bedrock providers still dispatch correctly', () => {
    it('anthropic still routes to AnthropicSdkClient with empty baseURL', async () => {
      const client = await createLLMClientFromSettings({
        provider: 'anthropic',
        apiKey: 'sk-ant-test',
      });
      expect(client).toBeInstanceOf(AnthropicSdkClient);
      // Official endpoint: no baseURL override needed — should be undefined.
      expect(privateBaseURL(client)).toBeUndefined();
    });

    it('openai still routes to OpenAISdkClient', async () => {
      const client = await createLLMClientFromSettings({
        provider: 'openai',
        apiKey: 'sk-test',
      });
      // provider === 'openai' routes to OpenAISdkClient (official); the
      // bedrock-* branches must NOT be reached. bedrock-openai is
      // OpenAICompatSdkClient — confirm OpenAISdkClient is selected here.
      const { OpenAISdkClient } = await import('../../llm-sdk/openai-sdk-client');
      expect(client).toBeInstanceOf(OpenAISdkClient);
    });
  });
});
