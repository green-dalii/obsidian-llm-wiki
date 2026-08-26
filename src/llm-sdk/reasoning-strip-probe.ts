// reasoning-strip-probe.ts
//
// v1.26.0 Batch 6: Layer-3 of the 4-layer fallback for force-disable thinking.
//
// Some openai-compat backends (notably Gemini-via-OpenAI-shim, Issue #137)
import { classifyFieldError } from './shared-rejection-verbs';
// reject `reasoning_effort: 'none'` with HTTP 400. We catch the 400 by
// inspecting the error message for a *rejection verb* AND a *field marker*
// (two-marker pattern, mirrors the established
// `[[isPdfRelatedLlmError]]` classifier in `src/wiki/wiki-engine.ts:587-608`),
// strip the field from the next attempt, and retry exactly once. Cache
// the per-baseURL "strip" decision so subsequent calls skip the probe.
//
// Design (mirrors [[token-key-probe.ts]]):
//
//   1. Send request with `reasoningEffort: 'none'` (Layer 1).
//   2. If 400 with a rejection verb + reasoning field marker → retry once
//      without `reasoningEffort`. Cache the strip decision.
//   3. If retry succeeds → caller gets the response.
//   4. If retry also fails → throw the error.
//   5. If cache already has an entry → skip the probe on this call.
//
// Why two-marker (verb + field), not single substring:
//   v1.26.0 Batch 6 CR-2 fix: the previous single-substring pattern list
//   included the bare word 'thinking', which collides with model *names*
//   (kimi-k2-thinking, qwen3-235b-a22b-thinking-2507, glm-4.6-thinking,
//   and several others). Any 400 on these models — bad model name,
//   context-length exceeded, max_tokens mismatch — was misclassified as
//   a reasoning-field rejection, permanently marked the baseURL as
//   "strip" (silently disabling force-disable-thinking for the rest of
//   the session), AND consumed the 400 so the token-key fallback
//   (`max_tokens ↔ max_completion_tokens`) never fired. Durable
//   functional regression for *-thinking model users.
//
//   The two-marker classifier rejects all four false positives above —
//   none of those error messages contain a rejection verb that names
//   the reasoning field — while still catching the real rejections
//   (e.g., Gemini's "Invalid value for `reasoning_effort`").
//
// Why message-match rather than a broader 400-retry:
//   - 400 on any other field (max_tokens vs max_completion_tokens) is
//     already handled by [[TokenKeyProber]] — different mechanism, no
//     overlap.
//   - 401 (auth) / 429 (rate) / 5xx (server) have distinct status codes
//     and are NOT covered here.
//
// Why per-baseURL not per-model:
//   Same gateway → same wire format → same rejection behaviour. Model
//   granularity would over-invalidate the cache.

/**
 * Rejection verbs shared with OutputModeProber via
 * src/llm-sdk/shared-rejection-verbs.ts (v1.26.3 PATCH simplify
 * round). Originally 6 verbs in this file; the shared constant adds
 * 'must be' / 'should be' which only widen matches — every string
 * the previous local list matched still matches. The reasoning
 * classifier has never asserted a max-set invariant, so broadening
 * is safe.
 */

/**
 * Field markers — names of the reasoning-related fields, as they would
 * appear in a structured JSON error body. Bare 'thinking' is NOT here —
 * it's too easily matched by model names (see CR-2). Use the full
 * `thinking.type` or `enable_thinking` to disambiguate from a model id.
 */
const FIELD_MARKERS = [
  'reasoning_effort',
  'reasoning-effort',
  'thinking.type',
  'enable_thinking',
  'chat_template_kwargs',
  'chat-template-kwargs',
] as const;

/**
 * ReasoningStripProber — per-client "should I strip reasoningEffort?"
 * cache.
 *
 * Cache keyed by (baseURL, model) — Issue #551. The wire format is a
 * property of the backend behind the model, not of the gateway URL: a
 * per-model routing proxy or a multi-model LM Studio can host a backend
 * that rejects `reasoning_effort` next to one that supports it, and the
 * earlier per-baseURL key silently dropped the pass-through for the
 * sibling that supports it. Same composite-key design as
 * OutputModeProber. Value is presence (true) — the key itself is the
 * signal — so a Set is the right primitive, not a Map<string, true>
 * (which would carry a dead second type parameter and a dead `=== true`
 * check on every read).
 *
 * v1.26.0 Batch 6 review (PR #411 simplify 2026-08-05): the previous
 * design also exposed an `invalidate(baseUrl?)` overload with zero
 * production callers — only tests used it. Removed. If a future
 * "user changed baseURL → re-probe" hook needs to drop the cache, it
 * can call `markStrip` (it's a present-tense cache, not a complex
 * state machine — adding back the invalidation path when there's a
 * real caller is a one-line edit).
 */
export class ReasoningStripProber {
  private readonly cache = new Set<string>();

  /** Composite key: baseURL + model so sibling models share no state. */
  private key(baseUrl: string, model: string): string {
    return `${baseUrl}::${model}`;
  }

  /**
   * Read cached strip decision for a (baseURL, model) pair.
   * `true` = we already learned this backend rejects reasoningEffort
   * and the next call should omit it.
   */
  shouldStrip(baseUrl: string, model: string): boolean {
    return this.cache.has(this.key(baseUrl, model));
  }

  /**
   * Mark a (baseURL, model) pair as "strip reasoningEffort on future
   * calls". Called after a 400 retry revealed the field was the cause.
   */
  markStrip(baseUrl: string, model: string): void {
    this.cache.add(this.key(baseUrl, model));
  }

  /**
   * Does an error indicate that a reasoning-related field was the
   * cause of an HTTP 400?
   *
   * v1.26.0 Batch 6 CR-2: two-marker classifier. BOTH conditions
   * must hold (AND):
   *
   *   1. The body contains a REJECTION_VERB substring (e.g.
   *      "unrecognized", "unknown", "invalid value"). Without this,
   *      messages like "context length exceeded for kimi-k2-thinking"
   *      or "Model 'glm-4.6-thinking' not found" (which contain the
   *      bare word 'thinking' but are NOT field rejections) would
   *      trigger the strip.
   *   2. The body contains a FIELD_MARKER substring. Without this,
   *      generic "invalid value" 400s (unrelated to reasoning) would
   *      trigger the strip.
   *
   * Both are case-insensitive substring matches. The classifier is
   * deliberately conservative — false negatives (real field-rejection
   * 400s that don't match) cost one extra HTTP call on the next
   * request; false positives (unrelated 400s that match) permanently
   * disable force-disable-thinking for the baseURL, which is much
   * worse. Mirrors the [[isPdfRelatedLlmError]] classifier's design.
   *
   * IMPORTANT — the input MUST be the raw response body (e.g.
   * `err.responseBody` from an AI SDK `APICallError`), NOT
   * `err.message`. The AI SDK's APICallError.message field is a
   * fixed template ("Provider returned error") and does NOT include
   * the provider's actual error text — the body is in
   * `responseBody` instead. The original probe was written against
   * `err.message`, which is why it silently never fired against real
   * provider 400s in production — the first real E2E on LM Studio
   * 0.4.20 + qwythos-9b-claude-mythos-5-1m-mlx (2026-08-10)
   * surfaced it. The v1.26.3 PATCH follow-up fixed the call site to
   * pass `err.responseBody`.
   */
  static isReasoningFieldError(body: string): boolean {
    return classifyFieldError(body, FIELD_MARKERS);
  }
}