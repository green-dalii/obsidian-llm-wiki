// repetition-loop.ts — detect a degenerate repetition loop in a model
// response before the response is trusted.
//
// Issue #524: under grammar-constrained decoding (`response_format:
// json_schema`) a local model can fall into a loop — the same word, phrase
// or token run repeated until `max_tokens` — and the loop is not always
// visible to the caller. When it ends in `finish_reason: length` the batch
// is discarded; when it ends in `stop` the response is schema-valid JSON
// with a handful of items and the loop sitting inside a string value, and
// every existing guard on the extraction path (`checkEmptyBatch`,
// `canHalveBatch`, the JSON repair) lets it through as a successful batch.
//
// This detector is the one signal that distinguishes a damaged batch from a
// short one: a unit of 3–120 characters repeated at least four times in a
// row, covering at least `minTotalChars` characters, and containing at
// least one letter or digit (so runs of punctuation, fences or table rules
// do not count).
//
// Calibration (LM Studio server logs of one vault, May–Aug 2026, 2,493
// extraction responses): the threshold of 200 characters flagged 0 of
// 2,319 text-mode responses that ended in `stop` and were not loops — every
// flagged response carried a run of ≥ 2,280 characters; 14 of 125
// schema-mode responses were flagged, against 9 of 2,368 text-mode ones.

/** A detected loop: the repeated unit (trimmed for logging) and the total run length. */
export interface RepetitionLoop {
  unit: string;
  length: number;
}

/** Default minimum length of the repeated run, in characters. */
export const REPETITION_LOOP_MIN_CHARS = 200;

// Lazy unit so the shortest repeating unit is found first; `\1{3,}` means
// the unit occurs at least four times in a row. `[\s\S]` lets a unit span
// lines (looped JSON fragments carry newlines). The `g` flag is required
// for `matchAll`.
const LOOP_RE = /([\s\S]{3,120}?)\1{3,}/g;
const HAS_ALNUM_RE = /[\p{L}\p{N}]/u;

/**
 * Return the longest repetition loop in `text` whose run is at least
 * `minTotalChars` long, or `null` when there is none.
 */
export function findRepetitionLoop(
  text: string,
  minTotalChars: number = REPETITION_LOOP_MIN_CHARS,
): RepetitionLoop | null {
  let best: RepetitionLoop | null = null;
  for (const m of text.matchAll(LOOP_RE)) {
    const run = m[0];
    const unit = m[1];
    if (run.length < minTotalChars || !HAS_ALNUM_RE.test(unit)) continue;
    if (!best || run.length > best.length) {
      best = { unit: unit.length > 40 ? `${unit.slice(0, 40)}…` : unit, length: run.length };
    }
  }
  return best;
}
