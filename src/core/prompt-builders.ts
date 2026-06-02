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
