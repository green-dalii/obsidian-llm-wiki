// Core Wiki data structures

import { App } from 'obsidian';
import type { RejectionReason } from './core/source-requirements';

/**
 * Issue #244 — Programmatic Mentions writes (v1.23.3 / v1.24.0).
 *
 * A `MentionWithProvenance` is a verbatim quote from a source note plus
 * the metadata needed to write a `[[source-path|basename]]` link and to
 * sort/dedup across multiple sources. The schema intent
 * (schema-manager.ts:117-128) is that Mentions is a per-quote
 * provenance-to-original link — clicking should land on the verbatim
 * source, not on a wiki-summary round-trip.
 */
export interface MentionWithProvenance {
  /** The verbatim quote text (preserves original language; never translated). */
  quote: string;
  /**
   * Optional translation of `quote` into the user's wiki output language.
   * Only emitted by the LLM when wikiLanguage ≠ source language (cross-language).
   * When present, the formatter renders: `"<verbatim>" (<translation>) — [[path|display]]`.
   * Half-width parentheses are used regardless of locale.
   */
  translation?: string;
  /** Original vault note path the quote was extracted from (e.g. "notes/foo.md"). */
  source_path: string;
  /** The sources/<slug> reference used in the page frontmatter `sources:` field. */
  source_slug: string;
  /** ISO timestamp of when this mention was extracted from the source. */
  extracted_at: string;
}

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
  /**
   * Issue #185 — curated `aliases:` authored on the source note
   * frontmatter. Read by `SourceAnalyzer.analyzeSource` from
   * `app.metadataCache.getFileCache(file)?.frontmatter?.aliases`.
   * Always a string array (or undefined when the source has no
   * frontmatter at all). NOT normalized — values come through
   * verbatim so downstream propagation can deduplicate against the
   * generated `sources/<slug>` page's existing aliases.
   *
   * Strict scope: extracted by the analyzer; consumed by
   * `WikiEngine.createSummaryPage` to inject into the
   * `sources/<slug>` page (Step 2). NOT used for entity/concept
   * pages — those follow the existing `info.aliases` path.
   */
  source_note_aliases?: string[];
}

export interface EntityInfo {
  name: string;
  type: 'person' | 'organization' | 'project' | 'product' | 'event' | 'place' | 'other';
  aliases?: string[];  // Pre-generated aliases from extraction (seeds for page generation)
  summary: string;
  mentions_in_source: string[];
  /**
   * Issue #244 — structured Mentions with provenance. When provided,
   * the page-factory uses this instead of `mentions_in_source` to emit
   * the Mentions section programmatically. Old `mentions_in_source`
   * remains the legacy fallback for LLM extractions that haven't yet
   * been upgraded to return the structured form.
   */
  mentions_with_provenance?: MentionWithProvenance[];
  related_entities?: string[];
  related_concepts?: string[];
}

export interface ConceptInfo {
  name: string;
  type: 'theory' | 'method' | 'field' | 'phenomenon' | 'standard' | 'term' | 'other';
  aliases?: string[];  // Pre-generated aliases from extraction (seeds for page generation)
  summary: string;
  mentions_in_source: string[];
  /** Issue #244 — see EntityInfo. */
  mentions_with_provenance?: MentionWithProvenance[];
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
  authMode: 'api-key' | 'none' | 'codex-oauth';
}

// Plugin settings

export type ExtractionGranularity = 'fine' | 'standard' | 'coarse' | 'minimal' | 'custom';

export interface OpenAICodexModelCatalogEntry {
  slug: string;
  displayName: string;
  supportedReasoningLevels: string[];
  additionalSpeedTiers: string[];
  serviceTiers: Array<{ id: string; name: string; description: string }>;
  defaultServiceTier?: string;
}

