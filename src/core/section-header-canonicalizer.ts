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

export function canonicalizeSectionHeaders(content: string, canonicalLabels: string[]): string {
  const canonical = new Set(canonicalLabels);

  const snap = (header: string): string | null => {
    if (canonical.has(header)) return null; // exact — leave untouched
    let best = Infinity, second = Infinity, bestLabel: string | null = null;
    for (const label of canonicalLabels) {
      const d = levenshtein(header, label);
      if (d < best) { second = best; best = d; bestLabel = label; }
      else if (d < second) { second = d; }
    }
    if (bestLabel !== null && best <= MAX_DISTANCE && best < second) return bestLabel;
    return null; // too far, or ambiguous
  };

  return content.split('\n').map(line => {
    const m = /^(##\s+)(.+?)\s*$/.exec(line);
    if (!m) return line;
    const target = snap(m[2]);
    return target ? `${m[1]}${target}` : line;
  }).join('\n');
}
