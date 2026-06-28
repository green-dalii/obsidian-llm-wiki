// Reusable UI modals for the LLM Wiki Plugin

import { App, TFile, TFolder, Modal, FuzzySuggestModal, MarkdownRenderer, Component } from 'obsidian';
import { IngestReport } from '../types';
import { TEXTS } from '../texts';
import { getText } from '../core/i18n';
import { buildFolderTree } from '../core/build-folder-tree';
import type { RejectionReason } from '../core/source-requirements';

export class FileSuggestModal extends FuzzySuggestModal<TFile> {
  onSelect: (file: TFile) => void;
  private wikiFolder: string;

  constructor(app: App, wikiFolder: string, onSelect: (file: TFile) => void) {
    super(app);
    this.wikiFolder = wikiFolder;
    this.onSelect = onSelect;
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles()
      .filter(f => !f.path.startsWith(this.wikiFolder) && !f.path.startsWith(this.app.vault.configDir));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onSelect(file);
  }
}

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  onSelect: (folder: TFolder) => void;
  private wikiFolder: string;

  constructor(app: App, wikiFolder: string, onSelect: (folder: TFolder) => void) {
    super(app);
    this.wikiFolder = wikiFolder;
    this.onSelect = onSelect;
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const root = this.app.vault.getRoot();

    const collect = (folder: TFolder) => {
      if (!folder.path.startsWith(this.app.vault.configDir) && !folder.path.startsWith(this.wikiFolder)) {
        folders.push(folder);
      }
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          collect(child);
        }
      }
    };
    collect(root);
    return folders;
  }

  getItemText(folder: TFolder): string {
    return folder.path;
  }

  onChooseItem(folder: TFolder): void {
    this.onSelect(folder);
  }
}

export interface LintFixCallbacks {
  onCompleteAliases?: () => void;
  onFixDeadLinks?: () => void;
  onFillEmptyPages?: () => void;
  onDeleteEmptyStubs?: () => void;
  onLinkOrphans?: () => void;
  onAnalyzeSchema?: () => void;
  onMergeDuplicates?: () => void;
  onFixAll?: () => void;
  onFixPollutedPages?: () => void;
  // Issue #85 v7: LLM-assisted retag of pages with out-of-vocabulary tags
  onRetagViolations?: () => void;
}

export interface LintCounts {
  deadLinks: number;
  emptyPages: number;
  orphans: number;
  duplicates: number;
  pagesMissingAliases: number;
  pollutedPages: number;
  // Issue #85 v7: out-of-vocabulary tag count
  tagViolations: number;
  // Issue #126: quotes not found in source files
  ungroundedQuotes: number;
}

export class LintReportModal extends Modal {
  report: string;
  fixCallbacks: LintFixCallbacks;
  counts: LintCounts;
  private language: string;
  private renderComponent: Component | null = null;

  constructor(app: App, report: string, fixCallbacks: LintFixCallbacks, counts: LintCounts, language: string = 'en') {
    super(app);
    this.report = report;
    this.fixCallbacks = fixCallbacks;
    this.counts = counts;
    this.language = language;
  }

