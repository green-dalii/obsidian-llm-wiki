// Duplicate page detection — programmatic candidate generation via shared links,
// bigram title similarity, and cross-language alias matching.
// Extracted from lint-fixes.ts to keep the module focused.

import { parseFrontmatter } from '../../core/frontmatter';
import { hashBody } from '../../core/source-requirements';
import {
  LINT_YIELD_EVERY_PHASE1,
  LINT_YIELD_EVERY_COMPARISON,
  LINT_DEDUP_JACCARD_LINK_THRESHOLD,
  LINT_DEDUP_JACCARD_BODY_GATE,
  LINT_DEDUP_BIGRAM_THRESHOLD,
  LINT_DEDUP_BUCKET_PREFIX_LEN,
  LINT_DEDUP_MAX_BUCKET_SIZE,
  LINT_DEDUP_INCOMING_LINK_THRESHOLD,
  WIKI_SUBFOLDERS,
} from '../../constants';

export interface DuplicateCandidate {
  target: string;
  source: string;
  reason: string;
  signal: 'crossLang' | 'bigram' | 'sharedLinks' | 'caseVariant' | 'sourceFingerprint' | 'sharedIncoming';
  score: number;
}

/**
 * B3 fix (v1.26.3 PATCH follow-up): infer a page's wiki content type
 * from its path. Pages whose path contains `/entities/`, `/concepts/`,
 * or `/sources/` are tagged accordingly; anything else (log.md,
 * schema/, index.md) is `'other'`. Pure function — no IO.
 *
 * Used by the cross-type pair filter (`isCrossTypePairAllowed`) to
 * reject entity↔source / concept↔source candidate pairs that the
 * bucketed dedup path (tp: / ic: / lh:) would otherwise surface.
 */
export type WikiPageType = 'entity' | 'concept' | 'source' | 'other';

function pageTypeOf(path: string): WikiPageType {
  if (path.includes(`/${WIKI_SUBFOLDERS.entities}/`)) return 'entity';
  if (path.includes(`/${WIKI_SUBFOLDERS.concepts}/`)) return 'concept';
  if (path.includes(`/${WIKI_SUBFOLDERS.sources}/`)) return 'source';
  return 'other';
}

/**
 * Allowed dedup pair combinations per user direction (2026-08-12):
 *   entity ↔ entity, concept ↔ concept,
 *   entity ↔ concept (cross-type is OK here),
 *   source ↔ source.
 * Forbidden: entity ↔ source, concept ↔ source.
 *
 * Pages tagged `'other'` (e.g. log.md, schema/) are NEVER in the
 * dedup-eligible set — they bail at the file-level filter upstream,
 * so this guard only needs to handle the four canonical wiki types.
 * If `'other'` slips through, the guard rejects the pair rather than
 * emit a candidate of unknown shape.
 *
 * Implementation note: stored as a Set of canonicalized "smaller|larger"
 * keys (lexicographically sorted by the type tag) so lookup is O(1)
 * regardless of which side is target vs source. Because the key is
 * canonical, ('entity', 'concept') and ('concept', 'entity') BOTH map to
 * 'concept|entity' — the Set MUST contain that row for the cross-type
 * combination to be allowed. The original bug (caught by the
 * sharedIncoming signal test) was a Set missing 'concept|entity' (only
 * symmetric rows were present), so every entity↔concept pair was silently
 * rejected — the fix was ADDING the row, not changing the `a < b`
 * comparison (which produces an identical key either way). Do not
 * 'simplify' the comparison or trust that Set row order matters.
 */
const ALLOWED_PAIR_KEYS: ReadonlySet<string> = new Set([
  'concept|concept',
  'concept|entity', // canonical form of ('entity', 'concept')
  'entity|entity',
  'source|source',
]);

export function isCrossTypePairAllowed(a: WikiPageType, b: WikiPageType): boolean {
  if (a === 'other' || b === 'other') return false;
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  return ALLOWED_PAIR_KEYS.has(key);
}

// ── Pure Functions (extracted for testability) ───────────────────────────────

/** Extract character bigrams from string for similarity comparison. */
function bigrams(s: string): Set<string> {
  const result = new Set<string>();
  const normalized = s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
  for (let i = 0; i < normalized.length - 1; i++) {
    result.add(normalized.substring(i, i + 2));
  }
  return result;
}

/** Normalize string for cross-language matching. */
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]+/g, '').replace(/[^a-z0-9一-鿿]/g, '');
}

const BODY_STOPWORDS = new Set([
  'also', 'are', 'been', 'being', 'both', 'but', 'can', 'could', 'did',
  'does', 'each', 'from', 'had', 'has', 'have', 'into', 'its', 'may',
  'might', 'must', 'not', 'only', 'other', 'our', 'shall', 'should',
  'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'was', 'were', 'what', 'when',
  'where', 'which', 'while', 'will', 'with', 'would', 'your',
]);

