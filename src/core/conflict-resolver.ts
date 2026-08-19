// ConflictResolver — pure conflict detection logic layer.
// Extracted from resolvePagePath in page-factory.ts.
// Zero side effects (no file IO, no LLM calls). Fully unit-testable.
// Three audit reviews (Issues #63/#64/#65, v1.13.0 deep dive, first-principles)
// independently identified coupling in resolvePagePath as the top architecture debt.

import { computeSlug } from './slug';
import { WIKI_SUBFOLDERS } from '../constants';

// ── Types ─────────────────────────────────────────────────────────

export interface PageRef {
  path: string;
  title: string;
  aliases?: string[];
  /** Issue #446: domain tags of the page, used to rank ambiguous matches. */
  tags?: string[];
}

export type PageType = 'entity' | 'concept';

export interface ConflictCheck {
  name: string;
  slug: string;
  pageType: PageType;
  /**
   * Issue #446: domain tags of the item being placed — in the ingest path the
   * extracted `type`, which is what the generated page will carry as its own
   * `tags:`. Ranking signal only, see `rankByTagOverlap`. Optional: a caller
   * that has none leaves the ranking on its path tie-break.
   */
  tags?: string[];
}

export type ConflictAction = 'create' | 'merge' | 'flag' | 'disambiguate';

export interface ConflictResolution {
  action: ConflictAction;
  targetPath: string;           // path to create or existing page to merge into
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  /**
   * Issue #446: every same-type page the designator matched, ranked. Only set
   * when `action` is 'disambiguate' (more than one match). `targetPath` is the
   * top-ranked one, so a caller that ignores this field still resolves — and
   * resolves the same way on every page order.
   */
  candidates?: PageRef[];
}

// ── Helpers ───────────────────────────────────────────────────────

function folderOf(pageType: PageType): string {
  return pageType === 'entity' ? WIKI_SUBFOLDERS.entities : WIKI_SUBFOLDERS.concepts;
}

/** Return the slug-match key for a page: its title's slug + its alias slugs. */
function slugMatchKeys(page: PageRef): Set<string> {
  const keys = new Set<string>();
  keys.add(computeSlug(page.title));
  for (const alias of page.aliases || []) {
    keys.add(computeSlug(alias));
  }
  return keys;
}

/**
 * Issue #446: order pages that a designator matched equally well.
 *
 * Tags rank, they never decide: this function only permutes a list, it never
 * drops a candidate and never turns a match into a non-match. Tag sets of a
 * page and of a naming note are disjoint in the ordinary case — a page carries
 * the aspect it was created under, a note the aspect it was written about — so
 * a disjoint set is the absence of a signal, not evidence of a different
 * subject.
 *
 * The tie-break is the path, compared by code unit rather than by locale, so
 * the result is independent both of the input order and of the host's collation.
 */
function rankByTagOverlap(matches: PageRef[], checkTags?: string[]): PageRef[] {
  const wanted = new Set((checkTags ?? []).map(t => t.toLowerCase()));
  const overlap = (p: PageRef): number =>
    wanted.size === 0 ? 0 : (p.tags ?? []).filter(t => wanted.has(t.toLowerCase())).length;

  return [...matches].sort((a, b) => {
    const byOverlap = overlap(b) - overlap(a);
    if (byOverlap !== 0) return byOverlap;
    if (a.path === b.path) return 0;
    return a.path < b.path ? -1 : 1;
  });
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
   * Resolution order (deterministic):
   * 1. Same-type exact path match → merge into existing page
   * 2. Same-type slug/alias match on exactly one page → merge into that page
   * 3. Same-type slug/alias match on more than one page → 'disambiguate'
   *    with `candidates` ranked by tag overlap (Issue #446)
   * 4. No match → create new page
   */
  resolve(check: ConflictCheck): ConflictResolution {
    const folder = folderOf(check.pageType);
    const sameTypePages = this.allPages.filter(p => p.path.includes(`/${folder}/`));
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
    // Issue #446: a short designator is a title or an alias on more than one
    // page often enough to matter (23 of them in a 2838-page vault). `find`
    // returned whichever the page list happened to hold first, so the merge
    // target was a function of vault iteration order and nothing said the
    // question had been open.
    const slugMatches = sameTypePages.filter(p => slugMatchKeys(p).has(checkKey));
    if (slugMatches.length === 1) {
      const only = slugMatches[0];
      return {
        action: 'merge',
        targetPath: only.path,
        confidence: 'high',
        reason: `Same-type slug/alias match: title=${only.title} slug=${check.slug}`,
      };
    }
    if (slugMatches.length > 1) {
      const ranked = rankByTagOverlap(slugMatches, check.tags);
      return {
        action: 'disambiguate',
        targetPath: ranked[0].path,
        candidates: ranked,
        confidence: 'low',
        reason: `Ambiguous designator: ${ranked.length} same-type pages match slug=${check.slug} (${ranked.map(p => p.title).join(', ')})`,
      };
    }

    // 2. No match — create new
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
