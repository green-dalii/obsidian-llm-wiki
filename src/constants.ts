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
 * configured LLM provider's native document-input capability.
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
 * Token budget for query LLM selection (Layer 2/3).
 *
 * v1.24.1 PATCH Phase 5.5.0: already 3000 from a prior cycle; unchanged.
 * (Earlier note incorrectly said raise to 2000 — that would have been
 * a regression. The user constraint is "only raise, never lower".)
 */
export const TOKENS_QUERY_LLM_SELECT = 3000;

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
