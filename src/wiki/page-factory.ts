// Page Factory — entity/concept page CRUD, related-page updates, and multi-source merge.
// Extracted from WikiEngine.

import { TFile } from 'obsidian';
import {
  EngineContext,
  EntityInfo,
  ConceptInfo,
  SourceAnalysis,
} from '../types';
import { PROMPTS } from '../prompts';
import {
  slugify,
  cleanMarkdownResponse,
  parseFrontmatter,
  mergeFrontmatter,
  parseJsonResponse,
  enforceFrontmatterConstraints,
} from '../utils';
import { applySectionLabels } from './system-prompts';
import { getExistingWikiPages } from './lint-fixes';

export class PageFactory {
  constructor(private ctx: EngineContext) {}

  // Append aliases to an existing wiki page, deduplicating against existing frontmatter.
  private async appendAliases(pagePath: string, newAliases: string[]): Promise<void> {
    const content = await this.ctx.tryReadFile(pagePath);
    if (!content) return;

    const fm = parseFrontmatter(content);
    const existingAliases = Array.isArray(fm?.aliases) ? fm.aliases : [];
    const toAdd = newAliases.filter(a => !existingAliases.includes(a));
    if (toAdd.length === 0) return;

    const merged = [...existingAliases, ...toAdd];
    const aliasesLine = `aliases:\n${merged.map(a => `  - "${a}"`).join('\n')}`;

    // Replace existing aliases block or inject before closing ---
    const fmStart = content.indexOf('---');
    const fmEnd = content.indexOf('\n---', fmStart + 3);
    if (fmStart === -1 || fmEnd === -1) return;

    const fmText = content.substring(fmStart + 3, fmEnd);
    const body = content.substring(fmEnd + 4);

    let newFm: string;
    if (fmText.includes('aliases:')) {
      // Replace existing aliases block
      newFm = fmText.replace(/^aliases:[\s\S]*?(?=\n\S|\n*$)/m, aliasesLine);
    } else {
      // Inject before closing ---
      newFm = fmText.trimEnd() + '\n' + aliasesLine;
    }

    const newContent = `---${newFm}\n---${body}`;
    await this.ctx.createOrUpdateFile(pagePath, newContent);
    console.debug(`appendAliases: added ${toAdd.join(', ')} to ${pagePath}`);
  }

