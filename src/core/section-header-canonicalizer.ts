// Section-header canonicalizer — deterministic repair of LLM-garbled section headers.
// Pure, no LLM, O(lines × labels).
import { stripMentionsSection } from './mentions-parser';
//
// The generation/merge prompts hand the model the exact section labels
// (`## {{section_...}}` resolved via applySectionLabels) and it is expected to copy
// them verbatim into the page. A local model occasionally garbles one on the way
// out — observed on the longest, rarest label under `wikiLanguage: de`:
// `## Erwähnungen in der Quelle` came back as `## Erwägungen…`, `## Erwurnungen…`,
// `## Erwährungen…`, `## Erwnungen…`. This is not a sampling artifact — at extraction
// temperature the correct token dominates by a wide logprob margin and neither
// repetition_penalty nor temperature moves it; it surfaces only under full-length
// generation. The parser (`getSectionLabels` consumers: query-engine, page-factory,
// contradictions) matches labels EXACTLY, so a garbled header silently drops that
// section from Tier-B retrieval.
//
// The label is a known structural fact, so re-assert it after generation rather than
// trusting the copy — the same move `correctRelatedLinkPrefixes` makes for link folders.
// Bounded so it only heals genuine near-misses and never rewrites a real content header:
// a header is snapped only when it is within MAX_DISTANCE edits of exactly one canonical
// label AND strictly closer to it than to any other (the smallest distance between two
// canonical labels is 4, so the window is unambiguous). Exact labels short-circuit.

const MAX_DISTANCE = 3;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * v1.24.0 #216 Tier-2 — snap a free-form header string to its closest
 * canonical label, or return null when no unambiguous match exists.
 *
 * Bounded so it only heals genuine near-misses and never rewrites a real
 * content header: a candidate is snapped only when it is within
 * MAX_DISTANCE edits of exactly one canonical label AND strictly closer
 * to it than to any other. Exact labels return the same string (caller
 * can detect "exact" by comparing input vs output).
 *
 * Used both by the forward pass (canonicalizeSectionHeaders rebuilds
 * the body) and the Tier-2 reverse pass (resolveSectionAnchor snaps an
 * LLM-provided target_section to the canonical label actually present
 * in the body).
 */
export function snapHeaderToCanonical(
  candidate: string,
  canonicalLabels: string[],
): string | null {
  const canonical = new Set(canonicalLabels);
  if (canonical.has(candidate)) return candidate;
  let best = Infinity;
  let second = Infinity;
  let bestLabel: string | null = null;
  for (const label of canonicalLabels) {
    const d = levenshtein(candidate, label);
    if (d < best) {
      second = best;
      best = d;
      bestLabel = label;
    } else if (d < second) {
      second = d;
    }
  }
  if (bestLabel !== null && best <= MAX_DISTANCE && best < second) return bestLabel;
  return null;
}

/** A schema section's identity: its canonical label plus any parenthetical suffix. */
export interface SectionIdentity {
  label: string;
  /** The text inside a trailing ` (...)`, or null when the header carries none. */
  suffix: string | null;
}

/**
 * Classify a header as canonical-or-not, tolerant of a trailing parenthetical
 * suffix, and report that suffix as part of the section's identity.
 *
 * The New Information section carries such a suffix by design: the generation
 * prompt emits `## {{section_new_information}} ({{date}})` and the
 * complementary-append fallback emits `## {{section_new_information}} ({{source}})`.
 * The bare snapper rejects those — the suffix pushes the header well past
 * MAX_DISTANCE — so a legitimate, content-bearing accumulation section would be
 * classified as foreign. Match the base header (before a final ` (...)`) too,
 * while a genuinely foreign header still snaps to nothing whether or not it has
 * a suffix.
 *
 * The suffix is returned rather than discarded because it is load-bearing: New
 * Information is the one schema section that legitimately occurs MULTIPLE times
 * on a page, one block per contributing source, distinguished only by that
 * suffix. Callers that decide keep-vs-drop per section must therefore compare
 * full identities, not base labels. Used for those decisions only — NOT by
 * canonicalizeSectionHeaders, which must leave a suffixed header's text intact.
 */
