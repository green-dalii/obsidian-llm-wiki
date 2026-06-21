// Log parser for the Ingestion History Panel (#122).
//
// WikiEngine.updateLog and WikiEngine.logLintFix both append entries to
// `${wikiFolder}/log.md` with this structure:
//
//   # Wiki Operation Log\n\n
//
//   ## [YYYY-MM-DD] <operation> | <source_title>
//
//   **Created pages**: [[page1]], [[page2]]
//
//   **Updated pages**: [[page3]]
//
//   ## [YYYY-MM-DD HH:MM] <operation>
//
//   <details>
//
// parseLogEntries reads such a log and returns a normalized array of
// LogEntry records. Pure function (no IO, no Obsidian API). All parsing
// is tolerant: malformed entries are skipped, not thrown on.

export type LogEntry = {
  /** Ingest (parseable `**Created pages**` / `**Updated pages**`) or lint (anything else). */
  kind: 'ingest' | 'lint';
  /** ISO date (YYYY-MM-DD). Always present. */
  date: string;
  /** HH:MM timestamp (only for lint entries; undefined for ingest). */
  time?: string;
  /** Free-form operation label (e.g. "ingest", "Lint — fixPollutedSources"). */
  operation: string;
  /** Source title for ingest entries; undefined for lint. */
  sourceTitle?: string;
  /** Created wiki pages for ingest entries (path slugs without wikiFolder prefix). */
  createdPages: string[];
  /** Updated wiki pages for ingest entries. */
  updatedPages: string[];
  /** Whether a "Contradictions found" block was present. */
  hasContradictions: boolean;
  /** Contradiction lines (each line is "claim vs source"). */
  contradictions: string[];
  /** Free-form details body for lint entries. */
  details?: string;
};

const H2_RE = /^## \[([0-9]{4}-[0-9]{2}-[0-9]{2})(?: ([0-9]{2}:[0-9]{2}))?\] (.+)$/;
const CREATED_RE = /^\*\*Created pages\*\*:\s*(.*)$/;
const UPDATED_RE = /^\*\*Updated pages\*\*:\s*(.*)$/;
const CONTRADICTIONS_RE = /^\*\*Contradictions found\*\*:\s*$/;
const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Extract wiki page paths from a `[[page]]` or `[[page|alias]]` line.
 * Returns the raw path (caller decides whether to strip wikiFolder prefix).
 */
function extractWikiLinks(line: string): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  // Reset the global regex state per call
  WIKI_LINK_RE.lastIndex = 0;
  while ((m = WIKI_LINK_RE.exec(line)) !== null) {
    const raw = m[1];
    const pipe = raw.indexOf('|');
    matches.push(pipe >= 0 ? raw.substring(0, pipe) : raw);
  }
  return matches;
}

/**
 * Parse the entire log.md content into LogEntry[].
 *
 * Returns [] for empty input or header-only content. Skips any H2 entry
 * that does not have the expected structure (no Created/Updated lines for
 * what looks like an ingest entry).
 */
export function parseLogEntries(content: string): LogEntry[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const entries: LogEntry[] = [];
  const lines = content.split('\n');
  let i = 0;

  const finalizeIngest = (entry: LogEntry): boolean => {
    // Ingest entries are only valid if at least one of Created/Updated/Contradictions
    // appeared in the body. If none did, the entry is malformed (probably a log
    // entry misclassified as ingest) — drop it.
    return entry.createdPages.length > 0
      || entry.updatedPages.length > 0
      || entry.hasContradictions;
  };

  while (i < lines.length) {
    const line = lines[i];
    const m = H2_RE.exec(line);
    if (!m) {
      i++;
      continue;
    }

    const date = m[1];
    const time = m[2]; // undefined for ingest entries
    const rest = m[3].trim();
    // "operation | source_title" → split on first "|"
    const sep = rest.indexOf('|');
    let operation: string;
    let sourceTitle: string | undefined;
    if (sep >= 0) {
      operation = rest.substring(0, sep).trim();
      sourceTitle = rest.substring(sep + 1).trim();
    } else {
      operation = rest;
      sourceTitle = undefined;
    }

    const entry: LogEntry = {
      kind: sourceTitle !== undefined ? 'ingest' : 'lint',
      date,
      time,
      operation,
      sourceTitle,
      createdPages: [],
      updatedPages: [],
      hasContradictions: false,
      contradictions: [],
    };

    // Look ahead and capture the section body until next H2 or EOF
    i++;
    const detailsLines: string[] = [];
    while (i < lines.length && !H2_RE.test(lines[i])) {
      const bodyLine = lines[i];
      if (entry.kind === 'ingest') {
        const created = CREATED_RE.exec(bodyLine);
        if (created) {
          entry.createdPages = extractWikiLinks(created[1]);
          i++;
          continue;
        }
        const updated = UPDATED_RE.exec(bodyLine);
        if (updated) {
          entry.updatedPages = extractWikiLinks(updated[1]);
          i++;
          continue;
        }
        if (CONTRADICTIONS_RE.test(bodyLine)) {
          entry.hasContradictions = true;
          i++;
          // Collect subsequent "- claim vs source" lines until next H2 or EOF.
          // (Note: an empty line or other body line within an ingest entry is
          // skipped here — but contradictions are immediately followed by either
          // the next H2 entry or EOF in wiki-engine.ts output, so this is safe.)
          while (i < lines.length && !H2_RE.test(lines[i])) {
            const candidate = lines[i];
            if (candidate.startsWith('- ')) {
              entry.contradictions.push(candidate.substring(2).trim());
            }
            // Blank lines and other content: skip them but keep scanning for the next H2.
            i++;
          }
          continue;
        }
        // unrecognized body line in an ingest entry — skip
        i++;
        continue;
      }
      // lint: collect body lines as details
      detailsLines.push(bodyLine);
      i++;
    }
    if (entry.kind === 'lint') {
      entry.details = detailsLines.join('\n').trim();
      entries.push(entry);
    } else if (finalizeIngest(entry)) {
      entries.push(entry);
    }
    // If ingest entry had no valid body, drop it (malformed)
  }

  return entries;
}
