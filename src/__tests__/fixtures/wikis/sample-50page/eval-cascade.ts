/**
 * Evaluate the PPR cascade against the sample-50page fixture.
 *
 * Usage:
 *   npx tsx src/__tests__/fixtures/wikis/sample-50page/eval-cascade.ts
 *
 * Loads the fixture pages, builds the graph, and runs all 10
 * ground-truth queries through three retrieval strategies:
 *   - lex only (no graph)
 *   - cascade (full pprCascade with graph, no explicit seeds)
 *   - cascade+seeds (pprCascade with explicit seeds from lex)
 */

/* eslint-disable obsidianmd/rule-custom-message -- eval script, not in production bundle; console.* is intentional logging for the standalone tsx run */
// tsc disable for .ts import extensions + node:fs/path/url usage
// @ts-nocheck
// @ts-nocheck
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = __dirname;

interface PageInfo {
  path: string;
  title: string;
  aliases: string[];
}

// Load fixture
function loadFixture(): PageInfo[] {
  const pages: PageInfo[] = [];
  for (const folder of ['entities', 'concepts', 'sources']) {
    const dir = join(FIXTURE, folder);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort();
    for (const file of files) {
      const basename = file.replace(/\.md$/, '');
      const path = `${folder}/${basename}`;
      pages.push({ path, title: basename, aliases: [] });
    }
  }
  return pages;
}

// Ground-truth queries (from ground-truth.md)
const QUERIES: Array<{ q: string; expected: string[] }> = [
  { q: 'heart failure', expected: [
    'concepts/Heart Failure', 'entities/Aria Vasquez', 'entities/Gemma Rosenthal',
    'entities/Selwyn Ainsley', 'entities/Octavian Hume', 'entities/Dax Emberlin',
    'entities/Wendell Marsh', 'entities/Julianna Thorne', 'sources/Service Overview',
    'sources/Quality Dashboard', 'sources/Clinical Guidelines',
  ]},
  { q: 'atrial fibrillation', expected: [
    'concepts/Atrial Fibrillation', 'concepts/Cardioversion', 'concepts/Rate Control',
    'concepts/Anticoagulation', 'concepts/Antiplatelet Therapy', 'entities/Bram Holloway',
    'entities/Elara Whitfield', 'entities/Isadora Lockhart', 'entities/Magnus Hadley',
    'entities/Quillon Vesper', 'entities/Urien Caldwell', 'entities/Cosima Falk',
    'entities/Yseult Penrose', 'sources/Clinical Guidelines',
  ]},
  { q: 'acute coronary syndrome', expected: [
    'concepts/Acute Coronary Syndrome', 'concepts/Myocardial Infarction',
    'concepts/Coronary Artery Disease', 'sources/Clinical Guidelines',
  ]},
  { q: 'stent implant', expected: [
    'entities/Stent Implant', 'concepts/Coronary Artery Disease',
    'concepts/Antiplatelet Therapy', 'concepts/Statin Pharmacology',
    'entities/Hadrian Voss', 'entities/Rosalind Decker', 'entities/Nereida Stone',
    'entities/Aerith Solberg',
  ]},
  { q: 'antiplatelet therapy', expected: [
    'concepts/Antiplatelet Therapy', 'concepts/Myocardial Infarction',
    'concepts/Coronary Artery Disease', 'entities/Stent Implant',
    'entities/Hadrian Voss', 'entities/Dorian Ashford', 'entities/Rosalind Decker',
    'entities/Aerith Solberg', 'entities/Leocadia Voss', 'sources/Clinical Guidelines',
  ]},
  { q: 'echocardiography', expected: [
    'concepts/Echocardiography', 'entities/Aria Vasquez', 'entities/Bellamy Crane',
    'entities/Julianna Thorne', 'sources/Note Templates',
  ]},
  { q: 'AF rate control', expected: [
    'concepts/Atrial Fibrillation', 'concepts/Rate Control', 'concepts/Beta Blocker',
    'entities/Bram Holloway', 'entities/Isadora Lockhart', 'entities/Elara Whitfield',
    'sources/Clinical Guidelines',
  ]},
  { q: 'cardiology hypertension', expected: [
    'concepts/Hypertension', 'concepts/Coronary Artery Disease', 'concepts/ACE Inhibitor',
    'concepts/Beta Blocker', 'entities/Cyra Pemberton', 'entities/Persephone Locke',
    'entities/Finneus Caldwell', 'entities/Thessaly Frost', 'entities/Zephyr Aldridge',
    'entities/Kestrel Marchetti',
  ]},
  { q: 'statins', expected: [
    'concepts/Statin Pharmacology', 'entities/Lipid Panel Result',
    'concepts/Coronary Artery Disease', 'entities/Dorian Ashford', 'entities/Verity Lockwood',
    'entities/Leocadia Voss', 'entities/Xandra Quill', 'entities/Kestrel Marchetti',
    'sources/Quality Dashboard',
  ]},
  { q: 'Pinewood Heart Center', expected: [
    'sources/Service Overview', 'sources/Clinical Guidelines', 'sources/Note Templates',
    'sources/Quality Dashboard', 'sources/Research Note',
  ]},
];

// Real imports
import { pprCascade, type PageRef } from '../../../../core/ppr-cascade.ts';
import { buildGraphFromContent } from '../../../../core/build-graph.ts';

