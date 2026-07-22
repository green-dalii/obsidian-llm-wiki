import { strFromU8, UnzipInflate } from 'fflate';
import { sanitizeMineruRelativePath } from './mineru-paths';

const MAX_ZIP_BYTES = 256 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 10_000;
const MAX_RETAINED_FILE_BYTES = 100 * 1024 * 1024;
const MAX_RETAINED_TOTAL_BYTES = 1024 * 1024 * 1024;
const STREAM_INPUT_CHUNK_BYTES = 1024;

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const DATA_DESCRIPTOR = 0x08074b50;
const MAX_EOCD_SEARCH_BYTES = 65_557;
const ZIP64_EXTRA_ID = 0x0001;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_DATA_DESCRIPTOR = 0x0008;
const FLAG_STRONG_ENCRYPTION = 0x0040;
const FLAG_UTF8 = 0x0800;
const FLAG_MASKED_HEADER = 0x2000;
const SUPPORTED_FLAGS = 0x0006 | FLAG_DATA_DESCRIPTOR | FLAG_UTF8;
const UNIX_FILE_TYPE_MASK = 0xf000;
const UNIX_REGULAR_FILE = 0x8000;
const DOS_VOLUME_LABEL = 0x08;
const DOS_DIRECTORY = 0x10;
const DOS_DEVICE = 0x40;

interface ArchiveEntry {
  archivePath: string;
  rawName: Uint8Array;
  flags: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  compression: number;
  localHeaderOffset: number;
  payloadOffset: number;
}

interface ParsedArchive {
  entries: ArchiveEntry[];
  byPath: Map<string, ArchiveEntry>;
}

interface PendingImageReference {
  directTarget?: string;
  label?: string;
}

export interface MineruArchiveImage {
  path: string;
  bytes: Uint8Array;
}

export interface MineruArchiveResult {
  markdown: string;
  markdownBytes: Uint8Array;
  images: MineruArchiveImage[];
}

export class MineruInvalidResultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MineruInvalidResultError';
  }
}

function invalid(message: string): never {
  throw new MineruInvalidResultError(message);
}

function readUint16(view: DataView, offset: number): number {
  if (offset < 0 || offset + 2 > view.byteLength) invalid('MinerU ZIP metadata is truncated.');
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  if (offset < 0 || offset + 4 > view.byteLength) invalid('MinerU ZIP metadata is truncated.');
  return view.getUint32(offset, true);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function decodeEntryName(bytes: Uint8Array, utf8: boolean): string {
  try {
    return strFromU8(bytes, !utf8);
  } catch {
    return invalid('MinerU ZIP contains an invalid entry name.');
  }
}

function validateExtraFields(extra: Uint8Array): void {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  let offset = 0;
  while (offset < extra.length) {
    if (offset + 4 > extra.length) invalid('MinerU ZIP contains malformed extra fields.');
    const id = readUint16(view, offset);
    const size = readUint16(view, offset + 2);
    offset += 4;
    if (offset + size > extra.length) invalid('MinerU ZIP contains malformed extra fields.');
    if (id === ZIP64_EXTRA_ID) invalid('ZIP64 MinerU entries are not supported.');
    offset += size;
  }
}

function validateFlags(flags: number, compression: number): void {
  if ((flags & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION | FLAG_MASKED_HEADER)) !== 0) {
    invalid('Encrypted MinerU ZIP entries are not supported.');
  }
  if ((flags & ~SUPPORTED_FLAGS) !== 0) {
    invalid('MinerU ZIP uses unsupported general-purpose flags.');
  }
  if (compression === 0 && (flags & 0x0006) !== 0) {
    invalid('Stored MinerU ZIP entries use invalid compression flags.');
  }
}

function validateEntryType(externalAttributes: number): void {
  const dosAttributes = externalAttributes & 0xff;
  if ((dosAttributes & (DOS_VOLUME_LABEL | DOS_DIRECTORY | DOS_DEVICE)) !== 0) {
    invalid('MinerU ZIP contains a DOS/NTFS non-file entry.');
  }

  const fileType = (externalAttributes >>> 16) & UNIX_FILE_TYPE_MASK;
  if (fileType !== 0 && fileType !== UNIX_REGULAR_FILE) {
    invalid('MinerU ZIP contains a symlink or special-file entry.');
  }
}

