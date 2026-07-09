// v1.24.0 #216: classify-then-route merge triage.
//
// Tests the new `classifyMergeNeed()` helper and its integration into
// `mergePage()`. The helper pre-classifies new source information against
// the existing page content BEFORE invoking the full LLM body rewrite.
//
// Why this matters: the current `mergeEntityPage` / `mergeConceptPage`
// prompts unconditionally rewrite the body, even when the new information
// is fully redundant with existing content. That wastes an LLM call and
// risks introducing "drift" — small wording changes that erode the
// human-curated body over multiple re-ingests. The triage classifies into:
//
//   - 'merge': at least some new/complementary/contradictory content —
//     proceed with the existing LLM body merge path.
//   - 'skip': every item is a duplicate of existing content — skip the
//     body rewrite, only update frontmatter (sources list).
//
// Strict scope: the triage is invoked only from `mergePage()` in
// `src/wiki/page-factory.ts`. The reviewed-page path (`appendToReviewedPage`)
// and the create-new path are unaffected. The triage MUST fall back to the
// existing merge path on classify failure (LLM error, malformed JSON,
// unexpected strategy) — no silent skip, no silent crash.

import { describe, it, expect } from 'vitest';
import { PageFactory } from '../../wiki/page-factory';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { createMockEntity } from '../__support__/factories';
import type { LLMClient } from '../../types';

// ── Helper: minimal valid entity info for merge tests ─────────────
function entityForMerge() {
  return createMockEntity({
    name: 'Test Entity',
    summary: 'Test summary for merge',
    related_entities: ['Other Entity'],
    related_concepts: ['Some Concept'],
    mentions_in_source: ['First quote', 'Second quote'],
    mentions_with_provenance: [
      { quote: 'First quote', source_path: 'src.md', source_slug: 'src', extracted_at: '2026-07-01' },
      { quote: 'Second quote', source_path: 'src.md', source_slug: 'src', extracted_at: '2026-07-01' },
    ],
  });
}

function conceptForMerge() {
  return {
    name: 'Test Concept',
    type: 'concept' as const,
    summary: 'Concept summary',
    related_entities: [],
    related_concepts: ['Related Concept'],
    key_points: ['Key point 1'],
    mentions_in_source: ['First quote'],
    mentions_with_provenance: [
      { quote: 'First quote', source_path: 'src.md', source_slug: 'src', extracted_at: '2026-07-01' },
    ],
  };
}
void conceptForMerge; // reserved for future concept-classify coverage

// ── classifyMergeNeed() pure-helper behaviour ──────────────────────

