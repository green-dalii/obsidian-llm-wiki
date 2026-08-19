// Module-level unit tests for page-factory/path-resolution.ts
//
// v1.24.1 Phase 2 refactor: resolvePagePath was lifted out of PageFactory.
// These tests pin the slug-vs-LLM fallback chain and cross-type collision
// detection. The prompt's candidate-list builder that used to live here went
// with #482 stage 2: link targets are resolved against the whole vault after
// generation, so no window is built for a prompt any more.

import { describe, it, expect, vi } from 'vitest';
import {
  resolvePagePath,
  type PathResolutionContext,
} from '../../../wiki/page-factory/path-resolution';
import type { LLMWikiSettings } from '../../../types';

// Mock app is required because getExistingWikiPages accepts `ctx.app`. We
// stub it at the test level so the real Obsidian API is never invoked.
function makeCtx(overrides: {
  files?: Record<string, string>;
  client?: { createMessage: (...a: unknown[]) => Promise<string> } | null;
  mockVault?: { getMarkdownFiles: () => Array<{ path: string; basename: string }> };
} = {}): PathResolutionContext & { written: Map<string, string> } {
  const files = new Map<string, string>(Object.entries(overrides.files ?? {}));
  const ctx: PathResolutionContext & { written: Map<string, string> } = {
    written: files,
    settings: {
      wikiFolder: 'wiki',
      slugCase: 'preserve',
    } as LLMWikiSettings,
    app: {
      vault: {
        getMarkdownFiles: overrides.mockVault?.getMarkdownFiles ?? (() => []),
        read: async (f: { path: string }): Promise<string> => files.get(f.path) ?? '',
      },
    },
    async tryReadFile(p: string): Promise<string | null> {
      return files.get(p) ?? null;
    },
    async createOrUpdateFile(p: string, c: string): Promise<void> {
      files.set(p, c);
    },
    getClient() {
      return overrides.client === undefined ? null : overrides.client;
    },
    async buildSystemPrompt(): Promise<string> { return 'system'; },
  };
  Object.assign(ctx.settings, {
    wikiFolder: 'wiki',
    slugCase: 'preserve',
  });
  return ctx;
}

describe('resolvePagePath — exact-slug fast path', () => {
  it('returns the slug path when an entity page already exists (no alias needed)', async () => {
    const ctx = makeCtx({
      files: { 'wiki/entities/Karpathy.md': '# existing' },
    });
    // slugCase='preserve' keeps the original case in the slug.
    const result = await resolvePagePath(ctx, 'Karpathy', 'entity', 'summary');
    expect(result.path).toBe('wiki/entities/Karpathy.md');
  });

  it('leaves the opposite-folder page untouched when both folders hold the slug', async () => {
    // Issue #472: the fast path used to probe the opposite folder and, on a
    // hit, write the extracted name onto that page as an alias — "bridging"
    // the two. A multi-word name survives `filterRedundantAliases` (which
    // compares against the basename, not the slug), so the write was real: it
    // put this name into the other type's namespace, after which the two pages
    // matched each other on every later ingest. The opposite page is now
    // neither read nor written.
    const conceptBefore = '---\ntitle: Deep-Learning\n---\n\n# concepts/';
    const ctx = makeCtx({
      files: {
        'wiki/concepts/Deep-Learning.md': conceptBefore,
        'wiki/entities/Deep-Learning.md': '---\ntitle: Deep-Learning\n---\n\n# entity',
      },
    });
    const result = await resolvePagePath(ctx, 'Deep Learning', 'entity', 'summary');
    expect(result.path).toBe('wiki/entities/Deep-Learning.md');
    expect(ctx.written.get('wiki/concepts/Deep-Learning.md')).toBe(conceptBefore);
  });
});

