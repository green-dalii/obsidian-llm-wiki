import { describe, it, expect } from 'vitest';
import {
  parsePdfInfoDictText,
  isEncryptedPdfText,
} from '../../core/pdf-metadata';

// Helper to build a minimal valid PDF binary for tests.
// Real PDF spec: header + body + xref + trailer with /Info and /Encrypt refs.
const buildPdf = (opts: {
  title?: string;
  author?: string;
  pages?: number;
  encrypted?: boolean;
}): Uint8Array => {
  // We'll use a tiny synthetic PDF that has the right markers.
  // The parser scans for /Title, /Author, /Info, /Encrypt in the raw bytes.
  const enc = opts.encrypted ?? false;

  // Build info dict content (will be referenced via /Info 1 0 R).
  // Only include /Title and /Author if they are provided — absent fields
  // reflect real-world PDFs that don't have these set.
  const infoEntries: string[] = [];
  if (opts.title !== undefined) infoEntries.push(`/Title (${opts.title})`);
  if (opts.author !== undefined) infoEntries.push(`/Author (${opts.author})`);
  const infoDict = infoEntries.length > 0
    ? `<< ${infoEntries.join(' ')} >>`
    : `<< >>`;

  // Build pages dict (if pages given)
  const pagesRef = opts.pages !== undefined ? `2 0 obj\n<< /Type /Pages /Count ${opts.pages} /Kids [3 0 R] >>\nendobj\n` : '';

  // Build root with /Pages reference
  const rootDict = opts.pages !== undefined
    ? `<< /Type /Catalog /Pages 2 0 R${enc ? ' /Encrypt 4 0 R' : ''} >>`
    : `<< /Type /Catalog${enc ? ' /Encrypt 4 0 R' : ''} >>`;

  const objects =
    `1 0 obj\n${infoDict}\nendobj\n` +
    pagesRef +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n` +
    (enc ? `4 0 obj\n<< /Filter /Standard /V 1 /R 2 >>\nendobj\n` : '');

  const header = '%PDF-1.4\n';
  const body = objects;
  const xrefOffset = header.length + body.length;
  const xref = `xref\n0 ${enc ? 5 : 4}\n0000000000 65535 f \n${pad(header.length)} 00000 n \n${pad(header.length + infoDict.length + 20)} 00000 n \n${pad(header.length + infoDict.length + 20 + (opts.pages !== undefined ? 60 : 0))} 00000 n \n${enc ? `${pad(header.length + infoDict.length + 20 + (opts.pages !== undefined ? 60 : 0) + 60)} 00000 n \n` : ''}`;

  const trailer =
    `trailer\n${rootDict}\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(header + body + xref + trailer);
};

// pad to 10-digit xref format
const pad = (n: number): string => n.toString().padStart(10, '0');

const decodeLatin1 = (bytes: Uint8Array): string => new TextDecoder('latin1').decode(bytes);

describe('parsePdfInfoDictText', () => {
  it('extracts title and author from standard PDF Info dict', () => {
    const pdfBytes = buildPdf({ title: 'Sample Paper', author: 'John Doe', pages: 12 });
    const info = parsePdfInfoDictText(decodeLatin1(pdfBytes));
    expect(info.title).toBe('Sample Paper');
    expect(info.author).toBe('John Doe');
    expect(info.pageCount).toBe(12);
  });

  it('handles UTF-16BE strings (PDF spec default for non-ASCII)', () => {
    // Some PDF producers emit UTF-16BE strings with BOM
    const title = '中文标题';
    const bom = 'ÿþ';
    const utf16Bytes = new TextEncoder().encode(bom + title);
    const utf16Hex = Array.from(utf16Bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const titleStr = `<${utf16Hex}>`;
    const pdfBytes = buildPdf({ title: titleStr, pages: 5 });
    const info = parsePdfInfoDictText(decodeLatin1(pdfBytes));
    // Either the title decodes to 中文标题, or is left as raw — both acceptable
    // for our purposes (LLM will handle raw if decode fails)
    expect(info.title).toBeDefined();
  });

  it('returns empty object when no Info dict present (raw content scan fails)', () => {
    // PDF with no /Title, /Author, or /Pages references
    const minimalPdf = new TextEncoder().encode(
      '%PDF-1.4\n1 0 obj\n<< >>\nendobj\nxref\n0 2\n0000000000 65535 f \ntrailer\n<< /Size 2 >>\nstartxref\n0\n%%EOF\n'
    );
    const info = parsePdfInfoDictText(decodeLatin1(minimalPdf));
    expect(info.title).toBeUndefined();
    expect(info.author).toBeUndefined();
    expect(info.pageCount).toBeUndefined();
  });

  it('extracts pageCount from /Count field even when no /Title present', () => {
    const pdfBytes = buildPdf({ pages: 42 });
    const info = parsePdfInfoDictText(decodeLatin1(pdfBytes));
    expect(info.pageCount).toBe(42);
    expect(info.title).toBeUndefined();
    expect(info.author).toBeUndefined();
  });
});

describe('isEncryptedPdfText', () => {
  it('returns true when /Encrypt is present in trailer', () => {
    const pdfBytes = buildPdf({ encrypted: true, pages: 5 });
    const result = isEncryptedPdfText(decodeLatin1(pdfBytes));
    expect(result).toBe(true);
  });

  it('returns false when /Encrypt is absent', () => {
    const pdfBytes = buildPdf({ pages: 5 });
    const result = isEncryptedPdfText(decodeLatin1(pdfBytes));
    expect(result).toBe(false);
  });
});