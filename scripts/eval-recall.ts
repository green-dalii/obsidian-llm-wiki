// eval-recall.ts — v1.23.0 PPR baseline eval script (P0-2)
//
// NOT included in pnpm test. Run manually with `npx tsx eval-recall.ts`
// (or `node --import tsx eval-recall.ts`). This is a one-shot baseline
// measurement tool, not a regression test.
//
// Compares 3 retrieval strategies on the 53-page CC0 synthetic fixture
// (see ground-truth.md for query set):
//   1. lex-only: pure keyword match (current v1.22.x behavior)
//   2. lex-seeded-PPR: PPR seeded from lex hits, expanded via walks
//   3. graph-first-PPR: pure PPR from a generic seed (mature graph)
//
// Measures recall@k — the fraction of ground-truth pages that appear
// in the top-k results. Smaller k = more stringent; k=5 is the
// primary metric per #198 consensus (PPR is a prefilter).
//
// Outputs a markdown report at ./baseline-report.md and a console
// table for quick eyeballing.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { personalizedPageRank, type Graph } from '../src/core/monte-carlo-ppr';
import { type PageRef } from '../src/core/ppr-cascade';

// -- Fixture loading (no Obsidian) ---------------------------------------

const FIXTURE_ROOT = '/Users/greener/project/obsidian-llm-wiki/src/__tests__/fixtures/wikis/sample-50page';

function findMarkdownFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith('.md')) out.push(full);
    }
  };
  walk(root);
  return out;
}

/**
 * Parse a single .md file into a PageRef. We need only path, title,
 * aliases. Title comes from the frontmatter `title` field or the
 * filename. Aliases from frontmatter `aliases` field (array of strings).
 * Skips pages with `type: welcome` (metadata, not content).
 */
