import { describe, expect, it, vi } from 'vitest';
import { sha256Bytes } from '../../core/pdf-cache';
import {
  MINERU_CONVERTER_VERSION,
  MineruArtifactConflictError,
  MineruArtifactStore,
  MineruArtifactWriteError,
} from '../../core/pdf-backends/mineru-artifacts';
import { getMineruArtifactDir, getMineruTempDir } from '../../core/pdf-backends/mineru-paths';
import type {
  MineruArtifactAdapter,
  MineruArtifactManifest,
  MineruArtifactPublishInput,
} from '../../core/pdf-backends/types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const subtle = activeWindow.crypto.subtle;
const OLD_PDF_PATH = 'papers/original.pdf';
const OLD_DIR = 'papers/original.mineru';
const NEW_PDF_PATH = 'papers/renamed.pdf';
const NEW_DIR = 'papers/renamed.mineru';
const MOVED_PARENT_PDF_PATH = 'archive/original.pdf';
const MOVED_PARENT_DIR = 'archive/original.mineru';
const SAME_DIR_NEW_PDF_PATH = 'papers/original.docx';
const CASE_ONLY_NEW_PDF_PATH = 'papers/Original.pdf';
const CASE_ONLY_NEW_DIR = 'papers/Original.mineru';
const MANIFEST_NAME = '.mineru-manifest.json';

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

interface FailureRule {
  operation: string;
  mode?: 'before' | 'partial-remove';
  message: string;
  skip?: number;
}

interface PauseHandle {
  reached: Promise<void>;
  release: () => void;
}

class MemoryArtifactAdapter implements MineruArtifactAdapter {
  readonly directories = new Set<string>();
  readonly files = new Map<string, Uint8Array>();
  readonly operations: string[] = [];
  private mutationCount = 0;
  private failAtMutation?: number;
  private failureRules: FailureRule[] = [];
  private pause?: {
    operation: string;
    reached: () => void;
    released: Promise<void>;
  };

  constructor(private readonly caseInsensitive = false) {}

  async getPathIdentity(path: string): Promise<string> {
    this.operations.push(`getPathIdentity:${path}`);
    return this.identity(path);
  }

  setFailure(mutation: number | undefined): void {
    this.mutationCount = 0;
    this.failAtMutation = mutation;
    this.operations.length = 0;
  }

  setFailureRules(...rules: FailureRule[]): void {
    this.failureRules = [...rules];
  }

