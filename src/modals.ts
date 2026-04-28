// Reusable UI modals for the LLM Wiki Plugin

import { App, TFile, TFolder, Modal, FuzzySuggestModal } from 'obsidian';

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

  constructor(app: App, report: string) {
    super(app);
    this.report = report;
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: 'Wiki 维护报告' });
    this.contentEl.createDiv({
      text: this.report,
      attr: { style: 'white-space: pre-wrap; max-height: 60vh; overflow-y: auto;' }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
