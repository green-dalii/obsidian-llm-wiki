/**
 * Centralized constants for the LLM Wiki plugin.
 *
 * Every magic number or string that is shared across ≥2 files MUST live here.
 * Single-file-local values (e.g. a max_tokens: 150 in a specific query step)
 * are documented with comments at their call site, not extracted.
 *
 * Replaces scattered magic strings/numbers with named constants for
 * maintainability, discoverability, and type safety.
 */

// ============================================================================
// Wiki Folder Structure
// ============================================================================

/** Standard subfolder names within the Wiki folder. */
export const WIKI_SUBFOLDERS = {
  entities: 'entities',
  concepts: 'concepts',
  sources: 'sources',
} as const;

// ============================================================================
// Source Ingestion
// ============================================================================

/**
 * File extensions (lowercase, no dot) accepted by the ingestion gate (#164).
 * Text sources are read directly; PDF sources are transcribed through the
 * configured LLM provider's native document-input capability (v1.25.0 PR2).
 */
export const COMPATIBLE_SOURCE_EXTENSIONS = ['md', 'markdown', 'txt', 'text', 'pdf'] as const;

// ============================================================================
// Lint & Performance Thresholds
// ============================================================================

/** Minimum substantive body content for a page to be considered non-empty. */
export const MIN_SUBSTANTIVE_CHARS = 50;

/** TTL for cached existing Wiki page list (milliseconds). */
export const PAGES_CACHE_TTL_MS = 5000;

// ============================================================================
// Custom Granularity Limits
// ============================================================================

/** Maximum custom entity/concept limit per type (settings UI cap). */
export const CUSTOM_LIMIT_MAX = 500;

// ============================================================================
// Batch Processing Settings
// ============================================================================

/**
 * Maximum user-configurable inter-batch delay (ms) in the provider settings
 * slider. Caps both the settings UI input and the rate-limit detector's
 * suggested-delay growth.
 */
export const MAX_BATCH_DELAY_MS = 10000;

/**
 * Default retry backoff (ms) used by `runBatchedWithRetry` when a caller
 * does not pass an explicit `apiDelayMs`. Distinct from `MAX_BATCH_DELAY_MS`:
 * this is the one-shot sleep before the *single retry* of a transiently
 * failed batch task, not the inter-batch delay.
 *
 * Kept at 2s because most production callers (`wiki-engine.ts` page-gen +
 * related-page paths) omit `apiDelayMs` and rely on this fallback. Raising
 * it would silently delay every transiently-failing batch by 8 extra
 * seconds with no user-visible benefit on healthy providers.
 */
export const DEFAULT_API_RETRY_DELAY_MS = 2000;

// ============================================================================
// PDF Source Ingestion (v1.25.0)
// ============================================================================

/** Max output tokens the LLM may emit when converting a PDF to Markdown.
 *  Sized for typical research papers (5-30 pages) without truncation. */
export const TOKENS_PDF_CONVERSION = 8000;

/** Default TTL for cached PDF→Markdown conversion entries (30 days, ms). */
export const PDF_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Cache growth hard caps (v1.25.0 PR2 redo — three-defense-layer design).
 *
 * - MAX_BYTES: total disk usage cap (100 MB ≈ 1000 typical papers).
 * - MAX_ENTRIES: entry count cap. Lower bound on Obsidian startup scan time.
 * - MAX_SINGLE_ENTRY_BYTES: rejects writes for oversized single entries so
 *   one giant PDF (e.g. 500-page textbook → ~50 MB markdown) cannot hog
 *   the cache. Cache is performance-only; caller still gets the conversion.
 */
export const PDF_CACHE_MAX_BYTES = 100 * 1024 * 1024;
export const PDF_CACHE_MAX_ENTRIES = 1000;
export const PDF_CACHE_MAX_SINGLE_ENTRY_BYTES = 10 * 1024 * 1024;

/** Official MinerU Precision API root. Signed upload/download URLs are opaque. */
export const MINERU_API_BASE_URL = 'https://mineru.net/api/v4';

/** Maximum retries per MinerU HTTP stage, excluding the initial request. */
export const MINERU_MAX_RETRIES = 3;

/** Base delay for MinerU exponential retry backoff. */
export const MINERU_RETRY_BASE_DELAY_MS = 1000;

/** Delay between MinerU extraction status polls. */
export const MINERU_POLL_INTERVAL_MS = 2000;

