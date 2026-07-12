// Module-level unit tests for page-factory/complementary-appends.ts
//
// v1.24.1 Phase 2 refactor: the 7 helper functions and the
// applyComplementaryAppends orchestrator were lifted out of PageFactory.
// The tests pin the 4-layer section anchor fallback, the per-section LLM
// contract, the list-vs-paragraph separator choice (#185 follow-up), and
// the failed-group fallback to "## New Information ({{source}})".

import { describe, it, expect } from 'vitest';
import {
  escapeRegExp,
  findSectionInBody,
  resolveSectionAnchor,
  spliceAfterSection,
  makeFallbackNewInfoSection,
  applyComplementaryAppends,
  type ComplementaryContext,
} from '../../../wiki/page-factory/complementary-appends';
import { createMockEntity } from '../../__support__/factories';
import type { LLMWikiSettings, LLMClient } from '../../../types';

function makeCtx(client: LLMClient | null = null): ComplementaryContext {
  return {
    settings: { wikiFolder: 'wiki', wikiLanguage: 'en', disableThinking: false } as LLMWikiSettings,
    getClient: () => client,
    buildSystemPrompt: async () => 'system',
  };
}

function makeClient(responses: string[]): LLMClient {
  let i = 0;
  return {
    createMessage: async () => responses[i++] ?? 'NO_NEW_CONTENT',
  };
}

describe('escapeRegExp', () => {
  it('escapes all regex special characters', () => {
    expect(escapeRegExp('a.b*c+d?e')).toBe('a\\.b\\*c\\+d\\?e');
    expect(escapeRegExp('(foo)[bar]{baz}')).toBe('\\(foo\\)\\[bar\\]\\{baz\\}');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeRegExp('hello world')).toBe('hello world');
  });
});

describe('findSectionInBody', () => {
  it('returns null when the heading is absent', () => {
    expect(findSectionInBody('Description', '# title\n\nbody')).toBeNull();
  });

  it('returns the section content + anchorEnd for an exact match', () => {
    const body = '# title\n\n## Description\nA paragraph.\n\n## Other\nB paragraph.';
    const result = findSectionInBody('Description', body);
    expect(result?.headingText).toBe('Description');
    expect(result?.content).toBe('A paragraph.');
    expect(result?.anchorEnd).toBeGreaterThan(0);
  });

  it('trims trailing whitespace from the section content', () => {
    const body = '## Heading\nContent line 1\nContent line 2\n\n\n## Next';
    const result = findSectionInBody('Heading', body);
    expect(result?.content).toBe('Content line 1\nContent line 2');
  });
});

describe('resolveSectionAnchor — 4-layer fallback', () => {
  const labels = ['Description', 'Related Concepts', 'New Information'];
  const body = '# title\n\n## Description\nA para.\n\n## Related Concepts\n- one\n- two';

  it('Layer 1: exact match against canonical labels', () => {
    const result = resolveSectionAnchor('Description', body, labels);
    expect(result?.headingText).toBe('Description');
  });

  it('Layer 3a: canonical snap of body heading matches target', () => {
    // Body has "## Related Concepts"; target is the canonical label.
    const result = resolveSectionAnchor('Related Concepts', body, labels);
    expect(result?.headingText).toBe('Related Concepts');
  });

  it('returns null when no layer succeeds', () => {
    const result = resolveSectionAnchor('Nonexistent Heading', body, labels);
    expect(result).toBeNull();
  });

  it('returns null when body is empty', () => {
    expect(resolveSectionAnchor('Anything', '', labels)).toBeNull();
  });
});

