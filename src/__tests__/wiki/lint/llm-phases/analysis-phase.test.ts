// v1.24.0: analysis-phase extraction from controller.ts:runLintWiki.
//
// The original implementation (lines 409-470) does 3 things:
//   1. Read the index.md from the wiki folder
//   2. Build a content sample (first 8 wiki pages × 600 chars each)
//   3. Construct the LLM analysis prompt with 5 placeholders, call the LLM,
//      and return the cleaned markdown response
//
// The phase is extracted into a single async function returning the cleaned
// LLM string. Pure helpers (`buildContentSample`, `buildAnalysisPrompt`)
// are exported for unit testing.

import { describe, it, expect, vi } from 'vitest';
import {
  buildContentSample,
  buildAnalysisPrompt,
  runAnalysisPhase,
  type AnalysisPhaseInput,
} from '../../../../wiki/lint/llm-phases/analysis-phase';
import type { LintPhaseContext, ScannerPage } from '../../../../wiki/lint/types';
import type { LLMClient } from '../../../../types';

function makePageMap(entries: Array<[string, string]>): Map<string, ScannerPage> {
  const m = new Map<string, ScannerPage>();
  for (const [path, content] of entries) {
    m.set(path, { path, content, basename: path.split('/').pop() || path });
  }
  return m;
}

const SAMPLE_TEXTS = {
  lintAnalysisPrompt: 'Analyze: {index} {total} {sample} {contentSample} {progReport}',
} as Record<string, string>;

// ── Pure helper: buildContentSample ─────────────────────────────

describe('buildContentSample', () => {
  it('returns empty string when wikiFiles is empty', () => {
    const result = buildContentSample([], new Map());
    expect(result).toBe('');
  });

  it('includes up to 8 pages, each truncated to 600 chars', () => {
    const wikiFiles = Array.from({ length: 8 }, (_, i) => ({
      path: `wiki/entities/page${i}.md`,
      basename: `page${i}.md`,
    }));
    const pageMap = makePageMap(
      wikiFiles.map((f, i) => [f.path, 'A'.repeat(1000) + `body${i}`])
    );
    const result = buildContentSample(wikiFiles, pageMap);
    for (let i = 0; i < 8; i++) {
      expect(result).toContain(`page${i}.md`);
    }
    // Each page is truncated to 600 chars; 1000 'A's are not in the sample
    expect(result).not.toContain('A'.repeat(700));
  });

  it('limits to first 8 pages when wikiFiles has more', () => {
    const wikiFiles = Array.from({ length: 12 }, (_, i) => ({
      path: `wiki/entities/page${i}.md`,
      basename: `page${i}.md`,
    }));
    const pageMap = makePageMap(
      wikiFiles.map((f) => [f.path, 'content'])
    );
    const result = buildContentSample(wikiFiles, pageMap);
    expect(result).toContain('page0');
    expect(result).toContain('page7');
    expect(result).not.toContain('page8');
    expect(result).not.toContain('page11');
  });

  it('skips pages missing from pageMap', () => {
    const wikiFiles = [
      { path: 'wiki/entities/a.md', basename: 'a.md' },
      { path: 'wiki/entities/missing.md', basename: 'missing.md' },
      { path: 'wiki/entities/b.md', basename: 'b.md' },
    ];
    const pageMap = makePageMap([
      ['wiki/entities/a.md', 'AAA content'],
      ['wiki/entities/b.md', 'BBB content'],
    ]);
    const result = buildContentSample(wikiFiles, pageMap);
    expect(result).toContain('AAA');
    expect(result).toContain('BBB');
    expect(result).not.toContain('missing');
  });
});

// ── Pure helper: buildAnalysisPrompt ────────────────────────────

describe('buildAnalysisPrompt', () => {
  // Settings must include the fields appendGranularityToPrompt reads off
  // settings, otherwise it falls back to 'standard'. Using an empty
  // object causes the helper to emit the default granularity instruction
  // (and the buildSystemPrompt composer emits the active tag vocabulary
  // at the system layer; this helper no longer touches it). We assert
  // the placeholders are replaced; the granularity suffix is tested
  // below.
  const settings = {} as unknown as LintPhaseContext['settings'];

  it('replaces all 5 placeholders', () => {
    const result = buildAnalysisPrompt(
      SAMPLE_TEXTS.lintAnalysisPrompt,
      settings,
      'INDEX_CONTENT',
      'SAMPLE_CONTENT',
      'PROG_REPORT',
      100,
      8,
      'No issues detected by programmatic checks.',
    );
    // The 5 placeholders are replaced; granularity/vocab instructions
    // may be appended by the helper wrappers.
    expect(result).toContain('INDEX_CONTENT');
    expect(result).toContain('PROG_REPORT');
    expect(result).toContain('SAMPLE_CONTENT');
    expect(result).not.toContain('{index}');
    expect(result).not.toContain('{total}');
    expect(result).not.toContain('{sample}');
    expect(result).not.toContain('{contentSample}');
    expect(result).not.toContain('{progReport}');
  });

  it('uses "No issues detected" fallback when progReport is empty', () => {
    const result = buildAnalysisPrompt(
      SAMPLE_TEXTS.lintAnalysisPrompt,
      settings,
      'index', 'sample', '', 100, 8,
      'No issues detected by programmatic checks.',
    );
    expect(result).toContain('No issues detected by programmatic checks.');
  });
});

// ── runAnalysisPhase integration tests ──────────────────────────

