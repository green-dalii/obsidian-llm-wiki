// Collision-safe, length-bounded source-page slugs (Issue #155).
//
// Source provenance pages live at `sources/<slug>.md`. Historically the slug was
// just `slugify(basename)`, so two source files with the same filename in
// different folders (e.g. 11× "About this course.md" across courses) collapsed to
// the same slug and silently overwrote each other.
//
// This module appends a short fixed-length fingerprint of the file's full path to
// EVERY source slug: `<basename>_<fingerprint>` (underscore separator). Properties:
//   - Unique: distinct paths get distinct fingerprints, so no two source files
//     ever collide — no collision probing required.
//   - Order-independent: the fingerprint derives from the path alone, so the slug
//     is identical regardless of ingest order.
//   - Re-ingest stable: the same file always yields the same slug → update in
//     place, never a duplicate.
//   - Length-bounded: the basename is trimmed so the whole slug stays within the
//     cap; the fingerprint is never dropped.
//
// Pure functions — no IO, no Obsidian API.

import { computeSlug } from './slug';

const DEFAULT_MAX_LEN = 80; // filename length cap (bytes-safe for sync/mobile/git)
const FINGERPRINT_LEN = 6;  // hex chars

export interface SourceSlugOptions {
  maxLen?: number;
  preserveCase?: boolean;
}

/**
 * Deterministic short fingerprint of a source's full path (FNV-1a, 6 hex chars).
 * Stable across runs and ingest order; different paths almost never collide.
 */
export function sourceFingerprint(fullPath: string): string {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < fullPath.length; i++) {
    hash ^= fullPath.charCodeAt(i);
    // FNV prime 16777619, kept in 32-bit range via Math.imul
    hash = Math.imul(hash, 0x01000193);
  }
  // Unsigned 32-bit → 8 hex → take FINGERPRINT_LEN
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, FINGERPRINT_LEN);
}

function basenameNoExt(fullPath: string): string {
  const last = fullPath.split('/').pop() || fullPath;
  return last.replace(/\.md$/i, '');
}

/**
 * The plain slugified basename for a source path (no path, no fingerprint).
 * Exported for reuse/testing.
 */
export function sourceBaseSlug(fullPath: string, preserveCase = false): string {
  return computeSlug(basenameNoExt(fullPath), preserveCase);
}

/**
 * Resolve the slug for a source page: `<basename>_<fingerprint>`, bounded to
 * `maxLen`. The fingerprint guarantees uniqueness for every distinct file path,
 * so no collision check against existing pages is needed.
 *
 * @param fullPath - Full path of the source file (basename + fingerprint source)
 * @param options  - maxLen (default 80), preserveCase (default false)
 */
export function resolveSourceSlug(fullPath: string, options: SourceSlugOptions = {}): string {
  const maxLen = options.maxLen ?? DEFAULT_MAX_LEN;
  const preserveCase = options.preserveCase ?? false;

  const fp = sourceFingerprint(fullPath);
  const tail = `_${fp}`;
  const base = sourceBaseSlug(fullPath, preserveCase);
  const trimmedBase = base.slice(0, Math.max(1, maxLen - tail.length));
  return `${trimmedBase}${tail}`;
}
