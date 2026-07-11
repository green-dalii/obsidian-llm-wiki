// Issue #267 — Non-lossy Mentions re-ingest (parser)
//
// The inverse of `mentions-formatter.ts`. `injectMentionsSection` re-emits the
// `## Mentions in Source` block from the array it is handed, so on a merge the
// caller must first recover the mentions already accumulated on the page across
// prior sources and union them with the new source's mentions. This module
// parses an existing block back into `MentionWithProvenance[]`.
//
// The section-boundary logic mirrors `mentions-injector.ts` exactly so that
// parse / strip stay symmetric with inject; the round-trip test
// (`mentions-formatter-roundtrip.test.ts`) guards against the two drifting.
//
// Round-trip is lossy for `extracted_at`, `source_slug`, and `position`: none
// are rendered in the section, so a parsed mention carries only `quote`,
// optional `translation`, and `source_path` (recovered from the wikilink).
// That is sufficient for the union dedup key `(quote, source_path)`.

import type { MentionWithProvenance } from '../types';
import { escapeRegex } from '../wiki/lint/utils';

/**
 * Locate the `## <sectionLabel>` block. Returns character offsets:
 *  - `start`        index of the `##` header line
 *  - `contentStart` index of the first content char after the header + one
 *                   optional blank line (matches the injector's skip)
 *  - `end`          index of the next `## ` heading, or `body.length`
 * Case-insensitive on the label (localized labels in any case must match).
 */
function findSection(
  body: string,
  sectionLabel: string,
): { start: number; contentStart: number; end: number } | null {
  const headerRe = new RegExp(`^##\\s+${escapeRegex(sectionLabel)}\\s*$`, 'mi');
  const match = body.match(headerRe);
  if (!match || match.index === undefined) return null;

  const start = match.index;
  const afterHeader = start + match[0].length;
  const rest = body.substring(afterHeader);
  const afterBlank = rest.replace(/^\s*\n/, '');
  const contentStart = afterHeader + (rest.length - afterBlank.length);
  const nextHeading = afterBlank.search(/^##\s/m);
  const end = nextHeading === -1 ? body.length : contentStart + nextHeading;
  return { start, contentStart, end };
}

// A formatter-produced bullet:
//   - "quote" — [[leftPath|display]]
//   - "quote" (translation) — [[leftPath|display]]
// Half-width parentheses, em-dash separator (U+2014). Anything that does not
// match is treated as a hand-edit and flips `fullyParsed` to false.
const BULLET_RE = /^-\s+"([\s\S]+)"(?:\s+\(([^)]*)\))?\s+—\s+\[\[([^\]|]+)\|[^\]]*\]\]\s*$/;

export interface ParsedMentionsSection {
  /** Whether a `## <sectionLabel>` block existed at all. */
  found: boolean;
  /**
   * True when every non-blank content line parsed as a bullet. False when the
   * block contains hand-edited or linter-reflowed lines we cannot structure —
   * the caller must then preserve `raw` verbatim rather than risk dropping it.
   */
  fullyParsed: boolean;
  /** Structured mentions recovered from the parseable bullet lines. */
  mentions: MentionWithProvenance[];
  /** The raw section text (header + body), trailing whitespace trimmed. */
  raw: string | null;
}

/**
 * Parse an existing `## <sectionLabel>` block back into structured mentions.
 * Returns `found:false` (an empty, fully-parsed result) when no block exists.
 */
export function parseMentionsSection(body: string, sectionLabel: string): ParsedMentionsSection {
  if (!sectionLabel || !sectionLabel.trim()) {
    return { found: false, fullyParsed: true, mentions: [], raw: null };
  }
  const sec = findSection(body, sectionLabel);
  if (!sec) return { found: false, fullyParsed: true, mentions: [], raw: null };

  const raw = body.substring(sec.start, sec.end).replace(/\s+$/, '');
  const content = body.substring(sec.contentStart, sec.end);

  const mentions: MentionWithProvenance[] = [];
  let fullyParsed = true;
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = BULLET_RE.exec(line);
    if (!m) {
      fullyParsed = false;
      continue;
    }
    const [, quote, translation, leftPath] = m;
    mentions.push({
      quote,
      ...(translation && translation.trim() ? { translation: translation.trim() } : {}),
      source_path: leftPath,
      source_slug: '',
      extracted_at: '',
    });
  }
  return { found: true, fullyParsed, mentions, raw };
}

/**
 * Remove the `## <sectionLabel>` block from `body` (no-op if absent), trimming
 * the surrounding blank lines so no gap accumulates. Used by the #267 fail-safe
 * to re-attach a curated block verbatim to a freshly merged body.
 */
export function stripMentionsSection(body: string, sectionLabel: string): string {
  if (!sectionLabel || !sectionLabel.trim()) return body;
  const sec = findSection(body, sectionLabel);
  if (!sec) return body;
  const before = body.substring(0, sec.start).replace(/\n+\s*$/, '');
  const after = body.substring(sec.end).replace(/^\s*\n/, '');
  if (!after) return before;
  return before ? `${before}\n\n${after}` : after;
}
