// ingest-queue.test.ts — pure store tests
//
// IngestQueue is the single source of truth for the Ingest lifecycle
// (v1.23.0 Phase 5.1.5, design 2026-06-28). The Multi-File Suggest
// modal subscribes to it and renders the right pane from the live
// snapshot. Earlier the modal held its own `selected: TFile[]` and a
// one-shot `onConfirm` callback — that design couldn't show "running
// now" / "completed" / "failed" states, and forced the modal to be
// closed before ingest started.
//
// This test file pins down the store's contract:
//   - subscribe()/getSnapshot() — pub/sub, multiple subscribers
//   - enqueue() / start() / complete() / remove() — state transitions
//   - isIngested() — terminal-state query
//   - ordering — FIFO by addedAt, but removal preserves relative order
//
// Implementation must remain IO-free: no vault access, no LLM calls,
// no DOM. The store is the data layer; ingest workers (which DO
// touch the vault) live in main.ts and call into the store.

import { describe, it, expect, vi } from 'vitest';
import { TFile } from 'obsidian';
import { IngestQueue } from '../../core/ingest-queue';

function mkFile(path: string): TFile {
  return Object.assign(new TFile(), {
    path,
    basename: path.split('/').pop() ?? path,
  });
}

describe('IngestQueue — initial state', () => {
  it('snapshot is empty when nothing has been enqueued', () => {
    const q = new IngestQueue();
    expect(q.getSnapshot()).toEqual([]);
  });

  it('isIngested returns false for any file when queue is empty', () => {
    const q = new IngestQueue();
    expect(q.isIngested(mkFile('a.md'))).toBe(false);
  });
});

describe('IngestQueue — enqueue', () => {
  it('enqueueJobs returns only the exact newly-created jobs in input order', () => {
    const q = new IngestQueue();
    const pending = mkFile('pending.md');
    q.enqueue([pending]);

    const jobs = q.enqueueJobs([
      mkFile('paper.mineru/document.md'),
      mkFile('a.md'),
      mkFile('a.md'),
      pending,
      mkFile('b.md'),
    ]);

    expect(jobs.map(job => job.file.path)).toEqual(['a.md', 'b.md']);
    expect(jobs.map(job => job.id)).toEqual(
      q.getSnapshot().slice(-2).map(job => job.id),
    );
  });

  it('enqueueJobs returns an empty list when every candidate is filtered', () => {
    const q = new IngestQueue();
    const pending = mkFile('pending.md');
    q.enqueue([pending]);

    expect(q.enqueueJobs([
      mkFile('paper.mineru/document.md'),
      pending,
      pending,
    ])).toEqual([]);
  });

  it('enqueue remains backward-compatible by returning enqueueJobs ids', () => {
    const q = new IngestQueue();
    const jobs = q.enqueueJobs([mkFile('a.md'), mkFile('b.md')]);
    const ids = q.enqueue([mkFile('c.md'), mkFile('d.md')]);

    expect(jobs.map(job => job.file.path)).toEqual(['a.md', 'b.md']);
    expect(ids).toEqual(q.getSnapshot().slice(-2).map(job => job.id));
  });

  it('rejects managed MinerU artifact paths but accepts lookalike names', () => {
    const q = new IngestQueue();

    q.enqueue([
      mkFile('paper.mineru/document.md'),
      mkFile('paper.mineru.tmp-op/images/a.png'),
      mkFile('paper.mineru-not/document.md'),
    ]);

    expect(q.getSnapshot().map(job => job.file.path)).toEqual([
      'paper.mineru-not/document.md',
    ]);
  });

  it('adds a pending job for each file and returns the new ids in order', () => {
    const q = new IngestQueue();
    const ids = q.enqueue([mkFile('a.md'), mkFile('b.md')]);
    expect(ids).toHaveLength(2);
    const snap = q.getSnapshot();
    expect(snap).toHaveLength(2);
    expect(snap[0].status).toBe('pending');
    expect(snap[1].status).toBe('pending');
    expect(snap[0].file.path).toBe('a.md');
    expect(snap[1].file.path).toBe('b.md');
    expect(snap[0].id).toBe(ids[0]);
    expect(snap[1].id).toBe(ids[1]);
  });

  it('preserves the order of input files in the snapshot', () => {
    const q = new IngestQueue();
    const files = [mkFile('c.md'), mkFile('a.md'), mkFile('b.md')];
    q.enqueue(files);
    const paths = q.getSnapshot().map(j => j.file.path);
    expect(paths).toEqual(['c.md', 'a.md', 'b.md']);
  });

  it('stamps addedAt with a monotonic timestamp', () => {
    const q = new IngestQueue();
    const ids = q.enqueue([mkFile('a.md'), mkFile('b.md')]);
    const snap = q.getSnapshot();
    // addedAt should be a number, and later enqueue has >= addedAt.
    expect(typeof snap[0].addedAt).toBe('number');
    expect(snap[1].addedAt).toBeGreaterThanOrEqual(snap[0].addedAt);
    expect(ids[0]).toBeDefined();
    expect(ids[1]).toBeDefined();
  });

  it('ignores duplicate paths within a single enqueue call', () => {
    // The modal already de-dupes per-click; the store is the second
    // line of defense. De-dup behavior is "keep the first occurrence"
    // so order is stable.
    const q = new IngestQueue();
    q.enqueue([mkFile('a.md'), mkFile('a.md'), mkFile('b.md')]);
    const paths = q.getSnapshot().map(j => j.file.path);
    expect(paths).toEqual(['a.md', 'b.md']);
  });

  it('does NOT re-enqueue a file that is already pending or running', () => {
    // Re-enqueuing an in-flight file would cause the ingest worker
    // to process it twice. Block the second add.
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    const second = q.enqueue([mkFile('a.md')]);
    expect(second).toEqual([]);
    expect(q.getSnapshot()).toHaveLength(1);
    expect(q.getSnapshot()[0].id).toBe(id);
  });

  it('DOES allow re-enqueuing a file after it has completed or failed', () => {
    // Once a job is in a terminal state, the user may want to retry
    // the same file (e.g. after a transient network failure).
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    q.start(id);
    q.complete(id, false, 'transient error');
    const retry = q.enqueue([mkFile('a.md')]);
    expect(retry).toHaveLength(1);
    expect(q.getSnapshot()).toHaveLength(2);
    expect(q.getSnapshot()[1].status).toBe('pending');
  });
});

