/**
 * Token cap helper for Issue #75.
 *
 * Pure function. Applies a user-configurable ceiling to LLM max_tokens requests
 * to protect local models (LM Studio 8K, Ollama 4K) from HTTP 400 when the
 * requested tokens exceed the model's context window.
 *
 * Default (cap = 0) means no cap, preserving cloud-model behavior.
 */

export interface TokenCapSettings {
  /** Cap for max_tokens per LLM call. 0 = no cap. */
  maxTokensPerCall?: number;
}

export function capMaxTokens(requested: number, settings: TokenCapSettings): number {
  const ceiling = settings.maxTokensPerCall ?? 0;
  if (ceiling <= 0) return requested;
  return Math.min(requested, ceiling);
}