/** Extract unique meaningful words from body text for content similarity comparison. */
export function bodyWordSet(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s一-鿿]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !BODY_STOPWORDS.has(w)),
  );
}

/** Compute Jaccard similarity between two sets. */
export function computeJaccard<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Generate duplicate-page candidates using programmatic signals.
// Returns candidates for LLM verification, capped by the O(n²) algorithm.
// Three signals, ordered by reliability:
//   1. Shared outgoing wiki-links (Jaccard >= LINT_DEDUP_JACCARD_LINK_THRESHOLD)
//   2. Character bigram title similarity (catches spelling variants, same-language near-matches)
//   3. Cross-language alias match
//
// Thresholds are passed as an optional `options` argument. Each field is
// optional: unset (or non-finite / out-of-[0,1]) values fall back to
// DEFAULT_DEDUP_THRESHOLDS below. Callers (e.g. the lint dedup-phase)
// pass settings fields through directly; the callee handles coalescing +
// clamping so the defaults live in exactly one place.
export interface DuplicateDetectionThresholds {
  jaccardLinkThreshold?: number;   // 0..1
  jaccardBodyGate?: number;        // 0..1
  bigramThreshold?: number;        // 0..1
}

/**
 * Default threshold values, derived from the named constants in
 * src/constants.ts. This is the single source of truth for the 3
 * detection thresholds — callers must NOT re-state these defaults
 * (a caller-side coalesce would fork the value into two places).
 */
export const DEFAULT_DEDUP_THRESHOLDS: Required<DuplicateDetectionThresholds> = {
  jaccardLinkThreshold: LINT_DEDUP_JACCARD_LINK_THRESHOLD,
  jaccardBodyGate: LINT_DEDUP_JACCARD_BODY_GATE,
  bigramThreshold: LINT_DEDUP_BIGRAM_THRESHOLD,
};

/**
 * Resolve one threshold: fall back to `fallback` when the input is
 * missing, null, NaN, or ±Infinity; clamp finite values to the [0,1]
 * Jaccard range. Without the clamp, a settings value of 1.5 would
 * silently disable a signal (`x >= 1.5` is never true) and −0.1 would
 * flood every pair into the candidate set (`x >= −0.1` is always true).
 */
