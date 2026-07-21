// Issue #305: surface *why* the provider stopped generating.
//
// An OpenAI-compatible provider does not throw when it hits the token limit.
// It returns HTTP 200 and a body that stops mid-token, so a caller that only
// sees the response text cannot distinguish "the model finished" from "the
// model was cut off". The AI SDK already normalizes this into
// `result.finishReason`; every client here simply dropped it on `return
// result.text`. These helpers carry it to callers that opt in.

import type { LLMFinishReason } from '../types';

const KNOWN_FINISH_REASONS: readonly LLMFinishReason[] = [
  'stop',
  'length',
  'content-filter',
  'tool-calls',
  'error',
  'other',
  'unknown',
];

/**
 * Map an SDK-reported finish reason onto our union.
 *
 * Deliberately total: anything unrecognized (including `undefined`, which is
 * what a provider that omits the field yields) becomes `'unknown'` rather
 * than throwing. A caller acting on `'length'` therefore never fires on a
 * value it did not understand — the failure mode is "no signal", which is
 * exactly the pre-#305 behavior.
 */
export function normalizeFinishReason(raw: unknown): LLMFinishReason {
  return typeof raw === 'string' && (KNOWN_FINISH_REASONS as readonly string[]).includes(raw)
    ? (raw as LLMFinishReason)
    : 'unknown';
}

/**
 * Invoke the optional `onFinish` callback with a normalized reason.
 *
 * No-op when the caller did not pass one, which keeps every existing call
 * site and every mock client unchanged.
 */
export function reportFinish(
  onFinish: ((meta: { finishReason: LLMFinishReason }) => void) | undefined,
  raw: unknown,
): void {
  if (!onFinish) return;
  onFinish({ finishReason: normalizeFinishReason(raw) });
}