export function classifyHeader(
  header: string,
  canonicalLabels: string[],
): SectionIdentity | null {
  const direct = snapHeaderToCanonical(header, canonicalLabels);
  if (direct !== null) return { label: direct, suffix: null };
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(header);
  if (!m) return null;
  const base = snapHeaderToCanonical(m[1].trim(), canonicalLabels);
  if (base === null) return null;
  // Trim the suffix so whitespace inside the parens does not split what is
  // logically one section: the model may emit " ( Silent Inflammation )" and
  // the page may carry " (Silent Inflammation)" — same identity either way.
  return { label: base, suffix: m[2].trim() };
}

export function canonicalizeSectionHeaders(content: string, canonicalLabels: string[]): string {
  const snap = (header: string): string | null => snapHeaderToCanonical(header, canonicalLabels);
  return content.split('\n').map(line => {
    const m = /^(##\s+)(.+?)\s*$/.exec(line);
    if (!m) return line;
    const target = snap(m[2]);
    return target ? `${m[1]}${target}` : line;
  }).join('\n');
}

/**
 * Split a body into its canonical schema sections, keyed by full identity
 * (label + suffix). Non-schema regions — frontmatter, H1, the lead paragraph
 * before the first `##`, and any foreign section — are ignored. Each value is
 * the whole block: header line plus its content lines up to the next `##`.
 *
 * Keyed by identity rather than by label because New Information repeats per
 * source; keying by label alone would collapse those blocks onto one another.
 * First occurrence of an identity wins, so an exactly-duplicated header cannot
 * make the map grow.
 */
function canonicalSectionBlocks(
  body: string,
  canonicalLabels: string[],
): Map<string, string[]> {
  const blocks = new Map<string, string[]>();
  let key: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    if (key !== null && !blocks.has(key)) blocks.set(key, lines);
  };
  for (const line of body.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      const id = classifyHeader(m[1], canonicalLabels);
      key = id ? (id.suffix === null ? id.label : `${id.label} (${id.suffix})`) : null;
      lines = key ? [line] : [];
      continue;
    }
    if (key !== null) lines.push(line);
  }
  flush();
  return blocks;
}

/**
 * Re-assert schema sections the LLM dropped during a body rewrite.
 *
 * updateRelatedPage and the mergePage full-rewrite path hand the model the
 * existing body and adopt its rewrite as the new body. Mentions (#267), headers
 * (#241) and link prefixes (#187) are all re-asserted deterministically
 * afterwards — but the COMPLETENESS of the schema body was still the model's to
 * decide: a rewrite that silently omits `## Description` dropped that section
 * for good.
 *
 * The schema, not the model, decides which sections must exist, so restore any
 * canonical section that carried content in `existingBody` and is wholly absent
 * from `rewrite`: a dropped section is APPENDED back (at the end, in first-seen
 * order). The same non-lossy guarantee #267 gives the Mentions section,
 * generalized to the rest of the schema body.
 *
 * A section that is still there but collapsed is the same loss one header
 * short of it. Measured on a rebuilt vault: nine `## Beschreibung` blocks of
 * 800–8400 characters came back from a rewrite at under half their size —
 * 5046 → 335 in the worst case, the first paragraph kept and five paragraphs
 * of merged, footnoted content gone — while the prompt said "without deleting
 * existing content" and the guard saw the header and called it kept. So a
 * canonical section whose content shrinks below SECTION_SHRINK_FLOOR of what
 * it held (once it held at least SECTION_SHRINK_MIN_CHARS) is treated like a
 * dropped one: the previous block is put back IN PLACE of the collapsed one,
 * and a warning names the section and both sizes. Below the size threshold
 * or above the floor the content stays the model's call — a genuine rewrite
 * changes wording, not an order of magnitude.
 *
 * Presence is decided per full identity (label + suffix), which matters for the
 * one section that repeats: emitting `## New Information (Source B)` must not
 * count as keeping `## New Information (Source A)`.
 *
 * The Mentions section is stripped from BOTH sides before diffing: from the
 * existing body so it is never a candidate here, and from the rewrite too,
 * because the model occasionally hallucinates a Mentions header back even
 * though the prompt body was mentions-stripped. assembleFinalContent re-attaches
 * it programmatically below — once, at the right anchor. Pure, O(lines × labels).
 */
/** A kept section whose content falls below this fraction of its previous length is restored. */
const SECTION_SHRINK_FLOOR = 0.5;
/** Sections shorter than this before the rewrite are never shrink-guarded — the model may reword them freely. */
export const SECTION_SHRINK_MIN_CHARS = 400;