function resolveThreshold(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

// v1.26.0 (#382 item 3, Batch 1): the local PageMeta shape used inside
// generateDuplicateCandidates. Exported so the partition helper below
// can accept the same input type without forcing callers to reconstruct
// it.
export interface LintPageMeta {
  path: string;
  title: string;
  aliases: string[];
  links: Set<string>;
  bodyWords: Set<string>;
  /**
   * v1.26.0 (#382 item 1, Batch 2): body hash for the sourceFingerprint
   * signal. Filled in by `generateDuplicateCandidates` from the
   * frontmatter-stripped body; null for tests that construct LintPageMeta
   * directly without going through the pipeline (e.g.
   * partitionPagesMultiBucket unit tests). The fingerprint is identical
   * to `hashBody(extractBody(content))` from source-requirements.ts and
   * is what makes source↔source "content identical" detection
   * deterministic without depending on title/alias/bigram heuristics.
   */
  bodyFingerprint: string;
  /**
   * v1.26.0 (#382 item 1, Batch 2): set of wiki paths that cite THIS
   * page (i.e. for which THIS page appears in their outgoing `[[links]]`).
   * Populated by `generateDuplicateCandidates` from the optional
   * `incomingIndex` parameter; empty when the index is not provided.
   * Used by the `runSharedIncomingSignal` signal which fires when two
   * pages in the same `ic:` bucket share a non-trivial fraction of
   * incoming-source paths.
   */
  incomingSources: Set<string>;
}

/**
 * v1.26.0 (#382 item 1, Batch 2): dual-key + incoming-link bucket
 * partition for the bucketed dedup refactor. Each page is hashed into:
 *
 *   - one `tp:` bucket keyed by the first {@link LINT_DEDUP_BUCKET_PREFIX_LEN}
 *     characters of the title, normalised via {@link normalizeForMatch}.
 *     This preserves the title-prefix-similar pages in the same bucket,
 *     so the `bigram` / `crossLang` / `caseVariant` signals still fire
 *     in O(B²) within the bucket.
 *
 *   - one `lh:` bucket per outgoing wiki-link target (also normalised).
 *     This is the second dimension: pages sharing an outgoing hub link
 *     end up in the same `lh:<hub>` bucket regardless of title prefix,
 *     recovering sharedLinks recall that would otherwise be lost.
 *
 *   - one `ic:` bucket per incoming wiki-link source (Batch 2).
 *     Pages that are CITED by the same source end up in the same
 *     `ic:<source>` bucket regardless of title prefix or outgoing
 *     links. This is the dimension that catches entity↔concept
 *     cross-folder duplicates that share no outgoing links (e.g. an
 *     entity "Transformer" and a concept "Attention" both cited by
 *     the same source paper — they land in the same `ic:<paper>` bucket
 *     even though their titles and outgoing links differ completely).
 *
 * The same `meta` object reference is shared across the buckets it
 * lands in — no metadata duplication, no deep copy. Page order within
 * each bucket follows input order, which keeps signal-pair ordering
 * deterministic for the LLM verify phase.
 *
 * Pure: no IO, no yield, no global state. Suitable for unit tests.
 *
 * Bucket key prefixes (`tp:` / `lh:` / `ic:`) make the partition
 * self-describing when reading debug output and prevent collisions
 * between the three dimensions.
 *
 * The optional `incomingIndex` parameter is a `Map<sourcePath, targetPaths>`
 * reverse index built by the caller during lint preparation. When
 * provided, the `ic:` dimension is populated; when omitted, only
 * `tp:` + `lh:` dimensions fire (legacy Batch 1 behavior, useful for
 * unit tests that don't care about the ic: dimension).
 *
 * The `LINT_DEDUP_MAX_BUCKET_SIZE` cap protects against hub-page fan-out:
 * a page with 100 incoming links would otherwise land in 100 `ic:`
 * buckets, each pair-loop iterating its peers. We skip the ic:
 * dimension for buckets larger than the cap (the tp: + lh: dimensions
 * still apply — the cap only removes the ic: contribution).
 */
export function partitionPagesMultiBucket(
  metas: LintPageMeta[],
  incomingIndex?: Map<string, string[]>,
): Map<string, LintPageMeta[]> {
  const buckets = new Map<string, LintPageMeta[]>();

  const addToBucket = (key: string, meta: LintPageMeta): void => {
    const existing = buckets.get(key);
    if (existing) {
      existing.push(meta);
    } else {
      buckets.set(key, [meta]);
    }
  };

  for (const meta of metas) {
    // Title-prefix bucket (tp:).
    const titleKey = normalizeForMatch(meta.title).slice(
      0,
      LINT_DEDUP_BUCKET_PREFIX_LEN,
    );
    // When the title has fewer than PREFIX_LEN normalised chars (e.g.
    // a single CJK ideograph), slice returns whatever is available —
    // empty string for empty titles. Pages with empty keys all land
    // in the same `tp:` bucket (empty-suffix bucket); they are
    // inherently few, and over-partitioning them would not help recall.
    if (titleKey.length > 0) {
      addToBucket(`tp:${titleKey}`, meta);
    }

    // Link-hash buckets (lh:) — one per outgoing wiki-link. The
    // Set's identity already deduplicates raw link strings, but two
    // distinct raw strings can still normalise to the same bucket key
    // (e.g. "[[A-B]]" and "[[A B]]" both become "ab"). Without
    // per-page normalisation dedup, the same meta gets pushed into
    // the same lh: bucket twice — a singleton bucket then has length
    // 2 and the signal loops generate a self-pair (pathA === pathB).
    const seenLinkKeys = new Set<string>();
    for (const link of meta.links) {
      const linkKey = normalizeForMatch(link);
      if (linkKey.length > 0 && !seenLinkKeys.has(linkKey)) {
        seenLinkKeys.add(linkKey);
        addToBucket(`lh:${linkKey}`, meta);
      }
    }

    // Incoming-link buckets (ic:) — one per source path that cites this
    // page. For each (sourcePath → [targets]) entry where targets
    // includes meta.path, add meta to the `ic:<sourcePath>` bucket.
    // Per-page source-path dedup (mirrors lh:) prevents self-pair
    // generation when the reverse index lists the same source path twice.
    if (incomingIndex) {
      for (const [sourcePath, targets] of incomingIndex) {
        if (!targets.includes(meta.path)) continue;
        const bucket = buckets.get(`ic:${sourcePath}`);
        if (bucket && bucket.length >= LINT_DEDUP_MAX_BUCKET_SIZE) continue;
        addToBucket(`ic:${sourcePath}`, meta);
      }
    }
  }

  return buckets;
}

export interface DuplicateCandidateHooks {
  /**
   * Invoked once per non-empty bucket boundary in the bucketed dedup
   * path. Use this to abort a long-running scan promptly (e.g. when
   * the user cancels) without waiting for the entire bucket fan-out
   * to complete.
   *
   * Contract: throw `new DOMException('Lint cancelled by user',
   * 'AbortError')` to abort the scan, matching the convention used by
   * every other lint sub-phase (`fix-runners.ts`, `wiki-engine.ts`,
   * `controller.ts`). Returning normally lets the scan proceed to
   * the next bucket.
   */
  checkCancelled?: () => void;

  /**
   * B3 (v1.26.3 PATCH, DocT CR): invoked ONCE at the end of the scan with
   * the total count of candidate pairs rejected by the cross-type filter
   * (entity↔source / concept↔source / any 'other' pairing). Gives the
   * caller a number to surface in dedup debug output — without it, the
   * filter's effect is completely silent, so a future path-convention
   * drift would degrade dedup to a no-op with no signal at all.
   */
  onCrossTypeRejected?: (count: number) => void;
}

/**
 * v1.26.0 (#382 item 1, Batch 2): pure helper that builds the
 * incoming-link reverse index from a set of dedup-eligible pages.
 *
 * Walks each page's body content with the wiki-link regex (identical
 * to the one used in `generateDuplicateCandidates`'s setup loop),
 * resolves each link target via a `Map<title|basename, targetPath>`
 * lookup table built once at the start (O(1) per link, vs the
 * previous O(N) Array.find), and records `sourcePath → [targetPath]`
 * for each match.
 *
 * Pure: no IO, no yield, no global state. Suitable for unit tests.
 * The caller is responsible for filtering pages to the dedup-eligible
 * set (entities / concepts / sources/) before calling.
 */
export function buildIncomingLinkIndex(
  pages: Array<{ path: string; content: string; title: string }>,
): Map<string, string[]> {
  const titleToPath = new Map<string, string>();
  const basenameToPath = new Map<string, string>();
  for (const p of pages) {
    titleToPath.set(p.title, p.path);
    const basename = p.path.split('/').pop()?.replace(/\.md$/, '') ?? '';
    basenameToPath.set(basename, p.path);
  }

  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  const incoming = new Map<string, string[]>();
  for (const source of pages) {
    const targets: string[] = [];
    const seenTargets = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(source.content)) !== null) {
      const linkText = match[1].trim();
      const targetPath =
        titleToPath.get(linkText) ??
        basenameToPath.get(linkText.replace(/\.md$/, ''));
      if (!targetPath || targetPath === source.path) continue;
      if (seenTargets.has(targetPath)) continue;
      seenTargets.add(targetPath);
      targets.push(targetPath);
    }
    if (targets.length > 0) incoming.set(source.path, targets);
  }
  return incoming;
}

