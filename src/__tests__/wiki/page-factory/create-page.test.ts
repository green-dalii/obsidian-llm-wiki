// Module-level unit tests for page-factory/create-page.ts
//
// v1.24.1 Phase 2 refactor: createOrUpdatePage / createNewPage /
// createOrUpdateEntityPage / createOrUpdateConceptPage were lifted out of
// the PageFactory class. The tests pin the createOrUpdatePage routing
// logic (collision / new-file / reviewed / normal merge) and the new-page
// generation contract (LLM body + programmatic Mentions injection #244).

import { describe, it, expect } from 'vitest';
import {
  createOrUpdateEntityPage,
  createOrUpdateConceptPage,
  createNewPage,
  type CreatePageContext,
} from '../../../wiki/page-factory/create-page';
import { createMockEntity, createMockConcept } from '../../__support__/factories';
import type { LLMWikiSettings, LLMClient } from '../../../types';

const EXISTING_FM = `---\ncreated: 2026-07-10\nupdated: 2026-07-10\nsources:\n  - "[[existing]]"\ntags: []\n---\n\n## Description\nOld body.\n`;

function makeCtx(opts: {
  files?: Record<string, string>;
  llmResponse?: string | null;
  mockVault?: { getMarkdownFiles: () => Array<{ path: string; basename: string }> };
} = {}): CreatePageContext & { written: Map<string, string> } {
  const files = new Map<string, string>(Object.entries(opts.files ?? {}));
  return {
    written: files,
    app: {
      vault: {
        getMarkdownFiles: opts.mockVault?.getMarkdownFiles ?? (() => []),
        read: async (f: { path: string }): Promise<string> => files.get(f.path) ?? '',
      },
    },
    settings: {
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      slugCase: 'preserve',
      disableThinking: false,
    } as LLMWikiSettings,
    async tryReadFile(p: string): Promise<string | null> {
      return files.get(p) ?? null;
    },
    async createOrUpdateFile(p: string, c: string): Promise<void> {
      files.set(p, c);
    },
    getClient: () => opts.llmResponse === null
      ? null
      : { createMessage: async () => opts.llmResponse ?? '## Description\nLLM body.' },
    buildSystemPrompt: async () => 'system',
  };
}

const EMPTY_ANALYSIS = {} as unknown;

describe('createOrUpdatePage — empty name guard', () => {
  it('returns path=null when name is empty', async () => {
    const ctx = makeCtx();
    const result = await createOrUpdateEntityPage(
      ctx,
      createMockEntity({ name: '   ' }),
      EMPTY_ANALYSIS,
      { path: 'p.md', basename: 'p.md' },
    );
    expect(result.path).toBeNull();
    expect(result.collision).toBeUndefined();
  });
});

describe('createOrUpdatePage — new-page path', () => {
  it('creates a new page when the resolved path does not exist', async () => {
    const ctx = makeCtx({ llmResponse: '## Description\nNew entity.' });
    const result = await createOrUpdateEntityPage(
      ctx,
      createMockEntity({ name: 'NewEntity' }),
      EMPTY_ANALYSIS,
      { path: 'notes/article.md', basename: 'article.md' },
    );
    expect(result.path).toBe('wiki/entities/NewEntity.md');
    const written = ctx.written.get('wiki/entities/NewEntity.md')!;
    expect(written).toContain('New entity.');
  });
});

describe('createOrUpdatePage — existing reviewed page routes to appendToReviewedPage', () => {
  it('routes to appendToReviewedPage when the existing page has reviewed: true', async () => {
    const reviewedContent = `---\ncreated: 2026-07-10\nupdated: 2026-07-10\nsources:\n  - "[[existing]]"\ntags: []\nreviewed: true\n---\n\n## Curated\nLocked.\n`;
    const ctx = makeCtx({
      files: { 'wiki/entities/X.md': reviewedContent },
      llmResponse: '## New\nLLM body.',
    });
    const result = await createOrUpdateEntityPage(
      ctx,
      createMockEntity({ name: 'X' }),
      EMPTY_ANALYSIS,
      { path: 'notes/article.md', basename: 'article.md' },
    );
    expect(result.path).toBe('wiki/entities/X.md');
    const written = ctx.written.get('wiki/entities/X.md')!;
    // The `reviewed: true` marker survived the routing.
    expect(written).toMatch(/reviewed:\s*true/);
    expect(written).toContain('LLM body.');
  });
});

