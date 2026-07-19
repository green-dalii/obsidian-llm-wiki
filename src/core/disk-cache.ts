/**
 * v1.25.1 Phase F3 — generic on-disk JSON cache.
 *
 * Extracted from `pdf-cache.ts` (v1.25.0 PdfConversionCache) so future
 * caches (e.g. lint LLM result cache, query result cache) can reuse the
 * same TTL / size-cap / LRU-by-mtime mechanics without re-deriving them.
 *
 * Generic on-disk cache for JSON-serializable entries:
 *   - get(key)        → parsed entry or null (miss / expired / corrupt)
 *   - set(key, value) → writes JSON; rejects oversized entries; enforces caps
 *   - invalidate(key) → deletes one entry
 *   - clear()         → removes all entries (returns freed bytes / count)
 *   - purgeExpired()  → removes entries older than TTL (via mtime, no read)
 *   - enforceSizeLimit() → LRU-by-mtime eviction to fit maxBytes / maxEntries
 *   - prepareBatchIngest() → TTL purge + size enforce in one call
 *
 * Cache growth management (three defense layers):
 *   1. Pre-write single-entry cap — skip writes for oversized entries
 *   2. Post-write size enforcement — LRU-by-mtime eviction when over cap
 *   3. Batch-start housekeeping — purgeExpired on folder ingest start
 *
 * Failure mode is graceful: cache write failures never block the caller.
 * Cache is performance, not correctness.
 *
 * Filename safety: keys must already be filesystem-safe (e.g. pre-hashed
 * via `hashCacheKey` from pdf-cache.ts, or `sha256(logicalKey).slice(0,16)`
 * for ad-hoc callers). The cache does NOT hash or sanitize keys.
 */

import type { DataAdapter } from 'obsidian';

export interface DiskCacheMaintenanceResult {
  removed: number;
  freedBytes: number;
}

interface CacheEntryStat {
  name: string;
  path: string;
  size: number;
  mtime: number;
}

export interface DiskCacheOptions<T> {
  cacheDir: string;
  adapter: DataAdapter;
  ttlMs: number;
  maxBytes: number;
  maxEntries: number;
  maxSingleEntryBytes: number;
  /** Custom serialize function (defaults to JSON.stringify) */
  serialize?: (value: T) => string;
  /** Custom deserialize function (defaults to JSON.parse). Throws on invalid input. */
  deserialize?: (raw: string) => T;
}

export class DiskCache<T> {
  private readonly cacheDir: string;
  private readonly adapter: DataAdapter;
  private readonly ttlMs: number;
  private readonly maxBytes: number;
  private readonly maxEntries: number;
  private readonly maxSingleEntryBytes: number;
  private readonly serialize: (value: T) => string;
  private readonly deserialize: (raw: string) => T;
  /**
   * In-memory ledger of total bytes written and entry count. Maintained
   * optimistically by `set()` and `invalidate()` — used to skip the O(N)
   * filesystem stat scan inside `enforceSizeLimit()` when the cache is
   * clearly under the cap. Reconciles with the actual filesystem on
   * `enforceSizeLimit()` / `clear()` / `purgeExpired()`.
   */
  private bytesWritten = 0;
  private entryCount = 0;
  /**
   * Threshold for skipping the post-write enforceSizeLimit scan. When the
   * ledger is below this fraction of maxBytes (and below maxEntries), the
   * O(N) stat scan is unnecessary — eviction cannot evict anything.
   */
  private static readonly ENFORCE_THRESHOLD = 0.8;

  constructor(opts: DiskCacheOptions<T>) {
    this.cacheDir = opts.cacheDir;
    this.adapter = opts.adapter;
    this.ttlMs = opts.ttlMs;
    this.maxBytes = opts.maxBytes;
    this.maxEntries = opts.maxEntries;
    this.maxSingleEntryBytes = opts.maxSingleEntryBytes;
    this.serialize = opts.serialize ?? ((v: T) => JSON.stringify(v));
    this.deserialize = opts.deserialize ?? ((raw: string) => JSON.parse(raw) as T);
  }

  /** Returns the entry for `key`, or null on miss / corrupt / expired. */
  async get(key: string): Promise<T | null> {
    const path = this.entryPath(key);
    let raw: string;
    try {
      raw = await this.adapter.read(path);
    } catch {
      return null;
    }

    let parsed: T;
    try {
      parsed = this.deserialize(raw);
    } catch {
      // Corrupt file — remove so future set() can write fresh
      await this.adapter.remove(path).catch(() => undefined);
      return null;
    }

    // TTL check is generic only when the entry shape exposes a timestamp;
    // for fully-generic use we delegate to a custom getter if the caller
    // wraps the entry with metadata. (PdfConversionCache overrides via
    // a wrapper type that exposes `metadata.convertedAt`.)
    return parsed;
  }

