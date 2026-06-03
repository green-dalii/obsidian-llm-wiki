// Universal prompt constraints injected into all generation/merge prompts.
// Centralizing these rules ensures consistency across all LLM interactions
// and eliminates the need to remember them when adding new prompts.
// See: Issue #63, PR #63 audit recommendations.

export const UNIVERSAL_LINK_CONSTRAINTS = `LINK RULES (apply to ALL body text output):
- NEVER use [[sources/...]] in body text — sources/ is ONLY valid in the YAML frontmatter sources: field
- NEVER duplicate folder prefixes in display names: [[entities/Qwen|Qwen]] is CORRECT, [[entities/Qwen|entities/Qwen]] is WRONG
- ALWAYS use [[path|display]] format when referencing entities and concepts`;