/** Provider IDs whose built-in clients support PDF natively (v1.25.0 PR1).
 *  Providers NOT in this list fall through to the `forcePdfSupport`
 *  universal escape hatch (user opt-in) — see `core/pdf-converter.ts`. */
export const NATIVE_PDF_PROVIDER_IDS = [
  'anthropic',
  'openai',
  'bedrock-anthropic',
  'bedrock-openai',
] as const;

/** Minimum custom entity/concept limit per type. */
export const CUSTOM_LIMIT_MIN = 1;

/** Maximum batch size for custom granularity (LLM quality ceiling). */
export const CUSTOM_BATCH_SIZE_MAX = 50;

/** Minimum batch size for custom granularity (below this, use default config). */
export const CUSTOM_BATCH_SIZE_MIN = 10;

/** Tokens per item budget for dynamic max_tokens scaling in source analysis.
 *  Derived from observed output: 49 items ≈ 12K tokens → ~245 tokens/item.
 *  400 provides ~60% headroom for verbose summaries + JSON overhead. */
export const TOKENS_PER_ITEM_BUDGET = 400;

/** Retry cap multiplier for truncation retry in source analysis.
 *  Actual retry: ONE double-up (20K → 40K). The multiplier sets the cap
 *  so the retry never exceeds 3× base (60K), preventing runaway token use. */
export const SOURCE_ANALYZER_RETRY_MULTIPLIER = 3;

// ============================================================================
// LLM Token Budgets — semantic groups
// ============================================================================

/**
 * Maximum total tokens per LLM batch call.
 * Used for iterative source extraction and llm-client truncation retry cap.
 */
export const MAX_TOKENS_BATCH = 16000;

/**
 * Token budget for full page generation (entity/concept/source-summary).
 * The LLM is asked to produce a complete wiki page with all sections.
 */
export const TOKENS_PAGE_GENERATION = 8000;

/**
 * Token budget for append-to-reviewed-page (incremental short addition).
 */
export const TOKENS_APPEND_REVIEWED = 4000;

/**
 * Token budget for contradiction recording output.
 */
export const TOKENS_CONTRADICTION = 4000;

/**
 * Token budget for conversation summary extraction.
 */
export const TOKENS_CONVERSATION_EXTRACTION = 5000;

/**
 * Token budget for conversation summary page generation.
 */
export const TOKENS_CONVERSATION_PAGE = 8000;

/**
 * Token budget for entity dedup resolution (lightweight matching prompt).
 * Sized for short JSON output (action + path) with headroom for thinking-model
 * preamble that may consume part of the budget.
 */
export const TOKENS_DEDUP_RESOLUTION = 1000;

/**
 * v1.26.0 patch 16 (PR #357) — token budget for the source-lemma type
 * classification call (`SourceAnalyzer.classifyLemmaType`). The model returns
 * `{"kind": "entity"}` or `{"kind": "concept"}` — a two-class label — but
 * thinking-model preambles regularly consume the headroom, so we sit above
 * `TOKENS_DEDUP_RESOLUTION` (1000) and match `TOKENS_QUERY_MODEL_DETECT`
 * (2000) which has the same short-JSON, no-thinking-budget pattern. 32
 * (the original value) is unreachable for any thinking-capable model.
 */
export const TOKENS_LEMMA_CLASSIFY = 2000;

/**
 * Max candidate pages shown to the LLM in the semantic dedup prompt.
 * The full same-type list grows with the vault (~77K chars at ~1285
 * entities) and the call is prefill-bound; the top-K keyword pre-filter
 * keeps the prompt flat. When the candidate's name shares no token with
 * any page (translations, initialisms) the full list is sent instead —
 * recall over cost. Raise K rather than weaken that fallback.
 */
export const DEDUP_CANDIDATE_TOP_K = 30;

/**
 * v1.24.0 #216 — max tokens for the merge triage pre-flight classification.
 *
 * v1.24.0 Tier-2 (commit ab23bc0 + amend): the triage output now includes
 * a structured `items[]` array for the complementary path, with each
 * item carrying `content` (the new fact) + `target_section` (the localized
 * section label) + `reason`. A typical Tier-2 output with 2-3 items in
 * Chinese easily runs to 500-900 tokens; e2e observed heavy truncation
 * at 200 tokens with `{"strategy":` cut off mid-JSON. 2000 gives ample
 * headroom for both Tier-1 (compact) and Tier-2 (verbose) outputs.
 */
export const TOKENS_MERGE_TRIAGE = 2000;