function makeLintPhaseContext(overrides: Partial<LintPhaseContext> = {}): LintPhaseContext {
  return {
    app: {} as LintPhaseContext['app'],
    settings: {
      wikiFolder: 'wiki',
      language: 'en',
      model: 'test-model',
      disableThinking: false,
    } as unknown as LintPhaseContext['settings'],
    llmClient: () => null,
    wikiEngine: {
      updateStatusBar: () => {},
      tryReadFile: vi.fn().mockResolvedValue('mock index content'),
    } as unknown as LintPhaseContext['wikiEngine'],
    checkCancelled: () => {},
    stageNotice: { setMessage: () => {} },
    totalPages: 0,
    buildSystemPrompt: async () => undefined,
    ...overrides,
  };
}

function stubLlm(jsonOrText: string): { client: LLMClient; createMessage: ReturnType<typeof vi.fn> } {
  const createMessage = vi.fn().mockResolvedValue(jsonOrText);
  const client = { createMessage } as unknown as LLMClient;
  return { client, createMessage };
}

describe('runAnalysisPhase', () => {
  it('throws when llmClient is null (regression of W3 fix — match OLD fail-fast semantics)', async () => {
    // v1.24.0 W3: the FIRST-pass implementation silently returned '' when
    // llmClient was null. The OLD inline code at controller.ts:463 would
    // throw on `ctx.llmClient.createMessage(...)` when llmClient was null.
    // This test pins the restored fail-fast behavior so a future refactor
    // doesn't reintroduce the silent-return regression.
    const ctx = makeLintPhaseContext({ llmClient: () => null });
    const input: AnalysisPhaseInput = {
      wikiFiles: [],
      pageMap: new Map(),
      progReport: '',
    };
    await expect(runAnalysisPhase(ctx, input, () => {})).rejects.toThrow(
      /LLM client not available/i
    );
  });

  it('reads index.md, builds sample, calls LLM with schema context, returns cleaned markdown', async () => {
    const { client, createMessage } = stubLlm('## Analysis\n\n- Issue 1\n- Issue 2');
    const ctx = makeLintPhaseContext({
      llmClient: () => client,
      buildSystemPrompt: async () => 'SCHEMA_CONTEXT_FOR_LINT',
    });
    const wikiFiles = [
      { path: 'wiki/entities/a.md', basename: 'a.md' },
      { path: 'wiki/entities/b.md', basename: 'b.md' },
    ];
    const pageMap = makePageMap([
      ['wiki/entities/a.md', 'A content'],
      ['wiki/entities/b.md', 'B content'],
    ]);
    const input: AnalysisPhaseInput = {
      wikiFiles, pageMap, progReport: 'Programmatic findings',
    };
    const result = await runAnalysisPhase(ctx, input, () => {});
    expect(createMessage).toHaveBeenCalledTimes(1);
    const callArgs = createMessage.mock.calls[0][0] as {
      max_tokens: number;
      system?: string;
      messages: Array<{ content: string }>;
    };
    expect(callArgs.max_tokens).toBeGreaterThan(0);
    // System prompt contains the schema context.
    expect(callArgs.system).toContain('SCHEMA_CONTEXT_FOR_LINT');
    // Prompt contains the index content
    expect(callArgs.messages[0].content).toContain('mock index content');
    // Prompt contains the progReport (no fallback)
    expect(callArgs.messages[0].content).toContain('Programmatic findings');
    // Result is the cleaned LLM response
    expect(result).toContain('## Analysis');
  });

  it('omits system prompt when schema context is empty', async () => {
    const { client, createMessage } = stubLlm('## Analysis');
    const ctx = makeLintPhaseContext({
      llmClient: () => client,
      buildSystemPrompt: async () => '',
    });
    const input: AnalysisPhaseInput = {
      wikiFiles: [{ path: 'wiki/entities/a.md', basename: 'a.md' }],
      pageMap: makePageMap([['wiki/entities/a.md', 'A']]),
      progReport: '',
    };
    await runAnalysisPhase(ctx, input, () => {});
    const callArgs = createMessage.mock.calls[0][0] as { system?: string };
    expect(callArgs.system).toBeUndefined();
  });

  it('passes disableThinking=false when settings.disableThinking is false', async () => {
    const { client, createMessage } = stubLlm('## LLM output');
    const ctx = makeLintPhaseContext({
      llmClient: () => client,
      settings: {
        wikiFolder: 'wiki', language: 'en', model: 'test', disableThinking: false,
      } as LintPhaseContext['settings'],
    });
    const input: AnalysisPhaseInput = {
      wikiFiles: [{ path: 'wiki/entities/a.md', basename: 'a.md' }],
      pageMap: makePageMap([['wiki/entities/a.md', 'A']]),
      progReport: '',
    };
    await runAnalysisPhase(ctx, input, () => {});
    const callArgs = createMessage.mock.calls[0][0] as { enableThinking?: boolean };
    // When disableThinking=false, the prompt builder should NOT include
    // the enableThinking: false override (the LLM client decides).
    expect(callArgs.enableThinking).toBeUndefined();
  });

  it('passes disableThinking=true when settings.disableThinking is true', async () => {
    const { client, createMessage } = stubLlm('## LLM output');
    const ctx = makeLintPhaseContext({
      llmClient: () => client,
      settings: {
        wikiFolder: 'wiki', language: 'en', model: 'test', disableThinking: true,
      } as LintPhaseContext['settings'],
    });
    const input: AnalysisPhaseInput = {
      wikiFiles: [{ path: 'wiki/entities/a.md', basename: 'a.md' }],
      pageMap: makePageMap([['wiki/entities/a.md', 'A']]),
      progReport: '',
    };
    await runAnalysisPhase(ctx, input, () => {});
    const callArgs = createMessage.mock.calls[0][0] as { enableThinking?: boolean };
    expect(callArgs.enableThinking).toBe(false);
  });
});
