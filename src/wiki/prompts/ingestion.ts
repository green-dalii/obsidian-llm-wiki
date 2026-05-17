// Ingestion prompts — source analysis, entity resolution

export const INGESTION_PROMPTS = {
  analyzeSource: `You are a Wiki knowledge base maintainer. Analyze the following source file and output structured JSON.

**Source File Content:**
{{content}}

**Existing Wiki Page List:**
{{existing_pages}}

{{batch_context}}

**Extraction Scope:**
{{granularity_instruction}}

**Task Requirements:**
0. Output the source file title (source_title) and a 100-200 word source summary (summary). Only output these two fields in the first round
1. Extract entities and concepts from the source file that have not already been extracted. Note: Entities are not limited to frequently mentioned people or organizations — important figures, products, events, datasets, codebases etc. that appear only once should also be extracted. Do not skip an entity just because it has few mentions; judge by its importance in the text, not its frequency
2. Output at most {{batch_size}} items (entities + concepts total) this round
3. Write a detailed, informative summary for each item (target 4-6 sentences). Include concrete information: what the entity/concept is, its role/significance in the source, key factual details, and how it relates to other items. Provide enough substance that the summary alone can seed a quality Wiki page
4. For mentions_in_source: quote 2-4 verbatim sentences from the source where this entity/concept appears or is discussed. These quotes are critical — they provide the downstream page generator with source-grounded evidence. Include surrounding context, not just the name mention
5. For related_entities and related_concepts: identify entities/concepts mentioned in the same context as this item. These should be other items extracted from this same source file
6. Identify contradictions or conflicts with the existing Wiki (only output contradictions in the first round)
7. Identify related existing Wiki pages (only output related_pages in the first round)
8. Generate key points from the source file (only output key_points in the first round)

**Output Format (strict JSON, output only JSON, no explanatory text):**
{
  "source_title": "Source file title",
  "summary": "150-250 word source summary (first round only, omitted thereafter)",
  "entities": [
    {
      "name": "Entity name — MUST be in the source's original language, NEVER translate",
      "type": "person|organization|project|product|event|location|other",
      "summary": "Detailed 4-6 sentence description with concrete facts: identity, role/significance, key attributes",
      "mentions_in_source": ["Verbatim sentence from source: '...'.", "Another verbatim quote: '...'."],
      "related_entities": ["Related entity names from this source"],
      "related_concepts": ["Related concept names from this source"]
    }
  ],
  "concepts": [
    {
      "name": "Concept name — MUST be in the source's original language, NEVER translate",
      "type": "theory|method|technology|term|other",
      "summary": "Detailed 4-6 sentence description with concrete facts: definition, importance, relationships",
      "mentions_in_source": ["Verbatim sentence from source: '...'.", "Another verbatim quote: '...'."],
      "related_concepts": ["Related concept names from this source"],
      "related_entities": ["Related entity names from this source"]
    }
  ],
  "contradictions": [
    {
      "claim": "What the source file claims",
      "source_page": "Conflicting existing Wiki page [[page-name]]",
      "contradicted_by": "What that page claims",
      "resolution": "Suggested resolution"
    }
  ],
  "related_pages": ["Related existing Wiki page names"],
  "key_points": ["Key point 1", "Key point 2"]
}

**Entity Recognition Guide:**
- person: individual (author, researcher, historical figure, etc.)
- organization: organization/institution (company, school, team, department, etc.)
- project: project/initiative/program
- product: product/tool/software/service/publication
- event: event/conference/milestone/historical occurrence
- location: place/region/geographic concept
- other: other concrete entities not fitting the concept category

**Important Rules:**
- Output ONLY JSON, nothing else
- **CRITICAL: Entity and concept "name" MUST use the ORIGINAL language from the source file. NEVER translate names.** If the source says "Yinmin Zhong", the name MUST be "Yinmin Zhong", NOT "钟胤敏". If the source says "Conditional Memory", the name MUST be "Conditional Memory", NOT "条件记忆". If the source says "Cache-Compute Ratio", the name MUST be "Cache-Compute Ratio". Translation of names is FORBIDDEN. Summaries and descriptions may use the wiki language, but the name field is inviolable
- "mentions_in_source" MUST contain 2-4 verbatim quotes from the source text. Do NOT paraphrase — copy the actual sentences where the entity/concept appears. Include full sentences with context, not fragments
- Each entity and concept should have its own independent Wiki page
- Carefully compare against existing content when detecting contradictions
- related_pages should be pages that actually exist in the current Wiki
- Output must be valid JSON format
- Do NOT repeat any item already in the "extracted list". If no unextracted items remain in the source, return empty arrays [] for entities and concepts`,

  // Semantic entity resolution: when slug-based matching fails, use LLM to determine
  // whether a newly extracted entity/concept is semantically equivalent to an existing page.
  resolveEntityDedup: `You are an entity resolution engine. Given a newly extracted entity/concept and a list of existing wiki pages, determine if it is semantically equivalent to any existing page.

**New entity/concept:**
- Name: {{entity_name}}
- Type: {{entity_type}}
- Summary: {{entity_summary}}

**Existing {{page_type}} pages:**
{{existing_pages}}

**Task:** Determine whether the new entity/concept is semantically the SAME as any existing page. Consider:
- Translations between languages (e.g. "清华大学" = "Tsinghua University")
- Abbreviations and full names (e.g. "MIT" = "Massachusetts Institute of Technology")
- Alternative phrasings (e.g. "Supervised Learning" = "Supervised ML")
- Spelling variations

**Output JSON:**
- If it matches an existing page, output: {"match": true, "path": "wiki/entities/existing-slug.md"}
- If no match exists, output: {"match": false, "path": null}

Do NOT create a new name — only match against the existing pages listed above.`,
};
