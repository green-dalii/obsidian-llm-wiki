![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> An Obsidian plugin that turns your notes into a connected, queryable knowledge base — the [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) idea, built into the editor where you already write.

> **Zero-embedding graph retrieval • 10-language native • Works with every provider**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

**English** | [简体中文](docs/README_CN.md) | [繁體中文](docs/README_ZH-Hant.md) | [日本語](docs/README_JA.md) | [한국어](docs/README_KO.md) | [Deutsch](docs/README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md) | [Italiano](docs/README_IT.md)

[Official Site](https://llmwiki.greenerai.top/) | [Obsidian Marketplace](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

📑 [Contents](#-contents) • 🚀 [Quick Start](#-quick-start) • ✨ [Features](#-features) • 🔍 [How Retrieval Works](#-how-retrieval-works) • 🤖 [Models](#-models) • ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← If this plugin has helped you, feel free to buy me a coffee♥️ or drop a star🌟↗

---

## 📑 Contents

- [Why this plugin?](#-why-this-plugin)
- [Is it for me?](#-is-it-for-me)
- [Quick Start](#-quick-start)
- [Features](#-features)
- [How retrieval works](#-how-retrieval-works)
- [Models](#-models)
- [FAQ](#-faq)
- [Privacy](#-privacy)
- [Support](#-support)
- [License & Credits](#-license--credits)

---

## 🤔 Why this plugin?

You write notes. They sit in folders. Finding what relates to what means remembering threads you forgot months ago.

**Other open-source reimplementations of Karpathy's LLM Wiki idea exist — but none of them ships as a one-click Obsidian plugin.** Most are CLI tools, Claude Code skills, or separate desktop apps. We are the only one with native UI, in-vault storage, and Obsidian's own Graph View built in.

### How we compare

|  | Karpathy LLM Wiki (this plugin) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **Delivery form** | ✅ One-click Obsidian plugin | ❌ Separate Tauri desktop app | ❌ Claude Code skill | ❌ Claude Code / Codex skill | ❌ CLI + SDK + MCP server |
| **Setup effort** | ✅ **5 minutes** — Community Plugins → Install → pick provider → Ingest | ❌ 30 min+ — compile/download binary, configure CLI | ❌ 15 min — needs Claude Code subscription + skill install | ❌ 10 min — needs Claude Code/Codex subscription + skill setup | ❌ 30 min+ — pip install + SDK + MCP config |
| **Install path** | ✅ Obsidian → Community Plugins → search → Install | ❌ Compile or download a separate binary, then configure CLI | ❌ Needs Claude Code subscription + install guide | ❌ Needs Claude Code or Codex subscription + setup steps | ❌ pip install + Python SDK + local server |
| **Architecture complexity** | ✅ **Zero dependencies** — no vector DB, no embedding model, no external processes | 🟡 Embeds its own Python runtime + sigma.js + sqlite | 🟡 Uses Claude Code's environment — not self-contained | 🟡 Requires separate platform runtime | ❌ Requires Python, embedding model, vector DB |
| **i18n (UI + wiki output)** | ✅ 10 languages (independent UI / output) | 🟡 2 (EN / 中文) | ❌ English only | ❌ English only | ❌ English only |
| **LLM providers** | ✅ 12+ (incl. Codex OAuth, Bedrock, LM Studio, Ollama, Anthropic-compatible, Kimi, GLM, MiniMax, DeepSeek) | 🟡 OpenAI-compatible | 🟡 Subscription via Claude Code | 🟡 Subscription via Claude Code / Codex | 🟡 OpenAI-compatible |
| **Retrieval algorithm** | ✅ Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 4-signal heuristic (Adamic-Adar + 2-hop decay) | ❌ Louvain community detection only | ❌ Louvain + k-hop previews | ❌ Hybrid: BM25 + semantic + wikilink |
| **Query pipeline (5-stage cascade)** | ✅ Lex → LLM keyword → substring scan → LLM KB fallback → PPR expansion (truncates on first sufficient signal) | 🟡 2-hop decay only | ❌ Louvain clustering only | ❌ k-hop previews (no LLM augment) | ❌ BM25 + semantic over chunks (no graph) |
| **Embeddings required** | ✅ No (zero embedding cost, by design) | 🟡 Optional, off by default | ✅ No | ✅ No | ❌ **Yes — mandatory** |
| **Graph visualization** | ✅ Obsidian's native Graph View (built in, zero extra size) | ❌ Custom sigma.js + graphology in desktop app | 🟡 vis.js graph.html (separate file) | ❌ Custom sigma.js offline HTML | ❌ Read-only browser viewer |
| **Wiki honesty** | ✅ "Stage FALLBACK" banner when no wiki source matches your query | ❌ No equivalent | ❌ No equivalent | ❌ No equivalent | ❌ No equivalent |
| **Published retrieval benchmark** | ✅ PPR @5 = 27.1% vs pure-kNN 24.1% (only published number in this space) | ❌ 58% → 71% *only with embeddings enabled*, not in our apples-to-apples format | ❌ Not published | ❌ Not published | ❌ Not published |

### Three things we chose on purpose, not by accident

- **🪟 Obsidian is the runtime.** No terminal, no separate app, no Docker, no Python. Install from Community Plugins, click Ingest, the wiki lives in your vault from the first second. Obsidian's native Graph View renders your `[[wiki-link]]` graph — built in, zero extra bundle size.
- **🧭 Clean and self-contained.** Zero dependencies. No embedding model, no vector database, no pip package — a single plugin that reads your notes, talks to an LLM, and writes wiki pages. Everything lives inside Obsidian.
- **🔌 Any model you already pay for.** Anthropic, Bedrock, OpenAI, ChatGPT Plan (Codex OAuth), DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter, Anthropic-compatible, custom endpoint — twelve-plus providers, none of them required to have an embedding endpoint.

---

## 🎯 Is it for me?

**✅ Yes, if you:**

- **Want a 5-minute setup, not a 5-hour project.** Install from Community Plugins → pick a provider → Ingest one note. No CLI, no Python, no separate runtime, no vector DB. You see wiki pages in `wiki/` within seconds.
- **Want something clean and self-contained.** The plugin has exactly zero external dependencies: no embedding model, no vector database, no pip package, no Docker container. It's a single Obsidian plugin that reads your notes, talks to an LLM, and writes wiki pages into your vault. Everything lives inside Obsidian.
- **Want a queryable chat that answers from *your* notes** — not the internet — with every answer carrying `[[wiki-links]]` back into your knowledge graph.
- **Care about data sovereignty** — runs fully local with Ollama or LM Studio, never touching the internet.
- **Write in or read from any of 10 supported languages** — the UI and wiki output language are independent (your wiki can be in Chinese while the interface is in English).
- **Maintain the graph by writing `[[wiki-links]]`** — every link you write already enriches retrieval; no separate tagging/embedding/indexing step.
- **Want one-click maintenance** — Lint health scan + Smart Fix All keep duplicates, dead links, and orphan pages in check without you hand-curating.

**❌ No, if you:**

- **Want a general-purpose ChatGPT replacement** — this plugin answers from *your* knowledge only.
- **Need a RAG pipeline over PDFs / web pages / external corpora** — we focus on the in-vault path (PDFs are supported as of v1.25.0).
- **Are looking for a hosted SaaS** — there's no backend, no server, no account.

---

## 🚀 Quick Start

1. **Install.** Obsidian → Settings → Community plugins → Browse → search "Karpathy LLM Wiki" → Install → Enable. Or visit the [Community Plugin page](https://community.obsidian.md/plugins/karpathywiki) and click **Add to Obsidian**.
2. **Configure a provider.** Open Settings → Karpathy LLM Wiki → pick a provider (OpenAI, Anthropic, Ollama, ChatGPT Plan (Codex OAuth), etc.) → enter API key (not needed for local) → click **Test Connection** → Save.
3. **Ingest one note.** Two ways:
   - **⌨️ Keyboard:** `Cmd+P/Ctrl+P` → "Ingest single source" → pick any Markdown (or PDF, v1.25.0+) file.
   - **🖱️ Toolbar icon:** Click the **sticker icon** in Obsidian's left ribbon to instantly ingest the currently-open note — no menu hunting.
   
   Your first wiki pages appear in `wiki/sources/`, `wiki/entities/`, `wiki/concepts/` within seconds.
4. **Query your wiki.** Two ways:
   - **⌨️ Keyboard:** `Cmd+P/Ctrl+P` → "Query wiki".
   - **🖱️ Toolbar icon:** Click the **message-circle icon** in Obsidian's left ribbon.
   
   A right-docked side panel opens (Copilot-style) where you can chat with your wiki. Answers carry `[[wiki-links]]` back into your knowledge graph.

![Query side panel](/docs/assets/query-side-panel.png)

That's it. The plugin modifies nothing in your original notes — only creates new pages under `wiki/`. Both **Ingest** and **Query wiki** are pinned to the left ribbon for one-click access anytime. (`Cmd` on macOS, `Ctrl` on Windows/Linux.)

### Core commands

| Command | What it does |
|---------|--------------|
| **📥 Ingest single source** | `Cmd+P/Ctrl+P` → "Ingest single source" — pick a Markdown or **PDF (v1.25.0+)** file, get entity/concept/wiki pages. *Also: 🖱️ ribbon sticker icon on the active note.* |
| **📂 Ingest from folder** | `Cmd+P/Ctrl+P` → "Ingest from folder" — batch-ingest every note in a folder, with smart batch skip |
| **📑 Ingest multiple files** | `Cmd+P/Ctrl+P` → "Ingest multiple files" — pick a subset via a two-pane file tree (with live queue + per-file cancel) |
| **🔍 Query wiki** | `Cmd+P/Ctrl+P` → "Query wiki" — chat with your wiki in a right-docked side panel; answers carry `[[wiki-links]]`. *Also: 🖱️ ribbon message-circle icon.* |
| **🛠️ Lint wiki** | `Cmd+P/Ctrl+P` → "Lint wiki" — full health scan: duplicates, dead links, empty pages, orphans, missing aliases, contradictions |
| **⚡ Smart Fix All** | inside Lint Modal — one-click causal-order repair with per-phase report |
| **📋 Regenerate index** | `Cmd+P/Ctrl+P` → "Regenerate index" — rebuild `wiki/index.md` with current pages and aliases |
| **⏹ Cancel** | `Cmd+P/Ctrl+P` → "Cancel current ingestion" or click the status bar — stops cleanly at the next batch boundary |
| **📊 Ingestion history** | `Cmd+P/Ctrl+P` → "View Ingestion History" — searchable UI for past ingestions, lint reports, maintenance runs |

![Command panel — all LLM Wiki commands live in Obsidian's command palette](/docs/assets/command-panel.png)

| Before | After |
|--------|-------|
| `notes/machine-learning.md` (a flat file) | `wiki/concepts/supervised-learning.md` with `[[bidirectional links]]`, aliases, source attribution, and an entry in `wiki/index.md` |

> 💡 **Stay updated.** New features, fixes, and performance improvements ship frequently. Settings → Community plugins → Check for updates, or enable automatic plugin updates.
> 📖 Detailed walkthroughs (installation, PDF setup, multi-provider notes, upgrades) are maintained in [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides).

---

## ✨ Features

### 📚 Knowledge quality

- **🔍 Entity & concept extraction** — LLM extracts entities (people, orgs, products, events) and concepts (theories, methods, terms) into standalone pages. Granularity is configurable (Minimal → Fine, plus Custom) so you trade cost vs. depth.
- **🏷️ Mandatory aliases** — every page ships with at least one alias (translation, abbreviation, variant) so cross-language duplicate detection works.
- **🔄 Tiered duplicate detection** — Tier 1 (direct name match: cross-language, abbreviation, high-similarity titles) is always verified; Tier 2 (shared links, medium similarity) fills remaining token budget.
- **🧩 Smart merge & contradiction state** — duplicates merge while preserving aliases; contradictions are flagged with source attribution; `reviewed: true` pages are protected from overwrite.
- **🎨 Custom tag vocabulary** — define your own entity-type and concept-type tag lists in Settings → Wiki → Tag Vocabulary → *Custom*; Lint reports any page whose tags fall outside the active vocabulary.

### 📄 PDF ingest (v1.25.0+)

- **🔌 Provider gate** — Anthropic, OpenAI, and Bedrock handle PDF natively. For any other OpenAI/Anthropic-compatible endpoint, enable **Force PDF Support** in Settings → LLM Configuration → Advanced to let the plugin attempt the call. For local OCR on Apple Silicon, third-party extractors (MinerU, Docling, Mathpix, Adobe), and the full PDF ingest walkthrough, see [PDF OCR Paths](#-pdf-ocr-paths) below and [docs/PDF-OCR-GUIDE.md](./docs/PDF-OCR-GUIDE.md).
- **🗄️ Bounded cache** — `.obsidian/plugins/karpathywiki/pdf-cache/` stores converted Markdown keyed by content hash + model + converter version. Three-defense-layer housekeeping: 100 MB total / 1000 entries / 10 MB single-entry caps with LRU-by-mtime eviction.
- **📝 Optional vault sidecar** — Settings → Wiki Configuration → Wiki Folder → *Write PDF Markdown to Vault* writes `<basename>.pdf.md` next to the source PDF (off by default — cache-only is the default).
- **🛡️ Verbatim transcriber prompt** — OCR-style conversion with `[illegible]` / `[figure: ...]` anti-hallucination markers; markdown-fence-wrapping from small local models is auto-cleaned before cache write.

### 📄 PDF OCR Paths

Three paths, pick what fits your setup:

1. **☁️ Cloud provider with native PDF support** — Anthropic, OpenAI, or AWS Bedrock read PDFs out of the box. Just ingest; no extra setup. For any other OpenAI/Anthropic-compatible endpoint, enable **Force PDF Support** in Settings → LLM Configuration → Advanced to let the plugin attempt the call.
2. **🖥️ Local OCR on Apple Silicon** — [oMLX](https://github.com/jundot/omlx) integrates Microsoft Markitdown as a built-in PDF→Markdown backend. Enable Markitdown in oMLX, load [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR) (3B / 570M-active, open-sourced 2026-06) as the vision model, point the plugin at oMLX as a Custom OpenAI-Compatible provider, turn on **Force PDF Support**, and pick the multimodal model oMLX is serving. The PDF never leaves your machine.
3. **🛠️ Third-party extractor (MinerU, Docling, Mathpix, Adobe)** — run a separate extractor on your PDFs to produce `.md` files, then ingest them as regular Markdown notes via the plugin\'s standard pipeline. Most reliable for scientific papers, scanned documents, math-heavy PDFs.

📖 **Full setup walkthroughs** for all three paths (cloud providers, oMLX hardware tiers, MinerU installation, cache housekeeping) → [docs/PDF-OCR-GUIDE.md](./docs/PDF-OCR-GUIDE.md)

### 💬 Query & maintenance

- **🧭 5-stage PPR cascade** — see [How retrieval works](#-how-retrieval-works). Personalized PageRank over `[[wiki-link]]` gives graph-aware multi-hop context.
- **🪟 Right-docked side panel** — Query Wiki opens in a Copilot-style right sidebar leaf (v1.22.1+) instead of a centered modal.
- **🔍 Lint health scan** — single command catches: duplicates, dead links, empty pages, orphans, missing aliases, contradictions.
- **⚡ Smart Fix All** — one-click causal-order repair: fill aliases → merge duplicates → fix dead links → link orphans → expand empty pages, with per-phase report.
- **📊 Operation history panel** — searchable, filterable UI for past ingestions, lint reports, and maintenance runs.
- **🛡️ Pre-ingest gate** — empty / whitespace / frontmatter-only notes are rejected before any LLM call; content-hash dedup catches identical files across paths.

### 🔒 Privacy

- **🚫 No backend, no tracking, no analytics.** Runs entirely inside Obsidian. Network is used only to communicate with the LLM provider you configure.
- **📁 Source files are read-only.** The plugin never modifies your original vault notes — only creates new pages under `wiki/`.
- **🦙 Full local mode.** Ollama, LM Studio, or any local OpenAI-compatible endpoint → your notes never leave your machine.
- **🔐 Minimal permissions.** Vault file access for wiki management. Clipboard access only when you click the "Copy" button in the Query modal.

### 🦙 Local-first

- **🖥️ Ollama, LM Studio, OpenRouter, custom endpoint** — out-of-the-box. Local models work for query (smaller context windows); ingest on a 2,000-page vault usually needs a long-context cloud model.
- **📄 PDF OCR path is fully local on Apple Silicon** — see [PDF OCR Paths](#-pdf-ocr-paths) below.
- **🔐 ChatGPT Plan (Codex OAuth)** — desktop loopback callback on `127.0.0.1:1455`; mobile via device-code. Credentials live only in Obsidian SecretStorage; sign-out clears them. Third-party Codex compatibility, not an OpenAI partnership.

### 🌐 Language

- **🌍 10 UI languages** — English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. UI and wiki-output language are independent — your wiki can be Chinese while the interface is English.
- **📚 10 wiki-output languages** — same set; pick in Settings → Wiki Configuration. *Custom input* option for ad-hoc prompts.
- **🈶 269+ translated UI strings** — every label, modal, and notice. Adding an 11th language is contributor-driven (PR #159 pattern).

---

## 🔍 How retrieval works

Most "AI search" plugins fragment your notes into chunks and embed them in a vector DB. We don't. Karpathy's argument against RAG is that chunking breaks the LLM's ability to reason across your whole knowledge graph — and that argument holds up in practice. Instead, we walk the graph you already maintain by writing `[[wiki-links]]`.

### The 5-stage seed-selection cascade

When you ask "Who founded Microsoft?", Query Wiki runs five stages before any answer generation:

1. **Lex fast path** — straight token-overlap against every entity/concept title and aliases. Free, instant, and the gating step for everything that follows.
2. **LLM keyword generation** — the LLM proposes 8–12 cross-language keywords from your query (handles synonyms, abbreviations, and token-overlap-resistant terms in one LLM call).
3. **Local substring scan** — every generated keyword is re-matched locally against page titles, aliases, and body snippets. No extra LLM call; rounds out noise-tolerant recall.
4. **LLM KB fallback** — when lex + keyword scan returns weak signals, the LLM re-seeds the top-N candidates against the full wiki for one semantic pass.
5. **PPR graph expansion** — Personalized PageRank (Haveliwala 2002) over the `[[wiki-link]]` graph starting from the candidate seed set. This is what gives graph-aware multi-hop context: "Bill Gates" → "Microsoft" → "competitors", not just literal title overlap.

The cascade truncates at whichever step returned enough signal — no fixed 5-step cost, no LLM calls when lex is sufficient, no lost precision when LLM augmentation is needed.

### Personalized PageRank at scale

We use Monte Carlo PPR (Fogaras 2005) — 3,000 random walks × 50 steps each — with the dead-end rule from Haveliwala 2002. Cost is **O(K × L)** independent of the number of pages, so a 2,000-page vault sees the same expansion latency as a 200-page one.

**PPR @5 = 27.1% vs pure-kNN baseline 24.1%** on the project's own benchmark corpus (the only published retrieval benchmark in this open-source LLM-Wiki space).

### Why no embeddings

We deliberately rejected the embedding path in [Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175). The graph signal is already there — every `[[wiki-link]]` is a hand-curated "these are related" edge, and most providers we support (Ollama, LM Studio, Anthropic, Bedrock, Kimi, GLM, MiniMax) don't ship a `/v1/embeddings` endpoint at all. Adding an embedding model would mean a per-page download, a per-provider adapter, and zero benefit on retrieval quality.

---

## 🤖 Models

**Supported providers (12+, all from models.dev cross-check 2026-07):**

| Provider | Series | Notes |
|----------|--------|-------|
| **Anthropic** | Claude 5 series | Native PDF; `/v1/messages` protocol |
| **OpenAI** | GPT-5.6 series (Sol / Terra / Luna) | Native PDF; Platform API key |
| **Google Gemini** | Gemini 3.6 series | Native PDF (file parts since 1.5); OpenAI-compatible endpoint |
| **DeepSeek** | DeepSeek V4 series | OpenAI-compatible; lowest cost tier |
| **Alibaba Qwen** | Qwen3.7/3.8 series | OpenAI-compatible (DashScope) |
| **xAI Grok** | Grok 4 series | OpenAI-compatible; long context |
| **Moonshot Kimi** | Kimi K3 series | OpenAI-compatible; 2.8T MoE frontier |
| **Zhipu GLM** | GLM-5 series | OpenAI-compatible; strong bilingual |
| **MiniMax** | MiniMax M3 series | OpenAI-compatible; 1M context |
| **Step (阶跃星辰)** | Step 3 series (Flash) | OpenAI-compatible; fast inference |
| **Tencent Hunyuan** | Hy3 series | OpenAI-compatible; open-weight MoE |
| **Xiaomi MiMo** | MiMo V2.5 series | MIT open-source; flat pricing |
| **Google Gemma** | Gemma 4 series | Open-weight; 262K context |
| **AWS Bedrock** | Anthropic + OpenAI variants | VPC / compliance path |
| **ChatGPT Plan (Codex OAuth)** | Codex Responses API | Browser/device-code sign-in; SecretStorage |
| **Local: Ollama, LM Studio, OpenRouter, Anthropic-Compatible** | Any OpenAI-/Anthropic-protocol model | Custom OpenAI-Compatible + Anthropic-Compatible (Token Plan / Coding Plan) |

This plugin feeds the LLM your full Wiki context per query — so **long-context models win**. The full tiered table (cloud + local) lives in [docs/MODEL-GUIDE.md](./docs/MODEL-GUIDE.md), cross-checked against [models.dev](https://models.dev/) so the picks stay current.


### What matters

- **🧠 Context window ≥ 200K tokens** for vaults over ~500 pages. Below 200K the cascade's assembled context starts getting truncated.
- **⚖️ Instruction-following quality** matters more than raw IQ for the extraction task — pick a model that follows the schema template, not the biggest leaderboard number.
- **🔌 Embedding endpoint is irrelevant** — we don't use embeddings. A provider that lacks `/v1/embeddings` is fine (most of our 12+ providers do).
- **🦙 Local works for query, cloud for ingest** — ingest on a 2,000-page vault usually needs a long-context cloud model; a 262K local model covers most queries.

### Anthropic vs OpenAI vs Codex OAuth — they are distinct providers

- **Anthropic** (and its Bedrock variant) — separately billed Anthropic Platform API key.
- **OpenAI** — separately billed OpenAI Platform API key.
- **ChatGPT Plan (Codex OAuth)** — experimental, distinct provider that uses eligible Codex allowance after browser or device-code sign-in; availability follows OpenAI Codex authentication and allowance policies, not plan name. Third-party Codex compatibility, not an OpenAI partnership or a general ChatGPT API.

> 📖 **Full pick table** (cloud + local + PDF OCR + Codex OAuth + quantization + hardware tiers) → [docs/MODEL-GUIDE.md](./docs/MODEL-GUIDE.md)

## ❓ FAQ

### What does the plugin actually do?

Pick any note, folder, or selection; the LLM extracts entities and concepts and generates an interlinked wiki with `[[bidirectional links]]`. Ask questions and get conversational answers grounded in *your* notes, not the internet. Your original vault notes are never modified.

### How do I get started?

Install from Obsidian Community Plugins → pick a provider → **Test Connection** → run **Ingest single source** on any note. First wiki pages appear within seconds. See [Quick Start](#-quick-start).

### Is my existing wiki safe?

✅ Backward compatible since v1.0.0. Set `reviewed: true` on any page to protect it from overwrite. Upgrading from v1.24.x doesn't rewrite your vault; v1.25.0's PDF ingest is cache-only by default.

### Is my data sent anywhere?

🚫 No backend, no analytics — the plugin runs entirely inside Obsidian. Only text you explicitly send for ingest/query leaves your device, and only to the LLM provider you configure. For complete data locality, use Ollama or LM Studio.

### Can I use the plugin in my language?

🌍 10 languages for both UI and wiki output. UI and wiki language are independent. Adding an 11th language is contributor-driven (PR #159 pattern).

### How is this different from a RAG chatbot?

🚫 No chunking. 🚫 No embeddings. 🚫 No vector DB. ✅ Personalized PageRank over your existing `[[wiki-link]]` graph — graph-aware multi-hop context, zero embedding cost, full local-model support.

### Which LLM should I use?

Long-context models (≥200K tokens) work best. The [Models section](#-models) covers the principles; the full tiered table is in [docs/MODEL-GUIDE.md](./docs/MODEL-GUIDE.md).

### Is there a published benchmark?

Yes — PPR @5 = 27.1% vs pure-kNN baseline 24.1% on the project's own corpus. The full pipeline and benchmark script are described in [How retrieval works](#-how-retrieval-works).

### How do I control API costs?

Use Coarse or Minimal extraction granularity for batch ingest. Smart Batch Skip auto-detects already-ingested files. Auto-Maintenance is OFF by default. Lint shows counts before running fixes — nothing is charged without your approval.

### How do I cancel a running operation?

Click the status bar (shows "Ingesting… click to cancel") or `Cmd+P/Ctrl+P` → "Cancel current ingestion". Stops cleanly at the next batch boundary.

### Where do I get help?

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) for bug reports · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) for questions and feature requests · Developer Console (`Ctrl+Shift+I` / `Cmd+Option+I`) for plugin logs.

---

## 🔒 Privacy

This plugin is listed on the Obsidian Community Plugin Market and undergoes automated review for security and permissions.

- **🚫 No backend, no server, no data collection.** Pure local software running inside Obsidian. The plugin cannot and does not collect, store, or transmit your data to any server — because no such server exists.
- **🔐 Network access is opt-in.** Used only to communicate with the LLM provider you configure. You choose the provider, you enter the API key, you decide where your data goes.
- **📁 Vault file access** is used for wiki management (reading notes, generating pages, scanning dead links, detecting duplicates). The plugin never modifies your source files.
- **📋 Clipboard access** is used exclusively by the "Copy" button in the Query modal — and only when you click it.

For complete data locality, use Ollama or LM Studio. With a local provider, your data never leaves your machine.

---

## 💖 Support

If LLM-Wiki has become a meaningful part of your knowledge workflow:

- ☕ **[Buy me a Ko-fi](https://ko-fi.com/greenerdalii)** — one-time or monthly
- 💳 **[Tip via PayPal](https://paypal.me/greenerdalii)** — one-time tip

Sponsorship is entirely optional. The plugin stays Apache-2.0-licensed and feature-complete regardless.

Thanks to [@jameses-cyber](https://github.com/jameses-cyber) and [@issaqua](https://github.com/issaqua) for supporting the project.

---

## 📜 License & Credits

Apache License, Version 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

**Built on:**
- 💡 [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original concept
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) and [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — retrieval algorithms

**Maintainer:** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
