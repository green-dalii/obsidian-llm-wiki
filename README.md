# LLM Wiki Plugin for Obsidian

An Obsidian plugin implementing Karpathy's [LLM Wiki concept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) - building and maintaining a persistent knowledge base with LLM assistance.

## Features

- 🤖 **Multi-Provider Support**: Anthropic (Claude) and OpenAI/compatible endpoints
- 📝 **Intelligent Ingestion**: Extract key information from source documents
- 🔗 **Bidirectional Links**: Native Obsidian `[[wiki-links]]` syntax
- 📊 **Knowledge Graph**: Visualize relationships with Obsidian's graph view
- 🔍 **Wiki Query**: Ask questions and get synthesized answers
- 🛠️ **Auto Maintenance**: Detect contradictions, outdated info, orphaned pages
- 📑 **Index Generation**: Auto-generated `index.md` and `log.md`

## Architecture

Based on Karpathy's three-layer separation:

```
sources/     # Original documents (read-only)
  ↓ ingest
wiki/        # LLM-generated Wiki pages
  ↓ query/maintain
schema/      # Workflow configuration (future)
```

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, `styles.css` from [releases](https://github.com/yourusername/llm-wiki-plugin/releases)
2. Copy to your vault: `.obsidian/plugins/llm-wiki-plugin/`
3. Enable in Obsidian Settings → Community plugins

### Development Build

```bash
git clone https://github.com/yourusername/llm-wiki-plugin.git
cd llm-wiki-plugin
pnpm install
pnpm build
```

## Configuration

### LLM Provider

**Anthropic (Claude)**
- Provider: `Anthropic (Claude)`
- API Key: `sk-ant-...`
- Model: `claude-sonnet-4-6`

**OpenAI / Compatible**
- Provider: `OpenAI / OpenAI Compatible`
- API Key: `sk-...`
- Base URL (optional): Custom endpoint (e.g., `http://localhost:11434/v1` for Ollama)
- Model: `gpt-4o`

### Workflow

1. **Configure Provider**: Settings → LLM Wiki → Provider/API Key → Test Connection → Save
2. **Prepare Sources**: Create `sources/` folder, add Markdown files
3. **Ingest**: `Cmd+P` → "Ingest Sources" → Generates Wiki pages
4. **Query**: `Cmd+P` → "Query Wiki" → Ask questions
5. **Maintain**: `Cmd+P` → "Lint Wiki" → Detect issues

### Settings

- **Test Connection**: Validate configuration before saving
- **Save Settings**: Explicit save button (no auto-save)
- **Status Display**: Shows LLM Client initialization state
- **Source Folder**: Default `sources`
- **Wiki Folder**: Default `wiki`

## Commands

| Command | Description |
|---------|-------------|
| **Ingest Sources** | Process source documents → generate Wiki pages |
| **Query Wiki** | Ask questions → get synthesized answers |
| **Lint Wiki** | Detect contradictions, outdated info, orphaned pages |
| **Generate Index** | Create `wiki/index.md` with recent updates |

## Security

### OpenAI Browser Environment

OpenAI SDK requires `dangerouslyAllowBrowser: true` for Obsidian's Electron environment. This is safe because:

- Obsidian is a **local Electron app**, not a web browser
- API keys are stored in **local files** (`.obsidian/plugins/data.json`)
- No cross-origin script attacks
- Community standard practice

See [SECURITY.md](docs/SECURITY.md) for detailed analysis.

### Alternatives

- **Local LLM**: Use Ollama (`http://localhost:11434/v1`) - no API key exposure
- **Anthropic**: No browser restrictions

## Example

**Input** (`sources/machine-learning.md`):
```markdown
# Machine Learning

Machine learning uses algorithms to learn from data...

## Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Output** (`wiki/machine-learning.md`):
```markdown
# Machine Learning

Core concepts and algorithms for learning from data.

## Key Concepts
- [[Supervised Learning]]: Learning from labeled data
- [[Unsupervised Learning]]: Discover patterns in unlabeled data
- [[Reinforcement Learning]]: Learn through interaction

## Related
- [[Deep Learning]]
- [[Neural Networks]]
```

## Technical Details

- **TypeScript** implementation
- **Obsidian Plugin API**: File system, editor, UI components
- **Anthropic SDK**: Claude integration
- **OpenAI SDK**: GPT integration with custom endpoints
- **esbuild**: Build system

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

## License

MIT License - see [LICENSE](LICENSE)

## Credits

- Concept: [Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- Built with [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issues](https://github.com/yourusername/llm-wiki-plugin/issues)
- 💬 [Discussions](https://github.com/yourusername/llm-wiki-plugin/discussions)

---

**Version**: 0.2.2 | **Status**: Active | **Author**: Your Name