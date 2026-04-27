import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, Notice, Modal, FuzzySuggestModal, MarkdownRenderer } from 'obsidian';
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
  // Core message creation (with system parameter support)
  createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string; // System prompt (independent parameter for Anthropic)
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string>;

  // Optional streaming method (backward compatible)
  createMessageStream?(params: {
    model: string;
    max_tokens: number;
    system?: string; // System prompt for streaming
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string>;

  listModels?(): Promise<string[]>; // Optional: get available models list
}

class AnthropicClient implements LLMClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    // Anthropic API: system is independent parameter, not in messages
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.max_tokens,
      system: params.system || undefined, // Pass system prompt if provided
      messages: params.messages
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  // New streaming method
  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string> {
    // Build messages with language hint (only if no system prompt)
    const messagesWithLanguageHint = params.system
      ? params.messages // System prompt already contains instructions
      : [
        ...params.messages,
        {
          role: 'user',
          content: 'Please respond in the same language as the user\'s question. If the user asks in Chinese, reply in Chinese. If the user asks in English, reply in English. Keep the response language consistent with the user\'s input language.'
        }
      ];

    const stream = await this.client.messages.stream({
      model: params.model,
      max_tokens: params.max_tokens,
      system: params.system || undefined, // Pass system prompt
      messages: messagesWithLanguageHint as any
    });

    let fullResponse = '';

    stream.on('text', (text) => {
      fullResponse += text;
      params.onChunk(text);
    });

    await stream.finalMessage();
    return fullResponse;
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
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    // OpenAI API: system message goes in messages array with role='system'
    const messagesWithSystem = params.system
      ? [
        { role: 'system', content: params.system } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...params.messages
      ]
      : params.messages;

    const response = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: messagesWithSystem as OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    });
    return response.choices[0]?.message?.content || '';
  }

  // New streaming method
  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string> {
    // Build messages: system first, then conversation history
    const messagesWithSystemAndLanguage = params.system
      ? [
        { role: 'system', content: params.system } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...params.messages
      ]
      : [
        ...params.messages,
        {
          role: 'user',
          content: 'Please respond in the same language as the user\'s question. If the user asks in Chinese, reply in Chinese. If the user asks in English, reply in English. Keep the response language consistent with the user\'s input language.'
        }
      ];

    const stream = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: messagesWithSystemAndLanguage as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      stream: true
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullResponse += text;
        params.onChunk(text);
      }
    }

    return fullResponse;
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
  provider: string; // Predefined provider ID ('anthropic', 'openai', 'deepseek', etc.) or 'custom'
  apiKey: string;
  baseUrl: string; // Custom endpoint (used for 'custom' or overriding preset)
  model: string;
  wikiFolder: string;
  language: 'en' | 'zh'; // Interface language: English or Chinese
  availableModels?: string[]; // Dynamically fetched model list (temporary, not persisted)
  useCustomModel?: boolean; // Whether to use custom model name (instead of dropdown)
  maxConversationHistory: number; // Max conversation rounds (avoid token overflow)
  queryHistory?: Array<{ // Persisted Query Wiki conversation history
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
}

const DEFAULT_SETTINGS: LLMWikiSettings = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  model: 'claude-sonnet-4-6',
  wikiFolder: 'wiki',
  language: 'en', // Default: English (international users)
  availableModels: [],
  useCustomModel: false,
  maxConversationHistory: 30, // Default: 30 rounds (60 messages)
  queryHistory: [] // Initialize empty query history
}

// ==================== Internationalization Text System ====================

