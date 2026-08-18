import { describe, it, expect } from 'vitest';
import { clampPageSections, restoreWithheldSections } from '../../core/clamp-page-sections';

const page = [
  '---',
  'type: entity',
  'tags: [x]',
  '---',
  '',
  '# Sulforaphane',
  '',
  'Lead paragraph.',
  '',
  '## Description',
  'D'.repeat(200),
  '',
  '## Related Entities',
  'R'.repeat(200),
  '',
  '## Mentions',
  'M'.repeat(200),
].join('\n');

describe('clampPageSections', () => {
  it('returns the input byte-identical when it fits', () => {
    const out = clampPageSections(page, 10_000);
    expect(out.text).toBe(page);
    expect(out.withheld).toEqual([]);
    expect(out.hardCut).toBe(false);
  });

  it('treats a budget of 0 as no clamp', () => {
    expect(clampPageSections(page, 0).text).toBe(page);
  });

  it('drops whole sections from the end, never mid-sentence', () => {
    const out = clampPageSections(page, 400);
    expect(out.text).toContain('## Description');
    expect(out.text).not.toContain('## Mentions\nM');
    expect(out.hardCut).toBe(false);
    // Nothing kept is a fragment: every retained section is present in full.
    expect(out.text).toContain('D'.repeat(200));
  });

  it('names the omitted sections in the prompt text', () => {
    const out = clampPageSections(page, 400);
    expect(out.text).toMatch(/section\(s\) omitted here for length/);
    expect(out.text).toContain('Mentions');
  });

  it('returns the withheld sections verbatim and in document order', () => {
    const out = clampPageSections(page, 400);
    expect(out.withheld.length).toBeGreaterThan(0);
    expect(out.withheld[0].startsWith('## ')).toBe(true);
    expect(out.withheld.join('\n')).toContain('M'.repeat(200));
    const order = out.withheld.map(s => s.split('\n', 1)[0]);
    expect(order).toEqual([...order].sort((a, b) => page.indexOf(a) - page.indexOf(b)));
  });

  it('keeps the preamble even when every section is dropped', () => {
    // Budget above the preamble (64 chars) but below the first section.
    const out = clampPageSections(page, 100);
    expect(out.text).toContain('type: entity');
    expect(out.withheld).toHaveLength(3);
    expect(out.hardCut).toBe(false);
  });

  it('flags a hard cut when there is no section boundary to cut at', () => {
    const flat = 'x'.repeat(5000);
    const out = clampPageSections(flat, 100);
    expect(out.hardCut).toBe(true);
    expect(out.withheld).toEqual([]);
    expect(out.text).toContain('truncated here for length');
    expect(out.text.length).toBeLessThanOrEqual(100);
  });

  it('does not reorder: a short tail section is not kept after a long one is dropped', () => {
    const p = ['## A', 'a'.repeat(300), '## B', 'b'.repeat(300), '## C', 'c'].join('\n');
    const out = clampPageSections(p, 320);
    expect(out.withheld.map(s => s.split('\n', 1)[0])).toEqual(['## B', '## C']);
  });
});

describe('restoreWithheldSections', () => {
  it('is a no-op when nothing was withheld', () => {
    expect(restoreWithheldSections('# Page\n\nbody', [])).toBe('# Page\n\nbody');
  });

  it('puts the withheld sections back after a rewrite', () => {
    const out = clampPageSections(page, 400);
    const rewritten = '---\ntype: entity\n---\n\n# Sulforaphane\n\nRepaired.\n\n## Description\nnew';
    const restored = restoreWithheldSections(rewritten, out.withheld);
    for (const section of out.withheld) expect(restored).toContain(section);
    expect(restored).toContain('Repaired.');
  });

  it('round-trips every byte of a clamped page through prompt and restore', () => {
    const out = clampPageSections(page, 400);
    const restored = restoreWithheldSections(out.text.split('\n\n[')[0], out.withheld);
    for (const section of ['## Description', '## Related Entities', '## Mentions']) {
      expect(restored).toContain(section);
    }
  });
});
