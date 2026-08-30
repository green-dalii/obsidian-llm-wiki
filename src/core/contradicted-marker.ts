// v1.25.10 PATCH DocTpoint §4 — split `merge` vs `contradictory`.
//
// `merge` and `contradictory` currently both fall through to the same
// body-rewrite path. There is no frontmatter-level signal that the
// rewrite was triggered by a *conflict* between new and existing info,
// so Lint cannot tell a "conflicted rewrite" apart from a routine merge.
//
// This helper stamps a `contradictions:` line into the frontmatter
// block when the triage returned `strategy: 'contradictory'`. The
// parallel rename to `contradictions:` (single noun, parallel to
// `supersedes:`) follows the existing plugin-owned frontmatter naming
// convention. The new field is plain YAML list-of-strings under the
// plugin's own namespace, preserved across re-touch by the
// `extractPassthroughLines` fix. Lint can later scan this field to
// surface pages that need editorial review.
//
// Pure, no IO. The merged sources list accumulates across re-touches —
// each contradictory re-ingest adds the new sourcePath without dropping
// earlier entries — so a page's history of contradictions is preserved.

import { replaceOrInsertYamlListField, parseFrontmatter } from './frontmatter';

export const CONTRADICTIONS_KEY = 'contradictions';

/**
 * Append `sourcePath` to the `contradictions:` list in `frontmatter`.
 * Idempotent against the same sourcePath being added twice
 * (case-insensitive, `.md` normalized). Returns the input unchanged
 * when the frontmatter has no opening `---` delimiter (defensive).
 *
 * @param frontmatter Existing frontmatter block (begins with `---\n`).
 * @param sourcePath  Path of the source whose content contradicted
 *                    the page; e.g. `notes/foo.md`.
 */
export function appendContradictedByMarker(
  frontmatter: string,
  sourcePath: string,
): string {
  if (!frontmatter.startsWith('---')) return frontmatter;
  const normalized = sourcePath.trim();
  if (!normalized) return frontmatter;

  const fm = parseFrontmatter(frontmatter);
  const existing = Array.isArray(fm?.[CONTRADICTIONS_KEY])
    ? (fm[CONTRADICTIONS_KEY] as string[])
    : [];
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const s of existing) {
    const key = normalizeSource(s);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }
  const incomingKey = normalizeSource(normalized);
  if (incomingKey && !seen.has(incomingKey)) {
    seen.add(incomingKey);
    merged.push(normalized);
  }
  if (merged.length === existing.length) return frontmatter;
  return replaceOrInsertYamlListField(frontmatter, CONTRADICTIONS_KEY, merged);
}

function normalizeSource(s: string): string {
  return s.trim().replace(/^\[\[|\]\]$/g, '').trim().toLowerCase();
}


/**
 * A triage item flagged `kind: 'contradictory'` — the shape the
 * deterministic body append below consumes. Mirrors the fields of
 * `ComplementaryItem` (merge-triage.ts) without importing it, so this
 * module stays dependency-free.
 */
export interface ContradictionNoteItem {
  content: string;
  target_section: string;
  reason?: string;
}

/**
 * Append an attributed conflict block for item-level contradictions.
 *
 * Deterministic on purpose: a conflicting claim must never be handed to
 * the per-section append LLM, which would integrate it as if it were a
 * fact — the poison would land exactly where it blends in best. The
 * heading is byte-identical to the one `ContradictionManager` writes so
 * downstream tooling has ONE string to scan for both flag paths.
 *
 * Pure, no IO. Returns the body unchanged when `items` is empty.
 */
export function appendContradictionNotes(
  body: string,
  items: readonly ContradictionNoteItem[],
  sourceBasename: string,
): string {
  if (items.length === 0) return body;
  const date = new Date().toISOString().split('T')[0];
  const blocks = items.map(item => {
    const reason = item.reason?.trim()
      ? `\n\n**Conflicts with** (${item.target_section}): ${item.reason.trim()}`
      : `\n\n**Conflicts with**: ${item.target_section}`;
    return `**Source claim** (from ${sourceBasename}): ${item.content}${reason}`;
  });
  return `${body}\n\n## ⚠️ Potential Contradiction\n\n${blocks.join('\n\n')}\n\n---\n*Flagged: ${date}*`;
}
