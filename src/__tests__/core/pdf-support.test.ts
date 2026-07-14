import { describe, expect, it } from 'vitest';
import {
  PDF_EXTRACTION_PROMPT,
  PDF_MEDIA_TYPE,
  isDocumentMissingResponse,
  isDocumentUnsupportedError,
  providerSupportsPdf,
} from '../../core/pdf-support';

describe('PDF support contract', () => {
  it('uses the native PDF media type and extraction-only prompt', () => {
    expect(PDF_MEDIA_TYPE).toBe('application/pdf');
    expect(PDF_EXTRACTION_PROMPT).toContain('Return only extracted text');
  });

  it('preflights only providers known not to support PDF input', () => {
    for (const provider of ['deepseek', 'kimi', 'minimax', 'ollama', 'lmstudio']) {
      expect(providerSupportsPdf(provider)).toBe(false);
    }
    for (const provider of ['openai', 'anthropic', 'gemini', 'custom', 'future-compatible-provider']) {
      expect(providerSupportsPdf(provider)).toBe(true);
    }
  });

  it('classifies document capability errors without hiding invalid PDFs', () => {
    expect(isDocumentUnsupportedError(new Error('PDF file input is not supported'))).toBe(true);
    expect(isDocumentUnsupportedError(new Error('document content type is unsupported'))).toBe(true);
    expect(isDocumentUnsupportedError(new Error('file input is not allowed'))).toBe(true);
    expect(isDocumentUnsupportedError(new Error('corrupt PDF file'))).toBe(false);
    expect(isDocumentUnsupportedError(new Error('password-protected PDF'))).toBe(false);
    expect(isDocumentUnsupportedError(new Error('invalid PDF'))).toBe(false);
    expect(isDocumentUnsupportedError(new Error('unsupported model'))).toBe(false);
  });

  it('detects short provider replies that reveal a dropped PDF attachment', () => {
    expect(isDocumentMissingResponse('Please upload the PDF file.')).toBe(true);
    expect(isDocumentMissingResponse('No PDF was provided.')).toBe(true);
    expect(isDocumentMissingResponse('I cannot access the document.')).toBe(true);
    expect(isDocumentMissingResponse('请上传 PDF 文件。')).toBe(true);
    expect(isDocumentMissingResponse('The PDF explains the upload workflow in detail.')).toBe(false);
  });
});
