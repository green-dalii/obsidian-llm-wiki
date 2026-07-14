/**
 * v1.25.0 PDF Level 1 — PDF Info dict metadata parser.
 *
 * Extracts lightweight metadata from a PDF binary (no npm dependency).
 * The PDF spec places the Info dict as an indirect object referenced from
 * the trailer's `/Info` entry. Common keys: /Title, /Author, /CreationDate,
 * /ModDate, /Producer, /Creator. /Count is in the /Pages tree (root.Pages.Count).
 *
 * Parsing strategy: byte-level regex scan. The PDF format is text-heavy
 * enough that the Info dict values appear as ASCII (or UTF-16BE with BOM)
 * strings even in binary PDFs. We do NOT do a full xref-table parse — that
 * is out of scope for Level 1.
 *
 * The output is best-effort: missing fields are simply absent from the
 * returned object. The downstream LLM in pdf-converter fills any gaps.
 *
 * Inputs are latin1-decoded strings (one byte → one char). Callers
 * (pdf-converter) own the single `TextDecoder('latin1').decode(bytes)`
 * call so encryption check and metadata parse share the same buffer.
 */

/**
 * Subset of PDF Info dict fields we extract. */
export interface PdfInfo {
  title?: string;
  author?: string;
  pageCount?: number;
}

/**
 * Returns true if the PDF has `/Encrypt` in its trailer (encrypted PDF).
 * Level 1 cannot decrypt — we surface this so the user gets a clear Notice
 * to pre-decrypt with a real PDF tool.
 */
export function isEncryptedPdfText(text: string): boolean {
  return /\/Encrypt\b/.test(text);
}

// --- internal helpers ---

// Hoisted field regexes — compiled once at module load (V8 caches the
// compiled regex anyway, but hoisting makes the per-call allocation
// obvious and avoids the `new RegExp(...)` per-call pattern).
// Character class: whitespace, `[`, `<`, `(`. ESLint flags `[` inside a
// character class as a no-op escape; bare `[` works because it has no
// metacharacter meaning at that position.
const TITLE_FIELD_RE = /\/Title\s*[\s[<(]/g;
const AUTHOR_FIELD_RE = /\/Author\s*[\s[<(]/g;

/**
 * Extracts title, author, and page count from a latin1-decoded PDF text.
 */
export function parsePdfInfoDictText(text: string): PdfInfo {
  return {
    title: extractStringField(text, TITLE_FIELD_RE),
    author: extractStringField(text, AUTHOR_FIELD_RE),
    pageCount: extractPageCount(text),
  };
}

/**
 * Extracts a PDF string field. PDF strings are either:
 *   - Literal: `(...)` with parens-balanced content, supports escape sequences
 *   - Hex: `<...>` with hex-encoded bytes
 * Strings may also be UTF-16BE prefixed with BOM (ÿþ) for non-ASCII content.
 */
function extractStringField(text: string, fieldRe: RegExp): string | undefined {
  fieldRe.lastIndex = 0;
  const match = fieldRe.exec(text);
  if (!match) return undefined;

  const startIdx = match.index + match[0].length - 1; // position of the opening delimiter
  const opener = text[startIdx];

  if (opener === '(') {
    return extractLiteralString(text, startIdx);
  }
  if (opener === '<') {
    return extractHexString(text, startIdx);
  }
  return undefined;
}

function extractLiteralString(text: string, openIdx: number): string {
  // Walk forward, balancing parens, handling backslash escapes.
  // Accumulate raw bytes (one per char, since the source is latin1) and
  // delegate the BOM-aware UTF-16BE / latin1 dispatch to `decodeBytesIfUtf16`
  // at the end. This avoids a string -> bytes -> string round-trip.
  const bytes: number[] = [];
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') {
      const next = text[i + 1];
      // Note: octal \nnn escapes are not handled. Rare in PDF Info dict fields.
      if (next === 'n') bytes.push(0x0a);
      else if (next === 'r') bytes.push(0x0d);
      else if (next === 't') bytes.push(0x09);
      else if (next === '(' || next === ')' || next === '\\') bytes.push(next.charCodeAt(0));
      else if (next === undefined) break;
      else bytes.push(next.charCodeAt(0));
      i++; // skip escape + next char
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return decodeBytesIfUtf16(new Uint8Array(bytes));
    } else {
      bytes.push(c.charCodeAt(0));
    }
  }
  return decodeBytesIfUtf16(new Uint8Array(bytes));
}

function extractHexString(text: string, openIdx: number): string | undefined {
  // <48656C6C6F> -> "Hello"
  let hex = '';
  for (let i = openIdx + 1; i < text.length; i++) {
    const c = text[i];
    if (c === '>') {
      const bytes = hexToBytes(hex);
      return decodeBytesIfUtf16(bytes);
    }
    if (/[0-9a-fA-F]/.test(c)) hex += c;
    if (hex.length > 65536) break; // safety cap
  }
  return undefined;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : hex + '0';
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function decodeBytesIfUtf16(bytes: Uint8Array): string {
  // Check for UTF-16BE BOM (FF FE)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    let s = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return s;
  }
  // Otherwise treat as latin1
  return Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
}

function extractPageCount(text: string): number | undefined {
  // /Count appears in the /Pages dict: "<< /Type /Pages /Count N >>"
  // Be careful: /Count can also appear in other contexts (e.g. /Annot /Count).
  // We require /Type /Pages within ~200 chars before /Count to disambiguate.
  const pagesRe = /\/Type\s*\/Pages[\s\S]{0,300}?\/Count\s+(\d+)/;
  const m = pagesRe.exec(text);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}