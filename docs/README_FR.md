![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki — Plugin Obsidian

> Base de connaissances structurée alimentée par IA. Ingestion automatique des notes et génération d'un Wiki interconnecté — inspiré du concept de [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy.

**Auteur:** Greener-Dalii | **Version:** 1.7.13

[English](README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md) | [Site officiel](https://llmwiki.greenerai.top/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## Présentation

Vous écrivez. L'IA organise. Vous interrogez. Rien de plus.

**Le problème.** Vos notes constituent une mine d'informations — personnes, concepts, idées, connexions. Pourtant, elles ne sont que des fichiers dans des dossiers. Identifier les liens entre elles nécessite de chercher, taguer et espérer retrouver le fil.

**La solution.** [Andrej Karpathy a proposé](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) une approche élégante : traiter vos notes comme des matières premières et confier à un LLM le rôle d'architecte. Il analyse vos écrits, extrait les Entity et Concept, puis les intègre dans un Wiki structuré — doté de `[[Wiki-links]]` bidirectionnels, d'un index auto-généré et d'une interface conversationnelle répondant aux questions à partir de *vos* connaissances.

**Libérez-vous du rôle de bibliothécaire.** Plus besoin de décider ce qui mérite une page. Plus besoin de maintenir les liens croisés. Plus besoin de vérifier l'obsolescence. Déposez vos notes dans `sources/` : le LLM lit, extrait, rédige, relie et signale les contradictions — pendant que vous restez concentré sur l'essentiel.

**Ce n'est pas un chatbot de plus.** ChatGPT connaît Internet. LLM-Wiki connaît *vous* — ou plutôt, ce que vous lui avez enseigné. Chaque réponse intègre des `[[Wiki-links]]` vers votre graphe de connaissances. Chaque réponse est un point de départ, jamais une impasse.

---

## Pourquoi Obsidian + LLM-Wiki ?

Obsidian excelle dans la pensée liée. Mais il présente une contrainte : vous devez établir tous les liens manuellement.

LLM-Wiki inverse cette logique. Au lieu de construire le graphe à la main, l'IA le fait évoluer avec vous. Ajoutez une note sur un nouveau concept — il découvre les connexions que vous auriez manquées. Posez une question — il explore votre graphe de connaissances et fournit les réponses avec citations.

- **Votre Graph View prend vie.** Les nouvelles notes ne restent pas inertes — elles établissent des liens vers des Entity, Concept et sources. Le graphe croît organiquement, et le plugin en assure la maintenance : détection des doublons, correction des liens morts, ponts entre langues via les alias.
- **Vos notes deviennent conversationnelles.** La recherche se transforme en dialogue. « Que sais-je sur X ? » devient une conversation, avec des réponses en streaming et des `[[Wiki-links]]` comme pistes. Chaque réponse ouvre un chemin plus profond dans vos connaissances.
- **Obsidian devient un partenaire de réflexion.** Il cesse d'être un simple dépôt de notes pour devenir un outil qui vous aide à *penser* — révélant les connexions cachées, signalant les contradictions, évoquant ce que vous aviez oublié.

---

## Démarrage rapide

### Installation

**Méthode recommandée — Marché des plugins communautaires Obsidian :**

1. Dans Obsidian, accédez à **Paramètres → Plugins communautaires**
2. Cliquez sur **Parcourir** et recherchez « Karpathy LLM Wiki »
3. Cliquez sur **Installer**, puis **Activer**

**Ou depuis le site Web des plugins communautaires —** consultez [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) et cliquez sur **Ajouter à Obsidian** pour installer directement.

**Installation manuelle (alternative) :**

1. Téléchargez `main.js`, `manifest.json`, `styles.css` depuis [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. Dans Obsidian, accédez à Paramètres → Plugins communautaires. Dans l'onglet **Plugins installés**, cliquez sur l'icône dossier pour ouvrir le répertoire des plugins
3. Créez un dossier nommé `karpathywiki` et placez-y les trois fichiers
4. De retour dans Obsidian, cliquez sur l'icône de rafraîchissement — **Karpathy LLM Wiki** apparaîtra sous Plugins installés
5. Activez-le

**Développement :** `git clone`, `pnpm install`, `pnpm build`.

### Configuration d'un Provider LLM

1. Ouvrez Paramètres → Karpathy LLM Wiki
2. Sélectionnez un provider dans le menu déroulant (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter, ou personnalisé)
3. Saisissez votre clé API (non requise pour Ollama)
4. Cliquez sur **Fetch Models** pour peupler le menu déroulant des modèles, ou saisissez un nom de modèle manuellement
5. Cliquez sur **Test Connection**, puis **Save Settings**

**Ollama (local, sans clé API) :** Installez [Ollama](https://ollama.com), téléchargez un modèle (`ollama pull gemma4`), sélectionnez « Ollama (Local) » dans le menu déroulant des providers.

> Consultez [README_CN.md](README_CN.md) pour les instructions spécifiques aux providers chinois.

### Utilisation

| Méthode | Action |
|---------|--------|
| **Ingest depuis `sources/`** | `Cmd+P` → « Ingest Sources » — traite l'intégralité du dossier `sources/` |
| **Ingest depuis un dossier** | `Cmd+P` → « Ingest from Folder » — sélectionnez un dossier, générez le Wiki à partir des notes existantes |
| **Query Wiki** | `Cmd+P` → « Query Wiki » — posez des questions, obtenez des réponses en streaming avec `[[Wiki-links]]` |
| **Lint Wiki** | `Cmd+P` → « Lint Wiki » — analyse de santé avec détection des doublons, liens morts et pages orphelines |

La ré-ingestion d'une même source effectue des mises à jour incrémentales sur les pages Entity/Concept (fusion des nouvelles informations). Les pages de résumé sont régénérées.

**Smart Batch Skip :** Lors de l'ingestion d'un dossier, le plugin détecte automatiquement les fichiers déjà traités et les ignore pour économiser temps et coûts API. Le rapport de batch indique le nombre de fichiers ignorés.

> **Mise à niveau depuis une version antérieure ?** Exécutez `Cmd+P` → « Regenerate index » pour reconstruire votre index Wiki avec les alias inclus — cela active la recherche par alias dans Query (par ex. rechercher « DSA » trouvera « DeepSeek-Sparse-Attention »).

**Accélération d'ingestion :** Pour les sources comportant de nombreuses Entity (20+), activez la génération de pages parallèles dans Paramètres → Ingestion Acceleration :
- **Page Generation Concurrency** : 1 (séquentiel, plus sûr) à 5 (parallèle, plus rapide). Commencez par 3 pour la plupart des providers.
- **Batch Delay** : 100–2000 ms entre les batchs parallèles. Augmentez à 500 ms+ pour les providers avec limitation de débit.

> **Sécurité :** La génération parallèle utilise `Promise.allSettled` — si une page échoue, les autres poursuivent leur traitement. Les pages en échec sont réessayées individuellement avec backoff exponentiel.

---

## Fonctionnalités

### Qualité des connaissances

- **Extraction Entity/Concept** — Le LLM extrait les Entity (personnes, organisations, produits, événements) et les Concept (théories, méthodes, termes) de vos notes
- **Mandatory Page Aliases** — Chaque page générée inclut au moins un alias (traduction, acronyme, nom alternatif), permettant la détection de doublons inter-langues
- **Détection et fusion de doublons** — Le Semantic Tiering identifie les vrais doublons (traductions inter-langues, abréviations, variantes orthographiques) ; la fusion intelligente par LLM consolide le contenu et préserve les alias
- **Smart Knowledge Fusion** — Les mises à jour multi-sources fusionnent les nouvelles informations sans redondance, préservent les contradictions avec attribution, et protègent les pages `reviewed: true` de l'écrasement
- **Content Truncation Protection** — 8000 max_tokens avec détection automatique de stop_reason et retry à 2× tokens pour tous les providers
- **Verbatim Source Mentions** — Préservation des citations en langue originale avec traduction optionnelle pour traçabilité

### Maintenance

- **Lint Health Scan** — Détection des doublons, liens morts, pages vides, pages orphelines, alias manquants et contradictions dans un rapport complet
- **Semantic-Tier Duplicate Detection** — Tier 1 (correspondances directes de noms : inter-langues, abréviations, titres de haute similarité) toujours vérifié ; Tier 2 (signaux indirects : liens partagés, similarité modérée) selon le budget de tokens
- **Smart Fix All** — Correction par batch ordonnée par causalité : doublons fusionnés → liens morts résolus → orphelins reliés → pages vides complétées
- **Alias Completion** — Génération parallèle par batch des alias manquants en un clic, améliorant la détection future de doublons
- **Auto-Maintenance** — Surveillance de dossiers multiples, Lint périodique, vérification de santé au démarrage (tout optionnel)
- **Contradiction State Machine** — `detected → review_ok → resolved` (correction IA) ou `detected → pending_fix` (manuel)

### Query et feedback

- **Conversational Query** — Dialogue style ChatGPT avec Markdown streaming et `[[Wiki-links]]`, historique multi-tours
- **Query-to-Wiki Feedback** — Sauvegarde des conversations pertinentes dans le Wiki avec extraction Entity/Concept et déduplication sémantique préalable
- **Duplicate Save Prevention** — Le suivi par hash empêche la ré-évaluation des conversations inchangées

### LLM et langue

- **Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, endpoints personnalisés
- **5xx Retry** — Retry automatique avec backoff exponentiel (max 2) sur les erreurs HTTP 5xx/429 pour tous les clients
- **Dynamic Model List** — Récupération en temps réel depuis les APIs des providers
- **Wiki Output Language** — 8 langues indépendantes de l'UI (EN/ZH/JA/KO/DE/FR/ES/PT), avec entrée personnalisée
- **Internationalisation** — Interface en anglais et chinois (par défaut : anglais)

### Architecture et performance

- **Parallel Page Generation** — 1–5 pages concurrentes configurables, 3× plus rapide pour les grandes sources, isolation des erreurs par page
- **Iterative Batch Extraction** — Taille de batch adaptative élimine le goulot d'étranglement max_tokens pour les documents longs
- **Three-Layer Architecture** — `sources/` (lecture seule) → `wiki/` (généré par LLM) → `schema/` (config co-évoluée)
- **Modular Codebase** — 13 modules focalisés dans `src/`

---

## Commandes

| Commande | Description |
|----------|-------------|
| **Ingest single source** | Sélectionner une note → générer des pages Wiki avec Entity, Concept et résumé |
| **Ingest from folder** | Sélectionner un dossier → génération batch du Wiki à partir des notes existantes |
| **Query wiki** | Q&R conversationnel sur votre Wiki, réponses en streaming avec `[[Wiki-links]]` |
| **Lint wiki** | Analyse complète de santé : doublons, liens morts, pages vides, orphelines, alias manquants, contradictions |
| **Regenerate index** | Reconstruire manuellement `wiki/index.md` |
| **Suggest schema updates** | Le LLM analyse le Wiki et propose des améliorations de Schema |

---

## Exemple

**Entrée :** `sources/machine-learning.md`

```markdown
# Machine Learning
Machine learning uses algorithms to learn from data.

## Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Sortie — Page Entity :** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2026-05-15
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["监督学习", "Supervised Learning"]
---

# Supervised Learning

## Basic Information
- Type: method
- Source: [[sources/machine-learning]]

## Description
Supervised learning is a machine learning paradigm where models learn
from labeled training data to make predictions on unseen data...

## Related Concepts
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

## Related Entities
- [[entities/Arthur-Samuel|Arthur Samuel]]

## Mentions in Source
- "Supervised learning uses labeled data to train predictive models..."
```

---

## Guide de sélection de modèle

Ce plugin suit la philosophie de Karpathy : **donner au LLM le contexte Wiki complet, pas une récupération RAG fragmentée**. Les modèles à long contexte sont fortement recommandés — plus votre Wiki s'étend, plus le LLM a besoin de contexte.

> Pourquoi pas RAG ? La [critique originale de Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) soutient que RAG fragmente les connaissances et altère la capacité du LLM à raisonner sur le graphe de connaissances complet.

**Recommandations principales :**

| Modèle | Fenêtre de contexte | Motivation |
|--------|---------------------|------------|
| **DeepSeek V4** | 1M tokens | Meilleur rapport qualité-prix — coût minimal, excellent support chinois |
| **Gemini 3.1 Pro** | 1M+ tokens | Fenêtre de contexte maximale, raisonnement solide |
| **Claude Opus 4.7** | 1M tokens | Coding et raisonnement agentique de premier plan |
| **GPT-5.5** | 1M tokens | Dernier flagship OpenAI, indice d'intelligence IA élevé |
| **Claude Sonnet 4.6** | 1M tokens | Excellent équilibre entre vitesse, coût et qualité |

Pour les modèles locaux (Ollama) : les fenêtres de contexte sont généralement plus petites (8K–128K). Envisagez d'utiliser un provider cloud pour l'ingestion et un modèle local pour le Query.

**Anthropic Compatible (Coding Plan) :** Si votre provider offre un endpoint API compatible Anthropic, sélectionnez « Anthropic Compatible » et saisissez votre Base URL et API Key du provider.

---

## Architecture

Architecture à trois couches selon Karpathy :

```
sources/     # Vos documents sources (lecture seule)
  ↓ ingest
wiki/        # Pages Wiki générées par LLM
  ↓ query / maintain
schema/      # Configuration structurelle du Wiki (nommage, templates, catégories)
```

**Codebase** (`src/`) :

```
wiki/               # Modules du moteur Wiki
  wiki-engine.ts    # Orchestrateur
  query-engine.ts   # Moteur de Query conversationnel
  source-analyzer.ts # Extraction par batch itérative
  page-factory.ts   # CRUD Entity/Concept + fusion
  lint-controller.ts # Orchestration Lint
  lint-fixes.ts     # Logique de correction + génération de candidats doublons
  contradictions.ts # Détection de contradictions
  system-prompts.ts # Directive de langue + étiquettes de sections
schema/             # Co-évolution du Schema
  schema-manager.ts # CRUD Schema + suggestions
  auto-maintain.ts  # Surveillance de fichiers + Lint périodique
ui/                 # Interface utilisateur
  settings.ts       # Panneau des paramètres
  modals.ts         # Modales Lint/Ingest/Query
+ modules partagés : llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Pages générées :**
- `wiki/sources/filename.md` — Résumé de source
- `wiki/entities/entity-name.md` — Pages Entity (personnes, organisations, projets, etc.)
- `wiki/concepts/concept-name.md` — Pages Concept (théories, méthodes, termes, etc.)
- `wiki/index.md` — Index auto-généré
- `wiki/log.md` — Log des opérations

---

## Licence

MIT License — voir [LICENSE](LICENSE).

## Remerciements

- **Concept :** [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy — la vision originale ayant inspiré ce plugin
- **Plateforme :** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs :** Anthropic SDK, OpenAI SDK
