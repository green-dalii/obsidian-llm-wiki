// v1.24.0 #216 Tier-2: complementary → targeted section append.
//
// Tests the new `applyComplementaryAppends()` helper that handles the
// "complementary" triage result by appending new facts to specific
// existing sections (without rewriting the body). The function:
//
//   1. Groups items by target_section
//   2. For each group, issues ONE per-section LLM call that returns
//      appended paragraph(s) for that section (scope: single section)
//   3. Splices the appended paragraphs into existingBody at the
//      right position (before the next ## heading or EOF)
//
// i18n-aware: target_section may come from the LLM as an English label
// (e.g. "Description") while the existing body uses a localized label
// (e.g. "Beschreibung" for de). The 4-layer anchor resolver handles
// this without breaking:

//   Layer 1 — exact match against canonical labels
//   Layer 2 — Levenshtein snap (3-edit window, reused from
//             canonicalizeSectionHeaders via snapHeaderToCanonical)
//   Layer 3 — body scan: extract ## headings from existingBody and
//             snap each, then compare
//   Layer 4 — per-section LLM has full body context to decide itself
//             (returns NO_NEW_CONTENT if it can't place the new info
//             safely)
//   Fallback  — append to "## New Information ({{source}})" section
//               at end of body

import { describe, it, expect, vi } from 'vitest';
import { PageFactory } from '../../wiki/page-factory';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { createMockEntity } from '../__support__/factories';
import type { LLMClient, MessageContentPart } from '../../types';

// ── Pure helpers ─────────────────────────────────────────────────

function entityForMerge() {
  return createMockEntity({
    name: 'Microbiome',
    summary: 'Microbiome summary',
    related_entities: ['SCFAs'],
    related_concepts: ['Gut Health'],
    mentions_in_source: ['"SCFAs are produced by fiber fermentation."'],
    mentions_with_provenance: [
      {
        quote: 'SCFAs are produced by fiber fermentation.',
        source_path: 'src.md',
        source_slug: 'src',
        extracted_at: '2026-07-01',
      },
    ],
  });
}

// ── applyComplementaryAppends() integration ──────────────────────