const TEXTS = {
  en: {
    // Plugin Info
    pluginTitle: 'Karpathy LLM Wiki Settings',
    pluginIntro: 'This plugin implements Karpathy\'s LLM Wiki concept for Obsidian.',
    conceptOrigin: 'Concept Origin:',
    featuresTitle: 'Core Features:',

    // Features List
    feature1: '✅ Multi-LLM Provider support (Anthropic, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama)',
    feature2: '✅ Auto-generate Wiki pages from sources',
    feature3: '✅ Bidirectional links [[wiki-links]]',
    feature4: '✅ Knowledge graph visualization',
    feature5: '✅ Query Wiki with synthesized answers',
    feature6: '✅ Auto-maintenance: detect contradictions, outdated info',

    // Status
    statusTitle: 'LLM Client Status',
    statusInitialized: '✅ Initialized',
    statusNotInitialized: '❌ Not initialized',
    currentProvider: 'Current Provider',

    // Language Switcher
    languageTitle: 'Interface Language',
    languageDesc: 'Select your preferred language for settings panel',
    languageEn: 'English',
    languageZh: 'Chinese (中文)',

    // Provider Configuration
    providerSection: 'LLM Provider Configuration',
    providerName: 'LLM Provider',
    providerDesc: 'Select predefined provider or custom OpenAI-compatible service',

    // API Key
    apiKeyName: 'API Key',
    apiKeyDesc: 'Enter your API key from provider',
    apiKeyPlaceholder: 'Enter API Key',

    // Base URL
    baseUrlName: 'API Base URL',
    baseUrlDescCustom: 'Required: Custom OpenAI-compatible endpoint',
    baseUrlDescOverride: 'Optional: Override preset Base URL',

    // Ollama Hint
    ollamaHint: 'ℹ️ Ollama runs locally, no API Key required',

    // Model Selection
    modelSection: 'Model Selection',
    fetchModelsName: 'Fetch Available Models',
    fetchModelsDesc: 'Get latest model list from Provider API',
    fetchModelsButton: 'Fetch Models',
    fetchingModels: 'Fetching...',
    fetchSuccess: '✅ Success! {} models available',
    fetchFailed: '⚠️ Failed or empty list, please input model name manually',
    fetchNotSupported: '⚠️ Provider doesn\'t support model list query',

    selectModelName: 'Select Model',
    selectModelDesc: 'Choose from {} available models',
    customInputOption: 'Custom input...',
    customInputHint: '💡 To use other models, select "Custom input..."',

    modelName: 'Model Name',
    modelDescCustom: 'Using custom model (click above button to re-fetch list)',
    modelDescRecommended: 'Recommended: {}',
    modelDescManual: 'Manually input model name',

    switchToDropdown: 'Switch to Dropdown Selection',
    useDropdownButton: 'Use Dropdown',

    // Test & Save
    testConnectionName: 'Test Connection',
    testConnectionDesc: 'Validate configuration can successfully call LLM API',
    testButton: 'Test Connection',
    testing: 'Testing...',

    saveSettingsName: 'Save Settings',
    saveSettingsDesc: 'Save current configuration',
    saveButton: 'Save Settings',
    savedNotice: '✅ Settings saved!',

    // Wiki Folder
    wikiSection: 'Wiki Folder Configuration',
    wikiFolderName: 'Wiki Folder',
    wikiFolderDesc: 'Location for generated Wiki pages',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: '⚠️ Please configure API Key first',
    errorFetchFailed: '❌ Failed: {}',

    // Query Modal UI
    queryModalTitle: 'Query Wiki - Conversational Query',
    queryModalPlaceholder: 'Enter question... (Enter to send)',
    queryModalSendButton: 'Send',
    queryModalSaveButton: 'Save to Wiki',
    queryModalClearButton: 'Clear History',
    queryModalHistoryCount: 'Conversation history: {}/{} rounds',
    queryModalStreaming: 'Streaming...',
    queryModalHint: '💡 Queries based on Wiki content. Click "Save to Wiki" to extract valuable conversations as Wiki pages.',

    // Settings
    maxConversationHistoryName: 'Max Conversation History',
    maxConversationHistoryDesc: 'Limit conversation messages to avoid token overflow',
    maxConversationHistoryHint: 'Recommended: not exceed 50 rounds',

    // LLM Language Hint
    llmLanguageHint: 'Please answer in English.'
  },
  zh: {
    // Plugin Info
    pluginTitle: 'Karpathy LLM Wiki 设置',
    pluginIntro: '本插件实现了 Karpathy 的 LLM Wiki 概念，专为 Obsidian 设计。',
    conceptOrigin: '概念来源：',
    featuresTitle: '核心功能：',

    // Features List
    feature1: '✅ 多 LLM Provider 支持（Anthropic、OpenAI、DeepSeek、Kimi、GLM、OpenRouter、Ollama）',
    feature2: '✅ 自动从源文件生成 Wiki 页面',
    feature3: '✅ 双向链接 [[wiki-links]]',
    feature4: '✅ 知识图谱可视化',
    feature5: '✅ Wiki 查询并综合回答',
    feature6: '✅ 自动维护：检测矛盾、过时信息',

    // Status
    statusTitle: 'LLM Client 状态',
    statusInitialized: '✅ 已初始化',
    statusNotInitialized: '❌ 未初始化',
    currentProvider: '当前提供商',

    // Language Switcher
    languageTitle: '界面语言',
    languageDesc: '选择设置面板的显示语言',
    languageEn: 'English (英文)',
    languageZh: '中文',

    // Provider Configuration
    providerSection: 'LLM Provider 配置',
    providerName: 'LLM Provider',
    providerDesc: '选择预定义提供商或自定义 OpenAI 兼容服务',

    // API Key
    apiKeyName: 'API Key',
    apiKeyDesc: '输入提供商的 API Key',
    apiKeyPlaceholder: '输入 API Key',

    // Base URL
    baseUrlName: 'API Base URL',
    baseUrlDescCustom: '必填：自定义 OpenAI 兼容服务的 endpoint',
    baseUrlDescOverride: '可选：覆盖预设的 Base URL',

    // Ollama Hint
    ollamaHint: 'ℹ️ Ollama 本地运行，无需 API Key',

    // Model Selection
    modelSection: '模型选择',
    fetchModelsName: '获取可用模型',
    fetchModelsDesc: '从 Provider API 获取最新的模型列表',
    fetchModelsButton: '获取模型列表',
    fetchingModels: '获取中...',
    fetchSuccess: '✅ 获取成功！共 {} 个可用模型',
    fetchFailed: '⚠️ 获取失败或列表为空，请手动输入模型名称',
    fetchNotSupported: '⚠️ 该 Provider 不支持模型列表查询',

    selectModelName: '选择模型',
    selectModelDesc: '从 {} 个可用模型中选择',
    customInputOption: '自定义输入...',
    customInputHint: '💡 如需使用其他模型，请选择"自定义输入..."',

    modelName: '模型名称',
    modelDescCustom: '当前使用自定义模型（可重新获取列表）',
    modelDescRecommended: '推荐：{}',
    modelDescManual: '手动输入模型名称',

    switchToDropdown: '切换到下拉选择',
    useDropdownButton: '使用下拉选择',

    // Test & Save
    testConnectionName: '测试连接',
    testConnectionDesc: '验证配置能否成功调用 LLM API',
    testButton: '测试连接',
    testing: '测试中...',

    saveSettingsName: '保存设置',
    saveSettingsDesc: '保存当前配置',
    saveButton: '保存设置',
    savedNotice: '✅ 设置已保存！',

    // Wiki Folder
    wikiSection: 'Wiki 文件夹配置',
    wikiFolderName: 'Wiki 文件夹',
    wikiFolderDesc: '存放生成的 Wiki 页面',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: '⚠️ 请先配置 API Key',
    errorFetchFailed: '❌ 获取失败：{}',

    // Query Modal UI
    queryModalTitle: 'Query Wiki - 对话式查询',
    queryModalPlaceholder: '输入问题... (Enter发送)',
    queryModalSendButton: '发送',
    queryModalSaveButton: '保存到Wiki',
    queryModalClearButton: '清空历史',
    queryModalHistoryCount: '对话历史: {}/{} 轮',
    queryModalStreaming: '流式生成中...',
    queryModalHint: '💡 查询基于Wiki内容。点击"保存到Wiki"可将有价值对话提炼为Wiki页面。',

    // Settings
    maxConversationHistoryName: '对话历史上限',
    maxConversationHistoryDesc: '限制对话消息数，避免超出LLM token限制',
    maxConversationHistoryHint: '推荐：不超过50轮',

    // LLM Language Hint
    llmLanguageHint: '请用中文回答。'
  }
};

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
  console.log('parseJsonResponse 开始解析...');
  console.log('响应长度:', response.length);

  try {
    // 步骤1: 清理可能的 markdown 包裹
    let cleaned = response.trim();

    // 移除开头的 ```json 或 ``` 标记
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json|markdown|md)?\s*\n?/, '');
      console.log('移除开头的代码块标记');
    }

    // 移除结尾的 ``` 标记
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/\n?```$/, '');
      console.log('移除结尾的代码块标记');
    }

    cleaned = cleaned.trim();
    console.log('清理后长度:', cleaned.length);
    console.log('前100字符:', cleaned.substring(0, 100));

    // 步骤2: 尝试直接解析
    try {
      const result = JSON.parse(cleaned);
      console.log('✅ 直接解析成功');
      return result;
    } catch (directError) {
      console.warn('直接解析失败，尝试提取 JSON 对象');
    }

    // 步骤3: 提取 JSON 对象（可能被其他文本包围）
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('找到 JSON 对象，长度:', jsonMatch[0].length);
      try {
        const result = JSON.parse(jsonMatch[0]);
        console.log('✅ 提取后解析成功');
        return result;
      } catch (extractError) {
        console.error('提取后解析失败:', extractError);
        console.log('提取的 JSON 前200字符:', jsonMatch[0].substring(0, 200));

        // 步骤4: 尝试修复常见的 JSON 格式问题
        // 移除可能的尾随逗号
        let fixedJson = jsonMatch[0].replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
        try {
          const result = JSON.parse(fixedJson);
          console.log('✅ 修复后解析成功');
          return result;
        } catch (fixError) {
          console.error('修复后解析失败:', fixError);
        }
      }
    }

    // 步骤5: 如果所有尝试都失败，返回 null
    console.error('❌ JSON 解析完全失败');
    console.log('完整响应内容:', response);
    return null;

  } catch (error) {
    console.error('parseJsonResponse 异常:', error);
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
      name: 'Ingest Single Source (摄入单个源文件)',
      callback: () => this.selectSourceToIngest()
    });

    this.addCommand({
      id: 'ingest-folder',
      name: 'Ingest from Folder (从文件夹批量摄入)',
      callback: () => this.selectFolderToIngest()
    });

    this.addCommand({
      id: 'query-wiki',
      name: 'Query Wiki (查询 Wiki)',
      callback: () => this.queryWiki()
    });

    this.addCommand({
      id: 'lint-wiki',
      name: 'Lint Wiki (维护 Wiki)',
      callback: () => this.lintWiki()
    });

    this.addCommand({
      id: 'regenerate-index',
      name: 'Regenerate Index (重新生成索引)',
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
      new Notice('⚠️ Please configure API Key first (请先配置 API Key)');
      return;
    }

    new FileSuggestModal(this.app, async (file) => {
      await this.ingestSource(file);
    }).open();
  }

  async selectFolderToIngest() {
    if (!this.llmClient) {
      new Notice('⚠️ Please configure API Key first (请先配置 API Key)');
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
    console.log('=== 开始分析源文件 ===');
    console.log('文件:', file.path);

    const content = await this.app.vault.read(file);
    console.log('文件内容长度:', content.length);

    // 获取现有 Wiki 页面列表
    const existingPages = await this.getExistingWikiPages();
    const existingPagesList = existingPages.map(p => `- [[${p.title}]]`).join('\n');
    console.log('现有 Wiki 页面数量:', existingPages.length);

    // 构建 prompt
    const prompt = PROMPTS.analyzeSource
      .replace('{{content}}', content)
      .replace('{{existing_pages}}', existingPagesList);

    console.log('Prompt 长度:', prompt.length);
    console.log('调用 LLM 分析源文件...');

    try {
      const response = await this.llmClient.createMessage({
        model: this.settings.model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      console.log('LLM 响应长度:', response.length);
      console.log('响应前200字符:', response.substring(0, 200));

      const analysisData = parseJsonResponse(response);

      if (!analysisData) {
        console.error('❌ JSON 解析失败，返回 null');
        console.log('这可能导致 "源文件分析失败" 错误');
        return null;
      }

      console.log('✅ JSON 解析成功');
      console.log('解析结果包含字段:', Object.keys(analysisData));

      // 验证必要字段
      const requiredFields = ['source_title', 'summary', 'entities', 'concepts'];
      const missingFields = requiredFields.filter(field => !analysisData[field]);

      if (missingFields.length > 0) {
        console.error('❌ 缺少必要字段:', missingFields);
        return null;
      }

      console.log('✅ 所有必要字段存在');

      // 补充分析结果
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
      new Notice(TEXTS[this.settings.language].errorNoApiKey);
      return;
    }

    // Open new conversational QueryModal
    new QueryModal(this.app, this).open();
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

  // Convert conversation to Wiki knowledge
  async ingestConversation(history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  }): Promise<void> {
    if (!this.llmClient) {
      throw new Error('LLM Client not initialized');
    }

    console.log('=== Starting conversation extraction ===');

    // Get actual system date
    const actualDate = new Date().toISOString().split('T')[0];
    console.log('[系统时间]', actualDate);

    // 1. Format conversation to structured text
    const conversationText = this.formatConversation(history);

    // 2. LLM analysis (generate semantic title, extract knowledge)
    const analysisPrompt = this.settings.language === 'en'
      ? `You are a Wiki knowledge extraction assistant.

