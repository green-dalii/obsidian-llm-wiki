export const EN_TEXTS = {
    // Plugin Info
    pluginTitle: 'Karpathy LLM Wiki Settings',
    pluginIntro: 'This plugin implements {{link}} concept for Obsidian. It reads your notes, uses AI to extract entities and concepts, and builds a structured, interlinked Wiki in your vault.',
    karpathyLinkText: "Andrej Karpathy's LLM Wiki",

    // Features Section
    featuresTitle: 'How It Works',
    workflow1Title: '1. Ingest',
    workflow1Desc: 'Select a note — AI extracts entities, concepts, and relationships into Wiki pages.',
    workflow2Title: '2. Query',
    workflow2Desc: 'Chat with your Wiki — answers are grounded in your ingested knowledge.',
    workflow3Title: '3. Maintain',
    workflow3Desc: 'Auto-generated index, cross-links, and lint checks keep the Wiki healthy.',

    // Language Switcher
    languageTitle: 'Interface Language',
    languageDesc: 'Select your preferred language for settings panel. Restart plugin to apply language changes to command palette.',
    languageEn: 'English',
    languageZh: '中文',
    languageJa: '日本語',
    languageKo: '한국어',
    languageDe: 'Deutsch',
    languageFr: 'Français',
    languageEs: 'Español',
    languagePt: 'Português',
    languageIt: 'Italiano',

    // Status
    statusTitle: 'LLM Client Status',
    llmWikiStatusSection: 'LLM-Wiki Status',
    statusInitialized: 'Initialized',
    statusNotInitialized: 'Not initialized',
    statusReady: 'LLM Ready',
    statusNotReady: 'LLM not configured — complete setup and pass connection test',
    currentProvider: 'Current Provider',

    // Provider Configuration
    providerSection: 'LLM Configuration',
    providerName: 'LLM Provider',
    providerDesc: 'Select predefined provider or custom OpenAI-compatible service. For Coding Plan or similar bundles, choose Custom OpenAI/Anthropic and enter the provider\'s Base URL and API Key manually',

    // API Key
    apiKeyName: 'API Key',
    apiKeyDesc: 'Enter your API key from provider',
    apiKeyPlaceholder: 'Enter API Key',

    // Base URL
    baseUrlName: 'API Base URL',
    baseUrlDescCustom: 'Required: Custom OpenAI-compatible endpoint',
    baseUrlDescOverride: 'Optional: Override preset Base URL',

    // Ollama Hint
    ollamaHint: 'Ollama runs locally, no API Key required',
    // LM Studio Hint
    lmstudioHint: 'LM Studio runs locally, API Key is optional',

    // LLM execution cap
    maxTokensPerCallName: 'Context Window',
    maxTokensPerCallDesc: 'Limit generation tokens to fit your model\'s context window. 0 = no cap (cloud default).',

    // Issue #111: slug casing
    slugCaseName: 'File Name Casing',
    slugCaseDesc: 'Controls whether generated wiki filenames are lowercased. "Preserve" is recommended for languages where lowercase changes meaning (e.g. German nouns).',
    slugCaseLower: 'Lowercase (default)',
    slugCasePreserve: 'Preserve case',

    // Model Selection
    modelSection: 'Model Selection',
    fetchModelsName: 'Fetch Available Models',
    fetchModelsDesc: 'Get latest model list from Provider API',
    fetchModelsButton: 'Fetch Models',
    fetchingModels: 'Fetching...',
    fetchSuccess: 'Success! {} models available',
    fetchFailed: 'Failed or empty list, please input model name manually',
    fetchNotSupported: 'Provider doesn\'t support model list query',
    fetchErrorAuth: 'Authentication failed (HTTP 401/403). Verify your API Key, or enter a Model ID below and click Test Connection to validate.',
    fetchErrorEndpoint: 'Endpoint not found (HTTP 404). Verify the BaseURL, or enter a Model ID and click Test Connection to validate.',
    fetchErrorServer: 'Provider server error (HTTP 5xx). Try again later, or enter a Model ID and click Test Connection to validate.',
    fetchErrorEmpty: 'Provider has no model list endpoint. Enter a Model ID below and click Test Connection to validate.',
    fetchErrorNetwork: 'Network request failed. Check your internet connection, BaseURL, or proxy settings. You can also enter a Model ID below and click Test Connection to validate.',

    selectModelName: 'Select Model',
    selectModelDesc: 'Choose from {} available models',
    customInputOption: 'Custom input...',
    customInputHint: 'To use other models, select "Custom input..."',

    modelName: 'Model Name',
    modelDescCustom: 'Using custom model (click above button to re-fetch list)',
    modelDescFetchFailed: 'Model list fetch failed. Verify your API Key and Endpoint URL, or enter a Model ID below and click Test Connection to validate.',
    modelInputPlaceholder: 'Enter Model ID, then Test Connection',

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
    savedNotice: 'Settings saved!',

    // Test Connection
    testConnectionSuccessful: 'Connection successful',
    testConnectionFailed: 'Connection failed',
    testConnectionProvider: 'Provider: ',
    errorUnknown: 'Unknown error',

    // Issue #137: LLM fallback notices (shown when thinking-dialect
    // fallback or param-stripping happens during a request).
    fallbackThinkingDialect: 'Thinking control: switched to "{dialect}" dialect (this provider uses a different thinking-control format). Output is unchanged.',
    fallbackThinkingNone: 'Thinking control fully disabled for this provider. Reasoning content may still appear; if so, try a different model.',
    fallbackParamStripped: 'Parameter "{field}" not supported by this provider. Stripped from the request; behavior may differ from configuration.',

    // Wiki Init Status
    wikiInitStatusReady: 'Wiki initialized',
    wikiInitStatusNotReady: 'Wiki not initialized — will auto-create on first ingestion',

    // Wiki Folder
    wikiSection: 'Wiki Configuration',
    wikiFolderName: 'Wiki Folder',
    wikiFolderDesc: 'Location for generated Wiki pages',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'Please configure API Key first',
    llmNotReady: 'LLM is not configured. Please go to Settings → Karpathy LLM Wiki to configure your provider, fetch available models, and pass the connection test.',
    errorFetchFailed: 'Failed: {}',

    // Query Settings
    querySectionTitle: 'Wiki Query Configuration',
    maxConversationHistoryName: 'Max Conversation History',
    maxConversationHistoryDesc: 'Limit conversation messages to avoid token overflow',
    maxConversationHistoryHint: 'Recommended: not exceed 50 rounds',
    numberRangeValidation: 'Please enter a number between 1-50',
    numberRangeClamped: 'Value exceeds range (1-500), automatically set to {}',

    // Query Modal UI
    queryModalTitle: 'Query Wiki - Conversational Query',
    queryModalPlaceholder: 'Enter question...',
    queryModalSendButton: 'Send',
    queryModalStopButton: 'Stop',
    queryModalSaveButton: 'Save to Wiki',
    queryModalClearButton: 'Clear History',
    queryModalHistoryCount: 'Conversation history: {}/{} rounds',
    queryModalStreaming: 'Streaming...',
    queryModalFallbackStreaming: 'Streaming not supported, switched to non-streaming. Please wait...',
    queryPhaseSearching: 'Analyzing Wiki index, selecting relevant pages...',
    queryPhaseFoundPages: 'Found {count} page(s): {pages}',
    queryPhaseLoadingPages: 'Loading page content...',
    queryPhaseContextReady: 'Context ready. Generating answer...',
    queryPhaseGenerating: 'Generating... (elapsed {time}s)',
    queryPhaseNonStreaming: 'Non-streaming mode, generating response... (elapsed {time}s)',
    queryModalErrorPrefix: 'Error: ',
    queryModalHint: 'Queries based on Wiki content. Click "Save to Wiki" to extract valuable conversations as Wiki pages.',

    // v1.20.0: Query Wiki thinking-block collapsible summary
    queryThinkingSummary: 'Thinking process',
    queryThinkingSteps: 'steps',

    // Error Messages
    errorLLMClientNotInit: 'LLM Client not initialized. Please save settings.',
    errorIngestFailed: 'Ingest failed: ',
    errorQueryFailed: 'Query failed: ',

    // Success Messages
    ingestSuccess: 'Ingest successful: {} pages created, {} pages updated',
    querySuccess: 'Query completed',
    lintSuccess: 'Wiki lint completed',
    lintReadingPages: 'Reading {count} Wiki pages...',
    lintReadingPagesProgress: 'Reading Wiki pages: {current}/{total}...',
    lintScanningLinks: 'Scanning dead links...',
    lintScanningLinksProgress: 'Scanning dead links: {current}/{total}...',
    lintCheckingDuplicates: 'Checking for duplicate pages...',
    lintCheckingDuplicatesProgress: 'Verifying duplicates: batch {current} ...',
    lintFixingPolluted: 'Fixing polluted page {current}/{total}: {title} → {newTitle}',
    lintModalFixPolluted: '🧹 Fix polluted pages ({count})',
    lintDuplicateCheckFailed: 'Duplicate detection failed — see console for details',
    lintDuplicateCheckFailedDetail: 'Duplicate check failed at {step}: {error}',
    lintMergeItemFailed: 'Merge failed: {source} → {target} — {error}',
    lintAliasesMissing: 'Aliases missing: {count} page(s) without aliases',
    lintAliasesSection: 'Pages missing aliases [{count}]',
    lintAliasesItem: '- [[{page}]]',
    lintAliasesCompleteBtn: 'Complete aliases ({count})',
    lintAliasesFilling: 'Generating aliases {current}/{total}: {page}',
    lintAliasesFilled: 'Alias completion complete. Filled {filled}/{total} pages.',
    lintAliasesFillFailed: 'Alias generation failed: {page} — {error}',
    // Issue #85 v7: tag-violation retag notifications
    lintTagViolationFiring: 'Retagging {current}/{total}: {path}',
    lintTagViolationFailed: 'Retag failed for {path}: {error}',
    lintTagViolationFixed: 'Retag complete. Fixed {fixed}/{total} page(s).',
    lintTagViolationFixedNone: 'Retag complete. No pages needed fixing (LLM kept current tags).',
    lintTagViolationSection: 'Pages with out-of-vocabulary tags [{count}]',
    lintTagViolationItem: '- [[{path}]] — invalid: {tags}',
    lintTagViolationRetagBtn: '🏷️ Retag {count} page(s) with LLM',
    lintFixItemFailed: 'Fix failed: [[{target}]] — {error}',
    lintLinkItemFailed: 'Link failed: {page} — {error}',
    lintRetrying: 'Retrying ({attempt}/{max}) after error...',
    lintAnalyzingLLM: 'LLM analyzing Wiki health...',
    saveToWikiSuccess: 'Conversation saved to Wiki!',
    saveSummary: '{entities} entities, {concepts} concepts, {pages} pages',
    aliasAdded: 'Added alias \'{alias}\' to page \'{page}\'',

    // Status Messages
    ingestingSources: 'Ingesting sources...',
    queryingWiki: 'Querying Wiki...',
    lintingWiki: 'Linting Wiki...',
    savingToWiki: 'Saving conversation to Wiki...',
    clearingHistory: 'Clearing conversation history...',

    // Buttons
    ingestButton: 'Ingest',
    queryButton: 'Query',
    lintButton: 'Lint',
    cancelButton: 'Cancel',

    // Links
    karpathyGistLink: 'Karpathy\'s LLM Wiki Gist',
    obsidianPluginAPI: 'Obsidian Plugin API',
    anthropicSDK: 'Anthropic SDK',
    openaiSDK: 'OpenAI SDK',

    // Other
    availableModelsLoading: 'Loading available models...',
    noModelsAvailable: 'No models available',

    // LLM Language Hint
    llmLanguageHint: 'Please answer in English.',

    // Schema Configuration
    schemaSection: 'Schema Configuration',
    enableSchemaName: 'Enable Schema',
    enableSchemaDesc: 'Generate and inject schema/config.md into all LLM prompts for structured Wiki output',
    viewSchemaButton: 'View / Edit Schema',
    regenerateSchemaButton: 'Regenerate Default Schema',
    schemaRegeneratedNotice: 'Default schema regenerated.',
    schemaRegenerateFailed: 'Schema generation failed',

    // Wiki Output Language
    wikiLanguageName: 'Wiki Output Language',
    wikiLanguageDesc: 'All generated wiki pages, index, log, and query responses use this language',
    customWikiLanguageOption: 'Custom...',
    customWikiLanguageHint: 'Enter a language name (e.g. Italian, Arabic). It will be passed to the LLM as the output language directive.',
    customWikiLanguagePlaceholder: 'e.g. Italian',

    // Index & Log Labels (per language)
    indexLabels: {
      en: { subtitle: 'Auto-generated knowledge base directory', entities: 'Entities', concepts: 'Concepts', sources: 'Sources' },
      zh: { subtitle: '自动生成的知识库目录', entities: '实体', concepts: '概念', sources: '来源' },
      ja: { subtitle: '自動生成ナレッジベースディレクトリ', entities: 'エンティティ', concepts: '概念', sources: 'ソース' },
      ko: { subtitle: '자동 생성 지식 베이스 디렉토리', entities: '엔티티', concepts: '컨셉', sources: '소스' },
      de: { subtitle: 'Automatisch generiertes Wissensdatenbank-Verzeichnis', entities: 'Entitäten', concepts: 'Konzepte', sources: 'Quellen' },
      fr: { subtitle: 'Répertoire de base de connaissances généré automatiquement', entities: 'Entités', concepts: 'Concepts', sources: 'Sources' },
      es: { subtitle: 'Directorio de base de conocimiento generado automáticamente', entities: 'Entidades', concepts: 'Conceptos', sources: 'Fuentes' },
      pt: { subtitle: 'Diretório de base de conhecimento gerado automaticamente', entities: 'Entidades', concepts: 'Conceitos', sources: 'Fontes' },
    },
    logLabels: {
      en: { createdPages: 'Created pages', updatedPages: 'Updated pages', contradictionsFound: 'Contradictions found' },
      zh: { createdPages: '创建页面', updatedPages: '更新页面', contradictionsFound: '发现矛盾' },
      ja: { createdPages: '作成ページ', updatedPages: '更新ページ', contradictionsFound: '矛盾を発見' },
      ko: { createdPages: '생성 페이지', updatedPages: '업데이트 페이지', contradictionsFound: '모순 발견' },
      de: { createdPages: 'Erstellte Seiten', updatedPages: 'Aktualisierte Seiten', contradictionsFound: 'Widersprüche gefunden' },
      fr: { createdPages: 'Pages créées', updatedPages: 'Pages mises à jour', contradictionsFound: 'Contradictions trouvées' },
      es: { createdPages: 'Páginas creadas', updatedPages: 'Páginas actualizadas', contradictionsFound: 'Contradicciones encontradas' },
      pt: { createdPages: 'Páginas criadas', updatedPages: 'Páginas atualizadas', contradictionsFound: 'Contradições encontradas' },
    },

    // Extraction Settings
    extractionSectionTitle: 'Extraction',
    extractionGranularityName: 'Extraction Granularity',
    extractionGranularityDesc: 'Controls entities/concepts extracted per source file. Higher = more pages, more API tokens.\nFine: deep analysis. Standard: daily notes. Coarse: quick overview. Minimal: batch 100+ files. Custom: set your own (up to 500).\nTip: Use Minimal/Coarse for folders with many files to save time and cost.',
    extractionGranularityFine: 'Fine — deep analysis (≤100 items)',
    extractionGranularityStandard: 'Standard — daily notes (≤50 items)',
    extractionGranularityCoarse: 'Coarse — quick overview (≤10 items)',
    extractionGranularityMinimal: 'Minimal — batch 100+ files (≤5 items)',
    extractionGranularityCustom: 'Custom — set your own limits (1~500)',
    customEntityLimitName: 'Custom Entity Limit',
    customEntityLimitDesc: 'Maximum number of entities to extract per source file (1-500)',
    customConceptLimitName: 'Custom Concept Limit',
    customConceptLimitDesc: 'Maximum number of concepts to extract per source file (1-500)',

    // Issue #85 v2: Tag Vocabulary (chip input UX, embedded in Wiki Configuration)
    tagVocabularyInlineDesc: 'Controlled vocabulary for entity and concept frontmatter tags. Obsidian nested tags with "/" are preserved.',
    tagVocabularyModeName: 'Tag Vocabulary Configuration',
    tagVocabularyModeDescDefault: 'Default uses built-in tags: {}. Switch to Custom to define your own.',
    tagVocabularyModeDescCustom: 'Custom: define your own entity and concept tags below. Use the chip input — Enter or comma to add, × to remove.',
    tagVocabularyModeDefault: 'Default (built-in subtype tags)',
    tagVocabularyModeCustom: 'Custom (user-defined)',
    customEntityTagsName: 'Custom Entity Tags',
    customEntityTagsDesc: 'Press Enter or comma to add a chip. Click × to remove. Nested tags with "/" are preserved.',
    customEntityTagsPlaceholder: 'person, organization, project, place',
    customConceptTagsName: 'Custom Concept Tags',
    customConceptTagsDesc: 'Press Enter or comma to add a chip. Click × to remove. Nested tags with "/" are preserved.',
    customConceptTagsPlaceholder: 'theory, method, field, phenomenon, term',
    chipDuplicateHint: 'Duplicate tag skipped',

    // Ingestion Acceleration
    accelerationSectionTitle: 'Ingestion Acceleration',
    pageGenerationConcurrencyName: 'LLM Concurrency',
    pageGenerationConcurrencyDesc: 'Number of LLM calls in parallel during ingestion and lint operations. Higher values speed up processing but increase API costs and may trigger rate limits.',
    concurrencyValueSingular: 'Current concurrency: {} (serial — safest)',
    concurrencyValuePlural: 'Current concurrency: {} (parallel)',
    batchDelayName: 'Batch Delay (ms)',
    batchDelayDesc: 'Delay between parallel batches to prevent API rate limiting (100-2000ms). Current: {}ms. Increase if you see 429 errors.',

    // Auto Maintenance
    autoMaintainSection: 'Auto Maintenance',
    autoMaintainBetaBadge: 'BETA — Experimental feature. May have issues. Recommended for advanced users only.',
    autoWatchName: 'Watch Folders',
    autoWatchDesc: 'Automatically detect new or changed .md files in the watched folders and notify or auto-ingest',
    watchedFoldersName: 'Watched Folders',
    watchedFoldersDesc: 'Folders to watch for new content. Click "Add Folder" to select from your vault.',
    addWatchedFolderButton: 'Add Folder',
    removeWatchedFolderButton: 'Remove',
    webClipperPresetName: 'Watch Clippings (Web Clipper)',
    webClipperPresetDesc: 'Add the Clippings/ folder used by Obsidian Web Clipper to the watch list. Your web clips will be auto-ingested into the Wiki.',
    noWatchedFoldersHint: 'No folders configured. Add a folder or enable the Clippings preset.',
    autoWatchModeName: 'Watch Mode',
    autoWatchModeDesc: '"Notify Only" shows a prompt. "Auto Ingest" processes silently.',
    watchModeNotify: 'Notify Only',
    watchModeAuto: 'Auto Ingest',
    autoWatchDebounceName: 'Debounce Delay (seconds)',
    autoWatchDebounceDesc: 'Wait time before triggering ingest after a file change (1-60 seconds)',
    periodicLintName: 'Periodic Lint',
    periodicLintDesc: 'Run LLM lint on schedule, only when source files have changed since last check',
    periodicLintOff: 'Off',
    periodicLintHourly: 'Hourly',
    periodicLintDaily: 'Daily',
    periodicLintWeekly: 'Weekly',
    autoSmartFixName: 'Auto Smart Fix',
    autoSmartFixDesc: 'When lint runs, automatically apply all fixes (Smart Fix All) without showing the report modal. The fix summary is still shown on completion.',
    autoSmartFixNotice: 'Auto Smart Fix: applying all fixes...',
    startupCheckName: 'Run quick fixes on startup',
    startupCheckDesc: 'Auto-fix low-level format issues (sources, double-nested links) on plugin load. Verifies Wiki folder structure. Default ON.',
    suggestSchemaCommand: 'Suggest Schema Updates',
    autoMaintainCostWarning: '⚠️ Cost Notice: Auto-maintenance features consume API tokens. "Auto Ingest" triggers LLM calls on every source file change. "Periodic Lint" runs LLM health checks on schedule (only when source changes are detected). Configure carefully to avoid unexpected charges.',

    // Notices
    startupCheckSummary: 'Wiki has {pages} pages ({entities} entities, {concepts} concepts, {sources} sources)',
    watcherActiveNotice: 'Wiki: file watcher active — monitoring watched folders',
    watchIngestNotice: 'Wiki: {count} file(s) changed in sources/. Run "Ingest Sources" to process.',

    // Startup quick fixes detail (Issue #81)
    startupCheckTitle: 'Wiki quick fixes complete',
    startupCheckStructureLabel: 'Wiki structure',
    startupCheckStructureOk: 'complete',
    startupCheckStructureMissing: 'incomplete — will auto-create on first ingestion',
    startupCheckSourcesLabel: 'Sources normalized',
    startupCheckSourcesClean: 'already clean',
    startupCheckSourcesCleaned: 'cleaned {files} file(s), {entries} entry(ies)',
    startupCheckDisableHint: 'To disable, go to Settings → Auto Maintenance → Run quick fixes on startup',
    autoIngestRunning: 'Auto-ingesting {count} changed file(s)...',
    autoIngestComplete: 'Auto-ingest complete: {success} succeeded, {fail} failed',
    scheduledLintRunning: 'Running scheduled wiki lint...',
    wikiLintStats: 'Wiki lint: {pages} pages ({entities} entities, {concepts} concepts, {sources} sources)',
    wikiHealthStats: 'Wiki health: {pages} pages ({entities} entities, {concepts} concepts, {sources} sources){indexStatus}',
    lintWikiStart: 'Starting wiki lint...',
    lintWikiComplete: 'Wiki lint complete',
    lintWikiFailed: 'Wiki lint failed',
    analyzingSchema: 'Analyzing Wiki and generating schema suggestions...',
    schemaSuggestionGenerated: 'Schema suggestions generated, see wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: 'No schema updates needed.',
    schemaSuggestionFailed: 'Schema suggestion failed',
    schemaNotFoundNotice: 'Schema file not found. Enable schema to create it.',
    selectFolderNoMdFiles: 'No Markdown files in folder: {path}',
    batchIngestSkipNotice: 'Skipping {skipped}/{total} already-ingested files. Ingesting {new} new files...',
    batchIngestAllIngested: 'All {total} files in this folder have already been ingested.',
    batchIngestStarting: 'Ingesting {count} file(s) from "{folder}" — this may take several minutes. A report will appear when complete.',
    batchIngestComplete: 'Batch ingest complete: {success}/{total} succeeded, {fail} failed',
    batchIngestFailedFiles: 'Failed files:',
    historyTruncated: 'History truncated to last {max} rounds',
    historyCleared: 'History cleared',

    // User Feedback Loop
    reviewedPagePreserved: 'Preserving user-reviewed content for: {}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: 'Save to Wiki?',
    querySuggestSaveDesc: 'This conversation contains valuable knowledge. Save it to your Wiki?',
    querySuggestSaveYes: 'Save',
    querySuggestSaveNo: 'Dismiss',

    // Ingestion Report
    ingestReportElapsedTime: 'Elapsed time',
    ingestReportSkippedFiles: 'Skipped (already ingested)',
    ingestReportFailedGuidance: 'These items could not be automatically created. You can manually create the corresponding pages, or lower the extraction granularity and re-ingest the source file.',
    ingestReportCollisions: 'Cross-type collisions (merged as aliases)',

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: 'Ingest single source',
    cmdIngestFolder: 'Ingest from folder',
    cmdQueryWiki: 'Query wiki',
    cmdLintWiki: 'Lint wiki',
    cmdRegenerateIndex: 'Regenerate index',
    cmdSuggestSchema: 'Suggest schema updates',
    cmdCancelIngestion: 'Cancel current ingestion',
    cmdIngestActiveFile: 'Ingest current file',
    noActiveFile: 'No file is currently open',
    mdOnlyFile: 'Only Markdown files can be ingested',

    // Ingestion status bar
    ingestionStatusBar: 'Ingesting... click to cancel',
    lintStatusBar: 'Linting... click to cancel',
    ingestStatusAnalyzing: 'Ingesting… (click to cancel)',
    lintStatusReading: 'Linting… (click to cancel)',
    lintStatusDuplicates: 'Linting… (click to cancel)',
    lintStatusScanningLinks: 'Linting… (click to cancel)',
    lintStatusAnalyzing: 'Linting… (click to cancel)',
    ingestionCancelling: 'Cancelling — will stop after current batch completes',
    ingestionCancelled: 'Ingestion cancelled',
    crossTypeCollisionNotice: '{count} items merged as cross-type aliases (entity ↔ concept duplicates prevented)',

    // Lint Report
    lintReportTitle: 'Wiki lint report',
    lintReportSummary: 'Wiki status overview: {total} pages total, {aliasesMissing} pages missing aliases, {duplicates} duplicate pages, {deadLinks} dead links ({deadLinkFromDup} involve duplicates), {orphans} orphan pages ({orphanFromDup} are duplicates), {emptyPages} empty pages, {ungroundedQuotes} ungrounded quotes, {tagViolations} out-of-vocabulary tags. Lint elapsed: {elapsedSeconds}s',

    // Advanced LLM Settings (v1.20.0: default = no provider-specific overrides)
    advancedSettingsModeName: 'Advanced parameter settings',
    advancedSettingsModeDesc: 'Default uses your provider\'s own behavior — no thinking-control, temperature, or repetition-penalty fields are sent. This works for most users. Switch to Custom only if you need to explicitly override the provider defaults (e.g. force a specific thinking-control dialect, set a non-default temperature, etc.).',
    advancedSettingsDefault: 'Default (use provider behavior)',
    advancedSettingsCustom: 'Custom (override provider defaults)',
    disableThinkingName: 'Disable thinking',
    disableThinkingDesc: 'Opt-in. When enabled, the plugin sends a thinking-control directive to the provider and walks a 3-tier dialect fallback chain (anthropic → openai → none) if the provider rejects it. Use this only if your provider leaks reasoning content into the answer and you need to suppress it. Most providers handle reasoning correctly on their own — leaving this off gives better quality.',
    // Issue #137: compatibility hints for advanced settings (kept short; no
    // provider list to avoid maintenance burden when providers change).
    extractionTemperatureName: 'Extraction temperature',
    extractionTemperatureDesc: 'Range 0–2. Lower values make LLM output more deterministic and faithful. Higher values make it more creative. Leave blank to use your provider\'s default. If your provider rejects this value, the plugin automatically strips the field and shows a one-time notice.',
    chatTemperatureName: 'Query temperature',
    chatTemperatureDesc: 'Range 0–2. Same as Extraction temperature, but only affects chat/query responses. Leave blank to use your provider\'s default. If your provider rejects this value, the plugin automatically strips the field and shows a one-time notice.',
    repetitionPenaltyName: 'Repetition penalty',
    repetitionPenaltyDesc: 'Range 0–2. Higher values reduce repetitive patterns. Leave blank to use your provider\'s default. Compatibility note: many cloud providers do not accept this field. The plugin auto-strips it on 400 and shows a one-time notice.',
    temperaturePlaceholder: 'blank = provider default',
    lintDeadLinkSection: 'Dead links (detected) [{count}]',
    lintEmptyPageSection: 'Empty pages (detected) [{count}]',
    lintOrphanSection: 'Orphan pages (detected) [{count}]',
    lintContradictionSection: 'Contradictions (detected)',
    lintDuplicateSection: 'Duplicate pages (detected)',
    lintPollutedSection: 'Polluted pages (detected) [{count}]',
    lintPollutedItem: '- [[{page}]] → should be "{clean}"',
    lintSourcesNormalizedSection: 'Sources normalized (auto-fixed) [{files} files / {entries} entries]',
    lintSourcesNormalizedItem: 'Cleaned {entries} polluted sources entries across {files} file(s) (external paths, .md extensions, alias pipes removed and deduplicated).',
    lintNoIssuesFound: 'No duplicates, dead links, empty pages, orphan pages, or ungrounded quotes detected.',
    lintQuoteGroundingSection: 'Ungrounded quotes (detected) [{count}]',
    lintQuoteGroundingItem: '- [[{page}]]{sourceHint}: "{quote}"',
    lintDeadLinkItem: '- [[{source}]] → **{target}** (page does not exist){dupFlag}',
    lintDeadLinkMore: '- ... {count} more dead links',
    lintEmptyPageItem: '- [[{page}]] — less than 50 characters of substantive content',
    lintOrphanItem: '- [[{page}]] — no other Wiki pages link here{dupFlag}',
    lintDuplicateItem: '- [[{target}]] and [[{source}]] — {reason}',
    lintDeadLinkAffectedByDup: ' (⚠️ involves duplicate page)',
    lintOrphanIsDuplicate: ' (⚠️ duplicate page)',
    lintContradictionOpen: 'Open contradictions: {count}',
    lintContradictionAutoFixed: '({count} auto-fixed this run)',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: 'Detected',
    lintContradictionStatusPendingFix: 'Pending fix',
    lintLLMAnalysisHeading: '## LLM analysis',

    // Lint Analysis Prompt
    lintAnalysisPrompt: 'You are a Wiki maintenance assistant. Check the Wiki health based on the following information.\n\nWiki Index:\n{index}\n\nWiki Page Content Sample ({total} pages total, showing {sample} pages):\n{contentSample}\n\nProgrammatic check results (already verified, do not repeat):\n{progReport}\n\nCheck the following aspects (skip dead links/empty/orphans already detected by programmatic checks):\n1. **Contradictions** — whether different pages contradict each other on the same facts\n2. **Staleness** — whether any claims are clearly outdated\n3. **Missing** — which important concepts lack standalone pages\n4. **Structure** — whether page structure is reasonable and cross-references are adequate\n\nOutput format: Use Markdown, starting with "## LLM analysis". Each finding on one line "- [specific issue]". If no issues, write "No obvious issues found."',

    // Lint Fix Progress
    lintFixProgress: 'Fixing {current}/{total}: [[{target}]]',
    lintFixDeadComplete: 'Dead link fix complete. Fixed {fixed}/{total} items.',
    lintFillProgress: 'Expanding {current}/{total}: {page}',
    lintFillComplete: 'Page expansion complete. Filled {filled}/{total} pages.',
    lintDeleteCompleted: 'Deleted {count} empty stubs',
    lintDeleteFailed: 'Failed to delete {failed}/{total} empty stubs (see console for details)',
    lintFillFailed: 'Failed to expand: {page} — {error}',
    lintLinkProgress: 'Linking {current}/{total}: {page}',
    lintLinkComplete: 'Orphan linking complete. Linked {linked} pages.',
    lintFixNoAction: 'No action taken (no client)',
    lintFixIndexUpdated: 'Wiki index and log updated.',
    lintFixAllComplete: 'All fixes complete. See log for details.',
    lintPollutedFixed: 'Polluted pages fixed: {fixed}/{total}. Index regenerated.',
    regenerateIndexCompleted: 'Index regenerated',
    operationFailed: 'Failed: ',

    // Lint Report Modal
    lintModalActionsTitle: 'Fix suggestions (requires LLM tokens):',
    lintLogReference: 'Full report saved to log.md',
    lintModalFixDeadLinks: 'Fix dead links ({count})',
    lintModalExpandEmpty: 'Expand empty pages ({count})',
    lintModalDeleteEmpty: 'Delete empty stubs ({count})',   
    lintModalLinkOrphans: 'Link orphan pages ({count})',
    lintModalAnalyzeSchema: 'Analyze schema',
    lintModalMergeDuplicates: 'Merge duplicates ({count})',
    lintModalFixAll: 'Smart fix all ({count} issues)',
    lintMergeProgress: 'Merging {current}/{total}: {source} → {target}',
    lintMergeComplete: 'Duplicate merge complete. Merged {merged}/{total} pairs.',

    // Ingest Report Modal
    ingestReportTitle: 'Ingest report',
    ingestReportSourceFile: 'Source file',
    ingestReportCreated: 'Created',
    ingestReportUpdated: 'Updated',
    ingestReportContradictions: 'Contradictions found',
    ingestReportFailedTitle: 'Failed to ingest',
    ingestReportErrorDetail: 'Error detail',
    ingestReportClose: 'Close',
    ingestReportCreatedPages: 'Created pages: {count}',
    ingestReportUpdatedPages: 'Updated pages: {count}',
    ingestReportEntitiesCount: '{count} entities',
    ingestReportConceptsCount: '{count} concepts',
    ingestReportContradictionsFound: 'Contradictions found: {count}',
    ingestReportEntityType: 'Entity',
    ingestReportConceptType: 'Concept',
    timeMinutes: 'min',
    timeSeconds: 'sec',

    // Rate Limit Warnings
    rateLimitDetected: '⚠️ Rate limit detected: {count} page(s) failed with 429 errors. Try: (1) Lower concurrency to {suggestedConcurrency} or 1 (serial), (2) Increase batch delay to {suggestedDelay}ms, (3) Switch to a provider with higher rate limits.',
    rateLimitDetectedShort: '⚠️ Rate limit hit — consider lowering concurrency or increasing batch delay in Settings → Ingestion Acceleration.',

    // Long source warning
    longSourceNotice: '📄 "{filename}" has {lines} lines ({size}). Long texts require iterative batch extraction — the LLM reads the full document in multiple passes. This may take several minutes. Please be patient.',
    longSourceNoticeShort: '📄 Large file detected ({lines} lines). Ingestion may take a while.',
} as const;
