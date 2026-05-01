// Internationalization texts for plugin UI

export const TEXTS = {
  en: {
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
    queryModalPlaceholder: 'Enter question... (Enter to send)',
    queryModalSendButton: 'Send',
    queryModalSaveButton: 'Save to Wiki',
    queryModalClearButton: 'Clear History',
    queryModalHistoryCount: 'Conversation history: {}/{} rounds',
    queryModalStreaming: 'Streaming...',
    queryModalHint: 'Queries based on Wiki content. Click "Save to Wiki" to extract valuable conversations as Wiki pages.',

    // Error Messages
    errorLLMClientNotInit: 'LLM Client not initialized. Please save settings.',
    errorIngestFailed: 'Ingest failed: ',
    errorQueryFailed: 'Query failed: ',

    // Success Messages
    ingestSuccess: 'Ingest successful: {} pages created, {} pages updated',
    querySuccess: 'Query completed',
    lintSuccess: 'Wiki lint completed',
    saveToWikiSuccess: 'Conversation saved to Wiki!',

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

    // Extraction Settings
    extractionSectionTitle: 'Extraction',
    extractionGranularityName: 'Extraction Granularity',
    extractionGranularityDesc: 'Controls how many entities/concepts are extracted. Higher granularity = more pages created, more API tokens consumed.',
    extractionGranularityFine: 'Fine — extract all including edge mentions (most pages, highest token cost)',
    extractionGranularityStandard: 'Standard — core + significant entities/concepts (balanced)',
    extractionGranularityCoarse: 'Coarse — only the most central entities/concepts (fewest pages, lowest token cost)',

    // Auto Maintenance
    autoMaintainSection: 'Auto Maintenance',
    autoMaintainBetaBadge: 'BETA — Experimental feature. May have issues. Recommended for advanced users only.',
    autoWatchName: 'Watch Sources Folder',
    autoWatchDesc: 'Automatically detect changes in sources/ and notify or auto-ingest',
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
    watchIngestNotice: '{count} file(s) changed in sources/. Run "Ingest Sources" to process.',
    autoIngestRunning: 'Auto-ingesting {count} changed file(s)...',
    autoIngestComplete: 'Auto-ingest complete: {success} succeeded, {fail} failed',
    lintWikiStart: 'Starting wiki lint...',
    lintWikiComplete: 'Wiki lint complete',
    lintWikiFailed: 'Wiki lint failed',
    analyzingSchema: 'Analyzing Wiki and generating schema suggestions...',
    schemaSuggestionGenerated: 'Schema suggestions generated, see wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: 'No schema updates needed.',
    schemaSuggestionFailed: 'Schema suggestion failed',
    selectFolderNoMdFiles: 'No Markdown files in folder: {path}',
    batchIngestComplete: 'Batch ingest complete: {success}/{total} succeeded, {fail} failed',
    batchIngestFailedFiles: 'Failed files:',

    // User Feedback Loop
    reviewedPagePreserved: 'Preserving user-reviewed content for: {}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: 'Save to Wiki?',
    querySuggestSaveDesc: 'This conversation contains valuable knowledge. Save it to your Wiki?',
    querySuggestSaveYes: 'Save',
    querySuggestSaveNo: 'Dismiss',

    // Ingestion Report
    ingestReportElapsedTime: 'Elapsed time',
    ingestReportFailedGuidance: 'These items could not be automatically created. You can manually create the corresponding pages, or lower the extraction granularity and re-ingest the source file.',
  },

  zh: {
    // 插件信息
    pluginTitle: 'Karpathy LLM Wiki 设置',
    pluginIntro: '本插件为 Obsidian 实现了 {{link}} 概念。它读取你的笔记，用 AI 提取实体和概念，在 Vault 中构建结构化、互联的知识库。',
    karpathyLinkText: 'Andrej Karpathy 的 LLM Wiki',

    // 功能部分
    featuresTitle: '使用方式',
    workflow1Title: '1. 摄入 (Ingest)',
    workflow1Desc: '选择笔记 → AI 提取实体、概念、关系 → 生成 Wiki 页面。',
    workflow2Title: '2. 查询 (Query)',
    workflow2Desc: '与 Wiki 对话，答案基于你已摄入的知识，而非通用知识。',
    workflow3Title: '3. 维护 (Maintain)',
    workflow3Desc: '自动生成索引、交叉链接、健康检查，保持 Wiki 整洁。',

    // 语言切换
    languageTitle: '界面语言',
    languageDesc: '选择设置面板的显示语言',
    languageEn: 'English (英文)',
    languageZh: '中文',

    // 状态
    statusTitle: 'LLM Client 状态',
    statusInitialized: '已初始化',
    statusNotInitialized: '未初始化',
    currentProvider: '当前提供商',

    // Provider 设置
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

    // Ollama 提示
    ollamaHint: 'Ollama 本地运行，无需 API Key',

    // 模型选择
    modelSection: '模型选择',
    fetchModelsName: '获取可用模型',
    fetchModelsDesc: '从 Provider API 获取最新的模型列表',
    fetchModelsButton: '获取模型列表',
    fetchingModels: '获取中...',
    fetchSuccess: '获取成功！共 {} 个可用模型',
    fetchFailed: '获取失败或列表为空，请手动输入模型名称',
    fetchNotSupported: '该 Provider 不支持模型列表查询',

    selectModelName: '选择模型',
    selectModelDesc: '从 {} 个可用模型中选择',
    customInputOption: '自定义输入...',
    customInputHint: '如需使用其他模型，请选择"自定义输入..."',

    modelName: '模型名称',
    modelDescCustom: '当前使用自定义模型（可重新获取列表）',
    modelDescRecommended: '推荐：{}',
    modelDescManual: '手动输入模型名称',

    switchToDropdown: '切换到下拉选择',
    useDropdownButton: '使用下拉选择',

    // 测试 & 保存
    testConnectionName: '测试连接',
    testConnectionDesc: '验证配置能否成功调用 LLM API',
    testButton: '测试连接',
    testing: '测试中...',

    saveSettingsName: '保存设置',
    saveSettingsDesc: '保存当前配置',
    saveButton: '保存设置',
    savedNotice: '设置已保存！',

    // Wiki 文件夹
    wikiSection: 'Wiki 文件夹配置',
    wikiFolderName: 'Wiki 文件夹',
    wikiFolderDesc: '存放生成的 Wiki 页面',
    wikiFolderPlaceholder: 'wiki',

    // 错误
    errorNoApiKey: '请先配置 API Key',
    errorFetchFailed: '获取失败：{}',

    // Query 设置
    querySectionTitle: 'Wiki 查询配置',
    maxConversationHistoryName: '对话历史上限',
    maxConversationHistoryDesc: '限制对话消息数，避免超出LLM token限制',
    maxConversationHistoryHint: '推荐：不超过50轮',
    numberRangeValidation: '请输入1-50之间的数字',

    // Query Modal UI
    queryModalTitle: 'Query Wiki - 对话式查询',
    queryModalPlaceholder: '输入问题... (Enter发送)',
    queryModalSendButton: '发送',
    queryModalSaveButton: '保存到Wiki',
    queryModalClearButton: '清空历史',
    queryModalHistoryCount: '对话历史: {}/{} 轮',
    queryModalStreaming: '流式生成中...',
    queryModalHint: '查询基于Wiki内容。点击"保存到Wiki"可将有价值对话提炼为Wiki页面。',

    // 错误消息
    errorLLMClientNotInit: 'LLM Client 未初始化。请保存设置。',
    errorIngestFailed: '摄入失败：',
    errorQueryFailed: '查询失败：',

    // 成功消息
    ingestSuccess: '摄入成功：创建{}页，更新{}页',
    querySuccess: '查询完成',
    lintSuccess: 'Wiki 维护完成',
    saveToWikiSuccess: '对话已保存到Wiki！',

    // 状态消息
    ingestingSources: '正在摄入源文件...',
    queryingWiki: '正在查询 Wiki...',
    lintingWiki: '正在维护 Wiki...',
    savingToWiki: '正在保存对话到Wiki...',
    clearingHistory: '清空对话历史...',

    // 按钮
    ingestButton: '摄入',
    queryButton: '查询',
    lintButton: '维护',
    cancelButton: '取消',

    // 链接
    karpathyGistLink: 'Karpathy\'s LLM Wiki Gist',
    obsidianPluginAPI: 'Obsidian Plugin API',
    anthropicSDK: 'Anthropic SDK',
    openaiSDK: 'OpenAI SDK',

    // 其他
    availableModelsLoading: '加载可用模型...',
    noModelsAvailable: '无可用模型',

    // LLM 语言提示
    llmLanguageHint: '请用中文回答。',

    // Schema 配置
    schemaSection: 'Schema 配置',
    enableSchemaName: '启用 Schema',
    enableSchemaDesc: '生成 schema/config.md 并注入到所有 LLM 提示词中，指导 Wiki 结构化输出',
    viewSchemaButton: '查看 / 编辑 Schema',
    regenerateSchemaButton: '重新生成默认 Schema',
    schemaRegeneratedNotice: '默认 Schema 已重新生成。',

    // 知识提取
    extractionSectionTitle: '知识提取',
    extractionGranularityName: '提取颗粒度',
    extractionGranularityDesc: '控制从源文件中提取实体/概念的数量。颗粒度越高，生成页面越多，API Token 消耗越大。',
    extractionGranularityFine: '精细 — 提取全部包括边缘提及（页面最多、Token 消耗最高）',
    extractionGranularityStandard: '标准 — 核心 + 重要实体/概念（均衡）',
    extractionGranularityCoarse: '粗放 — 仅提取最核心的实体/概念（页面最少、Token 消耗最低）',

    // 自动维护
    autoMaintainSection: '自动维护',
    autoMaintainBetaBadge: 'BETA 测试 — 实验性功能，可能存在问题，仅建议高级用户使用。',
    autoWatchName: '监听 Sources 文件夹',
    autoWatchDesc: '自动检测 sources/ 中的文件变更，通知或自动摄入',
    autoWatchModeName: '监听模式',
    autoWatchModeDesc: '"仅通知"显示提示。"自动摄入"静默处理。',
    watchModeNotify: '仅通知',
    watchModeAuto: '自动摄入',
    autoWatchDebounceName: '防抖延迟 (ms)',
    autoWatchDebounceDesc: '文件变更后等待多久触发摄入 (1000-60000)',
    periodicLintName: '定时维护',
    periodicLintDesc: '定期检查 Wiki 健康状况，有源文件变更时才执行 LLM 维护',
    periodicLintOff: '关闭',
    periodicLintHourly: '每小时',
    periodicLintDaily: '每天',
    periodicLintWeekly: '每周',
    startupCheckName: '启动健康检查',
    startupCheckDesc: '插件加载时扫描 Wiki 健康状况',
    suggestSchemaCommand: '建议 Schema 更新',
    autoMaintainCostWarning: '⚠️ 费用提醒：自动维护功能会消耗 API Token。"自动摄入"模式在每次源文件变更时触发 LLM 调用。"定时维护"定期运行 LLM 健康检查（仅在有新变更时执行）。请谨慎配置以避免意外费用。',

    // 通知
    startupCheckSummary: 'Wiki 共 {pages} 页（{entities} 个实体、{concepts} 个概念、{sources} 个来源）',
    watchIngestNotice: 'sources/ 中有 {count} 个文件变更。请执行"摄入源文件"处理。',
    autoIngestRunning: '正在自动摄入 {count} 个变更文件...',
    autoIngestComplete: '自动摄入完成：成功 {success}，失败 {fail}',
    lintWikiStart: '开始维护 wiki...',
    lintWikiComplete: '维护完成',
    lintWikiFailed: '维护失败',
    analyzingSchema: '正在分析 Wiki 并生成 Schema 建议...',
    schemaSuggestionGenerated: 'Schema 建议已生成，请查看 wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: '未检测到 Schema 需要更新。',
    schemaSuggestionFailed: 'Schema 建议生成失败',
    selectFolderNoMdFiles: '文件夹 {path} 中没有 Markdown 文件',
    batchIngestComplete: '批量摄入完成: 成功 {success}/{total}, 失败 {fail}',
    batchIngestFailedFiles: '失败的文件:',

    // 用户反馈闭环
    reviewedPagePreserved: '已保留用户审阅内容: {}',

    // Query 回流
    querySuggestSaveTitle: '保存到 Wiki？',
    querySuggestSaveDesc: '此对话包含有价值的知识点，是否保存到 Wiki？',
    querySuggestSaveYes: '保存',
    querySuggestSaveNo: '忽略',

    // 摄入报告
    ingestReportElapsedTime: '耗时',
    ingestReportFailedGuidance: '这些条目未能自动创建。您可手动创建对应页面，或降低提取颗粒度后重新摄入源文件。',
  }
};