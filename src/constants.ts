/**
 * Centralized constants for the LLM Wiki plugin.
 *
 * Replaces magic strings/numbers scattered across the codebase with
 * named constants for maintainability and type safety.
 */

// ============================================================================
// Frontmatter Keys
// ============================================================================

/**
 * Standard frontmatter field names for Wiki pages.
 * Use these constants instead of raw strings to prevent typos and enable IDE autocomplete.
 */
export const FRONTMATTER_KEYS = {
	type: 'type',
	created: 'created',
	updated: 'updated',
	sources: 'sources',
	tags: 'tags',
	aliases: 'aliases',
	reviewed: 'reviewed',
} as const;

// ============================================================================
// Wiki Folder Structure
// ============================================================================

/**
 * Standard subfolder names within the Wiki folder.
 * Used for entity, concept, and source page organization.
 */
export const WIKI_SUBFOLDERS = {
	entities: 'entities',
	concepts: 'concepts',
	sources: 'sources',
} as const;

// ============================================================================
// Lint & Performance Thresholds
// ============================================================================

/**
 * Minimum substantive content length for a page to be considered non-empty.
 * Pages with body content shorter than this are flagged as "empty pages" in Lint.
 */
export const MIN_SUBSTANTIVE_CHARS = 50;

/**
 * Event loop yield interval for async O(n²) operations.
 * Every N outer iterations, await a setTimeout(0) to prevent UI thread blocking.
 * Used in duplicate candidate generation and large-scale lint operations.
 */
export const YIELD_EVERY_ITERATIONS = 200;

/**
 * Maximum number of entity/concept pages generated from a single source file.
 * Prevents runaway extraction on extremely long source documents.
 */
export const MAX_PAGES_PER_SOURCE = 50;

/**
 * Maximum total tokens per LLM batch call.
 * Used for duplicate candidate batching and iterative source extraction.
 */
export const MAX_TOKENS_BATCH = 16000;

// ============================================================================
// LLM Client Settings
// ============================================================================

/**
 * Maximum retries on HTTP 5xx/429 errors.
 * Exponential backoff: delay = baseDelay * 2^attempt.
 */
export const MAX_RETRIES = 2;

/**
 * Base delay (ms) for retry exponential backoff.
 */
export const RETRY_BASE_DELAY_MS = 1000;

// ============================================================================
// Notice & UI Timings
// ============================================================================

/**
 * Default display duration for transient Notices (success/feedback messages).
 */
export const NOTICE_DURATION_MS = 8000;

/**
 * Timer update interval for Query progress display (elapsed time counter).
 */
export const TIMER_UPDATE_INTERVAL_MS = 1000;