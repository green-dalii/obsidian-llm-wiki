![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki Plugin for Obsidian

> AI-powered structured knowledge base that ingests your notes and generates a connected Wiki — based on [Andrej Karpathy's LLM Wiki concept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Author:** Greener-Dalii | **Version:** 1.2.0

[English](README.md) | [中文文档](README_CN.md)

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

**Ollama (local, no API key):** Install [Ollama](https://ollama.com), pull a model (`ollama pull gemma3`), select "Ollama (Local)" in the provider dropdown.

> See [README_CN.md](README_CN.md) for provider-specific instructions in Chinese.

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

---

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

- **Concept:** [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the original vision that inspired this plugin
- **Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
