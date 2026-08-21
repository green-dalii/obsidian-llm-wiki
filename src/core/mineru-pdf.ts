import { requestUrl } from 'obsidian';
import { unzipSync } from 'fflate';
import {
  MINERU_API_BASE_URL,
  MINERU_MAX_ARCHIVE_FILES,
  MINERU_MAX_PDF_BYTES,
  MINERU_MAX_ZIP_BYTES,
  MINERU_POLL_INTERVAL_MS,
  MINERU_TIMEOUT_MS,
  PDF_CACHE_MAX_SINGLE_ENTRY_BYTES,
} from '../constants';
import {
  createPdfCache,
  hashCacheKey,
  sha256Bytes,
} from './pdf-cache';
import type { ConversionResult, PdfConversionContext } from './pdf-converter';

interface MineruEnvelope {
  code: number | string;
  msg?: string;
  data?: Record<string, unknown>;
}

export class MineruPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MineruPdfError';
  }
}

export function extractMineruMarkdown(zipBytes: Uint8Array): string {
  let fileCount = 0;
  let markdownCount = 0;
  try {
    const files = unzipSync(zipBytes, {
      filter: file => {
        if (++fileCount > MINERU_MAX_ARCHIVE_FILES) {
          throw new MineruPdfError('MinerU result archive contains too many files.');
        }
        if (file.name.split('/').pop() !== 'full.md') return false;
        markdownCount++;
        if (markdownCount > 1) {
          throw new MineruPdfError('MinerU result must contain exactly one full.md document.');
        }
        if (file.originalSize > PDF_CACHE_MAX_SINGLE_ENTRY_BYTES) {
          throw new MineruPdfError('MinerU full.md exceeds the size limit.');
        }
        return true;
      },
    });
    if (markdownCount !== 1) {
      throw new MineruPdfError('MinerU result must contain exactly one full.md document.');
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Object.values(files)[0]);
  } catch (error) {
    if (error instanceof MineruPdfError) throw error;
    if (error instanceof TypeError) {
      throw new MineruPdfError('MinerU full.md is not valid UTF-8.');
    }
    throw new MineruPdfError('MinerU returned an invalid result archive.');
  }
}

function abortError(): DOMException {
  return new DOMException('MinerU conversion was cancelled.', 'AbortError');
}

function withDeadline<T>(promise: Promise<T>, deadline: number, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timeout = 0;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      settle();
    };
    const onAbort = () => finish(() => reject(abortError()));
    timeout = window.setTimeout(
      () => finish(() => reject(new MineruPdfError('MinerU conversion timed out after 30 minutes.'))),
      Math.max(0, deadline - Date.now()),
    );
    signal?.addEventListener('abort', onAbort, { once: true });
    promise.then(
      value => finish(() => resolve(value)),
      error => finish(() => reject(error instanceof Error ? error : new MineruPdfError('MinerU request failed.'))),
    );
  });
}

function validateRemoteUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MineruPdfError('MinerU returned an invalid URL.');
  }
  const host = url.hostname.toLowerCase();
  const localHost = host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' ||
    /^(?:127\.|10\.|169\.254\.|192\.168\.)/.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
  if (url.protocol !== 'https:' || url.username || url.password || localHost) {
    throw new MineruPdfError('MinerU upload and download URLs must be safe HTTPS URLs.');
  }
  return url.href;
}

export async function convertPdfWithMineru(ctx: PdfConversionContext): Promise<ConversionResult> {
  const token = ctx.mineruApiToken?.trim();
  if (!token) throw new MineruPdfError('A MinerU API token is required.');
  if (ctx.pdfFile.stat?.size > MINERU_MAX_PDF_BYTES) {
    throw new MineruPdfError('MinerU accepts PDF files up to 200 MB.');
  }

  const bytes = new Uint8Array(await ctx.app.vault.adapter.readBinary(ctx.pdfFile.path));
  if (bytes.byteLength > MINERU_MAX_PDF_BYTES) {
    throw new MineruPdfError('MinerU accepts PDF files up to 200 MB.');
  }

  // MinerU model version: hardcoded to 'vlm' (PR #404 default; 'pipeline'
  // and 'MinerU-HTML' are exposed by the API but the vlm model is the
  // recommended path per https://mineru.net/apiManage/docs). When the
  // surface area is clear, this becomes a settings field; for now keeping
  // it inline is consistent with PR #404's existing cache-key shape
  // (`:mineru:vlm:v1`) so existing users do not invalidate cache.
  const modelVersion = 'vlm';

  const sourceHash = await sha256Bytes(bytes, ctx.subtle);
  const cache = createPdfCache(ctx.app);
  const cacheKey = await hashCacheKey(
    `${sourceHash}:mineru:${modelVersion}:v1`,
    ctx.subtle,
  );
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const deadline = Date.now() + MINERU_TIMEOUT_MS;
  const lease = await requestUpload(token, ctx.pdfFile.name, modelVersion, deadline, ctx.abortSignal);
  ctx.onMineruPhase?.('uploading');
  await uploadPdf(lease.uploadUrl, bytes, deadline, ctx.abortSignal);
  ctx.onMineruPhase?.('waiting');
  const result = await waitForResult(token, lease.taskId, deadline, ctx.abortSignal);
  ctx.onMineruPhase?.('downloading');
  const zipBytes = await downloadResult(result, deadline, ctx.abortSignal);
  if (zipBytes.byteLength > MINERU_MAX_ZIP_BYTES) {
    throw new MineruPdfError('MinerU result archive exceeds the size limit.');
  }

  const markdown = extractMineruMarkdown(zipBytes);
  const entry: ConversionResult = {
    markdown,
    metadata: {
      convertedAt: new Date().toISOString(),
      converter: `mineru/${modelVersion}`,
    },
  };
  await cache.set(cacheKey, entry);
  return entry;
}

