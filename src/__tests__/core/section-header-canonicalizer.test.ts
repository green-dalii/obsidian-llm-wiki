import { describe, it, expect } from 'vitest';
import {
  canonicalizeSectionHeaders,
  classifyHeader,
  preserveExistingSections,
  reassertH1,
  stripUnknownSections,
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

// #419 — the title line sits inside the rewrite window while no layer owns it.
// `preserveExistingSections` guards `##` blocks only (its own test above pins
// that), so a reply that starts at the first `##` silently drops the H1.
describe('reassertH1 (the title is not the model\'s call)', () => {
  it('prepends the page\'s own H1 when the rewrite dropped it', () => {
    const existing = '# Silent Inflammation\n\nLead.\n\n## Beschreibung\nAlt';
    const rewrite = '## Beschreibung\nNeu';
    expect(reassertH1(existing, rewrite)).toBe('# Silent Inflammation\n\n## Beschreibung\nNeu');
  });

  it('restores the previous title when the rewrite returned a different one', () => {
    const existing = '# Sulforaphan\n\n## Beschreibung\nAlt';
    const rewrite = '# Sulforaphan-Dosierung\n\n## Beschreibung\nNeu';
    expect(reassertH1(existing, rewrite)).toBe('# Sulforaphan\n\n## Beschreibung\nNeu');
  });

  it('is a no-op when the rewrite kept the title', () => {
    const body = '# Sulforaphan\n\n## Beschreibung\nText';
    expect(reassertH1(body, body)).toBe(body);
  });

  // The file name is a lossy slug of the title, so a synthesized `# <file name>`
  // would flatten punctuation on every page that has a title the slug cannot
  // reproduce. Nothing is invented: a page that never had an H1 keeps none.
  it('invents no title when the page never had one', () => {
    const existing = '## Beschreibung\nAlt';
    const rewrite = '## Beschreibung\nNeu';
    expect(reassertH1(existing, rewrite)).toBe(rewrite);
  });

  // The restore is spliced in at the match position, not handed to
  // `String.replace` as a replacement string — which would read `$$` as one `$`
  // and `$&` as the title it just matched, mutating exactly the punctuation this
  // function exists to keep.
  it('restores a title containing `$` escapes verbatim', () => {
    const existing = '# Kosten $$500 und $& im Titel\n\n## Beschreibung\nAlt';
    const rewrite = '# Kosten\n\n## Beschreibung\nNeu';
    expect(reassertH1(existing, rewrite)).toBe(
      '# Kosten $$500 und $& im Titel\n\n## Beschreibung\nNeu',
    );
  });

  // ...and at the match POSITION, so a line that merely quotes the title earlier
  // in the body is not mistaken for the H1.
  it('changes the H1 only, not an earlier line quoting it mid-line', () => {
    const existing = '# Sulforaphan\n\n## Beschreibung\nAlt';
    const rewrite = 'Siehe # Sulforaphan-Dosierung im Anhang.\n# Sulforaphan-Dosierung\n\nNeu';
    expect(reassertH1(existing, rewrite)).toBe(
      'Siehe # Sulforaphan-Dosierung im Anhang.\n# Sulforaphan\n\nNeu',
    );
  });

  // #435 Item 1: a `# ` line inside a `---` block the model echoed around the
  // body is a comment, not the title. Taking it would have restored the page's
  // title into the comment and left the model's title standing below it.
  it('ignores a `# ` comment inside a leading `---` block', () => {
    const existing = '# Sulforaphan\n\n## Beschreibung\nAlt';
    const rewrite = '---\n# user note\ntitle: X\n---\n# Sulforaphan-Dosierung\n\nNeu';
    expect(reassertH1(existing, rewrite)).toBe(
      '---\n# user note\ntitle: X\n---\n# Sulforaphan\n\nNeu',
    );
  });

  // The likelier variant of the same mistake: `# ` opens a comment in most shell
  // dialects, so any page carrying a bash example carries H1-looking lines.
  it('ignores a `# ` comment inside a fenced code block', () => {
    const existing = '# Sulforaphan\n\n## Beschreibung\nAlt';
    const rewrite = '```bash\n# install the thing\n```\n\n# Sulforaphan-Dosierung\n\nNeu';
    expect(reassertH1(existing, rewrite)).toBe(
      '```bash\n# install the thing\n```\n\n# Sulforaphan\n\nNeu',
    );
  });

  // Same misreading on the READ side: a shell comment must not be adopted as the
  // page's previous title, or the function would mint one for a page that had
  // none — the mass mutation the file-name path was rejected for.
  it('invents no title from a `# ` comment in the existing body', () => {
    const existing = '```bash\n# install the thing\n```\n\n## Beschreibung\nAlt';
    const rewrite = '## Beschreibung\nNeu';
    expect(reassertH1(existing, rewrite)).toBe(rewrite);
  });

  // A `---` further down is a thematic break, not frontmatter — the lines after
  // it are ordinary body and can hold the H1.
  it('finds an H1 that follows a mid-body thematic break', () => {
    const existing = '# Sulforaphan\n\n## Beschreibung\nAlt';
    const rewrite = 'Lead.\n\n---\n\n# Sulforaphan-Dosierung\n\nNeu';
    expect(reassertH1(existing, rewrite)).toBe('Lead.\n\n---\n\n# Sulforaphan\n\nNeu');
  });
});

describe('stripUnknownSections (drop prompt-scaffolding sections the model copied into the body)', () => {
  const DE = [
    'Grundlegende Informationen', 'Beschreibung', 'Verwandte Inhalte',
    'Erwähnungen in der Quelle', 'Neue Informationen', 'Definition',
    'Hauptmerkmale', 'Anwendungen', 'Verwandte Konzepte', 'Verwandte Entitäten',
    'Quelle', 'Kerninhalt', 'Wichtige Entitäten', 'Wichtige Konzepte',
    'Hauptpunkte', 'Aufgelöste Widersprüche', 'Neue Behauptung',
    'Bestehendes Wissen', 'Lösungsvorschlag', 'Quellseite',
    'Verwandte Seiten', 'Aktualisiert',
  ];

  // The real S37 leak: the tag-vocabulary block copied verbatim from the prompt.
  it('drops the ## Active Tag Vocabulary block and keeps everything schema-valid', () => {
    const body = [
      '# NF-κB-Signalweg',
      '',
      '## Beschreibung',
      'NF-κB ist ein Master-Regulator der Inflammation.',
      '',
      '## Active Tag Vocabulary (Issue #85 — user-controlled)',
      '',
      'When assigning `type`, you MUST use one of the following allowed values.',
      '- Erkrankung',
      '- Pharmakologie',
      '',
      '## Verwandte Konzepte',
      '- [[concepts/Inflammation|Inflammation]]',
      '',
      '## Erwähnungen in der Quelle',
      '- "NF-κB – Master-Regulator" — [[Notizen/Biochemie|Biochemie]]',
    ].join('\n');

    const r = stripUnknownSections(body, DE);
    expect(r).not.toContain('Active Tag Vocabulary');
    expect(r).not.toContain('MUST use one of the following');
    expect(r).not.toContain('- Erkrankung');
    // Every schema section survives, in order, with its content.
    expect(r).toContain('## Beschreibung');
    expect(r).toContain('Master-Regulator der Inflammation');
    expect(r).toContain('## Verwandte Konzepte');
    expect(r).toContain('- [[concepts/Inflammation|Inflammation]]');
    expect(r).toContain('## Erwähnungen in der Quelle');
    expect(r).toContain('[[Notizen/Biochemie|Biochemie]]');
    // H1 and lead structure untouched.
    expect(r).toContain('# NF-κB-Signalweg');
  });

  it('keeps a concept page intact (Definition/Hauptmerkmale/Anwendungen are valid labels)', () => {
    const body = [
      '## Definition', 'Autophagie ist ein Abbauprozess.',
      '', '## Hauptmerkmale', '- Zelluläre Homöostase',
      '', '## Anwendungen', 'Prävention neurodegenerativer Prozesse.',
      '', '## Verwandte Konzepte', '- [[concepts/Mitophagie|Mitophagie]]',
    ].join('\n');
    expect(stripUnknownSections(body, DE)).toBe(body);
  });

  it('is a no-op when every section is a known label', () => {
    const body = '## Beschreibung\nText.\n\n## Erwähnungen in der Quelle\n- "x" — [[Notizen/A|A]]';
    expect(stripUnknownSections(body, DE)).toBe(body);
  });

  it('leaves frontmatter and the lead paragraph before the first ## untouched', () => {
    const body = [
      '---', 'type: entity', '---', '', '# Titel', '', 'Einleitungstext ohne Header.',
      '', '## Fremde Sektion', 'Müll.',
    ].join('\n');
    const r = stripUnknownSections(body, DE);
    expect(r).toContain('type: entity');
    expect(r).toContain('# Titel');
    expect(r).toContain('Einleitungstext ohne Header.');
    expect(r).not.toContain('## Fremde Sektion');
    expect(r).not.toContain('Müll.');
  });

  it('does not widen the gap — no run of 3+ blank lines where a section was removed', () => {
    const body = '## Beschreibung\nText.\n\n## Weg\nMüll.\n\n## Verwandte Konzepte\n- [[concepts/X|X]]';
    const r = stripUnknownSections(body, DE);
    expect(r).not.toMatch(/\n\n\n/);
    expect(r).toContain('## Beschreibung');
    expect(r).toContain('## Verwandte Konzepte');
  });

  it('still snaps near-miss headers via the canonicalizer, only strips true foreigners', () => {
    // canonicalize first (repairs the garble), then strip (removes the foreigner).
    const body = '## Erwägungen in der Quelle\n- "x" — [[Notizen/A|A]]\n\n## Active Tag Vocabulary\nMüll.';
    const canon = canonicalizeSectionHeaders(body, DE);
    const r = stripUnknownSections(canon, DE);
    expect(r).toContain('## Erwähnungen in der Quelle');
    expect(r).not.toContain('Active Tag Vocabulary');
  });
});