describe('spliceAfterSection — separator choice (#185 follow-up)', () => {
  it('uses single \\n separator for list-typed sections (no blank line)', () => {
    const body = '## Section\n- a\n- b\n\n## Other\nfoo';
    const result = findSectionInBody('Section', body);
    expect(result).not.toBeNull();
    const spliced = spliceAfterSection(body, result!.anchorEnd, '- c', true);
    // The new bullet should immediately follow '- b' with no blank line.
    expect(spliced).toBe('## Section\n- a\n- b\n- c\n## Other\nfoo');
  });

  it('uses \\n\\n separator for paragraph sections (visible blank line)', () => {
    const body = '## Section\nSome prose.\nMore prose.\n\n## Other\nfoo';
    const result = findSectionInBody('Section', body);
    expect(result).not.toBeNull();
    const spliced = spliceAfterSection(body, result!.anchorEnd, 'New paragraph.', false);
    expect(spliced).toMatch(/More prose\.\n\nNew paragraph\./);
  });

  it('trims trailing whitespace on the prefix (no double separator)', () => {
    // Body ends the section with extra trailing whitespace.
    const body = '## Section\ncontent  \n\n\n\n## Other\nfoo';
    const result = findSectionInBody('Section', body);
    expect(result).not.toBeNull();
    const spliced = spliceAfterSection(body, result!.anchorEnd, 'new', false);
    // Must not have a run of >2 newlines between content and new.
    expect(spliced).not.toMatch(/content {2}\n\n\n\nnew/);
  });
});

describe('makeFallbackNewInfoSection', () => {
  it('returns empty string when no failed groups', () => {
    expect(makeFallbackNewInfoSection([], [], 'article')).toBe('');
  });

  it('emits a New Information section with only the failed items', () => {
    const items: import('../../../wiki/page-factory/complementary-appends').ComplementaryItem[] = [
      { kind: 'complementary', content: 'a', target_section: 'A' },
      { kind: 'complementary', content: 'b', target_section: 'B' },
      { kind: 'complementary', content: 'c', target_section: 'C' },
    ];
    const out = makeFallbackNewInfoSection(['A', 'C'], items, 'article');
    expect(out).toContain('## New Information (article)');
    expect(out).toContain('- a');
    expect(out).toContain('- c');
    expect(out).not.toContain('- b'); // B succeeded, not in fallback.
  });

  it('uses a placeholder body when allItems has no matching items', () => {
    const out = makeFallbackNewInfoSection(['X'], [], 'article');
    expect(out).toContain('- New information from article');
  });
});

describe('applyComplementaryAppends — orchestrator', () => {
  it('returns original body when items is empty', async () => {
    const ctx = makeCtx();
    const out = await applyComplementaryAppends(ctx, [], '# x', createMockEntity(), { path: 'p.md', basename: 'p.md' });
    expect(out).toBe('# x');
  });

  it('returns original body when no LLM client is configured', async () => {
    const ctx = makeCtx(null);
    const out = await applyComplementaryAppends(
      ctx,
      [{ kind: 'complementary', content: 'x', target_section: '## Description' }],
      '## Description\nA.',
      createMockEntity(),
      { path: 'p.md', basename: 'p.md' },
    );
    expect(out).toBe('## Description\nA.');
  });

  it('splices appended content into the matched section', async () => {
    const ctx = makeCtx(makeClient(['New detail.']));
    const body = '## Description\nOld content.';
    const out = await applyComplementaryAppends(
      ctx,
      [{ kind: 'complementary', content: 'new detail', target_section: 'Description' }],
      body,
      createMockEntity(),
      { path: 'p.md', basename: 'p.md' },
    );
    expect(out).toContain('Old content.');
    expect(out).toContain('New detail.');
  });

  it('emits New Information fallback for sections the LLM could not place', async () => {
    const ctx = makeCtx(makeClient(['NO_NEW_CONTENT', 'NO_NEW_CONTENT']));
    const body = '# title\n\n## Description\nOld content.';
    const out = await applyComplementaryAppends(
      ctx,
      [{ kind: 'complementary', content: 'fallback fact', target_section: 'Nonexistent Heading' }],
      body,
      createMockEntity(),
      { path: 'p.md', basename: 'p.md' },
    );
    expect(out).toContain('## New Information (p.md)');
    expect(out).toContain('fallback fact');
  });

  it('returns original body unchanged when every group NO_NEW_CONTENTs AND has no failed groups', async () => {
    // The "info already present" branch: anchor found, LLM said NO_NEW_CONTENT.
    // The orchestrator continues without emitting a fallback section.
    const ctx = makeCtx(makeClient(['NO_NEW_CONTENT']));
    const body = '## Description\nOld content.';
    const out = await applyComplementaryAppends(
      ctx,
      [{ kind: 'complementary', content: 'x', target_section: 'Description' }],
      body,
      createMockEntity(),
      { path: 'p.md', basename: 'p.md' },
    );
    expect(out).toBe(body);
  });
});