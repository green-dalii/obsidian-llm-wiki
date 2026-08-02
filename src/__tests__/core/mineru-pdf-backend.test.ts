import { describe, expect, it, vi } from 'vitest';
import type { DataAdapter } from 'obsidian';
import type { LLMClient } from '../../types';
import {
  createMineruArtifactAdapter,
  createMineruPdfBackend,
  MineruConfigurationError,
  type MineruPdfBackendDependencies,
} from '../../core/pdf-backends/mineru-pdf-backend';
import { buildMineruCacheKey } from '../../core/pdf-cache';
import { MineruCancelledError } from '../../core/pdf-backends/mineru-client';
import { MineruStageError } from '../../core/pdf-backends/mineru-client';
import { MineruArtifactConflictError } from '../../core/pdf-backends/mineru-artifacts';
import { EncryptedPdfError } from '../../core/pdf-converter';
import type {
  ArtifactInspection,
  MineruArtifactPublishInput,
  PdfBackendContext,
  PdfBackendProgress,
  PdfConversionResult,
} from '../../core/pdf-backends/types';

// eslint-disable-next-line obsidianmd/no-global-this
const subtle = (globalThis as { crypto: { subtle: SubtleCrypto } }).crypto.subtle;
const SOURCE_PATH = 'sources/paper.pdf';
const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\nplain');
const SOURCE_HASH = '255044462d312e370a706c61696e0000000000000000000000000000000000fa';
type ValidArtifactInspection = Extract<ArtifactInspection, { kind: 'valid' }>;

function makeIdentityAdapter(options: {
  entries: string[];
  caseInsensitive: boolean;
  fullPathRoot?: string;
}) {
  const entries = new Set(options.entries);
  const resolve = (path: string): string | undefined => {
    if (entries.has(path)) return path;
    if (!options.caseInsensitive) return undefined;
    const folded = path.toLowerCase();
    return [...entries].find((entry) => entry.toLowerCase() === folded);
  };
  const exists = vi.fn(async (path: string, sensitive?: boolean) =>
    sensitive ? entries.has(path) : resolve(path) !== undefined);
  const list = vi.fn(async (parent: string) => {
      const actualParent = parent === '' ? '' : resolve(parent);
      if (parent !== '' && actualParent === undefined) throw new Error(`ENOENT: ${parent}`);
      const prefix = actualParent ? `${actualParent}/` : '';
      const children = [...entries].filter((entry) => {
        if (!entry.startsWith(prefix) || entry === actualParent) return false;
        return !entry.slice(prefix.length).includes('/');
      });
      return { files: [], folders: children };
    });
  const adapter = {
    exists,
    list,
    ...(options.fullPathRoot
      ? { getFullPath: (path: string) => `${options.fullPathRoot}/${path}` }
      : {}),
  } as unknown as DataAdapter;
  return { adapter, exists, list };
}

function pendingUntilAbort(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    signal?.addEventListener(
      'abort',
      () => reject(new DOMException('Aborted', 'AbortError')),
      { once: true },
    );
  });
}

const cachedEntry = (markdown = '# Cached'): PdfConversionResult => ({
  markdown,
  metadata: {
    convertedAt: '2026-07-21T12:00:00.000Z',
    converter: 'mineru/vlm',
  },
});

const validArtifact = (
  overrides: Partial<ValidArtifactInspection> = {},
): ValidArtifactInspection => ({
  kind: 'valid',
  markdown: '# Artifact',
  manifest: {
    schemaVersion: 2,
    sourcePath: SOURCE_PATH,
    sourceSha256: SOURCE_HASH,
    backend: 'mineru',
    modelVersion: 'vlm',
    converterVersion: 'mineru-v1',
    convertedAt: '2026-07-21T12:00:00.000Z',
    taskId: 'task-old',
    markdownPath: 'document.md',
    markdownSha256: 'a'.repeat(64),
    images: [],
  },
  ...overrides,
});

interface HarnessOptions {
  mobile?: boolean;
  token?: string;
  secretToken?: string;
  bytes?: Uint8Array;
  inspection?: ArtifactInspection;
  cacheHit?: PdfConversionResult | null;
  fileSize?: number;
}

