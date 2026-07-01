# Recursive Wiki Hierarchy Plan

## Top-Level Overview

Add a `build_hierarchy(source_folder, k, wiki_root, ...)` method to the `LLMWiki` facade that builds a **k-level concept hierarchy**. At each level a fresh `LLMWiki` instance writes into its own subfolder (`level_0/`, `level_1/`, ...), processes the appropriate source files, runs lint, then hands its `concepts/` subfolder to the next level as input. Granularity steps automatically down the fixed ladder: `fine → standard → coarse → minimal`, with `minimal` clamped for any level ≥ 3.

**Scope:**
- One new public method on `LLMWiki`: `build_hierarchy()`
- One new dataclass exported from the library: `HierarchyReport`
- No changes to existing ingestion, lint, or engine code
- Exported in `__init__.py` so users can import it

**Not in scope:** GUI, async variant of the new method, custom per-level granularity override (fixed ladder only for now).

---

## Granularity Ladder

| Level index | Granularity  | Max items/page |
|-------------|--------------|----------------|
| 0           | `fine`       | ~100           |
| 1           | `standard`   | ~50            |
| 2           | `coarse`     | ~10            |
| ≥ 3         | `minimal`    | ~5             |

---

## Sub-Tasks

---

### Sub-Task 1 — Add `HierarchyReport` dataclass to `types.py`

**Intent**  
Define the return type for `build_hierarchy()` so callers get structured feedback about every level: how many pages were created, what folder was used, and the lint summary for that level.

**Expected Outcomes**
- `HierarchyReport` is importable from `llm_wiki`
- It carries a `List[LevelReport]` where each `LevelReport` holds the level index, wiki folder path, granularity used, list of `IngestReport`, and the `LintReport`

**Todo List**
1. In [`python_lib/llm_wiki/types.py`](python_lib/llm_wiki/types.py), add two new dataclasses at the bottom of the file:
   - `LevelReport(level: int, wiki_folder: str, granularity: str, ingest_reports: List[IngestReport], lint_report: Optional[LintReport])`
   - `HierarchyReport(levels: List[LevelReport], total_levels: int, root_folder: str)`
2. `LintReport` is defined in `wiki/lint/controller.py` — use `TYPE_CHECKING` import guard or a forward ref string annotation to avoid a circular import (mirrors the pattern already used in `facade.py`)

**Relevant Context**
- [`python_lib/llm_wiki/types.py`](python_lib/llm_wiki/types.py) — all other report dataclasses live here (`IngestReport`, `FailedItem`, etc.)
- [`python_lib/llm_wiki/wiki/lint/controller.py`](python_lib/llm_wiki/wiki/lint/controller.py) — `LintReport` definition

**Status:** [x] done

---

### Sub-Task 2 — Implement `build_hierarchy()` on `LLMWiki`

