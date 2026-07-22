import { UnzipInflate } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import {
  extractMineruArchive,
  MineruInvalidResultError,
} from '../../core/pdf-backends/mineru-archive';
import {
  forgeCrc,
  forgeDataDescriptorCrc,
  forgeDuplicateLocalOffset,
  forgeLocalFlags,
  forgeLocalMethod,
  forgeLocalName,
  forgeMadeByOs,
  forgeMissingLocalHeader,
  forgeUncompressedSize,
  insertExtraLocalRecord,
  makeMineruZip,
  text,
  unixEntry,
  withDataDescriptor,
} from '../fixtures/mineru/archive-fixtures';

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

describe('extractMineruArchive', () => {
  it('extracts one basename full.md and only its referenced Unicode images', () => {
    const archive = makeMineruZip({
      '任务/full.md': text('# 标题\n\n![图像](<images/图 像.png>)\n'),
      '任务/images/图 像.png': new Uint8Array([1, 2, 3]),
      '任务/images/unreferenced.png': new Uint8Array([9, 9, 9]),
      '任务/notes.txt': text('ignored'),
    });

    const result = extractMineruArchive(archive);

    expect(result.markdown).toBe('# 标题\n\n![图像](<images/图 像.png>)\n');
    expect(result.markdownBytes).toEqual(text(result.markdown));
    expect(result.images).toEqual([
      { path: 'images/图 像.png', bytes: new Uint8Array([1, 2, 3]) },
    ]);
  });

  it.each([true, false])(
    'accepts a valid data descriptor with signature=%s',
    (includeSignature) => {
      const archive = makeMineruZip({ 'result/full.md': text('# Descriptor') });
      const descriptorArchive = withDataDescriptor(
        archive,
        'result/full.md',
        includeSignature
      );

      expect(extractMineruArchive(descriptorArchive).markdown).toBe('# Descriptor');
    }
  );

  it('rejects a data descriptor that disagrees with central metadata', () => {
    const archive = withDataDescriptor(
      makeMineruZip({ 'result/full.md': text('# Descriptor') }),
      'result/full.md',
      true
    );
    const corrupt = forgeDataDescriptorCrc(archive, 'result/full.md', 0x12345678);

    expect(() => extractMineruArchive(corrupt)).toThrow(MineruInvalidResultError);
  });

  it.each([
    ['local filename', (zip: Uint8Array) => forgeLocalName(zip, 'result/full.md', 'result/fool.md')],
    ['local flags', (zip: Uint8Array) => forgeLocalFlags(zip, 'result/full.md', 0x800)],
    ['local method', (zip: Uint8Array) => forgeLocalMethod(zip, 'result/full.md', 0)],
    [
      'extra local record',
      (zip: Uint8Array) => insertExtraLocalRecord(
        zip,
        makeMineruZip({ 'extra.txt': text('not in central directory') })
      ),
    ],
  ])('rejects central/local mismatch in %s', (_label, mutate) => {
    const archive = makeMineruZip({ 'result/full.md': text('# Safe binding') });
    expect(() => extractMineruArchive(mutate(archive))).toThrow(MineruInvalidResultError);
  });

  it('rejects missing and duplicate local records', () => {
    const single = makeMineruZip({ 'result/full.md': text('# Missing') });
    expect(() => extractMineruArchive(forgeMissingLocalHeader(single, 'result/full.md')))
      .toThrow(MineruInvalidResultError);

    const multiple = makeMineruZip({
      'result/full.md': text('# Duplicate'),
      'result/other.txt': text('other'),
    });
    const duplicate = forgeDuplicateLocalOffset(
      multiple,
      'result/other.txt',
      'result/full.md'
    );
    expect(() => extractMineruArchive(duplicate)).toThrow(MineruInvalidResultError);
  });

  it('rejects ZIP64 extra fields even without sentinel sizes', () => {
    const archive = makeMineruZip({
      'result/full.md': [text('# ZIP64 extra'), { extra: { 1: new Uint8Array(8) } }],
    });

    expect(() => extractMineruArchive(archive)).toThrow(MineruInvalidResultError);
  });

  it('rejects corrupt but still inflatable retained content by CRC32', () => {
    const archive = makeMineruZip({ 'result/full.md': text('# Inflates') });
    const corrupt = forgeCrc(archive, 'result/full.md', 0x12345678);

    expect(() => extractMineruArchive(corrupt)).toThrow(MineruInvalidResultError);
  });

  it.each([
    ['forward traversal', '../escaped.txt'],
    ['backslash traversal', '..\\escaped.txt'],
    ['absolute path', '/escaped.txt'],
    ['Windows drive path', 'C:\\escaped.txt'],
    ['UNC path', '\\\\server\\share\\escaped.txt'],
    ['empty segment', 'result//escaped.txt'],
    ['dot segment', 'result/./escaped.txt'],
  ])('rejects %s entries before returning output', (_label, maliciousPath) => {
    const archive = makeMineruZip({
      'result/full.md': text('# Safe'),
      [maliciousPath]: text('escape'),
    });

    expect(() => extractMineruArchive(archive)).toThrow(MineruInvalidResultError);
  });

  it('rejects NUL paths', () => {
    const archive = makeMineruZip({
      'result/full.md': text('# Safe'),
      'result/evil\0name': text('escape'),
    });

    expect(() => extractMineruArchive(archive)).toThrow(MineruInvalidResultError);
  });

  it.each([
    ['symlink', 0o120777],
    ['character device', 0o020666],
    ['FIFO', 0o010644],
  ])('rejects Unix %s entries', (_label, mode) => {
    const archive = makeMineruZip({
      'result/full.md': text('# Safe'),
      'result/images/special': unixEntry(text('target'), mode),
    });

    expect(() => extractMineruArchive(archive)).toThrow(MineruInvalidResultError);
  });

  it('rejects special high mode bits even when made-by OS is forged as DOS', () => {
    const archive = makeMineruZip({
      'result/full.md': text('# Safe'),
      'result/images/special': unixEntry(text('target'), 0o120777),
    });
    const forgedOs = forgeMadeByOs(archive, 'result/images/special', 0);

    expect(() => extractMineruArchive(forgedOs)).toThrow(MineruInvalidResultError);
  });

  it('requires exactly one entry whose basename is full.md', () => {
    expect(() => extractMineruArchive(makeMineruZip({ 'result/readme.md': text('x') })))
      .toThrow(MineruInvalidResultError);

    const duplicate = makeMineruZip({
      'one/full.md': text('one'),
      'two/full.md': text('two'),
    });
    expect(() => extractMineruArchive(duplicate)).toThrow(MineruInvalidResultError);
  });

  it.each([
    ['missing image', '![x](images/missing.png)'],
    ['parent escape', '![x](../images/escape.png)'],
    ['non-images resource', '![x](assets/image.png)'],
    ['prefix confusion', '![x](../result-evil/images/image.png)'],
  ])('rejects %s references', (_label, markdown) => {
    const archive = makeMineruZip({
      'result/full.md': text(markdown),
      'result-evil/images/image.png': new Uint8Array([1]),
    });

    expect(() => extractMineruArchive(archive)).toThrow(MineruInvalidResultError);
  });

  it('supports reference-style images while ignoring code and escaped syntax', () => {
    const markdown = [
      '![inline](images/inline.png)',
      '![diagram][hero]',
      '![collapsed][]',
      '[hero]: <images/reference.png> "Reference"',
      '[collapsed]: images/collapsed.png',
      '\\![escaped](images/missing-escaped.png)',
      '`![inline-code](images/missing-inline-code.png)`',
      '```md',
      '![fenced](images/missing-fenced.png)',
      '```',
    ].join('\n');
    const archive = makeMineruZip({
      'result/full.md': text(markdown),
      'result/images/inline.png': new Uint8Array([1]),
      'result/images/reference.png': new Uint8Array([2]),
      'result/images/collapsed.png': new Uint8Array([3]),
    });

    expect(extractMineruArchive(archive).images).toEqual([
      { path: 'images/inline.png', bytes: new Uint8Array([1]) },
      { path: 'images/reference.png', bytes: new Uint8Array([2]) },
      { path: 'images/collapsed.png', bytes: new Uint8Array([3]) },
    ]);
  });

  it('parses CRLF reference definitions and ignores CRLF fenced code', () => {
    const markdown = [
      '![diagram][hero]',
      '[hero]: images/reference.png',
      '```md',
      '![fenced](images/missing-fenced.png)',
      '```',
    ].join('\r\n');
    const archive = makeMineruZip({
      'result/full.md': text(markdown),
      'result/images/reference.png': new Uint8Array([1]),
    });

    expect(extractMineruArchive(archive).images).toEqual([
      { path: 'images/reference.png', bytes: new Uint8Array([1]) },
    ]);
  });

  it('uses UTF-16 code-unit indices when emoji precede ignored image syntax', () => {
    const markdown = [
      '😀😀 `![inline-code](images/missing-inline-code.png)` ![first](images/first.png)',
      '😀😀 \\![escaped](images/missing-escaped.png) ![second](images/second.png)',
    ].join('\n');
    const archive = makeMineruZip({
      'result/full.md': text(markdown),
      'result/images/first.png': new Uint8Array([7]),
      'result/images/second.png': new Uint8Array([8]),
    });

    expect(extractMineruArchive(archive).images).toEqual([
      { path: 'images/first.png', bytes: new Uint8Array([7]) },
      { path: 'images/second.png', bytes: new Uint8Array([8]) },
    ]);
  });

  it('keeps the first escaping duplicate reference definition', () => {
    const markdown = [
      '![diagram][hero]',
      '[hero]: ../images/escape.png',
      '[hero]: images/safe.png',
    ].join('\n');
    const archive = makeMineruZip({
      'result/full.md': text(markdown),
      'result/images/safe.png': new Uint8Array([1]),
    });

    expect(() => extractMineruArchive(archive)).toThrow(MineruInvalidResultError);
  });

  it('keeps the first safe duplicate reference definition', () => {
    const markdown = [
      '![diagram][hero]',
      '[hero]: images/safe.png',
      '[hero]: ../images/escape.png',
    ].join('\n');
    const archive = makeMineruZip({
      'result/full.md': text(markdown),
      'result/images/safe.png': new Uint8Array([1]),
    });

    expect(extractMineruArchive(archive).images).toEqual([
      { path: 'images/safe.png', bytes: new Uint8Array([1]) },
    ]);
  });

  it('allows backticks in tilde fence info strings', () => {
    const markdown = [
      '~~~`renderer`',
      '![fenced](images/missing-fenced.png)',
      '~~~',
      '![kept](images/kept.png)',
    ].join('\n');
    const archive = makeMineruZip({
      'result/full.md': text(markdown),
      'result/images/kept.png': new Uint8Array([4]),
    });

    expect(extractMineruArchive(archive).images).toEqual([
      { path: 'images/kept.png', bytes: new Uint8Array([4]) },
    ]);
  });

  it('enforces the ZIP input and entry-count boundaries before extraction', () => {
    expect(() => extractMineruArchive(new Uint8Array(256 * MiB + 1))).toThrow(
      MineruInvalidResultError
    );

    const files: Record<string, Uint8Array> = {
      'result/full.md': text('# Safe'),
    };
    for (let index = 0; index < 10_000; index += 1) {
      files[`result/unused-${index}.txt`] = new Uint8Array();
    }
    expect(() => extractMineruArchive(makeMineruZip(files))).toThrow(
      MineruInvalidResultError
    );
  });

  it('rejects retained files whose declared size exceeds the per-file cap', () => {
    const archive = makeMineruZip({ 'result/full.md': text('# Safe') });
    const forged = forgeUncompressedSize(archive, 'result/full.md', 100 * MiB + 1);

    expect(() => extractMineruArchive(forged)).toThrow(MineruInvalidResultError);
  });

  it('rejects retained metadata whose declared total exceeds one GiB', () => {
    const files: Record<string, Uint8Array> = {};
    const references: string[] = [];
    for (let index = 0; index < 11; index += 1) {
      const path = `result/images/image-${index}.png`;
      files[path] = new Uint8Array([index]);
      references.push(`![${index}](images/image-${index}.png)`);
    }
    files['result/full.md'] = text(references.join('\n'));

    let archive = makeMineruZip(files);
    for (let index = 0; index < 11; index += 1) {
      archive = forgeUncompressedSize(
        archive,
        `result/images/image-${index}.png`,
        100 * MiB
      );
    }

    expect(() => extractMineruArchive(archive)).toThrow(MineruInvalidResultError);
    expect(11 * 100 * MiB).toBeGreaterThan(GiB);
  });

  it('enforces the actual streamed output cap even when metadata claims a small file', () => {
    const oversizedMarkdown = new Uint8Array(100 * MiB + 1);
    const archive = makeMineruZip({ 'result/full.md': oversizedMarkdown });
    const forged = forgeUncompressedSize(archive, 'result/full.md', 1);
    const pushSpy = vi.spyOn(UnzipInflate.prototype, 'push');

    expect(() => extractMineruArchive(forged)).toThrow(MineruInvalidResultError);
    expect(pushSpy.mock.calls.length).toBeGreaterThan(0);
    expect(Math.max(...pushSpy.mock.calls.map(([chunk]) => chunk.length))).toBeLessThanOrEqual(
      1024
    );
    pushSpy.mockRestore();
  });
});