describe('classifyMergeNeed() — helper unit tests', () => {
  // We invoke the private method via type assertion, mirroring the
  // pattern used in page-factory-core.test.ts for `resolvePagePath`.
  type HelperAccess = {
    classifyMergeNeed: (
      info: Parameters<PageFactory['mergePage']>[0],
      pageType: 'entity' | 'concept',
      sourceFile: Parameters<PageFactory['mergePage']>[2],
      existingContent: string,
    ) => Promise<{ strategy: 'merge' | 'skip'; reason: string }>;
  };

  function makeFactoryWithLLM(llmResponse: string | null) {
    const { ctx } = createMockContext({
      vaultFiles: {
        'wiki/entities/test-entity.md': '---\ntype: entity\n---\n# Test Entity\nExisting content',
      },
      llmResponses: [],
    });
    let calls = 0;
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async () => {
          calls++;
          if (llmResponse === null) throw new Error('Mock LLM failure');
          return llmResponse;
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    return { factory, getCallCount: () => calls };
  }

  it('returns {strategy: "merge", reason: "..."} when LLM says merge', async () => {
    const { factory, getCallCount } = makeFactoryWithLLM(
      JSON.stringify({ strategy: 'merge', reason: 'has new info' }),
    );
    const result = await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nExisting content',
    );
    expect(result).toMatchObject({ strategy: 'merge', reason: 'has new info', items: [] });
    expect(getCallCount()).toBe(1);
  });

  it('returns {strategy: "skip", reason: "..."} when LLM says skip', async () => {
    const { factory } = makeFactoryWithLLM(
      JSON.stringify({ strategy: 'skip', reason: 'all duplicate' }),
    );
    const result = await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nExisting content',
    );
    expect(result).toMatchObject({ strategy: 'skip', reason: 'all duplicate', items: [] });
  });

  it('throws on malformed JSON (caller falls back to merge path)', async () => {
    const { factory } = makeFactoryWithLLM('not json at all');
    await expect(
      (factory as unknown as HelperAccess).classifyMergeNeed(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '---\ntype: entity\n---\n# Test Entity\nExisting content',
      ),
    ).rejects.toThrow();
  });

  it('throws on missing strategy field (caller falls back)', async () => {
    const { factory } = makeFactoryWithLLM(JSON.stringify({ reason: 'no strategy here' }));
    await expect(
      (factory as unknown as HelperAccess).classifyMergeNeed(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '---\ntype: entity\n---\n# Test Entity\nExisting content',
      ),
    ).rejects.toThrow();
  });

  it('throws on invalid strategy value (caller falls back)', async () => {
    const { factory } = makeFactoryWithLLM(JSON.stringify({ strategy: 'maybe', reason: '?' }));
    await expect(
      (factory as unknown as HelperAccess).classifyMergeNeed(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '---\ntype: entity\n---\n# Test Entity\nExisting content',
      ),
    ).rejects.toThrow();
  });

  it('throws when LLM client fails (network / provider error)', async () => {
    const { factory } = makeFactoryWithLLM(null);
    await expect(
      (factory as unknown as HelperAccess).classifyMergeNeed(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '---\ntype: entity\n---\n# Test Entity\nExisting content',
      ),
    ).rejects.toThrow();
  });

  it('passes disableThinking flag through to the LLM', async () => {
    const { ctx } = createMockContext({ vaultFiles: {}, llmResponses: [] });
    let observedParams: { enableThinking?: boolean } | undefined;
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async (params) => {
          observedParams = params;
          return JSON.stringify({ strategy: 'merge', reason: 'ok' });
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nExisting content',
    );
    // When disableThinking=false (default in factory settings), the
    // enableThinking override must NOT be passed (the LLM client decides).
    expect(observedParams?.enableThinking).toBeUndefined();
  });

  it('passes disableThinking=true as enableThinking: false', async () => {
    const { ctx } = createMockContext({
      vaultFiles: {},
      llmResponses: [],
      settings: { disableThinking: true },
    });
    let observedParams: { enableThinking?: boolean } | undefined;
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async (params) => {
          observedParams = params;
          return JSON.stringify({ strategy: 'merge', reason: 'ok' });
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nExisting content',
    );
    expect(observedParams?.enableThinking).toBe(false);
  });

  it('uses response_format: json_object for structured parse', async () => {
    const { ctx } = createMockContext({ vaultFiles: {}, llmResponses: [] });
    let observedParams: { response_format?: { type: string } } | undefined;
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async (params) => {
          observedParams = params;
          return JSON.stringify({ strategy: 'merge', reason: 'ok' });
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nExisting content',
    );
    expect(observedParams?.response_format).toEqual({ type: 'json_object' });
  });

  it('passes buildSystemPrompt("merge") as the system field', async () => {
    const { ctx } = createMockContext({ vaultFiles: {}, llmResponses: [] });
    let observedSystem: string | undefined;
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async (params) => {
          observedSystem = params.system;
          return JSON.stringify({ strategy: 'merge', reason: 'ok' });
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nExisting content',
    );
    // The factory's mock context returns undefined for buildSystemPrompt,
    // so system should be undefined (the conditional spread must omit it).
    expect(observedSystem).toBeUndefined();
  });
});

// ── mergePage() triage integration ─────────────────────────────────