describe('IngestQueue — start', () => {
  it('transitions a pending job to running and stamps startedAt', () => {
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    q.start(id);
    const job = q.getSnapshot()[0];
    expect(job.status).toBe('running');
    expect(typeof job.startedAt).toBe('number');
  });

  it('is a no-op when the id does not exist (defensive: stale workers)', () => {
    const q = new IngestQueue();
    expect(() => q.start('does-not-exist')).not.toThrow();
    expect(q.getSnapshot()).toEqual([]);
  });

  it('is a no-op when the job is already in a terminal state', () => {
    // A worker that completes a job twice (race) should not flip it
    // back to running.
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    q.start(id);
    q.complete(id, true);
    q.start(id); // should NOT revive a completed job
    expect(q.getSnapshot()[0].status).toBe('completed');
  });
});

describe('IngestQueue — complete', () => {
  it('marks a running job as completed when ok=true', () => {
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    q.start(id);
    q.complete(id, true);
    const job = q.getSnapshot()[0];
    expect(job.status).toBe('completed');
    expect(job.error).toBeUndefined();
    expect(typeof job.finishedAt).toBe('number');
  });

  it('marks a running job as failed and stores the error when ok=false', () => {
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    q.start(id);
    q.complete(id, false, 'API key not configured');
    const job = q.getSnapshot()[0];
    expect(job.status).toBe('failed');
    expect(job.error).toBe('API key not configured');
    expect(typeof job.finishedAt).toBe('number');
  });

  it('is a no-op when the id does not exist', () => {
    const q = new IngestQueue();
    expect(() => q.complete('ghost', true)).not.toThrow();
  });
});

