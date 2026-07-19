/**
 * PageBatchRunner unit tests — generic batch-with-retry + rate-limit detection.
 *
 * Extracted from WikiEngine.ingestSource Stage 3 + Stage 4 (2026-07-19).
 * Tests cover:
 *   - All-success path (succeeds = N, failed = [])
 *   - Single retry recovers transient failure
 *   - Retry exhaustion records failure
 *   - Collision propagation (successful task with collision)
 *   - Rate-limit detection (429 in failure reason → RateLimitInfo populated)
 *   - Cancellation (checkCancelled throws → abort propagates)
 *   - Batch delay only between batches, not after last
 *   - concurrency=1 = serial
 *   - Mixed success/failure within a batch
 */

import { describe, it, expect, vi } from 'vitest';
import { runBatchedWithRetry, type BatchTask } from '../../../wiki/engine-internals/page-batch-runner';

interface TestPayload {
  shouldFail?: boolean;
  shouldFailOnRetry?: boolean;
  rateLimitReason?: boolean;
  collision?: boolean;
}

const task = (id: string, payload: TestPayload): BatchTask<TestPayload> => ({ id, payload });

describe('runBatchedWithRetry', () => {
  it('counts all successes when every task succeeds', async () => {
    const tasks = [task('a', {}), task('b', {}), task('c', {})];
    const execute = vi.fn().mockResolvedValue({ success: true as const });

    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 2,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result.succeeded).toBe(3);
    expect(result.failed).toEqual([]);
    expect(result.collisions).toEqual([]);
    expect(result.rateLimitInfo).toBeNull();
    // 1 task × 3 = 3 first-attempt calls, 0 retries
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('retries once on failure and recovers when retry succeeds', async () => {
    const tasks = [task('flaky', { shouldFail: true })];
    const execute = vi.fn()
      .mockResolvedValueOnce({ success: false as const, failureReason: 'transient' })
      .mockResolvedValueOnce({ success: true as const });

    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('records failure when retry also fails', async () => {
    const tasks = [task('broken', { shouldFail: true, shouldFailOnRetry: true })];
    const execute = vi.fn().mockResolvedValue({ success: false as const, failureReason: 'persistent' });

    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toEqual([{ id: 'broken', reason: 'persistent' }]);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('captures execute() throw as failure reason', async () => {
    const tasks = [task('throws', { shouldFail: true })];
    const execute = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result.failed).toEqual([{ id: 'throws', reason: 'network down' }]);
    expect(execute).toHaveBeenCalledTimes(2); // first throw + retry throw
  });

  it('propagates collision from successful task result', async () => {
    const tasks = [task('e1', { collision: true })];
    const execute = vi.fn().mockResolvedValue({
      success: true as const,
      collision: {
        name: 'e1',
        sourceType: 'entity' as const,
        targetType: 'concept' as const,
        targetPath: 'concepts/e1.md',
      },
    });

    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result.succeeded).toBe(1);
    expect(result.collisions).toHaveLength(1);
    expect(result.collisions[0].targetPath).toBe('concepts/e1.md');
  });

  it('detects rate-limit failures across multiple failed tasks', async () => {
    const tasks = [
      task('a', { rateLimitReason: true }),
      task('b', { rateLimitReason: true }),
      task('c', {}),
    ];
    const execute = vi.fn().mockImplementation((payload: TestPayload) => {
      if (payload.rateLimitReason) {
        return Promise.resolve({ success: false as const, failureReason: '429 too many requests' });
      }
      return Promise.resolve({ success: true as const });
    });

    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 300,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result.failed).toHaveLength(2);
    expect(result.rateLimitInfo).not.toBeNull();
    expect(result.rateLimitInfo?.count).toBe(2);
    // concurrency=1, batchDelay=300 → suggestedConcurrency=1, suggestedDelay=600
    expect(result.rateLimitInfo?.suggestedConcurrency).toBe(1);
    expect(result.rateLimitInfo?.suggestedDelay).toBe(600);
  });

  it('does NOT rate-limit-flag transient non-429 failures', async () => {
    const tasks = [task('a', { shouldFail: true })];
    const execute = vi.fn().mockResolvedValue({
      success: false as const,
      failureReason: 'connection reset',
    });

    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result.rateLimitInfo).toBeNull();
  });

  it('aborts via checkCancelled()', async () => {
    const tasks = [task('a', {}), task('b', {}), task('c', {})];
    const checkCancelled = vi.fn().mockImplementation(() => {
      throw new DOMException('Aborted', 'AbortError');
    });
    const execute = vi.fn().mockResolvedValue({ success: true as const });

    await expect(
      runBatchedWithRetry({
        tasks,
        concurrency: 1,
        batchDelayMs: 0,
        checkCancelled,
        apiDelay: vi.fn().mockResolvedValue(undefined),
        execute,
      })
    ).rejects.toThrow('Aborted');

    // checkCancelled called at least once (between batches); execute
    // may have run for the first task before the throw, that's fine.
    expect(checkCancelled).toHaveBeenCalled();
  });

  it('sleeps between batches but not after the last', async () => {
    const tasks = [task('a', {}), task('b', {}), task('c', {})];
    const apiDelay = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn().mockResolvedValue({ success: true as const });

    await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 100,
      checkCancelled: () => {},
      apiDelay,
      execute,
    });

    // 3 tasks / concurrency 1 = 3 batches. Delays between: batch 1→2, 2→3 = 2 delays
    // (no delay after the last batch).
    expect(apiDelay).toHaveBeenCalledTimes(2);
    expect(apiDelay).toHaveBeenCalledWith(100);
  });

  it('skips batch delay when batchDelayMs is 0', async () => {
    const tasks = [task('a', {}), task('b', {})];
    const apiDelay = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn().mockResolvedValue({ success: true as const });

    await runBatchedWithRetry({
      tasks,
      concurrency: 1,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay,
      execute,
    });

    // No inter-batch delay, only the apiDelay calls inside retry path
    // (none here since all succeeded first try).
    expect(apiDelay).not.toHaveBeenCalled();
  });

  it('runs tasks serially when concurrency=1', async () => {
    const calls: string[] = [];
    const execute = vi.fn().mockImplementation(async (payload) => {
      calls.push((payload as TestPayload & { __id: string }).__id);
      return { success: true as const };
    });

    const orderedTasks: BatchTask<TestPayload & { __id: string }>[] = [
      { id: 'a', payload: { __id: 'a' } },
      { id: 'b', payload: { __id: 'b' } },
      { id: 'c', payload: { __id: 'c' } },
    ];
    await runBatchedWithRetry({
      tasks: orderedTasks,
      concurrency: 1,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    // serial: each task completes before the next begins
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('groups tasks by concurrency into parallel batches', async () => {
    const tasks = [task('a', {}), task('b', {}), task('c', {}), task('d', {})];
    const executionOrder: string[] = [];
    let activeInBatch = 0;
    let maxConcurrent = 0;

    const execute = vi.fn().mockImplementation(async (payload) => {
      activeInBatch++;
      maxConcurrent = Math.max(maxConcurrent, activeInBatch);
      executionOrder.push(payload as string);
      // Simulate work
      await new Promise(resolve => window.setTimeout(resolve, 10));
      activeInBatch--;
      return { success: true as const };
    });

    await runBatchedWithRetry({
      tasks,
      concurrency: 2,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    // 4 tasks / concurrency 2 = 2 batches of 2. Peak concurrency = 2.
    expect(maxConcurrent).toBe(2);
    expect(execute).toHaveBeenCalledTimes(4);
  });

  it('records elapsed time', async () => {
    const tasks = [task('a', {}), task('b', {})];
    const result = await runBatchedWithRetry({
      tasks,
      concurrency: 2,
      batchDelayMs: 0,
      checkCancelled: () => {},
      apiDelay: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => window.setTimeout(resolve, 30));
        return { success: true as const };
      }),
    });

    expect(result.elapsedMs).toBeGreaterThanOrEqual(30);
  });
});