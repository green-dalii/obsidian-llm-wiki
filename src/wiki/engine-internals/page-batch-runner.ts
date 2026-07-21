/**
 * PageBatchRunner — generic batch-with-retry + rate-limit detection helper.
 *
 * Extracted from WikiEngine.ingestSource Stage 3 (entity/concept page
 * generation, lines 880-1000) and Stage 4 (related page updates, lines
 * 1015-1080). Both stages share a near-identical template:
 *
 *   1. Slice tasks into concurrency-sized batches
 *   2. allSettled each batch
 *   3. For each failure, retry once after a 2s delay
 *   4. Aggregate collisions + failures
 *   5. detectRateLimitFailures across failures
 *   6. Sleep `batchDelayMs` between batches
 *   7. checkCancelled before each batch (abort-aware)
 *
 * Pre-extraction, both stages had this template inlined ~120 LOC + ~65 LOC
 * respectively. Post-extraction: 1 helper (~120 LOC) + 2 thin call sites
 * (~15 LOC each). Net savings: ~165 LOC and the retry path becomes
 * unit-testable in isolation.
 */

import { detectRateLimitFailures, type RateLimitInfo } from '../../core/rate-limit';

/**
 * Collision data attached to a successful task result. Carried through the
 * pipeline so the caller can record collisions in the analysis report without
 * re-running the task.
 */
export interface Collision {
  name: string;
  sourceType: 'entity' | 'concept';
  targetType: 'entity' | 'concept';
  targetPath: string;
}

/**
 * Result returned by the per-task `execute` callback. Discriminated by
 * `success` so TypeScript can narrow without casts at the call site.
 *
 *   - `success: true` — task ran without error; `collision` may still be set
 *     when an entity/concept resolved to an existing page with a different
 *     type ("Entity-vs-Concept collision" — the LLM and the wiki disagreed).
 *   - `success: false` — task failed; `failureReason` carries the error
 *     message used for retry + rate-limit detection.
 */
export type TaskResult =
  | { success: true; collision?: Collision }
  | { success: false; failureReason: string };

/**
 * A single unit of work for the batch runner. `id` is used in progress
 * messages, console output, and collision/failure records. `payload` is the
 * opaque data the caller's `execute` callback consumes.
 *
 * Generic parameter `T` lets each call site carry its own payload type
 * (SourceAnalysis entity/concept, related_page name+index, etc.).
 */
export interface BatchTask<T> {
  id: string;
  payload: T;
}

/**
 * Options for `runBatchedWithRetry`. Call-site-agnostic — both page generation
 * and related-page updates use this shape.
 */
export interface BatchRunnerOptions<T> {
  /** All tasks to run. Concurrency-batched in order. */
  tasks: BatchTask<T>[];
  /** Number of tasks per batch. `1` = serial. `>1` = parallel. */
  concurrency: number;
  /** Sleep duration between batches. `0` = no delay. */
  batchDelayMs: number;
  /** Single retry for transient failures, delayed by `apiDelayMs` (default 2000ms). */
  apiDelayMs?: number;

  /** Optional progress callback — receives a human-readable line per task. */
  onProgress?: (msg: string) => void;

  /** Throw abort signal — caller's checkCancelled() throws DOMException('AbortError'). */
  checkCancelled: () => void;

  /** Delay primitive (WikiEngine owns this for testability + window.setTimeout capture). */
  apiDelay: (ms: number) => Promise<void>;

  /** Per-task execution. May return Promise rejection OR a `success: false` result. */
  execute: (payload: T) => Promise<TaskResult>;
}

/**
 * Aggregate result from a batch run. Caller (WikiEngine) merges these into
 * its own analysis state (collisions / failedItems / created_pages).
 */
export interface BatchRunnerResult {
  /** Number of tasks that completed with `success: true` (first attempt OR successful retry). */
  succeeded: number;
  /** Tasks that failed even after the retry. */
  failed: Array<{ id: string; reason: string }>;
  /** Collisions collected from successful tasks. */
  collisions: Collision[];
  /** Rate-limit signal: null if no 429s detected. */
  rateLimitInfo: RateLimitInfo | null;
  /** Total wall time of the batch run in milliseconds. */
  elapsedMs: number;
}