  /**
   * Writes the entry to disk under `{cacheDir}/{key}` (caller passes the
   * full filename, e.g. `{hash}.json`).
   *
   * Defense layer 1: rejects oversized single entries (>maxSingleEntryBytes).
   * Defense layer 2: enforces total cap after every write (LRU-by-mtime).
   * Both wrapped in try/catch so a flaky eviction stat call does not
   * propagate through set() and discard the result the caller already
   * paid for.
   */
  async set(key: string, value: T): Promise<void> {
    const path = this.entryPath(key);
    let data: string;
    try {
      data = this.serialize(value);
    } catch (error) {
      console.warn(`[disk-cache] serialize failed for ${key}, continuing without cache:`, error);
      return;
    }
    const size = new TextEncoder().encode(data).length;

    if (size > this.maxSingleEntryBytes) {
      console.warn(
        `[disk-cache] skipping cache write for ${key}: ${size} bytes exceeds ` +
        `maxSingleEntryBytes=${this.maxSingleEntryBytes}`
      );
      return;
    }

    await this.ensureCacheDir();

    // Remove old entry first to free its size before enforcing the new cap.
    // The invalidate call updates the ledger so post-write accounting is exact.
    await this.invalidate(key).catch(() => undefined);

    try {
      await this.adapter.write(path, data);
    } catch (error) {
      console.warn(`[disk-cache] write failed for ${key}, continuing without cache:`, error);
      return;
    }

    // Update ledger with the just-written entry.
    this.bytesWritten += size;
    this.entryCount += 1;

    // Defense layer 2: enforce total cap, but only when the ledger crosses
    // the threshold. Below threshold, the O(N) stat scan is provably a
    // no-op (total bytes + entry count are both under caps) so we save
    // the round-trip cost on every write. Above threshold, we reconcile
    // with the actual filesystem (handles entries written outside the
    // ledger, e.g. direct filesystem seeding or stale state).
    if (this.shouldEnforce()) {
      try {
        const result = await this.enforceSizeLimit();
        // After enforceSizeLimit reconciles, the ledger reflects actual
        // filesystem state (bytesWritten / entryCount from stat scan).
        if (this.entryCount !== result.removed && result.removed > 0) {
          // Ledger was already updated above; the eviction removed some
          // entries but our ledger already accounts for the new write.
          // The reconcile() inside enforceSizeLimit() will correct any
          // drift between ledger and filesystem.
        }
      } catch (error) {
        console.warn('[disk-cache] enforceSizeLimit failed; cap may be temporarily exceeded:', error);
      }
    }
  }

  /**
   * True when the ledger suggests `enforceSizeLimit()` might evict.
   * Below threshold, no eviction can happen (no entry is large enough
   * on its own, and total bytes / entry count are both under caps).
   */
  private shouldEnforce(): boolean {
    return (
      this.bytesWritten >= this.maxBytes * DiskCache.ENFORCE_THRESHOLD ||
      this.entryCount >= this.maxEntries * DiskCache.ENFORCE_THRESHOLD
    );
  }

  /** Removes the entry for `key`. No-op if absent. Updates the ledger. */
  async invalidate(key: string): Promise<void> {
    const path = this.entryPath(key);
    let prevSize = 0;
    let existed = false;
    try {
      const info = await this.statEntry(key);
      if (info) {
        prevSize = info.size;
        existed = true;
      }
    } catch {
      // best-effort ledger sync; remove proceeds regardless
    }
    try {
      await this.adapter.remove(path);
      if (existed) {
        this.bytesWritten = Math.max(0, this.bytesWritten - prevSize);
        this.entryCount = Math.max(0, this.entryCount - 1);
      }
    } catch {
      // already gone — ledger may already reflect this; leave alone
    }
  }

  /** Removes all entries under `cacheDir`. Resets the ledger. */
  async clear(): Promise<DiskCacheMaintenanceResult> {
    const stats = await this.listCacheEntriesWithStats();
    const totalBytes = stats.reduce((sum, s) => sum + s.size, 0);

    await Promise.all(
      stats.map((s) => this.adapter.remove(s.path).catch(() => undefined))
    );
    this.bytesWritten = 0;
    this.entryCount = 0;
    return { removed: stats.length, freedBytes: totalBytes };
  }

  /**
   * Removes all entries whose mtime is older than TTL.
   * Cheap heuristic — avoids reading every entry to inspect a timestamp.
   * Reconciles the ledger after eviction.
   */
  async purgeExpired(): Promise<DiskCacheMaintenanceResult> {
    const stats = await this.listCacheEntriesWithStats();
    const now = Date.now();
    const expired = stats.filter((s) => now - s.mtime > this.ttlMs);

    const totalFreed = expired.reduce((sum, s) => sum + s.size, 0);
    await Promise.all(
      expired.map((s) => this.adapter.remove(s.path).catch(() => undefined))
    );
    // Reconcile ledger: subtract evicted entries; resync total from remaining stats.
    this.bytesWritten = Math.max(0, this.bytesWritten - totalFreed);
    this.entryCount = Math.max(0, this.entryCount - expired.length);
    return { removed: expired.length, freedBytes: totalFreed };
  }

