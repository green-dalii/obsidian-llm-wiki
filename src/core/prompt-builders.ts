// Prompt Builders — Pure functions for constructing LLM prompts
// Extracted from lint-fixes.ts::fillEmptyPage()
// Zero side effects, fully testable

export interface EmptyPageContext {
  pageType: string;
  existingContent: string;
  wikiIndex: string;
  sectionLabelsHint: string;
  maxEntities: number;
  maxConcepts: number;
}

/**
 * Build prompt for filling empty wiki pages.
 *
 * @param template - The prompt template with {{placeholders}}
 * @param context - Context information for the empty page
 * @returns Constructed prompt ready for LLM
 *
 * @example
 * buildEmptyPagePrompt(
 *   'Fill {{page_type}}: {{existing_content}}',
 *   { pageType: 'entity', existingContent: '...', wikiIndex: '...', sectionLabelsHint: '...', maxEntities: 3, maxConcepts: 2 }
 * )
 * // => 'Fill entity: ...'
 */
export function buildEmptyPagePrompt(
  template: string,
  context: EmptyPageContext
): string {
  // Truncate wiki index to prevent token overflow
  const truncatedIndex = context.wikiIndex.substring(0, 2000);

  return template
    .replace(/\{\{page_type\}\}/g, context.pageType)
    .replace(/\{\{existing_content\}\}/g, context.existingContent)
    .replace(/\{\{wiki_index\}\}/g, truncatedIndex)
    .replace(/\{\{section_labels\}\}/g, context.sectionLabelsHint)
    .replace(/\{\{max_entities\}\}/g, String(context.maxEntities))
    .replace(/\{\{max_concepts\}\}/g, String(context.maxConcepts));
}

/**
 * Purge polluted entries from wiki index before passing to LLM.
 * Removes malformed wiki links that could confuse the LLM.
 *
 * @param indexContent - Raw wiki index content
 * @returns Cleaned index content
 *
 * Pollution patterns:
 * - [[entities/name/entitiesName]] — duplicate folder prefix in path
 * - [[entities/name|entities/display]] — folder prefix in display text
 */
export function cleanWikiIndex(indexContent: string): string {
  return indexContent
    .split('\n')
    .filter(line => {
      // Remove lines with duplicate folder patterns in path
      if (/\[\[(entities|concepts|sources)\/[^\]]*\/\1[^\s\-_|\]]/.test(line)) return false;
      // Remove lines with folder prefix in display text
      if (/\[\[(entities|concepts|sources)\/[^|\]]+\|(entities|concepts|sources)\//.test(line)) return false;
      return true;
    })
    .join('\n');
}

/**
 * Detect and auto-correct folder-prefix pollution in LLM output.
 *
 * @param content - LLM generated content
 * @returns Cleaned content with pollution removed
 */
export function correctLinkPollution(content: string): string {
  // Pattern: [[path|pollutedDisplay]] where display has folder prefix
  const DISPLAY_POLLUTION_REGEX = /\[\[(entities|concepts|sources)\/[^|\]]+\|(entities|concepts|sources)\/[^|\]]+\]\]/g;

  // Pattern: [[folder/folderName]] — duplicate folder in path
  const PATH_DUP_REGEX = /\[\[(entities|concepts|sources)\/\1([^\s\-_|\]]+)(\|[^\]]+)?\]\]/g;

  let cleaned = content.replace(
    DISPLAY_POLLUTION_REGEX,
    (match: string) => {
      const parts = match.match(/\[\[([^|\]]+)\|([^|\]]+)\]\]/);
      if (parts) {
        const path = parts[1];
        const pollutedDisplay = parts[2];
        const cleanDisplay = pollutedDisplay.replace(/^(entities|concepts|sources)\//, '');
        return `[[${path}|${cleanDisplay}]]`;
      }
      return match;
    }
  );

  cleaned = cleaned.replace(
    PATH_DUP_REGEX,
    (_match: string, folder: string, rest: string, display: string | undefined) => {
      const displayPart = display || '';
      return `[[${folder}/${rest}${displayPart}]]`;
    }
  );

  return cleaned;
}

/**
 * Normalize a file path returned by the LLM to use the user's configured wikiFolder.
 * LLMs may return paths with the hardcoded "wiki/" prefix even when the prompt
 * template uses {{wikiFolder}}. This function provides a defense-in-depth layer.
 *
 * @param path - File path from LLM response (e.g. "wiki/entities/llm.md")
 * @param wikiFolder - User's configured wiki folder (e.g. "mywiki")
 * @returns Path with wikiFolder correctly applied
 *
 * @example
 * normalizeLLMPath('wiki/entities/llm.md', 'mywiki')
 * // => 'mywiki/entities/llm.md'
 *
 * normalizeLLMPath('mywiki/entities/llm.md', 'mywiki')
 * // => 'mywiki/entities/llm.md'
 */
export function normalizeLLMPath(path: string, wikiFolder: string): string {
  if (!path) return path;

  // If path already has the correct prefix, return unchanged
  if (path.startsWith(wikiFolder + '/') || path === wikiFolder) {
    return path;
  }

  // If path starts with "wiki/", replace with user's wikiFolder
  if (path.startsWith('wiki/')) {
    return wikiFolder + '/' + path.slice(5);
  }

  // Otherwise, prepend wikiFolder
  return wikiFolder + '/' + path;
}

