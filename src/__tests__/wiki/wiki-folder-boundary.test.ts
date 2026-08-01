// Issue #383 — regression tests for the unanchored `wikiFolder` prefix checks.
//
// `path.startsWith(wikiFolder)` is a string test, not a containment test. With
// `wikiFolder: "wiki"` two kinds of foreign path pass it:
//
//   * a sibling folder sharing the name prefix — "wiki-archive/note.md"
//   * a file sitting beside the folder          — "wiki.md"
//
// The call sites leak in both directions, so every case below is asserted
// twice, once per leak shape:
//
//   * INCLUDING too much — lint, startup fixes and the page listing treat
//     foreign notes as wiki pages (deleteEmptyStubs then deletes them).
//   * EXCLUDING too much — the ingest pickers subtract those same foreign
//     notes from the candidate set, so the user cannot select their own files.
//
// The helper itself (`isInFolderScope`) is covered in
// `__tests__/core/folder-scope.test.ts`; these tests pin the CALL SITES, which
// is where the bug lived.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TFile, TFolder } from 'obsidian'; // mocked in __support__/setup.ts

import { deleteEmptyStubs } from '../../wiki/lint/delete-empty-stubs';
import { getExistingWikiPages } from '../../wiki/lint/get-existing-pages';
import { runPreparationPhase } from '../../wiki/lint/phases/preparation';
import { FileSuggestModal, FolderSuggestModal } from '../../ui/modals/suggest-modals';
import { AutoMaintainManager } from '../../schema/auto-maintain';
import { createMockContext } from '../__support__/engine-context';
import type { LintPhaseContext } from '../../wiki/lint/types';
import type { LLMWikiSettings } from '../../types';
import type { WikiEngine } from '../../wiki/wiki-engine';

const WIKI = 'wiki';

/** A real wiki page — the control. Every fix must keep this one in scope. */
const REAL_PAGE = 'wiki/entities/Real.md';
/** Leak 1: sibling folder sharing the name prefix. */
const SIBLING_FOLDER_FILE = 'wiki-archive/Old.md';
/** Leak 2: a file sitting beside the folder. */
const NEIGHBOUR_FILE = 'wiki.md';

/** Short enough to count as an empty stub (< MIN_SUBSTANTIVE_CHARS). */
const EMPTY_STUB = '---\ntitle: X\n---\n\nTBD\n';

/** A `sources:` entry with the `.md` extension — what Phase 2 normalizes. */
const POLLUTED = '---\nsources:\n  - "[[sources/Foo.md]]"\n---\n\nBody text.\n';

describe('#383 — deleteEmptyStubs stays inside the wiki folder', () => {
  async function runWith(files: Record<string, string>): Promise<string[]> {
    const { ctx } = createMockContext({ vaultFiles: files });
    const deleted: string[] = [];
    ctx.deleteFile = async (path: string) => { deleted.push(path); };
    await deleteEmptyStubs(ctx, WIKI);
    return deleted;
  }

  it('still deletes an empty stub inside the wiki folder', async () => {
    expect(await runWith({ [REAL_PAGE]: EMPTY_STUB })).toEqual([REAL_PAGE]);
  });

  // The sharpest case in the issue: this path is unanchored AND deleting.
  it('does not delete an empty note in a sibling folder', async () => {
    const deleted = await runWith({
      [REAL_PAGE]: EMPTY_STUB,
      [SIBLING_FOLDER_FILE]: EMPTY_STUB,
    });
    expect(deleted).not.toContain(SIBLING_FOLDER_FILE);
    expect(deleted).toEqual([REAL_PAGE]);
  });

  it('does not delete an empty note sitting beside the wiki folder', async () => {
    const deleted = await runWith({
      [REAL_PAGE]: EMPTY_STUB,
      [NEIGHBOUR_FILE]: EMPTY_STUB,
    });
    expect(deleted).not.toContain(NEIGHBOUR_FILE);
    expect(deleted).toEqual([REAL_PAGE]);
  });
});

describe('#383 — getExistingWikiPages stays inside the wiki folder', () => {
  it('reports the wiki page and neither foreign note', async () => {
    const { ctx } = createMockContext({
      vaultFiles: {
        [REAL_PAGE]: '# Real\n\nBody',
        [SIBLING_FOLDER_FILE]: '# Old\n\nBody',
        [NEIGHBOUR_FILE]: '# Neighbour\n\nBody',
      },
    });

    const pages = await getExistingWikiPages(ctx.app, WIKI);
    const paths = pages.map(p => p.path);

    expect(paths).toEqual([REAL_PAGE]);
    expect(paths).not.toContain(SIBLING_FOLDER_FILE);
    expect(paths).not.toContain(NEIGHBOUR_FILE);
  });
});

describe('#383 — the lint preparation phase stays inside the wiki folder', () => {
  function makeContext(files: Record<string, string>): LintPhaseContext {
    const tfiles = Object.keys(files).map(path => ({
      path,
      basename: path.split('/').pop()?.replace('.md', '') || '',
    }));
    return {
      app: {
        vault: {
          getMarkdownFiles: () => tfiles,
          read: async (file: { path: string }) => files[file.path] ?? '',
          getAbstractFileByPath: () => null,
          process: async (file: { path: string }, fn: (data: string) => string) => {
            files[file.path] = fn(files[file.path] ?? '');
            return files[file.path];
          },
        },
      } as unknown as LintPhaseContext['app'],
      settings: { wikiFolder: WIKI, language: 'en', slugCase: 'lower' } as LLMWikiSettings,
      llmClient: () => null,
      wikiEngine: { updateStatusBar: () => {} } as unknown as LintPhaseContext['wikiEngine'],
      checkCancelled: () => {},
      stageNotice: null,
      totalPages: 0,
      buildSystemPrompt: async () => undefined,
    };
  }

  it('collects the wiki page and neither foreign note', async () => {
    const ctx = makeContext({
      [REAL_PAGE]: '# Real\n\nBody',
      [SIBLING_FOLDER_FILE]: '# Old\n\nBody',
      [NEIGHBOUR_FILE]: '# Neighbour\n\nBody',
    });

    const result = await runPreparationPhase(ctx);
    const paths = result.wikiFiles.map(f => f.path);

    expect(paths).toEqual([REAL_PAGE]);
  });
});

