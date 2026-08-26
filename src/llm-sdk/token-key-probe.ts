// token-key-probe.ts
//
// v1.23.0 P1.5 follow-up: runtime fallback for OpenAI-compatible
// gateways that reject the default `max_tokens` parameter in favor
// of `max_completion_tokens` (or vice versa).
//
// Design (KISS):
//
//   1. Send default request (max_tokens via AI-SDK wire format).
//   2. If the gateway returns HTTP 400, retry ONCE with the other
//      token key (max_completion_tokens). No error-body inspection,
//      no regex matching, no model-name hardcoding.
//   3. If the retry succeeds, cache the working key for this (baseURL, model) pair
//      so subsequent requests skip the probe.
//   4. If the retry also fails, throw the *original* error. The
//      extra HTTP call on the false-positive path is harmless
//      (one extra request that fails the same way).
//   5. If the cache already has an entry, we've already probed
//      and the retry already failed — do NOT retry again.
//
// Rationale from Issue #207 regression analysis (2026-07-01):
//   Pattern matching against error bodies creates false negatives
//   (gateway rejects max_tokens but uses a format we don't recognize
//   → user stays blocked). Since the only cost of a false positive
//   is one extra HTTP call (typically <1s on a LAN gateway), there
//   is no reason to be conservative. The 400-status filter already
//   gates out auth errors (401), rate limits (429), and server errors
//   (5xx) — all of which have distinct status codes.

export type TokenKey = 'max_tokens' | 'max_completion_tokens';

/**
 * TokenKeyProber — per-client token-key cache.
 *
 * Cache keyed by (baseURL, model) — Issue #551. The wire format is a
 * property of the backend behind the model, not of the gateway URL: a
 * per-model routing proxy (LiteLLM, one-api) or a multi-model LM Studio
 * can host both answers behind one baseURL. The earlier per-baseURL key
 * let one model's probe verdict rewrite every sibling's requests, and —
 * because the 400-retry is gated on cache emptiness — permanently
 * disabled the repair path for the whole gateway. Same composite-key
 * design as OutputModeProber.
 */
export class TokenKeyProber {
  private readonly cache: Map<string, TokenKey> = new Map();

  /** Composite key: baseURL + model so sibling models share no state. */
  private key(baseUrl: string, model: string): string {
    return `${baseUrl}::${model}`;
  }

  /** Read cached key for a (baseURL, model) pair, or undefined if not yet probed. */
  getCachedKey(baseUrl: string, model: string): TokenKey | undefined {
    return this.cache.get(this.key(baseUrl, model));
  }

  /** Write a probed/known-good key for a (baseURL, model) pair. */
  setCachedKey(baseUrl: string, model: string, key: TokenKey): void {
    this.cache.set(this.key(baseUrl, model), key);
  }

  /**
   * Invalidate cached entries. Test helper today — production re-probes
   * by client reconstruction; or for unit tests.
   * A bare baseURL clears every model probed behind it.
   */
  invalidate(baseUrl?: string): void {
    if (baseUrl === undefined) {
      this.cache.clear();
      return;
    }
    const prefix = `${baseUrl}::`;
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  /**
   * Return the alternate token key for a given key.
   * Simple toggle: max_tokens ↔ max_completion_tokens.
   */
  altKey(key: TokenKey): TokenKey {
    return key === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
  }
}
