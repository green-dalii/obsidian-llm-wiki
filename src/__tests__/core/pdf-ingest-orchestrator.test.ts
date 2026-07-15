/**
 * v1.25.0 PR2 — PDF ingest orchestrator tests.
 *
 * The orchestrator's job is narrow: convert PDF → Markdown via the LLM,
 * write a sidecar `<vault>/<basename>.pdf.md`, return the sidecar TFile.
 * Tests focus on the sidecar write + metadata frontmatter; the underlying
 * conversion is tested in pdf-converter.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TFile } from 'obsidian';
import type { LLMClient } from '../../types';
import {
  preparePdfForIngest,
} from '../../core/pdf-ingest-orchestrator';
import { UnsupportedProviderError, EncryptedPdfError } from '../../core/pdf-converter';

// eslint-disable-next-line obsidianmd/no-global-this
const testSubtle = (globalThis as { crypto: { subtle: SubtleCrypto } }).crypto.subtle;

// Mock the cache class (the orchestrator delegates to convertPdfToMarkdown
// which uses the cache; we don't want disk I/O in unit tests).
const mockCacheStore = new Map<string, unknown>();
vi.mock('../../core/pdf-cache', async () => {
  const actual = await vi.importActual<typeof import('../../core/pdf-cache')>('../../core/pdf-cache');
  return {
    ...actual,
    PdfConversionCache: class {
      async get(key: string) { return mockCacheStore.get(key) ?? null; }
      async set(key: string, entry: unknown) { mockCacheStore.set(key, entry); }
    },
  };
});

interface MockAppOpts {
  pdfBytes?: Uint8Array;
  /** Pre-populated vault files keyed by path. */
  existingFiles?: Map<string, string>;
}

const makeApp = (opts: MockAppOpts = {}) => {
  const pdfBytes = opts.pdfBytes ?? new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
  const files = new Map(opts.existingFiles ?? []);
  const created: Array<{ path: string; content: string }> = [];
  const modified: Array<{ path: string; content: string }> = [];

  return {
    vault: {
      // eslint-disable-next-line obsidianmd/hardcoded-config-path
      configDir: '.obsidian',
      getAbstractFileByPath: vi.fn((path: string) => {
        if (files.has(path)) {
          // Plain-object shim with the fields the orchestrator reads
          // (path, name, extension). The orchestrator's isTFile helper
          // duck-types on `extension`, so a non-TFile prototype is fine.
          return {
            path,
            name: path.split('/').pop() ?? '',
            extension: path.split('.').pop() ?? '',
          };
        }
        return null;
      }),
      adapter: {
        readBinary: vi.fn(async () => pdfBytes),
      },
      create: vi.fn(async (path: string, content: string) => {
        created.push({ path, content });
        files.set(path, content);
        return new TFile();
      }),
      modify: vi.fn(async (file: { path: string }, content: string) => {
        modified.push({ path: file.path, content });
        files.set(file.path, content);
      }),
    },
    _created: created,
    _modified: modified,
  };
};

const makePdfFile = (path = 'sources/paper.pdf'): TFile => {
  return Object.assign(new TFile(), {
    path,
    name: path.split('/').pop() ?? '',
    basename: path.split('/').pop()?.replace(/\.pdf$/, '') ?? '',
    extension: 'pdf',
  });
};

interface OrchestratorBundle {
  app: ReturnType<typeof makeApp>;
  llmClient: LLMClient;
  mockCreateMessage: ReturnType<typeof vi.fn>;
  resolveModelForTask: ReturnType<typeof vi.fn>;
}

const makeBundle = (llmResponse: string): OrchestratorBundle => {
  const mockCreateMessage = vi.fn().mockImplementation(async () => llmResponse);
  return {
    app: makeApp(),
    llmClient: { createMessage: mockCreateMessage },
    mockCreateMessage,
    resolveModelForTask: vi.fn().mockImplementation(() => 'claude-opus-4-8'),
  };
};

