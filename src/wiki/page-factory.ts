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
  preserveFrontmatterReviewTag,
  parseJsonResponse,
} from '../utils';
import { applySectionLabels } from './system-prompts';
import { getExistingWikiPages } from './lint-fixes';

const MERGE_CONTENT_THRESHOLD = 300;

export class PageFactory {
  constructor(private ctx: EngineContext) {}

  buildPagesListForPrompt(includePaths: string[] = []): string {
    const allPages = getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
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
    const list = pages.map(p => `- ${p.wikiLink}`).join('\n');
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
      console.warn('实体名称为空，跳过创建');
      return null;
    }

    console.debug('=== 创建实体页 ===');
    console.debug('entity.name:', entity.name);
    console.debug('类型:', entity.type);

    const entitySlug = slugify(entity.name);
    console.debug('生成的 slug:', entitySlug);
    const path = `${this.ctx.settings.wikiFolder}/entities/${entitySlug}.md`;
    console.debug('目标路径:', path);

    const existingContent = await this.ctx.tryReadFile(path);
    const isReviewed = existingContent ? parseFrontmatter(existingContent)?.reviewed === true : false;
    if (isReviewed) {
      console.debug('Entity page has reviewed: true, using preserve mode:', path);
    }

    let mergeStrategy = 'New page, no merge needed.';
    if (existingContent && !isReviewed && existingContent.length > MERGE_CONTENT_THRESHOLD) {
      try {
        console.debug('Running merge analysis for existing entity page:', path);
        const mergeAnalysis = await this.analyzeMerge(entity.name, 'entity', existingContent, entity);
        mergeStrategy = this.buildMergeStrategyText(mergeAnalysis);
        if (mergeAnalysis.contradictions.length > 0) {
          for (const c of mergeAnalysis.contradictions) {
            _analysis.contradictions.push({
              claim: c.claim,
              source_page: `[[entities/${entitySlug}]]`,
              contradicted_by: c.existing_claim,
              resolution: c.resolution
            });
          }
        }
      } catch (error) {
        console.error('Merge analysis failed, falling back to simple merge:', error);
        mergeStrategy = '**Merge strategy:** Integrate new information without deleting existing content. Insert new information into appropriate sections of existing content.';
      }
    } else if (existingContent && !isReviewed) {
      mergeStrategy = '**Merge strategy:** Integrate new information without deleting existing content.';
    }

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const prompt = (isReviewed ? PROMPTS.preserveReviewedEntityPage : PROMPTS.generateEntityPage)
      .replace('{{entity_name}}', entity.name)
      .replace('{{entity_type}}', entity.type)
      .replace('{{entity_summary}}', entity.summary)
      .replace('{{mentions}}', entity.mentions_in_source?.join('\n') || 'No specific mentions')
      .replace('{{existing_pages}}', this.buildPagesListForPrompt(extraPagePaths))
      .replace('{{related_content}}', existingContent || 'No existing content')
      .replace('{{merge_strategy}}', mergeStrategy)
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path)
      .replace('{{tags}}', entity.type);

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const pageContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('entity'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    const finalContent = existingContent ? preserveFrontmatterReviewTag(existingContent, cleanedContent) : cleanedContent;
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
      console.warn('概念名称为空，跳过创建');
      return null;
    }

    console.debug('=== 创建概念页 ===');
    console.debug('concept.name:', concept.name);
    console.debug('类型:', concept.type);

    const conceptSlug = slugify(concept.name);
    console.debug('生成的 slug:', conceptSlug);
    const path = `${this.ctx.settings.wikiFolder}/concepts/${conceptSlug}.md`;
    console.debug('目标路径:', path);

    const existingContent = await this.ctx.tryReadFile(path);
    const isReviewed = existingContent ? parseFrontmatter(existingContent)?.reviewed === true : false;
    if (isReviewed) {
      console.debug('Concept page has reviewed: true, using preserve mode:', path);
    }

    let mergeStrategy = 'New page, no merge needed.';
    if (existingContent && !isReviewed && existingContent.length > MERGE_CONTENT_THRESHOLD) {
      try {
        console.debug('Running merge analysis for existing concept page:', path);
        const mergeAnalysis = await this.analyzeMerge(concept.name, 'concept', existingContent, concept);
        mergeStrategy = this.buildMergeStrategyText(mergeAnalysis);
        if (mergeAnalysis.contradictions.length > 0) {
          for (const c of mergeAnalysis.contradictions) {
            _analysis.contradictions.push({
              claim: c.claim,
              source_page: `[[concepts/${conceptSlug}]]`,
              contradicted_by: c.existing_claim,
              resolution: c.resolution
            });
          }
        }
      } catch (error) {
        console.error('Merge analysis failed, falling back to simple merge:', error);
        mergeStrategy = '**Merge strategy:** Integrate new information without deleting existing content. Insert new information into appropriate sections of existing content.';
      }
    } else if (existingContent && !isReviewed) {
      mergeStrategy = '**Merge strategy:** Integrate new information without deleting existing content.';
    }

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const prompt = (isReviewed ? PROMPTS.preserveReviewedConceptPage : PROMPTS.generateConceptPage)
      .replace('{{concept_name}}', concept.name)
      .replace('{{concept_type}}', concept.type)
      .replace('{{concept_summary}}', concept.summary)
      .replace('{{mentions}}', concept.mentions_in_source?.join('\n') || 'No specific mentions')
      .replace('{{existing_pages}}', this.buildPagesListForPrompt(extraPagePaths))
      .replace('{{related_concepts}}', concept.related_concepts?.join(', ') || 'No related concepts')
      .replace('{{related_content}}', existingContent || 'No existing content')
      .replace('{{merge_strategy}}', mergeStrategy)
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path)
      .replace('{{tags}}', concept.type);

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const pageContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('concept'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    const finalContent = existingContent ? preserveFrontmatterReviewTag(existingContent, cleanedContent) : cleanedContent;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
  }

  async updateRelatedPage(pageName: string, analysis: SourceAnalysis): Promise<void> {
    const existingPages = getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
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

    const prompt = `Existing Wiki page: ${pageName}

Existing content:
${existingContent}

The new source file provides additional information about ${pageName}:
${JSON.stringify(analysis.entities.find(e => e.name === pageName) || analysis.concepts.find(c => c.name === pageName) || 'No directly relevant information')}

Update the page by adding the new information without deleting existing content. Use wiki-link syntax [[page-name]].
Output ONLY the complete updated page content, no other text.`;

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const updatedContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('related'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(updatedContent);
    await this.ctx.createOrUpdateFile(page.path, cleanedContent);
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
