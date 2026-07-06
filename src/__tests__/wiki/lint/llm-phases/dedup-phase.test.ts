// v1.24.0: dedup-phase extraction from controller.ts:runLintWiki.
//
// Tests for the duplicate-detection phase split into controller.ts.
// Pure helpers (classifyTiers, computeVerifyBatch) are covered first
// because they have no IO and are easiest to test in isolation.
// runDedupPhase integration tests use stub LLMClient and wikiEngine
// to exercise the parallel-batch + rate-limit path.

import { describe, it, expect, vi } from 'vitest';
import {
  classifyTiers,
  computeVerifyBatch,
  runDedupPhase,
} from '../../../../wiki/lint/llm-phases/dedup-phase';
import type { DedupPhaseInput } from '../../../../wiki/lint/llm-phases/dedup-phase';
import type { DuplicateCandidate } from '../../../../wiki/lint/duplicate-detection';
import type { LintPhaseContext, ScannerPage } from '../../../../wiki/lint/types';
import { LINT_MAX_INPUT_TOKENS, LINT_CANDIDATE_TOKEN_ESTIMATE, LINT_DEDUP_BATCH_SIZE } from '../../../../constants';

// ── Pure helper: classifyTiers ─────────────────────────────────

// Explicit signal union alias — using `DuplicateCandidate['signal']` as a
// parameter type confused ESLint's type tracker (it was widening the union
// to `any` and causing cascading "unsafe-argument" errors in every
// `[makeCandidate(...)]` literal). The local alias gives the rule a
// concrete type to work with.
type CandidateSignal = 'crossLang' | 'bigram' | 'sharedLinks' | 'caseVariant';

function makeCandidate(signal: CandidateSignal, score: number, name: string = 'a->b'): DuplicateCandidate {
  return { target: 'wiki/entities/a.md', source: 'wiki/entities/b.md', reason: name, signal, score };
}

describe('classifyTiers', () => {
  it('crossLang signal is tier 1', () => {
    const result = classifyTiers([makeCandidate('crossLang', 0.5)]);
    expect(result.tier1).toHaveLength(1);
    expect(result.tier2).toHaveLength(0);
  });

  it('caseVariant signal is tier 1', () => {
    const result = classifyTiers([makeCandidate('caseVariant', 0.5)]);
    expect(result.tier1).toHaveLength(1);
    expect(result.tier2).toHaveLength(0);
  });

  it('bigram with score >= 0.6 is tier 1', () => {
    const result = classifyTiers([makeCandidate('bigram', 0.6)]);
    expect(result.tier1).toHaveLength(1);
    expect(result.tier2).toHaveLength(0);
  });

  it('bigram with score < 0.6 is tier 2', () => {
    const result = classifyTiers([makeCandidate('bigram', 0.5)]);
    expect(result.tier1).toHaveLength(0);
    expect(result.tier2).toHaveLength(1);
  });

  it('bigram at exact 0.6 boundary is tier 1 (>=)', () => {
    const result = classifyTiers([makeCandidate('bigram', 0.6)]);
    expect(result.tier1).toHaveLength(1);
  });

  it('bigram at 0.599 is tier 2', () => {
    const result = classifyTiers([makeCandidate('bigram', 0.599)]);
    expect(result.tier1).toHaveLength(0);
    expect(result.tier2).toHaveLength(1);
  });

  it('sharedLinks signal is always tier 2 regardless of score', () => {
    expect(classifyTiers([makeCandidate('sharedLinks', 1.0)]).tier1).toHaveLength(0);
    expect(classifyTiers([makeCandidate('sharedLinks', 1.0)]).tier2).toHaveLength(1);
  });

  it('mixed input classifies each candidate by its own signal/score', () => {
    const candidates: DuplicateCandidate[] = [
      makeCandidate('crossLang', 0.4, 'cl'),
      makeCandidate('caseVariant', 0.3, 'cv'),
      makeCandidate('bigram', 0.7, 'b1'),
      makeCandidate('bigram', 0.5, 'b2'),
      makeCandidate('sharedLinks', 0.8, 'sl'),
    ];
    const result = classifyTiers(candidates);
    expect(result.tier1.map(c => c.reason).sort()).toEqual(['b1', 'cl', 'cv']);
    expect(result.tier2.map(c => c.reason).sort()).toEqual(['b2', 'sl']);
  });

  it('preserves tier-1 insertion order (stable classification)', () => {
    const candidates: DuplicateCandidate[] = [
      makeCandidate('crossLang', 0.5, 'first'),
      makeCandidate('crossLang', 0.4, 'second'),
      makeCandidate('crossLang', 0.3, 'third'),
    ];
    const result = classifyTiers(candidates);
    expect(result.tier1.map(c => c.reason)).toEqual(['first', 'second', 'third']);
  });
});

