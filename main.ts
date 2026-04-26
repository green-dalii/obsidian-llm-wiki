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

  listModels?(): Promise<string[]>; // 可选：获取可用模型列表
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

  async listModels(): Promise<string[]> {
    // Anthropic 目前没有公开的模型列表 API
    // 尝试从官方文档获取最新列表，或返回空数组让用户自行填写
    try {
      // 未来如果 Anthropic 提供 API，可以在这里调用
      // 目前返回推荐的模型列表（用户可以通过"自定义"选项输入其他模型）
      return [
        'claude-sonnet-4-6',
        'claude-opus-4-7',
        'claude-haiku-4-5-20251001'
      ];
    } catch (error) {
      console.error('Anthropic 模型列表获取失败:', error);
      return [];
    }
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

  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      const modelIds = models.data
        .map(m => m.id)
        .filter(id => !id.includes(':') && !id.includes('/')) // 过滤掉微调模型
        .sort();
      return modelIds.slice(0, 100); // 返回最多100个模型
    } catch (error) {
      console.error('获取模型列表失败:', error);
      // API 失败时返回空数组，让用户通过"自定义"选项手动输入
      return [];
    }
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

// ==================== 类型定义 ====================

interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
  requiresBaseUrl: boolean;
}

// 预定义的 LLM 提供商配置
const PREDEFINED_PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: '',
    defaultModel: 'claude-sonnet-4-6',
    apiKeyPlaceholder: 'sk-ant-...',
    requiresBaseUrl: false
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    apiKeyPlaceholder: 'sk-...',
    requiresBaseUrl: false
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
    requiresBaseUrl: false
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    apiKeyPlaceholder: 'sk-...',
    requiresBaseUrl: false
  },
  glm: {
    id: 'glm',
    name: 'GLM (智谱AI)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4',
    apiKeyPlaceholder: '...',
    requiresBaseUrl: false
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o',
    apiKeyPlaceholder: 'sk-or-...',
    requiresBaseUrl: false
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    apiKeyPlaceholder: 'ollama (无需Key)',
    requiresBaseUrl: false
  },
  custom: {
    id: 'custom',
    name: '自定义 OpenAI 兼容',
    baseUrl: '',
    defaultModel: '',
    apiKeyPlaceholder: 'API Key',
    requiresBaseUrl: true
  }
};

interface LLMWikiSettings {
  provider: string; // 使用预定义提供商的ID（如 'anthropic', 'openai', 'deepseek'等）或 'custom'
  apiKey: string;
  baseUrl: string; // 自定义endpoint（当provider为'custom'时使用，或覆盖预设值）
  model: string;
  wikiFolder: string;
  availableModels?: string[]; // 动态获取的可用模型列表（临时存储，不持久化）
  useCustomModel?: boolean; // 是否使用自定义模型名称（而非下拉选择）
}

const DEFAULT_SETTINGS: LLMWikiSettings = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  model: 'claude-sonnet-4-6',
  wikiFolder: 'wiki',
  availableModels: [],
  useCustomModel: false
}

// ==================== 辅助函数 ====================