  onOpen() {
    const { contentEl } = this;
    this.renderComponent = new Component();
    this.renderComponent.load();

    const t = TEXTS[this.language as keyof typeof TEXTS] || TEXTS.en;

    const reportDiv = contentEl.createDiv({
      attr: { style: 'max-height: 50vh; overflow-y: auto; padding: 8px 0;' }
    });
    void MarkdownRenderer.render(this.app, this.report, reportDiv, '', this.renderComponent);

    // Reference to persisted log entry
    if (t.lintLogReference) {
      contentEl.createEl('p', {
        text: `📋 ${t.lintLogReference}`,
        attr: { style: 'font-size: 0.85em; color: var(--text-muted); margin: 4px 0 0 0;' }
      });
    }

    // Action buttons — organized by operation logic
    // Layer 1: Pre-flight operations (improve detection quality)
    // Layer 2: Root cause fixes → downstream fixes (causality order)
    // Layer 3: Smart all-in-one
    // Layer 4: Analysis

    const actionSection = contentEl.createDiv({
      attr: { style: 'margin-top: 16px; border-top: 1px solid var(--background-modifier-border); padding-top: 12px;' }
    });

    actionSection.createEl('p', {
      text: t.lintModalActionsTitle,
      attr: { style: 'font-weight: bold; margin-bottom: 10px;' }
    });

    // === Layer 1: Alias completion (pre-flight, shown only when needed) ===
    if (this.counts.pagesMissingAliases > 0 && this.fixCallbacks.onCompleteAliases) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintAliasesCompleteBtn.replace('{count}', String(this.counts.pagesMissingAliases)),
        cls: 'mod-cta',
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onCompleteAliases?.();
        this.close();
      });
    }

    // === Layer 1.5: Issue #85 v7 — Tag violation retag (LLM bulk) ===
    if (this.counts.tagViolations > 0 && this.fixCallbacks.onRetagViolations) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintTagViolationRetagBtn.replace('{count}', String(this.counts.tagViolations)),
        cls: 'mod-cta',
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onRetagViolations?.();
        this.close();
      });
    }

    // === Layer 1b: Polluted page fix (structural root cause) ===
    if (this.counts.pollutedPages > 0 && this.fixCallbacks.onFixPollutedPages) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintModalFixPolluted.replace('{count}', String(this.counts.pollutedPages)),
        cls: 'mod-cta',
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onFixPollutedPages?.();
        this.close();
      });
    }

    // === Layer 2: Causality-ordered fix buttons (duplicates → dead links → orphans → empty pages) ===
    const fixableItems = [
      { count: this.counts.duplicates, cb: this.fixCallbacks.onMergeDuplicates, text: t.lintModalMergeDuplicates },
      { count: this.counts.deadLinks, cb: this.fixCallbacks.onFixDeadLinks, text: t.lintModalFixDeadLinks },
      { count: this.counts.orphans, cb: this.fixCallbacks.onLinkOrphans, text: t.lintModalLinkOrphans },
      { count: this.counts.emptyPages, cb: this.fixCallbacks.onFillEmptyPages, text: t.lintModalExpandEmpty },
      { count: this.counts.emptyPages, cb: this.fixCallbacks.onDeleteEmptyStubs, text: t.lintModalDeleteEmpty },
    ].filter(item => item.count > 0 && item.cb);

    if (fixableItems.length > 0) {
      const fixRow = actionSection.createDiv({
        attr: { style: 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;' }
      });
      for (const item of fixableItems) {
        const btn = fixRow.createEl('button', {
          text: item.text.replace('{count}', String(item.count)),
          cls: 'mod-cta'
        });
        btn.addEventListener('click', () => {
          item.cb?.();
          this.close();
        });
      }
    }

    // === Layer 3: Smart Fix All (batched all-in-one) ===
    const totalFixable = this.counts.deadLinks + this.counts.emptyPages + this.counts.orphans + this.counts.duplicates + this.counts.pagesMissingAliases;
    if (totalFixable > 0 && this.fixCallbacks.onFixAll) {
      const row = actionSection.createDiv({ attr: { style: 'margin-bottom: 10px;' } });
      const btn = row.createEl('button', {
        text: t.lintModalFixAll.replace('{count}', String(totalFixable)),
        attr: { style: 'font-weight: bold;' }
      });
      btn.addEventListener('click', () => {
        this.fixCallbacks.onFixAll?.();
        this.close();
      });
    }

    // === Layer 4: Schema analysis (independent) ===
    if (this.fixCallbacks.onAnalyzeSchema) {
      const row = actionSection.createDiv({ attr: { style: 'margin-top: 8px;' } });
      row.createEl('button', {
        text: t.lintModalAnalyzeSchema,
      }).addEventListener('click', () => {
        this.fixCallbacks.onAnalyzeSchema?.();
        this.close();
      });
    }
  }

  onClose() {
    this.renderComponent?.unload();
    this.contentEl.empty();
  }
}

export class IngestReportModal extends Modal {
  private report: IngestReport;
  private language: string;

  constructor(app: App, report: IngestReport, language: string = 'en') {
    super(app);
    this.report = report;
    this.language = language;
  }

  private t(key: string): string {
    return getText(this.language, key as keyof typeof TEXTS.en) || key;
  }

  /** Map a gate rejection reason to its short localized label key. Mirrors WikiEngine.rejectionNoticeKey. */
  private reasonLabelKey(reason: RejectionReason): string {
    if (reason === 'incompatible-type') return 'rejectionReasonType';
    if (reason === 'duplicate') return 'rejectionReasonDuplicate';
    return 'rejectionReasonEmpty';
  }

