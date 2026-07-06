// Issue #244 — Programmatic Mentions writes (formatter)
//
// Renders a `## Mentions in Source` section deterministically from either
// the new structured `MentionWithProvenance[]` input (preferred — supports
// multi-source dedup and sort) or the legacy `string[]` form (back-compat).
//
// The formatter is pure: no I/O, no LLM, no settings lookup (the caller
// passes the resolved `sectionLabel`). It produces the same shape the
// schema-manager.ts:117-128 spec describes:
//   - "Verbatim quote in original language (optional translation)" — [[source-name|display-name]]
//
// Plus an `## ` header line, blank line after the header, and bullet lines
// joined by single newlines.

import type { MentionWithProvenance } from '../types';

const DEFAULT_MAX_CHARS = 500;

export interface FormatMentionsOptions {
  /** Override the 500-char total budget. Defaults to 500 (matches truncateMentions). */
  maxChars?: number;
  /**
   * When true, render a single programmatic citation line pointing at the
   * source path (used for conversation ingest where per-quote Mentions are
   * not meaningful — Issue #244). All `mentions`/`quotes` arguments are
   * ignored when this flag is on; only `sourcePath` is used.
   */
  conversationMode?: boolean;
  /**
   * Localized source label to render after the link in conversation mode
   * (e.g. "Conversation about X"). Defaults to "this conversation".
   */
  conversationLabel?: string;
}

/**
 * Format a `## Mentions in Source` markdown section.
 *
 * @param mentions     Either structured `MentionWithProvenance[]` (preferred) or
 *                    legacy `string[]` (back-compat). The legacy form is detected
 *                    by structural inspection: arrays of strings vs arrays of objects.
 * @param sourcePath  Default vault-note path used by the legacy `string[]` form
 *                    and as the citation link target. Ignored when
 *                    `mentions_with_provenance` is provided (each entry has its own).
 * @param sectionLabel Localized section header label (e.g. "Mentions in Source" / "来源提及").
 * @returns           A complete markdown section (header + blank + bullets),
 *                    or empty string when there are no mentions or the label is empty.
 */
export function formatMentionsSection(
  mentions: MentionWithProvenance[] | string[],
  sourcePath: string,
  sectionLabel: string,
  options: FormatMentionsOptions = {},
): string {
  // Empty label → defensive no-op (caller must resolve the localized label
  // before calling us; if it's empty, something upstream is broken).
  if (!sectionLabel.trim()) return '';

  // Conversation mode: render a single programmatic citation line that points
  // at the conversation summary page. The `mentions` array is irrelevant —
  // Issue #244 manual-test fix: conversation ingest does not extract verbatim
  // Mentions; the page-factory synthesizes one "from <conversation>" citation.
  if (options.conversationMode) {
    const leftPath = sourcePath.replace(/\.md$/, '');
    const displayName = leftPath.split('/').pop() || leftPath;
    const label = options.conversationLabel?.trim() || 'this conversation';
    return [`## ${sectionLabel}`, '', `- (${label}) — [[${leftPath}|${displayName}]]`].join('\n');
  }

  if (!mentions || mentions.length === 0) return '';

  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;

  // Detect legacy vs structured input.
  const structured = isStructured(mentions);

  // Normalize to a uniform internal form.
  const entries: Array<{
    quote: string;
    translation?: string;
    sourcePath: string;
    extractedAt?: string;
  }> = structured
    ? (mentions as MentionWithProvenance[]).map(m => ({
        quote: m.quote,
        translation: m.translation,
        sourcePath: m.source_path,
        extractedAt: m.extracted_at,
      }))
    : (mentions as string[]).map(quote => ({
        quote,
        sourcePath,
      }));

  // Multi-source: dedup identical quotes, sort by extracted_at then sourcePath.
  const deduped = dedupAndSort(entries);

  // Build bullet lines + truncate at maxChars budget.
  const bullets = buildBullets(deduped, maxChars);

  if (bullets.length === 0) return '';

  // Final shape: header + blank + bullets.
  return [`## ${sectionLabel}`, '', ...bullets].join('\n');
}

// ─── helpers ───────────────────────────────────────────────────────────

function isStructured(m: unknown[]): boolean {
  return m.length > 0 && typeof m[0] === 'object' && m[0] !== null && 'quote' in m[0];
}

function dedupAndSort(entries: Array<{
  quote: string;
  translation?: string;
  sourcePath: string;
  extractedAt?: string;
}>) {
  // Dedup by quote string (keep first occurrence — preserves extraction order
  // when no extracted_at is present).
  const seen = new Set<string>();
  const deduped = entries.filter(e => {
    if (seen.has(e.quote)) return false;
    seen.add(e.quote);
    return true;
  });

  // Sort: by extracted_at ascending (oldest first), then by sourcePath.
  // When extracted_at is missing, fall back to sourcePath so the order is stable.
  return deduped.sort((a, b) => {
    const aT = a.extractedAt ?? '';
    const bT = b.extractedAt ?? '';
    if (aT !== bT) return aT < bT ? -1 : 1;
    return a.sourcePath < b.sourcePath ? -1 : a.sourcePath > b.sourcePath ? 1 : 0;
  });
}

function buildBullets(
  entries: Array<{ quote: string; translation?: string; sourcePath: string }>,
  maxChars: number,
): string[] {
  const bullets: string[] = [];
  let used = 0;
  for (const e of entries) {
    const leftPath = e.sourcePath.replace(/\.md$/, '');
    const displayName = leftPath.split('/').pop() || leftPath;
    // Half-width parentheses regardless of locale (per design decision).
    // Translation is rendered ONLY when present — single-language wikis skip it.
    const quotePart = e.translation?.trim()
      ? `"${e.quote}" (${e.translation})`
      : `"${e.quote}"`;
    const line = `- ${quotePart} — [[${leftPath}|${displayName}]]`;
    if (used + line.length + 1 > maxChars) {
      if (used === 0) {
        // First quote already exceeds budget — emit a truncated head.
        const overhead = ` — [[${leftPath}|${displayName}]]`.length + 3;
        const head = Math.max(0, maxChars - overhead);
        const truncated = e.translation?.trim()
          ? `"${e.quote.substring(0, head)}..." (${e.translation})`
          : `"${e.quote.substring(0, head)}..."`;
        bullets.push(`- ${truncated} — [[${leftPath}|${displayName}]]`);
      }
      break;
    }
    bullets.push(line);
    used += line.length + (bullets.length > 1 ? 1 : 0);
  }
  return bullets;
}
