![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki Plugin for Obsidian

> AI-powered structured knowledge base that ingests your notes and generates a connected Wiki — based on [Andrej Karpathy's LLM Wiki concept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Author:** Greener-Dalii | **Version:** 1.3.1

[English](README.md) | [中文文档](README_CN.md) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

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

- **Your Graph View comes alive.** New notes don't just sit there — they sprout links to entities, concepts, and sources. The graph grows organically, not manually.
- **Your notes learn to talk back.** Search becomes conversation. "What did I write about X?" becomes a dialogue, with streaming responses and `[[wiki-links]]` as breadcrumbs.
- **Obsidian becomes a thinking partner.** It stops being a cabinet for notes and starts being something that helps you *think* — surfacing connections, spotting gaps, remembering what you forgot you knew.

---

## Features

- **Multi-Provider LLM Support** — Anthropic (Claude), OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, and custom OpenAI-compatible endpoints
- **Internationalization** — English and Chinese UI (default: English)
- **Intelligent Ingestion** — Auto-extract entities and concepts from source notes, generate structured Wiki pages
- **Bidirectional Links** — Native Obsidian `[[wiki-links]]` across all generated pages
- **Knowledge Graph** — Visualize entity/concept relationships in Obsidian's Graph View
- **Conversational Query** — ChatGPT-style dialog with streaming Markdown responses, multi-turn history, and optional Wiki saving
- **Auto Maintenance** — Lint for contradictions, stale info, and orphaned pages
- **Auto Index** — `index.md` and `log.md` maintained automatically

---

## Quick Start

### Installation

**Manual (recommended):**

1. Download `main.js`, `manifest.json`, `styles.css` from [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. In Obsidian, go to Settings → Community plugins. On the **Installed plugins** tab, click the folder icon to open your plugins directory
3. Create a folder named `llm-wiki`, drop the three files inside
4. Back in Obsidian, click the refresh icon — **Karpathy LLM Wiki** will appear under Installed plugins
5. Toggle it on to enable

**Development:** `git clone`, `pnpm install`, `pnpm build`.

### Configure an LLM Provider

1. Open Settings → Karpathy LLM Wiki
2. Pick a provider from the dropdown (Anthropic, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter, or custom)
3. Enter your API key (not needed for Ollama)
4. Click **Fetch Models** to populate the model dropdown, or type a model name manually
5. Click **Test Connection**, then **Save Settings**

**Ollama (local, no API key):** Install [Ollama](https://ollama.com), pull a model (`ollama pull gemma4`), select "Ollama (Local)" in the provider dropdown.

> See [README_CN.md](README_CN.md) for provider-specific instructions in Chinese.

### Model Selection Guide

This plugin follows Karpathy's philosophy: **feed the LLM full Wiki context, not chunked RAG retrieval**. Long-context models are strongly recommended — the larger your Wiki grows, the more context the LLM needs to maintain cross-page consistency and answer questions accurately.

> Why not RAG/embeddings? Karpathy's [original critique](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) argues that RAG fragments knowledge and breaks the LLM's ability to reason across the full knowledge graph. A single long-context LLM call over the relevant Wiki pages preserves relational understanding.

**Top recommendations:**

| Model | Context Window | Why |
|-------|---------------|-----|
| **DeepSeek V4** | 1M tokens | **Best value — ultra-low pricing, strong Chinese support. Ideal for large Wikis.** |
| **Gemini 3.1 Pro** | 1M+ tokens | **Largest context window. Strong reasoning (ARC-AGI-2 77.1%). Excellent for very large Wikis.** |
| **Claude Opus 4.7** | 1M tokens | **Strongest agentic coding and reasoning. Best for complex multi-page synthesis.** |
| **GPT-5.5** | 1M tokens | **Latest OpenAI flagship (Apr 2026). Top AI intelligence index. Excellent for knowledge work.** |
| **Claude Sonnet 4.6** | 1M tokens | Great balance of speed, cost, and quality for mid-size Wikis |

For local models (Ollama): context windows are typically smaller (8K–128K). Consider limiting Wiki scope or using a cloud provider for ingestion + local model for query.

### Usage

| Method | How |
|--------|-----|
| **Ingest from `sources/`** | `Cmd+P` → "Ingest Sources" — processes the entire `sources/` folder |
| **Ingest any folder** | `Cmd+P` → "Ingest from Folder" — pick a folder, generate Wiki from existing notes |
| **Query Wiki** | `Cmd+P` → "Query Wiki" — ask questions, get streaming answers with `[[wiki-links]]` |

Re-ingesting the same source does incremental updates on entity/concept pages (new info merged in). Summary pages are regenerated.

---

## Commands

| Command | Description |
|---------|-------------|
| **Ingest Sources** | Process `sources/` → generate Wiki pages |
| **Ingest from Folder** | Select any folder → generate Wiki from existing notes |
| **Query Wiki** | Conversational Q&A over your Wiki, with streaming |
| **Lint Wiki** | Detect contradictions, stale info, orphaned pages |
| **Generate Index** | Manually regenerate `wiki/index.md` |

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

**Output — Summary:** `wiki/sources/machine-learning.md`

```markdown
# Machine Learning
Core concepts and algorithms for learning from data.

## Key Concepts
- [[Supervised Learning]] — Learning from labeled data
- [[Unsupervised Learning]] — Discover patterns in unlabeled data
- [[Reinforcement Learning]] — Learn through interaction
```

**Output — Entity:** `wiki/entities/supervised-learning.md`

```markdown
# Supervised Learning

## Definition
Supervised learning learns predictive models from labeled data.

## Key Features
- Requires labeled dataset
- Common algorithms: linear regression, decision trees, neural networks

## Related Concepts
- [[Machine Learning]]
- [[Unsupervised Learning]]
```

---

## Architecture

Karpathy's three-layer separation design:

```
sources/     # Your source documents (read-only)
  ↓ ingest
wiki/        # LLM-generated Wiki pages
  ↓ query / maintain
schema/      # Workflow configuration (planned)
```

**Generated pages:**
- `wiki/sources/filename.md` — Source summary
- `wiki/entities/entity-name.md` — Entity pages (people, orgs, projects, etc.)
- `wiki/concepts/concept-name.md` — Concept pages (theories, methods, terms, etc.)
- `wiki/index.md` — Auto-generated index
- `wiki/log.md` — Operation log

---

## Troubleshooting

**"Please configure API Key first"** — Go to Settings → LLM Wiki, enter your API key, click Test Connection then Save.

**Wiki pages show as code blocks** — Fixed in v1.0.7+. Rebuild affected pages.

**Chinese filenames become `untitled-xxx`** — Fixed in v1.0.3+. Full Unicode supported.

**JSON parsing / "Source analysis failed"** — Fixed in v1.0.8+ with LLM-based repair fallback. Open Developer Tools (`Ctrl+Shift+I`) for detailed logs.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push and open a Pull Request

Use TypeScript, follow existing code style, and update version numbers in `manifest.json`, `package.json`, and `versions.json`.

Questions, ideas, or want to share how you use LLM-Wiki? Join the [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

---

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

- **Concept:** [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original vision that inspired this plugin
- **Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
