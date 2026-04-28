# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.4.0 | **Updated:** 2026-04-29

---

## Current Status

### Implemented (v1.4.0)

**Core Features**
- Multi LLM Provider support (Anthropic, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, Custom)
- Dynamic model list fetching (real-time from API)
- Intelligent ingestion: automatic entity/concept extraction and Wiki page generation
- Bidirectional links: native Obsidian `[[wiki-links]]` syntax
- Conversational Query: ChatGPT-style dialog with streaming Markdown
- Schema layer: `schema/config.md` with selective injection per task
- Auto-maintenance: file watcher + periodic lint + startup check (all default OFF)
- Hierarchical index: LLM-generated tree structure with flat fallback for large wikis
- Ingestion report modal with detailed statistics

**Quality / Engineering**
- JSON Output Mode (`response_format: json_object`) for reliable structured responses
- Network resilience: timeout + exponential backoff retry
- API throttling with fault tolerance (per-item try-catch + auto-retry)
- State-machine JSON repair + LLM fallback for malformed responses
- Full Unicode filename support
- Modular architecture (9 focused modules)
- Internationalization: English/Chinese UI
- Code quality: no `any` types, Obsidian API compliance

---

## Short-term Planning (v1.5.x)

### Priority: High

#### 1. Multi-Source Knowledge Fusion

**Goal:** When two sources mention the same entity, intelligently merge rather than append.

**Scope:**
- LLM-powered diff-and-merge when updating existing pages
- Detect contradictions vs complementary information
- Preserve existing page structure while enriching content

**Files:** `wiki-engine.ts` (createOrUpdateEntityPage, createOrUpdateConceptPage)

#### 2. User Feedback Loop

**Goal:** Protect manual edits from being overwritten by subsequent ingestion.

**Scope:**
- Detect `frontmatter.reviewed: true` flag on Wiki pages
- When updating reviewed pages, LLM preserves human edits
- Compare mtime vs ctime to detect manual modifications

**Files:** `wiki-engine.ts` (page update methods), `prompts.ts` (update prompts)

---

### Priority: Medium

#### 3. Contradiction Tracking & Resolution

**Goal:** Systematic contradiction management with a state machine.

**Scope:**
- `wiki/contradictions/` directory with status tracking
- State machine: detected → in_review → resolved/suppressed
- Lint re-checks resolved contradictions for recurrence

#### 4. Smart Conversation Saving

**Goal:** Avoid redundant Wiki entries when saving conversations.

**Scope:**
- Compare conversation content with existing Wiki pages before saving
- Extract only incremental knowledge
- Reduce API costs and Wiki clutter

---

## Long-term Vision (v2.x)

| Feature | Description |
|---------|-------------|
| **Wiki Page Version History** | Diff summaries in log.md on each update |
| **Wiki Health Dashboard** | Obsidian custom view with page growth, link density, contradiction trends |
| **Wiki Content Export** | GraphML, JSON, static site formats |
| **Agent Mode** | Full auto-maintain lifecycle, proactive suggestions |
| **Multi-modal Support** | Images, PDF, audio/video knowledge extraction |

---

## Version Timeline

| Version | Target | Key Features | Status |
|---------|--------|-------------|--------|
| **v1.3.2-beta** | 2026-04 | Phase 1 optimizations + robustness fixes | Done |
| **v1.4.0** | 2026-04 | Schema layer, auto-maintenance, ESLint compliance, bot review | Current |
| **v1.5.0** | TBD | Multi-source fusion + user feedback loop | Planning |
| **v2.0.0** | TBD | Agent mode + multi-modal | Concept |

---

**Last Updated:** 2026-04-29 | **Maintainer:** Greener-Dalii
