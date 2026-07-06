// Lint scanner functions — extracted from lint-controller.ts for testability.
// These have no Obsidian API dependencies and can be unit tested directly.

import { parseFrontmatter } from '../../core/frontmatter';
import { getActiveEntityTags, getActiveConceptTags, getActiveSourceTags } from '../../core/tag-vocab';
import { normalizeQuote, isQuoteGrounded } from './utils';
import { LLMWikiSettings } from '../../types';

export interface ScannerPage {
  path: string;
  content: string;
  basename: string;
}

// Build a set of all known link targets across the vault for dead link detection.
export function buildKnownTargets(allVaultFiles: Array<{ basename: string; path: string }>): { known: Set<string>; knownLower: Set<string> } {
  const known = new Set<string>();
  const knownLower = new Set<string>();
  const addTarget = (t: string) => { known.add(t); knownLower.add(t.toLowerCase()); };
  for (const file of allVaultFiles) {
    const nameWithoutExt = file.basename.replace('.md', '');
    addTarget(file.basename);
    addTarget(nameWithoutExt);
    const relPath = file.path.replace('.md', '');
    addTarget(relPath);
    addTarget(file.path);
    const parts = relPath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const subPath = parts.slice(i).join('/');
      addTarget(subPath);
      addTarget(subPath + '.md');
    }
  }
  return { known, knownLower };
}

// Detect pages with missing aliases (entities & concepts only).
export function detectAliasDeficiency(
  wikiFiles: Array<{ path: string }>,
  pageMap: Map<string, ScannerPage>
): ScannerPage[] {
  const result: ScannerPage[] = [];
  for (const file of wikiFiles) {
    if (file.path.includes('/entities/') || file.path.includes('/concepts/')) {
      const info = pageMap.get(file.path);
      if (info) {
        const fmMatch = info.content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch && !fmMatch[1].includes('aliases:')) {
          result.push(info);
        }
      }
    }
  }
  return result;
}

// Scan wiki pages for dead links ([[wikilinks]] pointing to non-existent targets).
// Uses Map<string, {path, content, basename}> which requires no Obsidian types.
export function scanDeadLinks(
  pageMap: Map<string, ScannerPage>,
  knownTargets: Set<string>,
  knownTargetsLower: Set<string>,
  wikiFolder: string
): Array<{ source: string; target: string }> {
  const deadLinks: Array<{ source: string; target: string }> = [];
  // Per-(source,target) dedup so a page referencing the same missing target
  // 4 times shows up as 1 entry, not 4. Diff against (source, target) across
  // pages intentionally stays (different source pages should each list the
  // missing targets they reference, so users can see which sources are affected).
  const seen = new Set<string>();
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  for (const { path, content } of pageMap.values()) {
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(content)) !== null) {
      const target = match[1].trim();
      const targetLower = target.toLowerCase();
      if (!knownTargets.has(target) && !knownTargetsLower.has(targetLower)) {
        // Slug-normalized fallback: "entities/Claude Code" matches "entities/Claude-Code"
        const parts = target.split('/');
        const sluggedBasename = parts[parts.length - 1].replace(/\s+/g, '-');
        const sluggedTarget = [...parts.slice(0, -1), sluggedBasename].join('/');
        const isSlugMatch =
          sluggedTarget !== target &&
          (knownTargets.has(sluggedTarget) || knownTargetsLower.has(sluggedTarget.toLowerCase()));
        if (!isSlugMatch) {
          const source = path.replace(wikiFolder + '/', '').replace('.md', '');
          const key = `${source}::${target}`;
          if (!seen.has(key)) {
            seen.add(key);
            deadLinks.push({ source, target });
          }
        }
      }
    }
    linkRegex.lastIndex = 0;
  }
  return deadLinks;
}

// Detect orphan pages (no incoming links from any wiki page, alias-aware).
export function scanOrphans(
  pageMap: Map<string, ScannerPage>,
  wikiFolder: string
): string[] {
  const incomingLinks = new Map<string, string[]>();
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  for (const { path, content } of pageMap.values()) {
    const sourceRel = path.replace(wikiFolder + '/', '').replace('.md', '');
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(content)) !== null) {
      const target = match[1].trim();
      if (!incomingLinks.has(target)) incomingLinks.set(target, []);
      incomingLinks.get(target)!.push(sourceRel);
    }
    linkRegex.lastIndex = 0;
  }
  const orphans: string[] = [];
  for (const { path, basename, content } of pageMap.values()) {
    const fm = parseFrontmatter(content);
    const aliases = Array.isArray(fm?.aliases) ? fm.aliases : [];
    const relPath = path.replace(wikiFolder + '/', '').replace('.md', '');
    const nameWithoutExt = basename.replace('.md', '');
    const forms = [basename, nameWithoutExt, relPath, ...aliases];
    const parts = relPath.split('/');
    for (let i = 1; i < parts.length; i++) {
      const subPath = parts.slice(i).join('/');
      forms.push(subPath);
      forms.push(subPath + '.md');
    }
    const hasIncoming = forms.some(f => incomingLinks.has(f) || incomingLinks.has(f.toLowerCase()));
    if (!hasIncoming) orphans.push(path);
  }
  return orphans;
}

