import { describe, it, expect } from 'vitest';
import { APICallError } from 'ai';
import { ReasoningStripProber } from '../../llm-sdk/reasoning-strip-probe';
import { OutputModeProber } from '../../llm-sdk/output-mode-prober';

// v1.26.0 Batch 6: per-baseURL "strip reasoningEffort" cache, plus the
// message-match classifier that decides whether a 400 is reasoning-related
// (Layer 3 of the 4-layer force-disable fallback).
//
// PR #410 / Batch 2 had no equivalent test — the SDK's silent field-stripping
// (zod schema filter at line 531-540 of @ai-sdk/openai-compatible@2.0.62)
// shipped without a regression guard. This file is the explicit guard for
// Batch 6: if the cache or the classifier ever drift, the tests fail.

describe('ReasoningStripProber', () => {
  const MODEL = 'qwen3-30b';
  const SIBLING = 'gemma-4-26b';

  it('starts empty for any (baseURL, model)', () => {
    const prober = new ReasoningStripProber();
    expect(prober.shouldStrip('https://api.deepseek.com/v1', MODEL)).toBe(false);
    expect(prober.shouldStrip('https://api.example.com/v1', MODEL)).toBe(false);
  });

  it('markStrip + shouldStrip round-trip per (baseURL, model)', () => {
    const prober = new ReasoningStripProber();
    prober.markStrip('https://api.deepseek.com/v1', MODEL);
    expect(prober.shouldStrip('https://api.deepseek.com/v1', MODEL)).toBe(true);
    // Different baseURL unaffected
    expect(prober.shouldStrip('https://api.openai.com/v1', MODEL)).toBe(false);
  });

  it('does not strip for a sibling model on the same gateway (#551)', () => {
    // One backend behind the gateway rejects reasoning_effort, the
    // sibling supports it — the sibling must keep the pass-through.
    const prober = new ReasoningStripProber();
    prober.markStrip('https://api.deepseek.com/v1', MODEL);
    expect(prober.shouldStrip('https://api.deepseek.com/v1', SIBLING)).toBe(false);
  });

  // v1.26.0 Batch 6 review (PR #411 simplify 2026-08-05): the previous
  // `invalidate(baseUrl?)` overload was deleted (zero production
  // callers — only the test exercised it). The cache now exposes only
  // `shouldStrip` + `markStrip`; if a "user changed baseURL → re-probe"
  // hook ever needs to drop the cache, it's a one-line edit to add
  // back. The tests for invalidate() are removed with the method.
});

describe('ReasoningStripProber.isReasoningFieldError — two-marker (verb + field) classifier', () => {
  // v1.26.0 Batch 6 CR-2: the previous classifier matched any substring
  // of `reasoning_effort` / `thinking` / `chat_template` etc. The bare
  // word `thinking` collided with model names (`kimi-k2-thinking`,
  // `qwen3-235b-a22b-thinking-2507`, `glm-4.6-thinking`), causing
  // false-positive strip decisions on `*-thinking` model users. New
  // classifier requires BOTH a rejection verb AND a field marker.

  it('matches Gemini-style: rejection verb + reasoning_effort field', () => {
    expect(
      ReasoningStripProber.isReasoningFieldError(
        "Invalid value for 'reasoning_effort': 'none' is not supported",
      ),
    ).toBe(true);
  });

  it('matches Anthropic-style: unsupported + thinking.type field', () => {
    expect(
      ReasoningStripProber.isReasoningFieldError(
        "Field 'thinking.type' is not supported by this endpoint",
      ),
    ).toBe(true);
  });

  it('matches llama.cpp-style: unknown + chat_template_kwargs field', () => {
    expect(
      ReasoningStripProber.isReasoningFieldError(
        'Unknown parameter: chat_template_kwargs',
      ),
    ).toBe(true);
  });

  it('is case-insensitive on both verb and field', () => {
    expect(ReasoningStripProber.isReasoningFieldError('REASONING_EFFORT NOT SUPPORTED')).toBe(true);
    expect(ReasoningStripProber.isReasoningFieldError('unknown field ENABLE_THINKING')).toBe(true);
    expect(ReasoningStripProber.isReasoningFieldError('UNRECOGNIZED CHAT_TEMPLATE_KWARGS')).toBe(true);
  });

  it('matches kebab-case variants', () => {
    expect(ReasoningStripProber.isReasoningFieldError('unsupported reasoning-effort value')).toBe(true);
    expect(ReasoningStripProber.isReasoningFieldError('unknown chat-template-kwargs')).toBe(true);
  });

  // CR-2 regression: bare model names with 'thinking' substring must NOT
  // match. Without this guard, *-thinking model users would get their
  // baseURL permanently mis-stripped on the first 400 (bad model name,
  // context length, token-key mismatch).
  it('does NOT match model names containing "thinking"', () => {
    expect(ReasoningStripProber.isReasoningFieldError("Model 'kimi-k2-thinking' not found")).toBe(false);
    expect(ReasoningStripProber.isReasoningFieldError('model qwen3-235b-a22b-thinking-2507 is not loaded')).toBe(false);
    expect(ReasoningStripProber.isReasoningFieldError('Invalid value for max_tokens (model: glm-4.6-thinking)')).toBe(false);
    expect(ReasoningStripProber.isReasoningFieldError('context length exceeded for kimi-k2-thinking')).toBe(false);
  });

  it('does NOT match when only the verb is present (no field marker)', () => {
    // Generic 400 errors without the field marker must NOT trigger strip.
    expect(ReasoningStripProber.isReasoningFieldError('Invalid value for max_tokens')).toBe(false);
    expect(ReasoningStripProber.isReasoningFieldError('Unsupported model')).toBe(false);
  });

  it('does NOT match when only the field marker is present (no rejection verb)', () => {
    // Mention of the field name without a rejection verb (e.g. an info
    // log line) must NOT trigger strip.
    expect(ReasoningStripProber.isReasoningFieldError('request body contains reasoning_effort')).toBe(false);
    expect(ReasoningStripProber.isReasoningFieldError('chat_template_kwargs supplied')).toBe(false);
  });

  it('does NOT match unrelated 400s (status-only filters handled by TokenKeyProber)', () => {
    // 413 size limit
    expect(ReasoningStripProber.isReasoningFieldError('Request too large')).toBe(false);
    // 5xx server error
    expect(ReasoningStripProber.isReasoningFieldError('Internal server error')).toBe(false);
    // 401 auth
    expect(ReasoningStripProber.isReasoningFieldError('Invalid API key')).toBe(false);
    // 429 rate limit
    expect(ReasoningStripProber.isReasoningFieldError('Rate limit exceeded')).toBe(false);
  });

  it('does NOT match "temperature" alone (defensive — keyword could overlap)', () => {
    expect(ReasoningStripProber.isReasoningFieldError('Invalid temperature value')).toBe(false);
  });

  it('handles empty / whitespace input safely', () => {
    expect(ReasoningStripProber.isReasoningFieldError('')).toBe(false);
    expect(ReasoningStripProber.isReasoningFieldError('   ')).toBe(false);
  });
});

