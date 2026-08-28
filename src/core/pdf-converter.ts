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
 *   3. sha256 the bytes + compose logical cache key (sha256:model:version)
 *   4. Hash the logical key to a 16-char hex file token (cross-platform safe)
 *   5. Cache hit → return cached entry (no LLM call)
 *   6. Cache miss → encryption check, metadata extract, LLM call
 *   7. Write LLM response to cache under the file token
 *
 * Provider support matrix:
 *   - anthropic / openai / bedrock-anthropic / bedrock-openai: native PDF support
 *   - ollama / lmstudio: vision-path (PDF → per-page PNG via pdfjs-dist → image_url parts)
 *   - custom / anthropic-compatible: requires forcePdfSupport=true (else throw)
 *   - deepseek / glm / kimi / openrouter / gemini / future providers: never supported (throw)
 *
 * Errors are surfaced verbatim — the LLM client already wraps them in
 * the project's standard error shape. We do not add a translation layer.
 */

import { App, TFile } from 'obsidian';
import {
  PdfCacheEntry,
  sha256Bytes,
  hashCacheKey,
  PDF_CONVERTER_VERSION,
  createPdfCache,
} from './pdf-cache';
import {
  parsePdfInfoDictText,
  isEncryptedPdfText,
} from './pdf-metadata';
import {
  TOKENS_PDF_CONVERSION,
  NATIVE_PDF_PROVIDER_IDS,
  VISION_PDF_PROVIDER_IDS,
  VISION_PDF_VERSION,
  VISION_PDF_DPI,
  VISION_PDF_PAGES_PER_CHUNK,
} from '../constants';
import { PDF_PROMPTS } from '../wiki/prompts/pdf';
import type { LLMClient } from '../types';
import { convertPdfWithMineru } from './mineru-converter';

/* global __PDFJS_WORKER_SOURCE__ -- injected by esbuild.config.mjs at production build time */

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
    markdownConversionBackend?: 'native' | 'mineru';
    [k: string]: unknown;
  };
  /** Resolved at the WikiEngine boundary from Obsidian SecretStorage. */
  mineruApiToken?: string;
  onMineruPhase?: (phase: 'uploading' | 'waiting' | 'downloading') => void;
  pdfFile: TFile;
  llmClient: LLMClient;
  /** Returns the resolved model for the conversion task. */
  resolveModelForTask: (settings: PdfConversionContext['settings'], task: string) => string;
  /** SubtleCrypto implementation; injected so the gate runs against the
   *  popout-window-aware `activeWindow.crypto.subtle` rather than the
   *  banned `window` global. */
  subtle?: SubtleCrypto;
  /** v1.25.0 PR3 follow-up #8 (Bug D, e2e 2026-07-17): cancellation signal
   *  for the LLM call. When the user clicks the status bar during PDF
   *  conversion, this signal flips to aborted and Vercel AI SDK v6
   *  propagates the cancellation to the underlying HTTP request,
   *  returning early instead of letting the LLM call run to completion.
   *  Legacy clients ignore unknown params and run as before — graceful
   *  degradation, no behavior change for them. */
  abortSignal?: AbortSignal;
}

/** What we return on success. */
export type ConversionResult = PdfCacheEntry;

// --- errors ---

