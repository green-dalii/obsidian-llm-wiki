// Tests for runSchemaAnalyze (ROADMAP v1.17.0 P1 #1).
//
// Background: Suggest Schema Updates was the only remaining "lint cancel path"
// not wired in v1.16.3. Both call sites (command palette + Lint Report
// Modal) bypassed startLintOperation/endLintOperation, so the status bar's
// "click to cancel" did nothing during schema analysis.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Notice } from 'obsidian';
import { runSchemaAnalyze, type SchemaAnalyzeCtx } from '../../schema/analyze';

const NoticeMock = Notice as unknown as {
  instances: Array<{ message: string }>;
};

type CtxOverrides = {
  schemaManagerResult?: unknown;
  schemaManagerError?: Error;
  llmClientPresent?: boolean;
  requireLLMReadyReturn?: boolean;
  initialAbortState?: boolean;
};

type CtxWithMocks = SchemaAnalyzeCtx & {
  wikiEngine: {
    startLintOperation: ReturnType<typeof vi.fn>;
    endLintOperation: ReturnType<typeof vi.fn>;
  };
  schemaManager: {
    suggestSchemaUpdate: ReturnType<typeof vi.fn>;
  };
};

const makeCtx = (overrides: CtxOverrides = {}): CtxWithMocks => {
  const start = vi.fn(() => ({ aborted: overrides.initialAbortState ?? false }));
  const end = vi.fn();
  const schemaManager = {
    suggestSchemaUpdate: vi.fn(async () => {
      if (overrides.schemaManagerError) throw overrides.schemaManagerError;
      return overrides.schemaManagerResult ?? null;
    }),
  };
  return {
    settings: { language: 'en' },
    requireLLMReady: vi.fn(() => overrides.requireLLMReadyReturn ?? true),
    llmClient: overrides.llmClientPresent === false ? null : { createMessage: vi.fn() },
    wikiEngine: { startLintOperation: start, endLintOperation: end },
    schemaManager,
  };
};

describe('runSchemaAnalyze — cancel wiring (ROADMAP v1.17.0 P1 #1)', () => {
  beforeEach(() => {
    NoticeMock.instances.length = 0;
  });

  it('calls startLintOperation and endLintOperation around the LLM call', async () => {
    const ctx = makeCtx({ schemaManagerResult: { changes_needed: false, suggestions: '' } });

    await runSchemaAnalyze(ctx);

    expect(ctx.wikiEngine.startLintOperation).toHaveBeenCalledTimes(1);
    expect(ctx.wikiEngine.endLintOperation).toHaveBeenCalledTimes(1);
    const startOrder = ctx.wikiEngine.startLintOperation.mock.invocationCallOrder[0];
    const endOrder = ctx.wikiEngine.endLintOperation.mock.invocationCallOrder[0];
    expect(startOrder).toBeLessThan(endOrder);
  });

  it('shows "schema suggestions generated" when result.changes_needed is true', async () => {
    const ctx = makeCtx({ schemaManagerResult: { changes_needed: true, suggestions: 'add Foo' } });

    await runSchemaAnalyze(ctx);

    const messages = NoticeMock.instances.map((n) => n.message);
    expect(messages).toContain('Analyzing Wiki and generating schema suggestions...');
    expect(messages).toContain('Schema suggestions generated, see wiki/schema/suggestions.md');
  });

  it('shows "no schema updates needed" when result.changes_needed is false', async () => {
    const ctx = makeCtx({ schemaManagerResult: { changes_needed: false, suggestions: '' } });

    await runSchemaAnalyze(ctx);

    const messages = NoticeMock.instances.map((n) => n.message);
    expect(messages).toContain('No schema updates needed.');
    expect(messages).not.toContain('Schema suggestions generated, see wiki/schema/suggestions.md');
  });

  it('suppresses result Notice when signal was aborted before LLM returned', async () => {
    const ctx = makeCtx({
      schemaManagerResult: { changes_needed: true, suggestions: 'should not be shown' },
      initialAbortState: true,
    });

    await runSchemaAnalyze(ctx);

    const messages = NoticeMock.instances.map((n) => n.message);
    expect(messages).not.toContain('Schema suggestions generated, see wiki/schema/suggestions.md');
    expect(messages).not.toContain('No schema updates needed.');
    expect(ctx.wikiEngine.endLintOperation).toHaveBeenCalledTimes(1);
  });

  it('suppresses error Notice on user-initiated cancel (signal.aborted)', async () => {
    const ctx = makeCtx({
      schemaManagerError: new Error('LLM request aborted'),
      initialAbortState: true,
    });

    await runSchemaAnalyze(ctx);

    const messages = NoticeMock.instances.map((n) => n.message);
    expect(messages).not.toContain('Schema suggestion failed: LLM request aborted');
    expect(ctx.wikiEngine.endLintOperation).toHaveBeenCalledTimes(1);
  });

  it('shows error Notice when LLM fails and signal was NOT aborted', async () => {
    const ctx = makeCtx({ schemaManagerError: new Error('Network timeout') });

    await runSchemaAnalyze(ctx);

    const messages = NoticeMock.instances.map((n) => n.message);
    expect(messages).toContain('Schema suggestion failed: Network timeout');
    expect(ctx.wikiEngine.endLintOperation).toHaveBeenCalledTimes(1);
  });

  it('returns early (no startLintOperation) when requireLLMReady fails', async () => {
    const ctx = makeCtx({ requireLLMReadyReturn: false });

    await runSchemaAnalyze(ctx);

    expect(ctx.wikiEngine.startLintOperation).toHaveBeenCalledTimes(0);
    expect(ctx.wikiEngine.endLintOperation).toHaveBeenCalledTimes(0);
  });

  it('shows errorNoApiKey Notice and returns early when llmClient is null', async () => {
    const ctx = makeCtx({ llmClientPresent: false });

    await runSchemaAnalyze(ctx);

    const messages = NoticeMock.instances.map((n) => n.message);
    expect(messages).toContain('Please configure API Key first');
    expect(ctx.wikiEngine.startLintOperation).toHaveBeenCalledTimes(0);
  });

  it('always calls endLintOperation in finally even when schemaManager throws', async () => {
    const ctx = makeCtx({ schemaManagerError: new Error('boom') });

    await runSchemaAnalyze(ctx);

    expect(ctx.wikiEngine.endLintOperation).toHaveBeenCalledTimes(1);
  });
});
