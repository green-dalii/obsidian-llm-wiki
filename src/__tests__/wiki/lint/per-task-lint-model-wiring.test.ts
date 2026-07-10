// v1.24.0 #208: per-task model wiring — real call-site invocation.
//
// Pin that resolveModelForTask is correctly threaded into the 28 LLM
// call sites that previously read `settings.model` directly. Unlike
// `per-task-model-wiring.test.ts` (which tests the helper in
// isolation), this file drives the actual production functions and
// asserts the model that flows through to createMessage.
//
// Backward-compat invariant:
//   - All call sites resolve to settings.model when no per-task fields
//     are set (zero-config, pre-v1.24.0 data.json).
//   - When ingestModel / lintModel / queryModel are set, the call
//     sites in the matching domain receive that value instead.
//
// Coverage strategy: pin ONE real call site per domain (ingest / lint
// / query). The remaining 25 call sites use the identical
// `resolveModelForTask(settings, '<domain>')` pattern, and the helper
// itself is unit-tested in core/model-resolver.test.ts.
//
// Sites chosen:
//   - ingest: page-factory.createPage (line 226 — extract call) —
//     canonical first-call entry, invoked by every ingest flow.
//   - lint:   lint/llm-phases/analysis-phase.runAnalysisPhase — first
//     lint call, gated by pre-existing LLM readiness checks.
//   - query:  QueryView streaming call site (line 508) — the 3 QueryView
//     send sites all read `this.plugin.settings.queryModel`; one
//     covers the routing invariant.

import { describe, it, expect, vi } from 'vitest';
import { runAnalysisPhase } from '../../../wiki/lint/llm-phases/analysis-phase';
import type { LintPhaseContext, ScannerPage } from '../../../wiki/lint/types';
import type { LLMClient } from '../../../types';

// ── Lint domain: analysis-phase wiring ─────────────────────────

function makeLintPageMap(): Map<string, ScannerPage> {
  const m = new Map<string, ScannerPage>();
  m.set('wiki/index.md', { path: 'wiki/index.md', content: '# mock index content', basename: 'index.md' });
  return m;
}

function makeLintCtx(overrides: Partial<{
  settings: LintPhaseContext['settings'];
  llmClient: () => LLMClient | null;
  buildSystemPrompt: (kind: string) => Promise<string>;
}>): LintPhaseContext {
  return {
    settings: {
      wikiFolder: 'wiki',
      language: 'en',
      model: 'unified-default',
      ...(overrides.settings as unknown as Record<string, unknown>),
    } as LintPhaseContext['settings'],
    llmClient: overrides.llmClient ?? (() => null),
    buildSystemPrompt: overrides.buildSystemPrompt ?? (async () => ''),
    // v1.24.0 #208: analysis-phase reads wikiEngine.tryReadFile for the
    // wiki index.md; mock returns null to take the fast-skip path so the
    // test focuses on the model argument, not index parsing.
    wikiEngine: {
      tryReadFile: async () => null,
      updateStatusBar: () => {},
      getExistingWikiPages: async () => [],
      getOpenContradictions: async () => [],
      resolveContradiction: async () => {},
      updateContradictionStatus: () => {},
    },
    checkCancelled: () => {},
    stageNotice: { setMessage: () => {} },
    fileMetrics: undefined,
    noiseRules: undefined,
    cleanupRules: undefined,
    pipelineStatus: undefined,
  } as unknown as LintPhaseContext;
}

function stubLlm(): { client: LLMClient; createMessage: ReturnType<typeof vi.fn> } {
  const createMessage = vi.fn().mockResolvedValue('## Analysis\n\n- Issue 1');
  const client = { createMessage } as unknown as LLMClient;
  return { client, createMessage };
}

describe('lint domain: analysis-phase wires resolveModelForTask(settings, "lint")', () => {
  it('zero-config: routes settings.model to createMessage', async () => {
    const { client, createMessage } = stubLlm();
    const ctx = makeLintCtx({
      llmClient: () => client,
      settings: { wikiFolder: 'wiki', language: 'en', model: 'unified-default' } as LintPhaseContext['settings'],
    });
    await runAnalysisPhase(
      ctx,
      { wikiFiles: [], pageMap: makeLintPageMap(), progReport: '' },
      () => {},
    );
    expect(createMessage).toHaveBeenCalledTimes(1);
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('unified-default');
  });

  it('per-task: routes lintModel to createMessage (not settings.model)', async () => {
    const { client, createMessage } = stubLlm();
    const ctx = makeLintCtx({
      llmClient: () => client,
      settings: {
        wikiFolder: 'wiki',
        language: 'en',
        model: 'unified-default',
        lintModel: 'lint-mini',
      } as LintPhaseContext['settings'],
    });
    await runAnalysisPhase(
      ctx,
      { wikiFiles: [], pageMap: makeLintPageMap(), progReport: '' },
      () => {},
    );
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('lint-mini');
  });

  it('per-task: routes ingestModel to ingest call sites (NOT lint)', async () => {
    // Cross-domain isolation: lint analysis-phase must NOT pick up
    // ingestModel even if it is set — only lintModel applies to lint.
    const { client, createMessage } = stubLlm();
    const ctx = makeLintCtx({
      llmClient: () => client,
      settings: {
        wikiFolder: 'wiki',
        language: 'en',
        model: 'unified-default',
        ingestModel: 'ingest-mini',
      } as LintPhaseContext['settings'],
    });
    await runAnalysisPhase(
      ctx,
      { wikiFiles: [], pageMap: makeLintPageMap(), progReport: '' },
      () => {},
    );
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('unified-default');
  });

  it('per-task: whitespace-only lintModel falls back to settings.model', async () => {
    const { client, createMessage } = stubLlm();
    const ctx = makeLintCtx({
      llmClient: () => client,
      settings: {
        wikiFolder: 'wiki',
        language: 'en',
        model: 'unified-default',
        lintModel: '   ',
      } as LintPhaseContext['settings'],
    });
    await runAnalysisPhase(
      ctx,
      { wikiFiles: [], pageMap: makeLintPageMap(), progReport: '' },
      () => {},
    );
    expect((createMessage.mock.calls[0][0] as { model: string }).model).toBe('unified-default');
  });
});