User conversation with AI:
${conversationText}

Convert this conversation into structured Wiki pages.

Focus on:
1. Extracting key knowledge points (not full conversation log)
2. Identifying core concepts and entities discussed
3. Summarizing conversation topic and conclusions

Actual conversation date: ${actualDate} (use this, do not generate date yourself)

Output JSON format:
{
  "source_title": "Semantic Topic Title (no date, describe the discussion topic)",
  "summary": "Conversation topic summary",
  "entities": [
    {
      "name": "Entity Name",
      "type": "person|organization|project|other",
      "summary": "Entity information summary"
    }
  ],
  "concepts": [
    {
      "name": "Concept Name",
      "type": "theory|method|technology|term|other",
      "summary": "Concept definition",
      "related_concepts": ["Related Concept 1", "Related Concept 2"]
    }
  ],
  "key_points": ["Point 1", "Point 2"],
  "created_pages": [],
  "updated_pages": []
}

Important:
- source_title should be semantic and descriptive, like: "Relationship Analysis of 太阳化忌 and 太阳化禄"
- NOT like: "Conversation Summary - ${actualDate}" (generic and unsearchable)
- Title should reflect the actual discussion topic for easy future retrieval`
      : `你是Wiki知识提取助手。

用户与AI的对话：
${conversationText}

将此对话转化为结构化Wiki页面。

重点：
1. 提取关键知识点（非完整对话日志）
2. 识别讨论的核心概念和实体
3. 总结对话主题和结论

实际对话日期：${actualDate}（请使用此日期，不要自己生成）

输出JSON格式：
{
  "source_title": "语义化主题标题（不含日期，描述讨论主题）",
  "summary": "对话主题总结",
  "entities": [
    {
      "name": "实体名称",
      "type": "person|organization|project|other",
      "summary": "实体信息总结"
    }
  ],
  "concepts": [
    {
      "name": "概念名称",
      "type": "theory|method|technology|term|other",
      "summary": "概念定义",
      "related_concepts": ["相关概念1", "相关概念2"]
    }
  ],
  "key_points": ["要点1", "要点2"],
  "created_pages": [],
  "updated_pages": []
}

