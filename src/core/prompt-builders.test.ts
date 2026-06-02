import { describe, it, expect } from 'vitest';
import {
  buildEmptyPagePrompt,
  cleanWikiIndex,
  correctLinkPollution,
  type EmptyPageContext,
} from './prompt-builders';

describe('Prompt Builders — Pure Functions', () => {
  describe('buildEmptyPagePrompt', () => {
    const mockContext: EmptyPageContext = {
      pageType: 'entity',
      existingContent: '# Test Entity\n\nThis is a stub.',
      wikiIndex: '- [[entities/test|Test]]',
      sectionLabelsHint: 'Basic Information, Related Entities',
      maxEntities: 3,
      maxConcepts: 2,
    };

    it('replaces all placeholders', () => {
      const template = 'Type: {{page_type}}\nContent: {{existing_content}}\nIndex: {{wiki_index}}\nLabels: {{section_labels}}\nLimits: {{max_entities}} entities, {{max_concepts}} concepts';

      const result = buildEmptyPagePrompt(template, mockContext);

      expect(result).toContain('Type: entity');
      expect(result).toContain('Content: # Test Entity');
      expect(result).toContain('Index: - [[entities/test|Test]]');
      expect(result).toContain('Labels: Basic Information, Related Entities');
      expect(result).toContain('Limits: 3 entities, 2 concepts');
    });

    it('handles empty template', () => {
      const result = buildEmptyPagePrompt('', mockContext);
      expect(result).toBe('');
    });

    it('truncates wiki index to 2000 chars', () => {
      const longIndex = 'x'.repeat(3000);
      const context = { ...mockContext, wikiIndex: longIndex };

      const result = buildEmptyPagePrompt('Index: {{wiki_index}}', context);

      expect(result.length).toBeLessThan(2100);
      expect(result).not.toContain('x'.repeat(2500));
    });

    it('preserves wiki index under 2000 chars', () => {
      const shortIndex = '- [[test|Test]]';
      const context = { ...mockContext, wikiIndex: shortIndex };

      const result = buildEmptyPagePrompt('{{wiki_index}}', context);

      expect(result).toBe(shortIndex);
    });

    it('handles special characters in content', () => {
      const specialContext = {
        ...mockContext,
        existingContent: '# Special $chars: <>&"\'\n[markdown](link)',
      };

      const result = buildEmptyPagePrompt('{{existing_content}}', specialContext);

      expect(result).toContain('# Special $chars: <>&"\'');
    });

    it('converts numbers to strings', () => {
      const result = buildEmptyPagePrompt('{{max_entities}}', mockContext);
      expect(result).toBe('3');
      expect(typeof result).toBe('string');
    });

    it('handles multiple occurrences of same placeholder', () => {
      const template = '{{page_type}} and {{page_type}}';
      const result = buildEmptyPagePrompt(template, mockContext);
      expect(result).toBe('entity and entity');
    });

    it('preserves unknown placeholders', () => {
      const template = '{{unknown}} stays';
      const result = buildEmptyPagePrompt(template, mockContext);
      expect(result).toBe('{{unknown}} stays');
    });

    it('handles concept page type', () => {
      const conceptContext = { ...mockContext, pageType: 'concept' };
      const result = buildEmptyPagePrompt('{{page_type}}', conceptContext);
      expect(result).toBe('concept');
    });

    it('handles source page type', () => {
      const sourceContext = { ...mockContext, pageType: 'sources' };
      const result = buildEmptyPagePrompt('{{page_type}}', sourceContext);
      expect(result).toBe('sources');
    });
  });

  describe('cleanWikiIndex', () => {
    it('removes polluted entries with duplicate folder in path', () => {
      const polluted = '- [[entities/name/entitiesName]]';
      const cleaned = cleanWikiIndex(polluted);
      expect(cleaned).toBe('');
    });

    it('removes polluted entries with folder prefix in display', () => {
      const polluted = '- [[entities/name|entities/display]]';
      const cleaned = cleanWikiIndex(polluted);
      expect(cleaned).toBe('');
    });

    it('preserves clean wiki links', () => {
      const clean = '- [[entities/test|Test]]\n- [[concepts/example|Example]]';
      const result = cleanWikiIndex(clean);
      expect(result).toBe(clean);
    });

    it('handles mixed clean and polluted', () => {
      const mixed = `- [[entities/clean|Clean]]
- [[entities/bad/entitiesBad]]
- [[concepts/good|Good]]
- [[concepts/bad|concepts/polluted]]`;

      const cleaned = cleanWikiIndex(mixed);

      expect(cleaned).toContain('[[entities/clean|Clean]]');
      expect(cleaned).toContain('[[concepts/good|Good]]');
      expect(cleaned).not.toContain('entitiesBad');
      expect(cleaned).not.toContain('concepts/polluted');
    });

    it('handles empty input', () => {
      expect(cleanWikiIndex('')).toBe('');
    });

    it('handles multi-line content', () => {
      const multi = `## Header
- [[entities/test|Test]]
- [[concepts/example|Example]]`;

      const cleaned = cleanWikiIndex(multi);

      expect(cleaned).toContain('## Header');
      expect(cleaned).toContain('[[entities/test|Test]]');
    });

    it('handles sources folder pollution', () => {
      const polluted = '- [[sources/doc/sourcesDocument]]';
      const cleaned = cleanWikiIndex(polluted);
      expect(cleaned).toBe('');
    });
  });

  describe('correctLinkPollution', () => {
    it('corrects display text pollution', () => {
      const polluted = 'See [[entities/test|entities/Test]]';
      const cleaned = correctLinkPollution(polluted);
      expect(cleaned).toBe('See [[entities/test|Test]]');
    });

    it('corrects path duplication', () => {
      const polluted = 'See [[entities/entitiesTest]]';
      const cleaned = correctLinkPollution(polluted);
      expect(cleaned).toBe('See [[entities/Test]]');
    });

    it('preserves clean links', () => {
      const clean = 'See [[entities/test|Test]] and [[concepts/example|Example]]';
      const result = correctLinkPollution(clean);
      expect(result).toBe(clean);
    });

    it('handles multiple polluted links', () => {
      const polluted = 'See [[entities/a|entities/A]] and [[concepts/b|concepts/B]]';
      const cleaned = correctLinkPollution(polluted);
      expect(cleaned).toBe('See [[entities/a|A]] and [[concepts/b|B]]');
    });

    it('handles mixed clean and polluted', () => {
      const mixed = 'Clean: [[entities/good|Good]], Polluted: [[entities/bad|entities/Bad]]';
      const cleaned = correctLinkPollution(mixed);
      expect(cleaned).toBe('Clean: [[entities/good|Good]], Polluted: [[entities/bad|Bad]]');
    });

    it('preserves display text when cleaning path dup', () => {
      const polluted = 'See [[entities/entitiesTest|Display]]';
      const cleaned = correctLinkPollution(polluted);
      expect(cleaned).toBe('See [[entities/Test|Display]]');
    });

    it('handles empty input', () => {
      expect(correctLinkPollution('')).toBe('');
    });

    it('corrects sources folder pollution', () => {
      const polluted = 'See [[sources/doc|sources/Document]]';
      const cleaned = correctLinkPollution(polluted);
      expect(cleaned).toBe('See [[sources/doc|Document]]');
    });
  });
});
