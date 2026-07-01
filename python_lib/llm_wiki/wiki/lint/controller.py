"""
Lint controller — orchestrates all lint phases.
Port of src/wiki/lint/controller.ts + src/wiki/lint/phases/preparation.ts
                                     + src/wiki/lint/phases/programmatic.ts
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Callable, Dict, List, Optional

from ...core.frontmatter import parse_frontmatter
from ...core.slug import slugify
from ...llm_client import LLMClient, _run
from ...types import LLMWikiSettings
from ..engine import FilesystemVault
from .duplicate_detection import DuplicateCandidate, generate_duplicate_candidates
from .fixes import (
    delete_empty_stubs,
    fill_empty_page_async,
    fix_dead_link_async,
    link_orphan_page_async,
    merge_duplicate_pages_async,
    run_alias_completion_async,
    run_retag_violations_async,
    verify_duplicate_candidates_async,
)
from .scanners import (
    ScannerPage,
    build_known_targets,
    detect_alias_deficiency,
    detect_polluted_pages,
    fix_double_nested_wiki_links,
    is_page_empty,
    scan_dead_links,
    scan_orphans,
    scan_quote_grounding,
    scan_tag_violations,
)

log = logging.getLogger("llm_wiki.lint")


# ── LintReport dataclass ──────────────────────────────────────────────────────

@dataclass
class LintReport:
    wiki_folder: str
    total_pages: int = 0
    elapsed_seconds: float = 0.0

    # Programmatic findings
    alias_deficient_pages: int = 0
    orphans_found: int = 0
    dead_links_found: int = 0
    tag_violations_found: int = 0
    empty_pages_found: int = 0
    ungrounded_quotes_found: int = 0
    polluted_pages_found: int = 0
    double_nest_fixes: int = 0
    sources_normalized_files: int = 0
    sources_normalized_entries: int = 0
    duplicates_found: int = 0

    # Fix results
    aliases_filled: int = 0
    dead_links_fixed: int = 0
    orphans_linked: int = 0
    empty_pages_filled: int = 0
    stubs_deleted: int = 0
    duplicates_merged: int = 0
    tags_retagged: int = 0

    # Detail lines
    details: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


# ── Lint controller ───────────────────────────────────────────────────────────

class LintController:
    """
    Orchestrates the full wiki lint pipeline.

    Phases
    ------
    1. Preparation   — read all pages, fix double-nested links, normalize sources.
    2. Programmatic  — pure in-memory scans: dead links, orphans, alias deficiency,
                       tag violations, empty pages, quote grounding, polluted pages.
    3. Duplicate     — programmatic candidate generation + LLM verification.
    4. LLM fixes     — alias completion, dead-link repair, empty-page fill,
                       orphan linking, duplicate merging, tag retagging.
    """

    def __init__(
        self,
        wiki_folder: str,
        client: LLMClient,
        settings: LLMWikiSettings,
        on_progress: Optional[Callable[[str], None]] = None,
    ) -> None:
        self._wiki_folder = wiki_folder
        self._client = client
        self._settings = settings
        self._prog = on_progress or (lambda _: None)
        self._vault = FilesystemVault(wiki_folder)

    # ── Vault I/O helpers ─────────────────────────────────────────────────────

    def _read(self, path: str) -> Optional[str]:
        # Accept both absolute and relative paths
        rel = path
        if path.startswith(self._wiki_folder + "/"):
            rel = path[len(self._wiki_folder) + 1:]
        content = self._vault.try_read(rel)
        if content is None and Path(path).exists():
            try:
                content = Path(path).read_text(encoding="utf-8")
            except Exception:
                pass
        return content

    def _write(self, path: str, content: str) -> None:
        rel = path
        if path.startswith(self._wiki_folder + "/"):
            rel = path[len(self._wiki_folder) + 1:]
        self._vault.create_or_update(rel, content)

    def _delete(self, path: str) -> None:
        rel = path
        if path.startswith(self._wiki_folder + "/"):
            rel = path[len(self._wiki_folder) + 1:]
        self._vault.delete(rel)

    def _list_markdown(self) -> List[str]:
        """Return relative paths of all .md files."""
        return self._vault.list_markdown()

    def _list_files(self) -> List[Dict]:
        relpaths = self._vault.list_markdown()
        result = []
        for rel in relpaths:
            basename = Path(rel).name
            full = f"{self._wiki_folder}/{rel}"
            result.append({"path": full, "basename": basename})
        return result

    def _get_existing_pages(self) -> List[Dict]:
        from ..engine import WikiEngine
        vault = FilesystemVault(self._wiki_folder)
        pages = []
        for rel in vault.list_markdown():
            if "/schema/" in rel:
                continue
            content = vault.try_read(rel) or ""
            fm = parse_frontmatter(content) or {}
            body_m = re.search(r"^# (.+)$", content, re.MULTILINE)
            title = body_m.group(1).strip() if body_m else rel
            aliases = fm.get("aliases", []) if isinstance(fm.get("aliases"), list) else []
            full_path = f"{self._wiki_folder}/{rel}"
            wiki_link = f"[[{rel.replace('.md', '')}|{title}]]"
            pages.append({"path": full_path, "title": title, "wikiLink": wiki_link, "aliases": aliases})
        return pages

    # ── Phases ────────────────────────────────────────────────────────────────

    def _run_preparation_phase(self) -> Dict:
        self._prog("Lint: reading wiki pages...")
        wiki_files = [
            f for f in self._list_files()
            if "/schema/" not in f["path"]
            and "index.md" not in f["path"]
            and "log.md" not in f["path"]
            and "/contradictions/" not in f["path"]
        ]

        all_files = self._list_files()
        known, known_lower = build_known_targets(all_files)

        page_map: Dict[str, ScannerPage] = {}
        for f in wiki_files:
            content = self._read(f["path"]) or ""
            page_map[f["path"]] = ScannerPage(f["path"], content, f["basename"])

        # Fix double-nested links
        double_nest_fixes = 0
        for path, page in page_map.items():
            fixed, new_content = fix_double_nested_wiki_links(page.content)
            if fixed > 0:
                double_nest_fixes += fixed
                self._write(path, new_content)
                page.content = new_content

        # Normalize sources (simple: strip polluted folder prefixes in sources: fields)
        sources_norm_files = 0
        sources_norm_entries = 0
        for path, page in page_map.items():
            new_content, n = _normalize_sources_field(page.content, self._wiki_folder)
            if n > 0:
                self._write(path, new_content)
                page.content = new_content
                sources_norm_files += 1
                sources_norm_entries += n

        return {
            "wiki_files": wiki_files,
            "page_map": page_map,
            "known": known,
            "known_lower": known_lower,
            "double_nest_fixes": double_nest_fixes,
            "sources_norm_files": sources_norm_files,
            "sources_norm_entries": sources_norm_entries,
        }

    def _run_programmatic_phase(self, prep: Dict) -> Dict:
        page_map = prep["page_map"]
        wiki_files = prep["wiki_files"]
        known = prep["known"]
        known_lower = prep["known_lower"]

        self._prog("Lint: scanning alias deficiency...")
        alias_deficient = detect_alias_deficiency(wiki_files, page_map)

        self._prog("Lint: scanning orphan pages...")
        orphans = scan_orphans(page_map, self._wiki_folder)

        self._prog("Lint: scanning tag violations...")
        tag_violations = scan_tag_violations(page_map, self._settings)

        self._prog("Lint: scanning polluted pages...")
        all_page_list = [{"path": p, "title": page_map[p].basename} for p in page_map]
        polluted = detect_polluted_pages(all_page_list)

        self._prog("Lint: scanning dead links...")
        dead_links = scan_dead_links(page_map, known, known_lower, self._wiki_folder)

        self._prog("Lint: scanning quote grounding...")
        source_map = {p: page for p, page in page_map.items() if "/sources/" in p}
        ungrounded = scan_quote_grounding(page_map, source_map, self._wiki_folder)

        return {
            "alias_deficient": alias_deficient,
            "orphans": orphans,
            "tag_violations": tag_violations,
            "polluted": polluted,
            "dead_links": dead_links,
            "ungrounded_quotes": ungrounded,
        }

    async def _run_duplicate_phase(self, page_map: Dict[str, ScannerPage]) -> List[Dict]:
        entity_concept_pages = [
            {"path": path, "content": page.content, "title": page.basename.replace(".md", "")}
            for path, page in page_map.items()
            if "/entities/" in path or "/concepts/" in path
        ]
        if len(entity_concept_pages) < 2:
            return []

        self._prog("Lint: detecting duplicate candidates...")
        candidates = generate_duplicate_candidates(entity_concept_pages)

        # Tier split
        tier1: List[DuplicateCandidate] = []
        tier2: List[DuplicateCandidate] = []
        for c in candidates:
            if c.signal in ("crossLang", "caseVariant"):
                tier1.append(c)
            elif c.signal == "bigram":
                (tier1 if c.score >= 0.6 else tier2).append(c)
            else:
                tier2.append(c)

        CANDIDATE_TOKENS = 30
        MAX_INPUT_TOKENS = 15000
        max_total = MAX_INPUT_TOKENS // CANDIDATE_TOKENS
        verify_candidates = list(tier1)
        tier2_budget = max(0, max_total - len(tier1))
        verify_candidates += tier2[:tier2_budget]

        if not verify_candidates:
            return []

        self._prog(f"Lint: verifying {len(verify_candidates)} duplicate candidates via LLM...")
        return await verify_duplicate_candidates_async(
            self._settings,
            self._client,
            verify_candidates,
            len(entity_concept_pages),
            on_progress=self._prog,
        )

    async def run_async(
        self,
        fix_aliases: bool = True,
        fix_dead_links: bool = True,
        fix_empty_pages: bool = True,
        fix_orphans: bool = True,
        fix_duplicates: bool = True,
        fix_tag_violations: bool = True,
        delete_stubs: bool = False,
    ) -> LintReport:
        t_start = time.monotonic()
        report = LintReport(wiki_folder=self._wiki_folder)

        # ── Phase 1: Preparation ──
        self._prog("Lint: phase 1 — preparation...")
        prep = self._run_preparation_phase()
        page_map = prep["page_map"]
        report.total_pages = len(page_map)
        report.double_nest_fixes = prep["double_nest_fixes"]
        report.sources_normalized_files = prep["sources_norm_files"]
        report.sources_normalized_entries = prep["sources_norm_entries"]

        # ── Phase 2: Programmatic scans ──
        self._prog("Lint: phase 2 — programmatic scans...")
        findings = self._run_programmatic_phase(prep)
        alias_deficient: List[ScannerPage] = findings["alias_deficient"]
        orphans: List[str] = findings["orphans"]
        tag_violations = findings["tag_violations"]
        dead_links = findings["dead_links"]
        ungrounded = findings["ungrounded_quotes"]
        polluted = findings["polluted"]

        report.alias_deficient_pages = len(alias_deficient)
        report.orphans_found = len(orphans)
        report.tag_violations_found = len(tag_violations)
        report.dead_links_found = len(dead_links)
        report.ungrounded_quotes_found = len(ungrounded)
        report.polluted_pages_found = len(polluted)

        # ── Phase 3: Duplicate detection ──
        duplicates: List[Dict] = []
        if fix_duplicates:
            try:
                duplicates = await self._run_duplicate_phase(page_map)
                report.duplicates_found = len(duplicates)
                if duplicates:
                    report.details.append(f"Found {len(duplicates)} duplicate pairs")
            except Exception as e:
                log.error("Duplicate detection failed: %s", e)
                report.errors.append(f"Duplicate detection failed: {e}")

        # Build empty pages list (exclude pages involved in duplicate merges)
        dup_paths = {d["target"] for d in duplicates} | {d["source"] for d in duplicates}
        empty_pages = [
            {"path": path, "content": page.content}
            for path, page in page_map.items()
            if path not in dup_paths and is_page_empty(page.content)
        ]
        report.empty_pages_found = len(empty_pages)

        # ── Phase 4: LLM fixes ──

        # 4.1 Alias completion
        if fix_aliases and alias_deficient:
            self._prog(f"Lint: filling aliases for {len(alias_deficient)} pages...")
            try:
                alias_result = await run_alias_completion_async(
                    vault_write=self._write,
                    wiki_folder=self._wiki_folder,
                    settings=self._settings,
                    client=self._client,
                    alias_deficient_pages=alias_deficient,
                    on_progress=self._prog,
                )
                report.aliases_filled = alias_result["filled"]
                report.details.extend(alias_result["results"])
            except Exception as e:
                log.error("Alias completion failed: %s", e)
                report.errors.append(f"Alias completion: {e}")

        # 4.2 Dead-link fixes
        if fix_dead_links and dead_links:
            self._prog(f"Lint: fixing {len(dead_links)} dead links...")
            existing_pages = self._get_existing_pages()
            # Deduplicate by (source, target)
            seen_dl: set = set()
            unique_dl = []
            for dl in dead_links:
                key = f"{dl['source']}::{dl['target']}"
                if key not in seen_dl:
                    seen_dl.add(key)
                    unique_dl.append(dl)

            for i, dl in enumerate(unique_dl):
                self._prog(f"Lint: fixing dead link {i+1}/{len(unique_dl)}: {dl['target']}...")
                try:
                    src_path = f"{self._wiki_folder}/{dl['source']}.md"
                    result = await fix_dead_link_async(
                        vault_read=self._read,
                        vault_write=self._write,
                        existing_pages=existing_pages,
                        wiki_folder=self._wiki_folder,
                        settings=self._settings,
                        client=self._client,
                        source_path=src_path,
                        target_name=dl["target"],
                    )
                    if "no action" not in result.lower():
                        report.dead_links_fixed += 1
                        report.details.append(f"- [[{dl['source']}]]: `[[{dl['target']}]]` → {result}")
                    # Refresh pages after each fix (new stubs may have been created)
                    existing_pages = self._get_existing_pages()
                except Exception as e:
                    log.error("Dead link fix failed %s → %s: %s", dl["source"], dl["target"], e)
                    report.errors.append(f"Dead link {dl['source']}→{dl['target']}: {e}")

        # 4.3 Empty-page fill
        if fix_empty_pages and empty_pages:
            self._prog(f"Lint: filling {len(empty_pages)} empty pages...")
            for i, ep in enumerate(empty_pages):
                self._prog(f"Lint: filling empty page {i+1}/{len(empty_pages)}: {ep['path']}...")
                try:
                    summary = await fill_empty_page_async(
                        vault_read=self._read,
                        vault_write=self._write,
                        wiki_folder=self._wiki_folder,
                        settings=self._settings,
                        client=self._client,
                        page_path=ep["path"],
                        existing_content=ep["content"],
                    )
                    report.empty_pages_filled += 1
                    report.details.append(f"- Filled: {summary}")
                except Exception as e:
                    log.error("Fill empty page failed %s: %s", ep["path"], e)
                    report.errors.append(f"Fill empty page {ep['path']}: {e}")

        # 4.4 Orphan linking
        if fix_orphans and orphans:
            self._prog(f"Lint: linking {len(orphans)} orphan pages...")
            for i, op in enumerate(orphans):
                self._prog(f"Lint: linking orphan {i+1}/{len(orphans)}: {op}...")
                try:
                    linked = await link_orphan_page_async(
                        vault_read=self._read,
                        vault_write=self._write,
                        wiki_folder=self._wiki_folder,
                        settings=self._settings,
                        client=self._client,
                        orphan_path=op,
                    )
                    op_rel = op.replace(self._wiki_folder + "/", "").replace(".md", "")
                    if linked:
                        report.orphans_linked += 1
                        report.details.append(
                            f"- [[{op_rel}]] linked from: {', '.join(f'[[{p}]]' for p in linked)}"
                        )
                    else:
                        report.details.append(f"- [[{op_rel}]]: no suitable linking targets found")
                except Exception as e:
                    log.error("Orphan link failed %s: %s", op, e)
                    report.errors.append(f"Orphan link {op}: {e}")

        # 4.5 Duplicate merging
        if fix_duplicates and duplicates:
            self._prog(f"Lint: merging {len(duplicates)} duplicate pairs...")
            for i, d in enumerate(duplicates):
                self._prog(
                    f"Lint: merging {i+1}/{len(duplicates)}: "
                    f"{d['source']} → {d['target']}..."
                )
                try:
                    result = await merge_duplicate_pages_async(
                        vault_read=self._read,
                        vault_write=self._write,
                        vault_delete=self._delete,
                        vault_list_markdown=self._list_markdown,
                        wiki_folder=self._wiki_folder,
                        settings=self._settings,
                        client=self._client,
                        target_path=d["target"],
                        source_path=d["source"],
                    )
                    report.duplicates_merged += 1
                    report.details.append(f"- {result}")
                except Exception as e:
                    log.error("Merge failed %s → %s: %s", d["source"], d["target"], e)
                    report.errors.append(f"Merge {d['source']}→{d['target']}: {e}")

        # 4.6 Tag retag
        if fix_tag_violations and tag_violations:
            self._prog(f"Lint: retagging {len(tag_violations)} tag violations...")
            try:
                retag_result = await run_retag_violations_async(
                    vault_read=self._read,
                    vault_write=self._write,
                    wiki_folder=self._wiki_folder,
                    settings=self._settings,
                    client=self._client,
                    violations=tag_violations,
                    on_progress=self._prog,
                )
                report.tags_retagged = retag_result["fixed"]
                report.details.extend(retag_result["results"])
            except Exception as e:
                log.error("Retag failed: %s", e)
                report.errors.append(f"Retag: {e}")

        # 4.7 Delete empty stubs (optional, opt-in)
        if delete_stubs:
            self._prog("Lint: deleting empty stubs...")
            try:
                stub_result = delete_empty_stubs(
                    vault_read=self._read,
                    vault_delete=self._delete,
                    vault_list_markdown=self._list_markdown,
                    wiki_folder=self._wiki_folder,
                )
                report.stubs_deleted = stub_result["deleted"]
                if stub_result["errors"]:
                    report.errors.extend(stub_result["errors"])
            except Exception as e:
                log.error("Delete stubs failed: %s", e)
                report.errors.append(f"Delete stubs: {e}")

        report.elapsed_seconds = round(time.monotonic() - t_start, 1)
        self._prog(f"Lint complete in {report.elapsed_seconds}s.")
        return report

    def run(
        self,
        fix_aliases: bool = True,
        fix_dead_links: bool = True,
        fix_empty_pages: bool = True,
        fix_orphans: bool = True,
        fix_duplicates: bool = True,
        fix_tag_violations: bool = True,
        delete_stubs: bool = False,
    ) -> LintReport:
        """Synchronous wrapper around run_async."""
        return _run(self.run_async(
            fix_aliases=fix_aliases,
            fix_dead_links=fix_dead_links,
            fix_empty_pages=fix_empty_pages,
            fix_orphans=fix_orphans,
            fix_duplicates=fix_duplicates,
            fix_tag_violations=fix_tag_violations,
            delete_stubs=delete_stubs,
        ))


# ── Internal helper ────────────────────────────────────────────────────────────

def _normalize_sources_field(content: str, wiki_folder: str) -> tuple:
    """Remove double wiki_folder prefixes from sources: fields. Returns (new_content, n_fixed)."""
    prefix = wiki_folder + "/"
    double_prefix = prefix + prefix
    if double_prefix not in content:
        return content, 0
    fixed = content.replace(double_prefix, prefix)
    n = content.count(double_prefix)
    return fixed, n
