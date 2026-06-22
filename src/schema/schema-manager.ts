// Schema Manager - Wiki Schema configuration layer (Karpathy's third layer)

import { App, TFile } from 'obsidian';
import { LLMWikiSettings, WikiSchema, SchemaSuggestion, VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS, DEFAULT_ENTITY_TAG, DEFAULT_CONCEPT_TAG } from '../types';
import { PROMPTS } from '../prompts';
import { parseJsonResponse } from '../core/json';
import { getActiveEntityTags, getActiveConceptTags } from '../core/tag-vocab';
import { TOKENS_SCHEMA_SUGGESTION } from '../constants';

const SCHEMA_FILENAME = 'schema/config.md';
const SUGGESTIONS_FILENAME = 'schema/suggestions.md';

export type SchemaTask = 'analyze' | 'summary' | 'entity' | 'concept' | 'related' | 'conversation' | 'index' | 'lint' | 'merge' | 'full';

// Re-export tag constants from types.ts for convenience
export { VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS, DEFAULT_ENTITY_TAG, DEFAULT_CONCEPT_TAG };

const TASK_SECTIONS: Record<SchemaTask, string[]> = {
  analyze: ['Wiki Structure', 'Classification Rules', 'Naming Conventions'],
  summary: ['Wiki Structure', 'Classification Rules'],
  entity: ['Entity Page Template', 'Naming Conventions', 'Classification Rules'],
  concept: ['Concept Page Template', 'Naming Conventions', 'Classification Rules'],
  related: ['Naming Conventions', 'Classification Rules'],
  conversation: ['Wiki Structure', 'Entity Page Template', 'Concept Page Template', 'Naming Conventions', 'Classification Rules'],
  index: ['Wiki Structure'],
  lint: ['Maintenance Policies'],
  merge: ['Entity Page Template', 'Concept Page Template', 'Naming Conventions', 'Classification Rules'],
  full: ['Wiki Structure', 'Entity Page Template', 'Concept Page Template', 'Naming Conventions', 'Classification Rules', 'Maintenance Policies'],
};