export interface LLMWikiSettings {
  provider: string;
  apiKey: string;
  openAICodexSecretId: string;
  /**
   * v1.25.3 #182: stable ID for the provider API key in Obsidian
   * SecretStorage (OS keychain). Mirrors `openAICodexSecretId`.
   * All API-key-using providers share one slot (only the active
   * provider's key needs to persist between restarts).
   */
  providerApiKeySecretId: string;
  openAICodexModels?: OpenAICodexModelCatalogEntry[];
  openAICodexModelsFetchedAt?: number;
  openAICodexUnavailableModels?: string[];
  baseUrl: string;
  model: string;
  wikiFolder: string;
  language: 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt' | 'it';
  wikiLanguage: string;
  /**
   * v1.24.1 PATCH Stage 1 — AWS region used by both Bedrock providers. Only
   * applied when provider is `bedrock-anthropic` or `bedrock-openai`. Falls
   * back to `us-east-1` (broadest model coverage) when unset. Always a
   * region string (e.g. "us-east-1"), not a URL component.
   */
  bedrockRegion?: string;
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
  periodicLint: 'off' | 'daily' | 'weekly' | 'monthly';
  startupCheck: boolean;
  /**
   * v1.23.0: controls whether the QuickFixes startup-check Notice is
   * shown to the user. 'visible' (default) shows the result summary;
   * 'silent' only logs to console + Operation History Panel. The
   * QuickFixes pipeline itself always runs (the `startupCheck: true`
   * semantic is now permanent).
   *
   * Old users with `startupCheck: false` on disk are auto-migrated to
   * 'silent' by `applySettingsMigrations` (v1.23.0-startup-notice).
   */
  startupCheckNoticeLevel: 'visible' | 'silent';
  autoSmartFix: boolean;
  autoIngestNotificationLevel: 'modal' | 'notice';

  // v1.23.0: Phase 5.1.5 — first-run Welcome note. When enabled (default),
  // the plugin detects tier on every onload (no vault state change =
  // short-circuit) and creates <wikiFolder>/Welcome.md on Tier B transitions.
  // Tier A users get a Notice only; Tier C users are silent. Setting is
  // respected at all times — disabling stops both create-on-onload and the
  // "Recreate Wiki Welcome Note" command.
  createWelcomeNote: boolean;

  // Ingestion acceleration
  pageGenerationConcurrency: number;
  batchDelayMs: number;

  // Migration markers — written by `core/settings-migrations.ts` so each
  // version-keyed migration runs at most once. Keep these `boolean` and
  // underscore-prefixed so they don't show up in the settings UI.
  // (#199) The v1.18.3 startupCheck nudge was removed entirely; if a
  // future migration re-nudges a value, gate it on one of these.
  _migrated_v1_20_0_thinking?: boolean;
  // v1.23.0: pins the startupCheck=true invariant and routes
  // previously-explicit startupCheck=false users to startupCheckNoticeLevel='silent'.
  _migrated_v1_23_0_startup_notice?: boolean;
  // v1.25.3 #182: one-time migration that moves legacy plaintext
  // `apiKey` from data.json into Obsidian SecretStorage, then clears
  // the plaintext field. Idempotent — set true after the migration
  // runs so the second load is a no-op.
  _migrated_v1_25_3_secret_storage?: boolean;

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

  // v1.23.0: thinkingControlCache is now @deprecated. AI-SDK v6 handles
  // thinking-control internally per provider/model — no plugin-side
  // caching needed. The field is retained for forward-compat: existing
  // data.json files keep the field without error, and the value is
  // simply ignored. Will be removed in v1.24.0 unless a use case
  // surfaces (e.g. introspecting the cache for diagnostics).
  // See src/main.ts:1011 for the surviving comment.
  //

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

  /**
   * v1.25.0 PR3: opt-in escape hatch for OpenAI-compatible and
   * Anthropic-compatible providers that can accept PDF input even though
   * they are not in the native-PDF provider list. Default false.
   */
  forcePdfSupport?: boolean;

  /**
   * v1.25.0 PR3: when true, write the LLM-converted Markdown of each PDF
   * to a `<basename>.pdf.md` sidecar next to the source PDF. Default false
   * (cache-only architecture; the cache in `.obsidian/` is the only artifact).
   */
  writePdfMarkdownToVault?: boolean;

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

  /**
   * v1.24.0 #251: persistent user-supplied instructions appended to the
   * Query Wiki system prompt. Empty string or undefined = feature off
   * (backward compatible). Scoped strictly to Query Wiki chat; no other
   * workflow (ingest / lint / page generation / Save to Wiki / seed
   * selection / duplicate merge) is affected. Stored in data.json
   * alongside `queryHistory`.
   */
  customQueryInstructions?: string;

