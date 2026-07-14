export const PDF_MEDIA_TYPE = 'application/pdf';

export const PDF_EXTRACTION_PROMPT =
  'Extract the complete readable text from this PDF. Preserve document order, headings, lists, and tables where possible. Return only extracted text; do not summarize, explain, or add commentary.';

export class PdfUnsupportedError extends Error {
  constructor(message = 'The configured provider or model does not support PDF input.') {
    super(message);
    this.name = 'PdfUnsupportedError';
  }
}

const PROVIDERS_WITHOUT_PDF_SUPPORT: Record<string, true> = {
  deepseek: true,
  minimax: true,
  ollama: true,
  lmstudio: true,
};

export function providerSupportsPdf(provider: string): boolean {
  return PROVIDERS_WITHOUT_PDF_SUPPORT[provider.toLowerCase()] !== true;
}

export function isDocumentUnsupportedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  const mentionsDocument = /\b(pdf|document|file)\b/.test(normalized);
  const indicatesUnsupported = /\b(?:not supported|unsupported|not allowed)\b/.test(normalized);

  return mentionsDocument && indicatesUnsupported;
}

/**
 * Some OpenAI-compatible gateways accept the request but drop its file part,
 * then return a short instruction to upload the PDF. Treat that response as a
 * capability failure instead of indexing it as the source's extracted text.
 */
export function isDocumentMissingResponse(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length > 240) return false;

  return /\b(?:please\s+)?(?:upload|attach|provide)\s+(?:the\s+)?(?:pdf|document|file)\b/.test(normalized)
    || /\b(?:no|without)\s+(?:the\s+)?(?:pdf|document|file)\s+(?:was\s+)?(?:provided|attached|uploaded)\b/.test(normalized)
    || /\b(?:cannot|can't|unable to)\s+(?:access|read|see|process)\s+(?:the\s+)?(?:pdf|document|file)\b/.test(normalized)
    || /请.{0,8}(?:上传|附上).{0,8}(?:pdf|文件)/.test(normalized);
}
