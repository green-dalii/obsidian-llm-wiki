// test-connection-gate.test.ts
//
// v1.23.0 LM Studio hotfix (#214): verify that local providers (ollama,
// lmstudio) with empty apiKey bypass the gate in testLLMConnection,
// while cloud providers (openai, anthropic) still require a key.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import LLMWikiPlugin from '../../main';

// Mock the create-llm-client module so testLLMConnection doesn't
// try to dynamically import AI-SDK packages (which would fail in
// the test environment).
vi.mock('../../llm-sdk/create-llm-client', () => ({
  createLLMClientFromSettingsSync: vi.fn(() => ({
    createMessage: vi.fn().mockResolvedValue('ok'),
    createMessageStream: vi.fn(),
    listModels: vi.fn().mockResolvedValue([]),
  })),
  preloadLLMClientModules: vi.fn().mockResolvedValue(undefined),
  _resetPreloadedModulesForTests: vi.fn(),
}));

describe('testLLMConnection — local provider API key gate', () => {
  const mockApp = {
    vault: {
      getAbstractFileByPath: vi.fn().mockReturnValue(null),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      read: vi.fn().mockResolvedValue(''),
    },
  };
  const mockManifest = {
    id: 'test-plugin',
    name: 'Test',
    version: '1.0.0',
    minAppVersion: '0.15.0',
  };
  let plugin: LLMWikiPlugin;

  beforeEach(() => {
    vi.clearAllMocks();
    plugin = new LLMWikiPlugin(mockApp as never, mockManifest as never);
    // Provide minimal settings required by testLLMConnection
    (plugin as unknown as Record<string, unknown>).settings = {
      provider: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5-7b',
      language: 'en',
      wikiFolder: 'wiki',
      llmReady: false,
      maxTokensPerCall: 0,
      autoIngestNotificationLevel: 'notice',
      autoWatchSources: false,
      startupCheck: false,
      slugCase: 'preserve',
    };
  });

  it('allows lmstudio provider with empty apiKey to bypass the gate (the fix)', async () => {
    (plugin as unknown as Record<string, unknown>).settings = {
      ...(plugin as unknown as Record<string, unknown>).settings as Record<string, unknown>,
      provider: 'lmstudio',
      apiKey: '',
    };

    const result = await plugin.testLLMConnection();

    // Should NOT return the apiKey error — if it bypasses the gate,
    // it reaches the mocked createLLMClient which returns success.
    expect(result.success).toBe(true);
  });

  it('allows ollama provider with empty apiKey to bypass the gate (existing behavior)', async () => {
    (plugin as unknown as Record<string, unknown>).settings = {
      ...(plugin as unknown as Record<string, unknown>).settings as Record<string, unknown>,
      provider: 'ollama',
      apiKey: '',
    };

    const result = await plugin.testLLMConnection();

    expect(result.success).toBe(true);
  });

  it('rejects openai provider with empty apiKey', async () => {
    (plugin as unknown as Record<string, unknown>).settings = {
      ...(plugin as unknown as Record<string, unknown>).settings as Record<string, unknown>,
      provider: 'openai',
      apiKey: '',
    };

    const result = await plugin.testLLMConnection();

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/API Key/i);
  });

  it('rejects anthropic provider with empty apiKey', async () => {
    (plugin as unknown as Record<string, unknown>).settings = {
      ...(plugin as unknown as Record<string, unknown>).settings as Record<string, unknown>,
      provider: 'anthropic',
      apiKey: '',
    };

    const result = await plugin.testLLMConnection();

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/API Key/i);
  });

  it('rejects gemini (openai-compatible) provider with empty apiKey', async () => {
    (plugin as unknown as Record<string, unknown>).settings = {
      ...(plugin as unknown as Record<string, unknown>).settings as Record<string, unknown>,
      provider: 'gemini',
      apiKey: '',
    };

    const result = await plugin.testLLMConnection();

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/API Key/i);
  });

  it('allows lmstudio with a non-empty apiKey (normal config)', async () => {
    (plugin as unknown as Record<string, unknown>).settings = {
      ...(plugin as unknown as Record<string, unknown>).settings as Record<string, unknown>,
      provider: 'lmstudio',
      apiKey: 'some-key',
    };

    const result = await plugin.testLLMConnection();

    expect(result.success).toBe(true);
  });
});

