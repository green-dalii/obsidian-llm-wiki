// Conversation prompts — evaluating and deduplicating conversation knowledge

export const CONVERSATION_PROMPTS = {
  evaluateConversationValue: `You are a Wiki knowledge evaluation assistant. Determine whether the following conversation contains substantive knowledge worth saving to the Wiki.

Conversation Content:
{{conversation}}

Evaluation Criteria:
- Contains specific concept explanations, analysis, or factual information (not just casual chat)
- The conversation content can be distilled into structured Wiki entries
- The information has reference value and may be consulted again in the future

Output JSON format:
{"valuable": true/false, "reason": "Reason for judgment (one sentence)"}`,

  dedupCheck: `You are a Wiki knowledge deduplication assistant. Determine whether the conversation content is already covered by existing Wiki pages.

Existing Wiki Page Index:
{{wiki_index}}

Conversation Summary:
{{conversation_summary}}

Task:
1. Analyze the knowledge topics covered in the conversation
2. Determine whether these topics already exist in the above Wiki pages
3. If all topics are already covered (semantically identical or highly similar), mark as fully_redundant
4. If some topics are new, mark as partially_new and list the new topics

Output JSON format:
{"status": "fully_redundant|partially_new|entirely_new", "new_topics": ["new topic 1"], "redundant_topics": ["covered topic 1"], "reason": "Reason for judgment (one sentence)"}`,
};
