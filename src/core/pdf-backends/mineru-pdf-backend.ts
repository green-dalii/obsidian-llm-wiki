import { normalizePath, Platform, type App, type DataAdapter } from 'obsidian';
import {
  MINERU_TIMEOUT_DEFAULT_MINUTES,
  MINERU_TIMEOUT_MAX_MINUTES,
  MINERU_TIMEOUT_MIN_MINUTES,
  MINERU_MAX_PDF_BYTES,
} from '../../constants';
import { obsidianBinaryDownload, obsidianFetchBridge } from '../obsidian-fetch-bridge';
import { resolveProviderApiKey } from '../../llm-sdk/provider-api-key-resolver';
import { MINERU_CONVERSION_PROFILE } from './mineru-profile';
import {
  buildMineruCacheKey,
  createPdfCache,
  hashCacheKey,
  sha256Bytes,
  type PdfConversionCache,
} from '../pdf-cache';
import { isEncryptedPdfText } from '../pdf-metadata';
import { EncryptedPdfError } from './native-llm-pdf-backend';
import { extractMineruArchive, type MineruArchiveResult } from './mineru-archive';
import {
  isMineruArtifactConflict,
  MineruArtifactConflictError,
  MineruArtifactStore,
} from './mineru-artifacts';
import { MineruCancelledError, MineruClient, MineruStageError } from './mineru-client';
import type {
  ArtifactInspection,
  MineruArtifactAdapter,
  PdfBackendContext,
  PdfBackendProgress,
  PdfConversionBackend,
  PdfConversionResult,
} from './types';
import { MineruConfigurationError } from './types';

interface MineruClientFactoryOptions {
  apiToken: string;
  timeoutMs: number;
}

export interface MineruPdfBackendDependencies {
  isMobile: () => boolean;
  createCache: (ctx: PdfBackendContext) => Pick<PdfConversionCache, 'get' | 'set'>;
  createArtifactStore: (
    ctx: PdfBackendContext,
  ) => Pick<MineruArtifactStore, 'inspect' | 'publish'>;
  createClient: (options: MineruClientFactoryOptions) => Pick<
    MineruClient,
    'requestUpload' | 'uploadPdf' | 'waitForResult' | 'downloadResult'
  >;
  extractArchive: (bytes: Uint8Array) => MineruArchiveResult;
  now: () => Date;
}

export { MineruConfigurationError } from './types';

export function createMineruPdfBackend(
  deps: MineruPdfBackendDependencies,
): PdfConversionBackend {
  return {
    convert: (ctx) => convertPdfWithMineru(ctx, deps),
  };
}

