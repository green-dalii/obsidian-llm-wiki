// Issue #364 — folder-boundary scoping for "ingest a folder".
//
// A bare `path.startsWith(folder.path)` treats a folder path as a plain string
// prefix, which is not the same as "is a descendant of this folder". Two things
// leak through:
//
//   * sibling folders sharing a name prefix — picking "Notizen" also matches
//     "Notizen-temp/x.md", because "Notizen-temp/x.md".startsWith("Notizen")
//   * a file sitting next to the folder — "Notizen.md" also matches "Notizen"
//
// Anchoring on a trailing slash makes the comparison mean what the caller
// intends. The vault root is the one folder with no prefix: every path is a
// descendant of it, and its own `path` is "/" rather than "".
//
// Pure and IO-free so the boundary rule can be unit-tested without an Obsidian
// vault — the call site only supplies two primitives.

/**
 * The string prefix every descendant of a folder shares.
 * Returns '' for the vault root, so `startsWith` accepts every path.
 */
export function folderScopePrefix(folderPath: string, isRoot: boolean): string {
  if (isRoot) return '';
  const trimmed = folderPath.replace(/\/+$/, '');
  if (trimmed.length === 0) return '';
  return `${trimmed}/`;
}

/**
 * True when `filePath` names a file inside the given folder, at any depth.
 * A folder is not a descendant of itself.
 */
export function isInFolderScope(
  filePath: string,
  folderPath: string,
  isRoot: boolean
): boolean {
  return filePath.startsWith(folderScopePrefix(folderPath, isRoot));
}
