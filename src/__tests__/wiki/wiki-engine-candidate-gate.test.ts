// Issue #514: the candidate gate sits between analysis and page planning, so
// a candidate the source never says, or says only in parentheses, gets no page
// and no further call. Opt-in: `skipMentionOnlyCandidates`, off by default.

import { describe, it, expect } from 'vitest';
import { TFile } from 'obsidian';
import { createWikiEngineHarness } from '../__support__/wiki-engine-harness';

const NOTE_PATH = 'Notizen/Ferritin.md';
const NOTE = `# Ferritin

Ferritin ist das intrazelluläre Eisenspeicherprotein. Es steigt bei Entzündung
(CRP erhöht) an. Die Transferrinsättigung ergänzt den Befund.
`;

function noteFile(): TFile {
  return Object.assign(new TFile(), { path: NOTE_PATH, basename: 'Ferritin', extension: 'md' });
}

const EXTRACTION = JSON.stringify({
  source_title: 'Ferritin',
  summary: 'Iron store.',
  entities: [
    { name: 'Ferritin', type: 'other', summary: 'store', mentions_in_source: ['Ferritin ist das intrazelluläre Eisenspeicherprotein.'] },
    { name: 'CRP', type: 'other', summary: 'marker', mentions_in_source: ['(CRP erhöht)'] },
  ],
  concepts: [
    { name: 'Transferrinsättigung', type: 'term', summary: 'ratio', mentions_in_source: [], related_concepts: ['Hepcidin'] },
    { name: 'Hepcidin', type: 'term', summary: 'regulator', mentions_in_source: [], related_concepts: [] },
  ],
});

describe('WikiEngine.ingestSource — candidate gate', () => {
  it('writes pages only for candidates the source carries in prose', async () => {
    const h = createWikiEngineHarness({
      files: { [NOTE_PATH]: NOTE },
      llmResponses: [EXTRACTION],
      settings: { wikiLanguage: 'de', skipMentionOnlyCandidates: true },
    });

    await h.engine.ingestSource(noteFile());

    // Slugs are lower-cased by default; compare on the lower-cased path.
    const written = h.writtenPaths
      .filter(p => p.startsWith('wiki/entities/') || p.startsWith('wiki/concepts/'))
      .map(p => p.toLowerCase());
    expect(written.some(p => p.endsWith('/ferritin.md'))).toBe(true);
    expect(written.some(p => p.includes('/transferrins'))).toBe(true);
    expect(written.some(p => p.endsWith('/crp.md'))).toBe(false);
    expect(written.some(p => p.endsWith('/hepcidin.md'))).toBe(false);

    const gateMsg = h.progressMessages.find(m => m.startsWith('Candidate gate:'));
    expect(gateMsg).toContain('CRP (entity, aside)');
    expect(gateMsg).toContain('Hepcidin (concept, absent)');

    const report = h.reports.at(-1);
    expect(report?.entitiesCreated).toBe(1);
    expect(report?.conceptsCreated).toBe(1);
  });

  it('does not gate a note that declares a language other than the wiki language — its names are translations', async () => {
    const h = createWikiEngineHarness({
      files: { [NOTE_PATH]: `---\nlanguage: en\n---\n\n# Ferritin\n\nFerritin is the iron store; hepcidin regulates uptake.\n` },
      llmResponses: [EXTRACTION],
      settings: { wikiLanguage: 'de', skipMentionOnlyCandidates: true },
    });
    await h.engine.ingestSource(noteFile());
    expect(h.progressMessages.some(m => m.startsWith('Candidate gate:'))).toBe(false);
    const written = h.writtenPaths.map(p => p.toLowerCase());
    expect(written.some(p => p.endsWith('/crp.md'))).toBe(true);
    expect(written.some(p => p.endsWith('/hepcidin.md'))).toBe(true);
  });

  it('reports once, and does not gate, a wiki language without a profile', async () => {
    const h = createWikiEngineHarness({
      files: { [NOTE_PATH]: NOTE },
      llmResponses: [EXTRACTION],
      settings: { wikiLanguage: 'it', skipMentionOnlyCandidates: true },
    });
    await h.engine.ingestSource(noteFile());
    expect(h.progressMessages.filter(m => m.startsWith('Candidate gate:'))).toEqual(['Candidate gate: no language profile for "it" — not applied']);
    expect(h.writtenPaths.map(p => p.toLowerCase()).some(p => p.endsWith('/crp.md'))).toBe(true);
  });

  it('is off by default — an upgrade does not change which pages an ingest writes', async () => {
    const h = createWikiEngineHarness({
      files: { [NOTE_PATH]: NOTE },
      llmResponses: [EXTRACTION],
      settings: { wikiLanguage: 'de' },
    });
    await h.engine.ingestSource(noteFile());
    expect(h.progressMessages.some(m => m.startsWith('Candidate gate:'))).toBe(false);
    const written = h.writtenPaths.map(p => p.toLowerCase());
    expect(written.some(p => p.endsWith('/crp.md'))).toBe(true);
    expect(written.some(p => p.endsWith('/hepcidin.md'))).toBe(true);
  });

  it('stays silent when every candidate is in prose', async () => {
    const h = createWikiEngineHarness({
      files: { [NOTE_PATH]: NOTE },
      llmResponses: [JSON.stringify({
        source_title: 'Ferritin', summary: 's',
        entities: [{ name: 'Ferritin', type: 'other', summary: '', mentions_in_source: [] }],
        concepts: [],
      })],
    });
    await h.engine.ingestSource(noteFile());
    expect(h.progressMessages.some(m => m.startsWith('Candidate gate:'))).toBe(false);
  });
});
