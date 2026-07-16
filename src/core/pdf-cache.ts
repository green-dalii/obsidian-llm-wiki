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
 */

import type { App, DataAdapter } from 'obsidian';
import {
  PDF_CACHE_TTL_MS,
  PDF_CACHE_MAX_BYTES,
  PDF_CACHE_MAX_ENTRIES,
  PDF_CACHE_MAX_SINGLE_ENTRY_BYTES,
} from '../constants';

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

/** Stats for one cache entry (name + on-disk size + mtime). */
interface CacheEntryStat {
  name: string;
  path: string;
  size: number;
  mtime: number;
}

/** Result of a purgeExpired / enforceSizeLimit call. */
export interface CacheMaintenanceResult {
  removed: number;
  freedBytes: number;
}

/**
 * Re-export the Obsidian `DataAdapter` type so internal methods can use
 * `this.adapter` (which has the optional `stat` method Obsidian exposes)
 * without repeating `DataAdapter & {...}` casts at each call site.
 */
type StatCapableAdapter = DataAdapter;

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
 * Filesystem-backed cache for PDF→Markdown conversion results.
 *
 * Pure: takes a `DataAdapter` so it can be tested with an in-memory fake.
 * All methods are async to match Obsidian's adapter API.
 */
export class PdfConversionCache {
  private readonly cacheDir: string;
  private readonly adapter: StatCapableAdapter;
  private readonly ttlMs: number;
  private readonly maxBytes: number;
  private readonly maxEntries: number;
  private readonly maxSingleEntryBytes: number;

  constructor(opts: {
    cacheDir: string;
    adapter: DataAdapter;
    ttlMs?: number;
    maxBytes?: number;
    maxEntries?: number;
    maxSingleEntryBytes?: number;
  }) {
    this.cacheDir = opts.cacheDir;
    // `StatCapableAdapter` is structurally compatible with `DataAdapter`
    // (it only adds an optional method), so no runtime cast is needed.
    // The structural type lives at module scope for reuse across methods.
    this.adapter = opts.adapter;
    this.ttlMs = opts.ttlMs ?? PDF_CACHE_TTL_MS;
    this.maxBytes = opts.maxBytes ?? PDF_CACHE_MAX_BYTES;
    this.maxEntries = opts.maxEntries ?? PDF_CACHE_MAX_ENTRIES;
    this.maxSingleEntryBytes = opts.maxSingleEntryBytes ?? PDF_CACHE_MAX_SINGLE_ENTRY_BYTES;
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
    const path = this.entryPath(hashToken);
    let raw: string;
    try {
      raw = await this.adapter.read(path);
    } catch {
      return null;
    }

    let parsed: PdfCacheEntry;
    try {
      parsed = JSON.parse(raw) as PdfCacheEntry;
    } catch {
      // Corrupt file — remove so future set() can write fresh
      await this.adapter.remove(path).catch(() => undefined);
      return null;
    }

    // Defense layer 3a: actively remove expired entries on read.
    const convertedAtMs = Date.parse(parsed.metadata?.convertedAt ?? '');
    if (Number.isFinite(convertedAtMs) && Date.now() - convertedAtMs > this.ttlMs) {
      await this.adapter.remove(path).catch(() => undefined);
      return null;
    }

    return parsed;
  }

  /**
   * Writes the entry to disk under `{cacheDir}/{hashToken}.json`.
   *
   * Defense layer 1: rejects oversized single entries (>maxSingleEntryBytes)
   * so one giant PDF can't hog the entire cache. The caller still gets the
   * conversion result back via the return value of convertPdfToMarkdown —
   * cache write failure is performance-only, never correctness.
   */
  async set(hashToken: string, entry: PdfCacheEntry): Promise<void> {
    const path = this.entryPath(hashToken);
    const data = JSON.stringify(entry);
    const size = new TextEncoder().encode(data).length;

    if (size > this.maxSingleEntryBytes) {
      console.warn(
        `[pdf-cache] skipping cache write for ${hashToken}: ${size} bytes exceeds ` +
        `maxSingleEntryBytes=${this.maxSingleEntryBytes}`
      );
      return;
    }

    // Remove old entry first to free its size before enforcing the new cap
    await this.invalidate(hashToken).catch(() => undefined);

    try {
      await this.adapter.write(path, data);
    } catch (error) {
      console.warn(`[pdf-cache] write failed for ${hashToken}, continuing without cache:`, error);
      return;
    }

    // Defense layer 2: enforce total cap after every write (LRU-by-mtime)
    await this.enforceSizeLimit();
  }

  /** Removes the entry for `hashToken`. No-op if absent. */
  async invalidate(hashToken: string): Promise<void> {
    const path = this.entryPath(hashToken);
    try {
      await this.adapter.remove(path);
    } catch {
      // already gone
    }
  }

  /** Removes all entries under `cacheDir`. */
  async clear(): Promise<CacheMaintenanceResult> {
    const stats = await this.listCacheEntriesWithStats();
    const totalBytes = stats.reduce((sum, s) => sum + s.size, 0);

    // Parallelize removes — for large caches this turns O(n) sequential
    // adapter calls into O(1) wall-clock time (modulo adapter concurrency).
    await Promise.all(
      stats.map((s) => this.adapter.remove(s.path).catch(() => undefined))
    );
    return { removed: stats.length, freedBytes: totalBytes };
  }