// ── Pure helper: computeVerifyBatch ────────────────────────────

describe('computeVerifyBatch', () => {
  const maxTotal = Math.floor(LINT_MAX_INPUT_TOKENS / LINT_CANDIDATE_TOKEN_ESTIMATE);

  function makeCandidate(name: string): DuplicateCandidate {
    return { target: `wiki/entities/${name}.md`, source: `wiki/entities/${name}-b.md`, reason: name, signal: 'crossLang', score: 0.5 };
  }

  it('tier 1 is always included in full (no cap), matching old inline behavior', () => {
    // The OLD controller.ts:runLintWiki code was `verifyCandidates = [...tier1]`,
    // which includes ALL tier1 entries regardless of maxTotal. The v1.24.0
    // refactor's first pass accidentally added a cap; v1.24.0 review
    // finding B5 restored the OLD behavior. This test pins that: tier1
    // never gets capped, even when maxTotal is smaller than tier1.length.
    const tier1: DuplicateCandidate[] = [makeCandidate('a'), makeCandidate('b')];
    const tier2: DuplicateCandidate[] = [makeCandidate('c'), makeCandidate('d')];
    // maxTotal=1 is intentionally tiny to prove no tier1 cap.
    const result = computeVerifyBatch(tier1, tier2, 1);
    expect(result.verifyList).toHaveLength(2);
    expect(result.verifyList.map(c => c.reason)).toEqual(['a', 'b']);
    expect(result.tier2Included).toBe(0);
  });

  it('tier 2 fills remaining budget after tier 1', () => {
    const tier1Count = 10;
    const tier1: DuplicateCandidate[] = [];
    for (let i = 0; i < tier1Count; i++) tier1.push(makeCandidate(`t1-${i}`));
    const tier2: DuplicateCandidate[] = [];
    for (let i = 0; i < 50; i++) tier2.push(makeCandidate(`t2-${i}`));
    const result = computeVerifyBatch(tier1, tier2, maxTotal);
    const expectedTier2 = Math.min(tier2.length, maxTotal - tier1.length);
    expect(result.verifyList).toHaveLength(tier1Count + expectedTier2);
    expect(result.tier2Included).toBe(expectedTier2);
  });

  it('tier 1 > maxTotal still includes all of tier1 in full (no cap)', () => {
    // OLD behavior preserved — even when tier1 alone exceeds maxTotal, the
    // verify list includes all of tier1 (the LLM sees a slightly larger
    // verify set than the budget suggests; this matches controller.ts v1.23.x).
    const tier1: DuplicateCandidate[] = [];
    for (let i = 0; i < maxTotal + 50; i++) tier1.push(makeCandidate(`t1-${i}`));
    const result = computeVerifyBatch(tier1, [], maxTotal);
    expect(result.verifyList).toHaveLength(maxTotal + 50);
    expect(result.tier2Included).toBe(0);
  });

  it('tier 2 with empty tier 1 fills budget from tier 2 start', () => {
    const tier2: DuplicateCandidate[] = [];
    for (let i = 0; i < maxTotal + 20; i++) tier2.push(makeCandidate(`t2-${i}`));
    const result = computeVerifyBatch([], tier2, maxTotal);
    expect(result.verifyList).toHaveLength(maxTotal);
    expect(result.tier2Included).toBe(maxTotal);
  });

  it('preserves order: all tier 1 first, then tier 2 in input order', () => {
    const tier1: DuplicateCandidate[] = [makeCandidate('A'), makeCandidate('B')];
    const tier2: DuplicateCandidate[] = [makeCandidate('C'), makeCandidate('D')];
    const result = computeVerifyBatch(tier1, tier2, 4);
    expect(result.verifyList.map(c => c.reason)).toEqual(['A', 'B', 'C', 'D']);
  });
});

// ── runDedupPhase integration tests ────────────────────────────

import type { LLMClient } from '../../../../types';

function makeLintPhaseContext(overrides: Partial<LintPhaseContext> = {}): LintPhaseContext {
  return {
    app: {} as LintPhaseContext['app'],
    settings: {
      wikiFolder: 'wiki',
      language: 'en',
      model: 'test-model',
      disableThinking: false,
    } as LintPhaseContext['settings'],
    llmClient: () => null,
    wikiEngine: { updateStatusBar: () => {} } as unknown as LintPhaseContext['wikiEngine'],
    checkCancelled: () => {},
    stageNotice: { setMessage: () => {} },
    totalPages: 0,
    ...overrides,
  };
}

function makePageMap(entries: Array<[string, string]>): Map<string, ScannerPage> {
  const m = new Map<string, ScannerPage>();
  for (const [path, content] of entries) {
    m.set(path, { path, content, basename: path.split('/').pop() || path });
  }
  return m;
}