export function buildDefaultSchemaBody(settings?: LLMWikiSettings): string {
  // v1.22.0 Phase 2: dynamic tag vocabulary. When settings are provided and
  // tagVocabularyMode === 'custom', the active tag list comes from
  // getActiveEntityTags / getActiveConceptTags — keeping the schema body
  // and the prompt's Active Tag Vocabulary section in lockstep, so the LLM
  // never sees two conflicting tag lists. When settings are undefined
  // (first-ever load, before any settings are persisted), we fall back to
  // the hardcoded defaults — preserving the original public-API behavior.
  const entityTags = settings ? getActiveEntityTags(settings) : [...VALID_ENTITY_TAGS];
  const conceptTags = settings ? getActiveConceptTags(settings) : [...VALID_CONCEPT_TAGS];
  const entityList = entityTags.join(', ');
  const conceptList = conceptTags.join(', ');
  return `# Wiki Schema Configuration

This file governs how the LLM builds and maintains your Wiki. Edit it freely.

## Wiki Structure
- Entity pages: \`entities/\` (${entityList})
- Concept pages: \`concepts/\` (${conceptList})
- Source pages: \`sources/\`
- Index: \`index.md\`
- Log: \`log.md\`

## Entity Page Template
Pages in \`entities/\` MUST follow this structure:

**Frontmatter fields:**
- \`type: entity\` — page category (MUST be exactly "entity")
- \`created:\` — ISO date of first creation
- \`sources:\` — array of source file wiki-links
- \`tags:\` — entity subtype, MUST be one of: ${entityList}
- \`aliases:\` (optional) — alternative names (translations, abbreviations)
- \`reviewed:\` (optional) — if true, page is human-verified and protected

**Sections:**
1. **Basic Information**: Type, source file link
2. **Description**: 3-6 sentences with concrete facts, bidirectional links
3. **Related Entities**: Links to related entities using [[entities/...]]
4. **Related Concepts**: Links to related concepts using [[concepts/...]]
5. **Mentions in Source**: Verbatim quotes with source attribution — see [Mentions Format](#mentions-format) below

## Concept Page Template
Pages in \`concepts/\` MUST follow this structure:

**Frontmatter fields:**
- \`type: concept\` — page category (MUST be exactly "concept")
- \`created:\` — ISO date of first creation
- \`sources:\` — array of source file wiki-links
- \`tags:\` — concept subtype, MUST be one of: ${conceptList}
- \`aliases:\` (optional) — alternative names (translations, abbreviations)
- \`reviewed:\` (optional) — if true, page is human-verified and protected

**Sections:**
1. **Definition**: Clear, concise definition
2. **Key Characteristics**: Bullet list of defining traits
3. **Applications**: Real-world usage scenarios
4. **Related Concepts**: Links using [[concepts/...]]
5. **Related Entities**: Links using [[entities/...]]
6. **Mentions in Source**: Verbatim quotes with source attribution — see [Mentions Format](#mentions-format) below

## Naming Conventions
- Filenames: lowercase-with-hyphens (slugified)
- Entity/concept names: Preserve original language from source, NEVER translate
- Wiki-links: Use full paths [[entities/page-name|Display Name]] or [[concepts/page-name|Display Name]]

## Source Page Template
Pages in \`sources/\` MUST follow this structure:

**Frontmatter fields:**
- \`type: source\` — page category (MUST be exactly "source")
- \`tags:\` — INHERITED from the source note's frontmatter (do NOT use LLM-derived concept names). The system programmatically populates this from the source file; the LLM must not overwrite it with extracted concept names. This preserves the user's existing tag vocabulary and prevents pollution from LLM hallucinations.
- \`sources:\` — array of related wiki page links created from this source
- \`created:\` / \`updated:\` — set by the system, see Date Fields below

**Sections:**
1. **Summary**: Brief description of the source content (2-4 sentences)
2. **Key Points**: Bullet list of main insights
3. **Mentioned Pages**: List of [[entities/...]] and [[concepts/...]] pages created from this source

## Date Fields
- \`created:\` and \`updated:\` are filled by the system programmatically — NEVER LLM-generated
- The LLM may produce wrong dates during extraction; the system overrides them post-write to ensure correctness
- \`created:\` is preserved on merge (older value kept); \`updated:\` is always set to the current date
- \`source_note:\` (optional) — wiki-link to the original source file

## Mentions Format
"Mentions in Source" entries use academic-footnote style with source attribution. The format is:
- "Verbatim quote in original language (optional translation)" — [[source-name|display-name]]

Rules:
- Quotes must be VERBATIM — never paraphrase, summarize, or translate away the original
- The source wiki-link is required so future page merges can trace each quote to its origin
- Multiple quotes from the same source go in the same block, separated by newlines

## Content Rules
- mentions_in_source MUST be VERBATIM quotes — never paraphrase or translate
- Summaries/descriptions should use the wiki output language
- Entity/concept names must match the source file's original language exactly
- All pages must include bidirectional links where relevant

## Classification Rules
- **type field:** entity | concept | source — the page category
- **tags field:** stores the subtype (entity_type or concept_type)
- Entity subtypes (valid tags for type=entity): ${entityList}
- Concept subtypes (valid tags for type=concept): ${conceptList}
- Source types: document, conversation, note
- **Rule:** tags MUST only contain values from the corresponding subtype list above. A tag not in the valid list will be removed by the system.

## Multi-Source Merge Rules
- Sources array: Append new sources, never overwrite
- Aliases: Append alternative names (translations, abbreviations) without overwriting existing ones
- reviewed flag: If true, preserve all existing content, only append genuinely new info
- Contradictions: Preserve both sides with attribution, add to ## Contradictions section
- NO_NEW_CONTENT: Return this signal if source adds nothing new

## Maintenance Policies
- Stale threshold: 90 days without updates
- Contradiction severity: warning, conflict, error
- Orphan page: no inbound links from other wiki pages
- Missing page: referenced by [[link]] but does not exist
`;
}