/**
 * v1.24.0 #216 Tier-2 — max tokens for a single per-section append call.
 * The complementary path appends one paragraph per target section; the
 * LLM is given (existingSectionContent + 1-N new facts) and must return
 * just the appended paragraphs. 600 tokens covers ~3 paragraphs of
 * markdown per section comfortably.
 */
export const TOKENS_COMPLEMENTARY_APPEND = 600;

/**
 * Token budget for lint alias completion batch.
 */
export const TOKENS_LINT_ALIAS_BATCH = 500;

/**
 * Token budget for lint duplicate detection LLM check.
 */
export const TOKENS_LINT_DEDUP_LLM = 4000;

/**
 * Token budget for lint dead link / orphan / empty page fixes.
 */
export const TOKENS_LINT_PAGE_FIX = 8000;

/**
 * Token budget for lint orphan link fix (shorter prompt).
 */
export const TOKENS_LINT_ORPHAN_FIX = 800;

/**
 * Token budget for query step 0 (model detection, tiny call).
 *
 * v1.24.1 PATCH Phase 5.5.0: raised 100 → 2000. Some providers' reasoning
 * models consume the entire budget on the internal chain-of-thought and
 * leave 0 tokens for the actual response body (a known DeepSeek V3 bug
 * reported 2026-07-13). Widening the budget to 2000 lets the JSON output
 * fit even after a verbose reasoning prelude.
 */
export const TOKENS_QUERY_MODEL_DETECT = 2000;

/**
 * Token budget for query page selection via LLM.
 *
 * v1.24.1 PATCH Phase 5.5.0: raised 500 → 2000. Same rationale as
 * TOKENS_QUERY_MODEL_DETECT — DeepSeek V3 reasoning can swallow the
 * previous budget before emitting JSON output.
 */
export const TOKENS_QUERY_PAGE_SELECT = 2000;

/**
 * Output budget for the final conversational answer in the Query flow.
 *
 * The Query flow used to reuse a 3000-token budget named for the internal
 * page-selection step. On reasoning models the chain of thought is billed
 * against the same budget and routinely consumes a third to a half of it, so
 * the visible answer was cut mid-sentence.
 */
export const TOKENS_QUERY_ANSWER = 8000;

/**
 * Token budget for query suggest-save dedup check.
 *
 * v1.24.1 PATCH Phase 5.5.0: raised 300 → 2000. Same rationale.
 */
export const TOKENS_QUERY_SAVE_DEDUP = 2000;

/**
 * v1.24.1 PATCH Phase 5.5.0 (new): token budget for the seed-selection
 * step where the LLM picks up to 3 PPR seed pages from a 50-page
 * (path, summary) list. Previously hardcoded at 200 in seed-selector.ts
 * which was the root cause of the persistent empty-body bug on DeepSeek
 * V3 — the 200-token budget was consumed by reasoning and the JSON
 * body never made it out. Set equal to the other Query budgets (2000)
 * for consistency.
 */
export const TOKENS_QUERY_SEED_SELECT = 2000;

/**
 * v1.24.1 PATCH Phase 5.5.1 (new): token budget for the Stage 1.5a
 * query keyword extractor. The LLM returns 5-10 short keywords as a
 * small JSON array — no need for a large budget. 1000 is enough for
 * the JSON output + any reasoning preamble for thinking models.
 *
 * Used by `generateQueryKeywords` in query-keywords.ts.
 */
export const TOKENS_QUERY_KEYWORDS = 1000;

/**
 * Token budget for schema suggestion generation.
 */
export const TOKENS_SCHEMA_SUGGESTION = 4096;

/**
 * Character limit per wiki page loaded into the query engine context.
 * Derived from MAX_TOKENS_BATCH / 5 (~3200 tokens) × 4 chars/token ≈ 12800 chars.
 * Prevents merged multi-source pages from bloating the LLM context.
 */
export const MAX_PAGE_CONTENT_CHARS = 12800;

// ============================================================================
// LLM Client Settings
// ============================================================================

/** Maximum retries on HTTP 5xx/429 errors. Exponential backoff: delay = base * 2^attempt. */
export const MAX_RETRIES = 2;

/** Base delay (ms) for retry exponential backoff. */
export const RETRY_BASE_DELAY_MS = 1000;

// ============================================================================
// Notice Durations (ms) — semantic groups
// ============================================================================

/** Brief transient feedback (2000ms) — history cleared, setting saved, trivial ops. */
export const NOTICE_BRIEF = 2000;

