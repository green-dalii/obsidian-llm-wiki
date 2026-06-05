import { describe, it, expect } from 'vitest';
import { crossLinkWithExistingPages } from '../utils';

type Item = {
  name: string;
  summary: string;
  mentions_in_source: string[];
  related_entities?: string[];
  related_concepts?: string[];
};

type Page = { path: string; title: string; aliases?: string[] };

const entityPage = (title: string, aliases?: string[]): Page => ({
  path: `wiki/entities/${title}.md`,
  title,
  aliases,
});

const conceptPage = (title: string, aliases?: string[]): Page => ({
  path: `wiki/concepts/${title}.md`,
  title,
  aliases,
});

describe('crossLinkWithExistingPages', () => {
  it('adds entity page to related_entities when title found in summary', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Entity C uses Entity A extensively.', mentions_in_source: [], related_entities: [], related_concepts: [] }];
    const pages: Page[] = [entityPage('Entity A')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities).toContain('Entity A');
  });

  it('adds concept page to related_concepts when title found in mentions_in_source', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Some summary.', mentions_in_source: ['Transformer architecture is used here.'], related_entities: [], related_concepts: [] }];
    const pages: Page[] = [conceptPage('Transformer')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_concepts).toContain('Transformer');
  });

  it('does not add self-reference when page title matches item name', () => {
    const items: Item[] = [{ name: 'Entity A', summary: 'Entity A is about itself.', mentions_in_source: [], related_entities: [], related_concepts: [] }];
    const pages: Page[] = [entityPage('Entity A')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities).not.toContain('Entity A');
  });

  it('does not duplicate if title already in related_entities', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Uses Entity A.', mentions_in_source: [], related_entities: ['Entity A'], related_concepts: [] }];
    const pages: Page[] = [entityPage('Entity A')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities!.filter(e => e === 'Entity A')).toHaveLength(1);
  });

  it('does not match page titles shorter than 3 characters', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Uses AI and ML tools.', mentions_in_source: [], related_entities: [], related_concepts: [] }];
    const pages: Page[] = [entityPage('AI'), entityPage('ML')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities).toHaveLength(0);
  });

  it('matches via alias when title is not found in text', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Uses GPT-4 extensively.', mentions_in_source: [], related_entities: [], related_concepts: [] }];
    const pages: Page[] = [entityPage('GPT-4-Turbo', ['GPT-4'])];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities).toContain('GPT-4-Turbo');
  });

  it('is case-insensitive when matching', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Uses entity a as a base.', mentions_in_source: [], related_entities: [], related_concepts: [] }];
    const pages: Page[] = [entityPage('Entity A')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities).toContain('Entity A');
  });

  it('initialises undefined related_entities/related_concepts before pushing', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Uses Entity A and Transformer.', mentions_in_source: [] }];
    const pages: Page[] = [entityPage('Entity A'), conceptPage('Transformer')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities).toContain('Entity A');
    expect(items[0].related_concepts).toContain('Transformer');
  });

  it('makes no changes when no existing page names appear in item text', () => {
    const items: Item[] = [{ name: 'Entity C', summary: 'Completely unrelated content.', mentions_in_source: [], related_entities: [], related_concepts: [] }];
    const pages: Page[] = [entityPage('Entity A'), conceptPage('Transformer')];
    crossLinkWithExistingPages(items, pages);
    expect(items[0].related_entities).toHaveLength(0);
    expect(items[0].related_concepts).toHaveLength(0);
  });
});
