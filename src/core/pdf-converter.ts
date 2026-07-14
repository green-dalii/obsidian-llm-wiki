/**
 * v1.25.0 PDF Level 1 — PDF → Markdown conversion via LLM API.
 *
 * Reads the PDF binary from the vault, hashes it for cache keying, and
 * dispatches a single LLM call with the PDF as a file content part. The
 * provider's native PDF support does the actual reading; we wrap that
 * result with deterministic cache lookup, metadata extraction, and a
 * versioned system prompt that locks in "preserve source language" behavior.
 *
 * Architecture (correctness-ordered; provider gate precedes cache lookup
 * so a user who switches from `anthropic` to `ollama` cannot silently
 * receive a cached conversion from a now-unsupported provider):
 *   1. Read PDF bytes (vault.adapter.readBinary)
 *   2. Provider capability gate (cheap, must run before cache return)
 *   3. sha256 the bytes → cache key
 *   4. Cache hit → return cached entry (no LLM call)
 *   5. Cache miss → encryption check, metadata extract, LLM call
 *   6. Write LLM response to cache (keyed by sha256:model)
 *
 * Provider support matrix:
 *   - anthropic / openai / bedrock-anthropic / bedrock-openai: native PDF support
 *   - custom / anthropic-compatible: requires forcePdfSupport=true (else throw)
 *   - ollama / lmstudio / deepseek / glm: never supported (throw)
 *
 * Errors are surfaced verbatim — the LLM client already wraps them in
 * the project's standard error shape. We do not add a translation layer.
 */

import { App, TFile } from 'obsidian';
import { PdfConversionCache, PdfCacheEntry, sha256Bytes } from './pdf-cache';
import {
  parsePdfInfoDictText,
  isEncryptedPdfText,
} from './pdf-metadata';
import type { LLMClient } from '../types';

// --- public types ---

/** What the caller hands us. Kept narrow so test mocks stay simple. */
export interface PdfConversionContext {
  app: App;
  settings: {
    provider: string;
    apiKey: string;
    baseUrl?: string;
    model: string;
    forcePdfSupport?: boolean;
    [k: string]: unknown;
  };
  pdfFile: TFile;
  llmClient: LLMClient;
  /** Returns the resolved model for the conversion task. */
  resolveModelForTask: (settings: PdfConversionContext['settings'], task: string) => string;
  /** SubtleCrypto implementation; injected so the gate runs against the
   *  popout-window-aware `activeWindow.crypto.subtle` rather than the
   *  banned `window` global. */
  subtle?: SubtleCrypto;
}

/** What we return on success. */
export type ConversionResult = PdfCacheEntry;

// --- errors ---

export class UnsupportedProviderError extends Error {
  constructor(public readonly provider: string) {
    super(
      `PDF conversion is not supported by provider "${provider}". ` +
        `Supported providers: anthropic, openai, bedrock-anthropic, bedrock-openai. ` +
        `For other OpenAI-compatible or Anthropic-compatible providers, enable ` +
        `"Force PDF Support" in Settings → LLM Configuration → Advanced (at your own risk).`
    );
    this.name = 'UnsupportedProviderError';
  }
}

export class EncryptedPdfError extends Error {
  constructor() {
    super(
      'PDF is encrypted. v1.25.0 cannot decrypt encrypted PDFs. ' +
        'Please decrypt the file using Adobe Acrobat, qpdf, or your PDF tool of choice, ' +
        'then ingest the decrypted file.'
    );
    this.name = 'EncryptedPdfError';
  }
}

// --- main entry point ---

/**
 * Converts a PDF to Markdown using the configured LLM provider.
 *
 * Returns the cached entry on cache hit; on miss, calls the LLM, caches
 * the result, and returns. Throws UnsupportedProviderError if the provider
 * cannot handle PDF, EncryptedPdfError if the file is encrypted, and
 * propagates LLM errors verbatim.
 */
