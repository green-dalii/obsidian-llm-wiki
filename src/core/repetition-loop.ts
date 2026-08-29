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
  /**
   * The repeated unit as it actually occurs, untrimmed. `unit` is shortened
   * for log lines, so it is a display string and must never be used to look
   * the unit up anywhere — a unit longer than 40 characters would then never
   * be found. Callers that compare against real text use this (#525 review).
   */
  rawUnit: string;
}

/** Default minimum length of the repeated run, in characters. */
export const REPETITION_LOOP_MIN_CHARS = 200;

/** How often the unit must occur for `LOOP_RE` to match: itself plus `\1{3,}`. */
export const REPETITION_LOOP_MIN_REPEATS = 4;

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
      best = {
        unit: unit.length > 40 ? `${unit.slice(0, 40)}…` : unit,
        length: run.length,
        rawUnit: unit,
      };
    }
  }
  return best;
}

/**
 * True when the note the batch was extracted from repeats the loop's unit at
 * least as often as the detector demands — the model echoing a refrain the
 * source actually contains, rather than decoding degeneracy (#525 review).
 *
 * Why this matters: the damaged-batch response is halve-and-retry, and halving
 * changes how many items are asked for, never the note. A loop the note itself
 * carries is therefore reproduced by every retry, so the budget is spent on a
 * certainty.
 *
 * Why "four times" and not "contains it once", which is the cheaper reading:
 * the two errors are not symmetric. Skipping the retry on a batch that really
 * is damaged costs items silently; spending it on a source-borne loop costs
 * one call. So the test has to be the conservative one, and a unit that
 * appears once in a long note is no evidence at all — `Vitamin D, ` occurs in
 * half the vault and would suppress the retry for every genuine loop built
 * from it. A unit the note states four times is a refrain.
 *
 * #542: the threshold is *consecutive* occurrences, mirroring the response
 * detector's `LOOP_RE` `\1{3,}`. The previous check counted any non-
 * overlapping occurrence, which let a stopword scattered through ordinary
 * prose (`"und die "` ×25 in a German note, never as a refrain) suppress
 * the retry for genuine token-level degeneration. The scatter is not the
 * note's pattern to repeat — it is how the language works. Consecutive
 * runs are the refrain shape; the detector's contract has to match it.
 */
export function isSourceBorneLoop(loop: RepetitionLoop, sourceText: string): boolean {
  if (!loop.rawUnit) return false;
  // Escape the unit for the repeat quantifier so a unit containing regex
  // metacharacters (a quoted phrase, a path with a slash) still matches
  // literally. The unit is already on the response side verbatim, so this
  // is a literal-vs-regex question, not a normalisation question.
  const escaped = loop.rawUnit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:${escaped}){${REPETITION_LOOP_MIN_REPEATS},}`);
  return re.test(sourceText);
}
