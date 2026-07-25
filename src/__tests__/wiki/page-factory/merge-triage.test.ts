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
  isSourceOwnPageLemma,
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
// Issue #312 part 2 — the deterministic half of the fix. Pure string
// comparison: no LLM, no IO. The predicate answers "is this source the page's
// subject", which the triage prompt never asks.
describe('isSourceOwnPageLemma — deterministic ownership', () => {
  const ctx = { sourceTitle: 'Silent Inflammation', summary: 's', sourcePath: 'Notes/Silent Inflammation.md' };

  it('matches across the space/dash spelling difference between note and page', () => {
    expect(isSourceOwnPageLemma({
      pageName: 'Silent-Inflammation',
      sourceBasename: 'Silent Inflammation',
      sourceContext: ctx,
    })).toBe(true);
  });

  it('matches on the analyzer source title when the file name differs', () => {
    expect(isSourceOwnPageLemma({
      pageName: 'Silent-Inflammation',
      sourceBasename: '2026-03-11 notes',
      sourceContext: ctx,
    })).toBe(true);
  });

  it('matches on a curated note alias', () => {
    expect(isSourceOwnPageLemma({
      pageName: 'Chronische-Inflammation',
      sourceBasename: 'Silent Inflammation',
      sourceContext: { ...ctx, noteAliases: ['Chronische Inflammation'] },
    })).toBe(true);
  });

  it('matches on one of the page aliases', () => {
    expect(isSourceOwnPageLemma({
      pageName: 'CoQ10',
      pageAliases: ['Coenzym Q10'],
      sourceBasename: 'Coenzym-Q10',
      sourceContext: { sourceTitle: 'Coenzym Q10', summary: 's', sourcePath: 'n.md' },
    })).toBe(true);
  });

  it('does not match a source that merely mentions the page', () => {
    expect(isSourceOwnPageLemma({
      pageName: 'Silent-Inflammation',
      sourceBasename: 'Omega-3',
      sourceContext: { sourceTitle: 'Omega-3', summary: 's', sourcePath: 'n.md' },
    })).toBe(false);
  });

  it('never fires without a source context, even on an exact name match', () => {
    expect(isSourceOwnPageLemma({
      pageName: 'Silent-Inflammation',
      sourceBasename: 'Silent Inflammation',
    })).toBe(false);
  });

  it('returns false for an empty page name instead of matching everything', () => {
    expect(isSourceOwnPageLemma({
      pageName: '   ',
      sourceBasename: 'Silent Inflammation',
      sourceContext: ctx,
    })).toBe(false);
  });
});

// Issue #312 part 1 — the source-level summary plus the question that makes it
// usable. Both are placeholder-rendered, so a caller without an ingest
// upstream gets the prompt it got before, character for character.
describe('classifyMergeNeed — source context in the triage prompt (#312)', () => {
  const CONTEXT = {
    sourceTitle: 'Silent Inflammation',
    summary: 'A note on low-grade chronic inflammation and its markers.',
    sourcePath: 'Notes/Silent Inflammation.md',
  };

  async function renderPrompt(sourceContext?: typeof CONTEXT): Promise<string> {
    let seen = '';
    const ctx = makeCtx({
      createMessage: async (...a: unknown[]) => {
        const req = a[0] as { messages: Array<{ content: string }> };
        seen = req.messages[0].content;
        return JSON.stringify({ strategy: 'skip', reason: 'r' });
      },
    });
    await classifyMergeNeed(
      ctx,
      createMockEntity({ name: 'Silent Inflammation' }),
      'entity',
      { path: 'Notes/Silent Inflammation.md', basename: 'Silent Inflammation' },
      '## Description\nExisting.',
      sourceContext,
    );
    return seen;
  }

  it('adds the source summary under its own label, distinct from the item summary', async () => {
    const prompt = await renderPrompt(CONTEXT);
    expect(prompt).toContain('Source summary: A note on low-grade chronic inflammation');
    // The item-level `Summary:` from buildNewInfoSummary is still there and is
    // a different line — the collision the fix set out to avoid.
    expect(prompt).toMatch(/^Summary: /m);
    expect(prompt.match(/Source summary:/g)).toHaveLength(1);
  });

  it('asks whether the source is the page subject, not only whether the info is new', async () => {
    const prompt = await renderPrompt(CONTEXT);
    expect(prompt).toContain('primarily ABOUT this page or only mentions it in passing');
  });

  it('does not repeat the source name that {{new_info}} already carries', async () => {
    const prompt = await renderPrompt(CONTEXT);
    expect(prompt.match(/Silent Inflammation/g)?.length).toBeGreaterThan(0);
    expect(prompt).not.toContain('Source being merged:');
  });

  it('renders the pre-change prompt exactly when no context is supplied', async () => {
    const prompt = await renderPrompt(undefined);
    expect(prompt).not.toContain('Source summary:');
    expect(prompt).not.toContain('primarily ABOUT this page');
    // No placeholder survives, and no blank line drifts in where the block
    // would have gone: `{{new_info}}` is still followed directly by the
    // sections header.
    expect(prompt).not.toMatch(/\{\{\w+\}\}/);
    expect(prompt).toMatch(/\n\n\*\*Available sections/);
    // An empty placeholder must not leave a blank line behind anywhere.
    expect(prompt).not.toContain('\n\n\n');
  });
});
