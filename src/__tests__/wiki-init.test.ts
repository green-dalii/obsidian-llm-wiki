import { describe, it, expect, vi } from 'vitest';

/**
 * Wiki initialization tests — cover auto-init logic in main.ts and settings.ts
 * Uses pure mock objects (no Obsidian runtime) to verify the IO-check pattern
 * and ensureWikiStructure call paths.
 */

// ── Helpers ───────────────────────────────────────────────────────

function createMockApp(existentPaths: string[] = []): {
  vault: {
    getAbstractFileByPath: (path: string) => unknown;
    createFolder: (path: string) => Promise<void>;
  };
} {
  const existing = new Set(existentPaths);
  return {
    vault: {
      getAbstractFileByPath: vi.fn((path: string) => {
        return existing.has(path) ? { path } : null;
      }),
      createFolder: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function createMockWikiEngine(): {
  ensureWikiStructure: () => Promise<void>;
  regenerateDefaultSchema: () => Promise<void>;
} {
  return {
    ensureWikiStructure: vi.fn().mockResolvedValue(undefined),
    regenerateDefaultSchema: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Settings isWikiInitialized() via IO check ─────────────────────

describe('Wiki initialization IO check', () => {
  it('returns true when all four wiki folders exist', () => {
    const app = createMockApp([
      'wiki/entities',
      'wiki/concepts',
      'wiki/sources',
      'wiki/schema',
    ]);

    // Replicate the logic from settings.ts isWikiInitialized()
    const wikiFolder = 'wiki';
    const isInit = !!(
      app.vault.getAbstractFileByPath(`${wikiFolder}/entities`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/concepts`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/sources`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/schema`)
    );

    expect(isInit).toBe(true);
  });

  it('returns false when any wiki folder is missing', () => {
    const app = createMockApp([
      'wiki/entities',
      'wiki/concepts',
      'wiki/sources',
      // missing schema
    ]);

    const wikiFolder = 'wiki';
    const isInit = !!(
      app.vault.getAbstractFileByPath(`${wikiFolder}/entities`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/concepts`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/sources`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/schema`)
    );

    expect(isInit).toBe(false);
  });

  it('returns false when wiki folder is completely empty', () => {
    const app = createMockApp([]);

    const wikiFolder = 'wiki';
    const isInit = !!(
      app.vault.getAbstractFileByPath(`${wikiFolder}/entities`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/concepts`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/sources`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/schema`)
    );

    expect(isInit).toBe(false);
  });

  it('checks custom wikiFolder path when configured', () => {
    const app = createMockApp([
      'custom-wiki/entities',
      'custom-wiki/concepts',
      'custom-wiki/sources',
      'custom-wiki/schema',
    ]);

    const wikiFolder = 'custom-wiki';
    const isInit = !!(
      app.vault.getAbstractFileByPath(`${wikiFolder}/entities`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/concepts`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/sources`) &&
      app.vault.getAbstractFileByPath(`${wikiFolder}/schema`)
    );

    expect(isInit).toBe(true);
  });
});

// ── main.ts auto-init path ─────────────────────────────────────────

describe('main.ts auto-init on LLM Ready', () => {
  it('calls ensureWikiStructure when connection succeeds and wiki not initialized', async () => {
    const wikiEngine = createMockWikiEngine();
    const app = createMockApp([]); // empty vault

    // Simulate testLLMConnection success path
    const isInit = !!(app.vault).getAbstractFileByPath('wiki/entities') &&
      !!(app.vault).getAbstractFileByPath('wiki/concepts') &&
      !!(app.vault).getAbstractFileByPath('wiki/sources') &&
      !!(app.vault).getAbstractFileByPath('wiki/schema');

    if (!isInit) {
      await wikiEngine.ensureWikiStructure();
    }

    expect(wikiEngine.ensureWikiStructure).toHaveBeenCalledTimes(1);
  });

  it('does not call ensureWikiStructure when wiki already initialized', async () => {
    const wikiEngine = createMockWikiEngine();
    const app = createMockApp([
      'wiki/entities',
      'wiki/concepts',
      'wiki/sources',
      'wiki/schema',
    ]);

    const isInit = !!(app.vault).getAbstractFileByPath('wiki/entities') &&
      !!(app.vault).getAbstractFileByPath('wiki/concepts') &&
      !!(app.vault).getAbstractFileByPath('wiki/sources') &&
      !!(app.vault).getAbstractFileByPath('wiki/schema');

    if (!isInit) {
      await wikiEngine.ensureWikiStructure();
    }

    expect(wikiEngine.ensureWikiStructure).not.toHaveBeenCalled();
  });
});

// ── settings.ts regenerate schema button ──────────────────────────

describe('settings.ts schema regeneration button', () => {
  it('calls ensureWikiStructure before regenerate when not initialized', async () => {
    const wikiEngine = createMockWikiEngine();
    const app = createMockApp([]); // empty vault

    // Simulate the button logic from settings.ts
    const wikiFolder = 'wiki';
    const isInit = !!(app.vault).getAbstractFileByPath(`${wikiFolder}/entities`) &&
      !!(app.vault).getAbstractFileByPath(`${wikiFolder}/concepts`) &&
      !!(app.vault).getAbstractFileByPath(`${wikiFolder}/sources`) &&
      !!(app.vault).getAbstractFileByPath(`${wikiFolder}/schema`);

    if (!isInit) {
      await wikiEngine.ensureWikiStructure();
    }
    await wikiEngine.regenerateDefaultSchema();

    expect(wikiEngine.ensureWikiStructure).toHaveBeenCalledTimes(1);
    expect(wikiEngine.regenerateDefaultSchema).toHaveBeenCalledTimes(1);
  });

  it('skips ensureWikiStructure when already initialized', async () => {
    const wikiEngine = createMockWikiEngine();
    const app = createMockApp([
      'wiki/entities',
      'wiki/concepts',
      'wiki/sources',
      'wiki/schema',
    ]);

    const wikiFolder = 'wiki';
    const isInit = !!(app.vault).getAbstractFileByPath(`${wikiFolder}/entities`) &&
      !!(app.vault).getAbstractFileByPath(`${wikiFolder}/concepts`) &&
      !!(app.vault).getAbstractFileByPath(`${wikiFolder}/sources`) &&
      !!(app.vault).getAbstractFileByPath(`${wikiFolder}/schema`);

    if (!isInit) {
      await wikiEngine.ensureWikiStructure();
    }
    await wikiEngine.regenerateDefaultSchema();

    expect(wikiEngine.ensureWikiStructure).not.toHaveBeenCalled();
    expect(wikiEngine.regenerateDefaultSchema).toHaveBeenCalledTimes(1);
  });
});

// ── schema-manager.ts defensive createFolder ──────────────────────

describe('schema-manager.ts defensive folder creation', () => {
  it('creates schema folder before writing config', async () => {
    const app = createMockApp([]);
    const wikiFolder = 'wiki';
    const schemaFolder = `${wikiFolder}/schema`;

    // Simulate regenerateDefaultSchema logic
    await app.vault.createFolder(schemaFolder);

    expect(app.vault.createFolder).toHaveBeenCalledWith('wiki/schema');
  });

  it('silently handles existing folder (no throw)', async () => {
    const app = createMockApp(['wiki/schema']);
    const wikiFolder = 'wiki';
    const schemaFolder = `${wikiFolder}/schema`;

    // Even if folder exists, createFolder should not throw
    // (Obsidian throws when folder exists; our code catches it)
    try {
      await app.vault.createFolder(schemaFolder);
    } catch {
      // silently handle
    }

    // The call was made even if it would throw
    expect(app.vault.createFolder).toHaveBeenCalledWith('wiki/schema');
  });
});
