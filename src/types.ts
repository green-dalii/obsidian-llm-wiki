// Core Wiki data structures

import { App } from 'obsidian';
import type { RejectionReason } from './core/source-requirements';

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
  language: 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt' | 'it';
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
  autoSmartFix: boolean;

  // Ingestion acceleration
  pageGenerationConcurrency: number;
  batchDelayMs: number;

  // Query dedup
  lastOfferedQueryHash?: string;

  // LLM readiness — must pass Test Connection before core features are available
  llmReady: boolean;

  // Thinking control probe cache (key = baseUrl). Populated at Test Connection time.
  //
  // #137: schema widened to a dialect string so we can pick the right
  // thinking-control field per provider. Old v1.19.0 boolean values are
  // migrated on read in main.ts (true → 'anthropic', false → 'none') so
  // existing data.json files continue to work.
  //
  //   'anthropic' → backend accepts thinking.type='disabled'
  //                 (OpenAI, DeepSeek, xAI Grok, OpenRouter, ...)
  //   'openai'    → backend accepts reasoning_effort='none' but not thinking
  //                 (Gemini OpenAI-compat endpoint)
  //   'none'      → backend rejects both; skip thinking control entirely
  thinkingControlCache?: Record<string, 'anthropic' | 'openai' | 'none' | boolean>;

  // v1.20.0: when true, the plugin explicitly sends a thinking-control
  // directive to the provider (with 3-tier dialect fallback). When false
  // (default), the plugin does NOT send any thinking-control field — the
  // provider decides whether to emit reasoning, and any reasoning that
  // does leak into the response is folded into a collapsible block in the
  // Query Wiki modal so it never visually intrudes on the answer.
  //
  // Setting name kept for data.json backward compatibility with v1.18.2+
  // (where it was opt-out). The semantic is now opt-in: the user must
  // explicitly enable "Disable thinking" in Custom Advanced Settings.
  disableThinking?: boolean;

  // Advanced settings mode — 'default' hides the toggles/inputs; 'custom'
  // reveals them. In v1.20.0, 'default' no longer forces anything — the
  // plugin simply omits all custom fields, letting the provider's defaults
  // apply. 'custom' exposes the explicit opt-in controls.
  advancedSettingsMode?: 'default' | 'custom';

  // Issue #128: per-task sampling temperature. Leave undefined to use the
  // provider's default. Low values (e.g. 0.15) improve fidelity for extraction
  // and verbatim quotes; higher values (e.g. 0.7) make chat answers more fluid.
  extractionTemperature?: number;
  chatTemperature?: number;

  // Issue #128 follow-up: repetition penalty. Leave undefined to omit the field.
  // Some local models (llama.cpp-based) benefit from a small penalty (e.g. 1.1)
  // to avoid repetition loops at low temperatures.
  repetitionPenalty?: number;

  // Issue #75: cap max_tokens per LLM call. 0 = no cap.
  // Recommended for local models with small context windows.
  maxTokensPerCall: number;

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
  /** True when the file was skipped by the pre-ingest requirements gate (#164). */
  skipped?: boolean;
  /** Files rejected by the requirements gate, with the reason for each. */
  rejectedFiles?: Array<{ path: string; reason: RejectionReason; detail?: string }>;
}

/** Cross-file dedup state shared across a folder/batch ingest run (#164). */
export interface BatchRequirementsContext {
  /** Content hashes of files already ingested earlier in this batch. */
  seen: Set<string>;
  /** Content hashes already present in the wiki (snapshot at batch start). */
  ingested: Set<string>;
}

/** Options for WikiEngine.ingestSource (all optional, backward-compatible). */
export interface IngestOptions {
  /** Shared dedup context for folder/batch ingest. */
  batchCtx?: BatchRequirementsContext;
  /** Interactive (explicit single-file) ingest — prompt the user on a duplicate. */
  interactive?: boolean;
  /** Bypass the uniqueness check (the user confirmed re-ingest). */
  forceReingest?: boolean;
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
    enableThinking?: boolean;   // ROADMAP P3 #12: allow thinking for thinking-capable models
    temperature?: number;       // Issue #128: per-request sampling temperature
    repetition_penalty?: number; // Issue #128 follow-up: llama.cpp extension
    chat_template_kwargs?: Record<string, unknown>; // Issue #99: template-based reasoning disable
  }): Promise<string>;

  createMessageStream?(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    onChunk: (chunk: string) => void;
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
  }): Promise<string>;

  listModels?(): Promise<string[]>;
}

// Wiki output language options

export const WIKI_LANGUAGES: Record<string, string> = {
  'en': 'English',
  'zh': '中文',
  'zh-Hant': '繁體中文',  // v1.22.0: Traditional Chinese
  'ja': '日本語',
  'ko': '한국어',
  'de': 'Deutsch',
  'fr': 'Français',
  'es': 'Español',
  'pt': 'Português',
  'it': 'Italiano',
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
  autoSmartFix: false,

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

  // v1.20.0: default false. The plugin does NOT send any thinking-control
  // field unless the user explicitly enables "Disable thinking" in Custom
  // Advanced Settings. The provider decides its own reasoning behavior; any
  // reasoning that does appear in the response is folded into a collapsible
  // <details> block in the Query Wiki UI so it never visually intrudes on
  // the answer. Setting name kept for v1.18.2 data.json backward compat.
  disableThinking: false,
  // Advanced settings mode — default hides the toggles, custom reveals them.
  advancedSettingsMode: 'default',
  // Issue #111: default to 'lower' for backwards compatibility.
  slugCase: 'lower',
};