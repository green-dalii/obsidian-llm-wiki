// An Obsidian `App` backed by a real vault directory on disk.
//
// The plugin's ingest path reaches the vault through `app.vault`,
// `app.metadataCache` and `app.fileManager`. Each of those is implemented
// here against Node's fs, with the same in-memory file index Obsidian keeps
// (that index is what makes `getAbstractFileByPath` synchronous).
//
// In dry-run mode every mutation lands in `pendingContent` instead of on
// disk. Reads consult it first, so the engine sees the pages it just
// "wrote" exactly as it would in a real run.

import { readFileSync, readdirSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { TAbstractFile, TFile, TFolder, normalizePath } from 'obsidian';
import { parseFrontmatter } from '../../../src/core/frontmatter';

export type VaultWriteAction = 'create' | 'update' | 'delete' | 'mkdir';

export interface VaultWriteRecord {
  path: string;
  action: VaultWriteAction;
}

const CONFIG_DIR = '.obsidian';
const SKIPPED_DIR_NAMES = new Set([CONFIG_DIR, '.git', '.trash']);

function splitName(name: string): { basename: string; extension: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return { basename: name, extension: '' };
  return { basename: name.slice(0, dot), extension: name.slice(dot + 1) };
}

function parentPathOf(path: string): string {
  const sep = path.lastIndexOf('/');
  return sep === -1 ? '' : path.substring(0, sep);
}

export class NodeVault {
  readonly configDir = CONFIG_DIR;
  readonly writes: VaultWriteRecord[] = [];

  private readonly root: string;
  private readonly dryRun: boolean;
  private readonly files = new Map<string, TFile>();
  private readonly folders = new Map<string, TFolder>();
  private readonly pendingContent = new Map<string, string>();

  constructor(root: string, dryRun: boolean) {
    this.root = nodePath.resolve(root);
    this.dryRun = dryRun;
    this.registerFolder('');
    this.indexFolder('');
  }

  // ── path handling ────────────────────────────────────────────────

  /** Vault path → absolute path, refusing anything that escapes the vault. */
  private absolute(vaultPath: string): string {
    const normalized = normalizePath(vaultPath);
    const relative = normalized === '/' ? '' : normalized;
    const absolute = nodePath.resolve(this.root, relative);
    if (absolute !== this.root && !absolute.startsWith(this.root + nodePath.sep)) {
      throw new Error(`Path escapes the vault: ${vaultPath}`);
    }
    return absolute;
  }

  // ── index construction ───────────────────────────────────────────

  // Synchronous on purpose: the whole index must exist before the engine's
  // first (synchronous) getAbstractFileByPath call.
  private indexFolder(folderPath: string): void {
    const entries = readdirSync(this.absolute(folderPath || '/'), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (SKIPPED_DIR_NAMES.has(entry.name)) continue;
      const childPath = folderPath === '' ? entry.name : `${folderPath}/${entry.name}`;
      if (entry.isDirectory()) {
        this.registerFolder(childPath);
        this.indexFolder(childPath);
      } else if (entry.isFile()) {
        this.registerFile(childPath);
      }
    }
  }

  private registerFolder(path: string): TFolder {
    const existing = this.folders.get(path);
    if (existing) return existing;

    const folder = new TFolder();
    folder.path = path;
    folder.name = path === '' ? nodePath.basename(this.root) : path.substring(path.lastIndexOf('/') + 1);
    if (path !== '') {
      const parent = this.registerFolder(parentPathOf(path));
      folder.parent = parent;
      parent.children.push(folder);
    }
    this.folders.set(path, folder);
    return folder;
  }

  private registerFile(path: string): TFile {
    const file = new TFile();
    file.path = path;
    file.name = path.substring(path.lastIndexOf('/') + 1);
    const { basename, extension } = splitName(file.name);
    file.basename = basename;
    file.extension = extension;
    const parent = this.registerFolder(parentPathOf(path));
    file.parent = parent;
    parent.children.push(file);
    this.files.set(path, file);
    return file;
  }

  private unregisterFile(file: TFile): void {
    this.files.delete(file.path);
    const parent = file.parent;
    if (parent) {
      parent.children = parent.children.filter(child => child !== file);
    }
  }

  // ── reads ────────────────────────────────────────────────────────

  private readSync(path: string): string {
    const pending = this.pendingContent.get(path);
    if (pending !== undefined) return pending;
    return readFileSync(this.absolute(path), 'utf8');
  }

  async read(file: TFile): Promise<string> {
    return this.readSync(file.path);
  }

  async cachedRead(file: TFile): Promise<string> {
    return this.readSync(file.path);
  }

  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.files.get(path) ?? this.folders.get(path) ?? null;
  }

  getMarkdownFiles(): TFile[] {
    return [...this.files.values()].filter(file => file.extension === 'md');
  }

  getFiles(): TFile[] {
    return [...this.files.values()];
  }

  getRoot(): TFolder {
    const root = this.folders.get('');
    if (!root) throw new Error('Vault root folder is missing from the index');
    return root;
  }

  // ── writes ───────────────────────────────────────────────────────

  private async writeContent(path: string, content: string, action: VaultWriteAction): Promise<void> {
    if (this.dryRun) {
      this.pendingContent.set(path, content);
    } else {
      await fs.writeFile(this.absolute(path), content, 'utf8');
    }
    this.writes.push({ path, action });
  }

  async create(path: string, content: string): Promise<TFile> {
    const key = normalizePath(path);
    if (this.files.has(key)) throw new Error(`File already exists: ${key}`);
    const parent = parentPathOf(key);
    if (parent !== '' && !this.folders.has(parent)) {
      throw new Error(`Folder does not exist: ${parent}`);
    }
    await this.writeContent(key, content, 'create');
    return this.registerFile(key);
  }

  async modify(file: TFile, content: string): Promise<void> {
    await this.writeContent(file.path, content, 'update');
  }

  async process(file: TFile, transform: (data: string) => string): Promise<string> {
    const updated = transform(this.readSync(file.path));
    await this.writeContent(file.path, updated, 'update');
    return updated;
  }

  async createFolder(path: string): Promise<TFolder> {
    const key = normalizePath(path);
    if (this.folders.has(key)) throw new Error(`Folder already exists: ${key}`);
    if (!this.dryRun) {
      await fs.mkdir(this.absolute(key), { recursive: true });
    }
    this.writes.push({ path: key, action: 'mkdir' });
    return this.registerFolder(key);
  }

  async trash(file: TFile): Promise<void> {
    if (!this.dryRun) {
      const trashDir = nodePath.join(this.root, '.trash');
      await fs.mkdir(trashDir, { recursive: true });
      await fs.rename(this.absolute(file.path), nodePath.join(trashDir, file.name));
    }
    this.pendingContent.delete(file.path);
    this.unregisterFile(file);
    this.writes.push({ path: file.path, action: 'delete' });
  }

  // ── DataAdapter ──────────────────────────────────────────────────
  //
  // Obsidian's adapter is the raw filesystem view: it reaches paths the file
  // index does not cover, notably the plugin's own cache under `.obsidian/`.

  readonly adapter = {
    read: async (path: string): Promise<string> => {
      const pending = this.pendingContent.get(normalizePath(path));
      if (pending !== undefined) return pending;
      return fs.readFile(this.absolute(path), 'utf8');
    },
    readBinary: async (path: string): Promise<ArrayBuffer> => {
      const buffer = await fs.readFile(this.absolute(path));
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    },
    write: async (path: string, data: string): Promise<void> => {
      const key = normalizePath(path);
      if (this.dryRun) {
        this.pendingContent.set(key, data);
      } else {
        await fs.writeFile(this.absolute(key), data, 'utf8');
      }
      this.writes.push({ path: key, action: 'update' });
    },
    mkdir: async (path: string): Promise<void> => {
      if (this.dryRun) return;
      await fs.mkdir(this.absolute(path), { recursive: true });
    },
    exists: async (path: string): Promise<boolean> => {
      if (this.pendingContent.has(normalizePath(path))) return true;
      return fs.access(this.absolute(path)).then(() => true, () => false);
    },
    stat: async (path: string): Promise<{ type: 'file' | 'folder'; ctime: number; mtime: number; size: number } | null> => {
      try {
        const info = await fs.stat(this.absolute(path));
        return {
          type: info.isDirectory() ? 'folder' : 'file',
          ctime: info.birthtimeMs,
          mtime: info.mtimeMs,
          size: info.size,
        };
      } catch {
        return null;
      }
    },
    list: async (path: string): Promise<{ files: string[]; folders: string[] }> => {
      const base = normalizePath(path);
      const prefix = base === '/' ? '' : `${base}/`;
      const entries = await fs.readdir(this.absolute(path), { withFileTypes: true });
      const files: string[] = [];
      const folders: string[] = [];
      for (const entry of entries) {
        (entry.isDirectory() ? folders : files).push(`${prefix}${entry.name}`);
      }
      return { files, folders };
    },
    remove: async (path: string): Promise<void> => {
      if (this.dryRun) {
        this.pendingContent.delete(normalizePath(path));
        return;
      }
      await fs.unlink(this.absolute(path));
    },
  };

  /** Vault change events; the CLI runs one ingest and then exits. */
  on(): { unload: () => void } {
    return { unload: () => { /* nothing registered */ } };
  }

  /** Frontmatter for `metadataCache.getFileCache`. Sync, like Obsidian's cache. */
  frontmatterOf(file: TFile): Record<string, unknown> | null {
    let content: string;
    try {
      content = this.readSync(file.path);
    } catch {
      return null;
    }
    return parseFrontmatter(content);
  }
}

export interface VaultApp {
  vault: NodeVault;
  metadataCache: { getFileCache: (file: TFile) => { frontmatter: Record<string, unknown> } | null; on: () => { unload: () => void } };
  fileManager: { trashFile: (file: TFile) => Promise<void> };
}

export function createVaultApp(root: string, dryRun: boolean): VaultApp {
  const vault = new NodeVault(root, dryRun);
  return {
    vault,
    metadataCache: {
      getFileCache: (file: TFile) => {
        const frontmatter = vault.frontmatterOf(file);
        return frontmatter ? { frontmatter } : null;
      },
      on: () => ({ unload: () => { /* nothing registered */ } }),
    },
    fileManager: {
      trashFile: (file: TFile) => vault.trash(file),
    },
  };
}
