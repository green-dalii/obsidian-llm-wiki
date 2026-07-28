/**
 * Source-language signal extraction + cross-language policy.
 *
 * Exposes three primitives:
 * - `normalizeSourceLanguage(value)` — pure frontmatter value normaliser
 * - `getSourceLanguage(file, app)` — Obsidian-aware wrapper
 * - `getWikiLanguageName(wikiLang)` — resolves WIKI_LANGUAGES display name
 * - `isCrossLanguage(sourceLang, wikiLang)` — translation-hint gate
 */
import type { App, TFile } from 'obsidian';
import { WIKI_LANGUAGES } from '../types';

/** Resolve a wiki language code to its WIKI_LANGUAGES display name. */
export function getWikiLanguageName(wikiLang: string): string {
  return WIKI_LANGUAGES[wikiLang] ?? wikiLang;
}

/**
 * Pure normaliser for a frontmatter `language:` value.
 * Returns `null` for non-string or whitespace-only input.
 */
export function normalizeSourceLanguage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Read the source note's frontmatter `language:` via Obsidian metadata cache. */
export function getSourceLanguage(file: TFile, app: App): string | null {
  const cache = app.metadataCache.getFileCache(file);
  return normalizeSourceLanguage(cache?.frontmatter?.language);
}

/**
 * Decide whether the wiki should emit the cross-language translation hint.
 *
 * @param sourceLang result of `normalizeSourceLanguage` (null when unknown)
 * @param wikiLang   the user's wiki language code (e.g. `'en'`, `'ru'`)
 *
 * Returns `true` when source and wiki languages differ; `false` when they
 * match. When source language is unknown (null), falls back to the legacy
 * v1.25.x English-wiki proxy (`wikiLang !== 'en'`). The proxy will retire
 * once all sources adopt frontmatter `language:` (tracked by v1.26.0 MINOR).
 */
export function isCrossLanguage(
  sourceLang: string | null,
  wikiLang: string
): boolean {
  if (sourceLang !== null) {
    const wikiLangLower = wikiLang.toLowerCase();
    const wikiLangNameLower = getWikiLanguageName(wikiLang).toLowerCase();
    return sourceLang !== wikiLangLower && sourceLang !== wikiLangNameLower;
  }
  // v1.25.x legacy proxy — see doc above. Will retire with v1.26.0.
  return wikiLang !== 'en';
}