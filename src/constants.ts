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
// Lint & Performance Thresholds
// ============================================================================

/** Minimum substantive body content for a page to be considered non-empty. */
export const MIN_SUBSTANTIVE_CHARS = 50;

/** TTL for cached existing Wiki page list (milliseconds). */
export const PAGES_CACHE_TTL_MS = 5000;

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
 * Token budget for page merge operations (two pages fused).
 */
export const TOKENS_PAGE_MERGE = 8000;

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
 */
export const TOKENS_DEDUP_RESOLUTION = 300;

/**
 * Token budget for related page update (incremental link update).
 */
export const TOKENS_RELATED_UPDATE = 8000;

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
 */
export const TOKENS_QUERY_MODEL_DETECT = 100;

/**
 * Token budget for query page selection via LLM.
 */
export const TOKENS_QUERY_PAGE_SELECT = 500;

/**
 * Token budget for query LLM selection (Layer 2/3).
 */
export const TOKENS_QUERY_LLM_SELECT = 3000;

/**
 * Token budget for query suggest-save dedup check.
 */
export const TOKENS_QUERY_SAVE_DEDUP = 150;

/**
 * Token budget for schema suggestion generation.
 */
export const TOKENS_SCHEMA_SUGGESTION = 1000;

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
