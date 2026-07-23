import {
  MINERU_API_BASE_URL,
  MINERU_MAX_ZIP_BYTES,
  MINERU_MAX_RETRIES,
  MINERU_POLL_INTERVAL_MS,
  MINERU_RETRY_BASE_DELAY_MS,
} from '../../constants';
import type { PdfBackendProgressFn } from './types';
import { MINERU_CONVERSION_PROFILE } from './mineru-profile';

export type ProgressFn = PdfBackendProgressFn;

export interface MineruClientOptions {
  apiToken: string;
  timeoutMs: number;
  fetchFn: typeof fetch;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  now: () => number;
  downloadFn?: (
    url: string,
    signal?: AbortSignal
  ) => Promise<{ status: number; headers: Headers; arrayBuffer: ArrayBuffer }>;
}

export interface UploadLease {
  taskId: string;
  traceId?: string;
  uploadUrl: string;
}

export type MineruUploadLease = UploadLease;

export interface MineruTaskResult {
  taskId: string;
  traceId?: string;
  zipUrl: string;
}

export type MineruRequestStage = 'request-upload' | 'upload' | 'poll' | 'download';

interface MineruErrorDetails {
  taskId?: string;
  traceId?: string;
  status?: number;
  apiToken?: string;
}

export class MineruClientError extends Error {
  readonly taskId?: string;
  readonly traceId?: string;
  readonly status?: number;

  constructor(
    message: string,
    public readonly stage: MineruRequestStage,
    details: MineruErrorDetails = {}
  ) {
    super(sanitizeMineruErrorText(message, details.apiToken));
    this.name = 'MineruClientError';
    this.taskId = details.taskId
      ? sanitizeMineruErrorText(details.taskId, details.apiToken)
      : undefined;
    this.traceId = details.traceId
      ? sanitizeMineruErrorText(details.traceId, details.apiToken)
      : undefined;
    this.status = details.status;
  }
}

export class MineruAuthenticationError extends MineruClientError {
  constructor(stage: MineruRequestStage, details: MineruErrorDetails = {}) {
    super('MinerU authentication failed.', stage, details);
    this.name = 'MineruAuthenticationError';
  }
}

export class MineruRateLimitError extends MineruClientError {
  constructor(stage: MineruRequestStage, details: MineruErrorDetails = {}) {
    super('MinerU rate limit was reached.', stage, details);
    this.name = 'MineruRateLimitError';
  }
}

export class MineruQuotaError extends MineruClientError {
  constructor(stage: MineruRequestStage, details: MineruErrorDetails = {}) {
    super('MinerU quota is unavailable or exhausted.', stage, details);
    this.name = 'MineruQuotaError';
  }
}

export class MineruStageError extends MineruClientError {
  constructor(
    stage: MineruRequestStage,
    message = `MinerU ${stage} request failed.`,
    details: MineruErrorDetails = {}
  ) {
    super(message, stage, details);
    this.name = 'MineruStageError';
  }
}

export class MineruInvalidResponseError extends MineruClientError {
  constructor(stage: MineruRequestStage, details: MineruErrorDetails = {}) {
    super(`MinerU returned an invalid ${stage} response.`, stage, details);
    this.name = 'MineruInvalidResponseError';
  }
}

export class MineruTaskFailedError extends MineruClientError {
  constructor(message: string, taskId: string, traceId?: string, apiToken?: string) {
    super(`MinerU task failed: ${message}`, 'poll', { taskId, traceId, apiToken });
    this.name = 'MineruTaskFailedError';
  }
}

export class MineruCancelledError extends MineruClientError {
  constructor(stage: MineruRequestStage, details: MineruErrorDetails = {}) {
    super(`MinerU ${stage} request was cancelled.`, stage, details);
    this.name = 'MineruCancelledError';
  }
}

export class MineruTaskTimeoutError extends MineruClientError {
  constructor(taskId: string, traceId?: string, apiToken?: string) {
    const traceText = traceId ? ` (trace ${traceId})` : '';
    super(`MinerU task ${taskId}${traceText} timed out.`, 'poll', {
      taskId,
      traceId,
      apiToken,
    });
    this.name = 'MineruTaskTimeoutError';
  }
}

class RetryableMineruError extends Error {
  constructor(
    readonly publicError: MineruClientError,
    readonly retryAfterMs?: number
  ) {
    super(publicError.message);
    this.name = 'RetryableMineruError';
  }
}

interface ApiEnvelope {
  code: number | string;
  msg?: string;
  trace_id?: string;
  data?: unknown;
}

