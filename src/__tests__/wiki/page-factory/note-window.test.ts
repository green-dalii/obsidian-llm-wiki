import { describe, it, expect } from 'vitest';
import { buildNoteExcerpt, renderNoteExcerptBlock, EXCERPT_MAX_CHARS } from '../../../wiki/page-factory/note-window';

describe('buildNoteExcerpt', () => {
  const body = [
    'Intro paragraph about the topic in general.',
    'Die Cholesterin-Hypothese hält sich hartnäckig, obwohl Statine primärpräventiv überschätzt sind.',
    'Ein Absatz über Vitamin D und die Endocrine Society.',
    'Schlussabsatz ohne Namen.',
  ].join('\n\n');

  it('selects only paragraphs mentioning the page name', () => {
    const out = buildNoteExcerpt(body, { pageName: 'Statine' });
    expect(out).toContain('Cholesterin-Hypothese');
    expect(out).not.toContain('Vitamin D');
    expect(out).not.toContain('Intro paragraph');
  });

  it('matches hyphen/space variants of slugged page names', () => {
    const prose = 'Die Sugar Industry bezahlte Forscher.\n\nAnderes Thema.';
    expect(buildNoteExcerpt(prose, { pageName: 'Sugar-Industry' })).toContain('bezahlte Forscher');
  });

  it('matches via aliases, case-insensitively', () => {
    const prose = 'Der LDL-Wert allein trägt nicht das ganze Bild.\n\nAnderes.';
    expect(buildNoteExcerpt(prose, { pageName: 'Low-Density-Lipoprotein', aliases: ['ldl'] }))
      .toContain('ganze Bild');
  });

  it('returns "" when nothing matches — callers keep the prompt unchanged', () => {
    expect(buildNoteExcerpt(body, { pageName: 'Quantenphysik' })).toBe('');
    expect(renderNoteExcerptBlock('', 'Quantenphysik')).toBe('');
  });

  it('ignores needles shorter than 3 chars instead of matching everything', () => {
    expect(buildNoteExcerpt(body, { pageName: 'D', aliases: ['ie'] })).toBe('');
  });

  it('full-note mode returns the whole body and caps with a truncation mark', () => {
    expect(buildNoteExcerpt(body, { pageName: 'Egal', fullNote: true })).toBe(body);
    const long = 'x'.repeat(50);
    const out = buildNoteExcerpt(long, { pageName: 'Egal', fullNote: true, maxChars: 10 });
    expect(out.startsWith('xxxxxxxxxx')).toBe(true);
    expect(out).toContain('[…]');
  });

  it('caps the matched window and marks the cut', () => {
    const para = 'Statine sind relevant. ' + 'y'.repeat(300);
    const many = Array.from({ length: 30 }, () => para).join('\n\n');
    const out = buildNoteExcerpt(many, { pageName: 'Statine', maxChars: 1000 });
    expect(out.length).toBeLessThanOrEqual(1000 + 10);
    expect(out).toContain('[…]');
  });

  it('default cap constant is used for the window mode', () => {
    expect(EXCERPT_MAX_CHARS).toBe(4000);
  });
});

describe('renderNoteExcerptBlock', () => {
  it('wraps the excerpt in a labeled prompt block', () => {
    const block = renderNoteExcerptBlock('Fakt eins.', 'Statine');
    expect(block).toContain('"Statine"');
    expect(block).toContain('Fakt eins.');
    expect(block.startsWith('\n\n**')).toBe(true);
  });
});
