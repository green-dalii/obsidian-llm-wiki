// ppr-cascade.ts — v1.23.0 Graph Engine hybrid cascade
//
// Pure function. Per #198 / 2026-06-24 Q3 consensus (cold-start
// cascade), the query-time retrieval uses a 3-arm cascade that picks
// the right retrieval strategy based on graph maturity:
//
//   1. lex — when graph is below threshold or seed is isolated.
//   2. lex-seeded-ppr — when graph has neighbors but is below the
//      graph-first density threshold.
//   3. graph-first-ppr — when graph is mature (edges/nodes >= threshold
//      AND largest weak component > 50% of nodes).
//
// Each arm is annotated in the returned PageMatch.arm field, so the
// UI can show the user "Powered by graph-first PPR" or "Lex fallback
// (graph too sparse)" — making the cascade transparent.
//
// The cascade is a pure function. The graph is passed in by the caller
// (query-engine caches the graph and rebuilds it on ingest). This
// keeps the cascade testable without an Obsidian dependency.

import { personalizedPageRank, type Graph, type PPROptions } from './monte-carlo-ppr';

export type { Graph, PPROptions };

export interface PageRef {
  path: string;
  title: string;
  aliases: string[];
}

export interface PageMatch {
  page: PageRef;
  score: number;
  arm: 'lex' | 'lex-seeded-ppr' | 'graph-first-ppr';
}

export interface PPRCascadeOptions {
  graph?: Graph;
  minPages?: number;
  minEdges?: number;
  minEdgeDensity?: number;
  seedMinDegree?: number;
  topN?: number;
  pprOptions?: PPROptions;
  /** Optional RNG (mulberry32 helper) for deterministic PPR sampling. */
  rng?: () => number;
}

const DEFAULT_MIN_PAGES = 30;
const DEFAULT_MIN_EDGES = 30;
const DEFAULT_MIN_EDGE_DENSITY = 1.0;
const DEFAULT_SEED_MIN_DEGREE = 1;
const DEFAULT_TOP_N = 10;

/**
 * Lex-only match: scores pages by query keyword overlap with title +
 * aliases. Returns scored-and-sorted matches.
 */
function lexMatch(query: string, pages: PageRef[]): PageRef[] {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) return [];
  const scored: { page: PageRef; score: number }[] = [];
  for (const page of pages) {
    let score = 0;
    const titleLower = page.title.toLowerCase();
    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 3;
      for (const alias of page.aliases) {
        if (alias.toLowerCase().includes(kw)) score += 2;
      }
    }
    if (score > 0) scored.push({ page, score });
  }
  return scored.sort((a, b) => b.score - a.score).map(s => s.page);
}

/**
 * Quick graph-maturity probe: returns true if the graph qualifies for
 * the graph-first PPR arm (per @GioiaZheng's consensus thresholds).
 */
function isGraphMature(graph: Graph, options: PPRCascadeOptions): boolean {
  const minPages = options.minPages ?? DEFAULT_MIN_PAGES;
  const minEdges = options.minEdges ?? DEFAULT_MIN_EDGES;
  const minEdgeDensity = options.minEdgeDensity ?? DEFAULT_MIN_EDGE_DENSITY;
  if (graph.nodes.length < minPages) return false;
  // Count edges (sum of out-degrees).
  let edgeCount = 0;
  for (const targets of graph.edges.values()) edgeCount += targets.length;
  if (edgeCount < minEdges) return false;
  // Edge density: edges/nodes ratio.
  if (edgeCount / graph.nodes.length < minEdgeDensity) return false;
  // Largest weak component: BFS from any node, count reachable.
  // (We do a single BFS from the first node; if it reaches > 50%
  // of nodes, the graph is connected-enough.)
  if (graph.nodes.length === 0) return false;
  const firstNode = graph.nodes[0];
  const visited = new Set<string>([firstNode]);
  const queue: string[] = [firstNode];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const next of graph.edges.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
    // Reverse edges: also follow incoming edges (treat as undirected
    // for connectivity).
    for (const [from, targets] of graph.edges) {
      if (targets.includes(node) && !visited.has(from)) {
        visited.add(from);
        queue.push(from);
      }
    }
  }
  return visited.size / graph.nodes.length > 0.5;
}