describe('IngestQueue — remove', () => {
  it('removes a pending job without calling any abort controller', () => {
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    q.remove(id);
    expect(q.getSnapshot()).toEqual([]);
  });

  it('aborts the running job and removes it from the snapshot', () => {
    // When the user clicks cancel on a running job, the ingest
    // worker must receive an abort signal AND the job must leave
    // the snapshot. We use a mock AbortController to verify the
    // signal is fired.
    const q = new IngestQueue();
    const [id] = q.enqueue([mkFile('a.md')]);
    q.start(id);
    const job = q.getSnapshot()[0];
    const controller = job.abortController;
    const abortSpy = vi.spyOn(controller, 'abort');
    q.remove(id);
    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(q.getSnapshot()).toEqual([]);
  });

  it('is a no-op when the id does not exist (defensive)', () => {
    const q = new IngestQueue();
    expect(() => q.remove('ghost')).not.toThrow();
  });

  it('preserves the relative order of remaining jobs after removal', () => {
    // v1.23.0 UX: removing a middle job must NOT shuffle the rest.
    const q = new IngestQueue();
    const [, , id3] = q.enqueue([mkFile('a.md'), mkFile('b.md'), mkFile('c.md')]);
    // Remove the middle one.
    q.remove(q.getSnapshot()[1].id);
    const paths = q.getSnapshot().map(j => j.file.path);
    expect(paths).toEqual(['a.md', 'c.md']);
    // And the third job is still the one we captured.
    expect(q.getSnapshot()[1].id).toBe(id3);
  });
});

describe('IngestQueue — isIngested', () => {
  it('returns true only for completed jobs, NOT for pending/running/failed', () => {
    // "Already ingested" means the file was successfully written to
    // the wiki at least once. A failed job does NOT count — the user
    // may want to retry.
    const q = new IngestQueue();
    const file = mkFile('a.md');
    expect(q.isIngested(file)).toBe(false);

    const [id] = q.enqueue([file]);
    expect(q.isIngested(file)).toBe(false);

    q.start(id);
    expect(q.isIngested(file)).toBe(false);

    q.complete(id, true);
    expect(q.isIngested(file)).toBe(true);
  });

  it('returns true even if the completed job has been removed afterwards', () => {
    // Removal is for the queue display, NOT a memory wipe. The
    // 'already ingested' history persists so the modal can grey out
    // files in a future session. Implementation: keep a separate
    // Set<string> of completed paths.
    const q = new IngestQueue();
    const file = mkFile('a.md');
    const [id] = q.enqueue([file]);
    q.start(id);
    q.complete(id, true);
    q.remove(id);
    expect(q.isIngested(file)).toBe(true);
  });
});

describe('IngestQueue — pub/sub', () => {
  it('notifies subscribers after every mutating call', () => {
    const q = new IngestQueue();
    const listener = vi.fn();
    const unsub = q.subscribe(listener);
    q.enqueue([mkFile('a.md')]);
    q.start(q.getSnapshot()[0].id);
    q.complete(q.getSnapshot()[0].id, true);
    q.remove(q.getSnapshot()[0].id);
    expect(listener).toHaveBeenCalledTimes(4);
    unsub();
  });

  it('stops notifying after unsubscribe', () => {
    const q = new IngestQueue();
    const listener = vi.fn();
    const unsub = q.subscribe(listener);
    q.enqueue([mkFile('a.md')]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    q.enqueue([mkFile('b.md')]);
    expect(listener).toHaveBeenCalledTimes(1); // no further calls
  });

  it('supports multiple subscribers', () => {
    const q = new IngestQueue();
    const a = vi.fn();
    const b = vi.fn();
    q.subscribe(a);
    q.subscribe(b);
    q.enqueue([mkFile('a.md')]);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not notify when a write is a no-op (idempotent guards)', () => {
    // Defensive: the worker can call start() / complete() on a job
    // that has already been removed by the user. The store should
    // silently ignore it and NOT fire the subscriber (no visible
    // state change). The user perceives the snapshot as unchanged.
    const q = new IngestQueue();
    const listener = vi.fn();
    q.subscribe(listener);
    q.start('ghost');    // no-op
    q.complete('ghost', true); // no-op
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('IngestQueue — snapshot is a defensive copy', () => {
  it('mutating the returned snapshot does not affect the queue', () => {
    // The modal lives in a different lifetime than the store. If
    // it accidentally pushes to the snapshot array, the store would
    // gain phantom jobs. getSnapshot() must return a fresh array +
    // shallow job copies so internal mutations cannot leak.
    const q = new IngestQueue();
    q.enqueue([mkFile('a.md'), mkFile('b.md')]);
    const snap = q.getSnapshot();
    // Mutate the array (pop) AND the job object (status) — neither
    // should affect the store.
    snap.pop();
    snap[0].status = 'failed'; // mutate a job
    const after = q.getSnapshot();
    expect(after).toHaveLength(2);
    expect(after[0].status).toBe('pending');
    expect(after[1].status).toBe('pending');
  });
});
