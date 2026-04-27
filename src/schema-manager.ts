// Schema Manager - Wiki Schema configuration layer (Karpathy's third layer)

import { App, TFile } from 'obsidian';
import { LLMWikiSettings, WikiSchema, SchemaSuggestion } from './types';
import { PROMPTS } from './prompts';
import { parseJsonResponse } from './utils';

const SCHEMA_FILENAME = 'schema/config.md';
const SUGGESTIONS_FILENAME = 'schema/suggestions.md';

function buildDefaultSchemaBody(): string {
  return `# Wiki Schema Configuration

This file governs how the LLM builds and maintains your Wiki. Edit it freely.

## Wiki Structure
- Entity pages: \`entities/\` (person, organization, project, location, other)
- Concept pages: \`concepts/\` (theory, method, technology, term, other)
- Source pages: \`sources/\`
- Index: \`index.md\`
- Log: \`log.md\`

## Entity Page Template
Pages in \`entities/\` should follow this structure:
- Frontmatter: type, created, sources, tags
- Sections: Basic Info, Description, Related Content, Mentions

## Concept Page Template
Pages in \`concepts/\` should follow this structure:
- Frontmatter: type, created, sources, tags
- Sections: Definition, Key Features, Applications, Related Concepts, Related Entities

## Naming Conventions
- Use lowercase-with-hyphens for filenames
- Entity names: capitalize proper nouns consistently
- Concept names: use title case for formal names

## Classification Rules
- Entity types: person, organization, project, location, other
- Concept types: theory, method, technology, term, other
- Source types: document, conversation, note

## Maintenance Policies
- Stale threshold: 90 days without updates
- Contradiction severity levels: warning, conflict, error
- Orphan page: no inbound links from other wiki pages
- Missing page: referenced by [[link]] but does not exist
`;
}

export class SchemaManager {
  private app: App;
  private settings: LLMWikiSettings;
  private getLLMClient: () => { createMessage(params: { model: string; max_tokens: number; system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }): Promise<string> } | null;
  private cachedBody: string | null = null;
  private cacheValid = false;

  constructor(
    app: App,
    settings: LLMWikiSettings,
    getLLMClient: () => { createMessage(params: { model: string; max_tokens: number; system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }): Promise<string> } | null
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

  async getSchemaContext(): Promise<string> {
    if (!this.settings.enableSchema) return '';

    const schema = await this.loadSchema();
    if (!schema || !schema.body.trim()) return '';

    const body = schema.body.trim();

    return `You are operating with the following Wiki Schema configuration.
Follow these rules when creating, updating, or analyzing Wiki pages.

--- BEGIN SCHEMA ---
${body}
--- END SCHEMA ---`;
  }

  async loadSchema(): Promise<WikiSchema | null> {
    if (this.cacheValid && this.cachedBody !== null) {
      return { version: 0, last_updated: '', auto_suggestion_count: 0, body: this.cachedBody };
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
    if (!this.settings.enableSchema) return;

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
    const body = buildDefaultSchemaBody();
    const content = `---
version: 1
last_updated: ${today}
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
    const body = buildDefaultSchemaBody();
    const content = `---
version: 1
last_updated: ${today}
auto_suggestion_count: 0
---

${body}`;

    const existing = this.app.vault.getAbstractFileByPath(path);

    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
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
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
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
    let last_updated = '';
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
            } else if (key === 'last_updated') {
              last_updated = value;
            } else if (key === 'auto_suggestion_count') {
              auto_suggestion_count = parseInt(value) || 0;
            }
          }
        }
        body = content.substring(end + 3).trim();
      }
    }

    return { version, last_updated, auto_suggestion_count, body };
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
      const current = await this.app.vault.read(existing);
      await this.app.vault.modify(existing, current + '\n' + entry);
    } else {
      const header = `# Schema Suggestions\n\n> Suggestions for improving your Wiki Schema. Review and decide whether to apply them to \`schema/config.md\`.\n\n---\n\n`;
      await this.app.vault.create(path, header + entry);
    }
  }
}
