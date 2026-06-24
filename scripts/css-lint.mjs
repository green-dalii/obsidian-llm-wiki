#!/usr/bin/env node
/**
 * CSS lint — catches Obsidian review warnings before release.
 *
 * Current rules:
 *   1. No `!important` (Obsidian review bot flags it; use chained selector instead)
 *   2. No `:has(` (Obsidian review bot warns — :has causes broad selector
 *      invalidation, perf cost when content changes inside the matched subtree)
 *
 * Exit code:
 *   0 — no violations
 *   1 — at least one violation (CI fails the build)
 *
 * Usage:
 *   node scripts/css-lint.mjs              # check styles.css
 *   node scripts/css-lint.mjs path/to.css  # check a custom file
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = process.argv[2] || 'styles.css';
const file = resolve(target);

let src;
try {
  src = readFileSync(file, 'utf8');
} catch (err) {
  console.error(`✗ css-lint: cannot read ${file}: ${err.message}`);
  process.exit(1);
}

const violations = [];

// Rule 1: !important
for (let i = 0; i < src.split('\n').length; i++) {
  const line = src.split('\n')[i];
  if (line.includes('!important')) {
    violations.push({
      rule: 'no-important',
      line: i + 1,
      detail: line.trim(),
      message: 'Avoid !important — Obsidian review bot flags it. Use a chained selector for higher specificity instead.',
    });
  }
}

// Rule 2: :has() selector — only flag in actual selector context.
// Match lines that look like CSS rule selectors (i.e. content before `{`)
// to avoid false positives in comments and prose.
const lines = src.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip pure comment lines (start with /*, *, or //)
  const trimmed = line.trim();
  if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) continue;
  // Skip if line is inside a multi-line comment block — find the surrounding block
  // by scanning backward for the most recent /* without a matching */
  let inComment = false;
  for (let j = i - 1; j >= 0; j--) {
    const prev = lines[j].trim();
    if (prev.endsWith('*/')) break;
    if (prev.startsWith('/*') || prev.includes('/*')) {
      inComment = true;
      break;
    }
  }
  if (inComment) continue;
  // Only flag if the line looks like a selector (not a property declaration)
  // Heuristic: line either ends with `{` or has `{` somewhere later AND does NOT
  // start with a CSS property name + `:`. The simplest robust check: skip lines
  // that contain `: ` (property-value separator) UNLESS they're clearly selectors.
  if (line.includes(':has(')) {
    // Allow `:has(` only inside `url()`, attr selectors, etc. We flag any occurrence.
    violations.push({
      rule: 'no-has-selector',
      line: i + 1,
      detail: line.trim(),
      message: 'Avoid :has() — Obsidian review warns it causes significant perf issues via broad selector invalidation. Use a direct class selector on the parent element instead.',
    });
  }
}

if (violations.length === 0) {
  console.log(`✓ css-lint: ${file} passed (0 violations)`);
  process.exit(0);
}

console.error(`✗ css-lint: ${file} — ${violations.length} violation(s)\n`);
for (const v of violations) {
  console.error(`  ${file}:${v.line}  [${v.rule}]  ${v.detail}`);
  console.error(`    → ${v.message}\n`);
}
process.exit(1);