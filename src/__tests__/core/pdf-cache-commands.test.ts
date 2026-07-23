import { beforeEach, describe, expect, it } from 'vitest';
import { Notice } from 'obsidian';
import type { DataAdapter } from 'obsidian';
import { pdfCacheCommands, type PdfCacheHost } from '../../main-commands/pdf-cache-commands';

const CONFIG_DIR = 'custom-config';
const CACHE_DIR = `${CONFIG_DIR}/plugins/karpathywiki-mineru/pdf-cache`;

function createAdapter(initialPaths: string[]): DataAdapter & { paths: Set<string> } {
  const paths = new Set(initialPaths);
  return {
    paths,
    list: async (path: string) => ({
      files: [...paths]
        .filter(candidate => candidate.startsWith(`${path}/`))
        .map(candidate => candidate.slice(path.length + 1)),
      folders: [],
    }),
    stat: async (path: string) => paths.has(path) ? { size: 10, mtime: 1, ctime: 1, type: 'file' } : null,
    remove: async (path: string) => { paths.delete(path); },
  } as unknown as DataAdapter & { paths: Set<string> };
}

describe('PDF cache commands', () => {
  beforeEach(() => {
    (Notice as unknown as { instances: unknown[] }).instances.length = 0;
  });

  it('clears only the internal plugin cache and preserves Vault MinerU artifacts', async () => {
    const cacheEntry = `${CACHE_DIR}/0123456789abcdef.json`;
    const artifactManifest = 'sources/paper.mineru/.mineru-manifest.json';
    const artifactMarkdown = 'sources/paper.mineru/document.md';
    const adapter = createAdapter([cacheEntry, artifactManifest, artifactMarkdown]);
    const host = {
      app: { vault: { configDir: CONFIG_DIR, adapter } },
      settings: { language: 'en' },
    } as unknown as PdfCacheHost;

    await pdfCacheCommands.clearPdfCache.call(host);

    expect(adapter.paths.has(cacheEntry)).toBe(false);
    expect(adapter.paths.has(artifactManifest)).toBe(true);
    expect(adapter.paths.has(artifactMarkdown)).toBe(true);
  });

  it('keeps batch housekeeping scoped to the internal cache directory', async () => {
    const cacheEntry = `${CACHE_DIR}/fedcba9876543210.json`;
    const artifactManifest = 'sources/paper.mineru/.mineru-manifest.json';
    const adapter = createAdapter([cacheEntry, artifactManifest]);
    const host = {
      app: { vault: { configDir: CONFIG_DIR, adapter } },
      settings: { language: 'en' },
    } as unknown as PdfCacheHost;

    await pdfCacheCommands.preparePdfCacheForBatchIngest.call(host);

    expect(adapter.paths.has(cacheEntry)).toBe(false);
    expect(adapter.paths.has(artifactManifest)).toBe(true);
  });
});
