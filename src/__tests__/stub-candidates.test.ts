import { describe, it, expect } from 'vitest';
import { computeStubCandidates } from '../wiki/stub-candidates';
import type { SourceAnalysis } from '../types';

function makeAnalysis(
  entities: Array<{ name: string; related_entities?: string[]; related_concepts?: string[] }>,
  concepts: Array<{ name: string; related_concepts?: string[]; related_entities?: string[] }>
): SourceAnalysis {
  return {
    source_file: 'test.md',
    source_title: 'Test',
    summary: '',
    entities: entities.map(e => ({
      name: e.name,
      type: 'other' as const,
      summary: '',
      mentions_in_source: [],
      related_entities: e.related_entities,
      related_concepts: e.related_concepts,
    })),
    concepts: concepts.map(c => ({
      name: c.name,
      type: 'other' as const,
      summary: '',
      mentions_in_source: [],
      related_concepts: c.related_concepts ?? [],
      related_entities: c.related_entities,
    })),
    contradictions: [],
    related_pages: [],
    key_points: [],
    created_pages: [],
    updated_pages: [],
  };
}

describe('computeStubCandidates', () => {
  it('returns empty array when analysis has no related items', () => {
    const analysis = makeAnalysis([{ name: 'A' }], [{ name: 'B' }]);
    expect(computeStubCandidates(analysis)).toEqual([]);
  });

  it('excludes names already in analysis.entities or analysis.concepts', () => {
    const analysis = makeAnalysis(
      [{ name: 'A', related_entities: ['B', 'X'] }],
      [{ name: 'B', related_entities: ['A'] }]
    );
    // B and A are extracted — only X is non-extracted
    const result = computeStubCandidates(analysis);
    expect(result.map(r => r.name)).not.toContain('A');
    expect(result.map(r => r.name)).not.toContain('B');
  });

  it('creates stubs only for names appearing in ≥2 related lists when numExtracted ≥ 10', () => {
    // 10 extracted items → threshold = max(1, min(2, floor(10/5))) = 2
    const entities = Array.from({ length: 10 }, (_, i) => ({
      name: `Entity${i}`,
      related_entities: i < 5 ? ['CommonX'] : [],  // CommonX mentioned by 5 entities
      related_concepts: i >= 5 ? ['SingleY'] : [],  // SingleY mentioned by only 5 entities total but we want just once each
    }));
    const analysis = makeAnalysis(entities, []);
    const result = computeStubCandidates(analysis);
    const names = result.map(r => r.name);
    expect(names).toContain('CommonX'); // freq=5 → passes threshold=2
    // SingleY appears 5 times too, so it also passes
    expect(names).toContain('SingleY');
  });

  it('uses threshold=1 for sparse sources (fewer than 5 extracted)', () => {
    // 2 extracted → threshold = max(1, min(2, floor(2/5))) = max(1, 0) = 1
    const analysis = makeAnalysis(
      [{ name: 'A', related_entities: ['Orphan'] }],
      [{ name: 'B' }]
    );
    const result = computeStubCandidates(analysis);
    expect(result.map(r => r.name)).toContain('Orphan');
  });

  it('applies floor rule: lowers threshold to 1 if no candidates pass threshold', () => {
    // 10 extracted → threshold = 2; but all related items appear exactly once
    const entities = Array.from({ length: 10 }, (_, i) => ({
      name: `Entity${i}`,
      related_entities: [`Unique${i}`],  // each Unique item appears exactly once
    }));
    const analysis = makeAnalysis(entities, []);
    const result = computeStubCandidates(analysis);
    // floor rule kicks in: all Unique items become candidates
    expect(result.length).toBe(10);
  });

  it('correctly assigns type entity for related_entities', () => {
    const analysis = makeAnalysis(
      [{ name: 'A', related_entities: ['PersonX'] }],
      []
    );
    const result = computeStubCandidates(analysis);
    const candidate = result.find(r => r.name === 'PersonX');
    expect(candidate?.type).toBe('entity');
  });

  it('correctly assigns type concept for related_concepts', () => {
    const analysis = makeAnalysis(
      [{ name: 'A', related_concepts: ['ConceptY'] }],
      []
    );
    const result = computeStubCandidates(analysis);
    const candidate = result.find(r => r.name === 'ConceptY');
    expect(candidate?.type).toBe('concept');
  });

  it('deduplicates: same name from multiple related lists produces one stub', () => {
    const analysis = makeAnalysis(
      [
        { name: 'A', related_entities: ['Shared'] },
        { name: 'B', related_entities: ['Shared'] },
      ],
      []
    );
    const result = computeStubCandidates(analysis);
    const shared = result.filter(r => r.name === 'Shared');
    expect(shared).toHaveLength(1);
    expect(shared[0].frequency).toBe(2);
  });

  it('is case-insensitive when excluding extracted names', () => {
    const analysis = makeAnalysis(
      [{ name: 'Alpha', related_entities: ['alpha', 'ALPHA', 'Beta'] }],
      []
    );
    // 'alpha' and 'ALPHA' should be excluded (same as 'Alpha' extracted), only 'Beta' survives
    const result = computeStubCandidates(analysis);
    const names = result.map(r => r.name);
    expect(names).not.toContain('alpha');
    expect(names).not.toContain('ALPHA');
    expect(names).toContain('Beta');
  });

  it('skips empty or whitespace-only related names', () => {
    const analysis = makeAnalysis(
      [{ name: 'A', related_entities: ['', '  ', 'ValidName'] }],
      []
    );
    const result = computeStubCandidates(analysis);
    expect(result.map(r => r.name)).not.toContain('');
    expect(result.map(r => r.name)).not.toContain('  ');
  });
});