/** Short transient feedback (3000ms) — auto-maintain triggers, range clamps, save confirm. */
export const NOTICE_SHORT = 3000;

/** Watcher notification (4000ms) — file watcher active notice. */
export const NOTICE_WATCHER = 4000;

/** Normal operation result (5000ms) — success messages, non-critical errors. */
export const NOTICE_NORMAL = 5000;

/** Progress cancellation (5000ms re-export) — semantic alias of NORMAL. */
export const NOTICE_CANCEL = 5000;

/** Operation abort feedback (6000ms) — intermediate step between normal and error. */
export const NOTICE_ABORT = 6000;

/** Error feedback (8000ms) — critical failures, user must read. */
export const NOTICE_ERROR = 8000;

/** Rate-limit feedback (10000ms) — long reading needed. */
export const NOTICE_RATE_LIMIT = 10000;

// ============================================================================
// UI Timings
// ============================================================================

/** Timer update interval for Query progress display (elapsed time counter). */
export const TIMER_UPDATE_INTERVAL_MS = 1000;

/**
 * Event loop yield interval for async O(n²) operations.
 * Every N outer iterations, await a setTimeout(0) to prevent UI thread blocking.
 */
export const YIELD_EVERY_ITERATIONS = 200;

// ============================================================================
// Query Custom Instructions (Issue #251)
// ============================================================================

/**
 * Maximum length (chars) for the Issue #251 Custom Query Instructions
 * textarea. Defensive cap against users pasting huge blocks into the
 * system prompt area. Applied at the input layer AND at the injection
 * layer (defense in depth).
 */
export const CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS = 5000;

// ============================================================================
// Lint Performance Knobs — central tunables for lint scan O(n²) work
// ============================================================================

/**
 * Outer-loop yield cadence for lint duplicate-detection. Mirrors
 * YIELD_EVERY_ITERATIONS but kept separately so lint-tuning changes don't
 * risk spilling into other consumers (settings UI, wiki-engine status).
 */
export const LINT_YIELD_EVERY_OUTER = 200;

/**
 * Phase-1 (page parsing) yield cadence in duplicate-detection — finer than
 * the outer loop because parsing is cheap per item but the set accumulates.
 */
export const LINT_YIELD_EVERY_PHASE1 = 50;

/**
 * Comparison-phase yield cadence in duplicate-detection — coarser, since
 * O(n²) pair comparisons are CPU-bound per item.
 */
export const LINT_YIELD_EVERY_COMPARISON = 500;

/** Batch size for vault reads during lint preparation. */
export const LINT_PREP_BATCH_READ = 200;

/**
 * v1.26.0 (#382 item 2): Jaccard-similarity threshold for the "shared
 * outgoing wiki-links" signal in duplicate-detection. Two pages whose
 * outgoing `[[wiki-links]]` overlap by `>=` this fraction are flagged as
 * a `sharedLinks` candidate, subject to the body-similarity gate below.
 *
 * Calibrated against cross-vault wikis in `src/wiki/lint/duplicate-detection.ts`.
 * Lowering to ~0.3 surfaces more link-hub collisions; raising to ~0.5
 * narrows to true co-link clusters. Exposed in Auto Maintenance settings
 * (advanced-mode toggle) as `lintJaccardLinkThreshold`; leaving the input
 * blank = use this constant.
 */
export const LINT_DEDUP_JACCARD_LINK_THRESHOLD = 0.4;

/**
 * v1.26.0 (#382 item 2): body-similarity floor for the shared-links
 * signal. When two pages share outgoing wiki-links but their body-text
 * overlap is `<` this fraction, they are NOT flagged as duplicates —
 * even pages with identical link graphs but unrelated prose should not
 * be merged (e.g. two unrelated pages both linking only to one popular
 * hub page).
 *
 * Calibrated against cross-vault wikis. Raise this if you see false
 * positives where two unrelated pages happen to link to the same hub.
 * Exposed in Auto Maintenance settings (advanced-mode toggle) as
 * `lintJaccardBodyGate`; leaving the input blank = use this constant.
 */
export const LINT_DEDUP_JACCARD_BODY_GATE = 0.2;

/**
 * v1.26.0 (#382 item 2): character-bigram Jaccard threshold for the
 * title/alias similarity signal. Title/alias pairs whose bigram set
 * overlap by `>=` this fraction are flagged as a `bigram` candidate
 * (catches spelling variants and same-language near-matches).
 *
 * Calibrated against cross-vault wikis. Lowering catches more spelling
 * variants and minor typos; raising requires near-identical titles.
 * Exposed in Auto Maintenance settings (advanced-mode toggle) as
 * `lintBigramThreshold`; leaving the input blank = use this constant.
 */
