// MultiFileSuggestModal — v1.23.0 (#130)
//
// Two-pane file picker: left column lists all non-wiki markdown files
// in the vault; right column shows the current selection queue. User
// toggles files with a checkbox, then confirms with the "Start Ingest"
// button at the bottom.
//
// Dedupe: adding the same file twice is a no-op (the second toggle
// un-checks it).
//
// Clear: a "Clear Queue" button drops all pending entries.
//
// The selected files are NOT moved (the original #130 requirement —
// in-place ingest avoids breaking the source-path provenance).
//
// Extracted from the original `src/ui/modals.ts` god file (PR split).
// No behavior change — pure code movement.

import { App, Modal } from 'obsidian';
import type { TFile } from 'obsidian';
import type { LLMWikiSettings } from '../../types';
import { getText } from '../../core/i18n';
import { buildFolderTree, type TreeNode } from '../../core/build-folder-tree';
import type { IngestQueue } from '../../core/ingest-queue';
import { filterCompatibleSourceFiles } from '../../core/source-files';

export class MultiFileSuggestModal extends Modal {
  /** The shared ingest queue. Modal reads + subscribes; never owns
   * the data. */
  private ingestQueue: IngestQueue;
  /** Folder name used to filter wiki files out of the candidate set.
   * Comes from settings (the user-configurable wiki folder). */
  private wikiFolder: string;
  /** Called when the user clicks "Add to queue" with the newly
   * enqueued job ids and the corresponding files. main.ts wires
   * this to `runBatchIngest` so the worker picks them up using
   * the pre-issued ids (re-enqueueing inside runBatchIngest would
   * be a no-op — enqueue is idempotent against in-flight jobs,
   * and the worker would then have no ids to publish start/
   * complete transitions on). The ids+files arrays are aligned
   * by index. If null, the button is hidden and the user is
   * expected to drive ingest from elsewhere (e.g. for tests). */
  private onStartIngest: ((ids: string[], files: TFile[]) => void) | null;
  /** Settings (read-only). Only the `language` field is consulted
   * (for i18n of the cancel-all button). Modal does not mutate
   * settings. */
  private settings: LLMWikiSettings;
  private leftEl!: HTMLElement;
  private rightEl!: HTMLElement;
  private counterEl!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private confirmBtn!: HTMLButtonElement;
  /**
   * Unsubscribe function returned by `ingestQueue.subscribe`. Called
   * in onClose to detach the listener so a re-opened modal doesn't
   * fire on a dead DOM.
   */
  private unsubscribeQueue: (() => void) | null = null;
  /**
   * Nested folder tree built once in onOpen. Recursive walk in
   * buildLeftPane produces the Obsidian-file-explorer-style
   * nested <details> UI. The left pane DOM is built ONCE per
   * onOpen; subsequent updates are in-place via
   * `updateLeftPaneSelections` so user-collapsed folders stay
   * collapsed.
   */
  private treeRoots: TreeNode[] = [];

