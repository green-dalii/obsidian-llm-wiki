import { describe, it, expect } from 'vitest';
import { normalizeSourcePath, normalizeSourcesField, scanPollutedSources, fixPollutedSources } from '../core/sources-normalizer';

/**
 * Tests for Issue #81: sources field normalize
 *
 * Real-world pollution patterns provided by DocTpoint:
 * - "[[Notizen/X.md]]"          → remove entirely (external path)
 * - "[[sources/X.md]]"          → [[sources/X]]  (strip .md)
 * - "[[sources/X|X]]"           → [[sources/X]]  (strip alias pipe)
 * - duplicates of above          → deduplicate
 * - inline array format           → same rules
 * - "[[]]"                       → remove (empty link)
 */

const WIKI = 'wiki';

describe('normalizeSourcePath', () => {
  it('strips [[ ]] brackets', () => {
    expect(normalizeSourcePath('[[sources/Vitamin-B2]]', WIKI)).toBe('sources/Vitamin-B2');
  });

  it('strips .md extension', () => {
    expect(normalizeSourcePath('sources/Glycin.md', WIKI)).toBe('sources/Glycin');
  });

  it('strips |alias pipe', () => {
    expect(normalizeSourcePath('sources/Transformer|Transformer', WIKI)).toBe('sources/Transformer');
  });

  it('removes external (non-wiki) paths and remaps to sources/', () => {
    expect(normalizeSourcePath('Notizen/Glycin.md', WIKI)).toBe('sources/Glycin');
  });

  it('returns empty string for empty link [[]]', () => {
    expect(normalizeSourcePath('[[]]', WIKI)).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeSourcePath('   ', WIKI)).toBe('');
  });

  it('strips wiki/ prefix from internal paths', () => {
    expect(normalizeSourcePath('wiki/sources/Foo', WIKI)).toBe('sources/Foo');
  });

  it('preserves entities/ paths without modification', () => {
    expect(normalizeSourcePath('entities/Some-Entity', WIKI)).toBe('entities/Some-Entity');
  });

  it('preserves concepts/ paths without modification', () => {
    expect(normalizeSourcePath('concepts/Some-Concept', WIKI)).toBe('concepts/Some-Concept');
  });

  it('handles custom wikiFolder', () => {
    expect(normalizeSourcePath('Notes/Foo.md', 'my-wiki')).toBe('sources/Foo');
  });
});

describe('normalizeSourcesField', () => {
  it('deduplicates equivalent sources after normalization', () => {
    const input = ['[[sources/X]]', '[[sources/X.md]]', '[[sources/X|X]]'];
    expect(normalizeSourcesField(input, WIKI)).toEqual(['[[sources/X]]']);
  });

  it('removes external paths and keeps internal ones', () => {
    const input = ['[[Notizen/Glycin.md]]', '[[sources/Glycin]]'];
    expect(normalizeSourcesField(input, WIKI)).toEqual(['[[sources/Glycin]]']);
  });

  it('removes empty links', () => {
    const input = ['[[]]', '[[sources/Foo]]'];
    expect(normalizeSourcesField(input, WIKI)).toEqual(['[[sources/Foo]]']);
  });

  it('preserves different sources as separate entries', () => {
    const input = ['[[sources/A]]', '[[sources/B]]'];
    expect(normalizeSourcesField(input, WIKI)).toEqual(['[[sources/A]]', '[[sources/B]]']);
  });

  it('preserves entities/concepts/sources internal paths intact', () => {
    const input = ['[[entities/X]]', '[[concepts/Y]]', '[[sources/Z]]'];
    expect(normalizeSourcesField(input, WIKI)).toEqual([
      '[[entities/X]]',
      '[[concepts/Y]]',
      '[[sources/Z]]',
    ]);
  });
});

describe('scanPollutedSources', () => {
  it('returns true for content with polluted sources field', () => {
    const content = `---
type: entity
sources: ["[[Notizen/Foo.md]]", "[[sources/Foo.md]]", "[[sources/Foo]]"]
---

# Foo`;
    expect(scanPollutedSources(content, WIKI)).toBe(true);
  });

  it('returns false for already-clean content', () => {
    const content = `---
type: entity
sources: ["[[sources/Foo]]"]
---

# Foo`;
    expect(scanPollutedSources(content, WIKI)).toBe(false);
  });

  it('returns false for content without sources field', () => {
    const content = `---
type: entity
---

# Foo`;
    expect(scanPollutedSources(content, WIKI)).toBe(false);
  });
});

