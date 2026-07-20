import { describe, it, expect } from 'vitest';
import {
  canonicalizeSectionHeaders,
  classifyHeader,
  preserveExistingSections,
} from '../../core/section-header-canonicalizer';

describe('canonicalizeSectionHeaders (deterministic repair of LLM-garbled section headers)', () => {
  // The de labels the model is handed and expected to copy verbatim.
  const DE = [
    'Grundlegende Informationen', 'Beschreibung', 'Verwandte Inhalte',
    'Erwähnungen in der Quelle', 'Neue Informationen', 'Definition',
    'Hauptmerkmale', 'Anwendungen', 'Verwandte Konzepte', 'Verwandte Entitäten',
    'Quelle', 'Kerninhalt', 'Wichtige Entitäten', 'Wichtige Konzepte',
    'Hauptpunkte', 'Aufgelöste Widersprüche', 'Neue Behauptung',
    'Bestehendes Wissen', 'Lösungsvorschlag', 'Quellseite',
    'Verwandte Seiten', 'Aktualisiert',
  ];

  // --- Named regression cases: the four real garbles from the S29 clean re-ingest. ---
  it.each([
    ['Erwägungen in der Quelle'],
    ['Erwurnungen in der Quelle'],
    ['Erwährungen in der Quelle'],
    ['Erwnungen in der Quelle'],
  ])('[garbled-mentions-header] snaps "## %s" back to the canonical label', (garbled) => {
    const r = canonicalizeSectionHeaders(`## ${garbled}`, DE);
    expect(r).toBe('## Erwähnungen in der Quelle');
  });

  // --- Negative coverage: it must never rewrite a correct or unrelated header. ---

  it('[exact-label] leaves an exact canonical label untouched', () => {
    const c = ['## Verwandte Entitäten', '## Erwähnungen in der Quelle'].join('\n');
    expect(canonicalizeSectionHeaders(c, DE)).toBe(c);
  });

  it('[distinct-content-header] does not snap a genuine content header that is far from every label', () => {
    const c = '## Pathophysiologie und klinische Relevanz';
    expect(canonicalizeSectionHeaders(c, DE)).toBe(c);
  });

  it('[h1-and-frontmatter-safe] never touches the H1 title or non-H2 lines', () => {
    const c = ['# Erwägungen', '### Erwägungen', 'Erwägungen in der Quelle'].join('\n');
    expect(canonicalizeSectionHeaders(c, DE)).toBe(c);
  });

  it('[bounded] does not snap a header beyond MAX_DISTANCE edits from any label', () => {
    // "Verwandte Publikationen" is >3 edits from "Verwandte Konzepte"/"Verwandte Seiten".
    const c = '## Verwandte Publikationen';
    expect(canonicalizeSectionHeaders(c, DE)).toBe(c);
  });

  it('preserves the rest of the page verbatim while fixing only the garbled header', () => {
    const page = [
      '# Apoptose',
      '',
      '## Verwandte Entitäten',
      '- [[entities/Caspase|Caspase]]',
      '',
      '## Erwägungen in der Quelle',
      '- "a verbatim quote" — [[sources/Biochemie-Signalwege]]',
    ].join('\n');
    const r = canonicalizeSectionHeaders(page, DE);
    expect(r).toContain('## Erwähnungen in der Quelle');
    expect(r).not.toContain('Erwägungen');
    expect(r).toContain('- [[entities/Caspase|Caspase]]');
  });
});

describe('classifyHeader (canonical-or-foreign, tolerant of a parenthetical suffix)', () => {
  const DE = [
    'Beschreibung', 'Verwandte Konzepte', 'Verwandte Entitäten',
    'Erwähnungen in der Quelle', 'Neue Informationen',
  ];

  it('classifies a plain canonical header with no suffix', () => {
    expect(classifyHeader('Beschreibung', DE)).toEqual({ label: 'Beschreibung', suffix: null });
  });

  it('[the field case] classifies a suffixed New Information header and reports the suffix', () => {
    // The suffix is emitted by the code, not the model: the generation prompt
    // uses {{date}}, the complementary-append fallback the source basename.
    expect(classifyHeader('Neue Informationen (Silent Inflammation)', DE))
      .toEqual({ label: 'Neue Informationen', suffix: 'Silent Inflammation' });
  });

  it('heals a garbled base label under a suffix', () => {
    expect(classifyHeader('Neue Informatonen (SIBO)', DE))
      .toEqual({ label: 'Neue Informationen', suffix: 'SIBO' });
  });

  it('leaves a genuinely foreign header foreign, with or without a suffix', () => {
    expect(classifyHeader('Active Tag Vocabulary', DE)).toBeNull();
    expect(classifyHeader('Active Tag Vocabulary (2026-07-19)', DE)).toBeNull();
  });

  it('does not treat nested parentheses as a suffix', () => {
    expect(classifyHeader('Beschreibung (a (b))', DE)).toBeNull();
  });

  it('[fix] treats whitespace inside the suffix as the same identity', () => {
    // The page carries ' (Silent Inflammation)' but the model re-emits
    // ' ( Silent Inflammation )' — both must collapse to one section,
    // otherwise the rewrite is read as dropping the old block and a duplicate
    // gets appended on the next merge.
    const a = classifyHeader('Neue Informationen (Silent Inflammation)', DE);
    const b = classifyHeader('Neue Informationen ( Silent Inflammation )', DE);
    expect(a).toEqual(b);
    expect(a?.suffix).toBe('Silent Inflammation');
  });
});

