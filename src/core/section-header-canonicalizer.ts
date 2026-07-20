// Section-header canonicalizer — deterministic repair of LLM-garbled section headers.
// Pure, no LLM, O(lines × labels).
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
  return base === null ? null : { label: base, suffix: m[2] };
}

/** Stable key for a section identity — canonical label plus suffix. */
export function sectionIdentityKey(id: SectionIdentity): string {
  return id.suffix === null ? id.label : `${id.label} (${id.suffix})`;
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
      key = id ? sectionIdentityKey(id) : null;
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
 * canonical section that carried content in `oldBody` and is wholly absent from
 * `newBody`. Conservative by construction: it only ever APPENDS a dropped
 * section back (at the end, in first-seen order) — it never edits or removes
 * what the model produced, so a section the model legitimately rewrote (its
 * identity still present, however much its content changed) is left untouched.
 * The same non-lossy guarantee #267 gives the Mentions section, generalized to
 * the rest of the schema body.
 *
 * Presence is decided per full identity (label + suffix), which matters for the
 * one section that repeats: emitting `## New Information (Source B)` must not
 * count as keeping `## New Information (Source A)`.
 *
 * `oldBody` must be mentions-stripped so the Mentions label is never a candidate
 * here — that section is re-attached separately by assembleFinalContent. Pure,
 * O(lines × labels).
 */
export function preserveExistingSections(
  oldBody: string,
  newBody: string,
  canonicalLabels: string[],
): string {
  const oldBlocks = canonicalSectionBlocks(oldBody, canonicalLabels);
  const newBlocks = canonicalSectionBlocks(newBody, canonicalLabels);

  const restored: string[] = [];
  for (const [key, block] of oldBlocks) {
    if (newBlocks.has(key)) continue; // model kept the section — its call
    // Only restore sections that actually carried content; an empty scaffold the
    // model correctly omitted stays omitted.
    if (block.slice(1).some(l => l.trim() !== '')) {
      restored.push(block.join('\n').replace(/\s+$/, ''));
    }
  }
  if (restored.length === 0) return newBody;
  return `${newBody.replace(/\s+$/, '')}\n\n${restored.join('\n\n')}\n`;
}
