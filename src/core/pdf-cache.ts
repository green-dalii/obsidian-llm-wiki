/**
 * v1.25.0 PDF Level 1 — PDF conversion cache.
 *
 * Stores converted PDF → Markdown results on disk, keyed by content hash.
 * Cache misses trigger the LLM conversion; hits skip the API call entirely.
 *
 * Cache directory: `.obsidian/plugins/karpathywiki/pdf-cache/{sha256}.json`
 * Each entry: { markdown, metadata: { title?, author?, pageCount?, convertedAt, converter } }
 *
 * TTL defaults to 30 days; expired entries are silently treated as misses.
 * Corrupt JSON files are removed (fail-open) so subsequent set() can write fresh.
 *
 * Cache growth management (three defense layers):
 * 1. Pre-write single-entry cap — skip writes for oversized entries
 * 2. Post-write size enforcement — LRU-by-mtime eviction when over cap
 * 3. Batch-start housekeeping — purgeExpired on folder ingest start
 *
 * Failure mode is graceful: cache write failures never block the caller
 * (the conversion result is returned regardless). Cache is performance,
 * not correctness.
 *
 * v1.25.1 Phase F3: refactored to compose `DiskCache<T>` from
 * `core/disk-cache.ts` — the filesystem ops (read/write/list/stat/
 * mkdir/LRU eviction) now live in the generic base class. This file
 * retains only the PDF-specific behavior: hashToken→filename mapping,
 * TTL check on read (via `metadata.convertedAt`), and the PDF-specific
 * warn tags.
 */

import type { App } from 'obsidian';
import {
  PDF_CACHE_TTL_MS,
  PDF_CACHE_MAX_BYTES,
  PDF_CACHE_MAX_ENTRIES,
  PDF_CACHE_MAX_SINGLE_ENTRY_BYTES,
} from '../constants';
import { DiskCache, isMissingDirError, type DiskCacheMaintenanceResult } from './disk-cache';

/**
 * Converter version baked into the cache key. Bump on prompt/system-prompt
 * changes so existing cache entries are treated as misses (forces a fresh
 * LLM call with the new prompt rather than silently returning stale output).
 */
export const PDF_CONVERTER_VERSION = 'v1.25.0';

/** Conversion metadata attached to each cache entry. */
export interface PdfCacheMetadata {
  title?: string;
  author?: string;
  pageCount?: number;
  convertedAt: string; // ISO date
  converter: string; // "<provider>/<model>"
}

/** A single cache entry. */
export interface PdfCacheEntry {
  markdown: string;
  metadata: PdfCacheMetadata;
}

/** Result of a purgeExpired / enforceSizeLimit call. Re-exported for back-compat. */
export type CacheMaintenanceResult = DiskCacheMaintenanceResult;

/**
 * Hashes a logical cache key into a short, filesystem-safe filename token
 * (16 hex chars ≈ 64 bits of entropy — collision-safe up to ~10⁹ entries
 * per the birthday bound; matches the Git short-hash convention).
 *
 * Why this exists (v1.25.0 PR3 follow-up #2, P0): the logical key carries
 * `:` and may carry `/` (model names like `anthropic/claude-opus-4-8`),
 * which Windows forbids in filenames and which on POSIX forms unintended
 * subpaths. Hashing the logical key once gives a stable, cross-platform
 * identifier for the on-disk file name. The full logical key is still
 * preserved at the converter layer for cache-hit semantics.
 */
export async function hashCacheKey(key: string, subtle?: SubtleCrypto): Promise<string> {
  if (!subtle) {
    throw new Error('hashCacheKey: SubtleCrypto is required. Inject it via ctx.subtle (production) or a test mock.');
  }
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(key));
  return bytesToHex(new Uint8Array(digest)).slice(0, 16);
}

/**
 * Returns the hex-encoded sha256 of the given bytes. The caller must
 * inject `SubtleCrypto` (from `activeWindow.crypto.subtle` in production).
 *
 * Throws when `subtle` is undefined — production code paths must always
 * have an injected implementation; tests that can't supply one should
 * mock a minimal SubtleCrypto (see `pdf-cache.test.ts`).
 */