  pauseAt(operation: string): PauseHandle {
    let reached!: () => void;
    let release!: () => void;
    const reachedPromise = new Promise<void>((resolve) => { reached = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    this.pause = { operation, reached, released };
    return { reached: reachedPromise, release };
  }

  seedDirectory(path: string): void {
    this.directories.add(path);
  }

  seedFile(path: string, bytes: Uint8Array): void {
    this.files.set(path, copyBytes(bytes));
    const segments = path.split('/');
    segments.pop();
    while (segments.length > 0) {
      this.directories.add(segments.join('/'));
      segments.pop();
    }
  }

  async exists(path: string): Promise<boolean> {
    await this.beforeOperation(`exists:${path}`, false);
    return this.resolveDirectory(path) !== undefined || this.resolveFile(path) !== undefined;
  }

  async readBinary(path: string): Promise<ArrayBuffer> {
    await this.beforeOperation(`readBinary:${path}`, false);
    const actualPath = this.resolveFile(path);
    const bytes = actualPath === undefined ? undefined : this.files.get(actualPath);
    if (!bytes) throw new Error(`ENOENT: ${path}`);
    const copy = new ArrayBuffer(bytes.length);
    new Uint8Array(copy).set(bytes);
    return copy;
  }

  async mkdir(path: string): Promise<void> {
    await this.beforeOperation(`mkdir:${path}`, true);
    if (this.resolveDirectory(path) === undefined) this.directories.add(path);
  }

  async writeBinary(path: string, bytes: ArrayBuffer): Promise<void> {
    await this.beforeOperation(`writeBinary:${path}`, true);
    const actualPath = this.resolveFile(path) ?? path;
    this.files.set(actualPath, new Uint8Array(bytes.slice(0)));
  }

  async rename(from: string, to: string): Promise<void> {
    await this.beforeOperation(`rename:${from}->${to}`, true);
    const actualFile = this.resolveFile(from);
    const actualDirectory = this.resolveDirectory(from);
    if (actualDirectory === undefined && actualFile === undefined) {
      throw new Error(`ENOENT: ${from}`);
    }
    const targetDirectory = this.resolveDirectory(to);
    const targetFile = this.resolveFile(to);
    const samePhysicalPath = this.identity(from) === this.identity(to);
    if (!samePhysicalPath && (targetDirectory !== undefined || targetFile !== undefined)) {
      throw new Error(`EEXIST: ${to}`);
    }

    if (actualFile !== undefined) {
      const bytes = this.files.get(actualFile) as Uint8Array;
      this.files.delete(actualFile);
      this.files.set(to, bytes);
      return;
    }

    const sourceDirectory = actualDirectory as string;
    const directoryEntries = [...this.directories]
      .filter((path) => path === sourceDirectory || path.startsWith(`${sourceDirectory}/`))
      .sort((left, right) => left.length - right.length);
    const fileEntries = [...this.files.entries()]
      .filter(([path]) => path.startsWith(`${sourceDirectory}/`));
    for (const path of directoryEntries) this.directories.delete(path);
    for (const [path] of fileEntries) this.files.delete(path);
    for (const path of directoryEntries) {
      this.directories.add(`${to}${path.slice(sourceDirectory.length)}`);
    }
    for (const [path, bytes] of fileEntries) {
      this.files.set(`${to}${path.slice(sourceDirectory.length)}`, bytes);
    }
  }

  async removeDirectory(path: string): Promise<void> {
    const partialFailure = await this.beforeOperation(`removeDirectory:${path}`, true);
    const actualPath = this.resolveDirectory(path) ?? path;
    if (partialFailure?.mode === 'partial-remove') {
      const firstFile = [...this.files.keys()].sort().find(
        (filePath) => filePath.startsWith(`${actualPath}/`)
      );
      if (firstFile) this.files.delete(firstFile);
      throw new Error(partialFailure.message);
    }
    this.files.delete(actualPath);
    for (const filePath of [...this.files.keys()]) {
      if (filePath.startsWith(`${actualPath}/`)) this.files.delete(filePath);
    }
    this.directories.delete(actualPath);
    for (const directoryPath of [...this.directories]) {
      if (directoryPath.startsWith(`${actualPath}/`)) this.directories.delete(directoryPath);
    }
  }

  snapshotDirectory(path: string): Record<string, number[]> {
    const actualPath = this.resolveDirectory(path) ?? path;
    return Object.fromEntries(
      [...this.files.entries()]
        .filter(([filePath]) => filePath.startsWith(`${actualPath}/`))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([filePath, bytes]) => [filePath.slice(actualPath.length + 1), [...bytes]])
    );
  }

  snapshotTree(path: string): { directories: string[]; files: Record<string, number[]> } {
    const actualPath = this.resolveDirectory(path) ?? path;
    return {
      directories: [...this.directories]
        .filter(
          (directoryPath) => directoryPath === actualPath || directoryPath.startsWith(`${actualPath}/`)
        )
        .map(
          (directoryPath) => directoryPath === actualPath
            ? '.'
            : directoryPath.slice(actualPath.length + 1)
        )
        .sort(),
      files: this.snapshotDirectory(path),
    };
  }

  mutationOperations(): string[] {
    return this.operations.filter(
      (operation) => /^(mkdir|writeBinary|rename|removeDirectory):/.test(operation)
    );
  }

  private async beforeOperation(
    operation: string,
    mutation: boolean
  ): Promise<FailureRule | undefined> {
    this.operations.push(operation);
    if (mutation) this.mutationCount += 1;
    if (mutation && this.mutationCount === this.failAtMutation) {
      throw new Error(`injected failure at ${operation}`);
    }
    const beforeRule = this.takeFailureRule(operation, 'before');
    if (beforeRule) {
      const rule = beforeRule;
      throw new Error(rule.message);
    }
    if (this.pause?.operation === operation) {
      const pause = this.pause;
      this.pause = undefined;
      pause.reached();
      await pause.released;
    }
    return this.takeFailureRule(operation, 'partial-remove');
  }

  private takeFailureRule(
    operation: string,
    mode: 'before' | 'partial-remove'
  ): FailureRule | undefined {
    const index = this.failureRules.findIndex(
      (rule) => rule.operation === operation && (rule.mode ?? 'before') === mode
    );
    if (index < 0) return undefined;
    const rule = this.failureRules[index];
    if ((rule.skip ?? 0) > 0) {
      rule.skip = (rule.skip as number) - 1;
      return undefined;
    }
    this.failureRules.splice(index, 1);
    return rule;
  }

  private identity(path: string): string {
    return this.caseInsensitive ? path.toLocaleLowerCase('en-US') : path;
  }

  private resolveDirectory(path: string): string | undefined {
    const identity = this.identity(path);
    return [...this.directories].find((candidate) => this.identity(candidate) === identity);
  }

  private resolveFile(path: string): string | undefined {
    const identity = this.identity(path);
    return [...this.files.keys()].find((candidate) => this.identity(candidate) === identity);
  }
}

function makeStore(adapter: MemoryArtifactAdapter, ids = ['publish']): MineruArtifactStore {
  let index = 0;
  return new MineruArtifactStore(adapter, {
    subtle,
    createOperationId: () => ids[index++] ?? `operation-${index}`,
  });
}

function makePublishInput(overrides: Partial<MineruArtifactPublishInput> = {}): MineruArtifactPublishInput {
  return {
    sourcePath: OLD_PDF_PATH,
    sourceSha256: 'a'.repeat(64),
    taskId: 'task-123',
    traceId: 'trace_456',
    convertedAt: '2026-07-22T08:30:00Z',
    markdown: '# New\n\n![Chart](images/chart.png)\n',
    images: [
      { path: 'images/z-last.png', bytes: new Uint8Array([9]) },
      { path: 'images/chart.png', bytes: new Uint8Array([1, 2, 3]) },
    ],
    ...overrides,
  };
}

async function makeManifest(
  sourcePath: string,
  markdown: string,
  images: Array<{ path: string; bytes: Uint8Array }>,
  overrides: Partial<MineruArtifactManifest> = {}
): Promise<MineruArtifactManifest> {
  return {
    schemaVersion: 1,
    sourcePath,
    sourceSha256: 'b'.repeat(64),
    backend: 'mineru',
    modelVersion: 'vlm',
    converterVersion: MINERU_CONVERTER_VERSION,
    convertedAt: '2026-07-21T12:00:00.000Z',
    taskId: 'old-task',
    traceId: 'old-trace',
    markdownPath: 'document.md',
    markdownSha256: await sha256Bytes(encoder.encode(markdown), subtle),
    images: [...images]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((image) => ({ path: image.path, bytes: image.bytes.length })),
    ...overrides,
  };
}

async function seedManagedArtifact(
  adapter: MemoryArtifactAdapter,
  sourcePath = OLD_PDF_PATH,
  overrides: Partial<MineruArtifactManifest> = {}
): Promise<MineruArtifactManifest> {
  const directory = getMineruArtifactDir(sourcePath);
  const markdown = '# Old\n\n![Old](images/old.png)\n';
  const images = [{ path: 'images/old.png', bytes: new Uint8Array([7, 8, 9, 10]) }];
  const manifest = await makeManifest(sourcePath, markdown, images, overrides);
  adapter.seedFile(`${directory}/document.md`, encoder.encode(markdown));
  for (const image of images) adapter.seedFile(`${directory}/${image.path}`, image.bytes);
  adapter.seedFile(
    `${directory}/${MANIFEST_NAME}`,
    encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`)
  );
  return manifest;
}

async function captureWriteError(action: Promise<unknown>): Promise<MineruArtifactWriteError> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(MineruArtifactWriteError);
    return error as MineruArtifactWriteError;
  }
  throw new Error('Expected MineruArtifactWriteError');
}

async function flushAsync(): Promise<void> {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
}

function expectNoTransactionPaths(adapter: MemoryArtifactAdapter): void {
  expect([...adapter.directories, ...adapter.files.keys()].filter(
    (path) => path.includes('.mineru.tmp-')
  )).toEqual([]);
}

async function settleWithin<T>(promise: Promise<T>, milliseconds = 250): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error('concurrent artifact operations deadlocked')),
      milliseconds
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

describe('MineruArtifactStore.inspect', () => {
  it('distinguishes a missing artifact from an unowned existing directory', async () => {
    const adapter = new MemoryArtifactAdapter();
    const store = makeStore(adapter);
    await expect(store.inspect(OLD_PDF_PATH)).resolves.toEqual({ kind: 'missing' });

    adapter.seedDirectory(OLD_DIR);
    adapter.seedFile(`${OLD_DIR}/notes.txt`, encoder.encode('user-owned'));
    await expect(store.inspect(OLD_PDF_PATH)).resolves.toEqual({ kind: 'unowned-conflict' });
  });

  it('returns valid after verifying the Markdown hash and each image byte length', async () => {
    const adapter = new MemoryArtifactAdapter();
    const manifest = await seedManagedArtifact(adapter);
    const store = makeStore(adapter);

    await expect(store.inspect(OLD_PDF_PATH)).resolves.toEqual({
      kind: 'valid',
      manifest,
      markdown: '# Old\n\n![Old](images/old.png)\n',
    });
  });

  it.each([
    ['schema version', { schemaVersion: 2 }],
    ['source path', { sourcePath: 'papers/other.pdf' }],
    ['source SHA casing', { sourceSha256: 'A'.repeat(64) }],
    ['backend', { backend: 'native' }],
    ['model version', { modelVersion: 'pipeline' }],
    ['converter version', { converterVersion: 'mineru-v0' }],
    ['converted timestamp', { convertedAt: 'not-an-iso-date' }],
    ['task ID', { taskId: '../unsafe' }],
    ['trace ID', { traceId: '' }],
    ['Markdown path', { markdownPath: 'full.md' }],
  ])('classifies invalid %s as managed-invalid', async (_label, override) => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter, OLD_PDF_PATH, override as Partial<MineruArtifactManifest>);

    const result = await makeStore(adapter).inspect(OLD_PDF_PATH);
    expect(result.kind).toBe('managed-invalid');
    if (result.kind === 'managed-invalid') expect(result.reason).not.toBe('');
  });

  it('classifies malformed JSON and unexpected manifest fields as managed-invalid', async () => {
    const malformed = new MemoryArtifactAdapter();
    malformed.seedDirectory(OLD_DIR);
    malformed.seedFile(`${OLD_DIR}/${MANIFEST_NAME}`, encoder.encode('{bad json'));
    expect((await makeStore(malformed).inspect(OLD_PDF_PATH)).kind).toBe('managed-invalid');

    const extra = new MemoryArtifactAdapter();
    const manifest = await seedManagedArtifact(extra);
    extra.seedFile(
      `${OLD_DIR}/${MANIFEST_NAME}`,
      encoder.encode(JSON.stringify({ ...manifest, token: 'secret-token' }))
    );
    expect((await makeStore(extra).inspect(OLD_PDF_PATH)).kind).toBe('managed-invalid');
  });

  it('detects Markdown hash mismatch from the actual stored content', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    adapter.seedFile(`${OLD_DIR}/document.md`, encoder.encode('# Tampered'));

    const result = await makeStore(adapter).inspect(OLD_PDF_PATH);
    expect(result.kind).toBe('managed-invalid');
    expect(result.kind === 'managed-invalid' && result.reason).toMatch(/Markdown hash/i);
  });

  it('detects missing images and actual byte-length mismatch', async () => {
    const missing = new MemoryArtifactAdapter();
    await seedManagedArtifact(missing);
    missing.files.delete(`${OLD_DIR}/images/old.png`);
    expect((await makeStore(missing).inspect(OLD_PDF_PATH)).kind).toBe('managed-invalid');

    const wrongLength = new MemoryArtifactAdapter();
    await seedManagedArtifact(wrongLength);
    wrongLength.seedFile(`${OLD_DIR}/images/old.png`, new Uint8Array([7]));
    const result = await makeStore(wrongLength).inspect(OLD_PDF_PATH);
    expect(result.kind).toBe('managed-invalid');
    expect(result.kind === 'managed-invalid' && result.reason).toMatch(/byte length/i);
  });

  it.each([
    [[{ path: 'assets/image.png', bytes: 1 }], 'outside images'],
    [[{ path: 'images/../escape.png', bytes: 1 }], 'unsafe path'],
    [[{ path: 'images/b.png', bytes: 1 }, { path: 'images/a.png', bytes: 1 }], 'unsorted'],
    [[{ path: 'images/a.png', bytes: 1 }, { path: 'images/a.png', bytes: 1 }], 'duplicate'],
    [[{ path: 'images/a.png', bytes: -1 }], 'negative size'],
    [[{ path: 'images/a.png', bytes: Number.MAX_SAFE_INTEGER + 1 }], 'unsafe size'],
  ])('rejects image manifest entries with %s', async (images) => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter, OLD_PDF_PATH, { images });
    expect((await makeStore(adapter).inspect(OLD_PDF_PATH)).kind).toBe('managed-invalid');
  });
});

describe('MineruArtifactStore.publish', () => {
  it('stages, validates, and swaps a generated manifest with sorted exact sizes', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    adapter.seedFile(OLD_PDF_PATH, new Uint8Array([4, 5, 6]));
    const oldPdf = [...(adapter.files.get(OLD_PDF_PATH) as Uint8Array)];
    const store = makeStore(adapter, ['successful']);
    const digest = vi.spyOn(subtle, 'digest');
    const input = Object.assign(makePublishInput({ sourcePath: 'papers\\original.pdf' }), {
      token: 'must-not-be-persisted',
      signedUrl: 'https://example.invalid/signed-secret',
    });

    await store.publish(input);

    const inspection = await store.inspect(OLD_PDF_PATH);
    expect(inspection.kind).toBe('valid');
    if (inspection.kind !== 'valid') throw new Error('expected a valid publication');
    expect(inspection.markdown).toBe(input.markdown);
    expect(inspection.manifest.sourcePath).toBe(OLD_PDF_PATH);
    expect(inspection.manifest.images).toEqual([
      { path: 'images/chart.png', bytes: 3 },
      { path: 'images/z-last.png', bytes: 1 },
    ]);
    expect(inspection.manifest.markdownSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(inspection.manifest.converterVersion).toBe('mineru-v1');
    expect(adapter.snapshotDirectory(OLD_DIR)['document.md']).toEqual([...encoder.encode(input.markdown)]);
    expect(adapter.snapshotDirectory(OLD_DIR)['images/chart.png']).toEqual([1, 2, 3]);
    const persistedManifest = decoder.decode(adapter.files.get(`${OLD_DIR}/${MANIFEST_NAME}`));
    expect(persistedManifest).not.toContain('must-not-be-persisted');
    expect(persistedManifest).not.toContain('signed-secret');
    expect([...adapter.files.get(OLD_PDF_PATH) as Uint8Array]).toEqual(oldPdf);
    expect(
      adapter.operations.some((operation) => operation === `removeDirectory:${OLD_PDF_PATH}`)
    ).toBe(false);
    expect(digest).toHaveBeenCalledWith('SHA-256', encoder.encode(input.markdown));
    digest.mockRestore();
  });

  it('accepts proleptic Gregorian year zero and rejects an invalid non-leap day', async () => {
    const validAdapter = new MemoryArtifactAdapter();
    const validInput = makePublishInput({ convertedAt: '0000-02-29T00:00:00Z' });
    await makeStore(validAdapter, ['year-zero']).publish(validInput);
    expect((await makeStore(validAdapter).inspect(OLD_PDF_PATH)).kind).toBe('valid');

    const invalidAdapter = new MemoryArtifactAdapter();
    await expect(makeStore(invalidAdapter).publish(
      makePublishInput({ convertedAt: '0001-02-29T00:00:00Z' })
    )).rejects.toBeInstanceOf(MineruArtifactWriteError);
    expect(invalidAdapter.mutationOperations()).toEqual([]);
  });

  it.each([
    ['invalid source SHA', { sourceSha256: 'ABC' }],
    ['invalid timestamp', { convertedAt: 'today' }],
    ['unsafe task ID', { taskId: '../task' }],
    ['empty trace ID', { traceId: '' }],
    ['unsafe image path', { images: [{ path: '../image.png', bytes: new Uint8Array([1]) }] }],
    [
      'duplicate image path',
      { images: [
        { path: 'images/a.png', bytes: new Uint8Array([1]) },
        { path: 'images/a.png', bytes: new Uint8Array([2]) },
      ] },
    ],
  ])('rejects %s before mutating storage', async (_label, override) => {
    const adapter = new MemoryArtifactAdapter();
    await expect(makeStore(adapter).publish(makePublishInput(override as Partial<MineruArtifactPublishInput>)))
      .rejects.toBeInstanceOf(MineruArtifactWriteError);
    expect(adapter.mutationOperations()).toEqual([]);
  });

  it('replaces a managed-invalid final directory transactionally', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter, OLD_PDF_PATH, {
      converterVersion: 'stale' as 'mineru-v1',
    });

    await makeStore(adapter, ['repair']).publish(makePublishInput());

    expect((await makeStore(adapter).inspect(OLD_PDF_PATH)).kind).toBe('valid');
    expect(decoder.decode(adapter.files.get(`${OLD_DIR}/document.md`)))
      .toBe(makePublishInput().markdown);
  });

  it('refuses an unowned final directory without overwriting it', async () => {
    const adapter = new MemoryArtifactAdapter();
    adapter.seedFile(`${OLD_DIR}/user.txt`, encoder.encode('keep me'));
    const before = adapter.snapshotDirectory(OLD_DIR);

    await expect(makeStore(adapter).publish(makePublishInput()))
      .rejects.toBeInstanceOf(MineruArtifactConflictError);
    expect(adapter.snapshotDirectory(OLD_DIR)).toEqual(before);
    expect(adapter.mutationOperations()).toEqual([]);
  });

  it.each(['temp-write', 'backup-rename'] as const)(
    'rolls back the old tree when aborted at the %s boundary',
    async (boundary) => {
      const adapter = new MemoryArtifactAdapter();
      await seedManagedArtifact(adapter);
      const oldTree = adapter.snapshotTree(OLD_DIR);
      const operationId = `cancel-${boundary}`;
      const temp = getMineruTempDir(OLD_PDF_PATH, operationId);
      const backup = getMineruTempDir(OLD_PDF_PATH, `${operationId}-backup`);
      const operation = boundary === 'temp-write'
        ? `writeBinary:${temp}/document.md`
        : `rename:${OLD_DIR}->${backup}`;
      const pause = adapter.pauseAt(operation);
      const controller = new AbortController();
      const publication = makeStore(adapter, [operationId])
        .publish(makePublishInput(), controller.signal);
      await pause.reached;

      controller.abort();
      pause.release();

      await expect(publication).rejects.toMatchObject({ name: 'AbortError' });
      expect(adapter.snapshotTree(OLD_DIR)).toEqual(oldTree);
      expectNoTransactionPaths(adapter);
    }
  );

  it('treats temp-to-final rename as the cancellation commit point', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    const operationId = 'cancel-at-commit';
    const temp = getMineruTempDir(OLD_PDF_PATH, operationId);
    const pause = adapter.pauseAt(`rename:${temp}->${OLD_DIR}`);
    const controller = new AbortController();
    const publication = makeStore(adapter, [operationId])
      .publish(makePublishInput({ markdown: '# Committed' }), controller.signal);
    await pause.reached;

    controller.abort();
    pause.release();

    await expect(publication).resolves.toBeUndefined();
    const inspection = await makeStore(adapter).inspect(OLD_PDF_PATH);
    expect(inspection.kind).toBe('valid');
    if (inspection.kind === 'valid') expect(inspection.markdown).toBe('# Committed');
    expectNoTransactionPaths(adapter);
  });

  it('preserves the old tree before the commit point and the new tree after it', async () => {
    const baselineAdapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(baselineAdapter);
    await makeStore(baselineAdapter, ['baseline']).publish(makePublishInput());
    const boundaries = baselineAdapter.mutationOperations();
    expect(boundaries.length).toBeGreaterThan(0);
    const commitPoint = boundaries.findIndex(
      (operation) => operation.endsWith(`->${OLD_DIR}`)
    ) + 1;
    expect(commitPoint).toBeGreaterThan(0);

    for (let mutation = 1; mutation <= boundaries.length; mutation += 1) {
      const adapter = new MemoryArtifactAdapter();
      await seedManagedArtifact(adapter);
      const before = adapter.snapshotTree(OLD_DIR);
      const temp = getMineruTempDir(OLD_PDF_PATH, `failure-${mutation}`);
      const backup = getMineruTempDir(OLD_PDF_PATH, `failure-${mutation}-backup`);
      adapter.setFailure(mutation);

      await expect(makeStore(adapter, [`failure-${mutation}`]).publish(makePublishInput()))
        .rejects.toBeInstanceOf(MineruArtifactWriteError);
      const rescanned = await makeStore(adapter).inspect(OLD_PDF_PATH);
      if (mutation <= commitPoint) {
        expect(adapter.snapshotTree(OLD_DIR), boundaries[mutation - 1]).toEqual(before);
        expect(adapter.snapshotTree(temp), boundaries[mutation - 1]).toEqual({
          directories: [],
          files: {},
        });
        expect(adapter.snapshotTree(backup), boundaries[mutation - 1]).toEqual({
          directories: [],
          files: {},
        });
        expect(rescanned.kind, boundaries[mutation - 1]).toBe('valid');
        if (rescanned.kind === 'valid') expect(rescanned.markdown).toContain('# Old');
      } else {
        expect(adapter.snapshotTree(temp), boundaries[mutation - 1]).toEqual({
          directories: [],
          files: {},
        });
        expect(adapter.snapshotTree(backup).directories, boundaries[mutation - 1])
          .toContain('.');
        expect(rescanned.kind, boundaries[mutation - 1]).toBe('valid');
        if (rescanned.kind === 'valid') expect(rescanned.markdown).toContain('# New');
      }
    }
  });

  it('keeps the committed new final when backup cleanup partially deletes then throws', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    const backup = getMineruTempDir(OLD_PDF_PATH, 'commit-cleanup-backup');
    adapter.setFailureRules({
      operation: `removeDirectory:${backup}`,
      mode: 'partial-remove',
      message: 'partial backup cleanup failure',
    });

    const error = await captureWriteError(
      makeStore(adapter, ['commit-cleanup']).publish(makePublishInput())
    );

    expect(error.message).toContain('partial backup cleanup failure');
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toBe('partial backup cleanup failure');
    expect(error.cleanupErrors).toContain('partial backup cleanup failure');
    const inspection = await makeStore(adapter).inspect(OLD_PDF_PATH);
    expect(inspection.kind).toBe('valid');
    if (inspection.kind === 'valid') expect(inspection.markdown).toContain('# New');
    expect(adapter.snapshotTree(OLD_DIR).directories).toContain('.');
    expect(adapter.snapshotTree(backup).directories).toContain('.');
  });

  it('preserves the primary failure when cleanup exists also fails', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    const temp = getMineruTempDir(OLD_PDF_PATH, 'cleanup-exists');
    adapter.setFailureRules(
      {
        operation: `writeBinary:${temp}/document.md`,
        message: 'primary document write failure',
      },
      {
        operation: `exists:${temp}`,
        message: 'cleanup exists failure',
        skip: 1,
      }
    );

    const error = await captureWriteError(
      makeStore(adapter, ['cleanup-exists']).publish(makePublishInput())
    );

    expect(error.message).toContain('primary document write failure');
    expect((error.cause as Error).message).toBe('primary document write failure');
    expect(error.cleanupErrors).toContain('cleanup exists failure');
    expect((await makeStore(adapter).inspect(OLD_PDF_PATH)).kind).toBe('valid');
    expect(adapter.snapshotTree(temp).directories).toContain('.');
  });

  it('collects rollback rename and temp cleanup failures without replacing primary', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    const temp = getMineruTempDir(OLD_PDF_PATH, 'double-cleanup');
    const backup = getMineruTempDir(OLD_PDF_PATH, 'double-cleanup-backup');
    adapter.setFailureRules(
      {
        operation: `rename:${temp}->${OLD_DIR}`,
        message: 'primary install failure',
      },
      {
        operation: `rename:${backup}->${OLD_DIR}`,
        message: 'rollback restore failure',
      },
      {
        operation: `removeDirectory:${temp}`,
        message: 'temp cleanup failure',
      }
    );

    const error = await captureWriteError(
      makeStore(adapter, ['double-cleanup']).publish(makePublishInput())
    );

    expect(error.message).toContain('primary install failure');
    expect((error.cause as Error).message).toBe('primary install failure');
    expect(error.cleanupErrors).toEqual(expect.arrayContaining([
      'rollback restore failure',
      'temp cleanup failure',
    ]));
    expect(adapter.snapshotTree(OLD_DIR)).toEqual({ directories: [], files: {} });
    expect(adapter.snapshotTree(backup).directories).toContain('.');
    expect(adapter.snapshotTree(temp).directories).toContain('.');
  });
});

describe('MineruArtifactStore.moveForPdfRename', () => {
  it('rewrites the manifest when a parent-folder rename already moved the artifact directory', async () => {
    const adapter = new MemoryArtifactAdapter();
    const oldManifest = await seedManagedArtifact(adapter);
    const oldTree = adapter.snapshotTree(OLD_DIR);
    await adapter.rename('papers', 'archive');
    adapter.operations.length = 0;

    await makeStore(adapter, ['moved-parent'])
      .moveForPdfRename(OLD_PDF_PATH, MOVED_PARENT_PDF_PATH);

    const moved = await makeStore(adapter).inspect(MOVED_PARENT_PDF_PATH);
    expect(moved.kind).toBe('valid');
    if (moved.kind !== 'valid') throw new Error('expected moved parent artifact to be valid');
    expect(moved.manifest).toEqual({ ...oldManifest, sourcePath: MOVED_PARENT_PDF_PATH });
    expect(adapter.snapshotTree(MOVED_PARENT_DIR).files['document.md'])
      .toEqual(oldTree.files['document.md']);
    expect(adapter.snapshotTree(MOVED_PARENT_DIR).files['images/old.png'])
      .toEqual(oldTree.files['images/old.png']);
    expect(adapter.snapshotTree(OLD_DIR)).toEqual({ directories: [], files: {} });
  });

  it.each(['independent-managed', 'unowned'] as const)(
    'refuses a moved-parent %s destination instead of overwriting it',
    async (kind) => {
      const adapter = new MemoryArtifactAdapter();
      if (kind === 'independent-managed') {
        await seedManagedArtifact(adapter, MOVED_PARENT_PDF_PATH);
      } else {
        adapter.seedFile(`${MOVED_PARENT_DIR}/user.txt`, encoder.encode('user-owned'));
      }
      const before = adapter.snapshotTree(MOVED_PARENT_DIR);

      await expect(makeStore(adapter).moveForPdfRename(OLD_PDF_PATH, MOVED_PARENT_PDF_PATH))
        .rejects.toBeInstanceOf(MineruArtifactConflictError);

      expect(adapter.snapshotTree(MOVED_PARENT_DIR)).toEqual(before);
      expect(adapter.mutationOperations()).toEqual([]);
    },
  );

  it('keeps the already-moved artifact unchanged when its manifest rewrite fails', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    await adapter.rename('papers', 'archive');
    const before = adapter.snapshotTree(MOVED_PARENT_DIR);
    const temp = getMineruTempDir(MOVED_PARENT_PDF_PATH, 'moved-parent-failure');
    adapter.operations.length = 0;
    adapter.setFailureRules({
      operation: `writeBinary:${temp}/${MANIFEST_NAME}`,
      message: 'moved parent manifest failure',
    });

    const error = await captureWriteError(
      makeStore(adapter, ['moved-parent-failure'])
        .moveForPdfRename(OLD_PDF_PATH, MOVED_PARENT_PDF_PATH),
    );

    expect(error.message).toContain('moved parent manifest failure');
    expect(adapter.snapshotTree(MOVED_PARENT_DIR)).toEqual(before);
    expectNoTransactionPaths(adapter);
  });

  it('treats a missing source artifact as a no-op', async () => {
    const adapter = new MemoryArtifactAdapter();

    await expect(makeStore(adapter).moveForPdfRename(OLD_PDF_PATH, NEW_PDF_PATH))
      .resolves.toBeUndefined();
    expect(adapter.mutationOperations()).toEqual([]);
  });

  it('moves only valid managed bytes and changes only normalized sourcePath in the manifest', async () => {
    const adapter = new MemoryArtifactAdapter();
    const oldManifest = await seedManagedArtifact(adapter);
    adapter.seedFile(OLD_PDF_PATH, new Uint8Array([11, 12]));
    const oldPayload = adapter.snapshotDirectory(OLD_DIR);
    const store = makeStore(adapter, ['rename']);

    await store.moveForPdfRename(OLD_PDF_PATH, 'papers\\renamed.pdf');

    await expect(store.inspect(OLD_PDF_PATH)).resolves.toEqual({ kind: 'missing' });
    const moved = await store.inspect(NEW_PDF_PATH);
    expect(moved.kind).toBe('valid');
    if (moved.kind !== 'valid') throw new Error('expected valid moved artifact');
    expect(moved.manifest).toEqual({ ...oldManifest, sourcePath: NEW_PDF_PATH });
    expect(adapter.snapshotDirectory(NEW_DIR)['document.md']).toEqual(oldPayload['document.md']);
    expect(adapter.snapshotDirectory(NEW_DIR)['images/old.png']).toEqual(oldPayload['images/old.png']);
    expect(adapter.files.get(OLD_PDF_PATH)).toEqual(new Uint8Array([11, 12]));
    expect(
      adapter.operations.some((operation) => operation === `removeDirectory:${OLD_PDF_PATH}`)
    ).toBe(false);
  });

  it('transactionally rewrites sourcePath when both PDF paths map to the same artifact directory', async () => {
    const adapter = new MemoryArtifactAdapter();
    const oldManifest = await seedManagedArtifact(adapter);
    const oldTree = adapter.snapshotTree(OLD_DIR);

    await makeStore(adapter, ['same-directory'])
      .moveForPdfRename(OLD_PDF_PATH, SAME_DIR_NEW_PDF_PATH);

    const moved = await makeStore(adapter).inspect(SAME_DIR_NEW_PDF_PATH);
    expect(moved.kind).toBe('valid');
    if (moved.kind !== 'valid') throw new Error('expected same-directory rewrite to be valid');
    expect(moved.manifest).toEqual({ ...oldManifest, sourcePath: SAME_DIR_NEW_PDF_PATH });
    expect(adapter.snapshotTree(OLD_DIR).files['document.md']).toEqual(oldTree.files['document.md']);
    expect(adapter.snapshotTree(OLD_DIR).files['images/old.png']).toEqual(oldTree.files['images/old.png']);
    expect(adapter.mutationOperations()).not.toEqual([]);
  });

  it('keeps the old same-directory manifest when rewrite fails before commit', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    const before = adapter.snapshotTree(OLD_DIR);
    const temp = getMineruTempDir(SAME_DIR_NEW_PDF_PATH, 'same-directory-failure');
    adapter.setFailureRules({
      operation: `writeBinary:${temp}/${MANIFEST_NAME}`,
      message: 'same-directory manifest write failure',
    });

    const error = await captureWriteError(
      makeStore(adapter, ['same-directory-failure'])
        .moveForPdfRename(OLD_PDF_PATH, SAME_DIR_NEW_PDF_PATH)
    );

    expect(error.message).toContain('same-directory manifest write failure');
    expect(adapter.snapshotTree(OLD_DIR)).toEqual(before);
    expect((await makeStore(adapter).inspect(OLD_PDF_PATH)).kind).toBe('valid');
  });

  it('transactionally updates a case-only PDF rename on a case-insensitive filesystem', async () => {
    const adapter = new MemoryArtifactAdapter(true);
    const oldManifest = await seedManagedArtifact(adapter);
    const oldTree = adapter.snapshotTree(OLD_DIR);
    const temp = getMineruTempDir(CASE_ONLY_NEW_PDF_PATH, 'case-only');
    const backup = getMineruTempDir(OLD_PDF_PATH, 'case-only-backup');

    await makeStore(adapter, ['case-only'])
      .moveForPdfRename(OLD_PDF_PATH, CASE_ONLY_NEW_PDF_PATH);

    const moved = await makeStore(adapter).inspect(CASE_ONLY_NEW_PDF_PATH);
    expect(moved.kind).toBe('valid');
    if (moved.kind !== 'valid') throw new Error('expected case-only rename to be valid');
    expect(moved.manifest).toEqual({ ...oldManifest, sourcePath: CASE_ONLY_NEW_PDF_PATH });
    expect(adapter.snapshotTree(CASE_ONLY_NEW_DIR).files['document.md'])
      .toEqual(oldTree.files['document.md']);
    expect(adapter.snapshotTree(CASE_ONLY_NEW_DIR).files['images/old.png'])
      .toEqual(oldTree.files['images/old.png']);
    expect(adapter.directories.has(CASE_ONLY_NEW_DIR)).toBe(true);
    expect(adapter.directories.has(OLD_DIR)).toBe(false);
    expect(adapter.operations).toContain(`rename:${OLD_DIR}->${backup}`);
    expect(adapter.operations).toContain(`rename:${temp}->${CASE_ONLY_NEW_DIR}`);
  });

  it('restores the original casing and bytes when a case-only rename fails before commit', async () => {
    const adapter = new MemoryArtifactAdapter(true);
    await seedManagedArtifact(adapter);
    const before = adapter.snapshotTree(OLD_DIR);
    const temp = getMineruTempDir(CASE_ONLY_NEW_PDF_PATH, 'case-rollback');
    const backup = getMineruTempDir(OLD_PDF_PATH, 'case-rollback-backup');
    adapter.setFailureRules({
      operation: `rename:${temp}->${CASE_ONLY_NEW_DIR}`,
      message: 'case-only install failure',
    });

    const error = await captureWriteError(
      makeStore(adapter, ['case-rollback'])
        .moveForPdfRename(OLD_PDF_PATH, CASE_ONLY_NEW_PDF_PATH)
    );

    expect(error.message).toContain('case-only install failure');
    expect(adapter.snapshotTree(OLD_DIR)).toEqual(before);
    expect(adapter.directories.has(OLD_DIR)).toBe(true);
    expect(adapter.directories.has(CASE_ONLY_NEW_DIR)).toBe(false);
    expect(adapter.snapshotTree(temp)).toEqual({ directories: [], files: {} });
    expect(adapter.snapshotTree(backup)).toEqual({ directories: [], files: {} });
    expect((await makeStore(adapter).inspect(OLD_PDF_PATH)).kind).toBe('valid');
    expect(adapter.operations).toContain(`rename:${backup}->${OLD_DIR}`);
  });

  it('refuses a destination conflict and leaves both directories unchanged', async () => {
    const adapter = new MemoryArtifactAdapter(true);
    await seedManagedArtifact(adapter);
    adapter.seedFile(`${NEW_DIR}/user.txt`, encoder.encode('destination owner'));
    const oldBefore = adapter.snapshotDirectory(OLD_DIR);
    const newBefore = adapter.snapshotDirectory(NEW_DIR);

    await expect(makeStore(adapter).moveForPdfRename(OLD_PDF_PATH, NEW_PDF_PATH))
      .rejects.toBeInstanceOf(MineruArtifactConflictError);
    expect(adapter.snapshotDirectory(OLD_DIR)).toEqual(oldBefore);
    expect(adapter.snapshotDirectory(NEW_DIR)).toEqual(newBefore);
    expect(adapter.mutationOperations()).toEqual([]);
  });

  it('does not move a managed-invalid or unowned source directory', async () => {
    for (const kind of ['managed-invalid', 'unowned'] as const) {
      const adapter = new MemoryArtifactAdapter();
      if (kind === 'managed-invalid') {
        await seedManagedArtifact(adapter);
        adapter.seedFile(`${OLD_DIR}/document.md`, encoder.encode('tampered'));
      } else {
        adapter.seedFile(`${OLD_DIR}/user.txt`, encoder.encode('not managed'));
      }
      const before = adapter.snapshotDirectory(OLD_DIR);

      await expect(makeStore(adapter).moveForPdfRename(OLD_PDF_PATH, NEW_PDF_PATH))
        .rejects.toBeInstanceOf(MineruArtifactConflictError);
      expect(adapter.snapshotDirectory(OLD_DIR)).toEqual(before);
      expect(adapter.mutationOperations()).toEqual([]);
    }
  });

  it('preserves old/new trees on the correct side of the rename commit point', async () => {
    const baselineAdapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(baselineAdapter);
    await makeStore(baselineAdapter, ['baseline-rename'])
      .moveForPdfRename(OLD_PDF_PATH, NEW_PDF_PATH);
    const boundaries = baselineAdapter.mutationOperations();
    expect(boundaries.length).toBeGreaterThan(0);
    const commitPoint = boundaries.findIndex(
      (operation) => operation.includes('->papers/renamed.mineru')
    ) + 1;
    expect(commitPoint).toBeGreaterThan(0);

    for (let mutation = 1; mutation <= boundaries.length; mutation += 1) {
      const adapter = new MemoryArtifactAdapter();
      await seedManagedArtifact(adapter);
      const before = adapter.snapshotTree(OLD_DIR);
      const temp = getMineruTempDir(NEW_PDF_PATH, `rename-failure-${mutation}`);
      const backup = getMineruTempDir(
        OLD_PDF_PATH,
        `rename-failure-${mutation}-backup`
      );
      adapter.setFailure(mutation);

      await expect(makeStore(adapter, [`rename-failure-${mutation}`])
        .moveForPdfRename(OLD_PDF_PATH, NEW_PDF_PATH))
        .rejects.toBeInstanceOf(MineruArtifactWriteError);
      if (mutation <= commitPoint) {
        expect(adapter.snapshotTree(OLD_DIR), boundaries[mutation - 1]).toEqual(before);
        expect(adapter.snapshotTree(NEW_DIR), boundaries[mutation - 1]).toEqual({
          directories: [],
          files: {},
        });
        expect(adapter.snapshotTree(temp), boundaries[mutation - 1]).toEqual({
          directories: [],
          files: {},
        });
        expect(adapter.snapshotTree(backup), boundaries[mutation - 1]).toEqual({
          directories: [],
          files: {},
        });
        expect((await makeStore(adapter).inspect(OLD_PDF_PATH)).kind, boundaries[mutation - 1])
          .toBe('valid');
      } else {
        expect(adapter.snapshotTree(temp), boundaries[mutation - 1]).toEqual({
          directories: [],
          files: {},
        });
        expect(adapter.snapshotTree(backup).directories, boundaries[mutation - 1])
          .toContain('.');
        expect((await makeStore(adapter).inspect(NEW_PDF_PATH)).kind, boundaries[mutation - 1])
          .toBe('valid');
      }
    }
  });
});

describe('MineruArtifactStore path locks', () => {
  it('serializes the same artifact path across store instances', async () => {
    const adapter = new MemoryArtifactAdapter();
    const firstTemp = getMineruTempDir(OLD_PDF_PATH, 'first');
    const pause = adapter.pauseAt(`writeBinary:${firstTemp}/document.md`);
    const first = makeStore(adapter, ['first']).publish(
      makePublishInput({ markdown: '# First' })
    );
    await pause.reached;

    const second = makeStore(adapter, ['second']).publish(
      makePublishInput({ markdown: '# Second' })
    );
    await flushAsync();
    expect(adapter.operations.some((operation) => operation.includes('.tmp-second'))).toBe(false);

    pause.release();
    await Promise.all([first, second]);
    const final = await makeStore(adapter).inspect(OLD_PDF_PATH);
    expect(final.kind).toBe('valid');
    if (final.kind === 'valid') expect(final.markdown).toBe('# Second');
  });

  it('allows publications to different artifact paths to run in parallel', async () => {
    const adapter = new MemoryArtifactAdapter();
    const firstTemp = getMineruTempDir(OLD_PDF_PATH, 'blocked');
    const pause = adapter.pauseAt(`writeBinary:${firstTemp}/document.md`);
    const blocked = makeStore(adapter, ['blocked']).publish(makePublishInput());
    await pause.reached;

    const otherPath = 'papers/parallel.pdf';
    await makeStore(adapter, ['parallel']).publish(makePublishInput({
      sourcePath: otherPath,
      markdown: '# Parallel',
    }));
    expect((await makeStore(adapter).inspect(otherPath)).kind).toBe('valid');

    pause.release();
    await blocked;
  });

  it('holds both rename paths until the transactional move finishes', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter);
    const renameTemp = getMineruTempDir(NEW_PDF_PATH, 'rename-lock');
    const pause = adapter.pauseAt(`writeBinary:${renameTemp}/document.md`);
    const rename = makeStore(adapter, ['rename-lock'])
      .moveForPdfRename(OLD_PDF_PATH, NEW_PDF_PATH);
    await pause.reached;

    const oldPublish = makeStore(adapter, ['old-waiter']).publish(makePublishInput({
      markdown: '# Old waiter',
    }));
    const newPublish = makeStore(adapter, ['new-waiter']).publish(makePublishInput({
      sourcePath: NEW_PDF_PATH,
      markdown: '# New waiter',
    }));
    await flushAsync();
    expect(adapter.operations.some((operation) => operation.includes('.tmp-old-waiter'))).toBe(false);
    expect(adapter.operations.some((operation) => operation.includes('.tmp-new-waiter'))).toBe(false);

    pause.release();
    await Promise.all([rename, oldPublish, newPublish]);
    expect((await makeStore(adapter).inspect(OLD_PDF_PATH)).kind).toBe('valid');
    expect((await makeStore(adapter).inspect(NEW_PDF_PATH)).kind).toBe('valid');
  });

  it('acquires opposite rename path sets in code-unit order without deadlock', async () => {
    const adapter = new MemoryArtifactAdapter();
    await seedManagedArtifact(adapter, OLD_PDF_PATH);
    await seedManagedArtifact(adapter, NEW_PDF_PATH);

    const results = await settleWithin(Promise.allSettled([
      makeStore(adapter).moveForPdfRename(OLD_PDF_PATH, NEW_PDF_PATH),
      makeStore(adapter).moveForPdfRename(NEW_PDF_PATH, OLD_PDF_PATH),
    ]));

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    for (const result of results) {
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(MineruArtifactConflictError);
      }
    }
  });

  it('serializes physical path aliases reported by a case-insensitive adapter', async () => {
    const adapter = new MemoryArtifactAdapter(true);
    await seedManagedArtifact(adapter);
    const renameTemp = getMineruTempDir(CASE_ONLY_NEW_PDF_PATH, 'case-lock');
    const pause = adapter.pauseAt(`writeBinary:${renameTemp}/document.md`);
    const rename = makeStore(adapter, ['case-lock'])
      .moveForPdfRename(OLD_PDF_PATH, CASE_ONLY_NEW_PDF_PATH);
    await pause.reached;

    let waiterSettled = false;
    const waiter = makeStore(adapter, ['alias-waiter']).publish(makePublishInput({
      sourcePath: 'papers/ORIGINAL.pdf',
      markdown: '# Alias waiter',
    })).then(
      () => ({ status: 'fulfilled' as const }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    );
    void waiter.then(() => { waiterSettled = true; });
    await flushAsync();
    expect(waiterSettled).toBe(false);

    pause.release();
    await rename;
    const waiterResult = await waiter;
    expect(waiterResult.status).toBe('fulfilled');
    const inspection = await makeStore(adapter).inspect('papers/ORIGINAL.pdf');
    expect(inspection.kind).toBe('valid');
    if (inspection.kind === 'valid') expect(inspection.markdown).toBe('# Alias waiter');
  });
});