describe('resolvePagePath — LLM semantic dedup fallback', () => {
  it('falls back to slug path when no client is configured', async () => {
    const ctx = makeCtx({ client: null });
    // slugCase='preserve' keeps original case.
    const result = await resolvePagePath(ctx, 'NewConcept', 'concept', 'desc');
    expect(result.path).toBe('wiki/concepts/NewConcept.md');
  });

  it('returns matched path when LLM responds with match=true and a path', async () => {
    // Pre-fill the target page so appendAliases() can find its frontmatter.
    const ctx = makeCtx({
      files: { 'wiki/concepts/RelatedIdea.md': '---\ntitle: RelatedIdea\n---\n\n# page' },
      mockVault: {
        getMarkdownFiles: () => [{ path: 'wiki/concepts/Other.md', basename: 'Other' }],
      },
      client: {
        createMessage: async () =>
          JSON.stringify({ match: true, path: 'wiki/concepts/RelatedIdea.md' }),
      },
    });
    const result = await resolvePagePath(ctx, 'BrandNew', 'concept', 'desc');
    expect(result.path).toBe('wiki/concepts/RelatedIdea.md');
    expect(ctx.written.get('wiki/concepts/RelatedIdea.md')).toMatch(/"BrandNew"/);
  });

  it('returns slug path when LLM responds with match=false', async () => {
    const ctx = makeCtx({
      mockVault: {
        getMarkdownFiles: () => [{ path: 'wiki/entities/Other.md', basename: 'Other' }],
      },
      client: {
        createMessage: async () => JSON.stringify({ match: false }),
      },
    });
    const result = await resolvePagePath(ctx, 'Novel', 'entity', 'desc');
    expect(result.path).toBe('wiki/entities/Novel.md');
  });

  // Issue #446: two pages carry the designator "E433" as an alias. Before the
  // fix the deterministic gate merged into whichever one getMarkdownFiles
  // yielded first; now the ambiguity reaches the dedup call, and every exit
  // that reaches no decision lands on the tag-ranked candidate rather than
  // creating a third page for a name that is already an alias twice.
  const ambiguousVault = {
    files: {
      'wiki/entities/Polysorbat-80.md': '---\naliases:\n  - E433\ntags:\n  - Lebensmittelzusatzstoff\n---\nbody',
      'wiki/entities/Polysorbate.md': '---\naliases:\n  - E433\ntags:\n  - Chemie\n---\nbody',
    },
    mockVault: {
      getMarkdownFiles: () => [
        { path: 'wiki/entities/Polysorbat-80.md', basename: 'Polysorbat-80' },
        { path: 'wiki/entities/Polysorbate.md', basename: 'Polysorbate' },
      ],
    },
  };

  it('falls back to the tag-ranked candidate when no client can decide', async () => {
    const ctx = makeCtx({ ...ambiguousVault, client: null });
    const result = await resolvePagePath(ctx, 'E433', 'entity', 'desc', ['Chemie']);
    expect(result.path).toBe('wiki/entities/Polysorbate.md');
  });

  it('resolves an ambiguous designator independently of vault order', async () => {
    const reversed = {
      ...ambiguousVault,
      mockVault: {
        getMarkdownFiles: () => [...ambiguousVault.mockVault.getMarkdownFiles()].reverse(),
      },
    };
    const forward = await resolvePagePath(makeCtx({ ...ambiguousVault, client: null }), 'E433', 'entity', 'desc');
    const backward = await resolvePagePath(makeCtx({ ...reversed, client: null }), 'E433', 'entity', 'desc');
    expect(backward.path).toBe(forward.path);
  });

  it('shows the matching pages to the dedup call ahead of the lexical filler', async () => {
    let prompt = '';
    const ctx = makeCtx({
      ...ambiguousVault,
      client: {
        createMessage: async (args: unknown) => {
          prompt = (args as { messages: Array<{ content: string }> }).messages[0].content;
          return JSON.stringify({ match: true, path: 'wiki/entities/Polysorbate.md' });
        },
      },
    });
    const result = await resolvePagePath(ctx, 'E433', 'entity', 'desc', ['Chemie']);
    expect(result.path).toBe('wiki/entities/Polysorbate.md');
    expect(prompt.indexOf('Polysorbate.md')).toBeLessThan(prompt.indexOf('Polysorbat-80.md'));
  });

  // #446 follow-up: an ambiguous-designator fallback must not latch the
  // extracted name as an alias, unlike the decided merge paths, which still do.
  // The latch cannot end the ambiguity it was meant to end — ConflictResolver
  // matches over slug keys, and an alias whose slug the page already carries
  // adds none (measured in conflict-resolver.test.ts) — so the next ingest
  // returns here, and what the write leaves behind is the designator claimed by
  // whichever candidate ranked first this time, and by the next one when the
  // ranking moves. Fixture as in the original latch test: the designator
  // carries a character that survives as an alias but is stripped from the
  // slug, so a write would be visible.
  it('does not latch the extracted name on the tag-ranked fallback page (no-client exit)', async () => {
    const ctx = makeCtx({
      files: {
        'wiki/entities/No2.md': '---\ntags:\n  - Biochemie\n---\nbody',
        'wiki/entities/NO2.md': '---\ntags:\n  - other\n---\nbody',
      },
      mockVault: {
        getMarkdownFiles: () => [
          { path: 'wiki/entities/No2.md', basename: 'No2' },
          { path: 'wiki/entities/NO2.md', basename: 'NO2' },
        ],
      },
      client: null,
    });
    // `written` is the seeded file map itself, so the pin is that no entry
    // changed and none was added — not that the map is empty.
    const before = new Map(ctx.written);
    const result = await resolvePagePath(ctx, 'no2-', 'entity', 'desc', ['Biochemie']);
    expect(result.path).toBe('wiki/entities/No2.md');
    expect(ctx.written.size).toBe(before.size);
    for (const [path, content] of before) {
      expect(ctx.written.get(path)).toBe(content);
    }
  });

  it('passes the slim "index" schema selector to buildSystemPrompt', async () => {
    // The dedup question is a same-type yes/no match; the matching criteria
    // live in the user prompt. Only "Wiki Structure" is needed from the
    // schema — templates/naming/granularity are ballast for this call.
    let seenMode: string | undefined;
    const ctx = makeCtx({
      mockVault: {
        getMarkdownFiles: () => [{ path: 'wiki/entities/Other.md', basename: 'Other' }],
      },
      client: {
        createMessage: async () => JSON.stringify({ match: false }),
      },
    });
    ctx.buildSystemPrompt = async (mode: string): Promise<string> => {
      seenMode = mode;
      return 'system';
    };
    await resolvePagePath(ctx, 'Novel', 'entity', 'desc');
    expect(seenMode).toBe('index');
  });

  // #407 Stage 1: an unreadable reply is not an answer. The returned path is
  // the same one `match: false` produces, which is why the distinction has to
  // be visible in the log — before this, the no-exception failure path left no
  // trace at all and the duplicate page it caused had no explanation.
  it.each([
    ['empty', ''],
    ['empty', '<think>spent the budget deliberating</think>'],
    ['malformed', '{"match": true, "path": "wiki/entities/Other.md"'],
  ])('reports an unreadable dedup reply as %s instead of as "no match"', async (reason, reply) => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    const ctx = makeCtx({
      mockVault: {
        getMarkdownFiles: () => [{ path: 'wiki/entities/Other.md', basename: 'Other' }],
      },
      client: { createMessage: async () => reply },
    });

    const result = await resolvePagePath(ctx, 'Unreadable', 'entity', 'desc');
    spy.mockRestore();

    expect(result.path).toBe('wiki/entities/Unreadable.md');
    const line = errors.find(e => e.includes('Entity resolution for "Unreadable"'));
    expect(line).toBeDefined();
    expect(line).toContain(reason);
    expect(line).toContain('no match decided');
  });

  it('does not report a well-formed match=false as a parse failure', async () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    const ctx = makeCtx({
      mockVault: {
        getMarkdownFiles: () => [{ path: 'wiki/entities/Other.md', basename: 'Other' }],
      },
      client: { createMessage: async () => JSON.stringify({ match: false }) },
    });

    const result = await resolvePagePath(ctx, 'Novel', 'entity', 'desc');
    spy.mockRestore();

    expect(result.path).toBe('wiki/entities/Novel.md');
    expect(errors.some(e => e.includes('unreadable'))).toBe(false);
  });

  it('returns slug path when LLM throws (defensive fallback)', async () => {
    const ctx = makeCtx({
      mockVault: {
        getMarkdownFiles: () => [{ path: 'wiki/entities/Other.md', basename: 'Other' }],
      },
      client: {
        createMessage: async () => { throw new Error('rate limit'); },
      },
    });
    const result = await resolvePagePath(ctx, 'WillRetry', 'entity', 'desc');
    expect(result.path).toBe('wiki/entities/WillRetry.md');
  });
});

describe('resolvePagePath — the opposite type is a different designator (#472)', () => {
  it('creates in its own folder when only the opposite folder holds the name', async () => {
    const ctx = makeCtx({
      files: {
        'wiki/concepts/Cross.md': '# concept exists',
      },
    });
    const result = await resolvePagePath(ctx, 'Cross', 'entity', 'desc');
    expect(result.path).toBe('wiki/entities/Cross.md');
  });
});
