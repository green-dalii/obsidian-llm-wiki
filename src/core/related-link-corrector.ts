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

/** A wiki page as the resolver needs it: where it lives and what it answers to. */
export interface ExistingPageRef {
  path: string;
  title: string;
  aliases?: string[];
}

/**
 * Issue #482 stage 2: the whole vault, deterministically, instead of a window.
 *
 * The comment above explains why the prompt's candidate list cannot do this job
 * — the target is often outside it, and a sibling created in the same run is
 * outside it at any cap. The consequence taken here is to stop showing the list
 * at all (the generation and merge prompts no longer carry `existing_pages`)
 * and to resolve every related link after generation against an index of
 * *every* page: title first, then curated aliases, so `[[E433]]` lands on
 * `entities/Polysorbate` even though no window would have contained it.
 *
 * A name the vault does not know keeps the previous behaviour — folder from the
 * typed related lists, slug from the name — so the dead-link/stub path that
 * requirement 3 of the generation prompt relies on is unchanged.
 *
 * An alias claimed by two pages resolves to neither (the #446 lesson): the
 * ambiguity goes to the typed-list fallback rather than to a coin flip.
 */
export function correctRelatedLinkPrefixes(
  content: string,
  relatedEntities: string[] | undefined,
  relatedConcepts: string[] | undefined,
  relatedEntitiesLabel: string,
  relatedConceptsLabel: string,
  preserveCase: boolean,
  vaultIndex?: { wikiFolder: string; pages: ExistingPageRef[] },
): string {
  // Full-vault name → path index. Titles outrank aliases: a title is the page's
  // own claim to a name, an alias is someone's cross-reference to it.
  //
  // The index is keyed case-folded — `slugify(x, false)` — on both sides, per the
  // contract stated at slug.ts: comparison callers must not pass `preserveCase`,
  // so slugs stay comparable whatever the user's `slugCase` setting is. Under
  // `slugCase: 'preserve'` a case-sensitive key would make this resolver stricter
  // than `scanDeadLinks`, which judges over `knownTargetsLower`: a model writing
  // "mediterrane Ernährung" for the page "Mediterrane-Ernährung" would miss the
  // index here and be stamped into a dead link that the scanner would have
  // accepted unchanged. `preserveCase` is left alone on the pre-existing
  // `folderBySlug` path below, which keys both sides the same way and is not
  // part of this change.
  const pathByTitle = new Map<string, string>();
  const pathByAlias = new Map<string, string>();
  const ambiguousTitles = new Set<string>();
  const ambiguousAliases = new Set<string>();
  if (vaultIndex) {
    const prefix = vaultIndex.wikiFolder + '/';
    const register = (
      raw: string,
      relPath: string,
      into: Map<string, string>,
      clash: Set<string>,
    ) => {
      const s = slugify(raw, false);
      if (!s) return;
      const prev = into.get(s);
      if (prev && prev !== relPath) { clash.add(s); return; }
      into.set(s, relPath);
    };
    for (const page of vaultIndex.pages) {
      if (!page.path.startsWith(prefix)) continue;
      const relPath = page.path.slice(prefix.length).replace(/\.md$/, '');
      // sources/ is never a body-link target (constraints.ts), and
      // contradictions/ pages are not referenced by name.
      if (!relPath.startsWith('entities/') && !relPath.startsWith('concepts/')) continue;
      register(page.title, relPath, pathByTitle, ambiguousTitles);
      for (const alias of page.aliases ?? []) {
        register(alias, relPath, pathByAlias, ambiguousAliases);
      }
    }
  }
  const resolveInVault = (name: string): string | undefined => {
    const s = slugify(name, false);
    if (!s) return undefined;
    if (!ambiguousTitles.has(s)) {
      const byTitle = pathByTitle.get(s);
      if (byTitle) return byTitle;
    }
    if (!ambiguousAliases.has(s)) return pathByAlias.get(s);
    return undefined;
  };

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
  // rewrite. The singular forms are added because the model emits them despite the
  // plural in the prompt; they exist nowhere in the project's path generation
  // (`WIKI_SUBFOLDERS` is hardcoded plural), so accepting them cannot shadow a real
  // folder. Any other prefix stays out on purpose: a link like `[[Arzneimittel/X]]`
  // uses a vault-specific tag as a folder, and rewriting it would overwrite a user
  // intent this function cannot read. Case-sensitive on purpose — see the
  // "is case-sensitive on the folder prefix" test for the contract.
  const linkRe = /\[\[(entities|entity|concepts|concept|sources)\/([^\]|]+)(\|[^\]]*)?\]\]/g;
  // #482 stage 2: without a candidate list in the prompt the model also emits
  // bare `[[Name]]`, which the prefixed pattern above cannot see. In these two
  // sections a bare link is always an entity or concept reference, so it gets
  // the same treatment: resolved against the vault, or folder-stamped from the
  // typed lists so the stub path can pick it up.
  const bareLinkRe = /\[\[(?!entities\/|entity\/|concepts\/|concept\/|sources\/)([^\]|/]+)(\|[^\]]*)?\]\]/g;
  let current: 'entities' | 'concepts' | undefined;
  return content.split('\n').map(line => {
    const header = /^#{1,6}\s+(.*?)\s*$/.exec(line);
    if (header) {
      current = sectionFolder.get(header[1].trim());
      return line;
    }
    if (!current) return line;
    const rewrite = (target: string, folder: string | undefined, display: string | undefined): string => {
      // The vault's own answer wins: it knows the real path, including the case
      // where `target` is an alias of a page with a different title.
      const inVault = resolveInVault(target);
      if (inVault) {
        // An already-correct link keeps its exact shape, display or not.
        if (folder && inVault === `${folder}/${target}`) return `[[${inVault}${display ?? ''}]]`;
        return `[[${inVault}|${display ? display.slice(1) : target}]]`;
      }
      // Known type wins over section; otherwise the section dictates the folder
      // (within "Related Concepts" every link is a concept, etc.). This also
      // self-heals stale links carried through a merge from the existing body.
      const s = slugify(target, preserveCase);
      const correct = (!ambiguous.has(s) && folderBySlug.get(s)) || current;
      // A prefixed link keeps its shape; a bare link gains a display so the
      // rendered text stays the name rather than the path we just added.
      const label = display ? display.slice(1) : (folder ? undefined : target);
      return `[[${correct}/${target}${label === undefined ? '' : `|${label}`}]]`;
    };
    return line
      .replace(linkRe, (full, folder: string, target: string, display?: string) => {
        const out = rewrite(target, folder, display);
        return out === `[[${folder}/${target}${display ?? ''}]]` ? full : out;
      })
      .replace(bareLinkRe, (_full, target: string, display?: string) => rewrite(target, undefined, display));
  }).join('\n');
}
