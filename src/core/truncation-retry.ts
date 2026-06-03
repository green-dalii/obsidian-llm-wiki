/**
 * Pure helper for token truncation retry policy.
 * Shared across AnthropicCompatibleClient, AnthropicClient, OpenAICompatibleClient.
 *
 * The policy is uniform across all clients:
 *   1. Call initialFn() to get the first response
 *   2. If isTruncated(response) → compute retryMaxTokens = min(currentMax * 2, maxCap)
 *   3. Call retryFn(retryMaxTokens) to get the second response
 *   4. Return extractText(retryResponse)
 *
 * If not truncated, the initial response is used directly (no retry).
 * Errors from retryFn are propagated.
 *
 * This is a pure policy function — no IO, no Obsidian API, no LLM client
 * dependency. Fully unit-testable.
 */

import { MAX_TOKENS_BATCH } from '../constants';

const DEFAULT_MAX_CAP = MAX_TOKENS_BATCH; // 16000

export interface TruncationRetryOptions<T> {
  /** Function that performs the initial API call. */
  initialFn: () => Promise<T>;
  /**
   * Function that performs the retry call with the new (doubled) max_tokens value.
   * Only called when isTruncated returns true.
   */
  retryFn: (retryMaxTokens: number) => Promise<T>;
  /** Pure predicate: returns true if the response was truncated. */
  isTruncated: (response: T) => boolean;
  /** Extracts the text content from the response. */
  extractText: (response: T) => string;
  /** Returns the current max_tokens (used to compute retry value). */
  getMaxTokens: () => number;
  /** Cap for the doubled max_tokens. Defaults to MAX_TOKENS_BATCH. */
  maxCap?: number;
  /** Label used in the warning log. */
  label: string;
  /** Optional: extracts the stop/finish reason from the response for the warning log. */
  getStopReason?: (response: T) => string | null | undefined;
}

export async function withTruncationRetry<T>(opts: TruncationRetryOptions<T>): Promise<string> {
  const initialResponse = await opts.initialFn();
  let text = opts.extractText(initialResponse);

  if (!opts.isTruncated(initialResponse)) {
    return text;
  }

  const cap = opts.maxCap ?? DEFAULT_MAX_CAP;
  const currentMax = opts.getMaxTokens();
  const retryMaxTokens = Math.min(currentMax * 2, cap);

  const stopReason = opts.getStopReason?.(initialResponse);
  const reasonSuffix = stopReason ? ` (${stopReason})` : '';
  console.warn(
    `${opts.label} response truncated at ${currentMax} tokens${reasonSuffix}. Retrying with ${retryMaxTokens} tokens.`
  );

  const retryResponse = await opts.retryFn(retryMaxTokens);
  text = opts.extractText(retryResponse);
  return text;
}
