// Issue #446 — acceptance fixture for ambiguous short designators.
//
// Provenance: measured 2026-08-15 on a 2416-page entity/concept vault with the
// plugin's own `computeSlug`. A designator is a title or an alias of 2-5
// characters; a page counts once per slug, so a title and an alias that fold
// together ("Hsp70" / "HSP70") are one designator rather than a collision.
//
// Scope note, because the number in the issue is wider than this fixture: 24
// designators are carried by more than one page when entities and concepts are
// pooled, but 15 of those are one entity plus one concept, which the resolver
// settles deterministically because a same-type match wins before the cross-type
// branch is reached. The 9 below are the ones where a single folder holds more
// than one page for the designator — the case the resolution order actually
// decided.
//
// What this pins: the deterministic gate never answers an ambiguous designator
// on its own, never depends on page order, and never proposes a new page for a
// name that already exists twice. It deliberately does NOT pin which candidate
// wins on tags alone: a page carries the aspect it was created under and a note
// the aspect it was written about, so tags order candidates and never decide
// identity.

import { describe, it, expect } from 'vitest';
import { ConflictResolver, type PageRef, type PageType } from '../../core/conflict-resolver';
import { computeSlug } from '../../core/slug';

const WIKI = 'wiki';

interface Designator {
  designator: string;
  pageType: PageType;
  /** disjoint = no shared tag, identical = same tag set, partial = some overlap */
  tagRelation: 'disjoint' | 'identical' | 'partial';
  pages: Array<{ title: string; tags: string[] }>;
}

const DESIGNATORS: Designator[] = [
  {
    designator: 'DHA', pageType: 'entity', tagRelation: 'partial',
    pages: [
      { title: 'Dehydroascorbinsäure', tags: ['Biochemie'] },
      { title: 'Docosahexaensäure', tags: ['Vitamine', 'Biochemie'] },
    ],
  },
  {
    designator: 'E433', pageType: 'entity', tagRelation: 'identical',
    pages: [
      { title: 'Polysorbat-80', tags: ['Lebensmittelzusatzstoff'] },
      { title: 'Polysorbate', tags: ['Lebensmittelzusatzstoff'] },
    ],
  },
  {
    designator: 'EVOO', pageType: 'entity', tagRelation: 'identical',
    pages: [
      { title: 'Extra-natives-Olivenöl', tags: ['Lebensmittel', 'Ernährung'] },
      { title: 'Olivenöl', tags: ['Lebensmittel', 'Ernährung'] },
    ],
  },
  {
    designator: 'LAB', pageType: 'entity', tagRelation: 'identical',
    pages: [
      { title: 'LactobacillusFructilactobacillus-Arten', tags: ['Bakterien', 'Mikrobiologie'] },
      { title: 'Milchsäurebakterien', tags: ['Bakterien', 'Mikrobiologie'] },
    ],
  },
  {
    designator: 'LTβR', pageType: 'concept', tagRelation: 'identical',
    pages: [
      { title: 'LTβR-Signalweg', tags: ['Biochemie'] },
      { title: 'Lymphotoxin-Beta-Rezeptor', tags: ['Biochemie'] },
    ],
  },
  {
    designator: 'MB', pageType: 'entity', tagRelation: 'partial',
    pages: [
      { title: 'Methylenblau', tags: ['Arzneimittel', 'Biochemie'] },
      { title: 'Myoglobin', tags: ['Biochemie', 'Physiologie'] },
    ],
  },
  {
    designator: 'NAC', pageType: 'entity', tagRelation: 'disjoint',
    pages: [
      { title: 'N-Acetylcystein', tags: ['Supplement', 'Biochemie'] },
      { title: 'Nucleus-accumbens', tags: ['Neurologie'] },
    ],
  },
  {
    designator: 'NO2-', pageType: 'entity', tagRelation: 'partial',
    pages: [
      { title: 'Nitrit', tags: ['Mineralstoffe', 'Biochemie'] },
      { title: 'Stickstoffoxide', tags: ['Biochemie', 'Umweltmedizin'] },
    ],
  },
  {
    designator: 'PCC', pageType: 'entity', tagRelation: 'disjoint',
    pages: [
      { title: 'Posteriorer-Cingulärer-Kortex', tags: ['Neurologie'] },
      { title: 'Propionyl-CoA-Carboxylase', tags: ['Biochemie'] },
    ],
  },
];

