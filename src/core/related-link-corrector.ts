// Related-link prefix corrector — deterministic root-cause fix for `sources/`-prefixed
// related links. Pure, no LLM, O(links).
//
// The Related Concepts / Related Entities sections are LLM-formatted, but the model
// only ever sees a truncated (MAX_PAGES) existing-pages list, so it usually can't find
// the target's path and defaults to the most salient prefix in the prompt — `sources/`
// (which appears in the `sources:` frontmatter, the `## Source` section, and every
// mention citation). Crucially, the worst case is a page and a related sibling
// generated in the SAME run: the sibling is in the list at no MAX_PAGES, because it does
// not exist yet when the prompt is built — so raising the cap can't reach it. The code
// already KNOWS the type of every related name (`related_entities` are entities,
// `related_concepts` are concepts), so re-assert it deterministically after generation
// instead of trusting the guess.
//
// Scoped to the two Related sections by their header label, so the legitimate
// `[[sources/<sourceSlug>]]` citations in "Mentions in Source" — whose names often
// coincide with a related concept (e.g. the source "Gedächtnis" is also a related
// concept) — are never rewritten. No false-merge risk.

import { slugify } from './slug';

export function correctRelatedLinkPrefixes(
  content: string,
  relatedEntities: string[] | undefined,
  relatedConcepts: string[] | undefined,
  relatedEntitiesLabel: string,
  relatedConceptsLabel: string,
  preserveCase: boolean
): string {
  // Name→type map from the typed related lists. Catches links mis-sectioned by
  // the LLM (e.g. an entity listed under Related Concepts): the known type wins
  // over the section's implied type. A name in BOTH lists is ambiguous → defer to
  // the section context.
  const folderBySlug = new Map<string, 'entities' | 'concepts'>();
  const ambiguous = new Set<string>();
  const index = (names: string[] | undefined, folder: 'entities' | 'concepts') => {
    for (const n of names ?? []) {
      const s = slugify(n, preserveCase);
      if (!s) continue;
      const prev = folderBySlug.get(s);
      if (prev && prev !== folder) { ambiguous.add(s); continue; }
      folderBySlug.set(s, folder);
    }
  };
  index(relatedEntities, 'entities');
  index(relatedConcepts, 'concepts');

  // Section → implied folder. Match the localized headers AND the canonical
  // English ones: pages merged before the #188 fix carry literal English headers
  // regardless of wikiLanguage, so recognizing both also heals that backlog.
  const sectionFolder = new Map<string, 'entities' | 'concepts'>();
  for (const h of [relatedEntitiesLabel.trim(), 'Related Entities']) sectionFolder.set(h, 'entities');
  for (const h of [relatedConceptsLabel.trim(), 'Related Concepts']) sectionFolder.set(h, 'concepts');

  // #307: the pattern used to accept only the three correct folder names, so a link
  // whose prefix was wrong — the very thing this function repairs — never entered the
  // rewrite at all. The singular forms are added because the model emits them despite
  // the plural in the prompt; they exist nowhere in the project's path generation
  // (`WIKI_SUBFOLDERS` is hardcoded plural), so accepting them cannot shadow a real
  // folder. Plural alternatives come first so `concepts/` matches without backtracking
  // through `concept`.
  // Any other prefix stays out on purpose: a link like `[[Arzneimittel/X]]` uses a
  // vault-specific tag as a folder, and rewriting it would overwrite a user intent this
  // function cannot read.
  const linkRe = /\[\[(entities|entity|concepts|concept|sources)\/([^\]|]+)(\|[^\]]*)?\]\]/g;
  let current: 'entities' | 'concepts' | undefined;
  return content.split('\n').map(line => {
    const header = /^#{1,6}\s+(.*?)\s*$/.exec(line);
    if (header) {
      current = sectionFolder.get(header[1].trim());
      return line;
    }
    if (!current) return line;
    return line.replace(linkRe, (full, folder: string, target: string, display?: string) => {
      const s = slugify(target, preserveCase);
      // Known type wins over section; otherwise the section dictates the folder
      // (within "Related Concepts" every link is a concept, etc.). This also
      // self-heals stale links carried through a merge from the existing body.
      const correct = (!ambiguous.has(s) && folderBySlug.get(s)) || current;
      if (correct === folder) return full;
      return `[[${correct}/${target}${display ?? ''}]]`;
    });
  }).join('\n');
}