  /**
   * v1.24.0 #208: per-task model overrides. Each field is the MODEL
   * string ONLY (same shape as `model`). Provider / apiKey / baseUrl /
   * thinking-control stay shared — per-provider split would 4× the
   * credentials UI and break Test Connection's contract.
   *
   * Resolution: `perTaskModel?.trim() || settings.model` — see
   * `src/core/model-resolver.ts`. Empty / whitespace / undefined all
   * fall through to `settings.model`, so pre-v1.24.0 data.json
   * (no per-task fields) produces bit-identical behavior.
   *
   * - `ingestModel`: ingest extract / summarize / create / merge
   *   (source-analyzer, page-factory Stage-1..4, conversation-ingest,
   *    schema-manager, schema/auto-maintain, localize-welcome-note).
   * - `lintModel`:   lint analysis / dedup / fix-* / link-orphan /
   *   merge-duplicates / contradictions (all `src/wiki/lint/` + `contradictions.ts`).
   * - `queryModel`:  Query Wiki chat (3 QueryView send sites) + save-to-wiki eval.
   *
   * UI invariant: `usePerTaskModels` toggles whether the settings
   * panel renders the per-task pickers. Hidden per-task values are
   * preserved when the user toggles back off (not cleared on save).
   */
  ingestModel?: string;
  lintModel?: string;
  queryModel?: string;

  /**
   * v1.24.0 #208: UI toggle for the per-task model picker.
   * `false` = unified model (all 27 LLM call sites use `settings.model`).
   * `true`  = per-task overrides active (3 dropdowns render).
   * Defaults `false`. Setting does NOT affect `resolveModelForTask` —
   * it is purely a UI rendering hint, since empty/undefined per-task
   * values fall through to `settings.model` regardless of this flag.
   */
  usePerTaskModels?: boolean;

  /**
   * v1.24.0 #208: per-field "use custom model" toggles, parallel to
   * `useCustomModel`. Only consumed by the UI when an `availableModels`
   * list has been fetched — when set, the picker renders as a free-form
   * text input instead of a dropdown, so the user can paste a model ID
   * not in the fetched list. These flags are ephemeral UI state and
   * `false` is the user-facing default ("show me the dropdown").
   */
  ingestModelUseCustom?: boolean;
  lintModelUseCustom?: boolean;
  queryModelUseCustom?: boolean;
}

export interface QueryHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /**
   * v1.24.0: Retrieval metadata persisted per assistant turn so the
   * label survives Obsidian restart. Optional — pre-v1.24.0 history
   * is loaded without it, and the retrieval label simply won't render
   * (no crash).
   */
  retrieval?: {
    arm: string;
    count: number;
    topPaths: string[];
  };
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
  /** v1.22.0 #97: full proposed new body (frontmatter-free, ready to
   *  splice). Undefined when the LLM only provided markdown suggestions
   *  (legacy v1.21.x format) or when changes_needed is false. */
  newSchemaBody?: string;
}

// Ingestion report passed to onDone callback

// Result of page creation/update, with optional collision info
export interface PageCreationResult {
  path: string | null;
  /**
   * Issue #290 — whether this write created the page or merged into one that
   * already existed. Decided by the pre-write existence check the router
   * already performs to choose between the create and merge paths, so it
   * reports what actually happened rather than what the caller intended.
   * The ingest log splits "Created pages" from "Updated pages" on it; merges
   * are the half of an ingest where existing content can be lost, so they must
   * not be reported as creations.
   */
  created: boolean;
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
  /**
   * v1.22.6 #204: Distinguishes watch-mode auto-ingest from manual ingest
   * so the completion callback can route to the right UI surface
   * (Notice for auto, Modal for manual). Optional for backward
   * compatibility — missing/legacy callers default to 'manual'.
   */
  trigger?: 'auto' | 'manual';
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
  /**
   * v1.22.6 #204: Distinguishes watch-mode auto-ingest from manual ingest.
   * Propagated into IngestReport.trigger so the completion callback can
   * route to the correct UI surface (Notice for auto, Modal for manual).
   * Optional — missing/legacy callers default to 'manual'.
   */
  trigger?: 'auto' | 'manual';
  /**
   * v1.25.0 PR2 redo: pre-converted source body (e.g. LLM-converted PDF
   * markdown). When set, skips `vault.read(file)` and feeds this string
   * into the analyzer and summary-page generator. Path-based operations
   * (slug, frontmatter inheritance) still use `file`.
   */
  contentOverride?: string;
}

