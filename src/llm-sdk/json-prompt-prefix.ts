// json-prompt-prefix.ts
//
// v1.26.3 PATCH Phase A1: the JSON-shape enforcement system-prompt prefix
// moved out of the inline Plan A hack in openai-compat-sdk-client.ts
// into a reusable constant. The prefix is the Tier 1 / Tier 2 prompt
// companion (per the 3-tier output-mode architecture):
//
//   - Tier 0 (json_schema on the wire) → no prefix needed; SDK enforces
//     grammar at decode time via Output.object.
//   - Tier 1 (json_object on the wire) → prefix added at retry time
//     helps closure reliability on local backends (LM Studio / Ollama)
//     where Output.json() does not constrain the model.
//   - Tier 2 (no response_format on the wire) → prefix REQUIRED;
//     without it, the model emits unclosed arrays / trailing commas /
//     markdown fences and parseJsonResponse fails (this was the v1.26.2
//     failure mode the user's LM Studio E2E on 2026-08-10 surfaced —
//     unclosed `mentions_in_source` array at position 4169 of a 4504-char
//     response).
//
// The exact wording was tuned against LM Studio 0.4.20 +
// gemma-4-12b / qwythos-9b-claude-mythos-5-1m-mlx (user E2E 2026-08-10):
// the model's behavior changed from "always emit unclosed array when
// long output" to "almost always emit closed array" with this prefix
// prepended. This is observation, not theory — keep the wording stable
// unless measuring better alternatives on the same fixtures.
//
// Contract (pinned by json-prompt-prefix.test.ts):
//   1. Non-empty
//   2. Mentions JSON (so model-side parser can recognize constraint)
//   3. Mentions array closure
//   4. Mentions object closure
//   5. Forbids markdown fences (```json ... ``` is the second-most
//      common unconstrained-output failure mode)

import type { OutputMode } from './output-mode-prober';

export const JSON_ENFORCEMENT_SYSTEM_PREFIX =
  'CRITICAL: Your reply MUST be a single valid JSON object. ' +
  'No markdown fences. No trailing commentary. ' +
  'Every [ array and { object must be closed exactly once. ';

/**
 * Issue #481: when a per-task policy pins `text_prompt`, no `response_format`
 * reaches the wire, so the only thing left telling the model to answer in JSON
 * is the prompt. The 400-driven demotion paths add
 * `JSON_ENFORCEMENT_SYSTEM_PREFIX` when they fall to that tier; a pinned mode
 * has no such retry to hang it on, so it is added up front instead.
 *
 * Only when the caller actually wanted JSON. A prose step pinned to
 * `text_prompt` passes no `response_format`, and prefixing its system prompt
 * with a JSON instruction would corrupt the very output being measured.
 *
 * Lives here rather than in one client because every client that can honour a
 * pinned mode needs the identical rule — the #525 review found the Codex path
 * silently keeping JSON output because it had no access to this helper.
 */
export function forcedTextPromptSystem(
  system: string | undefined,
  responseFormat: unknown,
  outputModeOverride: OutputMode | undefined,
): string | undefined {
  if (outputModeOverride !== 'text_prompt' || !responseFormat) return system;
  return system ? `${JSON_ENFORCEMENT_SYSTEM_PREFIX}\n\n${system}` : JSON_ENFORCEMENT_SYSTEM_PREFIX;
}