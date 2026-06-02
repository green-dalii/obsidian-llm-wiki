export const PT_TEXTS = {
    // Plugin Info
    pluginTitle: 'Configurações do Karpathy LLM Wiki',
    pluginIntro: 'Este plug-in implementa o conceito de {{link}} para o Obsidian. Ele lê suas notas, usa IA para extrair entidades, conceitos e relações, e constrói uma Wiki estruturada e interligada no seu vault.',
    karpathyLinkText: 'LLM Wiki de Andrej Karpathy',

    // Features Section
    featuresTitle: 'Como funciona',
    workflow1Title: '1. Ingerir',
    workflow1Desc: 'Selecione uma nota — a IA extrai entidades, conceitos e relações para páginas da Wiki.',
    workflow2Title: '2. Consultar',
    workflow2Desc: 'Converse com sua Wiki — as respostas são baseadas no seu conhecimento ingerido.',
    workflow3Title: '3. Manter',
    workflow3Desc: 'Índice gerado automaticamente, links cruzados e verificações de qualidade mantêm a Wiki saudável.',

    // Language Switcher
    languageTitle: 'Idioma da interface',
    languageDesc: 'Selecione seu idioma preferido para o painel de configurações. Reinicie o plugin para aplicar as alterações de idioma à paleta de comandos.',
    languageEn: 'English',
    languageZh: 'Chinese (中文)',
    languageJa: 'Japanese (日本語)',
    languageKo: 'Korean (한국어)',
    languageDe: 'German (Deutsch)',
    languageFr: 'French (Français)',
    languageEs: 'Spanish (Español)',
    languagePt: 'Portuguese (Português)',

    // Status
    statusTitle: 'Status do LLM Client',
    statusInitialized: 'Inicializado',
    statusReady: 'LLM pronto',
    statusNotReady: 'LLM não configurado — complete a configuração acima e passe no teste de conexão',
    statusNotInitialized: 'Não inicializado',
    currentProvider: 'Provedor atual',

    // Provider Configuration
    providerSection: 'Configuração do provedor LLM',
    providerName: 'Provedor LLM',
    providerDesc: 'Selecione um provedor predefinido ou serviço personalizado compatível com OpenAI. Para Coding Plan ou bundles similares: escolha Custom OpenAI/Anthropic, insira manualmente o Base URL e API Key do provedor',

    // API Key
    apiKeyName: 'API Key',
    apiKeyDesc: 'Insira sua API Key do provedor',
    apiKeyPlaceholder: 'Insira a API Key',

    // Base URL
    baseUrlName: 'URL base da API',
    baseUrlDescCustom: 'Obrigatório: endpoint personalizado compatível com OpenAI',
    baseUrlDescOverride: 'Opcional: substituir URL base predefinida',

    // Ollama Hint
    ollamaHint: 'O Ollama roda localmente, não requer API Key',

    // Model Selection
    modelSection: 'Seleção de modelo',
    fetchModelsName: 'Buscar modelos disponíveis',
    fetchModelsDesc: 'Obter a lista mais recente de modelos da API do provedor',
    fetchModelsButton: 'Buscar modelos',
    fetchingModels: 'Buscando...',
    fetchSuccess: 'Sucesso! {} modelos disponíveis',
    fetchFailed: 'Falha ou lista vazia. Insira o nome do modelo manualmente',
    fetchNotSupported: 'O provedor não suporta consulta à lista de modelos',

    selectModelName: 'Selecionar modelo',
    selectModelDesc: 'Escolha entre {} modelos disponíveis',
    customInputOption: 'Entrada personalizada...',
    customInputHint: 'Para usar outros modelos, selecione "Entrada personalizada..."',

    modelName: 'Nome do modelo',
    modelDescCustom: 'Usando modelo personalizado (clique no botão acima para buscar a lista novamente)',
    modelDescRecommended: 'Recomendado: {}',
    modelDescManual: 'Insira o nome do modelo manualmente',

    switchToDropdown: 'Alternar para seleção por lista',
    useDropdownButton: 'Usar lista suspensa',

    // Test & Save
    testConnectionName: 'Testar conexão',
    testConnectionDesc: 'Validar se a configuração consegue chamar a API LLM com sucesso',
    testButton: 'Testar conexão',
    testing: 'Testando...',

    saveSettingsName: 'Salvar configurações',
    saveSettingsDesc: 'Salvar a configuração atual',
    saveButton: 'Salvar configurações',
    testConnectionSuccessful: 'Conexão bem-sucedida',
    testConnectionFailed: 'Conexão falhou',
    testConnectionProvider: 'Provedor: ',
    errorUnknown: 'Erro desconhecido',
    savedNotice: 'Configurações salvas!',

    // Wiki Folder
    wikiSection: 'Configuração da pasta Wiki',
    wikiFolderName: 'Pasta Wiki',
    wikiFolderDesc: 'Local para as páginas geradas da Wiki',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'Configure a API Key primeiro',
    llmNotReady: 'LLM não está configurado. Vá para Configurações → Karpathy LLM Wiki para configurar seu provedor e passar no teste de conexão.',
    errorFetchFailed: 'Falha: {}',

    // Query Settings
    querySectionTitle: 'Configuração de consulta Wiki',
    maxConversationHistoryName: 'Histórico máximo de conversa',
    maxConversationHistoryDesc: 'Limitar mensagens da conversa para evitar excesso de tokens',
    maxConversationHistoryHint: 'Recomendado: não ultrapassar 50 rodadas',
    numberRangeValidation: 'Insira um número entre 1 e 50',
    numberRangeClamped: 'Valor fora do intervalo (1-300), automaticamente definido como {}',
    // Query Modal UI
    queryModalTitle: 'Consultar Wiki — Consulta conversacional',
    queryModalPlaceholder: 'Insira sua pergunta...',
    queryModalSendButton: 'Enviar',
    queryModalStopButton: 'Parar',
    queryModalSaveButton: 'Salvar na Wiki',
    queryModalClearButton: 'Limpar histórico',
    queryModalHistoryCount: 'Histórico de conversa: {}/{} rodadas',
    queryModalStreaming: 'Transmissão em andamento...',
    queryModalFallbackStreaming: 'Transmissão não suportada, alternando para modo não transmissivo. Aguarde...',
    queryPhaseSearching: 'Analisando índice da Wiki, selecionando páginas relevantes...',
    queryPhaseFoundPages: '{count} página(s) encontrada(s): {pages}',
    queryPhaseLoadingPages: 'Carregando conteúdo das páginas...',
    queryPhaseContextReady: 'Contexto pronto. Gerando resposta...',
    queryPhaseGenerating: 'Gerando... ({time}s decorrido)',
    queryPhaseNonStreaming: 'Modo não transmissivo, gerando resposta... ({time}s decorrido)',
    queryModalErrorPrefix: 'Erro: ',
    queryModalHint: 'Consultas baseadas no conteúdo da Wiki. Clique em "Salvar na Wiki" para extrair conversas valiosas como páginas.',

    // Error Messages
    errorLLMClientNotInit: 'LLM Client não inicializado. Salve as configurações.',
    errorIngestFailed: 'Falha na ingestão: ',
    errorQueryFailed: 'Falha na consulta: ',

    // Success Messages
    ingestSuccess: 'Ingestão bem-sucedida: {} páginas criadas, {} páginas atualizadas',
    querySuccess: 'Consulta concluída',
    lintSuccess: 'Verificação da Wiki concluída',
    lintReadingPages: 'Lendo {count} páginas da Wiki...',
    lintReadingPagesProgress: 'Lendo páginas da Wiki: {current}/{total}...',
    lintScanningLinks: 'Verificando links quebrados...',
    lintScanningLinksProgress: 'Verificando links quebrados: {current}/{total}...',
    lintCheckingDuplicates: 'Verificando páginas duplicadas...',
    lintDuplicateCheckFailed: 'Detecção de duplicatas falhou — consulte o console para detalhes',
    lintDuplicateCheckFailedDetail: 'Verificação de duplicatas falhou em {step}: {error}',
    lintMergeItemFailed: 'Falha na mesclagem: {source} → {target} — {error}',
    lintAliasesMissing: 'Aliases ausentes: {count} página(s) sem aliases',
    lintAliasesSection: 'Páginas sem aliases (detectadas)',
    lintAliasesItem: '- [[{page}]]',
    lintAliasesCompleteBtn: 'Completar aliases ({count})',
    lintAliasesFilling: 'Gerando aliases {current}/{total}: {page}',
    lintAliasesFilled: 'Completar aliases concluído. Preenchidas {filled}/{total} páginas.',
    lintAliasesFillFailed: 'Falha ao gerar aliases: {page} — {error}',
    lintFixItemFailed: 'Falha na correção: [[{target}]] — {error}',
    lintLinkItemFailed: 'Falha ao linkar: {page} — {error}',
    lintRetrying: 'Tentando novamente ({attempt}/{max}) após erro...',
    lintAnalyzingLLM: 'LLM analisando saúde da Wiki...',
    saveToWikiSuccess: 'Conversa salva na Wiki!',
    saveSummary: '{entities} entidades, {concepts} conceitos, {pages} páginas',
    aliasAdded: 'Alias \'{alias}\' adicionado à página \'{page}\'',

    // Status Messages
    ingestingSources: 'Ingerindo fontes...',
    queryingWiki: 'Consultando Wiki...',
    lintingWiki: 'Verificando Wiki...',
    savingToWiki: 'Salvando conversa na Wiki...',
    clearingHistory: 'Limpando histórico de conversa...',

    // Buttons
    ingestButton: 'Ingerir',
    queryButton: 'Consultar',
    lintButton: 'Verificar',
    cancelButton: 'Cancelar',

    // Links
    karpathyGistLink: 'Gist do LLM Wiki do Karpathy',
    obsidianPluginAPI: 'API de plug-ins do Obsidian',
    anthropicSDK: 'SDK da Anthropic',
    openaiSDK: 'SDK da OpenAI',

    // Other
    availableModelsLoading: 'Carregando modelos disponíveis...',
    noModelsAvailable: 'Nenhum modelo disponível',

    // LLM Language Hint
    llmLanguageHint: 'Please answer in Portuguese.',

    // Schema Configuration
    schemaSection: 'Configuração do Schema',
    enableSchemaName: 'Ativar Schema',
    enableSchemaDesc: 'Gerar e injetar schema/config.md em todos os prompts LLM para saída estruturada da Wiki',
    viewSchemaButton: 'Ver / editar Schema',
    regenerateSchemaButton: 'Regenerar Schema padrão',
    schemaRegeneratedNotice: 'Schema padrão regenerado.',
    schemaRegenerateFailed: 'Falha na geração do Schema',

    // Status de inicialização do Wiki
    wikiInitStatusReady: 'Wiki inicializado',
    wikiInitStatusNotReady: 'Wiki não inicializado — será criado automaticamente na primeira ingestão',

    // Wiki Output Language
    wikiLanguageName: 'Idioma de saída da Wiki',
    wikiLanguageDesc: 'Todas as páginas da Wiki, índice, log e respostas de consulta gerados usam este idioma',
    customWikiLanguageOption: 'Personalizado...',
    customWikiLanguageHint: 'Insira um nome de idioma (ex.: Italiano, Árabe). Ele será passado ao LLM como diretiva de idioma de saída.',
    customWikiLanguagePlaceholder: 'Ex.: Italiano',

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
    extractionSectionTitle: 'Extração',
    extractionGranularityName: 'Granularidade da extração',
    extractionGranularityDesc: 'Controla extrações por arquivo fonte. Maior = mais páginas/tokens API.\nFina: análise profunda. Padrão: notas diárias. Grosseira: visão rápida. Mínima: processamento 100+ arquivos. Personalizada: limites próprios (até 300).\nDica: Use Mínima/Grosseira para pastas com muitos arquivos para economizar tempo e custo.',
    extractionGranularityFine: 'Fina — análise profunda (≤100 itens)',
    extractionGranularityStandard: 'Padrão — notas diárias (≤50 itens)',
    extractionGranularityCoarse: 'Grosseira — visão rápida (≤10 itens)',
    extractionGranularityMinimal: 'Mínima — processamento em lote 100+ arquivos (≤5 itens)',
    extractionGranularityCustom: 'Personalizada — Definir seus próprios limites (1~300)',
    customEntityLimitName: 'Limite personalizado de entidades',
    customEntityLimitDesc: 'Número máximo de entidades a extrair por arquivo fonte (1-300)',
    customConceptLimitName: 'Limite personalizado de conceitos',
    customConceptLimitDesc: 'Número máximo de conceitos a extrair por arquivo fonte (1-300)',

    // Ingestion Acceleration
    accelerationSectionTitle: 'Aceleração da ingestão',
    pageGenerationConcurrencyName: 'Paralelismo na geração de páginas',
    pageGenerationConcurrencyDesc: 'Número de páginas a gerar em paralelo durante ingestão de uma única fonte. Valores mais altos aceleram a ingestão, mas aumentam custos de API e podem acionar limites de taxa.',
    concurrencyValueSingular: 'Concorrência atual: {} (serial — mais seguro)',
    concurrencyValuePlural: 'Concorrência atual: {} (paralelo)',
    batchDelayName: 'Atraso entre lotes (ms)',
    batchDelayDesc: 'Atraso entre lotes paralelos para evitar limitação de taxa da API (100-2000 ms). Atual: {}ms. Aumente se observar erros 429.',

    // Auto Maintenance
    autoMaintainSection: 'Manutenção automática',
    autoMaintainBetaBadge: 'BETA — Recurso experimental. Pode apresentar problemas. Recomendado apenas para usuários avançados.',
    autoWatchName: 'Pastas monitoradas',
    autoWatchDesc: 'Detectar automaticamente arquivos .md novos ou alterados nas pastas monitoradas e notificar ou ingerir automaticamente',
    watchedFoldersName: 'Pastas monitoradas',
    watchedFoldersDesc: 'Pastas a monitorar para novo conteúdo. Clique em "Adicionar pasta" para selecionar no seu vault.',
    addWatchedFolderButton: 'Adicionar pasta',
    removeWatchedFolderButton: 'Remover',
    webClipperPresetName: 'Monitorar Clippings (Web Clipper)',
    webClipperPresetDesc: 'Adicionar a pasta Clippings/ usada pelo Obsidian Web Clipper à lista de monitoramento. Seus recortes web serão ingeridos automaticamente na Wiki.',
    noWatchedFoldersHint: 'Nenhuma pasta configurada. Adicione uma pasta ou ative o preset Clippings.',
    autoWatchModeName: 'Modo de monitoramento',
    autoWatchModeDesc: '"Somente notificar" exibe um aviso. "Ingerir automaticamente" processa silenciosamente.',
    watchModeNotify: 'Somente notificar',
    watchModeAuto: 'Ingerir automaticamente',
    autoWatchDebounceName: 'Atraso de debounce (segundos)',
    autoWatchDebounceDesc: 'Tempo de espera antes de acionar a ingestão após alteração de arquivo (1-60 segundos)',
    periodicLintName: 'Verificação periódica',
    periodicLintDesc: 'Executar verificação LLM agendada, somente quando arquivos fonte foram alterados desde a última verificação',
    periodicLintOff: 'Desativado',
    periodicLintHourly: 'A cada hora',
    periodicLintDaily: 'Diariamente',
    periodicLintWeekly: 'Semanalmente',
    startupCheckName: 'Verificação de saúde na inicialização',
    startupCheckDesc: 'Verificar saúde da Wiki quando o plug-in for carregado',
    suggestSchemaCommand: 'Sugerir atualizações de Schema',
    autoMaintainCostWarning: '⚠️ Aviso de custo: Recursos de manutenção automática consomem tokens de API. "Ingerir automaticamente" aciona chamadas LLM em cada alteração de arquivo fonte. "Verificação periódica" executa verificações de saúde LLM agendadas (somente quando alterações são detectadas). Configure com cuidado para evitar cobranças inesperadas.',

    // Notices
    startupCheckSummary: 'A Wiki tem {pages} páginas ({entities} entidades, {concepts} conceitos, {sources} fontes)',
    watcherActiveNotice: 'Wiki: monitor de arquivos ativo — monitorando pastas selecionadas',
    watchIngestNotice: 'Wiki: {count} arquivo(s) alterado(s) em sources/. Execute "Ingerir fontes" para processar.',
    autoIngestRunning: 'Ingerindo automaticamente {count} arquivo(s) alterado(s)...',
    autoIngestComplete: 'Ingestão automática concluída: {success} bem-sucedido(s), {fail} falha(s)',
    scheduledLintRunning: 'Executando verificação agendada da Wiki...',
    wikiLintStats: 'Verificação da Wiki: {pages} páginas ({entities} entidades, {concepts} conceitos, {sources} fontes)',
    wikiHealthStats: 'Saúde da Wiki: {pages} páginas ({entities} entidades, {concepts} conceitos, {sources} fontes){indexStatus}',
    lintWikiStart: 'Iniciando verificação da Wiki...',
    lintWikiComplete: 'Verificação da Wiki concluída',
    lintWikiFailed: 'Verificação da Wiki falhou',
    analyzingSchema: 'Analisando Wiki e gerando sugestões de Schema...',
    schemaSuggestionGenerated: 'Sugestões de Schema geradas. Consulte wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: 'Nenhuma atualização de Schema necessária.',
    schemaSuggestionFailed: 'Falha ao gerar sugestões de Schema',
    schemaNotFoundNotice: 'Arquivo de Schema não encontrado. Ative o Schema para criá-lo.',
    selectFolderNoMdFiles: 'Nenhum arquivo Markdown na pasta: {path}',
    batchIngestSkipNotice: 'Ignorando {skipped}/{total} arquivos já ingeridos. Ingerindo {new} novos arquivos...',
    batchIngestAllIngested: 'Todos os {total} arquivos desta pasta já foram ingeridos.',
    batchIngestStarting: 'Ingerindo {count} arquivo(s) de "{folder}" — isso pode levar alguns minutos. Um relatório aparecerá ao concluir.',
    batchIngestComplete: 'Ingestão em lote concluída: {success}/{total} bem-sucedido(s), {fail} falha(s)',
    batchIngestFailedFiles: 'Arquivos com falha:',
    historyTruncated: 'Histórico truncado para as últimas {max} rodadas',
    historyCleared: 'Histórico limpo',

    // User Feedback Loop
    reviewedPagePreserved: 'Preservando conteúdo revisado pelo usuário para: {}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: 'Salvar na Wiki?',
    querySuggestSaveDesc: 'Esta conversa contém conhecimento valioso. Deseja salvar na sua Wiki?',
    querySuggestSaveYes: 'Salvar',
    querySuggestSaveNo: 'Dispensar',

    // Ingestion Report
    ingestReportElapsedTime: 'Tempo decorrido',
    ingestReportSkippedFiles: 'Ignorados (já ingeridos)',
    ingestReportFailedGuidance: 'Estes itens não puderam ser criados automaticamente. Você pode criar as páginas manualmente ou reduzir a granularidade da extração e reingerir o arquivo fonte.',
    ingestReportCollisions: 'Colisões cross-type (fundidas como alias)',

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: 'Ingerir fonte individual',
    cmdIngestFolder: 'Ingerir de pasta',
    cmdQueryWiki: 'Consultar Wiki',
    cmdLintWiki: 'Verificar Wiki',
    cmdRegenerateIndex: 'Regenerar índice',
    cmdSuggestSchema: 'Sugerir atualizações de Schema',
    cmdCancelIngestion: 'Cancelar ingestão atual',
    cmdIngestActiveFile: 'Ingerir arquivo atual',
    noActiveFile: 'Nenhum arquivo aberto',
    mdOnlyFile: 'Apenas arquivos Markdown podem ser ingeridos',

    // Ingestion status bar
    ingestionStatusBar: 'Ingerindo... clique para cancelar',
    lintStatusBar: 'Verificando... clique para cancelar',
    ingestionCancelling: 'Cancelando — irá parar após o lote atual',
    ingestionCancelled: 'Ingestão cancelada',
    crossTypeCollisionNotice: '{count} elementos fundidos como alias cross-type (duplicatas entidade ↔ conceito evitadas)',

    // Lint Report
    lintReportTitle: 'Relatório de verificação da Wiki',
    lintReportSummary: 'Visão geral do status da Wiki: {total} páginas no total, {aliasesMissing} páginas sem aliases, {duplicates} páginas duplicadas, {deadLinks} links quebrados ({deadLinkFromDup} envolvem duplicatas), {orphans} páginas órfãs ({orphanFromDup} são duplicatas), {emptyPages} páginas vazias',
    lintDeadLinkSection: 'Links quebrados (detectados)',
    lintEmptyPageSection: 'Páginas vazias (detectadas)',
    lintOrphanSection: 'Páginas órfãs (detectadas)',
    lintContradictionSection: 'Contradições (detectadas)',
    lintDuplicateSection: 'Páginas duplicadas (detectadas)',
    lintNoIssuesFound: 'Nenhuma duplicata, link quebrado, página vazia ou página órfã detectada.',
    lintDeadLinkItem: '- [[{source}]] → **{target}** (página inexistente){dupFlag}',
    lintDeadLinkMore: '- ... mais {count} links quebrados',
    lintEmptyPageItem: '- [[{page}]] — menos de 50 caracteres de conteúdo substantivo',
    lintOrphanItem: '- [[{page}]] — nenhuma outra página da Wiki linka aqui{dupFlag}',
    lintPollutedSection: 'Páginas com poluição de caminho (detectadas)',
    lintPollutedItem: '- [[{page}]] → deveria ser "{clean}"',
    lintDuplicateItem: '- [[{target}]] e [[{source}]] — {reason}',
    lintDeadLinkAffectedByDup: ' (⚠️ envolve página duplicada)',
    lintOrphanIsDuplicate: ' (⚠️ página duplicada)',
    lintContradictionOpen: 'Contradições abertas: {count}',
    lintContradictionAutoFixed: '({count} auto-corrigido(s) nesta execução)',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: 'Detectado',
    lintContradictionStatusPendingFix: 'Aguardando correção',
    lintLLMAnalysisHeading: '## Análise LLM',

    // Lint Analysis Prompt
    lintAnalysisPrompt: 'Você é um assistente de manutenção de Wiki. Verifique a saúde da Wiki com base nas seguintes informações.\n\nÍndice da Wiki:\n{index}\n\nAmostra de conteúdo das páginas ({total} páginas no total, mostrando {sample} páginas):\n{contentSample}\n\nResultados da verificação programática (já verificados, não repetir):\n{progReport}\n\nVerifique os seguintes aspectos (pule links quebrados/páginas vazias/órfãs já detectados pelas verificações programáticas):\n1. **Contradições** — se páginas diferentes se contradizem sobre os mesmos fatos\n2. **Desatualização** — se alguma declaração está claramente desatualizada\n3. **Ausência** — quais conceitos importantes não possuem páginas independentes\n4. **Estrutura** — se a estrutura das páginas é razoável e as referências cruzadas são adequadas\n\nFormato de saída: Use Markdown, começando com "## Análise LLM". Cada descoberta em uma linha "- [problema específico]". Se não houver problemas, escreva "Nenhum problema óbvio encontrado."',

    // Lint Fix Progress
    lintFixProgress: 'Corrigindo {current}/{total}: [[{target}]]',
    lintFixDeadComplete: 'Correção de links quebrados concluída. {fixed}/{total} itens corrigidos.',
    lintFillProgress: 'Expandindo {current}/{total}: {page}',
    lintFillComplete: 'Expansão de páginas concluída. {filled}/{total} páginas preenchidas.',
    lintFillFailed: 'Falha ao expandir: {page} — {error}',
    lintLinkProgress: 'Linkando {current}/{total}: {page}',
    lintLinkComplete: 'Links de páginas órfãs concluídos. {linked} páginas linkadas.',
    lintFixNoAction: 'Nenhuma ação realizada (sem client)',
    lintFixIndexUpdated: 'Índice e log da Wiki atualizados.',
    lintPollutedFixed: 'Páginas poluídas corrigidas: {fixed}/{total}. Índice regenerado.',
    regenerateIndexCompleted: 'Índice regenerado',
    operationFailed: 'Falha: ', 
    lintFixAllComplete: 'Todas as correções concluídas. Consulte o log para detalhes.',

    // Lint Report Modal
    lintModalActionsTitle: 'Sugestões de correção (requer tokens LLM):',
    lintModalFixDeadLinks: 'Corrigir links quebrados ({count})',
    lintModalExpandEmpty: 'Expandir páginas vazias ({count})',
    lintModalLinkOrphans: 'Linkar páginas órfãs ({count})',
    lintModalAnalyzeSchema: 'Analisar Schema',
    lintModalMergeDuplicates: 'Mesclar duplicatas ({count})',
    lintModalFixAll: 'Correção inteligente de tudo ({count} problemas)',
    lintMergeProgress: 'Mesclando {current}/{total}: {source} → {target}',
    lintMergeComplete: 'Mesclagem de duplicatas concluída. {merged}/{total} pares mesclados.',

    // Ingest Report Modal
    ingestReportTitle: 'Relatório de ingestão',
    ingestReportSourceFile: 'Arquivo fonte',
    ingestReportCreated: 'Criadas',
    ingestReportUpdated: 'Atualizadas',
    ingestReportContradictions: 'Contradições encontradas',
    ingestReportFailedTitle: 'Falha ao ingerir',
    ingestReportErrorDetail: 'Detalhe do erro',
    ingestReportClose: 'Fechar',
    ingestReportCreatedPages: 'Páginas criadas: {count}',
    ingestReportUpdatedPages: 'Páginas atualizadas: {count}',
    ingestReportEntitiesCount: '{count} entidades',
    ingestReportConceptsCount: '{count} conceitos',
    ingestReportContradictionsFound: 'Contradições encontradas: {count}',
    ingestReportEntityType: 'Entidade',
    ingestReportConceptType: 'Conceito',
    timeMinutes: 'min',
    timeSeconds: 's',

    // Avisos de limite de taxa
    rateLimitDetected: '⚠️ Limite de taxa detectado: {count} página(s) falharam com erros 429. Sugestões: (1) Reduzir concorrência para {suggestedConcurrency} ou 1 (serial), (2) Aumentar atraso entre lotes para {suggestedDelay}ms, (3) Mudar para um provedor com limites de taxa mais altos.',
    rateLimitDetectedShort: '⚠️ Limite de taxa atingido — considere reduzir a concorrência ou aumentar o atraso entre lotes em Configurações → Aceleração de ingestão.',

    longSourceNotice: '"📄 「{filename}」 tem {lines} linhas ({size}). Textos longos exigem extração iterativa por lotes — o LLM lê o documento completo em múltiplas passagens. Isso pode levar vários minutos. Por favor, aguarde."',
    longSourceNoticeShort: '"📄 Arquivo grande detectado ({lines} linhas). A ingestão pode demorar um pouco."',
} as const;