async function convertPdfWithMineru(
  ctx: PdfBackendContext,
  deps: MineruPdfBackendDependencies,
): Promise<PdfConversionResult> {
  if (deps.isMobile()) throw new MineruConfigurationError('desktop-only');
  const apiToken = resolveProviderApiKey({
    apiKey: ctx.settings.mineruApiToken ?? '',
    providerApiKeySecretId: ctx.settings.mineruApiTokenSecretId ?? '',
  }, ctx.app.secretStorage);
  if (!apiToken) throw new MineruConfigurationError('missing-token');

  const emit = createProgressEmitter(ctx);
  if (ctx.abortSignal?.aborted) throw new MineruCancelledError('request-upload');
  emit({ stage: 'preparing' });
  if (ctx.pdfFile.stat.size > MINERU_MAX_PDF_BYTES) {
    throw new MineruStageError('upload', 'MinerU accepts PDF files up to 200 MB.');
  }

  const artifactStore = deps.createArtifactStore(ctx);
  const inspection = await artifactStore.inspect(ctx.pdfFile.path);
  if (isMineruArtifactConflict(inspection)) {
    throw new MineruArtifactConflictError(
      `Refusing to replace MinerU artifacts for ${ctx.pdfFile.path}: existing artifact ownership could not be verified.`
    );
  }

  const bytes = new Uint8Array(await ctx.app.vault.adapter.readBinary(ctx.pdfFile.path));
  const pdfText = new TextDecoder('latin1').decode(bytes);
  if (isEncryptedPdfText(pdfText)) throw new EncryptedPdfError();

  const sourceSha256 = await sha256Bytes(bytes, ctx.subtle);
  const cacheToken = await hashCacheKey(buildMineruCacheKey(sourceSha256), ctx.subtle);
  const cache = deps.createCache(ctx);
  const cached = await cache.get(cacheToken);
  const currentArtifact = inspection.kind === 'valid'
    && inspection.manifest.sourceSha256 === sourceSha256
    ? inspection
    : undefined;

  if (currentArtifact && cached) return cached;
  if (currentArtifact) {
    if (ctx.abortSignal?.aborted) throw new MineruCancelledError('request-upload');
    const rebuilt = entryFromArtifact(currentArtifact);
    await cache.set(cacheToken, rebuilt);
    return rebuilt;
  }

  const client = deps.createClient({
    apiToken,
    timeoutMs: normalizeTimeoutMinutes(ctx.settings.mineruTaskTimeoutMinutes) * 60_000,
  });

  if (ctx.abortSignal?.aborted) throw new MineruCancelledError('request-upload');
  emit({ stage: 'requesting-upload' });
  const lease = await client.requestUpload(ctx.pdfFile.name, ctx.abortSignal);

  emit({ stage: 'uploading' });
  await client.uploadPdf(lease, bytes, ctx.abortSignal);

  emit({ stage: 'waiting' });
  const task = await client.waitForResult(lease.taskId, ctx.abortSignal, emit);

  emit({ stage: 'downloading' });
  const archiveBytes = await client.downloadResult(task.zipUrl, ctx.abortSignal);

  if (ctx.abortSignal?.aborted) throw new MineruCancelledError('download');
  emit({ stage: 'validating' });
  const extracted = deps.extractArchive(archiveBytes);

  if (ctx.abortSignal?.aborted) throw new MineruCancelledError('download');
  emit({ stage: 'saving' });
  const convertedAt = deps.now().toISOString();
  await artifactStore.publish({
    sourcePath: ctx.pdfFile.path,
    sourceSha256,
    taskId: task.taskId,
    ...(task.traceId ? { traceId: task.traceId } : {}),
    convertedAt,
    markdown: extracted.markdown,
    images: extracted.images,
  }, ctx.abortSignal);

  const result: PdfConversionResult = {
    markdown: extracted.markdown,
    metadata: {
      convertedAt,
      converter: MINERU_CONVERSION_PROFILE.converter,
    },
  };
  await cache.set(cacheToken, result);
  return result;
}

function entryFromArtifact(
  inspection: Extract<ArtifactInspection, { kind: 'valid' }>,
): PdfConversionResult {
  return {
    markdown: inspection.markdown,
    metadata: {
      convertedAt: inspection.manifest.convertedAt,
      converter: MINERU_CONVERSION_PROFILE.converter,
    },
  };
}

function normalizeTimeoutMinutes(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return MINERU_TIMEOUT_DEFAULT_MINUTES;
  return Math.min(MINERU_TIMEOUT_MAX_MINUTES, Math.max(MINERU_TIMEOUT_MIN_MINUTES, value));
}

function createProgressEmitter(ctx: PdfBackendContext): (progress: PdfBackendProgress) => void {
  let previous: PdfBackendProgress | undefined;
  return (progress) => {
    if (previous?.stage === progress.stage) {
      if (progress.stage !== 'parsing' || previous.stage !== 'parsing') return;
      if (
        previous.completedPages === progress.completedPages
        && previous.totalPages === progress.totalPages
      ) return;
    }
    previous = progress;
    ctx.onProgress?.(progress);
  };
}

const adapterIdentities = new WeakMap<DataAdapter, number>();
let nextAdapterIdentity = 1;

