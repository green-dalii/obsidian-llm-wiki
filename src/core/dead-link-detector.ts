// Dead Link Detector — Pure functions for dead link detection and correction
// Extracted from lint-fixes.ts::fixDeadLink()
// Zero side effects, fully testable

export interface PageRef {
  path: string;
  title: string;
  aliases?: string[];
}

/**
 * Find matching page for a dead link target.
 * Searches by title (case-insensitive) first, then by aliases.
 *
 * @param pages - Available wiki pages from getExistingWikiPages
 * @param targetName - The dead link target (e.g., "思维链" or "CoT")
 * @returns Matching page or undefined if no match found
 *
 * @example
 * const pages = [{ title: 'Chain of Thought', aliases: ['CoT', '思维链'] }];
 * findDeadLinkTarget(pages, '思维链') // => { title: 'Chain of Thought', ... }
 * findDeadLinkTarget(pages, 'cot') // => { title: 'Chain of Thought', ... }
 * findDeadLinkTarget(pages, 'nonexistent') // => undefined
 */
export function findDeadLinkTarget(
  pages: PageRef[],
  targetName: string
): PageRef | undefined {
  const targetBasename = targetName.includes('/')
    ? targetName.split('/').pop()!
    : targetName;
  const lowerTarget = targetBasename.toLowerCase();

  // First: exact title match (case-insensitive)
  let match = pages.find(p => p.title.toLowerCase() === lowerTarget);

  // Second: alias match (case-insensitive)
  if (!match) {
    match = pages.find(p =>
      p.aliases?.some(a => a.toLowerCase() === lowerTarget)
    );
  }

  return match;
}

/**
 * Build the replacement wiki link for a dead link.
 *
 * @param page - The matching page
 * @param wikiFolder - Wiki root folder (e.g., "wiki")
 * @returns Formatted wiki link (e.g., "[[entities/chain-of-thought|Chain of Thought]]")
 *
 * @example
 * buildDeadLinkReplacement(
 *   { path: 'wiki/entities/chain-of-thought.md', title: 'Chain of Thought' },
 *   'wiki'
 * ) // => "[[entities/chain-of-thought|Chain of Thought]]"
 */
export function buildDeadLinkReplacement(
  page: PageRef,
  wikiFolder: string
): string {
  const relPath = page.path
    .replace(wikiFolder + '/', '')
    .replace('.md', '');
  return `[[${relPath}|${page.title}]]`;
}

/**
 * Replace dead link in content with corrected link.
 *
 * @param content - Source page content
 * @param targetName - Dead link target to find
 * @param replacement - Replacement wiki link
 * @returns Updated content with link replaced
 *
 * @example
 * replaceDeadLink('See [[思维链]] for details', '思维链', '[[entities/cot|Chain of Thought]]')
 * // => 'See [[entities/cot|Chain of Thought]] for details'
 */
export function replaceDeadLink(
  content: string,
  targetName: string,
  replacement: string
): string {
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  return content.replace(
    linkRegex,
    (fullMatch: string, capturedTarget: string) => {
      if (capturedTarget.trim() === targetName) return replacement;
      return fullMatch;
    }
  );
}
