import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PdfConversionCache,
  sha256Bytes,
  type PdfCacheEntry,
} from '../../core/pdf-cache';

// PDF_DIR is a test-only fake path; the hardcoded `.obsidian` here is
// intentional and confined to the test sandbox.
// eslint-disable-next-line obsidianmd/hardcoded-config-path
const PDF_DIR = '/fake/.obsidian/plugins/karpathywiki/pdf-cache';
const SAMPLE_HASH = 'abc123def456';

// Use a runtime timestamp so TTL tests are deterministic regardless of when
// the test runs (vs. a hardcoded "2026-07-15" which could be in the future).
const NOW_ISO = new Date().toISOString();

const makeEntry = (overrides: Partial<PdfCacheEntry> = {}): PdfCacheEntry => ({
  markdown: '# Title\n\nBody text',
  metadata: {
    title: 'Sample PDF',
    author: 'Author',
    pageCount: 12,
    convertedAt: NOW_ISO,
    converter: 'anthropic/claude-opus-4-8',
  },
  ...overrides,
});

describe('PdfConversionCache', () => {
  let cache: PdfConversionCache;
  let readCalls: Array<{ path: string }>;
  let writeCalls: Array<{ path: string; data: string }>;
  let removeCalls: Array<{ path: string }>;
  // fakeFilesRef is a stable object whose .current points to the current
  // test's Map. Mocks read/write through .current so re-assignment in
  // beforeEach doesn't strand closures with stale references.
  const fakeFilesRef: { current: Map<string, string> } = { current: new Map() };
  // fakeStatOffsets: path → ms offset subtracted from Date.now() to fake
  // mtime. Tests populate this to simulate entries written at different
  // times (for purgeExpired + LRU-by-mtime eviction).
  let fakeStatOffsets: Map<string, number> = new Map();

  beforeEach(() => {
    readCalls = [];
    writeCalls = [];
    removeCalls = [];
    fakeFilesRef.current = new Map();
    const fakeAdapter = {
      read: vi.fn(async (path: string) => {
        readCalls.push({ path });
        const data = fakeFilesRef.current.get(path);
        if (data === undefined) throw new Error(`ENOENT: ${path}`);
        return data;
      }),
      write: vi.fn(async (path: string, data: string) => {
        writeCalls.push({ path, data });
        fakeFilesRef.current.set(path, data);
      }),
      remove: vi.fn(async (path: string) => {
        removeCalls.push({ path });
        fakeFilesRef.current.delete(path);
      }),
      list: vi.fn(async (path: string) => {
        // Obsidian's adapter.list returns immediate child names. Trim trailing slash
        // from path so paths like "/cache/" work, then return each unique child.
        const prefix = path.endsWith('/') ? path : `${path}/`;
        return Array.from(fakeFilesRef.current.keys())
          .filter((p) => p.startsWith(prefix))
          .map((p) => p.substring(prefix.length).split('/')[0])
          .filter((v) => v.length > 0)
          .filter((v, i, a) => a.indexOf(v) === i);
      }),
      // v1.25.0 PR2 redo: stat support for size + mtime (used by purgeExpired /
      // enforceSizeLimit). Returns size from the stored byte length; mtime is
      // faked to current time minus a per-entry offset so we can simulate
      // expired entries deterministically.
      stat: vi.fn(async (path: string) => {
        const data = fakeFilesRef.current.get(path);
        if (data === undefined) throw new Error('ENOENT');
        // The test controls `mtimeOffsets` via a side-channel closure below.
        const offsetMs = (fakeStatOffsets.get(path) ?? 0);
        return { size: new TextEncoder().encode(data).length, mtime: Date.now() - offsetMs };
      }),
      mkdir: vi.fn(async () => undefined),
    };
    // Per-test map of `path → mtime offset ms`. Tests populate this to
    // simulate entries written at different times (for purgeExpired / LRU).
    fakeFilesRef.current = new Map();
    fakeStatOffsets = new Map<string, number>();

    cache = new PdfConversionCache({
      cacheDir: PDF_DIR,
      adapter: fakeAdapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxBytes: 100 * 1024 * 1024,
      maxEntries: 1000,
      maxSingleEntryBytes: 10 * 1024 * 1024,
    });
  });

  describe('get', () => {
    it('returns null on cache miss (file does not exist)', async () => {
      const result = await cache.get(SAMPLE_HASH);
      expect(result).toBeNull();
    });

    it('returns null on cache miss with different hash even when other entries exist', async () => {
      const otherHash = 'other-hash-999';
      await cache.set(otherHash, makeEntry());
      const result = await cache.get(SAMPLE_HASH);
      expect(result).toBeNull();
    });

    it('returns the entry on cache hit', async () => {
      const entry = makeEntry();
      await cache.set(SAMPLE_HASH, entry);
      const result = await cache.get(SAMPLE_HASH);
      expect(result).toEqual(entry);
    });

    it('returns null and removes entry when file is corrupt (invalid JSON)', async () => {
      fakeFilesRef.current.set(`${PDF_DIR}/${SAMPLE_HASH}.json`, '{not valid json');
      const result = await cache.get(SAMPLE_HASH);
      expect(result).toBeNull();
      // corrupted file should be removed so future set() can write fresh
      expect(removeCalls).toContainEqual({ path: `${PDF_DIR}/${SAMPLE_HASH}.json` });
    });

    it('returns null when entry is past TTL (expired)', async () => {
      // cache with 1ms TTL — entry is immediately stale
      const shortCache = new PdfConversionCache({
        cacheDir: PDF_DIR,
        adapter: {
          read: vi.fn(async (p: string) => {
            const d = fakeFilesRef.current.get(p);
            if (d === undefined) throw new Error('ENOENT');
            return d;
          }),
          write: vi.fn(async (p: string, d: string) => { fakeFilesRef.current.set(p, d); }),
          remove: vi.fn(async (p: string) => { fakeFilesRef.current.delete(p); }),
          list: vi.fn(async () => []),
          mkdir: vi.fn(async () => undefined),
        } as never,
        ttlMs: 1, // 1ms TTL
      });
      await shortCache.set(SAMPLE_HASH, makeEntry());
      // wait > 1ms
      await new Promise((r) => window.setTimeout(r, 5));
      const result = await shortCache.get(SAMPLE_HASH);
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('writes entry to disk under hash-keyed filename', async () => {
      const entry = makeEntry();
      await cache.set(SAMPLE_HASH, entry);
      expect(writeCalls).toHaveLength(1);
      const firstWrite = writeCalls[0];
      if (!firstWrite) throw new Error('expected one write call');
      expect(firstWrite.path).toBe(`${PDF_DIR}/${SAMPLE_HASH}.json`);
      // on-disk JSON must round-trip the entry (no envelope after simplification)
      const parsed = JSON.parse(firstWrite.data) as { markdown: string; metadata: PdfCacheEntry['metadata'] };
      expect(parsed.markdown).toBe(entry.markdown);
      expect(parsed.metadata).toEqual(entry.metadata);
    });

    it('overwrites existing entry on second set with same hash', async () => {
      await cache.set(SAMPLE_HASH, makeEntry({ markdown: 'first' }));
      await cache.set(SAMPLE_HASH, makeEntry({ markdown: 'second' }));
      expect(writeCalls).toHaveLength(2);
      const secondWrite = writeCalls[1];
      if (!secondWrite) throw new Error('expected two write calls');
      const parsed = JSON.parse(secondWrite.data) as { markdown: string };
      expect(parsed.markdown).toBe('second');
    });
  });

  describe('invalidate', () => {
    it('removes the cache entry file', async () => {
      await cache.set(SAMPLE_HASH, makeEntry());
      await cache.invalidate(SAMPLE_HASH);
      expect(removeCalls).toContainEqual({ path: `${PDF_DIR}/${SAMPLE_HASH}.json` });
      expect(await cache.get(SAMPLE_HASH)).toBeNull();
    });

    it('is a no-op when entry does not exist (does not throw)', async () => {
      await expect(cache.invalidate('non-existent-hash')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('removes all entries under cacheDir', async () => {
      await cache.set('hash1', makeEntry({ markdown: 'one' }));
      await cache.set('hash2', makeEntry({ markdown: 'two' }));
      await cache.clear();
      // both files should be removed
      expect(removeCalls.length).toBeGreaterThanOrEqual(2);
      expect(await cache.get('hash1')).toBeNull();
      expect(await cache.get('hash2')).toBeNull();
    });
  });
});

describe('sha256Bytes', () => {
  it('throws when subtle is undefined (production code must inject)', async () => {
    await expect(sha256Bytes(new Uint8Array([1, 2, 3]))).rejects.toThrow(/SubtleCrypto is required/);
  });

  it('uses real SubtleCrypto when provided', async () => {
    // setup.ts installs a deterministic test SubtleCrypto on globalThis.crypto.
    // sha256Bytes should call it and return a 64-char hex string.
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);
    // eslint-disable-next-line obsidianmd/no-global-this
    const subtle = (globalThis as { crypto: { subtle: SubtleCrypto } }).crypto.subtle;
    const hashA = await sha256Bytes(a, subtle);
    const hashB = await sha256Bytes(b, subtle);
    const hashC = await sha256Bytes(c, subtle);
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
    expect(hashA.length).toBe(64);
  });
});

describe('PdfConversionCache — three-defense-layer growth management (v1.25.0 PR2 redo)', () => {
  let cache: PdfConversionCache;
  let removeCalls: Array<{ path: string }>;
  const fakeFilesRef: { current: Map<string, string> } = { current: new Map() };
  let fakeStatOffsets: Map<string, number> = new Map();

  beforeEach(() => {
    removeCalls = [];
    fakeFilesRef.current = new Map();
    fakeStatOffsets = new Map();

    const fakeAdapter = {
      read: vi.fn(async (path: string) => {
        const data = fakeFilesRef.current.get(path);
        if (data === undefined) throw new Error('ENOENT');
        return data;
      }),
      write: vi.fn(async (path: string, data: string) => {
        fakeFilesRef.current.set(path, data);
      }),
      remove: vi.fn(async (path: string) => {
        removeCalls.push({ path });
        fakeFilesRef.current.delete(path);
      }),
      list: vi.fn(async (path: string) => {
        const prefix = path.endsWith('/') ? path : `${path}/`;
        return Array.from(fakeFilesRef.current.keys())
          .filter((p) => p.startsWith(prefix))
          .map((p) => p.substring(prefix.length).split('/')[0])
          .filter((v) => v.length > 0)
          .filter((v, i, a) => a.indexOf(v) === i);
      }),
      stat: vi.fn(async (path: string) => {
        const data = fakeFilesRef.current.get(path);
        if (data === undefined) throw new Error('ENOENT');
        const offsetMs = fakeStatOffsets.get(path) ?? 0;
        return { size: new TextEncoder().encode(data).length, mtime: Date.now() - offsetMs };
      }),
      mkdir: vi.fn(async () => undefined),
    };

    cache = new PdfConversionCache({
      cacheDir: PDF_DIR,
      adapter: fakeAdapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
    });
  });

  it('Defense layer 1: rejects writes for oversized single entries (>maxSingleEntryBytes)', async () => {
    const smallCache = new PdfConversionCache({
      cacheDir: PDF_DIR,
      adapter: {
        read: vi.fn(async () => { throw new Error('ENOENT'); }),
        write: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
        list: vi.fn(async () => []),
        mkdir: vi.fn(async () => undefined),
      } as never,
      maxSingleEntryBytes: 100, // tiny cap
    });
    const hugeEntry = { markdown: 'x'.repeat(200), metadata: { convertedAt: '2026-07-15T00:00:00Z', converter: 'anthropic/claude-opus-4-8' } };
    // set() should NOT throw — cache write failure is silent and graceful.
    await expect(smallCache.set('hash1', hugeEntry)).resolves.toBeUndefined();
    // No actual write should have happened (size > maxSingleEntryBytes).
    expect(fakeFilesRef.current.size).toBe(0);
  });

  it('Defense layer 3a: get() removes expired entries on read', async () => {
    // Pre-populate with an entry whose `convertedAt` is older than TTL.
    // get() trusts `convertedAt` (host-written at set() time) — mtime-based
    // sweeps happen via purgeExpired() during housekeeping, not per-hit.
    const oldEntry = makeEntry({ markdown: '# Title\n\nBody text' });
    oldEntry.metadata = { ...oldEntry.metadata, convertedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() };
    await cache.set('hash1', oldEntry);

    const result = await cache.get('hash1');
    expect(result).toBeNull();
    // Entry should have been removed by get() since it was past TTL.
    expect(removeCalls).toContainEqual({ path: `${PDF_DIR}/hash1.json` });
  });

  it('purgeExpired removes entries whose mtime is older than TTL', async () => {
    await cache.set('old', makeEntry());
    await cache.set('fresh', makeEntry());
    fakeStatOffsets.set(`${PDF_DIR}/old.json`, 40 * 24 * 60 * 60 * 1000); // 40 days old

    const result = await cache.purgeExpired();
    expect(result.removed).toBe(1);
    expect(removeCalls).toContainEqual({ path: `${PDF_DIR}/old.json` });
    // Fresh entry must still be present.
    expect(fakeFilesRef.current.has(`${PDF_DIR}/fresh.json`)).toBe(true);
  });

  it('enforceSizeLimit evicts oldest entries when over maxBytes cap (LRU-by-mtime)', async () => {
    // Build a separate tiny cache with its own fake adapter (this test owns
    // its isolation; reuse of the outer cache's adapter would tangle state).
    const localFiles = new Map<string, string>();
    const localStatOffsets = new Map<string, number>();
    const tinyCache = new PdfConversionCache({
      cacheDir: PDF_DIR,
      adapter: {
        read: vi.fn(async (p: string) => {
          const d = localFiles.get(p);
          if (d === undefined) throw new Error('ENOENT');
          return d;
        }),
        write: vi.fn(async (p: string, d: string) => { localFiles.set(p, d); }),
        remove: vi.fn(async (p: string) => { localFiles.delete(p); }),
        list: vi.fn(async (p: string) => {
          const prefix = p.endsWith('/') ? p : `${p}/`;
          return Array.from(localFiles.keys())
            .filter((k) => k.startsWith(prefix))
            .map((k) => k.substring(prefix.length).split('/')[0])
            .filter((v, i, a) => a.length > 0 && a.indexOf(v) === i);
        }),
        stat: vi.fn(async (p: string) => {
          const d = localFiles.get(p);
          if (d === undefined) throw new Error('ENOENT');
          return { size: new TextEncoder().encode(d).length, mtime: Date.now() - (localStatOffsets.get(p) ?? 0) };
        }),
        mkdir: vi.fn(async () => undefined),
      } as never,
      maxBytes: 500, // tiny — fits one entry comfortably, not two
    });

    // Seed: write two ~250 byte entries directly (no cache.set, so no
    // invalidate-and-write race). old.json is 60s old, fresh.json is 0s old.
    const oldPath = `${PDF_DIR}/old.json`;
    const freshPath = `${PDF_DIR}/fresh.json`;
    localFiles.set(oldPath, JSON.stringify({ markdown: 'x'.repeat(200), metadata: {} }));
    localFiles.set(freshPath, JSON.stringify({ markdown: 'y'.repeat(200), metadata: {} }));
    localStatOffsets.set(oldPath, 60_000); // 60s old

    // Total ~400 bytes, under 500 cap. No eviction yet.
    let result = await tinyCache.enforceSizeLimit();
    expect(result.removed).toBe(0);

    // Grow `fresh` so total exceeds cap. We write the new payload directly,
    // then set mtime = now. (Bypassing cache.set avoids the invalidate-and-write
    // reordering that auto-enforce would otherwise mask.)
    localFiles.set(freshPath, JSON.stringify({ markdown: 'z'.repeat(400), metadata: {} }));
    localStatOffsets.set(freshPath, 0);

    // Total ~600 bytes > 500 cap. enforceSizeLimit should evict the OLDER one.
    result = await tinyCache.enforceSizeLimit();
    expect(result.removed).toBeGreaterThanOrEqual(1);
    // Old entry must be gone; fresh entry must remain.
    expect(localFiles.has(oldPath)).toBe(false);
    expect(localFiles.has(freshPath)).toBe(true);
  });

  it('clear() returns removed count + freedBytes from stat-based accounting', async () => {
    await cache.set('a', makeEntry());
    await cache.set('b', makeEntry());

    const result = await cache.clear();
    expect(result.removed).toBe(2);
    expect(result.freedBytes).toBeGreaterThan(0);
    expect(fakeFilesRef.current.size).toBe(0);
  });
});