export const LINT_DEDUP_BIGRAM_THRESHOLD = 0.4;

/**
 * v1.26.0 (#382 item 2): bigram-score cutoff that decides whether a
 * `bigram` candidate is sent to the LLM as a Tier-1 (always verify)
 * or Tier-2 (fills the remaining token budget). Score `>=` this value
 * → Tier 1; below → Tier 2.
 *
 * INTENTIONALLY NOT EXPOSED as a settings field: the cutoff shapes
 * which generated candidates the LLM sees, which directly re-shapes
 * the LLM input distribution in ways that need release-time
 * verification (the LLM contract was verified against the default).
 * Bumping it without understanding the budget model would either flood
 * the LLM (cutoff too low) or silently drop candidates (cutoff too
 * high). If a per-vault override is needed in the future, expose it
 * with a stronger justification than "tunability".
 */
export const LINT_DEDUP_BIGRAM_TIER1_CUTOFF = 0.6;

// ============================================================================
// Amazon Bedrock Stage 1 (v1.24.1 PATCH) — bedrock-mantle endpoint
// ============================================================================

/**
 * AWS regions where Amazon Bedrock is currently available.
 * Source: https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html
 * Stage 1 supports 18 regions via the unified bedrock-mantle endpoint (no
 * regional variant suffix needed for Messages / Chat Completions endpoints).
 */
export const BEDROCK_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'eu-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ca-central-1',
  'sa-east-1',
] as const;

export type BedrockRegion = typeof BEDROCK_REGIONS[number];

/** Default region if user has not selected one. us-east-1 has the broadest model coverage. */
export const BEDROCK_DEFAULT_REGION: BedrockRegion = 'us-east-1';

/**
 * Returns the bedrock-mantle Anthropic Messages baseURL for the given region.
 * Per https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-mantle.html
 * the endpoint is region-scoped; bearer auth only; body schema is identical
 * to api.anthropic.com.
 */
export function bedrockMantleMessagesUrl(region: BedrockRegion): string {
  return `https://bedrock-mantle.${region}.api.aws`;
}

/**
 * Returns the bedrock-mantle OpenAI Chat Completions baseURL for the given
 * region. Same host as Messages, but the chat completions protocol lives
 * at the `/v1` prefix.
 */
export function bedrockMantleChatCompletionsUrl(region: BedrockRegion): string {
  return `https://bedrock-mantle.${region}.api.aws/v1`;
}

/**
 * Per-candidate token estimate for duplicate-detection prompt budget.
 * Each candidate ≈ 120 chars ≈ 30 tokens.
 */
export const LINT_CANDIDATE_TOKEN_ESTIMATE = 30;

/**
 * Input-token cap for a single lint LLM call (candidate batch prompt).
 * Leaves room for prompt + output in the model's context window.
 */
export const LINT_MAX_INPUT_TOKENS = 15000;

/** Number of candidates fed per lint dedup LLM call. */
export const LINT_DEDUP_BATCH_SIZE = 100;

// ============================================================================
// Query Wiki — PPR top-N page retrieval
// ============================================================================

/**
 * Default number of pages PPR returns for Query Wiki context assembly.
 *
 * v1.24.1 PATCH Phase 5.5.0: raised from 5 → 10 per user direction. With
 * only 5 pages the `5 pages · PPR` chip loses meaning on large vaults
 * (2137 nodes easily surface >5 relevant pages via PPR graph walk).
 * 10 strikes a balance — fuller context without blowing the typical
 * model's prompt window. Token overflow is handled by Phase 5.4's
 * graceful overflow fallback (auto-shrink + retry).
 *
 * Adaptive top-N (select-seeds.ts) computes the effective top-N as:
 *   effective = min(DEFAULT_QUERY_TOP_N_PAGES, totalPageRefs)
 * then clamped by MAX_QUERY_TOP_N_PAGES below. A small wiki (e.g.
 * 12 pages) returns all 12; a large wiki (2137 pages) returns 10.
 */
export const DEFAULT_QUERY_TOP_N_PAGES = 10;

/**
 * Hard cap on top-N regardless of wiki size. Defends against runaway
 * token cost on very large vaults even when the adaptive formula
 * would allow more. Phase 5.4 overflow fallback kicks in past this
 * point (shrinks pages instead of dropping them) so the user always
 * gets a result.
 */
