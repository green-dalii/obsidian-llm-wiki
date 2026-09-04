// Stage 3 Bug A — Graph warmup: WikiEngine-level graph cache.
//
// Root cause: QueryView kept a per-view graph that was built AFTER the first
// PPR cascade, so the first query always fell back to the lex-only arm even
// when a vault-wide graph would have enabled PPR. The fix moves the graph
// to WikiEngine with a shared, lazily-built cache that is available on the
// first query, plus invalidation hooks so ingest/delete/update keep it fresh.

import { describe, it, expect, beforeEach } from 'vitest';
import { createWikiEngineHarness } from '../__support__/wiki-engine-harness';

describe('WikiEngine graph cache — Bug A warmup', () => {
  let harness: ReturnType<typeof createWikiEngineHarness>;

  beforeEach(() => {
    harness = createWikiEngineHarness({
      files: {
        'wiki/entities/a.md': '---\ntype: entity\n---\n# A\nLink to [[wiki/entities/b|B]].',
        'wiki/entities/b.md': '---\ntype: entity\n---\n# B\nLink to [[wiki/entities/c|C]].',
        'wiki/entities/c.md': '---\ntype: entity\n---\n# C\nNo links here.',
      },
      settings: { wikiFolder: 'wiki' },
    });
  });

  it('has a getOrBuildGraph method that returns a Graph', async () => {
    const engine = harness.engine;
    const allPaths = new Set([
      'wiki/entities/a.md',
      'wiki/entities/b.md',
      'wiki/entities/c.md',
    ]);

    const graph = await engine.getOrBuildGraph(allPaths);

    expect(graph).toBeDefined();
    expect(graph.nodes).toContain('wiki/entities/a.md');
    expect(graph.nodes).toContain('wiki/entities/b.md');
    expect(graph.nodes).toContain('wiki/entities/c.md');
  });

  it('returns the same cached instance on repeated calls', async () => {
    const engine = harness.engine;
    const allPaths = new Set([
      'wiki/entities/a.md',
      'wiki/entities/b.md',
      'wiki/entities/c.md',
    ]);

    const first = await engine.getOrBuildGraph(allPaths);
    const second = await engine.getOrBuildGraph(allPaths);

    expect(first).toBe(second);
  });

  it('rebuilds graph after invalidateGraph()', async () => {
    const engine = harness.engine;
    const allPaths = new Set([
      'wiki/entities/a.md',
      'wiki/entities/b.md',
      'wiki/entities/c.md',
    ]);

    const first = await engine.getOrBuildGraph(allPaths);
    engine.invalidateGraph();
    const second = await engine.getOrBuildGraph(allPaths);

    expect(second).not.toBe(first);
    expect(second.nodes).toHaveLength(first.nodes.length);
  });

  it('invalidates graph cache when invalidatePageCaches is called', async () => {
    const engine = harness.engine;
    const allPaths = new Set([
      'wiki/entities/a.md',
      'wiki/entities/b.md',
      'wiki/entities/c.md',
    ]);

    const first = await engine.getOrBuildGraph(allPaths);

    // invalidatePageCaches is private; verify it drops the graph cache by
    // reaching into the engine directly (white-box) and calling the internal
    // helper that every vault write/delete triggers.
    const engineInternal = engine as unknown as {
      invalidatePageCaches: () => void;
    };

    engineInternal.invalidatePageCaches();

    const second = await engine.getOrBuildGraph(allPaths);
    expect(second).not.toBe(first);
    expect(second.nodes).toHaveLength(first.nodes.length);
  });

  it('rebuilds graph when allPaths set changes', async () => {
    const engine = harness.engine;
    const pathsV1 = new Set(['wiki/entities/a.md', 'wiki/entities/b.md']);
    const pathsV2 = new Set([
      'wiki/entities/a.md',
      'wiki/entities/b.md',
      'wiki/entities/c.md',
    ]);

    const first = await engine.getOrBuildGraph(pathsV1);
    const second = await engine.getOrBuildGraph(pathsV2);

    expect(second).not.toBe(first);
    expect(second.nodes).toHaveLength(3);
  });
});
