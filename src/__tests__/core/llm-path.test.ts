import { describe, it, expect } from 'vitest';
import {
  normalizeLLMPath,
  normalizeWikiLinkContent,
  substituteWikiFolderPlaceholder,
  WIKI_FOLDER_PLACEHOLDER,
} from '../../core/prompt-builders';

describe('normalizeLLMPath', () => {
  it('returns path unchanged when already has correct wikiFolder prefix', () => {
    expect(normalizeLLMPath('mywiki/entities/foo.md', 'mywiki')).toBe('mywiki/entities/foo.md');
  });

  it('replaces "wiki/" prefix with user wikiFolder', () => {
    const result = normalizeLLMPath('wiki/entities/llm.md', 'mywiki');
    expect(result).toBe('mywiki/entities/llm.md');
  });

  it('replaces "wiki/" prefix with user wikiFolder when wikiFolder is nested', () => {
    const result = normalizeLLMPath('wiki/entities/llm.md', 'docs/kb');
    expect(result).toBe('docs/kb/entities/llm.md');
  });

  it('prepends wikiFolder when path is bare relative (no wiki/ prefix)', () => {
    const result = normalizeLLMPath('entities/llm.md', 'mywiki');
    expect(result).toBe('mywiki/entities/llm.md');
  });

  it('returns path unchanged when path is empty string', () => {
    expect(normalizeLLMPath('', 'mywiki')).toBe('');
  });

  it('handles path that starts with a non-wiki prefix (not "wiki/" nor wikiFolder)', () => {
    const result = normalizeLLMPath('other/entities/foo.md', 'mywiki');
    expect(result).toBe('mywiki/other/entities/foo.md');
  });

  it('handles path without .md extension', () => {
    const result = normalizeLLMPath('wiki/entities/foo', 'mywiki');
    expect(result).toBe('mywiki/entities/foo');
  });
});

describe('normalizeWikiLinkContent (v1.24.0 — placeholder semantics)', () => {
  // v1.24.0 (Bug C 3.0): the function now collapses to __WIKI_FOLDER__ so
  // persisted chat history is folder-agnostic. Use substituteWikiFolderPlaceholder
  // at render time to recover a real folder. See core/prompt-builders.ts.

  it('replaces [[wiki/ with [[__WIKI_FOLDER__/ when wikiFolder is custom', () => {
    const input = 'See [[wiki/entities/llm|LLM]] for details.';
    const expected = `See [[${WIKI_FOLDER_PLACEHOLDER}/entities/llm|LLM]] for details.`;
    expect(normalizeWikiLinkContent(input, 'custom')).toBe(expected);
  });

  it('collapses the current wikiFolder too (LLM may echo the prompt template back)', () => {
    const input = 'See [[custom/entities/llm|LLM]] for details.';
    const expected = `See [[${WIKI_FOLDER_PLACEHOLDER}/entities/llm|LLM]] for details.`;
    expect(normalizeWikiLinkContent(input, 'custom')).toBe(expected);
  });

  it('still collapses [[wiki/ → __WIKI_FOLDER__ even when wikiFolder is "wiki"', () => {
    // v1.24.0: the function now ALWAYS normalizes to the placeholder, even
    // when the user's wikiFolder is the literal default 'wiki'. This keeps
    // the placeholder invariant uniform across folder configs — render-time
    // substitute replaces the placeholder with 'wiki' again, idempotently.
    const input = 'See [[wiki/entities/llm|LLM]] for details.';
    const expected = `See [[${WIKI_FOLDER_PLACEHOLDER}/entities/llm|LLM]] for details.`;
    expect(normalizeWikiLinkContent(input, 'wiki')).toBe(expected);
  });

  it('does not alter non-wiki-link references', () => {
    const input = 'See [[other/entities/llm|LLM]] for details.';
    expect(normalizeWikiLinkContent(input, 'custom')).toBe(input);
  });

  it('handles multiple wiki-links in the same content', () => {
    const input = '[[wiki/entities/a]] and [[wiki/concepts/b|B]]';
    const expected = `[[${WIKI_FOLDER_PLACEHOLDER}/entities/a]] and [[${WIKI_FOLDER_PLACEHOLDER}/concepts/b|B]]`;
    expect(normalizeWikiLinkContent(input, 'mywiki')).toBe(expected);
  });

  it('handles content with no wiki-links', () => {
    const input = 'Just some plain text.';
    expect(normalizeWikiLinkContent(input, 'custom')).toBe(input);
  });

  it('replaces wiki/ in [[wiki/sources/foo]] too', () => {
    const input = 'From [[wiki/sources/paper|Paper]]';
    const expected = `From [[${WIKI_FOLDER_PLACEHOLDER}/sources/paper|Paper]]`;
    expect(normalizeWikiLinkContent(input, 'custom')).toBe(expected);
  });

  it('is idempotent — already normalized content stays unchanged', () => {
    const input = `See [[${WIKI_FOLDER_PLACEHOLDER}/entities/llm|LLM]] for details.`;
    expect(normalizeWikiLinkContent(input, 'custom')).toBe(input);
    expect(normalizeWikiLinkContent(input, 'custom')).toBe(normalizeWikiLinkContent(input, 'custom'));
  });
});

describe('substituteWikiFolderPlaceholder (v1.24.0 — render-time substitution)', () => {
  it('replaces __WIKI_FOLDER__ with the user wikiFolder', () => {
    const input = `See [[${WIKI_FOLDER_PLACEHOLDER}/entities/llm|LLM]] for details.`;
    const expected = 'See [[mywiki/entities/llm|LLM]] for details.';
    expect(substituteWikiFolderPlaceholder(input, 'mywiki')).toBe(expected);
  });

  it('replaces ALL occurrences in one pass', () => {
    const input = `[[${WIKI_FOLDER_PLACEHOLDER}/a]] and [[${WIKI_FOLDER_PLACEHOLDER}/b|B]]`;
    const expected = '[[mywiki/a]] and [[mywiki/b|B]]';
    expect(substituteWikiFolderPlaceholder(input, 'mywiki')).toBe(expected);
  });

  it('returns content unchanged when no placeholder is present', () => {
    const input = 'Plain text without placeholder.';
    expect(substituteWikiFolderPlaceholder(input, 'mywiki')).toBe(input);
  });

  it('returns content unchanged when wikiFolder is empty', () => {
    const input = `[[${WIKI_FOLDER_PLACEHOLDER}/entities/x]]`;
    expect(substituteWikiFolderPlaceholder(input, '')).toBe(input);
  });
});
