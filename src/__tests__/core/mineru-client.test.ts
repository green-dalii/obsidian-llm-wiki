import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MineruAuthenticationError,
  MineruCancelledError,
  MineruClient,
  MineruInvalidResponseError,
  MineruQuotaError,
  MineruStageError,
  MineruTaskFailedError,
  MineruTaskTimeoutError,
} from '../../core/pdf-backends/mineru-client';
import type { MineruClientOptions } from '../../core/pdf-backends/mineru-client';
import type { PdfBackendProgress } from '../../core/pdf-backends/types';

const API_BASE_URL = 'https://mineru.net/api/v4';
const UPLOAD_URL = 'https://upload.example.com/signed?token=upload-secret';
const ZIP_URL = 'https://download.example.com/result.zip?token=download-secret';
const API_TOKEN = 'sk-a+b/c?=private';

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function binaryResponse(bytes: number[], status = 200, headers?: HeadersInit): Response {
  return new Response(new Uint8Array(bytes), { status, headers });
}

function uploadLeaseResponse(overrides: Record<string, unknown> = {}): Response {
  return jsonResponse({
    code: 0,
    msg: 'ok',
    trace_id: 'trace-upload',
    data: {
      batch_id: 'batch-123',
      file_urls: [UPLOAD_URL],
    },
    ...overrides,
  });
}

function pollResponse(
  state: string,
  overrides: Record<string, unknown> = {}
): Response {
  return jsonResponse({
    code: 0,
    msg: 'ok',
    trace_id: 'trace-poll',
    data: {
      batch_id: 'batch-123',
      extract_result: [
        {
          file_name: 'paper.pdf',
          state,
          err_msg: '',
          full_zip_url: state === 'done' ? ZIP_URL : '',
          ...overrides,
        },
      ],
    },
  });
}

function createClient(
  fetchFn: ReturnType<typeof vi.fn>,
  overrides: Partial<MineruClientOptions> = {}
): MineruClient {
  return new MineruClient({
    apiToken: API_TOKEN,
    timeoutMs: 60_000,
    fetchFn: fetchFn as unknown as typeof fetch,
    sleep: vi.fn().mockResolvedValue(undefined),
    now: () => 0,
    ...overrides,
  });
}

