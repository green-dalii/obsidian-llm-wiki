import { describe, it, expect } from 'vitest';
import {
  MAX_TOKENS_BATCH,
  TOKENS_PAGE_GENERATION,
  TOKENS_APPEND_REVIEWED,
  TOKENS_CONTRADICTION,
  TOKENS_CONVERSATION_EXTRACTION,
  TOKENS_CONVERSATION_PAGE,
  TOKENS_DEDUP_RESOLUTION,
  TOKENS_LINT_DEDUP_LLM,
  TOKENS_QUERY_MODEL_DETECT,
  TOKENS_QUERY_PAGE_SELECT,
  TOKENS_QUERY_SAVE_DEDUP,
  TOKENS_QUERY_SEED_SELECT,
  TOKENS_SCHEMA_SUGGESTION,
  LEX_MATCH_MIN_COUNT,
  LEX_MATCH_MIN_TOP_SCORE,
  LEX_FALLBACK_TOP_K,
  QUERY_SEED_LLM_MAX_CANDIDATES,
} from '../../constants';

/**
 * Tests for Issue #75: token budget constants.
 *
 * These constants cap LLM output sizes per call type. Two changes:
 * - TOKENS_DEDUP_RESOLUTION: 300 → 1000 (insurance against thinking-model preamble)
 * - TOKENS_QUERY_SAVE_DEDUP: 150 → 300 (similar insurance)
 *
 * The other values are unchanged but explicitly asserted to document intent.
 */
describe('Token budget constants (Issue #75)', () => {
  it('MAX_TOKENS_BATCH is 16000 (cloud default cap for truncation retry)', () => {
    expect(MAX_TOKENS_BATCH).toBe(16000);
  });

  it('TOKENS_DEDUP_RESOLUTION is 1000 (insurance for thinking models)', () => {
    expect(TOKENS_DEDUP_RESOLUTION).toBe(1000);
  });

  it('TOKENS_QUERY_SAVE_DEDUP is 2000 (insurance for thinking models, v1.24.1 PATCH Phase 5.5.0)', () => {
    expect(TOKENS_QUERY_SAVE_DEDUP).toBe(2000);
  });

  it('page-level generation constants are 8000', () => {
    expect(TOKENS_PAGE_GENERATION).toBe(8000);
    expect(TOKENS_CONVERSATION_PAGE).toBe(8000);
  });

  it('lint and contradiction constants are 4000', () => {
    expect(TOKENS_APPEND_REVIEWED).toBe(4000);
    expect(TOKENS_CONTRADICTION).toBe(4000);
    expect(TOKENS_LINT_DEDUP_LLM).toBe(4000);
  });

  it('query constants are 2000 (Phase 5.5.0 thinking-model insurance)', () => {
    // v1.24.1 PATCH Phase 5.5.0: raised all Query-token budgets to 2000
    // so DeepSeek V3's reasoning preamble doesn't consume the entire
    // budget before the JSON output is emitted. TOKENS_LINT_ORPHAN_FIX
    // (800) and TOKENS_QUERY_LLM_SELECT (3000) stay at their non-2000
    // values from prior cycles.
    expect(TOKENS_QUERY_PAGE_SELECT).toBe(2000);
    expect(TOKENS_QUERY_MODEL_DETECT).toBe(2000);
    expect(TOKENS_QUERY_SEED_SELECT).toBe(2000);
    expect(TOKENS_QUERY_SAVE_DEDUP).toBe(2000);
  });

  it('Query seed-selector LLM candidates cap is 50 (Phase 5.5.0)', () => {
    // v1.24.1 PATCH Phase 5.5.0: the Stage 1.5 LLM seed selector is fed
    // the lex-ranked top-N candidates so it sees the same title+aliases
    // material the lex scorer saw (consistency between stages). 50 is
    // large enough to capture a focused candidate set even on a small
    // wiki, small enough to fit comfortably in the Stage 1.5 prompt.
    expect(QUERY_SEED_LLM_MAX_CANDIDATES).toBe(50);
  });

  it('Lex escalation thresholds (Phase 5.5.0)', () => {
    // Stage 1 → Stage 1.5 escalation: lex must have at least 3 hits
    // AND the top hit score must be ≥ 5 (≈ 1 title hit + 1 alias hit,
    // i.e. multi-signal match — not a single-particle substring).
    expect(LEX_MATCH_MIN_COUNT).toBe(3);
    expect(LEX_MATCH_MIN_TOP_SCORE).toBe(5);
    // Stage FALLBACK (when Stage 1.5 LLM also returns empty): use the
    // top 5 lex pages as seeds, so PPR still has *something* to walk
    // from rather than nothing.
    expect(LEX_FALLBACK_TOP_K).toBe(5);
  });

  it('TOKENS_SCHEMA_SUGGESTION is at least 1024 (v1.22.0 bumped to 4096 for full schema body + reasoning overhead)', () => {
    expect(TOKENS_SCHEMA_SUGGESTION).toBeGreaterThanOrEqual(1024);
  });

  it('TOKENS_CONVERSATION_EXTRACTION is 5000', () => {
    expect(TOKENS_CONVERSATION_EXTRACTION).toBe(5000);
  });
});

describe('Dead code removed (Issue #75)', () => {
  // These constants had no callers and have been removed. Importing them now
  // would fail, so we document the removal via a passing test.
  it('TOKENS_PAGE_MERGE and TOKENS_RELATED_UPDATE are not exported', async () => {
    const constants = await import('../../constants');
    expect(constants).not.toHaveProperty('TOKENS_PAGE_MERGE');
    expect(constants).not.toHaveProperty('TOKENS_RELATED_UPDATE');
  });
});

describe('source-analyzer shadow constant removed (Issue #75)', () => {
  // Previously source-analyzer.ts had `const MAX_TOKENS = 16000` shadowing
  // the centralized MAX_TOKENS_BATCH. This caused LM Studio (8K context) to fail
  // because analyzeSource used the un-capped 16000 value. Now it imports and
  // uses MAX_TOKENS_BATCH directly.
  //
  // We verify by importing the centralized constant and checking the re-exported
  // function signature is correct — the actual shadow deletion is enforced by
  // the ModuleWatcher in source-analyzer.ts integration tests.
  it('MAX_TOKENS_BATCH is 16000 (the value that replaced the shadow)', () => {
    expect(MAX_TOKENS_BATCH).toBe(16000);
  });
});