  onOpen() {
    const { sourceFile, createdPages, updatedPages, entitiesCreated, conceptsCreated, failedItems, contradictionsFound, success, errorMessage, collisions, elapsedSeconds, skippedFiles, totalFilesInFolder, rejectedFiles } = this.report;

    const statusEmoji = success ? '✅' : '⚠️';
    this.contentEl.createEl('h2', { text: `${statusEmoji} ${this.t('ingestReportTitle')}` });

    // Source file
    this.contentEl.createEl('p', { text: `${this.t('ingestReportSourceFile')}：${sourceFile}` });

    // Skipped files (batch ingest only)
    if (skippedFiles !== undefined && skippedFiles > 0) {
      this.contentEl.createEl('p', {
        text: `${this.t('ingestReportSkippedFiles')}: ${skippedFiles}/${totalFilesInFolder || skippedFiles}`,
        attr: { style: 'color: var(--text-muted); font-size: 13px;' }
      });
    }

    // Elapsed time
    if (elapsedSeconds !== undefined) {
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const timeStr = minutes > 0
        ? `${minutes} ${this.t('timeMinutes')} ${seconds} ${this.t('timeSeconds')}`
        : `${seconds} ${this.t('timeSeconds')}`;
      this.contentEl.createEl('p', { text: `${this.t('ingestReportElapsedTime')}：${timeStr}` });
    }

    // Stats
    const statsEl = this.contentEl.createDiv({ attr: { style: 'margin: 12px 0;' } });
    const createdText = this.t('ingestReportCreatedPages').replace('{count}', String(createdPages.length));
    const breakdown = entitiesCreated > 0 || conceptsCreated > 0
      ? ` (${this.t('ingestReportEntitiesCount').replace('{count}', String(entitiesCreated))} + ${this.t('ingestReportConceptsCount').replace('{count}', String(conceptsCreated))})`
      : '';
    statsEl.createEl('p', { text: createdText + breakdown });
    statsEl.createEl('p', { text: this.t('ingestReportUpdatedPages').replace('{count}', String(updatedPages.length)) });
    if (contradictionsFound > 0) {
      statsEl.createEl('p', { text: this.t('ingestReportContradictionsFound').replace('{count}', String(contradictionsFound)) });
    }

    // Collisions
    if (collisions && collisions.length > 0) {
      this.contentEl.createEl('h3', { text: '🔀 ' + this.t('ingestReportCollisions') + ` (${collisions.length})` });
      const list = this.contentEl.createEl('ul');
      for (const c of collisions) {
        const sourceTypeLabel = c.sourceType === 'entity' ? this.t('ingestReportEntityType') : this.t('ingestReportConceptType');
        const targetTypeLabel = c.targetType === 'entity' ? this.t('ingestReportEntityType') : this.t('ingestReportConceptType');
        list.createEl('li', { text: `"${c.name}" (${sourceTypeLabel}) → ${targetTypeLabel}` });
      }
    }

    // Created pages
    if (createdPages.length > 0) {
      this.contentEl.createEl('h3', { text: this.t('ingestReportCreated') });
      const list = this.contentEl.createEl('ul');
      for (const page of createdPages) {
        list.createEl('li', { text: page });
      }
    }

    // Updated pages
    if (updatedPages.length > 0) {
      this.contentEl.createEl('h3', { text: this.t('ingestReportUpdated') });
      const list = this.contentEl.createEl('ul');
      for (const page of updatedPages) {
        list.createEl('li', { text: page });
      }
    }

    // Failed items
    if (failedItems.length > 0) {
      this.contentEl.createEl('h3', { text: '⚠️ ' + this.t('ingestReportFailedTitle') });
      const list = this.contentEl.createEl('ul');
      for (const item of failedItems) {
        const typeLabel = item.type === 'entity' ? this.t('ingestReportEntityType') : this.t('ingestReportConceptType');
        list.createEl('li', { text: `[${typeLabel}] ${item.name} — ${item.reason}` });
      }
      this.contentEl.createEl('p', {
        text: this.t('ingestReportFailedGuidance'),
        attr: { style: 'color: var(--text-muted); margin-top: 8px; font-size: 13px;' }
      });
    }

    // Rejected / skipped files (requirements gate, #164)
    if (rejectedFiles && rejectedFiles.length > 0) {
      this.contentEl.createEl('h3', { text: '⏭️ ' + this.t('ingestReportRejectedFiles') + ` (${rejectedFiles.length})` });
      const list = this.contentEl.createEl('ul');
      for (const r of rejectedFiles) {
        const name = r.path.split('/').pop() || r.path;
        list.createEl('li', { text: `${name} — ${this.t(this.reasonLabelKey(r.reason))}` });
      }
    }

    // Error
    if (errorMessage) {
      this.contentEl.createEl('p', {
        text: `${this.t('ingestReportErrorDetail')}：${errorMessage}`,
        attr: { style: 'color: var(--text-error); margin-top: 12px;' }
      });
    }

    // Close button
    const btnRow = this.contentEl.createDiv({ attr: { style: 'margin-top: 16px; text-align: right;' } });
    btnRow.createEl('button', { text: this.t('ingestReportClose') }).addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}

/**
 * Small reusable yes/no confirmation modal (#164). `onChoice` fires exactly once:
 * true on confirm, false on cancel / Escape / dismiss.
 */
export class ConfirmModal extends Modal {
  private decided = false;

