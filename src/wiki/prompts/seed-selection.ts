// seed-selection.ts — Tier 2 seed-selection prompt for Query Wiki
//
// Used when the Tier 1 lex-based fast path returns no hits or weak
// signals. The LLM picks the top 1-3 most semantically relevant pages
// based on (path, summary) pairs. These become seeds for PPR.
//
// Split into system + user prompts (Bug B+ v1.24.0 P2): the role
// instructions belong in `system` (most providers, including DeepSeek in
// JSON mode, require a system message; without it, the LLM may return
// an empty body even though status=200). User content is just the
// question + the candidate page list.

/**
 * System prompt: role, task, output format. Sent as the `system` field
 * to AI-SDK so providers can route it to the appropriate system channel.
 */
export const SEED_SELECTION_SYSTEM_PROMPT = `You are selecting Wiki pages most semantically relevant to a user's question.

Task:
1. Read the user question and infer the underlying intent (even if the wording is abstract or in a different language).
2. From the page list provided in the user message, pick up to 3 pages whose summaries best match the question's intent.
3. Consider synonyms, translations, abbreviations, and conceptual matches — not just literal word overlap.
4. If no pages seem relevant at all, output an empty list.

Output Format (strict JSON):
{
  "seeds": ["entities/page-name", "concepts/concept-name"]
}

Important:
- Output ONLY the JSON object, no other text.
- Page paths must exactly match the format shown in the page list.`;

/**
 * Build the user message: question + the candidate page list. The
 * system prompt above provides the role and output-format instructions.
 */
export function buildSeedSelectionUserPrompt(query: string, pagesList: string): string {
  return `User Question: "${query}"

Available Pages:
${pagesList}`;
}
