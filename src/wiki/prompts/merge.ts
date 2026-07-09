// Merge prompts — multi-source knowledge fusion and content integration

export const MERGE_PROMPTS = {
  // Multi-Source Knowledge Fusion: structured merge analysis.
//
// v1.24.0 #216 — Tier-2: extended from binary triage to 4-class
// per-item classification. The classifier outputs a structured
// `items[]` array so the complementary path can append each new
// fact into its target section (Tier-2: targeted append, not full
// rewrite). Strategies:
//
//   - 'skip'           — every item is a duplicate; items[] is empty.
//                         Skip path: only update frontmatter.
//   - 'merge'          — substantial restructuring needed (e.g. new
//                         section, full rewrite); items[] is empty.
//                         Falls through to the existing body-merge path.
//   - 'complementary'  — each item adds detail to an existing section;
//                         populate items[] with target_section =
//                         EXACTLY one of the {{section_labels}} values.
//                         Per-section append path.
//   - 'contradictory'  — new info conflicts with existing; items[]
//                         is empty; falls through to the existing
//                         body-merge path (which already handles
//                         "preserve both with attribution").
//
// The {{section_labels}} placeholder is rendered with the **localized**
// section names from getSectionLabels(settings), so target_section
// values match the labels actually present in the existing page
// (matters for i18n wikis: de uses "Beschreibung", ja uses "説明", etc.).
  mergeAnalysis: `You are a Wiki knowledge fusion analyzer. Decide how to integrate new source information into the existing Wiki page.

**Page Name:** {{page_name}}
**Page Type:** {{page_type}}

**Existing Page Content:**
{{existing_content}}

**New Information from Source File:**
{{new_info}}

**Available sections in the existing page (target_section MUST be one of these exact names):**
{{section_labels}}

**Task:**
Examine the new information and classify each piece into ONE of the four strategies:

- "skip" — every piece is already fully present in the existing page. No new content to add. \`items\` MUST be an empty array.
- "merge" — substantial restructuring needed (e.g. a new section is required, the existing structure is wrong, or the new info contradicts existing). The full body-rewrite path will be used. \`items\` MUST be an empty array.
- "complementary" — each piece adds new facts that fit into one of the existing sections. Populate \`items\` with one entry per new fact:
  - \`kind\` = "complementary"
  - \`content\` = the specific new fact to append (verbatim from the source if possible, otherwise a concise paraphrase)
  - \`target_section\` = EXACTLY one name from the available sections list (this is critical for i18n matching)
  - \`reason\` = one-sentence justification
- "contradictory" — new info conflicts with existing facts. The full body-rewrite path will handle attribution. \`items\` MUST be an empty array.

Output JSON format (ONLY this object, no other text):
{
  "strategy": "skip" | "merge" | "complementary" | "contradictory",
  "items": [
    {
      "kind": "complementary",
      "content": "Specific new fact text",
      "target_section": "Exact section name from the available sections list",
      "reason": "Why this belongs in target section (one sentence)"
    }
  ],
  "reason": "One-sentence overall justification"
}

Rules:
- Default to "merge" if uncertain — better to rewrite than to silently drop new info.
- \`target_section\` MUST be exactly one of the available sections list (case-sensitive).
- Output ONLY JSON, nothing else.`,

  mergeEntityPage: `You are a Wiki editor performing intelligent content integration. Merge new source information into an existing page following the schema-defined structure.

**Schema Rules (MUST follow this structure):**
- ## {{section_basic_information}}: Type, sources, key attributes
- ## {{section_description}}: Core definition and significance (3-6 sentences)
- ## {{section_related_entities}}: Links to related entities
- ## {{section_related_concepts}}: Links to related concepts

**Existing Page Content (the current version):**
{{existing_body}}

**New Information from Source "{{new_source}}":**
- Summary: {{entity_summary}}
- Related entities: {{related_entities}}
- Related concepts: {{related_concepts}}
- Key details: {{key_details}}

**Available Wiki Pages for linking (use exact [[path|name]] format):**
{{existing_pages}}

**Integration Requirements:**
1. STRUCTURE: Follow the schema sections exactly. If a section exists, update it; if missing, create it.
2. DESCRIPTION: Integrate new facts naturally. Do NOT duplicate existing information.
3. RELATED: Update "{{section_related_entities}}" and "{{section_related_concepts}}" sections with new relationships.
4. CONTRADICTIONS: If new info conflicts with existing, preserve BOTH with clear attribution.
5. LINKS: Use [[path|display]] format. LEFT side = full path, RIGHT side = display name ONLY. NEVER duplicate folder prefixes (entities/, concepts/) in display name. Verify paths exist.
6. STYLE: Match existing writing style.
7. NO REDUNDANCY: Do NOT restate existing facts.

**Output Format:**
Output ONLY the body content (no frontmatter):

## {{section_basic_information}}
[Type, sources, key attributes — updated]

## {{section_description}}
[Integrated description — merge existing + new, no duplication]

## {{section_related_entities}}
[Updated entity links]

## {{section_related_concepts}}
[Updated concept links]`,

  mergeConceptPage: `You are a Wiki editor performing intelligent content integration. Merge new source information into an existing concept page following the schema-defined structure.

**Schema Rules (MUST follow this structure):**
- ## {{section_basic_information}}: Type, sources, definition
- ## {{section_description}}: Detailed explanation with examples (3-6 sentences)
- ## {{section_related_concepts}}: Connected concepts using [[concepts/...]]
- ## {{section_related_entities}}: Connected entities using [[entities/...]]

**Existing Page Content (the current version):**
{{existing_body}}

**New Information from Source "{{new_source}}":**
- Summary: {{concept_summary}}
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
6. LINKS: Use [[path|display]] format. LEFT side = full path, RIGHT side = display name ONLY. NEVER duplicate folder prefixes (entities/, concepts/) in display name. Verify paths exist.
7. STYLE: Match existing writing style.
8. NO REDUNDANCY: Do NOT restate existing facts.

**Output Format:**
Output ONLY the body content (no frontmatter):

## {{section_basic_information}}
[Type, sources, definition — updated]

## {{section_description}}
[Integrated description — merge existing + new]

## {{section_related_concepts}}
[Updated concept links]

## {{section_related_entities}}
[Updated entity links]`,

  // Minimal append mode for reviewed pages
  appendToReviewedPage: `You are a Wiki editor adding new information to a user-reviewed page. The existing content is AUTHORITATIVE and must be preserved exactly.

**User-Reviewed Existing Content (MUST preserve completely):**
{{existing_body}}

**New Information from Source "{{new_source}}":**
- Summary: {{entity_summary}}
- Key details: {{key_details}}

**Task:**
1. Compare new information against existing content
2. If new info is COMPLETELY REDUNDANT with existing content → output "NO_NEW_CONTENT"
3. If new info adds genuinely new facts → append them in a "New Information ({{new_source}})" section at the end
4. DO NOT modify any existing content
5. DO NOT remove or rewrite any existing sections
6. {{constraints}}

**Output Format:**
If no new content: output exactly "NO_NEW_CONTENT"

If new content exists:
[existing content preserved exactly]

## New Information ({{new_source}})
[Only genuinely new facts, written to match existing style]`,

  // Update related page with incremental information from a new source
  updateRelatedPage: `Existing Wiki page: {{page_name}}

Existing content:
{{existing_body}}

The new source file ("{{source_basename}}") provides additional information about {{page_name}}:
{{new_info}}

Update the page by adding the new information without deleting existing content.
{{constraints}}
Use wiki-link syntax [[page-name]].
Output ONLY the updated page BODY content (without frontmatter), no other text.`,
};
