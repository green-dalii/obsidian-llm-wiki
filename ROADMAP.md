# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.2.0 | **Updated:** 2026-04-27

---

## Current Status

### Implemented

**Core Features**
- Multi LLM Provider support (Anthropic, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, Custom)
- Dynamic model list fetching (real-time from API)
- Intelligent ingestion: automatic entity/concept extraction and Wiki page generation
- Bidirectional links: native Obsidian `[[wiki-links]]` syntax
- Knowledge graph visualization (via Obsidian Graph View)
- Conversational Query: ChatGPT-style dialog with streaming Markdown, multi-turn history, Wiki saving
- Auto maintenance: manual lint for contradictions, stale info, orphaned pages
- Auto-generated index (`index.md`) and log (`log.md`)
- Internationalization: English and Chinese UI (default: English)

**Quality / Engineering**
- Full Unicode filename support (Chinese, Japanese, Korean)
- Enhanced JSON parsing with LLM-based repair fallback
- Modular architecture (main.ts split into llm-client, wiki-engine, query-engine, settings, modals, utils, types, texts)
- Code quality: no `any` types, no inline styles, Obsidian API compliance (ESLint clean)
- Dynamic settings UI with language switcher

---

## Short-term Planning (v1.3.x)

### Priority: High

#### 1. Schema Workflow Configuration

**Goal:** Implement the missing third layer from Karpathy's design — a config file that governs how the LLM operates on the Wiki.

**Scope:**
- `schema/config.md` — human + LLM co-edited config defining wiki structure, naming conventions, page templates
- Prompt injection: Schema content fed to LLM during ingest, query, and lint operations
- Template enforcement: Entity/concept pages generated according to Schema-defined sections

**Challenges:**
- Balancing flexibility with usability
- Co-evolution workflow (how user edits schema, how LLM suggests schema changes)
- Backward compatibility with existing Wiki pages

#### 2. Automated Maintenance (File Watcher + Periodic Tasks)

**Goal:** Evolve from manual-only maintenance to automatic triggers.

**Scope:**
- **File watcher:** Listen to `vault.on('modify')` / `vault.on('create')` on `sources/` directory → auto-ingest changed files
- **Periodic lint:** Use `setInterval` to run lint on a configurable schedule (hourly/daily)
- **Startup check:** On plugin load, optionally scan Wiki health and notify
- **User control:** Toggle on/off per automation feature in settings; auto-ingest can be "notify only" or "auto-run"

**API foundation (all available in Obsidian v1.12.x):**
- `vault.on('create' | 'modify' | 'delete' | 'rename')` — file change triggers
- `metadataCache.on('changed' | 'resolved')` — content indexing events
- `workspace.on('file-open')` — user activity context
- `window.setInterval` / `window.setTimeout` — periodic execution

**Challenges:**
- API cost control (rate limiting, debouncing auto-ingest)
- Graceful degradation when LLM is unavailable
- Avoiding ingest loops (plugin-generated wiki pages must not trigger re-ingest)

---

### Priority: Medium

#### 3. Smart Ingestion Detection

Avoid redundant ingestion, save API costs, protect manual edits.

- Compare source mtime with last ingest timestamp
- Ask user before re-ingesting unchanged files
- Incremental summary updates (merge, not overwrite)

#### 4. Error Recovery

- Retry with auto-skip on already-processed files
- Save ingestion progress for resume after interruption
- Detailed failure diagnostics

---

## Long-term Vision (v2.x)

| Feature | Description |
|---------|-------------|
| **Wiki Content Export** | GraphML, JSON, static site formats |
| **Agent Mode** | Full auto-maintain lifecycle, proactive suggestions |
| **Multi-modal Support** | Images, PDF, audio/video knowledge extraction |
| **Collaborative Wiki** | Multi-user editing, Git/Sync integration |

---

## Version Timeline

| Version | Target | Key Features | Status |
|---------|--------|-------------|--------|
| **v1.2.0** | 2026-04 | Modular refactor, ESLint compliance, i18n | Submitted for review |
| **v1.3.0** | TBD | Schema layer + automated maintenance | Planning |
| **v2.0.0** | TBD | Agent mode + multi-modal | Concept |

---

## Contributing

See [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) for current priorities.

**Last Updated:** 2026-04-27 | **Maintainer:** Greener-Dalii
