# Karpathy LLM Wiki Plugin for Obsidian

> 🤖 A complete implementation of Karpathy's LLM Wiki concept — multi-page knowledge generation system

**Author:** green-dalii | **Version:** 1.2.0 | **Status:** Production Ready

[English](README.md) | [中文文档](README_CN.md)

---

## Features

- 🤖 **Multi-Provider Support**: Anthropic (Claude), OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, and custom compatible endpoints
- 🌍 **Internationalization**: English and Chinese interface (default: English)
- 📝 **Intelligent Ingestion**: Auto-extract entities and concepts, generate Wiki pages
- 🔗 **Bidirectional Links**: Native Obsidian `[[wiki-links]]` syntax
- 📊 **Knowledge Graph**: Visualize relationships with Obsidian's Graph View
- 🔍 **Conversational Query**: ChatGPT-style interface with streaming, Markdown rendering, and optional Wiki saving
- 🛠️ **Auto Maintenance**: Detect contradictions, outdated info, orphaned pages
- 📑 **Auto Index**: `index.md` and `log.md` maintained automatically

---

## Architecture

Based on Karpathy's three-layer separation:

```
sources/     # Source documents (read-only)
  ↓ ingest
wiki/        # LLM-generated Wiki pages
  ↓ query/maintain
schema/      # Workflow configuration (future)
```

**Generated page structure:**
- `wiki/sources/filename.md` — Source summary page
- `wiki/entities/entity-name.md` — Entity detail page (person, org, project, etc.)
- `wiki/concepts/concept-name.md` — Concept explanation page (theory, method, term, etc.)
- `wiki/index.md` — Wiki index
- `wiki/log.md` — Operation log

---

## Quick Start

### Installation

#### Manual Installation

1. Download the latest release from [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases):
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. Copy to your vault: `.obsidian/plugins/llm-wiki/`
3. Enable in Obsidian: Settings → Community plugins → Karpathy LLM Wiki

#### Development Build

```bash
git clone https://github.com/green-dalii/obsidian-llm-wiki.git
cd obsidian-llm-wiki
pnpm install
pnpm build
```

### Configure LLM Provider

#### 1. Anthropic (Claude)

