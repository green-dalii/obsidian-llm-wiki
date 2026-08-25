// Issue #496 (Cause 2 + Cause 3 visibility): buildSourceAnalysis now
// aggregates every extracted item's verbatim quotes into the top-level
// SourceAnalysis.mentions_in_source — the field existed on the type but was
// never populated, so source pages could not carry a Mentions section even
// after the delivery fix (#491) and the injection route. Provenance quotes
// win over legacy strings; the pool is deduped by trimmed text.
//
// The aggregation also logs one debug line per ingest stating how many
// verbatim quotes were captured across how many items — the visible counter
// that lets a run distinguish "no quotes in this note" from "the model
// skipped the field entirely" (#496 Cause 3), without making the field
// required (a hard-fail risk on weak models, per the issue's own caveat).

import { describe, it, expect, vi } from 'vitest';
import { buildSourceAnalysis, createEmptyAccumulation } from '../../core/batch-merger';

function accumulationWith(items: Array<Record<string, unknown>>) {
  const acc = createEmptyAccumulation();
  for (const item of items) {
    const isConcept = (item.__kind as string) === 'concept';
    delete item.__kind;
    if (isConcept) acc.concepts.push(item as never);
    else acc.entities.push(item as never);
  }
  return acc;
}

describe('buildSourceAnalysis — source-level quote aggregation (#496)', () => {
  it('collects legacy mentions_in_source strings across entities and concepts', () => {
    const analysis = buildSourceAnalysis(
      'sources/note.md',
      'note',
      accumulationWith([
        { name: 'A', summary: 'a', mentions_in_source: ['quote one', 'quote two'] },
        { __kind: 'concept', name: 'B', summary: 'b', mentions_in_source: ['quote three'] },
      ]),
    );
    expect(analysis.mentions_in_source).toEqual(['quote one', 'quote two', 'quote three']);
  });

  it('prefers provenance quotes over legacy strings and dedupes by trimmed text', () => {
    const analysis = buildSourceAnalysis(
      'sources/note.md',
      'note',
      accumulationWith([
        {
          name: 'A',
          summary: 'a',
          mentions_in_source: ['dup'],
          mentions_with_provenance: [
            { quote: 'structured quote', source_path: 'sources/note.md' },
            { quote: 'dup' },
          ],
        },
        { __kind: 'concept', name: 'B', summary: 'b', mentions_in_source: ['  structured quote  '] },
      ]),
    );
    expect(analysis.mentions_in_source).toEqual(['structured quote', 'dup']);
  });

  it('leaves an empty pool when no item carried any mention form', () => {
    const analysis = buildSourceAnalysis(
      'sources/note.md',
      'note',
      accumulationWith([
        { name: 'A', summary: 'a', mentions_in_source: [] },
        { __kind: 'concept', name: 'B', summary: 'b' },
      ]),
    );
    expect(analysis.mentions_in_source).toEqual([]);
  });

  it('logs the capture counts once so omission is visible (#496 Cause 3)', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    try {
      buildSourceAnalysis(
        'sources/note.md',
        'note',
        accumulationWith([
          { name: 'A', summary: 'a', mentions_in_source: ['q1', 'q2'] },
          { __kind: 'concept', name: 'B', summary: 'b' },
        ]),
      );
      const line = debugSpy.mock.calls.map((c) => c.join(' ')).find((s) => s.includes('[MENTIONS-CAPTURE]'));
      expect(line, 'expected a [MENTIONS-CAPTURE] debug line').toBeDefined();
      expect(line).toContain('2 verbatim quote(s)');
      // Item A carried quotes; concept B emitted none — the per-item split
      // is exactly what makes "model skipped the field" visible.
      expect(line).toContain('1 of 2');
    } finally {
      debugSpy.mockRestore();
    }
  });
});
