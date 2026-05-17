// Lint prompts — duplicate detection, merge, and alias generation

export const LINT_PROMPTS = {
  // First-pass LLM title scan to find cross-lingual/translation/abbreviation candidates.
  lintTitleScanCandidates: `You are a Wiki duplicate scanner. Below is a list of ALL entity and concept wiki pages (path + title). Find pages that likely refer to the SAME underlying concept, even when named in different languages or formats.

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
{"candidates": [["wiki/concepts/target-page.md", "wiki/concepts/source-page.md"], ...]}

If no candidates found: {"candidates": []}`,

  // Verify duplicate candidates with content analysis
  lintDuplicateDetection: `You are a Wiki duplicate detection verifier. Review the candidate pairs below and confirm which are TRUE semantic duplicates.

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
{"duplicates": [{"target": "wiki/entities/page1.md", "source": "wiki/entities/page2.md", "reason": "Same concept: both refer to X because..."}]}

If none of the candidates are true duplicates: {"duplicates": []}`,

  // Merge two duplicate pages: intelligently fuse source into target.
  mergeDuplicatePages: `You are a Wiki editor merging two duplicate pages. Intelligently fuse the source page body into the target page body to create the best single version. Also extract any alternative names found in either page.

**Target page body (will be kept):**
{{target_content}}

**Source page body (will be merged then deleted):**
{{source_content}}

**IMPORTANT:** You are receiving ONLY the Markdown body content (frontmatter already stripped by the system). DO not include any frontmatter in your output. The system will handle frontmatter merging programmatically. Focus on merging the semantic content only.

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
- e.g. if source is "Mixture-of-Experts-MoE" and target is "混合专家模型", aliases might include: "MoE", "Mixture of Experts", "Sparse MoE"
- Include names that someone might search for when looking for this concept
- Do NOT include the target page's own title or filename as an alias

**You MUST output ONLY a valid JSON object, no other text:**
{
  "body": "# Page Title\\n\\n## Section\\n\\n...merged content...",
  "aliases": ["alias1", "alias2", "alias3"]
}

If source adds nothing new, still output the target body AND any aliases found.`,

  // Generate aliases for a page by analyzing its content and title.
  generateAliases: `You are a knowledge curator. Given a wiki page's title and body, suggest alternative names (aliases) someone might search for when looking for this concept.

**Page title:** {{title}}

**Page body:**
{{body}}

**What to generate:**
- Translations: if the title is Chinese, suggest English translations, and vice versa
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

If no meaningful aliases found: {"aliases": []}`,
};