describe('applyComplementaryAppends — i18n-aware target resolution', () => {
  type HelperAccess = {
    applyComplementaryAppends: (
      items: Array<{ kind: string; content: string; target_section: string; reason?: string }>,
      existingBody: string,
      info: Parameters<PageFactory['mergePage']>[0],
      sourceFile: Parameters<PageFactory['mergePage']>[2],
    ) => Promise<string>;
  };

  function setup(llmResponses: string[]) {
    let calls = 0;
    let callParams: Array<{ messages: Array<{ content: string | MessageContentPart[] }> }> = [];
    const { ctx } = createMockContext({
      vaultFiles: {
        'wiki/entities/microbiome.md': '# Microbiome\n',
      },
      llmResponses: [],
    });
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async (params) => {
          callParams.push(params);
          calls++;
          return llmResponses[Math.min(calls - 1, llmResponses.length - 1)];
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    return { factory, getCallCount: () => calls, getCallParams: () => callParams };
  }

  it('Layer 1 exact match: target_section="Description" hits canonical label', async () => {
    const { factory, getCallCount } = setup([
      'SCFAs are produced by bacterial fermentation of dietary fiber.',
    ]);
    const existingBody = [
      '## Description',
      'Existing description text here.',
      '## Related Concepts',
      '[[Gut Health]]',
    ].join('\n');
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [{
        kind: 'complementary',
        content: 'SCFAs are produced by bacterial fermentation of dietary fiber.',
        target_section: 'Description',
      }],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    // The new paragraph is appended inside Description section, before ## Related Concepts.
    expect(result).toContain('## Description');
    expect(result).toContain('Existing description text here.');
    expect(result).toContain('SCFAs are produced by bacterial fermentation');
    expect(result).toContain('## Related Concepts');
    // Description content is preserved verbatim.
    const descIdx = result.indexOf('Existing description text here.');
    const appendIdx = result.indexOf('SCFAs are produced');
    expect(descIdx).toBeLessThan(appendIdx);
    expect(getCallCount()).toBe(1);
  });

  it('Layer 2 Levenshtein snap: target="Beschreibun" (typo) snaps to "Beschreibung"', async () => {
    const { factory } = setup([
      'SCFAs werden durch bakterielle Fermentation von Ballaststoffen produziert.',
    ]);
    const existingBody = [
      '## Beschreibung',
      'Bestehende Beschreibung.',
      '## Verwandte Konzepte',
      '[[Darmgesundheit]]',
    ].join('\n');
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [{
        kind: 'complementary',
        content: 'SCFAs werden durch bakterielle Fermentation produziert.',
        target_section: 'Beschreibun', // missing final g
      }],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    // Existing section content preserved.
    expect(result).toContain('Bestehende Beschreibung.');
    expect(result).toContain('SCFAs werden durch bakterielle Fermentation');
  });

  it('Layer 3 body scan: target does not match any canonical label but body has the section', async () => {
    // Settings give English labels, but body uses German (user wrote German
    // by hand, or extracted from a German source). The LLM may also have
    // returned a free-form target. Body scan + snap finds it.
    const { factory } = setup([
      'Appended in English for compatibility.',
    ]);
    const existingBody = [
      '## Eigene Sektion',
      'Some German body.',
      '## Andere',
      'Other body.',
    ].join('\n');
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [{
        kind: 'complementary',
        content: 'Appended in English for compatibility.',
        target_section: 'Eigene Sektion', // not in canonical labels, but in body
      }],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    expect(result).toContain('Some German body.');
    expect(result).toContain('Appended in English for compatibility.');
  });

  it('Layer 4 fallback: per-section LLM returns NO_NEW_CONTENT → falls back to ## New Information', async () => {
    const { factory } = setup(['NO_NEW_CONTENT']);
    const existingBody = [
      '## Description',
      'Existing description.',
    ].join('\n');
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [{
        kind: 'complementary',
        content: 'some new fact',
        target_section: 'NonExistentSection_xyz',
      }],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    expect(result).toContain('## New Information (src)');
    expect(result).toContain('some new fact');
    // Description preserved.
    expect(result).toContain('Existing description.');
  });

  it('groups items by target_section: 3 items → 2 sections → 2 LLM calls (not 3)', async () => {
    const { factory, getCallCount } = setup([
      'first section appended text',
      'second section appended text',
    ]);
    const existingBody = [
      '## Description',
      'A',
      '## Key Characteristics',
      'B',
    ].join('\n');
    await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [
        { kind: 'complementary', content: 'fact1', target_section: 'Description' },
        { kind: 'complementary', content: 'fact2', target_section: 'Description' },
        { kind: 'complementary', content: 'fact3', target_section: 'Key Characteristics' },
      ],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    expect(getCallCount()).toBe(2);
  });

  it('preserves the original body verbatim — only inserts new paragraphs', async () => {
    const { factory } = setup([
      'new appended content',
    ]);
    const existingBody = [
      '## Description',
      'Original Description paragraph 1.',
      '',
      'Original Description paragraph 2.',
      '## Related Entities',
      '[[SCFAs]]',
      '## Related Concepts',
      '[[Gut Health]]',
    ].join('\n');
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [{
        kind: 'complementary',
        content: 'new appended content',
        target_section: 'Description',
      }],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    // Both original paragraphs preserved exactly.
    expect(result).toContain('Original Description paragraph 1.');
    expect(result).toContain('Original Description paragraph 2.');
    // Related Entities untouched.
    expect(result).toContain('[[SCFAs]]');
    expect(result).toContain('## Related Concepts');
    expect(result).toContain('[[Gut Health]]');
  });

  it('does not invoke LLM when items array is empty', async () => {
    const { factory, getCallCount } = setup([
      // never used
      'should not be called',
    ]);
    const existingBody = '## Description\nA\n';
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    expect(getCallCount()).toBe(0);
    // Body unchanged.
    expect(result).toBe(existingBody);
  });

  it('returns existingBody unchanged when all per-section LLM calls return NO_NEW_CONTENT', async () => {
    const { factory } = setup(['NO_NEW_CONTENT', 'NO_NEW_CONTENT']);
    const existingBody = [
      '## Description',
      'A',
      '## Key Characteristics',
      'B',
    ].join('\n');
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [
        { kind: 'complementary', content: 'f1', target_section: 'Description' },
        { kind: 'complementary', content: 'f2', target_section: 'Key Characteristics' },
      ],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    // No new content was successfully placed; body is unchanged.
    expect(result).toBe(existingBody);
  });

  it('handles section at end of body (no following ## to insert before)', async () => {
    const { factory } = setup([
      'appended text',
    ]);
    const existingBody = [
      '## Description',
      'Original text.',
      '## Key Characteristics',
      'Original characteristics.',
    ].join('\n');
    const result = await (factory as unknown as HelperAccess).applyComplementaryAppends(
      [{
        kind: 'complementary',
        content: 'new characteristic',
        target_section: 'Key Characteristics',
      }],
      existingBody,
      entityForMerge(),
      createMockFile('src.md'),
    );
    expect(result).toContain('Original characteristics.');
    expect(result).toContain('appended text');
    // Last section, appended at the very end.
    expect(result.indexOf('appended text')).toBeGreaterThan(result.indexOf('Original characteristics.'));
  });
});

// ── classifyMergeNeed extended return type ────────────────────────

describe('classifyMergeNeed — Tier-2 complementary strategy', () => {
  type HelperAccess = {
    classifyMergeNeed: (
      info: Parameters<PageFactory['mergePage']>[0],
      pageType: 'entity' | 'concept',
      sourceFile: Parameters<PageFactory['mergePage']>[2],
      existingContent: string,
    ) => Promise<{
      strategy: 'skip' | 'merge' | 'complementary' | 'contradictory';
      items: Array<{
        kind: 'complementary';
        content: string;
        target_section: string;
        reason?: string;
      }>;
      reason: string;
    }>;
  };

  function makeFactory(llmResponse: string) {
    const { ctx } = createMockContext({ vaultFiles: {}, llmResponses: [] });
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async () => llmResponse,
      };
      return client;
    };
    return new PageFactory(ctx);
  }

  it('returns strategy="complementary" with items array when LLM signals complementary', async () => {
    const factory = makeFactory(JSON.stringify({
      strategy: 'complementary',
      items: [
        {
          kind: 'complementary',
          content: 'SCFAs ferment fiber',
          target_section: 'Description',
          reason: 'adds detail',
        },
      ],
      reason: 'all new info is complementary',
    }));
    const result = await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '## Description\nExisting\n',
    );
    expect(result.strategy).toBe('complementary');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].target_section).toBe('Description');
  });

  it('returns strategy="contradictory" with empty items array', async () => {
    const factory = makeFactory(JSON.stringify({
      strategy: 'contradictory',
      items: [],
      reason: 'new info conflicts with existing',
    }));
    const result = await (factory as unknown as HelperAccess).classifyMergeNeed(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '## Description\nExisting claim X\n',
    );
    expect(result.strategy).toBe('contradictory');
    expect(result.items).toHaveLength(0);
  });

  it('throws on missing items field (caller falls back)', async () => {
    const factory = makeFactory(JSON.stringify({
      strategy: 'complementary',
      // missing items
      reason: 'oops',
    }));
    await expect(
      (factory as unknown as HelperAccess).classifyMergeNeed(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '## Description\nExisting\n',
      ),
    ).rejects.toThrow();
  });

  it('throws on invalid complementary item (missing target_section)', async () => {
    const factory = makeFactory(JSON.stringify({
      strategy: 'complementary',
      items: [{ kind: 'complementary', content: 'x' /* missing target_section */ }],
      reason: 'r',
    }));
    await expect(
      (factory as unknown as HelperAccess).classifyMergeNeed(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '## Description\nExisting\n',
      ),
    ).rejects.toThrow();
  });

  it('throws on invalid strategy value (caller falls back)', async () => {
    const factory = makeFactory(JSON.stringify({
      strategy: 'unsure',
      items: [],
      reason: 'r',
    }));
    await expect(
      (factory as unknown as HelperAccess).classifyMergeNeed(
        entityForMerge(),
        'entity',
        createMockFile('src.md'),
        '## Description\nExisting\n',
      ),
    ).rejects.toThrow();
  });
});

