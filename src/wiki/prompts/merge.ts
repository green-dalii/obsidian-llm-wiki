// Merge prompts — multi-source knowledge fusion and content integration

export const MERGE_PROMPTS = {
  // Multi-Source Knowledge Fusion: structured merge analysis
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

  mergeEntityPage: `You are a Wiki editor performing intelligent content integration. Merge new source information into an existing page following the schema-defined structure.

**Schema Rules (MUST follow this structure):**
- ## Basic Information: Type, sources, key attributes
- ## Description: Core definition and significance (3-6 sentences)
- ## Related Entities: Links to related entities
- ## Related Concepts: Links to related concepts
- ## Mentions in Source: Chronological list of mentions with VERBATIM quotes in original language

**Existing Page Content (the current version):**
{{existing_body}}

**New Information from Source "{{new_source}}":**
- Summary: {{entity_summary}}
- Mentions in source: {{mentions}}
- Related entities: {{related_entities}}
- Related concepts: {{related_concepts}}
- Key details: {{key_details}}

**Available Wiki Pages for linking (use exact [[path|name]] format):**
{{existing_pages}}

**Integration Requirements:**
1. STRUCTURE: Follow the schema sections exactly. If a section exists, update it; if missing, create it.
2. DESCRIPTION: Integrate new facts naturally. Do NOT duplicate existing information.
3. RELATED: Update "Related Entities" and "Related Concepts" sections with new relationships.
4. CONTRADICTIONS: If new info conflicts with existing, preserve BOTH with clear attribution.
5. MENTIONS: Append new mentions to "Mentions in Source". Preserve VERBATIM quotes in original language. Translation optional in parentheses.
6. LINKS: Use [[path|display]] format. LEFT side = full path, RIGHT side = display name ONLY. NEVER duplicate folder prefixes (entities/, concepts/) in display name. Verify paths exist.
7. STYLE: Match existing writing style.
8. NO REDUNDANCY: Do NOT restate existing facts.

**Output Format:**
Output ONLY the body content (no frontmatter):

## Basic Information
[Type, sources, key attributes — updated]

## Description
[Integrated description — merge existing + new, no duplication]

## Related Entities
[Updated entity links]

## Related Concepts
[Updated concept links]

## Mentions in Source
[ALL mentions — existing preserved, new appended with attribution. Verbatim quotes in original language]`,

  mergeConceptPage: `You are a Wiki editor performing intelligent content integration. Merge new source information into an existing concept page following the schema-defined structure.

**Schema Rules (MUST follow this structure):**
- ## Basic Information: Type, sources, definition
- ## Description: Detailed explanation with examples (3-6 sentences)
- ## Related Concepts: Connected concepts using [[concepts/...]]
- ## Related Entities: Connected entities using [[entities/...]]
- ## Mentions in Source: VERBATIM quotes in original language with source attribution

**Existing Page Content (the current version):**
{{existing_body}}

**New Information from Source "{{new_source}}":**
- Summary: {{concept_summary}}
- Mentions in source: {{mentions}}
- Related concepts: {{related_concepts}}
- Related entities: {{related_entities}}
- Key details: {{key_details}}

**Available Wiki Pages for linking (use exact [[path|name]] format):**
{{existing_pages}}

**Integration Requirements:**
1. STRUCTURE: Follow the schema sections exactly. Update existing, create missing.
2. DESCRIPTION: Integrate new understanding coherently with existing.
3. RELATED CONCEPTS: Update links — add new ones, preserve existing.
4. RELATED ENTITIES: Update links — add new ones from this source.
5. CONTRADICTIONS: If new info conflicts, preserve both with attribution.
6. MENTIONS: Append to "Mentions in Source". Preserve VERBATIM quotes in original language.
7. LINKS: Use [[path|display]] format. LEFT side = full path, RIGHT side = display name ONLY. NEVER duplicate folder prefixes (entities/, concepts/) in display name. Verify paths exist.
8. STYLE: Match existing writing style.
9. NO REDUNDANCY: Do NOT restate existing facts.

**Output Format:**
Output ONLY the body content (no frontmatter):

## Basic Information
[Type, sources, definition — updated]

## Description
[Integrated description — merge existing + new]

## Related Concepts
[Updated concept links]

## Related Entities
[Updated entity links]

## Mentions in Source
[ALL mentions — existing preserved, new appended. Verbatim quotes in original language]`,

  // Minimal append mode for reviewed pages
  appendToReviewedPage: `You are a Wiki editor adding new information to a user-reviewed page. The existing content is AUTHORITATIVE and must be preserved exactly.

**User-Reviewed Existing Content (MUST preserve completely):**
{{existing_body}}

**New Information from Source "{{new_source}}":**
- Summary: {{entity_summary}}
- Mentions: {{mentions}}
- Key details: {{key_details}}

**Task:**
1. Compare new information against existing content
2. If new info is COMPLETELY REDUNDANT with existing content → output "NO_NEW_CONTENT"
3. If new info adds genuinely new facts → append them in a "New Information ({{new_source}})" section at the end
4. DO NOT modify any existing content
5. DO NOT remove or rewrite any existing sections

**Output Format:**
If no new content: output exactly "NO_NEW_CONTENT"

If new content exists:
[existing content preserved exactly]

## New Information ({{new_source}})
[Only genuinely new facts, written to match existing style]`,
};
