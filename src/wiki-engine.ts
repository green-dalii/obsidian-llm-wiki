// Wiki Engine - Core Wiki ingestion and management logic

import { App, TFile, Notice, TFolder } from 'obsidian';
import {
  LLMWikiSettings,
  LLMClient,
  SourceAnalysis,
  EntityInfo,
  ConceptInfo,
  ContradictionInfo
} from './types';
import { PROMPTS } from './prompts';
import { slugify, parseJsonResponse, cleanMarkdownResponse } from './utils';

export class WikiEngine {
  private app: App;
  private settings: LLMWikiSettings;
  private llmClient: LLMClient | null;
  private getLLMClient: () => LLMClient | null;

  constructor(
    app: App,
    settings: LLMWikiSettings,
    getLLMClient: () => LLMClient | null
  ) {
    this.app = app;
    this.settings = settings;
    this.llmClient = null;
    this.getLLMClient = getLLMClient;
  }

  private get client(): LLMClient {
    const c = this.getLLMClient();
    if (!c) throw new Error('LLM Client not initialized');
    return c;
  }

  async selectSourceToIngest(getFileCallback: (file: TFile) => void) {
    // Delegate to plugin's modal logic
  }

  async ingestSource(file: TFile) {
    console.log('=== 开始摄入流程 ===');
    console.log('源文件:', file.path);
    new Notice(`正在摄入: ${file.basename}...`);

    try {
      await this.ensureWikiStructure();

      const analysis = await this.analyzeSource(file);
      if (!analysis) {
        throw new Error('源文件分析失败');
      }
      console.log('分析结果:', JSON.stringify(analysis, null, 2));

      const summaryPage = await this.createSummaryPage(file, analysis);
      analysis.created_pages.push(summaryPage);

      for (const entity of analysis.entities) {
        const entityPage = await this.createOrUpdateEntityPage(entity, analysis, file);
        if (entityPage) {
          analysis.created_pages.push(entityPage);
        }
      }

      for (const concept of analysis.concepts) {
        const conceptPage = await this.createOrUpdateConceptPage(concept, analysis, file);
        if (conceptPage) {
          analysis.created_pages.push(conceptPage);
        }
      }

      for (const relatedPageName of analysis.related_pages) {
        await this.updateRelatedPage(relatedPageName, analysis);
        analysis.updated_pages.push(relatedPageName);
      }

      for (const contradiction of analysis.contradictions) {
        await this.noteContradiction(contradiction);
      }

      await this.generateIndexFromEngine();
      await this.updateLog('ingest', analysis);

      const message = `摄入成功: 创建 ${analysis.created_pages.length} 页, 更新 ${analysis.updated_pages.length} 页`;
      console.log('=== 摄入流程完成 ===');
      console.log(message);
      new Notice(message, 5000);

    } catch (error) {
      console.error('=== 摄入流程失败 ===');
      console.error('错误:', error);
      new Notice(`摄入失败: ${(error as any).message}`, 8000);
      throw error;
    }
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
        console.log('创建文件夹:', folder);
      } catch (error) {
        // 文件夹已存在
      }
    }
  }

  async analyzeSource(file: TFile): Promise<SourceAnalysis | null> {
    console.log('=== 开始分析源文件 ===');
    console.log('文件:', file.path);

    const content = await this.app.vault.read(file);
    console.log('文件内容长度:', content.length);

    const existingPages = await this.getExistingWikiPages();
    const existingPagesList = existingPages.map(p => `- [[${p.title}]]`).join('\n');
    console.log('现有 Wiki 页面数量:', existingPages.length);

    const prompt = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', existingPagesList);

    console.log('Prompt 长度:', prompt.length);
    console.log('调用 LLM 分析源文件...');

    try {
      const response = await this.client.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      console.log('LLM 响应长度:', response.length);

      const analysisData = parseJsonResponse(response);

      if (!analysisData) {
        console.error('❌ JSON 解析失败，返回 null');
        return null;
      }

      console.log('✅ JSON 解析成功');

      const requiredFields = ['source_title', 'summary', 'entities', 'concepts'];
      const missingFields = requiredFields.filter(field => !analysisData[field]);

      if (missingFields.length > 0) {
        console.error('❌ 缺少必要字段:', missingFields);
        return null;
      }

      console.log('✅ 所有必要字段存在');

      const analysis: SourceAnalysis = {
        ...analysisData,
        source_file: file.path,
        created_pages: [],
        updated_pages: []
      };

      console.log('分析完成:');
      console.log('  - 实体数量:', analysis.entities.length);
      console.log('  - 概念数量:', analysis.concepts.length);
      console.log('  - 相关页面:', analysis.related_pages?.length || 0);

      return analysis;

    } catch (error) {
      console.error('❌ analyzeSource 异常:', error);
      return null;
    }
  }

  async getExistingWikiPages(): Promise<{path: string, title: string}[]> {
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

    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async createOrUpdateEntityPage(entity: EntityInfo, analysis: SourceAnalysis, sourceFile: TFile): Promise<string | null> {
    if (!entity.name || entity.name.trim().length === 0) {
      console.warn('实体名称为空，跳过创建');
      return null;
    }

    console.log('=== 创建实体页 ===');
    console.log('entity.name:', entity.name);
    console.log('类型:', entity.type);

    const slug = slugify(entity.name);
    console.log('生成的 slug:', slug);
    const path = `${this.settings.wikiFolder}/entities/${slug}.md`;
    console.log('目标路径:', path);

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

    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async createOrUpdateConceptPage(concept: ConceptInfo, analysis: SourceAnalysis, sourceFile: TFile): Promise<string | null> {
    if (!concept.name || concept.name.trim().length === 0) {
      console.warn('概念名称为空，跳过创建');
      return null;
    }

    console.log('=== 创建概念页 ===');
    console.log('concept.name:', concept.name);
    console.log('类型:', concept.type);

    const slug = slugify(concept.name);
    console.log('生成的 slug:', slug);
    const path = `${this.settings.wikiFolder}/concepts/${slug}.md`;
    console.log('目标路径:', path);

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

    const pageContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async updateRelatedPage(pageName: string, analysis: SourceAnalysis) {
    const existingPages = await this.getExistingWikiPages();
    const page = existingPages.find(p => p.title === pageName);

    if (!page) {
      console.log('相关页面不存在:', pageName);
      return;
    }

    const existingContent = await this.app.vault.read(this.app.vault.getAbstractFileByPath(page.path) as TFile);

    const prompt = `现有 Wiki 页面：${pageName}

现有内容：
${existingContent}

新源文件提供了关于 ${pageName} 的新信息：
${JSON.stringify(analysis.entities.find(e => e.name === pageName) || analysis.concepts.find(c => c.name === pageName) || '无直接相关信息')}

请更新该页面，添加新信息，但不要删除现有内容。使用双向链接语法 [[页面名]]。
只输出更新后的完整页面内容，不要其他文字。`;

    const updatedContent = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
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
    console.log('createOrUpdateFile:', path);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          console.log(`尝试 ${attempt + 1}: 文件已存在，更新:`, path);
          await this.app.vault.modify(file, content);
          console.log('更新成功:', path);
          return;
        } else {
          console.log(`尝试 ${attempt + 1}: 文件不存在，创建:`, path);
          await this.app.vault.create(path, content);
          console.log('创建成功:', path);
          return;
        }
      } catch (error: any) {
        console.error(`尝试 ${attempt + 1} 失败:`, error.message);

        if (error.message?.includes('File already exists') || error.message?.includes('already exists')) {
          console.log('文件已存在异常，等待100ms后重试:', path);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        } else {
          console.error('无法处理的错误:', path, error);
          throw error;
        }
      }
    }

    console.log('3次尝试后，强制查找文件并更新:', path);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
      console.log('最终更新成功:', path);
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

  async generateIndexFromEngine() {
    await this.ensureWikiStructure();

    const entities = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/entities/`));

    const concepts = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/concepts/`));

    const sources = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/sources/`));

    let indexContent = `# Wiki 索引\n\n`;
    indexContent += `> 自动生成的知识库目录，按类型分类\n\n`;

    indexContent += `## 实体 (Entities)\n\n`;
    for (const file of entities) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[entities/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    indexContent += `\n## 概念 (Concepts)\n\n`;
    for (const file of concepts) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[concepts/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    indexContent += `\n## 源文件 (Sources)\n\n`;
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

    console.log('=== Starting conversation extraction ===');

    const actualDate = new Date().toISOString().split('T')[0];
    console.log('[系统时间]', actualDate);

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    const existingWikiIndex = await this.tryReadFile(indexPath) || 'Wiki is empty';
    console.log('[Wiki索引]', existingWikiIndex ? '已读取' : '为空');

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

    const analysis = await this.client.createMessage({
      model: this.settings.model,
      max_tokens: 5000,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    });

    const parsed = parseJsonResponse(analysis);
    if (!parsed) {
      throw new Error('Conversation analysis JSON parsing failed');
    }

    console.log('[LLM分析结果]', parsed);
    console.log('[生成的标题]', parsed.source_title);

    await this.ensureWikiStructure();

    const semanticSlug = slugify(parsed.source_title);
    const summaryPath = `${this.settings.wikiFolder}/sources/${semanticSlug}.md`;
    console.log('[语义化文件路径]', summaryPath);

    const tags = parsed.concepts.map((c: any) => c.name).join(', ');
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

${parsed.entities.map((e: any) => `- [[entities/${slugify(e.name)}|${e.name}]] - ${e.summary}`).join('\n')}

## 关键概念

${parsed.concepts.map((c: any) => `- [[concepts/${slugify(c.name)}|${c.name}]] - ${c.summary}`).join('\n')}

## 主要观点

${parsed.key_points.map((p: string) => `- ${p}`).join('\n')}

---
更新日期：${actualDate}`;

    await this.createOrUpdateFile(summaryPath, summaryContent);
    parsed.created_pages.push(summaryPath);

    for (const entity of parsed.entities) {
      const entityPage = await this.createOrUpdateEntityPage(entity, parsed, { path: summaryPath, basename: semanticSlug } as any);
      if (entityPage) {
        parsed.created_pages.push(entityPage);
      }
    }

    for (const concept of parsed.concepts) {
      const conceptPage = await this.createOrUpdateConceptPage(concept, parsed, { path: summaryPath, basename: semanticSlug } as any);
      if (conceptPage) {
        parsed.created_pages.push(conceptPage);
      }
    }

    await this.generateIndexFromEngine();
    parsed.contradictions = parsed.contradictions || [];
    await this.updateLog('conversation', parsed);

    console.log('=== Conversation extraction complete ===');
    console.log('Created pages:', parsed.created_pages);
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