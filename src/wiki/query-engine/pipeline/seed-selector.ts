// PR #3 split: Tier 2 LLM-based semantic seed selection extracted from
// query-engine.ts (1340-1372).
//
// Called when the Tier 1 lex fast path returns no hits or weak signals.
// Sends the user's query + a compact list of (path, summary) pairs to
// the LLM, which returns up to 3 page paths as seeds. The LLM is the
// primary semantic matcher here — handles synonyms, cross-language
// aliases, and abstract queries that pure string matching can't reach.
//
// Graceful degradation: returns empty array on any failure (LLM
// unavailable, parse error, network timeout). Caller falls back to
// whatever the lex fast path returned.

import { PageRef } from '../../../core/ppr-cascade';
import { parseJsonResponse } from '../../../core/json';
import { PROMPTS } from '../../../prompts';

/** Minimal LLMClient surface — only `createMessage` is required for seed selection. */
export interface SeedLLMClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
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

  const prompt = PROMPTS.seedSelection
    .replace('{{query}}', query)
    .replace('{{pages}}', pagesList);

  try {
    const response = await client.createMessage({
      model: settings.model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      ...(settings.disableThinking ? { enableThinking: false } : {}),
    });
    const parsed = await parseJsonResponse(response) as { seeds?: string[] } | null;
    const rawSeeds = parsed?.seeds || [];
    // Validate against pageRefs — drop any paths that don't exist.
    const validPaths = new Set(pageRefs.map(p => p.path));
    return rawSeeds.filter(s => validPaths.has(s));
  } catch (error) {
    console.warn('[LLM seed selection failed]', error);
    return [];
  }
}
