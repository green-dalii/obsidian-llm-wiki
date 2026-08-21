// Recall gate for the dedup candidate pre-filter (selectDedupCandidates).
//
// The semantic dedup call used to ship EVERY same-type page to the LLM. On a
// real vault (~1285 entities) that is ~77K chars ≈ 40K prompt tokens for a
// yes/no answer worth 16 completion tokens. The pre-filter ranks candidates
// with zero-token matching and sends only the top K.
//
// The risk this file guards: a pre-filter that drops the TRUE duplicate
// creates a duplicate page — a correctness bug, and in a from-scratch rebuild
// it happens at scale. So the criterion is RECALL over every fixture pair:
// for each (new candidate, true existing target), the target MUST be in the
// selected set.
//
// What changed with the candidate window (`core/candidate-window.ts`): the
// zero-overlap case no longer returns the full list. Measured at a local 26B,
// the full list held the target and the model found it 0 of 18 times; the
// recall that list appeared to protect was never delivered. Instead the
// window ranks on the page's own PROSE as well — a translation or initialism
// whose expansion the page spells out is found that way — and the window is
// always K pages, zero-signal pages filling the tail in pool order.

import { describe, it, expect } from 'vitest';
import { selectDedupCandidates } from '../../../wiki/page-factory/path-resolution';
import { DEDUP_CANDIDATE_TOP_K } from '../../../constants';

interface Page { path: string; title: string; aliases?: string[]; text?: string }

function page(title: string, aliases?: string[]): Page {
  return { path: `wiki/entities/${title}.md`, title, aliases };
}

describe('selectDedupCandidates — lexical branch keeps the true duplicate', () => {
  it('finds Typ-2-Diabetes for the candidate "Diabetes-mellitus-Typ-2"', () => {
    const target = page('Typ-2-Diabetes');
    const pages = [page('Hypertonie'), target, page('Zöliakie')];
    const selected = selectDedupCandidates(
      'Diabetes-mellitus-Typ-2',
      'Diabetes als chronische Stoffwechselerkrankung mit Insulinresistenz.',
      pages,
    );
    expect(selected.map(p => p.path)).toContain(target.path);
  });

  it('finds the pre-rename Lactobacillus plantarum for Lactiplantibacillus plantarum', () => {
    const target = page('Lactobacillus plantarum');
    const pages = [page('Bifidobacterium longum'), target, page('Escherichia coli')];
    const selected = selectDedupCandidates(
      'Lactiplantibacillus plantarum',
      'Milchsäurebakterium, 2020 aus der Gattung Lactobacillus reklassifiziert.',
      pages,
    );
    expect(selected.map(p => p.path)).toContain(target.path);
  });

  it('keeps the true match inside top-K against 40+ scoring distractors', () => {
    // Every distractor shares the token "lactobacillus" (score 3); only the
    // true target also matches "plantarum" (score 6), so it must sort ahead of
    // all of them and survive the K cut.
    const target = page('Lactobacillus plantarum');
    const distractors = Array.from({ length: 44 }, (_, i) =>
      page(`Lactobacillus species-${i}`),
    );
    const pages = [...distractors.slice(0, 22), target, ...distractors.slice(22)];
    const selected = selectDedupCandidates(
      'Lactiplantibacillus plantarum',
      'Milchsäurebakterium der früheren Gattung Lactobacillus.',
      pages,
    );
    expect(selected.length).toBeLessThanOrEqual(DEDUP_CANDIDATE_TOP_K);
    expect(selected.map(p => p.path)).toContain(target.path);
  });

  it('matches via aliases, not only titles', () => {
    const target = page('Ferritin-Sättigung', ['Transferrinsättigung']);
    const pages = [page('Hämoglobin'), target];
    const selected = selectDedupCandidates(
      'Transferrinsättigung',
      'Laborwert des Eisenstoffwechsels.',
      pages,
    );
    expect(selected.map(p => p.path)).toContain(target.path);
  });
});

