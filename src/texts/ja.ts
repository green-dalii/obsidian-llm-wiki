export const JA_TEXTS = {
    // Plugin Info
    pluginTitle: 'Karpathy LLM Wiki 設定',
    pluginIntro: '本プラグインはObsidian用に{{link}}の概念を実装しています。ノートを読み込み、AIでエンティティと概念を抽出し、Vault内に構造化された相互リンクWikiを構築します。',
    karpathyLinkText: 'Andrej KarpathyのLLM Wiki',

    // Features Section
    featuresTitle: '仕組み',
    workflow1Title: '1. 取り込み',
    workflow1Desc: 'ノートを選択 — AIがエンティティ、概念、関係を抽出してWikiページにまとめます。',
    workflow2Title: '2. 問い合わせ',
    workflow2Desc: 'Wikiとチャット — 回答は取り込んだ知識に基づいています。',
    workflow3Title: '3. 維持管理',
    workflow3Desc: '自動生成のインデックス、相互リンク、LintチェックでWikiの健全性を保ちます。',

    // Language Switcher
    languageTitle: 'インターフェース言語',
    languageDesc: '設定パネルの表示言語を選択してください。言語変更をコマンドパレットに適用するには、プラグインを再起動してください。',
    languageEn: 'English (英語)',
    languageZh: 'Chinese (中文)',
    languageJa: 'Japanese (日本語)',
    languageKo: 'Korean (한국어)',
    languageDe: 'German (Deutsch)',
    languageFr: 'French (Français)',
    languageEs: 'Spanish (Español)',
    languagePt: 'Portuguese (Português)',

    // Status
    statusTitle: 'LLM Client の状態',
    statusInitialized: '初期化済み',
    statusNotInitialized: '未初期化',
    currentProvider: '現在のプロバイダー',

    // Provider Configuration
    providerSection: 'LLM プロバイダー設定',
    providerName: 'LLM プロバイダー',
    providerDesc: '定義済みプロバイダーまたはカスタムOpenAI互換サービスを選択',

    // API Key
    apiKeyName: 'API Key',
    apiKeyDesc: 'プロバイダーから発行されたAPI Keyを入力してください',
    apiKeyPlaceholder: 'API Keyを入力',

    // Base URL
    baseUrlName: 'API Base URL',
    baseUrlDescCustom: '必須：カスタムOpenAI互換エンドポイント',
    baseUrlDescOverride: '任意：定義済みBase URLを上書き',

    // Ollama Hint
    ollamaHint: 'Ollamaはローカルで動作するため、API Keyは不要です',

    // Model Selection
    modelSection: 'モデル選択',
    fetchModelsName: '利用可能なモデルを取得',
    fetchModelsDesc: 'プロバイダーAPIから最新のモデル一覧を取得します',
    fetchModelsButton: 'モデルを取得',
    fetchingModels: '取得中...',
    fetchSuccess: '取得成功！{}件のモデルが利用可能です',
    fetchFailed: '取得に失敗したかリストが空です。モデル名を手動で入力してください',
    fetchNotSupported: 'このプロバイダーはモデル一覧の取得に対応していません',

    selectModelName: 'モデルを選択',
    selectModelDesc: '{}件の利用可能なモデルから選択',
    customInputOption: 'カスタム入力...',
    customInputHint: '他のモデルを使用するには「カスタム入力...」を選択してください',

    modelName: 'モデル名',
    modelDescCustom: 'カスタムモデルを使用中（上のボタンをクリックして一覧を再取得）',
    modelDescRecommended: '推奨：{}',
    modelDescManual: 'モデル名を手動で入力',

    switchToDropdown: 'ドロップダウン選択に切り替え',
    useDropdownButton: 'ドロップダウンを使用',

    // Test & Save
    testConnectionName: '接続テスト',
    testConnectionDesc: '設定が正常にLLM APIを呼び出せるか確認します',
    testButton: '接続テスト',
    testing: 'テスト中...',

    saveSettingsName: '設定を保存',
    saveSettingsDesc: '現在の設定を保存します',
    saveButton: '設定を保存',
    savedNotice: '設定を保存しました！',

    // Wiki Folder
    wikiSection: 'Wiki フォルダー設定',
    wikiFolderName: 'Wiki フォルダー',
    wikiFolderDesc: '生成されたWikiページの保存先',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'まずAPI Keyを設定してください',
    errorFetchFailed: '失敗：{}',

    // Query Settings
    querySectionTitle: 'Wiki 問い合わせ設定',
    maxConversationHistoryName: '会話履歴の最大数',
    maxConversationHistoryDesc: 'トークンオーバーフローを防ぐため会話メッセージ数を制限します',
    maxConversationHistoryHint: '推奨：50ラウンド以内',
    numberRangeValidation: '1〜50の数値を入力してください',

    // Query Modal UI
    queryModalTitle: 'Query Wiki - 対話型問い合わせ',
    queryModalPlaceholder: '質問を入力...',
    queryModalSendButton: '送信',
    queryModalStopButton: '停止',
    queryModalSaveButton: 'Wikiに保存',
    queryModalClearButton: '履歴をクリア',
    queryModalHistoryCount: '会話履歴：{}/{} ラウンド',
    queryModalStreaming: 'ストリーミング中...',
    queryModalFallbackStreaming: 'ストリーミングに対応していないため、非ストリーミングに切り替えました。お待ちください...',
    queryPhaseSearching: 'Wikiインデックスを分析し、関連ページを選別中...',
    queryPhaseFoundPages: '{count}件見つかりました：{pages}',
    queryPhaseLoadingPages: 'ページコンテンツを読み込み中...',
    queryPhaseContextReady: 'コンテキスト準備完了。回答を生成中...',
    queryPhaseGenerating: '生成中...（経過 {time}秒）',
    queryPhaseNonStreaming: '非ストリーミングモード、回答生成中...（経過 {time}秒）',
    queryModalErrorPrefix: 'エラー：',
    queryModalHint: '問い合わせはWikiの内容に基づきます。「Wikiに保存」をクリックすると、価値のある会話をWikiページとして抽出できます。',

    // Error Messages
    errorLLMClientNotInit: 'LLM Clientが初期化されていません。設定を保存してください。',
    errorIngestFailed: '取り込み失敗：',
    errorQueryFailed: '問い合わせ失敗：',

    // Success Messages
    ingestSuccess: '取り込み成功：{}ページ作成、{}ページ更新',
    querySuccess: '問い合わせ完了',
    lintSuccess: 'Wiki Lint完了',
    lintReadingPages: '{count}件のWikiページを読み込み中...',
    lintReadingPagesProgress: 'Wikiページ読み込み中：{current}/{total}...',
    lintScanningLinks: 'リンク切れをスキャン中...',
    lintScanningLinksProgress: 'リンク切れスキャン中：{current}/{total}...',
    lintCheckingDuplicates: '重複ページを確認中...',
    lintDuplicateCheckFailed: '重複検出に失敗しました — コンソールで詳細を確認してください',
    lintDuplicateCheckFailedDetail: '重複チェックが{step}で失敗：{error}',
    lintMergeItemFailed: 'マージ失敗：{source} → {target} — {error}',
    lintAliasesMissing: '別名未設定：{count}件のページに別名がありません',
    lintAliasesCompleteBtn: '別名を補完（{count}件）',
    lintAliasesFilling: '別名生成中 {current}/{total}：{page}',
    lintAliasesFilled: '別名補完完了。{filled}/{total}ページに入力しました。',
    lintAliasesFillFailed: '別名生成に失敗：{page} — {error}',
    lintFixItemFailed: '修復失敗：[[{target}]] — {error}',
    lintLinkItemFailed: 'リンク設定失敗：{page} — {error}',
    lintRetrying: 'エラー後再試行中（{attempt}/{max}）...',
    lintAnalyzingLLM: 'LLMがWikiの健全性を分析中...',
    saveToWikiSuccess: '会話をWikiに保存しました！',
    aliasAdded: 'ページ「{page}」に別名「{alias}」を追加しました',

    // Status Messages
    ingestingSources: 'ソースファイルを取り込み中...',
    queryingWiki: 'Wikiに問い合わせ中...',
    lintingWiki: 'WikiをLint中...',
    savingToWiki: '会話をWikiに保存中...',
    clearingHistory: '会話履歴をクリア中...',

    // Buttons
    ingestButton: '取り込み',
    queryButton: '問い合わせ',
    lintButton: 'Lint',
    cancelButton: 'キャンセル',

    // Links
    karpathyGistLink: 'KarpathyのLLM Wiki Gist',
    obsidianPluginAPI: 'Obsidian Plugin API',
    anthropicSDK: 'Anthropic SDK',
    openaiSDK: 'OpenAI SDK',

    // Other
    availableModelsLoading: '利用可能なモデルを読み込み中...',
    noModelsAvailable: '利用可能なモデルがありません',

    // LLM Language Hint
    llmLanguageHint: '日本語で回答してください。',

    // Schema Configuration
    schemaSection: 'スキーマ設定',
    enableSchemaName: 'スキーマを有効化',
    enableSchemaDesc: 'schema/config.mdを生成し、すべてのLLMプロンプトに注入して構造化されたWiki出力を実現します',
    viewSchemaButton: 'スキーマの閲覧 / 編集',
    regenerateSchemaButton: 'デフォルトスキーマを再生成',
    schemaRegeneratedNotice: 'デフォルトスキーマを再生成しました。',

    // Wiki Output Language
    wikiLanguageName: 'Wiki 出力言語',
    wikiLanguageDesc: '生成されるすべてのWikiページ、インデックス、ログ、問い合わせの応答がこの言語で作成されます',
    customWikiLanguageOption: 'カスタム...',
    customWikiLanguageHint: '言語名を入力してください（例：Italian、Arabic）。LLMに出力言語の指示として渡されます。',
    customWikiLanguagePlaceholder: '例：Italian',

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
    extractionSectionTitle: '知識抽出',
    extractionGranularityName: '抽出粒度',
    extractionGranularityDesc: '抽出されるエンティティ・概念の数を制御します。粒度が高いほど、作成されるページと消費されるAPIトークンが増えます。',
    extractionGranularityFine: '精细 — 端の言及も含めてすべて抽出（ページ最多、トークンコスト最大）',
    extractionGranularityStandard: '標準 — コア + 重要なエンティティ・概念（バランス型）',
    extractionGranularityCoarse: '粗め — 最も中心的なエンティティ・概念のみ（ページ最少、トークンコスト最小）',

    // Ingestion Acceleration
    accelerationSectionTitle: '取り込み高速化',
    pageGenerationConcurrencyName: 'ページ生成の並列度',
    pageGenerationConcurrencyDesc: '単一ソース取り込み中に並列生成するページ数。値を高くすると取り込みが高速化されますが、APIコストの増加やレートリミットのトリガーに注意してください。',
    concurrencyValueSingular: '{}（直列 — 最も安全）',
    concurrencyValuePlural: '{}（並列）',
    batchDelayName: 'バッチ遅延（ms）',
    batchDelayDesc: '並列バッチ間の遅延によりAPIレートリミットを回避します（100〜2000ms）。429エラーが発生する場合は値を大きくしてください。',

    // Auto Maintenance
    autoMaintainSection: '自動メンテナンス',
    autoMaintainBetaBadge: 'ベータ版 — 実験機能。問題が発生する可能性があります。上級ユーザーのみ推奨。',
    autoWatchName: '監視フォルダー',
    autoWatchDesc: '監視フォルダー内で新規または変更された.mdファイルを自動検出し、通知または自動取り込みを行います',
    watchedFoldersName: '監視対象フォルダー',
    watchedFoldersDesc: '新コンテンツを監視するフォルダー。「フォルダーを追加」をクリックしてVaultから選択してください。',
    addWatchedFolderButton: 'フォルダーを追加',
    removeWatchedFolderButton: '削除',
    webClipperPresetName: 'Clippingsを監視（Web Clipper）',
    webClipperPresetDesc: 'Obsidian Web Clipperが使用するClippings/フォルダーを監視リストに追加します。ウェブクリップがWikiに自動取り込みされます。',
    noWatchedFoldersHint: '監視フォルダーが設定されていません。フォルダーを追加するかClippingsプリセットを有効にしてください。',
    autoWatchModeName: '監視モード',
    autoWatchModeDesc: '「通知のみ」はプロンプトを表示します。「自動取り込み」はサイレントに処理します。',
    watchModeNotify: '通知のみ',
    watchModeAuto: '自動取り込み',
    autoWatchDebounceName: 'チャタリング防止遅延（ms）',
    autoWatchDebounceDesc: 'ファイル変更後に取り込みをトリガーするまでの待機時間（1000〜60000）',
    periodicLintName: '定期 Lint',
    periodicLintDesc: 'スケジュールに従ってLLM Lintを実行。前回チェック以降にソースファイルの変更がある場合のみ実行します',
    periodicLintOff: 'オフ',
    periodicLintHourly: '毎時',
    periodicLintDaily: '毎日',
    periodicLintWeekly: '毎週',
    startupCheckName: '起動時ヘルスチェック',
    startupCheckDesc: 'プラグイン読み込み時にWikiの健全性をスキャンします',
    suggestSchemaCommand: 'スキーマ更新を提案',
    autoMaintainCostWarning: '⚠️ コストのお知らせ：自動メンテナンス機能はAPIトークンを消費します。「自動取り込み」はソースファイルの変更ごとにLLM呼び出しをトリガーします。「定期Lint」はスケジュールに従ってLLMヘルスチェックを実行します（ソースの変更が検出された場合のみ）。想定外の課金を避けるため、慎重に設定してください。',

    // Notices
    startupCheckSummary: 'Wikiは{pages}ページ（{entities}エンティティ、{concepts}概念、{sources}ソース）',
    watcherActiveNotice: 'Wiki: ファイル監視有効 — 監視フォルダーをモニタリング中',
    watchIngestNotice: 'Wiki: sources/ に{count}件のファイル変更あり。「ソースの取り込み」を実行して処理してください。',
    autoIngestRunning: '{count}件の変更ファイルを自動取り込み中...',
    autoIngestComplete: '自動取り込み完了：成功 {success}件、失敗 {fail}件',
    scheduledLintRunning: 'スケジュールされたWiki Lintを実行中...',
    wikiLintStats: 'Wiki Lint: {pages}ページ（{entities}エンティティ、{concepts}概念、{sources}ソース）',
    wikiHealthStats: 'Wiki健全性: {pages}ページ（{entities}エンティティ、{concepts}概念、{sources}ソース）{indexStatus}',
    lintWikiStart: 'Wiki Lintを開始中...',
    lintWikiComplete: 'Wiki Lint完了',
    lintWikiFailed: 'Wiki Lint失敗',
    analyzingSchema: 'Wikiを分析し、スキーマの提案を生成中...',
    schemaSuggestionGenerated: 'スキーマの提案を生成しました。wiki/schema/suggestions.mdを確認してください',
    noSchemaUpdateNeeded: 'スキーマの更新は不要です。',
    schemaSuggestionFailed: 'スキーマの提案に失敗しました',
    schemaNotFoundNotice: 'スキーマファイルが見つかりません。スキーマを有効化して作成してください。',
    selectFolderNoMdFiles: 'フォルダー {path} にMarkdownファイルがありません',
    batchIngestSkipNotice: '取り込み済みの{skipped}/{total}ファイルをスキップ。{new}件の新ファイルを取り込み中...',
    batchIngestAllIngested: 'このフォルダー内の{total}件はすべて取り込み済みです。',
    batchIngestStarting: '「{folder}」から{count}件を取り込み中 — 数分かかる場合があります。完了後にレポートが表示されます。',
    batchIngestComplete: 'バッチ取り込み完了：成功 {success}/{total}件、失敗 {fail}件',
    batchIngestFailedFiles: '失敗したファイル：',
    historyTruncated: '履歴を直近の{max}ラウンドに切り捨てました',
    historyCleared: '履歴をクリアしました',

    // User Feedback Loop
    reviewedPagePreserved: 'ユーザーレビュー済みのコンテンツを保持：{}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: 'Wikiに保存しますか？',
    querySuggestSaveDesc: 'この会話には価値のある知識が含まれています。Wikiに保存しますか？',
    querySuggestSaveYes: '保存',
    querySuggestSaveNo: '閉じる',

    // Ingestion Report
    ingestReportElapsedTime: '経過時間',
    ingestReportSkippedFiles: 'スキップ済み（取り込み済み）',
    ingestReportFailedGuidance: 'これらの項目は自動作成できませんでした。対応するページを手動で作成するか、抽出粒度を下げてソースファイルを再取り込みしてください。',

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: '単一ソースの取り込み',
    cmdIngestFolder: 'フォルダーからの取り込み',
    cmdQueryWiki: 'Wikiに問い合わせ',
    cmdLintWiki: 'WikiのLint',
    cmdRegenerateIndex: 'インデックスの再生成',
    cmdSuggestSchema: 'スキーマ更新の提案',

    // Lint Report
    lintReportTitle: 'Wiki Lintレポート',
    lintReportSummary: 'Wiki状況概要：合計{total}ページ、別名未設定{aliasesMissing}ページ、重複{duplicates}ページ、リンク切れ{deadLinks}件（うち重複関連{deadLinkFromDup}件）、孤立{orphans}ページ（うち重複{orphanFromDup}ページ）、空ページ{emptyPages}件',
    lintDeadLinkSection: 'リンク切れ（検出済み）',
    lintEmptyPageSection: '空ページ（検出済み）',
    lintOrphanSection: '孤立ページ（検出済み）',
    lintContradictionSection: '矛盾（検出済み）',
    lintDuplicateSection: '重複ページ（検出済み）',
    lintNoIssuesFound: '重複、リンク切れ、空ページ、孤立ページは検出されませんでした。',
    lintDeadLinkItem: '- [[{source}]] → **{target}**（ページが存在しません）{dupFlag}',
    lintDeadLinkMore: '- ... 他{count}件のリンク切れ',
    lintEmptyPageItem: '- [[{page}]] — 実質的なコンテンツが50文字未満',
    lintOrphanItem: '- [[{page}]] — 他のWikiページからリンクされていません{dupFlag}',
    lintDuplicateItem: '- [[{target}]] と [[{source}]] — {reason}',
    lintDeadLinkAffectedByDup: ' （⚠️ 重複ページが関連）',
    lintOrphanIsDuplicate: ' （⚠️ 重複ページ）',
    lintContradictionOpen: '未解決の矛盾：{count}件',
    lintContradictionAutoFixed: '（今回{count}件を自動修復）',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: '検出済み',
    lintContradictionStatusPendingFix: '修復待ち',
    lintLLMAnalysisHeading: '## LLM分析',

    // Lint Analysis Prompt
    lintAnalysisPrompt: 'あなたはWikiメンテナンスの助手です。以下の情報に基づいてWikiの健全性を確認してください。\n\nWikiインデックス：\n{index}\n\nWikiページ内容サンプル（合計{total}ページ、{sample}ページを表示）：\n{contentSample}\n\nプログラムによるチェック結果（検証済み、重複報告不要）：\n{progReport}\n\n以下の項目を確認してください（プログラムにより検出済みのリンク切れ・空ページ・孤立ページは除外）：\n1. **矛盾** — 異なるページ間で同一事実に関する記述が矛盾していないか\n2. **陳腐化** — 明らかに古くなった記述がないか\n3. **不足** — 重要な概念に独立したページがないものはないか\n4. **構造** — ページ構造が妥当で、相互参照が十分か\n\n出力形式：Markdownを使用し、「## LLM分析」で始めてください。各発見は一行で「- [具体的な問題]」と記載。問題がない場合は「明らかな問題は見つかりませんでした。」と記載してください。',

    // Lint Fix Progress
    lintFixProgress: '修復中 {current}/{total}：[[{target}]]',
    lintFixDeadComplete: 'リンク切れ修復完了。{fixed}/{total}件を修復しました。',
    lintFillProgress: '拡充中 {current}/{total}：{page}',
    lintFillComplete: 'ページ拡充完了。{filled}/{total}ページを入力しました。',
    lintFillFailed: '拡充に失敗：{page} — {error}',
    lintLinkProgress: 'リンク設定中 {current}/{total}：{page}',
    lintLinkComplete: '孤立ページへのリンク完了。{linked}ページにリンクを設定しました。',
    lintFixNoAction: '操作なし（クライアント未接続）',
    lintFixIndexUpdated: 'Wikiインデックスとログを更新しました。',
    lintFixAllComplete: 'すべての修復が完了しました。詳細はログを確認してください。',

    // Lint Report Modal
    lintModalActionsTitle: '修復提案（LLMトークンを消費）：',
    lintModalFixDeadLinks: 'リンク切れを修復（{count}件）',
    lintModalExpandEmpty: '空ページを拡充（{count}件）',
    lintModalLinkOrphans: '孤立ページにリンク（{count}件）',
    lintModalAnalyzeSchema: 'スキーマを分析',
    lintModalMergeDuplicates: '重複をマージ（{count}件）',
    lintModalFixAll: '一括スマート修復（{count}件の問題）',
    lintMergeProgress: 'マージ中 {current}/{total}：{source} → {target}',
    lintMergeComplete: '重複マージ完了。{merged}/{total}組をマージしました。',

    // Ingest Report Modal
    ingestReportTitle: '取り込みレポート',
    ingestReportSourceFile: 'ソースファイル',
    ingestReportCreated: '作成',
    ingestReportUpdated: '更新',
    ingestReportContradictions: '矛盾を発見',
    ingestReportFailedTitle: '取り込み失敗',
    ingestReportErrorDetail: 'エラー詳細',
    ingestReportClose: '閉じる',
    ingestReportCreatedPages: '作成ページ：{count}',
    ingestReportUpdatedPages: '更新ページ：{count}',
    ingestReportEntitiesCount: '{count}件のエンティティ',
    ingestReportConceptsCount: '{count}件の概念',
    ingestReportContradictionsFound: '矛盾を発見：{count}件',
    ingestReportEntityType: 'エンティティ',
    ingestReportConceptType: '概念',
    timeMinutes: '分',
    timeSeconds: '秒',
} as const;
