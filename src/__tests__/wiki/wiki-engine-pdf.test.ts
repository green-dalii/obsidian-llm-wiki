/**
 * v1.25.0 PR2 redo — WikiEngine PDF ingest branch tests (cache-only architecture).
 *
 * The PDF branch calls `convertPdfToMarkdown` (mocked here) to obtain
 * LLM-converted markdown, then re-enters the standard ingest pipeline via
 * `analyzeSource(file, { contentOverride })`. The sidecar write path is
 * gone — this test suite proves the cache-only flow end-to-end.
 *
 * Tests cover:
 * - Happy path: PDF converted → markdown fed as virtual body → wiki pages created
 * - Unsupported provider: graceful skip with localized Notice key
 * - Encrypted PDF: graceful skip
 * - LLM error: propagates (preserves existing retry semantics)
 * - Empty converted content (corrupt cache): caught by pre-ingest gate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TFile, TFolder } from 'obsidian';
import { createWikiEngineHarness, wikiPagesWritten } from '../__support__/wiki-engine-harness';
import * as pdfConverter from '../../core/pdf-converter';
import { convertPdfToMarkdown } from '../../core/pdf-converter';

// Mock pdf-converter so we don't need real PDF bytes / SubtleCrypto / LLM call.
// Tests assert on WikiEngine's integration with the converter's return value.
// NOTE: vi.mock factory must NOT reference top-level variables (hoisted to top
// of file before declarations). Tests reach into the mock via vi.mocked().
vi.mock('../../core/pdf-converter', async () => {
  const actual = await vi.importActual<typeof import('../../core/pdf-converter')>('../../core/pdf-converter');
  return {
    ...actual,
    convertPdfToMarkdown: vi.fn(),
  };
});

const mockedConvert = vi.mocked(convertPdfToMarkdown);

// Also expose the error classes from the (still-real) module.
const { UnsupportedProviderError, EncryptedPdfError } = pdfConverter;

function pdfFile(path = 'sources/paper.pdf'): TFile {
  const name = path.split('/').pop() ?? 'paper.pdf';
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const file = Object.assign(new TFile(), {
    path,
    name,
    basename: 'paper',
    extension: 'pdf',
  });
  // Wire up a parent folder so the sidecar path computation
  // (`file.parent.path/<basename>.pdf.md`) mirrors real Obsidian TFiles.
  if (dir) {
    const folder = new TFolder();
    folder.path = dir;
    (file as unknown as { parent: TFolder }).parent = folder;
  }
  return file;
}

describe('WikiEngine.ingestSource — PDF cache-only branch (#PR2 redo)', () => {
  beforeEach(() => {
    mockedConvert.mockReset();
  });

  it('feeds LLM-converted markdown as virtual source body and creates wiki pages', async () => {
    // Mock convertPdfToMarkdown returns our fake "converted" markdown.
    // The engine must hand it to analyzeSource without ever calling vault.read on the PDF.
    mockedConvert.mockResolvedValueOnce({
      markdown: '# Converted Paper\n\nThis is the LLM-extracted body.',
      metadata: { convertedAt: '2026-07-15T00:00:00Z', converter: 'anthropic/claude-opus-4-8' },
    });

    const h = createWikiEngineHarness({
      llmResponses: [
        JSON.stringify({
          source_title: 'Paper',
          summary: '...',
          entities: [{ name: 'Concept X', type: 'concept', summary: '', mentions_in_source: [], related_concepts: [] }],
          concepts: [],
        }),
        // page-factory stub for entity page
        '# Concept X\n\nBody',
      ],
    });

    await h.engine.ingestSource(pdfFile('sources/paper.pdf'));

    // convertPdfToMarkdown was called exactly once
    expect(mockedConvert).toHaveBeenCalledTimes(1);
    // PDF path was passed to convertPdfToMarkdown as the pdfFile argument
    type ConvertCall = [ctx: { pdfFile?: { path?: string } }];
    const firstCall = mockedConvert.mock.calls[0] as ConvertCall | undefined;
    expect(firstCall?.[0]?.pdfFile?.path).toBe('sources/paper.pdf');
    // Wiki pages were written — meaning the virtual contentOverride flowed through
    const wikiPages = wikiPagesWritten(h.writtenPaths);
    expect(wikiPages.length).toBeGreaterThan(0);
  });

  it('skips with reason=unsupported-pdf when converter throws UnsupportedProviderError', async () => {
    mockedConvert.mockRejectedValueOnce(new UnsupportedProviderError('ollama'));

    const h = createWikiEngineHarness();

    await h.engine.ingestSource(pdfFile('sources/paper.pdf'));

    // No wiki pages written
    expect(wikiPagesWritten(h.writtenPaths)).toEqual([]);
    // Last report is a skip with reason=unsupported-pdf
    const last = h.reports.at(-1);
    expect(last?.skipped).toBe(true);
    expect(last?.rejectedFiles?.[0]?.reason).toBe('unsupported-pdf');
    // No LLM calls downstream (provider gate rejected before LLM)
    expect(h.stats.llmCalls).toBe(0);
  });

  it('skips with reason=unsupported-pdf when converter throws EncryptedPdfError', async () => {
    mockedConvert.mockRejectedValueOnce(new EncryptedPdfError());

    const h = createWikiEngineHarness();

    await h.engine.ingestSource(pdfFile('sources/paper.pdf'));

    expect(wikiPagesWritten(h.writtenPaths)).toEqual([]);
    expect(h.reports.at(-1)?.skipped).toBe(true);
    expect(h.reports.at(-1)?.rejectedFiles?.[0]?.reason).toBe('unsupported-pdf');
  });

  it('propagates LLM errors verbatim (preserves retry/log semantics)', async () => {
    mockedConvert.mockRejectedValueOnce(new Error('LLM API timeout'));

    const h = createWikiEngineHarness();

    await expect(h.engine.ingestSource(pdfFile('sources/paper.pdf'))).rejects.toThrow(/LLM API timeout/);
    // No skip report — error was thrown, not reported
    expect(h.reports.at(-1)?.skipped).toBeFalsy();
  });

  it('does NOT write a sidecar file by default (cache-only architecture)', async () => {
    // PR3: default writePdfMarkdownToVault=false, so no .pdf.md sidecar.
    mockedConvert.mockResolvedValueOnce({
      markdown: '# Paper\n\nbody',
      metadata: { convertedAt: '2026-07-15T00:00:00Z', converter: 'anthropic/claude-opus-4-8' },
    });

    const h = createWikiEngineHarness({
      llmResponses: [
        JSON.stringify({ source_title: 'P', summary: 's', entities: [], concepts: [] }),
      ],
    });

    await h.engine.ingestSource(pdfFile('sources/paper.pdf'));

    // No .pdf.md file should exist in the vault.
    expect(h.files.has('sources/paper.pdf.md')).toBe(false);
  });

  it('writes sidecar file when writePdfMarkdownToVault is true (create)', async () => {
    const MARKDOWN = '# Paper\n\nConverted content.';
    mockedConvert.mockResolvedValueOnce({
      markdown: MARKDOWN,
      metadata: { convertedAt: '2026-07-15T00:00:00Z', converter: 'anthropic/claude-opus-4-8' },
    });

    const h = createWikiEngineHarness({
      settings: { writePdfMarkdownToVault: true },
      llmResponses: [
        JSON.stringify({ source_title: 'P', summary: 's', entities: [], concepts: [] }),
      ],
    });

    await h.engine.ingestSource(pdfFile('sources/paper.pdf'));

    // Sidecar must exist at the expected path with the converted markdown.
    expect(h.files.get('sources/paper.pdf.md')).toBe(MARKDOWN);
  });

  it('writes sidecar file when writePdfMarkdownToVault is true (update existing)', async () => {
    const MARKDOWN = '# Paper\n\nUpdated content.';
    mockedConvert.mockResolvedValueOnce({
      markdown: MARKDOWN,
      metadata: { convertedAt: '2026-07-15T00:00:00Z', converter: 'anthropic/claude-opus-4-8' },
    });

    const h = createWikiEngineHarness({
      files: { 'sources/paper.pdf.md': 'OLD SIDECAR' },
      settings: { writePdfMarkdownToVault: true },
      llmResponses: [
        JSON.stringify({ source_title: 'P', summary: 's', entities: [], concepts: [] }),
      ],
    });

    await h.engine.ingestSource(pdfFile('sources/paper.pdf'));

    // Old content must be replaced with the new conversion.
    expect(h.files.get('sources/paper.pdf.md')).toBe(MARKDOWN);
  });

  // v1.25.0 PR3 follow-up #3 (P2): isPdfRelatedLlmError tightening + regression tests.
  //
  // Contract:
  //   - Return true  → "provider refused to accept PDF binary" → route to `sourceRejectedPdfUnsupported`
  //   - Return false → any other error (network, vault IO, abort, generic 5xx) → re-throw to outer ingest error path
  //
  // The pre-fix classifier substring-matched 'pdf' alone — it over-classified
  // transient errors and file-name leaks into "unsupported PDF", misleading
  // users into disabling `forcePdfSupport` for non-PDF issues. These six
  // tests pin the contract for both the happy path (route) and the
  // false-positive path (re-throw).
  describe('WikiEngine.isPdfRelatedLlmError — P2 classifier tightening', () => {
    /**
     * Helper: reach into the private `isPdfRelatedLlmError` via the public
     * ingest path. We can't unit-test the method directly (private), so we
     * exercise it indirectly — by mocking the converter to throw the exact
     * error string and observing whether the engine routes to skip or re-throws.
     */
    async function runWithConverterError(errorMessage: string): Promise<{ skipped: boolean; thrown: boolean; }> {
      mockedConvert.mockRejectedValueOnce(new Error(errorMessage));
      const h = createWikiEngineHarness();
      try {
        await h.engine.ingestSource(pdfFile('sources/paper.pdf'));
        const last = h.reports.at(-1);
        return { skipped: last?.skipped === true, thrown: false };
      } catch (e) {
        return { skipped: false, thrown: e instanceof Error };
      }
    }

    it('routes OpenAI-compatible 400 with file part mention → unsupported-pdf', async () => {
      const r = await runWithConverterError(
        '400 Invalid file part: application/pdf not supported by this model'
      );
      expect(r.skipped).toBe(true);
      expect(r.thrown).toBe(false);
    });

    it('routes Anthropic-style mediaType rejection → unsupported-pdf', async () => {
      const r = await runWithConverterError(
        "Error: mediaType 'application/pdf' is rejected by this provider"
      );
      expect(r.skipped).toBe(true);
      expect(r.thrown).toBe(false);
    });

    // Pre-fix bug: 'pdf' substring alone routed this to unsupported-pdf → user
    // got a misleading Notice and turned off forcePdfSupport for a transient
    // network error that would have resolved on retry.
    it('does NOT route 413 size-limit error (contains "pdf" but no rejection verb) → re-throws', async () => {
      const r = await runWithConverterError(
        '413 Request Entity Too Large: pdf conversion request exceeds 50MB provider limit'
      );
      expect(r.skipped).toBe(false);
      expect(r.thrown).toBe(true);
    });

    it('does NOT route 5xx upstream failure → re-throws', async () => {
      const r = await runWithConverterError(
        'upstream connect error or disconnect/reset before headers'
      );
      expect(r.skipped).toBe(false);
      expect(r.thrown).toBe(true);
    });

    // Pre-fix bug: dev log line "Cannot read property 'pdf_data' of undefined"
    // was routed to unsupported-pdf via 'pdf' substring → user thinks
    // provider doesn't support PDF but it's a null-deref in our code.
    it('does NOT route internal null-deref errors containing "pdf_data" → re-throws', async () => {
      const r = await runWithConverterError(
        "Cannot read property 'pdf_data' of undefined"
      );
      expect(r.skipped).toBe(false);
      expect(r.thrown).toBe(true);
    });

    // Pre-fix bug: rejection-verb without PDF/marker (a generic "invalid input"
    // the LLM client throws for many reasons) was misclassified as PDF-related.
    it('does NOT route generic "invalid input" without PDF marker → re-throws', async () => {
      const r = await runWithConverterError(
        '400 invalid input: missing required field'
      );
      expect(r.skipped).toBe(false);
      expect(r.thrown).toBe(true);
    });
  });
});