// ── Quote grounding scanner (Issue #126) ──────────────────────

export interface QuoteGroundingIssue {
  pagePath: string;
  sourcePath?: string;
  quote: string;
  hasSourceLink: boolean;
}

/**
 * Split a link target into its path-without-`.md` and a flag indicating
 * whether the original ended in `.md`. Used by the Mentions scanner to
 * support both `[[path/to/note]]` and `[[path/to/note.md]]` forms.
 */
function splitMdExtension(target: string): { basePath: string; hasMd: boolean } {
  if (target.endsWith('.md')) {
    return { basePath: target.slice(0, -3), hasMd: true };
  }
  return { basePath: target, hasMd: false };
}

function extractMentionsSection(content: string, mentionsLabel: string): string | undefined {
  // Match the localized "## <label>" section up to the next ## heading.
  // Caller MUST pass the resolved label from getSectionLabels(settings).
  const escaped = mentionsLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n*$)`, 'i'));
  return match?.[1];
}

function extractSourceBody(content: string): string {
  // Strip YAML frontmatter.
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

/**
 * Issue #126: programmatic quote-grounding audit. Verifies that every quote
 * listed under a page's `## Mentions in Source` section can be found in the
 * linked (or, for legacy bare quotes, any) source file.
 *
 * Two tolerance tiers:
 *   1. Exact substring match against the source body.
 *   2. Normalized match (case-folded, punctuation stripped, whitespace collapsed).
 *
 * Mentions may have either of these forms:
 *   - "quote text" — [[sources/slug]]     (current format)
 *   - "quote text"                          (legacy format without source link)
 *
 * Legacy bare quotes are accepted if they appear in ANY source file under
 * `wiki/sources/`. This avoids false positives on older pages generated before
 * the source-link suffix was added.
 *
 * Returns a sorted list of ungrounded issues. No file IO, no LLM.
 */
export function scanQuoteGrounding(
  pageMap: Map<string, ScannerPage>,
  sourceMap: Map<string, ScannerPage>,
  wikiFolder: string,
  mentionsLabel: string = 'Mentions in Source',
): QuoteGroundingIssue[] {
  const issues: QuoteGroundingIssue[] = [];

  // E2/E3: pre-build source-body lookup + pre-normalize once for legacy fallback.
  // Avoids re-stripping frontmatter per quote and re-normalizing per source per quote.
  const sourceBodyMap = new Map<string, string>();
  const normalizedSourceBodies: string[] = [];
  for (const [p, s] of sourceMap) {
    const body = extractSourceBody(s.content);
    sourceBodyMap.set(p, body);
    normalizedSourceBodies.push(normalizeQuote(body));
  }

  for (const [path, page] of pageMap) {
    if (!path.startsWith(wikiFolder + '/')) continue;

    const mentionsBlock = extractMentionsSection(page.content, mentionsLabel);
    if (!mentionsBlock) continue;

    // Match lines like: - "quote text" — [[sources/slug]]
    // or legacy:        - "quote text"
    const lineRegex = /^[-*]\s+"([^"]+)"(?:\s*[—-]\s*\[\[([^\]]+)\]\])?\s*$/gm;
    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(mentionsBlock)) !== null) {
      const quote = match[1].trim();
      const linkTarget = match[2]?.trim();

      if (linkTarget) {
        // Strip any display-name suffix: [[path|name]] → path
        const bareTarget = linkTarget.split('|')[0].trim();
        // Current format: exact source link. Three supported target forms:
        //   1. wiki/sources/<slug>     → resolvedPath = `wiki/sources/<slug>.md`
        //      (legacy: `sources/<slug>` form was prepended with wikiFolder;
        //      preserve this for the existing call sites and tests).
        //   2. <raw-note-path>          → look up by raw vault path
        //      (Issue #244 — Mentions citations link to the original source
        //      note, which lives outside the wiki/ folder).
        let source: ScannerPage | undefined;
        let resolvedPath: string;

        const sourcesPrefix = wikiFolder + '/sources/';
        if (bareTarget.startsWith('sources/') || bareTarget.startsWith(sourcesPrefix)) {
          // Legacy wiki-internal sources/ path. Always prepend wikiFolder.
          const slug = bareTarget.replace(/^sources\//, '').replace(/^wiki\/sources\//, '');
          resolvedPath = `${wikiFolder}/sources/${slug}.md`;
          source = sourceMap.get(resolvedPath);
        } else {
          // Raw-note path. Try as-is, with and without .md.
          const { basePath, hasMd } = splitMdExtension(bareTarget);
          const candidates = [
            bareTarget,
            basePath + (hasMd ? '' : '.md'),
          ];
          resolvedPath = bareTarget;
          for (const p of candidates) {
            const found = sourceMap.get(p);
            if (found) {
              source = found;
              resolvedPath = p;
              break;
            }
          }
        }

        const body = source ? sourceBodyMap.get(source.path) ?? '' : '';
        const grounded = body ? isQuoteGrounded(quote, body) : false;
        if (!grounded) {
          issues.push({
            pagePath: path,
            sourcePath: resolvedPath,
            quote,
            hasSourceLink: true,
          });
        }
      } else {
        // Legacy format: accept if quote appears in any source file.
        // E3: pre-normalized once, so this is O(Q) not O(Q*S).
        const normalizedQuote = normalizeQuote(quote);
        const grounded = normalizedQuote.length > 0 &&
          normalizedSourceBodies.some(nb => nb.includes(normalizedQuote));
        if (!grounded) {
          issues.push({
            pagePath: path,
            quote,
            hasSourceLink: false,
          });
        }
      }
    }
  }

  issues.sort((a, b) => {
    const pathCmp = a.pagePath.localeCompare(b.pagePath);
    if (pathCmp !== 0) return pathCmp;
    return a.quote.localeCompare(b.quote);
  });

  return issues;
}