export async function generateDuplicateCandidates(
  pages: Array<{ path: string; content: string; title: string }>,
  options: Partial<DuplicateDetectionThresholds> = {},
  hooks: DuplicateCandidateHooks = {},
  // v1.26.0 (#382 item 1, Batch 2): optional incoming-link reverse
  // index passed through to partitionPagesMultiBucket. When provided,
  // the ic: bucket dimension is populated. When omitted (legacy callers
  // + unit tests), only tp: + lh: dimensions fire.
  incomingIndex?: Map<string, string[]>,
): Promise<DuplicateCandidate[]> {
  const thresholds = {
    jaccardLinkThreshold: resolveThreshold(
      options.jaccardLinkThreshold,
      DEFAULT_DEDUP_THRESHOLDS.jaccardLinkThreshold,
    ),
    jaccardBodyGate: resolveThreshold(
      options.jaccardBodyGate,
      DEFAULT_DEDUP_THRESHOLDS.jaccardBodyGate,
    ),
    bigramThreshold: resolveThreshold(
      options.bigramThreshold,
      DEFAULT_DEDUP_THRESHOLDS.bigramThreshold,
    ),
  };

  const metas: LintPageMeta[] = [];
  const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    if (i > 0 && i % LINT_YIELD_EVERY_PHASE1 === 0) {
      await new Promise(resolve => window.setTimeout(resolve, 0));
    }

    const fm = parseFrontmatter(page.content);
    const aliases = Array.isArray(fm?.aliases) ? fm.aliases : [];

    const links = new Set<string>();
    const body = page.content.replace(/---[\s\S]*?---/, '');
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(body)) !== null) {
      links.add(match[1].trim().toLowerCase());
    }

    // Strip wiki links before computing body words so link text doesn't inflate similarity
    const bodyText = body.replace(/\[\[[^\]]+\]\]/g, '');
    const bodyWords = bodyWordSet(bodyText);
    // v1.26.0 (#382 item 1, Batch 2): body fingerprint for the
    // sourceFingerprint signal. Reuses the already-stripped `body`
    // (avoids a second frontmatter-strip pass per page). `hashBody`
    // internally re-trims + whitespace-collapses, so we pass the raw
    // already-extracted body. Source↔source pairs whose bodies hash
    // to the same value are the only ones the sourceFingerprint
    // signal promotes to tier-1.
    const bodyFingerprint = hashBody(body);

    metas.push({
      path: page.path,
      title: page.title,
      aliases,
      links,
      bodyWords,
      bodyFingerprint,
      // v1.26.0 (#382 item 1, Batch 2): filled in below from
      // `incomingIndex` after the setup loop. Default empty here;
      // the populate step overwrites for pages that appear as targets
      // in the reverse index.
      incomingSources: new Set<string>(),
    });
  }

  // v1.26.0 (#382 item 1, Batch 2): populate `incomingSources` from
  // the reverse index. Walks `incomingIndex` once; for each source
  // path → target paths list, adds the source path to each target
  // page's incomingSources set. O(targets × avg-incoming) ≈ O(N × L)
  // where L = avg incoming links per page — bounded by user count.
  if (incomingIndex) {
    const pathToMeta = new Map(metas.map(m => [m.path, m]));
    for (const [sourcePath, targets] of incomingIndex) {
      for (const targetPath of targets) {
        const targetMeta = pathToMeta.get(targetPath);
        if (targetMeta) targetMeta.incomingSources.add(sourcePath);
      }
    }
  }

  const candidates = new Map<string, DuplicateCandidate>();
  // B3 (v1.26.3 PATCH, DocT CR): count rejected cross-type pairs so the
  // filter's effect is measurable (emitted via hooks.onCrossTypeRejected).
  let crossTypeRejected = 0;

  const addCandidate = (pathA: string, pathB: string, reason: string, signal: DuplicateCandidate['signal'], score: number) => {
    // B3 (v1.26.3 PATCH): reject forbidden cross-type
    // pairs at injection time so the LLM verify batch never sees
    // "is this entity page a duplicate of this source page?" — that
    // question is meaningless per the #358 complementary memory model
    // (a source that mentions an entity by name is not a duplicate of
    // the entity). The pre-B3 dedup docstring
    // (dedup-phase.ts:132-151) explicitly admitted this leakage: only
    // the sourceFingerprint signal was suppressed for cross-type, and
    // only because body-hash equality is rare. The remaining three
    // signals (sharedLinks / bigramCrossLang / caseVariant) fired
    // regardless of page type, polluting every other lint run on
    // vaults with mixed content folders.
    const typeA = pageTypeOf(pathA);
    const typeB = pageTypeOf(pathB);
    if (!isCrossTypePairAllowed(typeA, typeB)) {
      crossTypeRejected++;
      return;
    }
    const key = [pathA, pathB].sort().join('|||');
    if (!candidates.has(key)) {
      candidates.set(key, { target: pathA, source: pathB, reason, signal, score });
    } else if (score >= candidates.get(key)!.score) {
      // v1.26.0 (#382 item 1, Batch 2): use `>=` not `>` so that signals
      // later in runSignalsForBucket (e.g. sourceFingerprint) win over
      // earlier ones with equal score (e.g. sharedLinks jaccard=1.0 when
      // two sources share a [[link]]). The signal ordering is itself a
      // priority order — sourceFingerprint is the most deterministic and
      // should always be reported when it fires.
      candidates.set(key, { target: pathA, source: pathB, reason, signal, score });
    }
  };

  const comparisonCountRef = { n: 0 };

  // v1.26.0 (#382 item 3, Batch 1): bucketed dedup. Previously each of
  // the three signals ran an O(N²) double for-loop across all pages; at
  // 2000 pages the candidates Map could blow up to O(N²) entries before
  // the LLM batch cap (500) trimmed it, causing OOMs on large vaults.
  //
  // Instead, we partition pages into dual-key buckets (tp:<title-prefix>
  // + lh:<link-hash>) and run the three signals inside each bucket.
  // Bucket-internal pair counts are ΣB² ≪ N²; cross-bucket pairs that
  // share an outgoing hub link still get caught via the lh: dimension.
  // The three existing signals are unchanged — they just operate on a
  // smaller slice now. Recall is preserved at 97-98%; see the Batch 1
  // plan in memory for the analysis.
  //
  // NOTE: `comparisonCount` is cumulative across all buckets — it is
  // NOT reset between buckets. This means the LINT_YIELD_EVERY_COMPARISON
  // cadence (every 500 comparisons) fires globally, not per-bucket.
  // For Latin-script wikis this matches the old behaviour because most
  // pages land in large buckets where the counter advances quickly;
  // for CJK wikis where most buckets hold 1-2 pages the counter only
  // advances through the bucket boundary, so yield cadence inside a
  // bucket is effectively unbounded. Phase 1 still uses its own
  // LINT_YIELD_EVERY_PHASE1 cadence.
  //
  // Performance expectation:
  //   - Time: O(ΣB²) ≤ O(N²), typically O(N²/k) for k ~ 50 buckets.
  //   - Memory: candidates Map size grows monotonically across all
  //     buckets — it is NOT drained per-bucket. The peak is bounded
  //     by the total number of distinct pairs the bucketed path can
  //     surface, which is much smaller than the N² pair count the old
  //     flat O(N²) loop considered. addCandidate's key collision logic
  //     deduplicates pairs that share both a tp: and an lh: bucket.
  const buckets = partitionPagesMultiBucket(metas, incomingIndex);

  for (const [bucketKey, bucketPages] of buckets) {
    // v1.26.0 (#382 item 3, Batch 1): cancellation boundary. Letting
    // a single bucket drain its O(B²) pair fan-out can take seconds on
    // a large vault; invoking the hook at every non-empty bucket
    // boundary (including singletons — long vault-wide scans can have
    // many tiny buckets) gives the caller a chance to abort before
    // the next bucket starts.
    hooks.checkCancelled?.();

    if (bucketPages.length < 2) continue;
    await new Promise(resolve => window.setTimeout(resolve, 0));
    // v1.26.0 (#382 item 1, Batch 2): pass bucket key so signals that
    // are dimension-specific (ic: only) can short-circuit on tp:/lh:
    // buckets without running O(B²) pair loops over them.
    await runSignalsForBucket(bucketPages, thresholds, addCandidate, comparisonCountRef, bucketKey);
  }

  // B3 (v1.26.3 PATCH, DocT CR): surface the rejected count once, so the
  // filter's effect is measurable in the caller's dedup debug output.
  if (crossTypeRejected > 0) {
    hooks.onCrossTypeRejected?.(crossTypeRejected);
  }

  return Array.from(candidates.values());
}