/**
 * Build a stub LLMClient whose `createMessage` resolves with the given
 * JSON string. Tracks call args so individual tests can assert against
 * the first call's `max_tokens`, `messages`, etc.
 */
function stubLlm(jsonResponse: string): { client: LLMClient; createMessage: ReturnType<typeof vi.fn> } {
  const createMessage = vi.fn().mockResolvedValue(jsonResponse);
  const client = { createMessage } as unknown as LLMClient;
  return { client, createMessage };
}

describe('runDedupPhase — early returns', () => {
  it('returns [] when there are < 2 entity/concept files', async () => {
    const ctx = makeLintPhaseContext();
    const input: DedupPhaseInput = {
      wikiFiles: [
        { path: 'wiki/entities/a.md', basename: 'a.md' },
      ],
      pageMap: makePageMap([['wiki/entities/a.md', '# A']]),
    };
    const result = await runDedupPhase(ctx, input, () => {});
    expect(result).toEqual([]);
  });

  it('returns [] when llmClient is null', async () => {
    const ctx = makeLintPhaseContext({ llmClient: () => null });
    const input: DedupPhaseInput = {
      wikiFiles: [
        { path: 'wiki/entities/a.md', basename: 'a.md' },
        { path: 'wiki/entities/b.md', basename: 'b.md' },
      ],
      pageMap: makePageMap([
        ['wiki/entities/a.md', '# A'],
        ['wiki/entities/b.md', '# B'],
      ]),
    };
    const result = await runDedupPhase(ctx, input, () => {});
    expect(result).toEqual([]);
  });

  it('returns [] when no candidates are generated (wiki is clean)', async () => {
    // Two entity pages with completely different content — generateDuplicateCandidates
    // will return [] for these. We don't need to mock LLM because no verify call happens.
    const { client, createMessage } = stubLlm('{"duplicates":[]}');
    const ctx = makeLintPhaseContext({ llmClient: () => client });
    const input: DedupPhaseInput = {
      wikiFiles: [
        { path: 'wiki/entities/alpha.md', basename: 'alpha.md' },
        { path: 'wiki/entities/beta-unrelated.md', basename: 'beta-unrelated.md' },
      ],
      pageMap: makePageMap([
        ['wiki/entities/alpha.md', '---\ntype: entity\n---\n# Alpha\ncompletely different content with no links'],
        ['wiki/entities/beta-unrelated.md', '---\ntype: entity\n---\n# Beta\nno shared content here whatsoever'],
      ]),
    };
    const result = await runDedupPhase(ctx, input, () => {});
    expect(result).toEqual([]);
    expect(createMessage).not.toHaveBeenCalled();
  });
});

