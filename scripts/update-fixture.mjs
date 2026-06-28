/**
 * Upgrade sample-50page fixture to match the real wiki-generator format.
 *
 * Reads existing .md files (hand-crafted with minimal frontmatter),
 * and rewrites them with the same frontmatter fields that
 * src/core/frontmatter.ts:mergeFrontmatter() produces:
 *
 *   ---
 *   type: entity|concept|source
 *   created: <today>
 *   updated: <today>
 *   sources: []
 *   tags:
 *     - "Person" (entity) / "Method" (concept) / "article" (source)
 *   aliases:
 *     - "alt-name"
 *   ---
 *
 * Also generates index.md from all the pages (matching the format
 * in src/wiki/wiki-engine.ts:generateFlatIndex()).
 *
 * Usage: node scripts/update-fixture.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, '../src/__tests__/fixtures/wikis/sample-50page');
const TODAY = '2026-06-28';

// Domain-relevant tag per folder
const DEFAULT_TAGS = {
  entities: ['Person'],
  concepts: ['Method'],
  sources: ['other'],
};

// Section labels per page type
const SECTION_ROOT = {
  entity: 'entity',
  concept: 'concept',
  source: 'source',
};

function yamlList(items) {
  if (!items || items.length === 0) return ' []';
  return '\n' + items.map(v => `  - "${v}"`).join('\n');
}

/**
 * Generate realistic aliases for wiki pages. Patterns:
 * - Person entity → single last name
 * - Concepts → English abbreviations (AF, CAD, MI, ACEi)
 * - Sources → short abbreviations
 */
function generateAliases(basename, folder) {
  if (folder === 'entities') {
    // Last-word alias for people
    const parts = basename.split(' ');
    if (parts.length >= 2) return [parts[parts.length - 1]];
    return [];
  }
  if (folder === 'concepts') {
    const abbr = {
      'ACE Inhibitor': ['ACEi', 'ACE-I'],
      'Acute Coronary Syndrome': ['ACS'],
      'Anticoagulation': ['AC'],
      'Antiplatelet Therapy': ['APT', 'DAPT'],
      'Atrial Fibrillation': ['AF', 'AFib'],
      'Beta Blocker': ['BB'],
      'Cardioversion': ['CV'],
      'Coronary Artery Disease': ['CAD'],
      'Diuretic Therapy': ['Diuretic'],
      'Echocardiography': ['Echo'],
      'Heart Failure': ['HF'],
      'Hypertension': ['HTN'],
      'Myocardial Infarction': ['MI', 'Heart Attack'],
      'Rate Control': ['RateCtrl'],
      'Statin Pharmacology': ['Statin'],
    };
    return abbr[basename] || [basename.replace(/ /g, '').substring(0, 6)];
  }
  return [];
}

