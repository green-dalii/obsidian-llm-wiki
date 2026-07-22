import { sha256Bytes } from '../pdf-cache';
import {
  getMineruArtifactDir,
  getMineruTempDir,
  sanitizeMineruRelativePath,
} from './mineru-paths';
import type {
  ArtifactInspection,
  MineruArtifactAdapter,
  MineruArtifactImageInput,
  MineruArtifactManifest,
  MineruArtifactManifestImage,
  MineruArtifactPublishInput,
} from './types';

export const MINERU_CONVERTER_VERSION = 'mineru-v1' as const;

const MANIFEST_FILENAME = '.mineru-manifest.json';
const MARKDOWN_FILENAME = 'document.md';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const MANIFEST_KEYS = [
  'schemaVersion',
  'sourcePath',
  'sourceSha256',
  'backend',
  'modelVersion',
  'converterVersion',
  'convertedAt',
  'taskId',
  'traceId',
  'markdownPath',
  'markdownSha256',
  'images',
] as const;
const REQUIRED_MANIFEST_KEYS = MANIFEST_KEYS.filter((key) => key !== 'traceId');
const IMAGE_KEYS = ['path', 'bytes'] as const;

export interface MineruArtifactStoreOptions {
  subtle: SubtleCrypto;
  createOperationId?: () => string;
}

interface PreparedArtifact {
  sourcePath: string;
  markdownBytes: Uint8Array;
  images: MineruArtifactImageInput[];
  manifest: MineruArtifactManifest;
}

interface TransactionPaths {
  finalDirectory: string;
  tempDirectory: string;
  backupDirectory?: string;
}

export class MineruArtifactConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MineruArtifactConflictError';
  }
}

export class MineruArtifactWriteError extends Error {
  readonly cause?: unknown;
  readonly cleanupErrors: readonly string[];

  constructor(
    message: string,
    options?: { cause?: unknown; cleanupErrors?: readonly string[] }
  ) {
    super(message);
    this.name = 'MineruArtifactWriteError';
    this.cause = options?.cause;
    this.cleanupErrors = Object.freeze([...(options?.cleanupErrors ?? [])]);
  }
}

export class MineruArtifactStore {
  private readonly createOperationId: () => string;

