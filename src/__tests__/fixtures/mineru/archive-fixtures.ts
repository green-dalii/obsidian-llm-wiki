import { strToU8, zipSync } from 'fflate';
import type { ZipOptions, Zippable } from 'fflate';

const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const DATA_DESCRIPTOR = 0x08074b50;

interface ZipEntryOffsets {
  centralOffset: number;
  localOffset: number;
  payloadEnd: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
}

export function text(value: string): Uint8Array {
  return strToU8(value);
}

export function makeMineruZip(files: Zippable): Uint8Array {
  return zipSync(files, { level: 9 });
}

export function unixEntry(
  bytes: Uint8Array,
  mode: number
): [Uint8Array, ZipOptions] {
  return [bytes, { os: 3, attrs: mode << 16 }];
}

function findEocd(view: DataView): number {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error('Missing EOCD');
}

function findEntry(result: Uint8Array, entryName: string): ZipEntryOffsets {
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const decoder = new TextDecoder();

  for (let offset = 0; offset <= result.length - 46; offset += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_FILE_HEADER) continue;
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = decoder.decode(result.subarray(offset + 46, offset + 46 + nameLength));
    if (name === entryName) {
      const localOffset = view.getUint32(offset + 42, true);
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const compressedSize = view.getUint32(offset + 20, true);
      return {
        centralOffset: offset,
        localOffset,
        payloadEnd: localOffset + 30 + localNameLength + localExtraLength + compressedSize,
        crc32: view.getUint32(offset + 16, true),
        compressedSize,
        uncompressedSize: view.getUint32(offset + 24, true),
      };
    }
    offset += 45 + nameLength + extraLength + commentLength;
  }

  throw new Error(`Missing ZIP entry ${entryName}`);
}

export function forgeUncompressedSize(
  archive: Uint8Array,
  entryName: string,
  declaredSize: number
): Uint8Array {
  const result = archive.slice();
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const decoder = new TextDecoder();
  let found = false;

  for (let offset = 0; offset <= result.length - 46; offset += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_FILE_HEADER) continue;
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = decoder.decode(result.subarray(offset + 46, offset + 46 + nameLength));
    if (name === entryName) {
      const localOffset = view.getUint32(offset + 42, true);
      if (view.getUint32(localOffset, true) !== LOCAL_FILE_HEADER) {
        throw new Error(`Missing local header for ${entryName}`);
      }
      view.setUint32(offset + 24, declaredSize, true);
      view.setUint32(localOffset + 22, declaredSize, true);
      found = true;
    }
    offset += 45 + nameLength + extraLength + commentLength;
  }

  if (!found) throw new Error(`Missing ZIP entry ${entryName}`);
  return result;
}

export function forgeCrc(
  archive: Uint8Array,
  entryName: string,
  crc32: number
): Uint8Array {
  const result = archive.slice();
  const entry = findEntry(result, entryName);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint32(entry.centralOffset + 16, crc32, true);
  view.setUint32(entry.localOffset + 14, crc32, true);
  return result;
}

export function forgeLocalName(
  archive: Uint8Array,
  entryName: string,
  replacement: string
): Uint8Array {
  const result = archive.slice();
  const entry = findEntry(result, entryName);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const replacementBytes = text(replacement);
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  if (replacementBytes.length !== nameLength) throw new Error('Replacement length mismatch');
  result.set(replacementBytes, entry.localOffset + 30);
  return result;
}

export function forgeLocalFlags(
  archive: Uint8Array,
  entryName: string,
  flags: number
): Uint8Array {
  const result = archive.slice();
  const entry = findEntry(result, entryName);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint16(entry.localOffset + 6, flags, true);
  return result;
}

export function forgeLocalMethod(
  archive: Uint8Array,
  entryName: string,
  method: number
): Uint8Array {
  const result = archive.slice();
  const entry = findEntry(result, entryName);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint16(entry.localOffset + 8, method, true);
  return result;
}

