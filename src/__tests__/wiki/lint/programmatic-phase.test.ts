import { describe, it, expect } from 'vitest';
import { runProgrammaticPhase } from '../../../wiki/lint/phases/programmatic';
import { LintPhaseContext, ScannerPage } from '../../../wiki/lint/types';
import { LLMWikiSettings } from '../../../types';
import type { Graph } from '../../../core/monte-carlo-ppr';

function makeContext(settings?: Partial<LLMWikiSettings>): LintPhaseContext {
  return {
    app: {} as LintPhaseContext['app'],
    settings: {
      wikiFolder: 'wiki',
      language: 'en',
      slugCase: 'lower',
      tagVocabularyMode: 'default',
      customEntityTags: '',
      customConceptTags: '',
      ...settings,
    } as LLMWikiSettings,
    wikiEngine: { updateStatusBar: () => {} } as unknown as LintPhaseContext['wikiEngine'],
    checkCancelled: () => {},
    stageNotice: null,
    totalPages: 0,
  };
}

function makePageMap(entries: Record<string, string>): Map<string, ScannerPage> {
  const m = new Map<string, ScannerPage>();
  for (const [path, content] of Object.entries(entries)) {
    m.set(path, { path, content, basename: path.split('/').pop() || '' });
  }
  return m;
}

function makeWikiFiles(paths: string[]): Array<{ path: string; basename: string }> {
  return paths.map(p => ({ path: p, basename: p.split('/').pop()?.replace('.md', '') || '' }));
}

function emptyGraph(): Graph {
  return { nodes: [], edges: new Map() };
}

describe('runProgrammaticPhase', () => {
  it('returns alias-deficient pages', async () => {
    const ctx = makeContext();
    const pageMap = makePageMap({
      'wiki/entities/Foo.md': '---\ntype: entity\n---\n\nBody',
    });
    const result = runProgrammaticPhase(ctx, {
      wikiFiles: makeWikiFiles(['wiki/entities/Foo.md']),
      pageMap,
      knownTargets: new Set(),
      knownTargetsLower: new Set(),
      graph: emptyGraph(),
    });
    expect(result.aliasDeficientPages).toHaveLength(1);
  });

  it('returns orphan pages', async () => {
    const ctx = makeContext();
    const pageMap = makePageMap({
      'wiki/entities/Orphan.md': '---\ntype: entity\n---\n\nNo links.',
    });
    const result = runProgrammaticPhase(ctx, {
      wikiFiles: makeWikiFiles(['wiki/entities/Orphan.md']),
      pageMap,
      knownTargets: new Set(),
      knownTargetsLower: new Set(),
      graph: emptyGraph(),
    });
    expect(result.orphans).toContain('wiki/entities/Orphan.md');
  });

  it('returns dead links', async () => {
    const ctx = makeContext();
    const pageMap = makePageMap({
      'wiki/concepts/Foo.md': 'See [[Missing]] for details.',
    });
    const result = runProgrammaticPhase(ctx, {
      wikiFiles: makeWikiFiles(['wiki/concepts/Foo.md']),
      pageMap,
      knownTargets: new Set(),
      knownTargetsLower: new Set(),
      graph: emptyGraph(),
    });
    expect(result.deadLinks).toHaveLength(1);
    expect(result.deadLinks[0].target).toBe('Missing');
  });

  it('returns ungrounded quotes', async () => {
    const ctx = makeContext();
    const pageMap = makePageMap({
      'wiki/entities/Foo.md': '## Mentions in Source\n- "fabricated text" — [[sources/article]]',
      'wiki/sources/article.md': '# Article\n\nSome other text.',
    });
    const result = runProgrammaticPhase(ctx, {
      wikiFiles: makeWikiFiles(['wiki/entities/Foo.md', 'wiki/sources/article.md']),
      pageMap,
      knownTargets: new Set(),
      knownTargetsLower: new Set(),
      graph: emptyGraph(),
    });
    expect(result.ungroundedQuotes).toHaveLength(1);
  });

  it('initializes emptyPages as empty (populated later by LLM phase)', async () => {
    const ctx = makeContext();
    const pageMap = makePageMap({});
    const result = runProgrammaticPhase(ctx, {
      wikiFiles: makeWikiFiles([]),
      pageMap,
      knownTargets: new Set(),
      knownTargetsLower: new Set(),
      graph: emptyGraph(),
    });
    expect(result.emptyPages).toEqual([]);
  });

  it('initializes hubLinkDensityIssues as empty array (v1.23.0 P1-6)', async () => {
    const ctx = makeContext();
    const pageMap = makePageMap({});
    const result = runProgrammaticPhase(ctx, {
      wikiFiles: makeWikiFiles([]),
      pageMap,
      knownTargets: new Set(),
      knownTargetsLower: new Set(),
      graph: emptyGraph(),
    });
    expect(result.hubLinkDensityIssues).toEqual([]);
  });
});