describe('fixPollutedSources', () => {
  it('normalizes and deduplicates sources field', () => {
    const content = `---
type: entity
sources: ["[[Notizen/Glycin.md]]", "[[sources/Glycin.md]]", "[[sources/Glycin]]"]
---

# Glycin`;
    const { fixed, content: fixed_content } = fixPollutedSources(content, WIKI);
    expect(fixed).toBe(1); // 1 successful fixPollutedSources call — content actually changed
    expect(fixed_content).toContain('sources: ["[[sources/Glycin]]"]');
  });

  it('is idempotent — running twice produces same output', () => {
    const content = `---
type: entity
sources: ["[[Notizen/Foo.md]]", "[[sources/Foo.md]]"]
---

# Foo`;
    const first = fixPollutedSources(content, WIKI);
    const second = fixPollutedSources(first.content, WIKI);
    expect(second.fixed).toBe(0);
    expect(second.content).toBe(first.content);
  });

  it('handles inline array format (DocTpoint edge case)', () => {
    const content = `---
type: entity
sources: ["[[Notizen/Foo.md]]", "[[sources/Foo]]"]
---

# Foo`;
    const { content: fixed_content } = fixPollutedSources(content, WIKI);
    expect(fixed_content).toContain('"[[sources/Foo]]"');
    expect(fixed_content).not.toContain('Notizen');
  });

  it('returns fixed=0 and unchanged content for already-clean sources', () => {
    const content = `---
type: entity
sources: ["[[sources/Foo]]"]
---

# Foo`;
    const { fixed, content: fixed_content } = fixPollutedSources(content, WIKI);
    expect(fixed).toBe(0);
    expect(fixed_content).toBe(content);
  });

  // ── Multi-line format (the dominant format in real vaults) ──

  it('normalizes and deduplicates multi-line sources field', () => {
    const content = `---
type: entity
created: 2024-01-01
sources:
  - "[[Notizen/Glycin.md]]"
  - "[[sources/Glycin.md]]"
  - "[[sources/Glycin]]"
updated: 2024-01-01
tags: [other]
---

# Glycin`;
    const { fixed, content: fixed_content } = fixPollutedSources(content, WIKI);
    // CRITICAL: content must actually change. If the fixPollutedSources returned the
    // original content unchanged, scanPollutedSources would still return true on re-scan
    // and the count would never decrease — exactly the "stuck counter" bug.
    expect(fixed).toBe(1);
    expect(fixed_content).not.toBe(content);                  // actual mutation happened
    expect(fixed_content).not.toContain('Notizen');            // external path removed
    expect(fixed_content).toContain('"[[sources/Glycin]]"');   // canonical form
    expect(fixed_content).not.toContain('"[[sources/Glycin.md]]"');  // .md stripped
    // Re-scan on the FIXED content must report clean
    expect(scanPollutedSources(fixed_content, WIKI)).toBe(false);
  });

  it('multi-line fix is idempotent — second run produces identical content and fixed=0', () => {
    const content = `---
type: entity
sources:
  - "[[Notizen/Foo.md]]"
  - "[[sources/Foo.md]]"
---

# Foo`;
    const first = fixPollutedSources(content, WIKI);
    // First fix MUST actually change the content
    expect(first.fixed).toBe(1);
    expect(first.content).not.toBe(content);
    // Re-scan on the fixed content must be clean
    expect(scanPollutedSources(first.content, WIKI)).toBe(false);
    // Second fix must be no-op
    const second = fixPollutedSources(first.content, WIKI);
    expect(second.fixed).toBe(0);
    expect(second.content).toBe(first.content);
  });

  it('preserves other frontmatter fields when normalizing multi-line sources', () => {
    const content = `---
type: entity
created: 2024-01-01
sources:
  - "[[Notizen/Foo.md]]"
  - "[[sources/Foo.md]]"
updated: 2024-01-02
tags: [other]
aliases:
  - "Foo alias"
---

# Foo`;
    const { fixed, content: fixed_content } = fixPollutedSources(content, WIKI);
    expect(fixed).toBe(1);
    expect(fixed_content).toContain('created: 2024-01-01');
    expect(fixed_content).toContain('updated: 2024-01-02');
    expect(fixed_content).toContain('tags: [other]');
    expect(fixed_content).toContain('aliases:');
    expect(fixed_content).toContain('"Foo alias"');
    expect(fixed_content).toContain('"[[sources/Foo]]"');
    expect(fixed_content).not.toContain('Notizen');
  });
});