// ── mergePage strategy switch — Tier-2 ────────────────────────────

describe('mergePage — complementary strategy dispatch', () => {
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

  function setupComplementary(opts: {
    classifyResponse: string;
    appendResponse: string;
  }) {
    const calls: Array<{ messages: Array<{ content: string | MessageContentPart[] }> }> = [];
    const { ctx } = createMockContext({ vaultFiles: {}, llmResponses: [] });
    ctx.getClient = () => {
      const client: LLMClient = {
        createMessage: async (params) => {
          calls.push(params);
          const isClassify = params.response_format?.type === 'json_object';
          if (isClassify) return opts.classifyResponse;
          return opts.appendResponse;
        },
      };
      return client;
    };
    const factory = new PageFactory(ctx);
    return { factory, calls };
  }

  it('strategy=complementary → NO body-merge call (only classify + per-section append)', async () => {
    const { factory, calls } = setupComplementary({
      classifyResponse: JSON.stringify({
        strategy: 'complementary',
        items: [{ kind: 'complementary', content: 'new fact', target_section: 'Description' }],
        reason: 'adds detail',
      }),
      appendResponse: 'appended text',
    });
    const existingBody = '## Description\nOriginal\n';
    await (factory as unknown as HelperAccess).mergePage(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      existingBody,
      [],
      'wiki/entities/microbiome.md',
    );
    // 1 classify + 1 per-section append = 2 calls; the body-merge prompt
    // (TOKENS_PAGE_GENERATION) must NOT be invoked.
    expect(calls).toHaveLength(2);
    // Existing body preserved.
    expect(calls[1].messages[0].content).toContain('Original');
  });

  it('strategy=contradictory → falls through to existing body-merge path', async () => {
    const { factory, calls } = setupComplementary({
      classifyResponse: JSON.stringify({
        strategy: 'contradictory',
        items: [],
        reason: 'new info conflicts',
      }),
      // body-merge response
      appendResponse: '## Description\nmerged body\n',
    });
    await (factory as unknown as HelperAccess).mergePage(
      entityForMerge(),
      'entity',
      createMockFile('src.md'),
      '## Description\nExisting\n',
      [],
      'wiki/entities/microbiome.md',
    );
    // 1 classify + 1 body-merge = 2 calls.
    expect(calls).toHaveLength(2);
  });
});
// suppress vi unused import warning if any
void vi;