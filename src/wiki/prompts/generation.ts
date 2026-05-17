// Generation prompts — entity, concept, and summary page creation

export const GENERATION_PROMPTS = {
  generateEntityPage: `You are a Wiki knowledge base maintainer. Create a Wiki page for the following entity.

**Entity Information:**
- Name: {{entity_name}}
- Type: {{entity_type}}
- Summary: {{entity_summary}}
- Mentions in source (VERBATIM — preserve original language): {{mentions}}
- Related entities: {{related_entities}}
- Related concepts: {{related_concepts}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**Existing Related Content in Wiki:**
{{related_content}}

{{merge_strategy}}

**Task Requirements:**
1. Create an entity page with basic and key information
2. When referencing other pages, copy the wiki-link format EXACTLY from the "Existing Wiki Pages" list. The LEFT side of | is the full path (entities/Page-Name), the RIGHT side is the DISPLAY NAME ONLY. NEVER duplicate folder prefixes like entities/ or concepts/ in the display name. Example: [[entities/Qwen|Qwen]] is CORRECT, [[entities/Qwen|entities/Qwen]] is WRONG
3. If the entity already exists in the Wiki, use the merge strategy above for intelligent merging
4. Be objective, accurate, and concise
5. **Generate aliases for this page** — provide 1-3 alternative names. This field is REQUIRED:
   - If the page name is in Chinese, add the English equivalent as alias
   - If the page name is in English, add a Chinese translation as alias (when Wiki language is Chinese)
   - Include common acronyms, abbreviations, or alternative phrasings
   - **If no natural alias exists**, fall back to: a translation in the Wiki language, the source file name, or the entity name itself in the other language. The aliases field MUST NOT be left empty — always provide at least one meaningful alias
6. In "Mentions in Source" section: preserve the VERBATIM quotes in their ORIGINAL language. You may ADD a brief translation in parentheses if the wiki language differs, but the original text must be preserved exactly

**Output Format:**
---
type: entity  # MUST be exactly "entity" - do not change this value
created: {{date}}
updated: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{entity_type}}]  # Use entity_type (e.g., product, person, organization) as a tag
aliases: ["Alternative name or translation"]  # REQUIRED: at least 1 alias, must NOT be empty
---

# {{entity_name}}

## {{section_basic_information}}
- Type: {{entity_type}}
- Source: [[{{source_file}}]]

## {{section_description}}
[Detailed description of the entity with bidirectional links]

## {{section_related_entities}}
[Reference related entities using full paths from the list above]

## {{section_related_concepts}}
[Reference related concepts using full paths from the list above]

## {{section_mentions_in_source}}
- [Verbatim quote from source, preserved in original language. Translation optional in parentheses]

---`,

  generateConceptPage: `You are a Wiki knowledge base maintainer. Create a Wiki page for the following concept.

**Concept Information:**
- Name: {{concept_name}}
- Type: {{concept_type}}
- Summary: {{concept_summary}}
- Mentions in source (VERBATIM — preserve original language): {{mentions}}
- Related concepts: {{related_concepts}}
- Related entities: {{related_entities}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**Existing Related Content in Wiki:**
{{related_content}}

{{merge_strategy}}

**Task Requirements:**
1. Create a concept page including definition, characteristics, and applications
2. When referencing other pages, copy the wiki-link format EXACTLY from the "Existing Wiki Pages" list. The LEFT side of | is the full path (concepts/Page-Name), the RIGHT side is the DISPLAY NAME ONLY. NEVER duplicate folder prefixes like entities/ or concepts/ in the display name. Example: [[concepts/Attention|Attention]] is CORRECT, [[concepts/Attention|concepts/Attention]] is WRONG
3. If the concept already exists in the Wiki, use the merge strategy above for intelligent merging
4. Be objective, accurate, and concise
5. **Generate aliases for this page** — provide 1-3 alternative names. This field is REQUIRED:
   - If the page name is in Chinese, add the English equivalent as alias
   - If the page name is in English, add a Chinese translation as alias (when Wiki language is Chinese)
   - Include common acronyms, abbreviations, or alternative phrasings
   - **If no natural alias exists**, fall back to: a translation in the Wiki language, the source file name, or the concept name itself in the other language. The aliases field MUST NOT be left empty — always provide at least one meaningful alias
6. In "Mentions in Source" section: preserve the VERBATIM quotes in their ORIGINAL language. You may ADD a brief translation in parentheses if the wiki language differs, but the original text must be preserved exactly

**Output Format:**
---
type: concept  # MUST be exactly "concept" - do not change this value
created: {{date}}
updated: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{concept_type}}]  # Use concept_type (e.g., theory, method, technology) as a tag
aliases: ["Alternative name or translation"]  # REQUIRED: at least 1 alias, must NOT be empty
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

## {{section_mentions_in_source}}
- [Verbatim quote from source, preserved in original language. Translation optional in parentheses]

---`,

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
5. **Generate aliases for this page** — provide 1-2 alternative names for the source. This field is REQUIRED:
   - Add an English translation of the title as alias (if title is in Chinese)
   - Add a Chinese translation of the title as alias (if title is in English and Wiki language is Chinese)
   - **If no natural alias exists**, use the source file name or the title itself in the other language. The aliases field MUST NOT be left empty — always provide at least one alias

**Output Format:**
---
type: source
created: {{date}}
updated: {{date}}
source_file: "[[{{source_file}}]]"
tags: [{{tags}}]
aliases: ["Alternative title or translation"]  # REQUIRED: at least 1 alias, must NOT be empty
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

---`,

  // Variant used when the existing page has `reviewed: true` in frontmatter.
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
5. When referencing other pages, copy the wiki-link format EXACTLY from the list above. NEVER duplicate folder prefixes in the display name. Example: [[entities/Qwen|Qwen]] is CORRECT, [[entities/Qwen|entities/Qwen]] is WRONG

**Output Format:**
---
type: entity
created: {{date}}
updated: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
aliases: []
reviewed: true
---

[Fully preserve user-reviewed existing content here]

## {{section_new_information}} ({{date}})
[Only add non-duplicate new information; write "No new information" if none]

---`,

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
5. When referencing other pages, copy the wiki-link format EXACTLY from the list above. NEVER duplicate folder prefixes in the display name. Example: [[entities/Qwen|Qwen]] is CORRECT, [[entities/Qwen|entities/Qwen]] is WRONG

**Output Format:**
---
type: concept
created: {{date}}
updated: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
aliases: []
reviewed: true
---

[Fully preserve user-reviewed existing content here]

## {{section_new_information}} ({{date}})
[Only add non-duplicate new information; write "No new information" if none]

---`,

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
};