function findEndOfCentralDirectory(bytes: Uint8Array, view: DataView): number {
  const minimumOffset = Math.max(0, bytes.length - MAX_EOCD_SEARCH_BYTES);
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readUint32(view, offset) !== END_OF_CENTRAL_DIRECTORY) continue;
    const commentLength = readUint16(view, offset + 20);
    if (offset + 22 + commentLength === bytes.length) return offset;
  }
  return invalid('MinerU result is not a valid ZIP archive.');
}

function parseDataDescriptor(
  view: DataView,
  start: number,
  end: number,
  entry: ArchiveEntry
): void {
  const length = end - start;
  let offset = start;
  if (length === 16) {
    if (readUint32(view, offset) !== DATA_DESCRIPTOR) {
      invalid('MinerU ZIP data descriptor signature is invalid.');
    }
    offset += 4;
  } else if (length !== 12) {
    invalid('MinerU ZIP data descriptor has an invalid length.');
  }

  if (
    readUint32(view, offset) !== entry.crc32 ||
    readUint32(view, offset + 4) !== entry.compressedSize ||
    readUint32(view, offset + 8) !== entry.uncompressedSize
  ) {
    invalid('MinerU ZIP data descriptor does not match central metadata.');
  }
}

function localValueMatches(value: number, expected: number, descriptor: boolean): boolean {
  return value === expected || (descriptor && value === 0);
}

function validateLocalRecords(
  bytes: Uint8Array,
  view: DataView,
  entries: ArchiveEntry[],
  centralOffset: number
): void {
  const ordered = [...entries].sort((left, right) => left.localHeaderOffset - right.localHeaderOffset);
  if (ordered.length > 0 && ordered[0].localHeaderOffset !== 0) {
    invalid('MinerU ZIP contains data before its local file records.');
  }

  const offsets = new Set<number>();
  let expectedOffset = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const entry = ordered[index];
    if (offsets.has(entry.localHeaderOffset) || entry.localHeaderOffset !== expectedOffset) {
      invalid('MinerU ZIP local records are missing, duplicated, or unexpected.');
    }
    offsets.add(entry.localHeaderOffset);
    if (readUint32(view, entry.localHeaderOffset) !== LOCAL_FILE_HEADER) {
      invalid('MinerU ZIP local file header is missing.');
    }

    const flags = readUint16(view, entry.localHeaderOffset + 6);
    const compression = readUint16(view, entry.localHeaderOffset + 8);
    const crc32 = readUint32(view, entry.localHeaderOffset + 14);
    const compressedSize = readUint32(view, entry.localHeaderOffset + 18);
    const uncompressedSize = readUint32(view, entry.localHeaderOffset + 22);
    const nameLength = readUint16(view, entry.localHeaderOffset + 26);
    const extraLength = readUint16(view, entry.localHeaderOffset + 28);
    const nameStart = entry.localHeaderOffset + 30;
    const extraStart = nameStart + nameLength;
    const payloadOffset = extraStart + extraLength;
    if (payloadOffset > centralOffset) invalid('MinerU ZIP local file header is truncated.');

    const rawName = bytes.subarray(nameStart, extraStart);
    if (!bytesEqual(rawName, entry.rawName)) {
      invalid('MinerU ZIP local filename does not match central metadata.');
    }
    if (flags !== entry.flags || compression !== entry.compression) {
      invalid('MinerU ZIP local flags or method do not match central metadata.');
    }
    validateFlags(flags, compression);
    validateExtraFields(bytes.subarray(extraStart, payloadOffset));

    const descriptor = (flags & FLAG_DATA_DESCRIPTOR) !== 0;
    if (
      !localValueMatches(crc32, entry.crc32, descriptor) ||
      !localValueMatches(compressedSize, entry.compressedSize, descriptor) ||
      !localValueMatches(uncompressedSize, entry.uncompressedSize, descriptor)
    ) {
      invalid('MinerU ZIP local sizes or CRC do not match central metadata.');
    }

    const payloadEnd = payloadOffset + entry.compressedSize;
    const nextOffset = ordered[index + 1]?.localHeaderOffset ?? centralOffset;
    if (payloadEnd > nextOffset) invalid('MinerU ZIP compressed payload exceeds its record.');
    if (descriptor) {
      parseDataDescriptor(view, payloadEnd, nextOffset, entry);
    } else if (payloadEnd !== nextOffset) {
      invalid('MinerU ZIP contains an extra or unindexed local record.');
    }

    entry.payloadOffset = payloadOffset;
    expectedOffset = nextOffset;
  }

  if (expectedOffset !== centralOffset) {
    invalid('MinerU ZIP local records do not cover the indexed payload region.');
  }
}

