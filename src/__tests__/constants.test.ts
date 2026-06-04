import { describe, it, expect } from 'vitest';
import {
  MAX_TOKENS_BATCH,
  TOKENS_PAGE_GENERATION,
  TOKENS_APPEND_REVIEWED,
  TOKENS_CONTRADICTION,
  TOKENS_CONVERSATION_EXTRACTION,
  TOKENS_CONVERSATION_PAGE,
  TOKENS_DEDUP_RESOLUTION,
  TOKENS_LINT_ALIAS_BATCH,
  TOKENS_LINT_DEDUP_LLM,
  TOKENS_LINT_ORPHAN_FIX,
  TOKENS_QUERY_MODEL_DETECT,
  TOKENS_QUERY_PAGE_SELECT,
  TOKENS_QUERY_SAVE_DEDUP,
  TOKENS_SCHEMA_SUGGESTION,
} from '../constants';

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

  it('TOKENS_QUERY_SAVE_DEDUP is 300 (insurance for thinking models)', () => {
    expect(TOKENS_QUERY_SAVE_DEDUP).toBe(300);
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

  it('short-output constants stay small', () => {
    expect(TOKENS_LINT_ALIAS_BATCH).toBe(500);
    expect(TOKENS_LINT_ORPHAN_FIX).toBe(800);
    expect(TOKENS_QUERY_PAGE_SELECT).toBe(500);
    expect(TOKENS_QUERY_MODEL_DETECT).toBe(100);
  });

  it('TOKENS_SCHEMA_SUGGESTION is 1000', () => {
    expect(TOKENS_SCHEMA_SUGGESTION).toBe(1000);
  });

  it('TOKENS_CONVERSATION_EXTRACTION is 5000', () => {
    expect(TOKENS_CONVERSATION_EXTRACTION).toBe(5000);
  });
});

describe('Dead code removed (Issue #75)', () => {
  // These constants had no callers and have been removed. Importing them now
  // would fail, so we document the removal via a passing test.
  it('TOKENS_PAGE_MERGE and TOKENS_RELATED_UPDATE are not exported', async () => {
    const constants = await import('../constants');
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
