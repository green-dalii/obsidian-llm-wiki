// Batch Merger — Pure functions for merging extraction batches
// Extracted from source-analyzer.ts::analyzeSource()
// Zero side effects, fully unit-testable

import { EntityInfo, ConceptInfo, ContradictionInfo, SourceAnalysis, MentionWithProvenance } from '../types';

export interface BatchAccumulation {
  entities: EntityInfo[];
  concepts: ConceptInfo[];
  contradictions: ContradictionInfo[];
  relatedPages: string[];
  keyPoints: string[];
  extractedNames: Set<string>;
}

export interface MergeResult {
  newEntities: EntityInfo[];
  newConcepts: ConceptInfo[];
  allEntities: EntityInfo[];
  allConcepts: ConceptInfo[];
  extractedNames: Set<string>;
}

// ── Internal merge helpers for Issue #244 ────────────────────

/**
 * Deduplicate an array of MentionWithProvenance by quote string,
 * preserving insertion order (first occurrence wins).
 */
function dedupMentionsByQuote(
  a: MentionWithProvenance[] | undefined,
  b: MentionWithProvenance[] | undefined,
): MentionWithProvenance[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  if (!a?.length) return b;
  if (!b?.length) return a;
  const seen = new Set(a.map(m => m.quote));
  const merged = [...a];
  for (const m of b) {
    if (!seen.has(m.quote)) {
      merged.push(m);
      seen.add(m.quote);
    }
  }
  return merged;
}

/**
 * Deduplicate two string arrays, preserving insertion order.
 */
function dedupStrings(a: string[] | undefined, b: string[] | undefined): string[] {
  if (!a?.length && !b?.length) return [];
  if (!a?.length) return b ?? [];
  if (!b?.length) return a;
  const seen = new Set(a);
  const merged = [...a];
  for (const s of b) {
    if (!seen.has(s)) {
      merged.push(s);
      seen.add(s);
    }
  }
  return merged;
}

/**
 * Merge mentions from a duplicate entity/concept into the existing one.
 * Generic over the common mentions shape — eliminates the 11-line near-clones
 * that were duplicated for EntityInfo vs ConceptInfo.
 */
function mergeMentionsFields<
  T extends {
    mentions_in_source?: string[];
    mentions_with_provenance?: MentionWithProvenance[];
  },
>(existing: T, incoming: T): T {
  const hasProvenance = incoming.mentions_with_provenance?.length;
  const hasLegacy = incoming.mentions_in_source?.length;
  if (!hasProvenance && !hasLegacy) return existing;

  return {
    ...existing,
    mentions_with_provenance: dedupMentionsByQuote(
      existing.mentions_with_provenance,
      incoming.mentions_with_provenance,
    ),
    mentions_in_source: dedupStrings(
      existing.mentions_in_source,
      incoming.mentions_in_source,
    ),
  };
}

/**
 * Create empty batch accumulation.
 */
export function createEmptyAccumulation(): BatchAccumulation {
  return {
    entities: [],
    concepts: [],
    contradictions: [],
    relatedPages: [],
    keyPoints: [],
    extractedNames: new Set<string>()
  };
}

/**
 * Merge new batch results into accumulated data.
 *
 * @param current - Current accumulated data
 * @param newBatch - New batch data to merge
 * @param customCaps - Custom per-type caps (null for standard mode)
 * @returns Merge result with filtered and merged data
 */
