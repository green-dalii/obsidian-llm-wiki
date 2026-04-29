// Reusable UI modals for the LLM Wiki Plugin

import { App, TFile, TFolder, Modal, FuzzySuggestModal, MarkdownRenderer, Component } from 'obsidian';
import { IngestReport } from './types';

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
  private renderComponent: Component | null = null;

  constructor(app: App, report: string, fixCallbacks: LintFixCallbacks, counts: LintCounts) {
    super(app);
    this.report = report;
    this.fixCallbacks = fixCallbacks;
    this.counts = counts;
  }

  onOpen() {
    const { contentEl } = this;
    this.renderComponent = new Component();
    this.renderComponent.load();

    const reportDiv = contentEl.createDiv({
      attr: { style: 'max-height: 50vh; overflow-y: auto; padding: 8px 0;' }
    });
    void MarkdownRenderer.render(this.app, this.report, reportDiv, '', this.renderComponent);

    // Action buttons
    const actionSection = contentEl.createDiv({
      attr: { style: 'margin-top: 16px; border-top: 1px solid var(--background-modifier-border); padding-top: 12px;' }
    });

    actionSection.createEl('p', {
      text: 'Actions (each calls AI):',
      attr: { style: 'font-weight: bold; margin-bottom: 8px;' }
    });

    const buttonRow = actionSection.createDiv({
      attr: { style: 'display: flex; flex-wrap: wrap; gap: 8px;' }
    });

    if (this.counts.deadLinks > 0 && this.fixCallbacks.onFixDeadLinks) {
      buttonRow.createEl('button', {
        text: `Fix Dead Links (${this.counts.deadLinks})`,
        cls: 'mod-cta'
      }).addEventListener('click', () => {
        this.fixCallbacks.onFixDeadLinks?.();
        this.close();
      });
    }

    if (this.counts.emptyPages > 0 && this.fixCallbacks.onFillEmptyPages) {
      buttonRow.createEl('button', {
        text: `Expand Empty Pages (${this.counts.emptyPages})`,
        cls: 'mod-cta'
      }).addEventListener('click', () => {
        this.fixCallbacks.onFillEmptyPages?.();
        this.close();
      });
    }

    if (this.counts.orphans > 0 && this.fixCallbacks.onLinkOrphans) {
      buttonRow.createEl('button', {
        text: `Link Orphan Pages (${this.counts.orphans})`,
        cls: 'mod-cta'
      }).addEventListener('click', () => {
        this.fixCallbacks.onLinkOrphans?.();
        this.close();
      });
    }

    if (this.fixCallbacks.onAnalyzeSchema) {
      buttonRow.createEl('button', {
        text: 'Analyze schema',
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

  constructor(app: App, report: IngestReport) {
    super(app);
    this.report = report;
  }

  onOpen() {
    const { sourceFile, createdPages, updatedPages, failedItems, contradictionsFound, success, errorMessage } = this.report;

    const statusEmoji = success ? '✅' : '⚠️';
    this.contentEl.createEl('h2', { text: `${statusEmoji} 摄入报告` });

    // Source file
    this.contentEl.createEl('p', { text: `源文件：${sourceFile}` });

    // Stats
    const statsEl = this.contentEl.createDiv({ attr: { style: 'margin: 12px 0;' } });
    statsEl.createEl('p', { text: `创建页面：${createdPages.length}` });
    statsEl.createEl('p', { text: `更新页面：${updatedPages.length}` });
    if (contradictionsFound > 0) {
      statsEl.createEl('p', { text: `发现矛盾：${contradictionsFound}` });
    }

    // Created pages
    if (createdPages.length > 0) {
      this.contentEl.createEl('h3', { text: '已创建' });
      const list = this.contentEl.createEl('ul');
      for (const page of createdPages) {
        list.createEl('li', { text: page });
      }
    }

    // Updated pages
    if (updatedPages.length > 0) {
      this.contentEl.createEl('h3', { text: '已更新' });
      const list = this.contentEl.createEl('ul');
      for (const page of updatedPages) {
        list.createEl('li', { text: page });
      }
    }

    // Failed items
    if (failedItems.length > 0) {
      this.contentEl.createEl('h3', { text: '⚠️ 未能摄入' });
      const list = this.contentEl.createEl('ul');
      for (const item of failedItems) {
        const typeLabel = item.type === 'entity' ? '实体' : '概念';
        list.createEl('li', { text: `[${typeLabel}] ${item.name} — ${item.reason}` });
      }
    }

    // Error
    if (errorMessage) {
      this.contentEl.createEl('p', {
        text: `错误详情：${errorMessage}`,
        attr: { style: 'color: var(--text-error); margin-top: 12px;' }
      });
    }

    // Close button
    const btnRow = this.contentEl.createDiv({ attr: { style: 'margin-top: 16px; text-align: right;' } });
    btnRow.createEl('button', { text: '关闭' }).addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}
