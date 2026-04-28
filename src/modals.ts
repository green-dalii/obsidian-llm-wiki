// Reusable UI modals for the LLM Wiki Plugin

import { App, TFile, TFolder, Modal, FuzzySuggestModal } from 'obsidian';
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

export class LintReportModal extends Modal {
  report: string;
  onSuggestSchema?: () => void;

  constructor(app: App, report: string, onSuggestSchema?: () => void) {
    super(app);
    this.report = report;
    this.onSuggestSchema = onSuggestSchema;
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: 'Wiki 维护报告' });
    this.contentEl.createEl('div', {
      text: this.report,
      attr: { style: 'white-space: pre-wrap; max-height: 60vh; overflow-y: auto;' }
    });

    if (this.onSuggestSchema) {
      const buttonRow = this.contentEl.createDiv({
        attr: { style: 'margin-top: 16px; text-align: right;' }
      });
      buttonRow.createEl('button', {
        text: 'Suggest Schema Updates',
        cls: 'mod-cta'
      }).addEventListener('click', () => {
        this.onSuggestSchema?.();
        this.close();
      });
    }
  }

  onClose() {
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