interface PollResultRecord {
  state: string;
  err_msg?: string;
  full_zip_url?: string;
  extract_progress?: {
    extracted_pages?: number;
    total_pages?: number;
  };
}

interface DeadlineScope {
  signal: AbortSignal;
  deadlineAt: number;
  interruption: Promise<never>;
  expired: () => boolean;
  dispose: () => void;
}

const MINERU_RETRYABLE_API_CODES = new Set([
  '-10001', '-60007', '-60009', '-60020', '-60021', '-60022',
]);

function isAuthenticationMessage(message: string): boolean {
  return /unauthori[sz]ed|invalid\s+(api\s+)?token|token\s+expired|authentication/i.test(message);
}

function isQuotaMessage(message: string): boolean {
  return /quota|balance|credit|daily\s+extract\s+task\s+limit|daily\s+parsing\s+limit/i.test(message);
}

export class MineruClient {
  constructor(private readonly options: MineruClientOptions) {}

  async requestUpload(pdfName: string, signal?: AbortSignal): Promise<MineruUploadLease> {
    const stage: MineruRequestStage = 'request-upload';
    return this.runWithRetry(stage, async () => {
      const response = await this.options.fetchFn(`${MINERU_API_BASE_URL}/file-urls/batch`, {
        method: 'POST',
        headers: this.apiHeaders(true),
        body: JSON.stringify({
          files: [{ name: pdfName }],
          model_version: MINERU_CONVERSION_PROFILE.modelVersion,
          enable_formula: MINERU_CONVERSION_PROFILE.enableFormula,
          enable_table: MINERU_CONVERSION_PROFILE.enableTable,
        }),
        signal,
      });
      await this.requireSuccessfulHttp(response, stage);
      const envelope = await this.readApiEnvelope(response, stage);
      const data = asRecord(envelope.data);
      const taskId = readNonEmptyString(data, 'batch_id');
      const fileUrls = data?.file_urls;
      if (!taskId || !Array.isArray(fileUrls) || fileUrls.length !== 1) {
        throw new MineruInvalidResponseError(
          stage,
          this.errorDetails(undefined, envelope.trace_id)
        );
      }
      const uploadUrl: unknown = fileUrls[0];
      if (typeof uploadUrl !== 'string' || !isHttpsUrl(uploadUrl)) {
        throw new MineruInvalidResponseError(
          stage,
          this.errorDetails(taskId, envelope.trace_id)
        );
      }
      return {
        taskId,
        ...(envelope.trace_id ? { traceId: envelope.trace_id } : {}),
        uploadUrl,
      };
    }, signal);
  }

  async uploadPdf(
    lease: MineruUploadLease,
    bytes: Uint8Array,
    signal?: AbortSignal
  ): Promise<void> {
    const stage: MineruRequestStage = 'upload';
    await this.runWithRetry(stage, async () => {
      const response = await this.options.fetchFn(lease.uploadUrl, {
        method: 'PUT',
        body: bytes as unknown as BodyInit,
        signal,
      });
      await this.requireSuccessfulHttp(response, stage, lease.taskId, lease.traceId);
    }, signal, lease.taskId, lease.traceId);
  }

