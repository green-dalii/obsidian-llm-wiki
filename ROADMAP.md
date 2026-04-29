# LLM Wiki Plugin Roadmap

> Feature planning and improvement proposals

**Version:** 1.4.1 | **Updated:** 2026-04-29

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
- Two-step merge analysis for substantial pages (>300 chars)

**Files:** `wiki-engine.ts` (createOrUpdateEntityPage, createOrUpdateConceptPage), `prompts.ts` (mergeAnalysis)
**Status:** ✅ Implemented (v1.4.1)

#### 2. User Feedback Loop

**Goal:** Protect manual edits from being overwritten by subsequent ingestion.

**Scope:**
- Detect `frontmatter.reviewed: true` flag on Wiki pages
- When updating reviewed pages, LLM preserves human edits
- Preserve `reviewed: true` tag after regeneration

**Files:** `wiki-engine.ts` (page update methods), `prompts.ts` (preserve prompts), `utils.ts` (frontmatter parser)
**Status:** ✅ Implemented (v1.4.1)

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

## Karpathy-Aligned Planning (v1.6.x – v1.8.x)

> Based on re-reading Karpathy's [original LLM Wiki vision](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and auditing the plugin against his core principles.

### v1.6.0 — Knowledge Compounding

**Goal:** Make every Wiki query a source of lasting knowledge, not a one-shot consumer.

Karpathy: *"Good answers can be filed back into the wiki as new pages, so explorations compound alongside ingested sources."*

#### 5. Query-to-Wiki Feedback

**Scope:**
- After closing the Query modal, evaluate whether the conversation contains valuable knowledge
- If substantive (≥ 2 turns, > 500 chars total), prompt: "This conversation contains valuable insights. Save to Wiki?"
- Bridge the gap between query (consumption) and ingest (production)

**Files:** `src/query-engine.ts`

#### 6. Deduplication on Save

**Scope:**
- Before saving a conversation to Wiki, compare against existing Wiki pages via index
- Only extract genuinely new knowledge not already covered
- If fully covered, notify: "This knowledge already exists in Wiki"

**Files:** `src/wiki-engine.ts`, `src/prompts.ts`

#### 7. Contradiction State Machine

**Scope:**
- Lifecycle: `detected → in_review → resolved | suppressed`
- Lint scans `wiki/contradictions/` for open items, includes in lint report
- Users manage status by editing frontmatter `status` field

**Files:** `src/wiki-engine.ts`, `main.ts`

---

### v1.7.0 — Conversational Ingest

**Goal:** Transform ingest from a black box into a collaborative process.

Karpathy: *"I like to do them one at a time, and be involved myself. I like to discuss what to file, then file it."*

#### 8. Ingest Wizard

**Scope:**
- New `IngestWizardModal` — step-by-step guided ingest
- Step 1: LLM analyzes source, presents extracted entities/concepts for user review
- Step 2: User edits/adds/removes items (checkboxes + edit)
- Step 3: LLM generates Wiki pages based on user-approved plan
- Existing `Ingest Sources` remains as quick/auto mode

**Files:** `src/ingest-wizard.ts` (new), `src/wiki-engine.ts`, `main.ts`

---

### v1.8.0 — Experience Polish

#### 9. Proactive Schema Suggestions

**Scope:**
- After ingest, check if new entity/concept types fall outside schema categories
- If so, suggest running "Suggest Schema Updates" (do not auto-modify)

**Files:** `src/wiki-engine.ts`, `src/schema-manager.ts`

#### 10. Output Format Diversity

Karpathy: *"comparison tables, slide decks (Marp), charts"*

**Scope:**
- Optimize query prompts for structured table output
- "Export as Marp" button in Query modal

**Files:** `src/query-engine.ts`, `src/prompts.ts`

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
| **v1.4.0** | 2026-04 | Schema layer, auto-maintenance, ESLint compliance, bot review | Done |
| **v1.5.0** | 2026-04 | Multi-source fusion, user feedback loop, contradiction tracking foundation | In Progress (testing) |
| **v1.6.0** | TBD | Query-to-Wiki feedback, dedup save, contradiction state machine | Planned |
| **v1.7.0** | TBD | Conversational ingest wizard | Planned |
| **v1.8.0** | TBD | Proactive schema suggestions, output diversity | Planned |
| **v2.0.0** | TBD | Agent mode + multi-modal | Concept |

---

**Last Updated:** 2026-04-29 | **Maintainer:** Greener-Dalii
