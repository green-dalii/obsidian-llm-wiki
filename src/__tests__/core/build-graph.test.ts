import { describe, it, expect } from 'vitest';
import { buildGraphFromContent } from '../../core/build-graph';

describe('buildGraphFromContent', () => {
  it('returns empty graph for empty input', () => {
    const result = buildGraphFromContent([], new Set(), 'wiki');
    expect(result.nodes).toEqual([]);
    expect(result.edges.size).toBe(0);
  });

  it('returns single node with no edges for a page with no wiki links', () => {
    const pages = [{ path: 'entities/cat', content: '## Description\nCats are cute.' }];
    const result = buildGraphFromContent(pages, new Set(['entities/cat']), 'wiki');
    expect(result.nodes).toEqual(['entities/cat']);
    expect(result.edges.get('entities/cat')).toEqual([]);
  });

  it('extracts a single wiki link from content', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\nRelated to [[wiki/entities/dog|Dog]].\n## Mentions in Source\n- "cat"',
    }];
    const allPaths = new Set(['entities/cat', 'entities/dog']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.nodes).toContain('entities/cat');
    expect(result.nodes).toContain('entities/dog');
    expect(result.edges.get('entities/cat')).toEqual(['entities/dog']);
  });

  it('skips self-links', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\n[[wiki/entities/cat|Cat]] links to itself.',
    }];
    const allPaths = new Set(['entities/cat']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.edges.get('entities/cat')).toEqual([]);
  });

  it('deduplicates links to the same page', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\n[[wiki/entities/dog|Dog]] is related.\n[[wiki/entities/dog|Canine]] also mentioned.',
    }];
    const allPaths = new Set(['entities/cat', 'entities/dog']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.edges.get('entities/cat')).toEqual(['entities/dog']);
  });

  it('skips links to pages not in allPaths (dead links)', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\n[[wiki/entities/nonexistent|Missing]] page.',
    }];
    const allPaths = new Set(['entities/cat']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.edges.get('entities/cat')).toEqual([]);
  });

  it('handles multiple pages with cross-links', () => {
    const pages = [
      { path: 'entities/cat', content: '## Description\nFriend of [[wiki/entities/dog|Dog]].' },
      { path: 'entities/dog', content: '## Description\nFriend of [[wiki/entities/cat|Cat]].' },
      { path: 'entities/fish', content: '## Description\nSwims alone.' },
    ];
    const allPaths = new Set(['entities/cat', 'entities/dog', 'entities/fish']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.nodes).toHaveLength(3);
    expect(result.edges.get('entities/cat')).toEqual(['entities/dog']);
    expect(result.edges.get('entities/dog')).toEqual(['entities/cat']);
    expect(result.edges.get('entities/fish')).toEqual([]);
  });

  it('strips fragment identifiers from wiki links', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\nSee [[wiki/entities/dog#behavior|Dog behavior]].',
    }];
    const allPaths = new Set(['entities/cat', 'entities/dog']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.edges.get('entities/cat')).toEqual(['entities/dog']);
  });

  it('strips display text from wiki links', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\n[[wiki/entities/dog|Best Friend]] is a good boy.',
    }];
    const allPaths = new Set(['entities/cat', 'entities/dog']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.edges.get('entities/cat')).toEqual(['entities/dog']);
  });

  it('handles multiple wiki links in a single page', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\nRelated to [[wiki/entities/dog|Dog]] and [[wiki/entities/mouse|Mouse]].\n## Mentions\n- "cat food" [[wiki/concepts/predation|Predation]]',
    }];
    const allPaths = new Set(['entities/cat', 'entities/dog', 'entities/mouse', 'concepts/predation']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.edges.get('entities/cat')?.sort()).toEqual([
      'concepts/predation',
      'entities/dog',
      'entities/mouse',
    ]);
  });

  it('handles custom wiki folder prefix', () => {
    const pages = [{
      path: 'entities/cat',
      content: '## Description\nFriend of [[mywiki/entities/dog|Dog]].',
    }];
    const allPaths = new Set(['entities/cat', 'entities/dog']);
    const result = buildGraphFromContent(pages, allPaths, 'mywiki');
    expect(result.edges.get('entities/cat')).toEqual(['entities/dog']);
  });

  it('handles content with frontmatter', () => {
    const pages = [{
      path: 'entities/cat',
      content: '---\ntags: [animal]\n---\n## Description\nFriend of [[wiki/entities/dog|Dog]].',
    }];
    const allPaths = new Set(['entities/cat', 'entities/dog']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.edges.get('entities/cat')).toEqual(['entities/dog']);
  });

  it('includes all nodes from allPaths even if some have no edges', () => {
    const pages = [{ path: 'entities/cat', content: '## Description\nCat content.' }];
    const allPaths = new Set(['entities/cat', 'entities/dog', 'entities/fish']);
    const result = buildGraphFromContent(pages, allPaths, 'wiki');
    expect(result.nodes).toContain('entities/cat');
    expect(result.nodes).toContain('entities/dog');
    expect(result.nodes).toContain('entities/fish');
    // Every node gets an edge array (may be empty).
    expect(result.edges.size).toBe(3);
    expect(result.edges.get('entities/cat')).toEqual([]);
    expect(result.edges.get('entities/dog')).toEqual([]);
    expect(result.edges.get('entities/fish')).toEqual([]);
  });
});