  async waitForResult(
    taskId: string,
    signal?: AbortSignal,
    onProgress?: PdfBackendProgressFn
  ): Promise<MineruTaskResult> {
    const stage: MineruRequestStage = 'poll';
    const deadline = this.createDeadlineScope(signal);
    let traceId: string | undefined;

    try {
      while (true) {
        this.throwIfAborted(stage, deadline.signal, signal, deadline, taskId, traceId);
        const envelope = await this.runWithRetry(stage, async () => {
          const response = await this.options.fetchFn(
            `${MINERU_API_BASE_URL}/extract-results/batch/${encodeURIComponent(taskId)}`,
            {
              method: 'GET',
              headers: this.apiHeaders(false),
              signal: deadline.signal,
            }
          );
          await this.requireSuccessfulHttp(response, stage, taskId, traceId);
          return this.readApiEnvelope(response, stage, taskId);
        }, deadline.signal, taskId, traceId, deadline, signal);

        traceId = envelope.trace_id ?? traceId;
        const result = this.readSinglePollResult(envelope, taskId, traceId);
        if (result.state === 'done') {
          const zipUrl = result.full_zip_url;
          if (!zipUrl || !isHttpsUrl(zipUrl)) {
            throw new MineruInvalidResponseError(
              stage,
              this.errorDetails(taskId, traceId)
            );
          }
          return {
            taskId,
            ...(traceId ? { traceId } : {}),
            zipUrl,
          };
        }
        if (result.state === 'failed') {
          const failureMessage = result.err_msg || 'Unknown extraction error.';
          const details = this.errorDetails(taskId, traceId);
          if (isAuthenticationMessage(failureMessage)) {
            throw new MineruAuthenticationError('poll', details);
          }
          if (isQuotaMessage(failureMessage)) {
            throw new MineruQuotaError('poll', details);
          }
          throw new MineruTaskFailedError(
            failureMessage,
            taskId,
            traceId,
            this.options.apiToken
          );
        }
        if (result.state === 'waiting-file' || result.state === 'pending') {
          onProgress?.({ stage: 'waiting' });
        } else if (result.state === 'running') {
          const completedPages = result.extract_progress?.extracted_pages;
          const totalPages = result.extract_progress?.total_pages;
          onProgress?.({
            stage: 'parsing',
            ...(typeof completedPages === 'number' ? { completedPages } : {}),
            ...(typeof totalPages === 'number' ? { totalPages } : {}),
          });
        } else if (result.state === 'converting') {
          onProgress?.({ stage: 'converting' });
        } else {
          throw new MineruInvalidResponseError(
            stage,
            this.errorDetails(taskId, traceId)
          );
        }

        const remaining = deadline.deadlineAt - this.options.now();
        if (remaining <= 0) {
          throw new MineruTaskTimeoutError(taskId, traceId, this.options.apiToken);
        }
        try {
          await Promise.race([
            this.options.sleep(
              Math.min(MINERU_POLL_INTERVAL_MS, remaining),
              deadline.signal
            ),
            deadline.interruption,
          ]);
        } catch (error) {
          throw this.normalizeThrownError(
            error,
            stage,
            deadline.signal,
            taskId,
            traceId,
            deadline,
            signal
          );
        }
      }
    } finally {
      deadline.dispose();
    }
  }

  async downloadResult(zipUrl: string, signal?: AbortSignal): Promise<Uint8Array> {
    const stage: MineruRequestStage = 'download';
    return this.runWithRetry(stage, async () => {
      if (this.options.downloadFn) {
        const result = await this.options.downloadFn(zipUrl, signal);
        await this.requireSuccessfulHttp(
          new Response(null, { status: result.status, headers: result.headers }),
          stage
        );
        this.assertDownloadSize(result.headers, result.arrayBuffer.byteLength);
        return new Uint8Array(result.arrayBuffer);
      }
      const response = await this.options.fetchFn(zipUrl, {
        method: 'GET',
        signal,
      });
      await this.requireSuccessfulHttp(response, stage);
      const bytes = new Uint8Array(await response.arrayBuffer());
      this.assertDownloadSize(response.headers, bytes.length);
      return bytes;
    }, signal);
  }

  private assertDownloadSize(headers: Headers, actualBytes: number): void {
    const declaredBytes = Number(headers.get('Content-Length'));
    if (
      Number.isFinite(declaredBytes) && declaredBytes > MINERU_MAX_ZIP_BYTES
      || actualBytes > MINERU_MAX_ZIP_BYTES
    ) {
      throw new MineruStageError('download', 'MinerU result archive exceeds the size limit.');
    }
  }

