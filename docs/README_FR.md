![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Plugin Obsidian

> Plugin Obsidian qui transforme vos notes en une base de connaissances interconnectee et questionnable — l'idee de [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) d'Andrej Karpathy, integree dans l'editeur ou vous ecrivez deja.

> **Recherche par graphe sans embedding • 10 langues natives • Fonctionne avec tous les fournisseurs**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | **Français** | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[Site officiel](https://llmwiki.greenerai.top/) | [Marketplace Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

📑 [Sommaire](#-sommaire) • 🚀 [Démarrage rapide](#-démarrage-rapide) • ✨ [Fonctionnalités](#-fonctionnalités) • 🔍 [Fonctionnement de la recherche](#-fonctionnement-de-la-recherche) • 🤖 [Modèles](#-modèles) • ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Si ce plugin t'a aidé, offre-moi un café♥️ ou dépose une étoile🌟↗

---

## 📑 Sommaire

- [Pourquoi ce plugin ?](#-pourquoi-ce-plugin-)
- [Est-ce pour moi ?](#-est-ce-pour-moi-)
- [Démarrage rapide](#-démarrage-rapide)
- [Fonctionnalités](#-fonctionnalités)
- [Fonctionnement de la recherche](#-fonctionnement-de-la-recherche)
- [Modèles](#-modèles)
- [FAQ](#-faq)
- [Confidentialité](#-confidentialité)
- [Soutien](#-soutien)
- [Licence et crédits](#-licence-et-crédits)

---

## 🤔 Pourquoi ce plugin ?

Vous prenez des notes. Elles restent dans des dossiers. Retrouver ce qui se relie à quoi signifie se souvenir de fils que vous avez perdus de vue il y a des mois.

**D'autres réimplémentations open-source de l'idée LLM Wiki de Karpathy existent — mais aucune ne se livre comme un plugin Obsidian en un clic.** La plupart sont des outils CLI, des skills Claude Code ou des applications de bureau séparées. Nous sommes le seul à proposer une UI native, un stockage dans le coffre et le Graph View natif d'Obsidian.

### Comparaison

| | Karpathy LLM Wiki (ce plugin) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **Format de livraison** | ✅ Plugin Obsidian en un clic | ❌ Application Tauri séparée | ❌ Skill Claude Code | ❌ Skill Claude Code / Codex | ❌ CLI + SDK + serveur MCP |
| **Effort d'installation** | ✅ **5 minutes** — Plugins communautaires → Installer → choisir un fournisseur → Ingester | ❌ 30 min+ — compiler/télécharger un binaire, configurer CLI | ❌ 15 min — nécessite abonnement Claude Code + installation skill | ❌ 10 min — nécessite abonnement Claude Code/Codex + configuration | ❌ 30 min+ — pip install + SDK + config MCP |
| **Chemin d'installation** | ✅ Obsidian → Plugins communautaires → rechercher → Installer | ❌ Compiler ou télécharger un binaire séparé, puis configurer CLI | ❌ Nécessite abonnement Claude Code + guide d'installation | ❌ Nécessite abonnement Claude Code ou Codex + étapes de configuration | ❌ pip install + Python SDK + serveur local |
| **Complexité architecturale** | ✅ **Zéro dépendance** — pas de BD vectorielle, pas de modèle d'embedding, pas de processus externe | 🟡 Embarque son propre runtime Python + sigma.js + sqlite | 🟡 Utilise l'environnement Claude Code — pas autonome | 🟡 Nécessite une plateforme d'exécution séparée | ❌ Nécessite Python, modèle d'embedding, BD vectorielle |
| **i18n (UI + sortie Wiki)** | ✅ 10 langues (UI / sortie indépendantes) | 🟡 2 (EN / 中文) | ❌ Anglais uniquement | ❌ Anglais uniquement | ❌ Anglais uniquement |
| **Fournisseurs LLM** | ✅ 12+ (dont Codex OAuth, Bedrock, LM Studio, Ollama, Anthropic-compatible, Kimi, GLM, MiniMax, DeepSeek) | 🟡 Compatible OpenAI | 🟡 Abonnement via Claude Code | 🟡 Abonnement via Claude Code / Codex | 🟡 Compatible OpenAI |
| **Algorithme de recherche** | ✅ Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 Heuristique 4 signaux (Adamic-Adar + décroissance 2-sauts) | ❌ Détection de communautés Louvain uniquement | ❌ Louvain + aperçus k-hop | ❌ Hybride : BM25 + sémantique + wikilink |
| **Pipeline de requête (cascade 5 étapes)** | ✅ Lex → mots-clés LLM → scan sous-chaîne → fallback LLM KB → expansion PPR (troncature dès signal suffisant) | 🟡 Décroissance 2-sauts uniquement | ❌ Clustering Louvain uniquement | ❌ Aperçus k-hop (sans augmentation LLM) | ❌ BM25 + sémantique sur chunks (sans graphe) |
| **Embeddings requis** | ✅ Non (zéro coût d'embedding, par conception) | 🟡 Optionnel, désactivé par défaut | ✅ Non | ✅ Non | ❌ **Oui — obligatoire** |
| **Visualisation du graphe** | ✅ Graph View natif d'Obsidian (intégré, zéro taille supplémentaire) | ❌ sigma.js + graphology personnalisés dans l'appli bureau | 🟡 graph.html vis.js (fichier séparé) | ❌ sigma.js HTML hors ligne personnalisé | ❌ Visualiseur navigateur lecture seule |
| **Honnêteté Wiki** | ✅ Bannière « Stage FALLBACK » quand aucune source wiki ne correspond à votre requête | ❌ Pas d'équivalent | ❌ Pas d'équivalent | ❌ Pas d'équivalent | ❌ Pas d'équivalent |
| **Benchmark de recherche publié** | ✅ PPR @5 = 27,1 % vs kNN pur 24,1 % (seul chiffre publié dans cet espace) | ❌ 58 % → 71 % *uniquement avec embeddings*, pas dans notre format comparable | ❌ Non publié | ❌ Non publié | ❌ Non publié |

### Trois choix délibérés, pas accidentels

- **🪟 Obsidian est l'environnement d'exécution.** Pas de terminal, pas d'application séparée, pas de Docker, pas de Python. Installez depuis les Plugins communautaires, cliquez sur Ingester, le wiki vit dans votre coffre dès la première seconde. Le Graph View natif d'Obsidian rend votre graphe de `[[wiki-links]]` — intégré, zéro taille de bundle supplémentaire.
- **🧭 Propre et autonome.** Zéro dépendance. Pas de modèle d'embedding, pas de base de données vectorielle, pas de package pip — un seul plugin qui lit vos notes, dialogue avec un LLM et écrit des pages wiki. Tout vit dans Obsidian.
- **🔌 N'importe quel modèle que vous payez déjà.** Anthropic, Bedrock, OpenAI, ChatGPT Plan (Codex OAuth), DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter, Anthropic-compatible, endpoint personnalisé — douze fournisseurs et plus, aucun n'a besoin d'un endpoint d'embedding.

---

## 🎯 Est-ce pour moi ?

**✅ Oui, si vous :**

- **Voulez une installation en 5 minutes, pas un projet de 5 heures.** Installez depuis les Plugins communautaires → choisissez un fournisseur → Ingérez une note. Pas de CLI, pas de Python, pas d'environnement d'exécution séparé, pas de BD vectorielle. Vous voyez des pages wiki dans `wiki/` en quelques secondes.
- **Voulez quelque chose de propre et autonome.** Le plugin a exactement zéro dépendance externe : pas de modèle d'embedding, pas de base de données vectorielle, pas de package pip, pas de conteneur Docker. C'est un seul plugin Obsidian qui lit vos notes, dialogue avec un LLM et écrit des pages wiki dans votre coffre. Tout vit dans Obsidian.
- **Voulez un chat questionnable qui répond à partir de *vos* notes** — pas d'Internet — chaque réponse étant accompagnée de `[[wiki-links]]` vers votre graphe de connaissances.
- **Tenez à la souveraineté des données** — fonctionne entièrement en local avec Ollama ou LM Studio, sans jamais toucher à Internet.
- **Écrivez ou lisez dans l'une des 10 langues prises en charge** — la langue de l'UI et celle du wiki sont indépendantes (votre wiki peut être en chinois pendant que l'interface est en anglais).
- **Maintenez le graphe en écrivant des `[[wiki-links]]`** — chaque lien que vous écrivez enrichit déjà la recherche ; aucune étape séparée de tagging/embedding/indexation.
- **Voulez une maintenance en un clic** — Lint (analyse de santé) + Smart Fix All maintiennent doublons, liens morts et pages orphelines sous contrôle sans curation manuelle.

**❌ Non, si vous :**

- **Voulez un remplacement généraliste de ChatGPT** — ce plugin répond uniquement à partir de *vos* connaissances.
- **Avez besoin d'un pipeline RAG sur des PDF / pages web / corpus externes** — nous nous concentrons sur le chemin dans le coffre (les PDF sont pris en charge depuis la v1.25.0).
- **Cherchez un SaaS hébergé** — il n'y a pas de backend, pas de serveur, pas de compte.

---

## 🚀 Démarrage rapide

1. **Installez.** Obsidian → Paramètres → Plugins communautaires → Parcourir → recherchez « Karpathy LLM Wiki » → Installer → Activer. Ou visitez la [page du plugin communautaire](https://community.obsidian.md/plugins/karpathywiki) et cliquez sur **Ajouter à Obsidian**.
2. **Configurez un fournisseur.** Ouvrez Paramètres → Karpathy LLM Wiki → choisissez un fournisseur (OpenAI, Anthropic, Ollama, ChatGPT Plan (Codex OAuth), etc.) → entrez la clé API (pas nécessaire pour le local) → cliquez sur **Test Connection** → Enregistrez.
3. **Ingérez une note.** `Cmd+P/Ctrl+P` → « Ingest single source » → choisissez n'importe quel fichier Markdown (ou PDF, v1.25.0+). Vos premières pages wiki apparaissent dans `wiki/sources/`, `wiki/entities/`, `wiki/concepts/` en quelques secondes.

C'est tout. Le plugin ne modifie rien dans vos notes originales — il crée uniquement de nouvelles pages dans `wiki/`. Pour discuter avec votre wiki : `Cmd+P/Ctrl+P` → « Query wiki ». (`Cmd` sur macOS, `Ctrl` sur Windows/Linux.)

### Commandes principales

| Commande | Action |
|----------|--------|
| **📥 Ingest single source** | `Cmd+P/Ctrl+P` → « Ingest single source » — choisissez un fichier Markdown ou **PDF (v1.25.0+)** pour obtenir des pages entité/concept/wiki |
| **📂 Ingest from folder** | `Cmd+P/Ctrl+P` → « Ingest from folder » — ingestion par lot de toutes les notes d'un dossier, avec saut intelligent de lot |
| **📑 Ingest multiple files** | `Cmd+P/Ctrl+P` → « Ingest multiple files » — sélectionnez un sous-ensemble via une arborescence à deux volets (file d'attente en direct + annulation par fichier) |
| **🔍 Query wiki** | `Cmd+P/Ctrl+P` → « Query wiki » — discutez avec votre wiki dans un panneau latéral droit ; les réponses sont accompagnées de `[[wiki-links]]` |
| **🛠️ Lint wiki** | `Cmd+P/Ctrl+P` → « Lint wiki » — analyse complète de santé : doublons, liens morts, pages vides, orphelines, alias manquants, contradictions |
| **⚡ Smart Fix All** | dans le modal Lint — réparation en un clic par ordre causal avec rapport par phase |
| **📋 Regenerate index** | `Cmd+P/Ctrl+P` → « Regenerate index » — reconstruit `wiki/index.md` avec les pages et alias actuels |
| **⏹ Cancel** | `Cmd+P/Ctrl+P` → « Cancel current ingestion » ou cliquez sur la barre d'état — s'arrête proprement à la prochaine limite de lot |
| **📊 Ingestion history** | `Cmd+P/Ctrl+P` → « View Ingestion History » — UI consultable pour les ingestions passées, rapports Lint et maintenances |

| Avant | Après |
|-------|-------|
| `notes/machine-learning.md` (un fichier plat) | `wiki/concepts/supervised-learning.md` avec `[[liens bidirectionnels]]`, alias, attribution de source et une entrée dans `wiki/index.md` |

> 💡 **Restez à jour.** Nouvelles fonctionnalités, correctifs et améliorations de performances sont fréquents. Paramètres → Plugins communautaires → Vérifier les mises à jour, ou activez les mises à jour automatiques des plugins.
> 📖 Les guides détaillés (installation, configuration PDF, notes multi-fournisseurs, mises à niveau) sont maintenus dans [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides).

---

## ✨ Fonctionnalités

### 📚 Qualité des connaissances

- **🔍 Extraction d'entités et de concepts** — Le LLM extrait les entités (personnes, organisations, produits, événements) et les concepts (théories, méthodes, termes) dans des pages autonomes. La granularité est configurable (Minimale → Fine, plus Personnalisée) pour équilibrer coût et profondeur.
- **🏷️ Alias obligatoires** — chaque page est livrée avec au moins un alias (traduction, abréviation, variante) pour que la détection de doublons inter-langues fonctionne.
- **🔄 Détection de doublons à plusieurs niveaux** — Niveau 1 (correspondance directe de nom : inter-langues, abréviations, titres de haute similarité) toujours vérifié ; Niveau 2 (liens partagés, similarité moyenne) remplit le budget de tokens restant.
- **🧩 Fusion intelligente et état des contradictions** — les doublons sont fusionnés en préservant les alias ; les contradictions sont signalées avec attribution de source ; les pages `reviewed: true` sont protégées contre l'écrasement.
- **🎨 Vocabulaire de tags personnalisable** — définissez vos propres listes de tags de type entité et concept dans Paramètres → Wiki → Vocabulaire de tags → *Personnalisé* ; Lint signale toute page dont les tags sortent du vocabulaire actif.

### 📄 Ingestion PDF (v1.25.0+)

- **🔌 Porte fournisseur** — Anthropic, OpenAI et Bedrock gèrent le PDF nativement. Pour tout autre endpoint compatible OpenAI/Anthropic, activez **Force PDF Support** dans Paramètres → Configuration LLM → Avancé pour que le plugin tente l'appel. Pour l'OCR local sur Apple Silicon, les extracteurs tiers (MinerU, Docling, Mathpix, Adobe) et le guide complet d'ingestion PDF, voir [Voies OCR PDF](#-voies-ocr-pdf) ci-dessous et [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md).
- **🗄️ Cache à croissance bornée** — `.obsidian/plugins/karpathywiki/pdf-cache/` stocke le Markdown converti, indexé par hash de contenu + modèle + version du convertisseur. Ménage à trois niveaux de défense : 100 Mo total / 1000 entrées / 10 Mo par entrée avec éviction LRU-by-mtime.
- **📝 Sidecar coffre optionnel** — Paramètres → Configuration Wiki → Dossier Wiki → *Write PDF Markdown to Vault* écrit `<basename>.pdf.md` à côté du PDF source (désactivé par défaut — cache uniquement).
- **🛡️ Invite de transcription textuelle** — Conversion style OCR avec marqueurs anti-hallucination `[illegible]` / `[figure: ...]` ; le wrapping dans des fences ```markdown par les petits modèles locaux est automatiquement nettoyé avant l'écriture en cache.

### 📄 Voies OCR PDF

Trois chemins, choisissez celui qui correspond à votre configuration :

1. **☁️ Fournisseur cloud avec support PDF natif** — Anthropic, OpenAI ou AWS Bedrock lisent les PDF directement. Il suffit d'ingérer ; aucune configuration supplémentaire. Pour tout autre endpoint compatible OpenAI/Anthropic, activez **Force PDF Support** dans Paramètres → Configuration LLM → Avancé pour que le plugin tente l'appel.
2. **🖥️ OCR local sur Apple Silicon** — [oMLX](https://github.com/jundot/omlx) intègre Microsoft Markitdown comme backend PDF→Markdown intégré. Activez Markitdown dans oMLX, chargez [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR) (3B / 570M actifs, open-source 2026-06) comme modèle de vision, pointez le plugin vers oMLX comme fournisseur personnalisé compatible OpenAI, activez **Force PDF Support** et choisissez le modèle multimodal servi par oMLX. Le PDF ne quitte jamais votre machine.
3. **🛠️ Extracteur tiers (MinerU, Docling, Mathpix, Adobe)** — exécutez un extracteur séparé sur vos PDF pour produire des fichiers `.md`, puis ingérez-les comme des notes Markdown standard via le pipeline normal du plugin. Plus fiable pour les articles scientifiques, documents scannés, PDF riches en mathématiques.

📖 **Guides d'installation complets** pour les trois chemins (fournisseurs cloud, niveaux matériels oMLX, installation MinerU, ménage du cache) → [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)

### 💬 Requête et maintenance

- **🧭 Cascade PPR en 5 étapes** — voir [Fonctionnement de la recherche](#-fonctionnement-de-la-recherche). Personalized PageRank sur le graphe `[[wiki-link]]` pour un contexte multi-hop conscient du graphe.
- **🪟 Panneau latéral ancré à droite** — Query Wiki s'ouvre dans un panneau latéral droit style Copilot (v1.22.1+) au lieu d'un modal centré.
- **🔍 Lint — analyse de santé** — une seule commande détecte : doublons, liens morts, pages vides, orphelines, alias manquants, contradictions.
- **⚡ Smart Fix All** — réparation en un clic par ordre causal : remplir les alias → fusionner les doublons → corriger les liens morts → relier les orphelines → développer les pages vides, avec rapport par phase.
- **📊 Panneau d'historique des opérations** — UI consultable et filtrable pour les ingestions passées, rapports Lint et maintenances.
- **🛡️ Portail de pré-ingestion** — les notes vides / blancs / uniquement du frontmatter sont rejetées avant tout appel LLM ; la déduplication par hash de contenu détecte les fichiers identiques à travers les chemins.

### 🔒 Confidentialité

- **🚫 Pas de backend, pas de suivi, pas d'analyse.** Fonctionne entièrement dans Obsidian. Le réseau est utilisé uniquement pour communiquer avec le fournisseur LLM que vous configurez.
- **📁 Les fichiers sources sont en lecture seule.** Le plugin ne modifie jamais vos notes originales du coffre — il crée uniquement de nouvelles pages dans `wiki/`.
- **🦙 Mode entièrement local.** Ollama, LM Studio ou tout endpoint local compatible OpenAI → vos notes ne quittent jamais votre machine.
- **🔐 Permissions minimales.** Accès aux fichiers du coffre pour la gestion du wiki. Accès au presse-papiers uniquement lorsque vous cliquez sur le bouton « Copier » dans le modal de requête.

### 🦙 Priorité au local

- **🖥️ Ollama, LM Studio, OpenRouter, endpoint personnalisé** — prêts à l'emploi. Les modèles locaux fonctionnent pour les requêtes (fenêtres de contexte plus petites) ; l'ingestion d'un coffre de 2000 pages nécessite généralement un modèle cloud à long contexte.
- **📄 La voie OCR PDF est entièrement locale sur Apple Silicon** — voir [Voies OCR PDF](#-voies-ocr-pdf) ci-dessous.
- **🔐 ChatGPT Plan (Codex OAuth)** — rappel localhost sur `127.0.0.1:1455` sur ordinateur ; mobile via code d'appareil. Les identifiants vivent uniquement dans Obsidian SecretStorage ; la déconnexion les efface. Compatibilité tierce Codex, pas un partenariat OpenAI.

### 🌐 Langue

- **🌍 10 langues d'interface** — English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. La langue de l'UI et celle du wiki sont indépendantes — votre wiki peut être en chinois pendant que l'interface est en anglais.
- **📚 10 langues de sortie wiki** — même ensemble ; choisissez dans Paramètres → Configuration Wiki. Option *Custom input* pour les invites ad-hoc.
- **🈶 269+ chaînes UI traduites** — chaque label, modal et notice. L'ajout d'une 11e langue est piloté par les contributeurs (modèle PR #159).

---

## 🔍 Fonctionnement de la recherche

La plupart des plugins de « recherche IA » fragmentent vos notes en morceaux et les intègrent dans une base de données vectorielle. Pas nous. L'argument de Karpathy contre le RAG est que le découpage brise la capacité du LLM à raisonner sur l'ensemble de votre graphe de connaissances — et cet argument se vérifie en pratique. Au lieu de cela, nous parcourons le graphe que vous maintenez déjà en écrivant des `[[wiki-links]]`.

### La cascade de sélection de graines en 5 étapes

Quand vous demandez « Qui a fondé Microsoft ? », Query Wiki exécute cinq étapes avant toute génération de réponse :

1. **Chemin rapide Lex** — chevauchement direct de tokens contre chaque titre d'entité/concept et alias. Gratuit, instantané, et l'étape de filtrage pour tout ce qui suit.
2. **Génération de mots-clés LLM** — le LLM propose 8 à 12 mots-clés inter-langues à partir de votre requête (gère les synonymes, abréviations et termes résistants au chevauchement de tokens en un seul appel LLM).
3. **Scan local de sous-chaînes** — chaque mot-clé généré est re-matché localement contre les titres de pages, alias et extraits de corps. Aucun appel LLM supplémentaire ; complète le rappel tolérant au bruit.
4. **Fallback LLM KB** — quand lex + scan de mots-clés renvoient des signaux faibles, le LLM ré-ensemence les N meilleurs candidats avec une passe sémantique sur l'ensemble du wiki.
5. **Expansion de graphe PPR** — Personalized PageRank (Haveliwala 2002) sur le graphe `[[wiki-link]]` à partir de l'ensemble de graines candidates. C'est ce qui donne le contexte multi-hop conscient du graphe : « Bill Gates » → « Microsoft » → « concurrents », pas seulement un chevauchement littéral de titres.

La cascade se tronque à l'étape qui a renvoyé suffisamment de signal — pas de coût fixe de 5 étapes, pas d'appels LLM quand lex est suffisant, pas de perte de précision quand l'augmentation LLM est nécessaire.

### Personalized PageRank à l'échelle

Nous utilisons Monte Carlo PPR (Fogaras 2005) — 3000 marches aléatoires × 50 pas chacune — avec la règle de cul-de-sac de Haveliwala 2002. Le coût est **O(K × L)** indépendant du nombre de pages, donc un coffre de 2000 pages a la même latence d'expansion qu'un coffre de 200 pages.

**PPR @5 = 27,1 % vs baseline kNN pur 24,1 %** sur le corpus de benchmark du projet (le seul benchmark de recherche publié dans cet espace open-source LLM-Wiki).

### Pourquoi pas d'embeddings

Nous avons délibérément rejeté la voie des embeddings dans [Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175). Le signal du graphe est déjà là — chaque `[[wiki-link]]` est une arête « ces pages sont liées » curated manuellement, et la plupart des fournisseurs que nous supportons (Ollama, LM Studio, Anthropic, Bedrock, Kimi, GLM, MiniMax) n'ont pas du tout d'endpoint `/v1/embeddings`. Ajouter un modèle d'embedding signifierait un téléchargement par page, un adaptateur par fournisseur et zéro bénéfice sur la qualité de recherche.

---

## 🤖 Modèles

**Fournisseurs pris en charge (12+, vérifiés cross-check models.dev 2026-07) :**

| Fournisseur | Séries | Notes |
|------------|--------|-------|
| **Anthropic** | Claude 5 series | PDF natif ; protocole `/v1/messages` |
| **OpenAI** | GPT-5.6 series (Sol / Terra / Luna) | PDF natif ; clé API Platform |
| **Google Gemini** | Gemini 3.6 series | PDF natif (file parts depuis 1.5) ; endpoint compatible OpenAI |
| **DeepSeek** | DeepSeek V4 series | Compatible OpenAI ; niveau de coût le plus bas |
| **Alibaba Qwen** | Qwen3.7/3.8 series | Compatible OpenAI (DashScope) |
| **xAI Grok** | Grok 4 series | Compatible OpenAI ; long contexte |
| **Moonshot Kimi** | Kimi K3 series | Compatible OpenAI ; 2,8T MoE frontière |
| **Zhipu GLM** | GLM-5 series | Compatible OpenAI ; fort bilingue |
| **MiniMax** | MiniMax M3 series | Compatible OpenAI ; 1M contexte |
| **Step (阶跃星辰)** | Step 3 series (Flash) | Compatible OpenAI ; inférence rapide |
| **Tencent Hunyuan** | Hy3 series | Compatible OpenAI ; MoE open-weight |
| **Xiaomi MiMo** | MiMo V2.5 series | Open-source MIT ; tarification plate |
| **Google Gemma** | Gemma 4 series | Open-weight ; contexte 262K |
| **AWS Bedrock** | Variantes Anthropic + OpenAI | VPC / conformité |
| **ChatGPT Plan (Codex OAuth)** | API Codex Responses | Connexion navigateur/code d'appareil ; SecretStorage |
| **Local : Ollama, LM Studio, OpenRouter, Anthropic-Compatible** | Tout modèle protocole OpenAI/Anthropic | Custom OpenAI-Compatible + Anthropic-Compatible (Token Plan / Coding Plan) |

Ce plugin alimente le LLM avec le contexte complet de votre Wiki par requête — donc **les modèles à long contexte gagnent**. Le tableau complet des niveaux (cloud + local) se trouve dans [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md), vérifié par recoupement avec [models.dev](https://models.dev/) pour que les choix restent à jour.

### Ce qui compte

- **🧠 Fenêtre de contexte ≥ 200K tokens** pour les coffres de plus de ~500 pages. En dessous de 200K, le contexte assemblé par la cascade commence à être tronqué.
- **⚖️ La qualité de suivi des instructions** importe plus que le QI brut pour la tâche d'extraction — choisissez un modèle qui suit le modèle de schéma, pas le plus grand numéro du classement.
- **🔌 L'endpoint d'embedding n'a pas d'importance** — nous n'utilisons pas d'embeddings. Un fournisseur sans `/v1/embeddings` est parfait (c'est le cas de la plupart de nos 12+ fournisseurs).
- **🦙 Local pour les requêtes, cloud pour l'ingestion** — l'ingestion sur un coffre de 2000 pages nécessite généralement un modèle cloud à long contexte ; un modèle local 262K couvre la plupart des requêtes.

### Anthropic vs OpenAI vs Codex OAuth — ce sont des fournisseurs distincts

- **Anthropic** (et sa variante Bedrock) — clé API Anthropic Platform facturée séparément.
- **OpenAI** — clé API OpenAI Platform facturée séparément.
- **ChatGPT Plan (Codex OAuth)** — fournisseur expérimental distinct qui utilise une allocation Codex éligible après connexion par navigateur ou code d'appareil ; la disponibilité suit les politiques d'authentification et d'allocation OpenAI Codex, pas le nom du forfait. Compatibilité tierce Codex, pas un partenariat OpenAI ou une API ChatGPT générale.

> 📖 **Tableau de sélection complet** (cloud + local + PDF OCR + Codex OAuth + quantification + niveaux matériels) → [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)

## ❓ FAQ

### Que fait exactement le plugin ?

Choisissez n'importe quelle note, dossier ou sélection ; le LLM extrait les entités et concepts et génère un wiki interconnecté avec des `[[liens bidirectionnels]]`. Posez des questions et obtenez des réponses conversationnelles fondées sur *vos* notes, pas sur Internet. Vos notes originales du coffre ne sont jamais modifiées.

### Comment commencer ?

Installez depuis les Plugins communautaires Obsidian → choisissez un fournisseur → **Test Connection** → exécutez **Ingest single source** sur n'importe quelle note. Les premières pages wiki apparaissent en quelques secondes. Voir [Démarrage rapide](#-démarrage-rapide).

### Mon wiki existant est-il sûr ?

✅ Rétrocompatible depuis la v1.0.0. Définissez `reviewed: true` sur n'importe quelle page pour la protéger contre l'écrasement. La mise à niveau depuis v1.24.x ne réécrit pas votre coffre ; l'ingestion PDF v1.25.0 est en cache uniquement par défaut.

### Mes données sont-elles envoyées quelque part ?

🚫 Pas de backend, pas d'analyse — le plugin fonctionne entièrement dans Obsidian. Seul le texte que vous envoyez explicitement pour ingestion/requête quitte votre appareil, et uniquement vers le fournisseur LLM que vous configurez. Pour une localité complète des données, utilisez Ollama ou LM Studio.

### Puis-je utiliser le plugin dans ma langue ?

🌍 10 langues pour l'interface et la sortie wiki. La langue de l'UI et celle du wiki sont indépendantes. L'ajout d'une 11e langue est piloté par les contributeurs (modèle PR #159).

### En quoi est-ce différent d'un chatbot RAG ?

🚫 Pas de découpage. 🚫 Pas d'embeddings. 🚫 Pas de BD vectorielle. ✅ Personalized PageRank sur votre graphe `[[wiki-link]]` existant — contexte multi-hop conscient du graphe, zéro coût d'embedding, support complet des modèles locaux.

### Quel LLM dois-je utiliser ?

Les modèles à long contexte (≥200K tokens) fonctionnent le mieux. La [section Modèles](#-modèles) couvre les principes ; le tableau complet des niveaux se trouve dans [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md).

### Existe-t-il un benchmark publié ?

Oui — PPR @5 = 27,1 % vs baseline kNN pur 24,1 % sur le corpus du projet. Le pipeline complet et le script de benchmark sont décrits dans [Fonctionnement de la recherche](#-fonctionnement-de-la-recherche).

### Comment contrôler les coûts d'API ?

Utilisez la granularité d'extraction Grossière ou Minimale pour l'ingestion par lots. Smart Batch Skip détecte automatiquement les fichiers déjà ingérés. La maintenance automatique est DÉSACTIVÉE par défaut. Lint montre les compteurs avant d'exécuter les corrections — rien n'est facturé sans votre approbation.

### Comment annuler une opération en cours ?

Cliquez sur la barre d'état (affiche « Ingestion… cliquer pour annuler ») ou `Cmd+P/Ctrl+P` → « Cancel current ingestion ». S'arrête proprement à la prochaine limite de lot.

### Où obtenir de l'aide ?

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) pour les signalements de bugs · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) pour les questions et demandes de fonctionnalités · Console développeur (`Ctrl+Shift+I` / `Cmd+Option+I`) pour les logs du plugin.

---

## 🔒 Confidentialité

Ce plugin est répertorié sur le marché des plugins communautaires Obsidian et fait l'objet d'une vérification automatisée de la sécurité et des autorisations.

- **🚫 Pas de backend, pas de serveur, pas de collecte de données.** Logiciel purement local fonctionnant dans Obsidian. Le plugin ne peut pas et ne collecte, stocke ou transmet vos données à aucun serveur — parce qu'un tel serveur n'existe pas.
- **🔐 L'accès réseau est sur option.** Utilisé uniquement pour communiquer avec le fournisseur LLM que vous configurez. Vous choisissez le fournisseur, vous entrez la clé API, vous décidez où vont vos données.
- **📁 L'accès aux fichiers du coffre** est utilisé pour la gestion du wiki (lecture des notes, génération de pages, analyse des liens morts, détection des doublons). Le plugin ne modifie jamais vos fichiers sources.
- **📋 L'accès au presse-papiers** est utilisé exclusivement par le bouton « Copier » dans le modal de requête — et uniquement lorsque vous cliquez dessus.

Pour une localité complète des données, utilisez Ollama ou LM Studio. Avec un fournisseur local, vos données ne quittent jamais votre machine.

---

## 💖 Soutien

Si LLM-Wiki est devenu une partie importante de votre flux de travail de connaissances :

- ☕ **[Offrez-moi un café sur Ko-fi](https://ko-fi.com/greenerdalii)** — ponctuel ou mensuel
- 💳 **[Pourboire via PayPal](https://paypal.me/greenerdalii)** — pourboire ponctuel

Le sponsoring est entièrement facultatif. Le plugin reste sous licence Apache-2.0 et complet en fonctionnalités.

Merci à [@jameses-cyber](https://github.com/jameses-cyber) et [@issaqua](https://github.com/issaqua) pour leur soutien au projet.

---

## 📜 Licence et crédits

Apache License, Version 2.0 — voir [LICENSE](LICENSE) et [NOTICE](NOTICE).

**Construit avec :**
- 💡 [LLM Wiki d'Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — le concept original
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) et [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — algorithmes de recherche

**Mainteneur :** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