重要：
- source_title应该语义化且描述性，如："太阳化忌与太阳化禄的关系分析"
- 不要用："对话总结 - ${actualDate}"（通用且无法检索）
- 标题应反映实际讨论主题，便于日后检索`;

    const analysis = await this.llmClient.createMessage({
      model: this.settings.model,
      max_tokens: 5000,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    });

    // 3. Parse JSON
    const parsed = parseJsonResponse(analysis);
    if (!parsed) {
      throw new Error('Conversation analysis JSON parsing failed');
    }

    console.log('[LLM分析结果]', parsed);
    console.log('[生成的标题]', parsed.source_title);

    // 4. Create conversation summary page with semantic filename
    await this.ensureWikiStructure();

    // Generate semantic filename from title
    const semanticSlug = slugify(parsed.source_title);
    const summaryPath = `${this.settings.wikiFolder}/sources/${semanticSlug}.md`;
    console.log('[语义化文件路径]', summaryPath);

    // Format: match standard source page structure (generateSummaryPage)
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

    // 5. Create entity pages (reuse existing logic)
    for (const entity of parsed.entities) {
      await this.createOrUpdateEntityPage(entity, parsed, { path: summaryPath, basename: semanticSlug } as any);
    }

    // 6. Create concept pages (reuse existing logic)
    for (const concept of parsed.concepts) {
      await this.createOrUpdateConceptPage(concept, parsed, { path: summaryPath, basename: semanticSlug } as any);
    }

    // 7. Update index and log
    await this.generateIndex();

    console.log('=== Conversation extraction complete ===');
    console.log('Created pages:', parsed.created_pages);
  }

  // Helper: format conversation history to text
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

  // Test LLM Provider connection
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
  tempSettings: LLMWikiSettings; // Temporary settings object

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.tempSettings = { ...plugin.settings }; // Initialize temporary settings
  }

  // Helper method to get localized text
  getText(key: string): string {
    const lang = this.tempSettings.language;
    const texts = TEXTS[lang];
    return texts[key as keyof typeof texts] || TEXTS.en[key as keyof typeof TEXTS.en] || key;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    // ===== Language Switcher =====
    new Setting(containerEl)
      .setName(this.getText('languageTitle'))
      .setDesc(this.getText('languageDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('en', this.getText('languageEn'));
        dropdown.addOption('zh', this.getText('languageZh'));
        dropdown.setValue(this.tempSettings.language);
        dropdown.onChange((value: 'en' | 'zh') => {
          this.tempSettings.language = value;
          this.display(); // Re-render with new language
        });
      });

    // ===== Plugin Introduction =====
    containerEl.createEl('h2', { text: this.getText('pluginTitle') });

    // Introduction Section
    const introDiv = containerEl.createDiv({ cls: 'llm-wiki-intro' });
    introDiv.createEl('p', {
      text: this.getText('pluginIntro'),
      attr: { style: 'margin-bottom: 10px; font-size: 14px;' }
    });
    introDiv.createEl('p', {
      text: `${this.getText('conceptOrigin')} [Andrej Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)`,
      attr: { style: 'margin-bottom: 15px; font-size: 13px; color: #666;' }
    });
    introDiv.createEl('p', {
      text: this.getText('featuresTitle'),
      attr: { style: 'margin-bottom: 5px; font-size: 14px; font-weight: bold;' }
    });

    const features = [
      this.getText('feature1'),
      this.getText('feature2'),
      this.getText('feature3'),
      this.getText('feature4'),
      this.getText('feature5'),
      this.getText('feature6')
    ];
    features.forEach(f => {
      introDiv.createEl('p', {
        text: f,
        attr: { style: 'margin: 3px 0; font-size: 12px;' }
      });
    });

    // ===== Status Display =====
    const statusDiv = containerEl.createDiv({ cls: 'llm-wiki-status' });
    const clientStatus = this.plugin.llmClient ? this.getText('statusInitialized') : this.getText('statusNotInitialized');
    const currentProvider = PREDEFINED_PROVIDERS[this.tempSettings.provider]?.name || 'Custom';
    statusDiv.createEl('p', {
      text: `${this.getText('statusTitle')}: ${clientStatus} | ${this.getText('currentProvider')}: ${currentProvider}`,
      attr: { style: 'margin-top: 20px; margin-bottom: 20px; font-weight: bold; font-size: 14px;' }
    });

    // ===== Provider Configuration =====
    containerEl.createEl('h3', { text: this.getText('providerSection') });

    // 1. Provider Dropdown
    new Setting(containerEl)
      .setName(this.getText('providerName'))
      .setDesc(this.getText('providerDesc'))
      .addDropdown(dropdown => {
        // Add all predefined providers
        Object.values(PREDEFINED_PROVIDERS).forEach(config => {
          dropdown.addOption(config.id, config.name);
        });
        dropdown.setValue(this.tempSettings.provider);
        dropdown.onChange((value) => {
          this.tempSettings.provider = value;
          const config = PREDEFINED_PROVIDERS[value];

          // Auto-fill preset configuration
          if (config) {
            this.tempSettings.model = config.defaultModel;
            // Only custom needs manual baseUrl configuration
            if (value !== 'custom') {
              this.tempSettings.baseUrl = config.baseUrl;
            }
          }

          this.display(); // Re-render UI
        });
      });

    // 2. API Key Input
    const providerConfig = PREDEFINED_PROVIDERS[this.tempSettings.provider];
    const isOllama = this.tempSettings.provider === 'ollama';

    if (!isOllama) {
      new Setting(containerEl)
        .setName(this.getText('apiKeyName'))
        .setDesc(this.getText('apiKeyDesc'))
        .addText(text => text
          .setPlaceholder(this.getText('apiKeyPlaceholder'))
          .setValue(this.tempSettings.apiKey)
          .onChange((value) => {
            this.tempSettings.apiKey = value;
          }));
    } else {
      containerEl.createEl('p', {
        text: this.getText('ollamaHint'),
        attr: { style: 'color: #666; margin: 10px 0; font-size: 13px;' }
      });
    }

    // 3. Base URL (only for custom or when modifying preset)
    if (this.tempSettings.provider === 'custom' || (providerConfig && this.tempSettings.baseUrl !== providerConfig.baseUrl)) {
      new Setting(containerEl)
        .setName(this.getText('baseUrlName'))
        .setDesc(this.tempSettings.provider === 'custom'
          ? this.getText('baseUrlDescCustom')
          : this.getText('baseUrlDescOverride'))
        .addText(text => text
          .setPlaceholder(providerConfig?.baseUrl || 'https://api.example.com/v1')
          .setValue(this.tempSettings.baseUrl)
          .onChange((value) => {
            this.tempSettings.baseUrl = value;
          }));
    }

    // 4. Model Selection (Dropdown + Custom Input)
    containerEl.createEl('h4', {
      text: this.getText('modelSection'),
      attr: { style: 'margin-top: 20px; color: #888; font-size: 13px;' }
    });

    // Fetch Model List Button
    new Setting(containerEl)
      .setName(this.getText('fetchModelsName'))
      .setDesc(this.getText('fetchModelsDesc'))
      .addButton(button => button
        .setButtonText(this.getText('fetchModelsButton'))
        .onClick(async () => {
          button.setButtonText(this.getText('fetchingModels'));
          button.setDisabled(true);

          try {
            // Temporarily initialize client to fetch models
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
                new Notice(this.getText('fetchSuccess').replace('{}', models.length.toString()), 5000);
                // Default select first model
                if (!this.tempSettings.model || !models.includes(this.tempSettings.model)) {
                  this.tempSettings.model = models[0];
                }
              } else {
                new Notice(this.getText('fetchFailed'), 5000);
                this.tempSettings.useCustomModel = true;
              }

              this.display(); // Re-render UI
            } else {
              new Notice(this.getText('fetchNotSupported'), 5000);
            }
          } catch (error: any) {
            console.error('Failed to fetch model list:', error);
            new Notice(this.getText('errorFetchFailed').replace('{}', error.message), 8000);
            this.tempSettings.useCustomModel = true;
            this.display();
          }

          button.setButtonText(this.getText('fetchModelsButton'));
          button.setDisabled(false);
        }));

    // Model Selection Dropdown (if available models list exists)
    if (this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0 && !this.tempSettings.useCustomModel) {
      new Setting(containerEl)
        .setName(this.getText('selectModelName'))
        .setDesc(this.getText('selectModelDesc').replace('{}', this.tempSettings.availableModels.length.toString()))
        .addDropdown(dropdown => {
          this.tempSettings.availableModels.forEach(model => {
            dropdown.addOption(model, model);
          });
          dropdown.addOption('__custom__', this.getText('customInputOption'));
          dropdown.setValue(this.tempSettings.model);
          dropdown.onChange((value) => {
            if (value === '__custom__') {
              this.tempSettings.useCustomModel = true;
              this.display(); // Switch to custom input mode
            } else {
              this.tempSettings.model = value;
              this.tempSettings.useCustomModel = false;
            }
          });
        });

      // Hint for custom input
      containerEl.createEl('p', {
        text: this.getText('customInputHint'),
        attr: { style: 'color: #666; margin: 5px 0; font-size: 12px;' }
      });
    } else {
      // Custom Model Input (no model list or user selected custom)
      new Setting(containerEl)
        .setName(this.getText('modelName'))
        .setDesc(this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0
          ? this.getText('modelDescCustom')
          : providerConfig
            ? this.getText('modelDescRecommended').replace('{}', providerConfig.defaultModel)
            : this.getText('modelDescManual'))
        .addText(text => text
          .setPlaceholder(providerConfig?.defaultModel || 'model-name')
          .setValue(this.tempSettings.model)
          .onChange((value) => {
            this.tempSettings.model = value;
          }));

      // Switch back to dropdown selection
      if (this.tempSettings.availableModels && this.tempSettings.availableModels.length > 0) {
        new Setting(containerEl)
          .setName(this.getText('switchToDropdown'))
          .setDesc('')
          .addButton(button => button
            .setButtonText(this.getText('useDropdownButton'))
            .onClick(() => {
              this.tempSettings.useCustomModel = false;
              this.display();
            }));
      }
    }

    // ===== Test and Save Buttons =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });

    new Setting(containerEl)
      .setName(this.getText('testConnectionName'))
      .setDesc(this.getText('testConnectionDesc'))
      .addButton(button => button
        .setButtonText(this.getText('testButton'))
        .onClick(async () => {
          button.setButtonText(this.getText('testing'));
          button.setDisabled(true);

          // Temporarily apply settings for testing
          const testSettings = { ...this.tempSettings };
          this.plugin.settings = testSettings;
          this.plugin.initializeLLMClient();

          const result = await this.plugin.testLLMConnection();

          button.setButtonText(this.getText('testButton'));
          button.setDisabled(false);

          if (result.success) {
            new Notice(result.message, 5000);
          } else {
            new Notice(result.message, 8000);
          }
        }));

    new Setting(containerEl)
      .setName(this.getText('saveSettingsName'))
      .setDesc(this.getText('saveSettingsDesc'))
      .addButton(button => button
        .setButtonText(this.getText('saveButton'))
        .setCta()
        .onClick(async () => {
          this.plugin.settings = { ...this.tempSettings };
          await this.plugin.saveSettings();

          new Notice(this.getText('savedNotice'), 3000);
          this.display();
        }));

    // ===== Wiki Configuration =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    containerEl.createEl('h3', { text: this.getText('wikiSection') });

    new Setting(containerEl)
      .setName(this.getText('wikiFolderName'))
      .setDesc(this.getText('wikiFolderDesc'))
      .addText(text => text
        .setPlaceholder(this.getText('wikiFolderPlaceholder'))
        .setValue(this.tempSettings.wikiFolder)
        .onChange((value) => {
          this.tempSettings.wikiFolder = value;
        }));

    // ===== Query Configuration =====
    containerEl.createEl('hr', { attr: { style: 'margin: 30px 0;' } });
    containerEl.createEl('h3', { text: TEXTS[this.plugin.settings.language].language === 'en'
      ? 'Wiki Query Configuration'
      : 'Wiki 查询配置'
    });

    new Setting(containerEl)
      .setName(this.getText('maxConversationHistoryName'))
      .setDesc(this.getText('maxConversationHistoryDesc'))
      .addText(text => text
        .setValue(this.tempSettings.maxConversationHistory.toString())
        .setPlaceholder('10')
        .onChange((value) => {
          const parsed = parseInt(value);
          if (parsed >= 1 && parsed <= 50) {
            this.tempSettings.maxConversationHistory = parsed;
          } else {
            new Notice(
              this.plugin.settings.language === 'en'
                ? 'Please enter a number between 1-50'
                : '请输入1-50之间的数字',
              3000
            );
          }
        }));

    // Hint text
    containerEl.createEl('p', {
      text: this.getText('maxConversationHistoryHint'),
      attr: {
        style: 'color: #999; font-size: 11px; margin: 5px 0;'
      }
    });
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

// ==================== Conversational Query Modal ====================

class QueryModal extends Modal {
  plugin: LLMWikiPlugin;
  history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  };
  isStreaming: boolean;
  accumulatedResponse: string;
  currentResponseDiv: HTMLElement | null;
  historyContainer: HTMLElement;
  inputArea: HTMLTextAreaElement;
  historyCountDisplay: HTMLElement;

  constructor(app: App, plugin: LLMWikiPlugin) {
    super(app);
    this.plugin = plugin;
    // Load persisted history from settings
    this.history = {
      messages: plugin.settings.queryHistory || []
    };
    this.isStreaming = false;
    this.accumulatedResponse = '';
    this.currentResponseDiv = null;
    this.historyContainer = null as any;
    this.inputArea = null as any;
    this.historyCountDisplay = null as any;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const texts = TEXTS[this.plugin.settings.language];

    // Modal styling (ChatGPT-style dimensions)
    this.modalEl.style.width = '800px';
    this.modalEl.style.height = '600px';
    contentEl.style.height = '100%';

    // Create container with flex layout
    const container = contentEl.createDiv({
      attr: {
        style: 'display: flex; flex-direction: column; height: 100%; overflow: hidden;'
      }
    });

    // Header (fixed)
    const header = container.createDiv({
      attr: {
        style: 'background: #4caf50; color: white; padding: 12px; font-weight: bold; font-size: 16px; flex-shrink: 0;'
      }
    });
    header.setText(texts.queryModalTitle);

    // Hint text below header
    const hintText = container.createDiv({
      attr: {
        style: 'background: #fff3e0; padding: 8px 16px; font-size: 13px; color: #666; flex-shrink: 0;'
      }
    });
    hintText.setText(texts.queryModalHint);

    // History container (scrollable)
    this.historyContainer = container.createDiv({
      attr: {
        style: 'flex: 1; min-height: 0; overflow-y: auto; padding: 16px; background: #f9f9f9;'
      }
    });

    // Render existing history (if any)
    this.history.messages.forEach(msg => {
      this.renderHistoryMessage(msg.role, msg.content);
    });

    // Fixed bottom input area
    const inputContainer = container.createDiv({
      attr: {
        style: 'border-top: 2px solid #ddd; padding: 16px; background: white; flex-shrink: 0;'
      }
    });

    // Textarea input
    this.inputArea = inputContainer.createEl('textarea', {
      attr: {
        placeholder: texts.queryModalPlaceholder,
        rows: '3',
        style: 'width: 100%; resize: none; font-size: 14px; padding: 8px;'
      }
    });

    // Enter key to send
    this.inputArea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        if (this.inputArea.value.trim() && !this.isStreaming) {
          this.sendMessage(this.inputArea.value);
          this.inputArea.value = '';
        }
      }
    });

    // Button row
    const buttonRow = inputContainer.createDiv({
      attr: {
        style: 'display: flex; gap: 8px; margin-top: 8px;'
      }
    });

    // Send button
    buttonRow.createEl('button', {
      text: texts.queryModalSendButton,
      attr: {
        style: 'flex: 2; background: #2196f3; color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      if (this.inputArea.value.trim() && !this.isStreaming) {
        this.sendMessage(this.inputArea.value);
        this.inputArea.value = '';
      }
    });

    // Save to Wiki button
    buttonRow.createEl('button', {
      text: texts.queryModalSaveButton,
      attr: {
        style: 'flex: 1; background: #4caf50; color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      if (this.history.messages.length > 0) {
        this.saveToWiki();
      }
    });

    // Clear history button
    buttonRow.createEl('button', {
      text: texts.queryModalClearButton,
      attr: {
        style: 'background: #999; color: white; padding: 8px; cursor: pointer; border: none; border-radius: 4px;'
      }
    }).addEventListener('click', () => {
      this.clearHistory();
    });

    // History count display
    this.historyCountDisplay = inputContainer.createDiv({
      attr: {
        style: 'margin-top: 8px; font-size: 11px; color: #999;'
      }
    });
    const currentRounds = Math.floor(this.history.messages.length / 2);
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', currentRounds.toString())
        .replace('{}', maxRounds.toString())
    );
  }

  onClose() {
    const { contentEl } = this;

    // Save history to settings before closing
    this.plugin.settings.queryHistory = this.history.messages;
    this.plugin.saveSettings();

    contentEl.empty();
  }

  // Placeholder methods (implemented in Tasks 6-7)
  async sendMessage(userMessage: string) {
    if (!userMessage.trim() || this.isStreaming) return;

    const texts = TEXTS[this.plugin.settings.language];

    // 1. Add user message to history
    this.history.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // 2. Render user message
    this.renderHistoryMessage('user', userMessage);

    // 3. Limit history length
    this.limitHistory();

    // 4. Create streaming response container
    const wrapperDiv = this.historyContainer.createDiv({
      attr: {
        style: 'margin-bottom: 16px; display: flex; justify-content: flex-start;'
      }
    });

    this.currentResponseDiv = wrapperDiv.createDiv({
      attr: {
        style: 'background: white; padding: 12px 16px; border-radius: 12px 12px 12px 0; border: 1px solid #e0e0e0; max-width: 80%;'
      }
    });

    this.currentResponseDiv.createEl('strong', {
      text: '🤖 Wiki:',
      attr: {
        style: 'color: #4caf50;'
      }
    });

    const contentDiv = this.currentResponseDiv.createDiv({
      attr: {
        style: 'margin-top: 8px;'
      }
    });

    // Streaming indicator
    const streamingIndicator = this.currentResponseDiv.createDiv({
      text: texts.queryModalStreaming,
      attr: {
        style: 'font-size: 11px; color: #4caf50; margin-top: 4px;'
      }
    });

    this.isStreaming = true;
    this.accumulatedResponse = '';

    // 5. Build Wiki context as system prompt
    const wikiContext = await this.buildWikiContext(userMessage);

    // Conversation history (only user/assistant messages)
    const conversationMessages = this.history.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 6. Call streaming API with system prompt
    try {
      // Check if streaming is supported
      if (this.plugin.llmClient?.createMessageStream) {
        const fullResponse = await this.plugin.llmClient.createMessageStream({
          model: this.plugin.settings.model,
          max_tokens: 3000,
          system: wikiContext, // System prompt (independent parameter)
          messages: conversationMessages, // Only conversation history
          language: this.plugin.settings.language,
          onChunk: (chunk) => {
            this.accumulatedResponse += chunk;
            this.renderMarkdownContent(this.accumulatedResponse, contentDiv);
          }
        });

        // 7. Add to history
        this.history.messages.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now()
        });

        // Remove streaming indicator
        streamingIndicator.remove();
        this.currentResponseDiv.style.border = '1px solid #e0e0e0';

      } else {
        // Fallback to non-streaming
        const response = await this.plugin.llmClient!.createMessage({
          model: this.plugin.settings.model,
          max_tokens: 3000,
          system: wikiContext, // System prompt
          messages: conversationMessages // Only conversation history
        });

        this.history.messages.push({
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        });

        this.renderMarkdownContent(response, contentDiv);
        streamingIndicator.remove();
      }

    } catch (error: any) {
      console.error('Query failed:', error);
      contentDiv.setText(`Error: ${error.message}`);
      streamingIndicator.remove();
    }

    this.isStreaming = false;
    this.currentResponseDiv = null;

    // Update history count display
    const currentRounds = Math.floor(this.history.messages.length / 2);
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', currentRounds.toString())
        .replace('{}', maxRounds.toString())
    );
  }
  streamResponse(chunk: string) {
    // Accumulate and render (already handled in sendMessage)
    this.accumulatedResponse += chunk;
  }

  renderMarkdownContent(content: string, container: HTMLElement) {
    container.empty();

    // Use Obsidian's built-in MarkdownRenderer
    // sourcePath: '' (vault root) - links must include full path from vault root
    // Link format: [[wiki/entities/page]] or [[wiki/concepts/page]]
    // This ensures links resolve to actual files regardless of wiki folder location

    MarkdownRenderer.renderMarkdown(
      content,
      container,
      '',  // Vault root - links resolve from vault root
      this.plugin
    );
  }
  renderHistoryMessage(role: 'user' | 'assistant', content: string) {
    const texts = TEXTS[this.plugin.settings.language];

    const messageWrapper = this.historyContainer.createDiv({
      attr: {
        style: role === 'user'
          ? 'margin-bottom: 16px; display: flex; justify-content: flex-end;'
          : 'margin-bottom: 16px; display: flex; justify-content: flex-start;'
      }
    });

    const messageBubble = messageWrapper.createDiv({
      attr: {
        style: role === 'user'
          ? 'background: #2196f3; color: white; padding: 12px 16px; border-radius: 12px 12px 0 12px; max-width: 80%;'
          : 'background: white; padding: 12px 16px; border-radius: 12px 12px 12px 0; border: 1px solid #e0e0e0; max-width: 80%;'
      }
    });

    const roleLabel = messageBubble.createEl('strong', {
      text: role === 'user' ? '👤 You:' : '🤖 Wiki:',
      attr: {
        style: role === 'user' ? 'color: white;' : 'color: #4caf50;'
      }
    });

    const contentDiv = messageBubble.createDiv({
      attr: {
        style: 'margin-top: 8px;'
      }
    });

    if (role === 'assistant') {
      // Render Markdown for assistant messages
      this.renderMarkdownContent(content, contentDiv);
    } else {
      // Plain text for user messages
      contentDiv.setText(content);
    }
  }
  limitHistory() {
    const texts = TEXTS[this.plugin.settings.language];
    const max = this.plugin.settings.maxConversationHistory;
    const totalMessages = this.history.messages.length;

    if (totalMessages > max * 2) {
      const keepCount = max * 2;
      this.history.messages = this.history.messages.slice(-keepCount);

      new Notice(
        this.plugin.settings.language === 'en'
          ? `History truncated to last ${max} rounds`
          : `历史已截断至最近${max}轮对话`,
        3000
      );

      // Re-render history container
      this.historyContainer.empty();
      this.history.messages.forEach(msg => {
        this.renderHistoryMessage(msg.role, msg.content);
      });
    }
  }
  async saveToWiki() {
    if (this.history.messages.length === 0) return;

    const texts = TEXTS[this.plugin.settings.language];
    new Notice(
      this.plugin.settings.language === 'en'
        ? 'Saving conversation to Wiki...'
        : '正在保存对话到Wiki...',
      3000
    );

    try {
      await this.plugin.ingestConversation(this.history);
      new Notice(
        this.plugin.settings.language === 'en'
          ? 'Conversation saved to Wiki!'
          : '对话已保存到Wiki！',
        5000
      );
    } catch (error: any) {
      console.error('Save failed:', error);
      new Notice(
        this.plugin.settings.language === 'en'
          ? `Save failed: ${error.message}`
          : `保存失败: ${error.message}`,
        8000
      );
    }
  }
  clearHistory() {
    this.history.messages = [];
    this.historyContainer.empty();

    // Clear persisted history in settings
    this.plugin.settings.queryHistory = [];
    this.plugin.saveSettings();

    new Notice(
      this.plugin.settings.language === 'en'
        ? 'History cleared'
        : '历史已清空',
      2000
    );

    // Update count display
    const texts = TEXTS[this.plugin.settings.language];
    const maxRounds = this.plugin.settings.maxConversationHistory;
    this.historyCountDisplay.setText(
      texts.queryModalHistoryCount
        .replace('{}', '0')
        .replace('{}', maxRounds.toString())
    );
  }

  async buildWikiContext(userMessage: string): Promise<string> {
    console.log('=== buildWikiContext开始 ===');
    console.log('用户问题:', userMessage);

    try {
      // 1. Read index.md
      const indexPath = `${this.plugin.settings.wikiFolder}/index.md`;
      console.log('[步骤1] 读取index.md路径:', indexPath);
      const indexContent = await this.plugin.tryReadFile(indexPath);
      console.log('[步骤1] index.md内容:', indexContent ? '已读取' : '不存在');

      if (!indexContent) {
        console.log('[步骤1] Wiki为空，返回提示');
        return this.plugin.settings.language === 'en'
          ? 'You are a Wiki assistant. The Wiki is empty. Please answer based on your knowledge and suggest the user ingest sources first.'
          : '你是Wiki助手。Wiki目前为空。请基于你的知识回答，并建议用户先摄入源文件。';
      }

      // 2. Use LLM to select relevant pages from index
      console.log('[步骤2] 让LLM选择相关页面...');
      const relevantPages = await this.selectRelevantPagesWithLLM(userMessage, indexContent);
      console.log('[步骤2] LLM选择的页面:', relevantPages);

      // 3. Load relevant page content
      console.log('[步骤3] 加载相关页面内容...');
      const pagesContent = await this.loadRelevantPages(relevantPages);
      console.log('[步骤3] 加载的页面内容数量:', pagesContent.length);
      pagesContent.forEach((content, i) => {
        console.log(`[步骤3] 页面${i+1}内容长度:`, content.length);
      });

      // 4. Build Wiki context system message
      const wikiContext = this.plugin.settings.language === 'en'
        ? `You are a Wiki assistant with access to a structured knowledge base.

