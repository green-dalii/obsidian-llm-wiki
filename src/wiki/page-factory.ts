// Page Factory — entity/concept page CRUD, related-page updates, and multi-source merge.
// Extracted from WikiEngine.

import { TFile } from 'obsidian';
import {
  EngineContext,
  EntityInfo,
  ConceptInfo,
  SourceAnalysis,
  PageCreationResult,
  LLMClient,
  MentionWithProvenance,
} from '../types';
import { PROMPTS } from '../prompts';
import { ConflictResolver } from '../core/conflict-resolver';
import { WIKI_SUBFOLDERS } from '../constants';
import { TOKENS_DEDUP_RESOLUTION, TOKENS_PAGE_GENERATION, TOKENS_APPEND_REVIEWED, TOKENS_MERGE_TRIAGE, TOKENS_COMPLEMENTARY_APPEND } from '../constants';
import { slugify, filterRedundantAliases } from '../core/slug';
import { correctRelatedLinkPrefixes } from '../core/related-link-corrector';
import { resolveModelForTask } from '../core/model-resolver';
import { canonicalizeSectionHeaders, snapHeaderToCanonical } from '../core/section-header-canonicalizer';
import { parseJsonResponse } from '../core/json';
import { parseFrontmatter, mergeFrontmatter, enforceFrontmatterConstraints } from '../core/frontmatter';
import { injectMentionsSection } from '../core/mentions-injector';
import { stripMentionsSection, computeReingestMentions } from '../core/mentions-parser';
import { cleanMarkdownResponse } from '../core/markdown';
import { normalizeLLMPath } from '../core/prompt-builders';
import { UNIVERSAL_LINK_CONSTRAINTS } from './prompts/constraints';
import { applySectionLabels, appendTagVocabularyToPrompt, getSectionLabels } from './system-prompts';
import { getExistingWikiPages } from './lint/get-existing-pages';

// Wrap errors with entity/concept context for better diagnostics
function contextualizeError(error: unknown, name: string, pageType: string): Error {
  const msg = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to create ${pageType} page "${name}": ${msg}`);
}

function mergeError(error: unknown, name: string, pageType: string): Error {
  const msg = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to merge ${pageType} page "${name}": ${msg}`);
}

/**
 * Autodetect whether a section body is list-typed. A section is list-typed
 * if **any** non-blank line begins with a markdown list marker (`-`, `*`,
 * `+`, or a digit followed by `.`). The section may end with a closing
 * paragraph — a hand-edited `## 相关概念` block ending with a summary line
 * after its bullets still classifies as list-typed so the appended bullet
 * stays visually contiguous with the existing list.
 *
 * Returns `false` (paragraph mode) only when the section has NO list
 * markers anywhere — typical `## 描述` / `## 定义` blocks. Appended
 * content uses a SINGLE `\n` separator for list-typed sections (no blank
 * line) and a `\n\n` separator (blank line) for paragraph sections.
 */
function isListSection(body: string): boolean {
  if (!body) return false;
  const lines = body.split('\n');
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (/^[-*+] |^\d+\. /.test(trimmed)) return true;
  }
  return false;
}

/**
 * Issue #244 + W5: Pick the first 2 quote strings for the merge/append
 * `{{key_details}}` prompt injection. Prefers the new structured
 * `mentions_with_provenance` over legacy `mentions_in_source` so an LLM
 * that returns structured provenance still gets verbatim quotes as context.
 */
function firstQuotesForPrompt(info: EntityInfo | ConceptInfo): string {
  const fromProvenance = info.mentions_with_provenance?.slice(0, 2).map(m => m.quote);
  if (fromProvenance?.length) return fromProvenance.join('; ');
  return info.mentions_in_source?.slice(0, 2).join('; ') || '';
}

/**
 * Issue #244 — conversation ingest uses a synthetic "from <conversation>"
 * citation rather than verbatim quotes. Detect by checking whether the
 * sourceFile.path lives under `${wikiFolder}/sources/` (the conversation
 * summary path) AND basename ends with a conversation-style slug. The
 * detection is conservative: anything else uses the normal multi-quote path.
 */
function isConversationSource(
  sourceFile: TFile | { path: string; basename: string },
  wikiFolder: string,
): boolean {
  const summaryPrefix = `${wikiFolder}/sources/`;
  return sourceFile.path.startsWith(summaryPrefix);
}

export class PageFactory {
  constructor(private ctx: EngineContext) {}

