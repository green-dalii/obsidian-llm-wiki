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
    const r = correctRelatedLinkPrefixes(c, ['Hippocampus'], [], ENT, CON, true);
    expect(r).toContain('[[entities/Hippocampus|Hippocampus]]');
  });

  it('[co-created-siblings] re-types a link to a sibling generated in the same run (never in existing_pages at any MAX_PAGES)', () => {
    // Concept "Gedächtniskonsolidierung" co-created with related entity "Schlaf" in one
    // ingest: the sibling does not exist when the prompt is built, so no list size could
    // contain it. Raising MAX_PAGES can't reach it; the section type alone fixes the guess.
    const c = ['## Related Entities', '- [[sources/Schlaf|Schlaf]]'].join('\n');
    const r = correctRelatedLinkPrefixes(c, ['Schlaf'], [], ENT, CON, true);
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
    page, ['Hippocampus', 'Schlaf'], ['Gedächtnis', 'Abruf'], ENT, CON, true,
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
  it('resolves an ambiguous name (in both lists) via the section context', () => {
    // In the Related Concepts section, the concept reading is meant.
    const amb = ['## Related Concepts', '- [[sources/X|X]]'].join('\n');
    expect(correctRelatedLinkPrefixes(amb, ['X'], ['X'], ENT, CON, true)).toContain('[[concepts/X|X]]');
  });
  it('section dictates the folder even when the link is not in the current related lists (self-heals merge-carried stale links)', () => {
    // [[sources/Gedächtnis]] carried through a merge from the existing body, with
    // "Gedächtnis" NOT in this ingest's related lists. Section-driven correction still
    // fixes it; the name-map alone would not.
    const c = '## Related Concepts\n- [[sources/Gedächtnis|Gedächtnis]]\n## Related Entities\n- [[sources/Hippocampus|Hippocampus]]';
    const r = correctRelatedLinkPrefixes(c, [], [], ENT, CON, true);
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
      merged, [], ['Gedächtnis'], 'Verwandte Entitäten', 'Verwandte Konzepte', true,
    );
    expect(r).toContain('[[concepts/Gedächtnis|Gedächtnis]]');
  });
  it('matches inflection/spacing variants via slug (space vs hyphen)', () => {
    const c = '## Related Concepts\n- [[sources/Exekutive-Funktionen|Exekutive Funktionen]]';
    const r = correctRelatedLinkPrefixes(c, [], ['Exekutive Funktionen'], ENT, CON, true);
    expect(r).toContain('[[concepts/Exekutive-Funktionen|Exekutive Funktionen]]');
  });

  // --- #307: the matcher used to accept only already-correct prefixes, so the links
  //     this function exists to repair never entered the rewrite. ---

  describe('wrong-prefix links (#307)', () => {
    it('rewrites singular entity/ to entities/', () => {
      const c = '## Related Entities\n- [[entity/Hippocampus|Hippocampus]]';
      const r = correctRelatedLinkPrefixes(c, ['Hippocampus'], [], ENT, CON, true);
      expect(r).toContain('- [[entities/Hippocampus|Hippocampus]]');
    });

    it('rewrites singular concept/ to concepts/', () => {
      const c = '## Related Concepts\n- [[concept/Abruf|Abruf]]';
      const r = correctRelatedLinkPrefixes(c, [], ['Abruf'], ENT, CON, true);
      expect(r).toContain('- [[concepts/Abruf|Abruf]]');
    });

    it('routes a type-wrong singular link by known type, not by prefix substitution', () => {
      // [[concept/Kardiogener-Schock]] is an entity in this ingest. A plain
      // concept/ → concepts/ substitution would produce a link that is well-formed
      // and still wrong; folderBySlug knows the type and wins over both the written
      // prefix and the section.
      const c = '## Related Concepts\n- [[concept/Kardiogener-Schock|Kardiogener Schock]]';
      const r = correctRelatedLinkPrefixes(c, ['Kardiogener Schock'], [], ENT, CON, true);
      expect(r).toContain('- [[entities/Kardiogener-Schock|Kardiogener Schock]]');
    });

    it('falls back to the section folder when the name is in neither related list', () => {
      const c = '## Related Entities\n- [[concept/Unbekannt|Unbekannt]]';
      const r = correctRelatedLinkPrefixes(c, [], [], ENT, CON, true);
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
        c, ['Metformin', 'CRP'], ['Glykolyse'], ENT, CON, true,
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
        c, ['Hippocampus'], ['Abruf'], ENT, CON, true,
      );
      expect(r).toBe(c);
    });

    it('does not rewrite a wrong-prefix link outside the Related sections', () => {
      const c = '## Description\nProse about [[concept/Abruf|Abruf]].';
      const r = correctRelatedLinkPrefixes(c, [], ['Abruf'], ENT, CON, true);
      expect(r).toBe(c);
    });

    it('rewrites a bare singular link without a display alias', () => {
      const c = '## Related Concepts\n- [[concept/Abruf]]';
      const r = correctRelatedLinkPrefixes(c, [], ['Abruf'], ENT, CON, true);
      expect(r).toContain('- [[concepts/Abruf]]');
    });
  });
});
