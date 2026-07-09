// PR #3 split: Tier 2 LLM-based semantic seed selection extracted from
// query-engine.ts (1340-1372).
//
// Called when the Tier 1 lex fast path returns no hits or weak signals.
// Sends the user's query + a compact list of (path, summary) pairs to
// the LLM, which returns up to 3 page paths as seeds. The LLM is the
// primary semantic matcher here — handles synonyms, cross-language
// aliases, and abstract queries that pure string matching can't reach.
//
// On failure (LLM unavailable, parse error, network timeout, persistent
// empty), returns [] and the caller falls back to whatever the lex
// fast path returned. See transient-retry.ts for the Bug B retry policy.

import { PageRef } from '../../../core/ppr-cascade';
import { parseJsonResponse } from '../../../core/json';
import { withTransientRetry } from '../../../core/transient-retry';
import {
  SEED_SELECTION_SYSTEM_PROMPT,
  buildSeedSelectionUserPrompt,
} from '../../prompts/seed-selection';

/** Minimal LLMClient surface — only `createMessage` is required for seed selection. */
export interface SeedLLMClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    response_format?: { type: 'json_object' | 'text' };
    enableThinking?: boolean;
  }): Promise<string>;
}

/** Settings surface used by seed selector — disableThinking / model only. */
export interface SeedSelectorSettings {
  model: string;
  disableThinking?: boolean;
}

/**
 * Pure function — no `this`, no plugin reference. Caller (QueryView.buildWikiContext)
 * passes the LLMClient (which may be undefined → returns []) + settings.
 *
 * Validates returned paths against the input pageRefs so an LLM that
 * hallucinates paths gets dropped before they reach the cascade.
 */
export async function selectSeedsWithLLM(
  query: string,
  pageRefs: PageRef[],
  client: SeedLLMClient | undefined,
  settings: SeedSelectorSettings,
): Promise<string[]> {
  if (!client) return [];
  if (pageRefs.length === 0) return [];

  // Build compact (path, summary) list — cap at 50 pages to keep prompt bounded.
  const pagesList = pageRefs
    .slice(0, 50)
    .map(p => `- ${p.path}: ${p.summary || '(no summary)'}`)
    .join('\n');

  // Bug B+ fix: split into system + user. DeepSeek in JSON mode returns
  // empty body if no system message is provided (status 200, body='').
  // Keeping the role instructions in the system field forces a proper
  // response from the LLM.
  //
  // Wrap the LLM call + JSON parse in withTransientRetry so a
  // transient empty-string response or malformed JSON is retried.
  // The `fn` performs both steps so parse failures naturally surface
  // as thrown errors caught by the retry helper. We do NOT pass
  // `isTransientEmpty` because an empty `seeds` array is a valid
  // answer per the prompt's task 4 ("no relevant pages" → []).
  const retryResult = await withTransientRetry({
    fn: async () => {
      const response = await client.createMessage({
        model: settings.model,
        max_tokens: 200,
        system: SEED_SELECTION_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildSeedSelectionUserPrompt(query, pagesList),
        }],
        response_format: { type: 'json_object' },
        ...(settings.disableThinking ? { enableThinking: false } : {}),
      });
      // Debug log: response length + first 100 chars AFTER the call.
      // Critical for diagnosing empty-body / truncated / unexpected-shape
      // responses that previously caused silent seed-selector failures.
      // JSON.stringify escapes control chars (matches fix-runners.ts style).
      console.debug(
        `[LLM response] Seed selection: length=${response.length}, ` +
        `first100=${JSON.stringify(response.slice(0, 100))}`,
      );
      const parsed = await parseJsonResponse(response) as { seeds?: string[] } | null;
      if (!parsed || !Array.isArray(parsed.seeds)) {
        throw new Error('parseJsonResponse returned null or non-array seeds');
      }
      return parsed.seeds;
    },
    label: 'Seed selection',
    isAuthError: (error) => {
      const statusCode = (error as { statusCode?: number }).statusCode;
      return statusCode === 401 || statusCode === 403;
    },
    isRateLimitError: (error) => {
      const statusCode = (error as { statusCode?: number }).statusCode;
      return statusCode === 429;
    },
  });

  if (retryResult.error) {
    return [];
  }

  const rawSeeds = retryResult.value ?? [];

  // Validate against pageRefs — drop any paths that don't exist.
  const validPaths = new Set(pageRefs.map(p => p.path));
  return rawSeeds.filter(s => validPaths.has(s));
}