describe('preparePdfForIngest', () => {
  beforeEach(() => {
    mockCacheStore.clear();
    vi.clearAllMocks();
  });

  it('converts PDF, writes sidecar .pdf.md, and returns the new TFile', async () => {
    const b = makeBundle('---\nsourceType: pdf\n---\n# Paper title\n\nBody content here');
    const pdfFile = makePdfFile('sources/paper.pdf');

    const sidecar = await preparePdfForIngest(pdfFile, {
      app: b.app as never,
      llmClient: b.llmClient,
      settings: {
        provider: 'anthropic',
        apiKey: 'test',
        model: 'claude-opus-4-8',
      },
      resolveModelForTask: b.resolveModelForTask as never,
      subtle: testSubtle,
    });

    expect(sidecar).toBeInstanceOf(TFile);
    // sidecar path is <vault>/<basename>.pdf.md (sibling of source PDF)
    expect(b.app._created).toHaveLength(1);
    expect(b.app._created[0]?.path).toBe('sources/paper.pdf.md');
    // content contains the LLM response + provenance frontmatter
    const written = b.app._created[0]?.content ?? '';
    expect(written).toContain('sourceType: pdf');
    expect(written).toContain('sourcePath: sources/paper.pdf');
    expect(written).toContain('provider: anthropic');
    expect(written).toContain('Body content here');
  });

  it('overwrites existing sidecar file instead of creating a duplicate', async () => {
    const existing = new Map([['sources/paper.pdf.md', '# OLD CONTENT']]);
    const b = makeBundle('# New body');
    const app = makeApp({ existingFiles: existing });
    const pdfFile = makePdfFile('sources/paper.pdf');

    await preparePdfForIngest(pdfFile, {
      app: app as never,
      llmClient: b.llmClient,
      settings: { provider: 'anthropic', apiKey: 'test', model: 'claude-opus-4-8' },
      resolveModelForTask: b.resolveModelForTask as never,
      subtle: testSubtle,
    });

    expect(app._created).toHaveLength(0);
    expect(app._modified).toHaveLength(1);
    expect(app._modified[0]?.path).toBe('sources/paper.pdf.md');
    expect(app._modified[0]?.content).toContain('New body');
  });

  it('propagates UnsupportedProviderError verbatim (PDF path failure surfaces to caller)', async () => {
    const b = makeBundle('');
    b.mockCreateMessage.mockRejectedValueOnce(new UnsupportedProviderError('ollama'));
    const pdfFile = makePdfFile();

    await expect(preparePdfForIngest(pdfFile, {
      app: b.app as never,
      llmClient: b.llmClient,
      settings: { provider: 'ollama', apiKey: '', model: 'llama3' },
      resolveModelForTask: b.resolveModelForTask as never,
      subtle: testSubtle,
    })).rejects.toThrow(UnsupportedProviderError);
  });

  it('propagates EncryptedPdfError verbatim (no silent skip of encrypted PDFs)', async () => {
    // Encrypted PDF gets detected by convertPdfToMarkdown BEFORE the LLM call.
    const encBytes = new TextEncoder().encode(
      '%PDF-1.4\n1 0 obj\n<< >>\nendobj\ntrailer\n<< /Size 1 /Encrypt 2 0 R >>\nstartxref\n0\n%%EOF\n'
    );
    const b = makeBundle('');
    const app = makeApp({ pdfBytes: encBytes });
    const pdfFile = makePdfFile();

    await expect(preparePdfForIngest(pdfFile, {
      app: app as never,
      llmClient: b.llmClient,
      settings: { provider: 'anthropic', apiKey: 'test', model: 'claude-opus-4-8' },
      resolveModelForTask: b.resolveModelForTask as never,
      subtle: testSubtle,
    })).rejects.toThrow(EncryptedPdfError);

    // LLM should NOT have been called for an encrypted PDF.
    expect(b.mockCreateMessage).not.toHaveBeenCalled();
  });

  it('caches by sha256 of source bytes + model so a second ingest skips the LLM', async () => {
    const b1 = makeBundle('# Cached body');
    const pdfFile1 = makePdfFile('sources/paper.pdf');
    await preparePdfForIngest(pdfFile1, {
      app: b1.app as never,
      llmClient: b1.llmClient,
      settings: { provider: 'anthropic', apiKey: 'test', model: 'claude-opus-4-8' },
      resolveModelForTask: b1.resolveModelForTask as never,
      subtle: testSubtle,
    });
    expect(b1.mockCreateMessage).toHaveBeenCalledTimes(1);

    // Second ingest with the same PDF bytes + same model → cache hit, LLM skipped.
    const b2 = makeBundle('# Should not run');
    const pdfFile2 = makePdfFile('sources/paper.pdf');
    await preparePdfForIngest(pdfFile2, {
      app: b2.app as never,
      llmClient: b2.llmClient,
      settings: { provider: 'anthropic', apiKey: 'test', model: 'claude-opus-4-8' },
      resolveModelForTask: b2.resolveModelForTask as never,
      subtle: testSubtle,
    });
    expect(b2.mockCreateMessage).not.toHaveBeenCalled();
  });
});