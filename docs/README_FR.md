![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Plugin Obsidian

> Base de connaissances structurée alimentée par IA. Ingestion automatique des notes et génération d'un Wiki interconnecté — inspiré du concept de [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy.
>
> **Note officielle Obsidian 95/100** | Support natif de 10 langues | Maintenance active, évolution continue

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | **Français** | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[Site officiel](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Retour d'expérience](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorer le code avec DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ Avis de mise à jour rapide：** Ce projet évolue rapidement – corrections de bugs, améliorations de performances, nouvelles fonctionnalités et optimisations UX sont fréquentes. Nous vous recommandons de mettre à jour régulièrement dans Obsidian (**Paramètres → Plugins communautaires → Vérifier les mises à jour**) ou d'activer la mise à jour automatique des plugins.

## 📑 Contents

- [💡 Présentation](#-présentation)
- [⚡ Pourquoi Obsidian + LLM-Wiki ?](#-pourquoi-obsidian--llm-wiki-)
- [🚀 Démarrage rapide](#-démarrage-rapide)
  - [📦 Installation](#-installation)
  - [🔄 Mise à jour](#-mise-à-jour)
  - [🔑 Configurer un fournisseur LLM](#-configurer-un-fournisseur-llm)
  - [🎮 Utilisation](#-utilisation)
  - [⚠️ Mise à niveau depuis une ancienne version ?](#️-mise-à-niveau-depuis-une-ancienne-version-)
- [⚡ Nouveautés de la v1.22.0](#-nouveautés-de-la-v1220)
- [✨ Fonctionnalités](#-fonctionnalités)
  - [📊 Qualité des connaissances](#-qualité-des-connaissances)
  - [🛠️ Maintenance](#️-maintenance)
  - [💬 Query et feedback](#-query-et-feedback)
  - [🌐 LLM et langue](#-llm-et-langue)
  - [🏗️ Architecture et performance](#️-architecture-et-performance)
  - [🔒 Confidentialité et sécurité](#-confidentialité-et-sécurité)
- [⌨️ Commandes](#️-commandes)
- [📖 Exemple](#-exemple)
- [🤖 Guide de sélection de modèle](#-guide-de-sélection-de-modèle)
- [🏗️ Architecture](#️-architecture)
- [❓ FAQ](#-faq)
  - [💡 Général](#-général)
  - [🏷️ Alias & Doublons](#️-alias--doublons)
  - [⚡ Performance & Contrôle des coûts](#-performance--contrôle-des-coûts)
  - [🧹 Maintenance](#-maintenance)
  - [🔍 Dépannage](#-dépannage)
  - [🔒 Transparence et conformité](#-transparence-et-conformité)
- [📜 Licence](#-licence)
- [🙏 Remerciements](#-remerciements)
## 💡 Présentation

Vous écrivez. L'IA organise. Vous interrogez. Rien de plus.

**🎯 Le problème.** Vos notes constituent une mine d'informations — personnes, concepts, idées, connexions. Pourtant, elles ne sont que des fichiers dans des dossiers. Identifier les liens entre elles nécessite de chercher, taguer et espérer retrouver le fil.

**✨ La solution.** [Andrej Karpathy a proposé](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) une approche élégante : traiter vos notes comme des matières premières et confier à un LLM le rôle d'architecte. Il analyse vos écrits, extrait les Entity et Concept, puis les intègre dans un Wiki structuré — doté de `[[Wiki-links]]` bidirectionnels, d'un index auto-généré et d'une interface conversationnelle répondant aux questions à partir de *vos* connaissances.

**📚 Libérez-vous du rôle de bibliothécaire.** Plus besoin de décider ce qui mérite une page. Plus besoin de maintenir les liens croisés. Plus besoin de vérifier l'obsolescence. Déposez vos notes dans `sources/` : le LLM lit, extrait, rédige, relie et signale les contradictions — pendant que vous restez concentré sur l'essentiel.

**🤖 Ce n'est pas un chatbot de plus.** ChatGPT connaît Internet. LLM-Wiki connaît *vous* — ou plutôt, ce que vous lui avez enseigné. Chaque réponse intègre des `[[Wiki-links]]` vers votre graphe de connaissances. Chaque réponse est un point de départ, jamais une impasse.

---

## ⚡ Pourquoi Obsidian + LLM-Wiki ?

Obsidian excelle dans la pensee liee. Mais il y a un hic : c'est vous qui faites tous les liens.

LLM-Wiki inverse la donne. Au lieu de construire le graphe a la main, l'IA le developpe avec vous. Ajoutez une note sur un nouveau concept — elle trouve les connexions que vous auriez manquees. Posez une question — elle parcourt votre propre graphe de connaissances et revient avec des reponses citees.

- **🔗 Votre Graph View prend vie.** Les nouvelles notes ne restent pas inertes — elles germent des liens vers des entites, des concepts et des sources. Le graphe grandit de maniere organique, et le plugin l'entretient : detection des doublons, correction des liens morts, ponts entre langues via les aliases.
- **💬 Vos notes apprennent a vous repondre.** La recherche devient conversation. « Qu'ai-je ecrit sur X ? » devient un dialogue, avec des reponses en streaming et des `[[wiki-links]]` comme fil d'Ariane. Chaque reponse est un chemin plus profond dans vos propres connaissances.
- **🧠 Obsidian devient un partenaire de reflexion.** Il cesse d'etre un simple classeur a notes et devient un outil qui vous aide a *penser* — revelant des connexions cachees, signalant les contradictions, se rappelant ce que vous aviez oublie.

---

## 🚀 Démarrage rapide

### 📦 Installation

**🌟 Recommandé — Marché des plugins communautaires Obsidian :**
1. Dans Obsidian, allez dans **Paramètres → Plugins communautaires**
2. Cliquez sur **Parcourir** et recherchez « Karpathy LLM Wiki »
3. Cliquez sur **Installer**, puis **Activer**

**🌐 Ou depuis le site des plugins communautaires —** visitez [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) et cliquez sur **Add to Obsidian**.

**⚙️ Manuel (alternative) :**
1. Téléchargez `main.js`, `manifest.json`, `styles.css` depuis les [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. Dans Obsidian, allez dans Paramètres → Plugins communautaires. Cliquez sur l'icône de dossier pour ouvrir le répertoire des plugins
3. Créez un dossier nommé `karpathywiki`, déposez les trois fichiers à l'intérieur
4. De retour dans Obsidian, cliquez sur l'icône de rafraîchissement — **Karpathy LLM Wiki** apparaîtra
5. Activez-le pour l'activer

**🔨 Développement :** `git clone`, `pnpm install`, `pnpm build`.

### 🔄 Mise à jour

Ce projet évolue rapidement. Nous vous recommandons de rester à jour :

**Option A — Mise à jour manuelle (recommandée) :**
1. Allez dans **Paramètres → Plugins communautaires**
2. Cliquez sur **Vérifier les mises à jour**
3. Trouvez **Karpathy LLM Wiki** et cliquez sur **Mettre à jour**

**Option B — Activer la mise à jour automatique :**
1. Allez dans **Paramètres → Plugins communautaires**
2. Activez **Vérifier automatiquement les mises à jour des plugins**

> 💡 **Pourquoi rester à jour ?** Chaque version peut inclure de nouvelles fonctionnalités, des améliorations de performance et des corrections de bugs importantes.

### 🔑 Configurer un fournisseur LLM

1. Ouvrez Paramètres → Karpathy LLM Wiki
2. Choisissez un fournisseur dans le menu déroulant
3. Entrez votre clé API (non nécessaire pour Ollama)
4. Cliquez sur **Fetch Models**, ou tapez un nom de modèle manuellement
5. Cliquez sur **Test Connection**, puis **Enregistrer les paramètres**

**🦙 Ollama (local) :** Installez [Ollama](https://ollama.com), téléchargez un modèle, sélectionnez « Ollama (Local) ».

**🎛️ LM Studio (local) :** Installez [LM Studio](https://lmstudio.ai), démarrez le serveur local, sélectionnez « LM Studio (Local) ».

### 🎮 Utilisation

| Méthode | Comment |
|---------|---------|
| **📥 Ingestion d'une source unique** | `Cmd+P` → « Importer une source unique » |
| **📂 Ingestion depuis un dossier** | `Cmd+P` → « Importer depuis un dossier » |
| **🔍 Interroger le wiki** | `Cmd+P` → « Interroger le wiki » |
| **🛠️ Vérifier le wiki** | `Cmd+P` → « Vérifier le wiki » |
| **📋 Régénérer l'index** | `Cmd+P` → « Régénérer l'index » |
| **💡 Suggérer des mises à jour du schéma** | `Cmd+P` → « Suggérer des mises à jour du schéma » |
| **🎯 Ingestion en un clic** | Icône de la barre latérale ou `Cmd+P` → « Ingérer le fichier actuel » |

### ⚠️ Mise à niveau depuis une ancienne version ?

**Cette version est entièrement rétrocompatible.** Aucun changement cassant depuis la v1.0.0.

**Mise à niveau vers v1.20.3 depuis toute version antérieure** : les slugs des pages source portent désormais une empreinte (chaque `sources/<slug>.md` devient `sources/<nom_de_base>_<6 hex>.md`). Lors de votre prochaine ingestion, les pages `sources/` existantes sont renommées sur place et tous les backlinks `[[sources/<slug>]]` sont mis à jour automatiquement — aucune action requise, mais le renommage de fichier peut apparaître brièvement dans l'explorateur de fichiers d'Obsidian. Si vous avez des scripts externes ou des marque-pages qui référencent directement des chemins `sources/<slug>.md`, mettez-les à jour vers les nouveaux chemins avec empreinte.

**Pour les wikis construits sur plusieurs versions :**
1️⃣ Reconstruisez votre index — « Régénérer l'index »
2️⃣ Lancez Vérifier le wiki — scanne les problèmes
3️⃣ Utilisez Smart Fix All — réparation en un clic
4️⃣ Activez la génération de pages parallèle — Concurrence : 3, Délai : 300ms
5️⃣ Vérifiez les paramètres — Langue, Granularité, Auto-Maintenance

---

## ⚡ Nouveautés de la v1.22.0

La v1.22.0 est une **release MINOR** qui apporte un flux de mise à jour du schéma en un clic, le chinois traditionnel comme 10e langue et une barre de statut d'ingestion améliorée.

- **📝 Application du schéma en un clic (Issue #97).** Les suggestions générées par le LLM sont désormais affichées dans un Modal de diff à double volet style IDE, avec les boutons Appliquer/Annuler/Ouvrir le fichier. L'application d'une suggestion sauvegarde automatiquement le schéma précédent (rotation, max 3 backups) avant d'écrire le nouveau. « Mettre à jour le schéma » est maintenant accessible depuis le Modal de Lint — l'entrée de la palette de commandes a été supprimée pour imposer un point d'entrée unique.
- **🏷️ Synchronisation dynamique des tags du schéma.** Le vocabulaire du schéma est désormais la source de vérité unique — les tags actifs sont automatiquement injectés dans chaque appel LLM, éliminant le bug de « template du schéma écrasé par des sections codées en dur » de v1.21.0 Phase 1.
- **🇹🇼 Chinois traditionnel (zh-TW).** L'interface du plugin et la sortie Wiki prennent désormais en charge le chinois traditionnel comme 10e langue. La protection de parité bidirectionnelle a été étendue à toutes les 10 langues.
- **📊 Barre de statut d'ingestion avec nom de document (PR #189).** La barre de statut affiche désormais le nom du document en cours (`Ma Note · Ingestion en cours...`) et la progression du lot pendant l'ingestion de dossiers (`[4/10] Ma Note · Ingestion en cours...`). Contribution de @YounianC.

Nous recommandons vivement la mise à niveau — la fonction d'application du schéma en un clic transforme le raffinement du schéma en une opération en une étape, et la langue chinoise traditionnelle améliore considérablement l'expérience pour les utilisateurs zh-TW.

Détails dans [CHANGELOG.md](../CHANGELOG.md).

## ✨ Fonctionnalités

### 📊 Qualité des connaissances

- **🔍 Extraction Entity/Concept** — Le LLM extrait les Entity (personnes, organisations, produits, événements) et les Concept (théories, méthodes, termes) de vos notes avec granularité d'extraction flexible (Minimale~5 éléments, Grossière~10, Standard~50, Fine~100, Personnalisée 1–300) pour équilibrer profondeur d'analyse et coûts API
- **🏷️ Mandatory Page Aliases** — Chaque page générée inclut au moins un alias (traduction, acronyme, nom alternatif), permettant la détection de doublons inter-langues
- **🔄 Détection et fusion de doublons** — Le Semantic Tiering identifie les vrais doublons (traductions inter-langues, abréviations, variantes orthographiques) ; la fusion intelligente par LLM consolide le contenu et préserve les alias
- **🧩 Smart Knowledge Fusion** — Les mises à jour multi-sources fusionnent les nouvelles informations sans redondance, préservent les contradictions avec attribution, et protègent les pages `reviewed: true` de l'écrasement
- **📏 Content Truncation Protection** — 8000 max_tokens avec détection automatique de stop_reason et retry à 2× tokens pour tous les providers
- **📝 Verbatim Source Mentions** — Préservation des citations en langue originale avec traduction optionnelle pour traçabilité

### 🛠️ Maintenance

- **🔍 Lint Health Scan** — Détection des doublons, liens morts, pages vides, pages orphelines, alias manquants et contradictions dans un rapport complet
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (correspondances directes de noms : inter-langues, abréviations, titres de haute similarité) toujours vérifié ; Tier 2 (signaux indirects : liens partagés, similarité modérée) selon le budget de tokens
- **⚡ Smart Fix All** — Correction par batch ordonnée par causalité : doublons fusionnés → liens morts résolus → orphelins reliés → pages vides complétées
- **🏷️ Alias Completion** — Génération parallèle par batch des alias manquants en un clic, améliorant la détection future de doublons
- **🔄 Auto-Maintenance** — Surveillance de dossiers multiples, Lint périodique, vérification de santé au démarrage (Startup Quick Fixes activé par défaut, File Watcher et Periodic Lint désactivés par défaut)
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved` (correction IA) ou `detected → pending_fix` (manuel)
- **🛡️ Portail de pré-ingestion (v1.21.0)** — Chaque fichier source est validé *avant* tout appel LLM : les notes vides/blanches/avec uniquement du frontmatter sont rejetées ; le déduplication par hash de contenu détecte les fichiers identiques à travers les chemins. Empêche les modèles locaux d'halluciner des noms d'entités sur des entrées vides.
- **📊 Panneau d'historique des opérations (v1.21.0)** — UI consultable et filtrable pour les ingestions passées, rapports de lint et exécutions de maintenance, avec cartes KPI pilotées par l'insight et liens cliquables vers les pages.
- **🧹 Nettoyeur de pages incomplètes (v1.21.0)** — Les pages laissées dans un état partiel après des ingestions interrompues sont automatiquement archivées au démarrage (récupérables depuis la `.trash` d'Obsidian).

### 💬 Query et feedback

- **🤖 Conversational Query** — Dialogue style ChatGPT avec Markdown streaming et `[[Wiki-links]]`, historique multi-tours
- **📤 Query-to-Wiki Feedback** — Sauvegarde des conversations pertinentes dans le Wiki avec extraction Entity/Concept et déduplication sémantique préalable
- **🔒 Duplicate Save Prevention** — Le suivi par hash empêche la ré-évaluation des conversations inchangées

### 🌐 LLM et langue

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, endpoints personnalisés
- **🔄 5xx Retry** — Retry automatique avec backoff exponentiel (max 2) sur les erreurs HTTP 5xx/429/529 pour tous les clients
- **📋 Dynamic Model List** — Récupération en temps réel depuis les APIs des providers
- **🌐 Wiki Output Language** — 9 langues indépendantes de l'UI (EN/ZH/JA/KO/DE/FR/ES/PT/IT), avec entrée personnalisée
- **🌍 Internationalisation complète de l'UI** — Interface du plugin en 9 langues (EN/ZH/JA/KO/DE/FR/ES/PT/IT), 269+ champs UI entièrement traduits, expressions locales naturelles
- **⚡ Rate Limit Guardian** — Quand la génération parallèle déclenche des rate limits, auto-détection et suggestions : réduire la concurrence, augmenter le délai batch, changer de provider
- **🦙 Web Clipper Compatible** — Ajout en un clic du dossier `Clippings/` d'Obsidian Web Clipper à la watchlist, clips web auto-ingérés dans le Wiki

### 🏗️ Architecture et performance

- **⚡ Parallel Page Generation** — 1–5 pages concurrentes configurables, défaut 3 (parallèle), 2–3× plus rapide pour les grandes sources, isolation des erreurs par page
- **📚 Iterative Batch Extraction** — Taille de batch adaptative élimine le goulot d'étranglement max_tokens pour les documents longs
- **🏛️ Three-Layer Architecture** — `sources/` (lecture seule) → `wiki/` (généré par LLM) → `schema/` (config co-évoluée)
- **🧩 Modular Codebase** — 20+ modules focalisés dans `src/`

### 🔒 Confidentialité et sécurité

- **Pas de backend, pas de télémétrie.** Le plugin fonctionne entièrement dans Obsidian — aucun serveur externe, aucune analyse, aucune collecte de données d'aucune sorte. Vos notes ne quittent jamais votre coffre-fort, sauf si vous configurez explicitement un fournisseur LLM.
- **Vos données restent locales par défaut.** Le plugin ne stocke, ne met en cache ni ne transmet votre contenu ailleurs que vers l'API LLM que vous avez choisie. Seul le texte que vous envoyez pour ingestion ou requête quitte votre appareil — et uniquement vers le fournisseur que vous avez configuré.
- **Mode entièrement local avec Ollama, LM Studio ou fournisseurs locaux.** Pour une souveraineté totale des données, utilisez un LLM exécuté localement. Vos notes sont traitées entièrement sur votre machine — rien ne touche Internet.
- **Permissions minimales.** L'accès aux fichiers du coffre est requis pour la gestion du wiki (lecture des notes, génération de pages, détection de liens morts). L'accès réseau est utilisé exclusivement pour les appels API LLM vers le fournisseur que vous avez choisi. L'accès au presse-papiers se limite au bouton « Copier » dans la fenêtre modale de requête — uniquement lorsque vous cliquez dessus.

---


---

## ⌨️ Commandes

| Commande | Description |
|----------|-------------|
| **📥 Importer une source unique** | Sélectionner une note → générer des pages Wiki avec Entity, Concept et résumé |
| **📂 Importer depuis un dossier** | Sélectionner un dossier → génération batch du Wiki à partir des notes existantes |
| **🔍 Interroger le wiki** | Q&R conversationnel sur votre Wiki, réponses en streaming avec `[[Wiki-links]]` |
| **🛠️ Vérifier le wiki** | Analyse complète de santé : doublons, liens morts, pages vides, orphelines, alias manquants, contradictions |
| **📋 Régénérer l'index** | Reconstruire manuellement `wiki/index.md` |
| **⏹️ Annuler opération** | `Cmd+P` → "Cancel current ingestion" ou clic barre de statut — arrêt propre aux limites de lot |
| **💡 Suggérer des mises à jour du schéma** | Le LLM analyse le Wiki et propose des améliorations de Schema |
| **📊 Voir l'historique d'ingestion (v1.21.0)** | Parcourir les ingestions passées, rapports de lint et exécutions de maintenance dans une UI consultable et filtrable |

---

## 📖 Exemple

**Entrée :** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Sortie — Page Entity :** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2025-12-01
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["监督学习", "Supervised Learning"]
---

### Supervised Learning

### Basic Information
- Type: method
- Source: [[sources/machine-learning]]

### Description
Supervised learning is a machine learning paradigm where models learn
from labeled training data to make predictions on unseen data...

### Related Concepts
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### Related Entities
- [[entities/Arthur-Samuel|Arthur Samuel]]

### Mentions in Source
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 🤖 Guide de sélection de modèle

Ce plugin suit la philosophie de Karpathy : **donner au LLM le contexte Wiki complet, pas une récupération RAG fragmentée**. Les modèles à long contexte sont fortement recommandés — plus votre Wiki s'étend, plus le LLM a besoin de contexte.

> 💡 **Pourquoi pas RAG ?** La [critique originale de Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) soutient que RAG fragmente les connaissances et altère la capacité du LLM à raisonner sur le graphe de connaissances complet.

**💰 Stratégie rapport qualité-prix :** Vous n'avez pas besoin de modèles phares. Les **alternatives économiques** suivantes offrent d'excellents résultats à des coûts plus bas :

| Niveau | Modèle | Fenêtre de contexte | Motivation |
|--------|--------|---------------------|------------|
| **🌟 Rapport Q/P** | **DeepSeek V4-Flash** | 1M tokens | Prix le plus bas ($0.14/M), 284B MoE, idéal pour l'ingestion batch |
| **🌟 Rapport Q/P** | **Gemini-3.5-Flash** | 1M tokens | 4× plus rapide que GPT-5.5, excellent pour les tâches agentiques |
| **🌟 Rapport Q/P** | **Qwen3.6-Plus** | 1M tokens | Capacités coding & agent fortes, prix compétitif |
| **🌟 Rapport Q/P** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **Équilibré** | **Claude Sonnet 4.6** | 1M tokens | Bon équilibre qualité/coût, $3/$15 par million de tokens |
| **Léger** | **Claude Haiku 4.5** | 200K tokens | Rapide et économique, pour wikis plus petits |
| **Économique** | **Xiaomi MiMo-V2.5** | 1M tokens | Xiaomi 310B/15B MoE, open-source MIT 2026-04, agent & multimodal |
| **Phare** | Claude Opus 4.7 | 1M tokens | Qualité ultime, coût élevé — utiliser sélectivement |
| **Phare** | GPT-5.5 | 1M tokens | Raisonnement top niveau, coût élevé — utiliser sélectivement |

Pour les modèles locaux (Ollama) : les fenêtres de contexte sont généralement plus petites (8K–128K). Envisagez d'utiliser un provider cloud pour l'ingestion et un modèle local pour le Query.

**🔌 Anthropic Compatible (Coding Plan) :** Si votre provider offre un endpoint API compatible Anthropic, sélectionnez « Anthropic Compatible » et saisissez votre Base URL et API Key du provider.

**🦙 Ollama (local, sans clé API) :** Installer [Ollama](https://ollama.com), tirer un modèle (`ollama pull gemma4` ou `ollama pull qwen3.5:27b`), sélectionner « Ollama (Local) » dans le menu déroulant des providers.

**🎛️ LM Studio (local, sans clé API) :** Installer [LM Studio](https://lmstudio.ai), démarrer son serveur local (par défaut `http://localhost:1234/v1`), sélectionner « LM Studio (Local) » dans le menu déroulant des providers. LM Studio exécute un serveur compatible OpenAI intégré — le champ de clé API est facultatif.

> 💡 **Forfaits d'abonnement :** Les forfaits Coding Plan, OpenAI Pro ou Anthropic Pro sont d'excellentes options pour contrôler les coûts en cas d'utilisation fréquente. Ce plugin prend en charge ces services.

---

## 🏗️ Architecture

Architecture à trois couches selon Karpathy :

```
sources/     # 📄 Vos documents sources (lecture seule)
  ↓ ingest
wiki/        # 🧠 Pages Wiki générées par LLM
  ↓ query / maintain
schema/      # 📋 Configuration structurelle du Wiki (nommage, templates, catégories)
```

**Codebase** (`src/`) :

```
main.ts              # 🔌 Point d'entrée du plugin
wiki/                # Modules du moteur Wiki
  wiki-engine.ts     # 🎯 Orchestrateur
  query-engine.ts    # 💬 Moteur de Query conversationnel
  source-analyzer.ts # 📊 Extraction par batch itérative
  page-factory.ts    # 🏗️ CRUD Entity/Concept + fusion
  conversation-ingest.ts # 📥 Chat → savoir Wiki
  contradictions.ts  # ⚠️ Détection de contradictions
  system-prompts.ts  # 🗣️ Directive de langue + étiquettes de sections
  lint/              # Sous-modules Lint
    controller.ts        # 🔍 Orchestration Lint
    fix-runners.ts       # ⚡ Exécution de corrections par lot
    scanners.ts          # 🔍 Scanners (dead links, orphans, aliases, ancrage de citation)
    duplicate-detection.ts # 🔄 Génération programmatique de candidats doublons
    report-builder.ts    # 📋 Constructeur de rapport en fonction pure
    phases/              # Exécution Lint par phases
  prompts/           # Modèles de prompts LLM par domaine
schema/              # Co-évolution du Schema
  manager.ts         # 📋 CRUD Schema + suggestions
  auto-maintain.ts   # 🔄 Surveillance de fichiers + Lint périodique + correctifs au démarrage
  analyze.ts         # 📊 Analyse de Schema avec câblage d'annulation
ui/                  # Interface utilisateur
  settings.ts        # ⚙️ Panneau des paramètres
  modals.ts          # 📦 Modales Lint / Ingest / Query / History
core/                # 🧩 Modules en fonction pure (zéro IO, entièrement testables)
  i18n, slug, json, frontmatter, tag-vocab, sources-normalizer, ...
+ Partagés : llm-client.ts, llm-client-wrapper.ts, texts.ts, prompts.ts, types.ts
```

**Pages générées :**
- `wiki/sources/filename.md` — 📄 Résumé de source
- `wiki/entities/entity-name.md` — 👤 Pages Entity (personnes, organisations, projets, etc.)
- `wiki/concepts/concept-name.md` — 💡 Pages Concept (théories, méthodes, termes, etc.)
- `wiki/index.md` — 📑 Index auto-généré
- `wiki/log.md` — 📝 Log des opérations

---

## ❓ FAQ

> **Gardez le plugin à jour.** Ce projet est fréquemment mis à jour — nouvelles fonctionnalités et correctifs arrivent tous les quelques jours. Dans Obsidian, allez régulièrement dans **Paramètres → Plugins communautaires → Vérifier les mises à jour**.
>
> Plus de questions dans la [GitHub FAQ Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

### 💡 Général

**Que fait ce plugin exactement ?**
Déposez des notes, il extrait les personnes, concepts et théories, puis génère un Wiki interconnecté avec `[[Wiki-links]]`. Posez des questions et obtenez des réponses basées sur *vos* notes — pas des hallucinations d'internet.

**Configuration minimale ?**
Obsidian v1.11.0+, bureau (Windows/macOS/Linux), une clé API d'un provider LLM. Ollama fonctionne en local sans clé API.

**Pourquoi les fonctions ne sont-elles pas disponibles après installation ?**
Paramètres → Karpathy LLM Wiki → choisir un fournisseur → entrer la clé API → Fetch Models → sélectionner un modèle → Test Connection. L'indicateur vert "LLM Ready" déverrouille toutes les fonctions.

**Comment annuler une ingestion ou un Lint en cours ?**
Cliquer sur le texte de la barre de statut pendant une opération (il affiche « Ingestion en cours... cliquer pour annuler »), ou utiliser `Ctrl+P` → « Annuler l'ingestion en cours ». L'opération s'arrête proprement à la limite du prochain lot, en préservant tout le travail déjà accompli.

**Comment ingérer rapidement le fichier en cours d'édition ?**
Cliquez sur l'icône `sticker` dans la barre latérale gauche, ou utilisez `Ctrl+P` → « Ingérer le fichier actuel ». Cela évite le sélecteur de fichier et ingère directement l'onglet actif de l'éditeur.

**Je vois des crochets doubles `[[[[entities/Foo|Foo]]]]` dans log.md — comment corriger ?**
Lancez **Vérifier le wiki** — le scanner détecte et corrige automatiquement tous les wiki-links doublement imbriqués dans l'ensemble de votre répertoire wiki (y compris log.md), sans aucun coût LLM. Aucun nettoyage manuel n'est nécessaire.

**Pourquoi j'obtiens des erreurs « Overloaded » ?**
Le plugin reconnaît désormais l'erreur 529 « Overloaded » d'Anthropic comme retryable. Les erreurs de surcharge sont automatiquement réessayées avec un backoff exponentiel sur tous les providers.

**Pourquoi un stub en double a-t-il été créé alors que la page existe déjà dans entities/ ou concepts/ ?**
Le plugin utilise désormais l'appariement par slug — différents formatages du même nom se résolvent vers la page existante au lieu de créer un stub en double.

**Quel modèle choisir ?**
Voir [Recommandations de modèles](#-recommandations-de-modèles) ci-dessus. Les modèles à long contexte sont recommandés — plus votre Wiki est grand, plus le LLM a besoin de contexte.

### 🏷️ Alias & Doublons

**Pourquoi Lint affiche-t-il « alias manquants » sur presque toutes mes pages ?**
Les pages générées avant v1.7.11 n'incluaient pas d'alias. C'est inoffensif — les alias sont une amélioration, pas un défaut. Cliquez sur **Complete Aliases** dans le rapport Lint pour générer des traductions, acronymes et noms alternatifs en un lot.

**Pourquoi ai-je des pages en double avec des noms similaires ?**
Avant v1.7.10, pas de détection des doublons basée sur les alias. Lancez **Lint Wiki** → **Merge Duplicates** pour fusionner.

**Comment fonctionne la détection des doublons ? (v1.7.10+)**
Détection sémantique à deux niveaux : Niveau 1 (toujours vérifié par LLM) détecte les correspondances inter-langues, abréviations, titres très similaires. Niveau 2 remplit le budget de tokens restant avec des candidats de similarité modérée.

**Que sont les « pages polluées » ? (v1.9.0)**
Pages avec préfixes de dossier accidentellement intégrés aux noms de fichier (ex. : `concepts/conceptsOptimisationLayout.md`). Lancez **Lint Wiki** → **🧹 Fix Polluted Pages** pour renommer et mettre à jour les liens entrants.

### ⚡ Performance & Contrôle des coûts

**Comment accélérer l'ingestion ?**
Dans **Paramètres → LLM Configuration** : augmentez la **Page Generation Concurrency** à 3–5, réduisez le **Batch Delay** à 100–300 ms (attention au rate limiting). Choisissez « Minimale », « Grossière » ou « Standard » pour **Granularité d'extraction** afin de réduire le nombre de pages et économiser les coûts API.

**Pourquoi des erreurs HTTP 429 ?**
Le plugin détecte automatiquement le rate limiting et suggère : réduire la concurrence à 1–2, augmenter le Batch Delay à 500–800 ms, ou changer de provider.

**Comment contrôler les coûts API ?**
- Auto-Maintenance désactivé par défaut (à activer uniquement si nécessaire)
- Smart Batch Skip ignore automatiquement les fichiers déjà ingérés
- Granularité « Standard » ou « Coarse » = moins d'appels LLM
- Batch Delay > 500 ms espace les appels sans augmenter la consommation de tokens
- Le rapport Lint affiche les comptes avant exécution

### 🧹 Maintenance

**Que fait Smart Fix All ?**
Exécute les correctifs par ordre causal (v1.9.0+) :
1. 🧹 Corriger les pages polluées → 2. 🏷️ Compléter les alias → 3. 🔄 Fusionner les doublons → 4. 🔗 Réparer les liens morts → 5. 🔗 Lier les orphelins → 6. 📝 Développer les pages vides

**Lint bloque sur un gros Wiki ?**
Mettez à jour vers v1.7.17+ — Lint cède la main au thread UI d'Obsidian toutes les 50 pages, évitant les blocages.

### 🔍 Dépannage

**Query ne trouve pas des pages que je connais ?**
Trois causes : (1) Index obsolète → **Regenerate index**. (2) Alias manquants → **Complete Aliases**. (3) Reformulez — le LLM fait de la correspondance sémantique, pas une recherche par mot-clé.

**Puis-je modifier manuellement les pages Wiki ?**
Oui. Définissez `reviewed: true` dans le frontmatter pour protéger de l'écrasement. Les alias, tags et sources manuels sont préservés lors des fusions.

**Mise à niveau sécurisée ?**
Le plugin ne modifie jamais vos fichiers sources. Sauvegardez `wiki/` → mettez à jour le plugin → **Regenerate index** → **Lint Wiki** → corrigez sélectivement.

**Mes fichiers `sources/` ont été renommés après la mise à niveau vers v1.20.3 — y a-t-il un problème ? (v1.20.3+)**
Non — c'est la nouvelle empreinte de slug source anti-collision en action. Chaque `sources/<slug>.md` est désormais `sources/<nom_de_base>_<6 hex>.md` (le hex est un hash FNV-1a du chemin complet du fichier). Les fichiers ayant le même nom de base dans des dossiers différents (p. ex. 11× `About this course.md` dans les cours Academy) n'entrent plus en collision. La ré-ingestion renomme les pages `sources/` existantes sur place et tous les backlinks `[[sources/<slug>]]` sont mis à jour automatiquement. Si vous avez des scripts externes ou des marque-pages pointant vers `sources/<ancien-slug>.md`, mettez-les à jour vers les nouveaux chemins avec empreinte.

**La ré-ingestion d'une source non liée écrasera-t-elle une page verrouillée avec `reviewed: true` ? (v1.20.3+)**
Non — Stage 4 (`updateRelatedPage`) respecte désormais `reviewed: true` et route vers le chemin append-only, comme le chemin d'ingestion. Votre corps curé survit tel quel ; seuls les contenus véritablement nouveaux sont ajoutés.

**Mon modèle local (Ollama, LM Studio) fabrique des noms d'entités étranges à partir de notes vides ou avec uniquement du frontmatter. (v1.21.0)**
Corrigé en v1.21.0 par le portail de pré-ingestion : les notes vides/blanches/avec uniquement du frontmatter sont désormais rejetées *avant* tout appel LLM, et le déduplication par hash de contenu détecte les fichiers identiques à travers les chemins. Mettez à niveau vers v1.21.0+ pour éliminer cette classe de bugs « fichier vide → hallucination » (petits modèles qui inventent des noms d'entités sur un prompt vide).

**Comment obtenir de l'aide ?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — signaler des bugs
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — questions & retours

**Comment collecter les logs de débogage pour le dépannage ?**

1. Ouvrir les outils de développement (`Ctrl+Shift+I` / `Cmd+Option+I`)
2. Aller à l'onglet **Console**
3. Lancer votre opération (ingestion, requête ou lint)
4. Chercher les messages préfixés par un nom de module comme `[Step]`, `[LLM]`, ou un nom de module
5. Pour les tests locaux, utiliser `pnpm build:dev` au lieu de `pnpm build` afin de préserver la sortie de débogage complète
6. Copier les lignes de log pertinentes et les inclure dans votre issue GitHub — cela accélère considérablement le diagnostic

---

## 🔒 Transparence et conformité

Ce plugin est répertorié sur le marché des plugins communautaires Obsidian et fait l'objet d'une vérification automatisée de la sécurité et des autorisations.

**Le plugin n'a pas de backend, pas d'infrastructure serveur et aucune collecte de données d'aucune sorte.** C'est un logiciel purement local qui s'exécute dans Obsidian. Le plugin ne peut pas et ne collecte, stocke ou transmet vos données à aucun serveur — parce qu'un tel serveur n'existe pas.

**L'accès réseau** est utilisé uniquement pour communiquer avec le fournisseur LLM que vous configurez — aucun autre appel réseau n'est effectué. Cela est entièrement sous votre contrôle : vous choisissez le fournisseur, vous entrez la clé API, vous décidez où vont vos données.

**L'accès au système de fichiers** (énumération du coffre) est requis pour construire et maintenir le wiki : lire vos notes sources, générer des pages, analyser les liens morts et détecter les pages en double. Le plugin ne modifie jamais vos fichiers sources — uniquement les fichiers du dossier wiki.

**L'accès au presse-papiers** est utilisé exclusivement par le bouton « Copier » dans la fenêtre modale de requête, et uniquement lorsque vous cliquez dessus.

Si vous préférez une localité complète des données, utilisez un fournisseur LLM local tel qu'Ollama ou LM Studio. Avec un fournisseur local, vos données ne quittent jamais votre machine.

## 📜 Licence

MIT License — voir [LICENSE](LICENSE).

## 🙏 Remerciements

- **💡 Concept :** [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy — la vision originale ayant inspiré ce plugin
- **🛠️ Plateforme :** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 Transport LLM :** `requestUrl` d'Obsidian (Anthropic) + client HTTP compatible OpenAI codé à la main (fournisseurs tiers compatibles OpenAI)

**Closes:** #90 — Les pages source héritent désormais des tags du frontmatter de la note source au lieu de noms de concepts générés par LLM.
