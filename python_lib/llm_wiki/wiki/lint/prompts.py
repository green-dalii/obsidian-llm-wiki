"""
Lint prompt templates — port of src/wiki/prompts/fixes.ts and src/wiki/prompts/lint.ts
"""

# ── Fix prompts ────────────────────────────────────────────────────────────────

FIX_DEAD_LINK_PROMPT = """You are a Wiki dead link repair assistant. Analyze the dead link and repair it based on the situation.

Dead Link Source Page:
{{source_content}}

Dead Link Target (link text):
{{target_name}}

Existing Wiki Page List:
{{existing_pages}}

Task:
1. **FIRST, check aliases:** Look at the `aliases:` listed after each page. If the dead link target matches any page's title OR any page's aliases (case-insensitive), that page IS the correct target — use action=correct
2. If no alias match, search for semantic similarity (translations, abbreviations, alternative phrasings)
3. If a matching page is found: output the correct [[entities/page-name|Display Name]] or [[concepts/page-name|Display Name]] link. The display name after | must NOT include folder prefixes like entities/ or concepts/
4. If no match is found after checking BOTH aliases and semantic similarity: output a concise name suitable as a new page title

Output JSON format:
{"action": "correct|create_stub", "correct_link": "Corrected link (when action=correct)", "stub_title": "New page title (when action=create_stub)", "stub_type": "entity|concept", "reason": "Reason for judgment (one sentence)"}"""

FILL_EMPTY_PAGE_PROMPT = """You are a Wiki page expansion assistant. Generate content for the following under-populated Wiki page.

Page Type (entities/concepts/sources): {{page_type}}

Existing Content:
{{existing_content}}

Wiki Index (background reference):
{{wiki_index}}

**Target Language Section Headers (use EXACTLY these headers):**
{{section_labels}}

Task:
1. Generate appropriate content (150-300 words) based on the page type and title
2. entities type: describe the entity's definition, relevant background, and relationships with other entities
3. concepts type: explain the concept's definition, application scenarios, and related concepts
4. sources type: summarize the source's core viewpoints and contributions
5. Use [[wiki-links]] to link to related pages. Copy the link format EXACTLY from the Wiki Index — the LEFT side is the full path (folder/page-name), the RIGHT side after | is the DISPLAY NAME only. NEVER duplicate folder prefixes like entities/ or concepts/ in the display name. Example: [[entities/Qwen|Qwen]] is correct, [[entities/Qwen|entities/Qwen]] is WRONG
6. **Related entities/concepts LIMIT:** Create at MOST {{max_entities}} related entity links and {{max_concepts}} related concept links. Focus on the most important connections only. Do NOT generate exhaustive lists
7. **IMPORTANT — Source Mentions:** Only create a "Mentions in Source" section if the existing content already contains verbatim source quotes. If no source quotes exist in the existing content, do NOT fabricate a "Mentions in Source" section — instead, note "*(No source content available for this page)*" in the description. NEVER invent fake citations or source references
8. Preserve any existing frontmatter fields exactly (type, created, sources, tags, reviewed). Do NOT remove or alter these fields
9. **Aliases are REQUIRED:** If the existing content has non-empty aliases, keep them. If aliases are missing or empty, you MUST generate 1-2 meaningful aliases following the fallback hierarchy: translation in Wiki language → alternative names → abbreviations. The aliases field MUST NOT be left empty
10. **Tags constraint:** entity pages MUST use tags from: [person, organization, project, product, event, place, other]. Concept pages MUST use tags from: [theory, method, field, phenomenon, standard, term, other]. Never invent new tags outside these lists

Output format: directly output the complete Markdown page content (do not output explanatory text)"""

LINK_ORPHAN_PAGE_PROMPT = """You are a Wiki link repair assistant. Establish backlinks to an orphan page from relevant pages.

Orphan Page:
{{orphan_content}}

Wiki Index:
{{wiki_index}}

Task:
1. Analyze the orphan page's topic
2. Select 1-3 most relevant existing pages from the Wiki index
3. For each relevant page, generate a suggested link text (one sentence description + wiki-link)

Output JSON format:
{"related_pages": [{"page_path": "{{wikiFolder}}/entities/xxx.md", "link_text": "One sentence describing this connection", "link_target": "[[entities/orphan-name]]"}], "reason": "Connection rationale"}"""

