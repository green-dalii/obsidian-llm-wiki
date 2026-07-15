/**
 * v1.25.0 PR2 — PDF ingest orchestrator.
 *
 * Mediates between the WikiEngine (which has settings + LLM client) and the
 * pure `convertPdfToMarkdown` function (which has no app/UI awareness).
 *
 * Flow for `prepareForIngest(pdfFile)`:
 *   1. Convert PDF → Markdown via the configured LLM provider
 *   2. Write `<vault>/<basename>.pdf.md` as a sidecar
 *   3. Return the sidecar TFile so the caller can re-enter the existing
 *      .md ingest path with it
 *
 * Design choices:
 * - The sidecar file is committed to the vault (auditable, can be diffed,
 *   survives vault moves, deletable independently of the source PDF).
 * - The orchestrator does NOT call `ingestSource` itself — the WikiEngine
 *   does that, so we keep the responsibility split clean (orchestrator =
 *   sidecar + conversion, WikiEngine = ingest pipeline).
 * - Conversion errors (encrypted PDF, unsupported provider) propagate as
 *   thrown exceptions; the WikiEngine catches them and reports a skip.
 */

import { App, TFile } from 'obsidian';
import { normalizePath } from 'obsidian';
import {
  convertPdfToMarkdown,
  type PdfConversionContext,
} from './pdf-converter';
import type { LLMClient } from '../types';

export interface PdfIngestOrchestratorOptions {
  app: App;
  llmClient: LLMClient;
  settings: PdfConversionContext['settings'];
  resolveModelForTask: PdfConversionContext['resolveModelForTask'];
  subtle?: SubtleCrypto;
}

/**
 * Convert a PDF file to a sidecar `<basename>.pdf.md` in the vault.
 *
 * Returns the sidecar TFile on success. Throws on:
 * - Unsupported provider (`UnsupportedProviderError`)
 * - Encrypted PDF (`EncryptedPdfError`)
 * - LLM error (propagated verbatim)
 *
 * The caller is responsible for catching these and surfacing them via the
 * usual `reportSkip` / Notice path.
 */
export async function preparePdfForIngest(
  pdfFile: TFile,
  options: PdfIngestOrchestratorOptions
): Promise<TFile> {
  const { app, llmClient, settings, resolveModelForTask, subtle } = options;

  // Convert the PDF binary to Markdown. convertPdfToMarkdown owns:
  //   - provider capability gate
  //   - sha256-keyed cache lookup
  //   - encryption check
  //   - LLM call (if miss)
  //   - error class instantiation
  const result = await convertPdfToMarkdown({
    app,
    settings,
    pdfFile,
    llmClient,
    resolveModelForTask,
    ...(subtle ? { subtle } : {}),
  });

  // Build the sidecar file path: <vault>/<basename>.pdf.md
  // Note: we don't put it under the wiki folder — the sidecar is a
  // source-side artifact, not a wiki page. It lives next to the PDF.
  const sidecarPath = normalizePath(`${pdfFile.path}.md`);

  // Build the sidecar frontmatter + body. The body IS the converted markdown;
  // the frontmatter captures provenance (which PDF, when converted, by what).
  const frontmatter = buildPdfSidecarFrontmatter(pdfFile, result, settings.provider);
  const fullContent = `---\n${frontmatter}\n---\n\n${result.markdown}\n`;

  // Write the sidecar via Obsidian's vault adapter (atomic create-or-modify).
  const existing = app.vault.getAbstractFileByPath(sidecarPath);
  if (isTFile(existing)) {
    await app.vault.modify(existing, fullContent);
    return existing;
  }
  const created = await app.vault.create(sidecarPath, fullContent);
  if (!isTFile(created)) {
    throw new Error(`PDF sidecar creation produced non-file result at ${sidecarPath}`);
  }
  return created;
}

interface SidecarFrontmatterInputs {
  title?: string;
  author?: string;
  pageCount?: number;
  convertedAt: string;
  converter: string;
}

function buildPdfSidecarFrontmatter(
  pdfFile: TFile,
  result: { metadata: SidecarFrontmatterInputs },
  provider: string
): string {
  const lines: string[] = [
    `sourceType: pdf`,
    `sourcePath: ${pdfFile.path}`,
    `provider: ${provider}`,
  ];
  if (result.metadata.title) lines.push(`pdfTitle: "${escapeYaml(result.metadata.title)}"`);
  if (result.metadata.author) lines.push(`pdfAuthor: "${escapeYaml(result.metadata.author)}"`);
  if (result.metadata.pageCount !== undefined) lines.push(`pdfPages: ${result.metadata.pageCount}`);
  lines.push(`convertedAt: ${result.metadata.convertedAt}`);
  return lines.join('\n');
}

function escapeYaml(s: string): string {
  // Escape double-quote + backslash for safe YAML quoting.
  return s.replace(/[\\"]/g, (c) => `\\${c}`);
}

/**
 * Type-narrowing helper for vault adapter results. Obsidian's API
 * documents `getAbstractFileByPath` as `TFile | TFolder | null`, but
 * the `instanceof TFile` check requires importing the class which
 * couples this module to TFile's prototype chain. Duck-typing on
 * `extension` (TFile-only field) is the canonical Obsidian idiom.
 */
function isTFile(x: unknown): x is TFile {
  return !!x && typeof x === 'object' && 'extension' in x && typeof x.extension === 'string';
}