// File & Folder suggest modals — small FuzzySuggestModal subclasses used
// in settings.ts (folder picker) and settings tab flows (file picker).
//
// Extracted from the original `src/ui/modals.ts` god file (PR split).
// The exclusion rule for both pickers lives in `isExcludedFromSourcePicker`
// (src/core/folder-scope.ts); PR #384 / #383 follow-up centralised it.

import { App, TFile, TFolder, FuzzySuggestModal } from 'obsidian';
import { COMPATIBLE_SOURCE_EXTENSIONS } from '../../constants';
import { isExcludedFromSourcePicker } from '../../core/folder-scope';
import { isMineruArtifactPath } from '../../core/pdf-backends/mineru-paths';

const isCompatibleSource = (f: TFile): boolean =>
  (COMPATIBLE_SOURCE_EXTENSIONS as readonly string[]).includes(f.extension.toLowerCase());

export class FileSuggestModal extends FuzzySuggestModal<TFile> {
  onSelect: (file: TFile) => void;
  private wikiFolder: string;

  constructor(app: App, wikiFolder: string, onSelect: (file: TFile) => void) {
    super(app);
    this.wikiFolder = wikiFolder;
    this.onSelect = onSelect;
  }

  getItems(): TFile[] {
    // v1.25.0 PR2: include PDFs in the source picker (PDFs are a first-class
    // source format). Filter by compatible extension + exclude wiki/config
    // directories, mirroring the legacy markdown-only behavior. The exclusion
    // rule (`isExcludedFromSourcePicker`) is shared with the folder picker so
    // the wiki folder itself, its descendants, and configDir siblings of any
    // shape are all hidden together.
    return this.app.vault.getFiles()
      .filter(f => isCompatibleSource(f))
      .filter(f => !isMineruArtifactPath(f.path))
      .filter(f => !isExcludedFromSourcePicker(f.path, this.wikiFolder, this.app.vault.configDir));
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
      if (!isExcludedFromSourcePicker(folder.path, this.wikiFolder, this.app.vault.configDir)) {
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
