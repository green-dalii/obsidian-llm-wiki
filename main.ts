import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, Notice, Modal, FuzzySuggestModal } from 'obsidian';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ==================== 核心数据结构 ====================

interface SourceAnalysis {
  source_file: string;
  source_title: string;
  summary: string;
  entities: EntityInfo[];
  concepts: ConceptInfo[];
  contradictions: ContradictionInfo[];
  related_pages: string[];
  key_points: string[];
  created_pages: string[];
  updated_pages: string[];
}

interface EntityInfo {
  name: string;
  type: 'person' | 'organization' | 'project' | 'location' | 'other';
  summary: string;
  mentions_in_source: string[];
}

interface ConceptInfo {
  name: string;
  type: 'theory' | 'method' | 'technology' | 'term' | 'other';
  summary: string;
  mentions_in_source: string[];
  related_concepts: string[];
}

interface ContradictionInfo {
  claim: string;
  source_page: string;
  contradicted_by: string;
  resolution: string;
}

interface WikiPage {
  path: string;
  title: string;
  content: string;
  frontmatter: {
    type: 'entity' | 'concept' | 'source' | 'comparison' | 'overview';
    created: string;
    sources: string[];
    tags: string[];
  };
}

// ==================== 统一 LLM 客户端接口 ====================

interface LLMClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string>;
}

class AnthropicClient implements LLMClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    const response = await this.client.messages.create(params);
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}

class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true
    });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    });
    return response.choices[0]?.message?.content || '';
  }
}

// ==================== Prompt 模板 ====================

