export const KO_TEXTS = {
    // Plugin Info
    pluginTitle: 'Karpathy LLM Wiki 설정',
    pluginIntro: '이 플러그인은 Obsidian에 {{link}} 개념을 구현합니다. 노트를 읽고 AI로 엔티티와 컨셉을 추출하여 볼트에 구조화된 위키를 구축합니다.',
    karpathyLinkText: 'Andrej Karpathy의 LLM Wiki',

    // Features Section
    featuresTitle: '작동 방식',
    workflow1Title: '1. 수집',
    workflow1Desc: '노트를 선택하면 AI가 엔티티, 컨셉, 관계를 위키 페이지로 추출합니다.',
    workflow2Title: '2. 질의',
    workflow2Desc: '위키와 대화하세요 — 답변은 수집된 지식에 기반합니다.',
    workflow3Title: '3. 유지',
    workflow3Desc: '자동 생성된 인덱스, 상호 링크, 린트 검사로 위키를 건강하게 유지합니다.',

    // Language Switcher
    languageTitle: '인터페이스 언어',
    languageDesc: '설정 패널에서 사용할 언어를 선택하세요. 언어 변경을 명령 팔레트에 적용하려면 플러그인을 재시작하세요.',
    languageEn: 'English',
    languageZh: 'Chinese (中文)',
    languageJa: 'Japanese (日本語)',
    languageKo: 'Korean (한국어)',
    languageDe: 'German (Deutsch)',
    languageFr: 'French (Français)',
    languageEs: 'Spanish (Español)',
    languagePt: 'Portuguese (Português)',

    // Status
    statusTitle: 'LLM 클라이언트 상태',
    statusInitialized: '초기화됨',
    statusNotInitialized: '초기화되지 않음',
    currentProvider: '현재 Provider',

    // Provider Configuration
    providerSection: 'LLM Provider 설정',
    providerName: 'LLM Provider',
    providerDesc: '사전 정의된 Provider 또는 사용자 정의 OpenAI 호환 서비스 선택',

    // API Key
    apiKeyName: 'API 키',
    apiKeyDesc: 'Provider의 API 키를 입력하세요',
    apiKeyPlaceholder: 'API 키 입력',

    // Base URL
    baseUrlName: 'API Base URL',
    baseUrlDescCustom: '필수: 사용자 정의 OpenAI 호환 엔드포인트',
    baseUrlDescOverride: '선택: preset Base URL 재정의',

    // Ollama Hint
    ollamaHint: 'Ollama는 로컬에서 실행되며 API 키가 필요하지 않습니다',

    // Model Selection
    modelSection: '모델 선택',
    fetchModelsName: '사용 가능한 모델 가져오기',
    fetchModelsDesc: 'Provider API에서 최신 모델 목록을 가져옵니다',
    fetchModelsButton: '모델 가져오기',
    fetchingModels: '가져오는 중...',
    fetchSuccess: '성공! {}개의 모델 사용 가능',
    fetchFailed: '가져오기 실패 또는 빈 목록. 모델 이름을 수동으로 입력하세요',
    fetchNotSupported: 'Provider가 모델 목록 조회를 지원하지 않습니다',

    selectModelName: '모델 선택',
    selectModelDesc: '{}개의 사용 가능한 모델 중에서 선택',
    customInputOption: '직접 입력...',
    customInputHint: '다른 모델을 사용하려면 "직접 입력..."을 선택하세요',

    modelName: '모델 이름',
    modelDescCustom: '사용자 정의 모델 사용 (위 버튼으로 목록 다시 가져오기)',
    modelDescRecommended: '추천: {}',
    modelDescManual: '모델 이름을 수동으로 입력',

    switchToDropdown: '드롭다운 선택으로 전환',
    useDropdownButton: '드롭다운 사용',

    // Test & Save
    testConnectionName: '연결 테스트',
    testConnectionDesc: '설정이 LLM API를 성공적으로 호출할 수 있는지 확인합니다',
    testButton: '연결 테스트',
    testing: '테스트 중...',

    saveSettingsName: '설정 저장',
    saveSettingsDesc: '현재 설정을 저장합니다',
    saveButton: '설정 저장',
    savedNotice: '설정이 저장되었습니다!',

    // Wiki Folder
    wikiSection: '위키 폴더 설정',
    wikiFolderName: '위키 폴더',
    wikiFolderDesc: '생성된 위키 페이지의 저장 위치',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'API 키를 먼저 설정하세요',
    errorFetchFailed: '실패: {}',

    // Query Settings
    querySectionTitle: '위키 질의 설정',
    maxConversationHistoryName: '최대 대화 기록',
    maxConversationHistoryDesc: '토큰 초과를 방지하기 위해 대화 메시지를 제한합니다',
    maxConversationHistoryHint: '추천: 50 라운드를 초과하지 않기',
    numberRangeValidation: '1-50 사이의 숫자를 입력하세요',

    // Query Modal UI
    queryModalTitle: '위키 질의 - 대화형 질의',
    queryModalPlaceholder: '질문을 입력하세요...',
    queryModalSendButton: '전송',
    queryModalStopButton: '중지',
    queryModalSaveButton: '위키에 저장',
    queryModalClearButton: '기록 지우기',
    queryModalHistoryCount: '대화 기록: {}/{} 라운드',
    queryModalStreaming: '스트리밍 중...',
    queryModalFallbackStreaming: '스트리밍을 지원하지 않아 논스트리밍으로 전환되었습니다. 잠시 기다려주세요...',
    queryPhaseSearching: '위키 인덱스 분석 중, 관련 페이지 선택 중...',
    queryPhaseFoundPages: '{count}개의 페이지 발견: {pages}',
    queryPhaseLoadingPages: '페이지 콘텐츠 로딩 중...',
    queryPhaseContextReady: '컨텍스트 준비 완료. 답변 생성 중...',
    queryPhaseGenerating: '생성 중... (경과 {time}초)',
    queryPhaseNonStreaming: '논스트리밍 모드, 응답 생성 중... (경과 {time}초)',
    queryModalErrorPrefix: '오류: ',
    queryModalHint: '위키 콘텐츠 기반 질의입니다. "위키에 저장"을 클릭하면 가치 있는 대화를 위키 페이지로 추출할 수 있습니다.',

    // Error Messages
    errorLLMClientNotInit: 'LLM 클라이언트가 초기화되지 않았습니다. 설정을 저장하세요.',
    errorIngestFailed: '수집 실패: ',
    errorQueryFailed: '질의 실패: ',

    // Success Messages
    ingestSuccess: '수집 완료: {} 페이지 생성, {} 페이지 업데이트',
    querySuccess: '질의 완료',
    lintSuccess: '위키 린트 완료',
    lintReadingPages: '{count}개의 위키 페이지 읽는 중...',
    lintReadingPagesProgress: '위키 페이지 읽는 중: {current}/{total}...',
    lintScanningLinks: '깨진 링크 검사 중...',
    lintScanningLinksProgress: '깨진 링크 검사 중: {current}/{total}...',
    lintCheckingDuplicates: '중복 페이지 확인 중...',
    lintDuplicateCheckFailed: '중복 감지 실패 — 자세한 내용은 콘솔을 확인하세요',
    lintDuplicateCheckFailedDetail: '중복 확인 실패 ({step}): {error}',
    lintMergeItemFailed: '병합 실패: {source} → {target} — {error}',
    lintAliasesMissing: '별칭 누락: {count}개의 페이지에 별칭이 없습니다',
    lintAliasesCompleteBtn: '별칭 완성 ({count})',
    lintAliasesFilling: '별칭 생성 {current}/{total}: {page}',
    lintAliasesFilled: '별칭 완성 완료. {filled}/{total} 페이지 채움.',
    lintAliasesFillFailed: '별칭 생성 실패: {page} — {error}',
    lintFixItemFailed: '수정 실패: [[{target}]] — {error}',
    lintLinkItemFailed: '링크 실패: {page} — {error}',
    lintRetrying: '오류 후 재시도 ({attempt}/{max})...',
    lintAnalyzingLLM: 'LLM이 위키 건강 상태 분석 중...',
    saveToWikiSuccess: '대화가 위키에 저장되었습니다!',
    aliasAdded: '페이지 \'{page}\'에 별칭 \'{alias}\' 추가됨',

    // Status Messages
    ingestingSources: '소스 수집 중...',
    queryingWiki: '위키 질의 중...',
    lintingWiki: '위키 린트 중...',
    savingToWiki: '대화를 위키에 저장 중...',
    clearingHistory: '대화 기록 지우는 중...',

    // Buttons
    ingestButton: '수집',
    queryButton: '질의',
    lintButton: '린트',
    cancelButton: '취소',

    // Links
    karpathyGistLink: 'Karpathy의 LLM Wiki Gist',
    obsidianPluginAPI: 'Obsidian 플러그인 API',
    anthropicSDK: 'Anthropic SDK',
    openaiSDK: 'OpenAI SDK',

    // Other
    availableModelsLoading: '사용 가능한 모델 로딩 중...',
    noModelsAvailable: '사용 가능한 모델 없음',

    // LLM Language Hint
    llmLanguageHint: 'Please answer in Korean.',

    // Schema Configuration
    schemaSection: '스키마 설정',
    enableSchemaName: '스키마 활성화',
    enableSchemaDesc: '스키마/config.md를 생성하여 모든 LLM 프롬프트에 주입, 구조화된 위키 출력 지원',
    viewSchemaButton: '스키마 보기 / 편집',
    regenerateSchemaButton: '기본 스키마 재생성',
    schemaRegeneratedNotice: '기본 스키마가 재생성되었습니다.',

    // Wiki Output Language
    wikiLanguageName: '위키 출력 언어',
    wikiLanguageDesc: '생성된 모든 위키 페이지, 인덱스, 로그, 질의 응답에 이 언어가 사용됩니다',
    customWikiLanguageOption: '사용자 정의...',
    customWikiLanguageHint: '언어 이름을 입력하세요 (예: Italian, Arabic). LLM에 출력 언어 지시문으로 전달됩니다.',
    customWikiLanguagePlaceholder: '예: Italian',

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
    extractionSectionTitle: '추출',
    extractionGranularityName: '추출 세분화',
    extractionGranularityDesc: '엔티티/컨셉 추출량을 제어합니다. 세분화가 높을수록 더 많은 페이지가 생성되고 API 토큰이 소비됩니다.',
    extractionGranularityFine: '세밀 — 가장자리 언급 포함 모두 추출 (최대 페이지, 최고 토큰 비용)',
    extractionGranularityStandard: '표준 — 핵심 + 중요한 엔티티/컨셉 (균형)',
    extractionGranularityCoarse: '굵음 — 가장 중심적인 엔티티/컨셉만 (최소 페이지, 최저 토큰 비용)',

    // Ingestion Acceleration
    accelerationSectionTitle: '수집 가속화',
    pageGenerationConcurrencyName: '페이지 생성 동시성',
    pageGenerationConcurrencyDesc: '단일 소스 수집 중 병렬로 생성할 페이지 수. 값이 높을수록 수집이 빨라지지만 API 비용이 증가하고 속도 제한이 발생할 수 있습니다.',
    concurrencyValueSingular: '{} (직렬 — 가장 안전)',
    concurrencyValuePlural: '{} (병렬)',
    batchDelayName: '배치 지연 (ms)',
    batchDelayDesc: 'API 속도 제한 방지를 위한 병렬 배치 간 지연 (100-2000ms). 429 오류가 발생하면 값을 높이세요.',

    // Auto Maintenance
    autoMaintainSection: '자동 유지보수',
    autoMaintainBetaBadge: 'BETA — 실험적 기능. 문제가 있을 수 있습니다. 고급 사용자에게만 권장.',
    autoWatchName: '폴더 감시',
    autoWatchDesc: '감시 폴더에서 새롭거나 변경된 .md 파일을 자동으로 감지하여 알림 또는 자동 수집',
    watchedFoldersName: '감시 폴더',
    watchedFoldersDesc: '새 콘텐츠를 감시할 폴더. "폴더 추가"를 클릭하여 볼트에서 선택하세요.',
    addWatchedFolderButton: '폴더 추가',
    removeWatchedFolderButton: '제거',
    webClipperPresetName: '클리핑 감시 (Web Clipper)',
    webClipperPresetDesc: 'Obsidian Web Clipper가 사용하는 Clippings/ 폴더를 감시 목록에 추가합니다. 웹 클립이 자동으로 위키에 수집됩니다.',
    noWatchedFoldersHint: '설정된 폴더가 없습니다. 폴더를 추가하거나 Clippings 프리셋을 활성화하세요.',
    autoWatchModeName: '감시 모드',
    autoWatchModeDesc: '"알림만"은 프롬프트를 표시합니다. "자동 수집"은 자동으로 처리합니다.',
    watchModeNotify: '알림만',
    watchModeAuto: '자동 수집',
    autoWatchDebounceName: '디바운스 지연 (ms)',
    autoWatchDebounceDesc: '파일 변경 후 수집 트리거까지 대기 시간 (1000-60000)',
    periodicLintName: '정기 린트',
    periodicLintDesc: '일정에 따라 LLM 린트 실행, 마지막 확인 이후 소스 파일이 변경된 경우에만',
    periodicLintOff: '끄기',
    periodicLintHourly: '매시간',
    periodicLintDaily: '매일',
    periodicLintWeekly: '매주',
    startupCheckName: '시작 시 건강 검사',
    startupCheckDesc: '플러그인 로딩 시 위키 건강 상태 스캔',
    suggestSchemaCommand: '스키마 업데이트 제안',
    autoMaintainCostWarning: '⚠️ 비용 알림: 자동 유지보수 기능은 API 토큰을 소비합니다. "자동 수집"은 소스 파일 변경 시마다 LLM 호출을 트리거합니다. "정기 린트"는 일정에 따라 LLM 건강 검사를 실행합니다 (소스 변경 감지 시에만). 예상치 못한 요금을 피하기 위해 신중하게 설정하세요.',

    // Notices
    startupCheckSummary: '위키에 {pages}개의 페이지가 있습니다 ({entities} 엔티티, {concepts} 컨셉, {sources} 소스)',
    watcherActiveNotice: 'Wiki: 파일 감시 활성화 — 감시 폴더 모니터링 중',
    watchIngestNotice: 'Wiki: sources/에서 {count}개의 파일이 변경되었습니다. "소스 수집"을 실행하여 처리하세요.',
    autoIngestRunning: '{count}개의 변경 파일 자동 수집 중...',
    autoIngestComplete: '자동 수집 완료: {success} 성공, {fail} 실패',
    scheduledLintRunning: '일정된 위키 린트 실행 중...',
    wikiLintStats: '위키 린트: {pages}개의 페이지 ({entities} 엔티티, {concepts} 컨셉, {sources} 소스)',
    wikiHealthStats: '위키 건강: {pages}개의 페이지 ({entities} 엔티티, {concepts} 컨셉, {sources} 소스){indexStatus}',
    lintWikiStart: '위키 린트 시작 중...',
    lintWikiComplete: '위키 린트 완료',
    lintWikiFailed: '위키 린트 실패',
    analyzingSchema: '위키 분석 및 스키마 제안 생성 중...',
    schemaSuggestionGenerated: '스키마 제안이 생성되었습니다. wiki/schema/suggestions.md를 확인하세요',
    noSchemaUpdateNeeded: '스키마 업데이트가 필요하지 않습니다.',
    schemaSuggestionFailed: '스키마 제안 실패',
    schemaNotFoundNotice: '스키마 파일을 찾을 수 없습니다. 스키마를 활성화하여 생성하세요.',
    selectFolderNoMdFiles: '폴더에 Markdown 파일이 없습니다: {path}',
    batchIngestSkipNotice: '이미 수집된 {skipped}/{total} 파일 건너뜁니다. {new}개의 새 파일 수집 중...',
    batchIngestAllIngested: '이 폴더의 {total}개 파일은 모두 이미 수집되었습니다.',
    batchIngestStarting: '"{folder}"에서 {count}개의 파일 수집 중 — 몇 분 정도 소요될 수 있습니다. 완료 시 보고서가 표시됩니다.',
    batchIngestComplete: '배치 수집 완료: {success}/{total} 성공, {fail} 실패',
    batchIngestFailedFiles: '실패한 파일:',
    historyTruncated: '최근 {max} 라운드로 기록이 잘렸습니다',
    historyCleared: '기록이 지워졌습니다',

    // User Feedback Loop
    reviewedPagePreserved: '사용자 검토 콘텐츠 보존: {}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: '위키에 저장하시겠습니까?',
    querySuggestSaveDesc: '이 대화에는 가치 있는 지식이 포함되어 있습니다. 위키에 저장하시겠습니까?',
    querySuggestSaveYes: '저장',
    querySuggestSaveNo: '취소',

    // Ingestion Report
    ingestReportElapsedTime: '경과 시간',
    ingestReportSkippedFiles: '건너뜀 (이미 수집됨)',
    ingestReportFailedGuidance: '이 항목은 자동으로 생성되지 않았습니다. 해당하는 페이지를 수동으로 생성하거나 추출 세분화를 낮추고 소스 파일을 다시 수집할 수 있습니다.',

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: '단일 소스 수집',
    cmdIngestFolder: '폴더에서 수집',
    cmdQueryWiki: '위키 질의',
    cmdLintWiki: '위키 린트',
    cmdRegenerateIndex: '인덱스 재생성',
    cmdSuggestSchema: '스키마 업데이트 제안',

    // Lint Report
    lintReportTitle: '위키 린트 보고서',
    lintReportSummary: '위키 상태 개요: 총 {total} 페이지, 별칭 누락 {aliasesMissing} 페이지, 중복 페이지 {duplicates}개, 깨진 링크 {deadLinks}개 (중복 관련 {deadLinkFromDup}개), 고아 페이지 {orphans}개 (중복인 고아 {orphanFromDup}개), 빈 페이지 {emptyPages}개',
    lintDeadLinkSection: '깨진 링크 (감지됨)',
    lintEmptyPageSection: '빈 페이지 (감지됨)',
    lintOrphanSection: '고아 페이지 (감지됨)',
    lintContradictionSection: '모순 (감지됨)',
    lintDuplicateSection: '중복 페이지 (감지됨)',
    lintNoIssuesFound: '중복, 깨진 링크, 빈 페이지 또는 고아 페이지가 감지되지 않았습니다.',
    lintDeadLinkItem: '- [[{source}]] → **{target}** (페이지가 존재하지 않음){dupFlag}',
    lintDeadLinkMore: '- ... {count}개의 깨진 링크 추가',
    lintEmptyPageItem: '- [[{page}]] — 실질적인 콘텐츠가 50자 미만',
    lintOrphanItem: '- [[{page}]] — 다른 위키 페이지에서 링크하지 않음{dupFlag}',
    lintDuplicateItem: '- [[{target}]] 및 [[{source}]] — {reason}',
    lintDeadLinkAffectedByDup: ' (⚠️ 중복 페이지 관련)',
    lintOrphanIsDuplicate: ' (⚠️ 중복 페이지)',
    lintContradictionOpen: '해결되지 않은 모순: {count}개',
    lintContradictionAutoFixed: '(이번 실행에서 {count}개 자동 수정)',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: '감지됨',
    lintContradictionStatusPendingFix: '수정 대기 중',
    lintLLMAnalysisHeading: '## LLM 분석',

    // Lint Analysis Prompt
    lintAnalysisPrompt: '당신은 위키 유지보수 보조 도구입니다. 다음 정보를 바탕으로 위키 건강 상태를 확인하세요.\n\n위키 인덱스:\n{index}\n\n위키 페이지 콘텐츠 샘플 (총 {total} 페이지, {sample} 페이지 표시):\n{contentSample}\n\n프로그램 검사 결과 (이미 확인됨, 반복하지 마세요):\n{progReport}\n\n다음 항목을 확인하세요 (프로그램 검사에서 이미 감지된 깨진 링크/빈 페이지/고아 페이지는 반복하지 마세요):\n1. **모순** — 서로 다른 페이지가 동일한 사실에 대해 모순되는지\n2. **노후화** — 명백히 오래된 주장이 있는지\n3. **누락** — 중요한 컨셉 중 독립 페이지가 없는 것\n4. **구조** — 페이지 구조가 적절한지 및 상호 참조가 충분한지\n\n출력 형식: Markdown 사용, "## LLM 분석"으로 시작. 각 발견 사항을 한 줄 "- [구체적 이슈]"로 작성. 이슈가 없으면 "명확한 이슈 없음."을 작성하세요.',

    // Lint Fix Progress
    lintFixProgress: '수정 중 {current}/{total}: [[{target}]]',
    lintFixDeadComplete: '깨진 링크 수정 완료. {fixed}/{total} 항목 수정.',
    lintFillProgress: '확장 중 {current}/{total}: {page}',
    lintFillComplete: '페이지 확장 완료. {filled}/{total} 페이지 채움.',
    lintFillFailed: '확장 실패: {page} — {error}',
    lintLinkProgress: '링크 중 {current}/{total}: {page}',
    lintLinkComplete: '고아 링크 완료. {linked} 페이지 링크됨.',
    lintFixNoAction: '조치 없음 (클라이언트 없음)',
    lintFixIndexUpdated: '위키 인덱스 및 로그가 업데이트되었습니다.',
    lintFixAllComplete: '모든 수정이 완료되었습니다. 자세한 내용은 로그를 확인하세요.',

    // Lint Report Modal
    lintModalActionsTitle: '수정 제안 (LLM 토큰 필요):',
    lintModalFixDeadLinks: '깨진 링크 수정 ({count})',
    lintModalExpandEmpty: '빈 페이지 확장 ({count})',
    lintModalLinkOrphans: '고아 페이지 링크 ({count})',
    lintModalAnalyzeSchema: '스키마 분석',
    lintModalMergeDuplicates: '중복 병합 ({count})',
    lintModalFixAll: '스마트 전체 수정 ({count} 이슈)',
    lintMergeProgress: '병합 중 {current}/{total}: {source} → {target}',
    lintMergeComplete: '중복 병합 완료. {merged}/{total} 쌍 병합.',

    // Ingest Report Modal
    ingestReportTitle: '수집 보고서',
    ingestReportSourceFile: '소스 파일',
    ingestReportCreated: '생성됨',
    ingestReportUpdated: '업데이트됨',
    ingestReportContradictions: '모순 발견',
    ingestReportFailedTitle: '수집 실패',
    ingestReportErrorDetail: '오류 상세',
    ingestReportClose: '닫기',
    ingestReportCreatedPages: '생성된 페이지: {count}',
    ingestReportUpdatedPages: '업데이트된 페이지: {count}',
    ingestReportEntitiesCount: '{count} 엔티티',
    ingestReportConceptsCount: '{count} 컨셉',
    ingestReportContradictionsFound: '모순 발견: {count}',
    ingestReportEntityType: '엔티티',
    ingestReportConceptType: '컨셉',
    timeMinutes: '분',
    timeSeconds: '초',
} as const;