describe('preserveExistingSections (re-assert schema sections the LLM dropped)', () => {
  const DE = [
    'Beschreibung', 'Verwandte Konzepte', 'Verwandte Entitäten',
    'Erwähnungen in der Quelle', 'Neue Informationen',
  ];

  it('restores a canonical section the rewrite dropped entirely', () => {
    const oldBody = '## Beschreibung\nalter Text\n\n## Verwandte Konzepte\n- [[concepts/X|X]]';
    const newBody = '## Verwandte Konzepte\n- [[concepts/X|X]]';
    const out = preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle');
    expect(out).toContain('## Beschreibung');
    expect(out).toContain('alter Text');
  });

  it('leaves a section the model rewrote untouched — content is the model\'s call', () => {
    const oldBody = '## Beschreibung\nalter Text';
    const newBody = '## Beschreibung\nneuer, besserer Text';
    const out = preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle');
    expect(out).toBe(newBody);
    expect(out).not.toContain('alter Text');
  });

  it('[regression: suffix collision] a different New Information block does not count as keeping the old one', () => {
    // The field failure this guard was blind to: New Information is the one
    // schema section that legitimately repeats, one block per contributing
    // source. Keyed by base label alone, emitting (Quercetin) made the guard
    // consider (Silent Inflammation) preserved — and it was lost for good.
    // Measured across a full-corpus rebuild: 26 sections on 11 pages, every
    // single loss of this shape.
    const oldBody = [
      '## Beschreibung', 'Text',
      '', '## Neue Informationen (Silent Inflammation)', '- alter Befund',
    ].join('\n');
    const newBody = [
      '## Beschreibung', 'Text',
      '', '## Neue Informationen (Quercetin)', '- neuer Befund',
    ].join('\n');
    const out = preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle');
    expect(out).toContain('## Neue Informationen (Quercetin)');
    expect(out).toContain('## Neue Informationen (Silent Inflammation)');
    expect(out).toContain('- alter Befund');
  });

  it('keeps an identical suffixed section exactly once', () => {
    const body = '## Neue Informationen (SIBO)\n- Befund';
    expect(preserveExistingSections(body, body, DE, 'Erwähnungen in der Quelle')).toBe(body);
  });

  it('does not restore a section that carried no content', () => {
    const oldBody = '## Beschreibung\n\n## Verwandte Konzepte\n- [[concepts/X|X]]';
    const newBody = '## Verwandte Konzepte\n- [[concepts/X|X]]';
    expect(preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle')).toBe(newBody);
  });

  it('never restores a foreign section — only the schema is re-asserted', () => {
    const oldBody = '## Active Tag Vocabulary\n- leak\n\n## Beschreibung\nText';
    const newBody = '## Beschreibung\nText';
    const out = preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle');
    expect(out).toBe(newBody);
    expect(out).not.toContain('Active Tag Vocabulary');
  });

  it('ignores the lead paragraph and H1 — only `##` sections are candidates', () => {
    const oldBody = '# Titel\n\nEinleitung\n\n## Beschreibung\nText';
    const newBody = '## Beschreibung\nText';
    expect(preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle')).toBe(newBody);
  });

  it('is a no-op when the rewrite kept everything', () => {
    const body = '## Beschreibung\nText\n\n## Verwandte Konzepte\n- [[concepts/X|X]]';
    expect(preserveExistingSections(body, body, DE, 'Erwähnungen in der Quelle')).toBe(body);
  });

  it('strips the Mentions section from the existing body internally', () => {
    // The Mentions label is passed in by the caller (so it lives in the locale
    // files, not a hardcoded English literal) and the helper removes it before
    // diffing. assembleFinalContent re-attaches it programmatically.
    const oldBody = [
      '## Beschreibung', 'Text',
      '', '## Erwähnungen in der Quelle', '- quote 1', '- quote 2',
      '', '## Verwandte Konzepte', '- [[concepts/X|X]]',
    ].join('\n');
    const newBody = '## Verwandte Konzepte\n- [[concepts/X|X]]';
    const out = preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle');
    // Beschreibung restored, Mentions NOT (handled by assembleFinalContent).
    expect(out).toContain('## Beschreibung');
    expect(out).not.toContain('## Erwähnungen in der Quelle');
    expect(out).not.toContain('- quote 1');
  });

  it('also strips a hallucinated Mentions section from the rewrite', () => {
    // The LLM sometimes hallucinates a Mentions header back even though the
    // prompt body was mentions-stripped. Without stripping the rewrite too,
    // the section would collide with the programmatic injection below and the
    // user would see TWO Mentions sections in the output.
    const oldBody = '## Beschreibung\nText';
    const newBody = [
      '## Beschreibung', 'Text',
      '', '## Erwähnungen in der Quelle', '- lost quote',
    ].join('\n');
    const out = preserveExistingSections(oldBody, newBody, DE, 'Erwähnungen in der Quelle');
    // Hallucinated Mentions gone — assembleFinalContent will add the real one.
    expect(out).not.toContain('## Erwähnungen in der Quelle');
    expect(out).not.toContain('- lost quote');
  });
});
