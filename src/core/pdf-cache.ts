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
 */

import type { DataAdapter } from 'obsidian';

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

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Returns the hex-encoded sha256 of the given bytes. Accepts the
 * SubtleCrypto instance so callers pass `activeWindow.crypto.subtle` (the
 * popout-window-aware wrapper) instead of the banned `window` global.
 *
 * Falls back to a deterministic 8-char FNV-1a-style digest when `subtle`
 * is undefined (test environments that don't mock Web Crypto). This keeps
 * the cache key stable in unit tests while production never sees the path.
 */
export async function sha256Bytes(bytes: Uint8Array, subtle?: SubtleCrypto): Promise<string> {
  if (subtle) {
    const digest = await subtle.digest('SHA-256', bytes as BufferSource);
    return bytesToHex(new Uint8Array(digest));
  }
  // Test-only fallback: stable non-crypto hash so cache keys are deterministic
  // without requiring jsdom + Web Crypto mocks.
  let h = 0;
  for (const b of bytes) h = ((h << 5) - h + b) | 0;
  return `fnv-${Math.abs(h).toString(16).padStart(8, '0')}-${bytes.length}`;
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
  private readonly adapter: DataAdapter;
  private readonly ttlMs: number;

  constructor(opts: {
    cacheDir: string;
    adapter: DataAdapter;
    ttlMs?: number;
  }) {
    this.cacheDir = opts.cacheDir;
    this.adapter = opts.adapter;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  }

  /** Returns the entry for `hash`, or null on miss / corrupt / expired. */
  async get(hash: string): Promise<PdfCacheEntry | null> {
    const path = this.entryPath(hash);
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

    // TTL check on the metadata's convertedAt timestamp
    const convertedAtMs = Date.parse(parsed.metadata?.convertedAt ?? '');
    if (Number.isFinite(convertedAtMs) && Date.now() - convertedAtMs > this.ttlMs) {
      return null;
    }

    return parsed;
  }

  /** Writes the entry to disk under `{cacheDir}/{hash}.json`. */
  async set(hash: string, entry: PdfCacheEntry): Promise<void> {
    const path = this.entryPath(hash);
    await this.adapter.write(path, JSON.stringify(entry));
  }

  /** Removes the entry for `hash`. No-op if absent. */
  async invalidate(hash: string): Promise<void> {
    const path = this.entryPath(hash);
    try {
      await this.adapter.remove(path);
    } catch {
      // already gone
    }
  }

  /** Removes all entries under `cacheDir`. */
  async clear(): Promise<void> {
    const entries = await this.listCacheEntries();
    // Parallelize removes — for large caches this turns O(n) sequential
    // adapter calls into O(1) wall-clock time (modulo adapter concurrency).
    await Promise.all(
      entries.map((name) => this.adapter.remove(`${this.cacheDir}/${name}`).catch(() => undefined))
    );
  }

  /**
   * Returns the flat list of child entry names under `cacheDir`. Normalizes
   * the `ListedFiles` / `string[]` adapter shape variance to `string[]`.
   */
  private async listCacheEntries(): Promise<string[]> {
    const raw = await this.adapter.list(this.cacheDir);
    return Array.isArray(raw) ? raw : [...(raw as { files?: string[] }).files ?? []];
  }

  private entryPath(hash: string): string {
    return `${this.cacheDir}/${hash}.json`;
  }
}