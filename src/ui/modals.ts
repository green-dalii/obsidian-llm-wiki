// Reusable UI modals for the LLM Wiki Plugin

import { App, TFile, TFolder, Modal, FuzzySuggestModal, MarkdownRenderer, Component } from 'obsidian';
import { IngestReport } from '../types';
import { TEXTS } from '../texts';

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
  onLinkOrphans?: () => void;
  onAnalyzeSchema?: () => void;
  onMergeDuplicates?: () => void;
  onFixAll?: () => void;
}

export interface LintCounts {
  deadLinks: number;
  emptyPages: number;
  orphans: number;
  duplicates: number;
  pagesMissingAliases: number;
}

export class LintReportModal extends Modal {
  report: string;
  fixCallbacks: LintFixCallbacks;
  counts: LintCounts;
  private language: 'en' | 'zh';
  private renderComponent: Component | null = null;

  constructor(app: App, report: string, fixCallbacks: LintFixCallbacks, counts: LintCounts, language: 'en' | 'zh' = 'en') {
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

    const t = TEXTS[this.language];

    const reportDiv = contentEl.createDiv({
      attr: { style: 'max-height: 50vh; overflow-y: auto; padding: 8px 0;' }
    });
    void MarkdownRenderer.render(this.app, this.report, reportDiv, '', this.renderComponent);

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

    // === Layer 2: Causality-ordered fix buttons (duplicates → dead links → orphans → empty pages) ===
    const fixableItems = [
      { count: this.counts.duplicates, cb: this.fixCallbacks.onMergeDuplicates, text: t.lintModalMergeDuplicates },
      { count: this.counts.deadLinks, cb: this.fixCallbacks.onFixDeadLinks, text: t.lintModalFixDeadLinks },
      { count: this.counts.orphans, cb: this.fixCallbacks.onLinkOrphans, text: t.lintModalLinkOrphans },
      { count: this.counts.emptyPages, cb: this.fixCallbacks.onFillEmptyPages, text: t.lintModalExpandEmpty },
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
  private language: 'en' | 'zh';

  constructor(app: App, report: IngestReport, language: 'en' | 'zh' = 'en') {
    super(app);
    this.report = report;
    this.language = language;
  }

  private t(key: string): string {
    const texts = TEXTS[this.language];
    return (texts as unknown as Record<string, string>)[key] || (TEXTS.en as unknown as Record<string, string>)[key] || key;
  }

  onOpen() {
    const { sourceFile, createdPages, updatedPages, entitiesCreated, conceptsCreated, failedItems, contradictionsFound, success, errorMessage, elapsedSeconds, skippedFiles, totalFilesInFolder } = this.report;

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
