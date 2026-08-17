import { describe, it, expect, vi } from 'vitest';
import { TFile } from 'obsidian';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import {
  SourceAnalyzer,
  buildCompactSlugList,
  buildRunScopedSlugList,
  createRunSlugCatalog,
} from '../../wiki/source-analyzer';
import { EngineContext } from '../../types';

// Issue #452: the catalog block is ~91% of the extraction prompt and sits at the
// top, so it is what a prefix cache can reuse. These tests pin the property that
// makes reuse possible: inside one run the block only ever grows at the end.
//
// The mock vault in __support__/engine-context snapshots its file list at
// construction, so a run that creates pages needs a vault whose file list can
// change between calls.
function mutableApp(paths: string[]): { app: EngineContext['app']; add: (p: string) => void; remove: (p: string) => void } {
  const files = [...paths];
  const app = {
    vault: {
      getMarkdownFiles: () => files.map(path => ({ path })),
    },
  } as unknown as EngineContext['app'];
  return {
    app,
    add: (p: string) => { files.push(p); },
    remove: (p: string) => { files.splice(files.indexOf(p), 1); },
  };
}

describe('buildRunScopedSlugList (#452)', () => {
  it('[frozen-base] snapshots sorted on the first call and appends later pages at the end', () => {
    const { app, add } = mutableApp(['wiki/concepts/Beta.md', 'wiki/entities/Delta.md']);
    const catalog = createRunSlugCatalog();

    const first = buildRunScopedSlugList(app, 'wiki', 'Notes/note-1.md', catalog);
    expect(first.split('\n')).toEqual(['concepts/Beta', 'entities/Delta']);

    // The first note creates a concept that sorts to the front alphabetically.
    add('wiki/concepts/Alpha.md');
    const second = buildRunScopedSlugList(app, 'wiki', 'Notes/note-2.md', catalog);

    expect(second.split('\n')).toEqual(['concepts/Beta', 'entities/Delta', 'concepts/Alpha']);
    // The point of the whole change: the previous block is still a prefix.
    expect(second.startsWith(first)).toBe(true);
    // A freshly sorted list would have diverged on line 1 instead.
    expect(buildCompactSlugList(app, 'wiki', 'Notes/note-2.md').startsWith(first)).toBe(false);
  });

  it('[append-only] a third note never shifts what the second note appended', () => {
    const { app, add } = mutableApp(['wiki/concepts/Mid.md']);
    const catalog = createRunSlugCatalog();

    buildRunScopedSlugList(app, 'wiki', 'Notes/note-1.md', catalog);
    add('wiki/entities/Zeta.md');
    const second = buildRunScopedSlugList(app, 'wiki', 'Notes/note-2.md', catalog);
    add('wiki/entities/Aaa.md');
    const third = buildRunScopedSlugList(app, 'wiki', 'Notes/note-3.md', catalog);

    expect(third.startsWith(second)).toBe(true);
    expect(third.split('\n')).toEqual(['concepts/Mid', 'entities/Zeta', 'entities/Aaa']);
  });

  it('[stable-vault] a note that creates nothing renders a byte-identical block', () => {
    const { app } = mutableApp(['wiki/concepts/One.md', 'wiki/entities/Two.md']);
    const catalog = createRunSlugCatalog();

    const first = buildRunScopedSlugList(app, 'wiki', 'Notes/note-1.md', catalog);
    const second = buildRunScopedSlugList(app, 'wiki', 'Notes/note-2.md', catalog);
    expect(second).toBe(first);
  });

  it('[deleted-page] a page removed mid-run stays in the catalog rather than shifting the tail', () => {
    // Accepted consequence, not an oversight: dropping the line would move
    // every slug after it and cost the run its cache. Stale link targets are
    // resolved downstream by PageFactory.resolvePagePath.
    const { app, remove } = mutableApp(['wiki/concepts/Keep.md', 'wiki/concepts/Merged-Away.md', 'wiki/entities/Tail.md']);
    const catalog = createRunSlugCatalog();

    const first = buildRunScopedSlugList(app, 'wiki', 'Notes/note-1.md', catalog);
    remove('wiki/concepts/Merged-Away.md');
    const second = buildRunScopedSlugList(app, 'wiki', 'Notes/note-2.md', catalog);

    expect(second).toBe(first);
    expect(second).toContain('concepts/Merged-Away');
  });

  it('[self-exclusion] a source inside the wiki folder is dropped from its own catalog', () => {
    const { app } = mutableApp(['wiki/sources/Self.md', 'wiki/entities/Other.md']);
    const catalog = createRunSlugCatalog();

    // First call freezes the base without the first source's own slug…
    const first = buildRunScopedSlugList(app, 'wiki', 'wiki/sources/Self.md', catalog);
    expect(first.split('\n')).toEqual(['entities/Other']);

    // …and a later note in the same run sees the frozen base plus itself again.
    const second = buildRunScopedSlugList(app, 'wiki', 'wiki/sources/Other-Source.md', catalog);
    expect(second.split('\n')).toEqual(['entities/Other', 'sources/Self']);
  });

  it('[no-catalog] without a run the list is freshly sorted, as before', () => {
    const { app, add } = mutableApp(['wiki/concepts/Beta.md']);
    add('wiki/concepts/Alpha.md');
    expect(buildCompactSlugList(app, 'wiki', 'Notes/note.md').split('\n'))
      .toEqual(['concepts/Alpha', 'concepts/Beta']);
  });
});

describe('SourceAnalyzer catalog wiring (#452)', () => {
  const NOTE_PATH = 'sources/note.md';
  const RESPONSE = JSON.stringify({
    source_title: 'Note',
    summary: 'A note.',
    entities: [{ name: 'Foo', type: 'other', summary: 'bar', mentions_in_source: [] }],
    concepts: [],
  });

  it('renders the run catalog into the prompt instead of a fresh sort', async () => {
    const { ctx } = createMockContext({
      vaultFiles: {
        [NOTE_PATH]: '# Note\nContent.',
        'wiki/concepts/Alpha.md': '# Alpha',
        'wiki/entities/Zeta.md': '# Zeta',
      },
      llmResponses: [RESPONSE],
    });
    const spy = vi.spyOn(ctx.getClient()!, 'createMessage');
    // A catalog whose base was frozen in an order a fresh sort would not produce.
    const catalog = { base: ['entities/Zeta', 'concepts/Alpha'], appended: [] };

    const analyzer = new SourceAnalyzer(ctx);
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
    await analyzer.analyzeSource(createMockFile(NOTE_PATH) as unknown as TFile, { slugCatalog: catalog });

    const prompt = spy.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('entities/Zeta\nconcepts/Alpha');
  });

  it('falls back to the sorted list when no catalog is passed', async () => {
    const { ctx } = createMockContext({
      vaultFiles: {
        [NOTE_PATH]: '# Note\nContent.',
        'wiki/concepts/Alpha.md': '# Alpha',
        'wiki/entities/Zeta.md': '# Zeta',
      },
      llmResponses: [RESPONSE],
    });
    const spy = vi.spyOn(ctx.getClient()!, 'createMessage');

    const analyzer = new SourceAnalyzer(ctx);
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
    await analyzer.analyzeSource(createMockFile(NOTE_PATH) as unknown as TFile);

    const prompt = spy.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('concepts/Alpha\nentities/Zeta');
  });
});
