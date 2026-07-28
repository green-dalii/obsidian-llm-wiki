/** Source-language signal: frontmatter value -> normalised string, then cross-language gate. */
import { describe, expect, it } from 'vitest';
import type { App, TFile } from 'obsidian';
import {
  getSourceLanguage,
  getWikiLanguageName,
  isCrossLanguage,
  normalizeSourceLanguage,
} from '../../core/source-language';

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

describe('normalizeSourceLanguage', () => {
  it('returns trimmed lowercase string for a valid language value', () => {
    expect(normalizeSourceLanguage('  RU  ')).toBe('ru');
  });
  it('returns null for non-string input', () => {
    expect(normalizeSourceLanguage(['ru', 'en'])).toBeNull();
    expect(normalizeSourceLanguage(123)).toBeNull();
    expect(normalizeSourceLanguage(null)).toBeNull();
  });
  it('returns null for whitespace-only input', () => {
    expect(normalizeSourceLanguage('   ')).toBeNull();
  });
  it('preserves BCP-47 subtag shape (zh-Hant stays zh-hant)', () => {
    expect(normalizeSourceLanguage('zh-Hant')).toBe('zh-hant');
  });
});

describe('getSourceLanguage', () => {
  it('reads frontmatter language via metadataCache and normalises', () => {
    const app = makeApp({ language: '  RU  ' });
    expect(getSourceLanguage(makeFile(), app)).toBe('ru');
  });
  it('returns null when frontmatter is absent', () => {
    expect(getSourceLanguage(makeFile(), makeApp(null))).toBeNull();
  });
  it('returns null when language frontmatter key is missing', () => {
    expect(getSourceLanguage(makeFile(), makeApp({ title: 'foo' }))).toBeNull();
  });
});

describe('getWikiLanguageName', () => {
  it('resolves known wiki codes to their display name', () => {
    expect(getWikiLanguageName('en')).toBe('English');
    expect(getWikiLanguageName('zh-Hant')).toBe('繁體中文');
  });
  it('falls back to the raw code for unrecognised wikiLang (useCustomWikiLanguage)', () => {
    expect(getWikiLanguageName('custom-iso')).toBe('custom-iso');
  });
});

describe('isCrossLanguage', () => {
  // v1.25.x legacy proxy: when source lang is unknown, English wiki
  // suppresses translation hint unconditionally. Retires with v1.26.0.
  it('uses legacy English-wiki proxy when sourceLang is null', () => {
    expect(isCrossLanguage(null, 'en')).toBe(false);
    expect(isCrossLanguage(null, 'ru')).toBe(true);
  });
  it('returns true when source language differs from wiki language', () => {
    expect(isCrossLanguage('ru', 'zh-Hant')).toBe(true);
  });
  it('returns false when source language matches wiki language name case-insensitively (caller passes normalised lowercase)', () => {
    expect(isCrossLanguage('en', 'en')).toBe(false);
    expect(isCrossLanguage('繁體中文', 'zh-Hant')).toBe(false);
  });
  it('returns false when source language matches wiki code itself', () => {
    expect(isCrossLanguage('de', 'de')).toBe(false);
  });
});