export async function sha256Bytes(bytes: Uint8Array, subtle?: SubtleCrypto): Promise<string> {
  if (!subtle) {
    throw new Error('sha256Bytes: SubtleCrypto is required. Inject it via ctx.subtle (production) or a test mock.');
  }
  const digest = await subtle.digest('SHA-256', bytes as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

/**
 * PDF-specific wrapper around `DiskCache<PdfCacheEntry>`. Adds:
 *   - hashToken → `{hashToken}.json` filename mapping
 *   - TTL check on read (via `metadata.convertedAt`)
 *   - PDF-specific warn tags (`[pdf-cache]` instead of `[disk-cache]`)
 *
 * The underlying `DiskCache` handles all filesystem operations, the
 * three defense layers, and the LRU-by-mtime eviction.
 */
export class PdfConversionCache {
  private readonly inner: DiskCache<PdfCacheEntry>;
  private readonly ttlMs: number;

  constructor(opts: {
    cacheDir: string;
    adapter: App['vault']['adapter'];
    ttlMs?: number;
    maxBytes?: number;
    maxEntries?: number;
    maxSingleEntryBytes?: number;
  }) {
    this.ttlMs = opts.ttlMs ?? PDF_CACHE_TTL_MS;
    this.inner = new DiskCache<PdfCacheEntry>({
      cacheDir: opts.cacheDir,
      adapter: opts.adapter,
      ttlMs: this.ttlMs,
      maxBytes: opts.maxBytes ?? PDF_CACHE_MAX_BYTES,
      maxEntries: opts.maxEntries ?? PDF_CACHE_MAX_ENTRIES,
      maxSingleEntryBytes: opts.maxSingleEntryBytes ?? PDF_CACHE_MAX_SINGLE_ENTRY_BYTES,
    });
  }

  /**
   * Returns the entry for `hashToken` (the SHA-256 short-hash of the
   * logical cache key — produced by `hashCacheKey` at the caller).
   *
   * Returns null on miss / corrupt / expired.
   *
   * TTL check uses the entry's `convertedAt` (host-written at `set()` time
   * — not LLM-emitted). mtime-based sweep happens via `purgeExpired` from
   * housekeeping, so we don't add a per-hit `stat()` round-trip.
   */
  async get(hashToken: string): Promise<PdfCacheEntry | null> {
    const entry = await this.inner.get(this.fileName(hashToken));
    if (entry === null) return null;

    // Defense layer 3a: actively remove expired entries on read.
    const convertedAtMs = Date.parse(entry.metadata?.convertedAt ?? '');
    if (Number.isFinite(convertedAtMs) && Date.now() - convertedAtMs > this.ttlMs) {
      await this.inner.invalidate(this.fileName(hashToken));
      return null;
    }

    return entry;
  }

  /**
   * Writes the entry to disk under `{cacheDir}/{hashToken}.json`.
   *
   * Defense layer 1: rejects oversized single entries (>maxSingleEntryBytes).
   * Defense layer 2: enforces total cap after every write (LRU-by-mtime).
   * Both wrapped in try/catch so a flaky eviction stat call does not
   * propagate through set() → convertPdfToMarkdown and discard the
   * conversion result the user already paid for.
   */
  async set(hashToken: string, entry: PdfCacheEntry): Promise<void> {
    await this.inner.set(this.fileName(hashToken), entry);
  }

  /** Removes the entry for `hashToken`. No-op if absent. */
  async invalidate(hashToken: string): Promise<void> {
    await this.inner.invalidate(this.fileName(hashToken));
  }

  /** Removes all entries under `cacheDir`. */
  async clear(): Promise<CacheMaintenanceResult> {
    return this.inner.clear();
  }

  /**
   * Defense layer 3: removes all entries whose mtime is older than TTL.
   * Cheap heuristic — avoids reading every entry to inspect `convertedAt`.
   *
   * Called from `plugin onload` (via `performPdfCacheHousekeeping`) AND from
   * `WikiEngine.prepareBatchIngest` at the start of every batch ingest.
   */
  async purgeExpired(): Promise<CacheMaintenanceResult> {
    return this.inner.purgeExpired();
  }

  /**
   * Batch-start housekeeping: TTL purge + size cap enforcement in one call.
   *
   * Why this exists (v1.25.0 PR3 follow-up #2, P1): ROADMAP.md §118 promised
   * a batch-start housekeeping call, but `runBatchIngest` only fired
   * `purgeExpired` via plugin onload. A user who runs a fresh batch ingest
   * for the first time after months of disuse would otherwise see every
   * write trigger an LRU eviction of their oldest cached conversions — the
   * housekeeping didn't run between the TTL expiry and the new write.
   */
  async prepareBatchIngest(): Promise<{
    expired: CacheMaintenanceResult;
    size: CacheMaintenanceResult;
  }> {
    return this.inner.prepareBatchIngest();
  }

  /**
   * Defense layer 2: enforce hard caps on total bytes and entry count.
   * If either is exceeded, evict oldest entries first (LRU-by-mtime).
   */
  async enforceSizeLimit(): Promise<CacheMaintenanceResult> {
    return this.inner.enforceSizeLimit();
  }

  private fileName(hashToken: string): string {
    return `${hashToken}.json`;
  }
}

/**
 * Cache directory scheme: `.obsidian/plugins/karpathywiki/pdf-cache/`.
 * Centralized here so the 3 call sites (pdf-converter, main.ts clear,
 * main.ts housekeeping) cannot drift.
 */
export function getPdfCacheDir(app: { vault: { configDir: string } }): string {
  return `${app.vault.configDir}/plugins/karpathywiki/pdf-cache`;
}

/**
 * Factory for PdfConversionCache. Use this instead of `new PdfConversionCache(...)`
 * directly so the cacheDir + adapter shape stay consistent across all 3 call sites.
 */
export function createPdfCache(app: App): PdfConversionCache {
  return new PdfConversionCache({
    cacheDir: getPdfCacheDir(app),
    adapter: app.vault.adapter,
  });
}

// Re-export isMissingDirError so existing imports keep working.
export { isMissingDirError };