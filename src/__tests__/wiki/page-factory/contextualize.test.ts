// Module-level unit tests for page-factory/contextualize.ts
//
// v1.24.1 Phase 2 refactor: these helpers were lifted out of page-factory.ts
// into a module-level function file so they're independently testable and the
// god-class surface area shrinks. The tests pin the observable behavior so a
// future refactor cannot accidentally change the error-message shape, the
// list-detection rule, the quote-pick ordering, or the conversation-source
// detection (all of which existing tests, log scrapers, and behavioral
// fixtures rely on).

import { describe, it, expect } from 'vitest';
import {
  contextualizeError,
  mergeError,
  isListSection,
  firstQuotesForPrompt,
  isConversationSource,
} from '../../../wiki/page-factory/contextualize';
import type { EntityInfo } from '../../../types';

describe('contextualizeError', () => {
  it('wraps Error.message with create-page context', () => {
    const err = contextualizeError(new Error('vault miss'), 'Karpathy', 'entity');
    expect(err.message).toBe('Failed to create entity page "Karpathy": vault miss');
  });

  it('stringifies non-Error values', () => {
    const err = contextualizeError('plain string', 'X', 'concept');
    expect(err.message).toBe('Failed to create concept page "X": plain string');
  });

  it('handles unknown throw types (object, number)', () => {
    const a = contextualizeError({ code: 1 }, 'X', 'entity');
    expect(a.message).toBe('Failed to create entity page "X": [object Object]');
    const b = contextualizeError(42, 'X', 'entity');
    expect(b.message).toBe('Failed to create entity page "X": 42');
  });
});

describe('mergeError', () => {
  it('uses "merge" verb (not "create") to distinguish from contextualizeError', () => {
    const err = mergeError(new Error('conflict'), 'Caching', 'concept');
    expect(err.message).toBe('Failed to merge concept page "Caching": conflict');
  });
});

describe('isListSection (#185 follow-up)', () => {
  it('returns false for empty string', () => {
    expect(isListSection('')).toBe(false);
  });

  it('returns false for paragraph-only body', () => {
    expect(isListSection('Some prose.\nMore prose.')).toBe(false);
  });

  it('returns true when ANY non-blank line is a bullet', () => {
    expect(isListSection('- one\n- two\n- three')).toBe(true);
  });

  it('returns true for hand-edited section with summary after bullets', () => {
    // The motivating case from #185: bullets + a closing summary line.
    expect(isListSection('- a\n- b\nA short summary.')).toBe(true);
  });

  it('detects *, +, and numbered markers', () => {
    expect(isListSection('* one')).toBe(true);
    expect(isListSection('+ one')).toBe(true);
    expect(isListSection('1. one')).toBe(true);
    expect(isListSection('10. ten')).toBe(true);
  });

  it('does NOT misclassify dashes inside prose lines', () => {
    // "foo - bar" is NOT a list marker (no leading dash + space).
    expect(isListSection('foo - bar\nbaz - qux')).toBe(false);
  });
});

describe('firstQuotesForPrompt (Issue #244 + W5)', () => {
  it('prefers structured mentions_with_provenance over legacy mentions_in_source', () => {
    const info = {
      name: 'X',
      mentions_in_source: ['legacy-A', 'legacy-B'],
      mentions_with_provenance: [{ quote: 'struct-1' }, { quote: 'struct-2' }],
    } as unknown as EntityInfo;
    expect(firstQuotesForPrompt(info)).toBe('struct-1; struct-2');
  });

  it('falls back to legacy mentions_in_source when structured is absent', () => {
    const info = {
      name: 'X',
      mentions_in_source: ['legacy-A', 'legacy-B', 'legacy-C'],
    } as unknown as EntityInfo;
    expect(firstQuotesForPrompt(info)).toBe('legacy-A; legacy-B');
  });

  it('falls back to legacy mentions_in_source when structured is empty array', () => {
    const info = {
      name: 'X',
      mentions_in_source: ['legacy-A'],
      mentions_with_provenance: [],
    } as unknown as EntityInfo;
    expect(firstQuotesForPrompt(info)).toBe('legacy-A');
  });

  it('returns empty string when neither is present', () => {
    const info = { name: 'X' } as unknown as EntityInfo;
    expect(firstQuotesForPrompt(info)).toBe('');
  });
});

describe('isConversationSource (Issue #244)', () => {
  it('returns true for paths under ${wikiFolder}/sources/', () => {
    expect(
      isConversationSource({ path: 'wiki/sources/conv-2026-07-11.md', basename: 'conv-2026-07-11' }, 'wiki'),
    ).toBe(true);
  });

  it('returns false for paths outside sources/ (the normal path)', () => {
    expect(
      isConversationSource({ path: 'notes/article.md', basename: 'article' }, 'wiki'),
    ).toBe(false);
  });

  it('returns false for paths under wiki root but NOT under sources/', () => {
    // wiki/entities/X.md is a normal entity page, not a conversation source.
    expect(
      isConversationSource({ path: 'wiki/entities/X.md', basename: 'X' }, 'wiki'),
    ).toBe(false);
  });

  it('respects custom wikiFolder prefix', () => {
    expect(
      isConversationSource({ path: 'kb/sources/c1.md', basename: 'c1' }, 'kb'),
    ).toBe(true);
    expect(
      isConversationSource({ path: 'wiki/sources/c1.md', basename: 'c1' }, 'kb'),
    ).toBe(false);
  });
});