/**
 * Build a path → PPR score map by running PPR for each seed and
 * merging (max score per node).
 */
function pprFromSeeds(
  graph: Graph,
  seeds: string[],
  pprOptions: PPROptions | undefined,
  rng: (() => number) | undefined,
): Map<string, number> {
  const merged = new Map<string, number>();
  for (const seed of seeds) {
    if (!graph.nodes.includes(seed)) continue;
    const result = personalizedPageRank(graph, seed, { ...(pprOptions ?? {}), ...(rng ? { rng } : {}) });
    for (const [node, score] of result) {
      const existing = merged.get(node) ?? 0;
      if (score > existing) merged.set(node, score);
    }
  }
  return merged;
}

export function pprCascade(
  query: string,
  pages: PageRef[],
  options: PPRCascadeOptions = {},
): PageMatch[] {
  const topN = options.topN ?? DEFAULT_TOP_N;
  const lex = lexMatch(query, pages);
  const graph = options.graph;

  // Arm 1: pure lex if no graph or graph not mature.
  if (!graph || !isGraphMature(graph, options)) {
    // For the sparse arm, we still try lex-seeded PPR if seeds are
    // available and have neighbors.
    if (graph && lex.length > 0) {
      const seedMinDegree = options.seedMinDegree ?? DEFAULT_SEED_MIN_DEGREE;
      const seedPaths = lex.slice(0, 3).map(p => p.path);
      const validSeeds = seedPaths.filter(s => (graph.edges.get(s)?.length ?? 0) >= seedMinDegree);
      if (validSeeds.length > 0) {
        const pprScores = pprFromSeeds(graph, validSeeds, options.pprOptions, options.rng);
        return mergeWithPPR(lex, pprScores, pages, topN, 'lex-seeded-ppr');
      }
    }
    return lex.slice(0, topN).map(page => ({ page, score: lexScoreOf(page, lex), arm: 'lex' }));
  }

  // Arm 3: graph-first PPR. We use a generic seed (the first page or
  // the query's first keyword) — the graph structure itself does the
  // work of bringing relevant pages to the top.
  const seed = pages.length > 0 ? pages[0].path : null;
  if (!seed) return [];
  const pprScores = pprFromSeeds(graph, [seed], options.pprOptions, options.rng);
  return mergeWithPPR(lex, pprScores, pages, topN, 'graph-first-ppr');
}

function lexScoreOf(page: PageRef, ranked: PageRef[]): number {
  // Placeholder score: highest-ranked = 1.0, descending by rank.
  const idx = ranked.indexOf(page);
  if (idx === -1) return 0;
  return Math.max(1, ranked.length - idx) / ranked.length;
}

function mergeWithPPR(
  lex: PageRef[],
  pprScores: Map<string, number>,
  pages: PageRef[],
  topN: number,
  arm: 'lex-seeded-ppr' | 'graph-first-ppr',
): PageMatch[] {
  // Build a path → PageRef index for O(1) lookup.
  const byPath = new Map<string, PageRef>();
  for (const p of pages) byPath.set(p.path, p);

  // Merge: each page gets a composite score = max(lexScore, pprScore).
  // PPR is the dominant signal (ranker); lex is the fallback hint.
  const merged = new Map<string, { page: PageRef; score: number; arm: PageMatch['arm'] }>();

  for (const page of lex) {
    const ppr = pprScores.get(page.path) ?? 0;
    const score = Math.max(lexScoreOf(page, lex), ppr);
    merged.set(page.path, { page, score, arm });
  }
  for (const [path, ppr] of pprScores) {
    if (merged.has(path)) continue;
    const page = byPath.get(path);
    if (!page) continue;
    merged.set(path, { page, score: ppr, arm });
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(({ page, score }) => ({ page, score, arm }));
}