function createHarness(options: HarnessOptions = {}) {
  const operations: string[] = [];
  const cacheGet = vi.fn(async (_key: string): Promise<PdfConversionResult | null> => {
    operations.push('cache:get');
    return options.cacheHit ?? null;
  });
  const cacheSet = vi.fn(async (_key: string, _entry: PdfConversionResult) => {
    operations.push('cache:set');
  });
  const inspect = vi.fn(async (_sourcePath: string): Promise<ArtifactInspection> => {
    operations.push('artifact:inspect');
    return options.inspection ?? { kind: 'missing' };
  });
  const publish = vi.fn(async (
    _input: MineruArtifactPublishInput,
    _signal?: AbortSignal,
  ) => {
    operations.push('artifact:publish');
  });
  const requestUpload = vi.fn(async (_pdfName: string, _signal?: AbortSignal) => {
    operations.push('client:request');
    return { taskId: 'task-1', traceId: 'trace-1', uploadUrl: 'https://upload.invalid/signed' };
  });
  const uploadPdf = vi.fn(async (
    _lease: { taskId: string; traceId?: string; uploadUrl: string },
    _bytes: Uint8Array,
    _signal?: AbortSignal,
  ) => {
    operations.push('client:upload');
  });
  const waitForResult = vi.fn(async (
    _taskId: string,
    _signal?: AbortSignal,
    onProgress?: (progress: PdfBackendProgress) => void,
  ) => {
    operations.push('client:wait');
    onProgress?.({ stage: 'waiting' });
    onProgress?.({ stage: 'parsing', completedPages: 1, totalPages: 2 });
    onProgress?.({ stage: 'converting' });
    return { taskId: 'task-1', traceId: 'trace-1', zipUrl: 'https://download.invalid/signed' };
  });
  const downloadResult = vi.fn(async (_zipUrl: string, _signal?: AbortSignal) => {
    operations.push('client:download');
    return new Uint8Array([1, 2, 3]);
  });
  const extractArchive = vi.fn(() => {
    operations.push('archive:extract');
    return {
      markdown: '# MinerU',
      markdownBytes: new TextEncoder().encode('# MinerU'),
      images: [{ path: 'images/figure.png', bytes: new Uint8Array([4, 5]) }],
    };
  });
  const readBinary = vi.fn(async (_path: string) => {
    operations.push('pdf:read');
    return (options.bytes ?? PDF_BYTES).buffer.slice(0);
  });
  const progress: PdfBackendProgress[] = [];
  const nativeConvert = vi.fn(async () => cachedEntry('# Native fallback'));

  const createClient = vi.fn((_options: { apiToken: string; timeoutMs: number }) => ({
    requestUpload,
    uploadPdf,
    waitForResult,
    downloadResult,
  }));
  const deps: MineruPdfBackendDependencies = {
    isMobile: () => options.mobile ?? false,
    createCache: () => ({ get: cacheGet, set: cacheSet }),
    createArtifactStore: () => ({ inspect, publish }),
    createClient,
    extractArchive,
    now: () => new Date('2026-07-22T01:02:03.000Z'),
  };
  const ctx: PdfBackendContext = {
    app: {
      secretStorage: {
        getSecret: (id: string) => id === 'karpathywiki-mineru-mineru-api-token'
          ? (options.secretToken ?? null)
          : null,
        setSecret: vi.fn(),
      },
      vault: {
        configDir: '.obsidian', // eslint-disable-line obsidianmd/hardcoded-config-path
        adapter: { readBinary },
      },
    } as never,
    settings: {
      provider: 'anthropic',
      apiKey: 'llm-key',
      model: 'claude-opus-4-8',
      pdfConversionBackend: 'mineru',
      mineruApiToken: options.token ?? 'mineru-token',
      mineruApiTokenSecretId: 'karpathywiki-mineru-mineru-api-token',
      mineruTaskTimeoutMinutes: 30,
    },
    pdfFile: {
      path: SOURCE_PATH,
      name: 'paper.pdf',
      extension: 'pdf',
      stat: { size: options.fileSize ?? (options.bytes ?? PDF_BYTES).length },
    } as never,
    llmClient: { createMessage: nativeConvert } as unknown as LLMClient,
    resolveModelForTask: vi.fn(() => 'claude-opus-4-8'),
    subtle,
    onProgress: (event) => progress.push(event),
  };

  return {
    backend: createMineruPdfBackend(deps),
    ctx,
    operations,
    progress,
    mocks: {
      cacheGet,
      cacheSet,
      inspect,
      publish,
      requestUpload,
      uploadPdf,
      waitForResult,
      downloadResult,
      extractArchive,
      readBinary,
      nativeConvert,
      createClient,
    },
  };
}

