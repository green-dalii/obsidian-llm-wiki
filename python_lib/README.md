# llm-wiki Python Library

A Python library port of the [obsidian-llm-wiki](https://github.com/Greener-Dalii/obsidian-llm-wiki) Obsidian plugin.

Automatically builds a structured Markdown wiki from your notes and documents using any LLM — OpenAI, Anthropic, Gemini, DeepSeek, Ollama, LM Studio, RITS/vLLM, OpenRouter, and any OpenAI- or Anthropic-compatible endpoint.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Ingestion Flow](#ingestion-flow)
  - [Step 1 — Source Analysis (Extraction)](#step-1--source-analysis-extraction)
  - [The Extraction Prompt](#the-extraction-prompt)
  - [Step 2 — Page Generation](#step-2--page-generation)
  - [Step 3 — Source Summary Page](#step-3--source-summary-page)
  - [Wiki Folder Structure](#wiki-folder-structure)
- [Linting and Frontmatter Enforcement](#linting-and-frontmatter-enforcement)
  - [What Linting Does](#what-linting-does)
  - [Frontmatter Schema](#frontmatter-schema)
  - [Merge Behaviour on Re-ingestion](#merge-behaviour-on-re-ingestion)
- [Wiki Health Check — `lint()`](#wiki-health-check--lint)
  - [Lint Pipeline Phases](#lint-pipeline-phases)
  - [Dead-Link Resolution Pipeline](#dead-link-resolution-pipeline)
  - [Duplicate Detection](#duplicate-detection)
  - [LintReport Fields](#lintreport-fields)
  - [Scan-Only Mode](#scan-only-mode)
- [Querying the Wiki](#querying-the-wiki)
- [Examples — RITS Provider](#examples--rits-provider)
  - [Ingest a Folder with a RITS Model](#ingest-a-folder-with-a-rits-model)
  - [Lint a Wiki Built with a RITS Model](#lint-a-wiki-built-with-a-rits-model)
  - [Streaming Query](#streaming-query)
- [Concept Hierarchy Wiki](#concept-hierarchy-wiki)
  - [How It Works](#how-it-works)
  - [Minimal Example](#minimal-example)
  - [Full Worked Example with Progress Reporting](#full-worked-example-with-progress-reporting)
  - [Resuming an Interrupted Run](#resuming-an-interrupted-run)
  - [Choosing k](#choosing-k)
  - [Inspecting the Report](#inspecting-the-report)
- [Supported Providers](#supported-providers)
- [All Constructor Options](#all-constructor-options)
- [All Methods](#all-methods)
- [Extraction Granularity](#extraction-granularity)
- [Recursive Concept Hierarchy — Granularity Ladder](#recursive-concept-hierarchy--granularity-ladder)
- [IngestReport Fields](#ingestreport-fields)
- [SourceAnalysis Fields](#sourceanalysis-fields)
- [Wiki Languages](#wiki-languages)
- [License](#license)

---

## Installation

```bash
pip install llm-wiki
```

Or install from source:

```bash
cd python_lib
pip install -e .
```

**Only dependency:** `httpx` (HTTP client). No OpenAI SDK, no Anthropic SDK required.

---

## Quick Start

```python
from llm_wiki import LLMWiki

wiki = LLMWiki(
    wiki_folder="./my-wiki",      # where wiki pages are written
    provider="openai",
    api_key="sk-...",
    model="gpt-4o",
)

# Ingest a markdown or text file
report = wiki.ingest_file("research-notes.md")
print(f"Created {report.entities_created} entities, {report.concepts_created} concepts")
print(f"Pages: {report.created_pages}")

# Ask a question grounded in the wiki
answer = wiki.query("What are the main themes in my notes?")
print(answer)
```

---

## Ingestion Flow

Ingestion transforms a source document (`.md`, `.txt`, `.markdown`, `.text`) into a set of structured wiki pages. The process has three sequential phases.

```
Source file
    │
    ▼
┌─────────────────────────────────────────┐
│  Phase 1: Source Analysis               │
│  SourceAnalyzer — iterative batches     │
│  LLM → JSON (entities + concepts)       │
└────────────────┬────────────────────────┘
                 │ SourceAnalysis object
                 ▼
┌─────────────────────────────────────────┐
│  Phase 2: Page Generation               │
│  WikiEngine — one LLM call per item     │
│  Writes  entities/  and  concepts/      │
└────────────────┬────────────────────────┘
                 │ list of created paths
                 ▼
┌─────────────────────────────────────────┐
│  Phase 3: Source Summary Page           │
│  WikiEngine — one LLM call              │
│  Writes  sources/<title>.md             │
└─────────────────────────────────────────┘
```

### Step 1 — Source Analysis (Extraction)

The [`SourceAnalyzer`](llm_wiki/wiki/source_analyzer.py) class performs iterative batched extraction. Rather than sending the entire document in one call, it loops over the source in multiple rounds, asking the LLM to extract a fixed-size batch of items per round and stopping when the LLM returns empty arrays or the configured limits are reached.

**Batch loop logic:**

1. **Round 1** — The LLM is asked to extract the most important entities and concepts, produce a source summary, identify key points, and flag contradictions with the existing wiki.
2. **Round N (N ≥ 2)** — The LLM is told which entities/concepts have already been extracted (with their aliases to avoid near-duplicate extraction) and asked for the next batch of items.
3. **Stopping conditions** — The loop terminates when:
   - The LLM returns empty `entities` and `concepts` arrays.
   - The batch size converges (the LLM consistently returns fewer items than requested).
   - The cumulative item count reaches the configured cap (`fine`, `standard`, `coarse`, `minimal`, or `custom` limits).
   - A truncation error is hit; the batch size is halved and retried once.
4. **JSON repair** — If the LLM returns malformed JSON, a second repair call is made asking the model to fix only syntax errors.

**Batch limits by granularity:**

| Granularity | Total items cap | Use case |
|---|---|---|
| `"fine"` | ~100 | Academic papers, full analysis |
| `"standard"` | ~50 | General notes (default) |
| `"coarse"` | ~10 | Quick summaries |
| `"minimal"` | ≤ 5 | Cost-sensitive or small models |
| `"custom"` | configurable | `custom_entity_limit` + `custom_concept_limit` |

### The Extraction Prompt

Every analysis call uses the [`ANALYZE_SOURCE_PROMPT`](llm_wiki/wiki/prompts.py) template. Here is the full prompt as sent to the model (placeholders shown in `{{double braces}}`):

```
You are a Wiki knowledge base maintainer. Analyze the following source file and output structured JSON.

**Existing Wiki pages — use ONLY these exact paths when creating [[links]]:**
{{existing_slugs}}

**Source File Content:**
{{content}}

{{batch_context}}

**Extraction Scope:**
{{granularity_instruction}}

**Task Requirements:**
0. [FIRST ROUND ONLY] Write a 100-200 word source summary (field: summary) and extract the source title
   (field: source_title). These fields must NOT appear in later rounds.
1. In EVERY round (including the first), output both "entities" and "concepts" arrays.
   Use [] when a category has no items. Never omit either array.
2. Optionally generate 1-2 aliases per entity/concept — alternative names, acronyms, translations,
   or common phrasings.
3. Output at most {{batch_size}} items (entities + concepts total) this round.
4. Write a detailed, informative summary for each item (target 4-6 sentences).
5. For mentions_in_source: quote 2-4 verbatim sentences from the source.
6. For related_entities and related_concepts: identify items mentioned in the same context.
7. Identify contradictions or conflicts with the existing Wiki (first round only).
8. Identify related existing Wiki pages (first round only).
9. Generate key points from the source file (first round only).

**Output Format (strict JSON, output only JSON, no explanatory text):**
{
  "source_title": "Source file title",
  "summary": "150-250 word source summary (first round only)",
  "entities": [
    {
      "name": "Entity name — MUST be in the source's original language, NEVER translate",
      "type": "person|organization|project|product|event|place|other",
      "aliases": ["Optional: 1-2 alternative names"],
      "summary": "Detailed 4-6 sentence description with concrete facts",
      "mentions_in_source": ["Verbatim sentence from source: '...'."],
      "related_entities": ["Related entity names from this source"],
      "related_concepts": ["Related concept names from this source"]
    }
  ],
  "concepts": [
    {
      "name": "Concept name — MUST be in the source's original language, NEVER translate",
      "type": "theory|method|field|phenomenon|standard|term|other",
      "aliases": ["Optional: 1-2 alternative names"],
      "summary": "Detailed 4-6 sentence description",
      "mentions_in_source": ["Verbatim sentence from source: '...'."],
      "related_concepts": ["Related concept names from this source"],
      "related_entities": ["Related entity names from this source"]
    }
  ],
  "contradictions": [],
  "related_pages": ["Existing wiki page paths that are related"],
  "key_points": ["Key point 1", "Key point 2"]
}
```

**Prompt construction details:**

- `{{existing_slugs}}` — a newline-separated list of all current wiki page slugs (e.g. `entities/geoffrey-hinton`). This is injected so the model can produce correctly-linked references to pages that already exist.
- `{{content}}` — the full text of the source file.
- `{{batch_context}}` — `"This is the first extraction round…"` on round 1; on subsequent rounds it lists all already-extracted names so the model avoids duplicates.
- `{{granularity_instruction}}` — one of the four granularity sentences, or a custom entity/concept cap instruction.
- `{{batch_size}}` — the current batch size (starts at the granularity default, halved on truncation).

A language-hint suffix is appended to every prompt:

```
CRITICAL LANGUAGE REQUIREMENT: Summaries, descriptions, source_title, and key_points in your JSON
output MUST be written in <wiki_language>. HOWEVER: entity names and concept names MUST be preserved
in their original source language — NEVER translate names. mentions_in_source MUST be verbatim
quotes from the source.
```

A tag vocabulary section is also appended:

```
Active Tag Vocabulary (MUST use these exact tag values in frontmatter):
  Entity types (tags): person, organization, project, product, event, place, other
  Concept types (tags): theory, method, field, phenomenon, standard, term, other
Do not use any other tag values. If unsure, use 'other'.
```

The system prompt (passed via the `system` parameter) contains:
- A `wiki_language` directive: `"IMPORTANT: You MUST write ALL content in <Language>."`.
- The active tag vocabulary section.

### Step 2 — Page Generation

After analysis, the [`WikiEngine`](llm_wiki/wiki/engine.py) makes one LLM call per extracted item (entities first, then concepts). Each call receives:

- The extracted item's name, type, summary, verbatim mentions, related items, and aliases.
- A list of all existing wiki pages (for correct `[[link|title]]` formatting).
- The current content of the page if it already exists (merge strategy).
- The tag vocabulary and language directive.

**Entity page prompt template** (`GENERATE_ENTITY_PAGE_PROMPT`):

```
You are a Wiki knowledge base maintainer. Create a Wiki page for the following entity.

**Entity Information:**
- Name: {{entity_name}}
- Type: {{entity_type}}
- Summary: {{entity_summary}}
- Mentions in source (VERBATIM — preserve original language): {{mentions}}
- Related entities: {{related_entities}}
- Related concepts: {{related_concepts}}
- Extraction aliases (seeds): {{extraction_aliases}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**Existing Related Content in Wiki:**
{{related_content}}

{{merge_strategy}}

**Task Requirements:**
1. Create an entity page with basic and key information
2. All related entities and concepts MUST be formatted as wiki-links using the [[path|display]] format
3. Be objective, accurate, and concise
4. Generate aliases for this page — provide 1-3 alternative names (REQUIRED, must not be empty)
5. In "Mentions in Source" section: preserve VERBATIM quotes in ORIGINAL language

**Output Format:**
---
type: entity
created: {{date}}
updated: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{entity_type}}]
aliases: ["Alternative name or translation"]
---

# {{entity_name}}

## Basic Information
- Type: {{entity_type}}
- Source: [[{{source_file}}]]

## Description
[Detailed description of the entity with bidirectional links]

## Related Entities
[Reference related entities using full paths]

## Related Concepts
[Reference related concepts using full paths]

## Mentions in Source
[Each verbatim quote as an academic-footnote style entry]

---
```

**Concept page prompt template** (`GENERATE_CONCEPT_PAGE_PROMPT`) follows the same structure but with sections: Definition, Key Characteristics, Applications, Related Concepts, Related Entities, Mentions in Source.

**Merge strategy** — if the page already exists:
- If it has `reviewed: true` in frontmatter, the model is instructed to preserve all existing content and only append new non-duplicate information.
- Otherwise, the model is instructed to intelligently merge: preserve structure, update relevant fields, append new mentions.

All section headings are i18n-resolved via `apply_section_labels()` before the prompt is sent, so pages in non-English wikis have translated section names.

### Step 3 — Source Summary Page

After all entity and concept pages are written, a summary page is generated using `GENERATE_SUMMARY_PAGE_PROMPT`. It receives:

- The source title and file content (up to 4000 chars of body).
- A compact analysis string (`N entities, M concepts, K key points`).
- The list of all just-created page paths (for bidirectional linking).

The summary page is written to `sources/<slug>.md`.

### Wiki Folder Structure

```
my-wiki/
├── entities/
│   ├── geoffrey-hinton.md
│   └── openai.md
├── concepts/
│   ├── backpropagation.md
│   └── transformer-architecture.md
└── sources/
    └── attention-is-all-you-need.md
```

Each page has YAML frontmatter with `type`, `created`, `updated`, `sources`, `tags`, and `aliases`.

---

## Linting and Frontmatter Enforcement

### What Linting Does

"Linting" in this library means post-generation validation and normalisation of every wiki page's YAML frontmatter. It is applied automatically to every page the engine writes — there is no separate lint command; it happens inside the write pipeline via [`enforce_frontmatter_constraints()`](llm_wiki/core/frontmatter.py).

The linter performs these checks and corrections on each generated page:

| Check | Action |
|---|---|
| `type:` field present | Normalises to the canonical value (`entity`, `concept`, or `source`) |
| `created:` date | Preserves the original date; inserts today if absent |
| `updated:` date | Always set to today |
| `tags:` array | Deduplicates; strips the page type from the tags list (type should not be a tag) |
| `aliases:` array | Deduplicates; removes empty strings |
| Reviewed pages | If `reviewed: true`, only the dates are refreshed — content is never overwritten |
| Unknown fields | Passed through unchanged so custom frontmatter is never lost |

The linter does **not** make any LLM calls. It is a pure string transform.

### Frontmatter Schema

A fully-formed wiki page looks like this:

```yaml
---
type: entity
created: 2024-01-15
updated: 2024-07-20
sources:
  - "[[sources/attention-is-all-you-need]]"
tags: [person]
aliases:
  - "Geoff Hinton"
  - "Geoffrey E. Hinton"
---

# Geoffrey Hinton

## Basic Information
...
```

**Field reference:**

| Field | Type | Description |
|---|---|---|
| `type` | `entity` \| `concept` \| `source` | Page category |
| `created` | ISO date | First ingestion date |
| `updated` | ISO date | Last modification date |
| `sources` | `list[wikilink]` | Source pages that contributed content |
| `tags` | `list[str]` | Entity type (`person`, `organization`, …) or concept type (`theory`, `method`, …) |
| `aliases` | `list[str]` | Alternative names; used by Obsidian for link resolution |
| `reviewed` | `bool` (optional) | Set manually; tells the engine not to overwrite the page |

### Merge Behaviour on Re-ingestion

When a page already exists at the target slug and is **not** reviewed:

1. The engine passes the existing page content to the LLM as `related_content`.
2. The merge strategy instruction tells the model to preserve existing structure and only add new information.
3. After the LLM responds, `merge_frontmatter()` is called to merge the `sources` list: the new source is added to the existing sources array without removing old entries.

When `reviewed: true` is set, the engine still calls the LLM, but the instruction changes to *"preserve ALL existing content, only append new non-duplicate information"*, and the linter skips full frontmatter reconstruction (only dates are updated).

---

## Wiki Health Check — `lint()`

The [`lint()`](llm_wiki/facade.py) method is a direct Python port of the Obsidian plugin's **Lint Wiki** command. It scans your entire wiki for health issues and repairs them automatically.

```python
report = wiki.lint()

print(f"Pages scanned    : {report.total_pages}")
print(f"Dead links fixed : {report.dead_links_fixed}")
print(f"Aliases added    : {report.aliases_filled}")
print(f"Duplicates merged: {report.duplicates_merged}")
print(f"Orphans linked   : {report.orphans_linked}")
print(f"Empty pages filled: {report.empty_pages_filled}")
print(f"Tags retagged    : {report.tags_retagged}")
print(f"Elapsed          : {report.elapsed_seconds}s")

for detail in report.details:
    print(detail)
for error in report.errors:
    print("ERROR:", error)
```

### Lint Pipeline Phases

| Phase | What runs | LLM calls? |
|---|---|---|
| **1 — Preparation** | Read all pages, fix `[[[[double-nested]]]]` links, normalise `sources:` fields | No |
| **2 — Programmatic scans** | Dead links, orphans, alias deficiency, tag violations, empty/stub pages, ungrounded quotes, polluted titles | No |
| **3 — Duplicate detection** | Programmatic candidates (shared links, bigram similarity, cross-language aliases, case variants) + LLM verification | Yes — one batch call per 100 candidate pairs |
| **4 — LLM fixes** | Alias completion, dead-link repair, empty-page fill, orphan linking, duplicate merge, tag retag | Yes — one call per item/page |

**Programmatic scans (Phase 2)** are always fast and free — they run even if all fix flags are `False`.

### Dead-Link Resolution Pipeline

When `fix_dead_links=True`, each detected dead link goes through four stages in order:

```
Dead link [[Concept B]] in Concept A's page
       │
       ▼
Stage 1 ── title/alias pre-check ──MATCH──► rewrite link, done (no LLM)
       │
       NO MATCH
       ▼
Stage 2 ── LLM semantic search ──────────► sends source page + all wiki pages + aliases
       │
       ├─ action=correct ────────────────► rewrite link to existing page, done
       │
       └─ action=create_stub ────────────► safety alias re-check
                                               │
                                               ├─ alias found ──► rewrite to existing page
                                               │
                                               └─ no match ──────► write honest placeholder stub
                                                                    (generation_complete: false)
                                                                    rewrite link → stub path
       │
Stage 4 ── deterministic slug fallback ─► slug-normalised match across all pages
       │
       └─ no match ──────────────────────► write honest placeholder stub (same as above)
```

**Stub pages** (`generation_complete: false`) are minimal placeholders. They are never LLM-expanded during lint to prevent hallucination from empty source content. When you later ingest a real document that defines the concept, the normal ingest path fills the stub.

Each stub is pre-populated with two pieces of context from the page that held the dead link:

- **`sources:`** frontmatter field — set to `["[[referring/page]]"]` so the back-reference is machine-readable from creation.
- **Referenced-as line** — the sentence from the source page that contained the dead link is extracted and written into the stub body as a blockquote:

  ```markdown
  > **Referenced in [[referring/page]] as:** "A [[Qubit]] is the fundamental unit of quantum
  >  information, analogous to a classical bit."
  ```

  This gives future ingest and human editors immediate context about how the concept was used before any real source is available. The line is stripped automatically when the page is filled during a later ingest cycle.

### Duplicate Detection

Three programmatic signals seed the candidate list:

| Signal | Description | Threshold |
|---|---|---|
| `crossLang` | Normalized title/alias overlap across languages | Exact |
| `caseVariant` | Titles that differ only in casing | Exact |
| `bigram` | Character bigram Jaccard similarity on title + aliases | ≥ 0.4 (tier 1: ≥ 0.6) |
| `sharedLinks` | Jaccard overlap of outgoing wiki-links + body content similarity | ≥ 0.4 / 0.2 |

Tier-1 candidates (crossLang, caseVariant, bigram ≥ 0.6) are always sent to the LLM for verification. Tier-2 candidates fill the remaining token budget (up to ~500 candidates total). The LLM confirms only pairs it is ≥ 95% certain are semantic duplicates.

Confirmed duplicates are merged: the target page is kept, the source page body is intelligently fused in by the LLM (with programmatic fallback), and all wiki-links pointing to the source are rewritten to point to the target.

### LintReport Fields

```python
report = wiki.lint()
report.wiki_folder               # str   — wiki directory
report.total_pages               # int   — pages scanned
report.elapsed_seconds           # float

# Findings (always populated, even if fixes are disabled)
report.alias_deficient_pages     # int   — pages with no aliases
report.orphans_found             # int   — pages with no incoming links
report.dead_links_found          # int   — total dead [[wikilinks]] detected
report.tag_violations_found      # int   — pages with invalid tag values
report.empty_pages_found         # int   — empty/stub pages
report.ungrounded_quotes_found   # int   — verbatim quotes not found in source files
report.polluted_pages_found      # int   — pages whose title has a folder prefix
report.double_nest_fixes         # int   — [[[[links]]]] fixed in preparation phase
report.sources_normalized_files  # int   — pages with normalized sources: fields
report.duplicates_found          # int   — duplicate pairs detected

# Fix counts
report.aliases_filled            # int
report.dead_links_fixed          # int
report.orphans_linked            # int
report.empty_pages_filled        # int
report.stubs_deleted             # int   — only set if delete_stubs=True
report.duplicates_merged         # int
report.tags_retagged             # int

# Detail lines and errors
report.details                   # list[str]  — one line per fix applied
report.errors                    # list[str]  — non-fatal errors
```

### Scan-Only Mode

Run all programmatic checks without making any LLM calls or writing any files:

```python
report = wiki.lint(
    fix_aliases=False,
    fix_dead_links=False,
    fix_empty_pages=False,
    fix_orphans=False,
    fix_duplicates=False,
    fix_tag_violations=False,
)
print(f"Dead links  : {report.dead_links_found}")
print(f"Orphans     : {report.orphans_found}")
print(f"Tag issues  : {report.tag_violations_found}")
print(f"Empty pages : {report.empty_pages_found}")
```

---

## Querying the Wiki

The [`query()`](llm_wiki/facade.py) method answers natural-language questions grounded in your wiki.

**How it works:**

1. All wiki pages are loaded (up to `max_pages`, default 10).
2. The first 2000 characters of each page body are concatenated into a context block.
3. A system prompt instructs the model to act as a knowledgeable assistant, be concise, cite relevant wiki pages, and answer in the wiki language.
4. The question and context are sent together as the user message.
5. If a `streaming_callback` is provided and the client supports streaming, the response is streamed chunk by chunk.

**Query system prompt:**

```
You are a knowledgeable assistant with access to a personal wiki.
Answer the user's question using the provided wiki context.
Be concise, accurate, and cite relevant wiki pages when possible.
Answer in the wiki language: <wiki_language>.
```

**User message format:**

```
Wiki context:

### Page Title 1
[first 2000 chars of body]

---

### Page Title 2
[first 2000 chars of body]

---

Question: <your question>
```

---

## Examples — RITS Provider

RITS (Research IT Services) runs vLLM-backed models behind an IBM internal endpoint. It uses the OpenAI-compatible `/chat/completions` API but requires two separate credentials: a standard Bearer token and a `RITS_API_KEY` header.

### Ingest a Folder with a RITS Model

```python
from llm_wiki import LLMWiki

wiki = LLMWiki(
    wiki_folder="./my-wiki",
    provider="rits",
    # Bearer token sent as Authorization: Bearer <api_key>
    api_key="your-openai-compat-token",
    # Sent as the RITS_API_KEY HTTP header
    rits_api_key="your-rits-api-key",
    # Full vLLM base URL including /v1
    base_url="https://inference.example.ibm.com/v1",
    # Model name as registered in your RITS deployment
    model="meta-llama/llama-3-1-70b-instruct",
    # Progress messages — pipe to print or a logger
    on_progress=print,
    # Extraction scope
    extraction_granularity="standard",
    # Optional: cap max_tokens per call to fit your model's context window
    max_tokens_per_call=8192,
    # Optional: tune temperature for deterministic extraction
    extraction_temperature=0.1,
)

# Ingest every .md and .txt file in a folder, recursively
reports = wiki.ingest_folder(
    folder_path="./research-papers/",
    recursive=True,
    force=False,   # skip files that were already ingested
)

# Print a summary
total_entities  = sum(r.entities_created for r in reports)
total_concepts  = sum(r.concepts_created for r in reports)
total_pages     = sum(len(r.created_pages) for r in reports)
failed          = [r for r in reports if not r.success]

print(f"Ingested {len(reports)} files")
print(f"  Entities created : {total_entities}")
print(f"  Concepts created : {total_concepts}")
print(f"  Wiki pages total : {total_pages}")
print(f"  Failures         : {len(failed)}")

for r in failed:
    print(f"  FAILED {r.source_file}: {r.error_message}")
```

### Lint a Wiki Built with a RITS Model

```python
from llm_wiki import LLMWiki

wiki = LLMWiki(
    wiki_folder="./my-wiki",
    provider="rits",
    api_key="your-openai-compat-token",
    rits_api_key="your-rits-api-key",
    base_url="https://inference.example.ibm.com/v1",
    model="meta-llama/llama-3-1-70b-instruct",
    on_progress=print,
)

# Verify connection first
result = wiki.test_connection()
if not result["success"]:
    print("Connection FAILED:", result["message"])
    exit(1)

# Run the full lint-and-repair pipeline
report = wiki.lint(
    fix_aliases=True,         # generate missing aliases
    fix_dead_links=True,      # repair broken [[wikilinks]]
    fix_empty_pages=True,     # expand stub/empty pages
    fix_orphans=True,         # inject backlinks into isolated pages
    fix_duplicates=True,      # detect and merge equivalent pages
    fix_tag_violations=True,  # retag pages with invalid tag values
    delete_stubs=False,       # keep unfilled stubs (default)
)

print(f"\nLint completed in {report.elapsed_seconds}s")
print(f"Pages scanned     : {report.total_pages}")
print()
print("=== Findings ===")
print(f"  Dead links      : {report.dead_links_found}")
print(f"  Orphan pages    : {report.orphans_found}")
print(f"  Alias missing   : {report.alias_deficient_pages}")
print(f"  Tag violations  : {report.tag_violations_found}")
print(f"  Empty pages     : {report.empty_pages_found}")
print(f"  Duplicates      : {report.duplicates_found}")
print()
print("=== Fixes Applied ===")
print(f"  Dead links fixed : {report.dead_links_fixed}")
print(f"  Aliases added    : {report.aliases_filled}")
print(f"  Orphans linked   : {report.orphans_linked}")
print(f"  Empty pages filled: {report.empty_pages_filled}")
print(f"  Duplicates merged : {report.duplicates_merged}")
print(f"  Tags retagged    : {report.tags_retagged}")

if report.errors:
    print("\n=== Errors ===")
    for e in report.errors:
        print(f"  {e}")

# Scan-only (no fixes, no LLM calls)
scan_report = wiki.lint(
    fix_aliases=False, fix_dead_links=False, fix_empty_pages=False,
    fix_orphans=False, fix_duplicates=False, fix_tag_violations=False,
)
print(f"\nScan-only: {scan_report.dead_links_found} dead links, "
      f"{scan_report.orphans_found} orphans")
```

### Streaming Query

```python
from llm_wiki import LLMWiki

wiki = LLMWiki(
    wiki_folder="./my-wiki",
    provider="rits",
    api_key="your-openai-compat-token",
    rits_api_key="your-rits-api-key",
    base_url="https://inference.example.ibm.com/v1",
    model="meta-llama/llama-3-1-70b-instruct",
    chat_temperature=0.7,
)

print("Answer: ", end="", flush=True)
wiki.query(
    "What are the main contributions described in my research papers?",
    max_pages=15,
    streaming_callback=lambda chunk: print(chunk, end="", flush=True),
)
print()  # newline after stream ends
```

---

## Concept Hierarchy Wiki

`build_hierarchy()` builds a **multi-level concept abstraction pyramid** from a folder of source documents. Each level re-ingests the concept pages produced by the level below it, using progressively coarser extraction — so the hierarchy moves from fine-grained detail at the base to high-level abstractions at the top.

### How It Works

```
Your source .md files   (e.g. research papers, notes)
         │
         ▼  ingest_folder  — granularity: fine  (~100 items/page)
   level_0/
   ├── concepts/   ◄─── becomes the source for level 1
   ├── entities/
   └── sources/
         │
         ▼  ingest_folder  — granularity: standard  (~50 items/page)
   level_1/
   ├── concepts/   ◄─── becomes the source for level 2
   ├── entities/
   └── sources/
         │
         ▼  ingest_folder  — granularity: coarse  (~10 items/page)
   level_2/
   ├── concepts/
   ├── entities/
   └── sources/
```

After every level, lint runs automatically to repair dead links, fill aliases, and merge duplicate pages within that level's wiki.

If a level produces no concept pages (because the source was too sparse), iteration stops early and the partial result is returned.

---

### Minimal Example

```python
from llm_wiki import LLMWiki

wiki = LLMWiki(
    wiki_folder="./unused",    # required by the constructor but not used here
    provider="openai",
    api_key="sk-...",
    model="gpt-4o",
)

report = wiki.build_hierarchy(
    source_folder="./my-papers",   # folder of .md / .txt source files
    k=3,                           # build level_0, level_1, level_2
    wiki_root="./hierarchy-wiki",  # all level subfolders go here
)

for lvl in report.levels:
    n = sum(r.concepts_created for r in lvl.ingest_reports)
    print(f"Level {lvl.level} ({lvl.granularity}): {n} concepts")
```

---

### Full Worked Example with Progress Reporting

```python
from llm_wiki import LLMWiki, HierarchyReport

def on_progress(msg: str) -> None:
    """Receives all progress messages — both per-file and per-level milestones."""
    print(msg)

wiki = LLMWiki(
    wiki_folder="./unused",
    provider="openai",         # or "anthropic", "gemini", "rits", "ollama", …
    api_key="sk-...",
    model="gpt-4o",
    on_progress=on_progress,   # wired through to every level automatically
)

# Verify the connection before starting a long run
check = wiki.test_connection()
if not check["success"]:
    raise RuntimeError(f"LLM connection failed: {check['message']}")

report: HierarchyReport = wiki.build_hierarchy(
    source_folder="./research-papers",
    k=3,
    wiki_root="./hierarchy-wiki",
)

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"Hierarchy complete — {report.total_levels} level(s) built")
print(f"Root folder: {report.root_folder}")
print(f"{'='*60}\n")

for lvl in report.levels:
    files_processed = len(lvl.ingest_reports)
    skipped = sum(1 for r in lvl.ingest_reports if r.skipped)
    failed  = sum(1 for r in lvl.ingest_reports if not r.success and not r.skipped)
    entities = sum(r.entities_created for r in lvl.ingest_reports)
    concepts = sum(r.concepts_created for r in lvl.ingest_reports)

    print(f"Level {lvl.level}  [{lvl.granularity}]  →  {lvl.wiki_folder}")
    print(f"  Files  : {files_processed} processed  ({skipped} skipped, {failed} failed)")
    print(f"  Created: {entities} entities, {concepts} concepts")

    lr = lvl.lint_report
    if lr:
        print(f"  Lint   : {lr.dead_links_fixed} dead links fixed, "
              f"{lr.duplicates_merged} duplicates merged, "
              f"{lr.aliases_filled} aliases filled")
    print()
```

**Sample output:**

```
[Hierarchy] Level 0 — granularity=fine, source=/abs/path/research-papers
Ingesting paper-one.md...
Analyzing paper-one.md...
Generating concept page: Attention Mechanism
...
[Hierarchy] Level 0 — running lint...
[Hierarchy] Level 0 complete — 87 concepts created
[Hierarchy] Level 1 — granularity=standard, source=.../level_0/concepts
...

============================================================
Hierarchy complete — 3 level(s) built
Root folder: /abs/path/hierarchy-wiki
============================================================

Level 0  [fine]  →  /abs/path/hierarchy-wiki/level_0
  Files  : 12 processed  (0 skipped, 0 failed)
  Created: 34 entities, 87 concepts
  Lint   : 3 dead links fixed, 1 duplicates merged, 22 aliases filled

Level 1  [standard]  →  /abs/path/hierarchy-wiki/level_1
  Files  : 87 processed  (0 skipped, 0 failed)
  Created: 12 entities, 41 concepts
  Lint   : 1 dead links fixed, 0 duplicates merged, 11 aliases filled

Level 2  [coarse]  →  /abs/path/hierarchy-wiki/level_2
  Files  : 41 processed  (0 skipped, 0 failed)
  Created: 3 entities, 9 concepts
  Lint   : 0 dead links fixed, 0 duplicates merged, 3 aliases filled
```

---

### Resuming an Interrupted Run

Each level auto-resumes if the run is interrupted. The engine checks whether a source summary page already exists in `sources/` before processing a file. If it does, the file is skipped without making any LLM calls.

This means you can safely restart `build_hierarchy()` after a crash, a network timeout, or a manual stop — it picks up exactly where it left off at each level.

```python
# First run — interrupted after level 0 is half-done
report = wiki.build_hierarchy("./papers", k=3, wiki_root="./hierarchy-wiki")

# Second run — level 0 resumes from where it stopped;
# already-ingested files are skipped automatically.
report = wiki.build_hierarchy("./papers", k=3, wiki_root="./hierarchy-wiki")
```

To force a full re-run of everything (discard previous results), delete the level subfolders and start fresh:

```bash
rm -rf ./hierarchy-wiki/level_0 ./hierarchy-wiki/level_1 ./hierarchy-wiki/level_2
```

---

### Choosing k

| k | Levels produced | Typical use |
|---|---|---|
| 1 | `level_0` only | Standard ingestion with auto-lint; equivalent to `ingest_folder` + `lint` |
| 2 | `level_0`, `level_1` | Two-tier hierarchy: detailed base + coarser meta-concepts |
| 3 | `level_0` – `level_2` | Three-tier: recommended starting point for large corpora |
| 4+ | `level_0` – `level_N` | Deep pyramids; levels ≥ 3 all use `minimal` granularity (~5 items/page) |

A good rule of thumb: start with `k=2` or `k=3`. If the top level produces fewer than 5 concept pages, there is no meaningful signal left to abstract further.

---

### Inspecting the Report

```python
from llm_wiki import HierarchyReport, LevelReport

report: HierarchyReport = wiki.build_hierarchy(...)

report.total_levels    # int  — number of levels actually completed (≤ k)
report.root_folder     # str  — absolute path to wiki_root
report.levels          # list[LevelReport]

lvl: LevelReport = report.levels[0]
lvl.level              # int  — 0-indexed level number
lvl.wiki_folder        # str  — absolute path to this level's folder
lvl.granularity        # str  — "fine" | "standard" | "coarse" | "minimal"
lvl.ingest_reports     # list[IngestReport] — one entry per source file
lvl.lint_report        # LintReport  — lint results for this level

# Count concepts created across all levels
total = sum(
    sum(r.concepts_created for r in lvl.ingest_reports)
    for lvl in report.levels
)
print(f"Total concepts across all levels: {total}")

# Find any files that failed at any level
failures = [
    (lvl.level, r.source_file, r.error_message)
    for lvl in report.levels
    for r in lvl.ingest_reports
    if not r.success and not r.skipped
]
for level_idx, path, msg in failures:
    print(f"Level {level_idx} — FAILED {path}: {msg}")
```

---

## Supported Providers

| Provider | `provider=` value | Notes |
|---|---|---|
| OpenAI | `"openai"` | |
| Anthropic | `"anthropic"` | |
| Google Gemini | `"gemini"` | OpenAI-compat endpoint |
| DeepSeek | `"deepseek"` | |
| Ollama (local) | `"ollama"` | Free, no API key needed |
| LM Studio (local) | `"lmstudio"` | Free, no API key needed |
| OpenRouter | `"openrouter"` | |
| RITS / vLLM | `"rits"` | Needs `base_url` + `rits_api_key` |
| Anthropic-compatible | `"anthropic-compatible"` | Needs `base_url` |

---

## All Constructor Options

```python
wiki = LLMWiki(
    wiki_folder = "./my-wiki",           # REQUIRED: output directory
    provider    = "openai",              # provider name (see table above)
    api_key     = "sk-...",              # API key
    model       = "gpt-4o",             # model name
    base_url    = "",                    # optional URL override
    language    = "en",                 # UI language (affects system prompts)
    wiki_language = "en",               # language for wiki page content
    extraction_granularity = "standard",# "fine"|"standard"|"coarse"|"minimal"|"custom"
    on_progress = print,                # progress callback (optional)

    # Advanced settings (all optional)
    max_tokens_per_call   = 0,          # hard cap on tokens per call (0 = no cap)
    extraction_temperature = None,      # temperature for extraction calls
    chat_temperature       = None,      # temperature for query/chat calls
    repetition_penalty     = None,      # repetition penalty (vLLM / RITS models)

    # Custom extraction limits (only used when extraction_granularity="custom")
    custom_entity_limit  = 10,
    custom_concept_limit = 10,

    # Tag vocabulary
    tag_vocabulary_mode = "default",    # "default" or "custom"
    custom_entity_tags  = "person, organization, project",  # CSV, used when mode="custom"
    custom_concept_tags = "theory, method, term",

    # Slug case for filenames
    slug_case = "lower",               # "lower" or "preserve"

    # RITS-specific
    rits_api_key = "",                 # sent as RITS_API_KEY header
)
```

---

## All Methods

### `wiki.ingest_file(path, content=None, force=False) → IngestReport`

Ingest a single `.md`, `.txt`, or `.markdown` file.

```python
report = wiki.ingest_file("paper.md")
print(report.entities_created, report.concepts_created)
print(report.elapsed_seconds)
```

Supply `content=` to pass text directly without reading the file:

```python
report = wiki.ingest_file("virtual.md", content="# My Notes\n\nSome content...")
```

---

### `wiki.ingest_text(text, title="untitled") → IngestReport`

Ingest raw text without needing a file path:

```python
text = "Geoffrey Hinton won the 2024 Nobel Prize in Physics for work on neural networks..."
report = wiki.ingest_text(text, title="Geoffrey Hinton Nobel Prize")
```

---

### `wiki.ingest_folder(folder_path, recursive=True, force=False) → list[IngestReport]`

Ingest all compatible files in a directory:

```python
reports = wiki.ingest_folder("./papers/", recursive=True)
successes = [r for r in reports if r.success]
print(f"Ingested {len(successes)} files")
```

---

### `wiki.query(question, max_pages=10, streaming_callback=None) → str`

Ask a question grounded in your wiki:

```python
answer = wiki.query("What do I know about attention mechanisms?")
print(answer)
```

Streaming:

```python
def on_chunk(text):
    print(text, end="", flush=True)

wiki.query("Summarize the key concepts.", streaming_callback=on_chunk)
```

---

### `wiki.analyze(text, source_path="unknown.md") → SourceAnalysis | None`

Run extraction only — **no wiki pages are written**. Useful for inspecting what the LLM would extract:

```python
analysis = wiki.analyze("Deep learning paper content...")
for entity in analysis.entities:
    print(entity.name, entity.type, entity.summary[:80])
for concept in analysis.concepts:
    print(concept.name, concept.type)
```

---

### `wiki.test_connection() → dict`

Verify the LLM connection works:

```python
result = wiki.test_connection()
print(result["success"], result["message"])
```

---

### `wiki.list_models() → list[str]`

List available models for the configured provider:

```python
models = wiki.list_models()
print(models)
```

---

### `wiki.build_hierarchy(source_folder, k, wiki_root) → HierarchyReport`

Build a **k-level concept hierarchy** wiki. Each level ingests the `concepts/`
subfolder of the previous level at a progressively coarser granularity. Lint
runs automatically after every level. Already-ingested files are skipped on
resume.

| Parameter | Type | Description |
|---|---|---|
| `source_folder` | `str` | Path to the initial `.md` source files (level 0 input) |
| `k` | `int` | Total number of levels to build |
| `wiki_root` | `str` | Root directory — `level_0/`, `level_1/`, … are created inside it |

Returns a [`HierarchyReport`](#inspecting-the-report) containing one `LevelReport` per completed level.

See the full **[Concept Hierarchy Wiki](#concept-hierarchy-wiki)** section for a complete guide, worked examples, resume behaviour, and how to choose `k`.

---

## Extraction Granularity

Control how many entities/concepts are extracted per source:

| Value | Entities + Concepts | Use case |
|---|---|---|
| `"fine"` | up to ~100 | Academic papers, comprehensive analysis |
| `"standard"` | up to ~50 | General notes (default) |
| `"coarse"` | up to ~10 | Quick summaries |
| `"minimal"` | up to 5 | Cost-sensitive / small models |
| `"custom"` | configurable | Use `custom_entity_limit` + `custom_concept_limit` |

```python
# Extract at most 3 entities and 3 concepts
wiki = LLMWiki(
    ...,
    extraction_granularity="custom",
    custom_entity_limit=3,
    custom_concept_limit=3,
)
```

---

## Recursive Concept Hierarchy — Granularity Ladder

`build_hierarchy()` automatically steps down the granularity at each level:

| Level | Granularity | Max items/page | Purpose |
|---|---|---|---|
| 0 | `fine` | ~100 | Broad, detailed extraction from raw sources |
| 1 | `standard` | ~50 | Second-order concepts from level-0 pages |
| 2 | `coarse` | ~10 | High-level themes from level-1 pages |
| ≥ 3 | `minimal` | ~5 | Top-level abstractions |

**HierarchyReport fields:**
```python
report.levels            # list[LevelReport] — one per completed level
report.total_levels      # int — number of levels actually completed
report.root_folder       # str — resolved path to wiki_root

# Per level:
lvl = report.levels[0]
lvl.level                # int   — 0-indexed level number
lvl.wiki_folder          # str   — absolute path to this level's folder
lvl.granularity          # str   — e.g. "fine"
lvl.ingest_reports       # list[IngestReport] — one per ingested file
lvl.lint_report          # LintReport — lint results for this level
```

---

## IngestReport Fields

```python
report = wiki.ingest_file("notes.md")
report.source_file           # str   — path of the ingested file
report.created_pages         # list[str] — paths of newly created wiki pages
report.updated_pages         # list[str] — paths of updated wiki pages
report.entities_created      # int
report.concepts_created      # int
report.failed_items          # list[FailedItem]  — items that failed generation
report.contradictions_found  # int
report.success               # bool
report.error_message         # str | None
report.elapsed_seconds       # float | None
report.skipped               # bool — True if source was blank
```

---

## SourceAnalysis Fields

```python
analysis = wiki.analyze("some text")
analysis.source_file    # str
analysis.source_title   # str
analysis.summary        # str
analysis.entities       # list[EntityInfo]
analysis.concepts       # list[ConceptInfo]
analysis.contradictions # list[ContradictionInfo]
analysis.related_pages  # list[str]
analysis.key_points     # list[str]

# EntityInfo fields
entity = analysis.entities[0]
entity.name                # str
entity.type                # "person"|"organization"|"project"|"product"|"event"|"place"|"other"
entity.summary             # str
entity.mentions_in_source  # list[str]  — verbatim quotes from source
entity.aliases             # list[str] | None
entity.related_entities    # list[str] | None
entity.related_concepts    # list[str] | None

# ConceptInfo fields
concept = analysis.concepts[0]
concept.name               # str
concept.type               # "theory"|"method"|"field"|"phenomenon"|"standard"|"term"|"other"
concept.summary            # str
concept.mentions_in_source # list[str]
concept.related_concepts   # list[str]
concept.aliases            # list[str] | None
concept.related_entities   # list[str] | None
```

---

## Wiki Languages

The `wiki_language` parameter sets the language in which wiki page *content* is written. The `language` parameter sets the UI language for system prompts.

Supported values: `"en"`, `"zh"`, `"zh-Hant"`, `"ja"`, `"ko"`, `"de"`, `"fr"`, `"es"`, `"pt"`, `"it"`.

```python
wiki = LLMWiki(
    ...,
    language="zh",        # prompt templates in Chinese
    wiki_language="zh",   # wiki content in Chinese
)
```

Section headings inside generated pages are automatically translated to match the `wiki_language`. For example, with `wiki_language="de"`, a concept page will have sections named *Definition*, *Hauptmerkmale*, *Anwendungen*, etc.

---

## License

MIT — same as the original Obsidian plugin.
