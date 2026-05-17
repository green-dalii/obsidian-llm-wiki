export const ES_TEXTS = {
    // Plugin Info
    pluginTitle: 'Karpathy LLM Wiki Configuración',
    pluginIntro: 'Este plugin implementa el concepto de {{link}} para Obsidian. Lee tus notas, usa IA para extraer entidades, conceptos y relaciones, y construye una Wiki estructurada e interconectada en tu vault.',
    karpathyLinkText: 'Wiki LLM de Andrej Karpathy',

    // Features Section
    featuresTitle: 'Cómo funciona',
    workflow1Title: '1. Ingestión',
    workflow1Desc: 'Selecciona una nota — la IA extrae entidades, conceptos y relaciones en páginas Wiki.',
    workflow2Title: '2. Consulta',
    workflow2Desc: 'Chatea con tu Wiki — las respuestas se fundamentan en tu conocimiento ingerido.',
    workflow3Title: '3. Mantenimiento',
    workflow3Desc: 'Índice autogenerado, enlaces cruzados y verificaciones lint mantienen la Wiki saludable.',

    // Language Switcher
    languageTitle: 'Idioma de la interfaz',
    languageDesc: 'Selecciona tu idioma preferido para el panel de configuración. Reinicia el plugin para aplicar los cambios de idioma a la paleta de comandos.',
    languageEn: 'English',
    languageZh: 'Chinese (中文)',
    languageJa: 'Japanese (日本語)',
    languageKo: 'Korean (한국어)',
    languageDe: 'German (Deutsch)',
    languageFr: 'French (Français)',
    languageEs: 'Spanish (Español)',
    languagePt: 'Portuguese (Português)',

    // Status
    statusTitle: 'Estado del cliente LLM',
    statusInitialized: 'Inicializado',
    statusNotInitialized: 'No inicializado',
    currentProvider: 'Proveedor actual',

    // Provider Configuration
    providerSection: 'Configuración del proveedor LLM',
    providerName: 'Proveedor LLM',
    providerDesc: 'Selecciona un proveedor predefinido o un servicio compatible con OpenAI personalizado',

    // API Key
    apiKeyName: 'API Key',
    apiKeyDesc: 'Introduce tu API Key del proveedor',
    apiKeyPlaceholder: 'Introduce la API Key',

    // Base URL
    baseUrlName: 'API Base URL',
    baseUrlDescCustom: 'Requerido: endpoint personalizado compatible con OpenAI',
    baseUrlDescOverride: 'Opcional: sobrescribe la Base URL preconfigurada',

    // Ollama Hint
    ollamaHint: 'Ollama se ejecuta localmente, no requiere API Key',

    // Model Selection
    modelSection: 'Selección del modelo',
    fetchModelsName: 'Obtener modelos disponibles',
    fetchModelsDesc: 'Obtiene la lista de modelos más reciente desde la API del proveedor',
    fetchModelsButton: 'Obtener modelos',
    fetchingModels: 'Obteniendo...',
    fetchSuccess: '¡Correcto! {} modelos disponibles',
    fetchFailed: 'Error o lista vacía. Introduce el nombre del modelo manualmente',
    fetchNotSupported: 'El proveedor no admite consultas de lista de modelos',

    selectModelName: 'Seleccionar modelo',
    selectModelDesc: 'Elige entre {} modelos disponibles',
    customInputOption: 'Entrada personalizada...',
    customInputHint: 'Para usar otros modelos, selecciona "Entrada personalizada..."',

    modelName: 'Nombre del modelo',
    modelDescCustom: 'Usando modelo personalizado (pulsa el botón de arriba para volver a obtener la lista)',
    modelDescRecommended: 'Recomendado: {}',
    modelDescManual: 'Introduce manualmente el nombre del modelo',

    switchToDropdown: 'Cambiar a selección con menú desplegable',
    useDropdownButton: 'Usar menú desplegable',

    // Test & Save
    testConnectionName: 'Probar conexión',
    testConnectionDesc: 'Valida que la configuración puede llamar correctamente a la API LLM',
    testButton: 'Probar conexión',
    testing: 'Probando...',

    saveSettingsName: 'Guardar configuración',
    saveSettingsDesc: 'Guarda la configuración actual',
    saveButton: 'Guardar configuración',
    savedNotice: '¡Configuración guardada!',

    // Wiki Folder
    wikiSection: 'Configuración de carpeta Wiki',
    wikiFolderName: 'Carpeta Wiki',
    wikiFolderDesc: 'Ubicación para las páginas Wiki generadas',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'Configura primero la API Key',
    errorFetchFailed: 'Error: {}',

    // Query Settings
    querySectionTitle: 'Configuración de consulta Wiki',
    maxConversationHistoryName: 'Máximo de historial de conversación',
    maxConversationHistoryDesc: 'Limita los mensajes de conversación para evitar desbordamiento de tokens',
    maxConversationHistoryHint: 'Recomendado: no superar 50 rondas',
    numberRangeValidation: 'Introduce un número entre 1 y 50',

    // Query Modal UI
    queryModalTitle: 'Consultar Wiki - Consulta conversacional',
    queryModalPlaceholder: 'Introduce una pregunta...',
    queryModalSendButton: 'Enviar',
    queryModalStopButton: 'Detener',
    queryModalSaveButton: 'Guardar en Wiki',
    queryModalClearButton: 'Limpiar historial',
    queryModalHistoryCount: 'Historial de conversación: {}/{} rondas',
    queryModalStreaming: 'Transmisión en curso...',
    queryModalFallbackStreaming: 'Transmisión no disponible, cambiado a modo sin transmisión. Espera...',
    queryPhaseSearching: 'Analizando índice Wiki, seleccionando páginas relevantes...',
    queryPhaseFoundPages: 'Se encontraron {count} página(s): {pages}',
    queryPhaseLoadingPages: 'Cargando contenido de las páginas...',
    queryPhaseContextReady: 'Contexto listo. Generando respuesta...',
    queryPhaseGenerating: 'Generando... (transcurrido {time}s)',
    queryPhaseNonStreaming: 'Modo sin transmisión, generando respuesta... (transcurrido {time}s)',
    queryModalErrorPrefix: 'Error: ',
    queryModalHint: 'Las consultas se basan en el contenido de la Wiki. Pulsa "Guardar en Wiki" para extraer conversaciones valiosas como páginas Wiki.',

    // Error Messages
    errorLLMClientNotInit: 'Cliente LLM no inicializado. Guarda la configuración.',
    errorIngestFailed: 'La ingestión falló: ',
    errorQueryFailed: 'La consulta falló: ',

    // Success Messages
    ingestSuccess: 'Ingestión completada: {} páginas creadas, {} páginas actualizadas',
    querySuccess: 'Consulta completada',
    lintSuccess: 'Verificación lint de Wiki completada',
    lintReadingPages: 'Leyendo {count} páginas Wiki...',
    lintReadingPagesProgress: 'Leyendo páginas Wiki: {current}/{total}...',
    lintScanningLinks: 'Escaneando enlaces rotos...',
    lintScanningLinksProgress: 'Escaneando enlaces rotos: {current}/{total}...',
    lintCheckingDuplicates: 'Buscando páginas duplicadas...',
    lintDuplicateCheckFailed: 'Falló la detección de duplicados — consulta la consola para más detalles',
    lintDuplicateCheckFailedDetail: 'Falló la comprobación de duplicados en {step}: {error}',
    lintMergeItemFailed: 'Falló la fusión: {source} → {target} — {error}',
    lintAliasesMissing: 'Alias faltantes: {count} página(s) sin alias',
    lintAliasesCompleteBtn: 'Completar alias ({count})',
    lintAliasesFilling: 'Generando alias {current}/{total}: {page}',
    lintAliasesFilled: 'Completado de alias finalizado. Rellenadas {filled}/{total} páginas.',
    lintAliasesFillFailed: 'Falló la generación de alias: {page} — {error}',
    lintFixItemFailed: 'Falló la corrección: [[{target}]] — {error}',
    lintLinkItemFailed: 'Falló el enlace: {page} — {error}',
    lintRetrying: 'Reintentando ({attempt}/{max}) tras error...',
    lintAnalyzingLLM: 'La IA está analizando el estado de la Wiki...',
    saveToWikiSuccess: '¡Conversación guardada en la Wiki!',
    aliasAdded: 'Añadido alias \'{alias}\' a la página \'{page}\'',

    // Status Messages
    ingestingSources: 'Ingestando fuentes...',
    queryingWiki: 'Consultando Wiki...',
    lintingWiki: 'Verificando Wiki...',
    savingToWiki: 'Guardando conversación en Wiki...',
    clearingHistory: 'Limpiando historial de conversación...',

    // Buttons
    ingestButton: 'Ingestar',
    queryButton: 'Consultar',
    lintButton: 'Verificar',
    cancelButton: 'Cancelar',

    // Links
    karpathyGistLink: 'Gist de Karpathy LLM Wiki',
    obsidianPluginAPI: 'API de plugins de Obsidian',
    anthropicSDK: 'SDK de Anthropic',
    openaiSDK: 'SDK de OpenAI',

    // Other
    availableModelsLoading: 'Cargando modelos disponibles...',
    noModelsAvailable: 'No hay modelos disponibles',

    // LLM Language Hint
    llmLanguageHint: 'Please answer in Spanish.',

    // Schema Configuration
    schemaSection: 'Configuración del esquema',
    enableSchemaName: 'Activar esquema',
    enableSchemaDesc: 'Genera e inyecta schema/config.md en todos los prompts LLM para salida Wiki estructurada',
    viewSchemaButton: 'Ver / editar esquema',
    regenerateSchemaButton: 'Regenerar esquema predeterminado',
    schemaRegeneratedNotice: 'Esquema predeterminado regenerado.',

    // Wiki Output Language
    wikiLanguageName: 'Idioma de salida de la Wiki',
    wikiLanguageDesc: 'Todas las páginas wiki generadas, índice, registro y respuestas de consulta usan este idioma',
    customWikiLanguageOption: 'Personalizado...',
    customWikiLanguageHint: 'Introduce un idioma (p. ej. italiano, árabe). Se pasará al LLM como directiva de idioma de salida.',
    customWikiLanguagePlaceholder: 'p. ej. italiano',

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
    extractionSectionTitle: 'Extracción',
    extractionGranularityName: 'Granularidad de extracción',
    extractionGranularityDesc: 'Controla cuántas entidades/conceptos se extraen. Mayor granularidad = más páginas creadas, más tokens de API consumidos.',
    extractionGranularityFine: 'Fina — extrae todo, incluidas menciones marginales (más páginas, mayor coste de tokens)',
    extractionGranularityStandard: 'Estándar — entidades/conceptos centrales y relevantes (equilibrado)',
    extractionGranularityCoarse: 'Gruesa — solo las entidades/conceptos más centrales (menos páginas, menor coste de tokens)',

    // Ingestion Acceleration
    accelerationSectionTitle: 'Aceleración de ingestión',
    pageGenerationConcurrencyName: 'Concurrencia de generación de páginas',
    pageGenerationConcurrencyDesc: 'Número de páginas a generar en paralelo durante la ingestión de una fuente. Valores más altos aceleran la ingestión pero incrementan costes de API y pueden alcanzar límites de tasa.',
    concurrencyValueSingular: '{} (serial — más seguro)',
    concurrencyValuePlural: '{} (paralelo)',
    batchDelayName: 'Retraso entre lotes (ms)',
    batchDelayDesc: 'Retraso entre lotes paralelos para evitar límites de tasa de la API (100-2000ms). Aumenta si ves errores 429.',

    // Auto Maintenance
    autoMaintainSection: 'Mantenimiento automático',
    autoMaintainBetaBadge: 'BETA — Función experimental. Puede tener problemas. Recomendado solo para usuarios avanzados.',
    autoWatchName: 'Monitorizar carpetas',
    autoWatchDesc: 'Detecta automáticamente archivos .md nuevos o modificados en las carpetas monitorizadas y notifica o ingesta automáticamente',
    watchedFoldersName: 'Carpetas monitorizadas',
    watchedFoldersDesc: 'Carpetas a monitorizar para contenido nuevo. Pulsa "Añadir carpeta" para seleccionar desde tu vault.',
    addWatchedFolderButton: 'Añadir carpeta',
    removeWatchedFolderButton: 'Eliminar',
    webClipperPresetName: 'Monitorizar recortes (Web Clipper)',
    webClipperPresetDesc: 'Añade la carpeta Clippings/ usada por Obsidian Web Clipper a la lista de monitorización. Tus recortes web se ingerirán automáticamente en la Wiki.',
    noWatchedFoldersHint: 'Ninguna carpeta configurada. Añade una carpeta o activa el preset Clippings.',
    autoWatchModeName: 'Modo de monitorización',
    autoWatchModeDesc: '"Solo notificar" muestra un aviso. "Ingestión automática" procesa sin intervención.',
    watchModeNotify: 'Solo notificar',
    watchModeAuto: 'Ingestión automática',
    autoWatchDebounceName: 'Retraso de debounce (ms)',
    autoWatchDebounceDesc: 'Tiempo de espera antes de disparar la ingestión tras un cambio en un archivo (1000-60000)',
    periodicLintName: 'Verificación lint periódica',
    periodicLintDesc: 'Ejecuta lint LLM de forma programada, solo cuando los archivos fuente han cambiado desde la última comprobación',
    periodicLintOff: 'Desactivado',
    periodicLintHourly: 'Cada hora',
    periodicLintDaily: 'Diario',
    periodicLintWeekly: 'Semanal',
    startupCheckName: 'Comprobación al inicio',
    startupCheckDesc: 'Escanea el estado de la Wiki cuando se carga el plugin',
    suggestSchemaCommand: 'Sugerir actualizaciones del esquema',
    autoMaintainCostWarning: '⚠️ Aviso de coste: Las funciones de mantenimiento automático consumen tokens de API. "Ingestión automática" dispara llamadas LLM en cada cambio de archivo fuente. "Verificación lint periódica" ejecuta comprobaciones de salud programadas (solo cuando se detectan cambios). Configura con cuidado para evitar cargos inesperados.',

    // Notices
    startupCheckSummary: 'La Wiki tiene {pages} páginas ({entities} entidades, {concepts} conceptos, {sources} fuentes)',
    watcherActiveNotice: 'Wiki: monitor de archivos activo — supervisando carpetas monitorizadas',
    watchIngestNotice: 'Wiki: {count} archivo(s) modificado(s) en sources/. Ejecuta "Ingestar fuentes" para procesar.',
    autoIngestRunning: 'Ingestando automáticamente {count} archivo(s) modificado(s)...',
    autoIngestComplete: 'Ingestión automática completada: {success} correctas, {fail} fallidas',
    scheduledLintRunning: 'Ejecutando verificación lint programada de la Wiki...',
    wikiLintStats: 'Lint de Wiki: {pages} páginas ({entities} entidades, {concepts} conceptos, {sources} fuentes)',
    wikiHealthStats: 'Estado de la Wiki: {pages} páginas ({entities} entidades, {concepts} conceptos, {sources} fuentes){indexStatus}',
    lintWikiStart: 'Iniciando verificación lint de la Wiki...',
    lintWikiComplete: 'Verificación lint de la Wiki completada',
    lintWikiFailed: 'Verificación lint de la Wiki fallida',
    analyzingSchema: 'Analizando la Wiki y generando sugerencias de esquema...',
    schemaSuggestionGenerated: 'Sugerencias de esquema generadas, consulta wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: 'No se necesitan actualizaciones del esquema.',
    schemaSuggestionFailed: 'Falló la sugerencia de esquema',
    schemaNotFoundNotice: 'Archivo de esquema no encontrado. Activa el esquema para crearlo.',
    selectFolderNoMdFiles: 'No hay archivos Markdown en la carpeta: {path}',
    batchIngestSkipNotice: 'Omitiendo {skipped}/{total} archivos ya ingeridos. Ingestando {new} archivos nuevos...',
    batchIngestAllIngested: 'Los {total} archivos de esta carpeta ya han sido ingeridos.',
    batchIngestStarting: 'Ingestando {count} archivo(s) de "{folder}" — esto puede tardar varios minutos. Aparecerá un informe al finalizar.',
    batchIngestComplete: 'Ingestión por lotes completada: {success}/{total} correctas, {fail} fallidas',
    batchIngestFailedFiles: 'Archivos fallidos:',
    historyTruncated: 'Historial reducido a las últimas {max} rondas',
    historyCleared: 'Historial limpiado',

    // User Feedback Loop
    reviewedPagePreserved: 'Conservando contenido revisado por el usuario para: {}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: '¿Guardar en la Wiki?',
    querySuggestSaveDesc: 'Esta conversación contiene conocimiento valioso. ¿Guardarlo en tu Wiki?',
    querySuggestSaveYes: 'Guardar',
    querySuggestSaveNo: 'Descartar',

    // Ingestion Report
    ingestReportElapsedTime: 'Tiempo transcurrido',
    ingestReportSkippedFiles: 'Omitidos (ya ingeridos)',
    ingestReportFailedGuidance: 'Estos elementos no pudieron crearse automáticamente. Puedes crear manualmente las páginas correspondientes, o reducir la granularidad de extracción y volver a ingerir el archivo fuente.',

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: 'Ingestar fuente individual',
    cmdIngestFolder: 'Ingestar desde carpeta',
    cmdQueryWiki: 'Consultar wiki',
    cmdLintWiki: 'Verificar wiki',
    cmdRegenerateIndex: 'Regenerar índice',
    cmdSuggestSchema: 'Sugerir actualizaciones del esquema',

    // Lint Report
    lintReportTitle: 'Informe de verificación lint de la Wiki',
    lintReportSummary: 'Resumen del estado de la Wiki: {total} páginas en total, {aliasesMissing} páginas sin alias, {duplicates} páginas duplicadas, {deadLinks} enlaces rotos ({deadLinkFromDup} implican duplicados), {orphans} páginas huérfanas ({orphanFromDup} son duplicados), {emptyPages} páginas vacías',
    lintDeadLinkSection: 'Enlaces rotos (detectados)',
    lintEmptyPageSection: 'Páginas vacías (detectadas)',
    lintOrphanSection: 'Páginas huérfanas (detectadas)',
    lintContradictionSection: 'Contradicciones (detectadas)',
    lintDuplicateSection: 'Páginas duplicadas (detectadas)',
    lintNoIssuesFound: 'No se detectaron duplicados, enlaces rotos, páginas vacías ni páginas huérfanas.',
    lintDeadLinkItem: '- [[{source}]] → **{target}** (la página no existe){dupFlag}',
    lintDeadLinkMore: '- ... {count} enlaces rotos más',
    lintEmptyPageItem: '- [[{page}]] — menos de 50 caracteres de contenido sustantivo',
    lintOrphanItem: '- [[{page}]] — ninguna otra página Wiki enlaza aquí{dupFlag}',
    lintDuplicateItem: '- [[{target}]] y [[{source}]] — {reason}',
    lintDeadLinkAffectedByDup: ' (⚠️ implica página duplicada)',
    lintOrphanIsDuplicate: ' (⚠️ página duplicada)',
    lintContradictionOpen: 'Contradicciones abiertas: {count}',
    lintContradictionAutoFixed: '({count} autocorregidas en esta ejecución)',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: 'Detectada',
    lintContradictionStatusPendingFix: 'Pendiente de corrección',
    lintLLMAnalysisHeading: '## Análisis LLM',

    // Lint Analysis Prompt
    lintAnalysisPrompt: 'Eres un asistente de mantenimiento de Wiki. Comprueba el estado de la Wiki basándote en la siguiente información.\n\nÍndice Wiki:\n{index}\n\nMuestra de contenido de páginas Wiki ({total} páginas en total, mostrando {sample} páginas):\n{contentSample}\n\nResultados de la comprobación programática (ya verificados, no repetir):\n{progReport}\n\nComprueba los siguientes aspectos (omite enlaces rotos/páginas vacías/huérfanas ya detectados por las comprobaciones programáticas):\n1. **Contradicciones** — si diferentes páginas se contradicen entre sí sobre los mismos hechos\n2. **Obsolescencia** — si alguna afirmación está claramente desactualizada\n3. **Faltantes** — qué conceptos importantes carecen de páginas independientes\n4. **Estructura** — si la estructura de las páginas es razonable y si los enlaces cruzados son adecuados\n\nFormato de salida: usa Markdown, comenzando con "## Análisis LLM". Cada hallazgo en una línea "- [problema específico]". Si no hay problemas, escribe "No se encontraron problemas evidentes."',

    // Lint Fix Progress
    lintFixProgress: 'Corrigiendo {current}/{total}: [[{target}]]',
    lintFixDeadComplete: 'Corrección de enlaces rotos completada. Corregidos {fixed}/{total} elementos.',
    lintFillProgress: 'Expandiendo {current}/{total}: {page}',
    lintFillComplete: 'Expansión de páginas completada. Rellenadas {filled}/{total} páginas.',
    lintFillFailed: 'Falló la expansión: {page} — {error}',
    lintLinkProgress: 'Enlazando {current}/{total}: {page}',
    lintLinkComplete: 'Enlace de huérfanas completado. Enlazadas {linked} páginas.',
    lintFixNoAction: 'No se tomó ninguna acción (sin cliente)',
    lintFixIndexUpdated: 'Índice y registro de la Wiki actualizados.',
    lintFixAllComplete: 'Todas las correcciones completadas. Consulta el registro para más detalles.',

    // Lint Report Modal
    lintModalActionsTitle: 'Sugerencias de corrección (requiere tokens LLM):',
    lintModalFixDeadLinks: 'Corregir enlaces rotos ({count})',
    lintModalExpandEmpty: 'Expandir páginas vacías ({count})',
    lintModalLinkOrphans: 'Enlazar páginas huérfanas ({count})',
    lintModalAnalyzeSchema: 'Analizar esquema',
    lintModalMergeDuplicates: 'Fusionar duplicados ({count})',
    lintModalFixAll: 'Corrección inteligente global ({count} problemas)',
    lintMergeProgress: 'Fusionando {current}/{total}: {source} → {target}',
    lintMergeComplete: 'Fusión de duplicados completada. Fusionados {merged}/{total} pares.',

    // Ingest Report Modal
    ingestReportTitle: 'Informe de ingestión',
    ingestReportSourceFile: 'Archivo fuente',
    ingestReportCreated: 'Creadas',
    ingestReportUpdated: 'Actualizadas',
    ingestReportContradictions: 'Contradicciones encontradas',
    ingestReportFailedTitle: 'Ingestión fallida',
    ingestReportErrorDetail: 'Detalle del error',
    ingestReportClose: 'Cerrar',
    ingestReportCreatedPages: 'Páginas creadas: {count}',
    ingestReportUpdatedPages: 'Páginas actualizadas: {count}',
    ingestReportEntitiesCount: '{count} entidades',
    ingestReportConceptsCount: '{count} conceptos',
    ingestReportContradictionsFound: 'Contradicciones encontradas: {count}',
    ingestReportEntityType: 'Entidad',
    ingestReportConceptType: 'Concepto',
    timeMinutes: 'min',
    timeSeconds: 'seg',
} as const;