// v1.26.0 (#382 item 3, Batch 1): encapsulate the three duplicate-detection
// signals for a single bucket. Each signal is its own pair loop with
// its own yield cadence (cumulative via comparisonCountRef.n). Splitting
// the signals into named helpers makes it cheap to add a 4th signal later
// and keeps the bucket-iteration shell in generateDuplicateCandidates
// to ~5 lines.
//
// Signal summary (pre-refactor order preserved):
//   1. Shared outgoing wiki-links (Jaccard on link sets, gated by body
//      similarity) — the only signal sensitive to the lh: link-hash
//      bucket dimension.
//   2. Character bigram Jaccard on titles/aliases (catches spelling
//      variants) AND cross-language alias match — both signals fit the
//      same pair loop because they share the namesA/namesB derivations.
//   3. Case-variant title collision — title-cased-only check, no body /
//      link / alias involvement. Runs without yielding because each
//      comparison is a single toLowerCase() and a string equality test.
//   4. Source fingerprint (v1.26.0 #382 item 1, Batch 2) — body-hash
//      equality between two pages. Fires deterministically when two
//      source pages have identical bodies, regardless of title / alias /
//      boilerplate. The other three signals are deliberately permissive
//      on sources because every source shares boilerplate (URLs,
//      citation footers) that drives bigram scores up; fingerprint is the
//      only signal that proves two sources are content-identical rather
//      than topic-adjacent.
async function runSignalsForBucket(
  bucketPages: LintPageMeta[],
  thresholds: Required<DuplicateDetectionThresholds>,
  addCandidate: (
    pathA: string,
    pathB: string,
    reason: string,
    signal: DuplicateCandidate['signal'],
    score: number,
  ) => void,
  comparisonCountRef: { n: number },
  // v1.26.0 (#382 item 1, Batch 2): bucket key passed in so signals
  // that are dimension-specific (ic: only) can skip tp:/lh: buckets
  // without running their pair loops over them.
  bucketKey: string,
): Promise<void> {
  await runSharedLinksSignal(bucketPages, thresholds, addCandidate, comparisonCountRef);
  await runBigramCrossLangSignal(bucketPages, thresholds, addCandidate, comparisonCountRef);
  // v1.26.0 (#382 item 1, Batch 2): sharedIncoming only fires in ic:
  // buckets — every other dimension has empty incomingSources on the
  // pages, so the signal would be a no-op anyway. Gating here avoids
  // the wasted O(B²) loop + yield-counting in tp:/lh: buckets.
  if (bucketKey.startsWith('ic:')) {
    await runSharedIncomingSignal(bucketPages, addCandidate, comparisonCountRef);
  }
  // v1.26.0 (#382 item 1, Batch 2): sourceFingerprint is bucket-agnostic
  // (group-by-fingerprint produces the same result regardless of which
  // bucket the pages share). Running it once outside the bucket loop
  // would be optimal, but to keep Batch 2 scoped we gate it to ic:
  // buckets where it's most useful (sources co-cited by a hub). In
  // tp:/lh: buckets the signal still fires, but its group-by work is
  // cheap (O(B) per bucket) so the cost is negligible.
  runSourceFingerprintSignal(bucketPages, addCandidate);
  runCaseVariantSignal(bucketPages, addCandidate);
}

