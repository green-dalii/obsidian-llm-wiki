// Thin wrapper that injects advanced settings into createMessage calls.
// v1.20.0: by default the plugin does NOT inject any provider-specific
// thinking-control / temperature / repetition_penalty field. Each setting
// is only sent when the caller explicitly passed it AND when the user has
// configured a value in Custom Advanced Settings. This keeps backward
// compatibility: empty/undefined settings mean "use provider default".
//
// Issue #99: disableThinking (data.json field) was a v1.18.2 opt-out that
// was flipped to opt-in in v1.20.0 — see types.ts for the new semantics.
// When the user does enable it, the LLMClient itself walks the 3-tier
// dialect fallback (anthropic → openai → none). The wrapper stays passive.
// Issue #128: extractionTemperature / chatTemperature inject `temperature`.
// Issue #128 follow-up: repetitionPenalty injects `repetition_penalty`.
// Issue #75: maxTokensPerCall cap wraps max_tokens via capMaxTokens.

import { LLMClient } from './types';
import { capMaxTokens } from './core/token-cap';

export interface WrapperSettings {
  maxTokensPerCall: number;
  extractionTemperature?: number;
  chatTemperature?: number;
  repetitionPenalty?: number;
}

/**
 * Returns a new LLMClient whose `createMessage` injects advanced settings
 * when set; otherwise passes through. The returned client's `createMessage`
 * never modifies a caller-provided parameter — only fills in unset ones.
 *
 * v1.23.2 refactor: replaced `.bind()` + in-place mutation (the old
 * pattern silently mutated the caller's client reference) with
 * `Object.create(client)` + explicit override of `createMessage`.
 * spread `{ ...client }` is NOT used because `OpenAICompatSdkClient`
 * (and other implementations) define `createMessageStream` and
 * `listModels` as prototype methods — spread only captures own
 * enumerable properties, which drops all prototype methods.
 * `Object.create(client)` preserves the prototype chain, so the
 * wrapper inherits `createMessageStream` from the original client.
 */
export function wrapWithAdvancedSettings(
  client: LLMClient,
  settings: WrapperSettings
): LLMClient {
  const capTokens = settings.maxTokensPerCall > 0;

  // Preserve prototype chain — Object.create inherits all prototype
  // methods (createMessageStream, listModels) from the original client.
  const wrapper = Object.create(client) as LLMClient;
  wrapper.createMessage = async (params) => {
    return client.createMessage({
      ...params,
      ...(capTokens ? { max_tokens: capMaxTokens(params.max_tokens, { maxTokensPerCall: settings.maxTokensPerCall }), maxTokensPerCall: settings.maxTokensPerCall } : {}),
      ...(params.temperature === undefined && settings.extractionTemperature !== undefined ? { temperature: settings.extractionTemperature } : {}),
      ...(params.repetition_penalty === undefined && settings.repetitionPenalty !== undefined ? { repetition_penalty: settings.repetitionPenalty } : {}),
    });
  };
  return wrapper;
}