function parseArchive(bytes: Uint8Array): ParsedArchive {
  if (bytes.length > MAX_ZIP_BYTES) invalid('MinerU ZIP exceeds the input size limit.');
  if (bytes.length < 22) invalid('MinerU result is not a valid ZIP archive.');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes, view);
  const diskNumber = readUint16(view, eocdOffset + 4);
  const centralDisk = readUint16(view, eocdOffset + 6);
  const entriesOnDisk = readUint16(view, eocdOffset + 8);
  const entryCount = readUint16(view, eocdOffset + 10);
  const centralSize = readUint32(view, eocdOffset + 12);
  const centralOffset = readUint32(view, eocdOffset + 16);

  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    invalid('Multi-disk MinerU ZIP archives are not supported.');
  }
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    invalid('ZIP64 MinerU archives are not supported.');
  }
  if (entryCount > MAX_ZIP_ENTRIES) invalid('MinerU ZIP contains too many entries.');
  if (centralOffset + centralSize !== eocdOffset) {
    invalid('MinerU ZIP central directory is inconsistent.');
  }

  const entries: ArchiveEntry[] = [];
  const byPath = new Map<string, ArchiveEntry>();
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, offset) !== CENTRAL_FILE_HEADER) {
      invalid('MinerU ZIP central directory is malformed.');
    }

    const flags = readUint16(view, offset + 8);
    const compression = readUint16(view, offset + 10);
    const crc32 = readUint32(view, offset + 16);
    const compressedSize = readUint32(view, offset + 20);
    const uncompressedSize = readUint32(view, offset + 24);
    const nameLength = readUint16(view, offset + 28);
    const extraLength = readUint16(view, offset + 30);
    const entryCommentLength = readUint16(view, offset + 32);
    const diskStart = readUint16(view, offset + 34);
    const externalAttributes = readUint32(view, offset + 38);
    const localHeaderOffset = readUint32(view, offset + 42);
    const nameStart = offset + 46;
    const extraStart = nameStart + nameLength;
    const commentStart = extraStart + extraLength;
    const nextOffset = commentStart + entryCommentLength;
    if (nextOffset > eocdOffset) invalid('MinerU ZIP entry metadata is truncated.');

    validateFlags(flags, compression);
    if (compression !== 0 && compression !== 8) {
      invalid('MinerU ZIP uses an unsupported compression method.');
    }
    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      invalid('ZIP64 MinerU entries are not supported.');
    }
    if (diskStart !== 0) invalid('Multi-disk MinerU ZIP entries are not supported.');
    validateEntryType(externalAttributes);
    validateExtraFields(bytes.subarray(extraStart, commentStart));

    const rawName = bytes.slice(nameStart, extraStart);
    const decodedName = decodeEntryName(rawName, (flags & FLAG_UTF8) !== 0);
    let archivePath: string;
    try {
      archivePath = sanitizeMineruRelativePath(decodedName);
    } catch {
      return invalid('MinerU ZIP contains an unsafe entry path.');
    }
    if (byPath.has(archivePath)) invalid('MinerU ZIP contains duplicate entry paths.');

    const entry: ArchiveEntry = {
      archivePath,
      rawName,
      flags,
      crc32,
      compressedSize,
      uncompressedSize,
      compression,
      localHeaderOffset,
      payloadOffset: -1,
    };
    entries.push(entry);
    byPath.set(archivePath, entry);
    offset = nextOffset;
  }

  if (offset !== eocdOffset) invalid('MinerU ZIP central directory size is inconsistent.');
  validateLocalRecords(bytes, view, entries, centralOffset);
  return { entries, byPath };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function updateCrc32(state: number, bytes: Uint8Array): number {
  let crc = state;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return crc >>> 0;
}

