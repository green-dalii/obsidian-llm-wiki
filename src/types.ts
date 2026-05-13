// Core Wiki data structures

import { App } from 'obsidian';

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
  type: 'person' | 'organization' | 'project' | 'product' | 'event' | 'location' | 'other';
  summary: string;
  mentions_in_source: string[];
  related_entities?: string[];
  related_concepts?: string[];
}

export interface ConceptInfo {
  name: string;
  type: 'theory' | 'method' | 'technology' | 'term' | 'other';
  summary: string;
  mentions_in_source: string[];
  related_concepts: string[];
  related_entities?: string[];
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
  name: string; // Deprecated: use nameEn/nameZh instead
  nameEn: string; // English provider name
  nameZh: string; // Chinese provider name
  baseUrl: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
  apiKeyPlaceholderEn?: string; // English placeholder
  apiKeyPlaceholderZh?: string; // Chinese placeholder
  requiresBaseUrl: boolean;
}

// Plugin settings

export type ExtractionGranularity = 'fine' | 'standard' | 'coarse';

export interface LLMWikiSettings {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  wikiFolder: string;
  language: 'en' | 'zh';
  wikiLanguage: string;
  useCustomWikiLanguage?: boolean;
  availableModels?: string[];
  useCustomModel?: boolean;
  maxConversationHistory: number;
  queryHistory?: QueryHistoryMessage[];

  // Schema
  enableSchema: boolean;

  // Extraction
  extractionGranularity: ExtractionGranularity;

  // Auto-maintenance
  autoWatchSources: boolean;
  autoWatchMode: 'notify' | 'auto';
  autoWatchDebounceMs: number;
  watchedFolders: string[];
  periodicLint: 'off' | 'hourly' | 'daily' | 'weekly';
  startupCheck: boolean;

  // Ingestion acceleration
  pageGenerationConcurrency: number;
  batchDelayMs: number;

  // Query dedup
  lastOfferedQueryHash?: string;
}

export interface QueryHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Schema types

export interface WikiSchema {
  version: number;
  updated: string;
  auto_suggestion_count: number;
  body: string;
}

export interface SchemaSuggestion {
  timestamp: string;
  source: string;
  changes_needed: boolean;
  suggestions: string;
}

// Ingestion report passed to onDone callback

export interface IngestReport {
  sourceFile: string;
  createdPages: string[];
  updatedPages: string[];
  entitiesCreated: number;
  conceptsCreated: number;
  failedItems: Array<{ type: 'entity' | 'concept'; name: string; reason: string }>;
  contradictionsFound: number;
  success: boolean;
  errorMessage?: string;
  elapsedSeconds?: number;
  skippedFiles?: number;
  totalFilesInFolder?: number;
}

// LLM Client interface

export interface LLMClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
    cacheBreakpoint?: number;
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

// Wiki output language options

export const WIKI_LANGUAGES: Record<string, string> = {
  'en': 'English',
  'zh': '中文',
  'ja': '日本語',
  'ko': '한국어',
  'de': 'Deutsch',
  'fr': 'Français',
  'es': 'Español',
  'pt': 'Português',
};

// Valid frontmatter tag values per schema classification rules.
// `type: entity` pages use entity subtypes as tags.
// `type: concept` pages use concept subtypes as tags.
export const VALID_ENTITY_TAGS = ['person', 'organization', 'project', 'product', 'event', 'location', 'other'];
export const VALID_CONCEPT_TAGS = ['theory', 'method', 'technology', 'term', 'other'];
export const DEFAULT_ENTITY_TAG = 'other';
export const DEFAULT_CONCEPT_TAG = 'term';

// EngineContext — shared dependencies injected into extracted modules.
// Defined as an interface so wiki-engine.ts can implement it once and
// pass it to specialized sub-modules (lint-fixes, contradictions, etc.).

export interface EngineContext {
  app: App;
  settings: LLMWikiSettings;
  getClient: () => LLMClient | null;
  createOrUpdateFile: (path: string, content: string) => Promise<void>;
  tryReadFile: (path: string) => Promise<string | null>;
  deleteFile: (path: string) => Promise<void>;
  buildSystemPrompt: (task: string) => Promise<string | undefined>;
  getSectionLabels: () => Record<string, string>;
  getExistingWikiPages: () => Promise<Array<{path: string; title: string; wikiLink: string; aliases?: string[]}>>;
  getSchemaContext: (task: string) => Promise<string | undefined>;
  onFileWrite?: (path: string) => void;
  onProgress?: (message: string) => void;
  onDone?: (report: IngestReport) => void;
}

