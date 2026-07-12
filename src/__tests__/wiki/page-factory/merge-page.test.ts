// Module-level unit tests for page-factory/merge-page.ts
//
// v1.24.1 Phase 2 refactor: mergePage and appendToReviewedPage were lifted
// out of PageFactory. The tests pin the #216 triage routing (skip /
// complementary / merge / contradictory), the NO_NEW_CONTENT fallback path,
// and the reviewed-page lock (pageIsReviewed: true flag passed to
// injectMentionsSection).

import { describe, it, expect } from 'vitest';
import {
  mergePage,
  appendToReviewedPage,
  type MergeContext,
} from '../../../wiki/page-factory/merge-page';
import { createMockEntity } from '../../__support__/factories';
import type { LLMWikiSettings, LLMClient } from '../../../types';

function makeCtx(client: LLMClient | null = null): MergeContext & { written: Map<string, string> } {
  const written = new Map<string, string>();
  return {
    written,
    app: {
      vault: {
        getMarkdownFiles: () => [],
        read: async (f: { path: string }): Promise<string> => written.get(f.path) ?? '',
      },
    },
    settings: {
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      slugCase: 'preserve',
      disableThinking: false,
    } as LLMWikiSettings,
    async tryReadFile(p: string): Promise<string | null> {
      return written.get(p) ?? null;
    },
    async createOrUpdateFile(p: string, c: string): Promise<void> {
      written.set(p, c);
    },
    getClient: () => client,
    buildSystemPrompt: async () => 'system',
  };
}

function makeClient(responses: string[]): LLMClient {
  let i = 0;
  return {
    createMessage: async () => responses[i++] ?? 'NO_NEW_CONTENT',
  };
}

const EXISTING = `---\ntitle: Caching\n---\n\n## Description\nOld text.\n`;

describe('mergePage — client precondition', () => {
  it('throws when no LLM client is configured', async () => {
    const ctx = makeCtx(null);
    await expect(
      mergePage(ctx, createMockEntity({ name: 'X' }), 'entity', { path: 'p.md', basename: 'p.md' }, EXISTING, [], 'wiki/entities/x.md'),
    ).rejects.toThrow(/LLM client not initialized/);
  });
});

describe('mergePage — triage=skip preserves body', () => {
  it('writes back existing body with only frontmatter re-merged (skip path)', async () => {
    // 1st response: triage → strategy=skip. No body-merge call.
    const ctx = makeCtx(makeClient([JSON.stringify({ strategy: 'skip', reason: 'no new info' })]));
    const result = await mergePage(
      ctx,
      createMockEntity({ name: 'Caching' }),
      'entity',
      { path: 'new.md', basename: 'new.md' },
      EXISTING,
      [],
      'wiki/entities/caching.md',
    );
    expect(result).toBe('wiki/entities/caching.md');
    const written = ctx.written.get('wiki/entities/caching.md')!;
    // Body preserved.
    expect(written).toContain('Old text.');
  });
});

describe('mergePage — triage=complementary falls through to merge when NO_NEW_CONTENT', () => {
  it('when every per-section LLM says NO_NEW_CONTENT, falls back to body-merge', async () => {
    // Response 1: triage → complementary with 1 item.
    // Response 2: per-section LLM → NO_NEW_CONTENT.
    // Response 3: body-merge → "Merged body."
    const ctx = makeCtx(makeClient([
      JSON.stringify({
        strategy: 'complementary',
        reason: 'expand',
        items: [{ kind: 'complementary', content: 'new fact', target_section: 'Description' }],
      }),
      'NO_NEW_CONTENT',
      'Merged body.',
    ]));
    const result = await mergePage(
      ctx,
      createMockEntity({ name: 'Caching' }),
      'entity',
      { path: 'new.md', basename: 'new.md' },
      EXISTING,
      [],
      'wiki/entities/caching.md',
    );
    expect(result).toBe('wiki/entities/caching.md');
    const written = ctx.written.get('wiki/entities/caching.md')!;
    expect(written).toContain('Merged body.');
  });
});

describe('mergePage — triage failure falls through to merge path', () => {
  it('when triage throws, the merge path still runs', async () => {
    // Response 1: triage throws via JSON parse failure → fall through.
    // Response 2: body-merge → "Merged body."
    const ctx = makeCtx(makeClient([
      '', // empty → parseJsonResponse returns null → throws
      'Merged body.',
    ]));
    const result = await mergePage(
      ctx,
      createMockEntity({ name: 'Caching' }),
      'entity',
      { path: 'new.md', basename: 'new.md' },
      EXISTING,
      [],
      'wiki/entities/caching.md',
    );
    expect(result).toBe('wiki/entities/caching.md');
    const written = ctx.written.get('wiki/entities/caching.md')!;
    expect(written).toContain('Merged body.');
  });
});

describe('mergePage — NO_NEW_CONTENT from body-merge preserves existing', () => {
  it('returns path but does NOT write when body-merge says NO_NEW_CONTENT', async () => {
    const ctx = makeCtx(makeClient([
      JSON.stringify({ strategy: 'merge', reason: 'rewrite' }),
      'NO_NEW_CONTENT',
    ]));
    const result = await mergePage(
      ctx,
      createMockEntity({ name: 'Caching' }),
      'entity',
      { path: 'new.md', basename: 'new.md' },
      EXISTING,
      [],
      'wiki/entities/caching.md',
    );
    expect(result).toBe('wiki/entities/caching.md');
    // NO_NEW_CONTENT → no write happened.
    expect(ctx.written.has('wiki/entities/caching.md')).toBe(false);
  });
});

describe('appendToReviewedPage — client precondition', () => {
  it('throws when no LLM client is configured', async () => {
    const ctx = makeCtx(null);
    await expect(
      appendToReviewedPage(ctx, createMockEntity({ name: 'X' }), { path: 'p.md', basename: 'p.md' }, EXISTING, 'wiki/entities/x.md'),
    ).rejects.toThrow(/LLM client not initialized/);
  });
});

describe('appendToReviewedPage — NO_NEW_CONTENT preserves existing', () => {
  it('returns path but does NOT write when LLM says NO_NEW_CONTENT', async () => {
    const ctx = makeCtx(makeClient(['NO_NEW_CONTENT']));
    const result = await appendToReviewedPage(
      ctx,
      createMockEntity({ name: 'Caching' }),
      { path: 'new.md', basename: 'new.md' },
      EXISTING,
      'wiki/entities/caching.md',
    );
    expect(result).toBe('wiki/entities/caching.md');
    expect(ctx.written.has('wiki/entities/caching.md')).toBe(false);
  });
});

describe('appendToReviewedPage — happy path writes merged content', () => {
  it('writes the LLM-produced body (Mentions section is LOCKED when pageIsReviewed)', async () => {
    const ctx = makeCtx(makeClient(['## New Section\nNew fact.']));
    const result = await appendToReviewedPage(
      ctx,
      createMockEntity({ name: 'Caching', mentions_in_source: ['quote-A'] }),
      { path: 'new.md', basename: 'new.md' },
      EXISTING,
      'wiki/entities/caching.md',
    );
    expect(result).toBe('wiki/entities/caching.md');
    const written = ctx.written.get('wiki/entities/caching.md')!;
    expect(written).toContain('## New Section');
    expect(written).toContain('New fact.');
    // Mentions section is intentionally NOT injected — appendToReviewedPage
    // passes pageIsReviewed: true so the existing Mentions section (if any)
    // is preserved verbatim and new mentions are NOT auto-injected.
    expect(written).not.toContain('quote-A');
  });
});