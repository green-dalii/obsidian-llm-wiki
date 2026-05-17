![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki Plugin for Obsidian

> AI-powered structured knowledge base that ingests your notes and generates a connected Wiki — based on [Andrej Karpathy's LLM Wiki concept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Author:** Greener-Dalii | **Version:** 1.8.0

![Version](https://img.shields.io/badge/version-1.8.0-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](README.md) | [中文文档](docs/README_CN.md) | [日本語](docs/README_JA.md) | [한국어](docs/README_KO.md) | [Deutsch](docs/README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md)

[Official Site](https://llmwiki.greenerai.top/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## What is LLM-Wiki?

You write. AI organizes. You ask. That's it.

**The problem.** Your notes are a goldmine — people, concepts, ideas, connections. But right now they're just files in folders. Finding what relates to what means searching, tagging, and hoping you remember the thread.

**The fix.** [Andrej Karpathy suggested](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) something elegant: treat your notes as raw material, and let an LLM do the architect work. It reads what you write, pulls out entities and concepts, and weaves them into a structured Wiki — complete with `[[bidirectional links]]`, an auto-generated index, and a chat interface that answers questions from *your* knowledge.

**So you don't have to be the librarian.** No deciding what deserves a page. No maintaining cross-links. No wondering if something is out of date. Drop notes into `sources/` and the LLM reads, extracts, writes, links, and even flags contradictions — while you stay in flow.

**And it's not another chatbot.** ChatGPT knows the internet. LLM-Wiki knows *you* — or rather, what you've taught it. Every answer carries `[[wiki-links]]` back into your knowledge graph. Every response is a trailhead, not a dead end.

---

## Why Obsidian + LLM-Wiki?

Obsidian is brilliant at linked thinking. But there's a catch: you're the one doing all the linking.

LLM-Wiki flips that. Instead of you building the graph by hand, the AI grows it with you. Add a note about a new concept — it finds the connections you'd miss. Ask a question — it walks your own knowledge graph and brings back answers with citations.

- **Your Graph View comes alive.** New notes don't just sit there — they sprout links to entities, concepts, and sources. The graph grows organically, and the plugin maintains it: detecting duplicates, fixing dead links, bridging languages with aliases.
- **Your notes learn to talk back.** Search becomes conversation. "What did I write about X?" becomes a dialogue, with streaming responses and `[[wiki-links]]` as breadcrumbs. Every answer is a path deeper into your own knowledge.
- **Obsidian becomes a thinking partner.** It stops being a cabinet for notes and starts being something that helps you *think* — surfacing hidden connections, flagging contradictions, remembering what you forgot you knew.

---

## Quick Start

### Installation

**Recommended — Obsidian Community Plugin Market:**

1. In Obsidian, go to **Settings → Community plugins**
2. Click **Browse** and search for "Karpathy LLM Wiki"
3. Click **Install**, then **Enable**

**Or from the Community Plugin website —** visit [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) and click **Add to Obsidian** to install directly.

**Manual (alternative):**

1. Download `main.js`, `manifest.json`, `styles.css` from [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. In Obsidian, go to Settings → Community plugins. On the **Installed plugins** tab, click the folder icon to open your plugins directory
3. Create a folder named `karpathywiki`, drop the three files inside
4. Back in Obsidian, click the refresh icon — **Karpathy LLM Wiki** will appear under Installed plugins
5. Toggle it on to enable

**Development:** `git clone`, `pnpm install`, `pnpm build`.

### Configure an LLM Provider

1. Open Settings → Karpathy LLM Wiki
2. Pick a provider from the dropdown (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter, or custom)
3. Enter your API key (not needed for Ollama)
4. Click **Fetch Models** to populate the model dropdown, or type a model name manually
5. Click **Test Connection**, then **Save Settings**

**Ollama (local, no API key):** Install [Ollama](https://ollama.com), pull a model (`ollama pull gemma4`), select "Ollama (Local)" in the provider dropdown.

> See [README_CN.md](README_CN.md) for provider-specific instructions in Chinese.

### Usage

| Method | How |
|--------|-----|
| **Ingest from `sources/`** | `Cmd+P` → "Ingest Sources" — processes the entire `sources/` folder |
| **Ingest any folder** | `Cmd+P` → "Ingest from Folder" — pick a folder, generate Wiki from existing notes |
| **Query Wiki** | `Cmd+P` → "Query Wiki" — ask questions, get streaming answers with `[[wiki-links]]` |
| **Lint Wiki** | `Cmd+P` → "Lint Wiki" — health scan with duplicate detection, dead links, orphans |

Re-ingesting the same source does incremental updates on entity/concept pages (new info merged in). Summary pages are regenerated.

**Smart Batch Skip:** When ingesting a folder, the plugin automatically detects already-processed files and skips them to save time and API costs. The batch report shows skipped count.

### Upgrading from an Older Version?

If you're upgrading from a version **before v1.7.11** (or much earlier), your existing Wiki pages were generated without several capabilities added over many releases. Follow these steps after upgrading to bring your Wiki up to date:

**1. Rebuild your index**
`Cmd+P` → **"Regenerate index"** — This rebuilds `wiki/index.md` with alias entries for every page, enabling alias-aware search (e.g., searching "DSA" finds "DeepSeek-Sparse-Attention"). The old index format only listed page titles.

**2. Run Lint Wiki**
`Cmd+P` → **"Lint Wiki"** — This scans your entire Wiki and shows:
- **Missing aliases**: Pages without aliases (all pre-v1.7.11 pages). Click **"Complete Aliases"** — the LLM generates translations, acronyms, and alternate names in bulk. This is critical for duplicate detection.
- **Duplicate pages**: Pages with overlapping content (e.g., "CoT" vs "思维链" created by older versions that didn't have alias-aware dedup). Click **"Merge Duplicates"** to fuse them and preserve all aliases.
- **Dead links / Empty pages / Orphans**: Standard wiki maintenance issues.

**3. Use Smart Fix All**
Click **"Smart Fix All"** in the Lint report for a one-click, causality-ordered repair: aliases completed → duplicates merged → dead links fixed → orphans linked → empty pages expanded. This is the fastest way to clean up a wiki built across many versions.

**4. Enable parallel page generation**
Settings → **Ingestion Acceleration**:
- **Page Generation Concurrency**: Set to 3 for most providers (was 1/serial by default before v1.7.3). Speeds up ingestion 2–3× on sources with 10+ entities.
- **Batch Delay**: Start at 300ms. Increase to 500–800ms if you hit rate limits.

**5. Review new settings (added since v1.4.0–v1.7.x):**
- **Wiki Output Language** (v1.6.5): Independent from UI language — your Wiki can be in Chinese while the plugin UI stays in English, or vice versa.
- **Extraction Granularity** (v1.6.2): Fine/Standard/Coarse controls how deeply the LLM extracts entities from sources. "Standard" is a good default.
- **Auto-Maintenance** (v1.4.0): Optional file watcher, periodic Lint, and startup health check. All default OFF — enable only if you want automatic background processing.

> **Safety**: Parallel generation uses `Promise.allSettled` — if one page fails, others continue. Failed pages are retried individually with exponential backoff. Smart Batch Skip (v1.7.7) automatically detects already-ingested files to save time and API costs.

---

## Features

### Knowledge Quality

- **Entity/Concept Extraction** — LLM extracts entities (people, orgs, products, events) and concepts (theories, methods, terms) from your notes
- **Mandatory Page Aliases** — Every generated page includes at least 1 alias (translation, acronym, alternate name), enabling cross-language duplicate detection
- **Duplicate Detection & Merge** — Semantic tiering catches true duplicates (cross-language translations, abbreviations, spelling variants); intelligent LLM merge fuses content and preserves aliases
- **Smart Knowledge Fusion** — Multi-source updates merge new info without redundancy, contradictions preserved with attribution, `reviewed: true` pages protected from overwrite
- **Content Truncation Protection** — 8000 max_tokens with automatic stop_reason detection and retry at 2× tokens across all providers
- **Verbatim Source Mentions** — Original language quotes preserved with optional translation for traceability

### Maintenance

- **Lint Health Scan** — Detects duplicates, dead links, empty pages, orphans, missing aliases, and contradictions in one comprehensive report
- **Semantic-Tier Duplicate Detection** — Tier 1 (direct name matches: cross-language, abbreviations, high-similarity titles) always verified; Tier 2 (indirect signals: shared links, moderate similarity) fills token budget
- **Smart Fix All** — Causality-ordered batch fix: duplicates merged → dead links resolved → orphans linked → empty pages expanded
- **Alias Completion** — One-click parallel batch generation of missing aliases, improving future duplicate detection
- **Auto-Maintenance** — Multi-folder file watcher, periodic lint, startup health check (all optional)
- **Contradiction State Machine** — `detected → review_ok → resolved` (AI fix) or `detected → pending_fix` (manual)

### Query & Feedback

- **Conversational Query** — ChatGPT-style dialog with streaming Markdown and `[[wiki-links]]`, multi-turn history
- **Query-to-Wiki Feedback** — Save valuable conversations to Wiki with entity/concept extraction, semantic dedup before save
- **Duplicate Save Prevention** — Hash tracking prevents re-evaluation of unchanged conversations

### LLM & Language

- **Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, custom endpoints
- **5xx Retry** — Automatic exponential backoff retry (max 2) on HTTP 5xx/429 errors across all clients
- **Dynamic Model List** — Real-time fetching from provider APIs
- **Wiki Output Language** — 8 languages independent of UI (EN/ZH/JA/KO/DE/FR/ES/PT), with custom input
- **Internationalization** — English and Chinese UI (default: English)

### Architecture & Performance

- **Parallel Page Generation** — Configurable 1–5 concurrent pages, 3× faster for large sources, error isolation per page
- **Iterative Batch Extraction** — Adaptive batch sizing eliminates max_tokens bottleneck for long documents
- **Three-Layer Architecture** — `sources/` (read-only) → `wiki/` (LLM-generated) → `schema/` (co-evolved config)
- **Modular Codebase** — 13 focused modules in `src/`

---

## Commands

| Command | Description |
|---------|-------------|
| **Ingest single source** | Select a note → generate Wiki pages with entities, concepts, and summary |
| **Ingest from folder** | Select a folder → batch generate Wiki from existing notes |
| **Query wiki** | Conversational Q&A over your Wiki, streaming responses with `[[wiki-links]]` |
| **Lint wiki** | Full health scan: duplicates, dead links, empty pages, orphans, missing aliases, contradictions |
| **Regenerate index** | Manually rebuild `wiki/index.md` |
| **Suggest schema updates** | LLM analyzes Wiki and proposes schema improvements |

---

## Example

**Input:** `sources/machine-learning.md`

```markdown
# Machine Learning
Machine learning uses algorithms to learn from data.

## Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Output — Entity page:** `wiki/entities/supervised-learning.md`

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

## Model Selection Guide

This plugin follows Karpathy's philosophy: **feed the LLM full Wiki context, not chunked RAG retrieval**. Long-context models are strongly recommended — the larger your Wiki grows, the more context the LLM needs.

> Why not RAG? Karpathy's [original critique](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) argues that RAG fragments knowledge and breaks the LLM's ability to reason across the full knowledge graph.

**Top recommendations:**

| Model | Context Window | Why |
|-------|---------------|-----|
| **DeepSeek V4** | 1M tokens | Best value — ultra-low pricing, strong Chinese support |
| **Gemini 3.1 Pro** | 1M+ tokens | Largest context window, strong reasoning |
| **Claude Opus 4.7** | 1M tokens | Strongest agentic coding and reasoning |
| **GPT-5.5** | 1M tokens | Latest OpenAI flagship, top AI intelligence index |
| **Claude Sonnet 4.6** | 1M tokens | Great balance of speed, cost, and quality |

For local models (Ollama): context windows are typically smaller (8K–128K). Consider using a cloud provider for ingestion + local model for query.

**Anthropic Compatible (Coding Plan):** If your provider offers an Anthropic-compatible API endpoint, select "Anthropic Compatible" and enter your provider's Base URL and API Key.

---

## Architecture

Karpathy's three-layer separation design:

```
sources/     # Your source documents (read-only)
  ↓ ingest
wiki/        # LLM-generated Wiki pages
  ↓ query / maintain
schema/      # Wiki structure configuration (naming, templates, categories)
```

**Codebase** (`src/`):

```
wiki/               # Wiki engine modules
  wiki-engine.ts    # Orchestrator
  query-engine.ts   # Conversational query
  source-analyzer.ts # Iterative batch extraction
  page-factory.ts   # Entity/concept CRUD + merge
  lint-controller.ts # Lint orchestration
  lint-fixes.ts     # Fix logic for dead links, empty pages, orphans
  lint/             # Lint sub-modules
    duplicate-detection.ts  # Programmatic candidate generation
    fix-runners.ts          # Batch fix execution helpers
  contradictions.ts # Contradiction detection
  system-prompts.ts # Language directive + section labels
schema/             # Schema co-evolution
  schema-manager.ts # Schema CRUD + suggestions
  auto-maintain.ts  # File watcher + periodic lint
ui/                 # User interface
  settings.ts       # Settings panel
  modals.ts         # Lint/Ingest/Query modals
+ shared modules: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Generated pages:**
- `wiki/sources/filename.md` — Source summary
- `wiki/entities/entity-name.md` — Entity pages (people, orgs, projects, etc.)
- `wiki/concepts/concept-name.md` — Concept pages (theories, methods, terms, etc.)
- `wiki/index.md` — Auto-generated index
- `wiki/log.md` — Operation log

---

## FAQ

### Why does Lint show "missing aliases" on almost all my pages?

Pages generated before v1.7.11 didn't include aliases. This is expected and harmless — aliases are an enhancement, not a requirement. Click **"Complete Aliases"** in the Lint report to have the LLM generate translations, acronyms, and alternate names for all deficient pages in one batch. Once aliases exist, duplicate detection and alias-aware search become much more effective.

### Why do I see duplicate pages with similar names (e.g., "CoT" and "思维链")?

Older versions (pre-v1.7.10) didn't have alias-aware duplicate detection. When you ingested content about the same concept using different names, the LLM created separate pages. Run **Lint Wiki** → if duplicates are found, click **"Merge Duplicates"** to fuse them. The merged page preserves aliases from both, preventing future duplicates.

### How do I speed up ingestion for large source files?

Two settings in **Settings → Ingestion Acceleration**:
- **Page Generation Concurrency**: Increase from 1 to 3 (or 5 for providers with high rate limits). This processes multiple entity/concept pages in parallel.
- **Batch Delay**: Lower values are faster but risk rate limiting. Start at 300ms; increase to 500–800ms if you see HTTP 429 errors.

Also check **Extraction Granularity**: "Standard" or "Coarse" produce fewer pages than "Fine" and are faster.

### The plugin freezes when I run Lint on a large Wiki. What's wrong?

This was a known issue fixed in v1.7.15 and v1.7.17. If you're on a version before v1.7.15, upgrade to the latest release — the Lint system now includes async yield points that return control to Obsidian's UI thread every 50 pages and every 500 comparisons, preventing the 10–40 second freeze that occurred on wikis with 1200+ pages.

### Can I manually edit Wiki pages?

Yes. The plugin respects your edits:
- Set `reviewed: true` in the frontmatter to protect a page from being overwritten during re-ingestion. Reviewed pages only receive genuinely new content appended.
- The `created` date is preserved across updates; only `updated` is refreshed.
- Manual aliases, tags, and sources are preserved during merges.

### How do I use local models with Ollama?

1. Install [Ollama](https://ollama.com) and pull a model: `ollama pull gemma4`
2. In plugin settings, select **"Ollama (Local)"** as the provider
3. Click **Fetch Models** to populate the model list, or type the model name manually
4. No API key needed

> Local models typically have smaller context windows (8K–128K). Consider using a cloud provider for ingestion (which needs the largest context) and your local model for Query.

### What's the difference between UI Language and Wiki Output Language?

- **Interface Language** (top of settings): Controls the plugin's own UI — settings labels, button text, Notices. Currently supports English and Chinese.
- **Wiki Output Language** (added in v1.6.5): Controls what language the LLM writes Wiki pages in. Supports 8 languages (EN/ZH/JA/KO/DE/FR/ES/PT) plus custom input. You can have an English UI while your Wiki is written in Japanese.

### Why doesn't Query find pages I know exist?

Three common causes:
1. **Index is stale**: Run `Cmd+P` → **"Regenerate index"** to rebuild with current pages and aliases.
2. **Aliases are missing**: Without aliases (pre-v1.7.11 pages), the LLM can only match by exact page title. Run Lint → Complete Aliases to fix.
3. **Search terms don't match**: Try the page title, an alias, or a related term. The LLM does semantic matching, not keyword search — rephrasing helps.

### What does "Smart Fix All" do and in what order?

Smart Fix All runs fixes in causality order to minimize creating new problems:
1. **Phase 0 — Complete Aliases**: Fill missing aliases so duplicate detection works properly.
2. **Phase 1 — Merge Duplicates**: Fuse duplicate pages (root cause of many dead links and orphans).
3. **Phase 2 — Fix Dead Links**: Repair broken `[[wiki-links]]` (many resolved after duplicate merge rewrites links).
4. **Phase 3 — Link Orphans**: Add incoming links to pages that have none.
5. **Phase 4 — Expand Empty Pages**: Fill stub pages with LLM-generated content.

### How do I avoid unexpected API costs?

- **Auto-Maintenance is OFF by default** — don't enable it unless you want continuous background processing.
- **Smart Batch Skip** (v1.7.7) automatically skips already-ingested files, so re-running folder ingestion doesn't re-process everything.
- **Extraction Granularity** set to "Standard" or "Coarse" uses fewer API calls than "Fine."
- **Batch Delay** values above 500ms give more breathing room but don't increase token usage — they only space out calls.
- The **Lint report** shows counts before you run any fixes, so you can decide what's worth the API cost.

### How do I upgrade without losing my Wiki data?

The plugin never modifies your source files in `sources/`. Wiki pages in `wiki/` are only modified when you explicitly run fixes or re-ingest. To be safe:
1. Back up your vault (or just the `wiki/` folder)
2. Update the plugin
3. Run **Regenerate index** first
4. Run **Lint Wiki** to see what needs attention
5. Apply fixes selectively — you don't have to fix everything at once

---

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

- **Concept:** [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original vision that inspired this plugin
- **Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