export function mergeBatchResults(
  current: BatchAccumulation,
  newBatch: {
    entities: EntityInfo[];
    concepts: ConceptInfo[];
    contradictions?: ContradictionInfo[];
    relatedPages?: string[];
    keyPoints?: string[];
  },
  customCaps?: { entityCap?: number | null; conceptCap?: number | null }
): MergeResult {
  // Issue #244: separate duplicates whose mentions should be merged
  // from truly unique entries.
  const duplicateEntities: EntityInfo[] = [];
  const duplicateConcepts: ConceptInfo[] = [];

  const newEntities = newBatch.entities.filter(e => {
    const name = e.name.trim().toLowerCase();
    if (current.extractedNames.has(name)) {
      duplicateEntities.push(e);
      return false;
    }
    return true;
  });

  const newConcepts = newBatch.concepts.filter(c => {
    const name = c.name.trim().toLowerCase();
    if (current.extractedNames.has(name)) {
      duplicateConcepts.push(c);
      return false;
    }
    return true;
  });

  // Merge mentions from duplicates into the existing accumulation items.
  // E1: Map lookup is O(1) per item, replacing the previous O(N×M) nested find.
  let mergedEntities = current.entities;
  if (duplicateEntities.length > 0) {
    const dupeMap = new Map(duplicateEntities.map(d => [d.name.trim().toLowerCase(), d]));
    mergedEntities = current.entities.map(existing => {
      const dupe = dupeMap.get(existing.name.trim().toLowerCase());
      return dupe ? mergeMentionsFields(existing, dupe) : existing;
    });
  }

  let mergedConcepts = current.concepts;
  if (duplicateConcepts.length > 0) {
    const dupeMap = new Map(duplicateConcepts.map(d => [d.name.trim().toLowerCase(), d]));
    mergedConcepts = current.concepts.map(existing => {
      const dupe = dupeMap.get(existing.name.trim().toLowerCase());
      return dupe ? mergeMentionsFields(existing, dupe) : existing;
    });
  }

  // Apply custom caps if in custom mode
  let cappedEntities = newEntities;
  let cappedConcepts = newConcepts;

  if (customCaps?.entityCap !== null && customCaps?.entityCap !== undefined) {
    const remaining = Math.max(0, customCaps.entityCap - current.entities.length);
    cappedEntities = newEntities.slice(0, remaining);
  }

  if (customCaps?.conceptCap !== null && customCaps?.conceptCap !== undefined) {
    const remaining = Math.max(0, customCaps.conceptCap - current.concepts.length);
    cappedConcepts = newConcepts.slice(0, remaining);
  }

  // Index names and aliases for deduplication
  const updatedExtractedNames = new Set(current.extractedNames);
  for (const e of cappedEntities) {
    updatedExtractedNames.add(e.name.trim().toLowerCase());
    for (const alias of e.aliases || []) {
      updatedExtractedNames.add(alias.trim().toLowerCase());
    }
  }
  for (const c of cappedConcepts) {
    updatedExtractedNames.add(c.name.trim().toLowerCase());
    for (const alias of c.aliases || []) {
      updatedExtractedNames.add(alias.trim().toLowerCase());
    }
  }

  return {
    newEntities: cappedEntities,
    newConcepts: cappedConcepts,
    allEntities: [...mergedEntities, ...cappedEntities],
    allConcepts: [...mergedConcepts, ...cappedConcepts],
    extractedNames: updatedExtractedNames
  };
}

/**
 * Build final SourceAnalysis from accumulated data.
 *
 * @param filePath - Source file path
 * @param fileBasename - Source file basename
 * @param accumulation - Accumulated batch data
 * @param firstBatchData - Data from first batch (title, summary, etc.)
 * @returns Complete SourceAnalysis object
 */
export function buildSourceAnalysis(
  filePath: string,
  fileBasename: string,
  accumulation: BatchAccumulation,
  firstBatchData?: {
    sourceTitle?: string | null;
    summary?: string | null;
    contradictions?: ContradictionInfo[];
    relatedPages?: string[];
    keyPoints?: string[];
  }
): SourceAnalysis {
  return {
    source_file: filePath,
    source_title: firstBatchData?.sourceTitle || fileBasename,
    summary: firstBatchData?.summary || '',
    entities: accumulation.entities,
    concepts: accumulation.concepts,
    contradictions: accumulation.contradictions,
    related_pages: accumulation.relatedPages,
    key_points: accumulation.keyPoints,
    created_pages: [],
    updated_pages: []
  };
}

/**
 * Extract unique names from batch for deduplication.
 *
 * @param batch - Batch with entities and concepts
 * @returns Set of unique lowercase names and aliases
 */
export function extractUniqueNames(batch: {
  entities: EntityInfo[];
  concepts: ConceptInfo[];
}): Set<string> {
  const names = new Set<string>();

  for (const e of batch.entities) {
    names.add(e.name.trim().toLowerCase());
    for (const alias of e.aliases || []) {
      names.add(alias.trim().toLowerCase());
    }
  }

  for (const c of batch.concepts) {
    names.add(c.name.trim().toLowerCase());
    for (const alias of c.aliases || []) {
      names.add(alias.trim().toLowerCase());
    }
  }

  return names;
}

/**
 * Calculate batch statistics for logging.
 *
 * @param batchNum - Current batch number
 * @param newItems - New items in current batch
 * @param cumulative - Cumulative totals
 * @returns Formatted statistics string
 */
export function calculateBatchStats(
  batchNum: number,
  newItems: { entities: number; concepts: number },
  cumulative: { entities: number; concepts: number }
): string {
  const totalNew = newItems.entities + newItems.concepts;
  return `[Batch ${batchNum}] New: ${newItems.entities} entities, ${newItems.concepts} concepts (total: ${totalNew}) | Cumulative: ${cumulative.entities} entities, ${cumulative.concepts} concepts`;
}
