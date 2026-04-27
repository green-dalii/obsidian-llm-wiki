# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-27

### Added

**Conversational Query Interface**
- Refactored Query Wiki to ChatGPT-style conversational Modal (800x600px)
- Real-time streaming LLM responses with visual feedback
- Full Markdown rendering using Obsidian MarkdownRenderer
  - Supports [[wiki-links]], callouts, code blocks, Obsidian syntax
- Multi-turn conversation with follow-up questions
- Conversation history management with visual scrollable display
- Enter key shortcut (Shift+Enter for newline)
- Auto-truncation when exceeding conversation limit (Notice feedback)
- Clear history button to reset conversation

**Knowledge Extraction from Conversations**
- New "Save to Wiki" button to extract knowledge from valuable conversations
- ingestConversation() method converts dialogue to structured Wiki pages
  - Summary page with conversation topic and key points
  - Entity pages extracted from discussion
  - Concept pages with relationships
- Reuses existing Wiki generation logic for consistency

**Technical Improvements**
- Extended LLMClient interface with optional createMessageStream() method
  - Backward compatible (non-streaming fallback)
- Implemented streaming for AnthropicClient (Anthropic SDK stream API)
- Implemented streaming for OpenAIClient (OpenAI stream: true option)
- Language-aware responses (match interface language setting)
  - English: "Please answer in English."
  - Chinese: "请用中文回答。"
- Added maxConversationHistory to LLMWikiSettings (default: 10)
- New TEXTS entries: 15 strings per language (English + Chinese)
- Settings UI: "Wiki Query Configuration" section
  - Input field with validation (1-50 range)
  - Hint text with recommended value (10-15 rounds)

**User Experience**
- Immediate feedback: see responses stream in real-time
- Interactive: follow-up questions without reopening Modal
- Clean UI: rendered Markdown instead of raw text
- Knowledge capture: save valuable conversations to Wiki
- i18n: all UI text and LLM responses respect language setting

---

## [1.0.9] - 2026-04-26

### Added

**Internationalization (i18n) Support**
- Settings panel now supports English and Chinese interface
- Language switcher dropdown at top of settings panel
- Default language: English (for international users)
- All UI text (titles, descriptions, buttons, notices) localized
- Language preference persisted in plugin settings
- Real-time UI re-render when switching language

**TEXTS System**
- Complete English and Chinese translation constants
- `getText()` helper method for dynamic text retrieval
- All hardcoded text replaced with TEXTS references
- Clean separation of content and presentation

**Settings Interface**
- Added `language` field to `LLMWikiSettings` interface
- Improved user experience for non-English users
- Consistent with project's internationalization standards

---

## [1.0.0] - 2026-04-26

### Added - Karpathy Complete Implementation

**Multi-page Generation Mechanism**
- One source file generates 10+ Wiki pages (not just 1)
- Entity pages (persons, organizations, projects, locations)
- Concept pages (theories, methods, technologies, terms)
- Summary pages with bidirectional links
- Automatic contradiction detection and marking

**Structured Prompt Design**
- JSON format output for source analysis
- Entity extraction with types and summaries
- Concept extraction with related concepts
- Contradiction detection between new and existing Wiki
- Related pages identification

**Bidirectional Link Maintenance**
- Ensure [[Entity]] links point to real entity pages
- Ensure [[Concept]] links point to real concept pages
- Automatic link creation in wiki folder structure
- No broken/red links

**Wiki Folder Structure**
- `wiki/entities/` - Entity pages
- `wiki/concepts/` - Concept pages
- `wiki/sources/` - Summary pages
- `wiki/index.md` - Classified index
- `wiki/log.md` - Detailed operation log

**Index Classification**
- Organized by categories (Entities, Concepts, Sources)
- Each entry includes one-line summary
- Using Obsidian `[[links]]` syntax
- Auto-generated and updated

**Log Detail Recording**
- Records created pages (all entity/concept/summary pages)
- Records updated pages (existing related pages)
- Records discovered contradictions
- Standard format with parseable timestamps

**Lint Maintenance**
- Checks contradictions between pages
- Checks outdated claims
- Checks orphan pages (no inbound links)
- Checks missing concept/entity pages
- Checks broken bidirectional links
- Checks data gaps

### Changed

**Complete Rewrite**
- Replaced single-page generation with multi-page mechanism
- Replaced simple prompt with structured JSON prompt
- Replaced time-based index with classified index
- Replaced simple log with detailed operation log
- Added entity and concept page creation logic
- Added contradiction detection and marking
- Added related pages update mechanism

**Folder Structure**
```
wiki/
├── entities/    # New: Entity pages
├── concepts/    # New: Concept pages
├── sources/     # New: Summary pages
├── index.md     # Improved: Classified
└── log.md       # Improved: Detailed
```

### Fixed

- ✅ Multi-page generation (Karpathy requirement)
- ✅ Bidirectional links effectiveness (links point to real pages)
- ✅ Entity and concept page creation
- ✅ Existing pages update when new source arrives
- ✅ Contradiction marking
- ✅ Classified index structure
- ✅ Detailed log recording

### Authors

- **Greener-Dalii** - Complete Karpathy implementation

---

## [0.3.0] - 2026-04-26

### Added
- Folder picker for initializing Wiki from existing folders
- FuzzySuggestModal for folder selection
- Support for nested folders

---

## [0.2.0-0.2.2] - Earlier versions

See git history for details of earlier implementations.