// ── Tag vocabulary violation scanner (Issue #85 v7) ───────────

export type TagViolationPageType = 'entity' | 'concept' | 'source';

export interface TagViolation {
  path: string;
  pageType: TagViolationPageType;
  title: string;
  currentTags: string[];
  invalidTags: string[];   // subset of currentTags that are NOT in the active vocabulary
}

/**
 * Issue #85 v7: programmatic tag-vocabulary audit. Pure function. Walks
 * the same pageMap used by the other Lint scanners and reports every
 * entity / concept / source page whose frontmatter `tags` array
 * contains at least one value that is not in the active vocabulary.
 *
 * Active vocabulary is resolved via the existing getActive*Tags
 * helpers so this scanner automatically tracks Issue #85 v6 settings
 * (default vs custom mode, plus the new static source-page taxonomy
 * VALID_SOURCE_TAGS).
 *
 * Returns an empty array when everything is clean. No file IO, no LLM.
 * Sort: by path, so the Lint report is deterministic.
 */
export function scanTagViolations(
  pageMap: Map<string, ScannerPage>,
  settings: LLMWikiSettings,
): TagViolation[] {
  const validEntity = new Set(getActiveEntityTags(settings));
  const validConcept = new Set(getActiveConceptTags(settings));
  const validSource = new Set(getActiveSourceTags(settings));
  const violations: TagViolation[] = [];

  for (const [path, page] of pageMap) {
    const fm = parseFrontmatter(page.content);
    if (!fm) continue;
    const pageType = fm.type as TagViolationPageType | 'comparison' | 'overview' | undefined;
    if (pageType !== 'entity' && pageType !== 'concept' && pageType !== 'source') continue;

    const validSet =
      pageType === 'entity' ? validEntity :
      pageType === 'concept' ? validConcept :
      validSource;

    // tags can be a string (YAML scalar) or array. parseFrontmatter
    // returns a string for scalar and string[] for array. Accept both.
    // (The runtime type is broad; tsc narrows it to never here, so we
    // explicitly cast to unknown then back to the union we actually
    // handle below.)
    const rawTags: unknown = (fm as Record<string, unknown>).tags;
    let currentTags: string[];
    if (Array.isArray(rawTags)) {
      currentTags = rawTags.map(t => String(t).trim()).filter(t => t.length > 0);
    } else if (typeof rawTags === 'string' && rawTags.length > 0) {
      currentTags = [rawTags.trim()];
    } else {
      continue; // empty / no tags → not a violation
    }

    const invalidTags = currentTags.filter(t => !validSet.has(t));
    if (invalidTags.length > 0) {
      violations.push({
        path,
        pageType,
        title: typeof fm.title === 'string' ? fm.title : page.basename.replace(/\.md$/, ''),
        currentTags,
        invalidTags,
      });
    }
  }

  violations.sort((a, b) => a.path.localeCompare(b.path));
  return violations;
}

// ── Hub link density scanner (Issue #157 / #175, v1.23.0 P1-6) ──────────
// Re-exported from core/ because the scanner needs a Graph (wiki-link
// structure), which the other scanners don't. Keeping the
// implementation in core/ preserves the pure-function convention and
// makes the algorithm unit-testable without an Obsidian dependency.

export { scanHubLinkDensity, type HubLinkDensityIssue, type HubLinkDensityOptions } from '../../core/hub-link-distinctiveness';
