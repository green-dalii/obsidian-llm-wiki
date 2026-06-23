import { describe, it, expect } from 'vitest';
import { applySchemaSuggestion } from '../../schema/apply-suggestion';
import { App, TFile } from 'obsidian'; // mocked in setup.ts

// v1.22.0 #97: business logic for "apply a Schema suggestion" — the
// orchestrator function behind the Modal's "Apply" button. It must:
//   1. Read the current config.md (or skip if it doesn't exist — first
//      install path)
//   2. Create a backup (config.md.bak.<iso>) and prune old ones
//   3. Write the new body (with frontmatter preserved)
//   4. Invalidate the SchemaManager cache so the next loadSchema()
//      returns the new body
//   5. Return a small result struct so the UI can show a Notice
//
// Tests use a minimal vault mock — same pattern as the existing
// wiki-engine-harness.ts (which we don't reuse here because the
// schema-manager has different file semantics: frontmatter must be
// preserved exactly).

function mkFile(path: string): TFile {
  const name = path.split('/').pop() || path;
  const dot = name.lastIndexOf('.');
  return Object.assign(new TFile(), {
    path, name,
    basename: dot > 0 ? name.slice(0, dot) : name,
    extension: dot > 0 ? name.slice(dot + 1) : 'md',
  });
}

interface MockApp {
  vault: {
    files: Map<string, string>;
    read: (f: TFile) => Promise<string>;
    create: (p: string, c: string) => Promise<void>;
    process: (f: TFile, fn: (d: string) => string) => Promise<void>;
    modify: (f: TFile, c: string) => Promise<void>;
    createFolder: (p: string) => Promise<void>;
    delete: (f: TFile) => Promise<void>;
    getAbstractFileByPath: (p: string) => TFile | null;
    getFiles: () => TFile[];
    getMarkdownFiles: () => TFile[];
  };
  fileManager: {
    trashFile: (f: TFile) => Promise<void>;
  };
}

function mkMockVault(initial: Record<string, string>): MockApp {
  const files = new Map<string, string>(Object.entries(initial));
  return {
    vault: {
      files,
      read: async (f) => files.get(f.path) ?? '',
      create: async (p, c) => { files.set(p, c); },
      process: async (f, fn) => { files.set(f.path, fn(files.get(f.path) ?? '')); },
      modify: async (f, c) => { files.set(f.path, c); },
      createFolder: async () => { /* no-op */ },
      delete: async (f) => { files.delete(f.path); },
      getAbstractFileByPath: (p) => files.has(p) ? mkFile(p) : null,
      getFiles: () => [...files.keys()].map(mkFile),
      getMarkdownFiles: () => [...files.keys()].filter(k => k.endsWith('.md')).map(mkFile),
    },
    fileManager: {
      trashFile: async (f) => { files.delete(f.path); },
    },
  };
}

const CURRENT_BODY = '# Wiki Schema\n\n## Wiki Structure\n- Entity pages\n';
const CURRENT_FILE = `---
version: 1
updated: 2026-06-21
auto_suggestion_count: 0
---

${CURRENT_BODY}`;

const NEW_BODY = '# Wiki Schema\n\n## Wiki Structure\n- Entity pages (custom)\n';

