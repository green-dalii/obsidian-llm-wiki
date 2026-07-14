// v1.21.0 Phase 1: SchemaContext — shared parsed representation of schema/config.md.
//
// Single source of truth for both system prompts (via buildSystemPrompt)
// and user prompts (via generation.ts). Before this, generation.ts hardcoded
// section structure that silently overrode user customization in config.md
// (see Issue #124).
//
// Pure function (no IO, no Obsidian deps) — fully testable.

import { buildDefaultSchemaBody } from './schema-manager';

export interface SchemaSection {
  /** The `## Heading` text, exactly as written in config.md */
  heading: string;
  /** Lines under the heading until the next `## ` or EOF */
  content: string;
}

export interface SchemaContext {
  /** Raw body of schema/config.md (or default if missing) */
  body: string;
  /** All `## ...` sections in body, in order */
  sections: SchemaSection[];
  /** True if body contains sections not present in the built-in default schema.
   *  Used by prompt-unification logic to decide whether to inject schema-driven
   *  section structure or fall back to hardcoded templates. */
  hasUserSections: boolean;
  /** The page type this context was parsed for ('entity', 'concept', 'source', or any other).
   *  Currently informational — section filtering is done by the caller via selectSections. */
  pageType: string;
}

/** Set of section headings that ship with buildDefaultSchemaBody(). */
const DEFAULT_SCHEMA_SECTIONS: ReadonlySet<string> = new Set([
  'Wiki Structure',
  'Entity Page Template',
  'Concept Page Template',
  'Naming Conventions',
  'Source Page Template',
  'Date Fields',
  'Mentions Format',
  'Content Rules',
  'Classification Rules',
  'Multi-Source Merge Rules',
  'Maintenance Policies',
]);

/**
 * Parse a schema/config.md body into a SchemaContext.
 *
 * - Empty/whitespace body → empty sections
 * - Sections are split on `## ` (single space after hash; matches Markdown h2 convention)
 * - Top-level `# ` title (h1) is preserved in body but excluded from sections
 *
 * @param body - Raw schema body (or empty string)
 * @param pageType - Which page type is requesting context (entity/concept/source/...)
 * @returns Parsed SchemaContext
 */
export function parseSchemaContext(body: string, pageType: string): SchemaContext {
  const trimmedBody = body ?? '';
  const sections = parseSections(trimmedBody);
  const hasUserSections = sections.some(s => !DEFAULT_SCHEMA_SECTIONS.has(s.heading));
  return {
    body: trimmedBody,
    sections,
    hasUserSections,
    pageType,
  };
}

function parseSections(body: string): SchemaSection[] {
  if (!body.trim()) return [];
  const lines = body.split('\n');
  const result: SchemaSection[] = [];
  let currentHeading = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Only h2 (`## `) splits sections. h1 (`# `) is the schema title — skip.
    if (line.startsWith('## ')) {
      if (currentHeading) {
        result.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      }
      currentHeading = line.substring(3).trim();
      currentContent = [];
    } else if (currentHeading) {
      currentContent.push(line);
    }
  }
  // Flush the last section
  if (currentHeading) {
    result.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  }
  return result;
}

// Re-export for callers that need the default-section set
export const _INTERNAL = { DEFAULT_SCHEMA_SECTIONS };

// Convenience: get default schema body (re-export from schema-manager for one-stop import)
export { buildDefaultSchemaBody };

// === Section template extraction (v1.21.0 Phase 1.2) ===
//
// Issue #124: generation.ts hardcoded section structure that silently overrode
// user customization in schema/config.md. This function extracts the user's
// section names from the schema and produces the markdown template the LLM uses.
//
// Behavior:
// - If schema has a `**Sections:**` numbered list under the page-type template,
//   extract those section names as the template
// - Otherwise fall back to canonical defaults (no behavior change for default schema)
// - `hasUserSections === false` always falls back to canonical defaults

/** Canonical section names per page type — used as fallback when user
 *  hasn't customized their schema, OR when the user's schema has no
 *  explicit section list. */
const CANONICAL_SECTIONS: Record<string, string[]> = {
  entity: [
    'Description',
    'Related Entities',
    'Related Concepts',
    'Mentions in Source',
  ],
  concept: [
    'Definition',
    'Key Characteristics',
    'Applications',
    'Related Concepts',
    'Related Entities',
    'Mentions in Source',
  ],
  source: [
    'Summary',
    'Key Points',
    'Mentioned Pages',
  ],
};

const TEMPLATE_HEADINGS: Record<string, string[]> = {
  entity: ['Entity Page Template'],
  concept: ['Concept Page Template'],
  source: ['Source Page Template'],
};

/**
 * Build the section template for a given page type from a parsed SchemaContext.
 *
 * Strategy:
 * 1. Find the page-type template section in the schema (e.g. "Entity Page Template")
 * 2. Look for a `**Sections:**` numbered list under it
 * 3. Extract the section names from that list
 * 4. If no explicit list found, fall back to canonical defaults
 *
 * Returns a markdown string with each section as a `## Heading` placeholder.
 * For example: `## Description\n[content]\n\n## Related Entities\n[content]`
 */
export function buildSchemaSectionTemplate(ctx: SchemaContext, pageType: string): string {
  const fallbackSections = CANONICAL_SECTIONS[pageType] ?? [];

  // If user didn't customize (no extra sections), always use canonical defaults.
  // This guarantees backward compat: default-schema users see no behavior change.
  if (!ctx.hasUserSections) {
    return fallbackSections.map(s => `## ${s}`).join('\n\n');
  }

  // Find the template section for this page type
  const templateHeadings = TEMPLATE_HEADINGS[pageType] ?? [];
  let templateContent = '';
  for (const heading of templateHeadings) {
    const section = ctx.sections.find(s => s.heading === heading);
    if (section) {
      templateContent = section.content;
      break;
    }
  }

  if (!templateContent) {
    return fallbackSections.map(s => `## ${s}`).join('\n\n');
  }

  // Extract numbered list under **Sections:**
  const sectionNames = extractSectionsList(templateContent);
  if (sectionNames.length === 0) {
    return fallbackSections.map(s => `## ${s}`).join('\n\n');
  }

  return sectionNames.map(name => `## ${name}`).join('\n\n');
}

/**
 * Parse a numbered list under `**Sections:**` heading.
 * Matches patterns like:
 *   1. **Name**: description
 *   2. **Name** — description
 *   3. Name
 */
function extractSectionsList(content: string): string[] {
  const lines = content.split('\n');
  const names: string[] = [];
  for (const line of lines) {
    // Match `N. **Name**` or `N. Name` patterns (number followed by period + bold name)
    const boldMatch = line.match(/^\s*\d+\.\s+\*\*([^*]+?)\*\*/);
    if (boldMatch && boldMatch[1]) {
      names.push(boldMatch[1].trim());
      continue;
    }
    const plainMatch = line.match(/^\s*\d+\.\s+([^*\n]+?)(?:\s*[:：—].*)?$/);
    if (plainMatch && plainMatch[1]) {
      names.push(plainMatch[1].trim());
    }
  }
  return names;
}