  /**
   * Returns each entry under `cacheDir` with on-disk size + mtime. If the
   * adapter doesn't expose `stat`, falls back to a flat list with size=0
   * (so callers like `clear()` still iterate + remove every entry).
   */
  private async listCacheEntriesWithStats(): Promise<CacheEntryStat[]> {
    const names = await this.listCacheEntries();
    const adapter = this.adapter as DataAdapter & {
      stat?: (p: string) => Promise<{ size: number; mtime: number } | null>;
    };
    if (typeof adapter.stat !== 'function') {
      // No stat — produce zero-size entries so listCacheEntriesWithStats still
      // returns the full list (and `clear` / `enforceSizeLimit` can act on it).
      return names.map((name) => ({
        name,
        path: this.entryPath(name),
        size: 0,
        mtime: 0,
      }));
    }
    const stats = await Promise.all(
      names.map((name) => {
        // `names` are the on-disk filenames (e.g. "hash1.json"); strip the
        // .json suffix to derive the hash, then build the full path via
        // entryPath so statEntry uses the same path shape as set()/get().
        const hash = name.endsWith('.json') ? name.slice(0, -'.json'.length) : name;
        return this.statEntry(hash).catch(() => null);
      })
    );
    return stats.filter((s): s is CacheEntryStat => s !== null);
  }

  /**
   * Defense layer 3: removes all entries whose mtime is older than TTL.
   * Cheap heuristic — avoids reading every entry to inspect `convertedAt`.
   *
   * Called from `plugin onload` (via `performPdfCacheHousekeeping`) AND from
   * `WikiEngine.prepareBatchIngest` at the start of every batch ingest.
   */
  async purgeExpired(): Promise<CacheMaintenanceResult> {
    const stats = await this.listCacheEntriesWithStats();
    const now = Date.now();
    const expired = stats.filter((s) => now - s.mtime > this.ttlMs);

    const totalFreed = expired.reduce((sum, s) => sum + s.size, 0);
    await Promise.all(
      expired.map((s) => this.adapter.remove(s.path).catch(() => undefined))
    );
    return { removed: expired.length, freedBytes: totalFreed };
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
   *
   * `enforceSizeLimit` here is a belt-and-suspenders second pass — even if
   * `set()` already enforced on the previous write, this catches entries
   * that accumulated between the last write and this batch.
   */
  async prepareBatchIngest(): Promise<{
    expired: CacheMaintenanceResult;
    size: CacheMaintenanceResult;
  }> {
    const expired = await this.purgeExpired();
    const size = await this.enforceSizeLimit();
    return { expired, size };
  }

  /**
   * Defense layer 2: enforce hard caps on total bytes and entry count.
   * If either is exceeded, evict oldest entries first (LRU-by-mtime).
   * "去旧留新": new conversions stay; old conversions get evicted.
   */
  async enforceSizeLimit(): Promise<CacheMaintenanceResult> {
    const stats = await this.listCacheEntriesWithStats();
    const totalBytes = stats.reduce((sum, s) => sum + s.size, 0);

    if (totalBytes <= this.maxBytes && stats.length <= this.maxEntries) {
      return { removed: 0, freedBytes: 0 };
    }

    // Sort by mtime ascending — oldest first (LRU eviction target).
    stats.sort((a, b) => a.mtime - b.mtime);

    // Collect evict-set in one linear pass, then parallelize the removes
    // (consistent with clear()/purgeExpired()). 100 sequential adapter IPCs
    // would be 1-5s of blocking work; this is one event-loop tick.
    const evictSet: CacheEntryStat[] = [];
    let projectedBytes = totalBytes;
    let projectedCount = stats.length;
    for (const entry of stats) {
      if (projectedBytes <= this.maxBytes && projectedCount <= this.maxEntries) break;
      evictSet.push(entry);
      projectedBytes -= entry.size;
      projectedCount--;
    }

    const removed = evictSet.length;
    const freedBytes = evictSet.reduce((sum, e) => sum + e.size, 0);
    await Promise.all(
      evictSet.map((e) =>
        this.adapter.remove(e.path)
          .then(() => console.debug(`[pdf-cache] evicted ${e.name} (mtime=${e.mtime}, size=${e.size})`))
          .catch(() => undefined)
      )
    );

    return { removed, freedBytes };
  }

  /**
   * Returns the flat list of child entry names under `cacheDir`. Normalizes
   * the `ListedFiles` / `string[]` adapter shape variance to `string[]`.
   */
  private async listCacheEntries(): Promise<string[]> {
    const raw = await this.adapter.list(this.cacheDir);
    return Array.isArray(raw) ? raw : [...(raw as { files?: string[] }).files ?? []];
  }

  /**
   * Single-entry stat helper. Returns null if the adapter doesn't expose
   * `stat` (e.g. tests with stripped-down fakes) — callers degrade gracefully.
   */
  private async statEntry(name: string): Promise<CacheEntryStat | null> {
    const path = this.entryPath(name);
    const adapter = this.adapter as DataAdapter & {
      stat?: (p: string) => Promise<{ size: number; mtime: number } | null>;
    };
    if (typeof adapter.stat !== 'function') return null;
    try {
      const info = await adapter.stat(path);
      if (!info) return null;
      return { name, path, size: info.size, mtime: info.mtime };
    } catch {
      return null;
    }
  }

  private entryPath(hashToken: string): string {
    return `${this.cacheDir}/${hashToken}.json`;
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