describe('mergePage() — triage integration', () => {
  type HelperAccess = {
    mergePage: (
      info: Parameters<PageFactory['mergePage']>[0],
      pageType: 'entity' | 'concept',
      sourceFile: Parameters<PageFactory['mergePage']>[2],
      existingContent: string,
      extraPagePaths: string[],
      path: string,
      sourceSlug?: string,
    ) => Promise<string | null>;
  };

  function setupMergeMocks(opts: {
    classifyResponse: string | null; // null → throw to test fallback
    mergeResponse?: string | null;
  }) {
    const calls: Array<{ system?: string; messages: Array<{ content: string }> }> = [];
    const { ctx } = createMockContext({
      vaultFiles: {},
      llmResponses: [],
    });
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async (params) => {
          calls.push(params);
          // Discriminate: classify uses response_format=json_object; merge doesn't.
          const isClassify = params.response_format?.type === 'json_object';
          if (isClassify) {
            if (opts.classifyResponse === null) throw new Error('classify failure');
            return opts.classifyResponse;
          }
          // merge call: default is some markdown body
          if (opts.mergeResponse === null) throw new Error('merge failure');
          return opts.mergeResponse ?? '## Description\nmerged content\n';
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    return { factory, calls };
  }

  it('strategy=skip → only ONE LLM call (no merge prompt), body unchanged', async () => {
    const { factory, calls } = setupMergeMocks({
      classifyResponse: JSON.stringify({ strategy: 'skip', reason: 'all duplicate' }),
      mergeResponse: '## Description\nTHIS_SHOULD_NOT_RUN\n',
    });
    const existingBody = '---\ntype: entity\n---\n# Test Entity\nORIGINAL_BODY';
    const result = await (factory as unknown as HelperAccess).mergePage(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      existingBody,
      [],
      'wiki/entities/test-entity.md',
    );
    expect(result).toBe('wiki/entities/test-entity.md');
    expect(calls).toHaveLength(1); // only classify, no merge
    expect(calls[0].messages[0].content).toContain('ORIGINAL_BODY'); // classify sees existing
  });

  it('strategy=merge → TWO LLM calls (classify then merge)', async () => {
    const { factory, calls } = setupMergeMocks({
      classifyResponse: JSON.stringify({ strategy: 'merge', reason: 'has new info' }),
      mergeResponse: '## Description\nmerged content\n',
    });
    await (factory as unknown as HelperAccess).mergePage(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nexisting',
      [],
      'wiki/entities/test-entity.md',
    );
    expect(calls).toHaveLength(2);
  });

  it('classify failure → falls back to merge (2 calls total: 1 throw + 1 merge)', async () => {
    const { factory, calls } = setupMergeMocks({
      classifyResponse: null, // throw on classify
      mergeResponse: '## Description\nfallback merged\n',
    });
    await (factory as unknown as HelperAccess).mergePage(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nexisting',
      [],
      'wiki/entities/test-entity.md',
    );
    // Classify throws → caught → falls back to merge path. 2 calls total.
    expect(calls).toHaveLength(2);
  });

  it('classify returns malformed JSON → falls back to merge (2 calls total)', async () => {
    const { factory, calls } = setupMergeMocks({
      classifyResponse: 'not json {',
      mergeResponse: '## Description\nfallback merged\n',
    });
    await (factory as unknown as HelperAccess).mergePage(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nexisting',
      [],
      'wiki/entities/test-entity.md',
    );
    expect(calls).toHaveLength(2);
  });

  it('classify returns invalid strategy → falls back to merge (2 calls total)', async () => {
    const { factory, calls } = setupMergeMocks({
      classifyResponse: JSON.stringify({ strategy: 'unsure', reason: '?' }),
      mergeResponse: '## Description\nfallback merged\n',
    });
    await (factory as unknown as HelperAccess).mergePage(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '---\ntype: entity\n---\n# Test Entity\nexisting',
      [],
      'wiki/entities/test-entity.md',
    );
    expect(calls).toHaveLength(2);
  });

  it('strategy=skip → write failure is NOT masked as triage failure (no double-write body merge)', async () => {
    // Regression: the inner try/catch must NOT wrap the createOrUpdateFile
    // call. If the skip-path write fails, the error must surface to the
    // outer mergeError catch — not silently fall through to the expensive
    // body-merge path which would write the file a second time.
    const { factory, calls } = setupMergeMocks({
      classifyResponse: JSON.stringify({ strategy: 'skip', reason: 'duplicate' }),
      mergeResponse: '## Description\nSHOULD_NOT_BE_CALLED\n',
    });
    // Override createOrUpdateFile on the ctx to throw.
    (factory as unknown as { ctx: { createOrUpdateFile: () => Promise<never> } }).ctx.createOrUpdateFile =
      async () => {
        throw new Error('vault write race');
      };
    await expect(
      (factory as unknown as HelperAccess).mergePage(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '---\ntype: entity\n---\n# Test Entity\nexisting',
        [],
        'wiki/entities/test-entity.md',
      ),
    ).rejects.toThrow(/vault write race/);
    // Only the classify call ran; the body merge was NOT attempted.
    expect(calls).toHaveLength(1);
  });
});