  // Append aliases to an existing wiki page, deduplicating against existing frontmatter.
  private async appendAliases(pagePath: string, newAliases: string[]): Promise<void> {
    const content = await this.ctx.tryReadFile(pagePath);
    if (!content) return;

    // Drop aliases that already equal the page's filename (case-insensitive),
    // e.g. adding "Vigilanz" to vigilanz.md. Common on cross-type collisions
    // where the colliding name is identical to the existing page's name.
    const candidates = filterRedundantAliases(pagePath, newAliases);
    if (candidates.length === 0) return;

    const fm = parseFrontmatter(content);
    const existingAliases = Array.isArray(fm?.aliases) ? fm.aliases : [];
    const toAdd = candidates.filter(a => !existingAliases.includes(a));
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
      newFm = fmText.replace(/^aliases:[^\n]*(?:\n[ \t]+[^\n]*)*/m, aliasesLine);
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
  // Returns { path: null, collision: {...} } when a cross-type collision is detected
  // (same name exists in the opposite folder). Callers must NOT create a new file in
  // that case, but should merge the new content into collision.targetPath so no
  // information from the source is lost.
  private async resolvePagePath(
    name: string,
    pageType: 'entity' | 'concept',
    summary: string
  ): Promise<PageCreationResult> {
    const folder = pageType === 'entity' ? WIKI_SUBFOLDERS.entities : WIKI_SUBFOLDERS.concepts;
    const otherFolder = pageType === 'entity' ? WIKI_SUBFOLDERS.concepts : WIKI_SUBFOLDERS.entities;
    const slug = slugify(name, this.ctx.settings.slugCase === 'preserve');
    const slugPath = `${this.ctx.settings.wikiFolder}/${folder}/${slug}.md`;

    // Fast path: exact slug match (same type folder)
    const existing = await this.ctx.tryReadFile(slugPath);
    if (existing !== null) {
      // Check for historical cross-type duplicate: if the same name exists in the
      // opposite folder, it means an earlier ingestion classified this item differently.
      // Append the new name as an alias to bridge the two pages (Bug #1 fix).
      const otherSlugPath = `${this.ctx.settings.wikiFolder}/${otherFolder}/${slug}.md`;
      const otherExisting = await this.ctx.tryReadFile(otherSlugPath);
      if (otherExisting !== null) {
        console.warn(`Historical cross-type duplicate detected: ${folder}/${slug}.md and ${otherFolder}/${slug}.md both exist — appending alias`);
        await this.appendAliases(otherSlugPath, [name]);
      }
      return { path: slugPath };
    }

    // Fast path 2 + Slow path: share sameTypePages across slug-match and LLM resolution
    try {
      const allPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);

      // Use ConflictResolver for deterministic slug/alias matching before LLM fallback.
      const resolver = new ConflictResolver(this.ctx.settings.wikiFolder, allPages);
      const cr = resolver.resolve({ name, slug, pageType });

      if (cr.action === 'merge' && !cr.reason.includes('Cross-type')) {
        await this.appendAliases(cr.targetPath, [name]);
        return { path: cr.targetPath };
      }

      if (cr.action === 'merge' && cr.reason.includes('Cross-type')) {
        await this.appendAliases(cr.targetPath, [name]);
        return {
          path: null,
          collision: {
            name,
            sourceType: pageType,
            targetType: cr.existingType || (otherFolder === WIKI_SUBFOLDERS.entities ? 'entity' : 'concept'),
            targetPath: cr.targetPath
          }
        };
      }

      const sameTypePages = allPages
        .filter(p => p.path.includes(`/${folder}/`))
        .filter(p => {
          // Purge polluted entries from LLM input (L2)
          const bn = p.title || '';
          return !/^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])/.test(bn);
        });

      // Same-type slug/alias match is handled above by ConflictResolver.
      // Remaining path: LLM-based semantic dedup for pages that don't match by slug/alias.

      if (sameTypePages.length === 0) return { path: slugPath };

      const pagesList = sameTypePages
        .map(p => {
          const aliasBlock = p.aliases?.length
            ? `\n  aliases: ${p.aliases.join(', ')}`
            : '';
          return `- path: ${p.path}\n  title: ${p.title}${aliasBlock}`;
        })
        .join('\n');

      const client = this.ctx.getClient();
      if (!client) return { path: slugPath };

      const prompt = PROMPTS.resolveEntityDedup
        .replace('{{wikiFolder}}', this.ctx.settings.wikiFolder)
        .replace('{{entity_name}}', name)
        .replace('{{entity_type}}', pageType)
        .replace('{{entity_summary}}', summary.substring(0, 300))
        .replace('{{page_type}}', pageType)
        .replace('{{existing_pages}}', pagesList);

