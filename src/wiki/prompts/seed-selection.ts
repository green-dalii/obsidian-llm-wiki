// seed-selection.ts — Tier 2 seed-selection prompt for Query Wiki
//
// Used when the Tier 1 lex-based fast path returns no hits or weak
// signals. The LLM picks the top 1-3 most semantically relevant pages
// based on (path, summary) pairs. These become seeds for PPR.

export const SEED_SELECTION_PROMPT = `You are selecting Wiki pages most semantically relevant to a user's question.

User Question: "{{query}}"

Available Pages:
{{pages}}

Task:
1. Read the user question and infer the underlying intent (even if the wording is abstract or in a different language).
2. From the page list, pick up to 3 pages whose summaries best match the question's intent.
3. Consider synonyms, translations, abbreviations, and conceptual matches — not just literal word overlap.
4. If no pages seem relevant at all, output an empty list.

Output Format (strict JSON):
{
  "seeds": ["entities/page-name", "concepts/concept-name"]
}

Important:
- Output ONLY the JSON object, no other text.
- Page paths must exactly match the format shown in the page list.`;