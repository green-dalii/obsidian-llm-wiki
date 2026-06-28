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

describe('AutoMaintainManager.assessWelcomeNeed — sync tier decision (v1.23.0)', () => {
  // Helper to access the private method.
  type WelcomeAssessor = { assessWelcomeNeed(): { shouldCreate: boolean; tier: 'A-empty-vault' | 'B-existing-vault' | 'C-existing-wiki' } };

  function makeManagerForAssess(): { mgr: AutoMaintainManager; mockVault: { getMarkdownFiles: () => TFile[]; getAbstractFileByPath: (p: string) => unknown } } {
    const settings = {
      language: 'en',
      wikiFolder: 'wiki',
      wikiLanguage: 'zh',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
      createWelcomeNote: true,
      autoWatchMode: 'auto',
      autoWatchDebounceMs: 0,
      watchedFolders: ['inbox'],
    } as unknown as LLMWikiSettings;
    const wikiEngine = {} as unknown as WikiEngine;
    const mockVault: { getMarkdownFiles: () => TFile[]; getAbstractFileByPath: (p: string) => unknown } = {
      getMarkdownFiles: () => [],
      getAbstractFileByPath: () => null,
    };
    const app = { vault: mockVault } as unknown as ConstructorParameters<typeof AutoMaintainManager>[0];
    // Plugin object exposes llmClient so assessWelcomeNeed sees LLM as on.
    const plugin = { llmClient: { createMessage: vi.fn() } } as unknown as ConstructorParameters<typeof AutoMaintainManager>[3];
    return { mgr: new AutoMaintainManager(app, settings, wikiEngine, plugin), mockVault };
  }

  it('returns Tier A + shouldCreate=true when vault is empty and LLM is configured', () => {
    const { mgr } = makeManagerForAssess();
    const decision = (mgr as unknown as WelcomeAssessor).assessWelcomeNeed();
    expect(decision.tier).toBe('A-empty-vault');
    expect(decision.shouldCreate).toBe(true);
  });

  it('returns Tier A + shouldCreate=false when vault is empty and LLM is NOT configured', () => {
    const settings = {
      language: 'en', wikiFolder: 'wiki', wikiLanguage: 'zh',
      apiKey: 'sk-test', model: 'gpt-4o-mini', createWelcomeNote: true,
      autoWatchMode: 'auto', autoWatchDebounceMs: 0, watchedFolders: ['inbox'],
    } as unknown as LLMWikiSettings;
    const wikiEngine = {} as unknown as WikiEngine;
    const app = { vault: { getMarkdownFiles: () => [], getAbstractFileByPath: () => null } } as unknown as ConstructorParameters<typeof AutoMaintainManager>[0];
    const plugin = { llmClient: null } as unknown as ConstructorParameters<typeof AutoMaintainManager>[3];
    const mgr = new AutoMaintainManager(app, settings, wikiEngine, plugin);
    const decision = (mgr as unknown as WelcomeAssessor).assessWelcomeNeed();
    expect(decision.tier).toBe('A-empty-vault');
    expect(decision.shouldCreate).toBe(false);
  });

  it('returns Tier C + shouldCreate=false when wiki folder has existing pages', () => {
    const settings = {
      language: 'en', wikiFolder: 'wiki', wikiLanguage: 'zh',
      apiKey: 'sk-test', model: 'gpt-4o-mini', createWelcomeNote: true,
      autoWatchMode: 'auto', autoWatchDebounceMs: 0, watchedFolders: ['inbox'],
    } as unknown as LLMWikiSettings;
    const wikiEngine = {} as unknown as WikiEngine;
    // Vault contains a wiki page.
    const wikiPage = Object.assign(new TFile(), { path: 'wiki/entities/A.md', basename: 'A', extension: 'md', stat: { size: 100, mtime: 1 } });
    const app = {
      vault: {
        getMarkdownFiles: () => [wikiPage],
        getAbstractFileByPath: (p: string) => p === 'wiki/entities/A.md' ? wikiPage : null,
      },
    } as unknown as ConstructorParameters<typeof AutoMaintainManager>[0];
    const plugin = { llmClient: { createMessage: vi.fn() } } as unknown as ConstructorParameters<typeof AutoMaintainManager>[3];
    const mgr = new AutoMaintainManager(app, settings, wikiEngine, plugin);
    const decision = (mgr as unknown as WelcomeAssessor).assessWelcomeNeed();
    expect(decision.tier).toBe('C-existing-wiki');
    expect(decision.shouldCreate).toBe(false);
  });

  it('returns Tier B + shouldCreate=true when vault has notes but no wiki', () => {
    const settings = {
      language: 'en', wikiFolder: 'wiki', wikiLanguage: 'zh',
      apiKey: 'sk-test', model: 'gpt-4o-mini', createWelcomeNote: true,
      autoWatchMode: 'auto', autoWatchDebounceMs: 0, watchedFolders: ['inbox'],
    } as unknown as LLMWikiSettings;
    const wikiEngine = {} as unknown as WikiEngine;
    const looseNote = Object.assign(new TFile(), { path: 'notes/loose.md', basename: 'loose', extension: 'md', stat: { size: 100, mtime: 1 } });
    const app = {
      vault: {
        getMarkdownFiles: () => [looseNote],
        getAbstractFileByPath: () => null,
      },
    } as unknown as ConstructorParameters<typeof AutoMaintainManager>[0];
    const plugin = { llmClient: { createMessage: vi.fn() } } as unknown as ConstructorParameters<typeof AutoMaintainManager>[3];
    const mgr = new AutoMaintainManager(app, settings, wikiEngine, plugin);
    const decision = (mgr as unknown as WelcomeAssessor).assessWelcomeNeed();
    expect(decision.tier).toBe('B-existing-vault');
    expect(decision.shouldCreate).toBe(true);
  });

  it('is SYNCHRONOUS (no await needed) — returns the result directly', () => {
    // v1.23.0 followup: the assessWelcomeNeed call in runStartupCheck
    // uses no `await` (synchronous). If someone adds `await` it would
    // fail with `await of non-Promise` lint error. This test enforces
    // the sync shape — if you change it to async, this will compile
    // fine (returning a Promise in a sync wrapper is a no-op shape)
    // but the caller's lint rule will fail. So a real regression
    // guard belongs at the call site, but this test documents the
    // contract.
    const { mgr } = makeManagerForAssess();
    const result = (mgr as unknown as WelcomeAssessor).assessWelcomeNeed();
    // Direct value, not a Promise.
    expect(result).not.toHaveProperty('then');
  });
});