  constructor(
    app: App,
    settings: LLMWikiSettings,
    ingestQueue: IngestQueue,
    onStartIngest?: (ids: string[], files: TFile[]) => void,
  ) {
    super(app);
    this.settings = settings;
    this.wikiFolder = settings.wikiFolder;
    this.ingestQueue = ingestQueue;
    this.onStartIngest = onStartIngest ?? null;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    // Add the class to BOTH the outer modal container AND the inner
    // content. Obsidian's default `.modal` width caps the content;
    // sizing only `contentEl` is clipped to the parent's width and
    // the inner `width: 80vw` becomes a no-op. The `.modal.llm-wiki-…`
    // selector in styles.css targets the outer container.
    // Same trick schema-diff-modal uses (v1.22.0 #97).
    contentEl.addClass('llm-wiki-multi-file-modal');
    modalEl.addClass('llm-wiki-multi-file-modal');

    // Build the candidate list (non-wiki, non-configDir) and the nested folder
    // tree ONCE. The tree is then rendered once and updated in place.
    const available = filterCompatibleSourceFiles(
      this.app.vault.getFiles(),
      this.wikiFolder,
      this.app.vault.configDir,
    ).sort((a, b) => a.path.localeCompare(b.path));
    this.treeRoots = buildFolderTree(available);

    contentEl.createEl('h3', { text: getText(this.settings.language, 'multiFileModalTitle') });
    contentEl.createEl('p', {
      text: getText(this.settings.language, 'multiFileModalHint'),
      cls: 'llm-wiki-modal-hint',
    });

    this.searchInput = contentEl.createEl('input', {
      type: 'text',
      placeholder: getText(this.settings.language, 'multiFileSearchPlaceholder'),
      cls: 'llm-wiki-multi-file-search',
    });
    // Search re-runs the LEFT pane only (the tree's visible
    // set changes). The right pane is driven by the queue, not
    // the search query.
    this.searchInput.addEventListener('input', () => this.buildLeftPane());

    const panes = contentEl.createDiv({ cls: 'llm-wiki-multi-file-panes' });
    this.leftEl = panes.createDiv({ cls: 'llm-wiki-multi-file-left' });
    this.rightEl = panes.createDiv({ cls: 'llm-wiki-multi-file-right' });

    const actions = contentEl.createDiv({ cls: 'llm-wiki-multi-file-actions' });
    this.counterEl = actions.createEl('span', { cls: 'llm-wiki-multi-file-count' });
    // "Cancel all" sits next to the counter. Replaces the old
    // "Clear queue" button (which was a UX dead-end — it never
    // cancelled the background worker). One click removes every
    // pending job and fires the AbortController on any running
    // job; completed/failed jobs are preserved (the user can still
    // see the result). v1.23.0 Phase 5.1.5 stage 3.
    const cancelAllBtn = actions.createEl('button', {
      text: getText(this.settings.language, 'cancelAllQueueJobs'),
      cls: 'llm-wiki-multi-file-cancel-all',
    });
    cancelAllBtn.addEventListener('click', () => {
      // Snapshot first — remove() mutates the underlying array.
      const jobs = this.ingestQueue.getSnapshot();
      for (const job of jobs) {
        if (job.status === 'pending' || job.status === 'running') {
          this.ingestQueue.remove(job.id);
        }
      }
    });
    this.confirmBtn = actions.createEl('button', {
      text: getText(this.settings.language, 'multiFileAddToQueue'),
      cls: 'mod-cta',
    });
    this.confirmBtn.addEventListener('click', () => {
      // Collect every checked file and enqueue them. enqueue is
      // idempotent against in-flight jobs, so re-clicking the
      // button is harmless.
      const checkedFiles = this.collectCheckedFiles();
      if (checkedFiles.length === 0) return;
      const newIds = this.ingestQueue.enqueue(checkedFiles);
      if (newIds.length > 0 && this.onStartIngest) {
        // Pass both the newly-issued ids and the corresponding
        // files. The worker uses the ids to publish start/
        // complete transitions on each job — without ids, it
        // would have no way to update the queue (enqueue is
        // idempotent and the second call would return no ids).
        this.onStartIngest(newIds, checkedFiles);
      }
      // The modal stays open — the user can watch the right pane
      // for live progress, or close it (the ingest continues in
      // the background).
    });

    // Build the left pane once. Subsequent changes to the queue
    // are reflected by updateLeftPaneSelections() in place.
    this.buildLeftPane();
    // Subscribe AFTER the initial build so we don't double-render
    // on the first notify.
    this.unsubscribeQueue = this.ingestQueue.subscribe(() => {
      this.renderRightPane();
      this.updateLeftPaneSelections();
      this.updateCounter();
    });
    this.renderRightPane();
    this.updateCounter();
  }

  onClose(): void {
    this.contentEl.empty();
    // Remove the outer modal class on close so the next modal opened
    // on the same `modalEl` doesn't accidentally inherit our width.
    // Same lifecycle pattern as SchemaDiffModal (v1.22.0 #97).
    this.modalEl.removeClass('llm-wiki-multi-file-modal');
    // Detach the queue listener. Without this, a re-opened modal
    // would fire its renderRightPane on a DOM that no longer
    // exists in the visible modal.
    if (this.unsubscribeQueue) {
      this.unsubscribeQueue();
      this.unsubscribeQueue = null;
    }
  }