describe('selectDedupCandidates — zero name overlap: the prose finds what the title cannot', () => {
  it('finds "Massachusetts Institute of Technology" for "MIT" through the page text, ahead of 40 distractors', () => {
    // The name "MIT" matches no title. The candidate's summary says
    // "Cambridge" and "Forschungsuniversität"; only the target page says
    // both in its prose. Before the window this case sent the full list.
    const target: Page = {
      ...page('Massachusetts Institute of Technology'),
      text: 'private forschungsuniversität in cambridge, massachusetts, gegründet 1861.',
    };
    const distractors = Array.from({ length: 40 }, (_, i) => ({
      ...page(`Hochschule-${i}`),
      text: `staatliche hochschule nummer ${i} mit technischem schwerpunkt.`,
    }));
    const pages = [...distractors.slice(0, 20), target, ...distractors.slice(20)];
    const selected = selectDedupCandidates(
      'MIT',
      'Private Forschungsuniversität in Cambridge.',
      pages,
    );
    expect(selected.length).toBe(DEDUP_CANDIDATE_TOP_K);
    expect(selected[0].path).toBe(target.path);
  });

  it('keeps the Chinese page 清华大学 in the window for "Tsinghua University" when the pool is small', () => {
    // Across scripts there is no lexical signal at all. The window does not
    // pretend otherwise: with nothing to rank on, pages keep pool order and
    // the whole pool fits into K. (On a pool larger than K this target is out
    // of reach of any lexical window — and was out of reach of the full list
    // too, measured 0 of 18.)
    const target = page('清华大学');
    const pages = [page('北京大学'), target, page('复旦大学')];
    const selected = selectDedupCandidates(
      'Tsinghua University',
      'Research institution founded 1911 in Beijing.',
      pages,
    );
    expect(selected).toEqual(pages);
  });

  it('never returns more than K, even when nothing scores', () => {
    const pages = Array.from({ length: 100 }, (_, i) => page(`Seite-${i}`));
    const selected = selectDedupCandidates('Zzzz', 'Qqqq.', pages);
    expect(selected.length).toBe(DEDUP_CANDIDATE_TOP_K);
    // Zero-signal pages fill in pool order, so the prefix stays stable
    // across calls (the KV-prefix cache depends on it).
    expect(selected.map(p => p.path)).toEqual(pages.slice(0, DEDUP_CANDIDATE_TOP_K).map(p => p.path));
  });

  it('returns the input unchanged when there are no pages at all', () => {
    expect(selectDedupCandidates('X', 'y', [])).toEqual([]);
  });
});

describe('Gate 1c — token proof: rendered candidate list shrinks by orders of magnitude', () => {
  it('collapses a 1114-page same-type list to a few thousand characters', () => {
    // Mirrors the real vault shape (≈1114 concepts) and the exact rendering
    // used for {{existing_pages}} in path-resolution.ts.
    const target = page('Typ-2-Diabetes');
    const vault: Page[] = [
      target,
      ...Array.from({ length: 1113 }, (_, i) =>
        page(`Fachbegriff-Nummer-${i}`, [`Synonym-${i}`, `Abkürzung-${i}`]),
      ),
    ];
    const render = (pages: Page[]): string =>
      pages
        .map(p => {
          const aliasBlock = p.aliases?.length ? `\n  aliases: ${p.aliases.join(', ')}` : '';
          return `- path: ${p.path}\n  title: ${p.title}${aliasBlock}`;
        })
        .join('\n');

    const before = render(vault).length;
    const selected = selectDedupCandidates(
      'Diabetes-mellitus-Typ-2',
      'Diabetes als chronische Stoffwechselerkrankung mit Insulinresistenz.',
      vault,
    );
    const after = render(selected).length;

    // Measured on this fixture: 131,409 chars → 3,405 chars (97.4%
    // reduction, 1114 → 30 candidates). The 5% bound below enforces the
    // order-of-magnitude collapse without pinning exact fixture bytes.
    expect(selected.map(p => p.path)).toContain(target.path);
    expect(selected.length).toBeLessThanOrEqual(DEDUP_CANDIDATE_TOP_K);
    expect(after).toBeLessThan(before * 0.05);
  });
});
