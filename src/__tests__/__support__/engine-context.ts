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

import { TFile } from 'obsidian'; // mocked in setup.ts
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
  remove(path: string): void { this.files.delete(path); }
  list(): string[] { return [...this.files.keys()]; }
  get size(): number { return this.files.size; }
}

// ── Mock LLM Client ──────────────────────────────────────────────

interface CreateMessageCall {
  enableThinking?: boolean;
  // other fields intentionally omitted for the F6 test
}

/**
 * Mock LLM client that records every createMessage call's params. Tests
 * can inspect `ctx.lastCreateMessageCall` to verify wiring (e.g. that
 * `enableThinking: false` is propagated to all production call sites —
 * Issue #99 v2 Layer A).
 */
export function createMockClient(responses: string[]): LLMClient & { lastCreateMessageCall?: CreateMessageCall } {
  let idx = 0;
  const client: LLMClient & { lastCreateMessageCall?: CreateMessageCall } = {
    createMessage: async (params: { enableThinking?: boolean } & Record<string, unknown>) => {
      client.lastCreateMessageCall = { enableThinking: params.enableThinking };
      return responses[idx++] ?? '{"entities":[],"concepts":[],"contradictions":[],"related_pages":[],"key_points":[]}';
    },
  };
  return client;
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
  autoSmartFix: false,
  pageGenerationConcurrency: 1,
  batchDelayMs: 0,
  llmReady: true,
  maxTokensPerCall: 0,
  tagVocabularyMode: 'default',
  customEntityTags: '',
  customConceptTags: '',
  slugCase: 'lower' as const,
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

  // Build mock files array for getMarkdownFiles
  const buildMockFiles = () => vault.list().map(path => ({
    path,
    basename: path.split('/').pop()?.replace('.md', '') || '',
  }));

  const ctx: EngineContext = {
    app: {
      vault: {
        read: async (file: { path: string }) => vault.read(file.path),
        getMarkdownFiles: () => buildMockFiles().map(f => ({
          ...f,
          extension: 'md',
          parent: null,
        })),
        getAbstractFileByPath: (path: string) => {
          if (!vault.has(path)) return null;
          return Object.assign(new TFile(), {
            path,
            basename: path.split('/').pop()?.replace('.md', '') || '',
            extension: 'md',
          });
        },
      },
    } as unknown as EngineContext['app'],
    settings,
    getClient: () => client,
    createOrUpdateFile: async (path, content) => { vault.write(path, content); },
    tryReadFile: async (path) => vault.read(path),
    deleteFile: async (path: string) => { vault.remove(path); },
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
    getExistingWikiPages: async () => {
      const pages: Array<{ path: string; title: string; wikiLink: string; aliases?: string[] }> = [];
      for (const path of vault.list()) {
        if (path.startsWith('wiki/') &&
            !path.includes('index.md') &&
            !path.includes('log.md') &&
            !path.includes('/schema/') &&
            !path.includes('/contradictions/')) {
          const content = vault.read(path) ?? '';
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          let aliases: string[] | undefined;
          if (fmMatch) {
            const aliasesLine = fmMatch[1].split('\n').find(l => l.startsWith('aliases:'));
            if (aliasesLine) {
              const match = aliasesLine.match(/aliases:\s*\[([^\]]*)\]/);
              if (match && match[1].trim()) {
                aliases = match[1].split(',').map(a => a.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
              }
            }
          }
          const relPath = path.replace('wiki/', '').replace('.md', '');
          const title = path.split('/').pop()?.replace('.md', '') || '';
          pages.push({
            path,
            title,
            wikiLink: `[[${relPath}|${title}]]`,
            aliases,
          });
        }
      }
      return pages;
    },
    getSchemaContext: async () => undefined,
    onFileWrite: undefined,
    onProgress: undefined,
    onDone: undefined,
  };

  return { ctx, vault };
}