      const response = await client.createMessage({
        model: resolveModelForTask(this.ctx.settings, 'ingest'),
        max_tokens: TOKENS_DEDUP_RESOLUTION,
        system: await this.ctx.buildSystemPrompt('full'),
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      ...(this.ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

      const result = await parseJsonResponse(response) as {
        match?: boolean;
        path?: string | null;
      } | null;

      if (result?.match && result?.path) {
        result.path = normalizeLLMPath(result.path, this.ctx.settings.wikiFolder);
        console.debug(`Entity resolution: "${name}" matched existing page "${result.path}"`);
        // Append the new name as an alias to the existing page to prevent future duplicates
        await this.appendAliases(result.path, [name]);
        return { path: result.path };
      }
    } catch (error) {
      console.debug(`Entity resolution for "${name}" failed, using slug path:`, error);
    }

    return { path: slugPath };
  }

  async buildPagesListForPrompt(
    includePaths: string[] = [],
    options: { excludeSources?: boolean } = { excludeSources: true }
  ): Promise<string> {
    const allPages = await getExistingWikiPages(this.ctx.app, this.ctx.settings.wikiFolder);
    // #234 (DocTpoint): sources/ pages are reserved for the YAML frontmatter
    // `sources:` field — constraints.ts forbids them in body text. Filter them
    // out of the LLM candidate list by default so weak local models don't
    // fuzzy-match onto sources/ entries. getExistingWikiPages itself is
    // unchanged: source-analyzer.ts:421 still needs sources/ for the
    // program-generated related-page matching. Pass
    // `{ excludeSources: false }` to opt out (future analytical surfaces
    // that legitimately want to mention sources).
    const promptPages = options.excludeSources
      ? allPages.filter(p => !p.path.includes('/sources/'))
      : allPages;
    // Filter out pages with polluted basenames before showing to LLM (L2)
    const cleanPages = promptPages.filter(p => {
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
        pages = promptPages.filter(p => p.path.includes('/entities/')).slice(0, MAX_PAGES);
      } else if (hasConceptExtra && !hasEntityExtra) {
        pages = promptPages.filter(p => p.path.includes('/concepts/')).slice(0, MAX_PAGES);
      } else {
        pages = promptPages.slice(0, MAX_PAGES);
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
    extraPagePaths: string[] = [],
    sourceSlug?: string
  ): Promise<PageCreationResult> {
    return this.createOrUpdatePage(entity, 'entity', sourceFile, extraPagePaths, sourceSlug);
  }

  async createOrUpdateConceptPage(
    concept: ConceptInfo,
    _analysis: SourceAnalysis,
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[] = [],
    sourceSlug?: string
  ): Promise<PageCreationResult> {
    return this.createOrUpdatePage(concept, 'concept', sourceFile, extraPagePaths, sourceSlug);
  }

  // ── Generic page CRUD (entity/concept unified) ──────────────────────

  private async createOrUpdatePage(
    info: EntityInfo | ConceptInfo,
    pageType: 'entity' | 'concept',
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[] = [],
    sourceSlug?: string
  ): Promise<PageCreationResult> {
    if (!info.name || info.name.trim().length === 0) {
      console.warn(`${pageType} name is empty, skipping creation`);
      return { path: null };
    }

    console.debug(`=== Creating/Updating ${pageType} page ===`);
    console.debug('name:', info.name);
    console.debug('type:', info.type);

    const result = await this.resolvePagePath(info.name, pageType, info.summary);
    if (result.path === null) {
      if (result.collision) {
        // Cross-type collision: a page for this item already exists in the opposite
        // folder. Don't create a duplicate file, but merge the new content into the
        // existing page so the source's summary/mentions/sources aren't lost.
        // Use the EXISTING page's type for the merge so it keeps its classification.
        const { targetPath, targetType } = result.collision;
        const existingContent = await this.ctx.tryReadFile(targetPath);
        if (existingContent) {
          const isReviewed = parseFrontmatter(existingContent)?.reviewed === true;
          if (isReviewed) {
            await this.appendToReviewedPage(info, sourceFile, existingContent, targetPath, sourceSlug);
          } else {
            await this.mergePage(info, targetType, sourceFile, existingContent, extraPagePaths, targetPath, sourceSlug);
          }
          console.debug(`Cross-type collision: merged "${info.name}" content into ${targetType} page ${targetPath}`);
        }
      }
      return result;
    }
    console.debug('Resolved path:', result.path);

    const existingContent = await this.ctx.tryReadFile(result.path);

    if (!existingContent) {
      const createdPath = await this.createNewPage(info, pageType, sourceFile, extraPagePaths, result.path, sourceSlug);
      return { path: createdPath };
    }

    const isReviewed = parseFrontmatter(existingContent)?.reviewed === true;

    if (isReviewed) {
      console.debug(`${pageType} page has reviewed: true, using minimal append mode:`, result.path);
      const updatedPath = await this.appendToReviewedPage(info, sourceFile, existingContent, result.path, sourceSlug);
      return { path: updatedPath };
    }

    const mergedPath = await this.mergePage(info, pageType, sourceFile, existingContent, extraPagePaths, result.path, sourceSlug);
    return { path: mergedPath };
  }

  private async createNewPage(
    info: EntityInfo | ConceptInfo,
    pageType: 'entity' | 'concept',
    sourceFile: TFile | { path: string; basename: string },
    extraPagePaths: string[],
    path: string,
    sourceSlug?: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    try {
      const generatePrompt = pageType === 'entity' ? PROMPTS.generateEntityPage : PROMPTS.generateConceptPage;

    const prompt = generatePrompt
      .replace('{{entity_name}}', info.name)
      .replace('{{concept_name}}', info.name)
      .replace('{{entity_type}}', info.type)
      .replace('{{concept_type}}', info.type)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{concept_summary}}', info.summary)
      .replace('{{extraction_aliases}}', info.aliases?.length
        ? `[${info.aliases.join(', ')}]` : 'None')
      .replace('{{related_entities}}', info.related_entities?.join(', ') || 'No related entities')
      .replace('{{related_concepts}}', info.related_concepts?.join(', ') || 'No related concepts')
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths))
      .replace('{{related_content}}', 'No existing content')
      .replace('{{merge_strategy}}', 'New page, no merge needed.')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      // Issue #155: entity/concept pages cite the canonical source PAGE
      // ([[sources/<slug>]]), not the raw note path — so a collision-disambiguated
      // source slug is honored and the normalizer passes it through unchanged.
      .replace(/\{\{source_file\}\}/g, sourceSlug ? `sources/${sourceSlug}` : sourceFile.path);

    const finalPrompt = appendTagVocabularyToPrompt(applySectionLabels(prompt, this.ctx.settings), this.ctx.settings);

    const pageContent = await client.createMessage({
      model: resolveModelForTask(this.ctx.settings, 'ingest'),
      max_tokens: TOKENS_PAGE_GENERATION,
      system: await this.ctx.buildSystemPrompt(pageType),
      messages: [{ role: 'user', content: finalPrompt }],
      ...(this.ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    // Issue #85: pass settings so custom tag vocabulary is honored
    const enforcedContent = enforceFrontmatterConstraints(cleanedContent, pageType, this.ctx.settings);
    // Re-assert the known type of related links (deterministic; fixes the model's
    // `sources/` guess against a truncated existing-pages list).
    const labels = getSectionLabels(this.ctx.settings);
    // Re-assert the known section labels before the link corrector runs, so a garbled
    // `## Verwandte …` header still resolves its section for prefix correction.
    const canonicalizedContent = canonicalizeSectionHeaders(enforcedContent, Object.values(labels));
    const correctedContent = correctRelatedLinkPrefixes(
      canonicalizedContent,
      info.related_entities,
      info.related_concepts,
      labels.related_entities,
      labels.related_concepts,
      this.ctx.settings.slugCase === 'preserve'
    );
    // Issue #244: programmatically inject the Mentions section so the LLM
    // cannot drift the citation format or leak note-folder prefixes into
    // Related sections. (Create path — the page is new, never reviewed.)
    // B2: prefer structured provenance when present; only fall back to legacy
    // mentions_in_source if the structured form is absent (not just empty).
    // Conversation mode: when sourceFile is a conversation summary, render a
    // single programmatic citation regardless of the mentions array content.
    const isConv = isConversationSource(sourceFile, this.ctx.settings.wikiFolder);
    const mentionsForInject = isConv
      ? []
      : (info.mentions_with_provenance?.length
        ? info.mentions_with_provenance
        : info.mentions_in_source);
    const mentionsInjectedContent = injectMentionsSection(
      correctedContent,
      mentionsForInject,
      sourceFile.path,
      {
        sectionLabel: labels.mentions_in_source,
        conversationMode: isConv,
        conversationLabel: `Conversation: ${sourceFile.basename}`,
      }
    );
    await this.ctx.createOrUpdateFile(path, mentionsInjectedContent);
    return path;
    } catch (error) {
      throw contextualizeError(error, info.name, pageType);
    }
  }

  /**
   * v1.24.0 #216 — classify-then-route merge triage.
   *
   * Pre-flight check that decides whether the merge body rewrite should
   * run or be skipped. The full merge prompt (mergeEntityPage /
   * mergeConceptPage) is expensive and can introduce "drift" on duplicate
   * re-ingests — this lightweight JSON-only call gives the LLM one job:
   * classify the new information as either needing a body rewrite
   * ('merge') or being fully redundant ('skip').
   *
   * Failures (LLM error, malformed JSON, unexpected strategy value) throw
   * so the caller can fall back to the existing merge path. We never
   * silently skip — that would risk dropping genuinely new information.
   *
   * v1.24.0 #216 Tier-2: extended return type to include `items[]`
   * for the complementary path. Items are populated only when
   * strategy='complementary'; other strategies return an empty array.
   *
   * Output contract:
   *   - { strategy: 'skip',          items: [], reason: string }
   *   - { strategy: 'merge',         items: [], reason: string }
   *   - { strategy: 'contradictory', items: [], reason: string }
   *   - { strategy: 'complementary', items: ComplementaryItem[],
   *       reason: string }
   */
  private async classifyMergeNeed(
    info: EntityInfo | ConceptInfo,
    pageType: 'entity' | 'concept',
    sourceFile: TFile | { path: string; basename: string },
    existingContent: string,
  ): Promise<{
    strategy: 'merge' | 'skip' | 'complementary' | 'contradictory';
    items: Array<{
      kind: 'complementary';
      content: string;
      target_section: string;
      reason?: string;
    }>;
    reason: string;
  }> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    // Tier-2: include the localized section labels so the LLM returns
    // target_section values that match the existing page's headers
    // (matters for i18n wikis where labels are translated).
    const labels = getSectionLabels(this.ctx.settings);
    const sectionLabelsList = Object.values(labels).join('\n- ');

    const triagePrompt = PROMPTS.mergeAnalysis
      .replace('{{page_name}}', info.name)
      .replace('{{page_type}}', pageType)
      .replace('{{existing_content}}', existingContent)
      .replace('{{new_info}}', this.buildNewInfoSummary(info, sourceFile))
      .replace('{{section_labels}}', `- ${sectionLabelsList}`);

    const finalPrompt = appendTagVocabularyToPrompt(
      applySectionLabels(triagePrompt, this.ctx.settings),
      this.ctx.settings,
    );

    const response = await client.createMessage({
      model: resolveModelForTask(this.ctx.settings, 'ingest'),
      max_tokens: TOKENS_MERGE_TRIAGE,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }],
      response_format: { type: 'json_object' },
      ...(this.ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const parsed = await parseJsonResponse(response) as {
      strategy?: string;
      items?: Array<{
        kind?: string;
        content?: string;
        target_section?: string;
        reason?: string;
      }>;
      reason?: string;
    } | null;

    if (!parsed) throw new Error('merge triage: empty response');
    const validStrategies = ['merge', 'skip', 'complementary', 'contradictory'];
    if (!validStrategies.includes(parsed.strategy ?? '')) {
      throw new Error(`merge triage: invalid strategy "${parsed.strategy}"`);
    }
    const strategy = parsed.strategy as 'merge' | 'skip' | 'complementary' | 'contradictory';
    const reason = typeof parsed.reason === 'string' ? parsed.reason : '';

    // Items are populated only for the complementary path. Validate the
    // shape defensively — invalid items throw so the caller falls back.
    const items: Array<{
      kind: 'complementary';
      content: string;
      target_section: string;
      reason?: string;
    }> = [];
    if (strategy === 'complementary') {
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      if (rawItems.length === 0) {
        // Defensive: classify said complementary but no items — caller falls back.
        throw new Error('merge triage: complementary strategy with empty items');
      }
      for (const item of rawItems) {
        if (
          typeof item?.content !== 'string' || item.content.trim() === '' ||
          typeof item?.target_section !== 'string' || item.target_section.trim() === ''
        ) {
          throw new Error('merge triage: invalid complementary item');
        }
        items.push({
          kind: 'complementary',
          content: item.content,
          target_section: item.target_section,
          reason: typeof item.reason === 'string' ? item.reason : undefined,
        });
      }
    }

    return { strategy, items, reason };
  }

  /**
   * v1.24.0 #216 — build the compact `{{new_info}}` payload for the
   * triage prompt. Mirrors the fields the full merge prompt uses, but
   * kept tight to control classify-token cost.
   */
  private buildNewInfoSummary(
    info: EntityInfo | ConceptInfo,
    sourceFile: TFile | { path: string; basename: string },
  ): string {
    const parts: string[] = [];
    parts.push(`Source: ${sourceFile.basename}`);
    parts.push(`Summary: ${info.summary}`);
    if (info.related_entities?.length) {
      parts.push(`Related entities: ${info.related_entities.join(', ')}`);
    }
    if (info.related_concepts?.length) {
      parts.push(`Related concepts: ${info.related_concepts.join(', ')}`);
    }
    const quotes = firstQuotesForPrompt(info);
    if (quotes) parts.push(`Key details: ${quotes}`);
    return parts.join('\n');
  }

  /**
   * v1.24.0 #216 Tier-2 — apply complementary appends to the existing body.
   *
   * Groups items by target_section, then issues ONE per-section LLM call
   * per group. The LLM sees (existingSectionContent + the new facts) and
   * returns appended paragraph(s). The caller splices them into the body
   * at the right location using programmatic section-aware insertion.
   *
   * i18n-aware: target resolution uses 4-layer fallback:
   *   1. Exact match against canonical labels
   *   2. Levenshtein snap (reuses snapHeaderToCanonical)
   *   3. Body heading scan + snap
   *   4. Per-section LLM sees the full section content and decides (NO_NEW_CONTENT)
   *   Fallback: ## New Information ({{source}}) at EOF
   */
  private async applyComplementaryAppends(
    items: Array<{ kind: 'complementary'; content: string; target_section: string; reason?: string }>,
    existingBody: string,
    info: EntityInfo | ConceptInfo,
    sourceFile: TFile | { path: string; basename: string },
  ): Promise<string> {
    if (items.length === 0) return existingBody;

    const client = this.ctx.getClient();
    if (!client) return existingBody;

    const labels = getSectionLabels(this.ctx.settings);
    const canonicalLabels = Object.values(labels);

    // 1. Group items by target_section (LLM returns one of the canonical labels).
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const existing = groups.get(item.target_section) ?? [];
      existing.push(item);
      groups.set(item.target_section, existing);
    }

    // 2. For each group, resolve the section anchor, then call per-section LLM.
    let resultBody = existingBody;
    const failedGroups: string[] = [];

    for (const [targetSection, sectionItems] of groups) {
      const sectionContent = this.resolveSectionAnchor(targetSection, resultBody, canonicalLabels);

      // If anchor resolution fully failed (Layer 1-3 all fail), the per-section
      // LLM call still gets the full body — it can decide to NO_NEW_CONTENT.
      const appendContent = await this.callPerSectionAppend(
        sectionContent, // null if anchor not found
        sectionItems,
        info.name,
        sourceFile.basename,
        client,
      );

      if (appendContent === 'NO_NEW_CONTENT') {
        if (sectionContent !== null) {
          // Per-section LLM judged that the new info is already present
          // in the section body. Skip this group — do NOT create a New
          // Information fallback for it, since the info exists.
          continue;
        }
        // Anchor not found AND LLM couldn't place it: fall back to
        // "## New Information" section at EOF.
        failedGroups.push(targetSection);
        continue;
      }

      if (sectionContent !== null) {
        // Found anchor: insert appended paragraphs after the section's last
        // content line (before the next ## heading or EOF).
        // The separator shape (single \n vs blank line) is decided from
        // the section's own content: list-typed sections want a single \n
        // (no blank line splitting the visual list); paragraph-typed
        // sections want a blank line so the appended text reads as a
        // distinct paragraph. See `spliceAfterSection` for the contract.
        const sectionIsList = isListSection(sectionContent.content);
        resultBody = this.spliceAfterSection(
          resultBody,
          sectionContent.anchorEnd,
          appendContent,
          sectionIsList,
        );
      } else {
        // Anchor not found and append succeeded (unusual): treat as
        // fallback to New Information section.
        failedGroups.push(targetSection);
      }
    }

    // 3. Handle failed groups (sections that couldn't be found OR per-section
    // LLM returned NO_NEW_CONTENT) — append to ## New Information at EOF.
    if (failedGroups.length > 0) {
      const newInfoSection = this.makeFallbackNewInfoSection(
        failedGroups,
        items,
        sourceFile.basename,
      );
      resultBody = `${resultBody}\n\n${newInfoSection}`;
    }

    return resultBody !== existingBody ? resultBody : existingBody;
  }

  /**
   * Find a section anchor in existing body: locate the position right
   * AFTER the section's heading AND its existing content (before the
   * next `##` heading or EOF). Returns both the content below the
   * heading (for the per-section LLM) and the insertion point.
   *
   * 4-layer fallback:
   *   Layer 1 — exact match on canonical labels
   *   Layer 2 — snapHeaderToCanonical (Levenshtein, 3-edit window)
   *   Layer 3 — body scan: extract every ## heading and snap each
   *   Layer 4 — per-section LLM callback treats null body as "unknown"
   *             and may return NO_NEW_CONTENT
   *
   * Returns: {
   *   headingText: matched heading title (e.g. "Description")
   *   content: everything after `## heading` up to next ## or EOF
   *   anchorEnd: line index where next ## begins (or body.length)
   * } or null when anchor not found.
   */
  private resolveSectionAnchor(
    targetSection: string,
    body: string,
    canonicalLabels: string[],
  ): { headingText: string; content: string; anchorEnd: number } | null {
    if (!body) return null;

    // Layer 1: exact match against canonical labels
    const exactHeading = canonicalLabels.find(hl => hl === targetSection);
    if (exactHeading !== undefined) {
      const pos = this.findSectionInBody(exactHeading, body);
      if (pos !== null) return pos;
    }

    // Layer 2: Levenshtein snap — snap target to a canonical label
    const snapped = this.snapHeaderImport(targetSection, canonicalLabels);
    if (snapped !== null && snapped !== targetSection) {
      const pos = this.findSectionInBody(snapped, body);
      if (pos !== null) return pos;
    }

    // Layer 3: Body scan — extract every ## heading from the body and
    // check three match paths against targetSection (in order of cost):
    //   a) canonical snap — heading snapped to canonical label matches target
    //   b) exact match — heading text literally === target
    //   c) Levenshtein — heading text is within 3 edits of target
    // This handles i18n cases where the body uses localized headings that
    // are NOT in the canonical label set (e.g. German body "## Beschreibung"
    // with English target "Beschreibun" typo).
    const headingPattern = /^##\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    while ((match = headingPattern.exec(body)) !== null) {
      const hd = match[1].trim();

      // a) Canonical snap: if heading snaps to canonical label matching target
      const headSnapped = this.snapHeaderImport(hd, canonicalLabels);
      if (headSnapped !== null && headSnapped === targetSection) {
        const pos = this.findSectionInBody(hd, body);
        if (pos !== null) return { ...pos, headingText: headSnapped };
      }

      // b) Exact match: heading literal === target
      if (hd === targetSection) {
        const pos = this.findSectionInBody(hd, body);
        if (pos !== null) return pos;
      }

      // c) Levenshtein: heading within 3 edits of target
      if (
        hd.length > 0 &&
        targetSection.length > 0 &&
        Math.abs(hd.length - targetSection.length) <= 3 &&
        this.snapHeaderImport(hd, [targetSection]) !== null
      ) {
        const pos = this.findSectionInBody(hd, body);
        if (pos !== null) return pos;
      }
    }

    // Layer 4: all layers failed; caller gets null — per-section LLM
    // decides, or falls back to New Information section.
    return null;
  }

  /** Helper: find a `## headingName` in body, return its content + end index. */
  private findSectionInBody(
    headingText: string,
    body: string,
  ): { headingText: string; content: string; anchorEnd: number } | null {
        // No /m flag — see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    const nextLinePattern = new RegExp(
      `(?:^|\\n)##\\s*${this.escapeRegExp(headingText)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    
    );
    const m = nextLinePattern.exec(body);
    if (!m) return null;

    const content = m[1].trimEnd();
    const anchorEnd = m.index + m[0].length;
    return { headingText, content, anchorEnd };
  }

  /** Escape regex special characters in a string. */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Import snapHeaderToCanonical from the core module. We can't call
   * module-level functions directly with `this.`; instead call the
   * import via a require-avoiding closure.
   */
  private snapHeaderImport(candidate: string, canonicalLabels: string[]): string | null {
    return snapHeaderToCanonical(candidate, canonicalLabels);
  }

  /**
   * Call per-section LLM. Input: existing-section content (may be null
   * if anchor not found — LLM gets null and treats as unknown) + the
   * complementary items targeting this section. Returns appended
   * paragraph(s) or NO_NEW_CONTENT.
   */
  private async callPerSectionAppend(
    sectionContent: { headingText: string; content: string; anchorEnd: number } | null,
    items: Array<{ content: string; reason?: string }>,
    pageName: string,
    sourceBasename: string,
    client: LLMClient,
  ): Promise<string> {
    const newFacts = items.map(i => `- ${i.content}${i.reason ? ` (${i.reason})` : ''}`).join('\n');
    const sectionTitle = sectionContent?.headingText ?? '[[unknown section]]';
    const existingSection = sectionContent?.content ?? '[[section not found in body]]';

    const appendPrompt = [
      `You are appending new facts to a single section of a wiki page.`,
      ``,
      `**Page Name:** ${pageName}`,
      `**Section Title:** ${sectionTitle}`,
      `**Source:** ${sourceBasename}`,
      ``,
      `**Existing section content (DO NOT DELETE OR REWRITE):**`,
      existingSection,
      ``,
      `**New facts to append at the end of this section:**`,
      newFacts,
      ``,
      `**Rules:**`,
      `- Output ONLY the new paragraphs to append (1-3 lines of markdown).`,
      `- Do NOT include the section heading or any of the existing content.`,
      `- Match the tone and style of the existing section.`,
      `- If the new facts are already present in the existing section content, output exactly "NO_NEW_CONTENT".`,
      `- Do NOT delete or modify any existing content.`,
    ].join('\n');

    try {
      const response = await client.createMessage({
        model: resolveModelForTask(this.ctx.settings, 'ingest'),
        max_tokens: TOKENS_COMPLEMENTARY_APPEND,
        system: await this.ctx.buildSystemPrompt('merge'),
        messages: [{ role: 'user', content: appendPrompt }],
        ...(this.ctx.settings.disableThinking ? { enableThinking: false } : {}),
      });
      const cleaned = response?.trim() ?? '';
      // Empty response (weak model or no new info to add) is equivalent to
      // NO_NEW_CONTENT — falling through here would let spliceAfterSection
      // inject a stray blank line with no content. Short-circuit so the
      // caller's existing NO_NEW_CONTENT branch handles it.
      if (cleaned === '' || cleaned === 'NO_NEW_CONTENT') return 'NO_NEW_CONTENT';
      // Verbatim: the splice site picks the section-break separator (single \n
      // for lists, blank line for paragraphs).
      return cleaned;
    } catch {
      console.warn('[mergePage] per-section append failed — falling back to New Information section');
      return 'NO_NEW_CONTENT';
    }
  }

  private spliceAfterSection(
    body: string,
    anchorEnd: number,
    appendText: string,
    sectionIsList: boolean,
  ): string {
    const separator = sectionIsList ? '\n' : '\n\n';
    const prefix = body.slice(0, anchorEnd).trimEnd();
    const suffix = body.slice(anchorEnd);
    return prefix + separator + appendText + suffix;
  }

  /**
   * Build a "## New Information ({{source}})" section for failed groups
   * whose section could not be resolved or the per-section LLM returned
   * NO_NEW_CONTENT. Collects all items from all failed groups.
   */
  private makeFallbackNewInfoSection(
    failedGroups: string[],
    allItems: Array<{ kind: string; content: string; target_section: string; reason?: string }>,
    sourceBasename: string,
  ): string {
    if (failedGroups.length === 0) return '';
    // Map ALL items — the `failedGroups` parameter tracks which target_section
    // values could not be resolved; we emit all items from those groups for
    // the fallback New Information section. Note: items from succeeded groups
    // are NOT included (they were already placed into their sections above).
    const failedSet = new Set(failedGroups);
    const failedItems = allItems.filter(i => failedSet.has(i.target_section));
    const body = failedItems.length > 0
      ? failedItems.map(i => `- ${i.content}${i.reason ? ` (${i.reason})` : ''}`).join('\n')
      : `- New information from ${sourceBasename}`;
    return `## New Information (${sourceBasename})\n${body}`;
  }

  private async mergePage(
    info: EntityInfo | ConceptInfo,
    pageType: 'entity' | 'concept',
    sourceFile: TFile | { path: string; basename: string },
    existingContent: string,
    extraPagePaths: string[],
    path: string,
    sourceSlug?: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    try {
      // 0. Hoist frontmatter + system prompt above the triage so both the
      // skip path and the body-merge path share them (avoids re-parsing
      // frontmatter and re-loading the schema twice per merge).
      const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceSlug ? `sources/${sourceSlug}` : sourceFile.path);

      // 1. v1.24.0 #216 — classify-then-route triage.
      // Decide between rewriting the body (merge) or skipping the body
      // rewrite (skip — only update frontmatter). The full body merge is
      // expensive and risks "drift" on duplicate re-ingests, so a cheap
      // pre-flight classification saves work in the common case where the
      // new source has nothing to add.
      //
      // Failures here are NOT propagated — they fall through to the
      // existing merge path, preserving backward-compatible behavior.
      //
      // The classify call and its decision happen INSIDE the inner try;
      // the actual write happens OUTSIDE so a createOrUpdateFile failure
      // is not misclassified as "triage failed" and trigger a double-write
      // body-merge fallback.
      let shouldSkip = false;
      let complementaryBody: string | null = null;
      try {
        const triage = await this.classifyMergeNeed(info, pageType, sourceFile, existingBody);
        if (triage.strategy === 'skip') {
          console.debug(
            `[mergePage] triage=skip reason="${triage.reason}" — preserving existing body for ${path}`,
          );
          shouldSkip = true;
        } else if (triage.strategy === 'complementary' && triage.items.length > 0) {
          // v1.24.0 #216 Tier-2: targeted per-section append. Existing
          // body is preserved verbatim; only the named sections receive
          // appended paragraphs from the per-section LLM call.
          console.debug(
            `[mergePage] triage=complementary items=${triage.items.length} — appending to existing sections for ${path}`,
          );
          complementaryBody = await this.applyComplementaryAppends(
            triage.items,
            existingBody,
            info,
            sourceFile,
          );
          if (complementaryBody === existingBody) {
            // Per-section LLM returned NO_NEW_CONTENT for every group →
            // fall through to body-merge so the new info isn't silently lost.
            console.debug(
              `[mergePage] complementary path produced no per-section appends — falling back to body-merge for ${path}`,
            );
          } else {
            shouldSkip = true; // signal "use existing frontmatter + write complementaryBody"
          }
        }
        // strategy === 'merge' | 'contradictory': fall through to the
        // existing body rewrite below (contradictory uses the existing
        // "preserve both with attribution" rule).
      } catch (triageError) {
        console.warn(
          `[mergePage] triage failed (${triageError instanceof Error ? triageError.message : String(triageError)}) — falling back to merge path`,
        );
      }

      if (shouldSkip) {
        const bodyToWrite = complementaryBody ?? existingBody;
        await this.ctx.createOrUpdateFile(
          path,
          await this.assembleFinalContent(frontmatter, bodyToWrite, info, sourceFile, existingBody),
        );
        return path;
      }

      // 2. LLM intelligent body merge
    const mergePrompt = pageType === 'entity' ? PROMPTS.mergeEntityPage : PROMPTS.mergeConceptPage;

    const prompt = mergePrompt
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{concept_summary}}', info.summary)
      .replace('{{related_entities}}', info.related_entities?.join(', ') || '')
      .replace('{{related_concepts}}', info.related_concepts?.join(', ') || '')
      .replace('{{key_details}}', firstQuotesForPrompt(info))
      .replace('{{existing_pages}}', await this.buildPagesListForPrompt(extraPagePaths));

    const finalPrompt = appendTagVocabularyToPrompt(applySectionLabels(prompt, this.ctx.settings), this.ctx.settings);

    const mergedBody = await client.createMessage({
      model: resolveModelForTask(this.ctx.settings, 'ingest'),
      max_tokens: TOKENS_PAGE_GENERATION,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }],
      ...(this.ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedBody = cleanMarkdownResponse(mergedBody);

    if (cleanedBody.trim() === 'NO_NEW_CONTENT') {
      console.debug(`${pageType} page merge returned NO_NEW_CONTENT, keeping existing:`, path);
      return path;
    }

    // 3. Assemble final content (re-assert related-link types deterministically)
    const labels = getSectionLabels(this.ctx.settings);
    const canonicalizedBody = canonicalizeSectionHeaders(cleanedBody, Object.values(labels));
    const correctedBody = correctRelatedLinkPrefixes(
      canonicalizedBody,
      info.related_entities,
      info.related_concepts,
      labels.related_entities,
      labels.related_concepts,
      this.ctx.settings.slugCase === 'preserve'
    );
    // v1.24.0 #216 — finalization (frontmatter + Mentions injection) lives
    // in assembleFinalContent(), shared with the skip path.
    await this.ctx.createOrUpdateFile(
      path,
      await this.assembleFinalContent(frontmatter, correctedBody, info, sourceFile, existingBody),
    );
    return path;
    } catch (error) {
      throw mergeError(error, info.name, pageType);
    }
  }