// v1.26.3 PATCH follow-up — REGRESSION GUARD for the bug surfaced by
// real E2E on LM Studio 0.4.20 + qwythos-9b-claude-mythos-5-1m-mlx
// (2026-08-10):
//
// AI SDK's APICallError.message is a FIXED template string
// ("Provider returned error") — it does NOT include the provider's
// actual error body. The provider body lives in `err.responseBody`.
// Both `ReasoningStripProber.isReasoningFieldError` and
// `OutputModeProber.isJsonObjectFieldError` MUST be called
// with `err.responseBody`, NOT `err.message`. The previous tests
// passed raw strings to the classifier in isolation, which masked
// the bug — no test simulated the real APICallError shape.
//
// This test simulates the real shape and pins the contract: the
// classifier must match the responseBody (real body) and MUST NOT
// match the message (AI SDK template).
describe('Classifier input contract: responseBody vs message (regression guard for v1.26.3 PATCH follow-up bug)', () => {
  it('ReasoningStripProber matches the responseBody (Gemini reasoning_effort 400)', () => {
    // Real Gemini response body: "Invalid value for 'reasoning_effort'".
    const err = new APICallError({
      message: 'Provider returned error',  // ← AI SDK template (NOT the real body)
      statusCode: 400,
      responseHeaders: {},
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      requestBodyValues: {},
      responseBody: '{"error":{"message":"Invalid value for \'reasoning_effort\': \'none\' is not supported"}}',
    });

    // The bug: classifier was called with err.message — "Provider returned
    // error" — no reasoning-field marker, no rejection verb → false.
    expect(ReasoningStripProber.isReasoningFieldError(err.message ?? '')).toBe(false);
    // The fix: classifier is called with err.responseBody — real body
    // contains "invalid value" + "reasoning_effort" → true.
    expect(ReasoningStripProber.isReasoningFieldError(err.responseBody ?? '')).toBe(true);
  });

  it('OutputModeProber.isJsonObjectFieldError matches the responseBody (LM Studio json_object 400)', () => {
    // Real LM Studio 0.4.20 response body (DocTpoint Issue #443 comment 1
    // 2026-08-09 + user E2E 2026-08-10 on qwythos-9b-claude-mythos-5-1m-mlx).
    const err = new APICallError({
      message: 'Provider returned error',  // ← AI SDK template
      statusCode: 400,
      responseHeaders: {},
      url: 'http://localhost:1234/v1/chat/completions',
      requestBodyValues: {},
      responseBody: '{"error":"\'response_format.type\' must be \'json_schema\' or \'text\'"}',
    });

    // The bug: classifier was called with err.message → no match → strip
    // never fired → 400 propagated to user.
    expect(OutputModeProber.isJsonObjectFieldError(err.message ?? '')).toBe(false);
    // The fix: classifier is called with err.responseBody → real body
    // contains "must be" + "response_format" → true → strip fires.
    expect(OutputModeProber.isJsonObjectFieldError(err.responseBody ?? '')).toBe(true);
  });
});