const pages = loadFixture();
const allPageRefs: PageRef[] = pages.map(p => ({ path: p.path, title: p.title, aliases: [] as string[] }));
const allPaths = new Set(pages.map(p => p.path));

// Load page content for graph building
const loadedPages = pages.map(p => {
  const content = readFileSync(join(FIXTURE, p.path + '.md'), 'utf-8');
  return { path: p.path, content };
});

const graph = buildGraphFromContent(loadedPages, allPaths, '' /* no folder prefix in fixture */);

const LOGO = `\x1b[34m[EVAL]\x1b[0m`;

console.log(`\n${LOGO} Fixture: sample-50page (${pages.length} pages)`);
console.log(`${LOGO} Graph: ${graph.nodes.length} nodes, ${[...graph.edges.values()].flat().length} edges`);
console.log(`${LOGO} Queries: ${QUERIES.length}`);

function evaluate(strategy: string, results: Array<{ query: string; total: number; hits5: number; hits10: number; arms: string; top5: string[] }>) {
  const avgR5 = results.reduce((s, r) => s + r.hits5 / r.total, 0) / results.length;
  const avgR10 = results.reduce((s, r) => s + r.hits10 / r.total, 0) / results.length;
  console.log(`\n\x1b[1m${strategy}\x1b[0m`);
  console.log(`  | Query | Expected | R@5 | R@10 | Arm | Top-5 |`);
  console.log(`  |---|---|---|---|---|---|`);
  for (const r of results) {
    console.log(`  | ${r.query.padEnd(25)} | ${String(r.total).padEnd(8)} | ${(r.hits5 / r.total).toFixed(2).padStart(5)} | ${(r.hits10 / r.total).toFixed(2).padStart(5)} | ${r.arms.padEnd(15)} | ${r.top5.slice(0, 3).join(', ').substring(0, 60)} |`);
  }
  console.log(`  \x1b[33mAverage R@5: ${(avgR5 * 100).toFixed(1)}%  R@10: ${(avgR10 * 100).toFixed(1)}%\x1b[0m`);
  return { avgR5, avgR10 };
}

// Strategy 1: lex only (no graph)
console.log(`\n${LOGO} Running lex-only...`);
const lexResults = QUERIES.map(q => {
  const r = pprCascade(q.q, allPageRefs, { topN: 10 });
  const hits5 = r.slice(0, 5).filter(m => q.expected.includes(m.page.path)).length;
  const hits10 = r.slice(0, 10).filter(m => q.expected.includes(m.page.path)).length;
  return { query: q.q, total: q.expected.length, hits5, hits10, arms: [...new Set(r.map(m => m.arm))].join(','), top5: r.slice(0, 5).map(m => m.page.path) };
});
const lex = evaluate('lex-only', lexResults);

// Strategy 2: cascade (full pipeline)
console.log(`\n${LOGO} Running cascade...`);
const cascadeResults = QUERIES.map(q => {
  const r = pprCascade(q.q, allPageRefs, {
    topN: 10,
    graph,
    minPages: 30,
    minEdges: 30,
  });
  const hits5 = r.slice(0, 5).filter(m => q.expected.includes(m.page.path)).length;
  const hits10 = r.slice(0, 10).filter(m => q.expected.includes(m.page.path)).length;
  return { query: q.q, total: q.expected.length, hits5, hits10, arms: [...new Set(r.map(m => m.arm))].join(','), top5: r.slice(0, 5).map(m => m.page.path) };
});
const cascade = evaluate('cascade', cascadeResults);

// Strategy 3: cascade + explicit seeds (simulating LLM seed selection)
console.log(`\n${LOGO} Running cascade+seeds...`);
const seedResults = QUERIES.map(q => {
  const lexResult = pprCascade(q.q, allPageRefs, { topN: 10 });
  const seeds = lexResult.slice(0, 3).map(m => m.page.path);
  const r = seeds.length > 0
    ? pprCascade(q.q, allPageRefs, {
        topN: 10,
        graph,
        minPages: 30,
        minEdges: 30,
        seeds,
      })
    : pprCascade(q.q, allPageRefs, { topN: 10 });
  const hits5 = r.slice(0, 5).filter(m => q.expected.includes(m.page.path)).length;
  const hits10 = r.slice(0, 10).filter(m => q.expected.includes(m.page.path)).length;
  return { query: q.q, total: q.expected.length, hits5, hits10, arms: [...new Set(r.map(m => m.arm))].join(','), top5: r.slice(0, 5).map(m => m.page.path) };
});
const seeds = evaluate('cascade+seeds', seedResults);

// Summary
console.log(`\n${LOGO} ====== SUMMARY ======`);
console.log(`| Strategy | R@5 | R@10 |`);
console.log(`|---|---|---|`);
console.log(`| lex      | ${(lex.avgR5 * 100).toFixed(1)}% | ${(lex.avgR10 * 100).toFixed(1)}% |`);
console.log(`| cascade  | ${(cascade.avgR5 * 100).toFixed(1)}% | ${(cascade.avgR10 * 100).toFixed(1)}% |`);
console.log(`| seeds    | ${(seeds.avgR5 * 100).toFixed(1)}% | ${(seeds.avgR10 * 100).toFixed(1)}% |`);
/* eslint-enable obsidianmd/rule-custom-message */
