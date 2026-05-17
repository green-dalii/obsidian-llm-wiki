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
    languageDesc: 'Select your preferred language for settings panel',
    languageEn: 'English',
    languageZh: 'Chinese (中文)',

    // Status
    statusTitle: 'LLM Client Status',
    statusInitialized: 'Initialized',
    statusNotInitialized: 'Not initialized',
    currentProvider: 'Current Provider',

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
    ollamaHint: 'Ollama runs locally, no API Key required',

    // Model Selection
    modelSection: 'Model Selection',
    fetchModelsName: 'Fetch Available Models',
    fetchModelsDesc: 'Get latest model list from Provider API',
    fetchModelsButton: 'Fetch Models',
    fetchingModels: 'Fetching...',
    fetchSuccess: 'Success! {} models available',
    fetchFailed: 'Failed or empty list, please input model name manually',
    fetchNotSupported: 'Provider doesn\'t support model list query',

    selectModelName: 'Select Model',
    selectModelDesc: 'Choose from {} available models',
    customInputOption: 'Custom input...',
    customInputHint: 'To use other models, select "Custom input..."',

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
    savedNotice: 'Settings saved!',

    // Wiki Folder
    wikiSection: 'Wiki Folder Configuration',
    wikiFolderName: 'Wiki Folder',
    wikiFolderDesc: 'Location for generated Wiki pages',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'Please configure API Key first',
    errorFetchFailed: 'Failed: {}',

    // Query Settings
    querySectionTitle: 'Wiki Query Configuration',
    maxConversationHistoryName: 'Max Conversation History',
    maxConversationHistoryDesc: 'Limit conversation messages to avoid token overflow',
    maxConversationHistoryHint: 'Recommended: not exceed 50 rounds',
    numberRangeValidation: 'Please enter a number between 1-50',

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
    lintDuplicateCheckFailed: 'Duplicate detection failed — see console for details',
    lintDuplicateCheckFailedDetail: 'Duplicate check failed at {step}: {error}',
    lintMergeItemFailed: 'Merge failed: {source} → {target} — {error}',
    lintAliasesMissing: 'Aliases missing: {count} page(s) without aliases',
    lintAliasesCompleteBtn: 'Complete aliases ({count})',
    lintAliasesFilling: 'Generating aliases {current}/{total}: {page}',
    lintAliasesFilled: 'Alias completion complete. Filled {filled}/{total} pages.',
    lintAliasesFillFailed: 'Alias generation failed: {page} — {error}',
    lintFixItemFailed: 'Fix failed: [[{target}]] — {error}',
    lintLinkItemFailed: 'Link failed: {page} — {error}',
    lintRetrying: 'Retrying ({attempt}/{max}) after error...',
    lintAnalyzingLLM: 'LLM analyzing Wiki health...',
    saveToWikiSuccess: 'Conversation saved to Wiki!',
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
    extractionGranularityDesc: 'Controls how many entities/concepts are extracted. Higher granularity = more pages created, more API tokens consumed.',
    extractionGranularityFine: 'Fine — extract all including edge mentions (most pages, highest token cost)',
    extractionGranularityStandard: 'Standard — core + significant entities/concepts (balanced)',
    extractionGranularityCoarse: 'Coarse — only the most central entities/concepts (fewest pages, lowest token cost)',

    // Ingestion Acceleration
    accelerationSectionTitle: 'Ingestion Acceleration',
    pageGenerationConcurrencyName: 'Page Generation Concurrency',
    pageGenerationConcurrencyDesc: 'Number of pages to generate in parallel during single-source ingestion. Higher values speed up ingestion but increase API costs and may trigger rate limits.',
    concurrencyValueSingular: '{} (serial — safest)',
    concurrencyValuePlural: '{} (parallel)',
    batchDelayName: 'Batch Delay (ms)',
    batchDelayDesc: 'Delay between parallel batches to prevent API rate limiting (100-2000ms). Increase if you see 429 errors.',

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
    autoWatchDebounceName: 'Debounce Delay (ms)',
    autoWatchDebounceDesc: 'Wait time before triggering ingest after a file change (1000-60000)',
    periodicLintName: 'Periodic Lint',
    periodicLintDesc: 'Run LLM lint on schedule, only when source files have changed since last check',
    periodicLintOff: 'Off',
    periodicLintHourly: 'Hourly',
    periodicLintDaily: 'Daily',
    periodicLintWeekly: 'Weekly',
    startupCheckName: 'Startup Health Check',
    startupCheckDesc: 'Scan wiki health when plugin loads',
    suggestSchemaCommand: 'Suggest Schema Updates',
    autoMaintainCostWarning: '⚠️ Cost Notice: Auto-maintenance features consume API tokens. "Auto Ingest" triggers LLM calls on every source file change. "Periodic Lint" runs LLM health checks on schedule (only when source changes are detected). Configure carefully to avoid unexpected charges.',

    // Notices
    startupCheckSummary: 'Wiki has {pages} pages ({entities} entities, {concepts} concepts, {sources} sources)',
    watcherActiveNotice: 'Wiki: file watcher active — monitoring watched folders',
    watchIngestNotice: 'Wiki: {count} file(s) changed in sources/. Run "Ingest Sources" to process.',
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

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: 'Ingest single source',
    cmdIngestFolder: 'Ingest from folder',
    cmdQueryWiki: 'Query wiki',
    cmdLintWiki: 'Lint wiki',
    cmdRegenerateIndex: 'Regenerate index',
    cmdSuggestSchema: 'Suggest schema updates',

    // Lint Report
    lintReportTitle: 'Wiki lint report',
    lintReportSummary: 'Wiki status overview: {total} pages total, {aliasesMissing} pages missing aliases, {duplicates} duplicate pages, {deadLinks} dead links ({deadLinkFromDup} involve duplicates), {orphans} orphan pages ({orphanFromDup} are duplicates), {emptyPages} empty pages',
    lintDeadLinkSection: 'Dead links (detected)',
    lintEmptyPageSection: 'Empty pages (detected)',
    lintOrphanSection: 'Orphan pages (detected)',
    lintContradictionSection: 'Contradictions (detected)',
    lintDuplicateSection: 'Duplicate pages (detected)',
    lintNoIssuesFound: 'No duplicates, dead links, empty pages, or orphan pages detected.',
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
    lintFillFailed: 'Failed to expand: {page} — {error}',
    lintLinkProgress: 'Linking {current}/{total}: {page}',
    lintLinkComplete: 'Orphan linking complete. Linked {linked} pages.',
    lintFixNoAction: 'No action taken (no client)',
    lintFixIndexUpdated: 'Wiki index and log updated.',
    lintFixAllComplete: 'All fixes complete. See log for details.',

    // Lint Report Modal
    lintModalActionsTitle: 'Fix suggestions (requires LLM tokens):',
    lintModalFixDeadLinks: 'Fix dead links ({count})',
    lintModalExpandEmpty: 'Expand empty pages ({count})',
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
} as const;