  constructor(
    app: App,
    private opts: { title: string; body: string; confirmText: string; cancelText: string; onChoice: (confirmed: boolean) => void }
  ) {
    super(app);
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: this.opts.title });
    this.contentEl.createEl('p', { text: this.opts.body });
    const btnRow = this.contentEl.createDiv({ attr: { style: 'margin-top: 16px; text-align: right;' } });
    btnRow.createEl('button', { text: this.opts.cancelText })
      .addEventListener('click', () => this.decide(false));
    btnRow.createEl('button', { text: this.opts.confirmText, cls: 'mod-cta', attr: { style: 'margin-left: 8px;' } })
      .addEventListener('click', () => this.decide(true));
  }

  private decide(confirmed: boolean) {
    this.decided = true;
    this.opts.onChoice(confirmed);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    // Escape / X / click-outside → treat as cancel, exactly once.
    if (!this.decided) {
      this.decided = true;
      this.opts.onChoice(false);
    }
  }
}

export interface FixReportPhase {
  label: string;
  detail: string;
}

export class FixReportModal extends Modal {
  private phases: FixReportPhase[];
  private language: string;

  constructor(app: App, phases: FixReportPhase[], language: string) {
    super(app);
    this.phases = phases;
    this.language = language;
  }

  onOpen() {
    const tk = (k: string) => getText(this.language, k as keyof typeof TEXTS.en) || k;
    const titleText = tk('lintFixAllComplete');

    this.contentEl.createEl('h2', { text: titleText });

    const list = this.contentEl.createEl('ul', {
      attr: { style: 'margin: 12px 0; line-height: 1.8;' }
    });
    for (const phase of this.phases) {
      const itemText = phase.detail
        ? `${phase.label}: ${phase.detail}`
        : phase.label;
      list.createEl('li', { text: itemText });
    }

    const indexNote = tk('lintFixIndexUpdated');
    if (indexNote) {
      this.contentEl.createEl('p', {
        text: indexNote,
        attr: { style: 'color: var(--text-muted); font-size: 13px; margin-top: 8px;' }
      });
    }

    const btnRow = this.contentEl.createDiv({ attr: { style: 'margin-top: 16px; text-align: right;' } });
    const closeText = tk('ingestReportClose');
    btnRow.createEl('button', { text: closeText }).addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}

/**
 * MultiFileSuggestModal — v1.23.0 (#130)
 *
 * Two-pane file picker: left column lists all non-wiki markdown files
 * in the vault; right column shows the current selection queue. User
 * toggles files with a checkbox, then confirms with the "Start Ingest"
 * button at the bottom.
 *
 * Dedupe: adding the same file twice is a no-op (the second toggle
 * un-checks it).
 *
 * Clear: a "Clear Queue" button drops all pending entries.
 *
 * The selected files are NOT moved (the original #130 requirement —
 * in-place ingest avoids breaking the source-path provenance).
 */
export class MultiFileSuggestModal extends Modal {
  onConfirm: (files: TFile[]) => void;
  private wikiFolder: string;
  /**
   * Async check whether a file has already been ingested. Optional —
   * if not provided the modal shows files without an "ingested"
   * marker (no UX regression; the in-batch dedup is independent).
   */
  private isAlreadyIngested: ((file: TFile) => Promise<boolean>) | null;
  /** Selected files, deduplicated. Order is the order the user clicked. */
  private selected: TFile[] = [];
  private available: TFile[] = [];
  /** Files the user has already ingested (memoized result of the callback). */
  private alreadyIngestedSet: Set<string> = new Set();
  private leftEl!: HTMLElement;
  private rightEl!: HTMLElement;
  private counterEl!: HTMLElement;
  private confirmBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private searchInput!: HTMLInputElement;
  /**
   * Nested folder tree built once in onOpen from the available
   * TFiles. Single-element array containing the synthetic root, or
   * empty when no files are available. Recursive walk in
   * renderLeftPane produces the Obsidian-file-explorer-style
   * nested <details> UI. v1.23.0 fix (2026-06-28): the previous
   * flat Map<string, TFile[]> collapsed 3+ levels of nesting into a
   * single row.
   */
  private treeRoots: import('../core/build-folder-tree').TreeNode[] = [];