// LLM Client interface

/**
 * A content part within a chat message. Extends the legacy `string` content
 * type with multi-modal support (file / image). String content is still
 * supported for backward compatibility — see `messages[].content: string | MessageContentPart[]`.
 *
 * v1.25.0 PDF Level 1: `type: 'file'` with `mediaType: 'application/pdf'`
 * is the wire format for PDF ingestion. The AI SDK v6 transparently maps
 * this to provider-native PDF blocks (Anthropic `document`, OpenAI `input_file`).
 */
export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'file'; data: string; mediaType: 'application/pdf'; filename?: string };

/**
 * Why the provider stopped generating. Mirrors the AI SDK v6 `FinishReason`
 * union, which normalizes the OpenAI `finish_reason` field and the Anthropic
 * `stop_reason` field into one vocabulary.
 *
 * Issue #305: `'length'` is the only reliable truncation signal. An
 * OpenAI-compatible provider does not throw on truncation — it returns HTTP
 * 200 with a body that stops mid-token — so callers that only observe the
 * response text cannot tell a truncated answer from a complete one.
 */
export type LLMFinishReason =
  | 'stop'
  | 'length'
  | 'content-filter'
  | 'tool-calls'
  | 'error'
  | 'other'
  | 'unknown';

export interface LLMClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string | MessageContentPart[] }>;
    response_format?: { type: 'json_object' };
    cacheBreakpoint?: number;
    maxTokensPerCall?: number;  // Issue #75: cap for truncation retry
    enableThinking?: boolean;   // ROADMAP P3 #12: allow thinking for thinking-capable models
    temperature?: number;       // Issue #128: per-request sampling temperature
    repetition_penalty?: number; // Issue #128 follow-up: llama.cpp extension
    chat_template_kwargs?: Record<string, unknown>; // Issue #99: template-based reasoning disable
    // v1.25.0 PR3 follow-up #8 (Bug D, e2e 2026-07-17): cancellation
    // signal for long-running calls. The PDF converter threads the
    // engine's AbortSignal through so a status-bar click during PDF
    // conversion actually aborts the LLM call rather than only
    // finishing the post-conversion phase. AI SDK v6 accepts this
    // natively; legacy clients ignore it.
    abortSignal?: AbortSignal;
    // Issue #305: optional out-channel for response metadata. The SDK-backed
    // clients invoke this once, immediately before returning the text. It is
    // additive on purpose — `createMessage` keeps returning `Promise<string>`,
    // so every existing caller and every mock client is unaffected. Callers
    // that need to distinguish "the model finished" from "the model ran out
    // of tokens" opt in; callers that do not, see no change.
    onFinish?: (meta: { finishReason: LLMFinishReason }) => void;
  }): Promise<string>;

  createMessageStream?(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string | MessageContentPart[] }>;
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
  getExistingWikiPages: () => Promise<Array<{ path: string; title: string; wikiLink: string; aliases?: string[] }>>;
  getSchemaContext: (task: string) => Promise<string | undefined>;
  /**
   * SubtleCrypto from Obsidian's popout-window-aware `activeWindow.crypto`.
   * Used by the PDF cache to derive a content-addressed key without
   * accessing the bare `window` global (CLAUDE.md `obsidianmd/no-global-this`).
   * Undefined only in tests that don't stub SubtleCrypto.
   */
  subtle?: SubtleCrypto;
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
    requiresBaseUrl: false,
    authMode: 'api-key'
  },
  'openai-codex': {
    id: 'openai-codex',
    name: 'ChatGPT Plan (Codex OAuth)',
    nameEn: 'ChatGPT Plan (Codex OAuth)',
    nameZh: 'ChatGPT Plan (Codex OAuth)',
    baseUrl: '',
    apiKeyPlaceholder: '',
    apiKeyPlaceholderEn: '',
    apiKeyPlaceholderZh: '',
    requiresBaseUrl: false,
    authMode: 'codex-oauth'
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
    requiresBaseUrl: false,
    authMode: 'api-key'
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
    requiresBaseUrl: false,
    authMode: 'api-key'
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
    requiresBaseUrl: false,
    authMode: 'api-key'
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
    requiresBaseUrl: false,
    authMode: 'api-key'
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
    requiresBaseUrl: false,
    authMode: 'api-key'
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
    requiresBaseUrl: false,
    authMode: 'api-key'
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
    requiresBaseUrl: false,
    authMode: 'api-key'
  },
  // v1.24.1 PATCH Bedrock Stage 1 — reuses AnthropicSdkClient via the
  // bedrock-mantle endpoint (Bearer auth, no AWS SDK). baseUrl is filled
  // dynamically by createLLMClientFromSettings based on `bedrockRegion`.
  'bedrock-anthropic': {
    id: 'bedrock-anthropic',
    name: 'Amazon Bedrock (Anthropic via mantle)',
    nameEn: 'Amazon Bedrock (Anthropic via mantle)',
    nameZh: 'Amazon Bedrock（Anthropic via mantle）',
    baseUrl: '',  // Resolved at runtime from bedrockRegion (see constants.ts)
    apiKeyPlaceholder: 'ABSK... (Bedrock bearer key)',
    apiKeyPlaceholderEn: 'ABSK... (Bedrock bearer key)',
    apiKeyPlaceholderZh: 'ABSK...（Bedrock bearer key）',
    requiresBaseUrl: false,
    authMode: 'api-key'
  },
  // v1.24.1 PATCH Bedrock Stage 1 — reuses OpenAICompatSdkClient via
  // bedrock-mantle /v1 chat-completions. Same bearer auth as Bedrock-
  // Anthropic; region is resolved at runtime from `bedrockRegion`.
  'bedrock-openai': {
    id: 'bedrock-openai',
    name: 'Amazon Bedrock (OpenAI via mantle)',
    nameEn: 'Amazon Bedrock (OpenAI via mantle)',
    nameZh: 'Amazon Bedrock（OpenAI via mantle）',
    baseUrl: '',  // Resolved at runtime from bedrockRegion
    apiKeyPlaceholder: 'ABSK... (Bedrock bearer key)',
    apiKeyPlaceholderEn: 'ABSK... (Bedrock bearer key)',
    apiKeyPlaceholderZh: 'ABSK...（Bedrock bearer key）',
    requiresBaseUrl: false,
    authMode: 'api-key'
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
    requiresBaseUrl: false,
    authMode: 'none'
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
    requiresBaseUrl: false,
    authMode: 'none'
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
    requiresBaseUrl: true,
    authMode: 'api-key'
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
    requiresBaseUrl: true,
    authMode: 'api-key'
  }
};

