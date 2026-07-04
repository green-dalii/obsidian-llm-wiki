import { describe, it, expect } from 'vitest';
import { canonicalizeSectionHeaders } from '../../core/section-header-canonicalizer';

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
