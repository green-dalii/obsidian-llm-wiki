/**
 * Tests for the source-language signal extraction helpers.
 *
 * Background: PR #350 added frontmatter `language:` reading inside
 * `src/wiki/source-analyzer.ts:193-205, 334-337` (closed-vocabulary gate on
 * cross-language translation hints). GH #361 Theme 1 promotes that
 * detection + policy into shared helpers so that future prompt sites
 * can reuse the same logic.
 *
 * These helpers are read-only with respect to vault state.
 */
import { describe, expect, it } from 'vitest';
import type { App, TFile } from 'obsidian';
import { getSourceLanguage, isCrossLanguage } from '../../core/source-language';

type MetadataCacheLike = {
  getFileCache: (file: TFile) => { frontmatter?: Record<string, unknown> } | null;
};

function makeApp(frontmatter: Record<string, unknown> | null): App {
  const cache = {
    getFileCache: () => (frontmatter ? { frontmatter } : null),
  } as unknown as MetadataCacheLike;
  return { metadataCache: cache } as unknown as App;
}

function makeFile(): TFile {
  return { path: 'sources/foo.md' } as unknown as TFile;
}

describe('getSourceLanguage', () => {
  it('returns trimmed lowercase language when frontmatter has language:string', () => {
    const app = makeApp({ language: '  RU  ' });
    expect(getSourceLanguage(makeFile(), app)).toBe('ru');
  });

  it('returns null when frontmatter is absent', () => {
    const app = makeApp(null);
    expect(getSourceLanguage(makeFile(), app)).toBeNull();
  });

  it('returns null when language frontmatter key is missing', () => {
    const app = makeApp({ title: 'foo' });
    expect(getSourceLanguage(makeFile(), app)).toBeNull();
  });

  it('returns null when language is a non-string value (array)', () => {
    const app = makeApp({ language: ['ru', 'en'] });
    expect(getSourceLanguage(makeFile(), app)).toBeNull();
  });

  it('returns null when language is whitespace-only', () => {
    const app = makeApp({ language: '   ' });
    expect(getSourceLanguage(makeFile(), app)).toBeNull();
  });

  it('preserves BCP-47 subtag shape (zh-Hant stays zh-hant)', () => {
    const app = makeApp({ language: 'zh-Hant' });
    expect(getSourceLanguage(makeFile(), app)).toBe('zh-hant');
  });
});

describe('isCrossLanguage', () => {
  // Legacy fallback: when source lang is unknown, English wiki suppresses
  // translation hint unconditionally. This preserves v1.25.x behaviour.
  it('falls back to wikiLang !== "en" when sourceLang is null (legacy English-wiki proxy)', () => {
    expect(isCrossLanguage(null, 'en')).toBe(false);
    expect(isCrossLanguage(null, 'ru')).toBe(true);
    expect(isCrossLanguage(null, 'zh-Hant')).toBe(true);
  });

  it('returns true when source language differs from wiki language name', () => {
    // source ru, wiki zh (zh-Hant language name from WIKI_LANGUAGES)
    expect(isCrossLanguage('ru', 'zh-Hant')).toBe(true);
  });

  it('returns false when source language matches wiki language name (case-insensitive)', () => {
    // WIKI_LANGUAGES['en'] = 'English'; source 'EN' should match
    expect(isCrossLanguage('EN', 'en')).toBe(false);
    // WIKI_LANGUAGES['zh-Hant'] = '繁體中文'; source '繁體中文' should match
    expect(isCrossLanguage('繁體中文', 'zh-Hant')).toBe(false);
  });

  it('returns false when source language matches wiki code itself (not just name)', () => {
    // WIKI_LANGUAGES['de'] = 'Deutsch'; source 'de' == wikiLangLower → same
    expect(isCrossLanguage('de', 'de')).toBe(false);
  });

  it('accepts empty-string sourceLang as legacy fallback (matches existing source-analyzer behaviour)', () => {
    // source-analyzer.ts treats `sourceLang === ''` as legacy proxy; helper
    // must accept empty string the same way for symmetric semantics.
    expect(isCrossLanguage('', 'en')).toBe(false);
    expect(isCrossLanguage('', 'ru')).toBe(true);
  });
});