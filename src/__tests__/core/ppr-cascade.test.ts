// Pure-function tests for ppr-cascade.ts
//
// Contract (from #198 / 2026-06-24 Q3 consensus):
//
//   pprCascade(query, pages, options?): PageMatch[]
//   PageMatch = { page: PageRef; score: number; arm: 'lex' | 'lex-seeded-ppr' | 'graph-first-ppr' }
//
//   options:
//     graph?: Graph — pre-built from pages (caller caches it)
//     minPages?: number (default 30) — below this, pure lex
//     minEdges?: number (default 30)
//     minEdgeDensity?: number (default 1.0) — edges/nodes threshold
//     seedMinDegree?: number (default 1) — per-seed guard
//     topN?: number (default 10)
//
//   Cascade arms (in order):
//   1. 'lex': when graph is empty/sparse/seed isolated. Pure keyword match.
//   2. 'lex-seeded-ppr': when lex returns ≥1 hit AND seed has degree ≥ 1.
//      Seed PPR from each lex-matched page, merge top-k.
//   3. 'graph-first-ppr': when graph is mature (edges/nodes ≥ threshold
//      AND largest weak component > 50%). Pure PPR from a generic seed.
//
//   When arm 2 or 3 is used, we also run lex for fallback ranking of
//   page titles (so ties break consistently).
//
//   Returned PageMatch[] is sorted by score descending. The `arm` field
//   reports which arm produced this hit, so callers can show the user
//   "Powered by graph-first PPR" or fall back to plain lex.

import { describe, it, expect } from 'vitest';
import { pprCascade, type PageRef, type Graph } from '../../core/ppr-cascade';
import { makeRng } from '../__support__/rng';

function page(path: string, title: string, aliases: string[] = []): PageRef {
  return { path, title, aliases };
}

function graph(edges: Array<[string, string[]]>): Graph {
  return {
    nodes: Array.from(new Set(edges.flatMap(([from, tos]) => [from, ...tos]))),
    edges: new Map(edges),
  };
}

describe('pprCascade — empty / sparse graphs (lex arm)', () => {
  it('returns empty array for empty query', () => {
    expect(pprCascade('', [])).toEqual([]);
  });

  it('returns empty array for empty pages', () => {
    expect(pprCascade('cardiology', [])).toEqual([]);
  });

  it('uses pure lex when no graph is provided', () => {
    const pages = [page('A', 'Cardiology'), page('B', 'Oncology')];
    const result = pprCascade('cardiology', pages);
    expect(result.length).toBe(1);
    expect(result[0].page.title).toBe('Cardiology');
    expect(result[0].arm).toBe('lex');
  });

  it('uses lex-seeded-ppr when graph has edges but is below density threshold', () => {
    // 5 pages with 1 edge: page count is below minPages so the
    // graph-first arm is ruled out, but the seed has neighbors so
    // lex-seeded-ppr can fire. Result: arm is lex-seeded-ppr.
    const pages = Array.from({ length: 5 }, (_, i) => page(`P${i}`, `Page ${i} about cardiology`));
    const g = graph([['P0', ['P1']]]);
    const result = pprCascade('cardiology', pages, { graph: g, minPages: 30, rng: makeRng(1) });
    // Every result should be lex-seeded-ppr (graph is sparse but
    // seeded PPR is possible because P0 has degree >= 1).
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(r => r.arm === 'lex-seeded-ppr')).toBe(true);
  });

  it('uses lex when no graph and no lex matches', () => {
    // Force a no-graph path. With graph undefined, cascade skips
    // lex-seeded-ppr and returns only lex hits.
    const pages = Array.from({ length: 5 }, (_, i) => page(`P${i}`, `Page ${i} about cardiology`));
    const result = pprCascade('cardiology', pages, { graph: undefined });
    expect(result.every(r => r.arm === 'lex')).toBe(true);
  });

  it('uses lex when graph is below minEdges threshold', () => {
    // 50 pages but no graph edges. Sparse: cascade falls through to
    // lex because lex-seeded-ppr has no seed with degree >= 1.
    const pages = Array.from({ length: 50 }, (_, i) => page(`P${i}`, `Page ${i} about cardiology`));
    // Edges map is empty (no edges anywhere).
    const g: Graph = { nodes: pages.map(p => p.path), edges: new Map() };
    const result = pprCascade('cardiology', pages, { graph: g, minPages: 30, minEdges: 30, rng: makeRng(1) });
    expect(result.every(r => r.arm === 'lex')).toBe(true);
  });

  it('uses lex when seed is isolated (seed_degree < 1)', () => {
    // Build a graph where most pages are isolated, except a small
    // island of connected nodes. The "island" is below the
    // graph-first density threshold (edges < minEdges), so even the
    // connected nodes fall through to sparse arm. P99 is in the graph
    // but has no edges → seed_degree = 0 → lex-seeded-ppr is also
    // ruled out → cascade ends at pure lex.
    const pages = Array.from({ length: 100 }, (_, i) => page(`P${i}`, `Page ${i}`));
    // A small island of 5 connected nodes. Far below the 30-edge
    // threshold.
    const edges: Array<[string, string[]]> = [
      ['P0', ['P1']], ['P1', ['P2']], ['P2', ['P3']], ['P3', ['P4']], ['P4', ['P0']],
    ];
    const g: Graph = {
      nodes: pages.map(p => p.path),
      edges: new Map(edges),
    };
    const result = pprCascade('isolated page query', [pages[99]], {
      graph: g, minPages: 30, minEdges: 30, rng: makeRng(1),
    });
    // Result is empty (no lex match for 'isolated page query' against
    // pages[99]='Page 99', no seed for PPR). Any hits are arm=lex.
    for (const r of result) {
      expect(r.arm).toBe('lex');
    }
  });
});

