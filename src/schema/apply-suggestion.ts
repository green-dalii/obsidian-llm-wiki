// v1.22.0 #97: business logic for "apply a Schema suggestion" — the
// orchestrator function behind the SchemaDiffModal's "Apply" button.
//
// Flow:
//   1. Read the current config.md (skip if missing — first-install case)
//   2. Create a backup (config.md.bak.<iso>) by copying content
//   3. Prune old backups to enforce MAX_BACKUPS limit
//   4. Write the new body to the original path, preserving the YAML
//      frontmatter (version, updated, auto_suggestion_count)
//   5. Invalidate the SchemaManager cache via onCacheInvalidate callback
//   6. Return a small result struct so the UI can show a Notice
//
// Frontmatter handling: we keep the existing frontmatter (date/version),
// only the body changes. This way, every apply leaves an audit trail in
// the frontmatter (updated: <today>, auto_suggestion_count: N) without
// the LLM having to know anything about frontmatter format.

import { App, TFile } from 'obsidian';
import { backupFilename, rotateBackups } from '../core/backup-rotation';

export interface ApplySchemaSuggestionParams {
  app: App;
  currentPath: string;
  newBody: string;
  /** Override Date.now() for deterministic tests. */
  now?: () => Date;
  /** Called once after a successful write so the SchemaManager can drop
   *  its in-memory cache (the next loadSchema() will return the new body). */
  onCacheInvalidate?: () => void;
}

export type ApplySchemaResult =
  | { success: true;  backupPath: string }
  | { success: false; reason: 'source-missing' };

export async function applySchemaSuggestion(
  params: ApplySchemaSuggestionParams
): Promise<ApplySchemaResult> {
  const { app, currentPath, newBody, onCacheInvalidate } = params;
  const now = params.now ?? (() => new Date());
  const file = app.vault.getAbstractFileByPath(currentPath);
  if (!(file instanceof TFile)) {
    return { success: false, reason: 'source-missing' };
  }

  // 1. Read the original content (preserves frontmatter for the backup)
  const originalContent = await app.vault.read(file);

  // 2. Create the backup (rename-by-content: read+create is the only
  //    way to copy in the Obsidian vault adapter — there's no native
  //    rename that fires FileManager events for both sides).
  const iso = now().toISOString();
  const bakPath = backupFilename(currentPath, iso);
  await app.vault.create(bakPath, originalContent);

  // 3. Prune old backups to enforce MAX_BACKUPS
  const dir = currentPath.substring(0, currentPath.lastIndexOf('/'));
  const baseName = currentPath.split('/').pop() ?? currentPath;
  const bakPrefix = `${dir}/${baseName}.bak.`;
  const allBackups: string[] = [];
  // We need to scan ALL files in the vault (including .bak files which
  // are saved as .md so the editor opens them as Markdown). Obsidian's
  // getMarkdownFiles() is sometimes filtered (skips files in .obsidian
  // dir, attachments, etc.) and may not include our .bak.md siblings.
  // getFiles() returns every file in the vault, which is what we need.
  // Fall back to getMarkdownFiles for older Obsidian API versions.
  const vaultAny = app.vault as unknown as {
    getFiles?: () => TFile[];
    getMarkdownFiles: () => TFile[];
  };
  const filesToScan: TFile[] = vaultAny.getFiles ? vaultAny.getFiles() : vaultAny.getMarkdownFiles();
  for (const f of filesToScan) {
    if (f.path.startsWith(bakPrefix)) allBackups.push(f.path);
  }
  allBackups.sort(); // ISO timestamps sort lexically correct
  const toDelete = rotateBackups(allBackups);
  for (const p of toDelete) {
    const f = app.vault.getAbstractFileByPath(p);
    if (f instanceof TFile) await app.fileManager.trashFile(f);
  }

  // 4. Write the new body, preserving the existing frontmatter
  const newContent = spliceBody(originalContent, newBody);
  await app.vault.modify(file, newContent);

  // 5. Notify the cache to drop
  onCacheInvalidate?.();

  return { success: true, backupPath: bakPath };
}

/**
 * Replace the body of a schema file (everything after the YAML
 * frontmatter) with `newBody`, preserving the original frontmatter.
 *
 * Frontmatter is the `--- ... ---` block at the top. If the file has
 * no frontmatter, the new content is just `newBody` (so the apply path
 * is the same regardless of frontmatter state).
 */
export function spliceBody(originalContent: string, newBody: string): string {
  if (!originalContent.startsWith('---')) {
    return newBody;
  }
  const end = originalContent.indexOf('---', 3);
  if (end <= 0) {
    // Unterminated frontmatter — treat as no frontmatter
    return newBody;
  }
  // Keep the frontmatter (including its closing `---` and trailing
  // newline if any), then append the new body.
  const frontmatter = originalContent.substring(0, end + 3);
  // Ensure exactly one blank line between frontmatter and body
  return `${frontmatter}\n\n${newBody}`;
}
