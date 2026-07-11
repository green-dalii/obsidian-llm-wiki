![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> AI-powered structured knowledge base that ingests your notes and generates a connected Wiki — based on [Andrej Karpathy's LLM Wiki concept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Obsidian official score 95/100 | Native support for 10 languages | Zero-embedding graph retrieval | Full data sovereignty | Works with every provider**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

**English** | [简体中文](docs/README_CN.md) | [繁體中文](docs/README_ZH-Hant.md) | [日本語](docs/README_JA.md) | [한국어](docs/README_KO.md) | [Deutsch](docs/README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md) | [Italiano](docs/README_IT.md)

[Official Site](https://llmwiki.greenerai.top/) | [Obsidian Marketplace](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback & Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explore Repo with DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD)

---

> **⚡ Quick Update Reminder:** This project evolves rapidly with frequent bug fixes, performance improvements, new features, and UX optimizations. We recommend updating to the latest version regularly in Obsidian (**Settings → Community plugins → Check for updates**), or enabling automatic plugin updates to ensure the best experience.

## 📑 Contents

- [🧠 Karpathy LLM Wiki Plugin for Obsidian](#-karpathy-llm-wiki-plugin-for-obsidian)
  - [📑 Contents](#-contents)
  - [💡 What is LLM-Wiki?](#-what-is-llm-wiki)
  - [⚡ Why Obsidian + LLM-Wiki?](#-why-obsidian--llm-wiki)
  - [🚀 Quick Start](#-quick-start)
    - [📦 Installation](#-installation)
    - [🔄 Updating](#-updating)
    - [🔑 Configure an LLM Provider](#-configure-an-llm-provider)
    - [🎮 Usage](#-usage)
    - [⚠️ Upgrading from an Older Version?](#️-upgrading-from-an-older-version)
  - [⚡ What's New in v1.24.0](#-whats-new-in-v1240)
  - [✨ Features](#-features)
    - [📊 Knowledge Quality](#-knowledge-quality)
    - [🛠️ Maintenance](#️-maintenance)
    - [💬 Query \& Feedback](#-query--feedback)
    - [🌐 LLM \& Language](#-llm--language)
    - [🏗️ Architecture \& Performance](#️-architecture--performance)
    - [🔒 Privacy \& Security](#-privacy--security)
  - [📖 Example](#-example)
  - [🤖 Model Selection Guide](#-model-selection-guide)
  - [🏗️ Architecture](#️-architecture)
  - [❓ FAQ](#-faq)
  - [🔒 Transparency \& Compliance](#-transparency--compliance)
  - [💖 Support the Project](#-support-the-project)
    - [Sponsors](#sponsors)
  - [📜 License](#-license)
  - [🙏 Acknowledgments](#-acknowledgments)
  - [Star History](#star-history)
---

## 💡 What is LLM-Wiki?

You write. AI organizes. You ask. That's it.

**🎯 The problem.** Your notes are a goldmine — people, concepts, ideas, connections. But right now they're just files in folders. Finding what relates to what means searching, tagging, and hoping you remember the thread.

**✨ The fix.** [Andrej Karpathy suggested](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) something elegant: treat your notes as raw material, and let an LLM do the architect work. It reads what you write, pulls out entities and concepts, and weaves them into a structured Wiki — complete with `[[bidirectional links]]`, an auto-generated index, and a chat interface that answers questions from *your* knowledge.

**📚 So you don't have to be the librarian.** No deciding what deserves a page. No maintaining cross-links. No wondering if something is out of date. Pick any note (or folder, or selection) from your vault — the LLM reads, extracts, writes, links, and even flags contradictions — while you stay in flow.

**🤖 And it's not another chatbot.** ChatGPT knows the internet. LLM-Wiki knows *you* — or rather, what you've taught it. Every answer carries `[[wiki-links]]` back into your knowledge graph. Every response is a trailhead, not a dead end.

**🏆 Key differentiator — Graph-powered retrieval at zero embedding cost.** Most knowledge-base plugins use vector embeddings (expensive, per-provider, internet-dependent). LLM-Wiki runs Personalized PageRank over your existing `[[wiki-link]]` graph — matching embedding-grade retrieval quality with zero API calls, no new dependencies, and full local-model support. Add **zero-LLM Tier B section extraction** (i18n-aware, 10 languages) and you get a knowledge engine that works for every user, on every provider.


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
|--------|------|
| **📥 Ingest single source** | `Cmd+P` → "Ingest single source" — select a note to extract entities and concepts into Wiki pages |
| **📂 Ingest from folder** | `Cmd+P` → "Ingest from folder" — pick a folder, batch generate Wiki from all notes inside |
| **📑 Ingest multiple files** | `Cmd+P` → "Ingest multiple files" — pick specific notes via two-pane modal (recursive folder tree + per-file checkboxes), then batch ingest the selection (with live queue + per-file cancel) |
| **🎯 Ingest current file** | Click the `sticker` icon in the left ribbon, or `Cmd+P` → "Ingest current file" — ingest the file you're editing |
| **🔍 Query wiki** | `Cmd+P` → "Query wiki" — conversational Q&A over your Wiki, streaming responses with `[[wiki-links]]` |
| **🛠️ Lint wiki** | `Cmd+P` → "Lint wiki" — full health scan: duplicates, dead links, empty pages, orphans, missing aliases, contradictions. Schema suggestions surfaced inside the Lint Modal |
| **📋 Regenerate index** | `Cmd+P` → "Regenerate index" — rebuild `wiki/index.md` with current pages and aliases |
| **📊 View Ingestion History (v1.21.0)** | `Cmd+P` → "View Ingestion History" — browse past ingestions, lint reports, and maintenance runs in a searchable, filterable UI |
| **⏹ Cancel current operation** | `Cmd+P` → "Cancel current ingestion" — stop an in-progress operation cleanly at the next batch boundary |
| **🎉 Recreate Welcome Note (v1.23.0)** | `Cmd+P` → "Recreate Wiki Welcome Note" — re-generate the first-run Welcome note |

Re-ingesting the same source does incremental updates on entity/concept pages (new info merged in). Summary pages are regenerated.

> 💡 **Smart Batch Skip:** When ingesting a folder, the plugin automatically detects already-processed files and skips them to save time and API costs. The batch report shows skipped count.

![Command palette — search "karpa" to see all Karpathy LLM Wiki commands](docs/assets/command-panel.png)

### ⚠️ Upgrading from an Older Version?

> 🔧 **Upgrading from v1.24.0.** The internal `<!-- reviewed: keep -->` comment marker (v1.24.0, #244) that protected only a page's *Mentions in Source* section has been removed. To keep a curated Mentions section, set `reviewed: true` in the page frontmatter — it protects the whole page (Mentions included) and, unlike the hidden comment, stays visible in the Properties panel and survives Markdown linters.

**Backward compatible.** No breaking changes since v1.0.0 — your existing wiki pages, settings, and workflows are preserved without reconfiguration.

**After upgrading**, run **Lint Wiki** → **Smart Fix All** for a one-click, causality-ordered repair:
1. 🏷️ Complete Aliases (LLM batch-generates translations, acronyms, alternate names)
2. 🔄 Merge Duplicates (cross-language, abbreviation, and high-similarity matches)
3. 🔗 Fix Dead Links / Link Orphans / Expand Empty Pages

Then **Regenerate Index** to rebuild `wiki/index.md` with alias entries for every page, enabling 
alias-aware search (e.g., "DSA" finds "DeepSeek-Sparse-Attention").

> 📖 **Detailed upgrade walkthroughs** for specific version jumps (v1.20.3 slug fingerprint, v1.16.0 double-nested links) are maintained in [GitHub Discussions / Upgrading](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Settings to review:** Wiki Output Language (independent from UI), Extraction Granularity (Minimal–Fine, + Custom), Page Generation Concurrency (default 3), Batch Delay (default 300ms).

## ⚡ What's New in v1.24.0

Five themes: per-task models, custom query instructions, four monolith splits, source-note alias propagation, and user-reported frontmatter fix. Recommended upgrade for everyone on v1.23.x.

- **🎛️ Per-task Models (#208).** Pick a different model for **Ingest** / **Lint** / **Query** — or keep them unified. Settings → Wiki → *Model Scope* lets you switch with one click. The **Test Connection** button now probes each configured model sequentially with fail-fast — until every per-task model passes, the connection is considered unhealthy.
- **📝 Custom Query Instructions (#251, `jameses-cyber`).** A collapsible panel inside the Query Wiki view lets you append persistent instructions to every system prompt — research mode, citation style, "no fabrication" rules, etc. 5000-char defensive cap. Strictly scoped to Query Wiki chat; ingest / lint / page generation intentionally unaffected. Modes dropdown planned for v1.25.0+.
- **🧱 Four monolith splits (P0 follow-up to v1.23.0 series).** `controller.ts` (PR #248), `history-modal.ts` (PR #249, 1579 → 14 files, 93 tests), `query-engine.ts` (PR #250, 1373 → 15 files), and `modals.ts` (PR #257, 1008 → 7 files) — each god function / god class decomposed into focused modules. Plugin is now structurally ready for the next round of features.
- **🏷️ Source-note aliases propagation (#185).** Frontmatter `aliases:` from source notes now flow into generated `sources/<slug>` pages, so downstream `[[wiki-link]]` matching and alias-aware search reach every quote. Reduces "DSA ≠ DeepSeek-Sparse-Attention" type misses.
- **🔀 Tier-1 + Tier-2 merge triage (#216, `DocTpoint`).** Classify-then-route duplicate-bypass decision: skip spurious Tier-1 candidates outright, run Tier-2 only on the remainder. Reduces Lint merge batch size without sacrificing high-precision matches.
- **🐛 Frontmatter write repair (4 user-reported bugs).** `aliases:[]` no longer falsely passes as alias-deficient; duplicate aliases collapsed on write; block-style frontmatter preserved (not flattened to inline); failures now logged with the offending field. Affects Smart Fix + merge paths.
- **🚀 Query Wiki first-query PPR warmup.** Engine-level PPR graph cache (Key invalidation on `wikiFolder` change + cache-clear on `invalidatePageCaches`) — first query now uses Personalized PageRank instead of falling back to lex-only on cold start.
- **🌐 i18n completeness** — 7 new keys per locale for the per-task model pickers + Model Scope dropdown + Test Connection labels.

**Settings to review:** Model Scope (Unified / Per-Task, in Settings → Wiki), per-task model fields (visible in Per-Task mode), Query Wiki → ⚙ Custom Instructions collapsible panel (in-view only).

## ✨ Features

### 📊 Knowledge Quality

- **🔍 Entity/Concept extraction** — LLM extracts entities (people, organizations, products, events, etc.) and concepts (theories, methods, terms, etc.) from your notes and generates standalone Wiki pages. Flexible extraction granularity (minimal ~5, coarse ~10, standard ~50, fine ~100, custom 1–500) balances analysis depth with API cost.
- **🏷️ Mandatory page aliases** — every generated page includes at least 1 alias (translation, abbreviation, variant) for cross-language duplicate detection.
- **🔄 Duplicate detection & merge** — semantic tiered detection catches true duplicates (cross-language translations, abbreviations, spelling variants); smart LLM fusion merges content while preserving aliases.
- **🧩 Intelligent knowledge fusion** — multi-source updates merge new information without duplication; contradictions are preserved with source attribution; `reviewed: true` pages are protected from overwrite.
- **📏 Content truncation guard** — 8000 max_tokens with automatic stop_reason detection and 2× token retry, covering all providers.
- **📝 Original quote preservation** — Mentions-in-Source sections preserve quotes in their original language (optional translation) for full traceability.
- **🎨 Customizable tag vocabulary (v1.18.0).** Settings → Wiki → Tag Vocabulary Mode → *Custom* lets you define your own entity-type and concept-type tag lists (e.g. `Medical_Arzneimittel`, `法规`). The plugin respects your vocabulary in extraction prompts and frontmatter validation; the existing Lint audit (Issue #85 v7) reports any page whose tags fall outside the active vocabulary.

![Custom tag vocabulary chip inputs](docs/assets/custom-tags.png)

### 🛠️ Maintenance

- **🔍 Lint health scan** — single comprehensive report detects: duplicate pages, dead links, empty pages, orphans, missing aliases, contradictions.
- **🎯 Tiered semantic duplicate detection** — Tier 1 (direct name match: cross-language, abbreviation, high-similarity titles) always verified; Tier 2 (indirect signals: shared links, medium similarity) fills token budget.
- **⚡ One-click Smart Fix All** — batch fixes in causal order: fill aliases → merge duplicates → fix dead links → link orphans → expand empty pages, with per-phase popup report.
- **🏷️ Alias completion** — one-click parallel batch generation of missing aliases, improving future duplicate detection.
- **🔄 Auto-maintenance** — multi-folder watching, scheduled Lint, startup health check (all optional).
- **⚠️ Contradiction state machine** — `detected → review-passed → resolved` (AI-fix) or `detected → unresolved` (manual).
- **🛡️ Pre-ingest requirements gate (v1.21.0)** — every source file is validated *before* any LLM call: empty/whitespace/frontmatter-only notes are rejected, and content-hash dedup catches identical files across paths. Prevents small/local models from hallucinating entity names on blank inputs.
- **📊 Operation History Panel (v1.21.0)** — searchable, filterable UI for past ingestions, lint reports, and maintenance runs, with insight-driven KPI cards and clickable page links.

![History Panel](docs/assets/history-panel.png)

- **🧹 Incomplete-page cleaner (v1.21.0)** — pages left in a partial state after interrupted ingests are automatically archived on startup. Recoverable from Obsidian's `.trash`.

### 💬 Query & Feedback

- **🤖 Conversational query** — ChatGPT-style dialog with streaming Markdown output, automatic `[[wiki-links]]`, and multi-turn history.
- **🪟 Right-docked side panel (v1.22.1, PR #196).** Query Wiki opens in a Copilot-style right sidebar leaf (reusing an existing leaf if already open) instead of a centered popup. The `message-circle` ribbon icon and `Query Wiki` command activate/reveal the panel; your notes stay visible alongside the conversation. All functionality is preserved unchanged.

![Query Wiki side panel](docs/assets/query-side-panel.png)
- **📤 Query → Wiki feedback** — save valuable conversations back into the Wiki, with entity/concept extraction and pre-save semantic dedup.
- **🔒 Duplicate-save guard** — hash tracking prevents unchanged conversations from re-evaluating.

### 🌐 LLM & Language

- **🔌 Multi-provider support** — Anthropic, Anthropic-compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, custom endpoint.
- **🔄 5xx auto-retry** — exponential backoff on HTTP 5xx / 429 / 529 across all clients (max 2 retries).
- **📋 Dynamic model list** — fetched live from the provider API.
- **🌐 Wiki output language** — 10 languages independent of UI (English / 简体中文 / 繁體中文 / 日本語 / 한국어 / Deutsch / Français / Español / Português / Italiano), with custom input option.
- **🌍 Full UI internationalization** — plugin UI in 10 languages with 269+ UI fields fully translated to natural local expression.
- **⚡ Rate-limit guardian** — automatically detects when parallel generation triggers rate limits and prompts to lower concurrency, increase batch delay, or switch provider.
- **🦙 Web Clipper compatibility** — one-click addition of the official Obsidian Web Clipper's `Clippings/` folder to the watch list; clipped web pages auto-ingest into the Wiki.

### 🏗️ Architecture & Performance

- **⚡ Parallel page generation** — configurable 1–5 concurrent pages, default 3 (parallel), 2–3× speedup on large sources; per-page error isolation.
- **📚 Iterative batched extraction** — adaptive batch sizing eliminates the long-document max_tokens bottleneck.
- **🏛️ Three-layer architecture** — Your vault notes (read-only) → `wiki/` (LLM-generated pages organized as `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`) → `schema/` (co-evolved configuration).
- **🧩 Modular codebase** — 20+ focused modules in `src/`.

### 🔒 Privacy & Security

- **No backend, no tracking.** The plugin runs entirely inside Obsidian — no external servers, no analytics, no data collection of any kind. Unless you actively configure an LLM provider, your notes never leave your vault.
- **Data stays local by default.** The plugin does not store, cache, or transmit your content anywhere outside of the LLM API you have chosen. Only the text you send for ingestion or query leaves your device — and only to the provider you configured.
- **Full local mode via Ollama, LM Studio, or local providers.** For complete data sovereignty, use a locally running LLM. Your notes are processed entirely on your machine — never touching the internet.
- **Minimal permissions.** Vault file access is used for Wiki management (reading notes, generating pages, detecting dead links). Network access is used only for communicating with your chosen LLM provider's API. Clipboard access is limited to the "Copy" button in the Query modal — used only when you click it.

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
📄 Your vault notes (any folder)   # 📖 You pick which notes to ingest
  ↓ ingest
wiki/                              # 🧠 LLM-generated Wiki pages (wiki/sources/, wiki/entities/, wiki/concepts/)
  ↓ query / maintain
schema/                            # 📋 Wiki structure configuration (naming, templates, categories)
```

> 📖 See the full codebase structure in [CONTRIBUTING.md → Project Structure](./CONTRIBUTING.md#project-structure).

**Generated pages:**
- `wiki/sources/filename.md` — 📄 Source summary
- `wiki/entities/entity-name.md` — 👤 Entity pages (people, orgs, projects, etc.)
- `wiki/concepts/concept-name.md` — 💡 Concept pages (theories, methods, terms, etc.)
- `wiki/index.md` — 📑 Auto-generated index
- `wiki/log.md` — 📝 Operation log

---

## ❓ FAQ

> **Keep your plugin updated** — new features and fixes ship frequently. Run **Settings → Community Plugins → Check for updates** regularly.
>
> 📖 More FAQs on [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

**What does the plugin actually do?**
Pick any note, folder, or selection from your vault; the LLM extracts entities and concepts and generates an interlinked wiki with `[[bidirectional links]]`. Ask questions and get conversational answers grounded in *your* notes — not internet search. Generated summaries live under `wiki/sources/`, entities under `wiki/entities/`, and concepts under `wiki/concepts/` — your original vault notes are never modified.

**Is my data sent to third parties?**
🔒 **Privacy first.** No backend, no tracking, no analytics — the plugin runs entirely inside Obsidian. Only text you explicitly send for ingestion/query leaves your device, and only to the LLM provider you configure. For complete data locality, use a local provider (Ollama or LM Studio with no API key) — your data never touches the internet.

**How is this different from RAG chatbots?**
Unlike chunked RAG that fragments context, LLM-Wiki runs a **Personalized PageRank** engine over your existing `[[wiki-link]]` graph — finding related pages via link structure, not vector embeddings. This means zero embedding cost, no new dependencies, and full support for local and offline models.

**Which LLM should I use?**
Long-context models (≥200K tokens) work best. Budget-friendly picks: DeepSeek V4-Flash ($0.14/M), Gemini 3.5 Flash, Qwen3.6-Plus. Local models via Ollama/LM Studio work for query but have smaller context windows (8K–128K). See the [Model Selection Guide](#-model-selection-guide) for details.

**How do I get started?**
Install from Obsidian Community Plugins → pick an LLM provider → **Test Connection** → run **Ingest single source** (or **Ingest from folder**) on any note in your vault → your first wiki pages appear within seconds. See [Quick Start](#-quick-start) above.

**How can I control API costs?**
Use Coarse or Minimal extraction granularity for batch ingestion (fewer LLM calls). Smart Batch Skip auto-detects already-ingested files. Auto-Maintenance is OFF by default (enable only if needed). Lint shows counts before running fixes — nothing is charged without your approval.

**Is my existing wiki safe?**
✅ Backward compatible since v1.0.0. Set `reviewed: true` on any page to protect it from overwrite. The plugin never modifies your original vault notes — only generates new pages inside the `wiki/` folder.

**Can I use the plugin in my language?**
🌐 **10 languages** for both UI and wiki output: English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. UI and wiki language are independent — your wiki can be in Chinese while the interface stays in English. Adding an 11th language is contributor-driven (follow the Italian PR #159 pattern).

**What minimum setup is needed?**
Obsidian v1.11.0+ (desktop: Windows/macOS/Linux). An LLM provider API key (or Ollama/LM Studio for local, no API key needed). The plugin's **llmReady guard** requires a successful connection test before core features unlock — this prevents silent failures from misconfigured providers.

**How do I cancel a running operation?**
Click the status bar text (shows "Ingesting… click to cancel") or `Cmd+P` → "Cancel current ingestion". Stops cleanly at the next batch boundary, preserving all completed work.

**Where do I get help?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — bug reports
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — questions, feature requests, upgrade help
- Developer Console (`Ctrl+Shift+I` / `Cmd+Option+I`) — copy logs with module-name prefixes for faster diagnosis

## 🔒 Transparency & Compliance

This plugin is listed on the Obsidian Community Plugin Market and undergoes automated review for security and permissions.

**The plugin has no backend, no server infrastructure, and no data collection of any kind.** It is purely local software running inside Obsidian. The plugin cannot and does not collect, store, or transmit your data to any server — because no such server exists.

**Network access** is used only to communicate with the LLM provider you configure — no other network calls are made. This is entirely under your control: you choose the provider, you enter the API key, you decide where your data goes.

**File system access** (vault enumeration) is required to build and maintain the wiki: reading your source notes, generating pages, scanning for dead links, and detecting duplicate pages. The plugin never modifies your source files — only files under the wiki folder.

**Clipboard access** is used exclusively by the "Copy" button in the Query modal, and only when you click it.

If you prefer complete data locality, use a local LLM provider such as Ollama or LM Studio. With a local provider, your data never leaves your machine.

## 💖 Support the Project

If LLM-Wiki has become a meaningful part of your knowledge workflow, you can support its ongoing development:

- ☕ **[Buy me a Ko-fi](https://ko-fi.com/greenerdalii)** — one-time or monthly support via Ko-fi
- 💳 **[Tip via PayPal](https://paypal.me/greenerdalii)** — one-time tip via PayPal

Sponsorship is entirely optional. The plugin stays Apache-2.0-licensed and feature-complete regardless.

### Sponsors

Thanks to the following people for supporting the project:

- [@jameses-cyber](https://github.com/jameses-cyber)

## 📜 License

Apache License, Version 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## 🙏 Acknowledgments

- **💡 Concept:** [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original vision that inspired this plugin
- **🛠️ Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM transport:** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)