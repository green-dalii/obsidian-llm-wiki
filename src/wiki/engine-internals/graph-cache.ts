/**
 * GraphCache — PPR (Personalized PageRank) graph cache for the query engine.
 *
 * Extracted from WikiEngine (2026-07-19) as part of v1.25.1 Phase C-PR1.
 *
 * Responsibility:
 *   - Build the PPR graph lazily from current vault content
 *   - Cache the graph across query invocations, keyed by the requested path set
 *   - Invalidate when the vault changes (called from WikiEngine.invalidatePageCaches)
 *
 * Non-responsibility:
 *   - Building the graph content itself lives in core/build-graph.ts (the actual
 *     wiki-link extraction logic). This class is purely a cache + lifecycle owner.
 *   - Invalidation is a SINGLE explicit API (invalidate) called from the owner.
 *     Pages-cache and ingested-hashes-cache invalidate via the same call, so we
 *     share the lifecycle hook with WikiEngine.invalidatePageCaches.
 *
 * Why extracted:
 *   - The graph cache state + invalidation + the allPaths-keyed identity check
 *     were inlined in WikiEngine (~60 LOC across invalidateGraph / getOrBuildGraph
 *     and 2 fields + setsEqual helper). Centralizing makes the lifecycle obvious.
 *   - v1.26.0 Lint Perf work may need graph caching too — having a single owner
 *     class means the next consumer composes rather than copy-pastes.
 */

import { buildGraphFromContent, type Graph } from '../../core/build-graph';

/** True iff two sets contain exactly the same strings (order-independent). */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

/**
 * Loader signature: WikiEngine resolves the path-keyed reads (full vault paths,
 * NFC normalization, etc.) and returns `{ path, content }` pairs. The cache
 * builds the graph from those.
 */
export type GraphPageLoader = (allPaths: Set<string>) => Promise<Array<{ path: string; content: string }>>;

export interface GraphCacheOptions {
  /** Wiki folder name (e.g. "wiki") — used to normalize relative paths in `allPaths`. */
  wikiFolder: string;
  /**
   * Async loader that converts a wiki-index path set into `path → content` pairs.
   * The cache calls this on miss; on hit, returns the cached graph immediately.
   */
  loadPages: GraphPageLoader;
}

export class GraphCache {
  private readonly wikiFolder: string;
  private readonly loadPages: GraphPageLoader;

  private _cachedGraph: Graph | null = null;
  private _cachedGraphAllPaths: Set<string> | null = null;

  constructor(opts: GraphCacheOptions) {
    this.wikiFolder = opts.wikiFolder;
    this.loadPages = opts.loadPages;
  }

  /**
   * Return the cached graph for `allPaths`, or rebuild it.
   *
   * v1.24.0 Bug A: cache identity is path-set equality, not pointer equality.
   * A new Set instance with the same elements MUST hit cache — that's how the
   * PPR cascade avoids a full graph rebuild on every query.
   */
  async getOrBuild(allPaths: Set<string>): Promise<Graph> {
    const pathsChanged = this._cachedGraphAllPaths === null
      || !setsEqual(this._cachedGraphAllPaths, allPaths);
    if (this._cachedGraph !== null && !pathsChanged) {
      console.debug('[GraphCache] hit:', this._cachedGraph.nodes.length, 'nodes');
      return this._cachedGraph;
    }

    console.debug('[GraphCache] miss — building', allPaths.size, 'nodes');
    const loadedPages = await this.loadPages(allPaths);
    const graph = buildGraphFromContent(loadedPages, allPaths, this.wikiFolder);
    this._cachedGraph = graph;
    this._cachedGraphAllPaths = new Set(allPaths);
    return graph;
  }

  /**
   * Drop the cached graph. Idempotent; safe to call multiple times.
   * Called from WikiEngine.invalidatePageCaches on every vault write/delete.
   */
  invalidate(): void {
    this._cachedGraph = null;
    this._cachedGraphAllPaths = null;
    console.debug('[GraphCache] invalidated');
  }

  /** True iff a graph is currently cached (for diagnostics / tests). */
  hasCachedGraph(): boolean {
    return this._cachedGraph !== null;
  }
}