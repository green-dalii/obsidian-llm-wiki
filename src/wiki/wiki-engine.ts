// Wiki Engine — Core Wiki ingestion and management logic.
// Orchestrates sub-modules: SourceAnalyzer, PageFactory, ConversationIngestor,
// LintFixer, ContradictionManager, and system-prompts.

import { App, TFile, TFolder } from 'obsidian';
import {
  LLMWikiSettings,
  LLMClient,
  SourceAnalysis,
  ContradictionInfo,
  IngestReport,
  EngineContext,
} from '../types';
import { PROMPTS } from '../prompts';
import { TEXTS } from '../texts';
import {
  slugify,
  cleanMarkdownResponse,
} from '../utils';
import { SchemaManager, SchemaTask } from '../schema/schema-manager';
import {
  buildSystemPrompt,
  getSectionLabels,
  applySectionLabels,
} from './system-prompts';
import {
  LintFixer,
  getExistingWikiPages,
} from './lint-fixes';
import { ContradictionManager } from './contradictions';
import { SourceAnalyzer } from './source-analyzer';
import { PageFactory } from './page-factory';
import { ConversationIngestor, ConversationOrchestration, formatConversation, ConversationHistory } from './conversation-ingest';

export class WikiEngine {
  private app: App;
  settings: LLMWikiSettings;
  private llmClient: LLMClient | null;
  private getLLMClient: () => LLMClient | null;
  private schemaManager: SchemaManager;
  private onFileWrite: ((path: string) => void) | null;
  private onProgress: ((message: string) => void) | null;
  private onDone: ((report: IngestReport) => void) | null;
  private lintFixer: LintFixer;
  private contradictionManager: ContradictionManager;
  private sourceAnalyzer: SourceAnalyzer;
  private pageFactory: PageFactory;
  private conversationIngestor: ConversationIngestor;

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

    const ctx: EngineContext = {
      app: this.app,
      settings: this.settings,
      getClient: () => this.getLLMClient(),
      createOrUpdateFile: (p, c) => this.createOrUpdateFile(p, c),
      tryReadFile: p => this.tryReadFile(p),
      buildSystemPrompt: task =>
        buildSystemPrompt(this.settings, t => this.schemaManager.getSchemaContext(t as SchemaTask), task),
      getSectionLabels: () => getSectionLabels(this.settings),
      getExistingWikiPages: () =>
        getExistingWikiPages(this.app, this.settings.wikiFolder),
      getSchemaContext: t => this.schemaManager.getSchemaContext(t as SchemaTask),
      onFileWrite: path => this.onFileWrite?.(path),
      onProgress: msg => this.onProgress?.(msg),
      onDone: report => this.onDone?.(report),
    };

    this.lintFixer = new LintFixer(ctx);
    this.contradictionManager = new ContradictionManager(ctx);
    this.sourceAnalyzer = new SourceAnalyzer(ctx);
    this.pageFactory = new PageFactory(ctx);