export class SchemaManager {
  private app: App;
  private settings: LLMWikiSettings;
  private getLLMClient: () => { createMessage(params: { model: string; max_tokens: number; system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }>; response_format?: { type: 'json_object' } }): Promise<string> } | null;
  private cachedBody: string | null = null;
  private cacheValid = false;

  constructor(
    app: App,
    settings: LLMWikiSettings,
    getLLMClient: () => { createMessage(params: { model: string; max_tokens: number; system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }>; response_format?: { type: 'json_object' } }): Promise<string> } | null
  ) {
    this.app = app;
    this.settings = settings;
    this.getLLMClient = getLLMClient;
  }

  private get client() {
    const c = this.getLLMClient();
    if (!c) throw new Error('LLM Client not initialized');
    return c;
  }

  private getSchemaPath(): string {
    return `${this.settings.wikiFolder}/${SCHEMA_FILENAME}`;
  }

  private getSuggestionsPath(): string {
    return `${this.settings.wikiFolder}/${SUGGESTIONS_FILENAME}`;
  }

  invalidateCache(): void {
    this.cacheValid = false;
    this.cachedBody = null;
  }

  updateSettings(settings: LLMWikiSettings): void {
    this.settings = settings;
    this.invalidateCache();
  }

  async getSchemaContext(task: SchemaTask = 'full'): Promise<string> {

    const schema = await this.loadSchema();
    if (!schema || !schema.body.trim()) return '';

    const body = schema.body.trim();
    const selectedBody = this.selectSections(body, task);

    if (!selectedBody.trim()) return '';

    return `You are operating with the following Wiki Schema configuration.
Follow these rules when creating, updating, or analyzing Wiki pages.

--- BEGIN SCHEMA ---
${selectedBody}
--- END SCHEMA ---`;
  }

  private selectSections(body: string, task: SchemaTask): string {
    if (task === 'full') return body;

    const wanted = TASK_SECTIONS[task];
    const sections = this.parseSections(body);

    const selected = sections.filter(s => wanted.includes(s.heading));
    return selected.map(s => `## ${s.heading}\n${s.content}`).join('\n\n');
  }

  private parseSections(body: string): Array<{ heading: string; content: string }> {
    const result: Array<{ heading: string; content: string }> = [];
    const lines = body.split('\n');
    let currentHeading = '';
    let currentContent: string[] = [];

    for (const line of lines) {
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
    if (currentHeading) {
      result.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
    }

    return result;
  }

  async loadSchema(): Promise<WikiSchema | null> {
    if (this.cacheValid && this.cachedBody !== null) {
      return { version: 0, updated: '', auto_suggestion_count: 0, body: this.cachedBody };
    }

    const path = this.getSchemaPath();
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!(file instanceof TFile)) return null;

    try {
      const content = await this.app.vault.read(file);
      const parsed = this.parseConfigFile(content);

      this.cachedBody = parsed.body;
      this.cacheValid = true;

      return parsed;
    } catch {
      console.warn('Failed to read schema file, ignoring');
      return null;
    }
  }

  async ensureSchemaExists(): Promise<void> {

    const path = this.getSchemaPath();
    const existing = this.app.vault.getAbstractFileByPath(path);

    if (existing instanceof TFile) return;

    // Ensure schema folder exists
    const schemaFolder = `${this.settings.wikiFolder}/schema`;
    try {
      await this.app.vault.createFolder(schemaFolder);
    } catch {
      // Already exists
    }

    const today = new Date().toISOString().slice(0, 10);
    const body = buildDefaultSchemaBody(this.settings);
    const content = `---
version: 1
updated: ${today}
auto_suggestion_count: 0
---

${body}`;

    await this.app.vault.create(path, content);
    this.cachedBody = body;
    this.cacheValid = true;

    console.debug('Created default schema at:', path);
  }

  async regenerateDefaultSchema(): Promise<void> {
    const path = this.getSchemaPath();
    const today = new Date().toISOString().slice(0, 10);
    const body = buildDefaultSchemaBody(this.settings);
    const content = `---
version: 1
updated: ${today}
auto_suggestion_count: 0
---

${body}`;

    // Ensure parent folders exist (handles empty vault or custom wikiFolder)
    const schemaFolder = `${this.settings.wikiFolder}/schema`;
    try {
      await this.app.vault.createFolder(schemaFolder);
    } catch {
      // Already exists or path invalid
    }

    const existing = this.app.vault.getAbstractFileByPath(path);

    if (existing instanceof TFile) {
      await this.app.vault.process(existing, () => content);
    } else {
      await this.app.vault.create(path, content);
    }

    this.cachedBody = body;
    this.cacheValid = true;

    console.debug('Regenerated default schema at:', path);
  }

  async suggestSchemaUpdate(context: string): Promise<SchemaSuggestion | null> {
    const schema = await this.loadSchema();
    const schemaContent = schema?.body || '(No schema configured yet)';

    const prompt = PROMPTS.suggestSchemaUpdate
      .replace('{{schema_content}}', schemaContent)
      .replace('{{analysis_context}}', context);

    try {
      const response = await this.client.createMessage({
        model: this.settings.model,
        max_tokens: TOKENS_SCHEMA_SUGGESTION,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const parsed = await parseJsonResponse(response) as { changes_needed?: boolean; suggestions?: string } | null;

      const suggestion: SchemaSuggestion = {
        timestamp: new Date().toISOString(),
        source: 'manual',
        changes_needed: parsed?.changes_needed || false,
        suggestions: parsed?.suggestions || '',
      };

      // Append to suggestions.md
      await this.appendSuggestion(suggestion);

      return suggestion;
    } catch (error) {
      console.error('Schema suggestion failed:', error);
      return null;
    }
  }

  private parseConfigFile(content: string): WikiSchema {
    let version = 0;
    let updated = '';
    let auto_suggestion_count = 0;
    let body = content;

    // Parse YAML frontmatter (between first two --- lines)
    if (content.startsWith('---')) {
      const end = content.indexOf('---', 3);
      if (end > 0) {
        const fmLines = content.substring(3, end).trim().split('\n');
        for (const line of fmLines) {
          const colon = line.indexOf(':');
          if (colon > 0) {
            const key = line.substring(0, colon).trim();
            const value = line.substring(colon + 1).trim();

            if (key === 'version') {
              version = parseInt(value) || 0;
            } else if (key === 'updated') {
              updated = value;
            } else if (key === 'auto_suggestion_count') {
              auto_suggestion_count = parseInt(value) || 0;
            }
          }
        }
        body = content.substring(end + 3).trim();
      }
    }

    return { version, updated, auto_suggestion_count, body };
  }

  private async appendSuggestion(suggestion: SchemaSuggestion): Promise<void> {
    const path = this.getSuggestionsPath();
    const existing = this.app.vault.getAbstractFileByPath(path);

    const entry = `## Suggestion — ${suggestion.timestamp}

**Source:** ${suggestion.source}
**Changes needed:** ${suggestion.changes_needed ? 'Yes' : 'No'}

${suggestion.suggestions}

---
`;

    if (existing instanceof TFile) {
      await this.app.vault.process(existing, (current) => current + '\n' + entry);
    } else {
      const header = `# Schema Suggestions\n\n> Suggestions for improving your Wiki Schema. Review and decide whether to apply them to \`schema/config.md\`.\n\n---\n\n`;
      await this.app.vault.create(path, header + entry);
    }
  }
}
