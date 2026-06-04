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

  describe('CJK entity linking', () => {
    const ENTITY_ZH: WikiPage = { title: '机器学习', wikiLink: '[[concepts/machine-learning|机器学习]]' };
    const ENTITY_JA: WikiPage = { title: 'ニューラルネットワーク', wikiLink: '[[concepts/neural-network|ニューラルネットワーク]]' };
    const ENTITY_KO: WikiPage = { title: '기계학습', wikiLink: '[[concepts/machine-learning|기계학습]]' };

    it('links a Chinese entity name in plain text', () => {
      const body = '深度学习和机器学习是人工智能的核心领域。';
      const result = insertWikiLinks(body, [ENTITY_ZH]);
      expect(result).toBe('深度学习和[[concepts/machine-learning|机器学习]]是人工智能的核心领域。');
    });

    it('does not double-wrap a Chinese entity already inside [[...]]', () => {
      const body = '[[concepts/machine-learning|机器学习]]在现代技术中非常重要。';
      const result = insertWikiLinks(body, [ENTITY_ZH]);
      expect(result).toBe('[[concepts/machine-learning|机器学习]]在现代技术中非常重要。');
    });

    it('links a Japanese katakana entity name', () => {
      const body = 'ニューラルネットワークは深層学習の基礎です。';
      const result = insertWikiLinks(body, [ENTITY_JA]);
      expect(result).toBe('[[concepts/neural-network|ニューラルネットワーク]]は深層学習の基礎です。');
    });

    it('links a Korean Hangul entity name', () => {
      const body = '기계학습은 인공지능의 핵심 분야입니다.';
      const result = insertWikiLinks(body, [ENTITY_KO]);
      expect(result).toBe('[[concepts/machine-learning|기계학습]]은 인공지능의 핵심 분야입니다.');
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