GENERATE_ALIASES_PROMPT = """You are a knowledge curator. Given a wiki page's title and body, suggest alternative names (aliases) someone might search for when looking for this concept.

**Page title:** {{title}}

**Page body:**
{{body}}

**What to generate:**
- **CRITICAL: do NOT invent translations for established technical terms.** Only suggest translations that genuinely exist in real-world usage (e.g. "Neural Network" ↔ "神经网络", not "Transformer" ↔ "变换器"). Real-world convention always wins.
- English is universally acceptable as a "linker language" — established English technical terms (e.g. "Transformer", "DNA", "API", "RoPE", "CUDA") may be kept as-is across all wikis
- Abbreviations: e.g. "Chain of Thought" → "CoT", "Mixture of Experts" → "MoE"
- Spelling variants: "Mixture-of-Experts", "Mixture of Experts", "Sparse MoE"
- Common alternative names in the field
- Full forms of abbreviations (e.g. "NTP" → "Next Token Prediction")

**Rules:**
- 3-8 aliases is ideal
- Only include names that genuinely refer to THIS concept
- Do NOT include the page title itself as an alias
- Prefer commonly-used names in the field

**You MUST output ONLY a valid JSON object, no other text:**
{"aliases": ["alias1", "alias2", "alias3"]}

If no meaningful aliases found: {"aliases": []}"""

LINT_TITLE_SCAN_PROMPT = """You are a Wiki duplicate scanner. Below is a list of ALL entity and concept wiki pages (path + title). Find pages that likely refer to the SAME underlying concept, even when named in different languages or formats.

**Pages ({{total}} total):**
{{title_list}}

**Common duplicate patterns to look for:**
- Translations: one Chinese title, one English title describing the same concept
- Abbreviations: "CoT" vs "Chain of Thought", "MoE" vs "Mixture of Experts"
- Alternate phrasings: same concept expressed with different wording
- Partial matches: "KV缓存" vs "键值缓存" (KV = Key-Value = 键值)

**Rules:**
- Only report pairs you are HIGHLY CONFIDENT refer to the same thing
- Do NOT report pairs that are merely related concepts
- Max 30 pairs
- Prefer the page with the MORE descriptive/specific title as "target" (keep)

**You MUST output ONLY a valid JSON object, no other text:**
{"candidates": [["{{wikiFolder}}/concepts/target-page.md", "{{wikiFolder}}/concepts/source-page.md"]]}

If no candidates found: {"candidates": []}"""

LINT_DUPLICATE_DETECTION_PROMPT = """You are a Wiki duplicate detection verifier. Review the candidate pairs below and confirm which are TRUE semantic duplicates.

**Candidate pairs (from programmatic signals and title scan):**
{{candidates}}

**Total entity/concept pages in wiki:** {{total}}

**Rules:**
- Confirm a pair ONLY if both pages refer to the SAME underlying concept/entity
- TRUE duplicates: translations (e.g. "CoT" = "思维链"), abbreviations, spelling variants, same thing named differently
- NOT duplicates: related concepts, parent-child relationships, overlapping topics
- Only confirm pairs you are HIGHLY CONFIDENT about (95%+ certainty)
- Keep the candidate's target/source assignment (target = keep, source = merge into target)

**You MUST output ONLY a valid JSON object, no other text:**
{"duplicates": [{"target": "{{wikiFolder}}/entities/page1.md", "source": "{{wikiFolder}}/entities/page2.md", "reason": "Same concept: both refer to X because..."}]}

If none of the candidates are true duplicates: {"duplicates": []}"""

MERGE_DUPLICATE_PAGES_PROMPT = """You are a Wiki editor merging two duplicate pages. Intelligently fuse the source page body into the target page body to create the best single version. Also extract any alternative names found in either page.

**Target page body (will be kept):**
{{target_content}}

**Source page body (will be merged then deleted):**
{{source_content}}

**IMPORTANT:** You are receiving ONLY the Markdown body content (frontmatter already stripped by the system). Do not include any frontmatter in your output. The system will handle frontmatter merging programmatically. Focus on merging the semantic content only.

**Fusion rules:**
1. Keep ALL information from the target page — it is the primary version
2. Read the source page carefully. Add ONLY information from source that is GENUINELY NEW (not already in target in different words)
3. If source has verbatim quotes (Mentions in Source) not in target, add them with the source's citation
4. If source links to related entities/concepts that target doesn't, add those links in the appropriate sections
5. If source describes applications, characteristics, or details not covered by target, weave them naturally into target's existing sections
6. If there are factual contradictions, preserve both sides with source attribution in a "## Contradictions" section if one doesn't exist
7. Do NOT duplicate information already present in target
8. Preserve the target page's overall structure and section ordering

**Aliases to extract (put in the "aliases" array):**
- Alternative names, translations, abbreviations found in EITHER page's title or content
- Include names that someone might search for when looking for this concept
- Do NOT include the target page's own title or filename as an alias

**You MUST output ONLY a valid JSON object, no other text:**
{
  "body": "# Page Title\\n\\n## Section\\n\\n...merged content...",
  "aliases": ["alias1", "alias2", "alias3"]
}

If source adds nothing new, still output the target body AND any aliases found."""
