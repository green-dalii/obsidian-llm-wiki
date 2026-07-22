/** PDF conversion public entry point and backend router. */

import { nativeLlmPdfBackend } from './pdf-backends/native-llm-pdf-backend';
import { mineruPdfBackend } from './pdf-backends/mineru-pdf-backend';
import type {
  PdfBackendContext,
  PdfConversionBackend,
  PdfConversionBackendId,
  PdfConversionResult,
} from './pdf-backends/types';

// --- public types ---

/** What the caller hands us. Kept narrow so test mocks stay simple. */
export type PdfConversionContext = PdfBackendContext;

/** What we return on success. */
export type ConversionResult = PdfConversionResult;

// --- errors ---

export {
  UnsupportedProviderError,
  EncryptedPdfError,
} from './pdf-backends/native-llm-pdf-backend';

// --- main entry point ---

/**
 * Converts a PDF to Markdown using the configured LLM provider.
 *
 * Returns the cached entry on cache hit; on miss, calls the LLM, caches
 * the result, and returns. Throws UnsupportedProviderError if the provider
 * cannot handle PDF, EncryptedPdfError if the file is encrypted, and
 * propagates LLM errors verbatim.
 */
export function selectPdfBackend(
  id: PdfConversionBackendId | undefined,
  backends: Record<PdfConversionBackendId, PdfConversionBackend>,
): PdfConversionBackend {
  return id === 'mineru' ? backends.mineru : backends.native;
}

const PDF_BACKENDS: Record<PdfConversionBackendId, PdfConversionBackend> = {
  native: nativeLlmPdfBackend,
  mineru: mineruPdfBackend,
};

export function convertPdfToMarkdown(ctx: PdfConversionContext): Promise<ConversionResult> {
  return convertPdfToMarkdownWithBackends(ctx, PDF_BACKENDS);
}

/** @internal Test seam for verifying complete routing and no-fallback behavior. */
export function convertPdfToMarkdownWithBackends(
  ctx: PdfConversionContext,
  backends: Record<PdfConversionBackendId, PdfConversionBackend>,
): Promise<ConversionResult> {
  const backend = selectPdfBackend(ctx.settings.pdfConversionBackend ?? 'native', backends);
  return backend.convert(ctx);
}