  private buildLeftPane(): void {
    this.leftEl.empty();
    const q = this.searchInput?.value?.trim().toLowerCase() ?? '';

    if (this.treeRoots.length === 0) {
      this.leftEl.createEl('p', {
        text: getText(this.settings.language, 'multiFileNoFilesAvailable'),
        cls: 'llm-wiki-multi-file-empty',
      });
      return;
    }

    // If the search filter excludes every file, show a single empty
    // placeholder (matches the old behavior).
    const anyVisible = this.treeRoots.some(root => this.nodeOrDescendantMatches(root, q));
    if (!anyVisible) {
      this.leftEl.createEl('p', {
        text: q
          ? getText(this.settings.language, 'multiFileNoFilesMatch', { q })
          : getText(this.settings.language, 'multiFileNoFilesAvailable'),
        cls: 'llm-wiki-multi-file-empty',
      });
      return;
    }

    // Recursively walk the tree. Each TreeNode renders as a
    // <details>/<summary> with its own "select all" (covers direct
    // children only — no recursion into subfolders, by design so a
    // "Select all" on year doesn't silently include every month).
    for (const root of this.treeRoots) {
      this.renderTreeNode(root, this.leftEl, q, /* depth */ 0);
    }
    // Sync checkbox state with the queue snapshot. The DOM was
    // rebuilt above with default unchecked state — this turns on
    // the checkboxes for files that are already pending/running/
    // completed. Called on every build (initial onOpen AND search
    // input change) so the visual stays consistent with the
    // store regardless of how the modal was last left.
    this.updateLeftPaneSelections();
  }

