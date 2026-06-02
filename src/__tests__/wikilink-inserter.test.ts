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
});
