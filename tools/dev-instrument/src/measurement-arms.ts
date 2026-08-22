// UPSTREAM DEV-ONLY INSTRUMENT — measurement arm application.
//
// Applies the env-only arms (WIKI_THINKING_MODE / WIKI_TEMP / WIKI_TOP_P)
// to the loaded settings object. Env-only because the positional CLI cannot
// express them (Issue #507, DocTpoint comment 2).
//
// Throws on anything it does not understand rather than skipping it — same
// rationale as parseTaskPolicySpec (src/core/task-policy.ts): a silently
// ignored arm means a run that did not execute what its own `[cli]` header
// says it executed, and the header is the only record of which arm a number
// came from. (PR #511 review, DocTpoint finding 3: `WIKI_THINKING_MODE=off`
// used to be a silent no-op while the header echoed it verbatim.)

import type { LLMWikiSettings } from '../../../src/types';

const THINKING_MODES = ['data-json', 'plugin-off', 'server-default'] as const;

export function applyMeasurementArms(
  settings: LLMWikiSettings,
  env: Record<string, string | undefined>,
): void {
  const thinkingMode = env.WIKI_THINKING_MODE;
  if (thinkingMode !== undefined && !(THINKING_MODES as readonly string[]).includes(thinkingMode)) {
    throw new Error(
      `WIKI_THINKING_MODE="${thinkingMode}" is not a valid measurement arm `
      + `(expected unset or one of ${THINKING_MODES.join(' | ')}).`,
    );
  }
  // `data-json` / unset are deliberate no-ops: use whatever data.json says.
  if (thinkingMode === 'plugin-off') settings.disableThinking = true;
  else if (thinkingMode === 'server-default') settings.disableThinking = false;

  applyNumberArm(settings, 'WIKI_TEMP', 'extractionTemperature', env);
  applyNumberArm(settings, 'WIKI_TOP_P', 'extractionTopP', env);
}

function applyNumberArm(
  settings: LLMWikiSettings,
  envName: string,
  key: 'extractionTemperature' | 'extractionTopP',
  env: Record<string, string | undefined>,
): void {
  const raw = env[envName]?.trim();
  // Empty string = shell exported nothing usable (`WIKI_TEMP=`); treat as
  // unset. Without this guard Number('') would silently pin the value to 0.
  if (raw === undefined || raw === '') return;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`${envName}="${raw}" is not a number.`);
  settings[key] = n;
}