describe('pprCascade — mature graph (graph-first PPR arm)', () => {
  it('uses graph-first PPR when graph is dense enough', () => {
    // 50 pages, 60 edges, well-connected. Cascade should use graph-first.
    const pages: PageRef[] = [];
    const edges: Array<[string, string[]]> = [];
    for (let i = 0; i < 50; i++) {
      const p = page(`P${i}`, `Page ${i}`);
      pages.push(p);
      // Each page links to 2-3 others. edges/nodes ≈ 2.4.
      edges.push([`P${i}`, [`P${(i + 1) % 50}`, `P${(i + 2) % 50}`]]);
    }
    // Add hub: P0 receives links from 10 pages.
    for (let i = 1; i <= 10; i++) edges.push([`P${i}`, ['P0']]);
    const g = graph(edges);
    const result = pprCascade('page 0', pages, {
      graph: g, minPages: 30, minEdges: 30, rng: makeRng(1),
    });
    // Seed is P0 (matches "Page 0"). With strong graph structure,
    // cascade should use graph-first (arm 'graph-first-ppr').
    // Top hit must be P0.
    expect(result[0].page.path).toBe('P0');
    // And the arm is graph-first-ppr (graph is mature).
    expect(result[0].arm).toBe('graph-first-ppr');
  });
});

describe('pprCascade — sparse-but-not-empty (lex-seeded PPR arm)', () => {
  it('uses lex-seeded PPR when lex matches but graph is sparse', () => {
    // 50 pages, 25 edges (edges/nodes = 0.5 < 1.0) → below graph-first
    // threshold. Lex matches P0; P0 has 2 neighbors → seed_degree >= 1.
    // Cascade should use lex-seeded-ppr.
    const pages: PageRef[] = [];
    for (let i = 0; i < 50; i++) pages.push(page(`P${i}`, `Page ${i}`));
    const edges: Array<[string, string[]]> = [];
    for (let i = 0; i < 25; i++) edges.push([`P${i}`, [`P${(i + 1) % 50}`]]);
    const g = graph(edges);
    const result = pprCascade('page 0', pages, {
      graph: g, minPages: 30, minEdges: 30, rng: makeRng(1),
    });
    // First hit: P0 (lex match). Arm: lex-seeded-ppr (graph too sparse
    // for graph-first, but seed has degree ≥ 1).
    expect(result[0].page.path).toBe('P0');
    expect(result[0].arm).toBe('lex-seeded-ppr');
  });
});

describe('pprCascade — result ordering', () => {
  it('returns topN sorted by score descending', () => {
    const pages = [
      page('A', 'Cardiology clinic'),
      page('B', 'Cardiology research'),
      page('C', 'Cardiology education'),
      page('D', 'Oncology unrelated'),
    ];
    const result = pprCascade('cardiology', pages, { topN: 2 });
    expect(result.length).toBe(2);
    // Scores are descending.
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    // All returned pages are cardiology-related.
    expect(result.map(r => r.page.path)).toEqual(['A', 'B']);
  });
});

describe('pprCascade — alias matching', () => {
  it('matches query against aliases too', () => {
    const pages = [
      page('A', 'Cardiology', ['Heart Disease', 'Cardiac Care']),
    ];
    const result = pprCascade('heart disease', pages);
    expect(result.length).toBe(1);
    expect(result[0].page.path).toBe('A');
  });
});

describe('pprCascade — graceful degradation', () => {
  it('returns lex matches even when PPR is available but returns no hit', () => {
    // Graph exists, lex matches P0. PPR from P0 might return empty
    // (pathological case) — cascade should still include the lex match.
    const pages = [page('P0', 'cardiology')];
    const g = graph([['P0', []]]);
    const result = pprCascade('cardiology', pages, { graph: g, rng: makeRng(1) });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].page.path).toBe('P0');
  });
});