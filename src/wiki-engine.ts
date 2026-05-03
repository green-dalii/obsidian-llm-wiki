// Wiki Engine - Core Wiki ingestion and management logic

import { App, TFile } from 'obsidian';
import {
  LLMWikiSettings,
  LLMClient,
  SourceAnalysis,
  EntityInfo,
  ConceptInfo,
  ContradictionInfo,
  IngestReport,
  WIKI_LANGUAGES
} from './types';
import { PROMPTS } from './prompts';
import { TEXTS } from './texts';
import { slugify, parseJsonResponse, cleanMarkdownResponse, parseFrontmatter, preserveFrontmatterReviewTag } from './utils';
import { SchemaManager, SchemaTask } from './schema-manager';

export class WikiEngine {
  private app: App;
  settings: LLMWikiSettings;
  private llmClient: LLMClient | null;
  private getLLMClient: () => LLMClient | null;
  private schemaManager: SchemaManager;
  private onFileWrite: ((path: string) => void) | null;
  private onProgress: ((message: string) => void) | null;
  private onDone: ((report: IngestReport) => void) | null;

  constructor(
    app: App,
    settings: LLMWikiSettings,
    getLLMClient: () => LLMClient | null,
    schemaManager: SchemaManager,
    onFileWrite?: (path: string) => void,
    onProgress?: (message: string) => void,
    onDone?: (report: IngestReport) => void
  ) {
    this.app = app;
    this.settings = settings;
    this.llmClient = null;
    this.getLLMClient = getLLMClient;
    this.schemaManager = schemaManager;
    this.onFileWrite = onFileWrite || null;
    this.onProgress = onProgress || null;
    this.onDone = onDone || null;
  }

  setFileWriteCallback(cb: (path: string) => void): void {
    this.onFileWrite = cb;
  }

  setProgressCallback(cb: (message: string) => void): void {
    this.onProgress = cb;
  }

  setDoneCallback(cb: ((report: IngestReport) => void) | null): void {
    this.onDone = cb;
  }

  private buildWikiLanguageDirective(): string {
    const lang = this.settings.wikiLanguage || 'en';
    const langName = WIKI_LANGUAGES[lang] || lang;
    return `IMPORTANT: You MUST write ALL content in ${langName}. Every page title, summary, description, and label must be in ${langName}. Do NOT output any content in other languages.`;
  }

  private async buildSystemPrompt(task: SchemaTask): Promise<string | undefined> {
    const parts: string[] = [];
    const langDirective = this.buildWikiLanguageDirective();
    if (langDirective) parts.push(langDirective);
    if (this.settings.enableSchema) {
      const schemaContext = await this.schemaManager.getSchemaContext(task);
      if (schemaContext) parts.push(schemaContext);
    }
    return parts.length > 0 ? parts.join('\n\n') : undefined;
  }

  private get client(): LLMClient {
    const c = this.getLLMClient();
    if (!c) throw new Error('LLM Client not initialized');
    return c;
  }

