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
import { PDF_CACHE_TTL_MS } from '../constants';

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

const DEFAULT_TTL_MS = PDF_CACHE_TTL_MS;

/**
 * Returns the hex-encoded sha256 of the given bytes. The caller must
 * inject `SubtleCrypto` (from `activeWindow.crypto.subtle` in production).
 *
 * Throws when `subtle` is undefined — production code paths must always
 * have an injected implementation; tests that can't supply one should
 * mock a minimal SubtleCrypto (see `pdf-cache.test.ts`). This is stricter
 * than the previous FNV fallback: cache keys must be cryptographic in
 * production so collisions cannot sneak through.
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