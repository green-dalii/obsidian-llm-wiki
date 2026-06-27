// Duplicate page detection — programmatic candidate generation via shared links,
// bigram title similarity, and cross-language alias matching.
// Extracted from lint-fixes.ts to keep the module focused.

import { parseFrontmatter } from '../../core/frontmatter';
import {
  LINT_YIELD_EVERY_OUTER,
  LINT_YIELD_EVERY_PHASE1,
  LINT_YIELD_EVERY_COMPARISON,
} from '../../constants';

export interface DuplicateCandidate {
  target: string;
  source: string;
  reason: string;
  signal: 'crossLang' | 'bigram' | 'sharedLinks' | 'caseVariant';
  score: number;
}

// ── Pure Functions (extracted for testability) ───────────────────────────────

/** Extract character bigrams from string for similarity comparison. */
export function bigrams(s: string): Set<string> {
  const result = new Set<string>();
  const normalized = s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
  for (let i = 0; i < normalized.length - 1; i++) {
    result.add(normalized.substring(i, i + 2));
  }
  return result;
}

/** Normalize string for cross-language matching. */
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]+/g, '').replace(/[^a-z0-9一-鿿]/g, '');
}

const BODY_STOPWORDS = new Set([
  'also', 'are', 'been', 'being', 'both', 'but', 'can', 'could', 'did',
  'does', 'each', 'from', 'had', 'has', 'have', 'into', 'its', 'may',
  'might', 'must', 'not', 'only', 'other', 'our', 'shall', 'should',
  'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'was', 'were', 'what', 'when',
  'where', 'which', 'while', 'will', 'with', 'would', 'your',
]);

/** Extract unique meaningful words from body text for content similarity comparison. */
export function bodyWordSet(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s一-鿿]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !BODY_STOPWORDS.has(w)),
  );
}

