import { describe, it, expect } from 'vitest';
import { insertWikiLinks } from '../core/wikilink-inserter';

type WikiPage = { title: string; wikiLink: string; aliases?: string[] };

const ENTITY_ALAN: WikiPage = {
  title: 'Alan Turing',
  wikiLink: '[[entities/alan-turing|Alan Turing]]',
  aliases: ['Turing'],
};

const CONCEPT_ML: WikiPage = {
  title: 'Machine Learning',
  wikiLink: '[[concepts/machine-learning|Machine Learning]]',
  aliases: ['ML'],
};

const ENTITY_SHORT: WikiPage = {
  title: 'Turing',
  wikiLink: '[[entities/turing|Turing]]',
};

describe('insertWikiLinks', () => {
  it('links every occurrence of an entity name', () => {
    const body = 'Alan Turing was a mathematician. Alan Turing also worked on AI.';
    const result = insertWikiLinks(body, [ENTITY_ALAN]);
    expect(result).toBe(
      '[[entities/alan-turing|Alan Turing]] was a mathematician. [[entities/alan-turing|Alan Turing]] also worked on AI.'
    );
  });

  it('links via alias and preserves display text from source', () => {
    const body = 'Turing invented the Turing machine.';
    const result = insertWikiLinks(body, [ENTITY_ALAN]);
    // "Turing" is an alias for Alan Turing; display text should match source
    expect(result).toContain('[[entities/alan-turing|Turing]]');
  });

  it('does not modify content inside existing [[...]] links', () => {
    const body = '[[entities/alan-turing|Alan Turing]] was smart.';
    const result = insertWikiLinks(body, [ENTITY_ALAN]);
    // Should not double-wrap
    expect(result).toBe('[[entities/alan-turing|Alan Turing]] was smart.');
  });

  it('does not modify frontmatter', () => {
    const content = '---\ntitle: Test\nsource: some/path.md\n---\nAlan Turing worked here.';
    const result = insertWikiLinks(content, [ENTITY_ALAN]);
    expect(result).toMatch(/^---\ntitle: Test\nsource: some\/path\.md\n---\n/);
    expect(result).toContain('[[entities/alan-turing|Alan Turing]]');
  });

  it('matches case-insensitively and preserves original casing in display text', () => {
    const body = 'machine learning is powerful. Machine learning is used widely.';
    const result = insertWikiLinks(body, [CONCEPT_ML]);
    expect(result).toContain('[[concepts/machine-learning|machine learning]]');
    expect(result).toContain('[[concepts/machine-learning|Machine learning]]');
  });

  it('longer alias wins over shorter when both would match (longest-first)', () => {
    // ENTITY_ALAN has alias "Turing". ENTITY_SHORT has title "Turing".
    // "Alan Turing" (longer) should be matched first, leaving no standalone "Turing" in that span.
    const body = 'Alan Turing is famous.';
    const result = insertWikiLinks(body, [ENTITY_ALAN, ENTITY_SHORT]);
    expect(result).toBe('[[entities/alan-turing|Alan Turing]] is famous.');
    expect(result).not.toContain('[[entities/turing|');
  });

  it('handles multiple different entities in the same text', () => {
    const body = 'Alan Turing studied Machine Learning concepts.';
    const result = insertWikiLinks(body, [ENTITY_ALAN, CONCEPT_ML]);
    expect(result).toContain('[[entities/alan-turing|Alan Turing]]');
    expect(result).toContain('[[concepts/machine-learning|Machine Learning]]');
  });

  it('does not match partial words (word-boundary aware)', () => {
    const body = 'Turing machines are theoretical. Turings contributions are vast.';
    const result = insertWikiLinks(body, [ENTITY_SHORT]);
    // "Turing" (standalone) is linked, "Turings" is not
    expect(result).toContain('[[entities/turing|Turing]] machines');
    expect(result).toContain('Turings contributions');
  });

  it('returns content unchanged when wiki pages list is empty', () => {
    const body = 'Some text with no wiki pages.';
    expect(insertWikiLinks(body, [])).toBe(body);
  });

  it('handles content with no frontmatter correctly', () => {
    const body = 'Alan Turing was great.';
    const result = insertWikiLinks(body, [ENTITY_ALAN]);
    expect(result).toBe('[[entities/alan-turing|Alan Turing]] was great.');
  });

  describe('CJK entity names', () => {
    const ENTITY_AI: WikiPage = {
      title: '人工智能',
      wikiLink: '[[entities/ren-gong-zhi-neng|人工智能]]',
    };
    const ENTITY_ML: WikiPage = {
      title: '机器学习',
      wikiLink: '[[concepts/ji-qi-xue-xi|机器学习]]',
    };

    it('links a CJK entity name in Chinese text', () => {
      const body = '这篇文章讨论了人工智能的应用。';
      const result = insertWikiLinks(body, [ENTITY_AI]);
      expect(result).toContain('[[entities/ren-gong-zhi-neng|人工智能]]');
    });

    it('links a CJK entity surrounded by other CJK characters', () => {
      const body = '关于人工智能技术的研究';
      const result = insertWikiLinks(body, [ENTITY_AI]);
      expect(result).toContain('[[entities/ren-gong-zhi-neng|人工智能]]');
    });

    it('links multiple CJK entities in one body', () => {
      const body = '人工智能和机器学习都很重要。';
      const result = insertWikiLinks(body, [ENTITY_AI, ENTITY_ML]);
      expect(result).toContain('[[entities/ren-gong-zhi-neng|人工智能]]');
      expect(result).toContain('[[concepts/ji-qi-xue-xi|机器学习]]');
    });

    it('longer CJK title wins over shorter alias (longest-first)', () => {
      const ENTITY_AI_SHORT: WikiPage = {
        title: '人工',
        wikiLink: '[[entities/ren-gong|人工]]',
      };
      const body = '人工智能的发展很快。';
      const result = insertWikiLinks(body, [ENTITY_AI, ENTITY_AI_SHORT]);
      // "人工智能" (4 chars) processed before "人工" (2 chars)
      expect(result).toContain('[[entities/ren-gong-zhi-neng|人工智能]]');
      expect(result).not.toContain('[[entities/ren-gong|');
    });

    it('does not touch frontmatter for CJK content', () => {
      const content = '---\ntitle: 测试\n---\n人工智能很重要。';
      const result = insertWikiLinks(content, [ENTITY_AI]);
      expect(result).toMatch(/^---\ntitle: 测试\n---\n/);
      expect(result).toContain('[[entities/ren-gong-zhi-neng|人工智能]]');
    });
  });

  describe('markdown link protection', () => {
    const ENTITY_QMD: WikiPage = { title: 'qmd', wikiLink: '[[entities/qmd|qmd]]' };

    it('does not replace entity name inside markdown link display text or URL', () => {
      const body = '[qmd](https://github.com/tobi/qmd) is a search engine.';
      const result = insertWikiLinks(body, [ENTITY_QMD]);
      expect(result).toBe('[qmd](https://github.com/tobi/qmd) is a search engine.');
    });

    it('does not modify markdown link URL even when entity name appears there', () => {
      const body = 'See [the project](https://github.com/tobi/qmd) for details.';
      const result = insertWikiLinks(body, [ENTITY_QMD]);
      expect(result).toBe('See [the project](https://github.com/tobi/qmd) for details.');
    });

    it('links entity name in plain text adjacent to a preserved markdown link', () => {
      const body = 'qmd is available at [qmd](https://github.com/tobi/qmd).';
      const result = insertWikiLinks(body, [ENTITY_QMD]);
      expect(result).toBe('[[entities/qmd|qmd]] is available at [qmd](https://github.com/tobi/qmd).');
    });

    it('does not replace entity name inside image alt text or URL', () => {
      const body = '![qmd logo](https://example.com/qmd.png)';
      const result = insertWikiLinks(body, [ENTITY_QMD]);
      expect(result).toBe('![qmd logo](https://example.com/qmd.png)');
    });
  });
});
