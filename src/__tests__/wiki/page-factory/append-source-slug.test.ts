// Coverage for the #399 fix in appendSourceSlugToFrontmatter — the
// v1.25.11 provenance stamp previously inserted a duplicate block-style
// `sources:` key when the existing key was flow-style, producing invalid
// YAML. The fix detects flow-style and merges into it (re-emitting as
// block-style canonical shape).

import { describe, it, expect } from 'vitest';
import { appendSourceSlugToFrontmatter } from '../../../wiki/page-factory/create-page';

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
    // Block-style with both entries preserved, in insertion order
    expect(out).toContain('sources:\n  - [[sources/Existing]]\n  - [[sources/New-Source_abcdef]]');
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
    expect(out).toContain('sources:\n  - [[sources/A]]\n  - [[sources/B]]\n  - [[sources/C]]');
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
      '  - [[sources/Existing]]',
      'tags: [term]',
      '---',
      '',
      '# Title',
      '',
    ].join('\n');
    const out = appendSourceSlugToFrontmatter(before, 'New');
    const sourcesKeys = out.split('\n').filter(l => /^sources:/.test(l));
    expect(sourcesKeys.length).toBe(1);
    expect(out).toContain('sources:\n  - [[sources/Existing]]\n  - [[sources/New]]');
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
    expect(out).toContain('sources:\n  - [[sources/First]]');
    expect(out).toContain('tags: [term]');
  });
});
