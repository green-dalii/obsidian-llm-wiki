# LLM Wiki Plugin Roadmap

> Feature planning and improvement candidate proposals

**Version:** 1.0.8 | **Updated:** 2025-04-26

---

## 🎯 Current Status

### Implemented Features

✅ **Core Features**
- Multi LLM Provider support (Anthropic, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, Custom)
- Dynamic model list fetching (real-time from API)
- Intelligent ingestion: automatic entity/concept extraction and Wiki page generation
- Bidirectional links: native Obsidian `[[wiki-links]]` syntax
- Knowledge graph visualization (via Obsidian Graph View)
- Wiki query: ask questions and get synthesized answers
- Auto maintenance: detect contradictions, outdated info, orphaned pages
- Auto-generated index and log

✅ **Quality Improvements**
- Chinese filename support (full Unicode character support)
- Markdown code block cleanup (auto-remove `\`\`\`markdown\`\`\`` wrapping)
- Enhanced JSON parsing (5-step strategy: clean, extract, fix)
- Detailed debug logs (character encoding tracking)
- Git version control (auto-commit on each change)

---

## 🚀 Short-term Planning (v1.1.x)

### Priority: High

#### 1. Smart Source File Detection Mechanism

**Goal:** Avoid redundant ingestion of the same source file, save API costs, protect manual edits.

**Candidate Proposal Analysis:**

| Proposal | Mechanism | Pros | Cons | Side Effects |
|----------|-----------|------|------|--------------|
| **Proposal A: Force Skip** | Check source file path mark, skip if already ingested | Auto-avoid redundancy, save costs | User loses re-ingestion control | Must manually delete summary page to trigger re-ingestion |
| **Proposal B: Ask User** | Detect already ingested → popup ask (Skip/Re-ingest/Incremental Update) | User full control, flexible | Batch ingestion needs multiple popup clicks | Interaction interruption, decision fatigue |
| **Proposal C: Smart Detection** | Compare source file and summary page `mtime` timestamp | Auto-detect updates, reduce asking | File system timestamp unreliable | Git operations update `mtime` causing false positives |
| **Proposal D: Incremental Summary Update** | Pass existing summary to LLM, request merge not regeneration | Protect manual edits, no mark mechanism | Summary page may infinitely grow | Content redundancy, structural chaos |
| **Recommended: Proposal C+B Combination** | Source unchanged → auto-skip<br>Source updated → ask user | Batch ingestion efficient, special cases flexible | Timestamp false positive risk still exists | Batch ingestion may still have occasional asking |

**Implementation Priority:**
- Phase 1: Implement Proposal D (Incremental summary update) - simplest, minimal side effects
- Phase 2: Add Proposal C (Timestamp detection) - improve batch ingestion efficiency
- Phase 3: Refine Proposal B (Ask mechanism) - provide user control

**Potential Risks:**
- Timestamp false positive: User modifies source but doesn't save → plugin thinks "no change"
- Git operation interference: `git pull` updates `mtime` → triggers false positive
- Summary page bloat: Multiple incremental merges cause content redundancy

**Decision Basis:**
See `docs/design/incremental-update-analysis.md` (to be created)

---

#### 2. Multi-language Support

**Goal:** Support English, Japanese, Korean, etc. entity/concept recognition and page generation.

**Candidate Proposals:**
- A. Prompt language adaptation: Auto-switch Prompt language based on source file language
- B. User manual selection: Add "Generation Language" option in settings panel
- C. Mixed mode: Keep entity/concept names in original language, descriptions in user preference language

**Challenges:**
- LLM language recognition capability depends on model quality
- Bidirectional link consistency across different languages
- Filename slugify cross-language support (partially implemented)

---

#### 3. Error Recovery Mechanism

**Goal:** Provide recovery options after ingestion failure, avoid progress loss.

**Candidate Features:**
- "Retry" option after failure (auto-skip successfully processed files)
- Save ingestion progress snapshot (support resume after interruption)
- Show detailed failure reasons and fix suggestions

---

### Priority: Medium

#### 4. Wiki Content Export

**Goal:** Support exporting Wiki knowledge graph and page content.

**Candidate Formats:**
- GraphML: Export knowledge graph structure (nodes, edges)
- JSON: Export complete Wiki data model
- PDF: Export all pages as single PDF document
- Static Site: Export as static website (similar to MkDocs)

---

#### 5. Schema Workflow Configuration

**Goal:** Implement Schema layer from Karpathy's original design, support custom workflows.