export const MAX_QUERY_TOP_N_PAGES = 20;

// ============================================================================
// Query Wiki — 4-stage seed selection (Phase 5.5.0)
// ============================================================================

/**
 * Stage 1 (lex match) → Stage 1.5 (LLM seed selector) escalation threshold:
 * minimum number of lex hits required to trust the lex-only path.
 *
 * When the lex scorer finds at least this many matching pages, the
 * top-K of them become the PPR seeds directly (skipping the LLM
 * escalation). Below this count, the recall is considered too narrow
 * to be useful and we escalate to the LLM for semantic matching.
 *
 * v1.24.1 PATCH Phase 5.5.0: 3 is a sweet spot — fewer than 3 hits
 * can't reliably drive a PPR graph expansion; more than 3 hits and we
 * already have enough material to skip the LLM call (saves a network
 * round-trip).
 */
export const LEX_MATCH_MIN_COUNT = 3;

/**
 * Stage 1 (lex match) → Stage 1.5 (LLM seed selector) escalation threshold:
 * minimum top-hit score required to trust the lex-only path.
 *
 * Lex scoring (see lexMatchByTitleAndAliases in ppr-cascade.ts):
 *   - title hit:    3
 *   - alias hit:    2
 *   - summary hit:  1  (NB: not used by Stage 1, kept here for context)
 *
 * Score ≥ 5 ≈ "1 title hit + 1 alias hit" → multi-signal match, not a
 * single-particle substring. Single-signal hits (e.g. just an alias
 * match for "的") produce noisy results that PPR can't disambiguate.
 *
 * v1.24.1 PATCH Phase 5.5.0.
 */
export const LEX_MATCH_MIN_TOP_SCORE = 5;

/**
 * Stage FALLBACK seeds count: when both Stage 1 (lex) and Stage 1.5
 * (LLM seed selector) fail to produce query-relevant seeds, use the
 * top-K lex pages as seeds anyway. PPR can still extract *some*
 * recall from low-quality seeds (better than no seeds → empty walk).
 *
 * v1.24.1 PATCH Phase 5.5.0. 5 is enough to give PPR enough graph
 * anchors without polluting the chat LLM's page-bodies set with
 * obviously-irrelevant pages.
 */
export const LEX_FALLBACK_TOP_K = 5;

/**
 * Stage 1.5 (LLM seed selector) input cap: maximum number of lex-
 * ranked candidate pages sent to the LLM for semantic seed selection.
 *
 * Why cap: the LLM's Stage 1.5 prompt only carries path + title +
 * aliases (no summary, no body — see seed-selector.ts). 50 pages of
 * that material ≈ 3-5K tokens, well inside any model's prompt
 * window. Larger caps dilute the LLM's selection precision.
 *
 * v1.24.1 PATCH Phase 5.5.0.
 */
export const QUERY_SEED_LLM_MAX_CANDIDATES = 50;

// ============================================================================
// Source-Analyzer / Page-Factory Batch Sizing
// ============================================================================

/**
 * Below this content size (chars), the analyzer auto-downgrades maxTotalItems
 * to avoid "hard digging" — a 6800-char source can't yield 50 wiki-worthy items.
 */
export const SHORT_CONTENT_THRESHOLD = 20000;

/**
 * Chars-per-item estimate used to cap maxTotalItems for short content.
 * Pairs with SHORT_CONTENT_THRESHOLD above.
 */
export const BATCH_CHARS_PER_ITEM = 600;

// ============================================================================
// Alias Hardening (v1.25.10 PATCH)
// ============================================================================

/**
 * Minimum length (chars, after trim) of an alias that the plugin will
 * ever accept on a wiki page. Single-character aliases are dropped at
 * the `filterRedundantAliases` gate because they carry no dedup value
 * above the page basename and collide with shorthand tokens across
 * the entire vault (`a` is a real proposal from small LLMs).
 *
 * Tuned to 2 so common short abbreviations stay usable: ML, HD, CD,
 * AI, UI, OS, DB, ... are real-world aliases for technical vaults
 * and rejecting them at the floor would be over-aggressive. Raise to
 * 3 only if a specific vault surfaces alias clutter.
 *
 * Not exposed as a Settings field in v1.25.10. The constant lives
 * here so future per-vault tuning is a one-line edit, not a search
 * across the codebase.
 */
export const MIN_ALIAS_LENGTH = 2;
