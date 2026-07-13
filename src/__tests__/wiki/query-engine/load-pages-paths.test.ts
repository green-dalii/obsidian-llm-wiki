import { describe, it, expect, vi } from 'vitest';
import {
  loadRelevantPagesForQuery,
  type PageReader,
} from '../../../wiki/query-engine/pipeline/load-pages';

/**
 * v1.24.1 PATCH Phase 5.5.0 hotfix — defense against `.md` double-suffix.
 *
 * Root cause (e2e 2026-07-13): `load-pages.ts:48` blindly appended `.md`
 * to every title, but upstream sources may already include `.md` in the
 * path (e.g. wiki index `get-existing-pages.ts:44` stores `f.path` which
 * is the full vault path WITH extension). This produced paths like
 * `wiki/entities/DeepSeek3B-MoE.md.md` and `tryReadFile` failed to
 * resolve them.
 *
 * Fix: read `tryReadFile` mock to capture EXACTLY what pagePath the
 * loader requested, then assert the loader is robust to BOTH shapes
 * (with or without `.md` suffix on input).
 *
 * Why no relative-path-magic: the loader already strips the wiki
 * folder prefix (`wikiFolder + '/'`). What we test is the `.md` suffix
 * ADDITION on top of that normalization.
 *
 * Backward-compat: red test → green → no change to loader's caller
 * contract. Tests run for arbitrary `wikiFolder` values (not hard-coded).
 */

function makeReader(answers: Record<string, string>): {
  tryReadFile: (path: string) => Promise<string | null>;
  attemptedPaths: string[];
} {
  const attemptedPaths: string[] = [];
  return {
    tryReadFile: vi.fn(async (path: string) => {
      attemptedPaths.push(path);
      // Default: return non-null stub so the loader proceeds past the skip.
      return answers[path] ?? `# ${path}\n\nstub body`;
    }),
    attemptedPaths,
  };
}

describe('loadRelevantPagesForQuery — .md suffix defense (Phase 5.5.0 hotfix)', () => {
  it('appends .md only when title does not already end in .md', async () => {
    const reader = makeReader({});
    const titles = ['entities/Foo']; // ← no .md in input

    await loadRelevantPagesForQuery(titles, 'wiki', reader, null);

    expect(reader.attemptedPaths).toEqual(['wiki/entities/Foo.md']);
  });

  it('does NOT double-append .md when title already ends in .md (wiki-index shape)', async () => {
    const reader = makeReader({});
    const titles = ['entities/Foo.md']; // ← .md already present (e2e bug shape)

    await loadRelevantPagesForQuery(titles, 'wiki', reader, null);

    expect(reader.attemptedPaths).toEqual(['wiki/entities/Foo.md']);
  });

  it('does NOT double-append .md when title has wiki/ prefix and ends in .md', async () => {
    const reader = makeReader({});
    const titles = ['wiki/entities/Foo.md'];

    await loadRelevantPagesForQuery(titles, 'wiki', reader, null);

    expect(reader.attemptedPaths).toEqual(['wiki/entities/Foo.md']);
  });

  it('handles a non-`wiki` wikiFolder value (e.g. `notes`) without double-suffix', async () => {
    // Anti-pattern guard: per user round-3 feedback, the wiki folder name
    // is user-configurable. The hard-coding of `wiki/` would break any
    // user who picked a different folder. This test asserts the loader
    // uses the caller-supplied wiki folder for prefix-stripping AND
    // for the page-path prefix.
    const reader = makeReader({});
    const titles = ['Foo.md']; // <- no folder prefix, .md suffix present

    await loadRelevantPagesForQuery(titles, 'notes', reader, null);

    expect(reader.attemptedPaths).toEqual(['notes/Foo.md']);
  });

  it('skips a page when tryReadFile returns null AND emits a console.warn (no double .md)', async () => {
    // Anti-regression: the loadable behavior on miss must not regress
    // when title has .md suffix. Loader should call reader.tryReadFile
    // exactly ONCE per title (no double .md retries).
    const attempted: string[] = [];
    const reader: PageReader = {
      tryReadFile: vi.fn(async (path: string) => {
        attempted.push(path);
        return null; // always miss
      }),
    };
    const titles = ['sources/MissingPage.md']; // <- file does not exist

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const pages = await loadRelevantPagesForQuery(
        titles,
        'wiki',
        reader,
        null,
      );

      expect(pages).toEqual([]);
      expect(attempted).toEqual(['wiki/sources/MissingPage.md']);
      expect(warnSpy).toHaveBeenCalledWith(
        '[Load Page] Cannot read page: wiki/sources/MissingPage.md',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('processes a mix of title shapes in one batch (no double-suffix on any)', async () => {
    const reader = makeReader({});
    const titles = [
      'entities/Has.md',          // has .md
      'sources/NoMd',            // no .md
      'wiki/concepts/Stripped.md', // has wiki/ prefix + .md
    ];

    await loadRelevantPagesForQuery(titles, 'wiki', reader, null);

    expect(reader.attemptedPaths).toEqual([
      'wiki/entities/Has.md',
      'wiki/sources/NoMd.md',
      'wiki/concepts/Stripped.md',
    ]);
  });

  it('preserves deep paths (entities/sub/dir/page) without mishandling .md', async () => {
    // Sanity for path-segment detection: Tier B logic at line 58-63
    // splits on '/' to determine entities vs concepts vs sources. A
    // double-suffix would corrupt pathSegment[0] for the .md-yes case.
    const reader = makeReader({});
    const titles = ['entities/sub/dir/page.md'];

    await loadRelevantPagesForQuery(titles, 'wiki', reader, null);

    expect(reader.attemptedPaths).toEqual(['wiki/entities/sub/dir/page.md']);
  });
});
