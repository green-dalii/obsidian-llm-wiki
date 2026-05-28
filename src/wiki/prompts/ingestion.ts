// Ingestion prompts — source analysis, entity resolution

export const INGESTION_PROMPTS = {
  analyzeSource: `You are a Wiki knowledge base maintainer. Analyze the following source file and output structured JSON.

**Source File Content:**
{{content}}

{{batch_context}}

**Extraction Scope:**
{{granularity_instruction}}

**Task Requirements:**
0. Output the source file title (source_title) and a 100-200 word source summary (summary). Only output these two fields in the first round
1. Extract entities and concepts that DESERVE standalone wiki pages — items another note could meaningfully link to, and that remain understandable independent of this source. Apply the wiki-link test before extracting: "Would a different note in this knowledge base link to [[this]]? Would someone search the wiki for this name?" If the answer is no, skip it. Bibliographic references (author citations like "Smith et al. 2022", study/trial names used as evidence pointers, journal article titles) are evidence containers — extract their FINDINGS as concepts instead, not the citation as an entity. Judge by wiki-graph value, not by prominence in the text
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
  "related_pages": ["Related existing Wiki page names — use ONLY the plain page name, NOT wiki-link format. Example: 'Machine Learning' not [[concepts/Machine Learning|Machine Learning]]"],
  "key_points": ["Key point 1", "Key point 2"]
}

**Entity Recognition Guide:**
- person: individual who is a significant SUBJECT of the source. Authors cited only as evidence sources ("Smith et al. found...") are NOT wiki-worthy entities
- organization: organization/institution (company, school, team, department, etc.)
- project: project/initiative/program
- product: product/tool/software/service. Publications only when they are the primary subject of analysis, not when cited as evidence sources
- event: event/conference/milestone/historical occurrence
- location: place/region/geographic concept
- other: observable, instantiable concrete things (a specific dataset, benchmark, physical instrument) that do not fit any category above. NOT for abstract ideas, paradigms, or techniques — those are concepts

**Classification Decision Tree (Entity vs. Concept) — apply in order, stop at first match:**
1. Named PERSON → entity (person)
2. Named ORGANIZATION, institution, company, team, lab → entity (organization)
3. Named PROJECT or named initiative → entity (project)
4. Named LOCATION, place, region → entity (location)
5. Named EVENT, conference, competition, release milestone → entity (event)
6. Named PRODUCT with its own vendor/release cycle (specific software package, hardware device, hosted service) → entity (product). Examples: PyTorch, GPT-4, BERT, TensorFlow. BUT if the source is not primarily ABOUT this product, extract its key ideas as concepts instead
7. Abstract THEORY, principle, hypothesis, cognitive/scientific model → concept (theory)
8. Procedural METHOD, algorithm, technique, protocol, training procedure → concept (method). Examples: gradient descent, RLHF, fine-tuning, chain-of-thought prompting, backpropagation
9. Broad TECHNOLOGY paradigm or architectural pattern → concept (technology). Examples: transformer architecture, deep learning, attention mechanism, retrieval-augmented generation
10. Any TERM, definition, or construct explaining how something works → concept (term)
11. A concrete named thing that does not fit rules 1–6 → entity (other). Reserve for observable/instantiable things only
12. If still uncertain → **prefer concept over entity**

**Key boundary**: Named AI models and named frameworks are entities (product). Architectural ideas and learning techniques are concepts (method/technology). When a source mentions a product only as a tool used for something else, extract its role/capabilities as a concept, not the product as an entity.

**Important Rules:**
- Output ONLY JSON, nothing else
- **CRITICAL: Entity and concept "name" MUST use the ORIGINAL language from the source file. NEVER translate names.** If the source says "Yinmin Zhong", the name MUST be "Yinmin Zhong", NOT "钟胤敏". If the source says "Conditional Memory", the name MUST be "Conditional Memory", NOT "条件记忆". If the source says "Cache-Compute Ratio", the name MUST be "Cache-Compute Ratio". Translation of names is FORBIDDEN. Summaries and descriptions may use the wiki language, but the name field is inviolable
- "mentions_in_source" MUST contain 2-4 verbatim quotes from the source text. Do NOT paraphrase — copy the actual sentences where the entity/concept appears. Include full sentences with context, not fragments
- Each entity and concept should have its own independent Wiki page
- Carefully compare against existing content when detecting contradictions
- related_pages should be pages that actually exist in the current Wiki
- Output must be valid JSON format
- Do NOT repeat any item already in the "extracted list". If no unextracted items remain in the source, return empty arrays [] for entities and concepts
- Apply the wiki-link test to every candidate: if an entity/concept would not be linked from other notes, do not extract it. Knowledge claims and findings are more valuable than evidence containers`,

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