describe('MinerU PDF backend preconditions and identity', () => {
  it('prefers the MinerU token stored in SecretStorage', async () => {
    const h = createHarness({ token: '', secretToken: 'stored-mineru-token' });

    await h.backend.convert(h.ctx);

    expect(h.mocks.createClient).toHaveBeenCalledWith({
      apiToken: 'stored-mineru-token',
      timeoutMs: 30 * 60_000,
    });
  });
  it('rejects mobile before reading the PDF or contacting MinerU', async () => {
    const h = createHarness({ mobile: true });

    await expect(h.backend.convert(h.ctx)).rejects.toMatchObject({
      name: 'MineruConfigurationError',
      reason: 'desktop-only',
    });
    expect(h.mocks.readBinary).not.toHaveBeenCalled();
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('rejects a missing Token before reading or network (%j)', async (token) => {
    const h = createHarness({ token });

    await expect(h.backend.convert(h.ctx)).rejects.toBeInstanceOf(MineruConfigurationError);
    expect(h.mocks.readBinary).not.toHaveBeenCalled();
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
  });

  it('rejects PDFs above the official input limit before reading or network', async () => {
    const h = createHarness({ fileSize: 200 * 1024 * 1024 + 1 });

    await expect(h.backend.convert(h.ctx)).rejects.toBeInstanceOf(MineruStageError);
    expect(h.mocks.readBinary).not.toHaveBeenCalled();
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
  });

  it('preserves encrypted-PDF rejection before cache or network work', async () => {
    const h = createHarness({ bytes: new TextEncoder().encode('%PDF-1.7\n/Encrypt 1 0 R') });

    await expect(h.backend.convert(h.ctx)).rejects.toBeInstanceOf(EncryptedPdfError);
    expect(h.mocks.cacheGet).not.toHaveBeenCalled();
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
  });

  it('uses only source hash and fixed MinerU conversion identity in the logical key', () => {
    expect(buildMineruCacheKey('abc')).toBe(
      'abc:mineru:vlm:mineru-v1:formula=true:table=true'
    );
  });

  it('keeps provider and LLM model out of the physical MinerU cache identity', async () => {
    const first = createHarness({ inspection: validArtifact() });
    const second = createHarness({ inspection: validArtifact() });
    second.ctx.settings.provider = 'ollama';
    second.ctx.settings.model = 'llama3';
    second.ctx.resolveModelForTask = vi.fn(() => 'different-model');

    await first.backend.convert(first.ctx);
    await second.backend.convert(second.ctx);

    expect(first.mocks.cacheGet.mock.calls[0]?.[0]).toBe(second.mocks.cacheGet.mock.calls[0]?.[0]);
    expect(first.ctx.resolveModelForTask).not.toHaveBeenCalled();
    expect(second.ctx.resolveModelForTask).not.toHaveBeenCalled();
  });
});

describe('MinerU PDF backend recovery matrix', () => {
  it('returns a cache hit for a valid current artifact without network or writes', async () => {
    const hit = cachedEntry();
    const h = createHarness({ inspection: validArtifact(), cacheHit: hit });

    await expect(h.backend.convert(h.ctx)).resolves.toBe(hit);
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('rebuilds a missing cache from a valid current artifact without network', async () => {
    const h = createHarness({ inspection: validArtifact(), cacheHit: null });

    const result = await h.backend.convert(h.ctx);

    expect(result.markdown).toBe('# Artifact');
    expect(result.metadata.convertedAt).toBe('2026-07-21T12:00:00.000Z');
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
    expect(h.mocks.cacheSet).toHaveBeenCalledOnce();
  });

  const reparsingCases = [
    ['missing with cache hit', { kind: 'missing' }, cachedEntry('# Stale cache')],
    ['stale source hash with cache hit', validArtifact({ manifest: { ...validArtifact().manifest, sourceSha256: 'b'.repeat(64) } }), cachedEntry('# Stale cache')],
  ] satisfies Array<[string, ArtifactInspection, PdfConversionResult | null]>;

  it.each(reparsingCases)('reruns MinerU and replaces cache state when artifacts are %s', async (
    _label,
    inspection,
    cacheHit,
  ) => {
    const h = createHarness({ inspection, cacheHit });

    const result = await h.backend.convert(h.ctx);

    expect(result.markdown).toBe('# MinerU');
    expect(h.mocks.requestUpload).toHaveBeenCalledOnce();
    expect(h.mocks.publish).toHaveBeenCalledOnce();
    expect(h.mocks.cacheSet).toHaveBeenCalledOnce();
  });

  it('runs MinerU, publishes, then caches when both artifact and cache are missing', async () => {
    const h = createHarness();

    await h.backend.convert(h.ctx);

    expect(h.operations.indexOf('artifact:publish')).toBeGreaterThan(h.operations.indexOf('archive:extract'));
    expect(h.operations.indexOf('cache:set')).toBeGreaterThan(h.operations.indexOf('artifact:publish'));
  });

  it('fails closed on an unowned artifact conflict before cache, network, or writes', async () => {
    const h = createHarness({ inspection: { kind: 'unowned-conflict' }, cacheHit: cachedEntry() });

    await expect(h.backend.convert(h.ctx)).rejects.toBeInstanceOf(MineruArtifactConflictError);
    expect(h.mocks.readBinary).not.toHaveBeenCalled();
    expect(h.mocks.cacheGet).not.toHaveBeenCalled();
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
  });

  it('fails closed on invalid managed artifacts before PDF IO, cache, network, or writes', async () => {
    const h = createHarness({
      inspection: { kind: 'managed-invalid', reason: 'hash mismatch' },
      cacheHit: cachedEntry(),
    });

    await expect(h.backend.convert(h.ctx)).rejects.toBeInstanceOf(MineruArtifactConflictError);
    expect(h.mocks.readBinary).not.toHaveBeenCalled();
    expect(h.mocks.cacheGet).not.toHaveBeenCalled();
    expect(h.mocks.createClient).not.toHaveBeenCalled();
    expect(h.mocks.requestUpload).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
  });
});

describe('MinerU PDF backend orchestration', () => {
  it('emits ordered stages, uploads the PDF once, and propagates one signal', async () => {
    const h = createHarness();
    const controller = new AbortController();
    h.ctx.abortSignal = controller.signal;

    await h.backend.convert(h.ctx);

    expect(h.progress).toEqual([
      { stage: 'preparing' },
      { stage: 'requesting-upload' },
      { stage: 'uploading' },
      { stage: 'waiting' },
      { stage: 'parsing', completedPages: 1, totalPages: 2 },
      { stage: 'converting' },
      { stage: 'downloading' },
      { stage: 'validating' },
      { stage: 'saving' },
    ]);
    expect(h.mocks.readBinary).toHaveBeenCalledOnce();
    expect(h.mocks.uploadPdf).toHaveBeenCalledOnce();
    expect(h.mocks.uploadPdf.mock.calls[0]?.[1]).toEqual(PDF_BYTES);
    expect(h.mocks.requestUpload.mock.calls[0]?.[1]).toBe(controller.signal);
    expect(h.mocks.uploadPdf.mock.calls[0]?.[2]).toBe(controller.signal);
    expect(h.mocks.waitForResult.mock.calls[0]?.[1]).toBe(controller.signal);
    expect(h.mocks.downloadResult.mock.calls[0]?.[1]).toBe(controller.signal);
    expect(h.mocks.publish.mock.calls[0]?.[1]).toBe(controller.signal);
  });

  it('deduplicates identical progress while preserving changed parsing pages', async () => {
    const h = createHarness();
    h.mocks.waitForResult.mockImplementationOnce(async (
      _taskId,
      _signal,
      onProgress,
    ) => {
      onProgress?.({ stage: 'waiting' });
      onProgress?.({ stage: 'waiting' });
      onProgress?.({ stage: 'parsing', completedPages: 1, totalPages: 3 });
      onProgress?.({ stage: 'parsing', completedPages: 1, totalPages: 3 });
      onProgress?.({ stage: 'parsing', completedPages: 2, totalPages: 3 });
      onProgress?.({ stage: 'parsing', completedPages: 2, totalPages: 4 });
      onProgress?.({ stage: 'converting' });
      onProgress?.({ stage: 'converting' });
      return { taskId: 'task-1', traceId: 'trace-1', zipUrl: 'https://download.invalid/signed' };
    });

    await h.backend.convert(h.ctx);

    expect(h.progress).toEqual([
      { stage: 'preparing' },
      { stage: 'requesting-upload' },
      { stage: 'uploading' },
      { stage: 'waiting' },
      { stage: 'parsing', completedPages: 1, totalPages: 3 },
      { stage: 'parsing', completedPages: 2, totalPages: 3 },
      { stage: 'parsing', completedPages: 2, totalPages: 4 },
      { stage: 'converting' },
      { stage: 'downloading' },
      { stage: 'validating' },
      { stage: 'saving' },
    ]);
  });

  it('cancels an in-flight upload through the propagated signal', async () => {
    const h = createHarness();
    const controller = new AbortController();
    h.ctx.abortSignal = controller.signal;
    h.mocks.uploadPdf.mockImplementationOnce((_lease, _bytes, signal) =>
      pendingUntilAbort(signal));
    const conversion = h.backend.convert(h.ctx);
    await vi.waitFor(() => expect(h.mocks.uploadPdf).toHaveBeenCalledOnce());

    controller.abort();

    await expect(conversion).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.mocks.waitForResult).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('cancels in-flight polling through the propagated signal', async () => {
    const h = createHarness();
    const controller = new AbortController();
    h.ctx.abortSignal = controller.signal;
    h.mocks.waitForResult.mockImplementationOnce((_taskId, signal) =>
      pendingUntilAbort(signal));
    const conversion = h.backend.convert(h.ctx);
    await vi.waitFor(() => expect(h.mocks.waitForResult).toHaveBeenCalledOnce());

    controller.abort();

    await expect(conversion).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.mocks.downloadResult).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('cancels an in-flight download through the propagated signal', async () => {
    const h = createHarness();
    const controller = new AbortController();
    h.ctx.abortSignal = controller.signal;
    h.mocks.downloadResult.mockImplementationOnce((_url, signal) =>
      pendingUntilAbort(signal));
    const conversion = h.backend.convert(h.ctx);
    await vi.waitFor(() => expect(h.mocks.downloadResult).toHaveBeenCalledOnce());

    controller.abort();

    await expect(conversion).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.mocks.extractArchive).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('stops at validation when download completion races with abort', async () => {
    const h = createHarness();
    const controller = new AbortController();
    h.ctx.abortSignal = controller.signal;
    h.mocks.downloadResult.mockImplementationOnce(async () => {
      controller.abort();
      return new Uint8Array([1, 2, 3]);
    });

    await expect(h.backend.convert(h.ctx)).rejects.toBeInstanceOf(MineruCancelledError);
    expect(h.mocks.extractArchive).not.toHaveBeenCalled();
    expect(h.mocks.publish).not.toHaveBeenCalled();
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('does not cache when publication is aborted through the passed signal', async () => {
    const h = createHarness();
    const controller = new AbortController();
    h.ctx.abortSignal = controller.signal;
    h.mocks.publish.mockImplementationOnce((_input, signal) => pendingUntilAbort(signal));
    const conversion = h.backend.convert(h.ctx);
    await vi.waitFor(() => expect(h.mocks.publish).toHaveBeenCalledOnce());

    controller.abort();

    await expect(conversion).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('does not write cache when publication fails', async () => {
    const h = createHarness();
    h.mocks.publish.mockRejectedValueOnce(new Error('disk full'));

    await expect(h.backend.convert(h.ctx)).rejects.toThrow('disk full');
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('leaves the previous artifact and cache untouched when the client is cancelled', async () => {
    const previous = validArtifact({
      manifest: { ...validArtifact().manifest, sourceSha256: 'b'.repeat(64) },
    });
    const h = createHarness({ inspection: previous, cacheHit: cachedEntry('# Previous') });
    h.mocks.requestUpload.mockRejectedValueOnce(new MineruCancelledError('request-upload'));

    await expect(h.backend.convert(h.ctx)).rejects.toBeInstanceOf(MineruCancelledError);
    expect(h.mocks.publish).not.toHaveBeenCalled();
    expect(h.mocks.cacheSet).not.toHaveBeenCalled();
  });

  it('never invokes native LLM conversion after a MinerU client failure', async () => {
    const h = createHarness();
    h.mocks.requestUpload.mockRejectedValueOnce(new Error('MinerU unavailable'));

    await expect(h.backend.convert(h.ctx)).rejects.toThrow('MinerU unavailable');
    expect(h.mocks.nativeConvert).not.toHaveBeenCalled();
  });
});

describe('createMineruArtifactAdapter path identity', () => {
  it('resolves nested case-only aliases to the actual stored casing', async () => {
    const { adapter, exists, list } = makeIdentityAdapter({
      entries: ['Papers', 'Papers/Nested', 'Papers/Nested/Original.mineru'],
      caseInsensitive: true,
      fullPathRoot: '/vault',
    });
    const artifacts = createMineruArtifactAdapter(adapter);

    const original = await artifacts.getPathIdentity('Papers/Nested/Original.mineru');
    const alias = await artifacts.getPathIdentity('papers/nested/original.mineru');

    expect(alias).toBe(original);
    expect(exists).toHaveBeenCalledWith('papers', true);
    expect(list).toHaveBeenCalledWith('');
    expect(list).toHaveBeenCalledWith('Papers');
  });

  it('keeps case-sensitive destinations that both exist as distinct identities', async () => {
    const { adapter } = makeIdentityAdapter({
      entries: ['papers', 'papers/Foo.mineru', 'papers/foo.mineru'],
      caseInsensitive: false,
      fullPathRoot: '/vault',
    });
    const artifacts = createMineruArtifactAdapter(adapter);

    await expect(artifacts.getPathIdentity('papers/Foo.mineru')).resolves.not.toBe(
      await artifacts.getPathIdentity('papers/foo.mineru')
    );
  });

  it('scopes identical fallback paths to their owning adapters', async () => {
    const firstAdapter = makeIdentityAdapter({
      entries: ['papers', 'papers/result.mineru'],
      caseInsensitive: true,
    }).adapter;
    const secondAdapter = makeIdentityAdapter({
      entries: ['papers', 'papers/result.mineru'],
      caseInsensitive: true,
    }).adapter;
    const first = createMineruArtifactAdapter(firstAdapter);
    const second = createMineruArtifactAdapter(secondAdapter);

    await expect(first.getPathIdentity('papers/result.mineru')).resolves.not.toBe(
      await second.getPathIdentity('papers/result.mineru')
    );
  });

  it('fails closed when stored casing cannot be listed for an alias', async () => {
    const { adapter, list } = makeIdentityAdapter({
      entries: ['Papers', 'Papers/Original.mineru'],
      caseInsensitive: true,
      fullPathRoot: '/vault',
    });
    list.mockRejectedValueOnce(new Error('permission denied'));
    const artifacts = createMineruArtifactAdapter(adapter);

    await expect(artifacts.getPathIdentity('papers/original.mineru'))
      .rejects.toThrow(/papers\/original\.mineru.*root.*permission denied/i);
  });

  it('does not manufacture an alias lock identity after a list failure', async () => {
    const { adapter, list } = makeIdentityAdapter({
      entries: ['Papers', 'Papers/Original.mineru'],
      caseInsensitive: true,
      fullPathRoot: '/vault',
    });
    const artifacts = createMineruArtifactAdapter(adapter);
    const exact = await artifacts.getPathIdentity('Papers/Original.mineru');
    list.mockRejectedValueOnce(new Error('directory unavailable'));

    await expect(artifacts.getPathIdentity('papers/original.mineru'))
      .rejects.toThrow('directory unavailable');
    expect(exact).toContain('Papers/Original.mineru');
  });

  it('normalizes and forwards production adapter operations', async () => {
    const readBinary = vi.fn(async () => new ArrayBuffer(0));
    const writeBinary = vi.fn(async () => undefined);
    const mkdir = vi.fn(async () => undefined);
    const rename = vi.fn(async () => undefined);
    const rmdir = vi.fn(async () => undefined);
    const adapter = {
      exists: vi.fn(async () => true),
      list: vi.fn(),
      readBinary,
      writeBinary,
      mkdir,
      rename,
      rmdir,
    } as unknown as DataAdapter;
    const artifacts = createMineruArtifactAdapter(adapter);

    await artifacts.readBinary('papers/file.bin');
    await artifacts.writeBinary('papers/file.bin', new ArrayBuffer(1));
    await artifacts.mkdir('papers/output');
    await artifacts.rename('papers/old', 'papers/new');
    await artifacts.removeDirectory('papers/output');

    expect(readBinary).toHaveBeenCalledWith('papers/file.bin');
    expect(writeBinary).toHaveBeenCalledWith('papers/file.bin', expect.any(ArrayBuffer));
    expect(mkdir).toHaveBeenCalledWith('papers/output');
    expect(rename).toHaveBeenCalledWith('papers/old', 'papers/new');
    expect(rmdir).toHaveBeenCalledWith('papers/output', true);
  });
});
