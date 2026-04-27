// Core Wiki data structures

export interface SourceAnalysis {
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

export interface EntityInfo {
  name: string;
  type: 'person' | 'organization' | 'project' | 'location' | 'other';
  summary: string;
  mentions_in_source: string[];
}

export interface ConceptInfo {
  name: string;
  type: 'theory' | 'method' | 'technology' | 'term' | 'other';
  summary: string;
  mentions_in_source: string[];
  related_concepts: string[];
}

export interface ContradictionInfo {
  claim: string;
  source_page: string;
  contradicted_by: string;
  resolution: string;
}

export interface WikiPage {
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

// LLM Provider configuration

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
  requiresBaseUrl: boolean;
}

// Plugin settings

export interface LLMWikiSettings {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  wikiFolder: string;
  language: 'en' | 'zh';
  availableModels?: string[];
  useCustomModel?: boolean;
  maxConversationHistory: number;
  queryHistory?: QueryHistoryMessage[];
}

export interface QueryHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// LLM Client interface

export interface LLMClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string>;

  createMessageStream?(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string>;

  listModels?(): Promise<string[]>;
}

// Predefined LLM provider configurations

export const PREDEFINED_PROVIDERS: Record<string, ProviderConfig> = {
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

// Default plugin settings

export const DEFAULT_SETTINGS: LLMWikiSettings = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  model: 'claude-sonnet-4-6',
  wikiFolder: 'wiki',
  language: 'en',
  availableModels: [],
  useCustomModel: false,
  maxConversationHistory: 30,
  queryHistory: []
};