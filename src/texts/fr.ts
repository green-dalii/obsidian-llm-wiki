export const FR_TEXTS = {
    // Plugin Info
    pluginTitle: 'Paramètres de Karpathy LLM Wiki',
    pluginIntro: "Ce plugin implémente le concept de {{link}} pour Obsidian. Il lit vos notes, utilise l'IA pour extraire des entités et des concepts, et construit un wiki structuré et interconnecté dans votre coffre.",
    karpathyLinkText: "LLM Wiki d'Andrej Karpathy",

    // Features Section
    featuresTitle: 'Fonctionnement',
    workflow1Title: '1. Importer',
    workflow1Desc: 'Sélectionnez une note — l\'IA extrait les entités, concepts et relations dans des pages wiki.',
    workflow2Title: '2. Interroger',
    workflow2Desc: 'Discutez avec votre wiki — les réponses s\'appuient sur vos connaissances importées.',
    workflow3Title: '3. Maintenir',
    workflow3Desc: "L'index, les liens croisés et les vérifications automatiques assurent la santé du wiki.",

    // Language Switcher
    languageTitle: 'Langue de l\'interface',
    languageDesc: 'Sélectionnez la langue du panneau des paramètres. Redémarrez le plugin pour appliquer les changements de langue à la palette de commandes.',
    languageEn: 'English',
    languageZh: 'Chinese (中文)',
    languageJa: 'Japanese (日本語)',
    languageKo: 'Korean (한국어)',
    languageDe: 'German (Deutsch)',
    languageFr: 'French (Français)',
    languageEs: 'Spanish (Español)',
    languagePt: 'Portuguese (Português)',

    // Status
    statusTitle: 'État du client LLM',
    statusInitialized: 'Initialisé',
    statusReady: 'LLM prêt',
    statusNotReady: 'LLM non configuré — terminez la configuration ci-dessus et réussissez le test de connexion',
    statusNotInitialized: 'Non initialisé',
    currentProvider: 'Fournisseur actuel',

    // Provider Configuration
    providerSection: 'Configuration du fournisseur LLM',
    providerName: 'Fournisseur LLM',
    providerDesc: 'Sélectionnez un fournisseur prédéfini ou un service compatible OpenAI personnalisé. Pour Coding Plan ou bundles similaires: choisissez Custom OpenAI/Anthropic, saisissez manuellement le Base URL et API Key du fournisseur',

    // API Key
    apiKeyName: 'Clé API',
    apiKeyDesc: 'Saisissez votre clé API fournie par le fournisseur',
    apiKeyPlaceholder: 'Saisir la clé API',

    // Base URL
    baseUrlName: 'URL de base de l\'API',
    baseUrlDescCustom: 'Obligatoire : point de terminaison compatible OpenAI personnalisé',
    baseUrlDescOverride: 'Facultatif : remplacer l\'URL de base prédéfinie',

    // Ollama Hint
    ollamaHint: "Ollama fonctionne localement, aucune clé API n'est requise",

    // Model Selection
    modelSection: 'Sélection du modèle',
    fetchModelsName: 'Récupérer les modèles disponibles',
    fetchModelsDesc: 'Obtenir la dernière liste de modèles depuis l\'API du fournisseur',
    fetchModelsButton: 'Récupérer les modèles',
    fetchingModels: 'Récupération...',
    fetchSuccess: 'Succès ! {} modèles disponibles',
    fetchFailed: 'Échec ou liste vide, veuillez saisir le nom du modèle manuellement',
    fetchNotSupported: 'Le fournisseur ne prend pas en charge la requête de liste de modèles',

    selectModelName: 'Sélectionner un modèle',
    selectModelDesc: 'Choisir parmi {} modèles disponibles',
    customInputOption: 'Saisie personnalisée...',
    customInputHint: 'Pour utiliser d\'autres modèles, sélectionnez "Saisie personnalisée..."',

    modelName: 'Nom du modèle',
    modelDescCustom: 'Modèle personnalisé utilisé (cliquez ci-dessus pour récupérer la liste)',
    modelDescRecommended: 'Recommandé : {}',
    modelDescManual: 'Saisir manuellement le nom du modèle',

    switchToDropdown: 'Passer à la sélection par liste déroulante',
    useDropdownButton: 'Utiliser la liste déroulante',

    // Test & Save
    testConnectionName: 'Tester la connexion',
    testConnectionDesc: 'Vérifier que la configuration peut appeler l\'API LLM avec succès',
    testButton: 'Tester la connexion',
    testing: 'Test en cours...',

    saveSettingsName: 'Enregistrer les paramètres',
    saveSettingsDesc: 'Enregistrer la configuration actuelle',
    saveButton: 'Enregistrer',
    testConnectionSuccessful: 'Connexion réussie',
    testConnectionFailed: 'Connexion échouée',
    testConnectionProvider: 'Fournisseur : ',
    errorUnknown: 'Erreur inconnue',
    savedNotice: 'Paramètres enregistrés !',

    // Wiki Folder
    wikiSection: 'Configuration du dossier wiki',
    wikiFolderName: 'Dossier wiki',
    wikiFolderDesc: 'Emplacement des pages wiki générées',
    wikiFolderPlaceholder: 'wiki',

    // Errors
    errorNoApiKey: 'Veuillez d\'abord configurer la clé API',
    llmNotReady: 'LLM non configuré. Allez dans Paramètres → Karpathy LLM Wiki pour configurer votre fournisseur et réussir le test de connexion.',
    errorFetchFailed: 'Échec : {}',

    // Query Settings
    querySectionTitle: 'Configuration de l\'interrogation du wiki',
    maxConversationHistoryName: 'Historique maximal de conversation',
    maxConversationHistoryDesc: 'Limiter les messages de conversation pour éviter le dépassement de tokens',
    maxConversationHistoryHint: 'Recommandé : ne pas dépasser 50 tours',
    numberRangeValidation: 'Veuillez saisir un nombre entre 1 et 50',
    numberRangeClamped: 'Valeur hors plage (1-300), automatiquement réglée sur {}',
    // Query Modal UI
    queryModalTitle: 'Interroger le wiki — Requête conversationnelle',
    queryModalPlaceholder: 'Saisir votre question...',
    queryModalSendButton: 'Envoyer',
    queryModalStopButton: 'Arrêter',
    queryModalSaveButton: 'Enregistrer dans le wiki',
    queryModalClearButton: 'Effacer l\'historique',
    queryModalHistoryCount: 'Historique de conversation : {}/{} tours',
    queryModalStreaming: 'Génération en continu...',
    queryModalFallbackStreaming: 'La génération en continu n\'est pas prise en charge, passage en mode non continu. Veuillez patienter...',
    queryPhaseSearching: "Analyse de l'index wiki, recherche de pages pertinentes...",
    queryPhaseFoundPages: '{count} page(s) trouvée(s) : {pages}',
    queryPhaseLoadingPages: 'Chargement du contenu des pages...',
    queryPhaseContextReady: 'Contexte prêt. Génération de la réponse...',
    queryPhaseGenerating: 'Génération en cours... (écoulé {time}s)',
    queryPhaseNonStreaming: 'Mode non continu, génération de la réponse... (écoulé {time}s)',
    queryModalErrorPrefix: 'Erreur : ',
    queryModalHint: "Les requêtes s'appuient sur le contenu du wiki. Cliquez sur « Enregistrer dans le wiki » pour extraire les conversations utiles en pages wiki.",

    // Error Messages
    errorLLMClientNotInit: 'Client LLM non initialisé. Veuillez enregistrer les paramètres.',
    errorIngestFailed: "Échec de l'import : ",
    errorQueryFailed: 'Échec de la requête : ',

    // Success Messages
    ingestSuccess: 'Import réussi : {} pages créées, {} pages mises à jour',
    querySuccess: 'Requête terminée',
    lintSuccess: 'Vérification du wiki terminée',
    lintReadingPages: 'Lecture de {count} pages wiki...',
    lintReadingPagesProgress: 'Lecture des pages wiki : {current}/{total}...',
    lintScanningLinks: 'Analyse des liens cassés...',
    lintScanningLinksProgress: 'Analyse des liens cassés : {current}/{total}...',
    lintCheckingDuplicates: 'Vérification des pages dupliquées...',
    lintDuplicateCheckFailed: 'Échec de la détection des doublons — consultez la console pour les détails',
    lintDuplicateCheckFailedDetail: 'Échec de la vérification des doublons à l\'étape {step} : {error}',
    lintMergeItemFailed: 'Échec de la fusion : {source} → {target} — {error}',
    lintAliasesMissing: 'Alias manquants : {count} page(s) sans alias',
    lintAliasesSection: 'Pages sans alias (détectées)',
    lintAliasesItem: '- [[{page}]]',
    lintAliasesCompleteBtn: 'Compléter les alias ({count})',
    lintAliasesFilling: "Génération d'alias {current}/{total} : {page}",
    lintAliasesFilled: 'Complétion des alias terminée. {filled}/{total} pages remplies.',
    lintAliasesFillFailed: "Échec de la génération d'alias : {page} — {error}",
    lintFixItemFailed: 'Échec de la réparation : [[{target}]] — {error}',
    lintLinkItemFailed: 'Échec du lien : {page} — {error}',
    lintRetrying: 'Nouvelle tentative ({attempt}/{max}) après erreur...',
    lintAnalyzingLLM: "L'IA analyse la santé du wiki...",
    saveToWikiSuccess: 'Conversation enregistrée dans le wiki !',
    saveSummary: '{entities} entités, {concepts} concepts, {pages} pages',
    aliasAdded: "Alias '{alias}' ajouté à la page '{page}'",

    // Status Messages
    ingestingSources: 'Import des sources en cours...',
    queryingWiki: 'Interrogation du wiki...',
    lintingWiki: 'Vérification du wiki...',
    savingToWiki: 'Enregistrement de la conversation dans le wiki...',
    clearingHistory: "Effacement de l'historique de conversation...",

    // Buttons
    ingestButton: 'Importer',
    queryButton: 'Interroger',
    lintButton: 'Vérifier',
    cancelButton: 'Annuler',

    // Links
    karpathyGistLink: "Gist LLM Wiki de Karpathy",
    obsidianPluginAPI: 'API des plugins Obsidian',
    anthropicSDK: 'SDK Anthropic',
    openaiSDK: 'SDK OpenAI',

    // Other
    availableModelsLoading: 'Chargement des modèles disponibles...',
    noModelsAvailable: 'Aucun modèle disponible',

    // LLM Language Hint
    llmLanguageHint: 'Veuillez répondre en français.',

    // Schema Configuration
    schemaSection: 'Configuration du schéma',
    enableSchemaName: 'Activer le schéma',
    enableSchemaDesc: 'Générer et injecter schema/config.md dans toutes les invites LLM pour une sortie wiki structurée',
    viewSchemaButton: 'Voir / Modifier le schéma',
    regenerateSchemaButton: 'Régénérer le schéma par défaut',
    schemaRegeneratedNotice: 'Schéma par défaut régénéré.',
    schemaRegenerateFailed: 'Échec de la génération du schéma',

    // Statut d\'initialisation du Wiki
    wikiInitStatusReady: 'Wiki initialisé',
    wikiInitStatusNotReady: 'Wiki non initialisé — création automatique lors du premier ingest',

    // Wiki Output Language
    wikiLanguageName: 'Langue de sortie du wiki',
    wikiLanguageDesc: "Toutes les pages wiki, l'index, le journal et les réponses de requête utilisent cette langue",
    customWikiLanguageOption: 'Personnalisé...',
    customWikiLanguageHint: 'Saisissez un nom de langue (p. ex. italien, arabe). Il sera transmis au LLM comme directive de langue de sortie.',
    customWikiLanguagePlaceholder: 'p. ex. Italien',

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
    extractionGranularityName: 'Granularité de l\'extraction',
    extractionGranularityDesc: 'Contrôle les extractions par fichier source. Plus élevé = plus de pages/tokens API.\nFine: analyse approfondie. Standard: notes quotidiennes. Grossière: vue d\'ensemble rapide. Minimale: traitement 100+ fichiers. Personnalisée: limites propres (max 300).\nConseil: Utilisez Minimale/Grossière pour les dossiers avec nombreux fichiers pour gagner du temps et réduire les coûts.',
    extractionGranularityFine: 'Fine — analyse approfondie (≤100 éléments)',
    extractionGranularityStandard: 'Standard — notes quotidiennes (≤50 éléments)',
    extractionGranularityCoarse: 'Grossière — aperçu rapide (≤10 éléments)',
    extractionGranularityMinimal: 'Minimale — traitement par lot 100+ fichiers (≤5 éléments)',
    extractionGranularityCustom: 'Personnalisée — Définir vos propres limites (1~300)',
    customEntityLimitName: 'Limite personnalisée d\'entités',
    customEntityLimitDesc: 'Nombre maximum d\'entités à extraire par fichier source (1-300)',
    customConceptLimitName: 'Limite personnalisée de concepts',
    customConceptLimitDesc: 'Nombre maximum de concepts à extraire par fichier source (1-300)',

    // Ingestion Acceleration
    accelerationSectionTitle: 'Accélération de l\'import',
    pageGenerationConcurrencyName: 'Parallélisme de génération des pages',
    pageGenerationConcurrencyDesc: 'Nombre de pages à générer en parallèle lors de l\'import d\'une source unique. Des valeurs plus élevées accélèrent l\'import mais augmentent les coûts API et peuvent déclencher des limites de débit.',
    concurrencyValueSingular: 'Concurrence actuelle : {} (séquentiel — le plus sûr)',
    concurrencyValuePlural: 'Concurrence actuelle : {} (parallèle)',
    batchDelayName: 'Délai entre lots (ms)',
    batchDelayDesc: 'Délai entre lots parallèles pour éviter la limitation de débit de l\'API (100-2000ms). Actuel : {}ms. Augmentez si vous voyez des erreurs 429.',

    // Auto Maintenance
    autoMaintainSection: 'Maintenance automatique',
    autoMaintainBetaBadge: 'BÊTA — Fonctionnalité expérimentale. Peut présenter des problèmes. Recommandé uniquement pour les utilisateurs avancés.',
    autoWatchName: 'Surveiller des dossiers',
    autoWatchDesc: "Détecter automatiquement les nouveaux fichiers .md ou les modifications dans les dossiers surveillés et notifier ou importer automatiquement",
    watchedFoldersName: 'Dossiers surveillés',
    watchedFoldersDesc: "Dossiers à surveiller pour les nouveaux contenus. Cliquez sur « Ajouter un dossier » pour sélectionner depuis votre coffre.",
    addWatchedFolderButton: 'Ajouter un dossier',
    removeWatchedFolderButton: 'Retirer',
    webClipperPresetName: 'Surveiller les captures (Web Clipper)',
    webClipperPresetDesc: "Ajouter le dossier Clippings/ utilisé par Obsidian Web Clipper à la liste de surveillance. Vos captures web seront importées automatiquement dans le wiki.",
    noWatchedFoldersHint: "Aucun dossier configuré. Ajoutez un dossier ou activez le préréglage Clippings.",
    autoWatchModeName: 'Mode de surveillance',
    autoWatchModeDesc: '"Notifier seulement" affiche une invite. "Import automatique" traite silencieusement.',
    watchModeNotify: 'Notifier seulement',
    watchModeAuto: 'Import automatique',
    autoWatchDebounceName: "Délai d'anti-rebond (secondes)",
    autoWatchDebounceDesc: "Temps d'attente avant de déclencher l'import après une modification de fichier (1-60 secondes)",
    periodicLintName: 'Vérification périodique',
    periodicLintDesc: "Exécuter une vérification LLM planifiée, uniquement lorsque les fichiers sources ont changé depuis la dernière vérification",
    periodicLintOff: 'Désactivé',
    periodicLintHourly: 'Toutes les heures',
    periodicLintDaily: 'Quotidien',
    periodicLintWeekly: 'Hebdomadaire',
    startupCheckName: 'Vérification au démarrage',
    startupCheckDesc: "Analyser la santé du wiki au chargement du plugin",
    suggestSchemaCommand: 'Suggérer des mises à jour du schéma',
    autoMaintainCostWarning: "⚠️ Avertissement sur les coûts : Les fonctionnalités de maintenance automatique consomment des tokens API. L'« Import automatique » déclenche des appels LLM à chaque modification de fichier source. La « Vérification périodique » exécute des contrôles de santé LLM selon un planning (uniquement lorsque des modifications de source sont détectées). Configurez avec soin pour éviter des frais imprévus.",

    // Notices
    startupCheckSummary: "Le wiki comporte {pages} pages ({entities} entités, {concepts} concepts, {sources} sources)",
    watcherActiveNotice: 'Wiki : surveillance de fichiers active — dossiers surveillés en cours de suivi',
    watchIngestNotice: 'Wiki : {count} fichier(s) modifié(s) dans sources/. Exécutez « Importer les sources » pour traiter.',
    autoIngestRunning: "Import automatique de {count} fichier(s) modifié(s) en cours...",
    autoIngestComplete: "Import automatique terminé : {success} réussi(s), {fail} échoué(s)",
    scheduledLintRunning: 'Exécution de la vérification périodique du wiki...',
    wikiLintStats: "Vérification wiki : {pages} pages ({entities} entités, {concepts} concepts, {sources} sources)",
    wikiHealthStats: "Santé du wiki : {pages} pages ({entities} entités, {concepts} concepts, {sources} sources){indexStatus}",
    lintWikiStart: 'Démarrage de la vérification du wiki...',
    lintWikiComplete: 'Vérification du wiki terminée',
    lintWikiFailed: 'Échec de la vérification du wiki',
    analyzingSchema: "Analyse du wiki et génération des suggestions de schéma...",
    schemaSuggestionGenerated: 'Suggestions de schéma générées, consultez wiki/schema/suggestions.md',
    noSchemaUpdateNeeded: 'Aucune mise à jour du schéma nécessaire.',
    schemaSuggestionFailed: 'Échec de la suggestion de schéma',
    schemaNotFoundNotice: "Fichier de schéma introuvable. Activez le schéma pour le créer.",
    selectFolderNoMdFiles: 'Aucun fichier Markdown dans le dossier : {path}',
    batchIngestSkipNotice: '{skipped}/{total} fichiers déjà importés ignorés. Import de {new} nouveau(x) fichier(s)...',
    batchIngestAllIngested: 'Tous les {total} fichiers de ce dossier ont déjà été importés.',
    batchIngestStarting: "Import de {count} fichier(s) depuis « {folder} » — cela peut prendre plusieurs minutes. Un rapport apparaîtra une fois terminé.",
    batchIngestComplete: "Import par lot terminé : {success}/{total} réussi(s), {fail} échoué(s)",
    batchIngestFailedFiles: 'Fichiers ayant échoué :',
    historyTruncated: 'Historique tronqué aux {max} derniers tours',
    historyCleared: 'Historique effacé',

    // User Feedback Loop
    reviewedPagePreserved: 'Préservation du contenu révisé par l\'utilisateur pour : {}',

    // Query-to-Wiki feedback
    querySuggestSaveTitle: 'Enregistrer dans le wiki ?',
    querySuggestSaveDesc: 'Cette conversation contient des connaissances utiles. Voulez-vous les enregistrer dans votre wiki ?',
    querySuggestSaveYes: 'Enregistrer',
    querySuggestSaveNo: 'Ignorer',

    // Ingestion Report
    ingestReportElapsedTime: 'Temps écoulé',
    ingestReportSkippedFiles: 'Ignorés (déjà importés)',
    ingestReportFailedGuidance: "Ces éléments n'ont pas pu être créés automatiquement. Vous pouvez créer manuellement les pages correspondantes, ou réduire la granularité d'extraction et réimporter le fichier source.",
    ingestReportCollisions: 'Collisions cross-type (fusionnées comme alias)',

    // Command Names (sentence case per Obsidian Bot rule 1)
    cmdIngestSource: 'Importer une source unique',
    cmdIngestFolder: 'Importer depuis un dossier',
    cmdQueryWiki: 'Interroger le wiki',
    cmdLintWiki: 'Vérifier le wiki',
    cmdRegenerateIndex: 'Régénérer l\'index',
    cmdSuggestSchema: 'Suggérer des mises à jour du schéma',
    cmdCancelIngestion: "Annuler l'ingestion en cours",
    cmdIngestActiveFile: 'Ingérer le fichier actif',
    noActiveFile: 'Aucun fichier ouvert',
    mdOnlyFile: 'Seuls les fichiers Markdown peuvent être ingérés',

    // Ingestion status bar
    ingestionStatusBar: 'Ingestion en cours... cliquer pour annuler',
    lintStatusBar: 'Vérification en cours... cliquer pour annuler',
    ingestionCancelling: 'Annulation — arrêt après le lot en cours',
    ingestionCancelled: 'Ingestion annulée',
    crossTypeCollisionNotice: '{count} éléments fusionnés comme alias cross-type (doublons entité ↔ concept évités)',

    // Lint Report
    lintReportTitle: 'Rapport de vérification du wiki',
    lintReportSummary: "Aperçu de l'état du wiki : {total} pages au total, {aliasesMissing} pages sans alias, {duplicates} pages dupliquées, {deadLinks} liens cassés ({deadLinkFromDup} impliquent des doublons), {orphans} pages orphelines ({orphanFromDup} sont des doublons), {emptyPages} pages vides",
    lintDeadLinkSection: 'Liens cassés (détectés)',
    lintEmptyPageSection: 'Pages vides (détectées)',
    lintOrphanSection: 'Pages orphelines (détectées)',
    lintContradictionSection: 'Contradictions (détectées)',
    lintDuplicateSection: 'Pages dupliquées (détectées)',
    lintNoIssuesFound: 'Aucun doublon, lien cassé, page vide ou page orpheline détecté.',
    lintDeadLinkItem: '- [[{source}]] → **{target}** (la page n\'existe pas){dupFlag}',
    lintDeadLinkMore: '- ... {count} liens cassés supplémentaires',
    lintEmptyPageItem: '- [[{page}]] — moins de 50 caractères de contenu substantiel',
    lintOrphanItem: '- [[{page}]] — aucune autre page wiki ne pointe vers ici{dupFlag}',
    lintPollutedSection: 'Pages avec pollution de chemin (détectées)',
    lintPollutedItem: '- [[{page}]] → devrait être "{clean}"',
    lintDuplicateItem: '- [[{target}]] et [[{source}]] — {reason}',
    lintDeadLinkAffectedByDup: ' (⚠️ implique une page dupliquée)',
    lintOrphanIsDuplicate: ' (⚠️ page dupliquée)',
    lintContradictionOpen: 'Contradictions non résolues : {count}',
    lintContradictionAutoFixed: '({count} corrigé(s) automatiquement cette exécution)',
    lintContradictionItem: '- [{status}] [[{page}]] — {claim}',
    lintContradictionStatusDetected: 'Détecté',
    lintContradictionStatusPendingFix: 'Correction en attente',
    lintLLMAnalysisHeading: '## Analyse LLM',

    // Lint Analysis Prompt
    lintAnalysisPrompt: "Vous êtes un assistant de maintenance wiki. Vérifiez la santé du wiki sur la base des informations suivantes.\n\nIndex wiki :\n{index}\n\nÉchantillon de contenu des pages wiki ({total} pages au total, {sample} pages affichées) :\n{contentSample}\n\nRésultats des vérifications programmatiques (déjà vérifiés, ne pas répéter) :\n{progReport}\n\nVérifiez les aspects suivants (ignorez les liens cassés/pages vides/pages orphelines déjà détectés par les vérifications programmatiques) :\n1. **Contradictions** — des pages différentes se contredisent-elles sur les mêmes faits\n2. **Obsolescence** — certaines affirmations sont-elles clairement dépassées\n3. **Manquants** — quels concepts importants n'ont pas de page dédiée\n4. **Structure** — la structure des pages est-elle raisonnable et les références croisées sont-elles adéquates\n\nFormat de sortie : utilisez Markdown, en commençant par « ## Analyse LLM ». Chaque constatation sur une ligne « - [problème spécifique] ». S'il n'y a pas de problèmes, écrivez « Aucun problème évident trouvé. »",

    // Lint Fix Progress
    lintFixProgress: 'Réparation {current}/{total} : [[{target}]]',
    lintFixDeadComplete: 'Réparation des liens cassés terminée. {fixed}/{total} éléments réparés.',
    lintFillProgress: 'Expansion {current}/{total} : {page}',
    lintFillComplete: 'Expansion des pages terminée. {filled}/{total} pages remplies.',
    lintFillFailed: "Échec de l'expansion : {page} — {error}",
    lintLinkProgress: 'Lien {current}/{total} : {page}',
    lintLinkComplete: 'Liens des pages orphelines terminés. {linked} pages liées.',
    lintFixNoAction: "Aucune action entreprise (pas de client)",
    lintFixIndexUpdated: "L'index et le journal wiki ont été mis à jour.",
    lintPollutedFixed: 'Pages polluées corrigées : {fixed}/{total}. Index régénéré.',
    regenerateIndexCompleted: 'Index régénéré',
    operationFailed: 'Échec : ', 
    lintFixAllComplete: 'Toutes les réparations sont terminées. Consultez le journal pour les détails.',

    // Lint Report Modal
    lintModalActionsTitle: 'Suggestions de réparation (nécessite des tokens LLM) :',
    lintModalFixDeadLinks: 'Réparer les liens cassés ({count})',
    lintModalExpandEmpty: 'Étendre les pages vides ({count})',
    lintModalLinkOrphans: 'Lier les pages orphelines ({count})',
    lintModalAnalyzeSchema: 'Analyser le schéma',
    lintModalMergeDuplicates: 'Fusionner les doublons ({count})',
    lintModalFixAll: 'Réparation intelligente de tout ({count} problèmes)',
    lintMergeProgress: 'Fusion {current}/{total} : {source} → {target}',
    lintMergeComplete: 'Fusion des doublons terminée. {merged}/{total} paires fusionnées.',

    // Ingest Report Modal
    ingestReportTitle: "Rapport d'import",
    ingestReportSourceFile: 'Fichier source',
    ingestReportCreated: 'Créées',
    ingestReportUpdated: 'Mises à jour',
    ingestReportContradictions: 'Contradictions trouvées',
    ingestReportFailedTitle: "Échec de l'import",
    ingestReportErrorDetail: "Détail de l'erreur",
    ingestReportClose: 'Fermer',
    ingestReportCreatedPages: 'Pages créées : {count}',
    ingestReportUpdatedPages: 'Pages mises à jour : {count}',
    ingestReportEntitiesCount: '{count} entités',
    ingestReportConceptsCount: '{count} concepts',
    ingestReportContradictionsFound: 'Contradictions trouvées : {count}',
    ingestReportEntityType: 'Entité',
    ingestReportConceptType: 'Concept',
    timeMinutes: 'min',
    timeSeconds: 's',

    // Avertissements de limite de débit
    rateLimitDetected: "⚠️ Limite de débit détectée : {count} page(s) ont échoué avec des erreurs 429. Suggestions : (1) Réduire la concurrence à {suggestedConcurrency} ou 1 (séquentiel), (2) Augmenter le délai entre lots à {suggestedDelay}ms, (3) Passer à un fournisseur avec des limites de débit plus élevées.",
    rateLimitDetectedShort: "⚠️ Limite de débit atteinte — envisagez de réduire la concurrence ou d'augmenter le délai entre lots dans Paramètres → Accélération d'import.",

    longSourceNotice: '📄 "{filename}" contient {lines} lignes ({size}). Les textes longs nécessitent une extraction itérative par lots — le LLM lit le document complet en plusieurs passes. Cela peut prendre plusieurs minutes. Veuillez patienter.',
    longSourceNoticeShort: '📄 Fichier volumineux détecté ({lines} lignes). Ingestion peut prendre du temps.',
} as const;
