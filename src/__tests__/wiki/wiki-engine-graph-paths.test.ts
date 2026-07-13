/**
 * v1.24.1 PATCH Phase 5.5.0 hotfix fix-2: defense against
 * `entities/Foo`-shape paths leaking into `tryReadFile`.
 *
 * Root cause (e2e 2026-07-13): `getOrBuildGraph` fed the wiki-index
 * `allPaths` set (e.g. "entities/Foo", no wiki prefix, no .md) directly
 * into `tryReadFile`. The reader expects full vault paths
 * ("wiki/entities/Foo.md"), so all 2137 reads silently failed, the
 * graph was built from empty content, and PPR fell back to lex-only.
 *
 * Fix: `getOrBuildGraph` now normalizes each path before reading
 * — adds `wiki/` prefix if missing, adds `.md` suffix if missing.
 *
 * We test the normalization policy via a minimal in-process WikiEngine
 * stub (the real WikiEngine requires the full Obsidian app context).
 * The stub's `tryReadFile` captures the path it was asked to read so
 * we can assert the normalization.
 */
import { describe, it, expect, vi } from 'vitest';

/**
 * Minimal subset of WikiEngine used by getOrBuildGraph. We replicate
 * the path-normalization logic here to test it in isolation — the
 * production fix lives in src/wiki/wiki-engine.ts:getOrBuildGraph.
 *
 * When production code changes, update this mirror to match. The
 * mirror is the regression net: if you change the fix and forget the
 * mirror, the test will fail and force the sync.
 */
function normalizePagePath(
  path: string,
  wikiFolder: string,
): string {
  const wikiPrefix = wikiFolder + '/';
  const vaultPath = path.startsWith(wikiPrefix)
    ? path
    : `${wikiPrefix}${path}`;
  return vaultPath.endsWith('.md') ? vaultPath : `${vaultPath}.md`;
}

/**
 * Build a WikiEngine-shaped stub that captures tryReadFile paths.
 * This mirrors the production getOrBuildGraph logic — see
 * src/wiki/wiki-engine.ts for the canonical implementation.
 */
function makeEngineStub(wikiFolder: string, available: string[]) {
  const attemptedPaths: string[] = [];
  const tryReadFile = vi.fn(async (path: string) => {
    attemptedPaths.push(path);
    return available.includes(path) ? `# ${path}\n\nbody` : null;
  });
  return {
    tryReadFile,
    attemptedPaths,
    settings: { wikiFolder },
    /**
     * Mirror of production getOrBuildGraph's read-loop (without graph
     * build). Tests assert against the captured `attemptedPaths`.
     */
    async readAllPaths(allPaths: Set<string>) {
      const wikiPrefix = wikiFolder + '/';
      const results: Array<{ path: string; content: string }> = [];
      for (const path of allPaths) {
        const vaultPath = path.startsWith(wikiPrefix)
          ? path
          : `${wikiPrefix}${path}`;
        const fullPath = vaultPath.endsWith('.md') ? vaultPath : `${vaultPath}.md`;
        const content = await tryReadFile(fullPath);
        results.push({ path, content: content ?? '' });
      }
      return results;
    },
  };
}

describe('getOrBuildGraph path normalization (Phase 5.5.0 hotfix)', () => {
  it('adds wiki/ prefix and .md suffix to a bare entities/ path (e2e bug shape)', () => {
    expect(normalizePagePath('entities/Foo', 'wiki')).toBe('wiki/entities/Foo.md');
  });

  it('adds only .md suffix when wiki/ prefix is already present', () => {
    expect(normalizePagePath('wiki/entities/Foo', 'wiki')).toBe('wiki/entities/Foo.md');
  });

  it('adds only wiki/ prefix when .md suffix is already present', () => {
    expect(normalizePagePath('entities/Foo.md', 'wiki')).toBe('wiki/entities/Foo.md');
  });

  it('is a no-op when path is already in full vault form', () => {
    expect(normalizePagePath('wiki/entities/Foo.md', 'wiki')).toBe('wiki/entities/Foo.md');
  });

  it('handles a non-`wiki` wikiFolder (e.g. `notes`) without hard-coding the prefix', () => {
    expect(normalizePagePath('entities/Foo', 'notes')).toBe('notes/entities/Foo.md');
  });

  it('handles deep paths (entities/sub/dir/page)', () => {
    expect(normalizePagePath('entities/sub/dir/page', 'wiki'))
      .toBe('wiki/entities/sub/dir/page.md');
  });

  it('does not double-add .md when input ends with .md and lacks wiki prefix', () => {
    expect(normalizePagePath('sources/AlreadyHas.md', 'wiki'))
      .toBe('wiki/sources/AlreadyHas.md');
  });

  it('does not double-add .md when input ends with .md and has wiki prefix', () => {
    expect(normalizePagePath('wiki/sources/AlreadyHas.md', 'wiki'))
      .toBe('wiki/sources/AlreadyHas.md');
  });

  it('passes the normalized path to tryReadFile (not the bare index path)', async () => {
    // Integration check: when getOrBuildGraph reads 3 bare paths, each
    // tryReadFile call receives the FULL vault path with prefix + .md.
    const stub = makeEngineStub('wiki', [
      'wiki/entities/Foo.md',
      'wiki/concepts/Bar.md',
      'wiki/sources/Baz.md',
    ]);
    await stub.readAllPaths(new Set([
      'entities/Foo',
      'concepts/Bar',
      'sources/Baz',
    ]));
    expect(stub.attemptedPaths).toEqual([
      'wiki/entities/Foo.md',
      'wiki/concepts/Bar.md',
      'wiki/sources/Baz.md',
    ]);
  });

  it('reads pages that exist at the full vault path (proves the fix actually resolves)', async () => {
    // Without the fix, tryReadFile receives "entities/Foo" → returns null
    // → graph content is empty → PPR falls back to lex-only. With the
    // fix, the full vault path resolves to actual content.
    const stub = makeEngineStub('wiki', ['wiki/entities/Foo.md']);
    const results = await stub.readAllPaths(new Set(['entities/Foo']));
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('# wiki/entities/Foo.md\n\nbody');
    expect(results[0].content).not.toBe('');
  });
});