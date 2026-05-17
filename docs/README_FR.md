![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki — Plugin Obsidian

> Base de connaissances structurée alimentée par IA. Ingestion automatique des notes et génération d'un Wiki interconnecté — inspiré du concept de [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy.

**Auteur:** Greener-Dalii | **Version:** 1.7.19

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Site officiel](https://llmwiki.greenerai.top/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

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

### Mise à niveau depuis une version antérieure ?

Si vous effectuez une mise à niveau depuis une version **antérieure à la v1.7.11** (ou bien plus ancienne), vos pages Wiki existantes ont été générées sans plusieurs fonctionnalités ajoutées au fil des versions. Suivez ces étapes après la mise à jour pour mettre votre Wiki à jour :

**1. Reconstruisez votre index**
`Cmd+P` → **"Regenerate index"** — Cela reconstruit `wiki/index.md` avec les entrées d'alias pour chaque page, activant la recherche par alias dans Query (par ex., rechercher « DSA » trouve « DeepSeek-Sparse-Attention »). L'ancien format d'index ne listait que les titres de pages.

**2. Exécutez Lint Wiki**
`Cmd+P` → **"Lint Wiki"** — Cela scanne l'intégralité de votre Wiki et affiche :
- **Alias manquants** : Pages sans alias (toutes les pages pré-v1.7.11). Cliquez sur **"Complete Aliases"** — le LLM génère traductions, acronymes et noms alternatifs en masse. C'est essentiel pour la détection des doublons.
- **Pages en double** : Pages au contenu qui se chevauche (ex. « CoT » vs « chaîne de pensée » créées par des versions plus anciennes sans déduplication basée sur les alias). Cliquez sur **"Merge Duplicates"** pour les fusionner et préserver tous les alias.
- **Liens morts / Pages vides / Pages orphelines** : Problèmes classiques de maintenance Wiki.

**3. Utilisez Smart Fix All**
Cliquez sur **"Smart Fix All"** dans le rapport Lint pour une réparation en un clic, ordonnée par causalité : alias complétés → doublons fusionnés → liens morts réparés → pages orphelines liées → pages vides développées. C'est le moyen le plus rapide de nettoyer un Wiki construit à travers plusieurs versions.

**4. Activez la génération parallèle de pages**
Paramètres → **Ingestion Acceleration** :
- **Page Generation Concurrency** : Réglez sur 3 pour la plupart des providers (la valeur par défaut était 1/séquentiel avant v1.7.3). Accélère l'ingestion de 2 à 3× sur les sources avec 10+ entités.
- **Batch Delay** : Commencez à 300 ms. Augmentez à 500–800 ms si vous rencontrez des limites de débit.

**5. Passez en revue les nouveaux paramètres (ajoutés entre v1.4.0 et v1.7.x) :**
- **Wiki Output Language** (v1.6.5) : Indépendant de la langue de l'interface — votre Wiki peut être en chinois pendant que l'interface du plugin reste en anglais, ou vice versa.
- **Extraction Granularity** (v1.6.2) : Fine/Standard/Coarse contrôle la profondeur d'extraction des entités par le LLM. « Standard » est un bon choix par défaut.
- **Auto-Maintenance** (v1.4.0) : Surveillance de fichiers optionnelle, Lint périodique et vérification de santé au démarrage. Tout est désactivé par défaut — activez uniquement si vous souhaitez un traitement automatique en arrière-plan.

> **Sécurité :** La génération parallèle utilise `Promise.allSettled` — si une page échoue, les autres poursuivent leur traitement. Les pages en échec sont réessayées individuellement avec backoff exponentiel. Smart Batch Skip (v1.7.7) détecte automatiquement les fichiers déjà ingérés pour économiser du temps et des coûts d'API.

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
  lint-fixes.ts     # Correction des liens morts, pages vides et pages orphelines
  lint/             # Sous-modules Lint
    duplicate-detection.ts  # Génération programmatique de candidats doublons
    fix-runners.ts          # Exécution de corrections par lot
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

## FAQ

### Pourquoi Lint affiche-t-il « alias manquants » sur presque toutes mes pages ?

Les pages générées avant la v1.7.11 n'incluaient pas d'alias. C'est normal et sans danger — les alias sont une amélioration, pas une obligation. Cliquez sur **"Complete Aliases"** dans le rapport Lint pour que le LLM génère des traductions, acronymes et noms alternatifs pour toutes les pages déficientes en un seul batch. Une fois les alias présents, la détection des doublons et la recherche par alias deviennent bien plus efficaces.

### Pourquoi ai-je des pages en double avec des noms similaires (ex. « CoT » et « chaîne de pensée ») ?

Les versions plus anciennes (avant v1.7.10) n'avaient pas de détection des doublons basée sur les alias. Lorsque vous ingériez du contenu sur le même concept avec des noms différents, le LLM créait des pages séparées. Lancez **Lint Wiki** → si des doublons sont trouvés, cliquez sur **"Merge Duplicates"** pour les fusionner. La page fusionnée préserve les alias des deux, évitant ainsi les futurs doublons.

### Comment accélérer l'ingestion pour les fichiers sources volumineux ?

Deux paramètres dans **Paramètres → Ingestion Acceleration** :
- **Page Generation Concurrency** : Passez de 1 à 3 (ou 5 pour les providers avec des limites de débit élevées). Cela traite plusieurs pages Entity/Concept en parallèle.
- **Batch Delay** : Des valeurs plus basses sont plus rapides mais risquent le rate limiting. Commencez à 300 ms ; augmentez à 500–800 ms si vous voyez des erreurs HTTP 429.

Vérifiez également **Extraction Granularity** : « Standard » ou « Coarse » produisent moins de pages que « Fine » et sont plus rapides.

### Le plugin se fige quand j'exécute Lint sur un gros Wiki. Que faire ?

C'était un problème connu corrigé dans les v1.7.15 et v1.7.17. Si vous êtes sur une version antérieure à la v1.7.15, mettez à jour vers la dernière version — le système Lint intègre désormais des points de yield asynchrones qui redonnent la main au thread UI d'Obsidian toutes les 50 pages et toutes les 500 comparaisons, évitant le gel de 10 à 40 secondes qui se produisait sur les Wikis de 1200+ pages.

### Puis-je modifier manuellement les pages Wiki ?

Oui. Le plugin respecte vos modifications :
- Définissez `reviewed: true` dans le frontmatter pour protéger une page d'une réécriture lors de la ré-ingestion. Les pages « reviewed » reçoivent uniquement du nouveau contenu qui est annexé.
- La date `created` est préservée lors des mises à jour ; seul `updated` est actualisé.
- Les alias, tags et sources ajoutés manuellement sont préservés lors des fusions.

### Comment utiliser les modèles locaux avec Ollama ?

1. Installez [Ollama](https://ollama.com) et téléchargez un modèle : `ollama pull gemma4`
2. Dans les paramètres du plugin, sélectionnez **"Ollama (Local)"** comme provider
3. Cliquez sur **Fetch Models** pour peupler la liste des modèles, ou saisissez le nom du modèle manuellement
4. Aucune clé API requise

> Les modèles locaux ont généralement des fenêtres de contexte plus petites (8K–128K). Envisagez d'utiliser un provider cloud pour l'ingestion (qui nécessite le plus de contexte) et votre modèle local pour le Query.

### Quelle est la différence entre la langue de l'interface et la langue de sortie du Wiki ?

- **Interface Language** (en haut des paramètres) : Contrôle la langue propre du plugin — libellés des paramètres, texte des boutons, Notices. Prend actuellement en charge l'anglais et le chinois.
- **Wiki Output Language** (ajouté dans v1.6.5) : Contrôle la langue dans laquelle le LLM rédige les pages Wiki. Prend en charge 8 langues (EN/ZH/JA/KO/DE/FR/ES/PT) plus une saisie personnalisée. Vous pouvez avoir une interface en anglais pendant que votre Wiki est rédigé en japonais.

### Pourquoi Query ne trouve-t-il pas des pages dont je connais l'existence ?

Trois causes fréquentes :
1. **L'index est obsolète** : Exécutez `Cmd+P` → **"Regenerate index"** pour reconstruire avec les pages et alias actuels.
2. **Les alias sont manquants** : Sans alias (pages pré-v1.7.11), le LLM ne peut faire correspondre que par titre de page exact. Lancez Lint → Complete Aliases pour corriger.
3. **Les termes de recherche ne correspondent pas** : Essayez le titre de la page, un alias, ou un terme connexe. Le LLM effectue une correspondance sémantique, pas une recherche par mot-clé — reformuler la question aide.

### Que fait « Smart Fix All » et dans quel ordre ?

Smart Fix All exécute les corrections par ordre de causalité pour minimiser la création de nouveaux problèmes :
1. **Phase 0 — Complete Aliases** : Remplit les alias manquants pour que la détection des doublons fonctionne correctement.
2. **Phase 1 — Merge Duplicates** : Fusionne les pages en double (cause racine de nombreux liens morts et pages orphelines).
3. **Phase 2 — Fix Dead Links** : Répare les `[[wiki-links]]` brisés (beaucoup sont résolus après que la fusion des doublons réécrit les liens).
4. **Phase 3 — Link Orphans** : Ajoute des liens entrants aux pages qui n'en ont aucun.
5. **Phase 4 — Expand Empty Pages** : Remplit les pages squelettes avec du contenu généré par le LLM.

### Comment éviter des coûts d'API imprévus ?

- **Auto-Maintenance est désactivé par défaut** — ne l'activez pas sauf si vous souhaitez un traitement continu en arrière-plan.
- **Smart Batch Skip** (v1.7.7) ignore automatiquement les fichiers déjà ingérés, donc relancer l'ingestion d'un dossier ne retraite pas tout.
- **Extraction Granularity** réglé sur « Standard » ou « Coarse » utilise moins d'appels API que « Fine ».
- **Batch Delay** au-dessus de 500 ms offre plus de marge mais n'augmente pas la consommation de tokens — cela espace seulement les appels.
- Le **rapport Lint** affiche les comptages avant d'exécuter des corrections, vous pouvez donc décider ce qui vaut le coût API.

### Comment effectuer une mise à niveau sans perdre mes données Wiki ?

Le plugin ne modifie jamais vos fichiers sources dans `sources/`. Les pages Wiki dans `wiki/` ne sont modifiées que lorsque vous exécutez explicitement des corrections ou une ré-ingestion. Pour être prudent :
1. Sauvegardez votre coffre (ou simplement le dossier `wiki/`)
2. Mettez à jour le plugin
3. Exécutez d'abord **Regenerate index**
4. Exécutez **Lint Wiki** pour voir ce qui nécessite attention
5. Appliquez les corrections de manière sélective — vous n'êtes pas obligé de tout corriger à la fois

---

## Licence

MIT License — voir [LICENSE](LICENSE).

## Remerciements

- **Concept :** [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy — la vision originale ayant inspiré ce plugin
- **Plateforme :** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs :** Anthropic SDK, OpenAI SDK
