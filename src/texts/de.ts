export const DE_TEXTS = {
    // Plugin Info
    pluginTitle: 'Karpathy LLM-Wiki-Einstellungen',
    pluginIntro: 'Dieses Plugin setzt das {{link}}-Konzept für Obsidian um. Es liest deine Notizen, nutzt KI, um Entitäten, Konzepte und Zusammenhänge zu extrahieren, und erstellt ein strukturiertes, vernetztes Wiki in deinem Vault.',
    karpathyLinkText: 'Andrej Karpathys LLM-Wiki',

    // Features Section
    featuresTitle: 'Funktionsweise',
    workflow1Title: '1. Aufnehmen',
    workflow1Desc: 'Wähle eine Notiz — KI extrahiert Entitäten, Konzepte und Zusammenhänge in Wiki-Seiten.',
    workflow2Title: '2. Anfragen',
    workflow2Desc: 'Chatte mit deinem Wiki — Antworten basieren auf deinem aufgenommenen Wissen.',
    workflow3Title: '3. Pflegen',
    workflow3Desc: 'Automatisch generierte Indizes, Querverweise und Lint-Prüfungen halten das Wiki gesund.',

    // Language Switcher
    languageTitle: 'Oberflächensprache',
    languageDesc: 'Wähle deine bevorzugte Sprache für das Einstellungsfenster. Starte das Plugin neu, um die Sprachänderungen auf die Befehlspalette anzuwenden.',
    languageEn: 'Englisch',
    languageZh: 'Chinesisch (中文)',
    languageJa: 'Japanese (日本語)',
    languageKo: 'Korean (한국어)',
    languageDe: 'Deutsch',
    languageFr: 'French (Français)',
    languageEs: 'Spanish (Español)',
    languagePt: 'Portuguese (Português)',

    // Status
    statusTitle: 'LLM-Client-Status',
    llmWikiStatusSection: 'LLM-Wiki-Status',
    statusInitialized: 'Initialisiert',
    statusReady: 'LLM bereit',
    statusNotReady: 'LLM nicht konfiguriert — Einrichtung oben abschließen und Verbindungstest bestehen',
    statusNotInitialized: 'Nicht initialisiert',
    currentProvider: 'Aktueller Anbieter',

    // Provider Configuration
    providerSection: 'LLM-Konfiguration',
    providerName: 'LLM-Anbieter',
    providerDesc: 'Vordefinierten Anbieter oder benutzerdefinierten OpenAI-kompatiblen Dienst wählen. Für Coding Plan oder ähnliche Bundles: Custom OpenAI/Anthropic wählen, Base URL und API Key des Providers manuell eingeben',

    // API Key
    apiKeyName: 'API-Schlüssel',
    apiKeyDesc: 'API-Schlüssel vom Anbieter eingeben',
    apiKeyPlaceholder: 'API-Schlüssel eingeben',

    // Base URL
    baseUrlName: 'API-Basis-URL',
    baseUrlDescCustom: 'Erforderlich: Benutzerdefinierte OpenAI-kompatible Endpunkt',
    baseUrlDescOverride: 'Optional: Voreingestellte Basis-URL überschreiben',

    // Ollama Hint
    ollamaHint: 'Ollama läuft lokal, kein API-Schlüssel erforderlich',
    lmstudioHint: 'LM Studio läuft lokal, API-Key ist optional',
    maxTokensPerCallName: 'Kontextfenster',
    maxTokensPerCallDesc: 'Tokens an das Kontextfenster des Modells anpassen. 0 = kein Limit (Cloud).',

    // Model Selection
    modelSection: 'Modellauswahl',
    fetchModelsName: 'Verfügbare Modelle abrufen',
    fetchModelsDesc: 'Aktuelle Modellliste von der Anbieter-API abrufen',
    fetchModelsButton: 'Modelle abrufen',
    fetchingModels: 'Wird abgerufen...',
    fetchSuccess: 'Erfolg! {} Modelle verfügbar',
    fetchFailed: 'Abruf fehlgeschlagen oder leere Liste, bitte Modellnamen manuell eingeben',
    fetchNotSupported: 'Anbieter unterstützt keine Modelllistenabfrage',
    fetchErrorAuth: 'Authentifizierung fehlgeschlagen (HTTP 401/403). Überprüfen Sie den API-Schlüssel, oder geben Sie eine Modell-ID ein und klicken Sie auf Verbindung testen.',
    fetchErrorEndpoint: 'Endpunkt nicht gefunden (HTTP 404). Überprüfen Sie die Endpunkt-URL, oder geben Sie eine Modell-ID ein und klicken Sie auf Verbindung testen.',
    fetchErrorServer: 'Anbieter-Serverfehler (HTTP 5xx). Versuchen Sie es später erneut, oder geben Sie eine Modell-ID ein und klicken Sie auf Verbindung testen.',
    fetchErrorEmpty: 'Dieser Endpunkt stellt keine Modellliste bereit. Geben Sie eine Modell-ID ein und klicken Sie auf Verbindung testen.',
    fetchErrorNetwork: 'Netzwerkanfrage fehlgeschlagen. Überprüfen Sie Internetverbindung, Endpunkt-URL oder Proxy-Einstellungen. Sie können auch eine Modell-ID eingeben und auf Verbindung testen klicken.',

    selectModelName: 'Modell auswählen',
    selectModelDesc: 'Aus {} verfügbaren Modellen wählen',
    customInputOption: 'Benutzerdefinierte Eingabe...',
    customInputHint: 'Um andere Modelle zu verwenden, wähle "Benutzerdefinierte Eingabe..."',

    modelName: 'Modellname',
    modelDescCustom: 'Benutzerdefiniertes Modell wird verwendet (Schaltfläche oben klicken, um Liste erneut abzurufen)',
    modelDescFetchFailed: 'Abruf der Modellliste fehlgeschlagen. Überprüfen Sie API-Schlüssel und Endpunkt-URL, oder geben Sie eine Modell-ID ein und klicken Sie auf Verbindung testen.',
    modelInputPlaceholder: 'Modell-ID eingeben, dann Verbindung testen',

    switchToDropdown: 'Zur Dropdown-Auswahl wechseln',
    useDropdownButton: 'Dropdown verwenden',

    // Test & Save
    testConnectionName: 'Verbindung testen',
    testConnectionDesc: 'Konfiguration überprüfen und LLM-API-Aufruf validieren',
    testButton: 'Verbindung testen',
    testing: 'Wird getestet...',

    saveSettingsName: 'Einstellungen speichern',
    saveSettingsDesc: 'Aktuelle Konfiguration speichern',
    saveButton: 'Einstellungen speichern',
    testConnectionSuccessful: 'Verbindung erfolgreich',
    testConnectionFailed: 'Verbindung fehlgeschlagen',
    testConnectionProvider: 'Anbieter: ',
    errorUnknown: 'Unbekannter Fehler',
    savedNotice: 'Einstellungen gespeichert!',

    // Wiki Folder
    wikiSection: 'Wiki-Konfiguration',
    wikiFolderName: 'Wiki-Ordner',
    wikiFolderDesc: 'Speicherort für generierte Wiki-Seiten',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'Bitte zunächst API-Schlüssel konfigurieren',
    llmNotReady: 'LLM ist nicht konfiguriert. Gehen Sie zu Einstellungen → Karpathy LLM Wiki, um Ihren Anbieter zu konfigurieren und den Verbindungstest zu bestehen.',
    errorFetchFailed: 'Fehlgeschlagen: {}',

    // Query Settings
    querySectionTitle: 'Wiki-Anfrage-Konfiguration',
    maxConversationHistoryName: 'Maximaler Konversationsverlauf',
    maxConversationHistoryDesc: 'Konversationsnachrichten begrenzen, um Token-Überlauf zu vermeiden',
    maxConversationHistoryHint: 'Empfehlung: 50 Runden nicht überschreiten',
    numberRangeValidation: 'Bitte eine Zahl zwischen 1 und 50 eingeben',
    numberRangeClamped: 'Wert außerhalb des Bereichs (1-300), automatisch auf {} gesetzt',
    // Query Modal UI
    queryModalTitle: 'Wiki-Anfrage — Konversationelle Abfrage',
    queryModalPlaceholder: 'Frage eingeben...',
    queryModalSendButton: 'Senden',
    queryModalStopButton: 'Stopp',
    queryModalSaveButton: 'Im Wiki speichern',
    queryModalClearButton: 'Verlauf löschen',
    queryModalHistoryCount: 'Konversationsverlauf: {}/{} Runden',
    queryModalStreaming: 'Streaming...',
    queryModalFallbackStreaming: 'Streaming nicht unterstützt, Wechsel zu Nicht-Streaming. Bitte warten...',
    queryPhaseSearching: 'Wiki-Index wird analysiert, relevante Seiten werden ausgewählt...',
    queryPhaseFoundPages: '{count} Seite(n) gefunden: {pages}',
    queryPhaseLoadingPages: 'Seiteninhalt wird geladen...',
    queryPhaseContextReady: 'Kontext bereit. Antwort wird generiert...',
    queryPhaseGenerating: 'Generierung... (verstrichen {time}s)',
    queryPhaseNonStreaming: 'Nicht-Streaming-Modus, Antwort wird generiert... (verstrichen {time}s)',
    queryModalErrorPrefix: 'Fehler: ',
    queryModalHint: 'Anfragen basieren auf Wiki-Inhalten. Klicke auf "Im Wiki speichern", um wertvolle Konversationen als Wiki-Seiten zu extrahieren.',

    // Error Messages
    errorLLMClientNotInit: 'LLM-Client nicht initialisiert. Bitte Einstellungen speichern.',
    errorIngestFailed: 'Aufnahme fehlgeschlagen: ',
    errorQueryFailed: 'Anfrage fehlgeschlagen: ',

    // Success Messages
    ingestSuccess: 'Aufnahme erfolgreich: {} Seiten erstellt, {} Seiten aktualisiert',
    querySuccess: 'Anfrage abgeschlossen',
    lintSuccess: 'Wiki-Lint abgeschlossen',
    lintReadingPages: '{count} Wiki-Seiten werden gelesen...',
    lintReadingPagesProgress: 'Wiki-Seiten werden gelesen: {current}/{total}...',
    lintScanningLinks: 'Defekte Links werden geprüft...',
    lintScanningLinksProgress: 'Defekte Links werden geprüft: {current}/{total}...',
    lintCheckingDuplicates: 'Auf doppelte Seiten wird geprüft...',
    lintCheckingDuplicatesProgress: 'Duplikate werden überprüft: Stapel {current}/{total}...',
    lintFixingPolluted: 'Bereinigte Seite wird repariert {current}/{total}: {title} → {newTitle}',
    lintModalFixPolluted: '🧹 Bereinigte Seiten reparieren ({count})',
    lintDuplicateCheckFailed: 'Duplikaterkennung fehlgeschlagen — Details in der Konsole',
    lintDuplicateCheckFailedDetail: 'Duplikatprüfung fehlgeschlagen bei {step}: {error}',
    lintMergeItemFailed: 'Zusammenführung fehlgeschlagen: {source} → {target} — {error}',
    lintAliasesMissing: 'Fehlende Aliase: {count} Seite(n) ohne Aliase',
    lintAliasesSection: 'Seiten ohne Aliase (erkannt)',
    lintAliasesItem: '- [[{page}]]',
    lintAliasesCompleteBtn: 'Aliase vervollständigen ({count})',
    lintAliasesFilling: 'Aliase werden generiert {current}/{total}: {page}',
    lintAliasesFilled: 'Alias-Vervollständigung abgeschlossen. {filled}/{total} Seiten ergänzt.',
    lintAliasesFillFailed: 'Alias-Generierung fehlgeschlagen: {page} — {error}',
    lintFixItemFailed: 'Behebung fehlgeschlagen: [[{target}]] — {error}',
    lintLinkItemFailed: 'Verlinkung fehlgeschlagen: {page} — {error}',
    lintRetrying: 'Wiederholung ({attempt}/{max}) nach Fehler...',
    lintAnalyzingLLM: 'LLM analysiert Wiki-Gesundheit...',
    saveToWikiSuccess: 'Konversation im Wiki gespeichert!',
    saveSummary: '{entities} Entitäten, {concepts} Konzepte, {pages} Seiten',
    aliasAdded: 'Alias \'{alias}\' zur Seite \'{page}\' hinzugefügt',

    // Status Messages
    ingestingSources: 'Quellen werden aufgenommen...',
    queryingWiki: 'Wiki wird angefragt...',
    lintingWiki: 'Wiki wird geprüft...',
    savingToWiki: 'Konversation wird im Wiki gespeichert...',
    clearingHistory: 'Konversationsverlauf wird gelöscht...',

    // Buttons
    ingestButton: 'Aufnehmen',
    queryButton: 'Anfragen',
    lintButton: 'Prüfen',
    cancelButton: 'Abbrechen',

    // Links
    karpathyGistLink: 'Karpathys LLM-Wiki Gist',
    obsidianPluginAPI: 'Obsidian-Plugin-API',
    anthropicSDK: 'Anthropic SDK',
    openaiSDK: 'OpenAI SDK',

    // Other
    availableModelsLoading: 'Verfügbare Modelle werden geladen...',
    noModelsAvailable: 'Keine Modelle verfügbar',

    // LLM Language Hint
    llmLanguageHint: 'Bitte antworten Sie auf Deutsch.',

    // Schema Configuration
    schemaSection: 'Schema-Konfiguration',
    enableSchemaName: 'Schema aktivieren',
    enableSchemaDesc: 'Schema/config.md generieren und in alle LLM-Prompts einfügen, um strukturierte Wiki-Ausgabe zu ermöglichen',
    viewSchemaButton: 'Schema ansehen / bearbeiten',
    regenerateSchemaButton: 'Standard-Schema neu generieren',
    schemaRegeneratedNotice: 'Standard-Schema neu generiert.',
    schemaRegenerateFailed: 'Schema-Generierung fehlgeschlagen',

    // Wiki-Initialisierungsstatus
    wikiInitStatusReady: 'Wiki initialisiert',
    wikiInitStatusNotReady: 'Wiki nicht initialisiert — wird beim ersten Ingest automatisch erstellt',

    // Wiki Output Language
    wikiLanguageName: 'Wiki-Ausgabesprache',
    wikiLanguageDesc: 'Alle generierten Wiki-Seiten, Indizes, Protokolle und Anfrageantworten verwenden diese Sprache',
    customWikiLanguageOption: 'Benutzerdefiniert...',
    customWikiLanguageHint: 'Sprachnamen eingeben (z. B. Italienisch, Arabisch). Wird als Ausgabesprachen-Anweisung an das LLM übergeben.',
    customWikiLanguagePlaceholder: 'z. B. Italienisch',

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
    extractionSectionTitle: 'Extraktion',
    extractionGranularityName: 'Extraktions-Granularität',
    extractionGranularityDesc: 'Steuert Extraktionen pro Quelldatei. Höher = mehr Seiten/API-Verbrauch.\nFein: Tiefenanalyse. Standard: Tägliche Notizen. Grob: Schnelle Übersicht. Minimal: 100+ Dateien stapeln. Benutzerdefiniert: Eigene Limits (max 300).\nTipp: Verwenden Sie Minimal/Grob für Ordner mit vielen Dateien zur Zeit- und Kosteneinsparung.',
    extractionGranularityFine: 'Fein — Tiefenanalyse (≤100 Elemente)',
    extractionGranularityStandard: 'Standard — Tägliche Notizen (≤50 Elemente)',
    extractionGranularityCoarse: 'Grob — Schnellübersicht (≤10 Elemente)',
    extractionGranularityMinimal: 'Minimal — Stapelverarbeitung 100+ Dateien (≤5 Elemente)',
    extractionGranularityCustom: 'Benutzerdefiniert — Eigene Limits festlegen (1~300)',
    customEntityLimitName: 'Benutzerdefiniertes Entitätslimit',
    customEntityLimitDesc: 'Maximale Anzahl zu extrahierender Entitäten pro Quelldatei (1-300)',
    customConceptLimitName: 'Benutzerdefiniertes Konzeptlimit',
    customConceptLimitDesc: 'Maximale Anzahl zu extrahierender Konzepte pro Quelldatei (1-300)',

    // Ingestion Acceleration
    accelerationSectionTitle: 'Aufnahmen-Beschleunigung',
    pageGenerationConcurrencyName: 'LLM-Parallelität',
    pageGenerationConcurrencyDesc: 'Anzahl paralleler LLM-Aufrufe während Aufnahme und Lint-Operationen. Höhere Werte beschleunigen die Verarbeitung, erhöhen aber API-Kosten und können Ratenbegrenzungen auslösen.',
    concurrencyValueSingular: 'Aktuelle Parallelität: {} (seriell — am sichersten)',
    concurrencyValuePlural: 'Aktuelle Parallelität: {} (parallel)',
    batchDelayName: 'Batch-Verzögerung (ms)',
    batchDelayDesc: 'Verzögerung zwischen parallelen Stapeln zur Vermeidung von API-Ratenbegrenzungen (100–2000 ms). Aktuell: {}ms. Erhöhen bei 429-Fehlern.',

    // Auto Maintenance
    autoMaintainSection: 'Automatische Wartung',
    autoMaintainBetaBadge: 'BETA — Experimentelle Funktion. Kann Probleme aufweisen. Nur für erfahrene Benutzer empfohlen.',
    autoWatchName: 'Ordner beobachten',
    autoWatchDesc: 'Neue oder geänderte .md-Dateien in den beobachteten Ordnern automatisch erkennen und benachrichtigen oder automatisch aufnehmen',
    watchedFoldersName: 'Beobachtete Ordner',
    watchedFoldersDesc: 'Ordner, die auf neue Inhalte überwacht werden. Klicke auf "Ordner hinzufügen", um aus deinem Vault auszuwählen.',
    addWatchedFolderButton: 'Ordner hinzufügen',
    removeWatchedFolderButton: 'Entfernen',
    webClipperPresetName: 'Clippings beobachten (Web Clipper)',
    webClipperPresetDesc: 'Den Clippings/-Ordner von Obsidian Web Clipper zur Beobachtungsliste hinzufügen. Webclips werden automatisch ins Wiki aufgenommen.',
    noWatchedFoldersHint: 'Keine Ordner konfiguriert. Füge einen Ordner hinzu oder aktiviere die Clippings-Voreinstellung.',
    autoWatchModeName: 'Beobachtungsmodus',
    autoWatchModeDesc: '"Nur benachrichtigen" zeigt eine Eingabeaufforderung. "Automatisch aufnehmen" verarbeitet still.',
    watchModeNotify: 'Nur benachrichtigen',
    watchModeAuto: 'Automatisch aufnehmen',
    autoWatchDebounceName: 'Entprell-Verzögerung (Sekunden)',
    autoWatchDebounceDesc: 'Wartezeit vor der Aufnahmeauslösung nach einer Dateiänderung (1–60 Sekunden)',
    periodicLintName: 'Periodische Prüfung',
    periodicLintDesc: 'LLM-Prüfung zeitgesteuert ausführen, nur wenn sich Quelldateien seit der letzten Prüfung geändert haben',
    periodicLintOff: 'Aus',
    periodicLintHourly: 'Stündlich',
    periodicLintDaily: 'Täglich',
    periodicLintWeekly: 'Wöchentlich',
    startupCheckName: 'Schnellkorrekturen beim Start ausführen',
    startupCheckDesc: 'Beim Laden des Plugins低级 Formatprobleme (sources-Feld, doppelt verschachtelte Wikilinks) automatisch korrigieren und Wiki-Ordnerstruktur überprüfen. Standardmäßig aktiviert.',
    suggestSchemaCommand: 'Schema-Aktualisierungen vorschlagen',
    autoMaintainCostWarning: '⚠️ Kostenhinweis: Funktionen zur automatischen Wartung verbrauchen API-Tokens. "Automatisch aufnehmen" löst bei jeder Quelldatei-Änderung LLM-Aufrufe aus. "Periodische Prüfung" führt zeitgesteuerte LLM-Gesundheitsprüfungen durch (nur bei erkannten Quelländerungen). Sorgfältig konfigurieren, um unerwartete Kosten zu vermeiden.',

    // Notices
    startupCheckSummary: 'Wiki enthält {pages} Seiten ({entities} Entitäten, {concepts} Konzepte, {sources} Quellen)',
    watcherActiveNotice: 'Wiki: Datei-Beobachtung aktiv — beobachtete Ordner werden überwacht',
    watchIngestNotice: 'Wiki: {count} Datei(en) in sources/ geändert. "Quellen aufnehmen" ausführen, um zu verarbeiten.',
    autoIngestRunning: 'Automatische Aufnahme von {count} geänderter(n) Datei(en)...',
    autoIngestComplete: 'Automatische Aufnahme abgeschlossen: {success} erfolgreich, {fail} fehlgeschlagen',
    scheduledLintRunning: 'Geplante Wiki-Prüfung wird ausgeführt...',
    wikiLintStats: 'Wiki-Prüfung: {pages} Seiten ({entities} Entitäten, {concepts} Konzepte, {sources} Quellen)',
    wikiHealthStats: 'Wiki-Gesundheit: {pages} Seiten ({entities} Entitäten, {concepts} Konzepte, {sources} Quellen){indexStatus}',

    // Startup quick fixes detail (Issue #81)
    startupCheckTitle: '✅ Wiki-Schnellkorrekturen abgeschlossen',
    startupCheckStructureLabel: '📁 Wiki-Struktur',
    startupCheckStructureOk: '✓ vollständig',
    startupCheckStructureMissing: '⚠️ unvollständig — wird beim ersten Ingest automatisch erstellt',
    startupCheckSourcesLabel: '🔧 Sources normalisiert',
    startupCheckSourcesClean: '✓ bereits sauber',
    startupCheckSourcesCleaned: '⚠️ {files} Datei(en), {entries} Eintrag/Einträge bereinigt',
    startupCheckDisableHint: '💡 Zum Deaktivieren: Einstellungen → Auto-Wartung → Schnellkorrekturen beim Start ausführen',
    lintWikiStart: 'Wiki-Prüfung wird gestartet...',
    lintWikiComplete: 'Wiki-Prüfung abgeschlossen',
    lintWikiFailed: 'Wiki-Prüfung fehlgeschlagen',
    analyzingSchema: 'Wiki wird analysiert und Schema-Vorschläge werden generiert...',
    schemaSuggestionGenerated: 'Schema-Vorschläge generiert, siehe wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: 'Keine Schema-Aktualisierungen erforderlich.',
    schemaSuggestionFailed: 'Schema-Vorschlag fehlgeschlagen',
    schemaNotFoundNotice: 'Schema-Datei nicht gefunden. Schema aktivieren, um sie zu erstellen.',
    selectFolderNoMdFiles: 'Keine Markdown-Dateien im Ordner: {path}',
    batchIngestSkipNotice: '{skipped}/{total} bereits aufgenommene Dateien werden übersprungen. {new} neue Datei(en) werden aufgenommen...',
    batchIngestAllIngested: 'Alle {total} Dateien in diesem Ordner wurden bereits aufgenommen.',
    batchIngestStarting: '{count} Datei(en) aus "{folder}" werden aufgenommen — dies kann mehrere Minuten dauern. Ein Bericht erscheint bei Abschluss.',
    batchIngestComplete: 'Batch-Aufnahme abgeschlossen: {success}/{total} erfolgreich, {fail} fehlgeschlagen',
    batchIngestFailedFiles: 'Fehlgeschlagene Dateien:',
    historyTruncated: 'Verlauf auf letzte {max} Runden gekürzt',
    historyCleared: 'Verlauf gelöscht',

    // User Feedback Loop
    reviewedPagePreserved: 'Benutzergeprüfte Inhalte werden beibehalten für: {}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: 'Im Wiki speichern?',
    querySuggestSaveDesc: 'Diese Konversation enthält wertvolles Wissen. Im Wiki speichern?',
    querySuggestSaveYes: 'Speichern',
    querySuggestSaveNo: 'Verwerfen',

    // Ingestion Report
    ingestReportElapsedTime: 'Verstrichene Zeit',
    ingestReportSkippedFiles: 'Übersprungen (bereits aufgenommen)',
    ingestReportFailedGuidance: 'Diese Elemente konnten nicht automatisch erstellt werden. Du kannst die entsprechenden Seiten manuell erstellen oder die Extraktions-Granularität senken und die Quelldatei erneut aufnehmen.',
    ingestReportCollisions: 'Cross-Type-Kollisionen (als Aliase zusammengeführt)',

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: 'Einzelne Quelle aufnehmen',
    cmdIngestFolder: 'Aus Ordner aufnehmen',
    cmdQueryWiki: 'Wiki anfragen',
    cmdLintWiki: 'Wiki prüfen',
    cmdRegenerateIndex: 'Index neu generieren',
    cmdSuggestSchema: 'Schema-Aktualisierungen vorschlagen',
    cmdCancelIngestion: 'Aktuelle Aufnahme abbrechen',
    cmdIngestActiveFile: 'Aktuelle Datei aufnehmen',
    noActiveFile: 'Keine Datei geöffnet',
    mdOnlyFile: 'Nur Markdown-Dateien können aufgenommen werden',

    // Ingestion status bar
    ingestionStatusBar: 'Aufnahme läuft... zum Abbrechen klicken',
    lintStatusBar: 'Prüfung läuft... zum Abbrechen klicken',
    ingestionCancelling: 'Wird abgebrochen — Stopp nach aktuellem Batch',
    ingestionCancelled: 'Aufnahme abgebrochen',
    crossTypeCollisionNotice: '{count} Einträge als Cross-Type-Alias zusammengeführt (Entity ↔ Concept Duplikate verhindert)',

    // Lint Report
    lintReportTitle: 'Wiki-Prüfbericht',
    lintReportSummary: 'Wiki-Statusübersicht: {total} Seiten gesamt, {aliasesMissing} Seiten mit fehlenden Aliasen, {duplicates} doppelte Seiten, {deadLinks} defekte Links ({deadLinkFromDup} betreffen Duplikate), {orphans} verwaiste Seiten ({orphanFromDup} sind Duplikate), {emptyPages} leere Seiten',
    lintDeadLinkSection: 'Defekte Links (erkannt)',
    lintEmptyPageSection: 'Leere Seiten (erkannt)',
    lintOrphanSection: 'Verwaiste Seiten (erkannt)',
    lintContradictionSection: 'Widersprüche (erkannt)',
    lintDuplicateSection: 'Doppelte Seiten (erkannt)',
    lintNoIssuesFound: 'Keine Duplikate, defekten Links, leeren Seiten oder verwaisten Seiten erkannt.',
    lintDeadLinkItem: '- [[{source}]] → **{target}** (Seite existiert nicht){dupFlag}',
    lintDeadLinkMore: '- ... {count} weitere defekte Links',
    lintEmptyPageItem: '- [[{page}]] — weniger als 50 Zeichen substanziellen Inhalts',
    lintOrphanItem: '- [[{page}]] — keine anderen Wiki-Seiten verweisen hierher{dupFlag}',
    lintPollutedSection: 'Pfadverschmutzte Seiten (erkannt)',
    lintPollutedItem: '- [[{page}]] → sollte "{clean}" sein',
    lintSourcesNormalizedSection: 'Sources normalisiert (automatisch korrigiert)',
    lintSourcesNormalizedItem: '{entries} verschmutzte sources-Einträge in {files} Datei(en) bereinigt (externe Pfade, .md-Erweiterungen, Alias-Pipes entfernt und dedupliziert).',
    lintDuplicateItem: '- [[{target}]] und [[{source}]] — {reason}',
    lintDeadLinkAffectedByDup: ' (⚠️ betrifft doppelte Seite)',
    lintOrphanIsDuplicate: ' (⚠️ doppelte Seite)',
    lintContradictionOpen: 'Offene Widersprüche: {count}',
    lintContradictionAutoFixed: '({count} in diesem Durchlauf automatisch behoben)',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: 'Erkannt',
    lintContradictionStatusPendingFix: 'Behebung ausstehend',
    lintLLMAnalysisHeading: '## LLM-Analyse',

    // Lint Analysis Prompt
    lintAnalysisPrompt: 'Du bist ein Wiki-Wartungsassistent. Überprüfe die Wiki-Gesundheit anhand der folgenden Informationen.\n\nWiki-Index:\n{index}\n\nWiki-Seiteninhalt-Stichprobe ({total} Seiten gesamt, {sample} Seiten angezeigt):\n{contentSample}\n\nErgebnisse der programmatischen Prüfung (bereits verifiziert, nicht wiederholen):\n{progReport}\n\nPrüfe die folgenden Aspekte (defekte Links/leere/verwaiste Seiten, die bereits durch programmatische Prüfungen erkannt wurden, überspringen):\n1. **Widersprüche** — ob verschiedene Seiten sich bei denselben Fakten widersprechen\n2. **Veraltung** — ob Behauptungen offensichtlich veraltet sind\n3. **Fehlend** — welche wichtigen Konzepte keine eigenständigen Seiten haben\n4. **Struktur** — ob die Seitenstruktur angemessen und Querverweise ausreichend sind\n\nAusgabeformat: Verwende Markdown, beginnend mit "## LLM-Analyse". Jede Feststellung in einer Zeile "- [konkretes Problem]". Wenn keine Probleme: "Keine offensichtlichen Probleme gefunden."',

    // Lint Fix Progress
    lintFixProgress: 'Behebung {current}/{total}: [[{target}]]',
    lintFixDeadComplete: 'Behebung defekter Links abgeschlossen. {fixed}/{total} Elemente behoben.',
    lintFillProgress: 'Erweiterung {current}/{total}: {page}',
    lintFillComplete: 'Seitenerweiterung abgeschlossen. {filled}/{total} Seiten gefüllt.',
    lintDeleteCompleted: '{count} leere Stubs gelöscht',
    lintDeleteFailed: 'Fehler beim Löschen von {failed}/{total} leeren Stubs (Details in der Konsole)',
    lintFillFailed: 'Erweiterung fehlgeschlagen: {page} — {error}',
    lintLinkProgress: 'Verlinkung {current}/{total}: {page}',
    lintLinkComplete: 'Verwaiste-Seiten-Verlinkung abgeschlossen. {linked} Seiten verlinkt.',
    lintFixNoAction: 'Keine Maßnahme ergriffen (kein Client)',
    lintFixIndexUpdated: 'Wiki-Index und Protokoll aktualisiert.',
    lintPollutedFixed: 'Beschädigte Seiten behoben: {fixed}/{total}. Index neu generiert.',
    regenerateIndexCompleted: 'Index neu generiert',
    operationFailed: 'Fehlgeschlagen: ', 
    lintFixAllComplete: 'Alle Behebungen abgeschlossen. Details im Protokoll.',

    // Lint Report Modal
    lintModalActionsTitle: 'Behebungsvorschläge (benötigt LLM-Tokens):',
    lintModalFixDeadLinks: 'Defekte Links beheben ({count})',
    lintModalExpandEmpty: 'Leere Seiten erweitern ({count})',
    lintModalDeleteEmpty: 'Leere Stubs löschen ({count})',   
    lintModalLinkOrphans: 'Verwaiste Seiten verlinken ({count})',
    lintModalAnalyzeSchema: 'Schema analysieren',
    lintModalMergeDuplicates: 'Duplikate zusammenführen ({count})',
    lintModalFixAll: 'Intelligente Gesamtbehebung ({count} Probleme)',
    lintMergeProgress: 'Zusammenführung {current}/{total}: {source} → {target}',
    lintMergeComplete: 'Duplikat-Zusammenführung abgeschlossen. {merged}/{total} Paare zusammengeführt.',

    // Ingest Report Modal
    ingestReportTitle: 'Aufnahmebericht',
    ingestReportSourceFile: 'Quelldatei',
    ingestReportCreated: 'Erstellt',
    ingestReportUpdated: 'Aktualisiert',
    ingestReportContradictions: 'Widersprüche gefunden',
    ingestReportFailedTitle: 'Aufnahme fehlgeschlagen',
    ingestReportErrorDetail: 'Fehlerdetail',
    ingestReportClose: 'Schließen',
    ingestReportCreatedPages: 'Erstellte Seiten: {count}',
    ingestReportUpdatedPages: 'Aktualisierte Seiten: {count}',
    ingestReportEntitiesCount: '{count} Entitäten',
    ingestReportConceptsCount: '{count} Konzepte',
    ingestReportContradictionsFound: 'Gefundene Widersprüche: {count}',
    ingestReportEntityType: 'Entität',
    ingestReportConceptType: 'Konzept',
    timeMinutes: 'Min',
    timeSeconds: 'Sek',

    // Ratenbegrenzungs-Warnungen
    rateLimitDetected: '⚠️ Ratenbegrenzung erkannt: {count} Seite(n) mit 429-Fehlern fehlgeschlagen. Empfehlungen: (1) Parallelität auf {suggestedConcurrency} oder 1 (seriell) reduzieren, (2) Batch-Verzögerung auf {suggestedDelay}ms erhöhen, (3) Zu einem Anbieter mit höheren Ratenbegrenzungen wechseln.',
    rateLimitDetectedShort: '⚠️ Ratenbegrenzung erreicht — Reduzieren Sie die Parallelität oder erhöhen Sie die Batch-Verzögerung in Einstellungen → Aufnahmebeschleunigung.',

    longSourceNotice: '"📄 「{filename}」 hat {lines} Zeilen ({size}). Lange Texte erfordern iterative Batch-Extraktion — das LLM liest das gesamte Dokument in mehreren Durchläufen. Dies kann einige Minuten dauern. Bitte haben Sie Geduld."',
    longSourceNoticeShort: '"📄 Große Datei erkannt ({lines} Zeilen). Aufnahme kann eine Weile dauern."',
} as const;
