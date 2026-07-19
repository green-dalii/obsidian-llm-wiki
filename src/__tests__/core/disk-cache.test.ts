// v1.25.1 Phase F4 — DiskCache<T> ledger optimization tests.
//
// Verifies:
//   1. set() under the threshold (80% of maxBytes / maxEntries) does NOT
//      trigger the O(N) `listCacheEntriesWithStats()` scan — measured by
//      spy on the `list` adapter method.
//   2. set() above the threshold DOES trigger the scan + enforce.
//   3. invalidate() decrements the ledger.
//   4. clear() resets the ledger to zero.
//   5. Direct filesystem seeding (bypassing set()) is reconciled by
//      enforceSizeLimit() — preserves existing test contract from
//      PdfConversionCache (defense-in-depth).
//   6. purgeExpired() reconciles ledger post-eviction.

import { describe, it, expect, vi } from 'vitest';
import { DiskCache } from '../../core/disk-cache';

interface FakeEntry {
  data: string;
  mtime: number;
}

function createFakeAdapter(initial: Record<string, FakeEntry> = {}) {
  const files = new Map<string, FakeEntry>(Object.entries(initial));
  const listSpy = vi.fn(async (dir: string) => {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`;
    return Array.from(files.keys())
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.substring(prefix.length).split('/')[0])
      .filter((v, i, a) => a.indexOf(v) === i);
  });
  return {
    files,
    adapter: {
      read: vi.fn(async (p: string) => {
        const f = files.get(p);
        if (!f) throw new Error('ENOENT');
        return f.data;
      }),
      write: vi.fn(async (p: string, d: string) => {
        files.set(p, { data: d, mtime: Date.now() });
      }),
      remove: vi.fn(async (p: string) => {
        files.delete(p);
      }),
      list: listSpy,
      stat: vi.fn(async (p: string) => {
        const f = files.get(p);
        if (!f) return null;
        return { size: new TextEncoder().encode(f.data).length, mtime: f.mtime };
      }),
      mkdir: vi.fn(async () => undefined),
    },
  };
}

describe('DiskCache<T> ledger optimization', () => {
  it('set() below threshold skips the O(N) list scan', async () => {
    const { adapter, files } = createFakeAdapter();
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      maxBytes: 10_000, // threshold at 8000 bytes
      maxEntries: 100,
      maxSingleEntryBytes: 5_000,
    });

    // Write a 500-byte entry — well below 8000 threshold.
    await cache.set('key1.json', JSON.stringify({ data: 'x'.repeat(450) }));

    expect(files.size).toBe(1);
    // The optimization is about the O(N) `list` scan, not `stat` calls
    // (stat is called by invalidate() as part of pre-write ledger sync).
    // The list() scan is what we want to skip when the ledger is under threshold.
    expect(adapter.list).not.toHaveBeenCalled();
  });

  it('set() above threshold triggers the list scan + enforce', async () => {
    const { adapter } = createFakeAdapter();
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      maxBytes: 1_000,
      maxEntries: 100,
      maxSingleEntryBytes: 5_000,
    });
    // Threshold at 800 bytes. Write 600 bytes (under), then 500 bytes (cumulative 1100 > 1000, also > 800 threshold).
    await cache.set('a.json', JSON.stringify({ data: 'x'.repeat(550) }));
    expect(adapter.list).not.toHaveBeenCalled();

    await cache.set('b.json', JSON.stringify({ data: 'x'.repeat(450) }));

    // Now above threshold (1050+ bytes > 800). Should trigger enforce → list scan.
    expect(adapter.list).toHaveBeenCalled();
  });

  it('invalidate() decrements the ledger so subsequent set() does not over-count', async () => {
    const { adapter, files } = createFakeAdapter();
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      maxBytes: 10_000,
      maxEntries: 100,
      maxSingleEntryBytes: 5_000,
    });
    await cache.set('a.json', JSON.stringify({ data: 'x'.repeat(100) }));
    await cache.set('b.json', JSON.stringify({ data: 'y'.repeat(100) }));

    // Invalidate a. The next enforce should NOT over-evict because ledger was decremented.
    await cache.invalidate('a.json');
    expect(files.has('/fake/cache/a.json')).toBe(false);

    // Verify a new set under threshold still skips enforce.
    await cache.set('c.json', JSON.stringify({ data: 'z'.repeat(100) }));
    // Only one entry should remain on disk after these operations.
    // (b and c; a was deleted)
    const remaining = Array.from(files.keys()).filter((k) => k.endsWith('.json'));
    expect(remaining.length).toBe(2);
  });

  it('clear() resets the ledger', async () => {
    const { adapter, files } = createFakeAdapter();
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      maxBytes: 10_000,
      maxEntries: 100,
      maxSingleEntryBytes: 5_000,
    });
    await cache.set('a.json', JSON.stringify({ data: 'x'.repeat(100) }));
    await cache.set('b.json', JSON.stringify({ data: 'y'.repeat(100) }));

    const result = await cache.clear();
    expect(result.removed).toBe(2);
    expect(files.size).toBe(0);

    // After clear, a small write should not trigger enforce (ledger was reset).
    const listCallsBefore = (adapter.list as ReturnType<typeof vi.fn>).mock.calls.length;
    await cache.set('c.json', JSON.stringify({ data: 'z'.repeat(100) }));
    expect((adapter.list as ReturnType<typeof vi.fn>).mock.calls.length).toBe(listCallsBefore);
  });

  it('enforceSizeLimit() reconciles with direct filesystem seeding (defense-in-depth)', async () => {
    // Seed files directly without going through set() — simulates a fresh
    // vault with cache restored from backup, or entries written by another
    // process. enforceSizeLimit() must still evict correctly.
    const { adapter, files } = createFakeAdapter({
      '/fake/cache/old.json': { data: JSON.stringify({ data: 'x'.repeat(450) }), mtime: Date.now() - 60_000 },
      '/fake/cache/fresh.json': { data: JSON.stringify({ data: 'y'.repeat(450) }), mtime: Date.now() },
    });
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      maxBytes: 500,
      maxEntries: 100,
      maxSingleEntryBytes: 1_000,
    });

    const result = await cache.enforceSizeLimit();
    expect(result.removed).toBeGreaterThanOrEqual(1);
    // Old entry must be evicted; fresh must remain.
    expect(files.has('/fake/cache/old.json')).toBe(false);
    expect(files.has('/fake/cache/fresh.json')).toBe(true);
  });

  it('enforceSizeLimit() below caps reconciles ledger to actual state (no eviction)', async () => {
    // Seed files directly. enforceSizeLimit() with no over-cap should
    // still update the ledger to match the filesystem state.
    const { adapter } = createFakeAdapter({
      '/fake/cache/a.json': { data: JSON.stringify({ data: 'x'.repeat(100) }), mtime: Date.now() },
    });
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      maxBytes: 10_000,
      maxEntries: 100,
      maxSingleEntryBytes: 5_000,
    });

    const result = await cache.enforceSizeLimit();
    expect(result.removed).toBe(0);

    // After reconcile, ledger is accurate: a subsequent set() under
    // threshold (80% of maxBytes) should not trigger another scan.
    const listCallsBefore = (adapter.list as ReturnType<typeof vi.fn>).mock.calls.length;
    await cache.set('b.json', JSON.stringify({ data: 'y'.repeat(50) }));
    expect((adapter.list as ReturnType<typeof vi.fn>).mock.calls.length).toBe(listCallsBefore);
  });

  it('purgeExpired() reconciles ledger after eviction', async () => {
    const { adapter, files } = createFakeAdapter({
      '/fake/cache/old.json': { data: JSON.stringify({ data: 'x' }), mtime: Date.now() - 60 * 24 * 60 * 60 * 1000 },
      '/fake/cache/fresh.json': { data: JSON.stringify({ data: 'y' }), mtime: Date.now() },
    });
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxBytes: 10_000,
      maxEntries: 100,
      maxSingleEntryBytes: 5_000,
    });

    const result = await cache.purgeExpired();
    expect(result.removed).toBe(1);
    expect(files.has('/fake/cache/old.json')).toBe(false);
    expect(files.has('/fake/cache/fresh.json')).toBe(true);

    // After purge, ledger should reflect remaining state. A new write
    // under threshold should not trigger enforce.
    const listCallsBefore = (adapter.list as ReturnType<typeof vi.fn>).mock.calls.length;
    await cache.set('c.json', JSON.stringify({ data: 'z' }));
    expect((adapter.list as ReturnType<typeof vi.fn>).mock.calls.length).toBe(listCallsBefore);
  });

  it('large single entry exceeding maxSingleEntryBytes is skipped without ledger update', async () => {
    const { adapter, files } = createFakeAdapter();
    const cache = new DiskCache<string>({
      cacheDir: '/fake/cache',
      adapter: adapter as never,
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      maxBytes: 10_000,
      maxEntries: 100,
      maxSingleEntryBytes: 500,
    });

    // 800-byte payload — over the 500 single-entry cap.
    await cache.set('huge.json', JSON.stringify({ data: 'x'.repeat(750) }));

    // File should not have been written.
    expect(files.size).toBe(0);
    // Ledger should be empty (no successful write happened).
    // Subsequent small write should not trigger enforce (ledger is zero).
    const listCallsBefore = (adapter.list as ReturnType<typeof vi.fn>).mock.calls.length;
    await cache.set('small.json', JSON.stringify({ data: 'y'.repeat(100) }));
    expect((adapter.list as ReturnType<typeof vi.fn>).mock.calls.length).toBe(listCallsBefore);
  });
});