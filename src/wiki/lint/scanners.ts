// Lint scanner functions — extracted from lint-controller.ts for testability.
// These have no Obsidian API dependencies and can be unit tested directly.

import { parseFrontmatter } from '../../utils';

export interface UppercasePageResult {
  merges: Array<{ target: string; source: string }>; // target=lowercase path, source=uppercase path
  renames: Array<{ oldPath: string; newBasename: string }>; // only uppercase exists, needs rename
}

// Detect wiki pages whose filenames contain uppercase letters.
// Returns pairs to merge (both uppercase+lowercase exist) and pages to rename (only uppercase exists).
export function detectUppercasePageNames(
  pages: Array<{ path: string; basename: string }>,
  wikiFolder: string
): UppercasePageResult {
  const result: UppercasePageResult = { merges: [], renames: [] };
  const allPaths = new Set(pages.map(p => p.path));
  for (const page of pages) {
    const basename = page.basename.replace('.md', '');
    const lower = basename.toLowerCase();
    if (basename === lower) continue;
    const dir = page.path.replace(`${wikiFolder}/`, '').split('/').slice(0, -1).join('/');
    const lowerPath = dir
      ? `${wikiFolder}/${dir}/${lower}.md`
      : `${wikiFolder}/${lower}.md`;
    if (allPaths.has(lowerPath)) {
      result.merges.push({ target: lowerPath, source: page.path });
    } else {
      result.renames.push({ oldPath: page.path, newBasename: lower });
    }
  }
  return result;
}

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
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  for (const { path, content } of pageMap.values()) {
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(content)) !== null) {
      const target = match[1].trim();
      if (!knownTargets.has(target) && !knownTargetsLower.has(target.toLowerCase())) {
        deadLinks.push({
          source: path.replace(wikiFolder + '/', '').replace('.md', ''),
          target
        });
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
