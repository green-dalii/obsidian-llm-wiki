// Module-level unit tests for page-factory/merge-triage.ts
//
// v1.24.1 Phase 2 refactor: classifyMergeNeed and buildNewInfoSummary were
// lifted out of the PageFactory class. The tests pin the LLM triage validation
// rules so future refactors cannot accidentally accept an unknown strategy,
// an empty complementary list, or malformed item shapes.

import { describe, it, expect } from 'vitest';
import {
  classifyMergeNeed,
  buildNewInfoSummary,
  type MergeTriageContext,
} from '../../../wiki/page-factory/merge-triage';
import { createMockEntity } from '../../__support__/factories';
import type { LLMWikiSettings } from '../../../types';

function makeCtx(client: { createMessage: (...a: unknown[]) => Promise<string> } | null): MergeTriageContext {
  return {
    settings: { wikiFolder: 'wiki', wikiLanguage: 'en', disableThinking: false } as LLMWikiSettings,
    getClient: () => client,
    buildSystemPrompt: async () => 'system',
  };
}

describe('buildNewInfoSummary (#216)', () => {
  it('emits Source / Summary / Key details lines', () => {
    const info = createMockEntity({
      name: 'Caching',
      summary: 'A short summary.',
      mentions_in_source: ['quote-A', 'quote-B'],
    });
    const out = buildNewInfoSummary(info, { path: 'notes/article.md', basename: 'article.md' });
    expect(out).toContain('Source: article.md');
    expect(out).toContain('Summary: A short summary.');
    expect(out).toContain('Key details: quote-A; quote-B');
  });

  it('includes related_entities and related_concepts when present', () => {
    const info = createMockEntity({
      name: 'X',
      related_entities: ['Y', 'Z'],
      related_concepts: ['A', 'B'],
    });
    const out = buildNewInfoSummary(info, { path: 'p.md', basename: 'p.md' });
    expect(out).toContain('Related entities: Y, Z');
    expect(out).toContain('Related concepts: A, B');
  });

  it('omits optional sections when absent (no trailing empty Key details)', () => {
    const info = createMockEntity({ name: 'X', mentions_in_source: [] });
    const out = buildNewInfoSummary(info, { path: 'p.md', basename: 'p.md' });
    expect(out).not.toContain('Key details');
    expect(out).not.toContain('Related entities');
  });
});

describe('classifyMergeNeed — strategy validation', () => {
  it('returns the LLM-supplied strategy and reason', async () => {
    const ctx = makeCtx({
      createMessage: async () => JSON.stringify({ strategy: 'skip', reason: 'no new info' }),
    });
    const result = await classifyMergeNeed(
      ctx,
      createMockEntity({ name: 'X' }),
      'entity',
      { path: 'p.md', basename: 'p.md' },
      '# existing content',
    );
    expect(result.strategy).toBe('skip');
    expect(result.reason).toBe('no new info');
    expect(result.items).toEqual([]);
  });

  it('accepts all four valid strategies', async () => {
    for (const strat of ['merge', 'skip', 'complementary', 'contradictory'] as const) {
      const ctx = makeCtx({
        createMessage: async () =>
          JSON.stringify({
            strategy: strat,
            reason: `test ${strat}`,
            items: strat === 'complementary'
              ? [{ kind: 'complementary', content: 'x', target_section: '## A' }]
              : [],
          }),
      });
      const result = await classifyMergeNeed(
        ctx,
        createMockEntity({ name: 'X' }),
        'entity',
        { path: 'p.md', basename: 'p.md' },
        '# existing',
      );
      expect(result.strategy).toBe(strat);
    }
  });

  it('throws on unknown strategy', async () => {
    const ctx = makeCtx({
      createMessage: async () => JSON.stringify({ strategy: 'bogus' }),
    });
    await expect(
      classifyMergeNeed(ctx, createMockEntity({ name: 'X' }), 'entity', { path: 'p.md', basename: 'p.md' }, '# x'),
    ).rejects.toThrow(/invalid strategy/);
  });

  it('throws when LLM response is empty', async () => {
    const ctx = makeCtx({
      createMessage: async () => '',
    });
    await expect(
      classifyMergeNeed(ctx, createMockEntity({ name: 'X' }), 'entity', { path: 'p.md', basename: 'p.md' }, '# x'),
    ).rejects.toThrow();
  });
});

describe('classifyMergeNeed — complementary path validation', () => {
  it('populates items for complementary strategy with valid items', async () => {
    const ctx = makeCtx({
      createMessage: async () =>
        JSON.stringify({
          strategy: 'complementary',
          reason: 'new info to add',
          items: [
            { kind: 'complementary', content: 'new fact', target_section: '## Background', reason: 'expands context' },
          ],
        }),
    });
    const result = await classifyMergeNeed(
      ctx,
      createMockEntity({ name: 'X' }),
      'entity',
      { path: 'p.md', basename: 'p.md' },
      '# existing',
    );
    expect(result.strategy).toBe('complementary');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.content).toBe('new fact');
    expect(result.items[0]?.target_section).toBe('## Background');
    expect(result.items[0]?.reason).toBe('expands context');
  });

  it('throws when complementary strategy has empty items array', async () => {
    const ctx = makeCtx({
      createMessage: async () =>
        JSON.stringify({ strategy: 'complementary', reason: 'x', items: [] }),
    });
    await expect(
      classifyMergeNeed(ctx, createMockEntity({ name: 'X' }), 'entity', { path: 'p.md', basename: 'p.md' }, '# x'),
    ).rejects.toThrow(/empty items/);
  });

  it('throws when complementary item is missing content', async () => {
    const ctx = makeCtx({
      createMessage: async () =>
        JSON.stringify({
          strategy: 'complementary',
          items: [{ kind: 'complementary', target_section: '## A' }],
        }),
    });
    await expect(
      classifyMergeNeed(ctx, createMockEntity({ name: 'X' }), 'entity', { path: 'p.md', basename: 'p.md' }, '# x'),
    ).rejects.toThrow(/invalid complementary item/);
  });

  it('throws when complementary item has empty target_section', async () => {
    const ctx = makeCtx({
      createMessage: async () =>
        JSON.stringify({
          strategy: 'complementary',
          items: [{ kind: 'complementary', content: 'x', target_section: '   ' }],
        }),
    });
    await expect(
      classifyMergeNeed(ctx, createMockEntity({ name: 'X' }), 'entity', { path: 'p.md', basename: 'p.md' }, '# x'),
    ).rejects.toThrow(/invalid complementary item/);
  });
});

describe('classifyMergeNeed — client precondition', () => {
  it('throws when no LLM client is configured', async () => {
    const ctx = makeCtx(null);
    await expect(
      classifyMergeNeed(ctx, createMockEntity({ name: 'X' }), 'entity', { path: 'p.md', basename: 'p.md' }, '# x'),
    ).rejects.toThrow(/LLM client not initialized/);
  });
});