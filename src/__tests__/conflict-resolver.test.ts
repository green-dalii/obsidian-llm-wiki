import { describe, it, expect } from 'vitest';
import {
  ConflictResolver,
} from '../core/conflict-resolver';

const WIKI_FOLDER = 'wiki';

function pages(paths: string[]) {
  return paths.map(p => {
    const parts = p.split('/');
    const name = parts.pop()!.replace('.md', '');
    return { path: `wiki/${p}`, title: name };
  });
}

describe('ConflictResolver', () => {
  it('returns create when no matching page exists', () => {
    const r = new ConflictResolver(WIKI_FOLDER, []);
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('create');
    expect(result.targetPath).toBe('wiki/entities/foo.md');
  });

  it('returns merge when same-type page exists', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['entities/foo.md']));
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('merge');
    expect(result.targetPath).toBe('wiki/entities/foo.md');
  });

  it('returns create when only opposite-type page exists (cross-type considered distinct)', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['concepts/foo.md']));
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('merge');    // cross-type collision → merge into concept
    expect(result.reason).toContain('Cross-type');
  });

  it('returns merge with correct target when cross-type match exists', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['concepts/foo.md', 'entities/bar.md']));
    const result = r.resolve({ name: 'Foo', slug: 'foo', pageType: 'entity' });
    expect(result.action).toBe('merge');
    expect(result.targetPath).toBe('wiki/concepts/foo.md');
    expect(result.existingType).toBe('concept');
  });

  it('matches by alias in same page', () => {
    const r = new ConflictResolver(WIKI_FOLDER, [
      { path: 'wiki/entities/llm.md', title: 'LLM', aliases: ['Large Language Model'] },
    ]);
    const result = r.resolve({ name: 'Large Language Model', slug: 'large-language-model', pageType: 'concept' });
    expect(result.action).toBe('merge');
    expect(result.reason).toContain('Cross-type');
  });

  it('selects correct high-confidence for same-type match', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['entities/vigilanz.md', 'concepts/vigilanz.md']));
    const result = r.resolve({ name: 'Vigilanz', slug: 'vigilanz', pageType: 'entity' });
    expect(result.action).toBe('merge');
    expect(result.targetPath).toBe('wiki/entities/vigilanz.md');  // same-type preferred
  });

  it('handles case-insensitive slug collisions', () => {
    const r = new ConflictResolver(WIKI_FOLDER, pages(['entities/chain-of-thought.md', 'entities/chain-of-thought.md']));
    const result = r.resolve({ name: 'chain of thought', slug: 'chain-of-thought', pageType: 'concept' });
    expect(result.action).toBe('merge');
    expect(result.reason).toContain('Cross-type');
  });
});
