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
  truncateMentions,
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

    // Fast path 2 + Slow path: share sameTypePages across slug-match and LLM resolution
    try {
      const allPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
      const sameTypePages = allPages
        .filter(p => p.path.includes(`/${folder}/`))
        .filter(p => {
          // Purge polluted entries from LLM input (L2)
          const bn = p.title || '';
          return !/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.test(bn);
        });

      // Fast path 2: normalized slug match — catches files whose stored name
      // differs from slugified form (e.g. spaces instead of hyphens).
      // Checks both title and aliases, case-insensitive, to cover:
      // - "Metabolisches Syndrom" vs "Metabolisches-Syndrom" (spaces → hyphens)
      // - "Chain of Thought" matched via alias of existing page "CoT"
      // - "deep learning" vs "Deep Learning" (case difference)
      const targetSlug = slug.toLowerCase();
      const slugMatch = sameTypePages.find(p =>
        slugify(p.title).toLowerCase() === targetSlug ||
        (p.aliases || []).some(a => slugify(a).toLowerCase() === targetSlug)
      );
      if (slugMatch) {
        await this.appendAliases(slugMatch.path, [name]);
        return slugMatch.path;
      }

      if (sameTypePages.length === 0) return slugPath;

      const pagesList = sameTypePages
        .map(p => {
          const aliasBlock = p.aliases?.length
            ? `\n  aliases: ${p.aliases.join(', ')}`
            : '';
          return `- path: ${p.path}\n  title: ${p.title}${aliasBlock}`;
        })
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
    // Filter out pages with polluted basenames before showing to LLM (L2)
    const cleanPages = allPages.filter(p => {
      const bn = p.title || '';
      return !/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.test(bn);
    });
    const MAX_PAGES = 50;
    let pages = cleanPages;
    let truncated = false;
    if (cleanPages.length > MAX_PAGES) {
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
    return this.createOrUpdatePage(entity, 'entity', sourceFile, extraPagePaths);
  }

  async createOrUpdateConceptPage(
    concept: ConceptInfo,
    _analysis: SourceAnalysis,
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[] = []
  ): Promise<string | null> {
    return this.createOrUpdatePage(concept, 'concept', sourceFile, extraPagePaths);
  }

  // ── Generic page CRUD (entity/concept unified) ──────────────────────

  private async createOrUpdatePage(
    info: EntityInfo | ConceptInfo,
    pageType: 'entity' | 'concept',
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[] = []
  ): Promise<string | null> {
    if (!info.name || info.name.trim().length === 0) {
      console.warn(`${pageType} name is empty, skipping creation`);
      return null;
    }

    console.debug(`=== Creating/Updating ${pageType} page ===`);
    console.debug('name:', info.name);
    console.debug('type:', info.type);

    const path = await this.resolvePagePath(info.name, pageType, info.summary);
    console.debug('Resolved path:', path);

    const existingContent = await this.ctx.tryReadFile(path);

    if (!existingContent) {
      return this.createNewPage(info, pageType, sourceFile, extraPagePaths, path);
    }

    const isReviewed = parseFrontmatter(existingContent)?.reviewed === true;

    if (isReviewed) {
      console.debug(`${pageType} page has reviewed: true, using minimal append mode:`, path);
      return this.appendToReviewedPage(info, sourceFile, existingContent, path);
    }

    return this.mergePage(info, pageType, sourceFile, existingContent, extraPagePaths, path);
  }

  private async createNewPage(
    info: EntityInfo | ConceptInfo,
    pageType: 'entity' | 'concept',
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[],
    path: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const generatePrompt = pageType === 'entity' ? PROMPTS.generateEntityPage : PROMPTS.generateConceptPage;

    const prompt = generatePrompt
      .replace('{{entity_name}}', info.name)
      .replace('{{concept_name}}', info.name)
      .replace('{{entity_type}}', info.type)
      .replace('{{concept_type}}', info.type)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{concept_summary}}', info.summary)
      .replace('{{mentions}}', truncateMentions(info.mentions_in_source) || 'No specific mentions')
      .replace('{{related_entities}}', info.related_entities?.join(', ') || 'No related entities')
      .replace('{{related_concepts}}', info.related_concepts?.join(', ') || 'No related concepts')
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths))
      .replace('{{related_content}}', 'No existing content')
      .replace('{{merge_strategy}}', 'New page, no merge needed.')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path);

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const pageContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt(pageType),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    const enforcedContent = enforceFrontmatterConstraints(cleanedContent, pageType);
    await this.ctx.createOrUpdateFile(path, enforcedContent);
    return path;
  }

  private async mergePage(
    info: EntityInfo | ConceptInfo,
    pageType: 'entity' | 'concept',
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
    const mergePrompt = pageType === 'entity' ? PROMPTS.mergeEntityPage : PROMPTS.mergeConceptPage;

    const prompt = mergePrompt
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{concept_summary}}', info.summary)
      .replace('{{mentions}}', truncateMentions(info.mentions_in_source))
      .replace('{{related_entities}}', info.related_entities?.join(', ') || '')
      .replace('{{related_concepts}}', info.related_concepts?.join(', ') || '')
      .replace('{{key_details}}', info.mentions_in_source?.slice(0, 2).join('; ') || '')
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths));

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const mergedBody = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 8000,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedBody = cleanMarkdownResponse(mergedBody);

    if (cleanedBody.trim() === 'NO_NEW_CONTENT') {
      console.debug(`${pageType} page merge returned NO_NEW_CONTENT, keeping existing:`, path);
      return path;
    }

    // 3. Assemble final content
    const finalContent = `${frontmatter}\n\n${cleanedBody}`;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
  }

  private async appendToReviewedPage(
    info: EntityInfo | ConceptInfo,
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
      .replace('{{entity_summary}}', info.summary)
      .replace('{{mentions}}', truncateMentions(info.mentions_in_source))
      .replace('{{key_details}}', info.mentions_in_source?.slice(0, 2).join('; ') || '');

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const newContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 4000,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(newContent);

    if (cleanedContent.trim() === 'NO_NEW_CONTENT') {
      console.debug('Reviewed page has no new content, preserving existing:', path);
      return path;
    }

    // 3. Assemble final content
    const finalContent = `${frontmatter}\n\n${cleanedContent}`;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
  }

  async updateRelatedPage(pageName: string, analysis: SourceAnalysis, sourceFile: TFile | { path: string; basename: string }): Promise<boolean> {
    const existingPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
    const page = existingPages.find(p => p.title === pageName);

    if (!page) {
      console.debug('Related page not found:', pageName);
      return false;
    }

    const abstractFile = this.ctx.app.vault.getAbstractFileByPath(page.path);
    if (!(abstractFile instanceof TFile)) {
      console.debug('Related page is not a file:', pageName);
      return false;
    }

    const existingContent = await this.ctx.app.vault.read(abstractFile);

    // 1. Programmatic frontmatter merge (sources + updated)
    const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceFile.path);

    const prompt = PROMPTS.updateRelatedPage
      .replace('{{page_name}}', pageName)
      .replace('{{existing_body}}', existingBody)
      .replace('{{source_basename}}', sourceFile.basename)
      .replace('{{new_info}}', JSON.stringify(analysis.entities.find(e => e.name === pageName) || analysis.concepts.find(c => c.name === pageName) || 'No directly relevant information'));

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
    return true;
  }
}
