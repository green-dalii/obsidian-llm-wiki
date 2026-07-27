/**
 * Source-language signal extraction + cross-language policy.
 *
 * Background: PR #350 added frontmatter `language:` reading inside
 * `src/wiki/source-analyzer.ts:193-205, 334-337` to gate the cross-language
 * translation hint. GH #361 Theme 1 promotes that detection + policy into
 * shared helpers so future prompt sites can reuse the same logic.
 *
 * The two helpers are intentionally pure:
 * - `getSourceLanguage` reads frontmatter via `app.metadataCache` (the only
 *   non-pure operation).
 * - `isCrossLanguage` takes the resolved strings and answers the policy
 *   question with no IO.
 */
import type { App, TFile } from 'obsidian';
import { WIKI_LANGUAGES } from '../types';

/**
 * Read the source note's frontmatter `language:` and normalise it.
 *
 * Returns `null` when the frontmatter is absent, the `language:` key is
 * missing, the value is not a string, or the value is whitespace-only.
 *
 * @returns trimmed lowercase language string, or `null` when unknown.
 */
export function getSourceLanguage(file: TFile, app: App): string | null {
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter as { language?: unknown } | undefined;
  const raw = fm?.language;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Decide whether the wiki should emit the cross-language translation hint
 * given the source's language (or absence thereof) and the wiki's language.
 *
 * Policy:
 * - When source language is known (non-null, non-empty): compare against the
 *   wiki's WIKI_LANGUAGES display name OR the wiki code itself, both
 *   case-insensitive. Returns true iff they differ.
 * - When source language is unknown (null OR empty string): fall back to the
 *   legacy `wikiLang !== 'en'` proxy. This preserves v1.25.x behaviour for
 *   cross-language wikis that did not adopt frontmatter `language:`.
 *
 * @param sourceLang result of `getSourceLanguage`, or `''` / `null`
 * @param wikiLang   the user's wiki language code (e.g. `'en'`, `'ru'`)
 */
export function isCrossLanguage(
  sourceLang: string | null,
  wikiLang: string
): boolean {
  if (sourceLang !== null && sourceLang !== '') {
    const sourceLangLower = sourceLang.toLowerCase();
    const wikiLangLower = wikiLang.toLowerCase();
    const wikiLangNameLower = (WIKI_LANGUAGES[wikiLang] ?? wikiLang).toLowerCase();
    return sourceLangLower !== wikiLangLower && sourceLangLower !== wikiLangNameLower;
  }
  // Legacy fallback: English wiki suppresses translation hint unconditionally.
  return wikiLang !== 'en';
}