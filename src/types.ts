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
  type: 'person' | 'organization' | 'project' | 'product' | 'event' | 'place' | 'other';
  aliases?: string[];  // Pre-generated aliases from extraction (seeds for page generation)
  summary: string;
  mentions_in_source: string[];
  related_entities?: string[];
  related_concepts?: string[];
}

export interface ConceptInfo {
  name: string;
  type: 'theory' | 'method' | 'field' | 'phenomenon' | 'standard' | 'term' | 'other';
  aliases?: string[];  // Pre-generated aliases from extraction (seeds for page generation)
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
  apiKeyPlaceholder: string;
  apiKeyPlaceholderEn?: string; // English placeholder
  apiKeyPlaceholderZh?: string; // Chinese placeholder
  requiresBaseUrl: boolean;
}

// Plugin settings

export type ExtractionGranularity = 'fine' | 'standard' | 'coarse' | 'minimal' | 'custom';

export interface LLMWikiSettings {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  wikiFolder: string;
  language: 'en' | 'zh' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt';
  wikiLanguage: string;
  useCustomWikiLanguage?: boolean;
  availableModels?: string[];
  useCustomModel?: boolean;
  maxConversationHistory: number;
  queryHistory?: QueryHistoryMessage[];

  // Schema
  enableSchema: boolean;

  // Issue #85: tag vocabulary mode (Issue #85 — user-configurable tag vocabulary)
  tagVocabularyMode: 'default' | 'custom';
  customEntityTags: string;
  customConceptTags: string;

  // Extraction
  extractionGranularity: ExtractionGranularity;
  customEntityLimit?: number;
  customConceptLimit?: number;

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

  // LLM readiness — must pass Test Connection before core features are available
  llmReady: boolean;

  // Thinking control probe cache (key = baseUrl). Populated at Test Connection time.
  // true  → provider accepts thinking.type='disabled'
  // false → provider returned 400; subsequent calls skip thinking control
  thinkingControlCache?: Record<string, boolean>;

  // Issue #99 v2: disable thinking-mode for thinking-capable models.
  // When true, all createMessage calls send `thinking: { type: 'disabled' }`
  // so the LLM outputs final answer only — no mid-response CoT or
  // duplicated body. Layer A of the v1.16.2 3-layer defense (commit 8c520cf)
  // added the parameter, but the production call sites never passed it.
  // This setting makes the wiring complete. DEFAULT_SETTINGS provides
  // the default (true) so thinking-capable models (Gemma 4, DeepSeek-R1,
  // QwQ) output final answers without preamble/mid-stream reasoning.
  // Users with non-thinking models can leave true; users with thinking
  // models wanting CoT can set false. Optional in the interface for
  // backward compat with existing test fixtures.
  disableThinking?: boolean;

  // Issue #75: cap max_tokens per LLM call. 0 = no cap.
  // Recommended for local models with small context windows.
  maxTokensPerCall: number;

  // #128 follow-up: repetition penalty sent with every request. 0 = off (not sent).
  // A llama.cpp extension honored by LM Studio / Ollama; prevents the repetition
  // loops that a low extraction temperature can induce on some inputs.
  repetitionPenalty: number;

