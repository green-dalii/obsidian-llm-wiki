![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Plugin Obsidian

> Base de connaissances structurée alimentée par IA. Ingestion automatique des notes et génération d'un Wiki interconnecté — inspiré du concept de [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy.

> **Note officielle Obsidian 95/100 | Support natif de 10 langues | Recherche par graphe sans embedding | Souveraineté totale des données | Compatible avec tout fournisseur LLM**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | **Français** | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[Site officiel](https://llmwiki.greenerai.top/) | [Marketplace Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Retour d'expérience](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorer le code avec DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Si ce plugin t'a aidé, offre-moi un café♥️ ou dépose une étoile🌟↗

---

> **⚡ Avis de mise à jour rapide：** Ce projet évolue rapidement – corrections de bugs, améliorations de performances, nouvelles fonctionnalités et optimisations UX sont fréquentes. Nous vous recommandons de mettre à jour régulièrement dans Obsidian (**Paramètres → Plugins communautaires → Vérifier les mises à jour**) ou d'activer la mise à jour automatique des plugins.

## 📑 Contents

- [🧠 Karpathy LLM Wiki — Plugin Obsidian](#-karpathy-llm-wiki--plugin-obsidian)
  - [📑 Contents](#-contents)
  - [💡 Présentation](#-présentation)
  - [⚡ Pourquoi Obsidian + LLM-Wiki ?](#-pourquoi-obsidian--llm-wiki-)
  - [🚀 Démarrage rapide](#-démarrage-rapide)
    - [📦 Installation](#-installation)
    - [🔄 Mise à jour](#-mise-à-jour)
    - [🔑 Configurer un fournisseur LLM](#-configurer-un-fournisseur-llm)
    - [🎮 Utilisation](#-utilisation)
    - [⚠️ Mise à niveau depuis une ancienne version ?](#️-mise-à-niveau-depuis-une-ancienne-version-)
  - [⚡ Nouveautés de la v1.24.0](#-nouveautés-de-la-v1240)
  - [✨ Fonctionnalités](#-fonctionnalités)
    - [📊 Qualité des connaissances](#-qualité-des-connaissances)
    - [🛠️ Maintenance](#️-maintenance)
    - [💬 Query et feedback](#-query-et-feedback)
    - [🌐 LLM et langue](#-llm-et-langue)
    - [🏗️ Architecture et performance](#️-architecture-et-performance)
    - [🔒 Confidentialité et sécurité](#-confidentialité-et-sécurité)
  - [📖 Exemple](#-exemple)
  - [🤖 Guide de sélection de modèle](#-guide-de-sélection-de-modèle)
  - [🏗️ Architecture](#️-architecture)
  - [❓ FAQ](#-faq)
  - [🔒 Transparence et conformité](#-transparence-et-conformité)
  - [💖 Soutenir le projet](#-soutenir-le-projet)
    - [Sponsors](#sponsors)
  - [📜 Licence](#-licence)
  - [🙏 Remerciements](#-remerciements)
  - [Star History](#star-history)

## 💡 Présentation

Vous écrivez. L'IA organise. Vous interrogez. Rien de plus.

**🎯 Le problème.** Vos notes constituent une mine d'informations — personnes, concepts, idées, connexions. Pourtant, elles ne sont que des fichiers dans des dossiers. Identifier les liens entre elles nécessite de chercher, taguer et espérer retrouver le fil.

**✨ La solution.** [Andrej Karpathy a proposé](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) une approche élégante : traiter vos notes comme des matières premières et confier à un LLM le rôle d'architecte. Il analyse vos écrits, extrait les Entity et Concept, puis les intègre dans un Wiki structuré — doté de `[[Wiki-links]]` bidirectionnels, d'un index auto-généré et d'une interface conversationnelle répondant aux questions à partir de *vos* connaissances.

**📚 Libérez-vous du rôle de bibliothécaire.** Plus besoin de décider ce qui mérite une page. Plus besoin de maintenir les liens croisés. Plus besoin de vérifier l'obsolescence. Choisissez n'importe quelle note (ou dossier, ou sélection multiple) de votre vault — le LLM lit, extrait, rédige, relie et signale les contradictions — pendant que vous restez concentré sur l'essentiel.

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
2. Choisissez un fournisseur dans le menu déroulant, notamment OpenAI ou ChatGPT Plan (Codex OAuth)
3. Pour un fournisseur API, entrez sa clé (inutile pour Ollama, LM Studio ou ChatGPT Plan (Codex OAuth))
4. Pour les fournisseurs autres que Codex, utilisez **Fetch Models** ou saisissez un modèle ; ChatGPT Plan (Codex OAuth) remplit automatiquement sa liste de modèles sélectionnés
5. Cliquez sur **Test Connection**, puis **Enregistrer les paramètres**

**🦙 Ollama (local) :** Installez [Ollama](https://ollama.com), téléchargez un modèle, sélectionnez « Ollama (Local) ».

**🎛️ LM Studio (local) :** Installez [LM Studio](https://lmstudio.ai), démarrez le serveur local, sélectionnez « LM Studio (Local) ».

**🔐 ChatGPT Plan (Codex OAuth) — expérimental :** Ce fournisseur est distinct d'**OpenAI**, qui utilise une clé API OpenAI Platform facturée séparément. Sélectionnez-le, puis utilisez **Se connecter avec le navigateur** sur ordinateur (rappel localhost) ou **Utiliser un code d’appareil** sur ordinateur/mobile et terminez l'autorisation sur la page OpenAI. Le plugin synchronise les modèles sélectionnables du compte Codex connecté et ne met en cache que des métadonnées nettoyées ; **Actualiser les modèles du compte** permet de les mettre à jour. En cas d'indisponibilité temporaire, le dernier cache ou une liste de secours minimale reste disponible. Testez ensuite la connexion et enregistrez. Les identifiants OAuth sont stockés uniquement dans Obsidian SecretStorage ; **Se déconnecter** les efface. La disponibilité suit les politiques d'authentification, de modèles et de quota d'OpenAI Codex. Il s'agit d'une compatibilité tierce, pas d'un partenariat OpenAI ni d'une API ChatGPT générale.

### 🎮 Utilisation

| Méthode | Comment |
|---------|---------|
| **📥 Ingestion d'une source unique** | `Cmd+P` → « Ingest single source » — sélectionnez une note pour générer des pages Wiki avec entités et concepts |
| **📂 Ingestion depuis un dossier** | `Cmd+P` → « Ingest from folder » — sélectionnez un dossier pour générer le Wiki en lot depuis toutes les notes |
| **📑 Importer plusieurs fichiers** | `Cmd+P` → « Ingest multiple files » — choisissez des fichiers via l'arborescence + cases à cocher, puis ingestion (avec file d'attente + annulation par fichier) |
| **🎯 Ingestion du fichier actuel** | Cliquez sur l'icône `sticker` dans le ruban gauche, ou `Cmd+P` → « Ingest current file » |
| **🔍 Interroger le wiki** | `Cmd+P` → « Query wiki » — Q&R conversationnelle avec streaming et `[[wiki-links]]` |
| **🛠️ Vérifier le wiki** | `Cmd+P` → « Lint wiki » — bilan complet : doublons, liens morts, pages vides, orphelines, alias manquants, contradictions |
| **📋 Régénérer l'index** | `Cmd+P` → « Regenerate index » — reconstruit `wiki/index.md` avec les alias |
| **📊 Historique d'ingestion (v1.21.0)** | `Cmd+P` → « View Ingestion History » — parcourez les ingestions, rapports Lint et maintenances passés |
| **⏹ Annuler l'opération** | `Cmd+P` → « Cancel current ingestion » — arrêt propre à la prochaine limite de lot |
| **🎉 Recréer la note de bienvenue (v1.23.0)** | `Cmd+P` → « Recreate Wiki Welcome Note » — regénère la note de bienvenue |

La ré-ingestion d'une même source fusionne les nouvelles informations de manière incrémentielle. Les résumés sont regénérés.

> 💡 **Smart Batch Skip :** Lors de l'ingestion d'un dossier, le plugin détecte et ignore automatiquement les fichiers déjà traités — économise du temps et des coûts d'API.

![Palette de commandes — recherchez "karpa" pour voir toutes les commandes](assets/command-panel.png)

### ⚠️ Mise à niveau depuis une ancienne version ?

> 🔧 **Mise à niveau depuis v1.24.0.** Le marqueur de commentaire interne `<!-- reviewed: keep -->` (v1.24.0, #244), qui protégeait uniquement la section *Mentions in Source* d'une page, a été supprimé. Pour conserver une section Mentions organisée manuellement, définissez `reviewed: true` dans le frontmatter de la page : elle protège toute la page (Mentions comprises) et, contrairement au commentaire masqué, reste visible dans le panneau Propriétés et résiste aux linters Markdown.

**Rétrocompatible.** Aucun changement cassant depuis la v1.0.0 — vos pages Wiki, paramètres et flux de travail existants sont préservés sans reconfiguration.

**Après la mise à niveau**, exécutez **Lint Wiki** → **Smart Fix All** pour une réparation automatique en ordre causal :
1. 🏷️ Compléter les aliases (l'LLM génère traductions, acronymes, noms alternatifs)
2. 🔄 Fusionner les doublons (multilingue, abréviations, haute similarité)
3. 🔗 Réparer les liens morts / relier les orphelins / compléter les pages vides

Puis **Régénérer l'index** pour reconstruire `wiki/index.md` avec les entrées d'alias et activer la recherche sensible aux alias (par exemple, "DSA" trouve "DeepSeek-Sparse-Attention").

> 📖 Les guides de mise à niveau détaillés pour des sauts de version spécifiques (v1.20.3 empreinte de slug, v1.16.0 liens doublement imbriqués) sont maintenus dans [GitHub Discussions / Upgrading](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Paramètres à vérifier :** Langue de sortie du Wiki (indépendante de l'UI), Granularité d'extraction (Minimal–Fin + Personnalisé), Concurrence de génération de pages (défaut 3), Délai de batch (défaut 300ms).

---
## ⚡ Nouveautés de la v1.24.0

Cinq thèmes : modèles par tâche, instructions de requête personnalisées, quatre fractionnements de monolithe, propagation des alias de notes sources, corrections frontmatter rapportées par les utilisateurs. Mise à niveau recommandée pour tous les utilisateurs de v1.23.x.

- **🎛️ Modèles par tâche (#208).** Choisissez un modèle différent pour **Ingestion / Lint / Requête**, ou gardez-les unifiés. Paramètres → Wiki → *Portée du modèle* bascule en un clic. Le bouton **Tester la connexion** sonde désormais chaque modèle configuré séquentiellement avec échec rapide — tant que tous les modèles par tâche ne réussissent pas, la connexion n'est pas considérée comme saine.
- **📝 Instructions de requête personnalisées (#251, `jameses-cyber`).** Un panneau pliable dans la vue Query Wiki vous permet d'ajouter des instructions persistantes à chaque prompt système — mode recherche, style de citation, règles « pas de fabrication », etc. Plafond défensif de 5000 caractères. Strictement limité au chat Query Wiki ; l'ingestion / le lint / la génération de pages ne sont intentionnellement pas affectés. Menu déroulant de modes prévu pour v1.25.0+.
- **🧱 Quatre fractionnements de monolithe (suite P0 de la série v1.23.0).** `controller.ts` (PR #248), `history-modal.ts` (PR #249, 1579 → 14 fichiers, 93 tests), `query-engine.ts` (PR #250, 1373 → 15 fichiers), `modals.ts` (PR #257, 1008 → 7 fichiers) — chaque fonction-dieu / classe-dieu décomposée en modules ciblés. Le plugin est maintenant structurellement prêt pour la prochaine série de fonctionnalités.
- **🏷️ Propagation des alias de notes sources (#185).** Les `aliases:` de frontmatter des notes sources circulent désormais vers les pages `sources/<slug>` générées, pour que l'appariement en aval `[[wiki-link]]` et la recherche sensible aux alias atteignent chaque citation. Réduit les manques de type « DSA ≠ DeepSeek-Sparse-Attention ».
- **🔀 Triage de fusion Tier-1 + Tier-2 (#216, `DocTpoint`).** Décision de contournement des doublons par classification-puis-routage : ignorer directement les candidats Tier-1 parasites, n'exécuter Tier-2 que sur le reste. Réduit la taille du lot de fusion Lint sans sacrifier les correspondances haute précision.
- **🐛 Réparation d'écriture frontmatter (4 bugs signalés par les utilisateurs).** `aliases:[]` n'est plus faussement détecté comme déficient en alias ; les alias en double sont repliés à l'écriture ; le frontmatter en bloc est préservé (non aplati en inline) ; les échecs sont maintenant journalisés avec le champ fautif. Affecte les chemins Smart Fix et fusion.
- **🚀 Préchauffage PPR de première requête dans Query Wiki.** Cache de graphe PPR au niveau moteur (invalidation au changement de `wikiFolder` + purge du cache lors de `invalidatePageCaches`) — la première requête utilise désormais Personalized PageRank au lieu de retomber sur lex-only au démarrage à froid.
- **🌐 Complétude i18n** — 7 nouvelles clés par locale pour les sélecteurs de modèle par tâche, le menu déroulant de portée du modèle, et les étiquettes du Test de connexion.

**Paramètres à vérifier :** Portée du modèle (Unifié / Par tâche, dans Paramètres → Wiki), champs de modèle par tâche (visibles uniquement en mode Par tâche), panneau pliable ⚙ Instructions personnalisées Query Wiki (uniquement dans la vue).

## ✨ Fonctionnalités

### 📊 Qualité des connaissances

- **🔍 Extraction Entity/Concept** — Le LLM extrait les Entity (personnes, organisations, produits, événements) et les Concept (théories, méthodes, termes) de vos notes avec granularité d'extraction flexible (Minimale~5 éléments, Grossière~10, Standard~50, Fine~100, Personnalisée 1–500) pour équilibrer profondeur d'analyse et coûts API
- **🏷️ Mandatory Page Aliases** — Chaque page générée inclut au moins un alias (traduction, acronyme, nom alternatif), permettant la détection de doublons inter-langues
- **🔄 Détection et fusion de doublons** — Le Semantic Tiering identifie les vrais doublons (traductions inter-langues, abréviations, variantes orthographiques) ; la fusion intelligente par LLM consolide le contenu et préserve les alias
- **🧩 Smart Knowledge Fusion** — Les mises à jour multi-sources fusionnent les nouvelles informations sans redondance, préservent les contradictions avec attribution, et protègent les pages `reviewed: true` de l'écrasement
- **📏 Content Truncation Protection** — 8000 max_tokens avec détection automatique de stop_reason et retry à 2× tokens pour tous les providers
- **📝 Verbatim Source Mentions** — Préservation des citations en langue originale avec traduction optionnelle pour traçabilité

- **🎨 Vocabulaire de tags personnalisable (v1.18.0).** Paramètres → Wiki → Mode de vocabulaire de tags → *Personnalisé* vous permet de définir vos propres listes de tags de type entité et concept (par ex. `Medical_Arzneimittel`, `法规`). Le plugin respecte votre vocabulaire dans les prompts d'extraction et la validation du frontmatter ; l'audit Lint (Issue #85 v7) signale toute page dont les tags sortent du vocabulaire actif.

### 🛠️ Maintenance

- **🔍 Lint Health Scan** — Détection des doublons, liens morts, pages vides, pages orphelines, alias manquants et contradictions dans un rapport complet
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (correspondances directes de noms : inter-langues, abréviations, titres de haute similarité) toujours vérifié ; Tier 2 (signaux indirects : liens partagés, similarité modérée) selon le budget de tokens
- **⚡ Smart Fix All** — Correction par batch ordonnée par causalité : alias complétés → doublons fusionnés → liens morts résolus → orphelins reliés → pages vides complétées
- **🏷️ Alias Completion** — Génération parallèle par batch des alias manquants en un clic, améliorant la détection future de doublons
- **🔄 Auto-Maintenance** — Surveillance de dossiers multiples, Lint périodique, vérification de santé au démarrage (Startup Quick Fixes activé par défaut, File Watcher et Periodic Lint désactivés par défaut)
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved` (correction IA) ou `detected → pending_fix` (manuel)
- **🛡️ Portail de pré-ingestion (v1.21.0)** — Chaque fichier source est validé *avant* tout appel LLM : les notes vides/blanches/avec uniquement du frontmatter sont rejetées ; le déduplication par hash de contenu détecte les fichiers identiques à travers les chemins. Empêche les modèles locaux d'halluciner des noms d'entités sur des entrées vides.
- **📊 Panneau d'historique des opérations (v1.21.0)** — UI consultable et filtrable pour les ingestions passées, rapports de lint et exécutions de maintenance, avec cartes KPI pilotées par l'insight et liens cliquables vers les pages.
- **🧹 Nettoyeur de pages incomplètes (v1.21.0)** — Les pages laissées dans un état partiel après des ingestions interrompues sont automatiquement archivées au démarrage (récupérables depuis la `.trash` d'Obsidian).

### 💬 Query et feedback

- **🤖 Conversational Query** — Dialogue style ChatGPT avec Markdown streaming et `[[Wiki-links]]`, historique multi-tours
- **🪟 Panneau latéral ancré à droite (v1.22.1, PR #196).** Query Wiki s'ouvre dans un panneau latéral droit de style Copilot (en réutilisant un panneau existant) au lieu d'une popup centrée. L'icône ribbon `message-circle` et la commande `Query Wiki` activent/affichent le panneau ; vos notes restent visibles à côté de la conversation. Toutes les fonctionnalités sont conservées sans changement.
- **📤 Query-to-Wiki Feedback** — Sauvegarde des conversations pertinentes dans le Wiki avec extraction Entity/Concept et déduplication sémantique préalable
- **🔒 Duplicate Save Prevention** — Le suivi par hash empêche la ré-évaluation des conversations inchangées

### 🌐 LLM et langue

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, endpoints personnalisés
- **🔄 5xx Retry** — Retry automatique avec backoff exponentiel (max 2) sur les erreurs HTTP 5xx/429/529 pour tous les clients
- **📋 Dynamic Model List** — Récupération en temps réel depuis les APIs des providers
- **🌐 Langue de sortie du Wiki** — 10 langues indépendantes de l'UI (EN/ZH simplifié/ZH traditionnel/JA/KO/DE/FR/ES/PT/IT), avec entrée personnalisée.
- **🌍 Internationalisation complète de l'UI** — Interface du plugin en 10 langues (EN/ZH simplifié/ZH traditionnel/JA/KO/DE/FR/ES/PT/IT), 269+ champs UI entièrement traduits, expressions locales naturelles.
- **⚡ Rate Limit Guardian** — Quand la génération parallèle déclenche des rate limits, auto-détection et suggestions : réduire la concurrence, augmenter le délai batch, changer de provider
- **🦙 Web Clipper Compatible** — Ajout en un clic du dossier `Clippings/` d'Obsidian Web Clipper à la watchlist, clips web auto-ingérés dans le Wiki

### 🏗️ Architecture et performance

- **⚡ Parallel Page Generation** — 1–5 pages concurrentes configurables, défaut 3 (parallèle), 2–3× plus rapide pour les grandes sources, isolation des erreurs par page
- **📚 Iterative Batch Extraction** — Taille de batch adaptative élimine le goulot d'étranglement max_tokens pour les documents longs
- **🏛️ Three-Layer Architecture** — Vos notes du vault (lecture seule) → `wiki/` (pages générées par le LLM, organisées en `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`) → `schema/` (config co-évoluée)
- **🧩 Modular Codebase** — 20+ modules focalisés dans `src/`

### 🔒 Confidentialité et sécurité

- **Pas de backend, pas de télémétrie.** Le plugin fonctionne entièrement dans Obsidian — aucun serveur externe, aucune analyse, aucune collecte de données d'aucune sorte. Vos notes ne quittent jamais votre coffre-fort, sauf si vous configurez explicitement un fournisseur LLM.
- **Vos données restent locales par défaut.** Le plugin ne stocke, ne met en cache ni ne transmet votre contenu ailleurs que vers l'API LLM que vous avez choisie. Seul le texte que vous envoyez pour ingestion ou requête quitte votre appareil — et uniquement vers le fournisseur que vous avez configuré.
- **Mode entièrement local avec Ollama, LM Studio ou fournisseurs locaux.** Pour une souveraineté totale des données, utilisez un LLM exécuté localement. Vos notes sont traitées entièrement sur votre machine — rien ne touche Internet.
- **Permissions minimales.** L'accès aux fichiers du coffre est requis pour la gestion du wiki (lecture des notes, génération de pages, détection de liens morts). L'accès réseau est utilisé exclusivement pour les appels API LLM vers le fournisseur que vous avez choisi. L'accès au presse-papiers se limite au bouton « Copier » dans la fenêtre modale de requête — uniquement lorsque vous cliquez dessus.

---


---

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

> 💡 **Séparation de facturation OpenAI :** **OpenAI** utilise une clé Platform facturée séparément. **ChatGPT Plan (Codex OAuth)** est un fournisseur expérimental distinct qui utilise un quota Codex éligible après connexion par navigateur ou code d'appareil ; le nom du forfait ne garantit pas sa disponibilité.

---

## 🏗️ Architecture

Le design à trois couches de Karpathy :

```
📄 Vos notes du vault (dossier quelconque)   # 📖 Vous choisissez quelles notes ingérer
  ↓ ingest
wiki/                                          # 🧠 Pages Wiki générées par le LLM (wiki/sources/, wiki/entities/, wiki/concepts/)
  ↓ query / maintain
schema/                                        # 📋 Configuration de la structure du Wiki
```

> 📖 Voir la structure complète du code dans [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure).

**Pages générées :**
- `wiki/sources/fichier.md` — 📄 Résumé de la source
- `wiki/entities/nom-entite.md` — 👤 Pages d'entités (personnes, organisations, projets, etc.)
- `wiki/concepts/nom-concept.md` — 💡 Pages de concepts (théories, méthodes, termes, etc.)
- `wiki/index.md` — 📑 Index auto-généré
- `wiki/log.md` — 📝 Journal d'opérations


---

## ❓ FAQ

> **Gardez votre plugin à jour.** Exécutez **Paramètres → Plugins communautaires → Vérifier les mises à jour** régulièrement.
>
> 📖 Plus de FAQ sur [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

**Que fait exactement ce plugin ?**
Choisissez n'importe quelle note, dossier ou sélection multiple de votre vault ; le LLM extrait les entités et concepts et génère un Wiki interconnecté avec `[[liens wiki]]`. Obtenez des réponses conversationnelles depuis *vos* notes — pas de recherche Internet. Les résumés générés vivent sous `wiki/sources/`, les entités sous `wiki/entities/`, les concepts sous `wiki/concepts/` — vos notes originales du vault ne sont jamais modifiées.

**Mes données sont-elles envoyées à des tiers ?**
🔒 **Confidentialité d'abord.** Pas de backend, pas de suivi, pas d'analyse — le plugin tourne entièrement dans Obsidian. Seul le texte que vous envoyez explicitement quitte votre appareil. Pour une localité complète des données, utilisez un fournisseur local (Ollama ou LM Studio sans clé API).

**En quoi est-ce différent des chatbots RAG ?**
Contrairement au RAG qui fragmente le contexte, LLM-Wiki utilise un moteur **Personalized PageRank** sur votre graphe de `[[wiki-link]]`s existant — trouvant les pages connexes via la structure de liens, pas des embeddings vectoriels. Zéro coût d'embedding, aucune nouvelle dépendance.

**Quel LLM choisir ?**
Les modèles à long contexte (≥200K tokens) fonctionnent le mieux. Options économiques : DeepSeek V4-Flash ($0.14/M), Gemini 3.5 Flash, Qwen3.6-Plus. Les modèles locaux (Ollama/LM Studio) fonctionnent pour les requêtes mais ont des fenêtres de contexte plus petites (8K–128K).

**Comment commencer ?**
Installez depuis les plugins communautaires Obsidian → choisissez un fournisseur LLM → **Test Connection** → exécutez **Ingest single source** (ou **Ingest from folder**) sur n'importe quelle note de votre vault → vos premières pages Wiki apparaissent en secondes. Voir [Démarrage rapide](#-démarrage-rapide) ci-dessus.

**Comment contrôler les coûts d'API ?**
Utilisez la granularité Grossière ou Minimale pour l'ingestion par lots (moins d'appels LLM). Smart Batch Skip détecte automatiquement les fichiers déjà traités. La maintenance automatique est désactivée par défaut.

**Mon Wiki existant est-il sûr ?**
✅ Rétrocompatible depuis v1.0.0. Définissez `reviewed: true` sur une page pour la protéger contre l'écrasement. Le plugin ne modifie jamais vos notes originales du vault — il génère uniquement de nouvelles pages dans le dossier `wiki/`.

**Puis-je utiliser le plugin dans ma langue ?**
🌐 **10 langues** pour l'interface et la sortie Wiki : English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. La langue de l'interface et celle du Wiki sont indépendantes.

**Configuration minimale ?**
Obsidian v1.11.4+ (ordinateur ou mobile). Une clé API LLM, un modèle Ollama/LM Studio local ou des identifiants ChatGPT Plan (Codex OAuth) autorisés sont requis. Le verrou **llmReady** nécessite un test de connexion avant de débloquer les fonctionnalités principales.

**Comment annuler une opération en cours ?**
Cliquez sur le texte de la barre d'état ou `Cmd+P` → « Cancel current ingestion ». Arrêt propre à la prochaine limite de lot.

**Où obtenir de l'aide ?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — signaler un bug
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — questions et retours
- Console développeur (`Ctrl+Shift+I`) — copier les logs pour un diagnostic plus rapide

## 🔒 Transparence et conformité

Ce plugin est répertorié sur le marché des plugins communautaires Obsidian et fait l'objet d'une vérification automatisée de la sécurité et des autorisations.

**Le plugin n'a pas de backend, pas d'infrastructure serveur et aucune collecte de données d'aucune sorte.** C'est un logiciel purement local qui s'exécute dans Obsidian. Le plugin ne peut pas et ne collecte, stocke ou transmet vos données à aucun serveur — parce qu'un tel serveur n'existe pas.

**L'accès réseau** est utilisé uniquement pour communiquer avec le fournisseur LLM que vous configurez — aucun autre appel réseau n'est effectué. Cela est entièrement sous votre contrôle : vous choisissez le fournisseur, vous entrez la clé API, vous décidez où vont vos données.

**L'accès au système de fichiers** (énumération du coffre) est requis pour construire et maintenir le wiki : lire vos notes sources, générer des pages, analyser les liens morts et détecter les pages en double. Le plugin ne modifie jamais vos fichiers sources — uniquement les fichiers du dossier wiki.

**L'accès au presse-papiers** est utilisé exclusivement par le bouton « Copier » dans la fenêtre modale de requête, et uniquement lorsque vous cliquez dessus.

Si vous préférez une localité complète des données, utilisez un fournisseur LLM local tel qu'Ollama ou LM Studio. Avec un fournisseur local, vos données ne quittent jamais votre machine.

## 💖 Soutenir le projet

Si LLM-Wiki est devenu une partie importante de votre flux de travail de connaissances, vous pouvez soutenir son développement continu :

- ☕ **[Offrez-moi un café sur Ko-fi](https://ko-fi.com/greenerdalii)** — soutien ponctuel ou mensuel via Ko-fi
- 💳 **[Pourboire via PayPal](https://paypal.me/greenerdalii)** — pourboire ponctuel via PayPal

Le sponsoring est entièrement facultatif. Le plugin reste sous licence Apache-2.0 et complet en termes de fonctionnalités.

### Sponsors

Merci aux personnes suivantes pour leur soutien au projet :

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 Licence

Apache License 2.0 — voir [LICENSE](LICENSE) et [NOTICE](NOTICE).

## 🙏 Remerciements

- **💡 Concept :** [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy — la vision originale ayant inspiré ce plugin
- **🛠️ Plateforme :** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 Transport LLM :** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
