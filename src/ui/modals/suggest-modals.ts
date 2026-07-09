// File & Folder suggest modals — small FuzzySuggestModal subclasses used
// in settings.ts (folder picker) and settings tab flows (file picker).
//
// Extracted from the original `src/ui/modals.ts` god file (PR split).
// No behavior change — pure code movement.

import { App, TFile, TFolder, FuzzySuggestModal } from 'obsidian';

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