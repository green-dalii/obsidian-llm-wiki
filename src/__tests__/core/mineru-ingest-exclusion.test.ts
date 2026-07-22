import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Notice, TFile, TFolder } from 'obsidian';
import { IngestQueue } from '../../core/ingest-queue';
import { MineruArtifactConflictError } from '../../core/pdf-backends/mineru-artifacts';
import { ingestCommands, type IngestHost } from '../../main-commands/ingest-commands';
import { AutoMaintainManager } from '../../schema/auto-maintain';
import { MultiFileSuggestModal } from '../../ui/modals';
import { createWikiEngineHarness } from '../__support__/wiki-engine-harness';
import type { LLMWikiSettings } from '../../types';
import type { WikiEngine } from '../../wiki/wiki-engine';

type VaultEvent = 'create' | 'modify' | 'rename' | 'delete';
type VaultHandler = (...args: unknown[]) => void;

function file(path: string): TFile {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  return Object.assign(new TFile(), {
    path,
    name,
    basename: dot > 0 ? name.slice(0, dot) : name,
    extension: dot > 0 ? name.slice(dot + 1) : '',
    stat: { mtime: 1, size: 10 },
  });
}

function folder(path: string, children: Array<TFile | TFolder>): TFolder {
  return Object.assign(new TFolder(), {
    path,
    name: path.split('/').pop() ?? path,
    children,
  });
}

function watcherHarness(
  moveForPdfRename = vi.fn<(oldPath: string, newPath: string) => Promise<void>>(async () => undefined),
  autoWatchSources = true,
) {
  const vaultHandlers = new Map<VaultEvent, VaultHandler>();
  let resolvedHandler: VaultHandler | undefined;
  const app = {
    workspace: { onLayoutReady: (callback: () => void) => callback() },
    vault: {
      on: (event: VaultEvent, callback: VaultHandler) => {
        vaultHandlers.set(event, callback);
        return {};
      },
    },
    metadataCache: {
      on: (_event: 'resolved', callback: VaultHandler) => {
        resolvedHandler = callback;
        return {};
      },
    },
  };
  const ingestSource = vi.fn(async () => undefined);
  const wikiEngine = {
    createBatchContext: () => ({ seen: new Set(), ingested: new Set() }),
    ingestSource,
  } as unknown as WikiEngine;
  const settings = {
    language: 'en',
    autoWatchSources,
    autoWatchMode: 'auto',
    autoWatchDebounceMs: 0,
    watchedFolders: ['inbox'],
  } as unknown as LLMWikiSettings;
  const plugin = { registerEvent: vi.fn() };
  const manager = new AutoMaintainManager(
    app as never,
    settings,
    wikiEngine,
    plugin as never,
    undefined,
    moveForPdfRename,
  );
  manager.startWatching();
  return { manager, settings, ingestSource, moveForPdfRename, plugin, vaultHandlers, resolvedHandler: () => resolvedHandler };
}

beforeEach(() => {
  (Notice as unknown as { instances: unknown[] }).instances.length = 0;
});