// Default plugin settings

export const DEFAULT_SETTINGS: LLMWikiSettings = {
  provider: 'anthropic',
  apiKey: '',
  openAICodexSecretId: 'karpathywiki-openai-codex',
  // v1.25.3 #182: stable secretId for the provider API key in
  // Obsidian SecretStorage. Plugin namespace + semantic role makes
  // the slot easy to find in the OS credential manager and avoids
  // collision with the Codex OAuth slot above.
  providerApiKeySecretId: 'karpathywiki-provider-api-key',
  openAICodexModels: [],
  openAICodexModelsFetchedAt: 0,
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
  startupCheckNoticeLevel: 'visible',  // v1.23.0: show QuickFixes results Notice by default
  autoSmartFix: false,
  autoIngestNotificationLevel: 'notice',  // v1.22.2: default to Notice (no blocking Modal) for auto-ingest
  createWelcomeNote: true,  // v1.23.0: Phase 5.1.5 — Tier-B first-run Welcome note (D8: 1 EN template + LLM dynamic translation)

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
  // v1.25.0 PR3: PDF force-support and sidecar write are opt-in advanced
  // toggles. Default false keeps the cache-only architecture as the only
  // artifact and prevents unsupported-compatible providers from attempting
  // PDF conversion.
  forcePdfSupport: false,
  writePdfMarkdownToVault: false,
  // Issue #111: default to 'lower' for backwards compatibility.
  slugCase: 'lower',
  // v1.24.0 #251: persistent user-supplied instructions appended to the
  // Query Wiki system prompt. Empty string = feature off (backward
  // compatible). Stored in data.json alongside queryHistory. Scoped
  // strictly to Query Wiki chat; no other workflow is affected.
  customQueryInstructions: '',

  // v1.24.1 PATCH Bedrock Stage 1 — default region is the broadest-coverage
  // region (us-east-1). Only consulted when provider is one of the two
  // bedrock-* provider ids. Has no effect on other providers.
  bedrockRegion: 'us-east-1',
};
