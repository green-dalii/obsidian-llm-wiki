import { sha256Bytes } from '../pdf-cache';
import {
  getMineruArtifactDir,
  getMineruTempDir,
  sanitizeMineruRelativePath,
} from './mineru-paths';
import { MINERU_CONVERSION_PROFILE } from './mineru-profile';
import type {
  ArtifactInspection,
  MineruArtifactAdapter,
  MineruArtifactImageInput,
  MineruArtifactManifest,
  MineruArtifactManifestImage,
  MineruArtifactPublishInput,
} from './types';

export const MINERU_CONVERTER_VERSION = MINERU_CONVERSION_PROFILE.converterVersion;

const MANIFEST_FILENAME = '.mineru-manifest.json';
const MARKDOWN_FILENAME = 'document.md';
const MANIFEST_SCHEMA_VERSION = 2;
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
const IMAGE_KEYS = ['path', 'bytes', 'sha256'] as const;
const LEGACY_IMAGE_KEYS = ['path', 'bytes'] as const;

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

interface ParsedManifestImage {
  path: string;
  bytes: number;
  sha256?: string;
}

type ParsedMineruArtifactManifest = Omit<MineruArtifactManifest, 'schemaVersion' | 'images'> & {
  schemaVersion: 1 | 2;
  images: ParsedManifestImage[];
};

export class MineruArtifactConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MineruArtifactConflictError';
  }
}