describe('managed MinerU artifact ingestion exclusion', () => {
  it('multi-file selection pairs callback ids with the exact jobs accepted by the queue', () => {
    const queue = new IngestQueue();
    const pending = file('inbox/pending.md');
    queue.enqueue([pending]);
    const onStart = vi.fn<(ids: string[], files: TFile[]) => void>();
    const modal = new MultiFileSuggestModal(
      {} as never,
      { language: 'en', wikiFolder: 'wiki' } as LLMWikiSettings,
      queue,
      onStart,
    );
    const checked = [
      file('inbox/paper.mineru/document.md'),
      file('inbox/a.md'),
      file('inbox/a.md'),
      pending,
      file('inbox/b.md'),
    ];
    const privateModal = modal as unknown as {
      collectCheckedFiles(): TFile[];
      enqueueCheckedFiles(): void;
    };
    privateModal.collectCheckedFiles = () => checked;

    privateModal.enqueueCheckedFiles();

    expect(onStart).toHaveBeenCalledOnce();
    const [ids, acceptedFiles] = onStart.mock.calls[0];
    expect(acceptedFiles.map(candidate => candidate.path)).toEqual([
      'inbox/a.md',
      'inbox/b.md',
    ]);
    expect(ids).toEqual(queue.getSnapshot().slice(-2).map(job => job.id));

    queue.start(ids[0]);
    queue.complete(ids[0], true);
    expect(queue.getSnapshot().slice(-2).map(job => [job.file.path, job.status])).toEqual([
      ['inbox/a.md', 'completed'],
      ['inbox/b.md', 'pending'],
    ]);
  });

  it('multi-file selection does not start a batch when every file is filtered', () => {
    const queue = new IngestQueue();
    const pending = file('inbox/pending.md');
    queue.enqueue([pending]);
    const onStart = vi.fn();
    const modal = new MultiFileSuggestModal(
      {} as never,
      { language: 'en', wikiFolder: 'wiki' } as LLMWikiSettings,
      queue,
      onStart,
    );
    const privateModal = modal as unknown as {
      collectCheckedFiles(): TFile[];
      enqueueCheckedFiles(): void;
    };
    privateModal.collectCheckedFiles = () => [
      file('inbox/paper.mineru/document.md'),
      pending,
      pending,
    ];

    privateModal.enqueueCheckedFiles();

    expect(onStart).not.toHaveBeenCalled();
  });

  it('drops create, modify, rename, and metadata-resolved events inside managed directories', async () => {
    const h = watcherHarness();
    const managed = file('inbox/paper.mineru/document.md');

    h.vaultHandlers.get('create')?.(managed);
    h.vaultHandlers.get('modify')?.(managed);
    h.vaultHandlers.get('rename')?.(managed, 'inbox/old.mineru/document.md');
    h.resolvedHandler()?.(managed);
    await Promise.resolve();

    const pending = (h.manager as unknown as { pendingFiles: Map<string, TFile> }).pendingFiles;
    expect(pending.size).toBe(0);
  });

  it('keeps exact-path filtering narrow for watcher events', async () => {
    const h = watcherHarness();
    const ordinary = file('inbox/paper.mineru-not/document.md');

    h.vaultHandlers.get('create')?.(ordinary);

    await vi.waitFor(() => expect(h.ingestSource).toHaveBeenCalledOnce());
    expect(h.ingestSource).toHaveBeenCalledWith(ordinary, expect.objectContaining({ trigger: 'auto' }));
  });

  it('keeps false-positive names eligible for watched ingestion', async () => {
    const h = watcherHarness();
    const ordinary = file('inbox/paper.mineru-not/document.md');
    (h.manager as unknown as { pendingFiles: Map<string, TFile> }).pendingFiles.set(ordinary.path, ordinary);

    await (h.manager as unknown as { processBatch(): Promise<void> }).processBatch();

    expect(h.ingestSource).toHaveBeenCalledOnce();
    expect(h.ingestSource).toHaveBeenCalledWith(ordinary, expect.objectContaining({ trigger: 'auto' }));
  });

  it('filters managed paths from direct queue insertion without disturbing aligned accepted files', () => {
    const queue = new IngestQueue();
    const accepted = file('inbox/paper.mineru-not/document.md');

    const ids = queue.enqueue([
      file('inbox/paper.mineru/document.md'),
      accepted,
      file('inbox/paper.mineru/images/figure.png'),
    ]);

    expect(ids).toHaveLength(1);
    expect(queue.getSnapshot().map(job => job.file.path)).toEqual([accepted.path]);
  });

  it('rejects a managed active file with one localized Notice before ingestion starts', () => {
    const ingestSource = vi.fn<(source: TFile) => Promise<void>>(async () => undefined);
    const host = {
      app: { workspace: { getActiveFile: () => file('inbox/paper.mineru/document.md') } },
      settings: { language: 'en' },
      llmClient: {},
      wikiEngine: { ingestSource },
      requireLLMReady: () => true,
      showProgressFor: vi.fn(),
      dismissProgress: vi.fn(),
    } as unknown as IngestHost;

    ingestCommands.ingestActiveFile.call(host);

    expect(ingestSource).not.toHaveBeenCalled();
    const notices = (Notice as unknown as { instances: Array<{ message: string }> }).instances;
    expect(notices.map(item => item.message)).toEqual([
      '"document.md" is inside a managed MinerU output folder and cannot be ingested directly. Select the original PDF instead.',
    ]);
  });

  it('quietly filters managed paths from manual multi-file ingestion', async () => {
    const ingestSource = vi.fn<(source: TFile) => Promise<void>>(async () => undefined);
    const queue = new IngestQueue();
    const accepted = file('inbox/notes.md');
    const host = {
      app: { vault: { getAbstractFileByPath: () => null } },
      settings: { language: 'en', wikiFolder: 'wiki', slugCase: 'kebab-case' },
      wikiEngine: {
        setDoneCallback: vi.fn(),
        createBatchContext: () => ({ seen: new Set(), ingested: new Set() }),
        ingestSource,
        wasCancelled: false,
      },
      ingestQueue: queue,
      preparePdfCacheForBatchIngest: vi.fn(async () => undefined),
      showProgressFor: vi.fn(),
      dismissProgress: vi.fn(),
      isAlreadyIngested: vi.fn(async () => false),
    } as unknown as IngestHost;

    await ingestCommands.runBatchIngest.call(host, [
      file('inbox/paper.mineru/document.md'),
      accepted,
    ], [], 'manual selection');

    expect(ingestSource).toHaveBeenCalledTimes(1);
    expect(ingestSource).toHaveBeenCalledWith(accepted, expect.any(Object));
    expect(queue.getSnapshot().map(job => job.file.path)).toEqual([accepted.path]);
  });

  it('runBatchIngest ignores a file whose pre-issued job id is empty', async () => {
    const queue = new IngestQueue();
    const first = file('inbox/first.md');
    const second = file('inbox/second.md');
    const jobs = queue.enqueueJobs([first, second]);
    const ingestSource = vi.fn<(source: TFile) => Promise<void>>(async () => undefined);
    const host = {
      app: { vault: { getAbstractFileByPath: () => null } },
      settings: { language: 'en', wikiFolder: 'wiki', slugCase: 'kebab-case' },
      wikiEngine: {
        setDoneCallback: vi.fn(),
        createBatchContext: () => ({ seen: new Set(), ingested: new Set() }),
        ingestSource,
        wasCancelled: false,
      },
      ingestQueue: queue,
      preparePdfCacheForBatchIngest: vi.fn(async () => undefined),
      showProgressFor: vi.fn(),
      dismissProgress: vi.fn(),
      isAlreadyIngested: vi.fn(async () => false),
    } as unknown as IngestHost;

    await ingestCommands.runBatchIngest.call(
      host,
      [first, second],
      [jobs[0].id, ''],
      'pre-issued jobs',
    );

    expect(ingestSource.mock.calls.map(call => call[0].path)).toEqual([first.path]);
    expect(queue.getSnapshot().map(job => [job.file.path, job.status])).toEqual([
      [first.path, 'completed'],
      [second.path, 'pending'],
    ]);
  });

  it('runBatchIngest rejects positionally misaligned pre-issued jobs', async () => {
    const queue = new IngestQueue();
    const first = file('inbox/first.md');
    const second = file('inbox/second.md');
    const jobs = queue.enqueueJobs([first, second]);
    const ingestSource = vi.fn<(source: TFile) => Promise<void>>(async () => undefined);
    const host = {
      app: { vault: { getAbstractFileByPath: () => null } },
      settings: { language: 'en', wikiFolder: 'wiki', slugCase: 'kebab-case' },
      wikiEngine: {
        setDoneCallback: vi.fn(),
        createBatchContext: () => ({ seen: new Set(), ingested: new Set() }),
        ingestSource,
        wasCancelled: false,
      },
      ingestQueue: queue,
      preparePdfCacheForBatchIngest: vi.fn(async () => undefined),
      showProgressFor: vi.fn(),
      dismissProgress: vi.fn(),
      isAlreadyIngested: vi.fn(async () => false),
    } as unknown as IngestHost;

    await ingestCommands.runBatchIngest.call(
      host,
      [second, first],
      jobs.map(job => job.id),
      'misaligned jobs',
    );

    expect(ingestSource).not.toHaveBeenCalled();
    expect(queue.getSnapshot().map(job => [job.file.path, job.status])).toEqual([
      [first.path, 'pending'],
      [second.path, 'pending'],
    ]);
  });

  it('runBatchIngest without pre-issued ids executes each duplicate path only once', async () => {
    const queue = new IngestQueue();
    const first = file('inbox/first.md');
    const second = file('inbox/second.md');
    const ingestSource = vi.fn<(source: TFile) => Promise<void>>(async () => undefined);
    const host = {
      app: { vault: { getAbstractFileByPath: () => null } },
      settings: { language: 'en', wikiFolder: 'wiki', slugCase: 'kebab-case' },
      wikiEngine: {
        setDoneCallback: vi.fn(),
        createBatchContext: () => ({ seen: new Set(), ingested: new Set() }),
        ingestSource,
        wasCancelled: false,
      },
      ingestQueue: queue,
      preparePdfCacheForBatchIngest: vi.fn(async () => undefined),
      showProgressFor: vi.fn(),
      dismissProgress: vi.fn(),
      isAlreadyIngested: vi.fn(async () => false),
    } as unknown as IngestHost;

    await ingestCommands.runBatchIngest.call(
      host,
      [first, first, second],
      [],
      'duplicate files',
    );

    expect(ingestSource.mock.calls.map(call => call[0].path)).toEqual([
      first.path,
      second.path,
    ]);
    expect(queue.getSnapshot().map(job => [job.file.path, job.status])).toEqual([
      [first.path, 'completed'],
      [second.path, 'completed'],
    ]);
  });

  it('runBatchIngest without pre-issued ids leaves an already-pending file unchanged', async () => {
    const queue = new IngestQueue();
    const pending = file('inbox/pending.md');
    const accepted = file('inbox/accepted.md');
    queue.enqueue([pending]);
    const ingestSource = vi.fn<(source: TFile) => Promise<void>>(async () => undefined);
    const host = {
      app: { vault: { getAbstractFileByPath: () => null } },
      settings: { language: 'en', wikiFolder: 'wiki', slugCase: 'kebab-case' },
      wikiEngine: {
        setDoneCallback: vi.fn(),
        createBatchContext: () => ({ seen: new Set(), ingested: new Set() }),
        ingestSource,
        wasCancelled: false,
      },
      ingestQueue: queue,
      preparePdfCacheForBatchIngest: vi.fn(async () => undefined),
      showProgressFor: vi.fn(),
      dismissProgress: vi.fn(),
      isAlreadyIngested: vi.fn(async () => false),
    } as unknown as IngestHost;

    await ingestCommands.runBatchIngest.call(
      host,
      [pending, accepted],
      [],
      'pending file',
    );

    expect(ingestSource.mock.calls.map(call => call[0].path)).toEqual([accepted.path]);
    expect(queue.getSnapshot().map(job => [job.file.path, job.status])).toEqual([
      [pending.path, 'pending'],
      [accepted.path, 'completed'],
    ]);
  });

  it('runBatchIngest without pre-issued ids stays idle when enqueueJobs filters everything', async () => {
    const queue = new IngestQueue();
    const pending = file('inbox/pending.md');
    queue.enqueue([pending]);
    const ingestSource = vi.fn<(source: TFile) => Promise<void>>(async () => undefined);
    const setDoneCallback = vi.fn();
    const showProgressFor = vi.fn();
    const host = {
      app: { vault: { getAbstractFileByPath: () => null } },
      settings: { language: 'en', wikiFolder: 'wiki', slugCase: 'kebab-case' },
      wikiEngine: {
        setDoneCallback,
        createBatchContext: () => ({ seen: new Set(), ingested: new Set() }),
        ingestSource,
        wasCancelled: false,
      },
      ingestQueue: queue,
      preparePdfCacheForBatchIngest: vi.fn(async () => undefined),
      showProgressFor,
      dismissProgress: vi.fn(),
      isAlreadyIngested: vi.fn(async () => false),
    } as unknown as IngestHost;

    await ingestCommands.runBatchIngest.call(
      host,
      [pending, pending, file('inbox/paper.mineru/document.md')],
      [],
      'all filtered',
    );

    expect(ingestSource).not.toHaveBeenCalled();
    expect(setDoneCallback).not.toHaveBeenCalled();
    expect(showProgressFor).not.toHaveBeenCalled();
    expect(queue.getSnapshot().map(job => [job.file.path, job.status])).toEqual([
      [pending.path, 'pending'],
    ]);
  });

  it('guards direct WikiEngine calls before reading or invoking the LLM', async () => {
    const h = createWikiEngineHarness({
      files: { 'inbox/paper.mineru/document.md': 'managed markdown' },
    });

    await h.engine.ingestSource(file('inbox/paper.mineru/document.md'));

    expect(h.stats.llmCalls).toBe(0);
    expect(h.reports.at(-1)?.rejectedFiles).toEqual([{
      path: 'inbox/paper.mineru/document.md',
      reason: 'managed-artifact',
    }]);
  });
});

