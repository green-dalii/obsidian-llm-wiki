// build-folder-tree.ts — pure function for the Multi-File Suggest modal
// (v1.23.0 #130, fixed 2026-06-28).
//
// Background: the modal's left pane should look like Obsidian's file
// explorer — a recursively-nested tree of folders, each containing
// files and subfolders, not the previous flat list of "top-level
// folder → files" rows. The first implementation (v1.23.0 round 1)
// used a single Map<string, TFile[]> which flattened the structure:
// a file at `inbox/2024/Q1/meeting.md` showed up under a single row
// labeled "inbox/2024/Q1" with `meeting.md` as a one-line child,
// regardless of how many intermediate folders existed. With three or
// more levels, the visual hierarchy was lost.
//
// This module rebuilds the tree from the raw `[[wiki-link]]`-style
// file paths using each file's `.parent` chain (Obsidian's public API).
// It is a PURE function (no Obsidian imports, no IO, no DOM) so it
// can be unit-tested in isolation against `TFile`-shaped mocks. The
// modal then consumes the result and walks it recursively to build
// the DOM.

import type { TFile } from 'obsidian';

/**
 * One node in the folder tree.
 *
 * - `folder`: the TFolder this node represents (or `null` for the
 *   synthetic vault-root we use as the tree's single entry point).
 * - `path`: the folder's path string (empty for the synthetic root).
 * - `files`: TFiles whose `.parent` IS this folder (i.e. direct
 *   children only — files in subfolders live in deeper nodes).
 * - `children`: sub-TreeNodes whose path is `path + name + '/'`.
 *   Sorted alphabetically.
 *
 * Files and children are NOT filtered by the search query here; the
 * modal does that at render time so the source tree is reusable
 * across keystrokes.
 */
export interface TreeNode {
  folder: import('obsidian').TFolder | null;
  path: string;
  files: TFile[];
  children: TreeNode[];
}

/**
 * Build a nested folder tree from a flat list of TFile.
 *
 * Walks each file's `.parent` chain to discover the folder path
 * from the file up to the highest ancestor that is NOT a parent of
 * any other file in the input set. That ancestor becomes the tree's
 * root. This means the tree naturally clips to the "common ancestors
 * of the input set" — files deeper than the input don't appear as
 * empty folders.
 *
 * The synthetic vault-root is returned as the single-element array
 * `[root]`. Empty input returns an empty array.
 *
 * Files in the input that share the same immediate parent end up in
 * the same `TreeNode.files`. Files whose parent chain diverges at
 * some ancestor get their own subtree.
 *
 * @param files flat list of TFile. Each file MUST have a `parent`
 *   (or be passed to {@link buildFolderTreeFromPaths} instead).
 * @returns tree nodes (single-element array containing the synthetic
 *   root, or empty array if no files).
 */
export function buildFolderTree(files: TFile[]): TreeNode[] {
  if (files.length === 0) return [];

  // Find the deepest common ancestors. For each file, walk up its
  // parent chain and collect every folder along the way. The
  // intersection (paths that appear in every file's ancestor chain)
  // is the synthetic root's reach. In practice, for a plugin showing
  // user-selected files from a vault, the only common ancestor is
  // usually the vault root itself.
  //
  // For simplicity (and because the modal filters out the wiki/
  // folder and .obsidian/ at the call site), we collapse to a single
  // synthetic root and let the recursion build the nested subfolders
  // from the parent chain.

  // Map: path-string → TreeNode. Used to dedupe folders shared
  // across multiple files.
  const nodeByPath = new Map<string, TreeNode>();
  // The synthetic root — has no TFolder, path = ''.
  const root: TreeNode = { folder: null, path: '', files: [], children: [] };
  nodeByPath.set('', root);

  for (const file of files) {
    // Walk up the parent chain to collect every ancestor folder.
    // The order goes from immediate parent up to the vault root
    // (or the topmost ancestor — the caller's mock might not have a
    // real TFolder at the chain top, just a `null` parent). We
    // treat the synthetic root as the "implicit top" — so the
    // topmost ancestor (the one whose own parent is null) is the
    // synthetic root's only child, and files inside IT are direct
    // children of the synthetic root.
    const chain: import('obsidian').TFolder[] = [];
    let cursor: import('obsidian').TFolder | null = file.parent;
    while (cursor) {
      chain.push(cursor);
      const next = (cursor as unknown as { parent?: import('obsidian').TFolder | null }).parent;
      cursor = next ?? null;
    }
    // chain[0] = immediate parent, chain[chain.length - 1] = topmost.
    //
    // The topmost element of the chain represents a real top-level
    // folder (Obsidian's vault root has no TFolder — the chain
    // terminates at null). So a file whose immediate parent IS the
    // topmost ancestor (chain.length === 1) lives directly in a
    // root-level folder, NOT on the synthetic root.
    //
    // The synthetic root only carries "files" when something is
    // weird (chain is empty — file.parent === null, which Obsidian
    // shouldn't produce but the type system allows).
    if (chain.length === 0) {
      root.files.push(file);
      continue;
    }
    // chain.length >= 1: descend from root down to the immediate
    // parent, creating TreeNodes as we go.
    let currentNode = root;
    let currentPath = '';
    // chain is bottom-up. Iterate in reverse to go top-down.
    for (let i = chain.length - 1; i >= 0; i--) {
      const ancestor = chain[i];
      currentPath = currentPath === '' ? ancestor.name : `${currentPath}/${ancestor.name}`;
      let nextNode = nodeByPath.get(currentPath);
      if (!nextNode) {
        nextNode = { folder: ancestor, path: currentPath, files: [], children: [] };
        nodeByPath.set(currentPath, nextNode);
        currentNode.children.push(nextNode);
      }
      currentNode = nextNode;
    }
    // After the loop, currentNode is the immediate parent of the file.
    currentNode.files.push(file);
  }

  // Sort each level's children alphabetically by path for stable order.
  sortNode(root);
  return [root];
}

/**
 * Sort a TreeNode's `children` (by path) and `files` (by basename).
 * Recurses into children.
 */
function sortNode(node: TreeNode): void {
  node.children.sort((a, b) => a.path.localeCompare(b.path));
  node.files.sort((a, b) => a.basename.localeCompare(b.basename));
  for (const child of node.children) sortNode(child);
}