const PROMPTS = {
  analyzeSource: `你是一个 Wiki 知识库维护者。请分析以下源文件，并以 JSON 格式输出结构化分析结果。

**源文件内容：**
{{content}}

**现有 Wiki 页面列表：**
{{existing_pages}}

**任务要求：**
1. 提取关键实体（人名、组织、项目、地点等）
2. 提取核心概念（理论、方法、技术、术语等）
3. 识别与现有 Wiki 的矛盾或冲突
4. 找出相关的现有 Wiki 页面
5. 生成简洁摘要

**输出格式（JSON）：**
{
  "source_title": "源文件标题",
  "summary": "100-200字的摘要",
  "entities": [
    {
      "name": "实体名称",
      "type": "person|organization|project|location|other",
      "summary": "该实体的一句话描述",
      "mentions_in_source": ["该实体在源中的具体提及"]
    }
  ],
  "concepts": [
    {
      "name": "概念名称",
      "type": "theory|method|technology|term|other",
      "summary": "该概念的一句话描述",
      "mentions_in_source": ["该概念在源中的具体提及"],
      "related_concepts": ["相关概念名称"]
    }
  ],
  "contradictions": [
    {
      "claim": "源文件声称的内容",
      "source_page": "矛盾的现有 Wiki 页面 [[page-name]]",
      "contradicted_by": "该页面声称的内容",
      "resolution": "建议的解决方式"
    }
  ],
  "related_pages": ["相关的现有 Wiki 页面名称"],
  "key_points": ["关键要点1", "关键要点2"]
}

**重要规则：**
- 只输出 JSON，不要其他内容
- 实体和概念名称使用英文或中文，但保持一致
- 每个实体和概念都应该在 Wiki 中有独立页面
- 矛盾检测要仔细对比现有内容
- related_pages 应是现有 Wiki 中实际存在的页面
- 输出必须是有效 JSON 格式`,

  generateEntityPage: `你是一个 Wiki 知识库维护者。请为以下实体创建一个 Wiki 页面。

**实体信息：**
- 名称：{{entity_name}}
- 类型：{{entity_type}}
- 摘要：{{entity_summary}}
- 在源中的提及：{{mentions}}

**现有 Wiki 中相关内容：**
{{related_content}}

**任务要求：**
1. 创建实体页面，包含基本信息和关键信息
2. 使用 Obsidian 双向链接语法 [[页面名]] 引用相关实体和概念
3. 如果 Wiki 中已有该实体，合并新信息，不要删除旧内容
4. 保持客观、准确、简洁

**输出格式：**
---
type: entity
created: {{date}}
sources: [{{source_file}}]
tags: [{{tags}}]
---

# {{entity_name}}

## 基本信息
- 类型：{{entity_type}}
- 来源：{{source_file}}

## 描述
[实体的详细描述，包含双向链接]

## 相关内容
- 相关概念：[[概念1]], [[概念2]]
- 相关实体：[[实体1]], [[实体2]]

## 在源中的提及
- [具体提及内容]

---
更新日期：{{date}}`,

  generateConceptPage: `你是一个 Wiki 知识库维护者。请为以下概念创建一个 Wiki 页面。

**概念信息：**
- 名称：{{concept_name}}
- 类型：{{concept_type}}
- 摘要：{{concept_summary}}
- 在源中的提及：{{mentions}}
- 相关概念：{{related_concepts}}

**现有 Wiki 中相关内容：**
{{related_content}}

**任务要求：**
1. 创建概念页面，包含定义、特点、应用等
2. 使用 Obsidian 双向链接语法 [[页面名]] 引用相关实体和概念
3. 如果 Wiki 中已有该概念，合并新信息，不要删除旧内容
4. 保持客观、准确、简洁

**输出格式：**
---
type: concept
created: {{date}}
sources: [{{source_file}}]
tags: [{{tags}}]
---

# {{concept_name}}

## 定义
[概念的清晰定义]

## 关键特征
- 特征1
- 特征2

## 应用场景
[概念的应用场景]

## 相关概念
- [[相关概念1]] - [简述关系]
- [[相关概念2]] - [简述关系]

## 相关实体
- [[实体1]] - [简述关系]

---
更新日期：{{date}}`,

  generateSummaryPage: `你是一个 Wiki 知识库维护者。请为以下源文件创建摘要页面。

**源文件信息：**
- 标题：{{source_title}}
- 内容：{{content}}
- 分析结果：{{analysis}}

**任务要求：**
1. 创建简洁的摘要页面
2. 使用 Obsidian 双向链接语法 [[页面名]] 引用提取的实体和概念
3. 突出关键要点
4. 保持客观、准确

**输出格式：**
---
type: source
created: {{date}}
source_file: {{source_file}}
tags: [{{tags}}]
---

# {{source_title}} - 摘要

## 来源
- 原始文件：{{source_file}}
- 摄入日期：{{date}}

## 核心内容
[100-200字的摘要，包含双向链接]

## 关键实体
- [[实体1]] - [简要说明]
- [[实体2]] - [简要说明]

## 关键概念
- [[概念1]] - [简要说明]
- [[概念2]] - [简要说明]

## 主要观点
- 观点1
- 观点2

---
更新日期：{{date}}`
};

// ==================== 插件设置 ====================

interface LLMWikiSettings {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  openaiBaseUrl?: string;
  wikiFolder: string;
  model: string;
}

const DEFAULT_SETTINGS: LLMWikiSettings = {
  provider: 'anthropic',
  apiKey: '',
  openaiBaseUrl: '',
  wikiFolder: 'wiki',
  model: 'claude-sonnet-4-6'
}

// ==================== 辅助函数 ====================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