    const orch: ConversationOrchestration = {
      ensureWikiStructure: () => this.ensureWikiStructure(),
      apiDelay: ms => this.apiDelay(ms),
      generateIndex: () => this.generateIndexFromEngine(),
      updateLog: (op, analysis) => this.updateLog(op, analysis),
    };
    this.conversationIngestor = new ConversationIngestor(ctx, this.pageFactory, orch);
  }

  setFileWriteCallback(cb: (path: string) => void): void {
    this.onFileWrite = cb;
  }

  setProgressCallback(cb: ((message: string) => void) | null): void {
    this.onProgress = cb;
  }

  getProgressCallback(): ((message: string) => void) | null {
    return this.onProgress;
  }

  setDoneCallback(cb: ((report: IngestReport) => void) | null): void {
    this.onDone = cb;
  }

  private get client(): LLMClient {
    const c = this.getLLMClient();
    if (!c) throw new Error('LLM Client not initialized');
    return c;
  }

  private async buildSystemPrompt(task: SchemaTask): Promise<string | undefined> {
    return buildSystemPrompt(this.settings, t => this.schemaManager.getSchemaContext(t as SchemaTask), task);
  }

  private applySectionLabels(prompt: string): string {
    return applySectionLabels(prompt, this.settings);
  }

  async ingestSource(file: TFile) {
    console.debug('=== 开始摄入流程 ===');
    console.debug('源文件:', file.path);
    const totalStartTime = Date.now();

    this.onProgress?.(`Analyzing: ${file.basename}`);

    const failedItems: Array<{ type: 'entity' | 'concept'; name: string; reason: string }> = [];
    let analysis: SourceAnalysis | null = null;

    try {
      await this.ensureWikiStructure();

      // Stage 1: Source Analysis
      const analysisStart = Date.now();
      analysis = await this.sourceAnalyzer.analyzeSource(file);
      if (!analysis) {
        throw new Error(`Source analysis failed for "${file.basename}". Check the developer console (Ctrl+Shift+I) for network or API errors. If you see SSL/network errors, verify your provider URL and network connection.`);
      }
      const analysisTime = Date.now() - analysisStart;
      console.debug(`[耗时] 源文件分析阶段: ${analysisTime}ms`);
      console.debug('分析结果:', JSON.stringify(analysis, null, 2));

      const totalSteps = 1 + analysis.entities.length + analysis.concepts.length + analysis.related_pages.length + 2;
      let step = 1;

      const plannedPaths: string[] = [];
      for (const entity of analysis.entities) {
        plannedPaths.push(`${this.settings.wikiFolder}/entities/${slugify(entity.name)}.md`);
      }
      for (const concept of analysis.concepts) {
        plannedPaths.push(`${this.settings.wikiFolder}/concepts/${slugify(concept.name)}.md`);
      }

      this.onProgress?.(`[${step}/${totalSteps}] Creating summary...`);
      await this.apiDelay();

      // Stage 2: Summary Page Generation
      const summaryStart = Date.now();
      const summaryPage = await this.createSummaryPage(file, analysis, plannedPaths);
      const summaryTime = Date.now() - summaryStart;
      console.debug(`[耗时] 摘要页生成: ${summaryTime}ms`);
      analysis.created_pages.push(summaryPage);

      // Stage 3: Entity/Concept Page Generation
      const pageGenStart = Date.now();
      let pageGenCount = 0;

      // Phase 2: Parallel page generation with concurrency control
      const concurrency = this.settings.pageGenerationConcurrency ?? 1;
      const batchDelay = this.settings.batchDelayMs ?? 300;

      // Log parallel mode info
      if (concurrency > 1) {
        console.debug(`[并行模式] 并发度: ${concurrency}, 批次间延迟: ${batchDelay}ms, 总任务: ${analysis.entities.length + analysis.concepts.length}`);
      } else {
        console.debug(`[串行模式] 逐一生成页面, 总任务: ${analysis.entities.length + analysis.concepts.length}`);
      }

      // Prepare all page generation tasks
      type PageGenTask = {
        type: 'entity' | 'concept';
        name: string;
        index: number;
      };

      const tasks: PageGenTask[] = [
        ...analysis.entities.map((e, i) => ({ type: 'entity' as const, name: e.name, index: i })),
        ...analysis.concepts.map((c, i) => ({ type: 'concept' as const, name: c.name, index: i }))
      ];

      // Process in batches based on concurrency setting
      for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);

        // Execute batch with Promise.allSettled for error isolation
        const batchResults = await Promise.allSettled(
          batch.map(async (task) => {
            step++;
            this.onProgress?.(`[${step}/${totalSteps}] ${task.type === 'entity' ? 'Entity' : 'Concept'}: ${task.name}`);

            if (task.type === 'entity') {
              const entity = analysis!.entities[task.index];
              try {
                const entityPage = await this.pageFactory.createOrUpdateEntityPage(entity, analysis!, file);
                if (entityPage) {
                  analysis!.created_pages.push(entityPage);
                }
                return { success: true as const, name: entity.name, type: 'entity' as const };
              } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                console.error(`Entity "${entity.name}" failed:`, reason);
                failedItems.push({ type: 'entity', name: entity.name, reason });

                // Retry once
                try {
                  await this.apiDelay(2000);
                  const retryPage = await this.pageFactory.createOrUpdateEntityPage(entity, analysis!, file);
                  if (retryPage) {
                    analysis!.created_pages.push(retryPage);
                    console.debug(`Entity "${entity.name}" recovered on retry`);
                    failedItems.pop();
                  }
                } catch {
                  console.error(`Entity "${entity.name}" retry also failed`);
                }
                return { success: false as const, name: entity.name, type: 'entity' as const, reason };
              }
            } else {
              const concept = analysis!.concepts[task.index];
              try {
                const conceptPage = await this.pageFactory.createOrUpdateConceptPage(concept, analysis!, file);
                if (conceptPage) {
                  analysis!.created_pages.push(conceptPage);
                }
                return { success: true as const, name: concept.name, type: 'concept' as const };
              } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                console.error(`Concept "${concept.name}" failed:`, reason);
                failedItems.push({ type: 'concept', name: concept.name, reason });

                // Retry once
                try {
                  await this.apiDelay(2000);
                  const retryPage = await this.pageFactory.createOrUpdateConceptPage(concept, analysis!, file);
                  if (retryPage) {
                    analysis!.created_pages.push(retryPage);
                    console.debug(`Concept "${concept.name}" recovered on retry`);
                    failedItems.pop();
                  }
                } catch {
                  console.error(`Concept "${concept.name}" retry also failed`);
                }
                return { success: false as const, name: concept.name, type: 'concept' as const, reason };
              }
            }
          })
        );

        // Log batch summary
        pageGenCount += batch.length;
        const batchNum = Math.floor(i / concurrency) + 1;
        const totalBatches = Math.ceil(tasks.length / concurrency);
        const succeeded = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const mode = concurrency > 1 ? '并行' : '串行';
        const batchTime = Date.now() - pageGenStart;
        console.debug(`[${mode}批次 ${batchNum}/${totalBatches}] ${succeeded}/${batch.length} 页面成功 (并发度: ${concurrency}, 累计耗时: ${batchTime}ms)`);

        // API rate limit protection: delay between batches if there are more tasks
        if (i + concurrency < tasks.length) {
          await this.apiDelay(batchDelay);
        }
      }
      const pageGenTime = Date.now() - pageGenStart;
      console.debug(`[耗时] 页面生成阶段完成: ${pageGenTime}ms (平均 ${Math.round(pageGenTime / pageGenCount)}ms/页)`);

      // Stage 4: Related Pages Update (并行化改造)
      const relatedStart = Date.now();
      const relatedConcurrency = this.settings.pageGenerationConcurrency ?? 1;
      const relatedDelay = this.settings.batchDelayMs ?? 300;

      // 准备任务列表
      const relatedTasks = analysis.related_pages.map((name, idx) => ({
        name,
        index: idx,
        stepNum: step + idx + 1  // 计算每个任务的步骤编号
      }));

      let relatedCount = 0;
      const relatedTotal = relatedTasks.length;

      // 分批并行处理
      for (let i = 0; i < relatedTasks.length; i += relatedConcurrency) {
        const batch = relatedTasks.slice(i, i + relatedConcurrency);

        // 执行批次并行更新
        const batchResults = await Promise.allSettled(
          batch.map(async (task) => {
            this.onProgress?.(`[${task.stepNum}/${totalSteps}] Updating: ${task.name}`);

            try {
              await this.pageFactory.updateRelatedPage(task.name, analysis!, file);
              return { success: true as const, name: task.name };
            } catch (error) {
              const reason = error instanceof Error ? error.message : String(error);
              console.error(`Related page "${task.name}" update failed:`, reason);

              // 重试机制（与页面生成一致）
              try {
                await this.apiDelay(2000);
                await this.pageFactory.updateRelatedPage(task.name, analysis!, file);
                console.debug(`Related page "${task.name}" recovered on retry`);
                return { success: true as const, name: task.name };
              } catch (_retryError) {
                console.error(`Related page "${task.name}" retry also failed`);
                return { success: false as const, name: task.name, reason };
              }
            }
          })
        );

        // 收集成功结果
        batchResults.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.value.success) {
            analysis!.updated_pages.push(batch[idx].name);
            relatedCount++;
          }
        });

        // 批次间延迟（除最后一批）
        if (i + relatedConcurrency < relatedTasks.length) {
          await this.apiDelay(relatedDelay);
        }
      }

      const relatedTime = Date.now() - relatedStart;
      const relatedModeLabel = relatedConcurrency > 1 ? `并行(并发度:${relatedConcurrency})` : '串行';
      console.debug(`[耗时] 相关页更新阶段完成: ${relatedTime}ms (${relatedModeLabel}, ${relatedCount}/${relatedTotal} 页成功)`);
      step += relatedTotal;  // 更新step变量，确保后续阶段编号正确

      // Stage 5: Contradiction Recording
      const contradictionStart = Date.now();
      for (const contradiction of analysis.contradictions) {
        try {
          await this.noteContradiction(contradiction);
        } catch {
          // non-critical
        }
      }
      const contradictionTime = Date.now() - contradictionStart;
      console.debug(`[耗时] 矛盾记录阶段: ${contradictionTime}ms (${analysis.contradictions.length} 个)`);

      // Stage 6: Index & Log Update
      const indexStart = Date.now();
      step++;
      this.onProgress?.(`[${step}/${totalSteps}] Generating index...`);
      await this.generateIndexFromEngine();
      await this.updateLog('ingest', analysis);
      const indexTime = Date.now() - indexStart;
      console.debug(`[耗时] 索引与日志更新: ${indexTime}ms`);

      const created = analysis.created_pages.length;
      const updated = analysis.updated_pages.length;
      const entitiesCreated = analysis.created_pages.filter(p => p.includes('/entities/')).length;
      const conceptsCreated = analysis.created_pages.filter(p => p.includes('/concepts/')).length;
      const modeLabel = (this.settings.pageGenerationConcurrency ?? 1) > 1 ? `并行(并发度:${this.settings.pageGenerationConcurrency})` : '串行';
      const totalTime = Date.now() - totalStartTime;

      console.debug('=== 摄入流程完成 ===');
      console.debug(`摄入完成 [${modeLabel}]: 创建 ${created} 页 (${entitiesCreated} 实体 + ${conceptsCreated} 概念), 更新 ${updated} 页`);
      console.debug(`[总耗时] ${totalTime}ms (${Math.round(totalTime/1000)}秒)`);
      console.debug('[阶段耗时分解]:');
      console.debug(`  - 源文件分析: ${analysisTime}ms`);
      console.debug(`  - 摘要页生成: ${summaryTime}ms`);
      console.debug(`  - 页面生成(${concurrency}并发): ${pageGenTime}ms`);
      console.debug(`  - 相关页更新: ${relatedTime}ms`);
      console.debug(`  - 矛盾记录: ${contradictionTime}ms`);
      console.debug(`  - 索引与日志: ${indexTime}ms`);

      this.onDone?.({
        sourceFile: file.path,
        createdPages: analysis.created_pages,
        updatedPages: analysis.updated_pages,
        entitiesCreated,
        conceptsCreated,
        failedItems,
        contradictionsFound: analysis.contradictions.length,
        success: true,
        elapsedSeconds: Math.round(totalTime / 1000)
      });

    } catch (error) {
      console.error('=== 摄入流程失败 ===');
      console.error('错误:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      const createdPages = analysis?.created_pages || [];
      this.onDone?.({
        sourceFile: file.path,
        createdPages,
        updatedPages: analysis?.updated_pages || [],
        entitiesCreated: createdPages.filter(p => p.includes('/entities/')).length,
        conceptsCreated: createdPages.filter(p => p.includes('/concepts/')).length,
        failedItems,
        contradictionsFound: analysis?.contradictions?.length || 0,
        success: false,
        errorMessage: errorMsg,
        elapsedSeconds: Math.round((Date.now() - totalStartTime) / 1000)
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

    await this.schemaManager.ensureSchemaExists();
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

    const finalPrompt = this.applySectionLabels(prompt);

    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 8000,
      system: await this.buildSystemPrompt('summary'),
      messages: [{ role: 'user', content: finalPrompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
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
          // macOS Unicode normalization: getAbstractFileByPath returned null
          // but vault.create detected the file (NFC vs NFD mismatch).
          // Fall back to parent-directory listing to resolve the actual TFile.
          let resolved = this.resolveFileInVault(path);
          if (!resolved) {
            const normalized = path.normalize();
            const allFiles = this.app.vault.getMarkdownFiles();
            resolved = allFiles.find(f => f.path.normalize() === normalized) || null;
            if (resolved) console.debug('重试中通过全量扫描找到文件:', path);
          }
          if (resolved) {
            await this.app.vault.modify(resolved, content);
            console.debug('通过文件解析后更新成功:', path);
            this.onFileWrite?.(path);
            return;
          }
          console.debug('文件已存在异常，等待100ms后重试:', path);
          await new Promise(resolve => activeWindow.setTimeout(resolve, 100));
          continue;
        } else {
          console.error('无法处理的错误:', path, error);
          throw error;
        }
      }
    }

    // Final fallback: try directory listing + full markdown scan
    console.debug('3次尝试后，通过目录列表查找文件:', path);
    let file = this.resolveFileInVault(path);
    if (!file) {
      // Belt-and-suspenders: scan getMarkdownFiles() (same source of truth as lint)
      const normalized = path.normalize();
      const allFiles = this.app.vault.getMarkdownFiles();
      file = allFiles.find(f => f.path.normalize() === normalized) || null;
      if (file) console.debug('createOrUpdateFile: resolved via full scan:', path);
    }
    if (file) {
      await this.app.vault.modify(file, content);
      console.debug('最终更新成功:', path);
      this.onFileWrite?.(path);
    } else {
      throw new Error(`无法创建或更新文件: ${path}`);
    }
  }

  /** Resolve a vault path to TFile by listing parent directory children.
   *  macOS APFS stores filenames in NFD; JavaScript strings are NFC.
   *  When getAbstractFileByPath can't find a file that vault.create
   *  detected as existing, this fallback resolves the mismatch.
   *  Uses Unicode normalization so Chinese filenames compare correctly. */
  private resolveFileInVault(path: string): TFile | null {
    const lastSep = path.lastIndexOf('/');
    if (lastSep === -1) return null;
    const dirPath = path.substring(0, lastSep);
    const baseName = path.substring(lastSep + 1).normalize();

    const dir = this.app.vault.getAbstractFileByPath(dirPath);
    if (dir && dir instanceof TFolder) {
      for (const child of dir.children) {
        if (child instanceof TFile && child.name.normalize() === baseName) {
          return child;
        }
      }
    }
    return null;
  }

  async tryReadFile(path: string): Promise<string | null> {
    // Resolve the file using all available strategies.
    // On macOS APFS, filenames are stored in NFD while JavaScript uses NFC,
    // so getAbstractFileByPath may miss files with non-ASCII names.
    let file: TFile | null = null;

    try {
      const direct = this.app.vault.getAbstractFileByPath(path);
      if (direct instanceof TFile) file = direct;
    } catch {
      // getAbstractFileByPath can throw on malformed paths; ignore and try fallbacks
    }

    if (!file) {
      file = this.resolveFileInVault(path);
    }

    if (!file) {
      const normalized = path.normalize();
      const allFiles = this.app.vault.getMarkdownFiles();
      const matched = allFiles.find(f => f.path.normalize() === normalized);
      if (matched) {
        console.debug('tryReadFile: resolved via full scan:', path);
        file = matched;
      }
    }

    if (!file) {
      console.debug('tryReadFile: all lookups failed for:', path);
      return null;
    }

    // vault.read() exceptions are NOT caught — a file that exists but can't
    // be read is a real error, not a "file not found" condition.
    return await this.app.vault.read(file);
  }

  async regenerateDefaultSchema(): Promise<void> {
    await this.schemaManager.regenerateDefaultSchema();
  }

  // ---- Lint-fix delegation ----

  getExistingWikiPages(): {path: string, title: string, wikiLink: string}[] {
    return getExistingWikiPages(this.app, this.settings.wikiFolder);
  }

  async fixDeadLink(sourcePath: string, targetName: string): Promise<string> {
    return this.lintFixer.fixDeadLink(sourcePath, targetName);
  }

  async fillEmptyPage(pagePath: string, existingContent?: string): Promise<string> {
    return this.lintFixer.fillEmptyPage(pagePath, existingContent);
  }

  async linkOrphanPage(orphanPath: string): Promise<string[]> {
    return this.lintFixer.linkOrphanPage(orphanPath);
  }

  // ---- Contradiction delegation ----

  async noteContradiction(contradiction: ContradictionInfo) {
    return this.contradictionManager.noteContradiction(contradiction);
  }

  async getOpenContradictions(): Promise<Array<{ path: string; status: string; claim: string; sourcePage: string }>> {
    return this.contradictionManager.getOpenContradictions();
  }

  async updateContradictionStatus(filePath: string, newStatus: string): Promise<void> {
    return this.contradictionManager.updateContradictionStatus(filePath, newStatus);
  }

  async resolveContradiction(contradictionPath: string): Promise<void> {
    return this.contradictionManager.resolveContradiction(contradictionPath);
  }

  // ---- Conversation ingestion delegation ----

  async ingestConversation(history: ConversationHistory): Promise<IngestReport> {
    return this.conversationIngestor.ingestConversation(history);
  }

  formatConversation(history: ConversationHistory): string {
    return formatConversation(history);
  }

  // ---- Index generation ----

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

  /** Append a lint-fix entry to the operation log. */
  async logLintFix(operation: string, details: string): Promise<void> {
    const logPath = `${this.settings.wikiFolder}/log.md`;
    const date = new Date().toISOString().split('T')[0];
    const lang = this.settings.wikiLanguage || 'en';
    const entry = `\n\n## [${date}] Lint Fix: ${operation}\n\n${details}\n`;
    const existingLog = await this.tryReadFile(logPath) || `# Wiki ${lang === 'zh' ? '操作日志' : 'Operation Log'}\n\n`;
    await this.createOrUpdateFile(logPath, existingLog + entry);
  }
}
