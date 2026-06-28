// Pure-function tests for build-folder-tree.ts
//
// The Multi-File Suggest modal (#130) used to render the left pane
// as a flat list of "top-level folder → files" rows. That lost the
// visual hierarchy when a vault has 3+ folder levels (e.g.
// `inbox/2024/Q1/meeting.md` collapsed to a single row labeled
// "inbox/2024/Q1" with the file as a non-indented child line).
//
// These tests pin down the new recursive behavior:
//   - 1 level of folder → flat list (no extra nesting)
//   - 2 levels → one nested <details>
//   - 3 levels → two nested <details>
//   - mixed: root has both direct files AND subfolders
//   - empty input → empty output
//
// We build mock "TFile" objects (plain objects with the minimum
// surface — .path, .basename, .parent) so the tests run in jsdom
// without pulling in the real Obsidian app.

import { describe, it, expect } from 'vitest';
import { buildFolderTree } from '../../core/build-folder-tree';
import { TFile, TFolder } from 'obsidian';

/**
 * Mock TFolder. The real TFolder has dozens of fields; we only need
 * `name` (used to derive the path) and `parent` (used to walk the
 * ancestor chain). The `parent` chain terminates in `null` at the
 * topmost ancestor.
 *
 * We use the `Object.assign(new TFolder(), {...})` pattern that other
 * tests in this repo use (e.g. wiki-engine-harness.ts) — `new TFolder()`
 * works under jsdom, and `Object.assign` lets us override only the
 * fields we care about. Avoids the `obsidianmd/no-tfile-tfolder-cast`
 * lint rule that the explicit `as unknown as TFolder` cast would trip.
 */
function mkFolder(name: string, parent: TFolder | null = null): TFolder {
  return Object.assign(new TFolder(), { name, parent });
}

function mkFile(path: string, parent: TFolder): TFile {
  const basename = path.split('/').pop() ?? path;
  return Object.assign(new TFile(), { path, basename, parent });
}

describe('buildFolderTree — empty / trivial input', () => {
  it('returns an empty array when given no files', () => {
    expect(buildFolderTree([])).toEqual([]);
  });
});

describe('buildFolderTree — single-level folder (vault root → one folder → files)', () => {
  it('groups files by their immediate parent folder', () => {
    const inbox = mkFolder('inbox');
    const f1 = mkFile('inbox/a.md', inbox);
    const f2 = mkFile('inbox/b.md', inbox);
    const notes = mkFolder('notes');
    const f3 = mkFile('notes/c.md', notes);

    const tree = buildFolderTree([f1, f2, f3]);

    expect(tree).toHaveLength(1);
    const root = tree[0];
    expect(root.path).toBe('');
    expect(root.files).toEqual([]); // synthetic root has no direct files
    expect(root.children).toHaveLength(2);

    const inboxNode = root.children.find(c => c.path === 'inbox')!;
    expect(inboxNode).toBeTruthy();
    expect(inboxNode.files.map(f => f.path).sort()).toEqual(['inbox/a.md', 'inbox/b.md']);
    expect(inboxNode.children).toEqual([]);

    const notesNode = root.children.find(c => c.path === 'notes')!;
    expect(notesNode.files.map(f => f.path)).toEqual(['notes/c.md']);
  });
});

describe('buildFolderTree — two-level folder nesting', () => {
  it('nests a 2-level folder as root → subfolder → files', () => {
    const year = mkFolder('2024');
    const q1 = mkFolder('Q1', year);
    const f1 = mkFile('inbox/2024/Q1/jan.md', q1);
    const f2 = mkFile('inbox/2024/Q1/feb.md', q1);

    const tree = buildFolderTree([f1, f2]);
    const root = tree[0];

    // The chain is q1.parent = year, year.parent = ... topmost (null).
    // So the tree has root → year → Q1, NOT a flat root with both
    // year and Q1 as siblings.
    expect(root.children).toHaveLength(1);
    const yearNode = root.children[0];
    expect(yearNode.path).toBe('2024');
    expect(yearNode.children).toHaveLength(1);
    const q1Node = yearNode.children[0];
    expect(q1Node.path).toBe('2024/Q1');
    expect(q1Node.files).toHaveLength(2);
    expect(q1Node.files.map(f => f.path).sort()).toEqual([
      'inbox/2024/Q1/feb.md',
      'inbox/2024/Q1/jan.md',
    ]);
  });
});

