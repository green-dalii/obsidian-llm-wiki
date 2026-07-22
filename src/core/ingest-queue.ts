// ingest-queue.ts — pure single-source-of-truth store for the
// Ingest lifecycle (v1.23.0 Phase 5.1.5, design 2026-06-28).
//
// The Multi-File Suggest modal used to hold its own `selected:
// TFile[]` and a one-shot `onConfirm` callback. That design forced
// the user to (a) close the modal before ingest started, and (b)
// open a separate Operation History panel to see the result. It
// also made it impossible to cancel an in-flight file from the UI.
//
// IngestQueue replaces this with a pub/sub store that:
//   - is the SINGLE source of truth for which files are pending,
//     running, completed, or failed in the current session
//   - exposes `getSnapshot()` for read; `subscribe(listener)` for
//     change notifications
//   - tracks a separate `completedPaths: Set<string>` so the modal
//     can grey out "already ingested" files even after their jobs
//     have been removed from the queue (per session)
//
// PURE: no IO, no Obsidian APIs beyond the TFile type, no DOM.
// The store is the data layer; ingest workers (which DO touch the
// vault and call the LLM) live in main.ts and call into the store
// to publish state transitions.
//
// All write methods (`enqueue` / `start` / `complete` / `remove`)
// are idempotent: re-applying an already-applied transition is a
// silent no-op (no subscriber notification). This is the contract
// the test file pins down — it lets workers safely call start/
// complete without coordinating with the UI layer.

import type { TFile } from 'obsidian';
import { isMineruArtifactPath } from './pdf-backends/mineru-paths';

export type IngestJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface IngestJob {
  /** Stable id, unique per enqueue call. Workers use this to address
   * the job across the async boundary. */
  id: string;
  file: TFile;
  status: IngestJobStatus;
  /** Set when status is 'failed'. */
  error?: string;
  /** ms-since-epoch. Set on enqueue. */
  addedAt: number;
  /** ms-since-epoch. Set when the worker calls start(). */
  startedAt?: number;
  /** ms-since-epoch. Set when the worker calls complete(). */
  finishedAt?: number;
  /** Created on enqueue. Workers can read `signal` to honour user
   * cancellation. The store calls `abort()` on `remove()` if the
   * job is still running. */
  abortController: AbortController;
}

export type IngestListener = () => void;

export class IngestQueue {
  /**
   * The active job list. Internal — never returned by reference.
   * `getSnapshot()` returns a fresh shallow copy.
   */
  private jobs: IngestJob[] = [];
  /**
   * Files that have ever reached 'completed' in this session.
   * Persists after the job is removed so the modal can grey out
   * already-ingested files across re-opens. Reset on plugin unload
   * (or whenever the user requests a clean slate — out of scope
   * here).
   */
  private completedPaths: Set<string> = new Set();
  /** Subscribers notified after every successful (state-changing)
   * write. Idempotent no-ops do NOT notify. */
  private listeners: Set<IngestListener> = new Set();
  /** Monotonic counter used to mint job ids. Wraps at Number.MAX_SAFE_INTEGER. */
  private nextId = 0;

  // ── Read API ─────────────────────────────────────────────────

  /**
   * Return a fresh shallow copy of the current job list. The job
   * objects themselves are also shallow-copied so a caller that
   * mutates a returned job (e.g. setting `error` for a UI hint)
   * cannot leak into the store.
   */
  getSnapshot(): IngestJob[] {
    return this.jobs.map(j => ({ ...j }));
  }

  /**
   * True iff the given file has been successfully ingested at
   * least once in this session. Failed jobs do NOT count — the
   * user may want to retry.
   */
  isIngested(file: TFile): boolean {
    return this.completedPaths.has(file.path);
  }

  /**
   * Register a change listener. Returns an unsubscribe function.
   * The listener is called once after every successful (visible)
   * state transition. Idempotent no-ops do NOT fire.
   */
  subscribe(listener: IngestListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ── Write API ────────────────────────────────────────────────

  /**
   * Add the given files to the queue. Returns the new jobs' ids in
   * input order.
   *
   * De-dup rules (mirrored in the test file):
   *   1. Duplicate paths within this call → keep first, drop rest.
   *   2. Path already in `pending` or `running` → silently skipped.
   *   3. Path already in `completed` or `failed` → NEW job is added
   *      (the user is explicitly retrying; the previous terminal
   *      history remains in completedPaths).
   *
   * Notifies subscribers iff at least one new job was created.
   */
  enqueue(files: TFile[]): string[] {
    return this.enqueueJobs(files).map(job => job.id);
  }

  /** Add files and return the exact jobs that were accepted. */
  enqueueJobs(files: TFile[]): IngestJob[] {
    const newJobs: IngestJob[] = [];
    const inflightPaths = new Set(
      this.jobs
        .filter(j => j.status === 'pending' || j.status === 'running')
        .map(j => j.file.path)
    );
    const seenInThisCall = new Set<string>();
    const now = Date.now();
    for (const file of files) {
      if (isMineruArtifactPath(file.path)) continue;
      if (seenInThisCall.has(file.path)) continue;
      seenInThisCall.add(file.path);
      if (inflightPaths.has(file.path)) continue;
      const id = this.mintId();
      const job: IngestJob = {
        id,
        file,
        status: 'pending',
        addedAt: now,
        abortController: new AbortController(),
      };
      this.jobs.push(job);
      newJobs.push(job);
    }
    if (newJobs.length > 0) this.notify();
    return newJobs.map(job => ({ ...job }));
  }

  /**
   * Transition a pending job to running. No-op if the id is
   * unknown, or if the job is already in a terminal state (so a
   * worker that double-calls start() can't flip a completed job
   * back to running).
   */
  start(id: string): void {
    const job = this.findJob(id);
    if (!job) return;
    if (job.status !== 'pending') return;
    job.status = 'running';
    job.startedAt = Date.now();
    this.notify();
  }

  /**
   * Transition a running job to a terminal state.
   *   ok=true  → 'completed' (also added to completedPaths)
   *   ok=false → 'failed' with the supplied error
   * No-op if the id is unknown.
   */
  complete(id: string, ok: boolean, error?: string): void {
    const job = this.findJob(id);
    if (!job) return;
    if (job.status !== 'running') return;
    job.status = ok ? 'completed' : 'failed';
    job.finishedAt = Date.now();
    if (!ok && error) job.error = error;
    if (ok) this.completedPaths.add(job.file.path);
    this.notify();
  }

  /**
   * Remove a job from the queue. If the job is running, the abort
   * controller is fired so the worker's in-flight request can be
   * cancelled. The job does NOT enter a terminal state — the
   * worker, when it sees the abort signal, is expected to stop
   * cleanly without writing to the wiki.
   *
   * No-op if the id is unknown.
   */
  remove(id: string): void {
    const idx = this.jobs.findIndex(j => j.id === id);
    if (idx === -1) return;
    const job = this.jobs[idx];
    if (job.status === 'running') {
      job.abortController.abort();
    }
    this.jobs.splice(idx, 1);
    this.notify();
  }

  // ── Internals ────────────────────────────────────────────────

  private findJob(id: string): IngestJob | undefined {
    return this.jobs.find(j => j.id === id);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private mintId(): string {
    this.nextId += 1;
    return `ingest-${this.nextId}`;
  }
}