describe('createOrUpdatePage — existing non-reviewed page routes to mergePage', () => {
  it('routes to mergePage when the existing page is not reviewed', async () => {
    const ctx = makeCtx({
      files: { 'wiki/entities/X.md': EXISTING_FM },
      llmResponse: '## Description\nMerged body.',
    });
    const result = await createOrUpdateEntityPage(
      ctx,
      createMockEntity({ name: 'X' }),
      EMPTY_ANALYSIS,
      { path: 'notes/article.md', basename: 'article.md' },
    );
    expect(result.path).toBe('wiki/entities/X.md');
    const written = ctx.written.get('wiki/entities/X.md')!;
    expect(written).toContain('Merged body.');
  });
});

describe('createOrUpdateConceptPage', () => {
  it('delegates to the router with pageType=concept', async () => {
    const ctx = makeCtx({ llmResponse: '## Description\nConcept body.' });
    const result = await createOrUpdateConceptPage(
      ctx,
      createMockConcept({ name: 'Caching' }),
      EMPTY_ANALYSIS,
      { path: 'p.md', basename: 'p.md' },
    );
    expect(result.path).toBe('wiki/concepts/Caching.md');
  });
});

describe('createNewPage — client precondition', () => {
  it('throws when no LLM client is configured', async () => {
    const ctx = makeCtx({ llmResponse: null });
    await expect(
      createNewPage(
        ctx,
        createMockEntity({ name: 'X' }),
        'entity',
        { path: 'p.md', basename: 'p.md' },
        [],
        'wiki/entities/X.md',
      ),
    ).rejects.toThrow(/LLM client not initialized/);
  });
});

describe('createNewPage — programmatic Mentions injection (Issue #244)', () => {
  it('injects the Mentions section with the new entity\'s mentions', async () => {
    const ctx = makeCtx({ llmResponse: '## Description\nBody without mentions.' });
    await createNewPage(
      ctx,
      createMockEntity({ name: 'X', mentions_in_source: ['quote-A', 'quote-B'] }),
      'entity',
      { path: 'notes/article.md', basename: 'article.md' },
      [],
      'wiki/entities/X.md',
    );
    const written = ctx.written.get('wiki/entities/X.md')!;
    // The Mentions section was appended programmatically.
    expect(written).toContain('Mentions in Source');
    expect(written).toContain('quote-A');
    expect(written).toContain('quote-B');
  });
});

describe('createNewPage — conversation source uses single synthetic citation', () => {
  it('emits a Conversation: citation (not the multi-quote list) for conversation sources', async () => {
    const ctx = makeCtx({ llmResponse: '## Description\nBody.' });
    await createNewPage(
      ctx,
      createMockEntity({ name: 'X', mentions_in_source: ['should-not-appear'] }),
      'entity',
      { path: 'wiki/sources/conv.md', basename: 'conv' },
      [],
      'wiki/entities/X.md',
    );
    const written = ctx.written.get('wiki/entities/X.md')!;
    expect(written).toContain('Conversation: conv');
    expect(written).not.toContain('should-not-appear');
  });
});

describe('createNewPage — wraps errors with entity context', () => {
  it('throws a contextualized error when the LLM client fails', async () => {
    const failingClient: LLMClient = {
      createMessage: async () => { throw new Error('rate limit'); },
    };
    const ctx: CreatePageContext & { written: Map<string, string> } = {
      written: new Map(),
      app: { vault: { getMarkdownFiles: () => [], read: async () => '' } },
      settings: { wikiFolder: 'wiki', wikiLanguage: 'en', slugCase: 'preserve', disableThinking: false } as LLMWikiSettings,
      async tryReadFile() { return null; },
      async createOrUpdateFile() {},
      getClient: () => failingClient,
      buildSystemPrompt: async () => 'system',
    };
    await expect(
      createNewPage(
        ctx,
        createMockEntity({ name: 'Karpathy' }),
        'entity',
        { path: 'p.md', basename: 'p.md' },
        [],
        'wiki/entities/Karpathy.md',
      ),
    ).rejects.toThrow(/Failed to create entity page "Karpathy"/);
  });
});