Wiki Index:
${indexContent}

Relevant Wiki Pages (loaded with full content):
${pagesContent.length > 0 ? pagesContent.join('\n\n---\n\n') : 'No directly relevant pages found in Wiki.'}

Instructions:
- Answer based on the Wiki pages above (not general knowledge)
- Use ONLY Obsidian's wiki-link syntax: [[wiki/entities/page-name]] (NOT HTML links)
- Link format MUST include wiki folder: [[${this.plugin.settings.wikiFolder}/entities/page-name]]

CRITICAL RULES:
✅ CORRECT: [[wiki/entities/太阳化忌]], [[wiki/concepts/机器学习]]
❌ WRONG: <a href="...">, [link text](url), [[太阳化忌]], [[entities/太阳化忌]]
- Obsidian wiki-links use DOUBLE brackets: [[path]]
- NO HTML: Never use <a href="...">text</a>
- NO Markdown external links: Never use [text](url)
- Include wiki/ prefix: Links must start with [[wiki/...

If Wiki lacks relevant information:
- Acknowledge it and suggest ingesting more sources
- Do NOT make up information outside Wiki

Respond in the same language as the user's question`
        : `你是Wiki助手，拥有结构化知识库的访问权限。

Wiki索引：
${indexContent}

相关Wiki页面（已加载完整内容）：
${pagesContent.length > 0 ? pagesContent.join('\n\n---\n\n') : '未在Wiki中找到直接相关的页面。'}

指令：
- 基于上述Wiki页面内容回答问题（而非通用知识）
- 使用Obsidian特有的双向链接语法：[[wiki/entities/页面名]]（不是HTML链接）
- 链接格式必须包含wiki文件夹：[[${this.plugin.settings.wikiFolder}/entities/页面名]]

关键规则：
✅ 正确：[[wiki/entities/太阳化忌]], [[wiki/concepts/机器学习]]
❌ 错误：<a href="...">, [链接文字](url), [[太阳化忌]], [[entities/太阳化忌]]
- Obsidian双向链接使用双层方括号：[[路径]]
- 禁止HTML：绝不使用<a href="...">文字</a>
- 禁止Markdown外链：绝不使用[文字](url)
- 包含wiki/前缀：链接必须以[[wiki/开头

如果Wiki缺少相关信息：
- 如实说明并建议摄入更多源文件
- 不要编造Wiki之外的信息

请用与用户提问相同的语言回答`;

      console.log('[步骤4] Wiki上下文构建完成');
      console.log('[步骤4] 上下文长度:', wikiContext.length);
      return wikiContext;
    } catch (error: any) {
      console.error('[错误] buildWikiContext失败:', error);
      return this.plugin.settings.language === 'en'
        ? 'You are a Wiki assistant. Failed to load Wiki context. Please answer based on your knowledge.'
        : '你是Wiki助手。加载Wiki上下文失败。请基于你的知识回答。';
    }
  }

  async selectRelevantPagesWithLLM(query: string, indexContent: string): Promise<string[]> {
    console.log('=== LLM选择相关页面开始 ===');

    const prompt = this.plugin.settings.language === 'en'
      ? `You are a Wiki page selector. Given a user query and the Wiki index, select the most relevant pages.

User Query: "${query}"

Wiki Index:
${indexContent}

Task:
1. Read the Wiki index above
2. Identify pages that are MOST relevant to the user's query
3. Consider page titles, summaries, and semantic relevance
4. Select top 3-5 most relevant pages

Output Format (strict JSON):
{
  "relevant_pages": [
    "entities/page-name-1",
    "concepts/page-name-2",
    "sources/page-name-3"
  ]
}

Important:
- Output ONLY the JSON object, no other text
- Page paths should match the format in Wiki links: "entities/name", "concepts/name", "sources/name"
- If no pages are relevant, output: {"relevant_pages": []}`
      : `你是Wiki页面选择器。根据用户问题和Wiki索引，选择最相关的页面。

用户问题："${query}"

Wiki索引：
${indexContent}

任务：
1. 阅读上述Wiki索引
2. 识别与用户问题最相关的页面
3. 考虑页面标题、摘要和语义相关性
4. 选择最相关的3-5个页面

输出格式（严格JSON）：
{
  "relevant_pages": [
    "entities/页面名称1",
    "concepts/页面名称2",
    "sources/页面名称3"
  ]
}

重要：
- 仅输出JSON对象，不要有其他文本
- 页面路径格式应与Wiki链接一致："entities/名称"、"concepts/名称"、"sources/名称"
- 如果没有相关页面，输出：{"relevant_pages": []}`;

    try {
      console.log('[LLM调用] 发送选择请求...');
      const response = await this.plugin.llmClient!.createMessage({
        model: this.plugin.settings.model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      console.log('[LLM响应] 原始响应:', response);

      // Parse JSON response
      const cleanedResponse = response.trim();
      const jsonMatch = cleanedResponse.match(/\{[^}]*"relevant_pages"[^}]*\}/);

      if (!jsonMatch) {
        console.error('[解析失败] 未找到JSON对象');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const pages = parsed.relevant_pages || [];

      console.log('[解析成功] 页面列表:', pages);
      return pages;
    } catch (error: any) {
      console.error('[LLM选择失败]', error);
      return [];
    }
  }

  async loadRelevantPages(pageTitles: string[]): Promise<string[]> {
    console.log('=== loadRelevantPages开始 ===');
    console.log('页面标题列表:', pageTitles);

    const pages: string[] = [];

    for (const title of pageTitles) {
      console.log(`[加载页面] 处理标题: "${title}"`);

      // Handle both "entities/page-name" and "page-name" formats
      const pagePath = title.includes('/')
        ? `${this.plugin.settings.wikiFolder}/${title}.md`
        : `${this.plugin.settings.wikiFolder}/${title}.md`;

      console.log(`[加载页面] 完整路径: "${pagePath}"`);

      const content = await this.plugin.tryReadFile(pagePath);
      console.log(`[加载页面] 文件是否存在: ${content ? '是' : '否'}`);

      if (content) {
        console.log(`[加载页面] 内容长度: ${content.length}`);
        console.log(`[加载页面] 内容前100字符: ${content.substring(0, 100)}`);
        // Display full vault path in title so LLM knows correct link format
        // title可能是 "entities/page", 显示为 "wiki/entities/page"
        const displayTitle = title.startsWith(this.plugin.settings.wikiFolder + '/')
          ? title
          : `${this.plugin.settings.wikiFolder}/${title}`;
        pages.push(`## ${displayTitle}\n\n${content}`);
      } else {
        console.warn(`[加载页面] 无法读取页面: ${pagePath}`);
      }
    }

    console.log(`[加载页面] 成功加载${pages.length}个页面`);
    return pages;
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