// Focused in-memory harness for WikiEngine.ingestSource tests.
//
// WikiEngine wraps an Obsidian App directly (not just an EngineContext), so the
// EngineContext mock isn't enough. This provides a minimal App + stub
// SchemaManager + queued LLM client, and — crucially — collects every written
// path via the engine's onFileWrite callback (every wiki write funnels through
// createOrUpdateFile, which fires onFileWrite). That lets a test assert the real
// #164 symptom: "an empty file must create ZERO wiki pages."

import { App, TFile, TFolder } from 'obsidian'; // mocked in setup.ts
import { IngestReport, LLMClient, LLMWikiSettings } from '../../types';
import { SchemaManager } from '../../schema/schema-manager';
import { WikiEngine } from '../../wiki/wiki-engine';
import { parseFrontmatter } from '../../core/frontmatter';
import { DEFAULT_SETTINGS } from './engine-context';

export interface WikiEngineHarness {
  engine: WikiEngine;
  /** Every path written by the engine (via onFileWrite), in order. */
  writtenPaths: string[];
  /** Every IngestReport delivered to onDone, in order. */
  reports: IngestReport[];
  files: Map<string, string>;
  /** Mutable call stats. */
  stats: { llmCalls: number; vaultMarkdownScans: number; sourceTextReads: number; binaryReads: number; documentReads: number };
}

export interface HarnessOptions {
  files?: Record<string, string>;
  binaryFiles?: Record<string, ArrayBuffer>;
  documentText?: string;
  documentError?: Error;
  llmResponses?: string[];
  settings?: Partial<LLMWikiSettings>;
  /** Paths where getAbstractFileByPath returns null despite the file existing.
   *  Simulates macOS NFC/NFD normalization mismatch (Issue #173 Symptom A). */
  nfcNfdPaths?: string[];
}

function mkFile(path: string): TFile {
  const name = path.split('/').pop() || path;
  const dot = name.lastIndexOf('.');
  return Object.assign(new TFile(), {
    path,
    name,
    basename: dot > 0 ? name.slice(0, dot) : name,
    extension: dot > 0 ? name.slice(dot + 1) : 'md',
    stat: { mtime: 1 },
  });
}

export function createWikiEngineHarness(opts: HarnessOptions = {}): WikiEngineHarness {
  const files = new Map<string, string>(Object.entries(opts.files ?? {}));
  const binaryFiles = new Map<string, ArrayBuffer>(Object.entries(opts.binaryFiles ?? {}));
  const writtenPaths: string[] = [];
  const reports: IngestReport[] = [];
  const stats = { llmCalls: 0, vaultMarkdownScans: 0, sourceTextReads: 0, binaryReads: 0, documentReads: 0 };
  let llmIdx = 0;

  const app = {
    vault: {
      read: async (f: { path: string }) => {
        stats.sourceTextReads++;
        return files.get(f.path) ?? '';
      },
      readBinary: async (f: { path: string }) => {
        stats.binaryReads++;
        return binaryFiles.get(f.path) ?? new ArrayBuffer(0);
      },
      create: async (p: string, c: string) => { files.set(p, c); },
      process: async (f: { path: string }, fn: (d: string) => string) => {
        files.set(f.path, fn(files.get(f.path) ?? ''));
      },
      modify: async (f: { path: string }, c: string) => { files.set(f.path, c); },
      createFolder: async () => { /* no-op */ },
      getAbstractFileByPath: (p: string) => {
        if (opts.nfcNfdPaths?.includes(p)) return null;
        if (files.has(p)) return mkFile(p);
        // Return a TFolder stub for any intermediate directory path that has
        // children in the file map — needed by resolveFileInVault (Issue #173).
        const prefix = p.endsWith('/') ? p : p + '/';
        const children = [...files.keys()].filter(k => k.startsWith(prefix)).map(k =>
          files.has(k) ? mkFile(k) : null
        ).filter(Boolean) as TFile[];
        if (children.length > 0) {
          const folder = new TFolder();
          folder.path = p;
          folder.children = children;
          return folder;
        }
        return null;
      },
      getMarkdownFiles: () => { stats.vaultMarkdownScans++; return [...files.keys()].filter(p => p.endsWith('.md')).map(mkFile); },
      getFiles: () => [...files.keys()].map(mkFile),
    },
    metadataCache: {
      // Reflect stored frontmatter from the in-memory vault so content-hash
      // dedup (buildIngestedHashes) behaves like the real cached metadata.
      getFileCache: (f: { path: string }) => {
        const content = files.get(f.path);
        if (content == null) return null;
        const frontmatter = parseFrontmatter(content);
        return frontmatter ? { frontmatter } : null;
      },
    },
  } as unknown as App;

  const client: LLMClient = {
    createMessage: async () => {
      stats.llmCalls++;
      return opts.llmResponses?.[llmIdx++] ?? '{"entities":[],"concepts":[]}';
    },
    readDocument: async () => {
      stats.documentReads++;
      if (opts.documentError) throw opts.documentError;
      return opts.documentText ?? '';
    },
  };

  const schemaManager = {
    ensureSchemaExists: async () => { /* no-op */ },
    getSchemaContext: async () => '',
  } as unknown as SchemaManager;

  const engine = new WikiEngine(
    app,
    { ...DEFAULT_SETTINGS, ...opts.settings },
    () => client,
    schemaManager,
    (path: string) => { writtenPaths.push(path); }, // onFileWrite
    undefined, // onProgress
    (report: IngestReport) => { reports.push(report); }, // onDone
  );

  return { engine, writtenPaths, reports, files, stats };
}

/** True if any written path is a wiki entity/concept/source page (the #164 symptom). */
export function wikiPagesWritten(paths: string[]): string[] {
  return paths.filter(p => /(^|\/)wiki\/(entities|concepts|sources)\//.test(p));
}