/**
 * Run N tasks in concurrency-bounded batches, with single retry on failure,
 * rate-limit detection, and abort-aware cancellation.
 *
 * Behavior contract (matches WikiEngine.ingestSource Stage 3 + Stage 4 pre-extraction):
 *
 *   - Slice `tasks` into `concurrency`-sized batches in order
 *   - For each batch:
 *     1. checkCancelled() — throws if user cancelled
 *     2. allSettled each task; capture collisions + failures
 *     3. For each failure, sleep `apiDelayMs` (default 2000ms) and retry once
 *     4. Sleep `batchDelayMs` before next batch (skip on last)
 *   - Detect rate-limit failures across all failures → return RateLimitInfo
 *   - On retry success, the failure record is dropped (entity/concept push into created_pages)
 *
 * Why extracted: v1.26.0 Lint Perf (#99 follow-up) needs the same retry+rate-limit
 * template for parallel dedup batches in controller.ts:151 — without this helper,
 * that work would copy-paste the same ~120 LOC template a third time.
 */
export async function runBatchedWithRetry<T>(
  opts: BatchRunnerOptions<T>
): Promise<BatchRunnerResult> {
  const apiDelayMs = opts.apiDelayMs ?? 2000;
  const startTime = Date.now();
  const succeeded: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  const collisions: Collision[] = [];

  for (let i = 0; i < opts.tasks.length; i += opts.concurrency) {
    opts.checkCancelled();
    const batch = opts.tasks.slice(i, i + opts.concurrency);

    // First-attempt run.
    const firstAttempt = await runBatch(batch, opts);
    for (const id of firstAttempt.succeeded) succeeded.push(id);
    collisions.push(...firstAttempt.collisions);
    const retryQueue = firstAttempt.retryQueue;

    // Single retry for failures.
    if (retryQueue.length > 0) {
      await opts.apiDelay(apiDelayMs);
      const retryAttempt = await runBatch(
        retryQueue.map(r => r.task),
        opts,
      );
      for (const id of retryAttempt.succeeded) succeeded.push(id);
      collisions.push(...retryAttempt.collisions);
      // For rejected retry tasks, fall back to the FIRST-attempt reason
      // (the retry produced no new information). For success/fail-of-retry,
      // record the second-attempt reason.
      retryAttempt.retryQueue.forEach((r, idx) => {
        failed.push({ id: retryQueue[idx].task.id, reason: r.reason });
      });
    }

    // Delay between batches (skip on last)
    if (i + opts.concurrency < opts.tasks.length && opts.batchDelayMs > 0) {
      await opts.apiDelay(opts.batchDelayMs);
    }
  }

  // Rate-limit detection — match the inlined Stage 3/4 logic exactly so
  // the post-extraction behavior is byte-identical.
  const rateLimitInfo = detectRateLimitFailures(
    failed.map(f => ({ name: f.id, reason: f.reason })),
    opts.concurrency,
    opts.batchDelayMs
  );

  return {
    succeeded: succeeded.length,
    failed,
    collisions,
    rateLimitInfo,
    elapsedMs: Date.now() - startTime,
  };
}

/**
 * Run a single batch (first attempt OR retry). Returns the partitioned
 * results so the caller can choose what to do with each category:
 *
 *   - `succeeded` — task IDs to push to the cumulative `succeeded` list
 *   - `collisions` — successful tasks that carried collision data
 *   - `retryQueue` — failures to either feed into a retry pass (first
 *     attempt) or record as final `failed` (retry pass); each entry has
 *     the task + the reason string for the failure
 *
 * Both call sites in `runBatchedWithRetry` use the exact same wrapper,
 * eliminating the prior ~25 LOC copy-paste between first attempt and retry.
 *
 * v1.25.1 Phase C-PR1.8 (Simplification #6).
 */
async function runBatch<T>(
  tasks: BatchTask<T>[],
  opts: BatchRunnerOptions<T>,
): Promise<{
  succeeded: string[];
  collisions: Collision[];
  retryQueue: Array<{ task: BatchTask<T>; reason: string }>;
}> {
  const settled = await Promise.allSettled(
    tasks.map(async (task) => {
      opts.onProgress?.(task.id);
      try {
        return await opts.execute(task.payload);
      } catch (error) {
        return {
          success: false as const,
          failureReason: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  const succeeded: string[] = [];
  const collisions: Collision[] = [];
  const retryQueue: Array<{ task: BatchTask<T>; reason: string }> = [];

  settled.forEach((result, idx) => {
    const task = tasks[idx];
    if (result.status === 'rejected') {
      // Should not happen — execute catches its own errors. Defensive.
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      retryQueue.push({ task, reason });
      return;
    }
    const v = result.value;
    if (v.success) {
      succeeded.push(task.id);
      if (v.collision) collisions.push(v.collision);
    } else {
      retryQueue.push({ task, reason: v.failureReason });
    }
  });

  return { succeeded, collisions, retryQueue };
}