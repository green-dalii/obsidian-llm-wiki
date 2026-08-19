import { describe, it, expect } from 'vitest';
import {
  ConflictResolver,
} from '../../core/conflict-resolver';

const WIKI_FOLDER = 'wiki';

function pages(paths: string[]) {
  return paths.map(p => {
    const parts = p.split('/');
    const name = parts.pop()!.replace('.md', '');
    return { path: `wiki/${p}`, title: name };
  });
}

describe('ConflictResolver', () => {
  it('returns create when no matching page exists', () => {
    const r = new ConflictResolver(WIKI_FOLDER, []);
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('create');
    expect(result.targetPath).toBe('wiki/entities/foo.md');
  });

  it('returns merge when same-type page exists', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['entities/foo.md']));
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('merge');
    expect(result.targetPath).toBe('wiki/entities/foo.md');
  });

  // Issue #472: a designator is `(letters, type)`. The same letters under the
  // other type denote a different thing — `CR` is chromium as an entity and
  // caloric restriction as a concept — so the opposite folder is not a merge
  // target and not a reason to withhold the page. This test's NAME said so
  // before its body did.
  it('returns create when only opposite-type page exists (cross-type considered distinct)', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['concepts/foo.md']));
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('create');
    expect(result.targetPath).toBe('wiki/entities/foo.md');
  });

  it('creates in its own folder even when the opposite folder holds the designator', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['concepts/foo.md', 'entities/bar.md']));
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('create');
    expect(result.targetPath).toBe('wiki/entities/foo.md');
  });

  it('does not match an opposite-type page by alias', () => {
    const r = new ConflictResolver(WIKI_FOLDER, [
      { path: 'wiki/entities/llm.md', title: 'LLM', aliases: ['Large Language Model'] },
    ]);
    const result = r.resolve({ name: 'Large Language Model', slug: 'large-language-model', pageType: 'concept' });
    expect(result.action).toBe('create');
    expect(result.targetPath).toBe('wiki/concepts/large-language-model.md');
  });

  it('selects correct high-confidence for same-type match', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['entities/vigilanz.md', 'concepts/vigilanz.md']));
    const result = r.resolve({ name: 'Vigilanz', slug: 'vigilanz', pageType: 'entity' });
    expect(result.action).toBe('merge');
    expect(result.targetPath).toBe('wiki/entities/vigilanz.md');  // same-type preferred
  });

  it('does not reach into entities/ for a concept of the same name', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['entities/chain-of-thought.md', 'entities/chain-of-thought.md']));
    const result = r.resolve({ name: 'chain of thought', slug: 'chain-of-thought', pageType: 'concept' });
    expect(result.action).toBe('create');
    expect(result.targetPath).toBe('wiki/concepts/chain-of-thought.md');
  });
});

// Issue #446: a short designator can be title-or-alias on more than one page.
// `E433` is an alias on both Polysorbat-80 and Polysorbate; `CR` is caloric
// restriction and chromium. Which of them a resolution picks must not depend on
// the order `getExistingWikiPages` happened to return.
describe('ConflictResolver — ambiguous designators', () => {
  const ambiguous = [
    { path: 'wiki/entities/polysorbat-80.md', title: 'Polysorbat-80', aliases: ['E433'] },
    { path: 'wiki/entities/polysorbate.md', title: 'Polysorbate', aliases: ['E433'] },
  ];

  it('resolves independently of page order', () => {
    const forward = new ConflictResolver(WIKI_FOLDER, ambiguous)
      .resolve({ name: 'E433', slug: 'e433', pageType: 'entity' });
    const reversed = new ConflictResolver(WIKI_FOLDER, [...ambiguous].reverse())
      .resolve({ name: 'E433', slug: 'e433', pageType: 'entity' });

    expect(reversed.targetPath).toBe(forward.targetPath);
  });

  it('reports the ambiguity instead of silently merging', () => {
    const result = new ConflictResolver(WIKI_FOLDER, ambiguous)
      .resolve({ name: 'E433', slug: 'e433', pageType: 'entity' });

    expect(result.action).toBe('disambiguate');
    expect(result.candidates?.map(c => c.title).sort()).toEqual(['Polysorbat-80', 'Polysorbate']);
    expect(result.confidence).toBe('low');
  });

  it('ranks a candidate that shares a tag above one that does not', () => {
    const tagged = [
      { path: 'wiki/entities/chrom.md', title: 'Chrom', aliases: ['CR'], tags: ['Mineralstoffe'] },
      { path: 'wiki/entities/kalorienrestriktion.md', title: 'Kalorienrestriktion', aliases: ['CR'], tags: ['Ernährung'] },
    ];
    const result = new ConflictResolver(WIKI_FOLDER, tagged)
      .resolve({ name: 'CR', slug: 'cr', pageType: 'entity', tags: ['Ernährung'] });

    expect(result.candidates?.[0].title).toBe('Kalorienrestriktion');
    expect(result.targetPath).toBe('wiki/entities/kalorienrestriktion.md');
  });

  it('keeps every candidate when the tags overlap with none of them', () => {
    // [R-chrom]: a page carries the aspect it was created under, a note the
    // aspect it was written about — a disjoint tag set is a missing signal,
    // never grounds for treating a match as a different subject.
    const result = new ConflictResolver(WIKI_FOLDER, ambiguous)
      .resolve({ name: 'E433', slug: 'e433', pageType: 'entity', tags: ['Toxikologie'] });

    expect(result.action).toBe('disambiguate');
    expect(result.candidates).toHaveLength(2);
  });

  it('leaves a single match on the unchanged merge path', () => {
    const result = new ConflictResolver(WIKI_FOLDER, [ambiguous[0]])
      .resolve({ name: 'E433', slug: 'e433', pageType: 'entity', tags: ['Toxikologie'] });

    expect(result.action).toBe('merge');
    expect(result.confidence).toBe('high');
    expect(result.candidates).toBeUndefined();
  });

  it('stays ambiguous after the extracted name is appended as an alias', () => {
    // Why the ambiguous fallback does not latch the designator (see
    // path-resolution.ts): matching keys on computeSlug(title) and
    // computeSlug(alias), so an alias that slugifies to a key the page already
    // carries adds nothing. slugMatches stays at 2 and the next ingest reaches
    // the same fallback — the dedup call a latch was meant to save is still
    // paid. Fixture: a designator whose trailing character survives as an alias
    // but is stripped from the slug.
    const check = { name: 'no2-', slug: 'no2', pageType: 'entity' as const, tags: ['Biochemie'] };
    const pages = [
      { path: 'wiki/entities/No2.md', title: 'No2', aliases: ['NO2−'], tags: ['Biochemie'] },
      { path: 'wiki/entities/NO2.md', title: 'NO2', aliases: [], tags: ['other'] },
    ];

    const first = new ConflictResolver(WIKI_FOLDER, pages).resolve(check);
    expect(first.action).toBe('disambiguate');
    expect(first.targetPath).toBe('wiki/entities/No2.md');

    const latched = [{ ...pages[0], aliases: ['NO2−', 'no2-'] }, pages[1]];
    const second = new ConflictResolver(WIKI_FOLDER, latched).resolve(check);
    expect(second.action).toBe('disambiguate');
    expect(second.candidates).toHaveLength(2);
  });
});
