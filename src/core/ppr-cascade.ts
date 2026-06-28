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
  /**
   * Optional text representation of the page — typically the summary
   * line from the wiki index. When provided, lexMatch uses this in
   * addition to title/aliases. The full text makes matching robust
   * across languages (e.g. CJK queries about English-topic pages still
   * match because the summary mentions the topic).
   */
  summary?: string;
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
  /**
   * Explicit seed list (typically from LLM semantic selection).
   * When provided AND non-empty, these seeds drive PPR walks instead of
   * the implicit lex top-3. Validated against graph.nodes; invalid seeds
   * (not in graph) are silently dropped.
   */
  seeds?: string[];
  /** Optional RNG (mulberry32 helper) for deterministic PPR sampling. */
  rng?: () => number;
}

const DEFAULT_MIN_PAGES = 30;
const DEFAULT_MIN_EDGES = 30;
const DEFAULT_MIN_EDGE_DENSITY = 1.0;
const DEFAULT_SEED_MIN_DEGREE = 1;
const DEFAULT_TOP_N = 10;

/**
 * Tokenize a query into individual searchable terms. Language-aware:
 *
 * - ASCII runs of length ≥ 3 are extracted (handles mixed-language queries
 *   like "什么是Obsidian？" → "obsidian")
 * - Whitespace-split tokens (length ≥ 2) are kept
 * - CJK characters are kept as single-char terms so a single CJK
 *   character can match a single CJK character in a title
 *
 * All tokens are lowercased and de-duplicated.
 */
export function tokenizeQuery(query: string): string[] {
  if (!query) return [];
  const tokens = new Set<string>();
  const queryLower = query.toLowerCase();

  const asciiRuns = queryLower.match(/[a-z0-9]{3,}/g);
  if (asciiRuns) for (const r of asciiRuns) tokens.add(r);

  for (const t of queryLower.split(/\s+/)) {
    if (t.length >= 2) tokens.add(t);
  }

  const cjk = query.match(/[一-鿿぀-ゟ゠-ヿ]/g);
  if (cjk) for (const c of cjk) tokens.add(c.toLowerCase());

  return [...tokens];
}

/**
 * Lex-only match: scores pages by per-token keyword overlap against the
 * page's full text representation (title + aliases + optional summary).
 *
 * Robust across languages because:
 * - The summary provides context the LLM also uses
 * - tokenizeQuery extracts ASCII runs from mixed-language queries
 *
 * Scoring per query token (first matching location wins):
 * - title match: 3
 * - alias match: 2
 * - summary match: 1
 *
 * Page-level bonus:
 * - all query tokens found in page text: +2 (strong relevance signal)
 */
function lexMatch(query: string, pages: PageRef[]): PageRef[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];
  const scored: { page: PageRef; score: number }[] = [];
  for (const page of pages) {
    const titleLower = page.title.toLowerCase();
    const aliasLowers = page.aliases.map(a => a.toLowerCase());
    const summaryLower = (page.summary ?? '').toLowerCase();

    let score = 0;
    let tokensFound = 0;
    for (const kw of tokens) {
      if (titleLower.includes(kw)) { score += 3; tokensFound++; }
      else if (aliasLowers.some(a => a.includes(kw))) { score += 2; tokensFound++; }
      else if (summaryLower.includes(kw)) { score += 1; tokensFound++; }
    }
    if (tokensFound === tokens.length && tokens.length > 1) score += 2;
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

/**
 * Filter user-provided seeds to those present in the graph. Returns an
 * empty array if no valid seeds (caller should fall back to other arms).
 */
function filterSeedsToGraph(seeds: string[], graph: Graph): string[] {
  const nodeSet = new Set(graph.nodes);
  return seeds.filter(s => nodeSet.has(s));
}

export function pprCascade(
  query: string,
  pages: PageRef[],
  options: PPRCascadeOptions = {},
): PageMatch[] {
  const topN = options.topN ?? DEFAULT_TOP_N;
  const lex = lexMatch(query, pages);
  const graph = options.graph;
  // Explicit seeds (from LLM) take precedence over implicit lex seeds.
  // Filter to graph nodes upfront — invalid seeds silently dropped.
  const explicitSeeds = options.seeds && graph
    ? filterSeedsToGraph(options.seeds, graph)
    : [];

  // Arm 1: pure lex if no graph or graph not mature.
  if (!graph || !isGraphMature(graph, options)) {
    // For the sparse arm, prefer explicit seeds if provided and they
    // have graph neighbors; otherwise fall back to lex-derived seeds.
    if (graph && explicitSeeds.length > 0) {
      const seedMinDegree = options.seedMinDegree ?? DEFAULT_SEED_MIN_DEGREE;
      const validSeeds = explicitSeeds.filter(s => (graph.edges.get(s)?.length ?? 0) >= seedMinDegree);
      if (validSeeds.length > 0) {
        const pprScores = pprFromSeeds(graph, validSeeds, options.pprOptions, options.rng);
        return mergeWithPPR(lex, pprScores, pages, topN, 'lex-seeded-ppr');
      }
    }
    if (graph && lex.length > 0) {
      const seedMinDegree = options.seedMinDegree ?? DEFAULT_SEED_MIN_DEGREE;
      const seedPaths = lex.slice(0, 3).map(p => p.path);
      const validSeeds = seedPaths.filter(s => (graph.edges.get(s)?.length ?? 0) >= seedMinDegree);
      if (validSeeds.length > 0) {
        const pprScores = pprFromSeeds(graph, validSeeds, options.pprOptions, options.rng);
        return mergeWithPPR(lex, pprScores, pages, topN, 'lex-seeded-ppr');
      }
    }
    // No usable graph seeds AND no lex matches → return what lex has,
    // or empty. (Degree-rank fallback removed: the LLM seeds path in
    // buildWikiContext now handles this case upstream.)
    return lex.slice(0, topN).map(page => ({ page, score: lexScoreOf(page, lex), arm: 'lex' }));
  }

  // Arm 3: graph-first PPR. Use explicit seeds if provided; otherwise
  // use the first page as a generic seed (the graph structure does the
  // work of bringing relevant pages to the top).
  let seedList: string[];
  if (explicitSeeds.length > 0) {
    seedList = explicitSeeds;
  } else if (pages.length > 0) {
    seedList = [pages[0].path];
  } else {
    return [];
  }
  const pprScores = pprFromSeeds(graph, seedList, options.pprOptions, options.rng);
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