describe('PDF rename artifact integration', () => {
  it('maps nested and multiple PDFs from a renamed folder without scanning the vault', async () => {
    const h = watcherHarness(undefined, false);
    const renamed = folder('archive', [
      file('archive/first.pdf'),
      file('archive/note.md'),
      folder('archive/nested', [
        file('archive/nested/second.PDF'),
        folder('archive/nested/deeper', [file('archive/nested/deeper/third.pdf')]),
      ]),
    ]);

    h.vaultHandlers.get('rename')?.(renamed, 'inbox');

    await vi.waitFor(() => expect(h.moveForPdfRename).toHaveBeenCalledTimes(3));
    expect(h.moveForPdfRename.mock.calls).toEqual([
      ['inbox/first.pdf', 'archive/first.pdf'],
      ['inbox/nested/second.PDF', 'archive/nested/second.PDF'],
      ['inbox/nested/deeper/third.pdf', 'archive/nested/deeper/third.pdf'],
    ]);
  });

  it('preserves relative paths for a case-only parent-folder rename', async () => {
    const h = watcherHarness(undefined, false);
    const renamed = folder('Papers', [
      folder('Papers/Nested', [file('Papers/Nested/report.pdf')]),
    ]);

    h.vaultHandlers.get('rename')?.(renamed, 'papers');

    await vi.waitFor(() => expect(h.moveForPdfRename).toHaveBeenCalledOnce());
    expect(h.moveForPdfRename).toHaveBeenCalledWith(
      'papers/Nested/report.pdf',
      'Papers/Nested/report.pdf',
    );
  });

  it('does nothing for a renamed folder without PDFs', async () => {
    const h = watcherHarness(undefined, false);

    h.vaultHandlers.get('rename')?.(
      folder('archive', [file('archive/note.md'), folder('archive/nested', [])]),
      'inbox',
    );
    await Promise.resolve();

    expect(h.moveForPdfRename).not.toHaveBeenCalled();
  });

  it('isolates folder child conflicts and errors so later PDFs still run', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const mover = vi.fn<(oldPath: string, newPath: string) => Promise<void>>()
      .mockRejectedValueOnce(new MineruArtifactConflictError('conflict'))
      .mockRejectedValueOnce(new Error('disk error'))
      .mockResolvedValueOnce(undefined);
    const h = watcherHarness(mover, false);

    h.vaultHandlers.get('rename')?.(folder('archive', [
      file('archive/first.pdf'),
      file('archive/second.pdf'),
      file('archive/third.pdf'),
    ]), 'inbox');

    await vi.waitFor(() => expect(mover).toHaveBeenCalledTimes(3));
    const notices = (Notice as unknown as { instances: Array<{ message: string }> }).instances;
    expect(notices).toHaveLength(1);
    expect(notices[0].message).toContain('first.pdf');
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('moves artifacts exactly once for a PDF rename even when auto-watch is disabled', async () => {
    const h = watcherHarness(undefined, false);

    h.vaultHandlers.get('rename')?.(file('archive/new.pdf'), 'inbox/old.pdf');
    await vi.waitFor(() => expect(h.moveForPdfRename).toHaveBeenCalledOnce());

    expect(h.moveForPdfRename).toHaveBeenCalledWith('inbox/old.pdf', 'archive/new.pdf');
  });

  it('registers lifecycle handling quietly while auto-watch is disabled', () => {
    watcherHarness(undefined, false);

    const notices = (Notice as unknown as { instances: Array<{ message: string }> }).instances;
    expect(notices).toEqual([]);
  });

  it('does not register duplicate vault lifecycle handlers after watcher restart', () => {
    const h = watcherHarness();
    h.manager.stopWatching();

    h.manager.startWatching();

    expect(h.plugin.registerEvent).toHaveBeenCalledTimes(4);
  });

  it('does not process an already-pending watcher batch after auto-watch is disabled', async () => {
    const h = watcherHarness();
    const pending = (h.manager as unknown as { pendingFiles: Map<string, TFile> }).pendingFiles;
    pending.set('inbox/note.md', file('inbox/note.md'));
    h.settings.autoWatchSources = false;

    await (h.manager as unknown as { processBatch(): Promise<void> }).processBatch();

    expect(h.ingestSource).not.toHaveBeenCalled();
  });

  it('does not move artifacts for non-PDF rename or deletion', async () => {
    const h = watcherHarness();

    h.vaultHandlers.get('rename')?.(file('inbox/new.md'), 'inbox/old.md');
    h.vaultHandlers.get('delete')?.(file('inbox/paper.pdf'));
    await Promise.resolve();

    expect(h.moveForPdfRename).not.toHaveBeenCalled();
    expect(h.vaultHandlers.has('delete')).toBe(false);
  });

  it('shows a localized Notice when the destination conflicts', async () => {
    const mover = vi.fn(async () => {
      throw new MineruArtifactConflictError('conflict');
    });
    const h = watcherHarness(mover);

    h.vaultHandlers.get('rename')?.(file('archive/new.pdf'), 'inbox/old.pdf');

    await vi.waitFor(() => {
      const notices = (Notice as unknown as { instances: Array<{ message: string }> }).instances;
      expect(notices.at(-1)?.message).toBe(
        '"new.pdf": The MinerU output folder contains files not created by this plugin. Move or rename that folder, then try again.',
      );
    });
  });
});