  // Determine the actual file path for a new entity/concept, using slug-based
  // matching first and falling back to LLM semantic resolution.
  private async resolvePagePath(
    name: string,
    pageType: 'entity' | 'concept',
    summary: string
  ): Promise<string> {
    const folder = pageType === 'entity' ? 'entities' : 'concepts';
    const slug = slugify(name);
    const slugPath = `${this.ctx.settings.wikiFolder}/${folder}/${slug}.md`;

    // Fast path: exact slug match
    const existing = await this.ctx.tryReadFile(slugPath);
    if (existing !== null) return slugPath;

    // Slow path: LLM semantic resolution against existing pages of the same type
    try {
      const allPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
      const sameTypePages = allPages.filter(p => p.path.includes(`/${folder}/`));
      if (sameTypePages.length === 0) return slugPath;

      const pagesList = sameTypePages
        .map(p => `- path: ${p.path}\n  title: ${p.title}`)
        .join('\n');

      const client = this.ctx.getClient();
      if (!client) return slugPath;

      const prompt = PROMPTS.resolveEntityDedup
        .replace('{{entity_name}}', name)
        .replace('{{entity_type}}', pageType)
        .replace('{{entity_summary}}', summary.substring(0, 300))
        .replace('{{page_type}}', pageType)
        .replace('{{existing_pages}}', pagesList);

      const response = await client.createMessage({
        model: this.ctx.settings.model,
        max_tokens: 300,
        system: await this.ctx.buildSystemPrompt('full'),
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const result = await parseJsonResponse(response) as {
        match?: boolean;
        path?: string | null;
      } | null;

      if (result?.match && result?.path) {
        console.debug(`Entity resolution: "${name}" matched existing page "${result.path}"`);
        // Append the new name as an alias to the existing page to prevent future duplicates
        await this.appendAliases(result.path, [name]);
        return result.path;
      }
    } catch (error) {
      console.debug(`Entity resolution for "${name}" failed, using slug path:`, error);
    }

    return slugPath;
  }

  async buildPagesListForPrompt(includePaths: string[] = []): Promise<string> {
    const allPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
    const MAX_PAGES = 50;
    let pages = allPages;
    let truncated = false;
    if (allPages.length > MAX_PAGES) {
      const hasEntityExtra = includePaths.some(p => p.includes('/entities/'));
      const hasConceptExtra = includePaths.some(p => p.includes('/concepts/'));
      if (hasEntityExtra && !hasConceptExtra) {
        pages = allPages.filter(p => p.path.includes('/entities/')).slice(0, MAX_PAGES);
      } else if (hasConceptExtra && !hasEntityExtra) {
        pages = allPages.filter(p => p.path.includes('/concepts/')).slice(0, MAX_PAGES);
      } else {
        pages = allPages.slice(0, MAX_PAGES);
      }
      truncated = true;
    }
    const list = pages.map(p => {
      const aliasSuffix = p.aliases?.length ? ` \`aliases: ${p.aliases.join(', ')}\`` : '';
      return `- ${p.wikiLink}${aliasSuffix}`;
    }).join('\n');
    let result = list;
    if (includePaths.length > 0) {
      const newPages = includePaths.map(p => {
        const relPath = p.replace(this.ctx.settings.wikiFolder + '/', '').replace('.md', '');
        const name = relPath.split('/').pop() || relPath;
        return `- [[${relPath}|${name}]]`;
      }).filter(entry => !list.includes(entry));
      if (newPages.length > 0) {
        result = list + '\n' + newPages.join('\n');
      }
    }
    if (truncated) {
      result += `\n(Wiki has ${allPages.length} pages total; showing first ${MAX_PAGES}. See index.md for the full list.)`;
    }
    return result;
  }

  async createOrUpdateEntityPage(
    entity: EntityInfo,
    _analysis: SourceAnalysis,
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[] = []
  ): Promise<string | null> {
    if (!entity.name || entity.name.trim().length === 0) {
      console.warn('Entity name is empty, skipping creation');
      return null;
    }

    console.debug('=== Creating/Updating Entity Page ===');
    console.debug('entity.name:', entity.name);
    console.debug('type:', entity.type);

    const path = await this.resolvePagePath(entity.name, 'entity', entity.summary);
    console.debug('Resolved path:', path);

    const existingContent = await this.ctx.tryReadFile(path);

    // New page: generate full content
    if (!existingContent) {
      return this.createNewEntityPage(entity, sourceFile, extraPagePaths, path);
    }

    const isReviewed = parseFrontmatter(existingContent)?.reviewed === true;

    if (isReviewed) {
      // Reviewed page: minimal append only
      console.debug('Entity page has reviewed: true, using minimal append mode:', path);
      return this.appendToReviewedEntityPage(entity, sourceFile, existingContent, path);
    }

    // Existing page: intelligent merge
    return this.mergeEntityPage(entity, sourceFile, existingContent, extraPagePaths, path);
  }

  private async createNewEntityPage(
    entity: EntityInfo,
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[],
    path: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const prompt = PROMPTS.generateEntityPage
      .replace('{{entity_name}}', entity.name)
      .replace('{{entity_type}}', entity.type)
      .replace('{{entity_summary}}', entity.summary)
      .replace('{{mentions}}', entity.mentions_in_source?.join('\n') || 'No specific mentions')
      .replace('{{related_entities}}', entity.related_entities?.join(', ') || 'No related entities')
      .replace('{{related_concepts}}', entity.related_concepts?.join(', ') || 'No related concepts')
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths))
      .replace('{{related_content}}', 'No existing content')
      .replace('{{merge_strategy}}', 'New page, no merge needed.')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path);

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const pageContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('entity'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    const enforcedContent = enforceFrontmatterConstraints(cleanedContent, 'entity');
    await this.ctx.createOrUpdateFile(path, enforcedContent);
    return path;
  }

  private async mergeEntityPage(
    entity: EntityInfo,
    sourceFile: TFile | { path: string; basename: string },
    existingContent: string,
    extraPagePaths: string[],
    path: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    // 1. Programmatic frontmatter merge
    const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceFile.path);