  private apiHeaders(includeContentType: boolean): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.apiToken}`,
      ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
      Accept: '*/*',
    };
  }

  private async runWithRetry<T>(
    stage: MineruRequestStage,
    operation: () => Promise<T>,
    signal?: AbortSignal,
    taskId?: string,
    traceId?: string,
    deadline?: DeadlineScope,
    externalSignal?: AbortSignal
  ): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      this.throwIfAborted(stage, signal, externalSignal, deadline, taskId, traceId);
      try {
        const result = deadline
          ? await Promise.race([operation(), deadline.interruption])
          : await operation();
        this.throwIfAborted(stage, signal, externalSignal, deadline, taskId, traceId);
        return result;
      } catch (error) {
        const normalized = this.normalizeThrownError(
          error,
          stage,
          signal,
          taskId,
          traceId,
          deadline,
          externalSignal
        );
        if (!(normalized instanceof RetryableMineruError)) {
          throw normalized;
        }
        if (attempt >= MINERU_MAX_RETRIES) {
          throw normalized.publicError;
        }
        const delay = normalized.retryAfterMs
          ?? MINERU_RETRY_BASE_DELAY_MS * (2 ** attempt);
        const remaining = deadline
          ? Math.max(0, deadline.deadlineAt - this.options.now())
          : delay;
        const boundedDelay = Math.min(delay, remaining);
        if (deadline && boundedDelay <= 0) {
          throw new MineruTaskTimeoutError(taskId ?? '', traceId, this.options.apiToken);
        }
        try {
          const sleepPromise = this.options.sleep(boundedDelay, signal);
          if (deadline) {
            await Promise.race([sleepPromise, deadline.interruption]);
          } else {
            await sleepPromise;
          }
        } catch (sleepError) {
          throw this.normalizeThrownError(
            sleepError,
            stage,
            signal,
            taskId,
            traceId,
            deadline,
            externalSignal
          );
        }
      }
    }
  }

  private async requireSuccessfulHttp(
    response: Response,
    stage: MineruRequestStage,
    taskId?: string,
    traceId?: string
  ): Promise<void> {
    if (response.ok) return;
    const details = this.errorDetails(taskId, traceId, response.status);
    if (
      (response.status === 401 || response.status === 403)
      && (stage === 'request-upload' || stage === 'poll')
    ) {
      throw new MineruAuthenticationError(stage, details);
    }
    const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'), this.options.now());
    if (response.status === 429) {
      throw new RetryableMineruError(new MineruRateLimitError(stage, details), retryAfterMs);
    }
    if (response.status === 408 || response.status >= 500) {
      throw new RetryableMineruError(new MineruStageError(stage, undefined, details), retryAfterMs);
    }
    throw new MineruStageError(stage, undefined, details);
  }

  private async readApiEnvelope(
    response: Response,
    stage: MineruRequestStage,
    taskId?: string
  ): Promise<ApiEnvelope> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await response.text());
    } catch {
      throw new MineruInvalidResponseError(stage, this.errorDetails(taskId));
    }
    const record = asRecord(parsed);
    if (
      !record
      || (typeof record.code !== 'number' && typeof record.code !== 'string')
      || (typeof record.code === 'string' && record.code.length === 0)
    ) {
      throw new MineruInvalidResponseError(stage, this.errorDetails(taskId));
    }
    const envelope: ApiEnvelope = {
      code: record.code,
      ...(typeof record.msg === 'string' ? { msg: record.msg } : {}),
      ...(typeof record.trace_id === 'string' ? { trace_id: record.trace_id } : {}),
      ...('data' in record ? { data: record.data } : {}),
    };
    if (envelope.code !== 0 && envelope.code !== '0') {
      const retryAfterMs = parseRetryAfter(
        response.headers.get('Retry-After'),
        this.options.now()
      );
      throw this.classifyApiError(stage, envelope, taskId, retryAfterMs);
    }
    return envelope;
  }

  private classifyApiError(
    stage: MineruRequestStage,
    envelope: ApiEnvelope,
    taskId?: string,
    retryAfterMs?: number
  ): MineruClientError | RetryableMineruError {
    const message = envelope.msg ?? '';
    const details = this.errorDetails(taskId, envelope.trace_id);
    const code = String(envelope.code).toUpperCase();
    if (
      code === 'A0202'
      || code === 'A0211'
      || isAuthenticationMessage(message)
    ) {
      return new MineruAuthenticationError(stage, details);
    }
    if (
      code === 'A0212'
      || code === 'A0217'
      || code === '-60018'
      || code === '-60019'
      || isQuotaMessage(message)
    ) {
      return new MineruQuotaError(stage, details);
    }
    if (
      /rate\s*limit|qps\s+limit|too\s+many\s+requests/i.test(message)
    ) {
      return new RetryableMineruError(
        new MineruRateLimitError(stage, details),
        retryAfterMs
      );
    }
    if (MINERU_RETRYABLE_API_CODES.has(code)) {
      return new RetryableMineruError(
        new MineruStageError(stage, `MinerU ${stage} request failed: ${message || 'API error'}.`, details),
        retryAfterMs
      );
    }
    return new MineruStageError(stage, `MinerU ${stage} request failed: ${message || 'API error'}.`, details);
  }

  private readSinglePollResult(
    envelope: ApiEnvelope,
    taskId: string,
    traceId?: string
  ): PollResultRecord {
    const data = asRecord(envelope.data);
    const responseTaskId = readNonEmptyString(data, 'batch_id');
    const results = data?.extract_result;
    if (responseTaskId !== taskId || !Array.isArray(results) || results.length !== 1) {
      throw new MineruInvalidResponseError(
        'poll',
        this.errorDetails(taskId, traceId)
      );
    }
    const record = asRecord(results[0]);
    if (!record || typeof record.state !== 'string') {
      throw new MineruInvalidResponseError(
        'poll',
        this.errorDetails(taskId, traceId)
      );
    }
    const progress = asRecord(record.extract_progress);
    return {
      state: record.state,
      ...(typeof record.err_msg === 'string' ? { err_msg: record.err_msg } : {}),
      ...(typeof record.full_zip_url === 'string' ? { full_zip_url: record.full_zip_url } : {}),
      ...(progress ? {
        extract_progress: {
          ...(typeof progress.extracted_pages === 'number'
            ? { extracted_pages: progress.extracted_pages }
            : {}),
          ...(typeof progress.total_pages === 'number'
            ? { total_pages: progress.total_pages }
            : {}),
        },
      } : {}),
    };
  }

  private normalizeThrownError(
    error: unknown,
    stage: MineruRequestStage,
    signal?: AbortSignal,
    taskId?: string,
    traceId?: string,
    deadline?: DeadlineScope,
    externalSignal?: AbortSignal
  ): Error {
    if (externalSignal?.aborted) {
      return new MineruCancelledError(stage, this.errorDetails(taskId, traceId));
    }
    if (deadline && (deadline.expired() || this.options.now() >= deadline.deadlineAt)) {
      return new MineruTaskTimeoutError(taskId ?? '', traceId, this.options.apiToken);
    }
    if (signal?.aborted || isAbortError(error)) {
      return new MineruCancelledError(stage, this.errorDetails(taskId, traceId));
    }
    if (error instanceof MineruClientError || error instanceof RetryableMineruError) {
      return error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    return new RetryableMineruError(
      new MineruStageError(
        stage,
        `MinerU ${stage} request failed: ${detail}`,
        this.errorDetails(taskId, traceId)
      )
    );
  }

  private throwIfAborted(
    stage: MineruRequestStage,
    signal?: AbortSignal,
    externalSignal?: AbortSignal,
    deadline?: DeadlineScope,
    taskId?: string,
    traceId?: string
  ): void {
    if (externalSignal?.aborted) {
      throw new MineruCancelledError(stage, this.errorDetails(taskId, traceId));
    }
    if (deadline && (deadline.expired() || this.options.now() >= deadline.deadlineAt)) {
      throw new MineruTaskTimeoutError(taskId ?? '', traceId, this.options.apiToken);
    }
    if (signal?.aborted) {
      throw new MineruCancelledError(stage, this.errorDetails(taskId, traceId));
    }
  }

  private createDeadlineScope(externalSignal?: AbortSignal): DeadlineScope {
    const controller = new AbortController();
    const deadlineAt = this.options.now() + this.options.timeoutMs;
    let expired = false;
    let interrupted = false;
    let rejectInterruption: (reason: Error) => void = () => undefined;
    const interruption = new Promise<never>((_resolve, reject) => {
      rejectInterruption = reject;
    });
    void interruption.catch(() => undefined);
    const interrupt = (): void => {
      if (interrupted) return;
      interrupted = true;
      controller.abort();
      rejectInterruption(new DOMException('Aborted', 'AbortError'));
    };
    const expire = (): void => {
      expired = true;
      interrupt();
    };
    const cancel = (): void => interrupt();
    const timer = window.setTimeout(
      expire,
      Math.max(0, deadlineAt - this.options.now())
    );
    externalSignal?.addEventListener('abort', cancel, { once: true });
    if (externalSignal?.aborted) cancel();
    return {
      signal: controller.signal,
      deadlineAt,
      interruption,
      expired: () => expired,
      dispose: () => {
        window.clearTimeout(timer);
        externalSignal?.removeEventListener('abort', cancel);
      },
    };
  }

  private errorDetails(
    taskId?: string,
    traceId?: string,
    status?: number
  ): MineruErrorDetails {
    return { taskId, traceId, status, apiToken: this.options.apiToken };
  }
}

export function sanitizeMineruErrorText(text: string, apiToken?: string): string {
  let sanitized = text;
  if (apiToken) {
    sanitized = sanitized.split(apiToken).join('[REDACTED]');
    const encodedToken = encodeURIComponent(apiToken);
    if (encodedToken !== apiToken) {
      sanitized = sanitized.split(encodedToken).join('[REDACTED]');
    }
  }
  return sanitized
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[REDACTED_URL]')
    .replace(
      /\b(token|access[_-]?token|api[_-]?token|api[_-]?key|authorization)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s&,}]+)/gi,
      '$1$2[REDACTED]'
    )
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]');
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : undefined;
}

function readNonEmptyString(
  record: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
    || error instanceof Error && error.name === 'AbortError';
}

function parseRetryAfter(value: string | null, now: number): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;
  return Math.max(0, timestamp - now);
}
