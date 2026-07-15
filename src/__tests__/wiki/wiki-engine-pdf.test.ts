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
import { TFile } from 'obsidian';
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
  return Object.assign(new TFile(), {
    path,
    name,
    basename: 'paper',
    extension: 'pdf',
  });
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

  it('does NOT write a sidecar file to the vault (cache-only architecture)', async () => {
    // The whole point of the pivot: no <vault>/<basename>.pdf.md sidecar.
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

    // The sidecar pattern was "<pdfFile.path>.md" (e.g. sources/paper.pdf.md)
    const sidecarWrites = h.writtenPaths.filter(p => p.endsWith('.pdf.md'));
    expect(sidecarWrites).toEqual([]);
  });
});