/**
 * v1.24.0 (Bug C 3.0): Sentinel placeholder used in the LLM prompt template
 * and in persisted chat history. Render-time substitution
 * (`substituteWikiFolderPlaceholder`) replaces this with the user's current
 * `settings.wikiFolder`. The placeholder never appears in the rendered UI —
 * it's an inter-process protocol between the prompt, the LLM, and the
 * history, not a user-facing token.
 *
 * Keeping the LLM "folder-blind" prevents history-pollution regressions:
 * when the user changes wikiFolder, the persisted LLM responses still use
 * `__WIKI_FOLDER__`, so subsequent queries don't see stale examples of the
 * old folder and don't get steered into emitting the wrong path.
 */
export const WIKI_FOLDER_PLACEHOLDER = '__WIKI_FOLDER__';

/**
 * v1.24.0 (Bug C 3.0): Canonical sub-folder list as a typed tuple, derived
 * from the object-form `WIKI_SUBFOLDERS` in `constants.ts` (which is the
 * one true source — pre-existing consumers like `conflict-resolver.ts`,
 * `fix-dead-link.ts`, `dedup-phase.ts` etc. already use the object form).
 * Use this tuple when you need an iterable (e.g. `for-of`, regex alternation,
 * `Set` seeding); use the object form when you need a keyed lookup
 * (`WIKI_SUBFOLDERS.entities`).
 *
 * Adding a new sub-folder: update `constants.ts:WIKI_SUBFOLDERS` only — the
 * tuple below derives from it, so all consumers pick up the new entry
 * automatically. (TypeScript's `as const` + `typeof` keeps the literal
 * narrow, so `archive` typed `WikiSubfolder` is a TS error if you forget.)
 */
import { WIKI_SUBFOLDERS } from '../constants';
export const WIKI_SUBFOLDER_NAMES = [
  WIKI_SUBFOLDERS.entities,
  WIKI_SUBFOLDERS.concepts,
  WIKI_SUBFOLDERS.sources,
] as const;
export type WikiSubfolder = typeof WIKI_SUBFOLDER_NAMES[number];

/**
 * Render-time substitution: replace every `__WIKI_FOLDER__` in `content`
 * with the user's current `wikiFolder`. Called just before the LLM's
 * response is shown to the user (MarkdownRenderer) — NOT before it's
 * stored to chat history (history keeps the placeholder so the LLM sees a
 * consistent token across folder changes).
 *
 * @param content - LLM-generated content with `__WIKI_FOLDER__` tokens
 * @param wikiFolder - User's currently-configured wiki folder
 * @returns Content with the placeholder swapped for the real folder
 */
export function substituteWikiFolderPlaceholder(content: string, wikiFolder: string): string {
  if (!content || !wikiFolder) return content;
  return content.split(WIKI_FOLDER_PLACEHOLDER).join(wikiFolder);
}

/**
 * Normalize wiki-link syntax in LLM-generated content so any folder prefix
 * is collapsed into the placeholder `__WIKI_FOLDER__`. v1.24.0 (Bug C 3.0)
 * extension: the previous version only handled the literal `[[wiki/...]]`
 * case. The new version also collapses arbitrary user-configured folders
 * (e.g., `[[test3/entities/foo]]`, `[[mywiki/concepts/x]]`) so that an LLM
 * that hallucinates a path based on stale history (or just imitates the
 * user's old setting) doesn't break the placeholder invariant.
 *
 * Note: this function is the **inverse** of `substituteWikiFolderPlaceholder`.
 *   - `normalizeWikiLinkContent` is called on LLM OUTPUT (before persisting to
 *     history) → all folder prefixes → placeholder.
 *   - `substituteWikiFolderPlaceholder` is called on display (after reading
 *     from history) → placeholder → current folder.
 *
 * @param content - Markdown content with potential `[[folder/...]]` links
 * @param wikiFolder - User's currently-configured wiki folder (used to detect
 *   and collapse the user's old folder in case the LLM emitted it)
 * @returns Content with every wiki-link folder prefix replaced by the placeholder
 */
export function normalizeWikiLinkContent(content: string, wikiFolder: string): string {
  if (!content) return content;

  // v1.24.0 (Bug C 3.0): collapse to the placeholder. We chain two `.replace`
  // calls — one for the user's CURRENT configured folder (covers the LLM
  // echoing the wikiFolder back from the prompt template), one for the
  // literal default 'wiki' folder (covers the LLM falling back to the
  // default). The second is skipped when wikiFolder is already 'wiki' to
  // avoid a redundant pass.
  const replacement = `[[${WIKI_FOLDER_PLACEHOLDER}/$1]]`;
  let out = content;

  if (wikiFolder && wikiFolder !== WIKI_FOLDER_PLACEHOLDER) {
    const esc = wikiFolder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\[\\[${esc}/([^\\]]+)\\]\\]`, 'g'), replacement);
  }
  if (wikiFolder !== 'wiki') {
    out = out.replace(/\[\[wiki\/([^\]]+)\]\]/g, replacement);
  }
  return out;
}
