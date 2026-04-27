// Internationalization texts for plugin UI

export const TEXTS = {
  en: {
    // Plugin Info
    pluginTitle: 'Karpathy LLM Wiki Settings',
    pluginIntro: 'This plugin implements Karpathy\'s LLM Wiki concept for Obsidian.',
    conceptOrigin: 'Concept Origin:',

    // Features Section
    featuresTitle: 'Features',
    feature1: 'Multi-Provider LLM Support',
    feature2: 'Intelligent Source Ingestion',
    feature3: 'Bidirectional Wiki Links',
    feature4: 'Knowledge Graph Visualization',
    feature5: 'Wiki Query Assistant',
    feature6: 'Auto Wiki Maintenance',

    // Provider Settings
    providerSection: 'LLM Provider Configuration',
    providerLabel: 'LLM Provider',
    providerAnthropic: 'Anthropic (Claude)',
    providerOpenAI: 'OpenAI / OpenAI Compatible',
    providerDeepSeek: 'DeepSeek',
    providerKimi: 'Kimi (Moonshot)',
    providerGLM: 'GLM (Zhipu AI)',
    providerOllama: 'Ollama (Local)',
    providerCustom: 'Custom OpenAI-Compatible',

    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Enter your API key',
    baseUrlLabel: 'Base URL (Optional)',
    baseUrlPlaceholder: 'Custom endpoint URL',
    baseUrlHint: 'Override default API endpoint',

    modelLabel: 'Model',
    modelPlaceholder: 'Select or enter model name',
    customModelOption: 'Use Custom Model Name',
    customModelPlaceholder: 'Enter custom model name',

    testConnectionButton: 'Test Connection',
    fetchModelsButton: 'Fetch Available Models',
    saveSettingsButton: 'Save Settings',
    resetButton: 'Reset to Default',

    connectionSuccess: 'Connection successful!',
    connectionFailed: 'Connection failed: ',
    modelsFetched: 'Available models fetched successfully',
    modelsFetchFailed: 'Failed to fetch models: ',
    settingsSaved: 'Settings saved successfully!',

    // Wiki Settings
    wikiSection: 'Wiki Configuration',
    languageLabel: 'Interface Language',
    languageEn: 'English',
    languageZh: 'Chinese (中文)',
    sourceFolderLabel: 'Source Folder',
    sourceFolderPlaceholder: 'sources',
    wikiFolderLabel: 'Wiki Folder',
    wikiFolderPlaceholder: 'wiki',

    // Query Settings
    querySectionTitle: 'Wiki Query Configuration',
    maxConversationHistoryName: 'Max Conversation History',
    maxConversationHistoryDesc: 'Limit conversation messages to avoid token overflow',
    maxConversationHistoryHint: 'Recommended: not exceed 50 rounds',

    // Query Modal UI
    queryModalTitle: 'Query Wiki - Conversational Query',
    queryModalPlaceholder: 'Enter question... (Enter to send)',
    queryModalSendButton: 'Send',
    queryModalSaveButton: 'Save to Wiki',
    queryModalClearButton: 'Clear History',
    queryModalHistoryCount: 'Conversation history: {}/{} rounds',
    queryModalStreaming: 'Streaming...',
    queryModalHint: '💡 Queries based on Wiki content. Click "Save to Wiki" to extract valuable conversations as Wiki pages.',

    // Error Messages
    errorNoApiKey: 'Please configure API Key first',
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
    customInputOption: 'Custom (enter manually)',
    availableModelsLoading: 'Loading available models...',
    noModelsAvailable: 'No models available',
  },

  zh: {
    // 插件信息
    pluginTitle: 'Karpathy LLM Wiki 设置',
    pluginIntro: '本插件为 Obsidian 实现 Karpathy 的 LLM Wiki 概念。',
    conceptOrigin: '概念来源：',

    // 功能部分
    featuresTitle: '功能特性',
    feature1: '多 Provider LLM 支持',
    feature2: '智能源文件摄入',
    feature3: '双向 Wiki 链接',
    feature4: '知识图谱可视化',
    feature5: 'Wiki 查询助手',
    feature6: '自动 Wiki 维护',

    // Provider 设置
    providerSection: 'LLM Provider 配置',
    providerLabel: 'LLM Provider',
    providerAnthropic: 'Anthropic (Claude)',
    providerOpenAI: 'OpenAI / OpenAI 兼容',
    providerDeepSeek: 'DeepSeek',
    providerKimi: 'Kimi (Moonshot)',
    providerGLM: 'GLM (智谱 AI)',
    providerOllama: 'Ollama (本地)',
    providerCustom: '自定义 OpenAI 兼容',

    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: '输入你的 API Key',
    baseUrlLabel: 'Base URL (可选)',
    baseUrlPlaceholder: '自定义 endpoint URL',
    baseUrlHint: '覆盖默认 API endpoint',

    modelLabel: '模型',
    modelPlaceholder: '选择或输入模型名称',
    customModelOption: '使用自定义模型名称',
    customModelPlaceholder: '输入自定义模型名称',

    testConnectionButton: '测试连接',
    fetchModelsButton: '获取可用模型',
    saveSettingsButton: '保存设置',
    resetButton: '重置为默认',

    connectionSuccess: '连接成功！',
    connectionFailed: '连接失败：',
    modelsFetched: '可用模型获取成功',
    modelsFetchFailed: '获取模型失败：',
    settingsSaved: '设置保存成功！',

    // Wiki 设置
    wikiSection: 'Wiki 配置',
    languageLabel: '界面语言',
    languageEn: '英文 (English)',
    languageZh: '中文',
    sourceFolderLabel: '源文件文件夹',
    sourceFolderPlaceholder: 'sources',
    wikiFolderLabel: 'Wiki 文件夹',
    wikiFolderPlaceholder: 'wiki',

    // Query 设置
    querySectionTitle: 'Wiki 查询配置',
    maxConversationHistoryName: '对话历史上限',
    maxConversationHistoryDesc: '限制对话消息数，避免超出LLM token限制',
    maxConversationHistoryHint: '推荐：不超过50轮',

    // Query Modal UI
    queryModalTitle: 'Query Wiki - 对话式查询',
    queryModalPlaceholder: '输入问题... (Enter发送)',
    queryModalSendButton: '发送',
    queryModalSaveButton: '保存到Wiki',
    queryModalClearButton: '清空历史',
    queryModalHistoryCount: '对话历史: {}/{} 轮',
    queryModalStreaming: '流式生成中...',
    queryModalHint: '💡 查询基于Wiki内容。点击"保存到Wiki"可将有价值对话提炼为Wiki页面。',

    // 错误消息
    errorNoApiKey: '请先配置 API Key',
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
    customInputOption: '自定义（手动输入）',
    availableModelsLoading: '加载可用模型...',
    noModelsAvailable: '无可用模型',
  }
};