  constructor(
    app: App,
    wikiFolder: string,
    onConfirm: (files: TFile[]) => void,
    isAlreadyIngested?: (file: TFile) => Promise<boolean>,
  ) {
    super(app);
    this.wikiFolder = wikiFolder;
    this.onConfirm = onConfirm;
    this.isAlreadyIngested = isAlreadyIngested ?? null;
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

    // Initial: load all candidate files (non-wiki, non-configDir).
    this.available = this.app.vault.getMarkdownFiles()
      .filter(f => !f.path.startsWith(this.wikiFolder) && !f.path.startsWith(this.app.vault.configDir))
      .sort((a, b) => a.path.localeCompare(b.path));

    // Build a nested folder tree (single pass, sorted). Pure function
    // — see core/build-folder-tree.ts for the algorithm + tests.
    this.treeRoots = buildFolderTree(this.available);

    // Pre-compute the already-ingested set so the tree can show
    // "(ingested)" markers without round-tripping async per row.
    void this.computeIngestedSet();

    contentEl.createEl('h3', { text: 'Ingest multiple files' });
    contentEl.createEl('p', {
      text: 'Select source notes to ingest. They are processed in order; no files are moved.',
      cls: 'llm-wiki-modal-hint',
    });

    this.searchInput = contentEl.createEl('input', {
      type: 'text',
      placeholder: 'Filter files by path…',
      cls: 'llm-wiki-multi-file-search',
    });
    this.searchInput.addEventListener('input', () => this.renderLeftPane());

    const panes = contentEl.createDiv({ cls: 'llm-wiki-multi-file-panes' });
    this.leftEl = panes.createDiv({ cls: 'llm-wiki-multi-file-left' });
    this.rightEl = panes.createDiv({ cls: 'llm-wiki-multi-file-right' });

    const actions = contentEl.createDiv({ cls: 'llm-wiki-multi-file-actions' });
    this.counterEl = actions.createEl('span', { cls: 'llm-wiki-multi-file-count' });
    this.clearBtn = actions.createEl('button', { text: 'Clear queue' });
    this.clearBtn.addEventListener('click', () => {
      this.selected = [];
      this.renderLeftPane();
      this.renderRightPane();
    });
    this.confirmBtn = actions.createEl('button', { text: 'Start ingest', cls: 'mod-cta' });
    this.confirmBtn.addEventListener('click', () => {
      const files = [...this.selected];
      this.close();
      this.onConfirm(files);
    });

    this.renderLeftPane();
    this.renderRightPane();
  }

  private async computeIngestedSet(): Promise<void> {
    if (!this.isAlreadyIngested) return;
    const checks = await Promise.all(
      this.available.map(async f => ({ path: f.path, ok: await this.isAlreadyIngested!(f) })),
    );
    for (const c of checks) {
      if (c.ok) this.alreadyIngestedSet.add(c.path);
    }
    // Re-render to flip the markers from "(checking…)" to "(ingested)".
    this.renderLeftPane();
  }

  onClose(): void {
    this.contentEl.empty();
    // Remove the outer modal class on close so the next modal opened
    // on the same `modalEl` doesn't accidentally inherit our width.
    // Same lifecycle pattern as SchemaDiffModal (v1.22.0 #97).
    this.modalEl.removeClass('llm-wiki-multi-file-modal');
  }

  private isSelected(file: TFile): boolean {
    return this.selected.some(f => f.path === file.path);
  }

