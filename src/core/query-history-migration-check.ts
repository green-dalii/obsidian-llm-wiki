// Bug C 3.4 (gradual migration, plan C) — detect stale wikiFolder paths in
// chat history.
//
// Pre-v1.24.0 history contains real wikiFolder-prefixed links (e.g.
// [[test3/entities/foo]]). The placeholder scheme (Bug C 3.0) handles
// NEW turns correctly, but legacy entries still render the old path.
//
// This module is a pure function that scans a queryHistory array and
// returns a structured report: which distinct folders were detected,
// whether any of them differs from the user's current wikiFolder. The
// caller (main.onload) shows a one-time Notice when stale paths are
// found, so the user can decide whether to Clear history.
//
// We intentionally do NOT auto-migrate: guessing which folders the user
// has ever used is fragile (a user could have had 5 different folders
// across sessions). The Notice is a polite nudge, not a silent rewrite.

import { WIKI_FOLDER_PLACEHOLDER, WIKI_SUBFOLDER_NAMES } from './prompt-builders';

export interface StaleFolderDetection {
  /** Distinct non-placeholder folder prefixes found in history. */
  folders: string[];
  /** True when at least one detected folder ≠ the user's current wikiFolder. */
  hasStale: boolean;
}

/**
 * Walk `history` and collect the distinct folder prefixes that appear in
 * `[[folder/...]]` wiki-links. Excludes:
 * - `__WIKI_FOLDER__` (the v1.24.0 placeholder; safe by definition).
 * - Empty folder (paths without a folder prefix like `[[entities/foo]]`).
 *
 * The returned `hasStale` flag is `true` when at least one of the detected
 * folders differs from `currentWikiFolder`. If the user is currently using
 * the literal default 'wiki' folder, `[[wiki/...]]` links are NOT stale.
 *
 * @param history - The persisted queryHistory (any array; we read .content)
 * @param currentWikiFolder - The user's current settings.wikiFolder
 * @returns Folder list + hasStale flag, or `null` when history is empty
 */
export function detectStaleWikiFolders(
  history: ReadonlyArray<{ content: string }>,
  currentWikiFolder: string,
): StaleFolderDetection | null {
  if (!history || history.length === 0) return null;

  // Match `[[folder/<entities|concepts|sources>/rest]]` — the standard
  // Obsidian wiki-link shape produced by the LLM. We use the canonical
  // WIKI_SUBFOLDER_NAMES tuple (derived from constants.ts:WIKI_SUBFOLDERS)
  // as the second-segment matcher so that bare paths like `[[entities/foo]]`
  // are correctly treated as folder-less and skipped (Obsidian resolves
  // such relative links against the current vault root). Centralizing the
  // sub-folder list means a future layout change (e.g. adding `archive/`)
  // updates a single constant in constants.ts.
  const sub = WIKI_SUBFOLDER_NAMES.join('|');
  const linkRe = new RegExp(`\\[\\[([\\w-]+)\\/(?:${sub})\\/([^\\]]+)\\]\\]`, 'g');
  const folders = new Set<string>();

  for (const msg of history) {
    if (typeof msg.content !== 'string') continue;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(msg.content)) !== null) {
      const folder = m[1];
      if (folder && folder !== WIKI_FOLDER_PLACEHOLDER) {
        folders.add(folder);
      }
    }
  }

  if (folders.size === 0) return null;

  const folderList = [...folders];
  const hasStale = folderList.some(f => f !== currentWikiFolder);
  return { folders: folderList, hasStale };
}