// Cumulative comparison yield: increment the counter, yield every
// LINT_YIELD_EVERY_COMPARISON iterations. The counter is shared across
// all signals in all buckets — see the comment block in
// generateDuplicateCandidates for the rationale.
async function yieldForComparison(comparisonCountRef: { n: number }): Promise<void> {
  comparisonCountRef.n++;
  if (comparisonCountRef.n % LINT_YIELD_EVERY_COMPARISON === 0) {
    await new Promise(resolve => window.setTimeout(resolve, 0));
  }
}

async function runSharedLinksSignal(
  bucketPages: LintPageMeta[],
  thresholds: Required<DuplicateDetectionThresholds>,
  addCandidate: (
    pathA: string,
    pathB: string,
    reason: string,
    signal: DuplicateCandidate['signal'],
    score: number,
  ) => void,
  comparisonCountRef: { n: number },
): Promise<void> {
  for (let i = 0; i < bucketPages.length; i++) {
    for (let j = i + 1; j < bucketPages.length; j++) {
      await yieldForComparison(comparisonCountRef);

      const a = bucketPages[i], b = bucketPages[j];
      if (a.links.size === 0 || b.links.size === 0) continue;
      const jaccard = computeJaccard(a.links, b.links);
      if (jaccard >= thresholds.jaccardLinkThreshold) {
        // Body similarity gate: pages with different content are not duplicates
        // even if they share the same set of wiki-links (e.g., two unrelated pages
        // both linking only to one popular hub page).
        const bodySim = computeJaccard(a.bodyWords, b.bodyWords);
        if (bodySim < thresholds.jaccardBodyGate) continue;
        addCandidate(a.path, b.path, `Shared wiki-links (${Math.round(jaccard * 100)}% overlap)`, 'sharedLinks', jaccard);
      }
    }
  }
}

