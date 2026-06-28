// build-graph.ts — v1.23.0 Graph Engine: wiki-link graph builder
//
// Pure function. Scans wiki page bodies for [[wiki-folder/path/to/page]] links
// and builds a { nodes, edges } Graph for use with pprCascade / Monte Carlo
// PPR. Zero IO, no side effects.
//
// The graph contains ALL known pages as nodes (allPaths), even those whose
// content was not loaded. Edges are derived only from the loaded page bodies.
// Pages with no outgoing links get an empty edge array.
//
// Strips fragment identifiers ([[path#section]]) and display text ([[path|text]])
// from wiki links. Deduplicates edges. Skips self-links.

import type { Graph } from './monte-carlo-ppr';

export type { Graph };

/**
 * Loaded page content for graph construction.
 */
export interface LoadedPage {
  path: string;
  content: string;
}

/**
 * Wiki-link regex: matches [[wiki-folder/path/to/page]] constructs.
 * Supports:
 *   - [[wiki/entities/page]] or [[wiki/concepts/name]]
 *   - [[wiki/entities/page|Display Text]]
 *   - [[wiki/entities/page#section|Text]]
 *   - [[wiki/entities/page#^block-id]]
 *
 * Group 1: the full wiki-link target (path + optional fragment)
 * Group 2: the raw path without fragment (entities/page)
 * Group 3: optional display text after `|`
 */
const WIKI_LINK_RE = /\[\[([^\]|#]+?)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

/**
 * Build a Graph from loaded page content.
 *
 * @param loadedPages — pages whose body content is available (may be empty).
 * @param allPaths — set of ALL known wiki page paths (nodes to include).
 * @param wikiFolder — the wiki folder prefix to strip from links (e.g. "wiki").
 * @returns a Graph with all paths as nodes and edges derived from loaded content.
 */
export function buildGraphFromContent(
  loadedPages: LoadedPage[],
  allPaths: Set<string>,
  wikiFolder: string,
): Graph {
  const nodes = [...allPaths];
  const edges = new Map<string, string[]>();

  // Initialize empty edge arrays for all known paths.
  for (const path of nodes) {
    edges.set(path, []);
  }

  // Build a prefix matcher: match "wiki/" or "mywiki/" etc.
  const prefix = wikiFolder.endsWith('/') ? wikiFolder : wikiFolder + '/';

  // Map known paths by their last path component for fuzzy matching.
  const pathBySlug = new Map<string, string>();
  for (const p of nodes) {
    const slug = p.split('/').pop() || p;
    pathBySlug.set(slug, p);
  }

  for (const page of loadedPages) {
    const sourcePath = page.path;

    WIKI_LINK_RE.lastIndex = 0;
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = WIKI_LINK_RE.exec(page.content)) !== null) {
      const rawTarget = match[1]; // e.g. "wiki/entities/dog"
      const fullTarget = rawTarget.startsWith(prefix)
        ? rawTarget.slice(prefix.length)
        : rawTarget;

      // If the link doesn't have the wiki folder prefix, try interpreting it
      // as a direct slug match against known paths (for links without folder prefix).
      const resolvedPath =
        allPaths.has(fullTarget)
          ? fullTarget
          : allPaths.has(rawTarget)
            ? rawTarget
            : pathBySlug.get(fullTarget) && allPaths.has(pathBySlug.get(fullTarget)!)
              ? pathBySlug.get(fullTarget)!
              : null;

      if (resolvedPath === null || resolvedPath === sourcePath) continue;
      if (!seen.has(resolvedPath)) {
        seen.add(resolvedPath);
        edges.get(sourcePath)!.push(resolvedPath);
      }
    }
  }

  return { nodes, edges };
}
