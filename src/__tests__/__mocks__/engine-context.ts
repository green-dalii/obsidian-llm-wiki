// Mock EngineContext for unit testing.
// Provides pure in-memory vault + mock LLM client — no Obsidian runtime needed.
//
// Usage:
//   import { createMockContext } from './__mocks__/engine-context';
//
//   it('extracts entities from source', async () => {
//     const ctx = createMockContext({
//       vaultFiles: { 'sources/test.md': '# Content ...' },
//       llmResponses: [
//         JSON.stringify({ entities: [{ name: 'Foo', type: 'other', ... }], concepts: [] }),
//       ],
//     });
//     const engine = new SourceAnalyzer(ctx);
//     const file = createMockFile('sources/test.md');
//     const result = await engine.analyzeSource(file);
//     expect(result.entities).toHaveLength(1);
//   });

import { EngineContext, LLMClient, LLMWikiSettings } from '../../types';

// ── Mock File ────────────────────────────────────────────────────

export interface MockFile {
  path: string;
  basename: string;
  content: string;
}

export function createMockFile(path: string, content = ''): { path: string; basename: string } {
  const parts = path.split('/');
  return { path, basename: parts[parts.length - 1].replace('.md', '') };
}

// ── Mock Vault ───────────────────────────────────────────────────

class MockVault {
  private files = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(initial)) {
      this.files.set(path, content);
    }
  }

  has(path: string): boolean { return this.files.has(path); }
  read(path: string): string | null { return this.files.get(path) ?? null; }
  write(path: string, content: string): void { this.files.set(path, content); }
  list(): string[] { return [...this.files.keys()]; }
  get size(): number { return this.files.size; }
}

// ── Mock LLM Client ──────────────────────────────────────────────

export function createMockClient(responses: string[]): LLMClient {
  let idx = 0;
  return {
    createMessage: async () => responses[idx++] ?? '{"entities":[],"concepts":[],"contradictions":[],"related_pages":[],"key_points":[]}',
  };
}

// ── Default Settings ─────────────────────────────────────────────

export const DEFAULT_SETTINGS: LLMWikiSettings = {
  provider: 'mock',
  apiKey: '',
  baseUrl: '',
  model: 'mock-model',
  wikiFolder: 'wiki',
  language: 'en',
  wikiLanguage: 'English',
  maxConversationHistory: 10,
  enableSchema: false,
  extractionGranularity: 'standard',
  autoWatchSources: false,
  autoWatchMode: 'notify',
  autoWatchDebounceMs: 5000,
  watchedFolders: [],
  periodicLint: 'off',
  startupCheck: false,
  pageGenerationConcurrency: 1,
  batchDelayMs: 0,
  llmReady: true,
};

// ── Mock EngineContext ───────────────────────────────────────────

export interface MockContextOptions {
  vaultFiles?: Record<string, string>;
  llmResponses?: string[];
  settings?: Partial<LLMWikiSettings>;
}

export function createMockContext(opts: MockContextOptions = {}): { ctx: EngineContext; vault: MockVault } {
  const vault = new MockVault(opts.vaultFiles);
  const client = createMockClient(opts.llmResponses ?? []);
  const settings = { ...DEFAULT_SETTINGS, ...opts.settings };

  const ctx: EngineContext = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    app: { vault: { read: async () => '' } } as any,
    settings,
    getClient: () => client,
    createOrUpdateFile: async (path, content) => { vault.write(path, content); },
    tryReadFile: async (path) => vault.read(path),
    deleteFile: async () => {},
    buildSystemPrompt: async () => undefined,
    getSectionLabels: () => ({
      section_basic_information: 'Basic Information',
      section_description: 'Description',
      section_related_entities: 'Related Entities',
      section_related_concepts: 'Related Concepts',
      section_mentions_in_source: 'Mentions in Source',
      section_definition: 'Definition',
      section_key_characteristics: 'Key Characteristics',
      section_applications: 'Applications',
      section_source: 'Source',
      section_core_content: 'Core Content',
      section_key_entities: 'Key Entities',
      section_key_concepts: 'Key Concepts',
      section_new_information: 'New Information',
      new_claim: 'New Claim',
      existing_knowledge: 'Existing Knowledge',
      resolution_suggestion: 'Resolution Suggestion',
      source_page: 'Source Page',
    }),
    getExistingWikiPages: async () => [],
    getSchemaContext: async () => undefined,
    onFileWrite: undefined,
    onProgress: undefined,
    onDone: undefined,
  };

  return { ctx, vault };
}