function generateFrontmatter(type, tags, aliases) {
  const lines = ['---'];
  lines.push(`type: ${type}`);
  lines.push(`created: ${TODAY}`);
  lines.push(`updated: ${TODAY}`);
  lines.push(`sources:${yamlList([])}`);
  lines.push(`tags:${yamlList(tags)}`);
  if (aliases && aliases.length > 0) {
    lines.push(`aliases:${yamlList(aliases)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function extractWikiLinks(content) {
  const linkRe = /\[\[([^\]|]+)(?:#[^\]]+)?(?:\|[^\]]+)?\]\]/g;
  const links = [];
  let m;
  while ((m = linkRe.exec(content)) !== null) {
    const target = m[1].trim();
    if (!links.includes(target)) links.push(target);
  }
  return links;
}

function extractSummary(oldContent, wikilinks) {
  // Strip old frontmatter
  const body = oldContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '').trim();
  // Find the first non-empty, non-header, non-wiki-link-only line
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('---')) continue;
    // Skip "See [[X]] for Y" lines (Related section)
    if (trimmed.startsWith('See ') || trimmed.startsWith('- See ')) continue;
    // Skip "Related" header
    if (trimmed.match(/^##? Related|^Related/i)) continue;
    // Take the first real descriptive sentence
    const clean = trimmed.replace(/^-\s*"([^"]+)"\s*/, '$1').replace(/- /g, '').substring(0, 100);
    return clean;
  }
  return '';
}

function main() {
  // Collect page info
  const pages = [];
  const folders = ['entities', 'concepts', 'sources'];

  // Process each folder
  for (const folder of folders) {
    const dir = path.join(FIXTURE, folder);
    if (!fs.existsSync(dir)) {
      console.error(`  MISSING: ${dir}`);
      continue;
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
    for (const file of files) {
      const filepath = path.join(dir, file);
      const basename = file.replace(/\.md$/, '');
      const oldContent = fs.readFileSync(filepath, 'utf-8');
      const wikilinks = extractWikiLinks(oldContent);

      // Derive aliases: for entity pages, the person's full name might have
      // components as aliases. For concepts, abbreviations.
      const type = folder === 'entities' ? 'entity' : folder === 'concepts' ? 'concept' : 'source';
      const defaultTags = DEFAULT_TAGS[folder];
      const relPath = `${folder}/${basename}`;

      const firstPara = extractSummary(oldContent, wikilinks);
      const summary = firstPara || `Synthetic ${folder === 'concepts' ? 'concept' : folder === 'entities' ? 'entity' : 'source'} at Pinewood Heart Center.`;

      const aliases = generateAliases(basename, folder);
      // Build new frontmatter
      const newFm = generateFrontmatter(type, defaultTags, aliases);

      // Keep everything after the old frontmatter
      const bodyMatch = oldContent.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
      let body = oldContent;
      if (bodyMatch) {
        body = oldContent.slice(bodyMatch[0].length).trimStart();
      }

      const newContent = newFm + '\n\n' + body;
      fs.writeFileSync(filepath, newContent, 'utf-8');
      console.log(`  ${path.relative(FIXTURE, filepath)} ✓`);

      pages.push({ folder, basename, relPath, summary, wikilinks, type });
    }
  }

  // Generate index.md (matching wiki-engine.ts format)
  const entityPages = pages.filter(p => p.folder === 'entities');
  const conceptPages = pages.filter(p => p.folder === 'concepts');
  const sourcePages = pages.filter(p => p.folder === 'sources');

  let indexContent = `# Wiki Index\n\n`;
  indexContent += `> Evaluation fixture for v1.23.0 PPR cascade — synthetic Pinewood Heart Center knowledge base.\n\n`;
  indexContent += `> Note: Text in backticks after page names shows aliases — alternative names, abbreviations, or translations.\n\n`;

  indexContent += `## Entities\n\n`;
  for (const p of entityPages) {
    indexContent += `- [[entities/${p.basename}|${p.basename}]] - ${p.summary}\n`;
  }

  indexContent += `\n## Concepts\n\n`;
  for (const p of conceptPages) {
    indexContent += `- [[concepts/${p.basename}|${p.basename}]] - ${p.summary}\n`;
  }

  indexContent += `\n## Sources\n\n`;
  for (const p of sourcePages) {
    indexContent += `- [[sources/${p.basename}|${p.basename}]]\n`;
  }

  const indexPath = path.join(FIXTURE, 'index.md');
  fs.writeFileSync(indexPath, indexContent, 'utf-8');
  console.log(`  index.md ✓ (${entityPages.length} entities, ${conceptPages.length} concepts, ${sourcePages.length} sources)`);

  // Generate log.md (placeholder — only used for history)
  const logPath = path.join(FIXTURE, 'log.md');
  const logContent = `<!-- llm-wiki-log-header-start -->
# Pinewood Heart Center Wiki — Operation History

This log tracks ingestion and maintenance events for the synthetic evaluation fixture.

---

## [${TODAY} 00:00] Fixture generated
- Created ${pages.length} wiki pages for PPR cascade evaluation
- Generated with automated fixture-simulator tool
`;
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, logContent, 'utf-8');
    console.log(`  log.md ✓`);
  }

  // Update EVAL.md graph statistics
  const evalPath = path.join(FIXTURE, 'EVAL.md');
  if (fs.existsSync(evalPath)) {
    // Read EVAL and update stats to match current generated graph
    let evalContent = fs.readFileSync(evalPath, 'utf-8');
    const totalPages = pages.length;

    // Count all wiki-links
    const allLinks = pages.flatMap(p => p.wikilinks);
    // Deduplicate
    const dedupedLinks = [...new Set(allLinks)];
    // Count only links to pages within the fixture (not external/dead)
    const fixturePaths = new Set(pages.map(p => p.relPath));
    const validLinks = allLinks.filter(l => fixturePaths.has(l));
    const uniqueValidLinks = [...new Set(validLinks)];

    // Count edges in graph (unique (source, target) pairs)
    const edgePairs = new Set();
    for (const p of pages) {
      for (const link of p.wikilinks) {
        if (fixturePaths.has(link) && link !== p.relPath) {
          edgePairs.add(`${p.relPath}→${link}`);
        }
      }
    }

    // Compute degrees
    const outDegree = new Map();
    const inDegree = new Map();
    for (const p of pages) {
      outDegree.set(p.relPath, 0);
      inDegree.set(p.relPath, 0);
    }
    for (const p of pages) {
      let out = 0;
      for (const link of p.wikilinks) {
        if (fixturePaths.has(link) && link !== p.relPath) {
          out++;
          inDegree.set(link, (inDegree.get(link) || 0) + 1);
        }
      }
      outDegree.set(p.relPath, out);
    }

    const totalEdges = edgePairs.size;
    const isolated = pages.filter(p => (outDegree.get(p.relPath) || 0) === 0 && (inDegree.get(p.relPath) || 0) === 0);

    const entities = entityPages.length;
    const concepts = conceptPages.length;
    const sources = sourcePages.length;

    // Top-5 hubs by total degree
    const byDegree = pages.map(p => ({
      ...p,
      totalDegree: (outDegree.get(p.relPath) || 0) + (inDegree.get(p.relPath) || 0),
    })).sort((a, b) => b.totalDegree - a.totalDegree);

    console.log(`\nGraph statistics:`);
    console.log(`  Total pages: ${totalPages} (${entities} entities, ${concepts} concepts, ${sources} sources)`);
    console.log(`  Total edges: ${totalEdges}`);
    console.log(`  Isolated: ${isolated.length}`);
    console.log(`  Top-5 hubs: ${byDegree.slice(0, 5).map(p => `${p.relPath} (deg=${p.totalDegree})`).join(', ')}`);

    // Update the top-level stats section in EVAL.md
    const statsSection = `| Total pages | ${totalPages} | ${entities} sources + ${concepts} concepts + ${entities} entities |\n| Wiki-links (deduped) | 90–110 | Target ≈ 100 (edges/nodes ≈ 1.9) |`;
    evalContent = evalContent.replace(/^\| Total pages .*\n\| Wiki-links.*$/m, statsSection);
    fs.writeFileSync(evalPath, evalContent, 'utf-8');
    console.log(`  EVAL.md stats updated ✓`);
  }

  console.log(`\n✅ Fixture upgrade complete — ${pages.length} pages processed`);
}

main();