  // Issue #111: slug casing for generated filenames.
  // 'lower' preserves backwards-compatible all-lowercase filenames.
  // 'preserve' keeps the casing the LLM produces — required for languages
  // where lowercase is grammatically wrong (e.g. German nouns).
  // Note: switching affects new files only — existing lowercase files keep their names.
  slugCase: 'lower' | 'preserve';
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

// Result of page creation/update, with optional collision info
export interface PageCreationResult {
  path: string | null;
  collision?: {
    name: string;
    sourceType: 'entity' | 'concept';
    targetType: 'entity' | 'concept';
    targetPath: string;
  };
}

export interface IngestReport {
  sourceFile: string;
  createdPages: string[];
  updatedPages: string[];
  entitiesCreated: number;
  conceptsCreated: number;
  failedItems: Array<{ type: 'entity' | 'concept'; name: string; reason: string }>;
  collisions: Array<{ name: string; sourceType: 'entity' | 'concept'; targetType: 'entity' | 'concept'; targetPath: string }>;
  contradictionsFound: number;
  success: boolean;
  errorMessage?: string;
  elapsedSeconds?: number;
  skippedFiles?: number;
  totalFilesInFolder?: number;
  cancelled?: boolean;
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
    maxTokensPerCall?: number;  // Issue #75: cap for truncation retry
    disableThinking?: boolean;  // ROADMAP P3 #12: disable thinking for thinking-capable models
    repetition_penalty?: number;  // #128 follow-up: per-request repetition penalty (llama.cpp extension)
    chat_template_kwargs?: Record<string, unknown>;  // #99 completion: e.g. { enable_thinking: false } to disable reasoning on local template-based models
  }): Promise<string>;

  createMessageStream?(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    onChunk: (chunk: string) => void;
    disableThinking?: boolean;
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
export const VALID_ENTITY_TAGS = ['person', 'organization', 'project', 'product', 'event', 'place', 'other'];
export const VALID_CONCEPT_TAGS = ['theory', 'method', 'field', 'phenomenon', 'standard', 'term', 'other'];
export const DEFAULT_ENTITY_TAG = 'other';
export const DEFAULT_CONCEPT_TAG = 'term';

// Issue #85 v7: source pages use a separate, static "form" vocabulary
// (describing the type of the source artifact — paper, document, etc.)
// rather than a topic. NOT user-configurable per Issue #85 design
// decision: source pages have a closed taxonomy that the user picks
// from, and the lint audit + retag runner validates against this list.
export const VALID_SOURCE_TAGS = [
  'paper', 'article', 'book', 'transcript', 'clippings',
  'notes', 'other',
] as const;
export const DEFAULT_SOURCE_TAG = 'other';

// EngineContext — shared dependencies injected into sub-modules.
// Functions (getClient, tryReadFile) return the latest state at call time,
// not a snapshot at construction time. This is intentional: the LLM client
// can change when the user updates settings without restarting the plugin.
//
// Core (required by all sub-modules):
//   getClient — runtime accessor for LLM client, reflects settings changes
//   getExistingWikiPages — reads frontmatter from all wiki/*.md files
//   createOrUpdateFile — single write gate with pollution defense
// Integration (consumed by auto-maintain and ingestion pipeline):
//   onFileWrite — notifies file watcher of writes for change detection
//   onProgress / onDone — ingestion progress → UI modal

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
    apiKeyPlaceholder: 'ollama (no Key required)',
    apiKeyPlaceholderEn: 'ollama (no Key required)',
    apiKeyPlaceholderZh: 'ollama (无需Key)',
    requiresBaseUrl: false
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    nameEn: 'LM Studio (Local)',
    nameZh: 'LM Studio（本地）',
    baseUrl: 'http://localhost:1234/v1',
    apiKeyPlaceholder: 'lmstudio',
    apiKeyPlaceholderEn: 'lmstudio (optional)',
    apiKeyPlaceholderZh: 'lmstudio（可选）',
    requiresBaseUrl: false
  },
  custom: {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    nameEn: 'Custom OpenAI-Compatible',
    nameZh: '自定义 OpenAI 兼容',
    baseUrl: '',
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
  model: '',  // No hardcoded default — user must fetch models or enter manually
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

  // Issue #85: tag vocabulary
  tagVocabularyMode: 'default',
  customEntityTags: '',
  customConceptTags: '',

  // Extraction
  extractionGranularity: 'standard',

  // Auto-maintenance
  autoWatchSources: false,
  autoWatchMode: 'notify',
  autoWatchDebounceMs: 5000,
  watchedFolders: [],
  periodicLint: 'off',
  startupCheck: true,  // Issue #81: default ON for low-level format fixes

  // Ingestion acceleration (default: 3 parallel for most providers)
  pageGenerationConcurrency: 3,
  batchDelayMs: 500,

  // Query dedup
  lastOfferedQueryHash: '',

  // LLM readiness
  llmReady: false,

  // Issue #75: cap max_tokens per LLM call. 0 = no cap (cloud default).
  // Local model users can set this when the provider is Ollama, LM Studio,
  // custom, or anthropic-compatible.
  maxTokensPerCall: 0,

  // Issue #128: default low extraction temp kills CJK/script-mixing in
  // verbatim text; chat default keeps answers fluent.

  // #128 follow-up: repetition penalty. Default 1.1 to prevent the repetition
  // loops a low extraction temperature can induce. Auto-applied ONLY for local
  // llama.cpp-style providers (gated in main.ts); never sent to real
  // OpenAI/Anthropic, which reject the param. 0 disables it.
  repetitionPenalty: 1.1,

  // Issue #99 v2: default ON so thinking-capable models (Gemma 4,
  // DeepSeek-R1, QwQ) output final answer only — no mid-response CoT
  // or duplicated body. The v1.16.2 Layer A parameter existed but the
  // production call sites never passed it; this default makes the
  // wiring complete. Users with non-thinking models can leave true;
  // users with thinking models wanting CoT can set false.
  disableThinking: true,
  // Issue #111: default to 'lower' for backwards compatibility.
  slugCase: 'lower',
};