// Batch Merger — Pure functions for merging extraction batches
// Extracted from source-analyzer.ts::analyzeSource()
// Zero side effects, fully unit-testable

import { EntityInfo, ConceptInfo, ContradictionInfo, SourceAnalysis } from '../types';

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
  // Filter out duplicates
  const newEntities = newBatch.entities.filter(e => {
    const name = e.name.trim().toLowerCase();
    return !current.extractedNames.has(name);
  });

  const newConcepts = newBatch.concepts.filter(c => {
    const name = c.name.trim().toLowerCase();
    return !current.extractedNames.has(name);
  });

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
    allEntities: [...current.entities, ...cappedEntities],
    allConcepts: [...current.concepts, ...cappedConcepts],
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
