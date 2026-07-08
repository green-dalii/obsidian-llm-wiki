// Bug C 3.2 — WikiEngine.updateSettings() invalidates caches when wikiFolder changes.
//
// Background: settings save can change `wikiFolder` mid-session. WikiEngine's
// `pagesCache` and `ingestedHashesCache` are path-keyed (they walk files under
// `<wikiFolder>/...`). Without invalidation, an old wikiFolder's cache survives
// a folder change and the next query/ingest sees stale data.
//
// This test reproduces the regression: build a cache (via vault scan), then
// change wikiFolder via updateSettings, then assert the cache was dropped.

import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS } from '../__support__/engine-context';
import { createWikiEngineHarness } from '../__support__/wiki-engine-harness';

describe('WikiEngine.updateSettings — Bug C 3.2 cache invalidation', () => {
  let harness: ReturnType<typeof createWikiEngineHarness>;

  beforeEach(() => {
    harness = createWikiEngineHarness({
      files: {
        'wiki/entities/a.md': '---\ntype: entity\n---\n# A',
        'wiki/concepts/b.md': '---\ntype: concept\n---\n# B',
        'test3/entities/c.md': '---\ntype: entity\n---\n# C',
      },
      settings: { wikiFolder: 'wiki' },
    });
  });

  it('returns true when wikiFolder changes', async () => {
    const engine = harness.engine as unknown as {
      pagesCache: unknown;
      ingestedHashesCache: unknown;
      buildIngestedHashes: () => unknown;
      getExistingWikiPages: () => Promise<unknown[]>;
      updateSettings: (s: unknown) => boolean;
    };

    await engine.getExistingWikiPages();
    engine.buildIngestedHashes();

    // wikiFolderChanged flag drives main.saveSettings() → leaf-walk.
    const currentSettings = (engine as unknown as { settings: Record<string, unknown> })['settings'];
    expect(engine.updateSettings({ ...currentSettings, wikiFolder: 'different' })).toBe(true);
  });

  it('returns false when wikiFolder is unchanged', async () => {
    const engine = harness.engine as unknown as {
      pagesCache: unknown;
      buildIngestedHashes: () => unknown;
      getExistingWikiPages: () => Promise<unknown[]>;
      updateSettings: (s: unknown) => boolean;
    };

    await engine.getExistingWikiPages();
    engine.buildIngestedHashes();

    const currentSettings = (engine as unknown as { settings: Record<string, unknown> })['settings'];
    expect(engine.updateSettings({ ...currentSettings, model: 'different-model' })).toBe(false);
  });

  it('invalidates pagesCache + ingestedHashesCache when wikiFolder changes', async () => {
    const engine = harness.engine as unknown as {
      pagesCache: unknown;
      pagesCacheTime: number;
      ingestedHashesCache: unknown;
      ingestedHashesCacheTime: number;
      buildIngestedHashes: () => unknown;
      getExistingWikiPages: () => Promise<unknown[]>;
      updateSettings: (s: unknown) => void;
    };

    // Force the caches to populate by reading them once. getExistingWikiPages
    // is async and populates pagesCache as a side effect.
    await engine.getExistingWikiPages();
    engine.buildIngestedHashes();
    expect(engine.pagesCache).not.toBeNull();
    expect(engine.ingestedHashesCache).not.toBeNull();

    // Switch wikiFolder — caches must drop immediately.
    engine.updateSettings({ ...DEFAULT_SETTINGS, ...harness.engine['settings'], wikiFolder: 'test3' });

    expect(engine.pagesCache).toBeNull();
    expect(engine.ingestedHashesCache).toBeNull();
  });

  it('preserves caches when wikiFolder is unchanged', async () => {
    const engine = harness.engine as unknown as {
      pagesCache: unknown;
      pagesCacheTime: number;
      ingestedHashesCache: unknown;
      buildIngestedHashes: () => unknown;
      getExistingWikiPages: () => Promise<unknown[]>;
      updateSettings: (s: unknown) => void;
    };

    await engine.getExistingWikiPages();
    engine.buildIngestedHashes();
    const pagesBefore = engine.pagesCache;
    const hashesBefore = engine.ingestedHashesCache;

    // Update with the same wikiFolder + a different unrelated field.
    const currentSettings = (engine as unknown as { settings: Record<string, unknown> })['settings'];
    engine.updateSettings({ ...currentSettings, model: 'different-model' });

    expect(engine.pagesCache).toBe(pagesBefore);
    expect(engine.ingestedHashesCache).toBe(hashesBefore);
  });
});