describe('#383 — startup quick fixes (Phase 2) only rewrite wiki files', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('normalizes sources in the wiki page and writes to neither foreign note', async () => {
    const files: Record<string, string> = {
      [REAL_PAGE]: POLLUTED,
      [SIBLING_FOLDER_FILE]: POLLUTED,
      [NEIGHBOUR_FILE]: POLLUTED,
    };
    const written: string[] = [];

    const app = {
      vault: {
        getMarkdownFiles: () => Object.keys(files).map(path => ({
          path,
          basename: path.split('/').pop()?.replace('.md', '') || '',
          stat: { size: files[path].length, mtime: 1 },
        })),
        read: async (file: { path: string }) => files[file.path] ?? '',
        process: async (file: { path: string }, fn: (data: string) => string) => {
          written.push(file.path);
          files[file.path] = fn(files[file.path] ?? '');
          return files[file.path];
        },
        // Phase 1 only reports on the folder structure; present is enough.
        getAbstractFileByPath: (path: string) => ({ path }),
      },
    };

    const settings = {
      wikiFolder: WIKI,
      language: 'en',
      slugCase: 'lower',
      startupCheckNoticeLevel: 'silent',
    } as unknown as LLMWikiSettings;

    const wikiEngine = {
      getExistingWikiPages: async () => [],
      tryReadFile: async () => null,
      createOrUpdateFile: async () => {},
    } as unknown as WikiEngine;

    const mgr = new AutoMaintainManager(
      app as unknown as ConstructorParameters<typeof AutoMaintainManager>[0],
      settings,
      wikiEngine,
      { llmClient: null } as unknown as ConstructorParameters<typeof AutoMaintainManager>[3],
    );

    const run = mgr.runStartupCheck();
    await vi.advanceTimersByTimeAsync(3000);
    await run;

    // The wiki page was polluted, so it was rewritten...
    expect(written).toContain(REAL_PAGE);
    // ...and the two foreign notes were left alone, equally polluted or not.
    expect(written).not.toContain(SIBLING_FOLDER_FILE);
    expect(written).not.toContain(NEIGHBOUR_FILE);
    expect(files[SIBLING_FOLDER_FILE]).toBe(POLLUTED);
    expect(files[NEIGHBOUR_FILE]).toBe(POLLUTED);
  });
});

// The pickers subtract the wiki folder from the vault, so here the SAME
// unanchored prefix takes the user's own notes away instead of swallowing
// them — the second leak direction.
describe('#383 — the source picker offers the user their own notes', () => {
  function fileEntry(path: string) {
    return Object.assign(new TFile(), {
      path,
      basename: path.split('/').pop()?.replace('.md', '') || '',
      extension: 'md',
    });
  }

  function makeApp(paths: string[]) {
    return {
      vault: {
        configDir: '.obsidian',
        getFiles: () => paths.map(fileEntry),
      },
    };
  }

  it('keeps wiki pages out but leaves both foreign notes selectable', () => {
    const app = makeApp([REAL_PAGE, SIBLING_FOLDER_FILE, NEIGHBOUR_FILE, '.obsidian/plugins/x.md']);
    const modal = new FileSuggestModal(
      app as unknown as ConstructorParameters<typeof FileSuggestModal>[0],
      WIKI,
      () => {},
    );

    const offered = modal.getItems().map(f => f.path);

    expect(offered).toContain(SIBLING_FOLDER_FILE);
    expect(offered).toContain(NEIGHBOUR_FILE);
    expect(offered).not.toContain(REAL_PAGE);
    expect(offered).not.toContain('.obsidian/plugins/x.md');
  });
});

// NOTE — MultiFileSuggestModal's candidate filter (the two-pane picker) is the
// one call site without a test here. Its filter line is character-identical to
// FileSuggestModal.getItems above, but it lives inside `onOpen()`, which builds
// the modal DOM; driving it needs the jsdom environment, and under jsdom the
// `obsidian` module does not resolve (`server.deps.inline` only covers the node
// environment). Rewiring the test setup for that is out of scope for a fix on
// this deadline.

describe('#383 — the folder picker offers sibling folders, not the wiki folder', () => {
  function folderEntry(path: string, children: TFolder[] = []): TFolder {
    return Object.assign(new TFolder(), {
      path,
      name: path.split('/').pop() || path,
      children,
    });
  }

  it('offers the sibling folder while still hiding the wiki folder and its children', () => {
    const wikiEntities = folderEntry('wiki/entities');
    const wikiFolder = folderEntry('wiki', [wikiEntities]);
    const archive = folderEntry('wiki-archive');
    const root = folderEntry('/', [wikiFolder, archive]);

    const app = {
      vault: {
        configDir: '.obsidian',
        getRoot: () => root,
      },
    };

    const modal = new FolderSuggestModal(
      app as unknown as ConstructorParameters<typeof FolderSuggestModal>[0],
      WIKI,
      () => {},
    );

    const offered = modal.getItems().map(f => f.path);

    expect(offered).toContain('wiki-archive');
    // The folder itself is not a descendant of itself — without the explicit
    // identity check, anchoring would have put it back into the picker.
    expect(offered).not.toContain('wiki');
    expect(offered).not.toContain('wiki/entities');
  });
});
