import { describe, it, expect } from 'vitest';
import {
  buildOrphanLinkPrompt,
  validateOrphanLinkTarget,
  buildOrphanLinkUpdate,
  normalizeOrphanPagePath,
  type OrphanContext,
  type OrphanLinkSuggestion,
} from './orphan-matcher';

describe('Orphan Matcher — Pure Functions', () => {
  describe('buildOrphanLinkPrompt', () => {
    const mockContext: OrphanContext = {
      orphanContent: '# Orphan Page\n\nThis page needs links.',
      wikiIndex: '- [[entities/test|Test]]\n- [[concepts/example|Example]]',
    };

    it('replaces all placeholders', () => {
      const template = 'Content: {{orphan_content}}\nIndex: {{wiki_index}}';
      const result = buildOrphanLinkPrompt(template, mockContext);

      expect(result).toContain('Content: # Orphan Page');
      expect(result).toContain('Index: - [[entities/test|Test]]');
    });

    it('handles empty template', () => {
      const result = buildOrphanLinkPrompt('', mockContext);
      expect(result).toBe('');
    });

    it('truncates orphan content to 2000 chars', () => {
      const longContent = 'x'.repeat(3000);
      const context = { ...mockContext, orphanContent: longContent };
      const result = buildOrphanLinkPrompt('{{orphan_content}}', context);

      expect(result.length).toBeLessThan(2100);
    });

    it('truncates wiki index to 3000 chars', () => {
      const longIndex = 'y'.repeat(4000);
      const context = { ...mockContext, wikiIndex: longIndex };
      const result = buildOrphanLinkPrompt('{{wiki_index}}', context);

      expect(result.length).toBeLessThan(3100);
    });

    it('preserves content under limits', () => {
      const shortContext: OrphanContext = {
        orphanContent: 'Short',
        wikiIndex: 'Brief',
      };
      const result = buildOrphanLinkPrompt('{{orphan_content}} {{wiki_index}}', shortContext);
      expect(result).toBe('Short Brief');
    });

    it('handles multiple occurrences of same placeholder', () => {
      const template = '{{orphan_content}} and {{orphan_content}}';
      const result = buildOrphanLinkPrompt(template, mockContext);
      expect(result).toContain('# Orphan Page');
      expect(result.split('# Orphan Page').length).toBe(3); // 2 occurrences + 1
    });

    it('handles special characters in content', () => {
      const specialContext: OrphanContext = {
        orphanContent: 'Special <>&"\' chars',
        wikiIndex: 'Index with [brackets]',
      };
      const result = buildOrphanLinkPrompt('{{orphan_content}} {{wiki_index}}', specialContext);
      expect(result).toContain('Special <>&"\' chars');
      expect(result).toContain('Index with [brackets]');
    });

    it('handles multi-line content', () => {
      const multiLineContext: OrphanContext = {
        orphanContent: 'Line 1\nLine 2\nLine 3',
        wikiIndex: 'Index line',
      };
      const result = buildOrphanLinkPrompt('{{orphan_content}}', multiLineContext);
      expect(result).toContain('Line 1\nLine 2\nLine 3');
    });
  });

  describe('validateOrphanLinkTarget', () => {
    it('returns true when target exists in content', () => {
      const content = 'This content has [[entities/target|Target]] link.';
      const result = validateOrphanLinkTarget(content, '[[entities/target|Target]]');
      expect(result).toBe(true);
    });

    it('returns false when target does not exist', () => {
      const content = 'This content has no matching link.';
      const result = validateOrphanLinkTarget(content, '[[missing|Missing]]');
      expect(result).toBe(false);
    });

    it('returns true for partial match', () => {
      const content = 'Content with [[entities/test|Test]]';
      const result = validateOrphanLinkTarget(content, '[[entities/test|Test]]');
      expect(result).toBe(true);
    });

    it('handles empty content', () => {
      const result = validateOrphanLinkTarget('', '[[any|Any]]');
      expect(result).toBe(false);
    });

    it('handles empty target', () => {
      const content = 'Some content';
      const result = validateOrphanLinkTarget(content, '');
      expect(result).toBe(true); // empty string is in any string
    });

    it('is case sensitive', () => {
      const content = 'Content with [[Test]]';
      const result = validateOrphanLinkTarget(content, '[[test]]');
      expect(result).toBe(false);
    });
  });

  describe('buildOrphanLinkUpdate', () => {
    const mockSuggestion: OrphanLinkSuggestion = {
      pagePath: 'entities/related.md',
      linkText: '- See also',
      linkTarget: '[[orphans/orphan|Orphan Page]]',
    };

    it('adds link to existing section', () => {
      const content = '# Related\n\n## Related Pages\n- Existing link';
      const result = buildOrphanLinkUpdate(content, mockSuggestion, 'Related Pages');

      expect(result).toContain('## Related Pages');
      expect(result).toContain('- Existing link');
      expect(result).toContain('- See also [[orphans/orphan|Orphan Page]]');
    });

    it('creates new section if not exists', () => {
      const content = '# Related\n\nSome content.';
      const result = buildOrphanLinkUpdate(content, mockSuggestion, 'Related Pages');

      expect(result).toContain('## Related Pages');
      expect(result).toContain('Some content.');
      expect(result).toContain('- See also [[orphans/orphan|Orphan Page]]');
    });

    it('handles empty content', () => {
      const result = buildOrphanLinkUpdate('', mockSuggestion, 'Related');
      expect(result).toContain('## Related');
      expect(result).toContain('- See also');
    });

    it('handles different section headers', () => {
      const content = 'Content';
      const result = buildOrphanLinkUpdate(content, mockSuggestion, 'See Also');
      expect(result).toContain('## See Also');
    });

    it('preserves existing format', () => {
      const content = '# Title\n\nBody text.';
      const result = buildOrphanLinkUpdate(content, mockSuggestion, 'Links');
      expect(result.startsWith('# Title\n\nBody text.')).toBe(true);
      expect(result).toContain('## Links');
    });
  });

  describe('normalizeOrphanPagePath', () => {
    it('returns full path as-is', () => {
      const result = normalizeOrphanPagePath('wiki/entities/page.md', 'wiki');
      expect(result).toBe('wiki/entities/page.md');
    });

    it('adds wiki folder prefix to relative path', () => {
      const result = normalizeOrphanPagePath('entities/page.md', 'wiki');
      expect(result).toBe('wiki/entities/page.md');
    });

    it('handles paths starting with wiki folder name', () => {
      // If path starts with wiki folder name (not full path), it's treated as full
      const result = normalizeOrphanPagePath('wiki-concepts/page.md', 'wiki');
      // startsWith('wiki') is true, so treated as full path
      expect(result).toBe('wiki-concepts/page.md');
    });

    it('handles root-level paths', () => {
      const result = normalizeOrphanPagePath('page.md', 'wiki');
      expect(result).toBe('wiki/page.md');
    });

    it('handles nested paths', () => {
      const result = normalizeOrphanPagePath('a/b/c/page.md', 'wiki');
      expect(result).toBe('wiki/a/b/c/page.md');
    });

    it('handles empty path', () => {
      const result = normalizeOrphanPagePath('', 'wiki');
      expect(result).toBe('wiki/');
    });
  });
});
