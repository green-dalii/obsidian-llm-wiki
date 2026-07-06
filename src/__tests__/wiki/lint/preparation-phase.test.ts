import { describe, it, expect } from 'vitest';
import { runPreparationPhase } from '../../../wiki/lint/phases/preparation';
import { LintPhaseContext } from '../../../wiki/lint/types';
import { LLMWikiSettings } from '../../../types';

function makeMockApp(files: Record<string, string>, abstractFiles: string[] = []) {
  const tfiles = new Map<string, { path: string; basename: string }>();
  for (const [path] of Object.entries(files)) {
    tfiles.set(path, { path, basename: path.split('/').pop()?.replace('.md', '') || '' });
  }
  return {
    vault: {
      getMarkdownFiles: () => Array.from(tfiles.values()),
      read: async (file: { path: string }) => files[file.path] ?? '',
      getAbstractFileByPath: (path: string) => {
        if (!abstractFiles.includes(path)) return null;
        return { path };
      },
      process: async (file: { path: string }, fn: (data: string) => string | Promise<string>) => {
        const result = await fn(files[file.path] ?? '');
        files[file.path] = result;
        return result;
      },
    },
  };
}

function makeContext(files: Record<string, string>, abstractFiles: string[] = [], settings?: Partial<LLMWikiSettings>): LintPhaseContext {
  return {
    app: makeMockApp(files, abstractFiles) as unknown as LintPhaseContext['app'],
    settings: {
      wikiFolder: 'wiki',
      language: 'en',
      slugCase: 'lower',
      ...settings,
    } as LLMWikiSettings,
    llmClient: () => null, // preparation phase does not consume LLM
    wikiEngine: { updateStatusBar: () => {} } as unknown as LintPhaseContext['wikiEngine'],
    checkCancelled: () => {},
    stageNotice: null,
    totalPages: 0,
  };
}

describe('runPreparationPhase', () => {
  it('reads wiki pages and returns a populated pageMap', async () => {
    const files = {
      'wiki/entities/Foo.md': '# Foo\n\nBody',
      'wiki/concepts/Bar.md': '# Bar\n\nBody',
    };
    const ctx = makeContext(files);
    const result = await runPreparationPhase(ctx);

    expect(result.wikiFiles).toHaveLength(2);
    expect(result.pageMap.has('wiki/entities/Foo.md')).toBe(true);
    expect(result.pageMap.get('wiki/entities/Foo.md')?.content).toBe('# Foo\n\nBody');
  });

  it('filters out index, log, schema, and contradictions files', async () => {
    const files = {
      'wiki/index.md': '# Index',
      'wiki/log.md': '# Log',
      'wiki/schema/config.md': '---\n---',
      'wiki/contradictions/x.md': 'x',
      'wiki/entities/Keep.md': '# Keep',
    };
    const ctx = makeContext(files);
    const result = await runPreparationPhase(ctx);

    expect(result.wikiFiles).toHaveLength(1);
    expect(result.wikiFiles[0].path).toBe('wiki/entities/Keep.md');
  });

  it('skips Welcome notes (frontmatter type=welcome) — v1.23.0 P0-2 follow-up', async () => {
    // Welcome filename is localized (e.g. "欢迎使用 Karpathy LLM Wiki.md"
    // for Chinese), so we cannot filter by filename. The only robust
    // signal is `type: welcome` in the frontmatter.
    const files = {
      'wiki/Welcome.md': '---\ntype: welcome\ncreated: 2026-06-29\n---\n\n# Welcome\n\nSee [[Other Page]] for details.',
      'wiki/欢迎使用 Karpathy LLM Wiki.md': '---\ntype: welcome\ncreated: 2026-06-29\n---\n\n# 欢迎\n\nSee [[Other Page]].',
      'wiki/entities/Keep.md': '# Keep\n\nSee [[Other Page]].',
    };
    const ctx = makeContext(files);
    const result = await runPreparationPhase(ctx);

    // Only the entity should be linted; both welcome notes skipped.
    expect(result.wikiFiles).toHaveLength(1);
    expect(result.wikiFiles[0].path).toBe('wiki/entities/Keep.md');
    expect(result.pageMap.has('wiki/Welcome.md')).toBe(false);
    expect(result.pageMap.has('wiki/欢迎使用 Karpathy LLM Wiki.md')).toBe(false);
    expect(result.pageMap.has('wiki/entities/Keep.md')).toBe(true);
  });

  it('does NOT skip pages that merely mention "welcome" in body — only frontmatter type=welcome', async () => {
    // Defensive: a regular entity page that contains the word
    // "welcome" in its body should still be linted.
    const files = {
      'wiki/entities/About.md': '---\ntype: entity\n---\n\n# About\n\nWelcome to our wiki. See [[Other]].',
    };
    const ctx = makeContext(files);
    const result = await runPreparationPhase(ctx);

    expect(result.wikiFiles).toHaveLength(1);
    expect(result.pageMap.has('wiki/entities/About.md')).toBe(true);
  });

  it('fixes double-nested wiki links in place', async () => {
    const files = {
      'wiki/entities/Foo.md': 'See [[[[Nested]]]] link.',
    };
    const ctx = makeContext(files, ['wiki/entities/Foo.md']);
    const result = await runPreparationPhase(ctx);

    expect(result.doubleNestFixes).toBe(1);
    expect(result.pageMap.get('wiki/entities/Foo.md')?.content).toBe('See [[Nested]] link.');
  });

  it('normalizes polluted sources fields', async () => {
    const files = {
      'wiki/sources/Article.md': '---\nsources:\n  - "https://example.com"\n---\n\nBody',
    };
    const ctx = makeContext(files, ['wiki/sources/Article.md']);
    const result = await runPreparationPhase(ctx);

    expect(result.sourcesNormalizedFiles).toBe(1);
    expect(result.sourcesNormalizedEntries).toBeGreaterThan(0);
  });
});