function abortablePendingFetch(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise((_resolve, reject) => {
    signal?.addEventListener(
      'abort',
      () => reject(new DOMException('Aborted', 'AbortError')),
      { once: true }
    );
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('MineruClient protocol', () => {
  it('requests one official signed upload URL with Bearer auth and vlm options', async () => {
    const fetchFn = vi.fn().mockResolvedValue(uploadLeaseResponse());
    const client = createClient(fetchFn);

    const lease = await client.requestUpload('paper.pdf');

    expect(lease).toEqual({
      taskId: 'batch-123',
      traceId: 'trace-upload',
      uploadUrl: UPLOAD_URL,
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE_URL}/file-urls/batch`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      files: [{ name: 'paper.pdf' }],
      model_version: 'vlm',
      enable_formula: true,
      enable_table: true,
    });
  });

  it('uploads raw PDF bytes to the opaque signed URL without MinerU auth', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const client = createClient(fetchFn);
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    await client.uploadPdf(
      { taskId: 'batch-123', traceId: 'trace-upload', uploadUrl: UPLOAD_URL },
      bytes
    );

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(UPLOAD_URL);
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(bytes);
    expect(init.headers).toBeUndefined();
  });

  it('rejects a non-HTTPS signed upload URL', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      code: 0,
      msg: 'ok',
      data: {
        batch_id: 'batch-123',
        file_urls: ['http://upload.example.com/signed'],
      },
    }));
    const client = createClient(fetchFn);

    await expect(client.requestUpload('paper.pdf')).rejects.toBeInstanceOf(
      MineruInvalidResponseError
    );
  });

  it('maps official poll states to typed progress and preserves the result URL', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(pollResponse('waiting-file'))
      .mockResolvedValueOnce(pollResponse('pending'))
      .mockResolvedValueOnce(pollResponse('running', {
        extract_progress: { extracted_pages: 3, total_pages: 8 },
      }))
      .mockResolvedValueOnce(pollResponse('converting'))
      .mockResolvedValueOnce(pollResponse('done'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });
    const progress: PdfBackendProgress[] = [];

    const result = await client.waitForResult(
      'batch-123',
      undefined,
      (event) => progress.push(event)
    );

    expect(result).toEqual({
      taskId: 'batch-123',
      traceId: 'trace-poll',
      zipUrl: ZIP_URL,
    });
    expect(progress).toEqual([
      { stage: 'waiting' },
      { stage: 'waiting' },
      { stage: 'parsing', completedPages: 3, totalPages: 8 },
      { stage: 'converting' },
    ]);
    expect(sleep).toHaveBeenCalledTimes(4);
    for (const [url, init] of fetchFn.mock.calls as [string, RequestInit][]) {
      expect(url).toBe(`${API_BASE_URL}/extract-results/batch/batch-123`);
      expect(init.headers).toEqual({
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: '*/*',
      });
    }
  });

  it('downloads bytes from the exact opaque result URL without MinerU auth', async () => {
    const fetchFn = vi.fn().mockResolvedValue(binaryResponse([1, 2, 3]));
    const client = createClient(fetchFn);

    const result = await client.downloadResult(ZIP_URL);

    expect(Array.from(result)).toEqual([1, 2, 3]);
    expect(fetchFn).toHaveBeenCalledWith(ZIP_URL, {
      method: 'GET',
      signal: undefined,
    });
  });

  it('uses the direct binary download transport when provided', async () => {
    const fetchFn = vi.fn();
    const arrayBuffer = new Uint8Array([1, 2, 3]).buffer;
    const downloadFn = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ 'Content-Length': '3' }),
      arrayBuffer,
    });
    const client = createClient(fetchFn, { downloadFn });

    const result = await client.downloadResult(ZIP_URL);

    expect(result.buffer).toBe(arrayBuffer);
    expect(downloadFn).toHaveBeenCalledWith(ZIP_URL, undefined);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects a download whose declared size exceeds the archive limit', async () => {
    const fetchFn = vi.fn().mockResolvedValue(binaryResponse([1], 200, {
      'Content-Length': String(256 * 1024 * 1024 + 1),
    }));
    const client = createClient(fetchFn);

    await expect(client.downloadResult(ZIP_URL)).rejects.toBeInstanceOf(MineruStageError);
  });

  it('rejects unknown states and done responses without an HTTPS result URL', async () => {
    const unknownClient = createClient(vi.fn().mockResolvedValue(pollResponse('queued')));
    await expect(unknownClient.waitForResult('batch-123')).rejects.toBeInstanceOf(
      MineruInvalidResponseError
    );

    const missingUrlClient = createClient(
      vi.fn().mockResolvedValue(pollResponse('done', { full_zip_url: '' }))
    );
    await expect(missingUrlClient.waitForResult('batch-123')).rejects.toBeInstanceOf(
      MineruInvalidResponseError
    );

    const httpUrlClient = createClient(
      vi.fn().mockResolvedValue(
        pollResponse('done', { full_zip_url: 'http://download.example.com/result.zip' })
      )
    );
    await expect(httpUrlClient.waitForResult('batch-123')).rejects.toBeInstanceOf(
      MineruInvalidResponseError
    );
  });
});

describe('MineruClient errors and stage-local retry', () => {
  it.each([
    ['A0202', MineruAuthenticationError],
    ['A0211', MineruAuthenticationError],
    ['A0212', MineruQuotaError],
    ['A0217', MineruQuotaError],
    [-60018, MineruQuotaError],
    ['-60018', MineruQuotaError],
    [-60019, MineruQuotaError],
    ['-60019', MineruQuotaError],
  ])('classifies official API code %s', async (code, ErrorType) => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ code, msg: 'official error' }));
    const client = createClient(fetchFn);

    await expect(client.requestUpload('paper.pdf')).rejects.toBeInstanceOf(ErrorType);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])('does not retry authentication status %i', async (status) => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ msg: 'unauthorized' }, status));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });

    await expect(client.requestUpload('paper.pdf')).rejects.toBeInstanceOf(
      MineruAuthenticationError
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it.each([401, 403])('keeps signed URL status %i file-local', async (status) => {
    const uploadClient = createClient(vi.fn().mockResolvedValue(new Response(null, { status })));
    await expect(uploadClient.uploadPdf(
      { taskId: 'batch-123', uploadUrl: UPLOAD_URL },
      new Uint8Array([1])
    )).rejects.toBeInstanceOf(MineruStageError);

    const downloadFn = vi.fn().mockResolvedValue({
      status,
      headers: new Headers(),
      arrayBuffer: new ArrayBuffer(0),
    });
    const downloadClient = createClient(vi.fn(), { downloadFn });
    await expect(downloadClient.downloadResult(ZIP_URL)).rejects.toBeInstanceOf(
      MineruStageError
    );
  });

  it('retries an official transient service code', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ code: -60007, msg: 'service temporarily unavailable' }))
      .mockResolvedValueOnce(uploadLeaseResponse());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });

    await expect(client.requestUpload('paper.pdf')).resolves.toMatchObject({ taskId: 'batch-123' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it.each([-60013, -60002])('does not retry official permanent code %i', async (code) => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ code, msg: 'permanent failure' }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });

    await expect(client.requestUpload('paper.pdf')).rejects.toBeInstanceOf(MineruStageError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it.each([-10001, -60020])('retries official transient code %i at most three times', async (code) => {
    const fetchFn = vi.fn().mockImplementation(async () => jsonResponse({ code, msg: 'retry later' }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });

    await expect(client.requestUpload('paper.pdf')).rejects.toBeInstanceOf(MineruStageError);
    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('classifies an asynchronous quota failure', async () => {
    const client = createClient(vi.fn().mockResolvedValue(
      pollResponse('failed', { err_msg: 'Daily extract task limit reached' })
    ));

    await expect(client.waitForResult('batch-123')).rejects.toBeInstanceOf(MineruQuotaError);
  });

  it.each([408, 429, 500, 503])('retries status %i at most three times', async (status) => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ msg: 'temporary' }, status));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });

    await expect(client.requestUpload('paper.pdf')).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('uses Retry-After seconds instead of exponential backoff', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ msg: 'busy' }, 429, { 'Retry-After': '7' }))
      .mockResolvedValueOnce(uploadLeaseResponse());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });

    await client.requestUpload('paper.pdf');

    expect(sleep).toHaveBeenCalledWith(7000, undefined);
  });

  it('supports HTTP-date Retry-After using the injected clock', async () => {
    const now = Date.parse('2026-07-21T00:00:00.000Z');
    const retryAt = new Date(now + 12_000).toUTCString();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ msg: 'busy' }, 503, { 'Retry-After': retryAt }))
      .mockResolvedValueOnce(uploadLeaseResponse());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep, now: () => now });

    await client.requestUpload('paper.pdf');

    expect(sleep).toHaveBeenCalledWith(12_000, undefined);
  });

  it('uses Retry-After from a 2xx rate-limit API envelope', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse(
        { code: 1003, msg: 'rate limit exceeded', trace_id: 'trace-rate' },
        200,
        { 'Retry-After': '9' }
      ))
      .mockResolvedValueOnce(uploadLeaseResponse());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClient(fetchFn, { sleep });

    await client.requestUpload('paper.pdf');

    expect(sleep).toHaveBeenCalledWith(9000, undefined);
  });

  it('retries only the failed download stage without replaying upload stages', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(uploadLeaseResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(pollResponse('done'))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(binaryResponse([9, 8, 7]));
    const client = createClient(fetchFn);

    const lease = await client.requestUpload('paper.pdf');
    await client.uploadPdf(lease, new Uint8Array([1]));
    const result = await client.waitForResult(lease.taskId);
    const bytes = await client.downloadResult(result.zipUrl);

    expect(Array.from(bytes)).toEqual([9, 8, 7]);
    expect(fetchFn.mock.calls.filter(([url]) => url === `${API_BASE_URL}/file-urls/batch`)).toHaveLength(1);
    expect(fetchFn.mock.calls.filter(([url]) => url === UPLOAD_URL)).toHaveLength(1);
    expect(fetchFn.mock.calls.filter(([url]) => url === ZIP_URL)).toHaveLength(2);
  });

  it('surfaces a typed failed-task error with task and trace identifiers', async () => {
    const client = createClient(
      vi.fn().mockResolvedValue(pollResponse('failed', { err_msg: 'parse failed' }))
    );

    await expect(client.waitForResult('batch-123')).rejects.toMatchObject({
      name: 'MineruTaskFailedError',
      taskId: 'batch-123',
      traceId: 'trace-poll',
    });
  });

  it('redacts tokens and signed URLs from API error messages', async () => {
    const failedClient = createClient(
      vi.fn().mockResolvedValue(
        pollResponse('failed', {
          err_msg: `token=secret failed at ${ZIP_URL}`,
        })
      )
    );

    const failedError = await failedClient.waitForResult('batch-123').catch((error: unknown) => error);
    expect(failedError).toBeInstanceOf(MineruTaskFailedError);
    expect((failedError as Error).message).not.toContain('secret');
    expect((failedError as Error).message).not.toContain('download.example.com');
  });

  it.each([
    `raw ${API_TOKEN} value`,
    `token=${API_TOKEN}`,
    `token: ${API_TOKEN}`,
    JSON.stringify({ token: API_TOKEN }),
    `access_token=${API_TOKEN}`,
    `apiToken: ${API_TOKEN}`,
    `Bearer ${API_TOKEN}`,
    `https://signed.example.com/result?access_token=${encodeURIComponent(API_TOKEN)}`,
  ])('explicitly redacts the configured API token from %s', async (message) => {
    const networkClient = createClient(vi.fn().mockRejectedValue(new Error(message)));

    const networkError = await networkClient.downloadResult(ZIP_URL).catch((error: unknown) => error);
    expect(networkError).toBeInstanceOf(Error);
    expect((networkError as Error).message).not.toContain(API_TOKEN);
    expect((networkError as Error).message).not.toContain(encodeURIComponent(API_TOKEN));
    expect((networkError as Error & { cause?: unknown }).cause).toBeUndefined();
    const identifiers = networkError as { taskId?: string; traceId?: string };
    expect(identifiers.taskId ?? '').not.toContain(API_TOKEN);
    expect(identifiers.traceId ?? '').not.toContain(API_TOKEN);
  });
});

describe('MineruClient cancellation and timeout', () => {
  it('converts abort during signed upload into MineruCancelledError', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn((_url: string, init?: RequestInit) => abortablePendingFetch(init?.signal));
    const client = createClient(fetchFn);
    const promise = client.uploadPdf(
      { taskId: 'batch-123', traceId: 'trace-upload', uploadUrl: UPLOAD_URL },
      new Uint8Array([1]),
      controller.signal
    );

    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(MineruCancelledError);
  });

  it('converts abort during polling into MineruCancelledError', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn((_url: string, init?: RequestInit) => abortablePendingFetch(init?.signal));
    const client = createClient(fetchFn);
    const promise = client.waitForResult('batch-123', controller.signal);

    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(MineruCancelledError);
  });

  it('converts abort during signed download into MineruCancelledError', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn((_url: string, init?: RequestInit) => abortablePendingFetch(init?.signal));
    const client = createClient(fetchFn);
    const promise = client.downloadResult(ZIP_URL, controller.signal);

    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(MineruCancelledError);
  });

  it('times out polling with only safe task and trace identifiers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(pollResponse('pending')));
    const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
      new Promise((resolve, reject) => {
        const timer = window.setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
          window.clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    const client = createClient(fetchFn, {
      timeoutMs: 4000,
      sleep,
      now: () => Date.now(),
    });

    const promise = client.waitForResult('batch-123').catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(4000);
    const error = await promise as MineruTaskTimeoutError;
    expect(error).toBeInstanceOf(MineruTaskTimeoutError);
    expect(error.taskId).toBe('batch-123');
    expect(error.traceId).toBe('trace-poll');
    expect(error.message).toContain('batch-123');
    expect(error.message).toContain('trace-poll');
    expect(error.message).not.toContain(API_TOKEN);
    expect(error.message).not.toContain('http');
  });

  it('aborts a pending poll fetch at the absolute deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
    let operationSignal: AbortSignal | null | undefined;
    const fetchFn = vi.fn((_url: string, init?: RequestInit) => {
      operationSignal = init?.signal;
      return new Promise<Response>(() => undefined);
    });
    const client = createClient(fetchFn, {
      timeoutMs: 4000,
      now: () => Date.now(),
    });
    let outcome: unknown;
    void client.waitForResult('batch-123').catch((error: unknown) => {
      outcome = error;
    });

    await vi.advanceTimersByTimeAsync(4000);

    expect(outcome).toBeInstanceOf(MineruTaskTimeoutError);
    expect(operationSignal?.aborted).toBe(true);
  });

  it('does not wait a full Retry-After beyond the absolute deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({ msg: 'busy' }, 429, { 'Retry-After': '30' })
    );
    const sleep = vi.fn((ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      })
    );
    const client = createClient(fetchFn, {
      timeoutMs: 4000,
      sleep,
      now: () => Date.now(),
    });
    let outcome: unknown;
    void client.waitForResult('batch-123').catch((error: unknown) => {
      outcome = error;
    });

    await vi.advanceTimersByTimeAsync(4000);

    expect(outcome).toBeInstanceOf(MineruTaskTimeoutError);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0][0]).toBeLessThanOrEqual(4000);
  });

  it.each([
    ['missing', undefined],
    ['mismatched', 'different-batch'],
  ])('rejects a %s poll batch_id', async (_label, batchId) => {
    const client = createClient(vi.fn().mockResolvedValue(jsonResponse({
      code: 0,
      msg: 'ok',
      trace_id: 'trace-poll',
      data: {
        ...(batchId ? { batch_id: batchId } : {}),
        extract_result: [{
          file_name: 'paper.pdf',
          state: 'done',
          err_msg: '',
          full_zip_url: ZIP_URL,
        }],
      },
    })));

    await expect(client.waitForResult('batch-123')).rejects.toBeInstanceOf(
      MineruInvalidResponseError
    );
  });
});
