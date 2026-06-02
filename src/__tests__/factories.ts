// Test data factories — standardized mock data construction
// Eliminates repetitive mock setup across test files

import type { EntityInfo, ConceptInfo } from '../types';

/**
 * Create a standard EntityInfo for tests
 * @param overrides - Optional field overrides
 * @returns Complete EntityInfo with sensible defaults
 */
export function createMockEntity(overrides?: Partial<EntityInfo>): EntityInfo {
  return {
    name: 'Test Entity',
    type: 'other',
    summary: 'A test entity for unit tests',
    mentions_in_source: ['This is a test context'],
    related_entities: [],
    related_concepts: [],
    ...overrides,
  };
}

/**
 * Create a standard ConceptInfo for tests
 * @param overrides - Optional field overrides
 * @returns Complete ConceptInfo with sensible defaults
 */
export function createMockConcept(overrides?: Partial<ConceptInfo>): ConceptInfo {
  return {
    name: 'Test Concept',
    type: 'term',
    summary: 'A test concept for unit tests',
    mentions_in_source: ['This is a test context'],
    related_concepts: [],
    related_entities: [],
    ...overrides,
  };
}

/**
 * Create a standard TFile-like object for tests
 * @param name - Filename including extension
 * @returns Mock TFile with required fields
 */
export function createMockSourceFile(name: string): { name: string; path: string; extension: string } {
  const ext = name.includes('.') ? name.split('.').pop()! : 'md';
  return {
    name,
    path: `sources/${name}`,
    extension: ext,
  };
}

/**
 * Batch extraction result fixture builder
 * @param entities - Number of entities to generate
 * @param concepts - Number of concepts to generate
 * @returns Standard batch extraction response
 */
export function createMockBatchResult(
  entities: number = 2,
  concepts: number = 2,
): { entities: EntityInfo[]; concepts: ConceptInfo[] } {
  return {
    entities: Array.from({ length: entities }, (_, i) =>
      createMockEntity({ name: `Entity ${i + 1}` })
    ),
    concepts: Array.from({ length: concepts }, (_, i) =>
      createMockConcept({ name: `Concept ${i + 1}` })
    ),
  };
}