  /**
   * Recursively render a TreeNode as a <details> block, with its
   * direct-child files and subfolders underneath.
   *
   * The synthetic root (`path === ''`) is rendered WITHOUT its own
   * <details> wrapper — its children are rendered as direct
   * top-level entries. This avoids a "faux root" toggle that
   * confuses users (no Obsidian file explorer has a "vault root"
   * wrapper).
   */
  private renderTreeNode(
    node: TreeNode,
    container: HTMLElement,
    q: string,
    depth: number,
  ): void {
    const visibleFiles = q
      ? node.files.filter(f => f.path.toLowerCase().includes(q))
      : node.files;
    const visibleChildren = q
      ? node.children.filter(c => this.nodeOrDescendantMatches(c, q))
      : node.children;

    // The synthetic root has no real TFolder, so skip the <details>
    // wrapper for it. Just emit its children.
    if (node.path === '') {
      // Render the root's direct files inline (rare — only when
      // some file has chain.length === 0).
      for (const file of visibleFiles) {
        this.renderFileRow(file, container);
      }
      for (const child of visibleChildren) {
        this.renderTreeNode(child, container, q, depth);
      }
      return;
    }

    const details = container.createEl('details', { cls: 'llm-wiki-multi-file-folder llm-wiki-multi-file-depth-' + depth });
    // Auto-expand on search, but only at depth 0-1. Deeper nodes
    // stay collapsed so the user can scan the matches.
    if (q && depth <= 1) details.setAttr('open', '');

    const summary = details.createEl('summary', { cls: 'llm-wiki-multi-file-folder-header' });
    // Show the LAST path segment as the folder name (matches
    // Obsidian's file explorer — full path is already implied by
    // the nesting depth). The full path lives on `data-path` for
    // debugging / future features.
    const folderLabel = node.path.split('/').pop() ?? node.path;
    summary.createEl('span', { text: folderLabel, cls: 'llm-wiki-multi-file-folder-name' });
    summary.setAttribute('data-path', node.path);
    summary.createEl('span', {
      text: getText(this.settings.language, 'multiFileFileCount', { count: String(visibleFiles.length) }),
      cls: 'llm-wiki-multi-file-folder-count',
    });
    // Inline "Select all" — ticks every visible checkbox in this
    // folder (direct children only). Does NOT enqueue — that
    // happens when the user clicks "Add to queue". The two-step
    // flow (mark → commit) keeps the ingest start under explicit
    // user control.
    const selectAllBtn = summary.createEl('button', {
      text: getText(this.settings.language, 'multiFileSelectAll'),
      cls: 'llm-wiki-multi-file-folder-bulk',
    });
    selectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Tick every checkbox in THIS folder's direct file list.
      // The `:scope >` selector restricts to direct children of
      // the current <details> node so nested subfolders are NOT
      // affected — each subfolder has its own "Select all".
      const parent = summary.parentElement;
      if (!parent) return;
      const checkboxes = parent.querySelectorAll<HTMLInputElement>(
        ':scope > .llm-wiki-multi-file-folder-list input[type="checkbox"][data-file-path]'
      );
      checkboxes.forEach(cb => { cb.checked = true; });
    });

    // Direct-child files
    if (visibleFiles.length > 0) {
      const list = details.createEl('div', { cls: 'llm-wiki-multi-file-folder-list' });
      for (const file of visibleFiles) {
        this.renderFileRow(file, list);
      }
    }

    // Recurse into subfolders. Each child renders its own
    // <details> with its own "Select all".
    for (const child of visibleChildren) {
      this.renderTreeNode(child, details, q, depth + 1);
    }
  }

  /**
   * Render a single file row. The checkbox carries a data attribute
   * so `updateLeftPaneSelections` can find it without re-walking
   * the tree structure.
   */
  private renderFileRow(file: TFile, container: HTMLElement): void {
    const row = container.createDiv({ cls: 'llm-wiki-multi-file-row' });
    const checkbox = row.createEl('input', { type: 'checkbox' });
    checkbox.dataset.filePath = file.path;
    // v1.23.0 Phase 5.1.5 stage 4: ticking a checkbox does NOT
    // enqueue. The user has to explicitly click "Add to queue" to
    // commit the selection. This matches the v1 git-style
    // two-step flow (mark → commit) and prevents the modal from
    // firing ingest on every click — which previously made the
    // "Add to queue" button a no-op (everything was already in
    // flight by the time the user found it).
    //
    // The checkbox state is purely a UI marker. The queue only
    // changes when "Add to queue" fires enqueue() (or when the
    // queue changes externally, e.g. the background worker
    // completes a job — handled by updateLeftPaneSelections).
    const basename = file.path.split('/').pop() ?? file.path;
    row.createEl('span', { text: basename, cls: 'llm-wiki-multi-file-basename' });
    // Whole row toggles the checkbox (skip the checkbox itself).
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
      }
    });
  }

  /**
   * Update every checkbox in the left pane to reflect the current
   * queue snapshot. Walks the live DOM via a single
   * `querySelectorAll` and toggles `checked` + `disabled` based on
   * the queue.
   *
   * Why we don't re-render the whole tree: rebuilding the tree
   * would close every <details> the user had expanded, which was
   * the v1 UX bug. In-place updates preserve the user's tree
   * state.
   *
   * Performance: O(N) in the number of file rows (~thousands max).
   * Acceptable — this fires on every queue mutation.
   */
  private updateLeftPaneSelections(): void {
    const queue = this.ingestQueue.getSnapshot();
    const inQueuePaths = new Set(
      queue
        .filter(j => j.status === 'pending' || j.status === 'running' || j.status === 'completed')
        .map(j => j.file.path)
    );
    const completedPaths = new Set(
      queue.filter(j => j.status === 'completed').map(j => j.file.path)
    );
    const rows = this.leftEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-file-path]');
    rows.forEach(checkbox => {
      const path = checkbox.dataset.filePath;
      if (!path) return;
      const isQueued = inQueuePaths.has(path);
      const isCompleted = completedPaths.has(path);
      checkbox.checked = isQueued;
      // Grey out completed rows: the user shouldn't be able to
      // re-toggle them; the in-batch dedup would also drop the
      // add but the user feedback ("I checked it but it didn't
      // add") would be confusing. The visual 'Ingested' tag is
      // the cue.
      checkbox.disabled = isCompleted;
      const row = checkbox.closest<HTMLElement>('.llm-wiki-multi-file-row');
      if (row) {
        row.classList.toggle('llm-wiki-multi-file-row-ingested', isCompleted);
      }
    });
  }

  /**
   * True if this node has any file matching `q`, OR any descendant
   * subtree does. Used to filter the rendered tree when a search
   * is active.
   */
  private nodeOrDescendantMatches(
    node: TreeNode,
    q: string,
  ): boolean {
    if (!q) return true;
    if (node.files.some(f => f.path.toLowerCase().includes(q))) return true;
    return node.children.some(c => this.nodeOrDescendantMatches(c, q));
  }

  // ── Right pane: live queue snapshot ─────────────────────────

  /**
   * Render the right pane from the current queue snapshot. Fires
   * on every queue mutation (via the subscription set up in
   * onOpen). The simple "list of paths + status" rendering here
   * is intentionally minimal — v1.23.0 Phase 5.1.5 stage 3 will
   * add per-row status icons + cancel buttons.
   */
  private renderRightPane(): void {
    this.rightEl.empty();
    const jobs = this.ingestQueue.getSnapshot();
    if (jobs.length === 0) {
      this.rightEl.createEl('p', {
        text: getText(this.settings.language, 'multiFileQueueEmpty'),
        cls: 'llm-wiki-multi-file-empty',
      });
      return;
    }
    for (const job of jobs) {
      const row = this.rightEl.createDiv({
        cls: `llm-wiki-multi-file-row llm-wiki-multi-file-row-${job.status}`,
      });
      // Status icon as a leading marker. The text is the user's
      // language (no i18n here — these are single-glyph markers
      // the same in every locale).
      const statusIcon =
        job.status === 'pending' ? '🟡' :
        job.status === 'running' ? '🔵' :
        job.status === 'completed' ? '✅' :
        '❌';
      row.createEl('span', { text: statusIcon, cls: 'llm-wiki-multi-file-status-icon' });
      const basename = job.file.path.split('/').pop() ?? job.file.path;
      row.createEl('span', { text: basename, cls: 'llm-wiki-multi-file-basename' });
      // Status text is i18n'd. The internal `job.status` enum
      // string stays English (data attribute on the row's class is
      // used for CSS styling — `llm-wiki-multi-file-row-pending`
      // etc.) so we keep the enum string in the class but use the
      // localized label for display.
      const statusTextKey =
        job.status === 'pending' ? 'multiFileStatusPending' :
        job.status === 'running' ? 'multiFileStatusRunning' :
        job.status === 'completed' ? 'multiFileStatusCompleted' :
        'multiFileStatusFailed';
      row.createEl('span', { text: getText(this.settings.language, statusTextKey), cls: 'llm-wiki-multi-file-status' });
      if (job.error) {
        row.createEl('span', { text: job.error, cls: 'llm-wiki-multi-file-error' });
      }
      // Per-row cancel button. Disabled for terminal-state jobs
      // (completed / failed) — remove() would drop the error
      // info on a failed job, and a completed job has nothing to
      // cancel. The visual signal is the icon next to the row.
      // Only pending and running are cancellable: pending just
      // removes from the queue; running fires the AbortController
      // so the worker can stop mid-flight.
      const cancelBtn = row.createEl('button', {
        text: '✕',
        cls: 'llm-wiki-multi-file-cancel',
        attr: { 'aria-label': getText(this.settings.language, 'multiFileCancelAria') },
      });
      const isCancellable = job.status === 'pending' || job.status === 'running';
      cancelBtn.disabled = !isCancellable;
      if (isCancellable) {
        cancelBtn.addEventListener('click', () => {
          this.ingestQueue.remove(job.id);
        });
      }
    }
  }

  /**
   * Update the bottom counter ("N pending · M done · K failed")
   * from the queue snapshot. Triggers on every queue mutation.
   */
  private updateCounter(): void {
    const jobs = this.ingestQueue.getSnapshot();
    const pending = jobs.filter(j => j.status === 'pending' || j.status === 'running').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    this.counterEl.setText(
      `${pending} pending · ${completed} done · ${failed} failed`
    );
  }

  // ── "Add to queue" button support ───────────────────────────

  /**
   * Collect every file whose left-pane checkbox is currently
   * checked. Used by the "Add to queue" button to translate DOM
   * state into file references. Walks the treeRoots list (not the
   * DOM) for the TFile references.
   */
  private collectCheckedFiles(): TFile[] {
    const result: TFile[] = [];
    const checkboxes = this.leftEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-file-path]');
    checkboxes.forEach(cb => {
      if (!cb.checked) return;
      const path = cb.dataset.filePath;
      if (!path) return;
      const file = this.findFileByPath(path);
      if (file) result.push(file);
    });
    return result;
  }

  private findFileByPath(path: string): TFile | null {
    for (const root of this.treeRoots) {
      const found = this.findFileInNode(root, path);
      if (found) return found;
    }
    return null;
  }

  private findFileInNode(
    node: TreeNode,
    path: string,
  ): TFile | null {
    for (const f of node.files) if (f.path === path) return f;
    for (const c of node.children) {
      const found = this.findFileInNode(c, path);
      if (found) return found;
    }
    return null;
  }
}