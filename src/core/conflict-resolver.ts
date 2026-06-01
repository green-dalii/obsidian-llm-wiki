// ConflictResolver — pure conflict detection logic layer.
// Extracted from resolvePagePath in page-factory.ts.
// Zero side effects (no file IO, no LLM calls). Fully unit-testable.
// Three audit reviews (Issues #63/#64/#65, v1.13.0 deep dive, first-principles)
// independently identified coupling in resolvePagePath as the top architecture debt.

import { computeSlug } from '../utils';

// ── Types ─────────────────────────────────────────────────────────

export interface PageRef {
  path: string;
  title: string;
  aliases?: string[];
}

export type PageType = 'entity' | 'concept';

export interface ConflictCheck {
  name: string;
  slug: string;
  pageType: PageType;
}

export type ConflictAction = 'create' | 'merge' | 'flag';

export interface ConflictResolution {
  action: ConflictAction;
  targetPath: string;           // path to create or existing page to merge into
  existingPath?: string;        // only when action is 'merge' or 'flag'
  existingType?: PageType;      // type of the existing page (for cross-type collisions)
  aliasToAdd?: string | null;   // alias to add (null = redundant with title/filename)
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// ── Helpers ───────────────────────────────────────────────────────

function folderOf(pageType: PageType): string {
  return pageType === 'entity' ? 'entities' : 'concepts';
}

function oppositeFolder(pageType: PageType): string {
  return pageType === 'entity' ? 'concepts' : 'entities';
}

/** Return the slug-match key for a page: its title's slug + its alias slugs. */
function slugMatchKeys(page: PageRef): Set<string> {
  const keys = new Set<string>();
  keys.add(computeSlug(page.title).toLowerCase());
  for (const alias of page.aliases || []) {
    keys.add(computeSlug(alias).toLowerCase());
  }
  return keys;
}

// ── Main resolver ─────────────────────────────────────────────────

export class ConflictResolver {
  constructor(
    private wikiFolder: string,
    private allPages: PageRef[],
  ) {}

  /**
   * Determine what to do with a newly extracted entity/concept.
   * Returns a ConflictResolution that the caller should follow.
   *
   * Resolution order (deterministic, first match wins):
   * 1. Same-type slug/alias match → merge into existing page
   * 2. Cross-type slug/alias match → merge into opposite folder page
   * 3. No match → create new page
   */
  resolve(check: ConflictCheck): ConflictResolution {
    const folder = folderOf(check.pageType);
    const otherFolder = oppositeFolder(check.pageType);
    const sameTypePages = this.allPages.filter(p => p.path.includes(`/${folder}/`));
    const otherTypePages = this.allPages.filter(p => p.path.includes(`/${otherFolder}/`));
    const checkKey = check.slug.toLowerCase();

    // 1. Same-type match: exact path match or slug/alias match
    const exactPath = `${this.wikiFolder}/${folder}/${check.slug}.md`;
    let match = sameTypePages.find(p => p.path === exactPath);
    if (match) {
      return {
        action: 'merge',
        targetPath: match.path,
        confidence: 'high',
        reason: `Same-type exact path match: ${exactPath}`,
      };
    }
    match = sameTypePages.find(p => slugMatchKeys(p).has(checkKey));
    if (match) {
      return {
        action: 'merge',
        targetPath: match.path,
        confidence: 'high',
        reason: `Same-type slug/alias match: title=${match.title} slug=${check.slug}`,
      };
    }

    // 2. Cross-type match: exists in opposite folder
    const otherExactPath = `${this.wikiFolder}/${otherFolder}/${check.slug}.md`;
    match = otherTypePages.find(p => p.path === otherExactPath || slugMatchKeys(p).has(checkKey));
    if (match) {
      return {
        action: 'merge',
        targetPath: match.path,
        existingPath: match.path,
        existingType: otherFolder === 'entities' ? 'entity' : 'concept',
        aliasToAdd: check.name !== match.title ? check.name : null,
        confidence: 'high',
        reason: `Cross-type collision: ${check.pageType} "${check.name}" → ${match.path}`,
      };
    }

    // 3. No match — create new
    return {
      action: 'create',
      targetPath: `${this.wikiFolder}/${folder}/${check.slug}.md`,
      confidence: 'high',
      reason: 'No conflict found',
    };
  }

  // ── Interactive query helpers (for future use) ──────────────────

  /** Return the number of pages per type (for stats/diagnostics). */
  stats(): { entities: number; concepts: number } {
    return {
      entities: this.allPages.filter(p => p.path.includes('/entities/')).length,
      concepts: this.allPages.filter(p => p.path.includes('/concepts/')).length,
    };
  }
}
