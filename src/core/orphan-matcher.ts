// Orphan Matcher — Pure functions for orphan page linking
// Extracted from lint-fixes.ts::linkOrphanPage()
// Zero side effects, fully testable

export interface OrphanContext {
  orphanContent: string;
  wikiIndex: string;
}

export interface OrphanLinkSuggestion {
  pagePath: string;
  linkText: string;
  linkTarget: string;
}

/**
 * Build prompt for linking orphan pages to related content.
 *
 * @param template - The prompt template with {{placeholders}}
 * @param context - Context information for the orphan page
 * @returns Constructed prompt ready for LLM
 */
export function buildOrphanLinkPrompt(
  template: string,
  context: OrphanContext
): string {
  // Truncate content and index to prevent token overflow
  const truncatedContent = context.orphanContent.substring(0, 2000);
  const truncatedIndex = context.wikiIndex.substring(0, 3000);

  return template
    .replace(/\{\{orphan_content\}\}/g, truncatedContent)
    .replace(/\{\{wiki_index\}\}/g, truncatedIndex);
}

/**
 * Validate if a suggested orphan link is valid (target exists in content).
 *
 * @param relatedContent - Content of the related page
 * @param linkTarget - The link target to validate
 * @returns True if target exists in content
 */
export function validateOrphanLinkTarget(
  relatedContent: string,
  linkTarget: string
): boolean {
  return relatedContent.includes(linkTarget);
}

/**
 * Build the content update for linking an orphan page.
 *
 * @param relatedContent - Current content of related page
 * @param suggestion - Link suggestion from LLM
 * @param sectionHeader - Header for related pages section
 * @returns Updated content with orphan link added
 */
export function buildOrphanLinkUpdate(
  relatedContent: string,
  suggestion: OrphanLinkSuggestion,
  sectionHeader: string
): string {
  const header = `## ${sectionHeader}`;
  const section = relatedContent.includes(header) ? '' : `\n\n${header}`;
  return `${relatedContent}${section}\n- ${suggestion.linkText} ${suggestion.linkTarget}`;
}

/**
 * Normalize page path to full path.
 *
 * @param pagePath - Page path (may be relative or full)
 * @param wikiFolder - Wiki root folder
 * @returns Full path
 */
export function normalizeOrphanPagePath(
  pagePath: string,
  wikiFolder: string
): string {
  return pagePath.startsWith(wikiFolder)
    ? pagePath
    : `${wikiFolder}/${pagePath}`;
}