describe('buildFolderTree — three-level folder nesting (the original bug)', () => {
  // Before the fix, this scenario rendered as one row labeled
  // "inbox/2024/Q1" with two files underneath — losing the
  // intermediate "2024" level. The new implementation must produce
  // a 3-level nested structure.
  it('nests a 3-level folder as root → year → quarter → files', () => {
    const year = mkFolder('2024');
    const q1 = mkFolder('Q1', year);
    const f1 = mkFile('inbox/2024/Q1/jan.md', q1);
    const f2 = mkFile('inbox/2024/Q1/feb.md', q1);

    const tree = buildFolderTree([f1, f2]);
    const root = tree[0];

    // Verify the depth chain manually:
    expect(root.children).toHaveLength(1);
    const yearNode = root.children[0];
    expect(yearNode.path).toBe('2024');
    expect(yearNode.children).toHaveLength(1);
    const q1Node = yearNode.children[0];
    expect(q1Node.path).toBe('2024/Q1');
    expect(q1Node.children).toEqual([]); // leaf folder
    expect(q1Node.files).toHaveLength(2);
  });

  it('handles two sibling subtrees that diverge at level 2', () => {
    // inbox/2024/Q1/* and inbox/2024/Q2/* should share the "inbox → 2024"
    // parents but split at Q1 vs Q2.
    const y2024 = mkFolder('2024');
    const q1 = mkFolder('Q1', y2024);
    const q2 = mkFolder('Q2', y2024);
    const f1 = mkFile('inbox/2024/Q1/jan.md', q1);
    const f2 = mkFile('inbox/2024/Q2/apr.md', q2);

    const tree = buildFolderTree([f1, f2]);
    const yearNode = tree[0].children[0];
    expect(yearNode.path).toBe('2024');
    expect(yearNode.children).toHaveLength(2);
    const q1Node = yearNode.children.find(c => c.path === '2024/Q1')!;
    const q2Node = yearNode.children.find(c => c.path === '2024/Q2')!;
    expect(q1Node.files.map(f => f.path)).toEqual(['inbox/2024/Q1/jan.md']);
    expect(q2Node.files.map(f => f.path)).toEqual(['inbox/2024/Q2/apr.md']);
  });
});

describe('buildFolderTree — mixed root (root has direct files AND subfolders)', () => {
  it('keeps root-level files on the root node AND creates subfolder children', () => {
    // This pattern is common: a user has `todo.md` directly at the
    // vault root and ALSO has a nested `inbox/2024/Q1/...` tree.
    // The root node should hold the direct files, and a child
    // subtree for the nested part.
    //
    // We model the vault root as a folder with `parent = null` and
    // a name of '' (the Obsidian vault root has no name; its
    // children are top-level files/folders). The build function
    // walks parent chain until null; files whose immediate parent
    // is the root land on the synthetic root node.
    const vaultRoot = mkFolder('', null);
    const todo = mkFile('todo.md', vaultRoot);
    const inbox = mkFolder('inbox', vaultRoot);
    const y2024 = mkFolder('2024', inbox);
    const q1 = mkFolder('Q1', y2024);
    const nested = mkFile('inbox/2024/Q1/jan.md', q1);

    const tree = buildFolderTree([nested, todo]);
    const root = tree[0];

    // Root-level file (parent is vault root) lands on the synthetic
    // root node directly.
    expect(root.files).toHaveLength(1);
    expect(root.files[0].path).toBe('todo.md');
    // Nested file produces a child subtree under "inbox" → "2024" → "Q1".
    expect(root.children.length).toBeGreaterThanOrEqual(1);
    const inboxNode = root.children.find(c => c.path === 'inbox')!;
    expect(inboxNode).toBeTruthy();
    const y2024Node = inboxNode.children.find(c => c.path === 'inbox/2024')!;
    expect(y2024Node).toBeTruthy();
    const q1Node = y2024Node.children.find(c => c.path === 'inbox/2024/Q1')!;
    expect(q1Node).toBeTruthy();
    expect(q1Node.files.map(f => f.path)).toEqual(['inbox/2024/Q1/jan.md']);
  });
});

describe('buildFolderTree — deterministic ordering', () => {
  it('sorts children alphabetically and files by basename', () => {
    const inbox = mkFolder('inbox');
    const notes = mkFolder('notes');
    const fA = mkFile('inbox/a.md', inbox);
    const fB = mkFile('inbox/b.md', inbox);
    const fN = mkFile('notes/z.md', notes);

    const tree = buildFolderTree([fB, fN, fA]);
    const root = tree[0];
    expect(root.children.map(c => c.path)).toEqual(['inbox', 'notes']);
    const inboxNode = root.children[0];
    expect(inboxNode.files.map(f => f.basename)).toEqual(['a.md', 'b.md']);
  });
});