export function createMineruArtifactAdapter(adapter: DataAdapter): MineruArtifactAdapter {
  let adapterIdentity = adapterIdentities.get(adapter);
  if (adapterIdentity === undefined) {
    adapterIdentity = nextAdapterIdentity;
    nextAdapterIdentity += 1;
    adapterIdentities.set(adapter, adapterIdentity);
  }
  const identity = adapterIdentity;
  const desktopAdapter = adapter as DataAdapter & { getFullPath?: (path: string) => string };
  return {
    getPathIdentity: async (path) => {
      const storedPath = await resolveStoredPathCasing(adapter, normalizePath(path));
      const physicalPath = typeof desktopAdapter.getFullPath === 'function'
        ? desktopAdapter.getFullPath(storedPath)
        : storedPath;
      return `${identity}:${physicalPath}`;
    },
    exists: (path) => adapter.exists(normalizePath(path)),
    stat: async (path) => {
      const stat = await adapter.stat(normalizePath(path));
      return stat ? { size: stat.size } : null;
    },
    list: async (path) => {
      const listed = await adapter.list(normalizePath(path));
      return {
        files: listed.files.map((entry) => normalizePath(entry)),
        folders: listed.folders.map((entry) => normalizePath(entry)),
      };
    },
    readBinary: (path) => adapter.readBinary(normalizePath(path)),
    mkdir: (path) => adapter.mkdir(normalizePath(path)),
    writeBinary: (path, bytes) => adapter.writeBinary(normalizePath(path), bytes),
    rename: (from, to) => adapter.rename(normalizePath(from), normalizePath(to)),
    removeDirectory: (path) => adapter.rmdir(normalizePath(path), true),
  };
}

export function createMineruArtifactStore(
  app: App,
  subtle: SubtleCrypto | undefined,
): MineruArtifactStore {
  return new MineruArtifactStore(
    createMineruArtifactAdapter(app.vault.adapter),
    { subtle: requireSubtle(subtle) },
  );
}

async function resolveStoredPathCasing(adapter: DataAdapter, path: string): Promise<string> {
  if (await adapter.exists(path, true)) return path;

  const resolved: string[] = [];
  const segments = path.split('/');
  for (const segment of segments) {
    const candidate = [...resolved, segment].join('/');
    if (await adapter.exists(candidate, true)) {
      resolved.push(segment);
      continue;
    }

    const parent = resolved.join('/');
    try {
      const listed = await adapter.list(parent);
      const matches = [...listed.files, ...listed.folders]
        .map((entry) => normalizePath(entry).split('/').pop() as string)
        .filter((entry) => entry.toLowerCase() === segment.toLowerCase());
      resolved.push(matches.length === 1 ? matches[0] : segment);
    } catch (error) {
      throw new Error(
        `Failed to resolve stored casing for "${path}" under "${parent || '<vault root>'}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return resolved.join('/');
}

function waitForDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = (): void => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const defaultDependencies: MineruPdfBackendDependencies = {
  isMobile: () => Platform.isMobile,
  createCache: (ctx) => createPdfCache(ctx.app),
  createArtifactStore: (ctx) => createMineruArtifactStore(ctx.app, ctx.subtle),
  createClient: ({ apiToken, timeoutMs }) => new MineruClient({
    apiToken,
    timeoutMs,
    fetchFn: obsidianFetchBridge as unknown as typeof fetch,
    downloadFn: obsidianBinaryDownload,
    sleep: waitForDelay,
    now: () => Date.now(),
  }),
  extractArchive: extractMineruArchive,
  now: () => new Date(),
};

function requireSubtle(subtle: SubtleCrypto | undefined): SubtleCrypto {
  if (!subtle) throw new Error('MinerU PDF conversion requires SubtleCrypto.');
  return subtle;
}

export const mineruPdfBackend = createMineruPdfBackend(defaultDependencies);