// v1.26.0 (#382 item 1, Batch 2): sharedIncoming signal. Fires inside
// the ic: bucket dimension — two pages that share an incoming source
// (i.e. both cited by the same page) get a Jaccard score on their
// incoming-source sets. Pages with identical incoming-source sets are
// near-certain semantic duplicates (they're two surfaces of the same
// topic from the same referrer's perspective).
//
// Uses a fixed threshold LINT_DEDUP_INCOMING_LINK_THRESHOLD (0.3) rather
// than a settings field — same rationale as LINT_DEDUP_BIGRAM_TIER1_CUTOFF.
async function runSharedIncomingSignal(
  bucketPages: LintPageMeta[],
  addCandidate: (
    pathA: string,
    pathB: string,
    reason: string,
    signal: DuplicateCandidate['signal'],
    score: number,
  ) => void,
  comparisonCountRef: { n: number },
): Promise<void> {
  for (let i = 0; i < bucketPages.length; i++) {
    for (let j = i + 1; j < bucketPages.length; j++) {
      await yieldForComparison(comparisonCountRef);

      const a = bucketPages[i], b = bucketPages[j];
      // Defensive: the partition only puts pages with shared incoming
      // sources in the same ic: bucket, so empty incoming sets should
      // not appear here. The empty-set skip avoids divide-by-zero in
      // computeJaccard and keeps the signal a no-op on legacy buckets
      // (tp: + lh:) that don't carry incoming-source information.
      if (a.incomingSources.size === 0 || b.incomingSources.size === 0) continue;
      const jaccard = computeJaccard(a.incomingSources, b.incomingSources);
      if (jaccard >= LINT_DEDUP_INCOMING_LINK_THRESHOLD) {
        addCandidate(
          a.path,
          b.path,
          `Shared incoming sources (${Math.round(jaccard * 100)}% overlap)`,
          'sharedIncoming',
          jaccard,
        );
      }
    }
  }
}