function extractEntry(
  bytes: Uint8Array,
  entry: ArchiveEntry,
  initialRetainedBytes: number
): Uint8Array {
  if (entry.uncompressedSize > MAX_RETAINED_FILE_BYTES) {
    invalid('MinerU retained file exceeds the per-file limit.');
  }
  if (initialRetainedBytes + entry.uncompressedSize > MAX_RETAINED_TOTAL_BYTES) {
    invalid('MinerU retained content exceeds the total limit.');
  }

  const output = new Uint8Array(entry.uncompressedSize);
  let outputOffset = 0;
  let crcState = 0xffffffff;
  let finished = false;
  let failure: MineruInvalidResultError | undefined;

  const consume = (error: Error | null, chunk: Uint8Array | null, final: boolean): void => {
    if (failure) return;
    if (error || !chunk) {
      failure = new MineruInvalidResultError('MinerU ZIP entry could not be decompressed.');
      return;
    }
    if (
      outputOffset + chunk.length > entry.uncompressedSize ||
      outputOffset + chunk.length > MAX_RETAINED_FILE_BYTES ||
      initialRetainedBytes + outputOffset + chunk.length > MAX_RETAINED_TOTAL_BYTES
    ) {
      failure = new MineruInvalidResultError('MinerU ZIP emitted more retained content than declared.');
      return;
    }

    output.set(chunk, outputOffset);
    outputOffset += chunk.length;
    crcState = updateCrc32(crcState, chunk);
    if (final) finished = true;
  };

  const compressedEnd = entry.payloadOffset + entry.compressedSize;
  try {
    if (entry.compression === 0) {
      if (entry.compressedSize === 0) consume(null, new Uint8Array(), true);
      for (let offset = entry.payloadOffset; offset < compressedEnd; offset += STREAM_INPUT_CHUNK_BYTES) {
        const end = Math.min(compressedEnd, offset + STREAM_INPUT_CHUNK_BYTES);
        consume(null, bytes.subarray(offset, end), end === compressedEnd);
        if (failure) throw failure;
      }
    } else {
      const inflater = new UnzipInflate();
      inflater.ondata = consume;
      for (let offset = entry.payloadOffset; offset < compressedEnd; offset += STREAM_INPUT_CHUNK_BYTES) {
        const end = Math.min(compressedEnd, offset + STREAM_INPUT_CHUNK_BYTES);
        inflater.push(bytes.subarray(offset, end), end === compressedEnd);
        if (failure) throw failure;
      }
    }
  } catch (error) {
    if (error instanceof MineruInvalidResultError) throw error;
    return invalid('MinerU ZIP entry could not be decompressed safely.');
  }

  if (failure) throw failure;
  if (!finished || outputOffset !== entry.uncompressedSize) {
    invalid('MinerU ZIP entry output size does not match central metadata.');
  }
  const crc32 = (crcState ^ 0xffffffff) >>> 0;
  if (crc32 !== entry.crc32) invalid('MinerU ZIP entry CRC32 does not match central metadata.');
  return output;
}

function decodeMarkdown(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return invalid('MinerU full.md is not valid UTF-8.');
  }
}

function normalizeReferenceLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

function maskInlineCodeAndEscapedImages(line: string): string {
  const characters = line.split('');
  for (let index = 0; index < line.length;) {
    if (line[index] === '`') {
      let runEnd = index + 1;
      while (line[runEnd] === '`') runEnd += 1;
      const marker = line.slice(index, runEnd);
      const close = line.indexOf(marker, runEnd);
      if (close >= 0) {
        for (let mask = index; mask < close + marker.length; mask += 1) characters[mask] = ' ';
        index = close + marker.length;
        continue;
      }
    }
    if (line[index] === '!') {
      let backslashes = 0;
      for (let cursor = index - 1; cursor >= 0 && line[cursor] === '\\'; cursor -= 1) {
        backslashes += 1;
      }
      if (backslashes % 2 === 1) characters[index] = ' ';
    }
    index += 1;
  }
  return characters.join('');
}

