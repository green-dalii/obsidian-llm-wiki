import { describe, it, expect, vi } from 'vitest';
import { TFile } from 'obsidian'; // mocked in setup.ts
import { AutoMaintainManager } from '../../schema/auto-maintain';
import type { WikiEngine } from '../../wiki/wiki-engine';
import type { LLMWikiSettings } from '../../types';

// Access the private members the watcher uses internally without widening the
// public surface — the test drives processBatch() with a pre-seeded batch.
type PrivateManager = {
  pendingFiles: Map<string, TFile>;
  processBatch: () => Promise<void>;
};

// Minimal shapes of the two engine methods processBatch() depends on.
type IngestOpts = { batchCtx: unknown };
type IngestFn = (file: TFile, opts?: IngestOpts) => Promise<void>;
type BatchCtxFn = () => unknown;

function watchedFile(path: string): TFile {
  return Object.assign(new TFile(), { path, basename: path.split('/').pop(), extension: 'md', stat: { mtime: 1 } });
}

function makeManager(ingestSource: IngestFn, createBatchContext: BatchCtxFn) {
  const settings = {
    language: 'en',
    autoWatchMode: 'auto',
    autoWatchDebounceMs: 0,
    watchedFolders: ['inbox'],
  } as unknown as LLMWikiSettings;

  const wikiEngine = { createBatchContext, ingestSource } as unknown as WikiEngine;
  const app = {} as unknown as ConstructorParameters<typeof AutoMaintainManager>[0];
  const plugin = {} as unknown as ConstructorParameters<typeof AutoMaintainManager>[3];

  return new AutoMaintainManager(app, settings, wikiEngine, plugin);
}

describe('AutoMaintainManager.processBatch — watcher batch context (#164 review)', () => {
  it('creates ONE shared batch context and passes it to every ingestSource call', async () => {
    // The bug: the watcher loop called ingestSource(file) with no batch context,
    // so within-batch dedup never ran and buildIngestedHashes re-walked the vault
    // once per file. The fix mirrors main.ts: one createBatchContext() per batch,
    // threaded through { batchCtx } to each ingest.
    const batchCtx = { seen: new Set<string>(), ingested: new Set<string>() };
    const createBatchContext = vi.fn<BatchCtxFn>(() => batchCtx);
    const ingestSource = vi.fn<IngestFn>(async () => undefined);

    const mgr = makeManager(ingestSource, createBatchContext);
    const priv = mgr as unknown as PrivateManager;
    priv.pendingFiles.set('inbox/a.md', watchedFile('inbox/a.md'));
    priv.pendingFiles.set('inbox/b.md', watchedFile('inbox/b.md'));

    await priv.processBatch();

    // Exactly one batch context for the whole run...
    expect(createBatchContext).toHaveBeenCalledTimes(1);
    // ...and the SAME context object reaches every ingest (shared dedup state).
    const calls = ingestSource.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toEqual({ batchCtx });
    expect(calls[1][1]).toEqual({ batchCtx });
    expect(calls[0][1]?.batchCtx).toBe(calls[1][1]?.batchCtx);
  });
});
