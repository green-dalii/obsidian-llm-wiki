import { describe, it, expect } from 'vitest';
import {
  localClustering,
  buildUndirectedAdjacency,
  assessHubs,
  type HubVerdict,
} from '../../core/hub-retirement';

// Build an undirected adjacency from an edge list (also exercises
// buildUndirectedAdjacency, the integration entry point).
function graph(edges: Array<[string, string]>): Map<string, Set<string>> {
  const links = new Map<string, string[]>();
  for (const [a, b] of edges) {
    if (!links.has(a)) links.set(a, []);
    links.get(a)!.push(b);
  }
  return buildUndirectedAdjacency(links);
}

// A hub with `degree` leaves and `internalEdges` edges among consecutive leaves.
// clustering = 2 * internalEdges / (degree * (degree - 1)).
function hubWith(name: string, degree: number, internalEdges: number): Array<[string, string]> {
  const leaves = Array.from({ length: degree }, (_, i) => `${name}_n${i}`);
  const e: Array<[string, string]> = leaves.map(l => [name, l]);
  for (let i = 0; i < internalEdges; i++) e.push([leaves[i], leaves[i + 1]]);
  return e;
}

const verdicts = (a: { verdict: HubVerdict }[]) => a.map(x => x.verdict);

describe('Hub Retirement — Pure Functions', () => {
  describe('localClustering', () => {
    it('is 1 for a triangle (every neighbor pair connected)', () => {
      const adj = graph([['a', 'b'], ['b', 'c'], ['a', 'c']]);
      expect(localClustering('a', adj)).toEqual({ clustering: 1, degree: 2 });
    });

    it('is 0 for a star (no neighbor interconnects)', () => {
      const adj = graph([['s', 'a'], ['s', 'b'], ['s', 'c'], ['s', 'd']]);
      expect(localClustering('s', adj)).toEqual({ clustering: 0, degree: 4 });
    });

    it('counts the connected fraction of neighbor pairs', () => {
      // x → {p,q,r}, only p-q connected: 1 of 3 possible pairs
      const adj = graph([['x', 'p'], ['x', 'q'], ['x', 'r'], ['p', 'q']]);
      const { clustering, degree } = localClustering('x', adj);
      expect(degree).toBe(3);
      expect(clustering).toBeCloseTo(1 / 3, 10);
    });

    it('is 0 below degree 2 and for unknown nodes', () => {
      const adj = graph([['s', 'a']]);
      expect(localClustering('s', adj)).toEqual({ clustering: 0, degree: 1 });
      expect(localClustering('missing', adj)).toEqual({ clustering: 0, degree: 0 });
    });
  });

  describe('buildUndirectedAdjacency', () => {
    it('symmetrizes edges and drops self-loops', () => {
      const adj = buildUndirectedAdjacency(new Map([
        ['a', ['b', 'a']], // a→a self-loop dropped
        ['b', ['c']],
      ]));
      expect(adj.get('a')).toEqual(new Set(['b']));
      expect(adj.get('b')).toEqual(new Set(['a', 'c']));
      expect(adj.get('c')).toEqual(new Set(['b']));
    });
  });

  describe('assessHubs', () => {
    // Three hubs, all with LOW absolute clustering (< 0.1, like the real graph),
    // distinct ranks. degreeFloor lowered so the degree-10 fixtures qualify.
    const lowGraph = graph([
      ...hubWith('star', 10, 0),    // clustering 0
      ...hubWith('mid', 10, 3),     // 6/90  = 0.067
      ...hubWith('crystal', 10, 4), // 8/90  = 0.089
    ]);
    const hubs = ['star', 'mid', 'crystal'];

    it('retires the relatively-most-crystallized hub even though clustering < 0.1', () => {
      const out = assessHubs(lowGraph, hubs, { degreeFloor: 4 });
      const byId = Object.fromEntries(out.map(a => [a.id, a]));
      expect(byId.crystal.verdict).toBe('crystallized');
      expect(byId.mid.verdict).toBe('transition');
      expect(byId.star.verdict).toBe('star');
      // The empirical point: the retired hub is below any absolute 0.10 cut.
      expect(byId.crystal.clustering).toBeLessThan(0.1);
    });

    it('returns assessments sorted most-crystallized first', () => {
      const out = assessHubs(lowGraph, hubs, { degreeFloor: 4 });
      expect(out.map(a => a.id)).toEqual(['crystal', 'mid', 'star']);
    });

    it('treats a low-degree hub as building regardless of clustering', () => {
      // 5-node clique hub: clustering 1, but degree 4 < default floor 30.
      const adj = graph([
        ['h', 'a'], ['h', 'b'], ['h', 'c'], ['h', 'd'],
        ['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd'], ['c', 'd'],
      ]);
      const [a] = assessHubs(adj, ['h']);
      expect(a.clustering).toBe(1);
      expect(a.verdict).toBe('building');
    });

    it('absoluteClusteringFloor blocks retirement in an all-star graph', () => {
      const out = assessHubs(lowGraph, hubs, { degreeFloor: 4, absoluteClusteringFloor: 0.1 });
      const crystal = out.find(a => a.id === 'crystal')!;
      expect(crystal.verdict).toBe('transition'); // demoted: 0.089 < 0.1 floor
    });

    it('is magnitude-independent — verdict follows rank, not absolute clustering', () => {
      // High-absolute-clustering graph with the same ordering as lowGraph.
      // consecutive-pair scheme caps internal edges at degree-1 (= 5 here)
      const highGraph = graph([
        ...hubWith('s', 6, 0), // 0
        ...hubWith('m', 6, 2), //  4/30 = 0.133
        ...hubWith('c', 6, 5), // 10/30 = 0.333
      ]);
      const low = verdicts(assessHubs(lowGraph, hubs, { degreeFloor: 4 }));
      const high = verdicts(assessHubs(highGraph, ['s', 'm', 'c'], { degreeFloor: 4 }));
      expect(low).toEqual(['crystallized', 'transition', 'star']);
      expect(high).toEqual(low);
    });

    it('keeps a single hub (no relative signal) as star, never crystallized', () => {
      const [a] = assessHubs(lowGraph, ['crystal'], { degreeFloor: 4 });
      expect(a.clusteringPercentile).toBe(0);
      expect(a.verdict).toBe('star');
    });

    it('returns empty for no hubs', () => {
      expect(assessHubs(lowGraph, [])).toEqual([]);
    });
  });
});
