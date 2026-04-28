// Wiki Engine - Core Wiki ingestion and management logic

import { App, TFile } from 'obsidian';
import {
  LLMWikiSettings,
  LLMClient,
  SourceAnalysis,
  EntityInfo,
  ConceptInfo,
  ContradictionInfo,
  IngestReport
} from './types';
import { PROMPTS } from './prompts';
import { slugify, parseJsonResponse, cleanMarkdownResponse } from './utils';
import { SchemaManager } from './schema-manager';

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

  private get client(): LLMClient {
    const c = this.getLLMClient();
    if (!c) throw new Error('LLM Client not initialized');
    return c;
  }

  async ingestSource(file: TFile) {
    console.debug('=== 开始摄入流程 ===');
    console.debug('源文件:', file.path);
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

      // Summary
      this.onProgress?.(`[${step}/${totalSteps}] Creating summary...`);
      await this.apiDelay();
      const summaryPage = await this.createSummaryPage(file, analysis);
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
      const _failed = failedItems.length;

      console.debug('=== 摄入流程完成 ===');
      console.debug(`摄入完成: 创建 ${created} 页, 更新 ${updated} 页`);

      this.onDone?.({
        sourceFile: file.path,
        createdPages: analysis.created_pages,
        updatedPages: analysis.updated_pages,
        failedItems,
        contradictionsFound: analysis.contradictions.length,
        success: true
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
        errorMessage: errorMsg
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
    const existingPagesList = existingPages.map(p => `- [[${p.title}]]`).join('\n');
    console.debug('现有 Wiki 页面数量:', existingPages.length);

    const prompt = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', existingPagesList);

    console.debug('Prompt 长度:', prompt.length);
    console.debug('调用 LLM 分析源文件...');

    try {
      const schemaContext = await this.schemaManager.getSchemaContext('analyze');
      const response = await this.client.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        system: schemaContext || undefined,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      console.debug('LLM 响应长度:', response.length);

      const analysisData = await parseJsonResponse(response, async (malformedJson: string) => {
        const repairPrompt = `Fix the following malformed JSON. Only fix JSON syntax errors (unescaped quotes, trailing commas, missing brackets). Do NOT change any values or content. Output ONLY the fixed JSON, no other text.\n\n${malformedJson}`;
        return await this.client.createMessage({
          model: this.settings.model,
          max_tokens: 4000,
          messages: [{ role: 'user', content: repairPrompt }],
          response_format: { type: 'json_object' }
        });
      }) as SourceAnalysis | null;

      if (!analysisData) {
        console.error('❌ JSON 解析失败，返回 null');
        return null;
      }

      console.debug('✅ JSON 解析成功');

      const requiredFields: (keyof SourceAnalysis)[] = ['source_title', 'summary', 'entities', 'concepts'];
      const missingFields = requiredFields.filter(field => !analysisData[field]);

      if (missingFields.length > 0) {
        console.error('❌ 缺少必要字段:', missingFields);
        return null;
      }

      console.debug('✅ 所有必要字段存在');

      const analysis: SourceAnalysis = {
        ...analysisData,
        source_file: file.path,
        created_pages: [],
        updated_pages: []
      };

      console.debug('分析完成:');
      console.debug('  - 实体数量:', analysis.entities.length);
      console.debug('  - 概念数量:', analysis.concepts.length);
      console.debug('  - 相关页面:', analysis.related_pages?.length || 0);

      return analysis;

    } catch (error) {
      console.error('❌ analyzeSource 异常:', error);
      return null;
    }
  }

  getExistingWikiPages(): {path: string, title: string}[] {
    const wikiFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(this.settings.wikiFolder) &&
                   !f.path.includes('index.md') &&
                   !f.path.includes('log.md'));

    return wikiFiles.map(f => ({
      path: f.path,
      title: f.basename
    }));
  }

  async createSummaryPage(file: TFile, analysis: SourceAnalysis): Promise<string> {
    const slug = slugify(file.basename);
    const path = `${this.settings.wikiFolder}/sources/${slug}.md`;
    const content = await this.app.vault.read(file);

    const prompt = PROMPTS.generateSummaryPage
      .replace('{{source_title}}', analysis.source_title)
      .replace('{{content}}', content.substring(0, 500))
      .replace('{{analysis}}', JSON.stringify(analysis))
      .replace(/{{source_file}}/g, file.path)
      .replace(/{{date}}/g, new Date().toISOString().split('T')[0])
      .replace('{{tags}}', analysis.concepts.map(c => c.name).join(', '));

    const schemaContext = await this.schemaManager.getSchemaContext('summary');
    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      system: schemaContext || undefined,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async createOrUpdateEntityPage(entity: EntityInfo, _analysis: SourceAnalysis, sourceFile: TFile | { path: string; basename: string }): Promise<string | null> {
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

    const prompt = PROMPTS.generateEntityPage
      .replace('{{entity_name}}', entity.name)
      .replace('{{entity_type}}', entity.type)
      .replace('{{entity_summary}}', entity.summary)
      .replace('{{mentions}}', entity.mentions_in_source?.join('\n') || '无具体提及')
      .replace('{{related_content}}', existingContent || '暂无相关内容')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path)
      .replace('{{tags}}', entity.type);

    const schemaContext = await this.schemaManager.getSchemaContext('entity');
    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      system: schemaContext || undefined,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async createOrUpdateConceptPage(concept: ConceptInfo, _analysis: SourceAnalysis, sourceFile: TFile | { path: string; basename: string }): Promise<string | null> {
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

    const prompt = PROMPTS.generateConceptPage
      .replace('{{concept_name}}', concept.name)
      .replace('{{concept_type}}', concept.type)
      .replace('{{concept_summary}}', concept.summary)
      .replace('{{mentions}}', concept.mentions_in_source?.join('\n') || '无具体提及')
      .replace('{{related_concepts}}', concept.related_concepts?.join(', ') || '无相关概念')
      .replace('{{related_content}}', existingContent || '暂无相关内容')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path)
      .replace('{{tags}}', concept.type);

    const schemaContext = await this.schemaManager.getSchemaContext('concept');
    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      system: schemaContext || undefined,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
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

    const prompt = `现有 Wiki 页面：${pageName}

现有内容：
${existingContent}

新源文件提供了关于 ${pageName} 的新信息：
${JSON.stringify(analysis.entities.find(e => e.name === pageName) || analysis.concepts.find(c => c.name === pageName) || '无直接相关信息')}

请更新该页面，添加新信息，但不要删除现有内容。使用双向链接语法 [[页面名]]。
只输出更新后的完整页面内容，不要其他文字。`;

    const schemaContext = await this.schemaManager.getSchemaContext('related');
    const updatedContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      system: schemaContext || undefined,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(updatedContent);
    await this.createOrUpdateFile(page.path, cleanedContent);
  }

  async noteContradiction(contradiction: ContradictionInfo) {
    const pagePath = contradiction.source_page.replace(/\[\[(.+)\]\]/, `${this.settings.wikiFolder}/$1.md`);

    const existingContent = await this.tryReadFile(pagePath);
    if (!existingContent) {
      return;
    }

    const contradictionNote = `\n\n## ⚠️ 潜在矛盾\n\n**来源**：${contradiction.claim}\n\n**现有观点**：${contradiction.contradicted_by}\n\n**解决建议**：${contradiction.resolution}\n\n---\n*标记日期：${new Date().toISOString().split('T')[0]}*`;

    await this.createOrUpdateFile(pagePath, existingContent + contradictionNote);
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

    // Build page list with summaries
    const pageEntries: string[] = [];
    for (const file of [...entities, ...concepts, ...sources]) {
      const summary = await this.getPageSummary(file);
      const pageType = file.path.includes('/entities/') ? 'Entity' :
                       file.path.includes('/concepts/') ? 'Concept' : 'Source';
      pageEntries.push(`- [${pageType}] ${file.basename}: ${summary} (path: ${file.path})`);
    }

    if (pageEntries.length === 0) {
      const indexPath = `${this.settings.wikiFolder}/index.md`;
      await this.createOrUpdateFile(indexPath, `# Wiki Index\n\n> No pages yet. Ingest sources to populate the Wiki.\n`);
      return;
    }

    // For large wikis, skip the LLM and use the fast flat index.
    // The LLM call with a very long prompt is prone to timeouts and the
    // result is not materially better for directories with many pages.
    if (pageEntries.length > 25) {
      console.debug(`Wiki has ${pageEntries.length} pages, using flat index (bypassing LLM)`);
      await this.generateFlatIndex(entities, concepts, sources);
      return;
    }

    const wikiStructure = this.settings.enableSchema
      ? await this.schemaManager.getSchemaContext('index')
      : '';

    const prompt = PROMPTS.generateHierarchicalIndex
      .replace('{{page_list}}', pageEntries.join('\n'))
      .replace('{{wiki_structure}}', wikiStructure || 'Standard Wiki structure (entities/, concepts/, sources/)');

    try {
      const indexContent = await this.client.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        system: wikiStructure || undefined,
        messages: [{ role: 'user', content: prompt }]
      });

      const cleaned = cleanMarkdownResponse(indexContent);
      const indexPath = `${this.settings.wikiFolder}/index.md`;
      await this.createOrUpdateFile(indexPath, cleaned);
    } catch (err) {
      console.warn('LLM index generation failed, using flat index:', err instanceof Error ? err.message : String(err));
      await this.generateFlatIndex(entities, concepts, sources);
    }
  }

  private async generateFlatIndex(
    entities: TFile[],
    concepts: TFile[],
    sources: TFile[]
  ): Promise<void> {
    let indexContent = `# Wiki Index\n\n`;
    indexContent += `> Auto-generated knowledge base directory\n\n`;

    indexContent += `## Entities\n\n`;
    for (const file of entities) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[entities/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    indexContent += `\n## Concepts\n\n`;
    for (const file of concepts) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[concepts/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    indexContent += `\n## Sources\n\n`;
    for (const file of sources) {
      indexContent += `- [[sources/${file.basename}|${file.basename}]]\n`;
    }

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    await this.createOrUpdateFile(indexPath, indexContent);
  }

  async getPageSummary(file: TFile): Promise<string> {
    const content = await this.app.vault.read(file);
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
    return lines[0]?.substring(0, 100) || '暂无摘要';
  }

  async updateLog(operation: string, analysis: SourceAnalysis) {
    const logPath = `${this.settings.wikiFolder}/log.md`;
    const date = new Date().toISOString().split('T')[0];

    let entry = `\n\n## [${date}] ${operation} | ${analysis.source_title}\n\n`;
    entry += `**创建页面**：${analysis.created_pages.map(p => `[[${p.replace(this.settings.wikiFolder + '/', '')}]]`).join(', ')}\n\n`;
    entry += `**更新页面**：${analysis.updated_pages.map(p => `[[${p}]]`).join(', ')}\n\n`;

    if (analysis.contradictions.length > 0) {
      entry += `**发现矛盾**：\n`;
      for (const c of analysis.contradictions) {
        entry += `- ${c.claim} vs ${c.source_page}\n`;
      }
    }

    const existingLog = await this.tryReadFile(logPath) || `# Wiki 操作日志\n\n`;
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

    const actualDate = new Date().toISOString().split('T')[0];
    console.debug('[系统时间]', actualDate);

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const existingWikiIndex = await this.tryReadFile(indexPath) || 'Wiki is empty';
    console.debug('[Wiki索引]', existingWikiIndex ? '已读取' : '为空');

    const conversationText = this.formatConversation(history);

    const analysisPrompt = this.settings.language === 'en'
      ? `You are a Wiki knowledge extraction assistant.

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
- Names should be suitable for [[wiki-links]] referencing (judge appropriate naming based on Wiki index)`
      : `你是Wiki知识提取助手。

现有Wiki索引（作为实体/概念名称参考）：
${existingWikiIndex}

用户与AI的对话：
${conversationText}

将此对话转化为结构化Wiki页面。

重点：
1. 提取关键知识点（非完整对话日志）
2. 识别讨论的核心概念和实体
3. 总结对话主题和结论
4. 实体/概念名称应尽量匹配现有Wiki页面

实际对话日期：${actualDate}（请使用此日期，不要自己生成）

输出JSON格式：
{
  "source_title": "语义化主题标题（不含日期，描述讨论主题）",
  "summary": "对话主题总结",
  "entities": [
    {
      "name": "简短引用名称",
      "type": "person|organization|project|other",
      "summary": "实体信息总结",
      "mentions_in_source": ["在对话中的具体提及"]
    }
  ],
  "concepts": [
    {
      "name": "概念名称",
      "type": "theory|method|technology|term|other",
      "summary": "概念定义",
      "mentions_in_source": ["在对话中的具体提及"],
      "related_concepts": ["相关概念1", "相关概念2"]
    }
  ],
  "key_points": ["要点1", "要点2"],
  "created_pages": [],
  "updated_pages": []
}

关键规则：
- source_title：语义化标题，描述讨论主题（不要用日期作为标题）
- entity.name：从Wiki索引中选择或提取合适名称（与现有Wiki保持一致，便于双向链接引用）
- concept.name：同理，参考Wiki索引中的概念名称
- mentions_in_source：必填字段 - 列出在对话中的具体提及内容
- 如果没有实体/概念，用空数组[]（绝不能省略字段）
- 名称应简短且便于[[wiki-links]]引用（根据Wiki索引判断合适的命名方式）`;

    const schemaContext = await this.schemaManager.getSchemaContext('conversation');
    const analysis = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 5000,
      system: schemaContext || undefined,
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
        messages: [{ role: 'user', content: repairPrompt }],
        response_format: { type: 'json_object' }
      });
    }) as SourceAnalysis | null;
    if (!parsed) {
      throw new Error('Conversation analysis JSON parsing failed');
    }

    console.debug('[LLM分析结果]', parsed);
    console.debug('[生成的标题]', parsed.source_title);

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

