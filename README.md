![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki Plugin for Obsidian

> AI-powered structured knowledge base that ingests your notes and generates a connected Wiki — based on [Andrej Karpathy's LLM Wiki concept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Author:** Greener-Dalii | **Version:** 1.7.17

[English](README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md) | [Official Site](https://llmwiki.greenerai.top/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

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

> **Upgrading from an earlier version?** Run `Cmd+P` → "Regenerate index" to rebuild your Wiki index with aliases included — this enables alias-aware search in Query (e.g., searching "DSA" will find "DeepSeek-Sparse-Attention").

**Ingestion Acceleration:** For sources with many entities (20+), enable parallel page generation in Settings → Ingestion Acceleration:
- **Page Generation Concurrency**: 1 (serial, safest) to 5 (parallel, fastest). Start with 3 for most providers.
- **Batch Delay**: 100–2000ms between parallel batches. Increase to 500ms+ for rate-limited providers.

> **Safety**: Parallel generation uses `Promise.allSettled` — if one page fails, others continue. Failed pages are retried individually with exponential backoff.

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
  lint-fixes.ts     # Fix logic + duplicate candidate generation
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

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

- **Concept:** [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original vision that inspired this plugin
- **Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
