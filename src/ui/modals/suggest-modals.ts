// File & Folder suggest modals — small FuzzySuggestModal subclasses used
// in settings.ts (folder picker) and settings tab flows (file picker).
//
// Extracted from the original `src/ui/modals.ts` god file (PR split).
// No behavior change — pure code movement.

import { App, TFile, TFolder, FuzzySuggestModal } from 'obsidian';
import { COMPATIBLE_SOURCE_EXTENSIONS } from '../../constants';
import { isInFolderScope } from '../../core/folder-scope';

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
    // directories, mirroring the legacy markdown-only behavior.
    // Issue #383: the exclusion is anchored. Unanchored it hid the user's own
    // notes from the source picker whenever their path merely started with the
    // wiki folder's name ("wiki-archive/note.md", "wiki.md").
    return this.app.vault.getFiles()
      .filter(f => isCompatibleSource(f))
      .filter(f => !isInFolderScope(f.path, this.wikiFolder, false)
                && !f.path.startsWith(this.app.vault.configDir));
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

    // Issue #383: anchored, but note the shape — the set to exclude here is the
    // wiki folder ITSELF plus its descendants, and `isInFolderScope` answers
    // "descendant of", which a folder is not of itself. Dropping the identity
    // check would put the wiki folder back into the picker.
    const isWikiScope = (path: string): boolean =>
      path === this.wikiFolder || isInFolderScope(path, this.wikiFolder, false);

    const collect = (folder: TFolder) => {
      if (!folder.path.startsWith(this.app.vault.configDir) && !isWikiScope(folder.path)) {
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