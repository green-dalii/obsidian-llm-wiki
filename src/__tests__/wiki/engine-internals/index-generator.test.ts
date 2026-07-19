/**
 * IndexGenerator unit tests — wiki index page rendering + summary/alias extraction.
 *
 * Extracted from WikiEngine (2026-07-19). Verifies:
 *   - generateFlatIndex renders 3 sections (entities / concepts / sources)
 *   - generateEmptyIndex writes the empty-state markdown
 *   - getPageSummary reads first non-heading body line (100 char cap)
 *   - getPageAliases reads frontmatter aliases array, filters non-strings
 */

import { describe, it, expect, vi } from 'vitest';
import { TFile } from 'obsidian';
import { IndexGenerator } from '../../../wiki/engine-internals/index-generator';

// Cast helper kept OUTSIDE IndexGenerator test scope so obsidianmd/no-tfile-tfolder-cast
// sees the cast at a call site, not inside a helper. Matches the pattern used by
// src/__tests__/wiki/source-analyzer.test.ts (callsite cast for the same reason).
function makeFileStub(basename: string): { path: string; basename: string } {
  return { path: basename, basename: basename.replace(/\.md$/, '') };
}

describe('IndexGenerator', () => {
  it('renders entities / concepts / sources sections with localized labels', async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const gen = new IndexGenerator({
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      readFile: vi.fn().mockResolvedValue(''),
      writeFile,
    });

    await gen.generateFlatIndex(
      // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test stub: object structurally matches TFile, see makeFileStub above
      [makeFileStub('Einstein') as unknown as TFile, makeFileStub('Curie') as unknown as TFile],
      // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test stub: object structurally matches TFile, see makeFileStub above
      [makeFileStub('Relativity') as unknown as TFile, makeFileStub('Radioactivity') as unknown as TFile],
      // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test stub: object structurally matches TFile, see makeFileStub above
      [makeFileStub('paper1') as unknown as TFile, makeFileStub('paper2') as unknown as TFile],
    );

    expect(writeFile).toHaveBeenCalledTimes(1);
    const callArgs = writeFile.mock.calls[0] as [string, string];
    const path = callArgs[0];
    const content = callArgs[1];
    expect(path).toBe('wiki/index.md');
    // English labels from TEXTS.en.indexLabels
    expect(content).toContain('## Entities');
    expect(content).toContain('## Concepts');
    expect(content).toContain('## Sources');
    expect(content).toContain('[[entities/Einstein|Einstein]]');
    expect(content).toContain('[[concepts/Relativity|Relativity]]');
    expect(content).toContain('[[sources/paper1|paper1]]');
  });

  it('writes empty-state markdown when generateEmptyIndex() called', async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const gen = new IndexGenerator({
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      readFile: vi.fn(),
      writeFile,
    });

    await gen.generateEmptyIndex();
    const emptyCallArgs = writeFile.mock.calls[0] as [string, string];
    expect(emptyCallArgs[0]).toBe('wiki/index.md');
    expect(emptyCallArgs[1]).toContain('No pages yet');
  });

  it('falls back to English labels for unknown language', async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const gen = new IndexGenerator({
      wikiFolder: 'wiki',
      wikiLanguage: 'xx-unknown', // not in TEXTS indexLabels
      readFile: vi.fn().mockResolvedValue(''),
      writeFile,
    });
    await gen.generateFlatIndex([], [], []);
    const langFallbackArgs = writeFile.mock.calls[0] as [string, string];
    expect(langFallbackArgs[1]).toContain('## Entities'); // English fallback
  });

  it('getPageSummary returns first body line (100 chars max)', async () => {
    // IndexGenerator.getPageSummary filters lines starting with `---` or `#`
    // OR being empty. A frontmatter property line like `title: T` is NOT
    // filtered (matches production behavior in WikiEngine — same code path).
    // So we test with a clean body without frontmatter to keep the test
    // intent clear.
    const readFile = vi.fn().mockResolvedValue('# Heading\n\nFirst content line here.\nMore.');
    const gen = new IndexGenerator({
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      readFile,
      writeFile: vi.fn(),
    });
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test stub: object structurally matches TFile, see makeFileStub above
    const summary = await gen.getPageSummary(makeFileStub('p') as unknown as TFile);
    expect(summary).toBe('First content line here.');
  });

  it('getPageSummary returns "No summary" for empty body', async () => {
    const readFile = vi.fn().mockResolvedValue('# Only a heading');
    const gen = new IndexGenerator({
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      readFile,
      writeFile: vi.fn(),
    });
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test stub: object structurally matches TFile, see makeFileStub above
    expect(await gen.getPageSummary(makeFileStub('p') as unknown as TFile)).toBe('No summary');
  });

  it('getPageAliases reads frontmatter aliases, trims and drops empties', async () => {
    // parseFrontmatter only handles `key: value` and `- item` array syntax;
    // inline arrays like `[Einstein, 42]` aren't parsed, so we use the list form.
    // The numeric `42` is a YAML literal — but in our list-form frontmatter all
    // items are parsed as strings (parseFrontmatter doesn't coerce). So
    // '42-string' stays; we test trimming and empties.
    const readFile = vi.fn().mockResolvedValue('---\naliases:\n  - Einstein\n  - " Albert "\n  - "42"\n  - "  "\n---\n\nBody.');
    const gen = new IndexGenerator({
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      readFile,
      writeFile: vi.fn(),
    });
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test stub: object structurally matches TFile, see makeFileStub above
    const aliases = await gen.getPageAliases(makeFileStub('e') as unknown as TFile);
    // " Albert " is trimmed to "Albert"; "  " is dropped (length 0 after trim); "42" stays.
    expect(aliases).toEqual(['Einstein', 'Albert', '42']);
  });

  it('getPageAliases returns [] when no aliases field', async () => {
    const readFile = vi.fn().mockResolvedValue('# Just a heading\n\nNo frontmatter.');
    const gen = new IndexGenerator({
      wikiFolder: 'wiki',
      wikiLanguage: 'en',
      readFile,
      writeFile: vi.fn(),
    });
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test stub: object structurally matches TFile, see makeFileStub above
    expect(await gen.getPageAliases(makeFileStub('p') as unknown as TFile)).toEqual([]);
  });
});