export function isMineruArtifactConflict(
  inspection: ArtifactInspection,
): inspection is Extract<ArtifactInspection, { kind: 'unowned-conflict' | 'managed-invalid' }> {
  return inspection.kind === 'unowned-conflict' || inspection.kind === 'managed-invalid';
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

class MineruArtifactUnownedConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MineruArtifactUnownedConflict';
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
      if (isMineruArtifactConflict(existing)) {
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
      let existing = await this.inspect(oldSourcePath);
      let sourceDirectory = oldDirectory;
      let backupSourcePath = oldSourcePath;
      if (existing.kind === 'missing') {
        existing = await this.inspectDirectory(newDirectory, oldSourcePath);
        if (existing.kind === 'missing') return;
        sourceDirectory = newDirectory;
        backupSourcePath = newSourcePath;
      }
      if (existing.kind !== 'valid') {
        throw new MineruArtifactConflictError(
          `Refusing to move ${sourceDirectory}: source is not a valid managed artifact.`
        );
      }
      if (
        sourceDirectory !== newDirectory
        && !samePhysicalDirectory
        && await this.adapter.exists(newDirectory)
      ) {
        throw new MineruArtifactConflictError(
          `Refusing to move MinerU artifacts: destination ${newDirectory} already exists.`
        );
      }

      const markdownBytes = new Uint8Array(await this.adapter.readBinary(
        `${sourceDirectory}/${MARKDOWN_FILENAME}`
      ));
      const images: MineruArtifactImageInput[] = [];
      for (const image of existing.manifest.images) {
        images.push({
          path: image.path,
          bytes: new Uint8Array(await this.adapter.readBinary(`${sourceDirectory}/${image.path}`)),
        });
      }
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
        backupDirectory: getMineruTempDir(backupSourcePath, `${operationId}-backup`),
      };
      await this.assertTransactionPathsFree(paths);
      await this.commitPreparedArtifact(prepared, paths, undefined, sourceDirectory);
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
    const manifestImages: MineruArtifactManifestImage[] = await Promise.all(
      images.map(async (image) => ({
        path: image.path,
        bytes: image.bytes.length,
        sha256: await sha256Bytes(image.bytes, this.options.subtle),
      }))
    );
    const manifest: MineruArtifactManifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      sourcePath,
      sourceSha256: input.sourceSha256,
      backend: MINERU_CONVERSION_PROFILE.backend,
      modelVersion: MINERU_CONVERSION_PROFILE.modelVersion,
      converterVersion: MINERU_CONVERTER_VERSION,
      convertedAt: input.convertedAt,
      taskId,
      ...(traceId === undefined ? {} : { traceId }),
      markdownPath: MARKDOWN_FILENAME,
      markdownSha256,
      images: manifestImages,
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
      await this.assertNoUnownedEntries(directory, manifest);
      const markdownPath = `${directory}/${manifest.markdownPath}`;
      if (!await this.adapter.exists(markdownPath)) {
        throw new Error('Managed MinerU Markdown file is missing.');
      }
      const markdownBytes = new Uint8Array(await this.adapter.readBinary(markdownPath));
      const markdownSha256 = await sha256Bytes(markdownBytes, this.options.subtle);
      if (markdownSha256 !== manifest.markdownSha256) {
        throw new Error('Managed MinerU Markdown hash does not match its manifest.');
      }

      const normalizedImages: MineruArtifactManifestImage[] = [];
      for (const image of manifest.images) {
        const imagePath = `${directory}/${image.path}`;
        const imageBytes = new Uint8Array(await this.adapter.readBinary(imagePath));
        if (imageBytes.length !== image.bytes) {
          throw new Error(`Managed MinerU image byte length does not match: ${image.path}`);
        }
        const imageSha256 = await sha256Bytes(imageBytes, this.options.subtle);
        if (manifest.schemaVersion === 2 && imageSha256 !== image.sha256) {
          throw new Error(`Managed MinerU image hash does not match: ${image.path}`);
        }
        normalizedImages.push({ path: image.path, bytes: image.bytes, sha256: imageSha256 });
      }

      const normalizedManifest: MineruArtifactManifest = {
        ...manifest,
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        images: normalizedImages,
      };

      return { kind: 'valid', manifest: normalizedManifest, markdown: decodeUtf8(markdownBytes) };
    } catch (error) {
      if (error instanceof MineruArtifactUnownedConflict) return { kind: 'unowned-conflict' };
      return {
        kind: 'managed-invalid',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async assertNoUnownedEntries(
    directory: string,
    manifest: { markdownPath: string; images: Array<{ path: string }> }
  ): Promise<void> {
    const allowedFiles = new Set([
      MANIFEST_FILENAME,
      manifest.markdownPath,
      ...manifest.images.map((image) => image.path),
    ]);
    const allowedFolders = new Set(collectImageDirectories(manifest.images));
    const pending = [directory];
    for (let index = 0; index < pending.length; index += 1) {
      const listed = await this.adapter.list(pending[index]);
      for (const file of listed.files) {
        const relative = relativeListedPath(directory, file);
        if (!allowedFiles.has(relative)) {
          throw new MineruArtifactUnownedConflict(`Unowned MinerU artifact file: ${relative}`);
        }
      }
      for (const folder of listed.folders) {
        const relative = relativeListedPath(directory, folder);
        if (!allowedFolders.has(relative)) {
          throw new MineruArtifactUnownedConflict(`Unowned MinerU artifact directory: ${relative}`);
        }
        pending.push(folder);
      }
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
        console.warn(
          `[MinerU artifact cleanup] Committed output is valid, but backup cleanup failed: ${errorMessage(cleanupError)}`
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

function parseManifest(json: string, expectedSourcePath: string): ParsedMineruArtifactManifest {
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) throw new Error('MinerU manifest must be a JSON object.');
  assertExactKeys(parsed, REQUIRED_MANIFEST_KEYS, MANIFEST_KEYS, 'MinerU manifest');
  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(`MinerU manifest schemaVersion must be 1 or ${MANIFEST_SCHEMA_VERSION}.`);
  }
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
  const schemaVersion = parsed.schemaVersion;
  const images = parseManifestImages(parsed.images, schemaVersion);
  return {
    schemaVersion,
    sourcePath: parsed.sourcePath,
    sourceSha256: parsed.sourceSha256,
    backend: MINERU_CONVERSION_PROFILE.backend,
    modelVersion: MINERU_CONVERSION_PROFILE.modelVersion,
    converterVersion: MINERU_CONVERTER_VERSION,
    convertedAt: parsed.convertedAt,
    taskId,
    ...(traceId === undefined ? {} : { traceId }),
    markdownPath: MARKDOWN_FILENAME,
    markdownSha256: parsed.markdownSha256,
    images,
  };
}

function parseManifestImages(value: unknown, schemaVersion: 1 | 2): ParsedManifestImage[] {
  if (!Array.isArray(value)) throw new Error('MinerU manifest images must be an array.');
  const images = value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`MinerU manifest image ${index} must be an object.`);
    const imageKeys = schemaVersion === 1 ? LEGACY_IMAGE_KEYS : IMAGE_KEYS;
    assertExactKeys(entry, imageKeys, imageKeys, `MinerU manifest image ${index}`);
    const path = normalizeImagePath(entry.path);
    if (path !== entry.path) {
      throw new Error(`MinerU manifest image path is not normalized: ${String(entry.path)}`);
    }
    if (!Number.isSafeInteger(entry.bytes) || (entry.bytes as number) < 0) {
      throw new Error(`MinerU manifest image byte length is invalid: ${path}`);
    }
    if (schemaVersion === 1) return { path, bytes: entry.bytes as number };
    assertSha256(entry.sha256, `image ${path} sha256`);
    return { path, bytes: entry.bytes as number, sha256: entry.sha256 };
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
    return { path: normalizeImagePath(image.path), bytes: image.bytes };
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

function collectImageDirectories(images: Array<{ path: string }>): string[] {
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

function relativeListedPath(directory: string, path: string): string {
  const normalizedDirectory = normalizeListedPath(directory);
  const normalizedPath = normalizeListedPath(path);
  const prefix = `${normalizedDirectory}/`;
  return normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : normalizedPath;
}

function normalizeListedPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
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
  if (
    bytes.buffer instanceof ArrayBuffer
    && bytes.byteOffset === 0
    && bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes.buffer;
  }
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