export async function convertPdfToMarkdown(ctx: PdfConversionContext): Promise<ConversionResult> {
  const { app, settings, pdfFile, llmClient, resolveModelForTask, subtle } = ctx;

  // 1. Read PDF bytes. readBinary returns ArrayBuffer; wrap as Uint8Array so
  // the rest of the pipeline (sha256, TextDecoder, base64) work with the same
  // shape.
  const bytes = new Uint8Array(await app.vault.adapter.readBinary(pdfFile.path));

  // 2. Provider gate FIRST (must run before cache lookup so a user switching
  // from `anthropic` to `ollama` cannot silently receive a stale cache hit).
  if (!providerSupportsPdf(settings)) {
    throw new UnsupportedProviderError(settings.provider);
  }

  // 3. Resolve model — cache key includes model so switching the ingest
  // model returns a fresh conversion rather than a cache hit from a
  // different model.
  const model = resolveModelForTask(settings, 'ingest');

  // 4. Cache lookup (sha256 bytes → key). sha256 is required here for the
  // key; latin1 decode is deferred to the miss branch.
  const cacheDir = `${app.vault.configDir}/plugins/karpathywiki/pdf-cache`;
  const cache = new PdfConversionCache({ cacheDir, adapter: app.vault.adapter });
  const cacheKey = `${await sha256Bytes(bytes, subtle)}:${model}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // 5. Miss branch — decode once, run encryption + metadata scan, then LLM.
  const text = new TextDecoder('latin1').decode(bytes);
  if (isEncryptedPdfText(text)) {
    throw new EncryptedPdfError();
  }
  const info = parsePdfInfoDictText(text);

  // 6. Encode PDF as base64 for the LLM content part
  const base64 = bytesToBase64(bytes);

  // 7. Call LLM
  const response = await llmClient.createMessage({
    model,
    max_tokens: 8000,
    system: PDF_EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildUserText(info) },
          {
            type: 'file',
            data: base64,
            mediaType: 'application/pdf',
            filename: pdfFile.name,
          },
        ],
      },
    ],
  });

  // 8. Build the result entry and cache it (key already includes model)
  const entry: ConversionResult = {
    markdown: response,
    metadata: {
      title: info.title,
      author: info.author,
      pageCount: info.pageCount,
      convertedAt: new Date().toISOString(),
      converter: `${settings.provider}/${model}`,
    },
  };
  await cache.set(cacheKey, entry);
  return entry;
}

// --- helpers ---

/** Providers whose built-in client we know supports PDF. */
const NATIVE_PDF_PROVIDERS = new Set([
  'anthropic',
  'openai',
  'bedrock-anthropic',
  'bedrock-openai',
]);

/** Providers that need the `forcePdfSupport` escape hatch. */
const FORCE_PDF_PROVIDERS = new Set([
  'custom', // Custom OpenAI-Compatible
  'anthropic-compatible', // Custom Anthropic-Compatible
]);

function providerSupportsPdf(settings: PdfConversionContext['settings']): boolean {
  if (NATIVE_PDF_PROVIDERS.has(settings.provider)) return true;
  if (FORCE_PDF_PROVIDERS.has(settings.provider) && settings.forcePdfSupport === true) {
    return true;
  }
  return false;
}

function bytesToBase64(bytes: Uint8Array): string {
  // Avoid Node's `Buffer` (forbidden by obsidianmd/no-node-builtin rule).
  // The naive `btoa(String.fromCharCode(...bytes))` is O(n²) because each
  // String.fromCharCode + string-concat allocates a new string of the
  // accumulator so far. For a 100 MB PDF this is ~10^16 character copies.
  // Chunked encoding keeps each concat bounded to a single ~32 KB slice.
  const CHUNK = 0x8000; // 32 KB
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    // String.fromCharCode.apply with the Uint8Array works in Obsidian's
    // Chromium runtime; the cast is a typing convenience.
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Hoisted system prompt (was `buildSystemPrompt()`). The "preserve source
 * language; do NOT translate" rule is the most important instruction — it
 * locks the LLM into reading rather than rewriting the source.
 */
const PDF_EXTRACTION_SYSTEM_PROMPT = [
  'You convert PDFs into clean, well-structured Markdown.',
  '',
  'RULES:',
  '- Preserve the source PDF language exactly. Do NOT translate.',
  '- Preserve the document structure: headings, paragraphs, lists, tables, code blocks.',
  '- Do NOT summarize, paraphrase, or add commentary.',
  '- Do NOT add a preamble, postscript, or any text outside the converted content.',
  '- Output the converted Markdown directly, with no surrounding markdown fences.',
  '- If the PDF has a clear title and author on its first page, include them in a YAML frontmatter at the top of your output:',
  '  ---',
  '  title: "..."',
  '  author: "..."',
  '  ---',
  '  (omit fields you cannot determine confidently).',
  '',
  'Begin conversion now.',
].join('\n');

function buildUserText(info: { title?: string; author?: string; pageCount?: number }): string {
  const parts: string[] = ['Convert the attached PDF to Markdown.'];
  const hints: string[] = [];
  if (info.title) hints.push(`Title (from PDF metadata): ${info.title}`);
  if (info.author) hints.push(`Author: ${info.author}`);
  if (info.pageCount !== undefined) hints.push(`Page count: ${info.pageCount}`);
  if (hints.length > 0) {
    parts.push('\nMetadata hints (from the PDF Info dict; verify against actual content):');
    for (const h of hints) parts.push(`- ${h}`);
  }
  return parts.join('\n');
}