/** Compute Jaccard similarity between two sets. */
export function computeJaccard<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Generate duplicate-page candidates using programmatic signals.
// Returns candidates for LLM verification, capped by the O(n²) algorithm.
// Three signals, ordered by reliability:
//   1. Shared outgoing wiki-links (Jaccard >= 0.4)
//   2. Character bigram title similarity (catches spelling variants, same-language near-matches)
//   3. Cross-language alias match
export async function generateDuplicateCandidates(
  pages: Array<{ path: string; content: string; title: string }>,
): Promise<DuplicateCandidate[]> {
  interface PageMeta {
    path: string;
    title: string;
    aliases: string[];
    links: Set<string>;
    bodyWords: Set<string>;
  }

  const metas: PageMeta[] = [];
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    if (i > 0 && i % LINT_YIELD_EVERY_PHASE1 === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }

    const fm = parseFrontmatter(page.content);
    const aliases = Array.isArray(fm?.aliases) ? fm.aliases : [];

    const links = new Set<string>();
    const body = page.content.replace(/---[\s\S]*?---/, '');
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(body)) !== null) {
      links.add(match[1].trim().toLowerCase());
    }

    // Strip wiki links before computing body words so link text doesn't inflate similarity
    const bodyText = body.replace(/\[\[[^\]]+\]\]/g, '');
    const bodyWords = bodyWordSet(bodyText);

    metas.push({ path: page.path, title: page.title, aliases, links, bodyWords });
  }

  const candidates = new Map<string, DuplicateCandidate>();

  const addCandidate = (pathA: string, pathB: string, reason: string, signal: DuplicateCandidate['signal'], score: number) => {
    const key = [pathA, pathB].sort().join('|||');
    if (!candidates.has(key)) {
      candidates.set(key, { target: pathA, source: pathB, reason, signal, score });
    } else if (score > candidates.get(key)!.score) {
      candidates.set(key, { target: pathA, source: pathB, reason, signal, score });
    }
  };

  let comparisonCount = 0;

  // Signal 1: Shared outgoing wiki-links (Jaccard >= 0.4)
  for (let i = 0; i < metas.length; i++) {
    if (i > 0 && i % LINT_YIELD_EVERY_OUTER === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    for (let j = i + 1; j < metas.length; j++) {
      comparisonCount++;
      if (comparisonCount % LINT_YIELD_EVERY_COMPARISON === 0) {
        await new Promise(resolve => window.setTimeout(resolve, 0));
      }

      const a = metas[i], b = metas[j];
      if (a.links.size === 0 || b.links.size === 0) continue;
      const jaccard = computeJaccard(a.links, b.links);
      if (jaccard >= 0.4) {
        // Body similarity gate: pages with different content are not duplicates
        // even if they share the same set of wiki-links (e.g., two unrelated pages
        // both linking only to one popular hub page).
        const bodySim = computeJaccard(a.bodyWords, b.bodyWords);
        if (bodySim < 0.2) continue;
        addCandidate(a.path, b.path, `Shared wiki-links (${Math.round(jaccard * 100)}% overlap)`, 'sharedLinks', jaccard);
      }
    }
  }

  // Signal 2: Bigram + cross-language on titles/aliases
  for (let i = 0; i < metas.length; i++) {
    if (i > 0 && i % LINT_YIELD_EVERY_OUTER === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    for (let j = i + 1; j < metas.length; j++) {
      comparisonCount++;
      if (comparisonCount % LINT_YIELD_EVERY_COMPARISON === 0) {
        await new Promise(resolve => window.setTimeout(resolve, 0));
      }

      const a = metas[i], b = metas[j];
      const namesA = [a.title, ...a.aliases];
      const namesB = [b.title, ...b.aliases];

      // 2a: Bigram similarity on all names (titles + aliases)
      let maxSim = 0;
      for (const nameA of namesA) {
        for (const nameB of namesB) {
          const sim = computeJaccard(bigrams(nameA), bigrams(nameB));
          if (sim > maxSim) maxSim = sim;
        }
      }
      if (maxSim >= 0.4) {
        addCandidate(a.path, b.path, `Title/alias similarity (${Math.round(maxSim * 100)}% match)`, 'bigram', maxSim);
      }

      // 2b: Cross-language alias match
      const normalizedNamesA = namesA.map(n => normalizeForMatch(n));
      const normalizedAliasesB = b.aliases.map(n => normalizeForMatch(n));
      const normalizedTitleB = normalizeForMatch(b.title);

      let crossLangMatch = false;
      for (const normA of normalizedNamesA) {
        if (normA && (normalizedAliasesB.includes(normA) || normalizedTitleB === normA)) {
          addCandidate(a.path, b.path, 'Cross-language match (alias or title overlap)', 'crossLang', 1.0);
          crossLangMatch = true;
          break;
        }
      }

      if (!crossLangMatch) {
        const normalizedNamesB = namesB.map(n => normalizeForMatch(n));
        const normalizedAliasesA = a.aliases.map(n => normalizeForMatch(n));
        const normalizedTitleA = normalizeForMatch(a.title);

        for (const normB of normalizedNamesB) {
          if (normB && (normalizedAliasesA.includes(normB) || normalizedTitleA === normB)) {
            addCandidate(a.path, b.path, 'Cross-language match (alias or title overlap)', 'crossLang', 1.0);
            break;
          }
        }
      }
    }
  }

  // Signal 3: Case-variant title collision
  // Two pages whose titles differ only in casing are highly likely duplicates.
  // e.g., "Unix" vs "unix", "Claude Code" vs "claude-code"
  for (let i = 0; i < metas.length; i++) {
    for (let j = i + 1; j < metas.length; j++) {
      const a = metas[i], b = metas[j];
      const lowerA = a.title.toLowerCase();
      const lowerB = b.title.toLowerCase();
      if (lowerA === lowerB && a.title !== b.title) {
        // Always pick lowercase-as-slug as target (deterministic merge direction)
        const [canonical, variant] = a.title < b.title ? [a, b] : [b, a];
        addCandidate(canonical.path, variant.path,
          `Case-variant duplicate: "${a.title}" ↔ "${b.title}"`, 'caseVariant', 0.9);
      }
    }
  }

  return Array.from(candidates.values());
}