function parsePageFile(path: string, content: string): PageRef | null {
  // Skip welcome note (metadata, not content).
  if (/^---\s*[\s\S]*?type:\s*welcome[\s\S]*?---/m.test(content)) return null;

  // Frontmatter parse (very lightweight — no yaml lib).
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
  let title = path.split(sep).pop()!.replace(/\.md$/, '');
  let aliases: string[] = [];

  if (fm) {
    const yaml = fm[1];
    const titleMatch = yaml.match(/^title:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim();
    const aliasesMatch = yaml.match(/^aliases:\s*\[(.*?)\]/m);
    if (aliasesMatch) {
      aliases = aliasesMatch[1]
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
  }

  // Vault-relative path (relative to fixture root).
  const vaultPath = relative(FIXTURE_ROOT, path).split(sep).join('/');

  return { path: vaultPath, title, aliases };
}

function loadFixture(): PageRef[] {
  const files = findMarkdownFiles(FIXTURE_ROOT);
  const pages: PageRef[] = [];
  for (const f of files) {
    // Skip meta files (README, EVAL, ground-truth, baseline-report).
    const base = f.split(sep).pop()!;
    if (['README.md', 'EVAL.md', 'ground-truth.md', 'baseline-report.md'].includes(base)) continue;
    const content = readFileSync(f, 'utf-8');
    const page = parsePageFile(f, content);
    if (page) pages.push(page);
  }
  return pages;
}

// -- Graph construction -------------------------------------------------

/**
 * Build a Graph (nodes + directed edges) from page contents. Edge
 * resolution: every [[wikilink]] target that resolves to a known page
 * is an edge. We handle:
 *   [[X]]                  → edges/<source> → entities/X or concepts/X
 *   [[X|Y]]                → edges/<source> → X (target only)
 *   [[entities/X]]         → edges/<source> → entities/X
 *   [[concepts/X]]         → edges/<source> → concepts/X
 *   [[sources/X]]          → edges/<source> → sources/X
 *
 * Targets that don't resolve to a known page are ignored (forward
 * references, dead links).
 */
function buildGraph(pages: PageRef[]): Graph {
  const pagePaths = new Set(pages.map(p => p.path));
  // eslint-disable-next-line no-console
  console.log('  buildGraph: pagePaths sample:', [...pagePaths].slice(0, 3), 'total:', pagePaths.size);
  // eslint-disable-next-line no-console
  console.log('  first page object:', JSON.stringify(pages[0]));
  const edges = new Map<string, string[]>();
  let total = 0;
  for (const targets of edges.values()) total += targets.length;

  for (const p of pages) {
    // Read the file again to extract wikilinks.
    const fullPath = join(FIXTURE_ROOT, p.path);
    let content: string;
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`  ERROR reading ${fullPath}:`, (e as Error).message);
      continue;
    }

    // Strip frontmatter to avoid matching wikilinks inside it.
    const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');

    const outgoing = new Set<string>();
    // Match [[target]] or [[target|alias]].
    const re = /\[\[([^\]|#]+?)(?:#[^\]]+)?(?:\|[^\]]+)?\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      let target = m[1].trim();
      const stripped = target.replace(/^(entities|concepts|sources)\//, '');
      const candidates = [
        `${stripped}.md`,
        `entities/${stripped}.md`,
        `concepts/${stripped}.md`,
        `sources/${stripped}.md`,
      ];
      let matched = '';
      for (const c of candidates) {
        if (pagePaths.has(c)) { matched = c; outgoing.add(c); break; }
      }
      if (!matched) {
        // eslint-disable-next-line no-console
        if (outgoing.size === 0) console.log(`  unresolved: ${p.path} -> ${target} (cands: ${candidates.join(', ')})`);
      }
    }

    if (outgoing.size > 0) {
      edges.set(p.path, [...outgoing]);
    }
  }

  // Also add isolated nodes (pages with no edges) to the graph so PPR
  // can handle them (returns empty map for them).
  const nodes = pages.map(p => p.path);
  for (const n of nodes) {
    if (!edges.has(n)) edges.set(n, []);
  }

  return { nodes, edges };
}

// -- Eval queries (mirror of ground-truth.md) ---------------------------

interface EvalQuery {
  query: string;
  expected: string[];  // list of page paths
}

const EVAL_QUERIES: EvalQuery[] = [
  { query: 'heart failure', expected: ['concepts/Heart Failure.md', 'entities/Aria Vasquez.md', 'entities/Gemma Rosenthal.md', 'entities/Selwyn Ainsley.md', 'entities/Octavian Hume.md', 'entities/Dax Emberlin.md', 'entities/Wendell Marsh.md', 'entities/Julianna Thorne.md', 'sources/Service Overview.md', 'sources/Quality Dashboard.md', 'sources/Clinical Guidelines.md'] },
  { query: 'atrial fibrillation', expected: ['concepts/Atrial Fibrillation.md', 'concepts/Cardioversion.md', 'concepts/Rate Control.md', 'concepts/Anticoagulation.md', 'concepts/Antiplatelet Therapy.md', 'entities/Bram Holloway.md', 'entities/Elara Whitfield.md', 'entities/Isadora Lockhart.md', 'entities/Magnus Hadley.md', 'entities/Quillon Vesper.md', 'entities/Urien Caldwell.md', 'entities/Cosima Falk.md', 'entities/Yseult Penrose.md', 'sources/Clinical Guidelines.md'] },
  { query: 'acute coronary syndrome', expected: ['concepts/Acute Coronary Syndrome.md', 'concepts/Myocardial Infarction.md', 'concepts/Coronary Artery Disease.md', 'sources/Clinical Guidelines.md'] },
  { query: 'stent implant', expected: ['entities/Stent Implant.md', 'concepts/Coronary Artery Disease.md', 'concepts/Antiplatelet Therapy.md', 'concepts/Statin Pharmacology.md', 'entities/Hadrian Voss.md', 'entities/Rosalind Decker.md', 'entities/Nereida Stone.md', 'entities/Aerith Solberg.md'] },
  { query: 'antiplatelet therapy', expected: ['concepts/Antiplatelet Therapy.md', 'concepts/Myocardial Infarction.md', 'concepts/Coronary Artery Disease.md', 'entities/Stent Implant.md', 'entities/Hadrian Voss.md', 'entities/Dorian Ashford.md', 'entities/Rosalind Decker.md', 'entities/Aerith Solberg.md', 'entities/Leocadia Voss.md', 'sources/Clinical Guidelines.md'] },
  { query: 'echocardiography', expected: ['concepts/Echocardiography.md', 'entities/Aria Vasquez.md', 'entities/Bellamy Crane.md', 'entities/Julianna Thorne.md', 'sources/Note Templates.md'] },
  { query: 'AF rate control', expected: ['concepts/Atrial Fibrillation.md', 'concepts/Rate Control.md', 'concepts/Beta Blocker.md', 'entities/Bram Holloway.md', 'entities/Isadora Lockhart.md', 'entities/Elara Whitfield.md', 'sources/Clinical Guidelines.md'] },
  { query: 'cardiology hypertension', expected: ['concepts/Hypertension.md', 'concepts/Coronary Artery Disease.md', 'concepts/ACE Inhibitor.md', 'concepts/Beta Blocker.md', 'entities/Cyra Pemberton.md', 'entities/Persephone Locke.md', 'entities/Finneus Caldwell.md', 'entities/Thessaly Frost.md', 'entities/Zephyr Aldridge.md', 'entities/Kestrel Marchetti.md'] },
  { query: 'statins', expected: ['concepts/Statin Pharmacology.md', 'entities/Lipid Panel Result.md', 'concepts/Coronary Artery Disease.md', 'entities/Dorian Ashford.md', 'entities/Verity Lockwood.md', 'entities/Leocadia Voss.md', 'entities/Xandra Quill.md', 'entities/Kestrel Marchetti.md', 'sources/Quality Dashboard.md'] },
  { query: 'Pinewood Heart Center', expected: ['sources/Service Overview.md', 'sources/Clinical Guidelines.md', 'sources/Note Templates.md', 'sources/Quality Dashboard.md', 'sources/Research Note.md'] },
];

// -- Strategies --------------------------------------------------------

interface ScoredResult {
  path: string;
  score: number;
}

function lexOnly(query: string, pages: PageRef[]): ScoredResult[] {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
  const scored: ScoredResult[] = [];
  for (const p of pages) {
    let score = 0;
    const titleLower = p.title.toLowerCase();
    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 3;
      for (const a of p.aliases) {
        if (a.toLowerCase().includes(kw)) score += 2;
      }
    }
    if (score > 0) scored.push({ path: p.path, score });
  }
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Lex-seeded-PPR: run lex first, then for each lex hit that has
 * graph neighbors, run PPR and merge results.
 */
function lexSeededPpr(
  query: string,
  pages: PageRef[],
  graph: Graph,
  topN: number,
  rng: () => number,
): { results: ScoredResult[]; arm: string } {
  const lex = lexOnly(query, pages);
  if (lex.length === 0) return { results: [], arm: 'lex' };

  // Pick top 3 lex hits as PPR seeds.
  const seedPaths = lex.slice(0, 3).map(r => r.path);
  const validSeeds = seedPaths.filter(s => (graph.edges.get(s)?.length ?? 0) > 0);
  if (validSeeds.length === 0) {
    return { results: lex.slice(0, topN), arm: 'lex' };
  }

  // Run PPR for each seed, merge.
  const pprMerged = new Map<string, number>();
  for (const seed of validSeeds) {
    const result = personalizedPageRank(graph, seed, {
      numWalks: 1000, maxSteps: 50, damping: 0.15, rng,
    });
    for (const [node, score] of result) {
      const cur = pprMerged.get(node) ?? 0;
      if (score > cur) pprMerged.set(node, score);
    }
  }

  // Merge: combine lex score (max 1) with PPR score.
  const lexScore = new Map(lex.map(r => [r.path, r.score]));
  const merged = new Map<string, number>();
  for (const [path, ppr] of pprMerged) {
    const l = (lexScore.get(path) ?? 0) / Math.max(...lex.map(r => r.score), 1);
    merged.set(path, ppr + l * 0.3);  // PPR is dominant; lex boosts
  }
  for (const r of lex) {
    if (!merged.has(r.path)) {
      merged.set(r.path, (r.score / Math.max(...lex.map(x => x.score), 1)) * 0.5);
    }
  }

  const sorted = [...merged.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([path, score]) => ({ path, score }));

  return { results: sorted, arm: 'lex-seeded-ppr' };
}

/**
 * Graph-first PPR: pure PPR from a generic seed, used as a fallback
 * for queries with zero lex/lex-seeded hits. In this eval we report
 * it as a standalone strategy for comparison, but in production
 * the cascade (ppr-cascade.ts) only falls through to graph-first
 * when seeded arms return empty.
 */
function graphFirstPpr(
  _query: string,
  pages: PageRef[],
  graph: Graph,
  topN: number,
  rng: () => number,
): ScoredResult[] {
  if (pages.length === 0) return [];
  const seed = pages[0].path;
  const result = personalizedPageRank(graph, seed, {
    numWalks: 1000, maxSteps: 50, damping: 0.15, rng,
  });
  return [...result.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([path, score]) => ({ path, score }));
}

// -- Eval driver -------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StrategyResult {
  recallAt5: number;
  recallAt10: number;
  perQuery: Array<{ query: string; recallAt5: number; recallAt10: number; arm?: string; expectedCount: number; hitCountAt5: number; hitCountAt10: number }>;
}

function runStrategy(
  name: 'lex' | 'lex-seeded-ppr' | 'graph-first-ppr',
  query: string,
  pages: PageRef[],
  graph: Graph,
  rng: () => number,
  k: number,
): { results: ScoredResult[]; arm?: string } {
  if (name === 'lex') {
    return { results: lexOnly(query, pages) };
  }
  if (name === 'lex-seeded-ppr') {
    return lexSeededPpr(query, pages, graph, k, rng);
  }
  return { results: graphFirstPpr(query, pages, graph, k, rng) };
}

function evaluateStrategy(
  name: 'lex' | 'lex-seeded-ppr' | 'graph-first-ppr',
  pages: PageRef[],
  graph: Graph,
  kValues: number[],
): StrategyResult {
  const perQuery: StrategyResult['perQuery'] = [];
  let totalRecallAt5 = 0;
  let totalRecallAt10 = 0;

  for (const eq of EVAL_QUERIES) {
    // Each query uses a fresh RNG so PPR sampling noise is the same
    // as what users would experience on any first query.
    const rng = mulberry32(42);
    const topN = Math.max(...kValues);
    const { results, arm } = runStrategy(name, eq.query, pages, graph, rng, topN);

    const expectedSet = new Set(eq.expected);
    const topKResults = (n: number) => results.slice(0, n).map(r => r.path);
    const hitsAt = (n: number) => topKResults(n).filter(p => expectedSet.has(p)).length;
    const expectedCount = eq.expected.length;

    const r5 = hitsAt(5) / expectedCount;
    const r10 = hitsAt(10) / expectedCount;

    perQuery.push({
      query: eq.query,
      recallAt5: r5,
      recallAt10: r10,
      arm,
      expectedCount,
      hitCountAt5: hitsAt(5),
      hitCountAt10: hitsAt(10),
    });
    totalRecallAt5 += r5;
    totalRecallAt10 += r10;
  }

  return {
    recallAt5: totalRecallAt5 / EVAL_QUERIES.length,
    recallAt10: totalRecallAt10 / EVAL_QUERIES.length,
    perQuery,
  };
}

// -- Main --------------------------------------------------------------

function main() {
  console.log('Loading fixture...');
  const pages = loadFixture();
  console.log(`  loaded ${pages.length} pages`);

  console.log('Building graph...');
  const graph = buildGraph(pages);
  let edgeCount = 0;
  for (const targets of graph.edges.values()) edgeCount += targets.length;
  // eslint-disable-next-line no-console
  console.log(`  graph: ${graph.nodes.length} nodes, ${edgeCount} edges (edges/nodes = ${(edgeCount / graph.nodes.length).toFixed(2)})`);

  // Sanity check: is the graph mature enough for graph-first?
  if (graph.nodes.length < 30 || edgeCount < 30 || edgeCount / graph.nodes.length < 1.0) {
    console.warn('  WARNING: graph is below graph-first thresholds — graph-first arm will fall back');
  }

  console.log('Note: graph-first is a FALLBACK arm, not a primary retrieval strategy.');
  console.log('      The cascade uses it only when lex/lex-seeded return no hits.');
  console.log('      Standalone graph-first results are a lower bound.');

  const strategies = ['lex', 'lex-seeded-ppr', 'graph-first-ppr'] as const;
  const results: Record<typeof strategies[number], StrategyResult> = {} as any;
  for (const strat of strategies) {
    console.log(`\nRunning ${strat}...`);
    results[strat] = evaluateStrategy(strat, pages, graph, [5, 10]);
  }

  // Console table.
  console.log('\n========= BASELINE RESULTS =========');
  console.log('| Strategy       | Recall@5 | Recall@10 |');
  console.log('|----------------|----------|-----------|');
  for (const strat of strategies) {
    const r = results[strat];
    console.log(`| ${strat.padEnd(14)} | ${r.recallAt5.toFixed(3).padStart(8)} | ${r.recallAt10.toFixed(3).padStart(9)} |`);
  }

  // Targets from EVAL.md.
  const targets: Record<string, { r5: number; r10: number }> = {
    lex: { r5: 0.30, r10: 0.50 },
    'lex-seeded-ppr': { r5: 0.55, r10: 0.75 },
    'graph-first-ppr': { r5: 0.55, r10: 0.75 },
  };
  console.log('\n| Strategy       | Target@5 | Met? | Target@10 | Met? |');
  console.log('|----------------|----------|------|-----------|------|');
  for (const strat of strategies) {
    const r = results[strat];
    const t = targets[strat];
    console.log(`| ${strat.padEnd(14)} | ${t.r5.toFixed(2).padStart(8)} | ${r.recallAt5 >= t.r5 ? 'YES' : 'NO '}  | ${t.r10.toFixed(2).padStart(9)} | ${r.recallAt10 >= t.r10 ? 'YES' : 'NO '}  |`);
  }

  // Per-query detail.
  console.log('\n========= PER-QUERY DETAIL =========');
  for (const strat of strategies) {
    console.log(`\n--- ${strat} ---`);
    console.log('| Query                          | Hits@5/Exp | R@5  | R@10 | Arm |');
    console.log('|--------------------------------|------------|------|------|-----|');
    for (const q of results[strat].perQuery) {
      const hits = `${q.hitCountAt5}/${q.expectedCount}`;
      console.log(`| ${q.query.padEnd(31)} | ${hits.padEnd(10)} | ${q.recallAt5.toFixed(2)} | ${q.recallAt10.toFixed(2)} | ${(q.arm || 'lex').padEnd(3)} |`);
    }
  }

  // Write markdown report.
  const report = generateMarkdownReport(pages.length, edgeCount, results, targets);
  writeFileSync(join(FIXTURE_ROOT, 'baseline-report.md'), report);
  console.log(`\nReport written to: ${join(FIXTURE_ROOT, 'baseline-report.md')}`);
}

function generateMarkdownReport(
  pageCount: number,
  edgeCount: number,
  results: Record<string, StrategyResult>,
  targets: Record<string, { r5: number; r10: number }>,
): string {
  const now = new Date().toISOString();
  let md = `# v1.23.0 PPR Baseline Report\n\n`;
  md += `**Generated:** ${now}\n`;
  md += `**Fixture:** sample-50page (${pageCount} pages, ${edgeCount} wiki-links)\n\n`;
  md += `## Summary\n\n`;
  md += `| Strategy | Recall@5 | Recall@10 | Target@5 | Target@10 |\n`;
  md += `|----------|----------|-----------|----------|-----------|\n`;
  for (const [strat, r] of Object.entries(results)) {
    const t = targets[strat];
    md += `| ${strat} | ${r.recallAt5.toFixed(3)} | ${r.recallAt10.toFixed(3)} | ${t.r5.toFixed(2)} ${r.recallAt5 >= t.r5 ? '✅' : '❌'} | ${t.r10.toFixed(2)} ${r.recallAt10 >= t.r10 ? '✅' : '❌'} |\n`;
  }
  md += `\n## Per-query detail\n\n`;
  for (const [strat, r] of Object.entries(results)) {
    md += `### ${strat}\n\n`;
    md += `| Query | Expected | Hits@5 | R@5 | R@10 | Arm |\n`;
    md += `|-------|----------|--------|-----|------|-----|\n`;
    for (const q of r.perQuery) {
      md += `| ${q.query} | ${q.expectedCount} | ${q.hitCountAt5} | ${q.recallAt5.toFixed(2)} | ${q.recallAt10.toFixed(2)} | ${q.arm ?? 'lex'} |\n`;
    }
    md += `\n`;
  }
  md += `## Interpretation\n\n`;
  md += `See EVAL.md for the targets and methodology. The cascade decision is encoded in ppr-cascade.ts (3-arm hybrid: lex / lex-seeded-ppr / graph-first-ppr).\n`;
  return md;
}

main();