async function requestUpload(
  token: string,
  filename: string,
  modelVersion: 'vlm',
  deadline: number,
  signal?: AbortSignal,
): Promise<{ taskId: string; uploadUrl: string }> {
  const envelope = await mineruRequest(token, '/file-urls/batch', {
    method: 'POST',
    body: JSON.stringify({ files: [{ name: filename }], model_version: modelVersion }),
  }, deadline, signal);
  const taskId = stringValue(envelope.data?.batch_id);
  const uploadUrl = Array.isArray(envelope.data?.file_urls)
    ? stringValue(envelope.data.file_urls[0])
    : undefined;
  if (!taskId || !uploadUrl) throw new MineruPdfError('MinerU returned an invalid upload response.');
  return { taskId, uploadUrl: validateRemoteUrl(uploadUrl) };
}

async function uploadPdf(url: string, bytes: Uint8Array, deadline: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  const body = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer as ArrayBuffer
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const response = await withDeadline(requestUrl({
    url,
    method: 'PUT',
    body,
    throw: false,
  }), deadline, signal);
  if (response.status < 200 || response.status >= 300) {
    throw new MineruPdfError(`MinerU PDF upload failed with HTTP ${response.status}.`);
  }
}

async function waitForResult(
  token: string,
  taskId: string,
  deadline: number,
  signal?: AbortSignal,
): Promise<string> {
  while (Date.now() < deadline) {
    throwIfAborted(signal);
    const envelope = await mineruRequest(
      token,
      `/extract-results/batch/${encodeURIComponent(taskId)}`,
      { method: 'GET' },
      deadline,
      signal,
    );
    const results = envelope.data?.extract_result;
    const record = Array.isArray(results) && results.length === 1 && typeof results[0] === 'object'
      ? results[0] as Record<string, unknown>
      : undefined;
    const state = stringValue(record?.state);
    if (state === 'done') {
      const zipUrl = stringValue(record?.full_zip_url);
      if (!zipUrl) throw new MineruPdfError('MinerU returned no result archive URL.');
      return validateRemoteUrl(zipUrl);
    }
    if (state === 'failed') throw new MineruPdfError(stringValue(record?.err_msg) ?? 'MinerU conversion failed.');
    if (!state || !['waiting-file', 'pending', 'running', 'converting'].includes(state)) {
      throw new MineruPdfError('MinerU returned an invalid task status.');
    }
    await withDeadline(new Promise(resolve => window.setTimeout(resolve, MINERU_POLL_INTERVAL_MS)), deadline, signal);
  }
  throw new MineruPdfError('MinerU conversion timed out after 30 minutes.');
}

async function downloadResult(url: string, deadline: number, signal?: AbortSignal): Promise<Uint8Array> {
  throwIfAborted(signal);
  const response = await withDeadline(requestUrl({ url, method: 'GET', throw: false }), deadline, signal);
  if (response.status < 200 || response.status >= 300) {
    throw new MineruPdfError(`MinerU result download failed with HTTP ${response.status}.`);
  }
  return new Uint8Array(response.arrayBuffer);
}

async function mineruRequest(
  token: string,
  path: string,
  request: { method: string; body?: string },
  deadline: number,
  signal?: AbortSignal,
): Promise<MineruEnvelope> {
  throwIfAborted(signal);
  const response = await withDeadline(requestUrl({
    url: `${MINERU_API_BASE_URL}${path}`,
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(request.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(request.body ? { body: request.body } : {}),
    throw: false,
  }), deadline, signal);
  if (response.status < 200 || response.status >= 300) {
    throw new MineruPdfError(`MinerU request failed with HTTP ${response.status}.`);
  }
  const envelope = response.json as MineruEnvelope;
  if (!envelope || (envelope.code !== 0 && envelope.code !== '0')) {
    throw new MineruPdfError(envelope?.msg ?? 'MinerU API request failed.');
  }
  return envelope;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}