// Predefined LLM provider configurations

export const PREDEFINED_PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    nameEn: 'OpenAI',
    nameZh: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    apiKeyPlaceholder: 'sk-...',
    apiKeyPlaceholderEn: 'sk-...',
    apiKeyPlaceholderZh: 'sk-...',
    requiresBaseUrl: false
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    nameEn: 'Anthropic (Claude)',
    nameZh: 'Anthropic (Claude)',
    baseUrl: '',
    defaultModel: 'claude-sonnet-4-6',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyPlaceholderEn: 'sk-ant-...',
    apiKeyPlaceholderZh: 'sk-ant-...',
    requiresBaseUrl: false
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    nameEn: 'Google Gemini',
    nameZh: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-pro',
    apiKeyPlaceholder: 'AIza...',
    apiKeyPlaceholderEn: 'AIza...',
    apiKeyPlaceholderZh: 'AIza...',
    requiresBaseUrl: false
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    nameEn: 'OpenRouter',
    nameZh: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o',
    apiKeyPlaceholder: 'sk-or-...',
    apiKeyPlaceholderEn: 'sk-or-...',
    apiKeyPlaceholderZh: 'sk-or-...',
    requiresBaseUrl: false
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    nameEn: 'DeepSeek',
    nameZh: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
    apiKeyPlaceholderEn: 'sk-...',
    apiKeyPlaceholderZh: 'sk-...',
    requiresBaseUrl: false
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    nameEn: 'MiniMax',
    nameZh: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1',
    defaultModel: 'MiniMax-M2.7',
    apiKeyPlaceholder: 'sk-cp-...',
    apiKeyPlaceholderEn: 'sk-cp-...',
    apiKeyPlaceholderZh: 'sk-cp-...',
    requiresBaseUrl: false
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    nameEn: 'Kimi (Moonshot)',
    nameZh: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    apiKeyPlaceholder: 'sk-...',
    apiKeyPlaceholderEn: 'sk-...',
    apiKeyPlaceholderZh: 'sk-...',
    requiresBaseUrl: false
  },
  glm: {
    id: 'glm',
    name: 'GLM (Zhipu AI)',
    nameEn: 'GLM (Zhipu AI)',
    nameZh: 'GLM (智谱AI)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4',
    apiKeyPlaceholder: '...',
    apiKeyPlaceholderEn: '...',
    apiKeyPlaceholderZh: '...',
    requiresBaseUrl: false
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    nameEn: 'Ollama (Local)',
    nameZh: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    apiKeyPlaceholder: 'ollama (no Key required)',
    apiKeyPlaceholderEn: 'ollama (no Key required)',
    apiKeyPlaceholderZh: 'ollama (无需Key)',
    requiresBaseUrl: false
  },
  custom: {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    nameEn: 'Custom OpenAI-Compatible',
    nameZh: '自定义 OpenAI 兼容',
    baseUrl: '',
    defaultModel: '',
    apiKeyPlaceholder: 'API Key',
    apiKeyPlaceholderEn: 'API Key',
    apiKeyPlaceholderZh: 'API Key',
    requiresBaseUrl: true
  },
  'anthropic-compatible': {
    id: 'anthropic-compatible',
    name: 'Custom Anthropic-Compatible',
    nameEn: 'Custom Anthropic-Compatible',
    nameZh: '自定义 Anthropic 兼容',
    baseUrl: '',
    defaultModel: '',
    apiKeyPlaceholder: 'API Key',
    apiKeyPlaceholderEn: 'API Key',
    apiKeyPlaceholderZh: 'API Key',
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
  wikiLanguage: 'en',
  useCustomWikiLanguage: false,
  availableModels: [],
  useCustomModel: false,
  maxConversationHistory: 30,
  queryHistory: [],

  // Schema
  enableSchema: true,

  // Extraction
  extractionGranularity: 'standard',

  // Auto-maintenance
  autoWatchSources: false,
  autoWatchMode: 'notify',
  autoWatchDebounceMs: 5000,
  watchedFolders: [],
  periodicLint: 'off',
  startupCheck: false,

  // Ingestion acceleration (default: serial for safety)
  pageGenerationConcurrency: 1,
  batchDelayMs: 300,

  // Query dedup
  lastOfferedQueryHash: '',
};