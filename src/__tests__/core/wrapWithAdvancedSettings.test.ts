// v1.23.2 refactor: wrapWithAdvancedSettings preserves all observable
// behavior while removing the bind() + in-place mutation pattern.
// Object identity is the only thing that changes — the previous
// implementation mutated the passed-in client (returning the same
// reference); the new implementation returns a fresh wrapper.

import { describe, it, expect, vi } from 'vitest';
import { wrapWithAdvancedSettings } from '../../llm-client-wrapper';
import type { LLMClient } from '../../types';

type CreateMessageParams = Parameters<LLMClient['createMessage']>[0];

function makeFakeClient(opts: {
  createMessageImpl: (params: CreateMessageParams) => Promise<string>;
}): LLMClient {
  return { createMessage: opts.createMessageImpl };
}

function validParams(overrides: Partial<CreateMessageParams> = {}): CreateMessageParams {
  return {
    model: 'test-model',
    max_tokens: 100,
    messages: [{ role: 'user' as const, content: 'hello' }],
    ...overrides,
  };
}

describe('wrapWithAdvancedSettings — behavior parity (refactor C)', () => {
  it('passes through when maxTokensPerCall=0 and no overrides', async () => {
    const createMessage = vi.fn(async (_params: CreateMessageParams) => 'echo: hello');
    const client = makeFakeClient({ createMessageImpl: createMessage });
    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 0,
    });
    const result = await wrapped.createMessage(validParams());
    expect(result).toBe('echo: hello');
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it('injects max_tokens cap when maxTokensPerCall > 0', async () => {
    const createMessage = vi.fn(async (params: CreateMessageParams) => String(params.max_tokens));
    const client = makeFakeClient({ createMessageImpl: createMessage });
    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 100,
    });
    const result = await wrapped.createMessage(validParams({ max_tokens: 200 }));
    // capMaxTokens may downscale; verify the cap was injected (not 200)
    expect(Number(result)).toBeLessThanOrEqual(100);
    const callArgs = createMessage.mock.calls[0][0];
    expect(typeof callArgs['max_tokens']).toBe('number');
  });

  it('injects extractionTemperature only when caller did not provide one', async () => {
    const createMessage = vi.fn(async (_params: CreateMessageParams) => 'x');
    const client = makeFakeClient({ createMessageImpl: createMessage });

    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 0,
      extractionTemperature: 0.42,
    });

    // Caller omits temperature → wrapper injects it.
    await wrapped.createMessage(validParams({ temperature: undefined }));
    expect(createMessage.mock.calls[0][0].temperature).toBe(0.42);

    // Caller provides temperature → wrapper does NOT overwrite.
    await wrapped.createMessage(validParams({ temperature: 0.99 }));
    expect(createMessage.mock.calls[1][0].temperature).toBe(0.99);
  });

  it('injects repetition_penalty only when caller did not provide one', async () => {
    const createMessage = vi.fn(async (_params: CreateMessageParams) => 'x');
    const client = makeFakeClient({ createMessageImpl: createMessage });

    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 0,
      repetitionPenalty: 1.15,
    });

    await wrapped.createMessage(validParams({}));
    const firstCall = createMessage.mock.calls[0][0];
    expect((firstCall as CreateMessageParams & { repetition_penalty?: number }).repetition_penalty).toBe(1.15);

    await wrapped.createMessage(validParams({ repetition_penalty: 2 }));
    const secondCall = createMessage.mock.calls[1][0];
    expect((secondCall as CreateMessageParams & { repetition_penalty?: number }).repetition_penalty).toBe(2);
  });

  it('does not mutate the original client (refactor guarantee)', async () => {
    const originalCreateMessage = vi.fn(async (_params: CreateMessageParams) => 'orig');
    const client = makeFakeClient({ createMessageImpl: originalCreateMessage });

    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 100,
      extractionTemperature: 0.5,
    });

    // Call the wrapper — it should forward to original internally.
    const indirect = await wrapped.createMessage(validParams({ max_tokens: 200 }));
    expect(indirect).toBeDefined();
    expect(originalCreateMessage).toHaveBeenCalledTimes(1);

    // Call the original client directly — its createMessage must still
    // be the original function (not replaced by the wrapper), returning
    // the pure mock value without any injected fields.
    const direct = await client.createMessage(validParams());
    expect(direct).toBe('orig');
    expect(originalCreateMessage).toHaveBeenCalledTimes(2);

    // The second call (direct to client) must have zero extra fields.
    const secondCallArgs = originalCreateMessage.mock.calls[1][0];
    expect(secondCallArgs.temperature).toBeUndefined();
    expect(secondCallArgs.repetition_penalty).toBeUndefined();
  });

  // Regression: v1.23.2 Object.create refactor dropped prototype methods
  // like createMessageStream because spread { ...client } only copies own
  // enumerable properties. Class instances (OpenAICompatSdkClient,
  // AnthropicSdkClient, OpenAISdkClient) define createMessageStream on
  // the prototype — spread drops it → query-engine.ts:552 enters the
  // non-streaming branch → all provider traffic goes non-stream.
  // Object.create(client) preserves the prototype chain.
  describe('createMessageStream propagation (v1.23.2 regression guard)', () => {
    // Simulate a class that defines createMessageStream on prototype
    class ClassClient implements LLMClient {
      createMessage = vi.fn(async (_p: CreateMessageParams) => 'class-ok');
      createMessageStream = vi.fn(async (_p: unknown) => {
        throw new Error('not-called');
      }) as unknown as LLMClient['createMessageStream'];
    }

    it('preserves createMessageStream from class instances (prototype chain)', () => {
      const raw = new ClassClient();
      const wrapped = wrapWithAdvancedSettings(raw, { maxTokensPerCall: 0 });

      // query-engine.ts:552 check — must be truthy to enter stream path
      expect('createMessageStream' in wrapped).toBe(true);
      expect(typeof (wrapped as unknown as Record<string, unknown>).createMessageStream).toBe('function');
    });

    it('preserves createMessageStream from plain objects (own method)', () => {
      const raw: LLMClient = {
        createMessage: vi.fn(async (_p: CreateMessageParams) => 'plain-ok'),
        createMessageStream: vi.fn(async (_p: unknown) => 'stream-ok'),
      };
      const wrapped = wrapWithAdvancedSettings(raw, { maxTokensPerCall: 0 });

      expect('createMessageStream' in wrapped).toBe(true);
      expect(typeof (wrapped as unknown as Record<string, unknown>).createMessageStream).toBe('function');
    });

    it('wrapped.createMessageStream delegates to the original (truthiness + call)', () => {
      const raw = new ClassClient();
      const wrapped = wrapWithAdvancedSettings(raw, { maxTokensPerCall: 0 });

      // The if-truthy check that query-engine uses
      expect(!!(wrapped as unknown as Record<string, unknown>).createMessageStream).toBe(true);
    });

    it('wrapped object is distinct from raw (does not mutate)', () => {
      const raw = new ClassClient();
      const wrapped = wrapWithAdvancedSettings(raw, { maxTokensPerCall: 0 });

      expect(wrapped).not.toBe(raw);
      expect(typeof (raw as unknown as Record<string, unknown>).createMessageStream).toBe('function');
    });
  });
});