**Intent**  
Add the core recursive logic as a synchronous method on the existing `LLMWiki` facade. Each level: creates a level subfolder, spins up a new `LLMWiki` instance pointing to that subfolder (reusing the same provider/model/key/settings, but with the level's granularity), ingests the input folder, runs lint, then sets the `concepts/` output of this level as the input folder for the next.

**Expected Outcomes**
- Calling `wiki.build_hierarchy("./sources", k=3, wiki_root="./hierarchy-wiki")` produces:
  - `./hierarchy-wiki/level_0/` ← ingests `./sources` at `fine`
  - `./hierarchy-wiki/level_1/` ← ingests `level_0/concepts/` at `standard`
  - `./hierarchy-wiki/level_2/` ← ingests `level_1/concepts/` at `coarse`
- Each level runs lint after ingestion
- Returns a `HierarchyReport` with one `LevelReport` per level
- If a level's `concepts/` folder is empty after ingestion, iteration stops early with a warning logged

**Todo List**
1. Define the granularity ladder as a module-level constant in [`python_lib/llm_wiki/facade.py`](python_lib/llm_wiki/facade.py):
   ```
   _GRANULARITY_LADDER = ["fine", "standard", "coarse", "minimal"]
   ```
2. Add `build_hierarchy()` method to [`LLMWiki`](python_lib/llm_wiki/facade.py) with the signature:
   ```python
   def build_hierarchy(
       self,
       source_folder: str,
       k: int,
       wiki_root: str,
   ) -> HierarchyReport:
   ```
   - `source_folder`: path to the initial `.md` source files (level 0 input)
   - `k`: total number of levels to build
   - `wiki_root`: root directory under which `level_0/`, `level_1/`, ... will be created
   - No new callback parameter — all progress messages are emitted via `self._on_progress`, which is already set on the parent `LLMWiki` instance and will be forwarded to each level instance
3. Inside the method, loop `for level_index in range(k)`:
   a. Compute `granularity = _GRANULARITY_LADDER[min(level_index, 3)]`
   b. Compute `level_folder = Path(wiki_root) / f"level_{level_index}"`
   c. Instantiate a new `LLMWiki` with the same provider/model/api_key/base_url/etc. from `self.settings`, but with `wiki_folder=str(level_folder)` and `extraction_granularity=granularity`
   d. Emit a level-start progress message via `self._on_progress`, e.g. `f"[Hierarchy] Level {level_index} — granularity={granularity}"`
   e. Call `level_wiki.ingest_folder(current_source_folder)` → collect `ingest_reports`
   f. Call `level_wiki.lint()` → collect `lint_report`
   g. Emit a level-complete progress message via `self._on_progress`
   h. Set `current_source_folder = str(level_folder / "concepts")`
   i. Check if `concepts/` folder exists and contains `.md` files; if not, log a warning via `self._on_progress` and `break` early
   j. Append a `LevelReport` to the accumulator
4. Return `HierarchyReport(levels=..., total_levels=len(levels), root_folder=wiki_root)`
5. Add `HierarchyReport` and `LevelReport` to the imports at the top of `facade.py`

**Relevant Context**
- [`python_lib/llm_wiki/facade.py`](python_lib/llm_wiki/facade.py) — `LLMWiki.__init__` signature (lines 103–160) shows all settings fields to replicate
- [`python_lib/llm_wiki/types.py`](python_lib/llm_wiki/types.py) — `LLMWikiSettings` dataclass (lines 113–161)
- [`python_lib/llm_wiki/constants.py`](python_lib/llm_wiki/constants.py) — `WIKI_SUBFOLDERS["concepts"] == "concepts"` (line 8)
- Pass `self._on_progress` directly as `on_progress` to each level's `LLMWiki` constructor — no extra wrapper needed

**Status:** [x] done

---

### Sub-Task 3 — Export new types from `__init__.py`

**Intent**  
Make `HierarchyReport` and `LevelReport` part of the public API so library consumers can type-annotate their code.

**Expected Outcomes**
- `from llm_wiki import HierarchyReport, LevelReport` works without error
- Both names appear in `__all__`

**Todo List**
1. In [`python_lib/llm_wiki/__init__.py`](python_lib/llm_wiki/__init__.py):
   - Add `HierarchyReport` and `LevelReport` to the import from `.types`
   - Add both names to `__all__`

**Relevant Context**
- [`python_lib/llm_wiki/__init__.py`](python_lib/llm_wiki/__init__.py) — current exports (lines 21–52)

**Status:** [x] done

---

### Sub-Task 4 — Update `README.md` with usage example

**Intent**  
Document the new feature so users know how to call it, what `k` means, and what the granularity ladder looks like.

**Expected Outcomes**
- A new section "Recursive Concept Hierarchy" in `python_lib/README.md` with:
  - A brief explanation of the hierarchy concept
  - A minimal code example showing `build_hierarchy()` usage
  - A table showing the granularity-per-level mapping

**Todo List**
1. Read [`python_lib/README.md`](python_lib/README.md) to find the right place to insert the section (after the basic ingestion examples, before advanced configuration)
2. Insert the new section with a code snippet and the granularity table

**Relevant Context**
- [`python_lib/README.md`](python_lib/README.md) — existing documentation structure

**Status:** [x] done

---

## Open Questions / Decisions Already Made

| Question | Decision |
|----------|----------|
| Separate vs shared wiki folder per level | Separate (`wiki_root/level_N/`) |
| Input to each level | Only `concepts/` from previous level |
| Granularity schedule | Fixed automatic ladder (`fine→standard→coarse→minimal`) |
| k semantics | Total number of levels (k=2 → level_0, level_1) |
| Lint timing | After every level, including the last |
| Early stop | Yes — stop if `concepts/` is empty after ingestion, log warning and return what was built |
| Progress callbacks | No new callback — reuse `self._on_progress` from the parent instance, forwarded to each level. Level milestones prefixed with `[Hierarchy]` |
| Async variant | Not in scope |