function parseJsonResponse(response: string): any {
  try {
    // 提取 JSON（可能被 markdown 包围）
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch (error) {
    console.error('JSON 解析失败:', error);
    console.log('原始响应:', response);
    return null;
  }
}

// ==================== 主插件类 ====================

export default class LLMWikiPlugin extends Plugin {
  settings: LLMWikiSettings;
  llmClient: LLMClient | null = null;

  async onload() {
    await this.loadSettings();
    this.initializeLLMClient();

    // 注册命令
    this.addCommand({
      id: 'ingest-source',
      name: '摄入单个源文件 (Ingest Single Source)',
      callback: () => this.selectSourceToIngest()
    });

    this.addCommand({
      id: 'ingest-folder',
      name: '从文件夹批量摄入 (Ingest from Folder)',
      callback: () => this.selectFolderToIngest()
    });

    this.addCommand({
      id: 'query-wiki',
      name: '查询 Wiki (Query Wiki)',
      callback: () => this.queryWiki()
    });

    this.addCommand({
      id: 'lint-wiki',
      name: '维护 Wiki (Lint Wiki)',
      callback: () => this.lintWiki()
    });

    this.addCommand({
      id: 'regenerate-index',
      name: '重新生成索引 (Regenerate Index)',
      callback: () => this.generateIndex()
    });

    // 设置面板
    this.addSettingTab(new LLMWikiSettingTab(this.app, this));

    console.log('LLM Wiki Plugin loaded - Karpathy implementation');
  }

  onunload() {
    console.log('LLM Wiki Plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeLLMClient();
  }

  initializeLLMClient() {
    if (!this.settings.apiKey?.trim()) {
      this.llmClient = null;
      return;
    }

    try {
      if (this.settings.provider === 'anthropic') {
        this.llmClient = new AnthropicClient(this.settings.apiKey.trim());
      } else {
        this.llmClient = new OpenAIClient(
          this.settings.apiKey.trim(),
          this.settings.openaiBaseUrl?.trim() || undefined
        );
      }
      console.log('LLM Client initialized:', this.settings.provider);
    } catch (error) {
      console.error('LLM Client initialization failed:', error);
      this.llmClient = null;
    }
  }

  // ==================== 核心功能实现 ====================

  async selectSourceToIngest() {
    if (!this.llmClient) {
      new Notice('请先配置 API Key');
      return;
    }

    new FileSuggestModal(this.app, async (file) => {
      await this.ingestSource(file);
    }).open();
  }

  async selectFolderToIngest() {
    if (!this.llmClient) {
      new Notice('请先配置 API Key');
      return;
    }

    new FolderSuggestModal(this.app, async (folder) => {
      const files = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(folder.path));

      if (files.length === 0) {
        new Notice(`文件夹 ${folder.path} 中没有 Markdown 文件`);
        return;
      }

      new Notice(`开始批量摄入 ${files.length} 个文件...`);

      for (const file of files) {
        try {
          await this.ingestSource(file);
        } catch (error) {
          console.error(`摄入失败: ${file.path}`, error);
        }
      }

      new Notice(`批量摄入完成`);
    }).open();
  }

  async ingestSource(file: TFile) {
    if (!this.llmClient) {
      throw new Error('LLM Client not initialized');
    }

    console.log('开始摄入:', file.path);
    new Notice(`正在摄入: ${file.basename}...`);

    try {
      // 1. 确保 Wiki 文件夹结构存在
      await this.ensureWikiStructure();

      // 2. 分析源文件
      const analysis = await this.analyzeSource(file);
      if (!analysis) {
        throw new Error('源文件分析失败');
      }

      console.log('分析结果:', analysis);

      // 3. 创建摘要页
      const summaryPage = await this.createSummaryPage(file, analysis);
      analysis.created_pages.push(summaryPage);

      // 4. 创建/更新实体页
      for (const entity of analysis.entities) {
        const entityPage = await this.createOrUpdateEntityPage(entity, analysis, file);
        if (entityPage) {
          analysis.created_pages.push(entityPage);
        }
      }

      // 5. 创建/更新概念页
      for (const concept of analysis.concepts) {
        const conceptPage = await this.createOrUpdateConceptPage(concept, analysis, file);
        if (conceptPage) {
          analysis.created_pages.push(conceptPage);
        }
      }

      // 6. 更新相关现有页面
      for (const relatedPageName of analysis.related_pages) {
        await this.updateRelatedPage(relatedPageName, analysis);
        analysis.updated_pages.push(relatedPageName);
      }

      // 7. 标记矛盾
      for (const contradiction of analysis.contradictions) {
        await this.noteContradiction(contradiction);
      }

      // 8. 更新 Index 和 Log
      await this.generateIndex();
      await this.updateLog('ingest', analysis);

      const message = `摄入成功: 创建 ${analysis.created_pages.length} 页, 更新 ${analysis.updated_pages.length} 页`;
      new Notice(message, 5000);
      console.log(message);

    } catch (error) {
      console.error('摄入失败:', error);
      new Notice(`摄入失败: ${(error as any).message}`);
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
    const content = await this.app.vault.read(file);

    // 获取现有 Wiki 页面列表
    const existingPages = await this.getExistingWikiPages();
    const existingPagesList = existingPages.map(p => `- [[${p.title}]]`).join('\n');

    // 构建 prompt
    const prompt = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', existingPagesList);

    console.log('调用 LLM 分析源文件...');
    const response = await this.llmClient.createMessage({
      model: this.settings.model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const analysisData = parseJsonResponse(response);
    if (!analysisData) {
      return null;
    }

    // 补充分析结果
    const analysis: SourceAnalysis = {
      ...analysisData,
      source_file: file.path,
      created_pages: [],
      updated_pages: []
    };

    return analysis;
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

    const pageContent = await this.llmClient.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    await this.createOrUpdateFile(path, pageContent);
    return path;
  }

  async createOrUpdateEntityPage(entity: EntityInfo, analysis: SourceAnalysis, sourceFile: TFile): Promise<string> {
    const slug = slugify(entity.name);
    const path = `${this.settings.wikiFolder}/entities/${slug}.md`;

    // 检查是否已有该实体页
    const existingContent = await this.tryReadFile(path);

    const prompt = PROMPTS.generateEntityPage
      .replace('{{entity_name}}', entity.name)
      .replace('{{entity_type}}', entity.type)
      .replace('{{entity_summary}}', entity.summary)
      .replace('{{mentions}}', entity.mentions_in_source.join('\n'))
      .replace('{{related_content}}', existingContent || '暂无相关内容')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path)
      .replace('{{tags}}', entity.type);

    const pageContent = await this.llmClient.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    await this.createOrUpdateFile(path, pageContent);
    return path;
  }

  async createOrUpdateConceptPage(concept: ConceptInfo, analysis: SourceAnalysis, sourceFile: TFile): Promise<string> {
    const slug = slugify(concept.name);
    const path = `${this.settings.wikiFolder}/concepts/${slug}.md`;

    const existingContent = await this.tryReadFile(path);

    const prompt = PROMPTS.generateConceptPage
      .replace('{{concept_name}}', concept.name)
      .replace('{{concept_type}}', concept.type)
      .replace('{{concept_summary}}', concept.summary)
      .replace('{{mentions}}', concept.mentions_in_source.join('\n'))
      .replace('{{related_concepts}}', concept.related_concepts.join(', '))
      .replace('{{related_content}}', existingContent || '暂无相关内容')
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace('{{source_file}}', sourceFile.path)
      .replace('{{tags}}', concept.type);

    const pageContent = await this.llmClient.createMessage({
      model: this.settings.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    await this.createOrUpdateFile(path, pageContent);
    return path;
  }

  async updateRelatedPage(pageName: string, analysis: SourceAnalysis) {
    // 查找页面路径
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

    const updatedContent = await this.llmClient.createMessage({
      model: this.settings.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    await this.createOrUpdateFile(page.path, updatedContent);
  }

  async noteContradiction(contradiction: ContradictionInfo) {
    // 在矛盾页面中添加矛盾标记
    const pagePath = contradiction.source_page.replace(/\[\[(.+)\]\]/, `${this.settings.wikiFolder}/$1.md`);

    const existingContent = await this.tryReadFile(pagePath);
    if (!existingContent) {
      return;
    }

    const contradictionNote = `\n\n## ⚠️ 潜在矛盾\n\n**来源**：${contradiction.claim}\n\n**现有观点**：${contradiction.contradicted_by}\n\n**解决建议**：${contradiction.resolution}\n\n---\n*标记日期：${new Date().toISOString().split('T')[0]}*`;

    await this.createOrUpdateFile(pagePath, existingContent + contradictionNote);
  }

  async createOrUpdateFile(path: string, content: string) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
    } else {
      await this.app.vault.create(path, content);
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

  async generateIndex() {
    await this.ensureWikiStructure();

    const entities = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/entities/`));

    const concepts = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/concepts/`));

    const sources = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(`${this.settings.wikiFolder}/sources/`));

    let indexContent = `# Wiki 索引\n\n`;
    indexContent += `> 自动生成的知识库目录，按类型分类\n\n`;

    // Entities
    indexContent += `## 实体 (Entities)\n\n`;
    for (const file of entities) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[entities/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    // Concepts
    indexContent += `\n## 概念 (Concepts)\n\n`;
    for (const file of concepts) {
      const summary = await this.getPageSummary(file);
      indexContent += `- [[concepts/${file.basename}|${file.basename}]] - ${summary}\n`;
    }

    // Sources
    indexContent += `\n## 源文件 (Sources)\n\n`;
    for (const file of sources) {
      indexContent += `- [[sources/${file.basename}|${file.basename}]]\n`;
    }

    const indexPath = `${this.settings.wikiFolder}/index.md`;
    await this.createOrUpdateFile(indexPath, indexContent);
  }

  async getPageSummary(file: TFile): Promise<string> {
    const content = await this.app.vault.read(file);
    // 提取标题后的第一行作为摘要
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

  async queryWiki() {
    if (!this.llmClient) {
      new Notice('请先配置 API Key');
      return;
    }

    new QueryModal(this.app, async (query) => {
      try {
        new Notice('正在查询 Wiki...');

        const indexPath = `${this.settings.wikiFolder}/index.md`;
        const indexContent = await this.tryReadFile(indexPath) || '';

        const prompt = `你是一个 Wiki 知识库查询助手。

Wiki 索引：
${indexContent}

用户问题：${query}

请：
1. 根据索引定位相关页面
2. 综合这些页面的信息回答问题
3. 在回答中引用来源页面 [[页面名]]
4. 如果答案有价值，建议将其保存为新 Wiki 页面`;

        const answer = await this.llmClient.createMessage({
          model: this.settings.model,
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }]
        });

        new AnswerModal(this.app, answer).open();

      } catch (error) {
        new Notice('查询失败');
        console.error(error);
      }
    }).open();
  }

  async lintWiki() {
    if (!this.llmClient) {
      new Notice('请先配置 API Key');
      return;
    }

    new Notice('开始维护 Wiki...');

    try {
      const wikiFiles = await this.getExistingWikiPages();
      const indexContent = await this.tryReadFile(`${this.settings.wikiFolder}/index.md`) || '';

      const prompt = `你是一个 Wiki 维护助手。请检查以下 Wiki 的健康状况。

Wiki 索引：
${indexContent}

Wiki 页面列表：
${wikiFiles.map(p => `- [[${p.title}]]`).join('\n')}

请检查：
1. 矛盾 - 页面间内容矛盾
2. 过时 - 声明可能已过时
3. 孤立 - 无入链的孤立页面
4. 缺失 - 重要概念缺少独立页面
5. 断链 - 双向链接指向不存在的页面
6. 空洞 - 页面内容不足

输出格式：
## 矛盾
- [列出发现的矛盾]

## 过时内容
- [列出过时的声明]

## 孤立页面
- [列出孤立页面]

## 缺失页面
- [建议创建的页面]

## 断链
- [列出断开的链接]

## 其他建议
- [其他维护建议]`;

      const report = await this.llmClient.createMessage({
        model: this.settings.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      new LintReportModal(this.app, report).open();
      new Notice('维护完成');

    } catch (error) {
      new Notice('维护失败');
      console.error(error);
    }
  }

  // 测试 LLM Provider 连接
  async testLLMConnection(): Promise<{ success: boolean; message: string }> {
    console.log('测试 LLM 连接...');
    console.log('当前配置:', {
      provider: this.settings.provider,
      apiKey: this.settings.apiKey ? '已配置' : '未配置',
      model: this.settings.model,
      openaiBaseUrl: this.settings.openaiBaseUrl || '默认'
    });

    if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
      return {
        success: false,
        message: 'API Key 未配置'
      };
    }

    try {
      // 临时初始化客户端进行测试
      let testClient: LLMClient;
      if (this.settings.provider === 'anthropic') {
        testClient = new AnthropicClient(this.settings.apiKey.trim());
      } else {
        testClient = new OpenAIClient(
          this.settings.apiKey.trim(),
          this.settings.openaiBaseUrl?.trim() || undefined
        );
      }

      // 发送测试请求
      const testResponse = await testClient.createMessage({
        model: this.settings.model,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: '测试连接，请回复"连接成功"'
        }]
      });

      console.log('测试响应:', testResponse);

      return {
        success: true,
        message: `连接成功！响应: "${testResponse.substring(0, 50)}..."`
      };
    } catch (error: any) {
      console.error('连接测试失败:', error);
      return {
        success: false,
        message: `连接失败: ${error.message || '未知错误'}`
      };
    }
  }
}

// ==================== UI 模态框 ====================

class LLMWikiSettingTab extends PluginSettingTab {
  plugin: LLMWikiPlugin;
  tempSettings: LLMWikiSettings; // 临时设置对象

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.tempSettings = { ...plugin.settings }; // 初始化临时设置
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'LLM Wiki 设置' });

    // ===== 状态显示 =====
    const statusDiv = containerEl.createDiv({ cls: 'llm-wiki-status' });
    const clientStatus = this.plugin.llmClient ? '✅ 已初始化' : '❌ 未初始化';
    statusDiv.createEl('p', {
      text: `LLM Client 状态: ${clientStatus}`,
      attr: { style: 'margin-bottom: 20px; font-weight: bold; font-size: 14px;' }
    });

    // ===== Provider 配置 =====
    containerEl.createEl('h3', { text: 'LLM Provider 配置' });

    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('选择使用的 LLM 提供商')
      .addDropdown(dropdown => dropdown
        .addOption('anthropic', 'Anthropic (Claude)')
        .addOption('openai', 'OpenAI / OpenAI Compatible')
        .setValue(this.tempSettings.provider)
        .onChange((value) => {
          this.tempSettings.provider = value as 'anthropic' | 'openai';
          // 自动切换默认模型
          if (value === 'anthropic') {
            this.tempSettings.model = 'claude-sonnet-4-6';
          } else {
            this.tempSettings.model = 'gpt-4o';
          }
          this.display(); // 重新渲染（显示/隐藏 BaseURL）
        }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc(this.tempSettings.provider === 'anthropic'
        ? 'Anthropic API Key'
        : 'OpenAI API Key')
      .addText(text => text
        .setPlaceholder(this.tempSettings.provider === 'anthropic'
          ? 'sk-ant-...'
          : 'sk-...')
        .setValue(this.tempSettings.apiKey)
        .onChange((value) => {
          this.tempSettings.apiKey = value;
        }));

    // OpenAI Base URL（仅在 provider 为 openai 时显示）
    if (this.tempSettings.provider === 'openai') {
      new Setting(containerEl)
        .setName('OpenAI Base URL')
        .setDesc('自定义 API endpoint（可选，默认使用官方 API）')
        .addText(text => text
          .setPlaceholder('https://api.openai.com/v1')
          .setValue(this.tempSettings.openaiBaseUrl || '')
          .onChange((value) => {
            this.tempSettings.openaiBaseUrl = value;
          }));
    }

    new Setting(containerEl)
      .setName('Model 名称')
      .setDesc(this.tempSettings.provider === 'anthropic'
        ? 'Claude 模型（如：claude-sonnet-4-6, claude-opus-4-7）'
        : 'GPT 模型（如：gpt-4o, gpt-4o-mini）')
      .addText(text => text
        .setPlaceholder(this.tempSettings.provider === 'anthropic'
          ? 'claude-sonnet-4-6'
          : 'gpt-4o')
        .setValue(this.tempSettings.model)
        .onChange((value) => {
          this.tempSettings.model = value;
        }));

    // ===== 测试和保存按钮 =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });

    new Setting(containerEl)
      .setName('测试连接')
      .setDesc('验证当前配置是否能成功连接到 LLM Provider')
      .addButton(button => button
        .setButtonText('测试连接')
        .onClick(async () => {
          button.setButtonText('测试中...');
          button.setDisabled(true);

          // 临时应用设置进行测试
          const testSettings = { ...this.tempSettings };
          this.plugin.settings = testSettings;
          this.plugin.initializeLLMClient();

          const result = await this.plugin.testLLMConnection();

          button.setButtonText('测试连接');
          button.setDisabled(false);

          if (result.success) {
            new Notice(result.message, 5000);
          } else {
            new Notice(result.message, 8000);
          }
        }));

    new Setting(containerEl)
      .setName('保存设置')
      .setDesc('保存当前配置到插件数据文件')
      .addButton(button => button
        .setButtonText('保存设置')
        .setCta() // 突出显示主要按钮
        .onClick(async () => {
          // 保存临时设置到插件设置
          this.plugin.settings = { ...this.tempSettings };
          await this.plugin.saveSettings();

          new Notice('设置已保存成功！', 3000);

          // 刷新面板以显示最新状态
          this.display();
        }));

    // ===== Wiki 配置 =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    containerEl.createEl('h3', { text: 'Wiki 文件夹配置' });

    new Setting(containerEl)
      .setName('Wiki 文件夹')
      .setDesc('存放生成的 Wiki 页面（将自动创建子文件夹）')
      .addText(text => text
        .setPlaceholder('wiki')
        .setValue(this.tempSettings.wikiFolder)
        .onChange((value) => {
          this.tempSettings.wikiFolder = value;
        }));
  }
}

class FileSuggestModal extends FuzzySuggestModal<TFile> {
  onSelect: (file: TFile) => void;

  constructor(app: App, onSelect: (file: TFile) => void) {
    super(app);
    this.onSelect = onSelect;
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles()
      .filter(f => !f.path.startsWith('wiki') && !f.path.startsWith('.obsidian'));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onSelect(file);
  }
}

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  onSelect: (folder: TFolder) => void;

  constructor(app: App, onSelect: (folder: TFolder) => void) {
    super(app);
    this.onSelect = onSelect;
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const root = this.app.vault.getRoot();

    const collect = (folder: TFolder) => {
      if (!folder.path.startsWith('.obsidian') && !folder.path.startsWith('wiki')) {
        folders.push(folder);
      }
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          collect(child);
        }
      }
    };
    collect(root);
    return folders;
  }

  getItemText(folder: TFolder): string {
    return folder.path;
  }

  onChooseItem(folder: TFolder): void {
    this.onSelect(folder);
  }
}

class QueryModal extends Modal {
  onSubmit: (query: string) => void;

  constructor(app: App, onSubmit: (query: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '查询 Wiki' });

    const input = contentEl.createEl('textarea', {
      attr: { rows: '5', style: 'width: 100%' }
    });

    contentEl.createEl('button', { text: '查询' })
      .addEventListener('click', () => {
        this.onSubmit(input.value);
        this.close();
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class AnswerModal extends Modal {
  answer: string;

  constructor(app: App, answer: string) {
    super(app);
    this.answer = answer;
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: '回答' });
    this.contentEl.createEl('div', {
      text: this.answer,
      attr: { style: 'white-space: pre-wrap; max-height: 60vh; overflow-y: auto;' }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class LintReportModal extends Modal {
  report: string;

  constructor(app: App, report: string) {
    super(app);
    this.report = report;
  }

  onOpen() {
    this.contentEl.createEl('h2', { text: 'Wiki 维护报告' });
    this.contentEl.createEl('div', {
      text: this.report,
      attr: { style: 'white-space: pre-wrap; max-height: 60vh; overflow-y: auto;' }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}