import { describe, it, expect } from 'vitest';
import {
  createMockEntity,
  createMockConcept,
  createMockSourceFile,
  createMockBatchResult,
} from './factories';

describe('Test Factories', () => {
  describe('createMockEntity', () => {
    it('creates entity with defaults', () => {
      const entity = createMockEntity();
      expect(entity.name).toBe('Test Entity');
      expect(entity.type).toBe('other');
      expect(entity.summary).toBe('A test entity for unit tests');
      expect(entity.mentions_in_source).toHaveLength(1);
    });

    it('applies overrides', () => {
      const entity = createMockEntity({ name: 'Custom Name', type: 'person' });
      expect(entity.name).toBe('Custom Name');
      expect(entity.type).toBe('person');
      expect(entity.summary).toBe('A test entity for unit tests'); // 保留默认值
    });
  });

  describe('createMockConcept', () => {
    it('creates concept with defaults', () => {
      const concept = createMockConcept();
      expect(concept.name).toBe('Test Concept');
      expect(concept.type).toBe('term');
      expect(concept.summary).toBe('A test concept for unit tests');
    });

    it('applies overrides', () => {
      const concept = createMockConcept({ name: 'Custom Concept', type: 'theory' });
      expect(concept.name).toBe('Custom Concept');
      expect(concept.type).toBe('theory');
    });
  });

  describe('createMockSourceFile', () => {
    it('creates source file with path', () => {
      const file = createMockSourceFile('document.md');
      expect(file.name).toBe('document.md');
      expect(file.path).toBe('sources/document.md');
      expect(file.extension).toBe('md');
    });

    it('handles extensionless names with default', () => {
      const file = createMockSourceFile('README');
      expect(file.extension).toBe('md'); // defaults to md when no extension
    });
  });

  describe('createMockBatchResult', () => {
    it('creates batch with specified counts', () => {
      const batch = createMockBatchResult(3, 2);
      expect(batch.entities).toHaveLength(3);
      expect(batch.concepts).toHaveLength(2);
      expect(batch.entities[0].name).toBe('Entity 1');
      expect(batch.concepts[0].name).toBe('Concept 1');
    });

    it('uses default counts', () => {
      const batch = createMockBatchResult();
      expect(batch.entities).toHaveLength(2);
      expect(batch.concepts).toHaveLength(2);
    });
  });
});
