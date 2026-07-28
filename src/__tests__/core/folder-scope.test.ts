import { describe, it, expect } from 'vitest';
import { folderScopePrefix, isInFolderScope } from '../../core/folder-scope';

describe('folderScopePrefix', () => {
  it('anchors a folder path on a trailing slash', () => {
    expect(folderScopePrefix('Notizen', false)).toBe('Notizen/');
    expect(folderScopePrefix('a/b', false)).toBe('a/b/');
  });

  it('returns an empty prefix for the vault root', () => {
    expect(folderScopePrefix('/', true)).toBe('');
    expect(folderScopePrefix('', true)).toBe('');
  });

  it('does not double the separator on an already-trailing slash', () => {
    expect(folderScopePrefix('Notizen/', false)).toBe('Notizen/');
    expect(folderScopePrefix('Notizen//', false)).toBe('Notizen/');
  });

  it('treats an empty non-root path as unscoped rather than emitting a bare slash', () => {
    expect(folderScopePrefix('', false)).toBe('');
  });
});

describe('isInFolderScope', () => {
  it('matches true descendants at any depth', () => {
    expect(isInFolderScope('Notizen/a.md', 'Notizen', false)).toBe(true);
    expect(isInFolderScope('Notizen/sub/deep/a.md', 'Notizen', false)).toBe(true);
  });

  // Issue #364, the reported case.
  it('does not match a sibling folder sharing a name prefix', () => {
    expect(isInFolderScope('Notizen-temp/a.md', 'Notizen', false)).toBe(false);
    expect(isInFolderScope('Notizen2/a.md', 'Notizen', false)).toBe(false);
  });

  // Same root cause, second symptom: an unanchored prefix also swallows a
  // file that merely starts with the folder's name.
  it('does not match a file sitting beside the folder', () => {
    expect(isInFolderScope('Notizen.md', 'Notizen', false)).toBe(false);
  });

  it('does not match the folder itself', () => {
    expect(isInFolderScope('Notizen', 'Notizen', false)).toBe(false);
  });

  it('scopes nested folders without leaking into name-prefixed neighbours', () => {
    expect(isInFolderScope('a/b/x.md', 'a/b', false)).toBe(true);
    expect(isInFolderScope('a/bc/x.md', 'a/b', false)).toBe(false);
  });

  it('accepts every path at the vault root', () => {
    expect(isInFolderScope('a.md', '/', true)).toBe(true);
    expect(isInFolderScope('deep/nested/a.md', '/', true)).toBe(true);
  });

  it('is unaffected by the folder name appearing later in the path', () => {
    expect(isInFolderScope('Archiv/Notizen/a.md', 'Notizen', false)).toBe(false);
  });
});
