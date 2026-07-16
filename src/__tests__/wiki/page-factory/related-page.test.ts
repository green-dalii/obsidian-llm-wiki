// Module-level unit tests for page-factory/related-page.ts
//
// v1.24.1 Phase 2 refactor: updateRelatedPage was lifted out of the
// PageFactory class. The tests pin the three-branch routing logic
// (no-new-info / reviewed: true / normal LLM rewrite).
//
// Note on naming vs behavior (pre-existing, NOT introduced by this refactor):
// `appendToReviewedPage` writes the LLM-generated body verbatim, NOT an
// append to `## New Information`. The name comes from the original
// createOrUpdatePage routing (#158, commit 5a00094) where the intent was
// "minimal append path that preserves curated content." The implementation
// drifted to LLM-rewrite without renaming. Fixing that semantic mismatch is
// OUT OF SCOPE for this pure-refactor split (it would change observable
// behavior). Tracked separately.

import { describe, it, expect } from 'vitest';
import { TFile } from 'obsidian';
import { updateRelatedPage, type RelatedPageContext } from '../../../wiki/page-factory/related-page';
import type { SourceAnalysis, LLMWikiSettings } from '../../../types';

const PAGE_PATH = 'wiki/entities/X.md';
const PAGE_TITLE = 'X';
const EXISTING_FM = `---\ncreated: 2026-07-10\nupdated: 2026-07-10\nsources:\n  - "[[existing]]"\ntags: []\n---\n\n## Description\nOld body.\n`;

function makeCtx(opts: {
  pages?: Array<{ path: string; basename: string }>;
  pageContent?: string;
  llmResponse?: string | null;
} = {}): RelatedPageContext & { written: Map<string, string> } {
  const written = new Map<string, string>();
  const pages = opts.pages ?? (opts.pageContent !== undefined ? [{ path: PAGE_PATH, basename: PAGE_TITLE }] : []);
  if (opts.pageContent !== undefined) {
    written.set(PAGE_PATH, opts.pageContent);
  }
  return {
    written,
    app: {
      vault: {
        getMarkdownFiles: () => pages,
        getAbstractFileByPath(p: string): unknown {
          if (p !== PAGE_PATH) return null;
          // Mirror createMockContext: assign path explicitly because the stub
          // TFile constructor does not store its arg.
          return Object.assign(new TFile(), { path: PAGE_PATH, basename: PAGE_TITLE });
        },
        async read(file: { path: string }): Promise<string> {
          return written.get(file.path) ?? '';
        },
      },
    } as RelatedPageContext['app'],
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
    getClient: () => opts.llmResponse === null
      ? null
      : { createMessage: async () => opts.llmResponse ?? 'new body' },
    buildSystemPrompt: async () => 'system',
  };
}

function makeAnalysis(matchingName?: string): SourceAnalysis {
  const entities = matchingName
    ? [{
        name: matchingName,
        type: 'other' as const,
        summary: 's',
        mentions_in_source: [],
        related_entities: [],
        related_concepts: [],
      }]
    : [{
        name: 'OtherEntity',
        type: 'other' as const,
        summary: 's',
        mentions_in_source: [],
        related_entities: [],
        related_concepts: [],
      }];
  return {
    source_file: 'src.md',
    source_title: 'src',
    summary: '',
    entities,
    concepts: [],
    contradictions: [],
    related_pages: [],
    key_points: [],
    created_pages: [],
    updated_pages: [],
  };
}

describe('updateRelatedPage — page not found', () => {
  it('returns false when no existing page matches the name', async () => {
    const ctx = makeCtx(); // empty pages
    const result = await updateRelatedPage(
      ctx,
      'Karpathy',
      makeAnalysis('Karpathy'),
      { path: 'p.md', basename: 'p.md' },
    );
    expect(result).toBe(false);
    expect(ctx.written.size).toBe(0);
  });
});

describe('updateRelatedPage — no matching entity (#131 fast path)', () => {
  it('re-merges frontmatter only — body is preserved verbatim, LLM is NOT called', async () => {
    const ctx = makeCtx({ pageContent: EXISTING_FM });
    const result = await updateRelatedPage(
      ctx,
      PAGE_TITLE,
      makeAnalysis('SomeOtherName'), // no entity named 'X'
      { path: 'src.md', basename: 'src.md' },
    );
    expect(result).toBe(true);
    const written = ctx.written.get(PAGE_PATH)!;
    // Body preserved verbatim.
    expect(written).toContain('## Description');
    expect(written).toContain('Old body.');
    // The new source was added to the sources: list.
    expect(written).toContain('src.md');
  });
});

describe('updateRelatedPage — reviewed: true guards the routing (Issue #158)', () => {
  // The reviewed branch is observed via routing: when the page has
  // `reviewed: true`, the LLM body still gets written but via
  // appendToReviewedPage rather than the normal merge prompt. The
  // observable difference for this test is that the reviewed flag is
  // preserved through the frontmatter rewrite AND the LLM body lands in
  // the output. We do NOT assert curated-body preservation here because
  // the current implementation of appendToReviewedPage replaces the body
  // with LLM output (a pre-existing semantic mismatch with the function
  // name — see file header comment).
  it('preserves reviewed: true and writes via appendToReviewedPage (LLM body path)', async () => {
    const reviewedContent = `---\ncreated: 2026-07-10\nupdated: 2026-07-10\nsources:\n  - "[[existing]]"\ntags: []\nreviewed: true\n---\n\n## Curated\nLocked.\n`;
    const ctx = makeCtx({
      pageContent: reviewedContent,
      llmResponse: '## New section\nLLM body.',
    });
    const result = await updateRelatedPage(
      ctx,
      PAGE_TITLE,
      makeAnalysis(PAGE_TITLE),
      { path: 'src.md', basename: 'src.md' },
    );
    expect(result).toBe(true);
    const written = ctx.written.get(PAGE_PATH)!;
    // The `reviewed: true` marker survived the frontmatter rewrite.
    expect(written).toMatch(/reviewed:\s*true/);
    // The LLM body made it into the output (via appendToReviewedPage).
    expect(written).toContain('LLM body.');
  });
});

describe('updateRelatedPage — normal path rewrites via LLM', () => {
  it('writes the LLM-produced body when no skip branch fires', async () => {
    const ctx = makeCtx({
      pageContent: EXISTING_FM,
      llmResponse: '## Description\nNew body.',
    });
    const result = await updateRelatedPage(
      ctx,
      PAGE_TITLE,
      makeAnalysis(PAGE_TITLE),
      { path: 'src.md', basename: 'src.md' },
    );
    expect(result).toBe(true);
    const written = ctx.written.get(PAGE_PATH)!;
    expect(written).toContain('New body.');
  });

  it('throws when no LLM client is configured (normal path)', async () => {
    const ctx = makeCtx({
      pageContent: EXISTING_FM,
      llmResponse: null,
    });
    await expect(
      updateRelatedPage(ctx, PAGE_TITLE, makeAnalysis(PAGE_TITLE), { path: 'src.md', basename: 'src.md' }),
    ).rejects.toThrow(/LLM client not initialized/);
  });
});