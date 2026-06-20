![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> AI-powered structured knowledge base that ingests your notes and generates a connected Wiki — based on [Andrej Karpathy's LLM Wiki concept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Obsidian official score 95/100** | Native support for 9 languages | Actively maintained, continuously evolving

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-9-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

**English** | [中文文档](docs/README_CN.md) | [日本語](docs/README_JA.md) | [한국어](docs/README_KO.md) | [Deutsch](docs/README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md) | [Italiano](docs/README_IT.md)

[Official Site](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback & Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explore Repo with DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ Quick Update Reminder:** This project evolves rapidly with frequent bug fixes, performance improvements, new features, and UX optimizations. We recommend updating to the latest version regularly in Obsidian (**Settings → Community plugins → Check for updates**), or enabling automatic plugin updates to ensure the best experience.
## 📑 Contents

- [💡 What is LLM-Wiki?](#-what-is-llm-wiki)
- [⚡ Why Obsidian + LLM-Wiki?](#-why-obsidian--llm-wiki)
- [🚀 Quick Start](#-quick-start)
  - [📦 Installation](#-installation)
  - [🔄 Updating](#-updating)
  - [🔑 Configure an LLM Provider](#-configure-an-llm-provider)
  - [🎮 Usage](#-usage)
  - [⚠️ Upgrading from an Older Version?](#️-upgrading-from-an-older-version)
- [⚡ What's New in v1.20.3](#-whats-new-in-v1203)
- [✨ Features](#-features)

  - [📊 Knowledge Quality](#-knowledge-quality)
  - [🛠️ Maintenance](#️-maintenance)
  - [💬 Query & Feedback](#-query--feedback)
  - [🌐 LLM & Language](#-llm--language)
  - [🏗️ Architecture & Performance](#️-architecture--performance)
  - [🔒 Privacy & Security](#-privacy--security)
- [⌨️ Commands](#️-commands)
- [📖 Example](#-example)
- [🤖 Model Selection Guide](#-model-selection-guide)
- [🏗️ Architecture](#️-architecture)
- [❓ FAQ](#-faq)
  - [💡 General](#-general)
  - [🏷️ Aliases & Duplicates](#️-aliases--duplicates)
  - [⚡ Performance & Cost](#-performance--cost)
  - [🧹 Maintenance](#-maintenance)
  - [🔍 Troubleshooting](#-troubleshooting)
- [🔒 Transparency & Compliance](#-transparency--compliance)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
---

## 💡 What is LLM-Wiki?

You write. AI organizes. You ask. That's it.

**🎯 The problem.** Your notes are a goldmine — people, concepts, ideas, connections. But right now they're just files in folders. Finding what relates to what means searching, tagging, and hoping you remember the thread.

**✨ The fix.** [Andrej Karpathy suggested](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) something elegant: treat your notes as raw material, and let an LLM do the architect work. It reads what you write, pulls out entities and concepts, and weaves them into a structured Wiki — complete with `[[bidirectional links]]`, an auto-generated index, and a chat interface that answers questions from *your* knowledge.

**📚 So you don't have to be the librarian.** No deciding what deserves a page. No maintaining cross-links. No wondering if something is out of date. Drop notes into `sources/` and the LLM reads, extracts, writes, links, and even flags contradictions — while you stay in flow.

**🤖 And it's not another chatbot.** ChatGPT knows the internet. LLM-Wiki knows *you* — or rather, what you've taught it. Every answer carries `[[wiki-links]]` back into your knowledge graph. Every response is a trailhead, not a dead end.

---

## ⚡ Why Obsidian + LLM-Wiki?

Obsidian is brilliant at linked thinking. But there's a catch: you're the one doing all the linking.

LLM-Wiki flips that. Instead of you building the graph by hand, the AI grows it with you. Add a note about a new concept — it finds the connections you'd miss. Ask a question — it walks your own knowledge graph and brings back answers with citations.

- **🔗 Your Graph View comes alive.** New notes don't just sit there — they sprout links to entities, concepts, and sources. The graph grows organically, and the plugin maintains it: detecting duplicates, fixing dead links, bridging languages with aliases.
- **💬 Your notes learn to talk back.** Search becomes conversation. "What did I write about X?" becomes a dialogue, with streaming responses and `[[wiki-links]]` as breadcrumbs. Every answer is a path deeper into your own knowledge.
- **🧠 Obsidian becomes a thinking partner.** It stops being a cabinet for notes and starts being something that helps you *think* — surfacing hidden connections, flagging contradictions, remembering what you forgot you knew.

---

## 🚀 Quick Start

### 📦 Installation

**🌟 Recommended — Obsidian Community Plugin Market:**

1. In Obsidian, go to **Settings → Community plugins**
2. Click **Browse** and search for "Karpathy LLM Wiki"
3. Click **Install**, then **Enable**

**🌐 Or from the Community Plugin website —** visit [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) and click **Add to Obsidian** to install directly.

**⚙️ Manual (alternative):**

1. Download `main.js`, `manifest.json`, `styles.css` from [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. In Obsidian, go to Settings → Community plugins. On the **Installed plugins** tab, click the folder icon to open your plugins directory
3. Create a folder named `karpathywiki`, drop the three files inside
4. Back in Obsidian, click the refresh icon — **Karpathy LLM Wiki** will appear under Installed plugins
5. Toggle it on to enable

**🔨 Development:** `git clone`, `pnpm install`, `pnpm build`.

### 🔄 Updating

This project evolves rapidly — new features, bug fixes, and improvements are shipped frequently. We recommend keeping up to date:

**Option A — Manual update (recommended):**
1. Go to **Settings → Community plugins**
2. Click **Check for updates**
3. Find **Karpathy LLM Wiki** in the list and click **Update**

**Option B — Enable auto-update:**
1. Go to **Settings → Community plugins**
2. Toggle on **Automatically check for plugins updates**
3. New versions will be detected automatically; update manually at your convenience

> 💡 **Why stay updated?** Each release may include new features, performance improvements, and important bug fixes. We actively maintain this plugin — missing updates means missing out on a better experience.

### 🔑 Configure an LLM Provider

1. Open Settings → Karpathy LLM Wiki
2. Pick a provider from the dropdown (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter, or custom)
3. Enter your API key (not needed for Ollama)
4. Click **Fetch Models** to populate the model dropdown, or type a model name manually
5. Click **Test Connection**, then **Save Settings**

**🦙 Ollama (local, no API key):** Install [Ollama](https://ollama.com), pull a model (`ollama pull gemma4` or `ollama pull qwen3.5:27b`), select "Ollama (Local)" in the provider dropdown.

**🎛️ LM Studio (local, no API key):** Install [LM Studio](https://lmstudio.ai), start its local server (default `http://localhost:1234/v1`), select "LM Studio (Local)" in the provider dropdown. LM Studio runs a built-in OpenAI-compatible server — API key field is optional.

> See [Model Selection Guide](#-model-selection-guide) for details.

### 🎮 Usage

| Method | How |
|--------|-----|
| **📥 Ingest single source** | `Cmd+P` → "Ingest single source" — select a note to extract entities and concepts into Wiki pages |
| **📂 Ingest from folder** | `Cmd+P` → "Ingest from folder" — pick a folder, batch generate Wiki from all notes inside |
| **🔍 Query wiki** | `Cmd+P` → "Query wiki" — ask questions, get streaming answers with `[[wiki-links]]` |
| **🛠️ Lint wiki** | `Cmd+P` → "Lint wiki" — health scan: duplicates, dead links, empty pages, orphans, missing aliases |
| **📋 Regenerate index** | `Cmd+P` → "Regenerate index" — rebuild `wiki/index.md` with current pages and aliases |
| **💡 Suggest schema updates** | `Cmd+P` → "Suggest schema updates" — LLM analyzes Wiki and proposes schema improvements |
| **🎯 One-click ingest** | Click the `sticker` icon in the left sidebar or `Cmd+P` → "Ingest current file" — directly ingest the file you're editing |

Re-ingesting the same source does incremental updates on entity/concept pages (new info merged in). Summary pages are regenerated.

**💡 Smart Batch Skip:** When ingesting a folder, the plugin automatically detects already-processed files and skips them to save time and API costs. The batch report shows skipped count.

### ⚠️ Upgrading from an Older Version?

**This release is fully backward-compatible.** No breaking changes since v1.0.0 — your existing wiki pages, settings, and workflows are preserved. No reconfiguration or data migration needed.

**Upgrading to v1.20.3 from any earlier version**: source-page slugs are now fingerprinted (every `sources/<slug>.md` becomes `sources/<basename>_<6hex>.md`). On your next ingest, existing `sources/` pages are renamed in place and all `[[sources/<slug>]]` backlinks update automatically — no action required, but the file rename may briefly appear in your Obsidian file explorer. If you have external scripts or bookmarks that reference `sources/<slug>.md` paths directly, update them to use the new fingerprinted names.

**If your existing Wiki was built across many versions**, some pages may lack recent capabilities (aliases, alias-aware dedup, modernized prompts). Run **Lint Wiki** to see what needs attention. Smart Fix All handles the most common cleanups in one click.

**If upgrading from a version before v1.16.0**, run **Lint Wiki** once to automatically fix historical issues:
- **Double-nested links** `[[[[entities/Foo|Foo]]]]` in log.md — Lint detects and fixes these with zero LLM cost
- **Cross-directory stub duplicates** — pages that exist in both `entities/` and `concepts/` with the same slug are now correctly matched

**For wikis built across many versions**, follow these steps to bring your Wiki up to current standards:

**1️⃣ Rebuild your index**
`Cmd+P` → **"Regenerate index"** — This rebuilds `wiki/index.md` with alias entries for every page, enabling alias-aware search (e.g., searching "DSA" finds "DeepSeek-Sparse-Attention"). The old index format only listed page titles.

**2️⃣ Run Lint wiki**
`Cmd+P` → **"Lint wiki"** — This scans your entire Wiki and shows:
- **🏷️ Missing aliases**: Pages without aliases (any version, if you never ran "Complete Aliases"). Click **"Complete Aliases"** — the LLM generates translations, acronyms, and alternate names in bulk. This is critical for duplicate detection.
- **🔄 Duplicate pages**: Pages with overlapping content (e.g., "CoT" vs "思维链" created by older versions that didn't have alias-aware dedup). Click **"Merge Duplicates"** to fuse them and preserve all aliases.
- **💀 Dead links / Empty pages / Orphans**: Standard wiki maintenance issues.

**3️⃣ Use Smart Fix All**
Click **"Smart Fix All"** in the Lint report for a one-click, causality-ordered repair: aliases completed → duplicates merged → dead links fixed → orphans linked → empty pages expanded. This is the fastest way to clean up a wiki built across many versions.

**4️⃣ Enable parallel page generation**
Settings → **LLM Configuration**:
- **⚡ Page Generation Concurrency**: Set to 3 for most providers. Speeds up ingestion 2–3× on sources with 10+ entities.
- **⏱️ Batch Delay**: Start at 300ms. Increase to 500–800ms if you hit rate limits.

**5️⃣ Review current settings:**
- **🌐 Wiki Output Language**: Independent from UI language — your Wiki can be in Chinese while the plugin UI stays in English, or vice versa.
- **📊 Extraction Granularity**: Five options control how deeply the LLM extracts entities from sources:
  - **Fine** (~100 items) — Deep analysis, edge-case mentions included. High token cost, best for key sources.
  - **Standard** (~50 items) — Balanced extraction. Good default for daily notes.
  - **Coarse** (~10 items) — Quick overview, core entities only. Low cost, fast ingestion.
  - **Minimal** (~5 items) — Essential items only. Ideal for batch processing 100+ files or testing new sources.
  - **Custom** (1–300 items) — User-defined entity/concept limits for specialized workflows.
  > 💡 **Recommendation**: Use Minimal or Coarse for large folders to save time and API costs. Use Fine selectively on key documents that warrant deep analysis.
- **🔄 Auto-Maintenance**: Startup Quick Fixes defaults ON (one-time startup health check); File Watcher and Periodic Lint default OFF — enable only if you want automatic background processing.

> **🛡️ Safety**: Parallel generation uses `Promise.allSettled` — if one page fails, others continue. Failed pages are retried individually with exponential backoff. Smart Batch Skip automatically detects already-ingested files to save time and API costs.

---

## ⚡ What's New in v1.20.3

v1.20.3 is a **PATCH hotfix** that fixes three latent bugs in the wiki write path. No new features — all three fixes are parity/latent-bug fixes that restore behavior that *should* have been there from the start.

- **🔧 Source-slug collision fix (Issue #155, PR #156).** When two source files shared a basename across folders (e.g. 11× `About this course.md` across Academy courses), `slugify(basename)` produced the same slug for both — second ingest silently overwrote the first, and every `[[sources/<slug>]]` backlink resolved to the wrong source. Fix: every source slug is now `<basename>_<6hex FNV-1a of full path>`. Re-ingesting an existing vault renames its `sources/` pages; backlinks update in place. Contributed by @Indexed-Apogrypha.
- **🔧 `mergeFrontmatter` alias dedup (PR #154).** Repeated re-ingests could grow the `aliases` array without bound — one real-world page accumulated the same alias block ~15× (86 duplicate lines). `mergeFrontmatter` now dedups `fm.aliases` parity with `enforceFrontmatterConstraints`. Contributed by @DocTpoint.
- **🔧 Stage-4 `reviewed: true` guard (PR #158).** Re-ingesting an unrelated note could LLM-rewrite a curated `reviewed: true` page's body — the reviewed lock did not hold on the Stage-4 path, only on `createOrUpdatePage`. Fix: `updateRelatedPage` now routes `reviewed: true` pages to `appendToReviewedPage`. Contributed by @DocTpoint.
- **🛠 tsconfig housekeeping.** `lib` bumped to ES2021; vestigial `baseUrl` dropped.

We strongly recommend all users upgrade to this version, especially if you ingest multiple notes sharing filenames across folders, or use the `reviewed: true` page lock.

See [CHANGELOG.md](CHANGELOG.md) for full details.

## ✨ Features

### 📊 Knowledge Quality

- **🔍 Entity/Concept extraction** — LLM extracts entities (people, organizations, products, events, etc.) and concepts (theories, methods, terms, etc.) from your notes and generates standalone Wiki pages. Flexible extraction granularity (minimal ~5, coarse ~10, standard ~50, fine ~100, custom 1–500) balances analysis depth with API cost.
- **🏷️ Mandatory page aliases** — every generated page includes at least 1 alias (translation, abbreviation, variant) for cross-language duplicate detection.
- **🔄 Duplicate detection & merge** — semantic tiered detection catches true duplicates (cross-language translations, abbreviations, spelling variants); smart LLM fusion merges content while preserving aliases.
- **🧩 Intelligent knowledge fusion** — multi-source updates merge new information without duplication; contradictions are preserved with source attribution; `reviewed: true` pages are protected from overwrite.
- **📏 Content truncation guard** — 8000 max_tokens with automatic stop_reason detection and 2× token retry, covering all providers.
- **📝 Original quote preservation** — Mentions-in-Source sections preserve quotes in their original language (optional translation) for full traceability.

### 🛠️ Maintenance

- **🔍 Lint health scan** — single comprehensive report detects: duplicate pages, dead links, empty pages, orphans, missing aliases, contradictions.
- **🎯 Tiered semantic duplicate detection** — Tier 1 (direct name match: cross-language, abbreviation, high-similarity titles) always verified; Tier 2 (indirect signals: shared links, medium similarity) fills token budget.
- **⚡ One-click Smart Fix All** — batch fixes in causal order: fill aliases → merge duplicates → fix dead links → link orphans → expand empty pages, with per-phase popup report.
- **🏷️ Alias completion** — one-click parallel batch generation of missing aliases, improving future duplicate detection.
- **🔄 Auto-maintenance** — multi-folder watching, scheduled Lint, startup health check (all optional).
- **⚠️ Contradiction state machine** — `detected → review-passed → resolved` (AI-fix) or `detected → unresolved` (manual).

### 💬 Query & Feedback

- **🤖 Conversational query** — ChatGPT-style dialog with streaming Markdown output, automatic `[[wiki-links]]`, and multi-turn history.
- **📤 Query → Wiki feedback** — save valuable conversations back into the Wiki, with entity/concept extraction and pre-save semantic dedup.
- **🔒 Duplicate-save guard** — hash tracking prevents unchanged conversations from re-evaluating.

### 🌐 LLM & Language

- **🔌 Multi-provider support** — Anthropic, Anthropic-compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, custom endpoint.
- **🔄 5xx auto-retry** — exponential backoff on HTTP 5xx / 429 / 529 across all clients (max 2 retries).
- **📋 Dynamic model list** — fetched live from the provider API.
- **🌐 Wiki output language** — 9 languages independent of UI (English / 中文 / 日本語 / 한국어 / Deutsch / Français / Español / Português / Italiano), with custom input option.
- **🌍 Full UI internationalization** — plugin UI in 9 languages with 269+ UI fields fully translated to natural local expression.
- **⚡ Rate-limit guardian** — automatically detects when parallel generation triggers rate limits and prompts to lower concurrency, increase batch delay, or switch provider.
- **🦙 Web Clipper compatibility** — one-click addition of the official Obsidian Web Clipper's `Clippings/` folder to the watch list; clipped web pages auto-ingest into the Wiki.

### 🏗️ Architecture & Performance

- **⚡ Parallel page generation** — configurable 1–5 concurrent pages, default 3 (parallel), 2–3× speedup on large sources; per-page error isolation.
- **📚 Iterative batched extraction** — adaptive batch sizing eliminates the long-document max_tokens bottleneck.
- **🏛️ Three-layer architecture** — `sources/` (read-only) → `wiki/` (LLM-generated) → `schema/` (co-evolved configuration).
- **🧩 Modular codebase** — 20+ focused modules in `src/`.

### 🔒 Privacy & Security

- **No backend, no tracking.** The plugin runs entirely inside Obsidian — no external servers, no analytics, no data collection of any kind. Unless you actively configure an LLM provider, your notes never leave your vault.
- **Data stays local by default.** The plugin does not store, cache, or transmit your content anywhere outside of the LLM API you have chosen. Only the text you send for ingestion or query leaves your device — and only to the provider you configured.
- **Full local mode via Ollama, LM Studio, or local providers.** For complete data sovereignty, use a locally running LLM. Your notes are processed entirely on your machine — never touching the internet.
- **Minimal permissions.** Vault file access is used for Wiki management (reading notes, generating pages, detecting dead links). Network access is used only for communicating with your chosen LLM provider's API. Clipboard access is limited to the "Copy" button in the Query modal — used only when you click it.

---

## ⌨️ Commands

| Command | Description |
|---------|-------------|
| **📥 Ingest single source** | Select a note → generate Wiki pages with entities, concepts, and summary |
| **📂 Ingest from folder** | Select a folder → batch generate Wiki from existing notes |
| **🔍 Query wiki** | Conversational Q&A over your Wiki, streaming responses with `[[wiki-links]]` |
| **🛠️ Lint wiki** | Full health scan: duplicates, dead links, empty pages, orphans, missing aliases, contradictions |
| **📋 Regenerate index** | Manually rebuild `wiki/index.md` |
| **💡 Suggest schema updates** | LLM analyzes Wiki and proposes schema improvements |

---

## 📖 Example

**Input:** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Output — Concept page:** `wiki/concepts/supervised-learning.md`

```markdown
---
type: concept
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

## 🤖 Model Selection Guide

This plugin follows Karpathy's philosophy: **feed the LLM full Wiki context, not chunked RAG retrieval**. Long-context models are strongly recommended — the larger your Wiki grows, the more context the LLM needs.

> 💡 **Why not RAG?** Karpathy's [original critique](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) argues that RAG fragments knowledge and breaks the LLM's ability to reason across the full knowledge graph.

**💰 Value-First Strategy:** You don't need flagship models. The following **cost-effective alternatives** deliver excellent results at lower prices:

| Tier | Model | Context | Why |
|------|-------|---------|-----|
| **🌟 Value Pick** | **DeepSeek V4-Flash** | 1M tokens | Lowest cost ($0.14/M), 284B MoE, ideal for batch ingestion |
| **🌟 Value Pick** | **Gemini-3.5-Flash** | 1M tokens | 4× faster output than GPT-5.5, great for agent tasks |
| **🌟 Value Pick** | **Qwen3.6-Plus** | 1M tokens | Strong coding & agentic capabilities, competitive pricing |
| **🌟 Value Pick** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **Balanced** | **Claude Sonnet 4.6** | 1M tokens | Great quality/cost balance, $3/$15 per million tokens |
| **Lightweight** | **Claude Haiku 4.5** | 200K tokens | Fast and affordable for smaller wikis |
| **Budget** | **Xiaomi MiMo-V2.5** | 1M tokens | Xiaomi 310B/15B MoE, MIT open-source 2026-04, agent & multimodal |
| **Flagship** | Claude Opus 4.7 | 1M tokens | Ultimate quality, higher cost — use selectively |
| **Flagship** | GPT-5.5 | 1M tokens | Top reasoning, higher cost — use selectively |

For local models (Ollama): context windows are typically smaller (8K–128K). Consider using a cloud provider for ingestion + local model for query.

**🔌 Anthropic Compatible (Coding Plan):** If your provider offers an Anthropic-compatible API endpoint, select "Anthropic Compatible" and enter your provider's Base URL and API Key.

> 💡 **Subscription plans:** Coding Plan, OpenAI Pro, or Anthropic Pro plans are excellent options for cost control with frequent use. This plugin supports these services.

---

## 🏗️ Architecture

Karpathy's three-layer separation design:

```
sources/     # 📄 Your source documents (read-only)
  ↓ ingest
wiki/        # 🧠 LLM-generated Wiki pages
  ↓ query / maintain
schema/      # 📋 Wiki structure configuration (naming, templates, categories)
```

**Codebase** (`src/`):

```
wiki/               # Wiki engine modules
  wiki-engine.ts    # 🎯 Orchestrator
  query-engine.ts   # 💬 Conversational query
  source-analyzer.ts # 📊 Iterative batch extraction
  page-factory.ts   # 🏗️ Entity/concept CRUD + merge
  lint-controller.ts # 🔍 Lint orchestration
  lint-fixes.ts     # 🛠️ Fix logic for dead links, empty pages, orphans
  lint/             # Lint sub-modules
    duplicate-detection.ts  # 🔄 Programmatic candidate generation
    fix-runners.ts          # ⚡ Batch fix execution helpers
    scanners.ts            # 🔍 Scanners (dead links, orphans, aliases)
  contradictions.ts # ⚠️ Contradiction detection
  system-prompts.ts # 🗣️ Language directive + section labels
schema/             # Schema co-evolution
  schema-manager.ts # 📋 Schema CRUD + suggestions
  auto-maintain.ts  # 🔄 File watcher + periodic lint
ui/                 # User interface
  settings.ts       # ⚙️ Settings panel
  modals.ts         # 📦 Lint/Ingest/Query modals
+ shared modules: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Generated pages:**
- `wiki/sources/filename.md` — 📄 Source summary
- `wiki/entities/entity-name.md` — 👤 Entity pages (people, orgs, projects, etc.)
- `wiki/concepts/concept-name.md` — 💡 Concept pages (theories, methods, terms, etc.)
- `wiki/index.md` — 📑 Auto-generated index
- `wiki/log.md` — 📝 Operation log

---

## ❓ FAQ

> **Keep your plugin updated.** This project ships frequently — new features and fixes land every few days. Run **Settings → Community Plugins → Check for updates** regularly.
>
> For more, see the [FAQ Discussion on GitHub](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

### 💡 General

**What does the plugin actually do?**
You drop notes in, it extracts people, concepts, and theories, then generates an interlinked wiki with `[[bidirectional links]]`. Ask questions and get answers grounded in *your* notes — not internet hallucinations.

**Minimum requirements?**
Obsidian v1.11.0+, desktop (Windows/macOS/Linux), an LLM provider API key. Ollama works locally with no API key. See [Configure an LLM Provider](#-configure-an-llm-provider) above.

**Which model should I use?**
See [Model Selection Guide](#-model-selection-guide) above. Long-context models work best — the larger your wiki, the more context the LLM needs.

### 🏷️ Aliases & Duplicates

**Why does Lint show "missing aliases" on almost all my pages?**
Pages generated before v1.7.11 didn't include aliases. This is harmless — aliases are an enhancement, not a bug. Click **Complete Aliases** in the Lint report to batch-generate translations, acronyms, and alternate names. Once aliases exist, duplicate detection and alias-aware search become much more effective.

**Why do I see duplicate pages like "CoT" and "思维链"?**
Pre-v1.7.10 versions lacked alias-aware duplicate detection. Run **Lint Wiki** → **Merge Duplicates** to fuse them. The merged page preserves aliases from both, preventing future duplicates.

**How does duplicate detection work? (v1.7.10+)**
Two-tier semantic detection: Tier 1 (always LLM-verified) catches cross-language matches, abbreviations, high-similarity titles. Tier 2 fills remaining token budget with moderate-similarity candidates. Aliases are critical for Tier 1 — run **Complete Aliases** if your pages are pre-v1.7.11.

**What are "polluted pages"? (v1.9.0)**
Pages with folder prefixes accidentally baked into filenames — e.g. `concepts/concepts布局优化.md`. Run **Lint Wiki** → **🧹 Fix Polluted Pages** to rename and update all incoming links.

### ⚡ Performance & Cost

**How do I speed up ingestion?**
In **Settings → LLM Configuration**: increase **Page Generation Concurrency** to 3–5 (parallel page creation), lower **Batch Delay** to 100–300ms (watch for rate limits). Choose "Minimal", "Coarse", or "Standard" **Extraction Granularity** to reduce page count and save API costs.

**Why am I getting HTTP 429 errors?**
The plugin auto-detects rate-limiting and suggests: lower concurrency to 1–2, increase Batch Delay to 500–800ms, or switch to a higher-limit provider.

**How do I control API costs?**
- Auto-Maintenance is OFF by default (enable only if you need background processing)
- Smart Batch Skip automatically skips already-ingested files
- "Standard" or "Coarse" granularity = fewer LLM calls
- Batch Delay > 500ms spaces calls without increasing token usage
- Lint report shows counts before you run fixes — decide what's worth it

### 🧹 Maintenance

**What does Smart Fix All do?**
Runs fixes in causality order (v1.9.0+):
1. 🧹 Fix polluted pages → 2. 🏷️ Complete aliases → 3. 🔄 Merge duplicates → 4. 🔗 Fix dead links → 5. 🔗 Link orphans → 6. 📝 Expand empty pages

**Lint freezes on a large Wiki?**
Upgrade to v1.7.17+ — Lint now yields to Obsidian's UI thread every 50 pages, preventing multi-second freezes even on 1200+ page wikis.

### 🔍 Troubleshooting

**Why can't I use ingest/lint/query after installing?**
The plugin requires a successful connection test before core features unlock. Go to **Settings → Karpathy LLM Wiki** → pick a provider → enter your API key → click **Fetch Models** → select a model → click **Test Connection**. Once you see the green "LLM Ready" indicator, all features are available. This prevents silent failures from misconfigured providers.

**How do I cancel a running ingestion or lint?**
Click the status bar text during an operation (it shows "Ingesting... click to cancel"), or use `Ctrl+P` → "Cancel current ingestion". The operation stops cleanly at the next batch boundary, preserving all completed work.

**How do I quickly ingest the file I'm currently editing?**
Click the `sticker` icon in the left ribbon bar, or use `Ctrl+P` → "Ingest current file". This skips the file picker and directly ingests the active editor tab.

**I see `[[[[entities/Foo|Foo]]]]` double brackets in my log.md — how do I fix this?**
Run **Lint Wiki** — the scanner now automatically detects and fixes all double-nested wiki-links across your entire wiki directory (including log.md) with zero LLM cost. No manual cleanup needed.

**Why am I getting "Overloaded" errors?**
The plugin now recognizes Anthropic's 529 overload error as retryable. Overload errors are automatically retried with exponential backoff across all providers.

**Why was a duplicate stub created when the page already exists in entities/ or concepts/?**
The plugin now uses slug-based matching — different formatting of the same name resolves to the existing page instead of creating a duplicate stub.

**Query can't find pages I know exist?**
Three common causes: (1) Index is stale → **Regenerate index**. (2) Missing aliases → **Complete Aliases**. (3) Try different phrasing — LLM does semantic matching, not keyword search.

**Can I manually edit Wiki pages?**
Yes. Set `reviewed: true` in frontmatter to protect from overwrite. Manual aliases, tags, and sources are preserved during merges.

**Safe upgrade?**
The plugin never modifies your source files. Backup `wiki/` → update plugin → **Regenerate index** → **Lint Wiki** → fix selectively.

**My `sources/` files got renamed after upgrading to v1.20.3 — is something wrong? (v1.20.3+)**
No — this is the new collision-safe source-slug fingerprint at work. Every `sources/<slug>.md` is now `sources/<basename>_<6hex>.md` (the hex is an FNV-1a hash of the file's full path). Files with the same basename across different folders (e.g. 11× `About this course.md` in Academy courses) no longer collide. Re-ingest renames existing `sources/` pages in place and all `[[sources/<slug>]]` backlinks update automatically. If you have external scripts or bookmarks pointing to `sources/<old-slug>.md`, update them to the new fingerprinted names.

**Will re-ingesting an unrelated source overwrite a page I locked with `reviewed: true`? (v1.20.3+)**
No — Stage 4 (`updateRelatedPage`) now respects `reviewed: true` and routes to the append-only path, same as the ingest path. Your curated body survives verbatim; only genuinely new content is appended.

**How do I get help?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — bug reports
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — questions & feedback

**How do I collect debug logs for troubleshooting?**

1. Open Developer Tools (`Ctrl+Shift+I` / `Cmd+Option+I`)
2. Go to the **Console** tab
3. Run your operation (ingest, query, or lint)
4. Look for messages with module name prefixes like `[Step]`, `[LLM]`, module names
5. For local testing, use `pnpm build:dev` instead of `pnpm build` to preserve full debug output
6. Copy the relevant log lines and include them in your GitHub issue — this makes bug diagnosis much faster

---

## 🔒 Transparency & Compliance

This plugin is listed on the Obsidian Community Plugin Market and undergoes automated review for security and permissions.

**The plugin has no backend, no server infrastructure, and no data collection of any kind.** It is purely local software running inside Obsidian. The plugin cannot and does not collect, store, or transmit your data to any server — because no such server exists.

**Network access** is used only to communicate with the LLM provider you configure — no other network calls are made. This is entirely under your control: you choose the provider, you enter the API key, you decide where your data goes.

**File system access** (vault enumeration) is required to build and maintain the wiki: reading your source notes, generating pages, scanning for dead links, and detecting duplicate pages. The plugin never modifies your source files — only files under the wiki folder.

**Clipboard access** is used exclusively by the "Copy" button in the Query modal, and only when you click it.

If you prefer complete data locality, use a local LLM provider such as Ollama or LM Studio. With a local provider, your data never leaves your machine.

## 📜 License

MIT License — see [LICENSE](LICENSE).

## 🙏 Acknowledgments

- **💡 Concept:** [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original vision that inspired this plugin
- **🛠️ Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM transport:** Obsidian `requestUrl` (Anthropic) + handcrafted OpenAI-compatible HTTP client (3rd-party OpenAI-compatible providers)