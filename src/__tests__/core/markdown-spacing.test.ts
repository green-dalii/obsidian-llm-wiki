import { describe, it, expect } from 'vitest';
import { normalizeHeadingSpacing } from '../../core/markdown-spacing';

describe('normalizeHeadingSpacing', () => {
  it('inserts a blank line between a heading and its glued content', () => {
    expect(normalizeHeadingSpacing('## Definition\nDer 6MWT ist ein Feldtest.'))
      .toBe('## Definition\n\nDer 6MWT ist ein Feldtest.');
  });

  it('keeps normalized content unchanged and stays idempotent (same reference)', () => {
    const ok = '# Titel\n\n## Definition\n\nText.\n';
    expect(normalizeHeadingSpacing(ok)).toBe(ok);
    const once = normalizeHeadingSpacing('## A\nText');
    expect(normalizeHeadingSpacing(once)).toBe(once);
  });

  it('collapses runs of blank lines to a single one', () => {
    expect(normalizeHeadingSpacing('---\ntype: concept\n---\n\n\n\n# Titel\n\nText.'))
      .toBe('---\ntype: concept\n---\n\n# Titel\n\nText.');
  });

  it('leaves the frontmatter block untouched', () => {
    const fm = '---\ntags:\n  - "Thema/Diagnostik"\n---\n\n# Titel\n\nText.';
    expect(normalizeHeadingSpacing(fm)).toBe(fm);
  });

  it('leaves fenced code blocks untouched', () => {
    const fenced = 'Text.\n\n```\n# kein Heading\ncode\n```\n\nWeiter.';
    expect(normalizeHeadingSpacing(fenced)).toBe(fenced);
  });

  it('treats a heading followed by a blank line as already correct', () => {
    const ok = '## Anwendungen\n\n- Punkt eins.';
    expect(normalizeHeadingSpacing(ok)).toBe(ok);
  });

  it('handles a heading as the last line without appending anything', () => {
    expect(normalizeHeadingSpacing('Text.\n\n## Offen')).toBe('Text.\n\n## Offen');
  });
});
