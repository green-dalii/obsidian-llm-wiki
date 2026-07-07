// Tests for core/frontmatter.ts helpers — specifically the v1.24.0
// `mergeFrontmatterArrayField` helper that replaces the string-splice
// pattern in fix-runners.ts. The string-splice pattern produced
// duplicate `aliases:` / `tags:` lines when the page already had the
// field (incl. `aliases: []`), breaking YAML.
//
// mergeFrontmatterArrayField parses existing values, dedupes, and
// re-serializes through the canonical `serializeFrontmatter` writer
// so there's exactly one `aliases:` (or `tags:` / `sources:`) line
// in the output regardless of input shape.

import { describe, it, expect } from 'vitest';
import { mergeFrontmatterArrayField, replaceFrontmatterArrayField, parseFrontmatter, serializeFrontmatter } from '../../core/frontmatter';

describe('mergeFrontmatterArrayField (v1.24.0)', () => {
  describe('aliases field', () => {
    it('appends to existing inline aliases', () => {
      const before = '---\ntype: entity\naliases: [Existing]\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['Foo', 'Bar']);
      expect((after.match(/^aliases:/gm) || []).length).toBe(1);
      expect(after).toContain('Existing');
      expect(after).toContain('Foo');
      expect(after).toContain('Bar');
    });

    it('appends to existing empty aliases: [] placeholder', () => {
      const before = '---\ntype: entity\naliases: []\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['Foo']);
      expect((after.match(/^aliases:/gm) || []).length).toBe(1);
      expect(after).toContain('Foo');
      // Empty placeholder should be gone
      expect(after).not.toContain('aliases: []');
    });

    it('appends to existing block-style aliases', () => {
      const before = '---\ntype: entity\naliases:\n  - BlockAlias\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['Foo', 'Bar']);
      expect((after.match(/^aliases:/gm) || []).length).toBe(1);
      expect(after).toContain('BlockAlias');
      expect(after).toContain('Foo');
      expect(after).toContain('Bar');
    });

    it('dedupes when new items already exist', () => {
      const before = '---\ntype: entity\naliases: [A, B]\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['A', 'C', 'B']);
      expect(after).toContain('A');
      expect(after).toContain('B');
      expect(after).toContain('C');
      // Should still have only one A and one B (deduped)
      const aMatches = after.match(/['"]A['"]/g) || [];
      const bMatches = after.match(/['"]B['"]/g) || [];
      expect(aMatches.length).toBe(1);
      expect(bMatches.length).toBe(1);
    });

    it('returns original content when all new items already exist', () => {
      const before = '---\ntype: entity\naliases: [A, B]\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['A', 'B']);
      expect(after).toBe(before);
    });

    it('appends when aliases field is missing entirely', () => {
      const before = '---\ntype: entity\ntags: [ai]\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['Foo']);
      expect((after.match(/^aliases:/gm) || []).length).toBe(1);
      expect(after).toContain('Foo');
      // tags preserved
      expect(after).toMatch(/tags:/);
    });

    it('appends to block-style with empty entries', () => {
      const before = '---\ntype: entity\naliases:\n  - ""\n  - ""\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['Real']);
      expect((after.match(/^aliases:/gm) || []).length).toBe(1);
      expect(after).toContain('Real');
    });
  });

  describe('tags field (same pattern, sanity-check the helper is generic)', () => {
    it('appends to existing tags: []', () => {
      const before = '---\ntype: entity\ntags: []\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'tags', ['ai', 'ml']);
      expect((after.match(/^tags:/gm) || []).length).toBe(1);
      expect(after).toContain('ai');
      expect(after).toContain('ml');
    });
  });

  describe('sources field (another array field)', () => {
    it('appends to existing sources', () => {
      const before = '---\ntype: entity\nsources: [book.md]\n---\n\n# Body';
      const after = mergeFrontmatterArrayField(before, 'sources', ['paper.md']);
      expect((after.match(/^sources:/gm) || []).length).toBe(1);
      expect(after).toContain('book.md');
      expect(after).toContain('paper.md');
    });
  });

  describe('edge cases', () => {
    it('returns original when no items to add', () => {
      const before = '---\ntype: entity\n---\n\n# Body';
      expect(mergeFrontmatterArrayField(before, 'aliases', [])).toBe(before);
    });

    it('handles page with no frontmatter', () => {
      const before = '# Just body\n\nNo frontmatter here.';
      const after = mergeFrontmatterArrayField(before, 'aliases', ['Foo']);
      expect(after).toContain('---');
      expect(after).toContain('Foo');
    });

    it('does not duplicate when called twice with overlapping items', () => {
      const first = mergeFrontmatterArrayField(
        '---\ntype: entity\n---\n\n# Body',
        'aliases',
        ['Foo', 'Bar']
      );
      const second = mergeFrontmatterArrayField(first, 'aliases', ['Bar', 'Baz']);
      // Must have Foo, Bar, Baz — exactly once each
      const allMatches = (second.match(/^aliases:/gm) || []).length;
      expect(allMatches).toBe(1);
      expect(second).toContain('Foo');
      expect(second).toContain('Bar');
      expect(second).toContain('Baz');
      const fooMatches = second.match(/['"]Foo['"]/g) || [];
      expect(fooMatches.length).toBe(1);
    });
  });

  describe('parser/serializer sanity (no merge)', () => {
    it('parseFrontmatter handles aliases: [] as empty array', () => {
      const fm = parseFrontmatter('---\ntype: entity\naliases: []\n---\n\n# Body');
      expect(fm).not.toBeNull();
      expect(fm!.aliases).toEqual([]);
    });

    it('serializeFrontmatter emits block-style for non-empty array', () => {
      const out = serializeFrontmatter({
        type: 'entity',
        aliases: ['A', 'B'],
      });
      expect(out).toMatch(/^---\n/);
      expect(out).toMatch(/aliases:/);
      expect(out).toContain('"A"');
      expect(out).toContain('"B"');
    });

    it('serializeFrontmatter skips empty array by default', () => {
      const out = serializeFrontmatter({
        type: 'entity',
        aliases: [],
      });
      expect(out).not.toContain('aliases');
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// replaceFrontmatterArrayField (v1.24.0) — full replacement semantic
// for runRetagViolations. Different from merge: rewrite the array
// instead of appending.
// ─────────────────────────────────────────────────────────────────

describe('replaceFrontmatterArrayField (v1.24.0)', () => {
  // Helper: tags emitted by serializeFrontmatter wrap string values in `"..."`.
  // Both forms are valid YAML and Obsidian parses them identically.
  const hasNewTag = (s: string, tag: string) =>
    s.includes(`tags:\n  - "${tag}"`) || s.includes(`tags: [${tag}]`);

  it('replaces existing tags with new array (drops old entries not in new)', () => {
    const before = '---\ntype: entity\ntags: [old1, old2, old3]\n---\n\n# Body';
    const after = replaceFrontmatterArrayField(before, 'tags', ['new1']);
    expect(after).not.toContain('old1');
    expect(after).not.toContain('old2');
    expect(after).not.toContain('old3');
    expect(hasNewTag(after, 'new1')).toBe(true);
  });

  it('drops the field when newItems is empty', () => {
    const before = '---\ntype: entity\ntags: [a, b]\n---\n\n# Body';
    const after = replaceFrontmatterArrayField(before, 'tags', []);
    expect(after).not.toContain('tags');
  });

  it('replaces block-style tags', () => {
    const before = '---\ntype: entity\ntags:\n  - old1\n  - old2\n---\n\n# Body';
    const after = replaceFrontmatterArrayField(before, 'tags', ['new1']);
    expect(after).not.toContain('old1');
    expect(after).not.toContain('old2');
    expect(hasNewTag(after, 'new1')).toBe(true);
  });

  it('handles missing field (adds it)', () => {
    const before = '---\ntype: entity\n---\n\n# Body';
    const after = replaceFrontmatterArrayField(before, 'tags', ['new']);
    expect(hasNewTag(after, 'new')).toBe(true);
  });
});