**Design Concept:**
```yaml
# schema/config.yaml
workflows:
  - name: "Academic Paper Processing"
    steps:
      - extract_entities: ["Author", "Institution", "Keywords"]
      - generate_pages: ["Author Page", "Institution Page", "Keyword Page"]
      - update_relations: ["Citation Relations", "Collaboration Relations"]
```

**Challenges:**
- Balance between workflow definition flexibility and usability
- Error handling for complex workflows
- Learning curve for user-defined workflows

---

#### 6. Collaborative Editing Support

**Goal:** Support multi-user collaborative Wiki editing, resolve conflicts.

**Candidate Proposals:**
- Git integration: Auto-commit Wiki changes to Git, support Pull/Merge
- Obsidian Sync integration: Compatible with official sync service
- Conflict detection: LLM-assisted merge conflict content

---

## 🔮 Long-term Vision (v2.x)

### Feature Exploration

#### 1. Enhanced Knowledge Graph Visualization

**Goal:** Provide more powerful knowledge graph viewing and analysis tools.

**Candidate Features:**
- Interactive graph panel (embed Graph View in plugin)
- Entity relationship strength calculation (based on citation frequency, content similarity)
- Knowledge domain clustering (auto-identify topic domains)
- Timeline view: Show knowledge evolution process

---

#### 2. LLM Agent Mode

**Goal:** Upgrade plugin to Agent, auto-maintain Wiki lifecycle.

**Candidate Behaviors:**
- Periodically scan source folder, auto-ingest new files
- Detect Wiki page outdated, proactively suggest updates
- Auto-generate new entity/concept pages (based on latest research)
- Auto-answer user questions (continuously optimize answer quality)

**Risks:**
- API costs may significantly increase
- Agent autonomy may conflict with user intent
- Need strict permission control mechanism

---

#### 3. Multi-modal Knowledge Management

**Goal:** Support images, PDF, audio/video multi-modal content knowledge extraction.

**Candidate Technologies:**
- OCR + LLM: Extract text and entities from images
- PDF parsing: Extract structured knowledge from academic papers
- Audio/video transcription + LLM: Extract knowledge points from lectures/interviews

---

#### 4. Community Knowledge Sharing

**Goal:** Support users sharing Wiki templates and knowledge base structures.

**Candidate Features:**
- Wiki Template Store: Download community-contributed Prompt templates
- Knowledge Graph Sharing: Share knowledge graph structure (no content)
- Collaborative Wiki: Multi-user co-build same Wiki (similar to Wikipedia)

---

## 🛠️ Technical Improvements

### Code Quality

- **Unit Testing**: Add core feature tests (Jest/Vitest)
- **Type Safety**: Reduce `any` types, complete TypeScript type definitions
- **Error Handling**: Unified error handling strategy, user-friendly error messages
- **Performance Optimization**: Reduce redundant API calls, optimize large file processing

### Documentation

- **User Manual**: Complete usage guide (with screenshots, videos)
- **API Documentation**: Plugin internal API docs (for contributors)
- **Design Documentation**: Architecture design, key technical decision records

---

## 📊 Version Planning Timeline

| Version | Target Date | Main Features | Status |
|---------|-------------|---------------|--------|
| **v1.0.x** | 2025-04 | Core features + basic quality improvements | ✅ Completed |
| **v1.1.0** | 2025-05 | Smart ingestion detection + multi-language support | 🔜 Planning |
| **v1.2.0** | 2025-06 | Wiki export + error recovery | 🔜 Planning |
| **v2.0.0** | 2025-Q3 | Agent mode + multi-modal support | 🔮 Concept phase |

---

## 🤝 Contribution Priority

If you want to contribute code, prioritize these areas:

**High Priority:**
1. Smart ingestion detection mechanism (Proposal D - Incremental summary update)
2. Error recovery mechanism
3. Unit test coverage

**Medium Priority:**
4. Multi-language support
5. Wiki export functionality
6. Performance optimization

**Low Priority (Long-term):**
7. Schema workflow configuration
8. Agent mode
9. Multi-modal support

---

## 💬 Discussion

Have suggestions or ideas about feature planning?

- 📝 [GitHub Discussions](https://github.com/Greener-Dalii/obsidian-llm-wiki/discussions)
- 🐛 [Issue Tracker](https://github.com/Greener-Dalii/obsidian-llm-wiki/issues)

---

**Last Updated:** 2025-04-26 | **Maintainer:** Greener-Dalii