## 来源
- 对话日期：${actualDate}
- 来源类型：用户查询提炼
- 语义路径：[[${summaryPath.replace(this.settings.wikiFolder + '/', '')}]]

## 核心内容

${parsed.summary}

## 关键实体

${parsed.entities.map(e => `- [[entities/${slugify(e.name)}|${e.name}]] - ${e.summary}`).join('\n')}

## 关键概念

${parsed.concepts.map(c => `- [[concepts/${slugify(c.name)}|${c.name}]] - ${c.summary}`).join('\n')}

## 主要观点

${parsed.key_points.map((p: string) => `- ${p}`).join('\n')}

---
更新日期：${actualDate}`;

    await this.createOrUpdateFile(summaryPath, summaryContent);
    parsed.created_pages.push(summaryPath);

    for (const entity of parsed.entities) {
      await this.apiDelay();
      try {
        const entityPage = await this.createOrUpdateEntityPage(entity, parsed, { path: summaryPath, basename: semanticSlug });
        if (entityPage) {
          parsed.created_pages.push(entityPage);
        }
      } catch (error) {
        console.error(`Conversation entity "${entity.name}" failed:`, error);
      }
    }

    for (const concept of parsed.concepts) {
      await this.apiDelay();
      try {
        const conceptPage = await this.createOrUpdateConceptPage(concept, parsed, { path: summaryPath, basename: semanticSlug });
        if (conceptPage) {
          parsed.created_pages.push(conceptPage);
        }
      } catch (error) {
        console.error(`Conversation concept "${concept.name}" failed:`, error);
      }
    }

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
}