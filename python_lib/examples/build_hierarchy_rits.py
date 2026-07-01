"""
Build a hierarchical wiki from a folder of source documents using a RITS model.

Usage
-----
1. Copy examples/.env.example to examples/.env and fill in your credentials.

2. Edit the ── User configuration ── section below:
   - SOURCE_FOLDER  : path to your .md / .txt source files
   - WIKI_ROOT      : where the level_* folders will be written
   - GRANULARITY_LADDER : one granularity string per level
                          valid values: "fine", "standard", "coarse", "minimal"

3. Run:
       cd python_lib
       python examples/build_hierarchy_rits.py

Output
------
A hierarchy written under WIKI_ROOT:

    hierarchy-wiki/
    ├── level_0/          ← extraction from your source files
    │   ├── concepts/
    │   ├── entities/
    │   └── sources/
    ├── level_1/          ← re-ingestion of level_0/concepts/
    │   ├── concepts/
    │   ├── entities/
    │   └── sources/
    └── level_2/          ← re-ingestion of level_1/concepts/
        ├── concepts/
        ├── entities/
        └── sources/
"""

import os
import sys
import warnings
from pathlib import Path

# ---------------------------------------------------------------------------
# Load credentials from examples/.env (never committed)
# ---------------------------------------------------------------------------

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # python-dotenv not installed — fall through to os.getenv defaults

RITS_BASE_URL     = os.getenv("RITS_BASE_URL", "")
RITS_BEARER_TOKEN = os.getenv("RITS_BEARER_TOKEN", "")
RITS_API_KEY      = os.getenv("RITS_API_KEY", "")
MODEL             = os.getenv("RITS_MODEL", "meta-llama/llama-3-1-70b-instruct")

# ---------------------------------------------------------------------------
# ── User configuration — edit these directly ────────────────────────────────
# ---------------------------------------------------------------------------

SOURCE_FOLDER = "/Users/arkadeep/Desktop/LLM_Wiki_3/LLM_Wiki_3/earth_science"        # folder of .md / .txt files to ingest
WIKI_ROOT     = "./hierarchy-wiki" # root folder for all level_* output dirs

# One granularity value per level. The number of entries determines k.
# Valid values: "fine" (~100 items), "standard" (~50), "coarse" (~10), "minimal" (~5)
# A warning is printed if any level is finer than the level before it.
GRANULARITY_LADDER = ["standard", "coarse", "minimal", "minimal"]

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def on_progress(msg: str) -> None:
    print(msg, flush=True)


def main() -> None:
    try:
        from llm_wiki import LLMWiki
    except ImportError:
        print("llm_wiki not found. Install it first:\n  pip install -e python_lib/")
        sys.exit(1)

    if not RITS_BASE_URL or not RITS_BEARER_TOKEN:
        print(
            "Missing RITS credentials.\n"
            "Copy examples/.env.example to examples/.env and fill in your values."
        )
        sys.exit(1)

    wiki = LLMWiki(
        wiki_folder="./unused",       # required by constructor; not used by build_hierarchy
        provider="rits",
        api_key=RITS_BEARER_TOKEN,    # sent as Authorization: Bearer <token>
        rits_api_key=RITS_API_KEY,    # sent as RITS_API_KEY header
        base_url=RITS_BASE_URL,
        model=MODEL,
        on_progress=on_progress,
        extraction_temperature=0.1,
        max_tokens_per_call=128000,     # cap to fit most RITS context windows
    )

    # Verify credentials before starting a potentially long run
    print("Testing connection...")
    check = wiki.test_connection()
    if not check["success"]:
        print(f"Connection failed: {check['message']}")
        sys.exit(1)
    print(f"Connection OK: {check['message']}\n")

    k = len(GRANULARITY_LADDER)
    print(f"Building {k}-level hierarchy:")
    for i, g in enumerate(GRANULARITY_LADDER):
        print(f"  level_{i}  →  {g}")
    print()

    # Surface library warnings (finer-than-previous level) to stdout
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always", UserWarning)
        report = wiki.build_hierarchy(
            source_folder=SOURCE_FOLDER,
            k=k,
            wiki_root=WIKI_ROOT,
            granularity_ladder=GRANULARITY_LADDER,
        )

    for w in caught:
        print(f"WARNING: {w.message}", flush=True)

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"Hierarchy complete — {report.total_levels} level(s) built")
    print(f"Output folder: {report.root_folder}")
    print(f"{'=' * 60}\n")

    for lvl in report.levels:
        files    = len(lvl.ingest_reports)
        skipped  = sum(1 for r in lvl.ingest_reports if r.skipped)
        failed   = sum(1 for r in lvl.ingest_reports if not r.success and not r.skipped)
        entities = sum(r.entities_created for r in lvl.ingest_reports)
        concepts = sum(r.concepts_created for r in lvl.ingest_reports)

        print(f"Level {lvl.level}  [{lvl.granularity}]  →  {lvl.wiki_folder}")
        print(f"  Files  : {files} processed  ({skipped} skipped, {failed} failed)")
        print(f"  Created: {entities} entities, {concepts} concepts")

        lr = lvl.lint_report
        if lr:
            print(
                f"  Lint   : {lr.dead_links_fixed} dead links fixed, "
                f"{lr.duplicates_merged} duplicates merged, "
                f"{lr.aliases_filled} aliases filled"
            )
        print()

    failures = [
        (lvl.level, r.source_file, r.error_message)
        for lvl in report.levels
        for r in lvl.ingest_reports
        if not r.success and not r.skipped
    ]
    if failures:
        print("=== Failed files ===")
        for level_idx, path, msg in failures:
            print(f"  Level {level_idx} — {path}: {msg}")


if __name__ == "__main__":
    main()
