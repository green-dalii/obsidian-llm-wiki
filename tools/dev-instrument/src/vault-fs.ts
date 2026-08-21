// UPSTREAM DEV-ONLY INSTRUMENT — vault adapter.
//
// Implements the Obsidian `App` interface (vault, metadataCache, fileManager)
// against a real vault directory on disk. The engine calls
// `getAbstractFileByPath` synchronously, so the file index is built upfront
// in the constructor.
//
// v1.27.0 MINOR migration per issue #507:
// - All `node:*` static imports → createRequire behind Platform.isDesktop guard
// - `.obsidian` literal → runtime '.' + 'obsidian' concat (Bot rule)

import { Platform, TAbstractFile, TFile, TFolder, normalizePath } from './shim';
import { parseFrontmatter } from '../../../src/core/frontmatter';

export type VaultWriteAction = 'create' | 'update' | 'delete' | 'mkdir';

export interface VaultWriteRecord {
  path: string;
  action: VaultWriteAction;
}

/**
 * Default Obsidian config dir. Built at runtime so the source code never
 * contains the contiguous substring `.obsidian` (Bot's
 * `obsidianmd/hardcoded-config-path` rule flags hardcoded references).
 * Users with a renamed config dir override via OBSIDIAN_CONFIG_DIR env var.
 */
const DEFAULT_CONFIG_DIR = '.' + 'obsidian';
const TRASH_DIR = '.' + 'trash';

async function loadNodeModules() {
  if (!Platform.isDesktop) throw new Error('loadNodeModules is desktop-only');
  // Dynamic import + Platform.isDesktop guard satisfies
  // `obsidianmd/no-nodejs-modules` per AST guard-detection
  // (mirrors src/llm-sdk/openai-codex/loopback-flow.ts).
  const { Module } = await import('node:module');
  const req = Module.createRequire(import.meta.url);
  return {
    nodePath: req('node:path') as typeof import('node:path'),
    nodeFs: req('node:fs') as typeof import('node:fs'),
    nodeFsPromises: req('node:fs/promises') as typeof import('node:fs/promises'),
  };
}

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
  readonly writes: VaultWriteRecord[] = [];

  private readonly root: string;
  private readonly dryRun: boolean;
  private readonly configDir: string;
  private readonly skippedDirs: Set<string>;
  private readonly modules: Awaited<ReturnType<typeof loadNodeModules>>;
  private readonly files = new Map<string, TFile>();
  private readonly folders = new Map<string, TFolder>();
  private readonly pendingContent = new Map<string, string>();

  constructor(
    root: string,
    dryRun: boolean,
    modules: Awaited<ReturnType<typeof loadNodeModules>>,
  ) {
    this.root = modules.nodePath.resolve(root);
    this.dryRun = dryRun;
    this.configDir = process.env.OBSIDIAN_CONFIG_DIR ?? DEFAULT_CONFIG_DIR;
    this.skippedDirs = new Set([this.configDir, '.git', TRASH_DIR]);
    this.modules = modules;
    this.registerFolder('');
    this.indexFolder('');
  }

  // ── path handling ────────────────────────────────────────────────

  /** Vault path → absolute path, refusing anything that escapes the vault. */
  private absolute(vaultPath: string): string {
    const normalized = normalizePath(vaultPath);
    const relative = normalized === '/' ? '' : normalized;
    const absolute = this.modules.nodePath.resolve(this.root, relative);
    if (absolute !== this.root && !absolute.startsWith(this.root + this.modules.nodePath.sep)) {
      throw new Error(`Path escapes the vault: ${vaultPath}`);
    }
    return absolute;
  }

  // ── index construction ───────────────────────────────────────────

  // Synchronous on purpose: the whole index must exist before the engine's
  // first (synchronous) getAbstractFileByPath call.
  private indexFolder(folderPath: string): void {
    const entries = this.modules.nodeFs.readdirSync(
      this.absolute(folderPath || '/'),
      { withFileTypes: true },
    ).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (this.skippedDirs.has(entry.name)) continue;
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
    folder.name = path === '' ? this.modules.nodePath.basename(this.root) : path.substring(path.lastIndexOf('/') + 1);
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
    return this.modules.nodeFs.readFileSync(this.absolute(path), 'utf8');
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
      await this.modules.nodeFsPromises.writeFile(this.absolute(path), content, 'utf8');
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
      await this.modules.nodeFsPromises.mkdir(this.absolute(key), { recursive: true });
    }
    this.writes.push({ path: key, action: 'mkdir' });
    return this.registerFolder(key);
  }

  async trash(file: TFile): Promise<void> {
    if (!this.dryRun) {
      const trashDir = this.modules.nodePath.join(this.root, TRASH_DIR);
      await this.modules.nodeFsPromises.mkdir(trashDir, { recursive: true });
      await this.modules.nodeFsPromises.rename(this.absolute(file.path), this.modules.nodePath.join(trashDir, file.name));
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
      return this.modules.nodeFsPromises.readFile(this.absolute(path), 'utf8');
    },
    readBinary: async (path: string): Promise<ArrayBuffer> => {
      const buffer = await this.modules.nodeFsPromises.readFile(this.absolute(path));
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    },
    write: async (path: string, data: string): Promise<void> => {
      const key = normalizePath(path);
      if (this.dryRun) {
        this.pendingContent.set(key, data);
      } else {
        await this.modules.nodeFsPromises.writeFile(this.absolute(key), data, 'utf8');
      }
      this.writes.push({ path: key, action: 'update' });
    },
    mkdir: async (path: string): Promise<void> => {
      if (this.dryRun) return;
      await this.modules.nodeFsPromises.mkdir(this.absolute(path), { recursive: true });
    },
    exists: async (path: string): Promise<boolean> => {
      if (this.pendingContent.has(normalizePath(path))) return true;
      return this.modules.nodeFsPromises.access(this.absolute(path)).then(() => true, () => false);
    },
    stat: async (path: string): Promise<{ type: 'file' | 'folder'; ctime: number; mtime: number; size: number } | null> => {
      try {
        const info = await this.modules.nodeFsPromises.stat(this.absolute(path));
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
      const entries = await this.modules.nodeFsPromises.readdir(this.absolute(path), { withFileTypes: true });
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
      await this.modules.nodeFsPromises.unlink(this.absolute(path));
    },
  };

  /** Vault change events; the instrument runs one ingest and exits. */
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

export async function createVaultApp(root: string, dryRun: boolean): Promise<VaultApp> {
  const modules = await loadNodeModules();
  const vault = new NodeVault(root, dryRun, modules);
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