- Provider: `Anthropic (Claude)`
- API Key: `sk-ant-...` (from [Anthropic Console](https://console.anthropic.com/))
- Click "Fetch Models" → select from dropdown (e.g., `claude-sonnet-4-6`)
- Click "Test Connection" → "Save Settings"

**Cost reference:**
- Claude Sonnet 4.6: ~$3/M input tokens, ~$15/M output tokens
- Each ingestion consumes ~2000-5000 tokens (~$0.01-0.08)

#### 2. OpenAI

- Provider: `OpenAI`
- API Key: `sk-...` (from [OpenAI Platform](https://platform.openai.com/))
- Model: `gpt-4o` or `gpt-4o-mini`

#### 3. DeepSeek / Kimi / GLM

- Provider: select the respective service
- API Key: obtain from the platform
- Base URL and default model filled automatically

#### 4. Ollama (Local Model)

- Provider: `Ollama (Local)`
- No API Key required
- Base URL: `http://localhost:11434/v1` (auto-filled)
- Model: enter local model name (e.g., `llama3`, `qwen2`)

**Prerequisites:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3
ollama pull qwen2  # Recommended for Chinese
```

#### 5. Custom OpenAI-Compatible Service

- Provider: `Custom OpenAI Compatible`
- Base URL: your API endpoint (e.g., `http://your-server:8000/v1`)
- API Key: as required by your provider
- Model: enter model name manually

### Basic Workflow

#### Method 1: Ingest from Source Folder

```bash
# Create source folder
mkdir sources

# Add Markdown files
sources/machine-learning.md
sources/data-science.md
```

In Obsidian: `Cmd+P` → "Ingest Sources" → auto-process `sources/`

#### Method 2: Initialize from Existing Folder

```bash
# Your existing notes
notes/
  ├── programming/
  ├── research/
  └── daily/
```

In Obsidian: `Cmd+P` → "Ingest from Folder" → select `notes/programming` → auto-generate Wiki

#### Method 3: Conversational Query

ChatGPT-style dialog for querying your Wiki:
- `Cmd+P` → "Query Wiki" → opens conversation modal
- Type a question → real-time streaming reply (Markdown rendered)
- Follow-up questions supported, history visible
- Click "Save to Wiki" to extract knowledge as Wiki pages

### Settings

- **Interface Language**: English (default) or Chinese
- **Conversation History Limit**: Max rounds (default: 10, recommended: 10-15)
- **Wiki Folder**: Location for generated Wiki pages (default: `wiki`)

**Query Features:**
- **ChatGPT-Style Interface**: 780px-height conversational modal
- **Streaming Responses**: Real-time LLM output with visual feedback
- **Markdown Rendering**: Full Obsidian syntax (`[[wiki-links]]`, callouts, code blocks)
- **Multi-turn Conversation**: Follow-up without reopening modal
- **History Management**: Auto-truncate to avoid token overflow
- **Save to Wiki**: Extract valuable conversations as structured Wiki pages

---

## Commands

| Command | Description |
|---------|-------------|
| **Ingest Sources** | Process `sources/` folder → generate Wiki pages |
| **Ingest from Folder** | Select any folder → initialize Wiki from existing notes |
| **Query Wiki** | Ask questions → get synthesized answers based on Wiki |
| **Lint Wiki** | Detect contradictions, outdated info, orphaned pages |
| **Generate Index** | Manually regenerate `wiki/index.md` |

---

## Usage Example

### Input

**Source:** `sources/machine-learning.md`

```markdown
# Machine Learning

Machine learning uses algorithms to learn from data...

## Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

### Output

**Summary page:** `wiki/sources/machine-learning.md`

```markdown
# Machine Learning

Core concepts and algorithms for learning from data.

## Key Concepts
- [[Supervised Learning]] — Learning from labeled data
- [[Unsupervised Learning]] — Discover patterns in unlabeled data
- [[Reinforcement Learning]] — Learn through interaction
```

**Entity page:** `wiki/entities/supervised-learning.md`

```markdown
# Supervised Learning

## Definition
Supervised learning is a machine learning method that learns predictive models from labeled data.

## Key Features
- Requires labeled dataset
- Common algorithms: linear regression, decision trees, neural networks

## Related Concepts
- [[Machine Learning]]
- [[Unsupervised Learning]]
```

---

## Incremental Update Mechanism

**Behavior when re-ingesting the same source:**

| Page Type | Behavior | Notes |
|-----------|----------|-------|
| **Summary page** | Recreated | Overwritten on each ingestion |
| **Entity page** | Incrementally updated | New info merged into existing page |
| **Concept page** | Incrementally updated | New info merged into existing page |

**Best practices:**
- First ingestion of a new source → creates full Wiki
- Re-ingest after source updates → entity/concept pages intelligently merged
- Avoid re-ingesting unchanged files (wastes API costs)
- To regenerate a summary page, delete the old one first

---

## Security

### OpenAI Browser Environment

OpenAI SDK requires `dangerouslyAllowBrowser: true` for Obsidian's Electron environment. This is safe because:

- Obsidian is a **local Electron app**, not a web browser
- API keys are stored in **local files** (`.obsidian/plugins/data.json`)
- No cross-origin scripting risks
- Standard practice in Obsidian plugin development

### Recommended Security Practices

1. **Use local models**: Ollama requires no API key, fully local
2. **Anthropic**: No browser environment restrictions
3. **API Key management**: Rotate keys regularly, avoid exposure

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features:

- Smart ingestion detection (avoid redundant processing)
- Multi-language support
- Knowledge graph export
- Schema workflow configuration
- Collaboration support

---

## Troubleshooting

### Common Issues

#### 1. Ingestion fails: "Please configure API Key first"

**Cause:** LLM Client not initialized

**Solution:**
- Settings → LLM Wiki → fill in API Key
- Click "Test Connection" to validate
- Click "Save Settings"

#### 2. Generated Wiki pages rendered as code blocks

**Cause:** LLM response wrapped in ```` ```markdown ````

**Solution:** Fixed in v1.0.7+, uses `cleanMarkdownResponse()` to auto-remove code block markers.

#### 3. Chinese filenames become `untitled-xxx`

**Cause:** slugify function didn't support CJK characters

**Solution:** Fixed in v1.0.3+, now supports full Unicode (Chinese, Japanese, Korean).

#### 4. JSON parsing fails: "Source analysis failed"

**Cause:** LLM returned malformed JSON

**Solution:** Enhanced in v1.0.8+, now with LLM-based repair fallback:
- Cleans markdown wrapping
- Extracts JSON objects
- Fixes common issues (trailing commas, unescaped quotes)
- Detailed logging for debugging

**Debug:** Open Developer Tools (View → Toggle Developer Tools) for detailed logs.

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Submit a Pull Request

**Development standards:**
- TypeScript, follow project code style
- Add necessary logging and error handling
- Update version numbers (manifest.json, package.json, versions.json)
- Follow conventional commit format

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Acknowledgments & Credits

### Concept Origin
This project implements **Karpathy's LLM Wiki** concept:

- **Original Concept:** [Andrej Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- **Core Idea:** Three-layer separation (Sources → Wiki → Schema) with automated knowledge graph generation
- **Inspiration:** Karpathy's vision of "LLM as Wiki maintainer"

We deeply thank **Andrej Karpathy** for sharing this innovative concept.

### Technology Stack
- **Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript), [OpenAI SDK](https://github.com/openai/openai-node)
- **Build:** [esbuild](https://github.com/evanw/esbuild)

---

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues)
- 💬 [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

**Version**: 1.2.0 | **Status**: Production Ready | **Author**: green-dalii