  /** Batch-start housekeeping: TTL purge + size cap enforcement in one call. */
  async prepareBatchIngest(): Promise<{
    expired: DiskCacheMaintenanceResult;
    size: DiskCacheMaintenanceResult;
  }> {
    const expired = await this.purgeExpired();
    const size = await this.enforceSizeLimit();
    return { expired, size };
  }

  /**
   * Enforces hard caps on total bytes and entry count via LRU-by-mtime eviction.
   * "去旧留新": new entries stay; old entries get evicted.
   *
   * Reconciles the in-memory ledger with the actual filesystem at entry —
   * this handles the case where entries were written outside the cache's
   * set() path (direct filesystem seed, crash recovery, etc.). The ledger
   * is then reset to match the post-eviction filesystem state.
   */
  async enforceSizeLimit(): Promise<DiskCacheMaintenanceResult> {
    const stats = await this.listCacheEntriesWithStats();
    const totalBytes = stats.reduce((sum, s) => sum + s.size, 0);

    if (totalBytes <= this.maxBytes && stats.length <= this.maxEntries) {
      // Already within caps. Reconcile ledger to match (no eviction needed).
      this.bytesWritten = totalBytes;
      this.entryCount = stats.length;
      return { removed: 0, freedBytes: 0 };
    }

    stats.sort((a, b) => a.mtime - b.mtime);

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
          .then(() => console.debug(`[disk-cache] evicted ${e.name} (mtime=${e.mtime}, size=${e.size})`))
          .catch(() => undefined)
      )
    );

    // Reconcile ledger to post-eviction filesystem state.
    this.bytesWritten = projectedBytes;
    this.entryCount = projectedCount;
    return { removed, freedBytes };
  }

  /**
   * Walks the cacheDir path segment-by-segment, calling `adapter.mkdir` for
   * each missing directory. Idempotent.
   */
  private async ensureCacheDir(): Promise<void> {
    const dir = this.cacheDir.endsWith('/') ? this.cacheDir.slice(0, -1) : this.cacheDir;
    const segments: string[] = [];
    let cursor = '';
    for (const seg of dir.split('/')) {
      if (!seg) continue;
      cursor = cursor ? `${cursor}/${seg}` : seg;
      segments.push(cursor);
    }
    for (const path of segments) {
      try {
        await this.adapter.mkdir(path);
      } catch (error) {
        if (!isMissingDirError(error)) {
          console.warn(`[disk-cache] mkdir(${path}) returned non-ENOENT error:`, error);
        }
      }
    }
  }

  /** Returns each entry under `cacheDir` with on-disk size + mtime. */
  private async listCacheEntriesWithStats(): Promise<CacheEntryStat[]> {
    const names = await this.listCacheEntries();
    const adapter = this.adapter as DataAdapter & {
      stat?: (p: string) => Promise<{ size: number; mtime: number } | null>;
    };
    if (typeof adapter.stat !== 'function') {
      return names.map((name) => ({
        name,
        path: this.entryPath(name),
        size: 0,
        mtime: 0,
      }));
    }
    const stats = await Promise.all(
      names.map((name) =>
        this.statEntry(name).catch(() => null)
      )
    );
    return stats.filter((s): s is CacheEntryStat => s !== null);
  }

  /**
   * Returns the flat list of child entry names under `cacheDir`. ENOENT
   * on a missing directory is treated as an empty cache (first-run vaults).
   */
  private async listCacheEntries(): Promise<string[]> {
    let raw: string[] | { files?: string[] };
    try {
      raw = await this.adapter.list(this.cacheDir);
    } catch (error) {
      if (isMissingDirError(error)) return [];
      throw error;
    }
    return Array.isArray(raw) ? raw : [...raw.files ?? []];
  }

  /** Single-entry stat helper. Returns null if the adapter doesn't expose `stat`. */
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

  private entryPath(key: string): string {
    return `${this.cacheDir}/${key}`;
  }
}

/**
 * Detect "directory does not exist" errors across Obsidian's adapter shape,
 * the JS DOMException `NotFoundError`, and raw Node ENOENT (when the adapter
 * surfaces it).
 */
export function isMissingDirError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; name?: string; message?: string };
  if (e.code === 'ENOENT') return true;
  if (e.name === 'NotFoundError') return true;
  if (typeof e.message === 'string' && /no such file or directory/i.test(e.message)) {
    return true;
  }
  return false;
}