  /**
   * v1.24.0 #216 — shared finalization for both the skip path (preserved
   * body) and the body-merge path (rewritten body). Runs the Issue #244
   * programmatic Mentions-in-Source injection and assembles the final
   * `<frontmatter>\n\n<body>` shape that gets written via
   * `createOrUpdateFile`.
   *
   * B2: prefer structured `mentions_with_provenance` when present;
   * only fall back to legacy `mentions_in_source` if the structured form
   * is absent (not just empty). Conversation sources emit an empty
   * mentions list (the conversation-label suffix is the citation).
   */
  private async assembleFinalContent(
    frontmatter: string,
    body: string,
    info: EntityInfo | ConceptInfo,
    sourceFile: TFile | { path: string; basename: string },
    // Issue #267 — the existing page body, source of the Mentions accumulated
    // across every prior source. Merge callers pass it so the injection unions
    // rather than overwrites; the create path never reaches this method.
    existingBody: string,
  ): Promise<string> {
    const labels = getSectionLabels(this.ctx.settings);
    const isConv = isConversationSource(sourceFile, this.ctx.settings.wikiFolder);

    if (isConv) {
      // Conversation sources emit a single citation line (Issue #244); no
      // cross-source accumulation of verbatim quotes, so nothing to union.
      const bodyWithMentions = injectMentionsSection(body, [], sourceFile.path, {
        sectionLabel: labels.mentions_in_source,
        conversationMode: true,
        conversationLabel: `Conversation: ${sourceFile.basename}`,
      });
      return `${frontmatter}\n\n${bodyWithMentions}`;
    }

    // Issue #267 — injectMentionsSection re-emits the section from the array we
    // hand it, so passing only this source's mentions would drop every earlier
    // source's. Recover the accumulated mentions from the existing page and
    // union them with the new source's before injecting. The helper owns
    // source_path normalization (fill blanks from `sourceFile.path`, strip `.md`).
    const newMentions: MentionWithProvenance[] = info.mentions_with_provenance?.length
      ? info.mentions_with_provenance
      : (info.mentions_in_source ?? []).map(quote => ({
          quote,
          source_path: sourceFile.path,
          source_slug: '',
          extracted_at: '',
        }));

    const { mentions: unioned, preserveRaw } = computeReingestMentions(
      existingBody,
      newMentions,
      labels.mentions_in_source,
      sourceFile.path,
    );
    if (preserveRaw !== null) {
      // Fail-safe: the existing section has hand-edited or linter-reflowed
      // lines we cannot structurally parse. Preserve it verbatim rather than
      // risk dropping curated quotes (the very failure mode #267 is about);
      // skip this source's mentions merge for this pass.
      console.warn(
        `[assembleFinalContent] Mentions section on the existing page for "${info.name}" has hand-edited or unrecognized lines — preserving it verbatim and skipping the mentions merge for ${sourceFile.path} to avoid dropping curated quotes (#267).`,
      );
      const stripped = stripMentionsSection(body, labels.mentions_in_source);
      const preserved = stripped ? `${stripped}\n\n${preserveRaw}` : preserveRaw;
      return `${frontmatter}\n\n${preserved}`;
    }

    const bodyWithMentions = injectMentionsSection(body, unioned, sourceFile.path, {
      sectionLabel: labels.mentions_in_source,
      conversationMode: false,
      conversationLabel: `Conversation: ${sourceFile.basename}`,
    });
    return `${frontmatter}\n\n${bodyWithMentions}`;
  }