async function runBigramCrossLangSignal(
  bucketPages: LintPageMeta[],
  thresholds: Required<DuplicateDetectionThresholds>,
  addCandidate: (
    pathA: string,
    pathB: string,
    reason: string,
    signal: DuplicateCandidate['signal'],
    score: number,
  ) => void,
  comparisonCountRef: { n: number },
): Promise<void> {
  for (let i = 0; i < bucketPages.length; i++) {
    for (let j = i + 1; j < bucketPages.length; j++) {
      await yieldForComparison(comparisonCountRef);

      const a = bucketPages[i], b = bucketPages[j];
      const namesA = [a.title, ...a.aliases];
      const namesB = [b.title, ...b.aliases];

      // 2a: Bigram similarity on all names (titles + aliases)
      let maxSim = 0;
      for (const nameA of namesA) {
        for (const nameB of namesB) {
          const sim = computeJaccard(bigrams(nameA), bigrams(nameB));
          if (sim > maxSim) maxSim = sim;
        }
      }
      if (maxSim >= thresholds.bigramThreshold) {
        addCandidate(a.path, b.path, `Title/alias similarity (${Math.round(maxSim * 100)}% match)`, 'bigram', maxSim);
      }

      // 2b: Cross-language alias match
      const normalizedNamesA = namesA.map(n => normalizeForMatch(n));
      const normalizedAliasesB = b.aliases.map(n => normalizeForMatch(n));
      const normalizedTitleB = normalizeForMatch(b.title);

      let crossLangMatch = false;
      for (const normA of normalizedNamesA) {
        if (normA && (normalizedAliasesB.includes(normA) || normalizedTitleB === normA)) {
          addCandidate(a.path, b.path, 'Cross-language match (alias or title overlap)', 'crossLang', 1.0);
          crossLangMatch = true;
          break;
        }
      }

      if (!crossLangMatch) {
        const normalizedNamesB = namesB.map(n => normalizeForMatch(n));
        const normalizedAliasesA = a.aliases.map(n => normalizeForMatch(n));
        const normalizedTitleA = normalizeForMatch(a.title);

        for (const normB of normalizedNamesB) {
          if (normB && (normalizedAliasesA.includes(normB) || normalizedTitleA === normB)) {
            addCandidate(a.path, b.path, 'Cross-language match (alias or title overlap)', 'crossLang', 1.0);
            break;
          }
        }
      }
    }
  }
}

// Signal 3: Case-variant title collision.
// Two pages whose titles differ only in casing are highly likely duplicates.
// e.g., "Unix" vs "unix", "Claude Code" vs "claude-code"
// Runs without yielding: each pair is a single toLowerCase + string compare.
function runCaseVariantSignal(
  bucketPages: LintPageMeta[],
  addCandidate: (
    pathA: string,
    pathB: string,
    reason: string,
    signal: DuplicateCandidate['signal'],
    score: number,
  ) => void,
): void {
  for (let i = 0; i < bucketPages.length; i++) {
    for (let j = i + 1; j < bucketPages.length; j++) {
      const a = bucketPages[i], b = bucketPages[j];
      const lowerA = a.title.toLowerCase();
      const lowerB = b.title.toLowerCase();
      if (lowerA === lowerB && a.title !== b.title) {
        // Always pick lowercase-as-slug as target (deterministic merge direction)
        const [canonical, variant] = a.title < b.title ? [a, b] : [b, a];
        addCandidate(canonical.path, variant.path,
          `Case-variant duplicate: "${a.title}" ↔ "${b.title}"`, 'caseVariant', 0.9);
      }
    }
  }
}

// Signal 4 (v1.26.0 #382 item 1, Batch 2): source fingerprint.
// Two pages whose bodies hash to the same fingerprint are content-identical.
// This is the ONLY signal that fires when two source pages are byte-for-byte
// identical but differ in title (a user renamed one, or two separate ingests
// of the same article landed with different filenames). The bigram and
// sharedLinks signals still fire too, but sourceFingerprint wins by score
// because it is the deterministic proof of duplication.
//
// Skipped when bodyFingerprint is empty (a degenerate case where the page
// had no extractable body — extremely rare in practice; partition unit tests
// construct LintPageMeta directly without a body hash).
//
// Implementation note: instead of an O(B²) pair loop that runs in EVERY
// bucket (tp: + every lh: hub), we group pages by fingerprint once per
// bucket in O(B) and emit candidates only for groups with size >= 2.
// This collapses the work in the common case (no fingerprint matches)
// from O(B²) to O(B). Buckets where many pages share an outgoing hub
// (lh: hubs, sometimes 30+ pages) benefit the most.
function runSourceFingerprintSignal(
  bucketPages: LintPageMeta[],
  addCandidate: (
    pathA: string,
    pathB: string,
    reason: string,
    signal: DuplicateCandidate['signal'],
    score: number,
  ) => void,
): void {
  const groups = new Map<string, LintPageMeta[]>();
  for (const meta of bucketPages) {
    if (!meta.bodyFingerprint) continue;
    const existing = groups.get(meta.bodyFingerprint);
    if (existing) existing.push(meta);
    else groups.set(meta.bodyFingerprint, [meta]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        // Deterministic ordering: lower path first as the target.
        const [target, src] = a.path < b.path ? [a, b] : [b, a];
        addCandidate(
          target.path,
          src.path,
          `Identical source body (fingerprint match)`,
          'sourceFingerprint',
          1.0,
        );
      }
    }
  }
}
