// Reusable UI modals for the LLM Wiki Plugin

import { App, TFile, TFolder, Modal, FuzzySuggestModal, MarkdownRenderer, Component } from 'obsidian';
import { IngestReport } from '../types';
import { TEXTS } from '../texts';

export class FileSuggestModal extends FuzzySuggestModal<TFile> {
  onSelect: (file: TFile) => void;

  constructor(app: App, onSelect: (file: TFile) => void) {
    super(app);
    this.onSelect = onSelect;
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles()
      .filter(f => !f.path.startsWith('wiki') && !f.path.startsWith(this.app.vault.configDir));
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

  constructor(app: App, onSelect: (folder: TFolder) => void) {
    super(app);
    this.onSelect = onSelect;
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const root = this.app.vault.getRoot();

    const collect = (folder: TFolder) => {
      if (!folder.path.startsWith(this.app.vault.configDir) && !folder.path.startsWith('wiki')) {
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
  onFixDeadLinks?: () => void;
  onFillEmptyPages?: () => void;
  onLinkOrphans?: () => void;
  onAnalyzeSchema?: () => void;
}

export interface LintCounts {
  deadLinks: number;
  emptyPages: number;
  orphans: number;
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

    // Action buttons
    const actionSection = contentEl.createDiv({
      attr: { style: 'margin-top: 16px; border-top: 1px solid var(--background-modifier-border); padding-top: 12px;' }
    });

    actionSection.createEl('p', {
      text: t.lintModalActionsTitle,
      attr: { style: 'font-weight: bold; margin-bottom: 8px;' }
    });

    const buttonRow = actionSection.createDiv({
      attr: { style: 'display: flex; flex-wrap: wrap; gap: 8px;' }
    });

    if (this.counts.deadLinks > 0 && this.fixCallbacks.onFixDeadLinks) {
      buttonRow.createEl('button', {
        text: t.lintModalFixDeadLinks.replace('{count}', String(this.counts.deadLinks)),
        cls: 'mod-cta'
      }).addEventListener('click', () => {
        this.fixCallbacks.onFixDeadLinks?.();
        this.close();
      });
    }

    if (this.counts.emptyPages > 0 && this.fixCallbacks.onFillEmptyPages) {
      buttonRow.createEl('button', {
        text: t.lintModalExpandEmpty.replace('{count}', String(this.counts.emptyPages)),
        cls: 'mod-cta'
      }).addEventListener('click', () => {
        this.fixCallbacks.onFillEmptyPages?.();
        this.close();
      });
    }

    if (this.counts.orphans > 0 && this.fixCallbacks.onLinkOrphans) {
      buttonRow.createEl('button', {
        text: t.lintModalLinkOrphans.replace('{count}', String(this.counts.orphans)),
        cls: 'mod-cta'
      }).addEventListener('click', () => {
        this.fixCallbacks.onLinkOrphans?.();
        this.close();
      });
    }

    if (this.fixCallbacks.onAnalyzeSchema) {
      buttonRow.createEl('button', {
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
    return (texts as Record<string, string>)[key] || TEXTS.en[key as keyof typeof TEXTS.en] || key;
  }

  onOpen() {
    const { sourceFile, createdPages, updatedPages, entitiesCreated, conceptsCreated, failedItems, contradictionsFound, success, errorMessage, elapsedSeconds } = this.report;

    const statusEmoji = success ? '✅' : '⚠️';
    this.contentEl.createEl('h2', { text: `${statusEmoji} ${this.t('ingestReportTitle')}` });

    // Source file
    this.contentEl.createEl('p', { text: `${this.t('ingestReportSourceFile')}：${sourceFile}` });

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
