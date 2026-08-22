import { describe, it, expect } from 'vitest';
import { correctRelatedLinkPrefixes } from '../../core/related-link-corrector';

describe('correctRelatedLinkPrefixes (root-cause fix for sources/-prefixed related links)', () => {
  const ENT = 'Related Entities';
  const CON = 'Related Concepts';

  // --- Named regression cases: the two failure modes the (a)/(b) list-visibility
  //     heuristic cannot cover, and that this post-pass exists to catch. ---

  it('[truncated-existing-pages] re-types a link the model prefixed sources/ because the target fell outside the truncated existing_pages window', () => {
    // The related entity exists in the vault but outside the MAX_PAGES window, so the
    // model could not see its path and guessed the most salient prefix — sources/.
    const c = ['## Related Entities', '- [[sources/Hippocampus|Hippocampus]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['Hippocampus'], [], ENT, CON);
    expect(r).toContain('[[entities/Hippocampus|Hippocampus]]');
  });

  it('[co-created-siblings] re-types a link to a sibling generated in the same run (never in existing_pages at any MAX_PAGES)', () => {
    // Concept "Gedächtniskonsolidierung" co-created with related entity "Schlaf" in one
    // ingest: the sibling does not exist when the prompt is built, so no list size could
    // contain it. Raising MAX_PAGES can't reach it; the section type alone fixes the guess.
    const c = ['## Related Entities', '- [[sources/Schlaf|Schlaf]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['Schlaf'], [], ENT, CON);
    expect(r).toContain('[[entities/Schlaf|Schlaf]]');
  });

  // --- Behavioural coverage ---

  // A freshly-generated concept page where the model guessed `sources/` for the
  // related links it could not place against the truncated existing-pages list.
  const page = [
    '## Description',
    'It builds on [[sources/Langzeitgedächtnis|Langzeitgedächtnis]] in prose.',
    '',
    '## Related Concepts',
    '- [[sources/Gedächtnis|Gedächtnis]]',
    '- [[concepts/Abruf|Abruf]]',
    '',
    '## Related Entities',
    '- [[sources/Hippocampus|Hippocampus]]',
    '- [[sources/Schlaf|Schlaf]]',
    '',
    '## Mentions in Source',
    '> **Source: [[sources/Gedächtnis|Gedächtnis]]**',
    '> - "a verbatim quote"',
  ].join('\n');

  const out = correctRelatedLinkPrefixes(
    page, ['Hippocampus', 'Schlaf'], ['Gedächtnis', 'Abruf'], ENT, CON,
  );

  it('re-types sources/-prefixed related concepts to concepts/', () => {
    expect(out).toContain('- [[concepts/Gedächtnis|Gedächtnis]]');
  });
  it('re-types sources/-prefixed related entities to entities/', () => {
    expect(out).toContain('- [[entities/Hippocampus|Hippocampus]]');
    expect(out).toContain('- [[entities/Schlaf|Schlaf]]');
  });
  it('leaves already-correct related links untouched', () => {
    expect(out).toContain('- [[concepts/Abruf|Abruf]]');
  });
  it('NEVER rewrites the source citation in Mentions, even when the source name is also a related concept', () => {
    expect(out).toContain('> **Source: [[sources/Gedächtnis|Gedächtnis]]**');
  });
  it('does not touch prose links outside the Related sections', () => {
    expect(out).toContain('[[sources/Langzeitgedächtnis|Langzeitgedächtnis]]');
  });
  it('keys the typed-list map case-folded (slug.ts comparison contract), so a link spelled differently from the typed list is still re-typed', () => {
    // The typed list says "Mediterrane Ernährung" is an entity; the model wrote
    // the link in lowercase inside the concepts section. With the map keyed
    // `slugify(x, preserveCase)` the two spellings got different keys under
    // slugCase 'preserve', the lookup missed, and the section (concepts) won.
    const c = ['## Related Concepts', '- [[mediterrane ernährung]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['Mediterrane Ernährung'], [], ENT, CON);
    expect(r).toContain('[[entities/mediterrane ernährung|mediterrane ernährung]]');
  });
  it('resolves an ambiguous name (in both lists) via the section context', () => {
    // In the Related Concepts section, the concept reading is meant.
    const amb = ['## Related Concepts', '- [[sources/X|X]]'].join('\n');
    expect(correctRelatedLinkPrefixes(amb, ['X'], ['X'], ENT, CON)).toContain('[[concepts/X|X]]');
  });
  it('section dictates the folder even when the link is not in the current related lists (self-heals merge-carried stale links)', () => {
    // [[sources/Gedächtnis]] carried through a merge from the existing body, with
    // "Gedächtnis" NOT in this ingest's related lists. Section-driven correction still
    // fixes it; the name-map alone would not.
    const c = '## Related Concepts\n- [[sources/Gedächtnis|Gedächtnis]]\n## Related Entities\n- [[sources/Hippocampus|Hippocampus]]';
    const r = correctRelatedLinkPrefixes(c, [], [], ENT, CON);
    expect(r).toContain('[[concepts/Gedächtnis|Gedächtnis]]');
    expect(r).toContain('[[entities/Hippocampus|Hippocampus]]');
  });
  it('recognizes literal English headers on a non-English wiki (heals pages merged before the #188 fix)', () => {
    // Pages merged before #188's merge.ts fix carry "## Related Concepts" literally
    // regardless of wikiLanguage, while the caller passes the localized (German) labels.
    const merged = [
      '## Related Concepts',
      '- [[sources/Gedächtnis|Gedächtnis]]',
    ].join('\n');
    const r = correctRelatedLinkPrefixes(
      merged, [], ['Gedächtnis'], 'Verwandte Entitäten', 'Verwandte Konzepte',
    );
    expect(r).toContain('[[concepts/Gedächtnis|Gedächtnis]]');
  });
  it('matches inflection/spacing variants via slug (space vs hyphen)', () => {
    const c = '## Related Concepts\n- [[sources/Exekutive-Funktionen|Exekutive Funktionen]]';
    const r = correctRelatedLinkPrefixes(c, [], ['Exekutive Funktionen'], ENT, CON);
    expect(r).toContain('[[concepts/Exekutive-Funktionen|Exekutive Funktionen]]');
  });

  // --- #307: the matcher used to accept only already-correct prefixes, so the links
  //     this function exists to repair never entered the rewrite. ---

  describe('wrong-prefix links (#307)', () => {
    it('rewrites singular entity/ to entities/', () => {
      const c = '## Related Entities\n- [[entity/Hippocampus|Hippocampus]]';
      const r = correctRelatedLinkPrefixes(c, ['Hippocampus'], [], ENT, CON);
      expect(r).toContain('- [[entities/Hippocampus|Hippocampus]]');
    });

    it('rewrites singular concept/ to concepts/', () => {
      const c = '## Related Concepts\n- [[concept/Abruf|Abruf]]';
      const r = correctRelatedLinkPrefixes(c, [], ['Abruf'], ENT, CON);
      expect(r).toContain('- [[concepts/Abruf|Abruf]]');
    });

    it('routes a type-wrong singular link by known type, not by prefix substitution', () => {
      // [[concept/Kardiogener-Schock]] is an entity in this ingest. A plain
      // concept/ → concepts/ substitution would produce a link that is well-formed
      // and still wrong; folderBySlug knows the type and wins over both the written
      // prefix and the section.
      const c = '## Related Concepts\n- [[concept/Kardiogener-Schock|Kardiogener Schock]]';
      const r = correctRelatedLinkPrefixes(c, ['Kardiogener Schock'], [], ENT, CON);
      expect(r).toContain('- [[entities/Kardiogener-Schock|Kardiogener Schock]]');
    });

    it('falls back to the section folder when the name is in neither related list', () => {
      const c = '## Related Entities\n- [[concept/Unbekannt|Unbekannt]]';
      const r = correctRelatedLinkPrefixes(c, [], [], ENT, CON);
      expect(r).toContain('- [[entities/Unbekannt|Unbekannt]]');
    });

    it('leaves tag-as-folder links untouched', () => {
      // A vault-specific tag used as a folder. The function cannot know whether the
      // user meant it, so it stays out of the matcher entirely.
      const c = [
        '## Related Entities',
        '- [[Arzneimittel/Metformin|Metformin]]',
        '- [[Laborwerte/CRP|CRP]]',
        '## Related Concepts',
        '- [[Biochemie/Glykolyse|Glykolyse]]',
      ].join('\n');
      const r = correctRelatedLinkPrefixes(
        c, ['Metformin', 'CRP'], ['Glykolyse'], ENT, CON,
      );
      expect(r).toBe(c);
    });

    it('is a no-op on already-correct prefixes', () => {
      const c = [
        '## Related Entities',
        '- [[entities/Hippocampus|Hippocampus]]',
        '## Related Concepts',
        '- [[concepts/Abruf|Abruf]]',
        '## Mentions in Source',
        '> **Source: [[sources/Gedächtnis|Gedächtnis]]**',
      ].join('\n');
      const r = correctRelatedLinkPrefixes(
        c, ['Hippocampus'], ['Abruf'], ENT, CON,
      );
      expect(r).toBe(c);
    });

    it('does not rewrite a wrong-prefix link outside the Related sections', () => {
      const c = '## Description\nProse about [[concept/Abruf|Abruf]].';
      const r = correctRelatedLinkPrefixes(c, [], ['Abruf'], ENT, CON);
      expect(r).toBe(c);
    });

    it('rewrites a bare singular link without a display alias', () => {
      const c = '## Related Concepts\n- [[concept/Abruf]]';
      const r = correctRelatedLinkPrefixes(c, [], ['Abruf'], ENT, CON);
      expect(r).toContain('- [[concepts/Abruf]]');
    });

    // --- Case sensitivity is intentional (v1.25.2 follow-up to #324) ---
    //
    // WIKI_SUBFOLDERS is hardcoded lowercase (entities|concepts|sources). The regex
    // is therefore case-sensitive on purpose: a capitalized `[[Entity/X]]` is left
    // untouched so a vault-defined tag-folder `Entity/` is not shadowed by the
    // rewrite. If the LLM ever emits a capitalized prefix, this test fails first
    // and forces a deliberate decision (broaden the regex OR fix the prompt).
    it('is case-sensitive on the folder prefix (a capitalized "Entity/" is NOT rewritten)', () => {
      const c = '## Related Entities\n- [[Entity/Hippocampus|Hippocampus]]';
      const r = correctRelatedLinkPrefixes(c, ['Hippocampus'], [], ENT, CON);
      expect(r).toBe(c);
    });
  });
});

// Issue #482 stage 2: the generation and merge prompts no longer carry a page
// list, so this pass is where a related name meets the vault — all of it, not a
// 50-page window. These tests pin what the window could never do.
describe('correctRelatedLinkPrefixes — full-vault resolution (#482)', () => {
  const ENT = 'Related Entities';
  const CON = 'Related Concepts';
  const vault = (pages: Array<{ path: string; title: string; aliases?: string[] }>) =>
    ({ wikiFolder: 'wiki', pages });

  it('resolves a bare link to the page that exists, wherever it sits in the vault', () => {
    const c = ['## Related Concepts', '- [[Insulinresistenz]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, [], ['Insulinresistenz'], ENT, CON, vault([
      { path: 'wiki/concepts/Insulinresistenz.md', title: 'Insulinresistenz' },
    ]));
    expect(r).toContain('[[concepts/Insulinresistenz|Insulinresistenz]]');
  });

  it('follows a curated alias to a page whose title differs — the case no window can cover', () => {
    // The name in the prose is an alias; the page carries another title. Only a
    // full-vault alias index can connect them.
    const c = ['## Related Entities', '- [[E433]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['E433'], [], ENT, CON, vault([
      { path: 'wiki/entities/Polysorbate.md', title: 'Polysorbate', aliases: ['E433'] },
    ]));
    expect(r).toContain('[[entities/Polysorbate|E433]]');
  });

  it('refuses an alias claimed by two pages and falls back to the typed list (#446)', () => {
    const c = ['## Related Entities', '- [[E433]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['E433'], [], ENT, CON, vault([
      { path: 'wiki/entities/Polysorbate.md', title: 'Polysorbate', aliases: ['E433'] },
      { path: 'wiki/entities/Polysorbat-80.md', title: 'Polysorbat-80', aliases: ['E433'] },
    ]));
    expect(r).toContain('[[entities/E433|E433]]');
  });

  it('prefers a page title over another page holding the name as an alias', () => {
    const c = ['## Related Concepts', '- [[Autophagie]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, [], ['Autophagie'], ENT, CON, vault([
      { path: 'wiki/concepts/Zellreinigung.md', title: 'Zellreinigung', aliases: ['Autophagie'] },
      { path: 'wiki/concepts/Autophagie.md', title: 'Autophagie' },
    ]));
    expect(r).toContain('[[concepts/Autophagie|Autophagie]]');
    expect(r).not.toContain('Zellreinigung');
  });

  it('resolves a title the model wrote in another case, even under slugCase: preserve', () => {
    // Measured on a 2838-page vault: the resolver keyed its index with
    // `preserveCase`, so this link died while `scanDeadLinks` — which judges
    // over `knownTargetsLower` — would have accepted it untouched. The index is
    // a comparison, so it folds case (slug.ts contract).
    const c = ['## Related Concepts', '- [[mediterrane Ernährung]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, [], [], ENT, CON, vault([
      { path: 'wiki/concepts/Mediterrane-Ernährung.md', title: 'Mediterrane-Ernährung' },
    ]));
    expect(r).toContain('[[concepts/Mediterrane-Ernährung|mediterrane Ernährung]]');
  });

  it('folds case on curated aliases too', () => {
    const c = ['## Related Entities', '- [[vitamin d]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, [], [], ENT, CON, vault([
      { path: 'wiki/entities/Cholecalciferol.md', title: 'Cholecalciferol', aliases: ['Vitamin D'] },
    ]));
    expect(r).toContain('[[entities/Cholecalciferol|vitamin d]]');
  });

  it('never resolves onto a sources/ page (#234 invariant, new home)', () => {
    const c = ['## Related Entities', '- [[Gedächtnis]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['Gedächtnis'], [], ENT, CON, vault([
      { path: 'wiki/sources/Gedächtnis.md', title: 'Gedächtnis' },
    ]));
    expect(r).not.toContain('sources/Gedächtnis');
    expect(r).toContain('[[entities/Gedächtnis|Gedächtnis]]');
  });

  it('leaves a name the vault does not know to the stub path, folder from the typed list', () => {
    const c = ['## Related Concepts', '- [[Noch-Nicht-Da]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, [], ['Noch-Nicht-Da'], ENT, CON, vault([]));
    expect(r).toContain('[[concepts/Noch-Nicht-Da|Noch-Nicht-Da]]');
  });

  it('rewrites a mis-prefixed link to the real path instead of only re-typing it', () => {
    const c = ['## Related Entities', '- [[sources/E433|E433]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['E433'], [], ENT, CON, vault([
      { path: 'wiki/entities/Polysorbate.md', title: 'Polysorbate', aliases: ['E433'] },
    ]));
    expect(r).toContain('[[entities/Polysorbate|E433]]');
  });

  it('leaves an already-correct link byte-identical', () => {
    const c = ['## Related Concepts', '- [[concepts/Autophagie|Autophagie]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, [], ['Autophagie'], ENT, CON, vault([
      { path: 'wiki/concepts/Autophagie.md', title: 'Autophagie' },
    ]));
    expect(r).toBe(c);
  });

  it('touches nothing outside the two Related sections', () => {
    const c = [
      '## Mentions in Source',
      '- "quote" — [[sources/Notiz|Notiz]]',
      '## Description',
      'Prose mentioning [[Autophagie]] in passing.',
    ].join('\n');
    const r = correctRelatedLinkPrefixes(c, [], ['Autophagie'], ENT, CON, vault([
      { path: 'wiki/concepts/Autophagie.md', title: 'Autophagie' },
    ]));
    expect(r).toBe(c);
  });
});