function blockContentLength(block: string[]): number {
  return block.slice(1).join('\n').trim().length;
}

export function preserveExistingSections(
  existingBody: string,
  rewrite: string,
  canonicalLabels: string[],
  mentionsLabel: string,
): string {
  const strippedExisting = stripMentionsSection(existingBody, mentionsLabel);
  const strippedRewrite = stripMentionsSection(rewrite, mentionsLabel);
  const oldBlocks = canonicalSectionBlocks(strippedExisting, canonicalLabels);
  const newBlocks = canonicalSectionBlocks(strippedRewrite, canonicalLabels);

  const restored: string[] = [];
  const collapsed = new Map<string, string[]>();
  for (const [key, block] of oldBlocks) {
    const oldLen = blockContentLength(block);
    const kept = newBlocks.get(key);
    if (kept) {
      const newLen = blockContentLength(kept);
      if (oldLen >= SECTION_SHRINK_MIN_CHARS && newLen < oldLen * SECTION_SHRINK_FLOOR) {
        console.warn(
          `[preserveExistingSections] "${block[0]}" came back at ${newLen} of ${oldLen} chars — restoring the previous block`,
        );
        collapsed.set(key, block);
      }
      continue; // model kept the section at a plausible size — its call
    }
    // Only restore sections that actually carried content; an empty scaffold the
    // model correctly omitted stays omitted.
    if (oldLen > 0) {
      restored.push(block.join('\n').replace(/\s+$/, ''));
    }
  }

  const body = collapsed.size === 0
    ? strippedRewrite
    : replaceSectionBlocks(strippedRewrite, collapsed, canonicalLabels);
  if (restored.length === 0) return body;
  return `${body.replace(/\s+$/, '')}\n\n${restored.join('\n\n')}\n`;
}

/**
 * Swap whole canonical blocks in place: every section of `body` whose identity
 * is in `replacements` is emitted from the replacement (header included) and
 * the model's lines for that section are skipped up to the next `##`. Every
 * other line — lead paragraph, foreign sections, H1 — passes through untouched.
 * Same header walk as `canonicalSectionBlocks`, so the two cannot disagree on
 * where a section starts.
 */
function replaceSectionBlocks(
  body: string,
  replacements: Map<string, string[]>,
  canonicalLabels: string[],
): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of body.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      skipping = false;
      const id = classifyHeader(m[1], canonicalLabels);
      const key = id ? (id.suffix === null ? id.label : `${id.label} (${id.suffix})`) : null;
      const replacement = key !== null ? replacements.get(key) : undefined;
      if (replacement) {
        out.push(...replacement.join('\n').replace(/\s+$/, '').split('\n'), '');
        skipping = true;
        continue;
      }
    }
    if (!skipping) out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Re-assert the page's H1 after an LLM body rewrite (#419).
 *
 * `preserveExistingSections` above guards `##` blocks only — its contract, and
 * its tests, deliberately ignore the title line. On the merge and related-page
 * paths the model is handed the whole body and asked to return the whole body,
 * so the H1 is inside the rewrite window while no layer owns it: when the reply
 * comes back starting at `## Beschreibung`, the title is simply gone.
 *
 * The restored title is the page's OWN previous H1, not one synthesized from the
 * file name. A page's file name is a slug of its title and is lossy — of 1930
 * pages carrying an H1 in a 2416-page vault, 677 (35%) have a title the file name
 * cannot reproduce (`Harvard-T-H-Chan-School-of-Public-Health` vs `Harvard T.H.
 * Chan School of Public Health`, `Lungu-et-al-2021` vs `Lungu et al. (2021)`).
 * Rebuilding the H1 from the file name would repair the pages that lost one and
 * quietly flatten the punctuation of every page that did not.
 *
 * For the same reason this never invents a title: a page that had no H1 before
 * the rewrite keeps none. 486 pages in that vault have no H1, and minting them
 * on the next merge is a mass mutation, not a repair.
 *
 * A rewrite that returns a DIFFERENT H1 is overwritten with the previous one.
 * The page's identity is not the model's call — the same reasoning that makes
 * `correctRelatedLinkPrefixes` re-type a link folder rather than trust the copy.
 * Pure, no LLM, O(lines).
 */