export function forgeMissingLocalHeader(
  archive: Uint8Array,
  entryName: string
): Uint8Array {
  const result = archive.slice();
  const entry = findEntry(result, entryName);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint32(entry.localOffset, 0, true);
  return result;
}

export function forgeDuplicateLocalOffset(
  archive: Uint8Array,
  targetEntry: string,
  sourceEntry: string
): Uint8Array {
  const result = archive.slice();
  const target = findEntry(result, targetEntry);
  const source = findEntry(result, sourceEntry);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint32(target.centralOffset + 42, source.localOffset, true);
  return result;
}

export function forgeMadeByOs(
  archive: Uint8Array,
  entryName: string,
  os: number
): Uint8Array {
  const result = archive.slice();
  const entry = findEntry(result, entryName);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const version = view.getUint16(entry.centralOffset + 4, true) & 0xff;
  view.setUint16(entry.centralOffset + 4, version | (os << 8), true);
  return result;
}

export function withDataDescriptor(
  archive: Uint8Array,
  entryName: string,
  includeSignature: boolean
): Uint8Array {
  const entry = findEntry(archive, entryName);
  const oldView = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const oldEocd = findEocd(oldView);
  const descriptorLength = includeSignature ? 16 : 12;
  const result = new Uint8Array(archive.length + descriptorLength);
  result.set(archive.subarray(0, entry.payloadEnd));
  result.set(archive.subarray(entry.payloadEnd), entry.payloadEnd + descriptorLength);
  const view = new DataView(result.buffer);
  let descriptorOffset = entry.payloadEnd;
  if (includeSignature) {
    view.setUint32(descriptorOffset, DATA_DESCRIPTOR, true);
    descriptorOffset += 4;
  }
  view.setUint32(descriptorOffset, entry.crc32, true);
  view.setUint32(descriptorOffset + 4, entry.compressedSize, true);
  view.setUint32(descriptorOffset + 8, entry.uncompressedSize, true);

  view.setUint16(entry.localOffset + 6, oldView.getUint16(entry.localOffset + 6, true) | 8, true);
  view.setUint32(entry.localOffset + 14, 0, true);
  view.setUint32(entry.localOffset + 18, 0, true);
  view.setUint32(entry.localOffset + 22, 0, true);

  const newCentralOffset = entry.centralOffset + descriptorLength;
  view.setUint16(newCentralOffset + 8, oldView.getUint16(entry.centralOffset + 8, true) | 8, true);
  const newEocd = oldEocd + descriptorLength;
  view.setUint32(newEocd + 16, oldView.getUint32(oldEocd + 16, true) + descriptorLength, true);
  return result;
}

export function forgeDataDescriptorCrc(
  archive: Uint8Array,
  entryName: string,
  crc32: number
): Uint8Array {
  const result = archive.slice();
  const entry = findEntry(result, entryName);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const hasSignature = view.getUint32(entry.payloadEnd, true) === DATA_DESCRIPTOR;
  view.setUint32(entry.payloadEnd + (hasSignature ? 4 : 0), crc32, true);
  return result;
}

export function insertExtraLocalRecord(
  archive: Uint8Array,
  extraArchive: Uint8Array
): Uint8Array {
  const archiveView = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const extraView = new DataView(extraArchive.buffer, extraArchive.byteOffset, extraArchive.byteLength);
  const archiveEocd = findEocd(archiveView);
  const centralOffset = archiveView.getUint32(archiveEocd + 16, true);
  const extraEocd = findEocd(extraView);
  const extraCentralOffset = extraView.getUint32(extraEocd + 16, true);
  const extraLocal = extraArchive.subarray(0, extraCentralOffset);
  const result = new Uint8Array(archive.length + extraLocal.length);
  result.set(archive.subarray(0, centralOffset));
  result.set(extraLocal, centralOffset);
  result.set(archive.subarray(centralOffset), centralOffset + extraLocal.length);
  const view = new DataView(result.buffer);
  const newEocd = archiveEocd + extraLocal.length;
  view.setUint32(newEocd + 16, centralOffset + extraLocal.length, true);
  return result;
}