function slugify(text: string): string {
  console.log('slugify 输入:', text, '长度:', text?.length);

  if (!text || text.trim().length === 0) {
    console.warn('slugify: 输入文本为空');
    return 'untitled';
  }

  const trimmed = text.trim();
  console.log('trim 后:', trimmed, '长度:', trimmed.length);

  // 步骤1: 移除文件系统不支持的字符 + 控制字符
  // 保留所有可见字符（Unicode > 32），包括中文、英文、数字、符号等
  const afterRemoveInvalid = trimmed.replace(/[\/\\:*?"<>|\x00-\x1f]/g, '');
  console.log('移除无效字符后:', afterRemoveInvalid, '长度:', afterRemoveInvalid.length);

  // 如果移除无效字符后为空，说明输入全是无效字符
  if (afterRemoveInvalid.length === 0) {
    console.warn('slugify: 移除无效字符后为空，使用备用名称');
    console.log('原始输入字符编码:', trimmed.split('').map(c => c.charCodeAt(0)));
    return 'untitled-' + Date.now();
  }

  // 步骤2: 空格转连字符
  const afterSpaceToDash = afterRemoveInvalid.replace(/\s+/g, '-');
  console.log('空格转连字符后:', afterSpaceToDash, '长度:', afterSpaceToDash.length);

  // 步骤3: 合并多个连字符
  const afterMergeDash = afterSpaceToDash.replace(/-+/g, '-');
  console.log('合并连字符后:', afterMergeDash, '长度:', afterMergeDash.length);

  // 步骤4: 移除开头和结尾的连字符
  const finalSlug = afterMergeDash.replace(/^-|-$/g, '').trim();
  console.log('最终 slug:', finalSlug, '长度:', finalSlug.length);

  // 最终检查：如果仍然为空，使用备用名称
  if (finalSlug.length === 0) {
    console.warn('slugify: 最终结果为空，使用备用名称');
    console.log('=== 调试信息 ===');
    console.log('原始输入字符编码:', trimmed.split('').map(c => c.charCodeAt(0)));
    console.log('处理后字符编码:', afterRemoveInvalid.split('').map(c => c.charCodeAt(0)));
    return 'untitled-' + Date.now();
  }

  return finalSlug;
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

function cleanMarkdownResponse(response: string): string {
  console.log('cleanMarkdownResponse 输入长度:', response.length);

  // 移除 markdown 代码块包裹
  // 模式1: ```markdown ... ```
  // 模式2: ``` ... ```
  // 模式3: ```md ... ```

  let cleaned = response.trim();

  // 尝试匹配代码块模式
  const codeBlockPatterns = [
    /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/gm,  // 完整代码块（多行）
    /^```(?:markdown|md)?\s*([\s\S]*?)```$/gm,       // 完整代码块（无换行）
    /^```(?:markdown|md)?\s*\n([\s\S]*)$/gm,         // 开头有代码块，结尾没有
    /^```(?:markdown|md)?\s*([\s\S]*)$/gm,           // 开头有代码块标记
  ];

  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // 提取代码块内容（去掉```标记）
      cleaned = cleaned.replace(pattern, '$1').trim();
      console.log('检测到代码块包裹，已移除');
      break;
    }
  }

  // 如果仍然有残留的```，手动移除开头和结尾
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/, '');
    console.log('移除开头的代码块标记');
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
    console.log('移除结尾的代码块标记');
  }

  console.log('cleanMarkdownResponse 输出长度:', cleaned.length);
  console.log('前50字符:', cleaned.substring(0, 50));

  return cleaned.trim();
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
    if (!this.settings.apiKey?.trim() && this.settings.provider !== 'ollama') {
      // Ollama 不需要 API Key
      this.llmClient = null;
      return;
    }

    try {
      const providerConfig = PREDEFINED_PROVIDERS[this.settings.provider];

      if (this.settings.provider === 'anthropic') {
        // Anthropic 使用自己的 SDK
        this.llmClient = new AnthropicClient(this.settings.apiKey.trim());
      } else {
        // 其他提供商都使用 OpenAI SDK（兼容接口）
        const baseUrl = this.settings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;
        const apiKey = this.settings.provider === 'ollama' ? 'ollama' : this.settings.apiKey.trim();

        this.llmClient = new OpenAIClient(apiKey, baseUrl);
      }

      console.log('LLM Client initialized:', this.settings.provider, 'baseUrl:', this.settings.baseUrl || PREDEFINED_PROVIDERS[this.settings.provider]?.baseUrl);
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

      const totalFiles = files.length;
      let successCount = 0;
      let failedCount = 0;
      const failedFiles: string[] = [];

      new Notice(`开始批量摄入 ${totalFiles} 个文件...`, 10000);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = `(${i + 1}/${totalFiles})`;

        try {
          console.log(`${progress} 开始摄入: ${file.path}`);
          await this.ingestSource(file);
          successCount++;
          console.log(`${progress} 摄入成功: ${file.path}`);
        } catch (error: any) {
          failedCount++;
          failedFiles.push(file.path);
          console.error(`${progress} 摄入失败: ${file.path}`, error);
          new Notice(`${progress} 摄入失败: ${file.basename}`, 3000);
        }
      }

      // 最终统计报告
      const summary = `批量摄入完成: 成功 ${successCount}/${totalFiles}, 失败 ${failedCount}`;
      new Notice(summary, 10000);
      console.log(summary);

      if (failedFiles.length > 0) {
        console.log('失败的文件列表:', failedFiles);
        new Notice(`失败的文件:\n${failedFiles.slice(0, 5).join('\n')}${failedFiles.length > 5 ? '\n...' : ''}`, 15000);
      }
    }).open();
  }

  async ingestSource(file: TFile) {
    if (!this.llmClient) {
      throw new Error('LLM Client not initialized');
    }

    console.log('=== 开始摄入流程 ===');
    console.log('源文件:', file.path);
    new Notice(`正在摄入: ${file.basename}...`);

    try {
      // 1. 确保 Wiki 文件夹结构存在
      console.log('[步骤 1] 确保 Wiki 文件夹结构...');
      await this.ensureWikiStructure();
      console.log('[步骤 1] 完成');

      // 2. 分析源文件
      console.log('[步骤 2] 分析源文件...');
      const analysis = await this.analyzeSource(file);
      if (!analysis) {
        throw new Error('源文件分析失败');
      }
      console.log('[步骤 2] 完成');
      console.log('分析结果:', JSON.stringify(analysis, null, 2));

      // 3. 创建摘要页
      console.log('[步骤 3] 创建摘要页...');
      const summaryPage = await this.createSummaryPage(file, analysis);
      analysis.created_pages.push(summaryPage);
      console.log('[步骤 3] 完成:', summaryPage);

      // 4. 创建/更新实体页
      console.log('[步骤 4] 创建实体页 (共 ' + analysis.entities.length + ' 个)...');
      let entityCount = 0;
      for (const entity of analysis.entities) {
        console.log(`  [实体 ${entityCount + 1}] ${entity.name}`);
        const entityPage = await this.createOrUpdateEntityPage(entity, analysis, file);
        if (entityPage) {
          analysis.created_pages.push(entityPage);
          console.log(`  [实体 ${entityCount + 1}] 完成: ${entityPage}`);
        }
        entityCount++;
      }
      console.log('[步骤 4] 完成');

      // 5. 创建/更新概念页
      console.log('[步骤 5] 创建概念页 (共 ' + analysis.concepts.length + ' 个)...');
      let conceptCount = 0;
      for (const concept of analysis.concepts) {
        console.log(`  [概念 ${conceptCount + 1}] ${concept.name}`);
        const conceptPage = await this.createOrUpdateConceptPage(concept, analysis, file);
        if (conceptPage) {
          analysis.created_pages.push(conceptPage);
          console.log(`  [概念 ${conceptCount + 1}] 完成: ${conceptPage}`);
        }
        conceptCount++;
      }
      console.log('[步骤 5] 完成');

      // 6. 更新相关现有页面
      console.log('[步骤 6] 更新相关页面 (共 ' + analysis.related_pages.length + ' 个)...');
      for (const relatedPageName of analysis.related_pages) {
        await this.updateRelatedPage(relatedPageName, analysis);
        analysis.updated_pages.push(relatedPageName);
      }
      console.log('[步骤 6] 完成');

      // 7. 标记矛盾
      console.log('[步骤 7] 标记矛盾 (共 ' + analysis.contradictions.length + ' 个)...');
      for (const contradiction of analysis.contradictions) {
        await this.noteContradiction(contradiction);
      }
      console.log('[步骤 7] 完成');

      // 8. 更新 Index 和 Log
      console.log('[步骤 8] 更新 Index 和 Log...');
      await this.generateIndex();
      await this.updateLog('ingest', analysis);
      console.log('[步骤 8] 完成');

      const message = `摄入成功: 创建 ${analysis.created_pages.length} 页, 更新 ${analysis.updated_pages.length} 页`;
      console.log('=== 摄入流程完成 ===');
      console.log(message);
      console.log('创建的页面:', analysis.created_pages);
      console.log('更新的页面:', analysis.updated_pages);
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

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async createOrUpdateEntityPage(entity: EntityInfo, analysis: SourceAnalysis, sourceFile: TFile): Promise<string | null> {
    // 验证实体名称
    if (!entity.name || entity.name.trim().length === 0) {
      console.warn('实体名称为空，跳过创建');
      return null;
    }

    console.log('=== 创建实体页 ===');
    console.log('entity.name:', entity.name);
    console.log('entity.name 字符编码:', entity.name.split('').map(c => c.charCodeAt(0)));
    console.log('类型:', entity.type);

    const slug = slugify(entity.name);
    console.log('生成的 slug:', slug);
    const path = `${this.settings.wikiFolder}/entities/${slug}.md`;
    console.log('目标路径:', path);

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

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
    return path;
  }

  async createOrUpdateConceptPage(concept: ConceptInfo, analysis: SourceAnalysis, sourceFile: TFile): Promise<string | null> {
    // 验证概念名称
    if (!concept.name || concept.name.trim().length === 0) {
      console.warn('概念名称为空，跳过创建');
      return null;
    }

    console.log('=== 创建概念页 ===');
    console.log('concept.name:', concept.name);
    console.log('concept.name 字符编码:', concept.name.split('').map(c => c.charCodeAt(0)));
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

    const cleanedContent = cleanMarkdownResponse(pageContent);
    await this.createOrUpdateFile(path, cleanedContent);
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

    const cleanedContent = cleanMarkdownResponse(updatedContent);
    await this.createOrUpdateFile(page.path, cleanedContent);
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

  async createOrUpdateFile(path: string, content: string): Promise<void> {
    console.log('createOrUpdateFile:', path);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          console.log(`尝试 ${attempt + 1}: 文件已存在，更新:`, path);
          await this.app.vault.modify(file, content);
          console.log('更新成功:', path);
          return; // 成功完成
        } else {
          console.log(`尝试 ${attempt + 1}: 文件不存在，创建:`, path);
          await this.app.vault.create(path, content);
          console.log('创建成功:', path);
          return; // 成功完成
        }
      } catch (error: any) {
        console.error(`尝试 ${attempt + 1} 失败:`, error.message);

        // 如果是因为文件已存在的错误，等待后重试
        if (error.message?.includes('File already exists') || error.message?.includes('already exists')) {
          console.log('文件已存在异常，等待100ms后重试:', path);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue; // 继续下一次尝试
        } else {
          // 其他错误直接抛出
          console.error('无法处理的错误:', path, error);
          throw error;
        }
      }
    }

    // 3次尝试后仍然失败，最后一次强制尝试更新
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

        const cleanedAnswer = cleanMarkdownResponse(answer);
        new AnswerModal(this.app, cleanedAnswer).open();

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

      const cleanedReport = cleanMarkdownResponse(report);
      new LintReportModal(this.app, cleanedReport).open();
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
      baseUrl: this.settings.baseUrl || PREDEFINED_PROVIDERS[this.settings.provider]?.baseUrl || '默认',
      model: this.settings.model
    });

    // Ollama 不需要 API Key
    const isOllama = this.settings.provider === 'ollama';
    if (!isOllama && (!this.settings.apiKey || this.settings.apiKey.trim() === '')) {
      return {
        success: false,
        message: 'API Key 未配置'
      };
    }

    try {
      // 临时初始化客户端进行测试
      let testClient: LLMClient;
      const providerConfig = PREDEFINED_PROVIDERS[this.settings.provider];

      if (this.settings.provider === 'anthropic') {
        testClient = new AnthropicClient(this.settings.apiKey.trim());
      } else {
        const baseUrl = this.settings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;
        const apiKey = isOllama ? 'ollama' : this.settings.apiKey.trim();
        testClient = new OpenAIClient(apiKey, baseUrl);
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
        message: `✅ 连接成功！提供商: ${providerConfig?.name || this.settings.provider}`
      };
    } catch (error: any) {
      console.error('连接测试失败:', error);
      return {
        success: false,
        message: `❌ 连接失败: ${error.message || '未知错误'}`
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
    const currentProvider = PREDEFINED_PROVIDERS[this.tempSettings.provider]?.name || '自定义';
    statusDiv.createEl('p', {
      text: `LLM Client: ${clientStatus} | 当前提供商: ${currentProvider}`,
      attr: { style: 'margin-bottom: 20px; font-weight: bold; font-size: 14px;' }
    });

    // ===== Provider 配置 =====
    containerEl.createEl('h3', { text: 'LLM Provider 配置' });

    // 1. Provider 下拉选择
    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('选择预定义提供商或自定义 OpenAI 兼容服务')
      .addDropdown(dropdown => {
        // 添加所有预定义提供商
        Object.values(PREDEFINED_PROVIDERS).forEach(config => {
          dropdown.addOption(config.id, config.name);
        });
        dropdown.setValue(this.tempSettings.provider);
        dropdown.onChange((value) => {
          this.tempSettings.provider = value;
          const config = PREDEFINED_PROVIDERS[value];

          // 自动填充预设配置
          if (config) {
            this.tempSettings.model = config.defaultModel;
            // 只有 custom 才需要手动配置 baseUrl，其他使用预设值
            if (value !== 'custom') {
              this.tempSettings.baseUrl = config.baseUrl;
            }
          }

          this.display(); // 重新渲染UI
        });
      });

    // 2. API Key 输入框
    const providerConfig = PREDEFINED_PROVIDERS[this.tempSettings.provider];
    const isOllama = this.tempSettings.provider === 'ollama';

    if (!isOllama) {
      new Setting(containerEl)
        .setName('API Key')
        .setDesc(providerConfig?.apiKeyPlaceholder || '输入 API Key')
        .addText(text => text
          .setPlaceholder(providerConfig?.apiKeyPlaceholder || 'API Key')
          .setValue(this.tempSettings.apiKey)
          .onChange((value) => {
            this.tempSettings.apiKey = value;
          }));
    } else {
      containerEl.createEl('p', {
        text: 'ℹ️ Ollama 运行在本地，无需 API Key',
        attr: { style: 'color: #666; margin: 10px 0; font-size: 13px;' }
      });
    }

    // 3. Base URL（仅 custom 或需要修改预设时显示）
    if (this.tempSettings.provider === 'custom' || (providerConfig && this.tempSettings.baseUrl !== providerConfig.baseUrl)) {
      new Setting(containerEl)
        .setName('API Base URL')
        .setDesc(this.tempSettings.provider === 'custom'
          ? '必填：自定义 OpenAI 兼容服务的 endpoint'
          : '可选：覆盖预设的 Base URL')
        .addText(text => text
          .setPlaceholder(providerConfig?.baseUrl || 'https://api.example.com/v1')
          .setValue(this.tempSettings.baseUrl)
          .onChange((value) => {
            this.tempSettings.baseUrl = value;
          }));
    }

    // 4. 模型选择（下拉 + 自定义输入）
    containerEl.createEl('h4', {
      text: '模型选择',
      attr: { style: 'margin-top: 20px; color: #888; font-size: 13px;' }
    });

    // 获取模型列表按钮
    new Setting(containerEl)
      .setName('获取可用模型')
      .setDesc('从 Provider API 获取最新的模型列表')
      .addButton(button => button
        .setButtonText('获取模型列表')
        .onClick(async () => {
          button.setButtonText('获取中...');
          button.setDisabled(true);

          try {
            // 临时初始化客户端获取模型列表
            let tempClient: LLMClient;
            const apiKey = isOllama ? 'ollama' : this.tempSettings.apiKey.trim();
            const baseUrl = this.tempSettings.baseUrl?.trim() || providerConfig?.baseUrl || undefined;

            if (this.tempSettings.provider === 'anthropic') {
              tempClient = new AnthropicClient(this.tempSettings.apiKey.trim());
            } else {
              tempClient = new OpenAIClient(apiKey, baseUrl);
            }

            if (tempClient.listModels) {
              const models = await tempClient.listModels();
              this.tempSettings.availableModels = models;

              if (models.length > 0) {
                new Notice(`获取成功！共 ${models.length} 个可用模型`, 5000);
                // 默认选择第一个模型
                if (!this.tempSettings.model || !models.includes(this.tempSettings.model)) {
                  this.tempSettings.model = models[0];
                }
              } else {
                new Notice('获取失败或列表为空，请手动输入模型名称', 5000);
                this.tempSettings.useCustomModel = true;
              }

              this.display(); // 重新渲染UI
            } else {
              new Notice('该 Provider 不支持模型列表查询', 5000);
            }
          } catch (error: any) {
            console.error('获取模型列表失败:', error);
            new Notice(`获取失败: ${error.message}`, 8000);
            this.tempSettings.useCustomModel = true;
            this.display();
          }

          button.setButtonText('获取模型列表');
          button.setDisabled(false);
        }));

    // 模型选择下拉框（如果有可用模型列表）
    if (this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0 && !this.tempSettings.useCustomModel) {
      new Setting(containerEl)
        .setName('选择模型')
        .setDesc(`从 ${this.tempSettings.availableModels.length} 个可用模型中选择`)
        .addDropdown(dropdown => {
          this.tempSettings.availableModels.forEach(model => {
            dropdown.addOption(model, model);
          });
          dropdown.addOption('__custom__', '自定义输入...');
          dropdown.setValue(this.tempSettings.model);
          dropdown.onChange((value) => {
            if (value === '__custom__') {
              this.tempSettings.useCustomModel = true;
              this.display(); // 切换到自定义输入模式
            } else {
              this.tempSettings.model = value;
              this.tempSettings.useCustomModel = false;
            }
          });
        });

      // 切换到自定义输入的按钮（隐藏）
      containerEl.createEl('p', {
        text: '💡 如需使用其他模型，请选择"自定义输入..."',
        attr: { style: 'color: #666; margin: 5px 0; font-size: 12px;' }
      });
    } else {
      // 自定义模型输入框（无模型列表或用户选择自定义）
      new Setting(containerEl)
        .setName('模型名称')
        .setDesc(this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0
          ? '当前使用自定义模型（可点击上方按钮重新获取列表）'
          : providerConfig
            ? `推荐: ${providerConfig.defaultModel}`
            : '手动输入模型名称')
        .addText(text => text
          .setPlaceholder(providerConfig?.defaultModel || 'model-name')
          .setValue(this.tempSettings.model)
          .onChange((value) => {
            this.tempSettings.model = value;
          }));

      // 如果之前有获取过模型列表，提供切换回下拉选择的选项
      if (this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0) {
        new Setting(containerEl)
          .setName('切换到下拉选择')
          .setDesc('')
          .addButton(button => button
            .setButtonText('使用下拉选择')
            .onClick(() => {
              this.tempSettings.useCustomModel = false;
              this.display();
            }));
      }
    }

    // ===== 测试和保存按钮 =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });

    new Setting(containerEl)
      .setName('测试连接')
      .setDesc('验证配置是否能成功调用 LLM API')
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
      .setDesc('保存当前配置')
      .addButton(button => button
        .setButtonText('保存设置')
        .setCta()
        .onClick(async () => {
          this.plugin.settings = { ...this.tempSettings };
          await this.plugin.saveSettings();

          new Notice('设置已保存！', 3000);
          this.display();
        }));

    // ===== Wiki 配置 =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    containerEl.createEl('h3', { text: 'Wiki 文件夹配置' });

    new Setting(containerEl)
      .setName('Wiki 文件夹')
      .setDesc('存放生成的 Wiki 页面')
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