describe('applySchemaSuggestion (#97)', () => {
  it('creates a backup file before writing the new body', async () => {
    const vault = mkMockVault({ 'wiki/schema/config.md': CURRENT_FILE });
    const result = await applySchemaSuggestion({
      app: vault as unknown as App,
      currentPath: 'wiki/schema/config.md',
      newBody: NEW_BODY,
      now: () => new Date('2026-06-22T10:30:00.000Z'),
    });

    // A .bak.<iso> file was created
    const bakFiles = [...vault.vault.files.keys()].filter(k => k.startsWith('wiki/schema/config.md.bak.'));
    expect(bakFiles).toHaveLength(1);
    expect(bakFiles[0]).toBe('wiki/schema/config.md.bak.2026-06-22T10-30-00.000Z');
    // The backup contains the *original* body (not the new one)
    expect(vault.vault.files.get(bakFiles[0] ?? '')).toBe(CURRENT_FILE);
    // result is success
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.backupPath).toBe(bakFiles[0] ?? '');
    }
  });

  it('writes the new body to the original path with frontmatter preserved', async () => {
    const vault = mkMockVault({ 'wiki/schema/config.md': CURRENT_FILE });
    await applySchemaSuggestion({
      app: vault as unknown as App,
      currentPath: 'wiki/schema/config.md',
      newBody: NEW_BODY,
      now: () => new Date('2026-06-22T10:30:00.000Z'),
    });

    const written = vault.vault.files.get('wiki/schema/config.md')!;
    // Frontmatter was preserved
    expect(written).toContain('version: 1');
    expect(written).toContain('updated:');
    // Body was replaced
    expect(written).toContain('Entity pages (custom)');
    expect(written).not.toContain('Entity pages\n\n##');
  });

  it('rotates old backups (keeps at most MAX_BACKUPS)', async () => {
    // Pre-populate 5 existing backups (over MAX_BACKUPS=3 by default)
    const vault = mkMockVault({
      'wiki/schema/config.md': CURRENT_FILE,
      'wiki/schema/config.md.bak.2026-01-01T00-00-00.000Z': 'old1',
      'wiki/schema/config.md.bak.2026-02-01T00-00-00.000Z': 'old2',
      'wiki/schema/config.md.bak.2026-03-01T00-00-00.000Z': 'old3',
      'wiki/schema/config.md.bak.2026-04-01T00-00-00.000Z': 'old4',
      'wiki/schema/config.md.bak.2026-05-01T00-00-00.000Z': 'old5',
    });
    await applySchemaSuggestion({
      app: vault as unknown as App,
      currentPath: 'wiki/schema/config.md',
      newBody: NEW_BODY,
      now: () => new Date('2026-06-22T10:30:00.000Z'),
    });
    const bakFiles = [...vault.vault.files.keys()].filter(k => k.startsWith('wiki/schema/config.md.bak.'));
    // We started with 5, added 1, then rotated to MAX_BACKUPS. So MAX_BACKUPS total.
    expect(bakFiles).toHaveLength(3);
    // The two oldest are gone
    expect(vault.vault.files.has('wiki/schema/config.md.bak.2026-01-01T00-00-00.000Z')).toBe(false);
    expect(vault.vault.files.has('wiki/schema/config.md.bak.2026-02-01T00-00-00.000Z')).toBe(false);
    // The newest ones are kept
    expect(vault.vault.files.has('wiki/schema/config.md.bak.2026-06-22T10-30-00.000Z')).toBe(true);
  });

  it('returns success=false and skips write when currentPath does not exist', async () => {
    // The first-ever install case: there is no config.md yet. The user
    // shouldn't be able to "apply" a suggestion when nothing to back up.
    // (The default schema is generated by ensureSchemaExists() — that's
    // a different path.)
    const vault = mkMockVault({});
    const result = await applySchemaSuggestion({
      app: vault as unknown as App,
      currentPath: 'wiki/schema/config.md',
      newBody: NEW_BODY,
      now: () => new Date('2026-06-22T10:30:00.000Z'),
    });
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.reason).toBe('source-missing');
    }
  });

  it('calls the onCacheInvalidate callback after a successful write', async () => {
    const vault = mkMockVault({ 'wiki/schema/config.md': CURRENT_FILE });
    let invalidated = 0;
    await applySchemaSuggestion({
      app: vault as unknown as App,
      currentPath: 'wiki/schema/config.md',
      newBody: NEW_BODY,
      now: () => new Date('2026-06-22T10:30:00.000Z'),
      onCacheInvalidate: () => { invalidated++; },
    });
    expect(invalidated).toBe(1);
  });
});