    // 2. LLM intelligent body merge
    const prompt = PROMPTS.mergeEntityPage
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', entity.summary)
      .replace('{{mentions}}', entity.mentions_in_source?.join('\n') || '')
      .replace('{{related_entities}}', entity.related_entities?.join(', ') || '')
      .replace('{{related_concepts}}', entity.related_concepts?.join(', ') || '')
      .replace('{{key_details}}', entity.mentions_in_source?.slice(0, 2).join('; ') || '')
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths));

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const mergedBody = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedBody = cleanMarkdownResponse(mergedBody);

    // Check for NO_NEW_CONTENT signal
    if (cleanedBody.trim() === 'NO_NEW_CONTENT') {
      console.debug('Entity page merge returned NO_NEW_CONTENT, keeping existing:', path);
      return path;
    }

    // 3. Assemble final content
    const finalContent = `${frontmatter}\n\n${cleanedBody}`;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
  }

  private async appendToReviewedEntityPage(
    entity: EntityInfo,
    sourceFile: TFile | { path: string; basename: string },
    existingContent: string,
    path: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    // 1. Programmatic frontmatter merge
    const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceFile.path);

    // 2. Minimal LLM check for genuinely new content
    const prompt = PROMPTS.appendToReviewedPage
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', entity.summary)
      .replace('{{mentions}}', entity.mentions_in_source?.join('\n') || '')
      .replace('{{key_details}}', entity.mentions_in_source?.slice(0, 2).join('; ') || '');

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const newContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 4000,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(newContent);

    // Check for NO_NEW_CONTENT signal
    if (cleanedContent.trim() === 'NO_NEW_CONTENT') {
      console.debug('Reviewed entity page has no new content, preserving existing:', path);
      return path;
    }

    // 3. Assemble final content
    const finalContent = `${frontmatter}\n\n${cleanedContent}`;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
  }

  async createOrUpdateConceptPage(
    concept: ConceptInfo,
    _analysis: SourceAnalysis,
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[] = []
  ): Promise<string | null> {
    if (!concept.name || concept.name.trim().length === 0) {
      console.warn('Concept name is empty, skipping creation');
      return null;
    }

    console.debug('=== Creating/Updating Concept Page ===');
    console.debug('concept.name:', concept.name);
    console.debug('type:', concept.type);

    const path = await this.resolvePagePath(concept.name, 'concept', concept.summary);
    console.debug('Resolved path:', path);

    const existingContent = await this.ctx.tryReadFile(path);

    // New page: generate full content
    if (!existingContent) {
      return this.createNewConceptPage(concept, sourceFile, extraPagePaths, path);
    }

    const isReviewed = parseFrontmatter(existingContent)?.reviewed === true;

    if (isReviewed) {
      // Reviewed page: minimal append only
      console.debug('Concept page has reviewed: true, using minimal append mode:', path);
      return this.appendToReviewedConceptPage(concept, sourceFile, existingContent, path);
    }

    // Existing page: intelligent merge
    return this.mergeConceptPage(concept, sourceFile, existingContent, extraPagePaths, path);
  }

  private async createNewConceptPage(
    concept: ConceptInfo,
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[],
    path: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const prompt = PROMPTS.generateConceptPage
      .replace('{{concept_name}}', concept.name)
      .replace('{{concept_type}}', concept.type)
      .replace('{{concept_summary}}', concept.summary)
      .replace('{{mentions}}', concept.mentions_in_source?.join('\n') || 'No specific mentions')
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths))
      .replace('{{related_concepts}}', concept.related_concepts?.join(', ') || 'No related concepts')
      .replace('{{related_entities}}', concept.related_entities?.join(', ') || 'No related entities')
      .replace('{{related_content}}', 'No existing content')
      .replace('{{merge_strategy}}', 'New page, no merge needed.')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path);

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const pageContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('concept'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    const enforcedContent = enforceFrontmatterConstraints(cleanedContent, 'concept');
    await this.ctx.createOrUpdateFile(path, enforcedContent);
    return path;
  }

  private async mergeConceptPage(
    concept: ConceptInfo,
    sourceFile: TFile | { path: string; basename: string },
    existingContent: string,
    extraPagePaths: string[],
    path: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    // 1. Programmatic frontmatter merge
    const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceFile.path);

    // 2. LLM intelligent body merge
    const prompt = PROMPTS.mergeConceptPage
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{concept_summary}}', concept.summary)
      .replace('{{mentions}}', concept.mentions_in_source?.join('\n') || '')
      .replace('{{related_concepts}}', concept.related_concepts?.join(', ') || '')
      .replace('{{related_entities}}', concept.related_entities?.join(', ') || '')
      .replace('{{key_details}}', concept.mentions_in_source?.slice(0, 2).join('; ') || '')
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths));

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const mergedBody = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedBody = cleanMarkdownResponse(mergedBody);

    // Check for NO_NEW_CONTENT signal
    if (cleanedBody.trim() === 'NO_NEW_CONTENT') {
      console.debug('Concept page merge returned NO_NEW_CONTENT, keeping existing:', path);
      return path;
    }

    // 3. Assemble final content
    const finalContent = `${frontmatter}\n\n${cleanedBody}`;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
  }

  private async appendToReviewedConceptPage(
    concept: ConceptInfo,
    sourceFile: TFile | { path: string; basename: string },
    existingContent: string,
    path: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    // 1. Programmatic frontmatter merge
    const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceFile.path);

    // 2. Minimal LLM check for genuinely new content
    const prompt = PROMPTS.appendToReviewedPage
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', concept.summary)
      .replace('{{mentions}}', concept.mentions_in_source?.join('\n') || '')
      .replace('{{key_details}}', concept.mentions_in_source?.slice(0, 2).join('; ') || '');

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const newContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 4000,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(newContent);

    // Check for NO_NEW_CONTENT signal
    if (cleanedContent.trim() === 'NO_NEW_CONTENT') {
      console.debug('Reviewed concept page has no new content, preserving existing:', path);
      return path;
    }

    // 3. Assemble final content
    const finalContent = `${frontmatter}\n\n${cleanedContent}`;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
  }

  async updateRelatedPage(pageName: string, analysis: SourceAnalysis, sourceFile: TFile | { path: string; basename: string }): Promise<void> {
    const existingPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
    const page = existingPages.find(p => p.title === pageName);

    if (!page) {
      console.debug('相关页面不存在:', pageName);
      return;
    }

    const abstractFile = this.ctx.app.vault.getAbstractFileByPath(page.path);
    if (!(abstractFile instanceof TFile)) {
      console.debug('相关页面不是文件:', pageName);
      return;
    }

    const existingContent = await this.ctx.app.vault.read(abstractFile);

    // 1. Programmatic frontmatter merge (sources + updated)
    const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceFile.path);

    const prompt = `Existing Wiki page: ${pageName}

Existing content:
${existingBody}

The new source file ("${sourceFile.basename}") provides additional information about ${pageName}:
${JSON.stringify(analysis.entities.find(e => e.name === pageName) || analysis.concepts.find(c => c.name === pageName) || 'No directly relevant information')}

Update the page by adding the new information without deleting existing content. Use wiki-link syntax [[page-name]].
Output ONLY the updated page BODY content (without frontmatter), no other text.`;

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const updatedBody = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('related'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedBody = cleanMarkdownResponse(updatedBody);

    // 2. Assemble: programmatic frontmatter + LLM body
    const finalContent = `${frontmatter}\n\n${cleanedBody}`;
    await this.ctx.createOrUpdateFile(page.path, finalContent);
  }

  private async analyzeMerge(
    pageName: string,
    pageType: 'entity' | 'concept',
    existingContent: string,
    newInfo: EntityInfo | ConceptInfo
  ): Promise<{
    merge_items: Array<{ content: string; classification: string; target_section: string; reason: string }>;
    contradictions: Array<{ claim: string; existing_claim: string; resolution: string }>;
    merge_summary: string;
  }> {
    const prompt = PROMPTS.mergeAnalysis
      .replace('{{page_name}}', pageName)
      .replace('entity or concept', pageType)
      .replace('{{existing_content}}', existingContent)
      .replace('{{new_info}}', JSON.stringify(newInfo, null, 2));

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const response = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 2000,
      system: await this.ctx.buildSystemPrompt('full'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const parsed = await parseJsonResponse(response) as {
      merge_items?: Array<{ content: string; classification: string; target_section: string; reason: string }>;
      contradictions?: Array<{ claim: string; existing_claim: string; resolution: string }>;
      merge_summary?: string;
    } | null;

    return {
      merge_items: parsed?.merge_items || [],
      contradictions: parsed?.contradictions || [],
      merge_summary: parsed?.merge_summary || 'No merge analysis available'
    };
  }

  private buildMergeStrategyText(analysis: {
    merge_items: Array<{ content: string; classification: string; target_section: string; reason: string }>;
    merge_summary: string;
  }): string {
    const newItems = analysis.merge_items.filter(i => i.classification === 'new' || i.classification === 'complementary');
    const dupCount = analysis.merge_items.filter(i => i.classification === 'duplicate').length;
    const contraCount = analysis.merge_items.filter(i => i.classification === 'contradictory').length;

    let text = `**Merge Strategy (from multi-source fusion analysis):**\n`;
    text += `${analysis.merge_summary}\n\n`;

    if (newItems.length > 0) {
      text += `**New information (${newItems.length} items):**\n`;
      for (const item of newItems) {
        text += `- [${item.classification}] ${item.content} (insert at: ${item.target_section})\n`;
      }
    }

    if (dupCount > 0) {
      text += `\n**Duplicate information (${dupCount} items):** Skipped, not added.\n`;
    }

    if (contraCount > 0) {
      text += `\n**Contradictory information (${contraCount} items):** Flagged; existing content preserved, contradiction noted at page end.\n`;
    }

    return text;
  }
}