  private isIngested(file: TFile): boolean {
    return this.alreadyIngestedSet.has(file.path);
  }

  private toggle(file: TFile): void {
    const idx = this.selected.findIndex(f => f.path === file.path);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
    } else {
      this.selected.push(file);
    }
    this.renderLeftPane();
    this.renderRightPane();
  }

  private renderLeftPane(): void {
    this.leftEl.empty();
    const q = this.searchInput?.value?.trim().toLowerCase() ?? '';

    if (this.treeRoots.length === 0) {
      this.leftEl.createEl('p', {
        text: 'No files available to ingest.',
        cls: 'llm-wiki-multi-file-empty',
      });
      return;
    }

    // If the search filter excludes every file, show a single empty
    // placeholder (matches the old behavior).
    const anyVisible = this.treeRoots.some(root => this.nodeOrDescendantMatches(root, q));
    if (!anyVisible) {
      this.leftEl.createEl('p', {
        text: q ? `No files match "${q}".` : 'No files available to ingest.',
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
   *
   * @param node the TreeNode to render
   * @param container the parent DOM element
   * @param q current search query (lowercase); empty string = no filter
   * @param depth 0 = top-level. Used for CSS indent and for the
   *   "auto-expand on search" heuristic (only auto-expand at depth
   *   ≤ 1, not 4+ levels deep — that would be visually overwhelming).
   */
  private renderTreeNode(
    node: import('../core/build-folder-tree').TreeNode,
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
      text: `${visibleFiles.length} file(s)`,
      cls: 'llm-wiki-multi-file-folder-count',
    });
    // Inline "select all" — direct children only, not recursive
    // into subfolders. Each subfolder gets its own "select all"
    // when the user opens it.
    const selectAllBtn = summary.createEl('button', { text: 'Select all', cls: 'llm-wiki-multi-file-folder-bulk' });
    selectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      for (const f of visibleFiles) {
        if (!this.isIngested(f) && !this.isSelected(f)) {
          this.selected.push(f);
        }
      }
      this.renderLeftPane();
      this.renderRightPane();
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
   * Render a single file row. Pulled out so the synthetic root
   * and any folder can share the same DOM.
   */
  private renderFileRow(file: TFile, container: HTMLElement): void {
    const ingested = this.isIngested(file);
    const row = container.createDiv({
      cls: 'llm-wiki-multi-file-row' + (ingested ? ' llm-wiki-multi-file-row-ingested' : ''),
    });
    const checkbox = row.createEl('input', { type: 'checkbox' });
    checkbox.checked = this.isSelected(file);
    if (ingested) {
      checkbox.disabled = true;
    }
    checkbox.addEventListener('change', () => this.toggle(file));
    const basename = file.path.split('/').pop() ?? file.path;
    row.createEl('span', { text: basename, cls: 'llm-wiki-multi-file-basename' });
    if (ingested) {
      row.createEl('span', { text: 'Ingested', cls: 'llm-wiki-multi-file-ingested-tag' });
    }
    if (!ingested) {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          this.toggle(file);
        }
      });
    }
  }

  /**
   * True if this node has any file matching `q`, OR any descendant
   * subtree does. Used to filter the rendered tree when a search
   * is active.
   */
  private nodeOrDescendantMatches(
    node: import('../core/build-folder-tree').TreeNode,
    q: string,
  ): boolean {
    if (!q) return true;
    if (node.files.some(f => f.path.toLowerCase().includes(q))) return true;
    return node.children.some(c => this.nodeOrDescendantMatches(c, q));
  }

  private renderRightPane(): void {
    this.rightEl.empty();
    if (this.selected.length === 0) {
      this.rightEl.createEl('p', {
        text: 'No files selected.',
        cls: 'llm-wiki-multi-file-empty',
      });
    } else {
      for (const file of this.selected) {
        const row = this.rightEl.createDiv({ cls: 'llm-wiki-multi-file-row llm-wiki-multi-file-row-selected' });
        row.createEl('span', { text: file.path, cls: 'llm-wiki-multi-file-path' });
        const removeBtn = row.createEl('button', { text: '✕', cls: 'llm-wiki-multi-file-remove' });
        removeBtn.addEventListener('click', () => this.toggle(file));
      }
    }
    this.counterEl.setText(`${this.selected.length} file(s) selected`);
    this.confirmBtn.disabled = this.selected.length === 0;
  }
}