  constructor(
    private readonly adapter: MineruArtifactAdapter,
    private readonly options: MineruArtifactStoreOptions
  ) {
    this.createOperationId = options.createOperationId ?? (() => `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  async inspect(sourcePath: string): Promise<ArtifactInspection> {
    const normalizedSourcePath = normalizeSourcePath(sourcePath);
    return this.inspectDirectory(getMineruArtifactDir(normalizedSourcePath), normalizedSourcePath);
  }

  async publish(input: MineruArtifactPublishInput, signal?: AbortSignal): Promise<void> {
    let prepared: PreparedArtifact;
    try {
      prepared = await this.preparePublish(input);
    } catch (error) {
      throw new MineruArtifactWriteError(
        `MinerU artifact input is invalid: ${errorMessage(error)}`,
        { cause: error }
      );
    }

    const finalDirectory = getMineruArtifactDir(prepared.sourcePath);
    const finalIdentity = await this.adapter.getPathIdentity(finalDirectory);
    await withArtifactPathLocks([finalIdentity], async () => {
      throwIfAborted(signal);
      const existing = await this.inspect(prepared.sourcePath);
      if (existing.kind === 'unowned-conflict') {
        throw new MineruArtifactConflictError(
          `Refusing to replace ${finalDirectory}: existing content is not a valid managed artifact.`
        );
      }

      const operationId = safeOperationId(this.createOperationId());
      const paths: TransactionPaths = {
        finalDirectory,
        tempDirectory: getMineruTempDir(prepared.sourcePath, operationId),
        backupDirectory: existing.kind !== 'missing'
          ? getMineruTempDir(prepared.sourcePath, `${operationId}-backup`)
          : undefined,
      };
      await this.assertTransactionPathsFree(paths);
      await this.commitPreparedArtifact(prepared, paths, signal);
    });
  }

  async moveForPdfRename(oldPdfPath: string, newPdfPath: string): Promise<void> {
    const oldSourcePath = normalizeSourcePath(oldPdfPath);
    const newSourcePath = normalizeSourcePath(newPdfPath);
    const oldDirectory = getMineruArtifactDir(oldSourcePath);
    const newDirectory = getMineruArtifactDir(newSourcePath);
    const [oldIdentity, newIdentity] = await Promise.all([
      this.adapter.getPathIdentity(oldDirectory),
      this.adapter.getPathIdentity(newDirectory),
    ]);
    const samePhysicalDirectory = oldIdentity === newIdentity;
    await withArtifactPathLocks([oldIdentity, newIdentity], async () => {
      const existing = await this.inspect(oldSourcePath);
      if (existing.kind === 'missing') return;
      if (existing.kind !== 'valid') {
        throw new MineruArtifactConflictError(
          `Refusing to move ${oldDirectory}: source is not a valid managed artifact.`
        );
      }
      if (!samePhysicalDirectory && await this.adapter.exists(newDirectory)) {
        throw new MineruArtifactConflictError(
          `Refusing to move MinerU artifacts: destination ${newDirectory} already exists.`
        );
      }

      const markdownBytes = new Uint8Array(await this.adapter.readBinary(
        `${oldDirectory}/${MARKDOWN_FILENAME}`
      ));
      const images = await Promise.all(existing.manifest.images.map(async (image) => ({
        path: image.path,
        bytes: new Uint8Array(await this.adapter.readBinary(`${oldDirectory}/${image.path}`)),
      })));
      const prepared: PreparedArtifact = {
        sourcePath: newSourcePath,
        markdownBytes,
        images,
        manifest: { ...existing.manifest, sourcePath: newSourcePath },
      };
      const operationId = safeOperationId(this.createOperationId());
      const paths: TransactionPaths = {
        finalDirectory: newDirectory,
        tempDirectory: getMineruTempDir(newSourcePath, operationId),
        backupDirectory: getMineruTempDir(oldSourcePath, `${operationId}-backup`),
      };
      await this.assertTransactionPathsFree(paths);
      await this.commitPreparedArtifact(prepared, paths, undefined, oldDirectory);
    });
  }

  private async preparePublish(input: MineruArtifactPublishInput): Promise<PreparedArtifact> {
    const sourcePath = normalizeSourcePath(input.sourcePath);
    assertSha256(input.sourceSha256, 'sourceSha256');
    assertIsoTimestamp(input.convertedAt);
    const taskId = sanitizeSafeId(input.taskId, 'taskId');
    const traceId = input.traceId === undefined
      ? undefined
      : sanitizeSafeId(input.traceId, 'traceId');
    const images = normalizeImages(input.images);
    const markdownBytes = new TextEncoder().encode(input.markdown);
    const markdownSha256 = await sha256Bytes(markdownBytes, this.options.subtle);
    const manifest: MineruArtifactManifest = {
      schemaVersion: 1,
      sourcePath,
      sourceSha256: input.sourceSha256,
      backend: 'mineru',
      modelVersion: 'vlm',
      converterVersion: MINERU_CONVERTER_VERSION,
      convertedAt: input.convertedAt,
      taskId,
      ...(traceId === undefined ? {} : { traceId }),
      markdownPath: MARKDOWN_FILENAME,
      markdownSha256,
      images: images.map((image) => ({ path: image.path, bytes: image.bytes.length })),
    };
    return { sourcePath, markdownBytes, images, manifest };
  }

  private async inspectDirectory(
    directory: string,
    expectedSourcePath: string
  ): Promise<ArtifactInspection> {
    if (!await this.adapter.exists(directory)) return { kind: 'missing' };
    const manifestPath = `${directory}/${MANIFEST_FILENAME}`;
    if (!await this.adapter.exists(manifestPath)) return { kind: 'unowned-conflict' };

    try {
      const manifestBytes = new Uint8Array(await this.adapter.readBinary(manifestPath));
      const manifest = parseManifest(decodeUtf8(manifestBytes), expectedSourcePath);
      const markdownPath = `${directory}/${manifest.markdownPath}`;
      if (!await this.adapter.exists(markdownPath)) {
        throw new Error('Managed MinerU Markdown file is missing.');
      }
      const markdownBytes = new Uint8Array(await this.adapter.readBinary(markdownPath));
      const markdownSha256 = await sha256Bytes(markdownBytes, this.options.subtle);
      if (markdownSha256 !== manifest.markdownSha256) {
        throw new Error('Managed MinerU Markdown hash does not match its manifest.');
      }

      for (const image of manifest.images) {
        const imagePath = `${directory}/${image.path}`;
        if (!await this.adapter.exists(imagePath)) {
          throw new Error(`Managed MinerU image is missing: ${image.path}`);
        }
        const imageBytes = new Uint8Array(await this.adapter.readBinary(imagePath));
        if (imageBytes.length !== image.bytes) {
          throw new Error(`Managed MinerU image byte length does not match: ${image.path}`);
        }
      }

      return { kind: 'valid', manifest, markdown: decodeUtf8(markdownBytes) };
    } catch (error) {
      return {
        kind: 'managed-invalid',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async assertTransactionPathsFree(paths: TransactionPaths): Promise<void> {
    if (await this.adapter.exists(paths.tempDirectory)) {
      throw new MineruArtifactConflictError(
        `MinerU transaction staging path already exists: ${paths.tempDirectory}`
      );
    }
    if (paths.backupDirectory && await this.adapter.exists(paths.backupDirectory)) {
      throw new MineruArtifactConflictError(
        `MinerU transaction backup path already exists: ${paths.backupDirectory}`
      );
    }
  }

  private async commitPreparedArtifact(
    prepared: PreparedArtifact,
    paths: TransactionPaths,
    signal?: AbortSignal,
    sourceDirectory = paths.finalDirectory,
  ): Promise<void> {
    let sourceBackedUp = false;
    try {
      throwIfAborted(signal);
      await this.writePreparedDirectory(paths.tempDirectory, prepared);
      throwIfAborted(signal);
      const staged = await this.inspectDirectory(paths.tempDirectory, prepared.sourcePath);
      if (staged.kind !== 'valid') {
        const reason = staged.kind === 'managed-invalid' ? staged.reason : staged.kind;
        throw new Error(`Staged MinerU artifact failed validation: ${reason}`);
      }
      throwIfAborted(signal);
      if (paths.backupDirectory) {
        await this.adapter.rename(sourceDirectory, paths.backupDirectory);
        sourceBackedUp = true;
      }
      throwIfAborted(signal);
      await this.adapter.rename(paths.tempDirectory, paths.finalDirectory);
    } catch (error) {
      const cleanupErrors: string[] = [];
      if (sourceBackedUp && paths.backupDirectory) {
        try {
          await this.adapter.rename(paths.backupDirectory, sourceDirectory);
          sourceBackedUp = false;
        } catch (rollbackError) {
          cleanupErrors.push(errorMessage(rollbackError));
        }
      }
      let tempExists = false;
      try {
        tempExists = await this.adapter.exists(paths.tempDirectory);
      } catch (existsError) {
        cleanupErrors.push(errorMessage(existsError));
      }
      if (tempExists) {
        try {
          await this.adapter.removeDirectory(paths.tempDirectory);
        } catch (removeError) {
          cleanupErrors.push(errorMessage(removeError));
        }
      }
      if (cleanupErrors.length === 0 && isAbortError(error)) throw error;
      throw new MineruArtifactWriteError(
        `Failed to publish MinerU artifacts: ${errorMessage(error)}`,
        { cause: error, cleanupErrors }
      );
    }

    if (paths.backupDirectory) {
      try {
        await this.adapter.removeDirectory(paths.backupDirectory);
        sourceBackedUp = false;
      } catch (cleanupError) {
        const cleanupMessage = errorMessage(cleanupError);
        throw new MineruArtifactWriteError(
          `MinerU artifacts were committed, but backup cleanup failed: ${cleanupMessage}`,
          { cause: cleanupError, cleanupErrors: [cleanupMessage] }
        );
      }
    }
  }

  private async writePreparedDirectory(
    directory: string,
    prepared: PreparedArtifact
  ): Promise<void> {
    await this.adapter.mkdir(directory);
    await this.adapter.writeBinary(
      `${directory}/${MARKDOWN_FILENAME}`,
      toArrayBuffer(prepared.markdownBytes)
    );
    for (const imageDirectory of collectImageDirectories(prepared.images)) {
      await this.adapter.mkdir(`${directory}/${imageDirectory}`);
    }
    for (const image of prepared.images) {
      await this.adapter.writeBinary(`${directory}/${image.path}`, toArrayBuffer(image.bytes));
    }
    const manifestBytes = new TextEncoder().encode(
      `${JSON.stringify(prepared.manifest, null, 2)}\n`
    );
    await this.adapter.writeBinary(
      `${directory}/${MANIFEST_FILENAME}`,
      toArrayBuffer(manifestBytes)
    );
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
    || error instanceof Error && error.name === 'AbortError';
}

function parseManifest(json: string, expectedSourcePath: string): MineruArtifactManifest {
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) throw new Error('MinerU manifest must be a JSON object.');
  assertExactKeys(parsed, REQUIRED_MANIFEST_KEYS, MANIFEST_KEYS, 'MinerU manifest');
  if (parsed.schemaVersion !== 1) throw new Error('MinerU manifest schemaVersion must be 1.');
  if (parsed.sourcePath !== expectedSourcePath) {
    throw new Error('MinerU manifest sourcePath does not match the current PDF path.');
  }
  if (normalizeSourcePath(parsed.sourcePath) !== parsed.sourcePath) {
    throw new Error('MinerU manifest sourcePath is not normalized.');
  }
  assertSha256(parsed.sourceSha256, 'sourceSha256');
  if (parsed.backend !== 'mineru') throw new Error('MinerU manifest backend is invalid.');
  if (parsed.modelVersion !== 'vlm') throw new Error('MinerU manifest modelVersion is invalid.');
  if (parsed.converterVersion !== MINERU_CONVERTER_VERSION) {
    throw new Error('MinerU manifest converterVersion is invalid.');
  }
  assertIsoTimestamp(parsed.convertedAt);
  const taskId = sanitizeSafeId(parsed.taskId, 'taskId');
  const traceId = parsed.traceId === undefined
    ? undefined
    : sanitizeSafeId(parsed.traceId, 'traceId');
  if (parsed.markdownPath !== MARKDOWN_FILENAME) {
    throw new Error('MinerU manifest markdownPath is invalid.');
  }
  assertSha256(parsed.markdownSha256, 'markdownSha256');
  const images = parseManifestImages(parsed.images);
  return {
    schemaVersion: 1,
    sourcePath: parsed.sourcePath,
    sourceSha256: parsed.sourceSha256,
    backend: 'mineru',
    modelVersion: 'vlm',
    converterVersion: MINERU_CONVERTER_VERSION,
    convertedAt: parsed.convertedAt,
    taskId,
    ...(traceId === undefined ? {} : { traceId }),
    markdownPath: MARKDOWN_FILENAME,
    markdownSha256: parsed.markdownSha256,
    images,
  };
}

function parseManifestImages(value: unknown): MineruArtifactManifestImage[] {
  if (!Array.isArray(value)) throw new Error('MinerU manifest images must be an array.');
  const images = value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`MinerU manifest image ${index} must be an object.`);
    assertExactKeys(entry, IMAGE_KEYS, IMAGE_KEYS, `MinerU manifest image ${index}`);
    const path = normalizeImagePath(entry.path);
    if (path !== entry.path) {
      throw new Error(`MinerU manifest image path is not normalized: ${String(entry.path)}`);
    }
    if (!Number.isSafeInteger(entry.bytes) || (entry.bytes as number) < 0) {
      throw new Error(`MinerU manifest image byte length is invalid: ${path}`);
    }
    return { path, bytes: entry.bytes as number };
  });
  for (let index = 0; index < images.length; index += 1) {
    if (index > 0 && images[index - 1].path >= images[index].path) {
      throw new Error('MinerU manifest images must be uniquely sorted by path.');
    }
  }
  return images;
}

function normalizeImages(images: MineruArtifactImageInput[]): MineruArtifactImageInput[] {
  if (!Array.isArray(images)) throw new Error('MinerU images must be an array.');
  const normalized = images.map((image) => {
    if (!image || !(image.bytes instanceof Uint8Array)) {
      throw new Error('MinerU image bytes must be Uint8Array values.');
    }
    return { path: normalizeImagePath(image.path), bytes: new Uint8Array(image.bytes) };
  }).sort((left, right) => comparePaths(left.path, right.path));
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index - 1].path === normalized[index].path) {
      throw new Error(`MinerU image path is duplicated: ${normalized[index].path}`);
    }
  }
  return normalized;
}

function normalizeSourcePath(path: unknown): string {
  if (typeof path !== 'string') throw new Error('MinerU sourcePath must be a string.');
  return sanitizeMineruRelativePath(path);
}

function normalizeImagePath(path: unknown): string {
  if (typeof path !== 'string') throw new Error('MinerU image path must be a string.');
  const normalized = sanitizeMineruRelativePath(path);
  if (!normalized.startsWith('images/') || normalized.length === 'images/'.length) {
    throw new Error('MinerU image paths must be below images/.');
  }
  return normalized;
}

function sanitizeSafeId(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !SAFE_ID_PATTERN.test(value) ||
    value === '.' ||
    value === '..'
  ) {
    throw new Error(`MinerU ${field} must be a non-empty safe ID.`);
  }
  return value;
}

function safeOperationId(value: string): string {
  return sanitizeSafeId(value, 'operation ID').replace(/:/g, '-');
}

function assertSha256(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new Error(`MinerU ${field} must be a lowercase SHA-256 hex digest.`);
  }
}

function assertIsoTimestamp(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('MinerU convertedAt must be a valid ISO timestamp.');
  }
  const match = ISO_TIMESTAMP_PATTERN.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) {
    throw new Error('MinerU convertedAt must be a valid ISO timestamp.');
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const daysInMonth = getGregorianDaysInMonth(year, month);
  if (
    day < 1 || day > daysInMonth ||
    hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 23 || offsetMinute > 59
  ) {
    throw new Error('MinerU convertedAt must be a valid ISO timestamp.');
  }
}

function collectImageDirectories(images: MineruArtifactImageInput[]): string[] {
  const directories = new Set<string>();
  for (const image of images) {
    const segments = image.path.split('/');
    segments.pop();
    for (let length = 1; length <= segments.length; length += 1) {
      directories.add(segments.slice(0, length).join('/'));
    }
  }
  return [...directories].sort((left, right) => {
    const depthDifference = left.split('/').length - right.split('/').length;
    return depthDifference || comparePaths(left, right);
  });
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  allowed: readonly string[],
  label: string
): void {
  const keys = Object.keys(value);
  if (required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) {
    throw new Error(`${label} is missing required fields.`);
  }
  if (keys.some((key) => !allowed.includes(key))) {
    throw new Error(`${label} contains unexpected fields.`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function getGregorianDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

interface ArtifactPathLockState {
  tail: Promise<void>;
  users: number;
}

const artifactPathLocks = new Map<string, ArtifactPathLockState>();

async function withArtifactPathLocks<T>(
  paths: string[],
  action: () => Promise<T>
): Promise<T> {
  const orderedPaths = [...new Set(paths)].sort(comparePaths);
  const releases: Array<() => void> = [];
  try {
    for (const path of orderedPaths) releases.push(await acquireArtifactPathLock(path));
    return await action();
  } finally {
    for (let index = releases.length - 1; index >= 0; index -= 1) releases[index]();
  }
}

async function acquireArtifactPathLock(path: string): Promise<() => void> {
  let state = artifactPathLocks.get(path);
  if (!state) {
    state = { tail: Promise.resolve(), users: 0 };
    artifactPathLocks.set(path, state);
  }
  const previous = state.tail;
  let releaseGate!: () => void;
  const gate = new Promise<void>((resolve) => { releaseGate = resolve; });
  state.tail = previous.then(() => gate);
  state.users += 1;
  await previous;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseGate();
    state.users -= 1;
    if (state.users === 0) artifactPathLocks.delete(path);
  };
}