  private async appendToReviewedPage(
    info: EntityInfo | ConceptInfo,
    sourceFile: TFile | { path: string; basename: string },
    existingContent: string,
    path: string,
    sourceSlug?: string
  ): Promise<string | null> {
    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    try {
      // 1. Programmatic frontmatter merge
      // Issue #155: record the canonical source PAGE link (disambiguated slug).
      const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceSlug ? `sources/${sourceSlug}` : sourceFile.path);

    // 2. Minimal LLM check for genuinely new content
    const prompt = PROMPTS.appendToReviewedPage
      .replace('{{existing_body}}', existingBody)
      .replace('{{new_source}}', sourceFile.basename)
      .replace('{{entity_summary}}', info.summary)
      .replace('{{key_details}}', firstQuotesForPrompt(info))
      .replace('{{constraints}}', UNIVERSAL_LINK_CONSTRAINTS);

    const finalPrompt = appendTagVocabularyToPrompt(applySectionLabels(prompt, this.ctx.settings), this.ctx.settings);

    const newContent = await client.createMessage({
      model: resolveModelForTask(this.ctx.settings, 'ingest'),
      max_tokens: TOKENS_APPEND_REVIEWED,
      system: await this.ctx.buildSystemPrompt('merge'),
      messages: [{ role: 'user', content: finalPrompt }],
      ...(this.ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedContent = cleanMarkdownResponse(newContent);

    if (cleanedContent.trim() === 'NO_NEW_CONTENT') {
      console.debug('Reviewed page has no new content, preserving existing:', path);
      return path;
    }

    // 3. Assemble final content (Issue #244: programmatic Mentions injection)
    const labels = getSectionLabels(this.ctx.settings);
    // B2: prefer structured provenance when present; only fall back to legacy
    // mentions_in_source if the structured form is absent (not just empty).
    // Conversation mode: see createEntityPage for rationale.
    const isConv = isConversationSource(sourceFile, this.ctx.settings.wikiFolder);
    const appendMentionsForInject = isConv
      ? []
      : (info.mentions_with_provenance?.length
        ? info.mentions_with_provenance
        : info.mentions_in_source);
    const cleanedContentWithMentions = injectMentionsSection(
      cleanedContent,
      appendMentionsForInject,
      sourceFile.path,
      {
        sectionLabel: labels.mentions_in_source,
        conversationMode: isConv,
        conversationLabel: `Conversation: ${sourceFile.basename}`,
        // This path only runs for `reviewed: true` pages (page-factory routing
        // at createOrUpdatePage): the existing Mentions section is protected
        // and must not be overwritten (replaces the <!-- reviewed: keep --> marker).
        pageIsReviewed: true,
      }
    );
    const finalContent = `${frontmatter}\n\n${cleanedContentWithMentions}`;
    await this.ctx.createOrUpdateFile(path, finalContent);
    return path;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update reviewed page "${info.name}": ${msg}`);
    }
  }

  async updateRelatedPage(pageName: string, analysis: SourceAnalysis, sourceFile: TFile | { path: string; basename: string }, sourceSlug?: string): Promise<boolean> {
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
    // Issue #155: cite the canonical source PAGE link (disambiguated slug).
    const { frontmatter, body: existingBody } = mergeFrontmatter(existingContent, sourceSlug ? `sources/${sourceSlug}` : sourceFile.path);

    // Issue #131: a "related page" is an existing page topically related to the
    // source — a different set from the entities/concepts this source extracted.
    // When the source extracted nothing matching this page, there is no new body
    // content to weave in; the previous behaviour regenerated the whole body via
    // the LLM anyway (a no-op rewrite that wastes a call and re-rolls verbatim
    // text through the model, a known corruption vector). Skip the LLM entirely:
    // record the new source in frontmatter and leave the body untouched.
    const newInfo = analysis.entities.find(e => e.name === pageName) || analysis.concepts.find(c => c.name === pageName);
    if (!newInfo) {
      await this.ctx.createOrUpdateFile(page.path, `${frontmatter}\n\n${existingBody}`);
      return true;
    }

    // Parity with createOrUpdatePage: a `reviewed: true` page must never have its
    // body LLM-rewritten — not even when a *different* source extracts it here in
    // Stage 4. Route to the minimal append path so the curated body is preserved
    // exactly and genuinely new content lands in the `## New Information` section.
    if (parseFrontmatter(existingContent)?.reviewed === true) {
      await this.appendToReviewedPage(newInfo, sourceFile, existingContent, page.path);
      return true;
    }

    const prompt = PROMPTS.updateRelatedPage
      .replace('{{page_name}}', pageName)
      .replace('{{existing_body}}', existingBody)
      .replace('{{source_basename}}', sourceFile.basename)
      .replace('{{new_info}}', JSON.stringify(newInfo))
      .replace('{{constraints}}', UNIVERSAL_LINK_CONSTRAINTS);

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const updatedBody = await client.createMessage({
      model: resolveModelForTask(this.ctx.settings, 'ingest'),
      max_tokens: TOKENS_PAGE_GENERATION,
      system: await this.ctx.buildSystemPrompt('related'),
      messages: [{ role: 'user', content: prompt }],
      ...(this.ctx.settings.disableThinking ? { enableThinking: false } : {}),
    });

    const cleanedBody = cleanMarkdownResponse(updatedBody);

    // 2. Assemble: programmatic frontmatter + LLM body
    const finalContent = `${frontmatter}\n\n${cleanedBody}`;
    await this.ctx.createOrUpdateFile(page.path, finalContent);
    return true;
  }
}
