// Wiki Engine — Core Wiki ingestion and management logic.
// Orchestrates sub-modules: SourceAnalyzer, PageFactory, ConversationIngestor,
// LintFixer, ContradictionManager, and system-prompts.

import { App, TFile } from 'obsidian';
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
import { SchemaManager } from '../schema/schema-manager';
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
        buildSystemPrompt(this.settings, t => this.schemaManager.getSchemaContext(t), task),
      getSectionLabels: () => getSectionLabels(this.settings),
      getExistingWikiPages: () =>
        getExistingWikiPages(this.app, this.settings.wikiFolder),
      getSchemaContext: t => this.schemaManager.getSchemaContext(t),
      onFileWrite: path => this.onFileWrite?.(path),
      onProgress: msg => this.onProgress?.(msg),
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

  private async buildSystemPrompt(task: string): Promise<string | undefined> {
    return buildSystemPrompt(this.settings, t => this.schemaManager.getSchemaContext(t), task);
  }

  private applySectionLabels(prompt: string): string {
    return applySectionLabels(prompt, this.settings);
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

      analysis = await this.sourceAnalyzer.analyzeSource(file);
      if (!analysis) {
        throw new Error('源文件分析失败');
      }
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
      const summaryPage = await this.createSummaryPage(file, analysis, plannedPaths);
      analysis.created_pages.push(summaryPage);

      for (const entity of analysis.entities) {
        step++;
        this.onProgress?.(`[${step}/${totalSteps}] Entity: ${entity.name}`);
        await this.apiDelay();
        try {
          const entityPage = await this.pageFactory.createOrUpdateEntityPage(entity, analysis, file);
          if (entityPage) {
            analysis.created_pages.push(entityPage);
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`Entity "${entity.name}" failed:`, reason);
          failedItems.push({ type: 'entity', name: entity.name, reason });

          try {
            await this.apiDelay(2000);
            const retryPage = await this.pageFactory.createOrUpdateEntityPage(entity, analysis, file);
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

      for (const concept of analysis.concepts) {
        step++;
        this.onProgress?.(`[${step}/${totalSteps}] Concept: ${concept.name}`);
        await this.apiDelay();
        try {
          const conceptPage = await this.pageFactory.createOrUpdateConceptPage(concept, analysis, file);
          if (conceptPage) {
            analysis.created_pages.push(conceptPage);
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`Concept "${concept.name}" failed:`, reason);
          failedItems.push({ type: 'concept', name: concept.name, reason });

          try {
            await this.apiDelay(2000);
            const retryPage = await this.pageFactory.createOrUpdateConceptPage(concept, analysis, file);
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

      for (const relatedPageName of analysis.related_pages) {
        step++;
        this.onProgress?.(`[${step}/${totalSteps}] Updating: ${relatedPageName}`);
        await this.apiDelay();
        try {
          await this.pageFactory.updateRelatedPage(relatedPageName, analysis);
          analysis.updated_pages.push(relatedPageName);
        } catch (error) {
          console.error(`Related page "${relatedPageName}" update failed, continuing...`, error);
        }
      }

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

      const created = analysis.created_pages.length;
      const updated = analysis.updated_pages.length;
      const entitiesCreated = analysis.created_pages.filter(p => p.includes('/entities/')).length;
      const conceptsCreated = analysis.created_pages.filter(p => p.includes('/concepts/')).length;

      console.debug('=== 摄入流程完成 ===');
      console.debug(`摄入完成: 创建 ${created} 页 (${entitiesCreated} 实体 + ${conceptsCreated} 概念), 更新 ${updated} 页`);

      this.onDone?.({
        sourceFile: file.path,
        createdPages: analysis.created_pages,
        updatedPages: analysis.updated_pages,
        entitiesCreated,
        conceptsCreated,
        failedItems,
        contradictionsFound: analysis.contradictions.length,
        success: true,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
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
    if (dir && 'children' in dir) {
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

  async ingestConversation(history: ConversationHistory): Promise<void> {
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
