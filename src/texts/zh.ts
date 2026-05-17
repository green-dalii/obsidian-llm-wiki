export const ZH_TEXTS = {
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
    queryModalPlaceholder: '输入问题...',
    queryModalSendButton: '发送',
    queryModalStopButton: '停止',
    queryModalSaveButton: '保存到Wiki',
    queryModalClearButton: '清空历史',
    queryModalHistoryCount: '对话历史: {}/{} 轮',
    queryModalStreaming: '流式生成中...',
    queryModalFallbackStreaming: '端点不支持流式传输，已回退至非流式模式，请耐心等待...',
    queryPhaseSearching: '正在分析 Wiki 索引，查找相关资料...',
    queryPhaseFoundPages: '找到 {count} 个资料：{pages}',
    queryPhaseLoadingPages: '正在加载页面内容...',
    queryPhaseContextReady: '资料就绪，正在生成回复...',
    queryPhaseGenerating: '正在生成回复...（已等待 {time}s）',
    queryPhaseNonStreaming: '非流式模式，生成中，请耐心等待...（已等待 {time}s）',
    queryModalErrorPrefix: '错误：',
    queryModalHint: '查询基于Wiki内容。点击"保存到Wiki"可将有价值对话提炼为Wiki页面。',

    // 错误消息
    errorLLMClientNotInit: 'LLM Client 未初始化。请保存设置。',
    errorIngestFailed: '摄入失败：',
    errorQueryFailed: '查询失败：',

    // 成功消息
    ingestSuccess: '摄入成功：创建{}页，更新{}页',
    querySuccess: '查询完成',
    lintSuccess: 'Wiki 维护完成',
    lintReadingPages: '正在读取 {count} 个 Wiki 页面...',
    lintReadingPagesProgress: '正在读取 Wiki 页面：{current}/{total}...',
    lintScanningLinks: '正在扫描断链...',
    lintScanningLinksProgress: '正在扫描断链：{current}/{total}...',
    lintCheckingDuplicates: '正在检查重复页面...',
    lintDuplicateCheckFailed: '重复检测失败 — 详见控制台',
    lintDuplicateCheckFailedDetail: '重复检测在{step}失败：{error}',
    lintMergeItemFailed: '合并失败：{source} → {target} — {error}',
    lintAliasesMissing: '检测到 {count} 个页面缺少别名',
    lintAliasesCompleteBtn: '补全别名（{count}）',
    lintAliasesFilling: '生成别名 {current}/{total}：{page}',
    lintAliasesFilled: '别名补全完成。已填充 {filled}/{total} 页。',
    lintAliasesFillFailed: '别名生成失败：{page} — {error}',
    lintFixItemFailed: '修复失败：[[{target}]] — {error}',
    lintLinkItemFailed: '链接失败：{page} — {error}',
    lintRetrying: '出错后重试中（{attempt}/{max}）...',
    lintAnalyzingLLM: 'LLM 正在分析 Wiki 健康状态...',
    saveToWikiSuccess: '对话已保存到Wiki！',
    aliasAdded: '已为页面\'{page}\'添加别名\'{alias}\'',

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

    // Wiki 输出语言
    wikiLanguageName: 'Wiki 输出语言',
    wikiLanguageDesc: '所有生成的 Wiki 页面、索引、日志和查询回复均使用此语言',
    customWikiLanguageOption: '自定义...',
    customWikiLanguageHint: '输入语言名称（如 Italian、Arabic），将作为输出语言指令传递给 LLM。',
    customWikiLanguagePlaceholder: '例如：Italian',

    // 索引 & 日志标签（各语言）
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

    // 知识提取
    extractionSectionTitle: '知识提取',
    extractionGranularityName: '提取颗粒度',
    extractionGranularityDesc: '控制从源文件中提取实体/概念的数量。颗粒度越高，生成页面越多，API Token 消耗越大。',
    extractionGranularityFine: '精细 — 提取全部包括边缘提及（页面最多、Token 消耗最高）',
    extractionGranularityStandard: '标准 — 核心 + 重要实体/概念（均衡）',
    extractionGranularityCoarse: '粗放 — 仅提取最核心的实体/概念（页面最少、Token 消耗最低）',

    // 摄入加速
    accelerationSectionTitle: '摄入加速',
    pageGenerationConcurrencyName: '页面生成并发度',
    pageGenerationConcurrencyDesc: '单文件摄入时并行生成页面的数量。数值越高速度越快，但会增加 API 消耗并可能触发限流。',
    concurrencyValueSingular: '{}（串行 — 最安全）',
    concurrencyValuePlural: '{}（并行）',
    batchDelayName: '批次延迟 (ms)',
    batchDelayDesc: '并行批次间的延迟，防止 API 限流（100-2000ms）。如遇 429 错误请增大此值。',

    // 自动维护
    autoMaintainSection: '自动维护',
    autoMaintainBetaBadge: 'BETA 测试 — 实验性功能，可能存在问题，仅建议高级用户使用。',
    autoWatchName: '监听文件夹',
    autoWatchDesc: '自动检测监听列表中文件夹的新增或变更 .md 文件，通知或自动摄入',
    watchedFoldersName: '监听文件夹列表',
    watchedFoldersDesc: '监听新内容的文件夹。点击「添加文件夹」从仓库中选择。',
    addWatchedFolderButton: '添加文件夹',
    removeWatchedFolderButton: '移除',
    webClipperPresetName: '监听 Clippings（Web Clipper）',
    webClipperPresetDesc: '将 Obsidian Web Clipper 使用的 Clippings/ 文件夹加入监听列表。网页剪藏内容将自动摄入 Wiki。',
    noWatchedFoldersHint: '尚未配置监听文件夹。请添加文件夹或启用 Clippings 预设。',
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
    watcherActiveNotice: 'Wiki: 文件监听已启动 — 正在监控指定文件夹',
    watchIngestNotice: 'Wiki: sources/ 中有 {count} 个文件变更。请执行"摄入源文件"处理。',
    autoIngestRunning: '正在自动摄入 {count} 个变更文件...',
    autoIngestComplete: '自动摄入完成：成功 {success}，失败 {fail}',
    scheduledLintRunning: '正在执行定时 Wiki 维护...',
    wikiLintStats: 'Wiki 维护: 共 {pages} 页（{entities} 实体, {concepts} 概念, {sources} 来源）',
    wikiHealthStats: 'Wiki 健康: 共 {pages} 页（{entities} 实体, {concepts} 概念, {sources} 来源）{indexStatus}',
    lintWikiStart: '开始维护 wiki...',
    lintWikiComplete: '维护完成',
    lintWikiFailed: '维护失败',
    analyzingSchema: '正在分析 Wiki 并生成 Schema 建议...',
    schemaSuggestionGenerated: 'Schema 建议已生成，请查看 wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: '未检测到 Schema 需要更新。',
    schemaSuggestionFailed: 'Schema 建议生成失败',
    schemaNotFoundNotice: 'Schema 文件未找到。启用 Schema 功能以创建它。',
    selectFolderNoMdFiles: '文件夹 {path} 中没有 Markdown 文件',
    batchIngestSkipNotice: '跳过 {skipped}/{total} 个已摄入文件。正在摄入 {new} 个新文件...',
    batchIngestAllIngested: '该文件夹中的所有 {total} 个文件均已摄入。',
    batchIngestStarting: '正在从 "{folder}" 摄入 {count} 个文件 — 可能需要数分钟。完成后会显示报告。',
    batchIngestComplete: '批量摄入完成: 成功 {success}/{total}, 失败 {fail}',
    batchIngestFailedFiles: '失败的文件:',
    historyTruncated: '历史已截断至最近 {max} 轮对话',
    historyCleared: '历史已清空',

    // 用户反馈闭环
    reviewedPagePreserved: '已保留用户审阅内容: {}',

    // Query 回流
    querySuggestSaveTitle: '保存到 Wiki？',
    querySuggestSaveDesc: '此对话包含有价值的知识点，是否保存到 Wiki？',
    querySuggestSaveYes: '保存',
    querySuggestSaveNo: '忽略',

    // 摄入报告
    ingestReportElapsedTime: '耗时',
    ingestReportSkippedFiles: '跳过（已摄入）',
    ingestReportFailedGuidance: '这些条目未能自动创建。您可手动创建对应页面，或降低提取颗粒度后重新摄入源文件。',

    // 命令名称（sentence case 遵循 Obsidian Bot 规则）
    cmdIngestSource: '摄入单个源文件',
    cmdIngestFolder: '从文件夹摄入',
    cmdQueryWiki: '查询 Wiki',
    cmdLintWiki: '维护 Wiki',
    cmdRegenerateIndex: '重新生成索引',
    cmdSuggestSchema: '建议 Schema 更新',

    // 维护报告
    lintReportTitle: 'Wiki 维护报告',
    lintReportPageCount: '共 {count} 个 Wiki 页面',
    lintReportSummary: 'Wiki 状态概览：共 {total} 个页面，{aliasesMissing} 个缺失别名，重复 {duplicates} 个，断链 {deadLinks} 个（其中 {deadLinkFromDup} 个涉及重复页面），孤立 {orphans} 个（其中 {orphanFromDup} 个是重复页面），空洞 {emptyPages} 个',
    lintDeadLinkSection: '断链（程序检测）',
    lintEmptyPageSection: '空洞页面（程序检测）',
    lintOrphanSection: '孤立页面（程序检测）',
    lintContradictionSection: '矛盾（程序检测）',
    lintDeadLinkItem: '- [[{source}]] → **{target}**（页面不存在）{dupFlag}',
    lintDeadLinkMore: '- ... 共 {count} 处断链',
    lintEmptyPageItem: '- [[{page}]] — 内容不足 50 字符',
    lintOrphanItem: '- [[{page}]] — 无其他 Wiki 页面链接至此{dupFlag}',
    lintContradictionAutoFixed: '（本次自动修复 {count} 个）',
    lintDeadLinkAffectedByDup: ' （⚠️ 涉及重复页面）',
    lintOrphanIsDuplicate: ' （⚠️ 重复页面）',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: '待处理',
    lintContradictionStatusPendingFix: '待修复',
    lintLLMAnalysisHeading: '## LLM 分析',

    // 维护分析 Prompt
    lintAnalysisPrompt: '你是一个 Wiki 维护助手。请基于以下信息检查 Wiki 的健康状况。\n\nWiki 索引：\n{index}\n\nWiki 页面内容样本（共 {total} 页，展示 {sample} 页）：\n{contentSample}\n\n程序检测结果（已验证，请勿重复报告）：\n{progReport}\n\n请检查以下方面（跳过程序已检测的断链/空洞/孤立）：\n1. **矛盾** — 不同页面对同一事实的说法是否矛盾\n2. **过时** — 是否有声明明显过时\n3. **缺失** — 哪些重要概念缺少独立页面\n4. **结构** — 页面结构是否合理，交叉引用是否充分\n\n输出格式：使用 Markdown，以 "## LLM 分析" 开头。每个发现用一行 "- [具体问题]"。如无问题则写 "✅ 未发现明显问题。"',

    // 维护修复进度
    lintFixProgress: '修复断链 {current}/{total}：[[{target}]]',
    lintFixDeadComplete: '断链修复完成。已修复 {fixed}/{total} 项。',
    lintFillProgress: '扩充空洞 {current}/{total}：{page}',
    lintFillComplete: '页面扩充完成。已填充 {filled}/{total} 页。',
    lintFillFailed: '扩充失败：{page} — {error}',
    lintLinkProgress: '链接孤立 {current}/{total}：{page}',
    lintLinkComplete: '孤立页面链接完成。已链接 {linked} 页。',
    lintFixNoAction: '未执行操作（无 client）',
    lintFixIndexUpdated: 'Wiki 索引和日志已更新。',
    lintFixAllComplete: '所有修复已完成。详情见日志。',

    // 维护报告弹窗
    lintModalActionsTitle: '修复建议（需消耗LLM Token）：',
    lintModalFixDeadLinks: '修复断链（{count}）',
    lintModalExpandEmpty: '扩充空洞页面（{count}）',
    lintModalLinkOrphans: '链接孤立页面（{count}）',
    lintModalAnalyzeSchema: '分析 Schema',
    lintModalMergeDuplicates: '合并重复页面（{count}）',
    lintModalFixAll: '一键修复所有问题（{count}）',
    lintDuplicateSection: '重复页面（程序检测）',
    lintDuplicateItem: '- [[{target}]] 与 [[{source}]] — {reason}',
    lintMergeProgress: '合并 {current}/{total}：{source} → {target}',
    lintMergeComplete: '重复页面合并完成。已合并 {merged}/{total} 对。',

    // 摄入报告弹窗
    ingestReportTitle: '摄入报告',
    ingestReportSourceFile: '源文件',
    ingestReportCreated: '已创建',
    ingestReportUpdated: '已更新',
    ingestReportContradictions: '发现矛盾',
    ingestReportFailedTitle: '未能摄入',
    ingestReportErrorDetail: '错误详情',
    ingestReportClose: '关闭',
    ingestReportCreatedPages: '创建页面：{count}',
    ingestReportUpdatedPages: '更新页面：{count}',
    ingestReportEntitiesCount: '{count} 个实体',
    ingestReportConceptsCount: '{count} 个概念',
    ingestReportContradictionsFound: '发现矛盾：{count}',
    ingestReportEntityType: '实体',
    ingestReportConceptType: '概念',
    timeMinutes: '分',
    timeSeconds: '秒',
} as const;