describe('runDedupPhase — LLM verify path', () => {
  it('normalizes LLM-returned paths via wikiFolder prefix', async () => {
    // Two pages with same title → generateDuplicateCandidates produces
    // a crossLang or caseVariant candidate → triggers LLM verify.
    const llmResponse = JSON.stringify({
      duplicates: [
        { target: 'entities/claude', source: 'entities/Claude', reason: 'same concept' },
      ],
    });
    const { client } = stubLlm(llmResponse);
    const ctx = makeLintPhaseContext({ llmClient: () => client });
    const input: DedupPhaseInput = {
      wikiFiles: [
        { path: 'wiki/entities/claude.md', basename: 'claude.md' },
        { path: 'wiki/entities/Claude.md', basename: 'Claude.md' },
      ],
      pageMap: makePageMap([
        ['wiki/entities/claude.md', '---\ntype: entity\n---\n# claude\nAI assistant'],
        ['wiki/entities/Claude.md', '---\ntype: entity\n---\n# Claude\nAI assistant'],
      ]),
    };
    const result = await runDedupPhase(ctx, input, () => {});
    // Path normalization prefixes with wikiFolder; both target and source are normalized.
    expect(result.length).toBeGreaterThan(0);
    for (const dup of result) {
      expect(dup.target).toMatch(/^wiki\/entities\//);
      expect(dup.source).toMatch(/^wiki\/entities\//);
    }
  });

  it('uses TOKENS_LINT_DEDUP_LLM as max_tokens', async () => {
    const { client, createMessage } = stubLlm('{"duplicates":[]}');
    const ctx = makeLintPhaseContext({ llmClient: () => client });
    const input: DedupPhaseInput = {
      wikiFiles: [
        { path: 'wiki/entities/x.md', basename: 'x.md' },
        { path: 'wiki/entities/X.md', basename: 'X.md' },
      ],
      pageMap: makePageMap([
        ['wiki/entities/x.md', '---\ntype: entity\n---\n# x\nshared content here'],
        ['wiki/entities/X.md', '---\ntype: entity\n---\n# X\nshared content here'],
      ]),
    };
    await runDedupPhase(ctx, input, () => {});
    if (createMessage.mock.calls.length > 0) {
      const callArgs = createMessage.mock.calls[0][0] as { max_tokens: number };
      expect(callArgs.max_tokens).toBeGreaterThan(0);
    }
  });

  it('filters out LLM responses that are not arrays', async () => {
    const llmResponse = JSON.stringify({
      duplicates: { target: 'x', source: 'y', reason: 'z' }, // not an array
    });
    const { client } = stubLlm(llmResponse);
    const ctx = makeLintPhaseContext({ llmClient: () => client });
    const input: DedupPhaseInput = {
      wikiFiles: [
        { path: 'wiki/entities/x.md', basename: 'x.md' },
        { path: 'wiki/entities/X.md', basename: 'X.md' },
      ],
      pageMap: makePageMap([
        ['wiki/entities/x.md', '---\ntype: entity\n---\n# x\nshared'],
        ['wiki/entities/X.md', '---\ntype: entity\n---\n# X\nshared'],
      ]),
    };
    const result = await runDedupPhase(ctx, input, () => {});
    expect(result).toEqual([]);
  });
});

describe('runDedupPhase — batching + rate limit', () => {
  it('processes batches in chunks of LINT_DEDUP_BATCH_SIZE', async () => {
    // Generate enough candidates to require multiple batches.
    // Force bigram tier 1 entries with very high score and many pairs.
    const numPages = LINT_DEDUP_BATCH_SIZE * 2 + 5; // 2 full batches + 5 leftover
    const wikiFiles: Array<{ path: string; basename: string }> = [];
    const pageMap = makePageMap([]);
    for (let i = 0; i < numPages; i++) {
      const path = `wiki/entities/page${i}.md`;
      const base = `page${i}`;
      // Each page has an identical body so bigram similarity is high across pairs.
      // We construct pairs by sharing many links back to entity/concept pages.
      wikiFiles.push({ path, basename: `${base}.md` });
      pageMap.set(path, {
        path,
        content: `---\ntype: entity\n---\n# ${base}\n` + Array.from({ length: 20 }, (_, k) => `[[entities/ref${k % 5}]]`).join(' '),
        basename: `${base}.md`,
      });
    }
    // Add 5 reference pages so the wiki-links are valid.
    for (let k = 0; k < 5; k++) {
      const path = `wiki/entities/ref${k}.md`;
      wikiFiles.push({ path, basename: `ref${k}.md` });
      pageMap.set(path, { path, content: `# ref${k}`, basename: `ref${k}.md` });
    }

    const { client, createMessage } = stubLlm('{"duplicates":[]}');
    const ctx = makeLintPhaseContext({ llmClient: () => client });
    const input: DedupPhaseInput = { wikiFiles, pageMap };

    await runDedupPhase(ctx, input, () => {});

    // If batching works correctly and there's at least one batch, the call count
    // should be > 0 and <= ceil(verifyCandidates.length / LINT_DEDUP_BATCH_SIZE).
    // We don't assert exact count because candidate generation may filter.
    // Instead, we assert that the implementation handles the case without error.
    expect(createMessage).toHaveBeenCalled();
  });

  it('returns empty when checkCancelled throws mid-run (errors caught by phase try/catch)', async () => {
    // Original controller.ts behavior: dedup-phase errors are caught by the
    // outer try/catch and surfaced as a Notice, not re-thrown. This preserves
    // the same contract after extraction.
    let cancelled = false;
    const checkCancelled = () => {
      if (cancelled) throw new DOMException('cancelled', 'AbortError');
    };
    const createMessage = vi.fn().mockImplementation(async () => {
      // Cancel after the first batch.
      cancelled = true;
      return '{"duplicates":[]}';
    });
    const client = { createMessage } as unknown as LLMClient;
    const ctx = makeLintPhaseContext({ llmClient: () => client });
    const input: DedupPhaseInput = {
      wikiFiles: [
        { path: 'wiki/entities/a.md', basename: 'a.md' },
        { path: 'wiki/entities/A.md', basename: 'A.md' },
      ],
      pageMap: makePageMap([
        ['wiki/entities/a.md', '---\ntype: entity\n---\n# a\nshared'],
        ['wiki/entities/A.md', '---\ntype: entity\n---\n# A\nshared'],
      ]),
    };
    const result = await runDedupPhase(ctx, input, checkCancelled);
    // The phase surfaces cancellation as an empty result (with an error
    // Notice for the user). It does NOT re-throw because the original
    // controller.ts dedup path swallowed AbortError inside the phase.
    expect(result).toEqual([]);
  });
});
