// The candidate window (`core/candidate-window.ts`): one ranked list for every
// prompt that shows the model "existing pages". These tests pin the contract
// the two call sites (semantic dedup, Fix Dead Links) rely on — not the hit
// rate, which is a measurement over a vault, but the mechanics that produced
// it: prose counts, function words do not, ties keep pool order, the window
// is always K.

import { describe, it, expect } from 'vitest';
import { selectCandidateWindow, contextKeywords, contextAround } from '../../core/candidate-window';
import { CANDIDATE_WINDOW_TOP_K } from '../../constants';

interface P { path: string; title: string; aliases?: string[]; text?: string }
const page = (title: string, text?: string, aliases?: string[]): P =>
  ({ path: `wiki/entities/${title}.md`, title, aliases, text });

describe('contextKeywords', () => {
  it('keeps words of five or more characters, once each, lower-cased', () => {
    expect(contextKeywords('Die Darm-Hirn-Achse verbindet Darm und Gehirn; die Achse ist bidirektional.'))
      .toEqual(['darm-hirn-achse', 'verbindet', 'gehirn', 'achse', 'bidirektional']);
  });

  it('reads only the first 300 characters', () => {
    const far = 'x'.repeat(300) + ' weitentfernt';
    expect(contextKeywords(far)).not.toContain('weitentfernt');
  });
});

describe('selectCandidateWindow — prose signal', () => {
  it('ranks a page whose prose carries the context words above one that only shares a short token', () => {
    const byProse = page('Transferrinsättigung', 'laborwert des eisenstoffwechsels, quotient aus serumeisen und transferrin.');
    const byToken = page('Eisen', 'spurenelement.');
    const window = selectCandidateWindow(
      { name: 'TSAT', context: 'Laborwert des Eisenstoffwechsels.' },
      [byToken, byProse],
    );
    expect(window[0].path).toBe(byProse.path);
  });

  it('drops a keyword that occurs on more than the cap share of pages', () => {
    // "werden" stands on every page; it must not lift any of them. Only the
    // page that also says "entzündungshemmend" scores.
    const pool = [
      page('A', 'kann verwendet werden.'),
      page('B', 'wird oft verwendet werden.'),
      page('C', 'soll entzündungshemmend werden.'),
      page('D', 'muss werden.'),
    ];
    const window = selectCandidateWindow({ name: 'Zz', context: 'werden entzündungshemmend' }, pool);
    expect(window[0].path).toBe(pool[2].path);
    // and the rest keep pool order — "werden" gave them nothing to sort by
    expect(window.slice(1).map(p => p.title)).toEqual(['A', 'B', 'D']);
  });

  it('does not score prose when no page carries text (lexical only, as before)', () => {
    const pool = [page('Hypertonie'), page('Typ-2-Diabetes'), page('Zöliakie')];
    const window = selectCandidateWindow(
      { name: 'Diabetes-mellitus-Typ-2', context: 'Diabetes als chronische Stoffwechselerkrankung.' },
      pool,
    );
    expect(window[0].title).toBe('Typ-2-Diabetes');
  });
});

describe('selectCandidateWindow — shape', () => {
  it('is always K pages, or the whole pool when smaller', () => {
    const big = Array.from({ length: CANDIDATE_WINDOW_TOP_K + 25 }, (_, i) => page(`S-${i}`));
    expect(selectCandidateWindow({ name: 'Q', context: '' }, big).length).toBe(CANDIDATE_WINDOW_TOP_K);
    expect(selectCandidateWindow({ name: 'Q', context: '' }, big, 5).length).toBe(5);
    expect(selectCandidateWindow({ name: 'Q', context: '' }, big.slice(0, 3)).length).toBe(3);
    expect(selectCandidateWindow({ name: 'Q', context: '' }, [])).toEqual([]);
  });

  it('keeps pool order among equals, so the rendered prefix is stable between calls', () => {
    const pool = Array.from({ length: 10 }, (_, i) => page(`Seite-${i}`, 'nichts gemeinsames.'));
    const a = selectCandidateWindow({ name: 'Unbekannt', context: 'Keinerlei Überlappung.' }, pool);
    const b = selectCandidateWindow({ name: 'Unbekannt', context: 'Keinerlei Überlappung.' }, pool);
    expect(a.map(p => p.path)).toEqual(pool.map(p => p.path));
    expect(b).toEqual(a);
  });

  it('returns the caller\'s own objects, richer fields included', () => {
    const pool = [{ ...page('X', 'text'), wikiLink: '[[wiki/entities/X|X]]', ctime: 1 }];
    const window = selectCandidateWindow({ name: 'X', context: '' }, pool);
    expect(window[0]).toBe(pool[0]);
    expect(window[0].wikiLink).toBe('[[wiki/entities/X|X]]');
  });
});

describe('contextAround', () => {
  const text = 'A'.repeat(500) + ' siehe [[Darm-Hirn-Achse]] im Detail ' + 'B'.repeat(500);

  it('cuts a window around the first needle that occurs', () => {
    const ctx = contextAround(text, ['[[Darm-Hirn-Achse', 'Darm-Hirn-Achse'], 20);
    expect(ctx).toContain('[[Darm-Hirn-Achse');
    expect(ctx.length).toBeLessThanOrEqual(20 + '[[Darm-Hirn-Achse'.length + 20);
  });

  it('falls back to the start of the text when nothing is found', () => {
    expect(contextAround(text, ['nicht-da'], 10)).toBe('A'.repeat(20));
  });
});
