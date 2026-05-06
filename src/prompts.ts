// LLM prompt templates for Wiki operations

export const PROMPTS = {
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
2. Output at most {{batch_size}} items (entities + concepts total) this round. If fewer than {{batch_size}} remaining items are worth extracting, output only what actually exists
3. Write a 2-4 sentence summary for each item (for downstream page generation), covering: what it is, its importance in the source, key attributes or arguments. Be thorough — provide enough information for downstream page generation. Also note specific mentions in the source
4. Identify contradictions or conflicts with the existing Wiki (only output contradictions in the first round)
5. Identify related existing Wiki pages (only output related_pages in the first round)
6. Generate key points from the source file (only output key_points in the first round)

**Output Format (strict JSON, output only JSON, no explanatory text):**
{
  "source_title": "Source file title",
  "summary": "100-200 word source summary (first round only, omitted thereafter)",
  "entities": [
    {
      "name": "Entity name",
      "type": "person|organization|project|product|event|location|other",
      "summary": "A concise but informative 2-4 sentence description covering identity, importance, and key attributes",
      "mentions_in_source": ["Specific mention of this entity in the source"]
    }
  ],
  "concepts": [
    {
      "name": "Concept name",
      "type": "theory|method|technology|term|other",
      "summary": "A concise but informative 2-4 sentence description covering definition, importance, and relationship to other concepts in the source",
      "mentions_in_source": ["Specific mention of this concept in the source"],
      "related_concepts": ["Related concept names"]
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
- Entity and concept names should use the wiki's configured output language, and be consistent
- Each entity and concept should have its own independent Wiki page
- Carefully compare against existing content when detecting contradictions
- related_pages should be pages that actually exist in the current Wiki
- Output must be valid JSON format
- Do NOT repeat any item already in the "extracted list". If no unextracted items remain in the source, return empty arrays [] for entities and concepts`,

  generateEntityPage: `You are a Wiki knowledge base maintainer. Create a Wiki page for the following entity.

**Entity Information:**
- Name: {{entity_name}}
- Type: {{entity_type}}
- Summary: {{entity_summary}}
- Mentions in source: {{mentions}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**Existing Related Content in Wiki:**
{{related_content}}

{{merge_strategy}}

**Task Requirements:**
1. Create an entity page with basic and key information
2. When referencing other pages, use the exact full path format from the "Existing Wiki Pages" list above (e.g. [[entities/Page-Name|Page Name]])
3. If the entity already exists in the Wiki, use the merge strategy above for intelligent merging
4. Be objective, accurate, and concise

**Output Format:**
---
type: entity
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
---

# {{entity_name}}

## {{section_basic_information}}
- Type: {{entity_type}}
- Source: [[{{source_file}}]]

## {{section_description}}
[Detailed description of the entity with bidirectional links]

## {{section_related_content}}
[Reference related concepts and entities using full paths from the list above]

## {{section_mentions_in_source}}
- [Specific mention content]

---
Updated: {{date}}`,

  // Variant used when the existing page has `reviewed: true` in frontmatter.
  // The LLM must treat the human-edited content as authoritative and only
  // append genuinely new information from the latest source.
  preserveReviewedEntityPage: `You are a Wiki knowledge base maintainer. The following entity page has been manually reviewed by the user (reviewed: true).

**⚠️ Important: User-reviewed content must be fully preserved. Do NOT delete or rewrite.**

**Entity Information (from new source file):**
- Name: {{entity_name}}
- Type: {{entity_type}}
- Summary: {{entity_summary}}
- Mentions in source: {{mentions}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**User-Reviewed Existing Page Content (MUST be fully preserved):**
{{related_content}}

**Task Requirements:**
1. **Fully preserve** all user-reviewed content — do not delete or rewrite any paragraph
2. Only add non-duplicate information from the new source at the end in a "New Information" section
3. If new information duplicates or contradicts existing content, do NOT add it; keep the user's version
4. The frontmatter MUST retain reviewed: true
5. When referencing other pages, use the full path format from the list above

**Output Format:**
---
type: entity
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
reviewed: true
---

[Fully preserve user-reviewed existing content here]

## {{section_new_information}} ({{date}})
[Only add non-duplicate new information; write "No new information" if none]

---
Updated: {{date}}`,

  // Variant used when the existing concept page has `reviewed: true` in frontmatter.
  preserveReviewedConceptPage: `You are a Wiki knowledge base maintainer. The following concept page has been manually reviewed by the user (reviewed: true).

**⚠️ Important: User-reviewed content must be fully preserved. Do NOT delete or rewrite.**

**Concept Information (from new source file):**
- Name: {{concept_name}}
- Type: {{concept_type}}
- Summary: {{concept_summary}}
- Mentions in source: {{mentions}}
- Related concepts: {{related_concepts}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**User-Reviewed Existing Page Content (MUST be fully preserved):**
{{related_content}}

**Task Requirements:**
1. **Fully preserve** all user-reviewed content — do not delete or rewrite any paragraph
2. Only add non-duplicate information from the new source at the end in a "New Information" section
3. If new information duplicates or contradicts existing content, do NOT add it; keep the user's version
4. The frontmatter MUST retain reviewed: true
5. When referencing other pages, use the full path format from the list above

**Output Format:**
---
type: concept
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
reviewed: true
---

[Fully preserve user-reviewed existing content here]

## {{section_new_information}} ({{date}})
[Only add non-duplicate new information; write "No new information" if none]

---
Updated: {{date}}`,

  generateConceptPage: `You are a Wiki knowledge base maintainer. Create a Wiki page for the following concept.

**Concept Information:**
- Name: {{concept_name}}
- Type: {{concept_type}}
- Summary: {{concept_summary}}
- Mentions in source: {{mentions}}
- Related concepts: {{related_concepts}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**Existing Related Content in Wiki:**
{{related_content}}

{{merge_strategy}}

**Task Requirements:**
1. Create a concept page including definition, characteristics, and applications
2. When referencing other pages, use the exact full path format from the "Existing Wiki Pages" list above (e.g. [[concepts/Page-Name|Page Name]])
3. If the concept already exists in the Wiki, use the merge strategy above for intelligent merging
4. Be objective, accurate, and concise

**Output Format:**
---
type: concept
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
---

# {{concept_name}}

## {{section_definition}}
[Clear definition of the concept]

## {{section_key_characteristics}}
- Characteristic 1
- Characteristic 2

## {{section_applications}}
[Application scenarios for the concept]

## {{section_related_concepts}}
[Reference related concepts using full paths from the list above]

## {{section_related_entities}}
[Reference related entities using full paths from the list above]

---
Updated: {{date}}`,

  generateSummaryPage: `You are a Wiki knowledge base maintainer. Create a summary page for the following source file.

**Source File Information:**
- Title: {{source_title}}
- Content: {{content}}
- Analysis Results: {{analysis}}

**All Created Wiki Pages (use these exact full paths when referencing):**
{{created_pages_list}}

**Task Requirements:**
1. Create a concise summary page
2. When referencing entities and concepts, use the exact full path format from the "All Created Wiki Pages" list above
3. Highlight key points
4. Be objective and accurate

**Output Format:**
---
type: source
created: {{date}}
source_file: "[[{{source_file}}]]"
tags: [{{tags}}]
---

# {{source_title}} - Summary

## {{section_source}}
- Original file: [[{{source_file}}]]
- Ingested: {{date}}

## {{section_core_content}}
[100-200 word summary with bidirectional links]

## {{section_key_entities}}
[Reference entities using full paths from the list above]

## {{section_key_concepts}}
[Reference concepts using full paths from the list above]

## {{section_main_points}}
- Point 1
- Point 2

---
Updated: {{date}}`,

  suggestSchemaUpdate: `You are a Wiki Schema advisor. Review the current schema and the latest ingestion analysis.

Current Schema:
{{schema_content}}

Analysis Context:
{{analysis_context}}

Task: Determine if the schema needs updating to better accommodate recent content.
Consider:
1. Are there new entity types that should be added to the classification rules?
2. Are there new concept types that should be added?
3. Should naming conventions be adjusted?
4. Should page templates be updated (missing sections, better structure)?
5. Should maintenance policies be revised (stale thresholds, severity levels)?

Output JSON format:
{
  "changes_needed": true,
  "suggestions": "Markdown description of suggested schema changes with reasoning"
}

If no changes are needed:
{
  "changes_needed": false,
  "suggestions": ""
}

Output ONLY the JSON, no other text.`,

  // Multi-Source Knowledge Fusion: structured merge analysis
  // Called before page generation when a page already exists with substantial content.
  mergeAnalysis: `You are a Wiki knowledge fusion analyzer. Compare existing Wiki page content with new source file information, and output a structured merge strategy.

**Page Name:** {{page_name}}
**Page Type:** entity or concept

**Existing Page Content:**
{{existing_content}}

**New Information from Source File:**
{{new_info}}

**Task:**
1. Compare each piece of new information against the existing content
2. Classify each piece of new information as:
   - "new" — completely new information not in the existing page
   - "duplicate" — duplicates existing content; no need to add
   - "complementary" — supplements existing content (additional detail on the same topic)
   - "contradictory" — contradicts existing content
3. For "complementary" information, specify which section of the existing page it should be inserted after
4. For "contradictory" information, document the specific contradiction

Output JSON format:
{
  "merge_items": [
    {
      "content": "Specific content of the new information",
      "classification": "new|duplicate|complementary|contradictory",
      "target_section": "Section name to insert after (only for new and complementary)",
      "reason": "Reason for classification (one sentence)"
    }
  ],
  "contradictions": [
    {
      "claim": "What the new information claims",
      "existing_claim": "Contradictory content in the existing page",
      "resolution": "Suggested resolution"
    }
  ],
  "merge_summary": "Merge strategy summary (one sentence)"
}

Rules:
- Output ONLY JSON, nothing else
- Existing content takes priority over new information (unless the new information is clearly more accurate)
- Do NOT delete or rewrite any part of the existing content`,

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

  resolveContradiction: `You are a Wiki contradiction resolution assistant. Generate a repaired page based on the contradiction record and affected page content.

Affected Page Content:
{{existing_content}}

Contradiction Record:
{{contradiction_content}}

Task:
1. Analyze both sides of the contradiction
2. Reconcile: preserve correct information, annotate suspected incorrect information
3. For factual contradictions, choose the more reliable or newer source
4. For perspective differences, preserve both viewpoints and note the different standpoints

Important Rules:
- Do NOT delete any existing content
- Add a "## {{section_resolved_contradictions}}" section at the end of the affected page, explaining the resolution approach and reasoning
- Keep the overall page structure intact; only adjust contradiction-related parts
- Output the complete repaired page content (not just the modified parts)
- Do NOT output any explanatory text; directly output Markdown-formatted page content`,

  fixDeadLink: `You are a Wiki dead link repair assistant. Analyze the dead link and repair it based on the situation.

Dead Link Source Page:
{{source_content}}

Dead Link Target (link text):
{{target_name}}

Existing Wiki Page List:
{{existing_pages}}

Task:
1. Search the existing page list for the page most similar to the target (based on semantic similarity)
2. If a matching page is found: output the correct [[entities/page-name]] or [[concepts/page-name]] link
3. If no match is found: output a concise name suitable as a new page title

Output JSON format:
{"action": "correct|create_stub", "correct_link": "Corrected link (when action=correct)", "stub_title": "New page title (when action=create_stub)", "stub_type": "entity|concept", "reason": "Reason for judgment (one sentence)"}`,

  fillEmptyPage: `You are a Wiki page expansion assistant. Generate content for the following under-populated Wiki page.

Page Path: {{page_path}}
Page Type (entities/concepts/sources): {{page_type}}

Existing Content:
{{existing_content}}

Wiki Index (background reference):
{{wiki_index}}

Task:
1. Generate appropriate content (150-300 words) based on the page type and title
2. entities type: describe the entity's definition, relevant background, and relationships with other entities
3. concepts type: explain the concept's definition, application scenarios, and related concepts
4. sources type: summarize the source's core viewpoints and contributions
5. Use [[wiki-links]] to link to related pages
6. Preserve any existing frontmatter and text

Output format: directly output the complete Markdown page content (do not output explanatory text)`,

  linkOrphanPage: `You are a Wiki link repair assistant. Establish backlinks to an orphan page from relevant pages.

Orphan Page:
{{orphan_content}}

Wiki Index:
{{wiki_index}}

Task:
1. Analyze the orphan page's topic
2. Select 1-3 most relevant existing pages from the Wiki index
3. For each relevant page, generate a suggested link text (one sentence description + wiki-link)

Output JSON format:
{"related_pages": [{"page_path": "wiki/entities/xxx.md", "link_text": "One sentence describing this connection", "link_target": "[[entities/orphan-name]]"}], "reason": "Connection rationale"}`,

};
