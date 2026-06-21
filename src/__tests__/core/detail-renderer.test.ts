import { describe, it, expect } from 'vitest';
import { parseDetailRows, parseContradictionRows } from '../../core/detail-renderer';

describe('parseDetailRows — structured renderer for lint details', () => {
  it('returns empty array for undefined details', () => {
    expect(parseDetailRows(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseDetailRows('')).toEqual([]);
  });

  it('parses a single bulleted line with one wiki link', () => {
    const rows = parseDetailRows('- [[entities/Foo]]: fixed 3 polluted sources.');
    expect(rows).toHaveLength(1);
    expect(rows[0].isBullet).toBe(true);
    expect(rows[0].links).toEqual([{ path: 'entities/Foo', alias: undefined }]);
    // textWithoutLinks preserves the bullet prefix; callers strip it for rendering
    expect(rows[0].textWithoutLinks).toBe('- : fixed 3 polluted sources.');
  });

  it('parses a bulleted line with multiple wiki links', () => {
    const rows = parseDetailRows('- Linked [[entities/A]] from [[entities/B]] and [[entities/C]].');
    expect(rows[0].links.map((l) => l.path)).toEqual(['entities/A', 'entities/B', 'entities/C']);
  });

  it('handles aliased wiki links `[[path|alias]]`', () => {
    const rows = parseDetailRows('- [[entities/Foo|the Foo entity]] retagged');
    expect(rows[0].links[0]).toEqual({ path: 'entities/Foo', alias: 'the Foo entity' });
  });

  it('parses non-bulleted lines as plain rows', () => {
    const rows = parseDetailRows('Plain summary line');
    expect(rows[0].isBullet).toBe(false);
    expect(rows[0].links).toEqual([]);
    expect(rows[0].textWithoutLinks).toBe('Plain summary line');
  });

  it('strips empty / whitespace-only lines', () => {
    const rows = parseDetailRows('- first\n\n   \n- second');
    expect(rows).toHaveLength(2);
    // textWithoutLinks preserves the bullet prefix; renderer trims for display
    expect(rows[0].textWithoutLinks).toBe('- first');
    expect(rows[1].textWithoutLinks).toBe('- second');
  });

  it('preserves raw original line for fallback rendering', () => {
    const rows = parseDetailRows('- [[entities/Foo]]: cleaned 5 dead links.');
    expect(rows[0].raw).toBe('- [[entities/Foo]]: cleaned 5 dead links.');
  });

  it('handles the exact lint-fix-runners output format', () => {
    // Real-world format from fix-runners.ts: `- [[path]]: summary.`
    const details = [
      '- [[entities/Foo]]: added 3 aliases',
      '- [[entities/Bar]]: `[[baz]]` → [[qux]]',
      '- [[entities/Qux]]: no change',
    ].join('\n');
    const rows = parseDetailRows(details);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.isBullet)).toBe(true);
    expect(rows[0].links[0].path).toBe('entities/Foo');
    // The "Bar" line has THREE wiki links: the page itself + the broken-link target
    // + the fixed-link target. All should be extracted in order.
    expect(rows[1].links.map((l) => l.path)).toEqual(['entities/Bar', 'baz', 'qux']);
  });
});

describe('parseContradictionRows — structured renderer for contradictions', () => {
  it('returns empty array for no contradictions', () => {
    expect(parseContradictionRows([])).toEqual([]);
  });

  it('extracts wiki links from each contradiction line', () => {
    const rows = parseContradictionRows([
      '`[[entities/A]]` says X but `[[entities/B]]` says Y',
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].links.map((l) => l.path)).toEqual(['entities/A', 'entities/B']);
    expect(rows[0].text).not.toContain('[[');
  });

  it('skips empty / whitespace-only contradiction lines', () => {
    const rows = parseContradictionRows(['first', '', '   ', 'second']);
    expect(rows).toHaveLength(2);
  });
});