// v1.24.0 #208: per-task Test Connection. When usePerTaskModels is on,
// every task's model must probe successfully; ANY failure aborts the
// whole test (returns failure with the actual error message from the
// failing task).
describe('testLLMConnection — per-task model probes (#208)', () => {
  const mockApp = {
    vault: {
      getAbstractFileByPath: vi.fn().mockReturnValue(null),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      read: vi.fn().mockResolvedValue(''),
    },
  };
  const mockManifest = {
    id: 'test-plugin',
    name: 'Test',
    version: '1.0.0',
    minAppVersion: '0.15.0',
  };

  /**
   * Build a plugin whose settings mirror a real per-task config.
   * The mock createMessage is per-instance — we capture the (model,
   * callIndex) pair so each test can assert the sequence of probed
   * models.
   */
  function makePlugin(perTaskSettings: Record<string, unknown>) {
    const plugin = new LLMWikiPlugin(mockApp as never, mockManifest as never);
    (plugin as unknown as Record<string, unknown>).settings = {
      provider: 'openai',
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1',
      language: 'en',
      wikiFolder: 'wiki',
      llmReady: false,
      maxTokensPerCall: 0,
      autoIngestNotificationLevel: 'notice',
      autoWatchSources: false,
      startupCheck: false,
      slugCase: 'preserve',
      ...perTaskSettings,
    };
    return plugin;
  }

  it('unified mode: probes only settings.model (single call)', async () => {
    const { createLLMClientFromSettingsSync } = await import('../../llm-sdk/create-llm-client');
    const createMessage = vi.fn().mockResolvedValue('ok');
    vi.mocked(createLLMClientFromSettingsSync).mockReturnValue({
      createMessage,
      createMessageStream: vi.fn(),
      listModels: vi.fn().mockResolvedValue([]),
    });
    const plugin = makePlugin({});
    const result = await plugin.testLLMConnection();
    expect(result.success).toBe(true);
    expect(createMessage).toHaveBeenCalledTimes(1);
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('gpt-4.1');
  });

  it('per-task mode: probes all three tasks in order ingest → lint → query', async () => {
    const { createLLMClientFromSettingsSync } = await import('../../llm-sdk/create-llm-client');
    const createMessage = vi.fn().mockResolvedValue('ok');
    vi.mocked(createLLMClientFromSettingsSync).mockReturnValue({
      createMessage,
      createMessageStream: vi.fn(),
      listModels: vi.fn().mockResolvedValue([]),
    });
    const plugin = makePlugin({
      usePerTaskModels: true,
      ingestModel: 'gpt-4.1-mini',
      lintModel: 'gpt-4o-mini',
      queryModel: 'gpt-5',
    });
    const result = await plugin.testLLMConnection();
    expect(result.success).toBe(true);
    expect(createMessage).toHaveBeenCalledTimes(3);
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('gpt-4.1-mini'); // ingest
    expect((createMessage.mock.calls[1][0] as { model: string }).model).toBe('gpt-4o-mini'); // lint
    expect((createMessage.mock.calls[2][0] as { model: string }).model).toBe('gpt-5');      // query
  });

  it('per-task mode: empty per-task values fall back to settings.model', async () => {
    const { createLLMClientFromSettingsSync } = await import('../../llm-sdk/create-llm-client');
    const createMessage = vi.fn().mockResolvedValue('ok');
    vi.mocked(createLLMClientFromSettingsSync).mockReturnValue({
      createMessage,
      createMessageStream: vi.fn(),
      listModels: vi.fn().mockResolvedValue([]),
    });
    const plugin = makePlugin({ usePerTaskModels: true });
    // All three per-task fields undefined → all probe settings.model.
    const result = await plugin.testLLMConnection();
    expect(result.success).toBe(true);
    expect(createMessage).toHaveBeenCalledTimes(3);
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('gpt-4.1');
    expect((createMessage.mock.calls[1][0] as { model: string }).model).toBe('gpt-4.1');
    expect((createMessage.mock.calls[2][0] as { model: string }).model).toBe('gpt-4.1');
  });

  it('per-task mode: failure on lint task aborts before query probe', async () => {
    const { createLLMClientFromSettingsSync } = await import('../../llm-sdk/create-llm-client');
    // First call (ingest) succeeds, second call (lint) throws, third
    // (query) should never run.
    const createMessage = vi.fn()
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('lint model 400: model not found'))
      .mockResolvedValue('ok'); // would resolve if called
    vi.mocked(createLLMClientFromSettingsSync).mockReturnValue({
      createMessage,
      createMessageStream: vi.fn(),
      listModels: vi.fn().mockResolvedValue([]),
    });
    const plugin = makePlugin({
      usePerTaskModels: true,
      ingestModel: 'gpt-4.1-mini',
      lintModel: 'gpt-4o-mini', // ← fails
      queryModel: 'gpt-5',       // ← never reached
    });
    const result = await plugin.testLLMConnection();
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/lint model 400/);
    // Critical: query probe must NOT have been issued (sequential,
    // fail-fast). If we ran all 3 in parallel, this would be 3 — pin 2.
    expect(createMessage).toHaveBeenCalledTimes(2);
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('gpt-4.1-mini'); // ingest succeeded
    expect((createMessage.mock.calls[1][0] as { model: string }).model).toBe('gpt-4o-mini'); // lint failed
  });
});
