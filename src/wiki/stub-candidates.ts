// Stub candidate computation — pure logic for pre-ingestion stub creation.
// Extracted so it can be unit-tested without Obsidian App mocks.

import { SourceAnalysis } from '../types';

export interface StubCandidate {
  name: string;
  type: 'entity' | 'concept';
  frequency: number;
}

/**
 * Compute which related entity/concept names should become pre-ingestion stubs.
 *
 * Items that are already in analysis.entities or analysis.concepts (and will
 * receive full pages) are excluded. The remaining related names are ranked by
 * how many extracted items co-mention them.
 *
 * Adaptive threshold: max(1, min(2, floor(numExtracted / 5)))
 * - Sparse sources (1–4 extracted): threshold = 1, stub any non-extracted mention
 * - Rich sources (10+ extracted): threshold = 2, stub only frequently co-mentioned items
 * Floor rule: if the threshold filters everything away, lower to 1 to always produce
 * at least a minimal stub set when non-extracted related items exist.
 */
export function computeStubCandidates(analysis: SourceAnalysis): StubCandidate[] {
  const allExtractedLower = new Set([
    ...analysis.entities.map(e => e.name.toLowerCase()),
    ...analysis.concepts.map(c => c.name.toLowerCase()),
  ]);

  const freq = new Map<string, number>();
  const nameType = new Map<string, 'entity' | 'concept'>();

  const record = (names: string[] | undefined, type: 'entity' | 'concept') => {
    for (const raw of names ?? []) {
      const name = raw.trim();
      if (!name || allExtractedLower.has(name.toLowerCase())) continue;
      freq.set(name, (freq.get(name) ?? 0) + 1);
      if (!nameType.has(name)) nameType.set(name, type);
    }
  };

  for (const entity of analysis.entities) {
    record(entity.related_entities, 'entity');
    record(entity.related_concepts, 'concept');
  }
  for (const concept of analysis.concepts) {
    record(concept.related_entities, 'entity');
    record(concept.related_concepts, 'concept');
  }

  if (freq.size === 0) return [];

  const numExtracted = analysis.entities.length + analysis.concepts.length;
  const threshold = Math.max(1, Math.min(2, Math.floor(numExtracted / 5)));

  let candidates = [...freq.entries()].filter(([, count]) => count >= threshold);

  // Floor rule: if threshold filtered everything, lower to 1
  if (candidates.length === 0) {
    candidates = [...freq.entries()];
  }

  return candidates.map(([name, frequency]) => ({
    name,
    type: nameType.get(name) ?? 'entity',
    frequency,
  }));
}