  async ingestSource(file: TFile) {
    console.debug('=== 开始摄入流程 ===');
    console.debug('源文件:', file.path);
    const startTime = Date.now();
    this.onProgress?.(`Analyzing: ${file.basename}`);

    const failedItems: Array<{ type: 'entity' | 'concept'; name: string; reason: string }> = [];
    let analysis: SourceAnalysis | null = null;

    try {
      await this.ensureWikiStructure();

      analysis = await this.analyzeSource(file);
      if (!analysis) {
        throw new Error('源文件分析失败');
      }
      console.debug('分析结果:', JSON.stringify(analysis, null, 2));

      const totalSteps = 1 + analysis.entities.length + analysis.concepts.length + analysis.related_pages.length + 2;
      let step = 1;

      // Pre-compute planned page paths for summary linking
      const plannedPaths: string[] = [];
      for (const entity of analysis.entities) {
        plannedPaths.push(`${this.settings.wikiFolder}/entities/${slugify(entity.name)}.md`);
      }
      for (const concept of analysis.concepts) {
        plannedPaths.push(`${this.settings.wikiFolder}/concepts/${slugify(concept.name)}.md`);
      }

      // Summary
      this.onProgress?.(`[${step}/${totalSteps}] Creating summary...`);
      await this.apiDelay();
      const summaryPage = await this.createSummaryPage(file, analysis, plannedPaths);
      analysis.created_pages.push(summaryPage);

      // Entities — tolerate individual failures
      for (const entity of analysis.entities) {
        step++;
        this.onProgress?.(`[${step}/${totalSteps}] Entity: ${entity.name}`);
        await this.apiDelay();
        try {
          const entityPage = await this.createOrUpdateEntityPage(entity, analysis, file);
          if (entityPage) {
            analysis.created_pages.push(entityPage);
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`Entity "${entity.name}" failed:`, reason);
          failedItems.push({ type: 'entity', name: entity.name, reason });

          // Auto-retry once
          try {
            await this.apiDelay(2000);
            const retryPage = await this.createOrUpdateEntityPage(entity, analysis, file);
            if (retryPage) {
              analysis.created_pages.push(retryPage);
              console.debug(`Entity "${entity.name}" recovered on retry`);
              failedItems.pop();
            }
          } catch {
            console.error(`Entity "${entity.name}" retry also failed`);
          }
        }
      }

      // Concepts — tolerate individual failures
      for (const concept of analysis.concepts) {
        step++;
        this.onProgress?.(`[${step}/${totalSteps}] Concept: ${concept.name}`);
        await this.apiDelay();
        try {
          const conceptPage = await this.createOrUpdateConceptPage(concept, analysis, file);
          if (conceptPage) {
            analysis.created_pages.push(conceptPage);
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`Concept "${concept.name}" failed:`, reason);
          failedItems.push({ type: 'concept', name: concept.name, reason });

          // Auto-retry once
          try {
            await this.apiDelay(2000);
            const retryPage = await this.createOrUpdateConceptPage(concept, analysis, file);
            if (retryPage) {
              analysis.created_pages.push(retryPage);
              console.debug(`Concept "${concept.name}" recovered on retry`);
              failedItems.pop();
            }
          } catch {
            console.error(`Concept "${concept.name}" retry also failed`);
          }
        }
      }

      // Related pages — tolerate individual failures
      for (const relatedPageName of analysis.related_pages) {
        step++;
        this.onProgress?.(`[${step}/${totalSteps}] Updating: ${relatedPageName}`);
        await this.apiDelay();
        try {
          await this.updateRelatedPage(relatedPageName, analysis);
          analysis.updated_pages.push(relatedPageName);
        } catch (error) {
          console.error(`Related page "${relatedPageName}" update failed, continuing...`, error);
        }
      }

      // Contradictions
      for (const contradiction of analysis.contradictions) {
        try {
          await this.noteContradiction(contradiction);
        } catch {
          // non-critical
        }
      }

      step++;
      this.onProgress?.(`[${step}/${totalSteps}] Generating index...`);
      await this.generateIndexFromEngine();
      await this.updateLog('ingest', analysis);

      // Detailed summary report
      const created = analysis.created_pages.length;
      const updated = analysis.updated_pages.length;

      console.debug('=== 摄入流程完成 ===');
      console.debug(`摄入完成: 创建 ${created} 页, 更新 ${updated} 页`);

      this.onDone?.({
        sourceFile: file.path,
        createdPages: analysis.created_pages,
        updatedPages: analysis.updated_pages,
        failedItems,
        contradictionsFound: analysis.contradictions.length,
        success: true,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
      });

    } catch (error) {
      console.error('=== 摄入流程失败 ===');
      console.error('错误:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.onDone?.({
        sourceFile: file.path,
        createdPages: analysis?.created_pages || [],
        updatedPages: analysis?.updated_pages || [],
        failedItems,
        contradictionsFound: analysis?.contradictions?.length || 0,
        success: false,
        errorMessage: errorMsg,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
      });
      throw error;
    }
  }

  private async apiDelay(ms?: number): Promise<void> {
    await new Promise(resolve => activeWindow.setTimeout(resolve, ms || 300));
  }

  async ensureWikiStructure() {
    const folders = [
      this.settings.wikiFolder,
      `${this.settings.wikiFolder}/entities`,
      `${this.settings.wikiFolder}/concepts`,
      `${this.settings.wikiFolder}/sources`
    ];

    for (const folder of folders) {
      try {
        await this.app.vault.createFolder(folder);
        console.debug('创建文件夹:', folder);
      } catch {
        // 文件夹已存在
      }
    }

    // Schema folder + default config
    await this.schemaManager.ensureSchemaExists();
  }

  async analyzeSource(file: TFile): Promise<SourceAnalysis | null> {
    console.debug('=== 开始分析源文件 ===');
    console.debug('文件:', file.path);

    const content = await this.app.vault.read(file);
    console.debug('文件内容长度:', content.length);

    const existingPages = this.getExistingWikiPages();
    const existingPagesList = existingPages.map(p => `- ${p.wikiLink}`).join('\n');
    console.debug('现有 Wiki 页面数量:', existingPages.length);

    // Iterative batch extraction parameters
    const MAX_TOKENS = 16000;
    const INITIAL_BATCH_SIZE = 20;
    const MIN_BATCH_SIZE = 5;
    let currentBatchSize = INITIAL_BATCH_SIZE;
    const MAX_BATCHES = Math.max(1, Math.ceil(content.length / 500));

    const allEntities: EntityInfo[] = [];
    const allConcepts: ConceptInfo[] = [];
    const extractedNames = new Set<string>();

    let sourceTitle = '';
    let sourceSummary = '';
    let contradictions: ContradictionInfo[] = [];
    let relatedPages: string[] = [];
    let keyPoints: string[] = [];
    let firstBatchData: Partial<SourceAnalysis> | null = null;
    let finalBatchNum = 0;

    // Build granularity instruction
    const granularity = this.settings.extractionGranularity || 'standard';
    const granularityInstructions: Record<string, string> = {
      fine: 'Extract ALL entities and concepts worth recording from the source, including those mentioned only once or tangentially. Make full use of the {{batch_size}} item quota for this round.',
      standard: 'Extract important and moderately important entities and concepts from the source. Ignore minor items mentioned only in passing.',
      coarse: 'Extract only the most essential entities and concepts from the source — those without which the text cannot be understood. Strictly limit quantity; quality over quantity.'
    };

    // Build the static prefix once — everything before {{batch_context}}
    // with source content and existing pages substituted.  This prefix is
    // identical across all batches, making it the ideal cache anchor.
    const templateUntouched = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', existingPagesList);
    const batchMarker = '{{batch_context}}';
    const markerIdx = templateUntouched.indexOf(batchMarker);
    const staticPrefix = templateUntouched.substring(0, markerIdx);
    // Suffix template (after {{batch_context}}) — variable part replaced per batch
    const suffixTemplate = templateUntouched.substring(markerIdx + batchMarker.length);

    for (let batchNum = 0; batchNum < MAX_BATCHES; batchNum++) {
      const isFirstBatch = batchNum === 0;

      // Build batch context (what's already extracted)
      let batchContext: string;
      if (isFirstBatch) {
        batchContext = 'This is the first extraction round. Extract the most important entities and concepts from the source.';
      } else {
        const nameList = [...extractedNames].map(n => `"${n}"`).join(', ');
        batchContext = `This is round ${batchNum + 1} of extraction. The following items have already been extracted — do NOT repeat them:\n${nameList}\n\nExtract the next batch of most important entities and concepts from the remaining content. If no more items are worth extracting, return empty arrays [] for entities and concepts.`;
      }

      const prompt = staticPrefix + batchContext + suffixTemplate
        .replace('{{granularity_instruction}}', granularityInstructions[granularity])
        .replace(/{{batch_size}}/g, String(currentBatchSize));

      // Reinforce language directive at end of user prompt (belt-and-suspenders with system prompt)
      const langHint = `\n\nCRITICAL LANGUAGE REQUIREMENT: All entity names, concept names, summaries, descriptions, and key points in your JSON output MUST be written in ${WIKI_LANGUAGES[this.settings.wikiLanguage || 'en'] || this.settings.wikiLanguage || 'English'}. Do NOT output any content in other languages.`;
      const finalPrompt = prompt + langHint;

      console.debug(`[Batch ${batchNum + 1}/${MAX_BATCHES}] 发起LLM调用 (batch_size=${currentBatchSize})...`);
      console.debug(`[Batch ${batchNum + 1}] Prompt长度:`, prompt.length);
      this.onProgress?.(`Analyzing batch ${batchNum + 1}...`);

      try {
        const response = await this.client.createMessage({
          model: this.settings.model,
          max_tokens: MAX_TOKENS,
          system: await this.buildSystemPrompt('analyze'),
          messages: [{ role: 'user', content: finalPrompt }],
          response_format: { type: 'json_object' },
          cacheBreakpoint: staticPrefix.length
        });

        console.debug(`[Batch ${batchNum + 1}] 响应长度:`, response.length);
        this.onProgress?.(`Analyzed batch ${batchNum + 1}, processing...`);

        const analysisData = await parseJsonResponse(response, async (malformedJson: string) => {
          const repairPrompt = `Fix the following malformed JSON. Only fix JSON syntax errors (unescaped quotes, trailing commas, missing brackets). Do NOT change any values or content. Output ONLY the fixed JSON, no other text.\n\n${malformedJson}`;
          return await this.client.createMessage({
            model: this.settings.model,
            max_tokens: MAX_TOKENS,
            system: await this.buildSystemPrompt('analyze'),
            messages: [{ role: 'user', content: repairPrompt }],
            response_format: { type: 'json_object' }
          });
        }) as Partial<SourceAnalysis> | null;

        if (!analysisData) {
          console.error(`[Batch ${batchNum + 1}] JSON 解析失败，跳过此批次`);
          if (isFirstBatch) return null;
          break; // non-first batch: keep what we have
        }

        // First batch: capture metadata
        if (isFirstBatch) {
          if (!analysisData.entities || !analysisData.concepts) {
            console.error('❌ 第一轮缺少必要字段 (entities/concepts):', {
              entities: !!analysisData.entities,
              concepts: !!analysisData.concepts
            });
            return null;
          }
          if (!analysisData.source_title) {
            console.debug('第一轮缺少 source_title，使用文件名作为回退:', file.basename);
          }
          firstBatchData = analysisData;
          sourceTitle = analysisData.source_title || file.basename;
          sourceSummary = analysisData.summary || '';
          contradictions = analysisData.contradictions || [];
          relatedPages = analysisData.related_pages || [];
          keyPoints = analysisData.key_points || [];
        }

        // Deduplicate (code-level safety net)
        const newEntities = (analysisData.entities || []).filter(e => {
          if (!e.name?.trim()) return false;
          if (extractedNames.has(e.name.trim().toLowerCase())) return false;
          return true;
        });

        const newConcepts = (analysisData.concepts || []).filter(c => {
          if (!c.name?.trim()) return false;
          if (extractedNames.has(c.name.trim().toLowerCase())) return false;
          return true;
        });

        // Track names
        for (const e of newEntities) extractedNames.add(e.name.trim().toLowerCase());
        for (const c of newConcepts) extractedNames.add(c.name.trim().toLowerCase());

        allEntities.push(...newEntities);
        allConcepts.push(...newConcepts);

        const batchTotal = newEntities.length + newConcepts.length;
        console.debug(`[Batch ${batchNum + 1}] 新增: ${newEntities.length} entities, ${newConcepts.length} concepts (扣除重复后 ${batchTotal})`);
        console.debug(`[Batch ${batchNum + 1}] 累计: ${allEntities.length} entities, ${allConcepts.length} concepts`);

        // Adaptive batch_size: if output approaches 70% of max_tokens, shrink next batch
        const RESPONSE_FULLNESS_THRESHOLD = MAX_TOKENS * 0.7;
        if (response.length > RESPONSE_FULLNESS_THRESHOLD && currentBatchSize > MIN_BATCH_SIZE) {
          const prevSize = currentBatchSize;
          currentBatchSize = Math.max(MIN_BATCH_SIZE, Math.floor(currentBatchSize * 0.75));
          console.debug(`[Batch ${batchNum + 1}] 响应长度 ${response.length} 超过阈值 ${Math.round(RESPONSE_FULLNESS_THRESHOLD)}，batch_size: ${prevSize} → ${currentBatchSize}`);
        }

        // Stop conditions
        const rawTotal = (analysisData.entities || []).length + (analysisData.concepts || []).length;
        finalBatchNum = batchNum + 1;

        if (rawTotal === 0) {
          console.debug(`[Batch ${batchNum + 1}] LLM返回空数组，停止迭代`);
          break;
        }

        if (rawTotal < currentBatchSize) {
          console.debug(`[Batch ${batchNum + 1}] 返回条目 ${rawTotal} < ${currentBatchSize}，判断已穷尽，停止迭代`);
          break;
        }

      } catch (error) {
        console.error(`[Batch ${batchNum + 1}] 调用失败:`, error);
        if (isFirstBatch) {
          console.error('❌ 第一轮失败，无法继续');
          return null;
        }
        console.warn(`[Batch ${batchNum + 1}] 非第一轮失败，保留已提取的 ${allEntities.length + allConcepts.length} 个条目`);
        break;
      }
    }

    if (!firstBatchData && allEntities.length === 0 && allConcepts.length === 0) {
      return null;
    }

    const analysis: SourceAnalysis = {
      source_file: file.path,
      source_title: sourceTitle || firstBatchData?.source_title || file.basename,
      summary: sourceSummary || (firstBatchData as SourceAnalysis)?.summary || '',
      entities: allEntities,
      concepts: allConcepts,
      contradictions: contradictions,
      related_pages: relatedPages,
      key_points: keyPoints,
      created_pages: [],
      updated_pages: []
    };

    console.debug('=== 迭代提取完成 ===');
    console.debug('  - 总轮次:', finalBatchNum);
    console.debug('  - 实体数量:', allEntities.length);
    console.debug('  - 概念数量:', allConcepts.length);
    console.debug('  - 去重名称:', extractedNames.size);

    return analysis;

  }

  getExistingWikiPages(): {path: string, title: string, wikiLink: string}[] {
    const wikiFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(this.settings.wikiFolder) &&
                   !f.path.includes('index.md') &&
                   !f.path.includes('log.md'));

    return wikiFiles.map(f => {
      const relPath = f.path.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
      return {
        path: f.path,
        title: f.basename,
        wikiLink: `[[${relPath}|${f.basename}]]`
      };
    });
  }

  private buildPagesListForPrompt(includePaths: string[] = []): string {
    const allPages = this.getExistingWikiPages();
    const MAX_PAGES = 50;
    let pages = allPages;
    let truncated = false;
    if (allPages.length > MAX_PAGES) {
      // Prioritize pages from same category (entities/concepts) based on the extra paths
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
        const relPath = p.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
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

  async createSummaryPage(file: TFile, analysis: SourceAnalysis, plannedPaths: string[] = []): Promise<string> {
    const slug = slugify(file.basename);
    const path = `${this.settings.wikiFolder}/sources/${slug}.md`;
    const content = await this.app.vault.read(file);

    const createdPagesList = plannedPaths.length > 0
      ? plannedPaths.map(p => {
          const relPath = p.replace(this.settings.wikiFolder + '/', '').replace('.md', '');
          const name = relPath.split('/').pop() || relPath;
          return `- [[${relPath}|${name}]]`;
        }).join('\n')
      : analysis.entities.map(e => `- [[entities/${slugify(e.name)}|${e.name}]]`).join('\n') +
        '\n' +
        analysis.concepts.map(c => `- [[concepts/${slugify(c.name)}|${c.name}]]`).join('\n');

    const prompt = PROMPTS.generateSummaryPage
      .replace('{{source_title}}', analysis.source_title)
      .replace('{{content}}', content.substring(0, 500))
      .replace('{{analysis}}', JSON.stringify(analysis))
      .replace('{{created_pages_list}}', createdPagesList || '(none)')
      .replace(/{{source_file}}/g, file.path)
      .replace(/{{date}}/g, new Date().toISOString().split('T')[0])
      .replace('{{tags}}', analysis.concepts.map(c => c.name).join(', '));

    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      system: await this.buildSystemPrompt('summary'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async createOrUpdateEntityPage(entity: EntityInfo, _analysis: SourceAnalysis, sourceFile: TFile | { path: string; basename: string }, extraPagePaths: string[] = []): Promise<string | null> {
    if (!entity.name || entity.name.trim().length === 0) {
      console.warn('实体名称为空，跳过创建');
      return null;
    }

    console.debug('=== 创建实体页 ===');
    console.debug('entity.name:', entity.name);
    console.debug('类型:', entity.type);

    const slug = slugify(entity.name);
    console.debug('生成的 slug:', slug);
    const path = `${this.settings.wikiFolder}/entities/${slug}.md`;
    console.debug('目标路径:', path);

    const existingContent = await this.tryReadFile(path);
    const isReviewed = existingContent ? parseFrontmatter(existingContent)?.reviewed === true : false;
    if (isReviewed) {
      console.debug('Entity page has reviewed: true, using preserve mode:', path);
    }

    // Multi-source fusion: run merge analysis for substantial existing pages
    let mergeStrategy = 'New page, no merge needed.';
    if (existingContent && !isReviewed && existingContent.length > this.MERGE_CONTENT_THRESHOLD) {
      try {
        console.debug('Running merge analysis for existing entity page:', path);
        const mergeAnalysis = await this.analyzeMerge(entity.name, 'entity', existingContent, entity);
        mergeStrategy = this.buildMergeStrategyText(mergeAnalysis);
        if (mergeAnalysis.contradictions.length > 0) {
          for (const c of mergeAnalysis.contradictions) {
            _analysis.contradictions.push({
              claim: c.claim,
              source_page: `[[entities/${slug}]]`,
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

    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      system: await this.buildSystemPrompt('entity'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    const finalContent = existingContent ? preserveFrontmatterReviewTag(existingContent, cleanedContent) : cleanedContent;
    await this.createOrUpdateFile(path, finalContent);
    return path;
  }

  async createOrUpdateConceptPage(concept: ConceptInfo, _analysis: SourceAnalysis, sourceFile: TFile | { path: string; basename: string }, extraPagePaths: string[] = []): Promise<string | null> {
    if (!concept.name || concept.name.trim().length === 0) {
      console.warn('概念名称为空，跳过创建');
      return null;
    }

    console.debug('=== 创建概念页 ===');
    console.debug('concept.name:', concept.name);
    console.debug('类型:', concept.type);

    const slug = slugify(concept.name);
    console.debug('生成的 slug:', slug);
    const path = `${this.settings.wikiFolder}/concepts/${slug}.md`;
    console.debug('目标路径:', path);

    const existingContent = await this.tryReadFile(path);
    const isReviewed = existingContent ? parseFrontmatter(existingContent)?.reviewed === true : false;
    if (isReviewed) {
      console.debug('Concept page has reviewed: true, using preserve mode:', path);
    }

    // Multi-source fusion: run merge analysis for substantial existing pages
    let mergeStrategy = 'New page, no merge needed.';
    if (existingContent && !isReviewed && existingContent.length > this.MERGE_CONTENT_THRESHOLD) {
      try {
        console.debug('Running merge analysis for existing concept page:', path);
        const mergeAnalysis = await this.analyzeMerge(concept.name, 'concept', existingContent, concept);
        mergeStrategy = this.buildMergeStrategyText(mergeAnalysis);
        if (mergeAnalysis.contradictions.length > 0) {
          for (const c of mergeAnalysis.contradictions) {
            _analysis.contradictions.push({
              claim: c.claim,
              source_page: `[[concepts/${slug}]]`,
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

    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      system: await this.buildSystemPrompt('concept'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    const finalContent = existingContent ? preserveFrontmatterReviewTag(existingContent, cleanedContent) : cleanedContent;
    await this.createOrUpdateFile(path, finalContent);
    return path;
  }

  async updateRelatedPage(pageName: string, analysis: SourceAnalysis) {
    const existingPages = this.getExistingWikiPages();
    const page = existingPages.find(p => p.title === pageName);

    if (!page) {
      console.debug('相关页面不存在:', pageName);
      return;
    }

    const abstractFile = this.app.vault.getAbstractFileByPath(page.path);
    if (!(abstractFile instanceof TFile)) {
      console.debug('相关页面不是文件:', pageName);
      return;
    }

    const existingContent = await this.app.vault.read(abstractFile);

    const prompt = `Existing Wiki page: ${pageName}

Existing content:
${existingContent}

The new source file provides additional information about ${pageName}:
${JSON.stringify(analysis.entities.find(e => e.name === pageName) || analysis.concepts.find(c => c.name === pageName) || 'No directly relevant information')}

Update the page by adding the new information without deleting existing content. Use wiki-link syntax [[page-name]].
Output ONLY the complete updated page content, no other text.`;

    const updatedContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      system: await this.buildSystemPrompt('related'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(updatedContent);
    await this.createOrUpdateFile(page.path, cleanedContent);
  }

  // ---- Multi-Source Knowledge Fusion helpers ----

  private readonly MERGE_CONTENT_THRESHOLD = 300;

  private async analyzeMerge(
    pageName: string,
    pageType: 'entity' | 'concept',
    existingContent: string,
    newInfo: EntityInfo | ConceptInfo
  ): Promise<{ merge_items: Array<{ content: string; classification: string; target_section: string; reason: string }>; contradictions: Array<{ claim: string; existing_claim: string; resolution: string }>; merge_summary: string }> {
    const prompt = PROMPTS.mergeAnalysis
      .replace('{{page_name}}', pageName)
      .replace('entity or concept', pageType)
      .replace('{{existing_content}}', existingContent)
      .replace('{{new_info}}', JSON.stringify(newInfo, null, 2));

    const response = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      system: await this.buildSystemPrompt('full'),
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

  private buildMergeStrategyText(analysis: { merge_items: Array<{ content: string; classification: string; target_section: string; reason: string }>; merge_summary: string }): string {
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

  async noteContradiction(contradiction: ContradictionInfo) {
    const pagePath = contradiction.source_page.replace(/\[\[(.+)\]\]/, `${this.settings.wikiFolder}/$1.md`);

    const existingContent = await this.tryReadFile(pagePath);
    if (!existingContent) {
      return;
    }

    const contradictionNote = `\n\n## ⚠️ Potential Contradiction\n\n**Source claim**: ${contradiction.claim}\n\n**Existing view**: ${contradiction.contradicted_by}\n\n**Resolution suggestion**: ${contradiction.resolution}\n\n---\n*Flagged: ${new Date().toISOString().split('T')[0]}*`;

    await this.createOrUpdateFile(pagePath, existingContent + contradictionNote);

    // Track in contradictions directory
    await this.trackContradiction(contradiction);
  }

  // ---- Contradiction Tracking ----

  private async trackContradiction(contradiction: ContradictionInfo): Promise<void> {
    const contradictionsDir = `${this.settings.wikiFolder}/contradictions`;
    try {
      await this.app.vault.createFolder(contradictionsDir);
    } catch {
      // folder already exists
    }

    const date = new Date().toISOString().split('T')[0];
    const claimSlug = slugify(contradiction.claim.substring(0, 50));
    const filePath = `${contradictionsDir}/${claimSlug}-${date}.md`;

    // Skip if this exact contradiction file already exists
    if (await this.tryReadFile(filePath)) {
      console.debug('Contradiction already tracked:', filePath);
      return;
    }

    const pageRelPath = contradiction.source_page.replace(/\[\[(.+)\]\]/, '$1');
    const content = `---
status: detected
detected: ${date}
source_page: "[[${pageRelPath}]]"
---

# Contradiction: ${contradiction.claim.substring(0, 60)}

## New Claim
${contradiction.claim}

## Existing Knowledge
${contradiction.contradicted_by}

## Resolution Suggestion
${contradiction.resolution}

## Source Page
${contradiction.source_page}

---
*Auto-detected on ${date}*
`;

    await this.createOrUpdateFile(filePath, content);
    console.debug('Contradiction tracked:', filePath);
  }

  async getOpenContradictions(): Promise<Array<{ path: string; status: string; claim: string; sourcePage: string }>> {
    const contradictionsDir = `${this.settings.wikiFolder}/contradictions`;
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(contradictionsDir));

    const results: Array<{ path: string; status: string; claim: string; sourcePage: string }> = [];

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const fm = parseFrontmatter(content);
      const status = (fm?.status as string) || 'detected';

      if (status === 'resolved' || status === 'suppressed') continue;

      // Extract claim from content
      const claimMatch = content.match(/## New Claim\n(.+?)(?:\n|$)/);
      const sourceMatch = content.match(/## Source Page\n(.+?)(?:\n|$)/);

      results.push({
        path: file.path,
        status,
        claim: claimMatch?.[1]?.trim() || file.basename,
        sourcePage: sourceMatch?.[1]?.trim() || ''
      });
    }

    return results;
  }

  async updateContradictionStatus(filePath: string, newStatus: string): Promise<void> {
    const content = await this.tryReadFile(filePath);
    if (!content) {
      console.debug('Contradiction file not found:', filePath);
      return;
    }
    const updated = content.replace(
      /^status:\s*\S+/m,
      `status: ${newStatus}`
    );
    if (newStatus === 'resolved') {
      const resolvedDate = new Date().toISOString().split('T')[0];
      if (updated.includes('resolved:')) {
        const final = updated.replace(/^resolved:\s*\S*/m, `resolved: ${resolvedDate}`);
        await this.createOrUpdateFile(filePath, final);
      } else {
        const final = updated.replace(
          /^(detected:\s*\S+)/m,
          `$1\nresolved: ${resolvedDate}`
        );
        await this.createOrUpdateFile(filePath, final);
      }
    } else {
      await this.createOrUpdateFile(filePath, updated);
    }
    console.debug(`Contradiction status updated: ${filePath} → ${newStatus}`);
  }

  async resolveContradiction(contradictionPath: string): Promise<void> {
    const contradictionContent = await this.tryReadFile(contradictionPath);
    if (!contradictionContent) throw new Error('Contradiction file not found');

    const fm = parseFrontmatter(contradictionContent);
    const sourcePage = (fm?.source_page as string) || '';
    const pagePath = sourcePage.replace(/\[\[(.+)\]\]/, `${this.settings.wikiFolder}/$1.md`);

    const existingContent = await this.tryReadFile(pagePath);
    if (!existingContent) throw new Error('Affected wiki page not found');

    const prompt = PROMPTS.resolveContradiction
      .replace('{{existing_content}}', existingContent.substring(0, 6000))
      .replace('{{contradiction_content}}', contradictionContent.substring(0, 3000));

    const fixedContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 4000,
      system: await this.buildSystemPrompt('full'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleaned = cleanMarkdownResponse(fixedContent);
    await this.createOrUpdateFile(pagePath, cleaned);
    console.debug('Contradiction resolved:', contradictionPath);
  }

  // ---- Lint Fix Methods ----

  async fixDeadLink(sourcePath: string, targetName: string): Promise<string> {
    const existingPages = this.getExistingWikiPages();
    const pagesList = existingPages.map(p => `- ${p.wikiLink}`).join('\n');
    const sourceContent = await this.tryReadFile(sourcePath) || '(empty)';

    const prompt = PROMPTS.fixDeadLink
      .replace('{{source_content}}', sourceContent.substring(0, 2000))
      .replace('{{target_name}}', targetName)
      .replace('{{existing_pages}}', pagesList.substring(0, 3000));

    const response = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 300,
      system: await this.buildSystemPrompt('lint'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const result = await parseJsonResponse(response) as {
      action?: string; correct_link?: string; stub_title?: string; stub_type?: string;
    } | null;

    if (result?.action === 'correct' && result.correct_link) {
      // Fix the link in source page
      const oldLink = new RegExp(`\\[\\[${targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'g');
      const updatedContent = sourceContent.replace(oldLink, result.correct_link);
      await this.createOrUpdateFile(sourcePath, updatedContent);
      return `corrected: ${result.correct_link}`;
    }

    if (result?.action === 'create_stub' && result.stub_title) {
      const stubType = result.stub_type || 'entity';
      const stubPath = `${this.settings.wikiFolder}/${stubType}s/${slugify(result.stub_title)}.md`;
      const stubContent = `---
type: ${stubType}
created: ${new Date().toISOString().split('T')[0]}
---
# ${result.stub_title}

> Auto-generated stub page — referenced by [[${sourcePath.replace(this.settings.wikiFolder + '/', '').replace('.md', '')}]].
`;
      await this.createOrUpdateFile(stubPath, stubContent);
      // Expand the stub with AI-generated content immediately
      await this.fillEmptyPage(stubPath);
      return `stub created and expanded: ${stubPath}`;
    }

    return 'no action taken';
  }

  async fillEmptyPage(pagePath: string): Promise<void> {
    const existingContent = await this.tryReadFile(pagePath);
    if (!existingContent) return;

    const pageType = pagePath.includes('/entities/') ? 'entities' :
                     pagePath.includes('/concepts/') ? 'concepts' : 'sources';
    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const wikiIndex = await this.tryReadFile(indexPath) || '';

    const prompt = PROMPTS.fillEmptyPage
      .replace('{{page_path}}', pagePath)
      .replace('{{page_type}}', pageType)
      .replace('{{existing_content}}', existingContent)
      .replace('{{wiki_index}}', wikiIndex.substring(0, 2000));

    const filledContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      system: await this.buildSystemPrompt('full'),
      messages: [{ role: 'user', content: prompt }]
    });

    const cleaned = cleanMarkdownResponse(filledContent);
    await this.createOrUpdateFile(pagePath, cleaned);
  }

  async linkOrphanPage(orphanPath: string): Promise<void> {
    const orphanContent = await this.tryReadFile(orphanPath);
    if (!orphanContent) return;

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const wikiIndex = await this.tryReadFile(indexPath) || '';

    const prompt = PROMPTS.linkOrphanPage
      .replace('{{orphan_content}}', orphanContent.substring(0, 2000))
      .replace('{{wiki_index}}', wikiIndex.substring(0, 3000));

    const response = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 800,
      system: await this.buildSystemPrompt('lint'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const result = await parseJsonResponse(response) as {
      related_pages?: Array<{ page_path: string; link_text: string; link_target: string }>;
    } | null;

    if (!result?.related_pages?.length) return;

    for (const related of result.related_pages) {
      const fullPath = related.page_path.startsWith(this.settings.wikiFolder)
        ? related.page_path : `${this.settings.wikiFolder}/${related.page_path}`;
      const relatedContent = await this.tryReadFile(fullPath);
      if (!relatedContent) continue;

      if (!relatedContent.includes(related.link_target)) {
        const section = relatedContent.includes('## Related Pages')
          ? '' : '\n\n## Related Pages';
        const updated = relatedContent + `${section}\n- ${related.link_text} ${related.link_target}`;
        await this.createOrUpdateFile(fullPath, updated);
      }
    }
  }

  async createOrUpdateFile(path: string, content: string): Promise<void> {
    console.debug('createOrUpdateFile:', path);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          console.debug(`尝试 ${attempt + 1}: 文件已存在，更新:`, path);
          await this.app.vault.modify(file, content);
          console.debug('更新成功:', path);
          this.onFileWrite?.(path);
          return;
        } else {
          console.debug(`尝试 ${attempt + 1}: 文件不存在，创建:`, path);
          await this.app.vault.create(path, content);
          console.debug('创建成功:', path);
          this.onFileWrite?.(path);
          return;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`尝试 ${attempt + 1} 失败:`, errorMsg);

        if (errorMsg.includes('File already exists') || errorMsg.includes('already exists')) {
          console.debug('文件已存在异常，等待100ms后重试:', path);
          await new Promise(resolve => activeWindow.setTimeout(resolve, 100));
          continue;
        } else {
          console.error('无法处理的错误:', path, error);
          throw error;
        }
      }
    }

    console.debug('3次尝试后，强制查找文件并更新:', path);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
      console.debug('最终更新成功:', path);
    } else {
      throw new Error(`无法创建或更新文件: ${path}`);
    }
  }

  async tryReadFile(path: string): Promise<string | null> {
    try {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        return await this.app.vault.read(file);
      }
    } catch {
      return null;
    }
    return null;
  }

  async regenerateDefaultSchema(): Promise<void> {
    await this.schemaManager.regenerateDefaultSchema();
  }

  async generateIndexFromEngine() {
    await this.ensureWikiStructure();

    const entities = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/entities/`));
    const concepts = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/concepts/`));
    const sources = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/sources/`));

    const totalPages = entities.length + concepts.length + sources.length;

    if (totalPages === 0) {
      const indexPath = `${this.settings.wikiFolder}/index.md`;
      await this.createOrUpdateFile(indexPath, `# Wiki Index\n\n> No pages yet. Ingest sources to populate the Wiki.\n`);
      return;
    }

    await this.generateFlatIndex(entities, concepts, sources);
  }

  private async generateFlatIndex(
    entities: TFile[],
    concepts: TFile[],
    sources: TFile[]
  ): Promise<void> {
    const lang = this.settings.wikiLanguage || 'en';
    type LangKey = keyof typeof TEXTS.en.indexLabels;
    const langKey: LangKey = (lang in TEXTS.en.indexLabels) ? lang as LangKey : 'en';
    const labels = TEXTS.en.indexLabels[langKey];
    let indexContent = `# Wiki Index\n\n`;
    indexContent += `> ${labels.subtitle}\n\n`;

    indexContent += `## ${labels.entities}\n\n`;
    for (const file of entities) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[entities/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    indexContent += `\n## ${labels.concepts}\n\n`;
    for (const file of concepts) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[concepts/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    indexContent += `\n## ${labels.sources}\n\n`;
    for (const file of sources) {
      indexContent += `- [[sources/${file.basename}|${file.basename}]]\n`;
    }

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    await this.createOrUpdateFile(indexPath, indexContent);
  }

  async getPageSummary(file: TFile): Promise<string> {
    const content = await this.app.vault.read(file);
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
    return lines[0]?.substring(0, 100) || 'No summary';
  }

  async updateLog(operation: string, analysis: SourceAnalysis) {
    const logPath = `${this.settings.wikiFolder}/log.md`;
    const date = new Date().toISOString().split('T')[0];
    const lang = this.settings.wikiLanguage || 'en';
    type LogLangKey = keyof typeof TEXTS.en.logLabels;
    const langKey: LogLangKey = (lang in TEXTS.en.logLabels) ? lang as LogLangKey : 'en';
    const labels = TEXTS.en.logLabels[langKey];

    let entry = `\n\n## [${date}] ${operation} | ${analysis.source_title}\n\n`;
    entry += `**${labels.createdPages}**：${analysis.created_pages.map(p => `[[${p.replace(this.settings.wikiFolder + '/', '')}]]`).join(', ')}\n\n`;
    entry += `**${labels.updatedPages}**：${analysis.updated_pages.map(p => `[[${p}]]`).join(', ')}\n\n`;

    if (analysis.contradictions.length > 0) {
      entry += `**${labels.contradictionsFound}**：\n`;
      for (const c of analysis.contradictions) {
        entry += `- ${c.claim} vs ${c.source_page}\n`;
      }
    }

    const existingLog = await this.tryReadFile(logPath) || `# Wiki ${lang === 'zh' ? '操作日志' : 'Operation Log'}\n\n`;
    await this.createOrUpdateFile(logPath, existingLog + entry);
  }

  async ingestConversation(history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  }): Promise<void> {
    if (!this.getLLMClient()) {
      throw new Error('LLM Client not initialized');
    }

    console.debug('=== Starting conversation extraction ===');
    this.onProgress?.('Analyzing conversation...');

    const actualDate = new Date().toISOString().split('T')[0];
    console.debug('[系统时间]', actualDate);

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const existingWikiIndex = await this.tryReadFile(indexPath) || 'Wiki is empty';
    console.debug('[Wiki索引]', existingWikiIndex ? '已读取' : '为空');

    const conversationText = this.formatConversation(history);

    // Dedup pre-check: skip if conversation is fully covered by existing Wiki
    if (existingWikiIndex !== 'Wiki is empty') {
      this.onProgress?.('Checking for existing knowledge...');
      try {
        const dedupResult = await this.checkDedup(existingWikiIndex, conversationText);
        if (dedupResult === 'fully_redundant') {
          console.debug('Conversation fully covered by existing Wiki, skipping save');
          this.onProgress?.('This knowledge already exists in Wiki');
          return;
        }
      } catch (error) {
        console.debug('Dedup check failed, proceeding with save:', error);
      }
    }

    const analysisPrompt = `You are a Wiki knowledge extraction assistant.

Existing Wiki Index (use this as reference for entity/concept names):
${existingWikiIndex}

User conversation with AI:
${conversationText}

Convert this conversation into structured Wiki pages.

Focus on:
1. Extracting key knowledge points (not full conversation log)
2. Identifying core concepts and entities discussed
3. Summarizing conversation topic and conclusions
4. Entity/concept names should match existing Wiki pages if possible

Actual conversation date: ${actualDate} (use this, do not generate date yourself)

Output JSON format:
{
  "source_title": "Semantic Topic Title (no date, describe the discussion topic)",
  "summary": "Conversation topic summary",
  "entities": [
    {
      "name": "Short Reference Name",
      "type": "person|organization|project|other",
      "summary": "Entity information summary",
      "mentions_in_source": ["Specific mentions in conversation"]
    }
  ],
  "concepts": [
    {
      "name": "Concept Name",
      "type": "theory|method|technology|term|other",
      "summary": "Concept definition",
      "mentions_in_source": ["Specific mentions in conversation"],
      "related_concepts": ["Related Concept 1", "Related Concept 2"]
    }
  ],
  "key_points": ["Point 1", "Point 2"],
  "created_pages": [],
  "updated_pages": []
}

CRITICAL RULES:
- source_title: Semantic title describing discussion topic (NOT date-based generic title)
- entity.name: Choose or extract appropriate name from Wiki index (maintain consistency with existing Wiki)
- concept.name: Same principle - reference Wiki index for concept names
- mentions_in_source: REQUIRED field - list actual mentions in conversation text
- If no entities/concepts found, use empty arrays [] (never omit the field)
- Names should be suitable for [[wiki-links]] referencing (judge appropriate naming based on Wiki index)`;

    const analysis = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 5000,
      system: await this.buildSystemPrompt('conversation'),
      messages: [{
        role: 'user',
        content: analysisPrompt
      }],
      response_format: { type: 'json_object' }
    });

    const parsed = await parseJsonResponse(analysis, async (malformedJson: string) => {
      const repairPrompt = `Fix the following malformed JSON. Only fix JSON syntax errors (unescaped quotes, trailing commas, missing brackets). Do NOT change any values or content. Output ONLY the fixed JSON, no other text.\n\n${malformedJson}`;
      return await this.client.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        system: await this.buildSystemPrompt('conversation'),
        messages: [{ role: 'user', content: repairPrompt }],
        response_format: { type: 'json_object' }
      });
    }) as SourceAnalysis | null;
    if (!parsed) {
      throw new Error('Conversation analysis JSON parsing failed');
    }

    console.debug('[LLM分析结果]', parsed);
    console.debug('[生成的标题]', parsed.source_title);

    this.onProgress?.('Creating summary page...');
    await this.ensureWikiStructure();

    const semanticSlug = slugify(parsed.source_title);
    const summaryPath = `${this.settings.wikiFolder}/sources/${semanticSlug}.md`;
    console.debug('[语义化文件路径]', summaryPath);

    const tags = parsed.concepts.map(c => c.name).join(', ');
    const summaryContent = `---
type: source
created: ${actualDate}
source_file: Conversation Extract - ${actualDate}
tags: [${tags}]
---

# ${parsed.source_title}

## Source
- Conversation date: ${actualDate}
- Source type: User query extraction
- Semantic path: [[${summaryPath.replace(this.settings.wikiFolder + '/', '')}]]

## Core Content

${parsed.summary}

## Key Entities

${parsed.entities.map(e => `- [[entities/${slugify(e.name)}|${e.name}]] - ${e.summary}`).join('\n')}

## Key Concepts

${parsed.concepts.map(c => `- [[concepts/${slugify(c.name)}|${c.name}]] - ${c.summary}`).join('\n')}

## Main Points

${parsed.key_points.map((p: string) => `- ${p}`).join('\n')}

---
Updated: ${actualDate}`;

    await this.createOrUpdateFile(summaryPath, summaryContent);
    parsed.created_pages.push(summaryPath);

    // Build planned paths so entity/concept pages can link to each other
    const convPlannedPaths: string[] = [summaryPath];
    for (const entity of parsed.entities) {
      convPlannedPaths.push(`${this.settings.wikiFolder}/entities/${slugify(entity.name)}.md`);
    }
    for (const concept of parsed.concepts) {
      convPlannedPaths.push(`${this.settings.wikiFolder}/concepts/${slugify(concept.name)}.md`);
    }

    for (const entity of parsed.entities) {
      await this.apiDelay();
      this.onProgress?.(`Saving entity: ${entity.name}`);
      try {
        const entityPage = await this.createOrUpdateEntityPage(entity, parsed, { path: summaryPath, basename: semanticSlug }, convPlannedPaths);
        if (entityPage) {
          parsed.created_pages.push(entityPage);
        }
      } catch (error) {
        console.error(`Conversation entity "${entity.name}" failed:`, error);
      }
    }

    for (const concept of parsed.concepts) {
      await this.apiDelay();
      this.onProgress?.(`Saving concept: ${concept.name}`);
      try {
        const conceptPage = await this.createOrUpdateConceptPage(concept, parsed, { path: summaryPath, basename: semanticSlug }, convPlannedPaths);
        if (conceptPage) {
          parsed.created_pages.push(conceptPage);
        }
      } catch (error) {
        console.error(`Conversation concept "${concept.name}" failed:`, error);
      }
    }

    this.onProgress?.('Generating index...');
    await this.generateIndexFromEngine();
    parsed.contradictions = parsed.contradictions || [];
    await this.updateLog('conversation', parsed);

    console.debug('=== Conversation extraction complete ===');
    console.debug('Created pages:', parsed.created_pages);
  }

  formatConversation(history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  }): string {
    return history.messages.map(msg => {
      const role = msg.role === 'user' ? '👤 User' : '🤖 Wiki';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      return `### ${role} (${time})\n\n${msg.content}\n\n---\n`;
    }).join('\n');
  }

  private async checkDedup(wikiIndex: string, conversationText: string): Promise<string> {
    const summary = conversationText.substring(0, 1500);
    const prompt = PROMPTS.dedupCheck
      .replace('{{wiki_index}}', wikiIndex.substring(0, 3000))
      .replace('{{conversation_summary}}', summary);

    const response = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 200,
      system: await this.buildSystemPrompt('conversation'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const parsed = await parseJsonResponse(response) as { status?: string } | null;
    return parsed?.status || 'entirely_new';
  }
}