/** Build the page list a designator's pages form, in the given folder. */
function pagesOf(d: Designator, folder: 'entities' | 'concepts'): PageRef[] {
  return d.pages.map(p => ({
    path: `${WIKI}/${folder}/${p.title}.md`,
    title: p.title,
    aliases: [d.designator],
    tags: p.tags,
  }));
}

function resolve(d: Designator, pages: PageRef[], tags?: string[]) {
  return new ConflictResolver(WIKI, pages).resolve({
    name: d.designator,
    // The production caller slugifies the extracted name, and the rule is not
    // lowercasing: `NO2-` loses its trailing dash on the way to `no2`.
    slug: computeSlug(d.designator),
    pageType: d.pageType,
    tags,
  });
}

const sameTypeFolder = (d: Designator) => (d.pageType === 'entity' ? 'entities' : 'concepts');
const otherTypeFolder = (d: Designator) => (d.pageType === 'entity' ? 'concepts' : 'entities');

describe('Issue #446 — ambiguous designators, same-type gate', () => {
  it.each(DESIGNATORS)('$designator is reported as ambiguous, not merged silently', (d) => {
    const result = resolve(d, pagesOf(d, sameTypeFolder(d)));

    expect(result.action).toBe('disambiguate');
    expect(result.candidates?.map(c => c.title).sort()).toEqual(d.pages.map(p => p.title).sort());
  });

  it.each(DESIGNATORS)('$designator resolves the same under every page order', (d) => {
    const pages = pagesOf(d, sameTypeFolder(d));
    const orders = [pages, [...pages].reverse()];
    const results = orders.map(o => resolve(d, o).targetPath);

    expect(new Set(results).size).toBe(1);
  });

  it.each(DESIGNATORS)('$designator never proposes a new page', (d) => {
    // The pages exist; creating a third one for a name that is already an alias
    // twice is the one answer that is certainly wrong.
    for (const tags of [undefined, ['Toxikologie'], d.pages[0].tags]) {
      expect(resolve(d, pagesOf(d, sameTypeFolder(d)), tags).action).not.toBe('create');
    }
  });

  it.each(DESIGNATORS.filter(d => d.tagRelation !== 'identical'))(
    '$designator ranks the tag-sharing page first without dropping the other',
    (d) => {
      // Take a tag that only the second page carries, and check it leads.
      const second = d.pages[1];
      const first = d.pages[0];
      const distinguishing = second.tags.find(t => !first.tags.includes(t));
      expect(distinguishing).toBeDefined();

      const result = resolve(d, pagesOf(d, sameTypeFolder(d)), [distinguishing!]);
      expect(result.candidates?.[0].title).toBe(second.title);
      expect(result.candidates).toHaveLength(d.pages.length);
    },
  );

  it.each(DESIGNATORS.filter(d => d.tagRelation === 'identical'))(
    '$designator stays deterministic when the tags cannot separate the pages',
    (d) => {
      const pages = pagesOf(d, sameTypeFolder(d));
      const shared = d.pages[0].tags;
      const forward = resolve(d, pages, shared);
      const backward = resolve(d, [...pages].reverse(), shared);

      expect(backward.targetPath).toBe(forward.targetPath);
      expect(forward.candidates).toHaveLength(d.pages.length);
    },
  );
});

describe('Issue #472 — the same designators from the cross-type side', () => {
  // Under #446 this was the other half of the same ambiguity: classify DHA as a
  // concept and the two entity pages carrying it became cross-type matches to
  // merge into. #472 retires that reading. A designator is `(letters, type)` —
  // `CR` is chromium as an entity and caloric restriction as a concept — so
  // pages in the opposite folder are not weaker candidates for this item, they
  // are candidates for a different item. Nothing there is ambiguous, and
  // nothing there is a merge target.
  it.each(DESIGNATORS)('$designator ignores the opposite folder entirely', (d) => {
    const pages = pagesOf(d, otherTypeFolder(d));
    const forward = resolve(d, pages);
    const backward = resolve(d, [...pages].reverse());

    expect(forward.action).toBe('create');
    expect(forward.targetPath).toBe(`${WIKI}/${sameTypeFolder(d)}/${computeSlug(d.designator)}.md`);
    expect(backward.targetPath).toBe(forward.targetPath);
  });
});