function parseMarkdownImageTargets(markdown: string): string[] {
  const definitions = new Map<string, string>();
  const references: PendingImageReference[] = [];
  let fenceCharacter: string | undefined;
  let fenceLength = 0;

  for (const line of markdown.split(/\r?\n/)) {
    if (fenceCharacter) {
      const closing = line.match(/^ {0,3}(`+|~+)\s*$/);
      if (closing && closing[1][0] === fenceCharacter && closing[1].length >= fenceLength) {
        fenceCharacter = undefined;
        fenceLength = 0;
      }
      continue;
    }
    const opening = line.match(/^ {0,3}(`{3,})[^`]*$/) ?? line.match(/^ {0,3}(~{3,}).*$/);
    if (opening) {
      fenceCharacter = opening[1][0];
      fenceLength = opening[1].length;
      continue;
    }

    const visibleLine = maskInlineCodeAndEscapedImages(line);
    const definition = visibleLine.match(
      /^ {0,3}\[([^\]]+)\]:[ \t]*(?:<([^>]+)>|(\S+))(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/
    );
    if (definition) {
      const label = normalizeReferenceLabel(definition[1]);
      if (!definitions.has(label)) definitions.set(label, definition[2] ?? definition[3]);
      continue;
    }

    const inlinePattern = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
    for (const match of visibleLine.matchAll(inlinePattern)) {
      references.push({ directTarget: match[1] ?? match[2] });
    }

    const referencePattern = /!\[([^\]]*)\](?:\[([^\]]*)\])?/g;
    for (const match of visibleLine.matchAll(referencePattern)) {
      const end = (match.index ?? 0) + match[0].length;
      if (visibleLine[end] === '(') continue;
      const label = match[2] === undefined || match[2] === '' ? match[1] : match[2];
      references.push({ label: normalizeReferenceLabel(label) });
    }
  }

  return references.map((reference) => {
    const encodedTarget = reference.directTarget ?? definitions.get(reference.label ?? '');
    if (!encodedTarget) invalid('MinerU Markdown image reference has no definition.');
    try {
      return decodeURIComponent(encodedTarget);
    } catch {
      return invalid('MinerU Markdown contains an invalid image reference.');
    }
  });
}

function resolveReferencedImages(
  markdown: string,
  markdownEntry: ArchiveEntry,
  archive: ParsedArchive
): Array<{ outputPath: string; entry: ArchiveEntry }> {
  const outputRoot = markdownEntry.archivePath.split('/');
  outputRoot.pop();
  const selected = new Map<string, { outputPath: string; entry: ArchiveEntry }>();

  for (const target of parseMarkdownImageTargets(markdown)) {
    let outputPath: string;
    try {
      outputPath = sanitizeMineruRelativePath(target);
    } catch {
      return invalid('MinerU Markdown contains an unsafe image reference.');
    }

    const outputSegments = outputPath.split('/');
    if (outputSegments[0] !== 'images' || outputSegments.length < 2) {
      invalid('MinerU Markdown images must be located below images/.');
    }

    const archiveSegments = [...outputRoot, ...outputSegments];
    if (!outputRoot.every((segment, index) => archiveSegments[index] === segment)) {
      invalid('MinerU Markdown image escapes the result root.');
    }
    const archivePath = archiveSegments.join('/');
    const entry = archive.byPath.get(archivePath);
    if (!entry) invalid(`MinerU ZIP is missing referenced image ${outputPath}.`);
    selected.set(archivePath, { outputPath, entry });
  }

  return [...selected.values()];
}

export function extractMineruArchive(bytes: Uint8Array): MineruArchiveResult {
  const archive = parseArchive(bytes);
  const markdownEntries = archive.entries.filter((entry) => {
    const segments = entry.archivePath.split('/');
    return segments[segments.length - 1] === 'full.md';
  });
  if (markdownEntries.length !== 1) {
    invalid('MinerU ZIP must contain exactly one file named full.md.');
  }

  const markdownEntry = markdownEntries[0];
  const markdownBytes = extractEntry(bytes, markdownEntry, 0);
  const markdown = decodeMarkdown(markdownBytes);
  const referencedImages = resolveReferencedImages(markdown, markdownEntry, archive);

  let retainedBytes = markdownBytes.length;
  for (const { entry } of referencedImages) {
    if (entry.uncompressedSize > MAX_RETAINED_FILE_BYTES) {
      invalid('MinerU referenced image exceeds the retained file limit.');
    }
    retainedBytes += entry.uncompressedSize;
    if (retainedBytes > MAX_RETAINED_TOTAL_BYTES) {
      invalid('MinerU retained content exceeds the total limit.');
    }
  }

  retainedBytes = markdownBytes.length;
  const images = referencedImages.map(({ outputPath, entry }) => {
    const imageBytes = extractEntry(bytes, entry, retainedBytes);
    retainedBytes += imageBytes.length;
    return { path: outputPath, bytes: imageBytes };
  });

  return { markdown, markdownBytes, images };
}
