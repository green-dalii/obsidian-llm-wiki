// Duplicate page detection — programmatic candidate generation via shared links,
// bigram title similarity, and cross-language alias matching.
// Extracted from lint-fixes.ts to keep the module focused.

import { parseFrontmatter } from '../../utils';

export interface DuplicateCandidate {
  target: string;
  source: string;
  reason: string;
  signal: 'crossLang' | 'bigram' | 'sharedLinks';
  score: number;
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
  }

  const YIELD_EVERY = 200;
  const YIELD_EVERY_PHASE1 = 50;

  const metas: PageMeta[] = [];
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    if (i > 0 && i % YIELD_EVERY_PHASE1 === 0) {
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

    metas.push({ path: page.path, title: page.title, aliases, links });
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
  const YIELD_EVERY_COMPARISON = 500;

  // Signal 1: Shared outgoing wiki-links (Jaccard >= 0.4)
  for (let i = 0; i < metas.length; i++) {
    if (i > 0 && i % YIELD_EVERY === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    for (let j = i + 1; j < metas.length; j++) {
      comparisonCount++;
      if (comparisonCount % YIELD_EVERY_COMPARISON === 0) {
        await new Promise(resolve => window.setTimeout(resolve, 0));
      }

      const a = metas[i], b = metas[j];
      if (a.links.size === 0 || b.links.size === 0) continue;
      let intersection = 0;
      for (const link of a.links) {
        if (b.links.has(link)) intersection++;
      }
      const union = a.links.size + b.links.size - intersection;
      const jaccard = union > 0 ? intersection / union : 0;
      if (jaccard >= 0.4) {
        addCandidate(a.path, b.path, `Shared wiki-links (${Math.round(jaccard * 100)}% overlap)`, 'sharedLinks', jaccard);
      }
    }
  }

  // Signal 2: Bigram + cross-language on titles/aliases
  const bigrams = (s: string): Set<string> => {
    const result = new Set<string>();
    const normalized = s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
    for (let i = 0; i < normalized.length - 1; i++) {
      result.add(normalized.substring(i, i + 2));
    }
    return result;
  };

  for (let i = 0; i < metas.length; i++) {
    if (i > 0 && i % YIELD_EVERY === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }
    for (let j = i + 1; j < metas.length; j++) {
      comparisonCount++;
      if (comparisonCount % YIELD_EVERY_COMPARISON === 0) {
        await new Promise(resolve => window.setTimeout(resolve, 0));
      }

      const a = metas[i], b = metas[j];
      const namesA = [a.title, ...a.aliases];
      const namesB = [b.title, ...b.aliases];

      // 2a: Bigram similarity on all names (titles + aliases)
      let maxSim = 0;
      for (const nameA of namesA) {
        for (const nameB of namesB) {
          const bgA = bigrams(nameA);
          const bgB = bigrams(nameB);
          if (bgA.size === 0 || bgB.size === 0) continue;
          let intersection = 0;
          for (const bg of bgA) {
            if (bgB.has(bg)) intersection++;
          }
          const sim = intersection / (bgA.size + bgB.size - intersection);
          if (sim > maxSim) maxSim = sim;
        }
      }
      if (maxSim >= 0.4) {
        addCandidate(a.path, b.path, `Title/alias similarity (${Math.round(maxSim * 100)}% match)`, 'bigram', maxSim);
      }

      // 2b: Cross-language alias match
      const normalizeForMatch = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, '').replace(/[^a-z0-9一-鿿]/g, '');

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

  return Array.from(candidates.values());
}