export class UnsupportedProviderError extends Error {
  constructor(public readonly provider: string) {
    super(
      `PDF conversion is not supported by provider "${provider}". ` +
        `Supported providers: anthropic, openai, bedrock-anthropic, bedrock-openai, ` +
        `ollama, lmstudio. ` +
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
  if (ctx.settings.markdownConversionBackend === 'mineru') {
    return convertPdfWithMineru(ctx);
  }
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

  // 4. Cache lookup. The logical `cacheKey` carries the model +
  // converterVersion so cache hits distinguish "same PDF + same model +
  // same prompt" from "same PDF + different model + same prompt".
  //
  // The on-disk filename is NOT the logical key (it contains `:` and may
  // contain `/` from `provider/model` strings, which Windows forbids and
  // POSIX treats as a subpath). We hash the logical key to a 16-char hex
  // token (Git short-hash style) for filesystem safety; the logical key
  // remains implicit through the converter-version + model contract.
  const cache = createPdfCache(app);
  const logicalKey = `${await sha256Bytes(bytes, subtle)}:${model}:${PDF_CONVERTER_VERSION}`;
  const fileToken = await hashCacheKey(logicalKey, subtle);
  const cached = await cache.get(fileToken);
  if (cached) return cached;

  // 5. Miss branch — decode once, run encryption + metadata scan, then LLM.
  const text = new TextDecoder('latin1').decode(bytes);
  if (isEncryptedPdfText(text)) {
    throw new EncryptedPdfError();
  }
  const info = parsePdfInfoDictText(text);

  // v1.28.x PR — dispatch by provider capability. Native providers
  // get a single file content part; vision providers get per-page
  // PNG rasterization + image content parts. The branch is on the
  // same call site so metadata extraction and cache miss logic
  // stay in one place.
  const isVision = (VISION_PDF_PROVIDER_IDS as readonly string[]).includes(settings.provider);

  // Cache key for the vision branch includes DPI + version so a
  // user switching from anthropic to ollama cannot silently reuse
  // an anthropic-rendered conversion.
  let visionFileToken: string | null = null;
  if (isVision) {
    const visionLogicalKey = `${logicalKey}:vision:v${VISION_PDF_VERSION}@${VISION_PDF_DPI}dpi`;
    visionFileToken = await hashCacheKey(visionLogicalKey, subtle);
    const visionCached = await cache.get(visionFileToken);
    if (visionCached) return visionCached;
  }

  // 6. Encode PDF as base64 for the native LLM content part (only used by native path)
  const base64 = bytesToBase64(bytes);

  // 7. Call LLM via the appropriate path.
  const response = isVision
    ? await convertPdfToMarkdownViaVision({
        llmClient, model, system: PDF_PROMPTS.systemPrompt,
        pdfBytes: bytes, info, pdfFileName: pdfFile.name,
        abortSignal: ctx.abortSignal,
      })
    : (await llmClient.createMessage({
        task: 'pdf-convert',
        model,
        max_tokens: TOKENS_PDF_CONVERSION,
        system: PDF_PROMPTS.systemPrompt,
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
        ...(ctx.abortSignal ? { abortSignal: ctx.abortSignal } : {}),
      }));

  // v1.25.0 PR3 follow-up #9 (output cleanup): some local / small models
  // (Qwen3.5-2B-MLX-4bit, Llama 3 8B Instruct, etc.) wrap their response
  // in ```markdown ... ``` fences despite the system prompt forbidding
  // them. The cleaner normalizes the response before we write it to
  // cache — preventing fence contamination from leaking into the wiki
  // summary generation downstream. The cleaner is conservative
  // (returns input unchanged when no rule matches) so a model that
  // emits clean Markdown passes through untouched.
  const cleanedMarkdown = PDF_PROMPTS.unwrapFencedMarkdown(response);

  // 8. Build the result entry and cache it under the file token (NOT the
  // raw logical key — see step 4 comment for why).
  const entry: ConversionResult = {
    markdown: cleanedMarkdown,
    metadata: {
      title: info.title,
      author: info.author,
      pageCount: info.pageCount,
      convertedAt: new Date().toISOString(),
      converter: isVision
        ? `${settings.provider}/${model}:vision:v${VISION_PDF_VERSION}`
        : `${settings.provider}/${model}`,
    },
  };
  await cache.set(isVision ? visionFileToken! : fileToken, entry);
  return entry;
}

// --- helpers ---

/**
 * Provider capability gate.
 *
 * A provider can convert PDFs if EITHER:
 *   - it appears in `NATIVE_PDF_PROVIDER_IDS` (anthropic / openai /
 *     bedrock-anthropic / bedrock-openai) — the provider's built-in
 *     client handles `application/pdf` content parts natively; OR
 *   - the user has enabled the `forcePdfSupport` escape hatch in Settings.
 *     This is a UNIVERSAL override: any non-native provider that the user
 *     believes supports PDF input on their endpoint (custom / anthropic-
 *     compatible / ollama / lmstudio / deepseek / glm / kimi / gemini /
 *     openrouter / future providers) is allowed through. If the endpoint
 *     actually rejects the PDF input, the LLM error propagates to
 *     `wiki-engine.ingestPdfSource`, which surfaces a localized Notice
 *     guiding the user to disable the toggle or check their endpoint.
 *
 * Design rationale: the user is the authoritative source on what their
 * endpoint supports. A pre-flight whitelist reject violates user intent
 * (the user explicitly opted in). The trust boundary is: the user said
 * "try it" — so we try, and surface the truth if it fails.
 */
function providerSupportsPdf(settings: PdfConversionContext['settings']): boolean {
  if ((NATIVE_PDF_PROVIDER_IDS as readonly string[]).includes(settings.provider)) return true;
  if ((VISION_PDF_PROVIDER_IDS as readonly string[]).includes(settings.provider)) return true;
  if (settings.forcePdfSupport === true) return true;
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

// --- vision path ---

/**
 * v1.28.x PR — PDF → per-page PNG → image content parts.
 *
 * Rasterizes each PDF page with pdfjs-dist (legacy build, no worker)
 * using OffscreenCanvas. Works inside Obsidian's Electron renderer
 * without violating the obsidianmd/no-node-builtin ESLint rule.
 *
 * Message shape sent to llmClient.createMessage:
 *   user: [
 *     { type: 'text', text: <buildUserText(info)> + " (N page(s) attached)" },
 *     { type: 'image', image: <base64 PNG>, mimeType: 'image/png' }, // page 1
 *     { type: 'image', image: <base64 PNG>, mimeType: 'image/png' }, // page 2
 *     ...
 *   ]
 *
 * The AI SDK's openai-compat provider encodes image parts as OpenAI
 * Chat Completions `image_url`, which Ollama and LM Studio accept on
 * /v1/chat/completions natively and convert to their internal
 * images[] representation server-side.
 *
 * Throws: pdfjs-dist exceptions propagate verbatim (e.g. "Invalid PDF
 * structure" / "Password required") — caller can surface them.
 *
 * Abort: signal propagates to the LLM call but NOT to per-page
 * rasterization (cancellation mid-render would leak partial state).
 * For a worst-case 200-page cancel-at-page-50 the cost is 50
 * rasterized pages of CPU — acceptable, no external resources held.
 */
async function convertPdfToMarkdownViaVision(params: {
  llmClient: LLMClient;
  model: string;
  system: string;
  pdfBytes: Uint8Array;
  info: { title?: string; author?: string; pageCount?: number };
  pdfFileName: string;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const { llmClient, model, system, pdfBytes, info, abortSignal } = params;

  // pdfjs-dist v5 worker setup.
  //
  // v5 has no public `disableWorker` option. The legacy synchronous API
  // requires either (a) a real worker URL on GlobalWorkerOptions.workerSrc
  // or (b) a Node.js runtime (where _isWorkerDisabled is auto-set). We
  // are in the Electron renderer, so neither applies — the workerSrc
  // getter throws "No 'GlobalWorkerOptions.workerSrc' specified" if we
  // leave it empty.
  //
  // Workaround: pdf.worker.mjs is read at build time and inlined into
  // main.js as the `__PDFJS_WORKER_SOURCE__` constant (see esbuild.config.mjs).
  // At runtime we wrap it in a Blob and hand pdfjs the resulting object
  // URL as if it were a remote worker module. pdfjs's loader does
  // `await import(workerSrc)` — dynamic import of a blob: URL is valid
  // in Chromium / Electron and resolves to the WorkerMessageHandler
  // export just like a CDN-served worker would.
  //
  // Trade-off: this inlines ~2 MB of worker code into main.js. The
  // user-visible cost is one extra-second cold-load for the plugin; we
  // avoid shipping a second .mjs file alongside main.js and the URL-
  // resolution pitfalls that come with relative paths in the Obsidian
  // renderer (no import.meta.url under CJS bundle, baseURI varies).
  const pdfjs: typeof import('pdfjs-dist') =
    await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
    new Blob([__PDFJS_WORKER_SOURCE__], { type: 'application/javascript' })
  );

  // OffscreenCanvas factory — pdfjs calls create() per page, reset()
  // between renders. OffscreenCanvas is structurally compatible with
  // the HTMLCanvasElement surface pdfjs uses (width/height/getContext)
  // and stays inside the browser-safe API.
  const canvasFactory = {
    create(width: number, height: number) {
      const canvas = new OffscreenCanvas(width, height);
      return { canvas, context: canvas.getContext('2d')! };
    },
    reset(c: { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D },
          width: number, height: number) {
      c.canvas.width = width;
      c.canvas.height = height;
    },
    destroy(c: { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D }) {
      c.canvas.width = 0;
      c.canvas.height = 0;
    },
  };

  const scale = VISION_PDF_DPI / 72; // PDF spec: 72 DPI base
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    isEvalSupported: false, // Obsidian CSP forbids new Function(...)
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pageImages: Array<{ image: string; mimeType: 'image/png' }> = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const ctxObj = canvasFactory.create(viewport.width, viewport.height);
      try {
        await page.render({
          canvasContext: ctxObj.context as unknown as CanvasRenderingContext2D,
          viewport,
          canvasFactory,
        }).promise;
        const blob = await ctxObj.canvas.convertToBlob({ type: 'image/png' });
        const buffer = new Uint8Array(await blob.arrayBuffer());
        pageImages.push({ image: bytesToBase64(buffer), mimeType: 'image/png' });
      } finally {
        canvasFactory.destroy(ctxObj);
      }
    }
  } finally {
    await pdf.cleanup();
    await pdf.destroy();
  }

  // Chunk pages to fit the model's context window. A 30-page paper
  // at 150 DPI is ~75K image tokens — well past a 32K local model
  // (e.g. bonsai-27b Q1_0). VISION_PDF_PAGES_PER_CHUNK keeps each
  // call under the budget regardless of paper length; outputs are
  // concatenated in page order, separated by a blank line so the
  // downstream `unwrapFencedMarkdown` + analyzer still sees the
  // correct paragraph structure.
  const totalPages = pageImages.length;
  const chunks: Array<Array<{ image: string; mimeType: 'image/png' }>> = [];
  for (let start = 0; start < totalPages; start += VISION_PDF_PAGES_PER_CHUNK) {
    chunks.push(pageImages.slice(start, start + VISION_PDF_PAGES_PER_CHUNK));
  }

  const markdownParts: string[] = [];
  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const pageStart = chunkIdx * VISION_PDF_PAGES_PER_CHUNK + 1;
    const pageEnd = Math.min(pageStart + chunk.length - 1, totalPages);
    const chunkText = chunkIdx === 0
      ? buildUserText(info) +
        ` (pages ${pageStart}-${pageEnd} of ${totalPages} attached as images)`
      : `Continue conversion. Pages ${pageStart}-${pageEnd} of ${totalPages} attached.`;

    const chunkMessages = [{
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: chunkText },
        ...chunk.map((p) => ({
          type: 'image' as const,
          image: p.image,
          mimeType: p.mimeType,
        })),
      ],
    }];

    const chunkResponse = await llmClient.createMessage({
      task: 'pdf-convert',
      model,
      max_tokens: TOKENS_PDF_CONVERSION,
      system,
      messages: chunkMessages,
      ...(abortSignal ? { abortSignal } : {}),
    });
    markdownParts.push(chunkResponse);
  }

  // Concatenate chunks with a blank line between — preserves page
  // boundaries for the downstream analyzer without inventing
  // structural breaks that aren't in the source.
  return markdownParts.join('\n\n');
}
