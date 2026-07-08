// v1.24.0 #251: Custom Query Instructions — pure system-prompt injection helper.
//
// Issue #251 lets users append a persistent instructions block to the Query
// Wiki system prompt. The helper is a pure function (no IO, no side effects)
// so it can be unit-tested in isolation and called from any call site that
// needs to inject the user's instructions.
//
// Strict scope: this helper is ONLY called from the 3 QueryView send sites
// (streaming / non-stream fallback / non-stream main). Ingest / lint / page
// generation / Save to Wiki / seed selection / duplicate merge are
// intentionally NOT affected.

import { CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS } from '../../constants';

/** Marker header used to delimit the user instructions block in the system prompt. */
export const CUSTOM_INSTRUCTIONS_HEADER = '# User Custom Query Instructions';

/**
 * Append user custom instructions to the Query Wiki system prompt.
 *
 * Pure function. Returns the input unchanged when:
 * - `instructions` is `undefined` (pre-v1.24.0 data.json reads as undefined)
 * - `instructions` is `''` or whitespace-only (feature off)
 *
 * Trims the instructions before appending so accidental whitespace from copy-
 * paste doesn't bloat the prompt. The 5000-char cap is applied as defense in
 * depth — the UI also caps at the input layer.
 *
 * Logs a single debug line when instructions are actually appended, so the
 * developer-tools console shows whether the per-send injection happened (and
 * how many chars were injected). Empty/whitespace paths stay silent to avoid
 * noise on every query.
 */
export function appendCustomQueryInstructions(
  systemPrompt: string,
  instructions: string | undefined,
): string {
  if (!instructions || instructions.trim().length === 0) return systemPrompt;
  const trimmed = instructions.trim();
  const capped = trimmed.length > CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS
    ? trimmed.slice(0, CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS)
    : trimmed;
  console.debug(
    `[QueryWiki custom-instructions] injecting length=${capped.length} chars`,
  );
  return `${systemPrompt}\n\n${CUSTOM_INSTRUCTIONS_HEADER}\n${capped}`;
}

/**
 * Trace the per-send injection context — called once per LLM request so the
 * developer-tools console shows WHICH query was paired with custom
 * instructions, and whether the instructions were applied / empty / capped.
 *
 * The helper itself logs the actual injection; this companion log adds the
 * call-site context (query preview + send path name) so a user can correlate
 * the line "[QueryWiki custom-instructions] ..." with the query they typed.
 *
 * Three send paths share this logger: `streaming` / `non-stream-fallback` /
 * `non-stream-main`. The path label is printed so a user can tell which
 * branch fired (e.g. after a streaming failure the fallback path is taken).
 */
export function logCustomInstructionsInjectionContext(
  sendPath: 'streaming' | 'non-stream-fallback' | 'non-stream-main',
  userMessage: string,
  instructions: string | undefined,
): void {
  const queryPreview = userMessage.length > 60
    ? userMessage.slice(0, 60) + '…'
    : userMessage;
  if (!instructions || instructions.trim().length === 0) {
    console.debug(
      `[QueryWiki custom-instructions] send=${sendPath} query="${queryPreview}" instructions=EMPTY`,
    );
    return;
  }
  const trimmed = instructions.trim();
  const capped = trimmed.length > CUSTOM_QUERY_INSTRUCTIONS_MAX_CHARS;
  console.debug(
    `[QueryWiki custom-instructions] send=${sendPath} query="${queryPreview}" ` +
      `instructions=${trimmed.length} chars${capped ? ' (capped to 5000)' : ''} → APPLIED`,
  );
}