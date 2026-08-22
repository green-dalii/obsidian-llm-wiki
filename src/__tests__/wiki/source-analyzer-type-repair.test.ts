// Issue #527 wiring — the fold is covered in core/tag-vocab.test.ts, the
// schema in llm-sdk/output-schemas.test.ts. What is covered here is that
// `analyzeSource` actually runs the repair on the accumulated items, that the
// model's answer reaches the returned analysis, that an unusable answer leaves
// the extracted value in place, and that an in-vocabulary extraction costs no
// extra call.

import { describe, it, expect } from 'vitest';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { SourceAnalyzer } from '../../wiki/source-analyzer';
import { TFile } from 'obsidian';

const NOTE = 'sources/Ferritin.md';
const BODY = `Ferritin ist das Eisenspeicherprotein. Hepcidin reguliert die Eisenaufnahme;
Transferrin transportiert Eisen im Blut.
`;

const CUSTOM = {
  tagVocabularyMode: 'custom' as const,
  customEntityTags: 'Biochemie, Erkrankung, Laborwerte',
  customConceptTags: 'Physiologie, Metabolismus',
};

/** Ferritin in vocabulary; Transferrin a case near-miss; Hepcidin and the
 *  concept carry the built-in taxonomy the prompt told the model not to use. */
const EXTRACTION = JSON.stringify({
  source_title: 'Ferritin',
  summary: 'Die Notiz beschreibt den Eisenstoffwechsel.',
  entities: [
    { name: 'Ferritin', type: 'Biochemie', summary: 'Eisenspeicherprotein.', mentions_in_source: ['a'] },
    { name: 'Transferrin', type: 'biochemie', summary: 'Transportprotein.', mentions_in_source: ['b'] },
    { name: 'Hepcidin', type: 'person', summary: 'Peptidhormon der Leber, das die Eisenaufnahme drosselt.', mentions_in_source: ['c'] },
  ],
  concepts: [
    { name: 'Eisenhomöostase', type: 'method', summary: 'Regelkreis der Eisenaufnahme und -speicherung.', mentions_in_source: ['d'] },
  ],
});

const EXTRACTION_DEFAULT_VOCAB = JSON.stringify({
  source_title: 'Ferritin',
  summary: 'Die Notiz beschreibt den Eisenstoffwechsel.',
  entities: [
    { name: 'Ferritin', type: 'other', summary: 'Eisenspeicherprotein.', mentions_in_source: ['a'] },
  ],
  concepts: [
    { name: 'Eisenhomöostase', type: 'phenomenon', summary: 'Regelkreis.', mentions_in_source: ['d'] },
  ],
});

const EMPTY_BATCH = JSON.stringify({ entities: [], concepts: [] });

function setup(responses: string[], settings?: Record<string, unknown>) {
  const { ctx } = createMockContext({
    vaultFiles: { [NOTE]: BODY },
    llmResponses: responses,
    ...(settings ? { settings } : {}),
  } as Parameters<typeof createMockContext>[0]);
  // Count every model call so "no extra call" is an assertion, not a guess.
  const client = ctx.getClient()!;
  const original = client.createMessage.bind(client);
  const calls = { n: 0 };
  client.createMessage = async params => { calls.n += 1; return original(params); };
  return { analyzer: new SourceAnalyzer(ctx), calls };
}

async function run(analyzer: SourceAnalyzer) {
  // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
  return analyzer.analyzeSource(createMockFile(NOTE) as unknown as TFile);
}

function typesOf(result: Awaited<ReturnType<SourceAnalyzer['analyzeSource']>>) {
  const out: Record<string, string> = {};
  for (const e of result?.entities ?? []) out[e.name] = e.type;
  for (const c of result?.concepts ?? []) out[c.name] = c.type;
  return out;
}

describe('SourceAnalyzer — Issue #527 type repair at intake', () => {
  it('folds a near-miss, asks the model for the rest, and writes the answers into the analysis', async () => {
    const { analyzer, calls } = setup([
      EXTRACTION, EMPTY_BATCH,
      JSON.stringify({ type: 'Laborwerte' }),   // Hepcidin
      JSON.stringify({ type: 'Physiologie' }),  // Eisenhomöostase
    ], CUSTOM);
    const result = await run(analyzer);
    expect(typesOf(result)).toEqual({
      Ferritin: 'Biochemie',        // in vocabulary — untouched
      Transferrin: 'Biochemie',     // case fold, no call
      Hepcidin: 'Laborwerte',       // model answer
      'Eisenhomöostase': 'Physiologie',
    });
    // two extraction batches + two repair calls, none for the folded item
    expect(calls.n).toBe(4);
  });

  it('keeps the extracted value when the answer is outside the vocabulary or not JSON', async () => {
    const { analyzer } = setup([
      EXTRACTION, EMPTY_BATCH,
      JSON.stringify({ type: 'Hormon' }),  // not in the vocabulary
      'I would say Physiologie.',           // not JSON
    ], CUSTOM);
    const result = await run(analyzer);
    const types = typesOf(result);
    expect(types.Hepcidin).toBe('person');
    expect(types['Eisenhomöostase']).toBe('method');
    expect(types.Transferrin).toBe('Biochemie'); // the fold does not depend on the model
  });

  it('folds the model\'s answer too — a case near-miss in the reply still lands on the vocabulary spelling', async () => {
    const { analyzer } = setup([
      EXTRACTION, EMPTY_BATCH,
      JSON.stringify({ type: 'laborwerte' }),
      JSON.stringify({ type: 'PHYSIOLOGIE' }),
    ], CUSTOM);
    const types = typesOf(await run(analyzer));
    expect(types.Hepcidin).toBe('Laborwerte');
    expect(types['Eisenhomöostase']).toBe('Physiologie');
  });

  it('makes no repair call under the default vocabulary when every type is in it', async () => {
    const { analyzer, calls } = setup([EXTRACTION_DEFAULT_VOCAB, EMPTY_BATCH]);
    const types = typesOf(await run(analyzer));
    expect(types.Ferritin).toBe('other');
    expect(types['Eisenhomöostase']).toBe('phenomenon');
    expect(calls.n).toBe(2);
  });
});
