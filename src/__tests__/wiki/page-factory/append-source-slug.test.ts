// Coverage for the #399 fix in appendSourceSlugToFrontmatter — the
// v1.25.11 provenance stamp previously inserted a duplicate block-style
// `sources:` key when the existing key was flow-style, producing invalid
// YAML. The fix detects flow-style and merges into it (re-emitting as
// block-style canonical shape).
//
// PR #405 review update: block-style entries MUST be double-quoted
// (`  - "[[value]]"`), not bare (`  - [[value]]`). The bare form is
// YAML-parsed as a NESTED flow sequence, not a string, which breaks
// Obsidian's Properties panel + backlinks + graph edges. The tests
// below assert the quoted output AND parse the resulting frontmatter
// with a real YAML parser (yaml, YAML 1.2 — same spec as js-yaml which
// Obsidian uses under the hood) to guarantee `sources` is `string[]`.

import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { appendSourceSlugToFrontmatter } from '../../../wiki/page-factory/create-page';

/** Extract the first `---`-delimited frontmatter block and YAML-parse it. */
function parseFrontmatter(content: string): Record<string, unknown> {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('no frontmatter block found');
  return parseYaml(m[1]) as Record<string, unknown>;
}

describe('appendSourceSlugToFrontmatter (#399)', () => {
  it('merges into an existing FLOW-style sources key (single entry) — re-emits as block-style, no duplicate key', () => {
    const before = [
      '---',
      'type: concept',
      'sources: ["[[sources/Existing]]"]',
      'tags: [term]',
      '---',
      '',
      '# Title',
      '',
    ].join('\n');
    const out = appendSourceSlugToFrontmatter(before, 'New-Source_abcdef');
    // Exactly ONE sources: key
    const sourcesKeys = out.split('\n').filter(l => /^sources:/.test(l));
    expect(sourcesKeys.length).toBe(1);
    // Block-style with both entries preserved, in insertion order — QUOTED (see PR #405)
    expect(out).toContain('sources:\n  - "[[sources/Existing]]"\n  - "[[sources/New-Source_abcdef]]"');
  });

  it('merges into an existing FLOW-style sources key (multiple entries)', () => {
    const before = [
      '---',
      'type: concept',
      'sources: ["[[sources/A]]", "[[sources/B]]"]',
      'tags: [term]',
      '---',
      '',
      '# Title',
      '',
    ].join('\n');
    const out = appendSourceSlugToFrontmatter(before, 'C');
    const sourcesKeys = out.split('\n').filter(l => /^sources:/.test(l));
    expect(sourcesKeys.length).toBe(1);
    expect(out).toContain('sources:\n  - "[[sources/A]]"\n  - "[[sources/B]]"\n  - "[[sources/C]]"');
  });

  it('is idempotent when the new source is already present in flow-style', () => {
    const before = [
      '---',
      'type: concept',
      'sources: ["[[sources/Existing]]"]',
      'tags: [term]',
      '---',
      '',
      '# Title',
      '',
    ].join('\n');
    const out = appendSourceSlugToFrontmatter(before, 'Existing');
    // Unchanged
    expect(out).toBe(before);
  });

  it('still handles the block-style existing sources key (regression guard)', () => {
    const before = [
      '---',
      'type: concept',
      'sources:',
      '  - "[[sources/Existing]]"',
      'tags: [term]',
      '---',
      '',
      '# Title',
      '',
    ].join('\n');
    const out = appendSourceSlugToFrontmatter(before, 'New');
    const sourcesKeys = out.split('\n').filter(l => /^sources:/.test(l));
    expect(sourcesKeys.length).toBe(1);
    expect(out).toContain('sources:\n  - "[[sources/Existing]]"\n  - "[[sources/New]]"');
  });

  it('inserts a fresh block-style sources: when the key is absent', () => {
    const before = [
      '---',
      'type: concept',
      'tags: [term]',
      '---',
      '',
      '# Title',
      '',
    ].join('\n');
    const out = appendSourceSlugToFrontmatter(before, 'First');
    expect(out).toContain('sources:\n  - "[[sources/First]]"');
    expect(out).toContain('tags: [term]');
  });

  // PR #405 review — parser-shape regression guard.
  //
  // The string `contains` assertions above would silently pass even if the
  // emitted format were unquoted (`- [[value]]`), which YAML parses as a
  // nested flow sequence instead of a string and breaks user-visible output
  // in Obsidian's Properties panel. These tests parse the resulting
  // frontmatter with a real YAML parser and assert `sources` is a flat
  // string array — the shape Obsidian's property-type detection needs.
  describe('PR #405: parser-shape guard — sources must be string[], not nested array', () => {
    it('flow → block merge produces sources parseable as string[]', () => {
      const before = [
        '---',
        'type: concept',
        'sources: ["[[sources/Existing]]"]',
        'tags: [term]',
        '---',
        '',
        '# Title',
        '',
      ].join('\n');
      const out = appendSourceSlugToFrontmatter(before, 'New');
      const parsed = parseFrontmatter(out);
      const sources = parsed.sources;
      expect(Array.isArray(sources)).toBe(true);
      // Every entry must be a plain string containing the wikilink literal.
      // A nested-array bug would surface here as `[["sources/Existing"]]`.
      for (const entry of sources as unknown[]) {
        expect(typeof entry).toBe('string');
        expect(entry as string).toMatch(/^\[\[sources\/.+\]\]$/);
      }
      expect(sources).toEqual([
        '[[sources/Existing]]',
        '[[sources/New]]',
      ]);
    });

    it('fresh insertion produces sources parseable as string[]', () => {
      const before = [
        '---',
        'type: concept',
        'tags: [term]',
        '---',
        '',
        '# Title',
        '',
      ].join('\n');
      const out = appendSourceSlugToFrontmatter(before, 'First');
      const parsed = parseFrontmatter(out);
      expect(parsed.sources).toEqual(['[[sources/First]]']);
    });

    it('block-style merge stays parseable as string[]', () => {
      const before = [
        '---',
        'type: concept',
        'sources:',
        '  - "[[sources/Existing]]"',
        'tags: [term]',
        '---',
        '',
        '# Title',
        '',
      ].join('\n');
      const out = appendSourceSlugToFrontmatter(before, 'New');
      const parsed = parseFrontmatter(out);
      expect(parsed.sources).toEqual([
        '[[sources/Existing]]',
        '[[sources/New]]',
      ]);
    });
  });
});
