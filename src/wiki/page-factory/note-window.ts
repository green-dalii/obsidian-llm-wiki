// Note excerpt window for merge calls — the payload half of the merge
// thinness problem.
//
// Why this exists
// ---------------
// Both merge consumers — the #216 triage (`buildNewInfoSummary`) and the
// body-merge prompt — see only the extracted item: a few-sentence summary
// plus the first two quotes. The source note itself never reaches a merge
// call, so a note rich in facts about an existing page merges as links and
// a quote, and the facts land nowhere (observed: 2 of 7 merges carried any
// substance; the note's own lemma page got nothing). The payload of a call
// may be a function of the NOTE — here it was a constant.
//
// This module selects, deterministically and bounded, the note paragraphs
// that mention the page (by name or alias), so the merge finally sees what
// the note actually says about its subject. For the page whose lemma the
// note carries (#312 `isSourceOwnPageLemma`), the whole note body is the
// excerpt — a note about X is THE source for page X.
//
// Pure: no IO, no Obsidian imports, no LLM.

/** Options for {@link buildNoteExcerpt}. */
export interface NoteExcerptOptions {
  /** Page name the merge is targeting (`info.name`). */
  pageName: string;
  /** Extraction aliases and curated note aliases; matched like the name. */
  aliases?: string[];
  /**
   * True when the note carries the page's own lemma (#312): the whole body
   * is returned (capped) instead of matching paragraphs.
   */
  fullNote?: boolean;
  /** Hard cap on the excerpt, in characters. */
  maxChars?: number;
}

/** Default cap for the matched-paragraph window. */
export const EXCERPT_MAX_CHARS = 4000;
/** Default cap for the lemma full-note case. */
const EXCERPT_FULL_NOTE_MAX_CHARS = 12000;

const TRUNCATION_MARK = '\n[…]';

/**
 * Name-form variants a paragraph is searched for: the raw form, the
 * hyphen↔space swaps (slugged page names like "Sugar-Industry" must match
 * the prose form "Sugar Industry" and vice versa). Case-insensitive
 * matching is applied by the caller via toLowerCase.
 */
function nameVariants(name: string): string[] {
  const forms = new Set<string>();
  const trimmed = name.trim();
  if (!trimmed) return [];
  forms.add(trimmed);
  forms.add(trimmed.replace(/-/g, ' '));
  forms.add(trimmed.replace(/ /g, '-'));
  return [...forms];
}

/**
 * Build the note excerpt for one merge call.
 *
 * Paragraphs are blank-line-separated blocks; a block is included when it
 * contains the page name or any alias (case-insensitive, hyphen/space
 * tolerant). Blocks are joined in note order up to `maxChars`; when the cap
 * cuts, a truncation mark is appended so the prompt does not present a
 * partial window as the whole story. Returns '' when nothing matches —
 * callers render no excerpt block in that case, keeping today's prompt
 * byte-identical for pages the note only names in passing lists.
 */
export function buildNoteExcerpt(noteBody: string, opts: NoteExcerptOptions): string {
  const body = noteBody.trim();
  if (!body) return '';

  const maxChars = opts.maxChars ?? (opts.fullNote ? EXCERPT_FULL_NOTE_MAX_CHARS : EXCERPT_MAX_CHARS);

  if (opts.fullNote) {
    if (body.length <= maxChars) return body;
    return body.slice(0, maxChars) + TRUNCATION_MARK;
  }

  const needles = [opts.pageName, ...(opts.aliases ?? [])]
    .flatMap(nameVariants)
    .map(v => v.toLowerCase())
    .filter(v => v.length >= 3);
  if (needles.length === 0) return '';

  const blocks = body.split(/\n\s*\n/);
  const matched: string[] = [];
  for (const block of blocks) {
    const lower = block.toLowerCase();
    if (needles.some(n => lower.includes(n))) matched.push(block.trim());
  }
  if (matched.length === 0) return '';

  let out = '';
  for (const block of matched) {
    const next = out ? `${out}\n\n${block}` : block;
    if (next.length > maxChars) {
      return out ? out + TRUNCATION_MARK : block.slice(0, maxChars) + TRUNCATION_MARK;
    }
    out = next;
  }
  return out;
}

/**
 * Render the excerpt as a prompt block, or '' when there is no excerpt.
 * Shared by the triage and the body-merge prompts so both consumers see
 * the same window — enriching only the merge would leave the triage
 * routing to "skip" on the thin payload before the merge can act.
 */
export function renderNoteExcerptBlock(excerpt: string, pageName: string): string {
  if (!excerpt) return '';
  return `\n\n**What the source note itself says about "${pageName}" (verbatim excerpt):**\n${excerpt}`;
}