export function reassertH1(existingBody: string, rewrite: string): string {
  const previous = findH1(existingBody)?.text;
  if (previous === undefined) return rewrite;

  const current = findH1(rewrite);
  if (current === null) return `${previous}\n\n${rewrite.replace(/^\s+/, '')}`;
  if (current.text === previous) return rewrite;

  // Splice at the match position instead of `replace(current[0], previous)`: a
  // string replacement interprets `$` escapes in the title it inserts (`# Kosten
  // $$500` would arrive as `# Kosten $500`, `$&` as the whole matched title), and
  // it substitutes the first occurrence ANYWHERE in the body — a preceding line
  // quoting the title mid-line takes the restore while the real H1 keeps the
  // model's version.
  const head = rewrite.slice(0, current.start);
  const tail = rewrite.slice(current.end);
  return `${head}${previous}${tail}`;
}

/**
 * Locate a body's H1 — the line, and where it sits (#435).
 *
 * A line starting with `# ` is not automatically the title. It is a comment when
 * it stands inside a fenced code block (`# clone the repo` in a bash example) or
 * inside a `---` block the model echoed around the body, and `reassertH1` used
 * to accept both: on the read side a shell comment could be adopted as the
 * page's previous title, and on the write side it took the restore while the
 * model's title survived above it — the opposite of the contract.
 *
 * A `---` line opens a skipped block only in frontmatter position, i.e. as the
 * body's first content line; further down it is a thematic break and the lines
 * after it are ordinary body. Fences are closed by their own opening marker, so
 * a ``` inside a ~~~ block does not end it.
 *
 * Pure, single pass, O(lines).
 */
function findH1(body: string): { text: string; start: number; end: number } | null {
  let offset = 0;
  let fence: string | null = null;
  let inFrontmatter = false;
  let seenContent = false;

  for (const line of body.split('\n')) {
    const start = offset;
    offset += line.length + 1; // +1 for the '\n' that split() consumed
    const trimmed = line.trim();

    if (inFrontmatter) {
      if (trimmed === '---') inFrontmatter = false;
      continue;
    }
    if (fence !== null) {
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    if (trimmed === '') continue;

    if (!seenContent && trimmed === '---') {
      seenContent = true;
      inFrontmatter = true;
      continue;
    }
    seenContent = true;

    const opener = /^(```|~~~)/.exec(trimmed);
    if (opener) {
      fence = opener[1];
      continue;
    }

    if (line.startsWith('# ')) return { text: line, start, end: start + line.length };
  }

  return null;
}

/**
 * Drop any `## …` section whose header is not a known schema label — the
 * complement of canonicalizeSectionHeaders. The generation prompt appends the
 * active tag vocabulary as an `## Active Tag Vocabulary` block (system-prompts
 * `appendTagVocabularyToPrompt`); a local model copies that prompt scaffolding
 * verbatim into its output, so it lands as a body section on the finished page.
 * Observed in ~36% of pages on the S37 rebuild — the canonicalizer leaves it
 * untouched because it snaps nothing (distance to every label ≫ MAX_DISTANCE).
 *
 * The schema, not the model, decides which sections exist, so re-assert that
 * after generation: a section is kept only when its header snaps to a canonical
 * label (exact or near-miss), and dropped otherwise. Run AFTER
 * canonicalizeSectionHeaders so genuine near-misses are already repaired and
 * only true foreign sections remain. Content before the first `##` (frontmatter,
 * H1, lead paragraph) is untouched. Pure, O(lines × labels).
 *
 * Safe on the generation paths only (createNewPage / mergePage / updateRelatedPage);
 * reviewed pages route through appendToReviewedPage and never reach here, so no
 * hand-curated section is ever at risk.
 */
export function stripUnknownSections(content: string, canonicalLabels: string[]): string {
  const out: string[] = [];
  let dropping = false;
  for (const line of content.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      dropping = snapHeaderToCanonical(m[1], canonicalLabels) === null;
      if (dropping) {
        // Trim the blank lines that trailed the previous kept section so the
        // removal leaves no widening gap.
        while (out.length && out[out.length - 1].trim() === '') out.pop();
        continue;
      }
    }
    if (!dropping) out.push(line);
  }
  return out.join('\n');
}
