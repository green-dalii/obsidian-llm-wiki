"""
Wiki Engine — port of src/wiki/wiki-engine.ts

Filesystem-based replacement for the Obsidian vault API.
All file I/O uses Python's `pathlib` and `os`.
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from datetime import date
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from ..constants import (
    COMPATIBLE_SOURCE_EXTENSIONS,
    TOKENS_PAGE_GENERATION,
    WIKI_SUBFOLDERS,
)
from ..core.frontmatter import (
    enforce_frontmatter_constraints,
    extract_body,
    is_blank_source,
    merge_frontmatter,
    parse_frontmatter,
)
from ..core.markdown import clean_markdown_response
from ..core.slug import slugify
from ..llm_client import LLMClient, _run
from ..types import (
    CollisionItem,
    ConceptInfo,
    EntityInfo,
    FailedItem,
    IngestReport,
    LLMWikiSettings,
    SourceAnalysis,
)
from ..wiki.prompts import (
    GENERATE_CONCEPT_PAGE_PROMPT,
    GENERATE_ENTITY_PAGE_PROMPT,
    GENERATE_SUMMARY_PAGE_PROMPT,
    apply_section_labels,
    build_active_tag_vocabulary_section,
    build_system_prompt,
)
from ..wiki.source_analyzer import SourceAnalyzer

log = logging.getLogger("llm_wiki.engine")


# ── Filesystem vault ──────────────────────────────────────────────────────────

class FilesystemVault:
    """Thin filesystem abstraction replacing Obsidian's App/vault API."""

    def __init__(self, root: str) -> None:
        self.root = Path(root).expanduser().resolve()

    def abs(self, rel: str) -> Path:
        return self.root / rel

    def create_or_update(self, rel: str, content: str) -> None:
        p = self.abs(rel)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")

    def try_read(self, rel: str) -> Optional[str]:
        p = self.abs(rel)
        if p.exists():
            try:
                return p.read_text(encoding="utf-8")
            except Exception:
                return None
        return None

    def delete(self, rel: str) -> None:
        p = self.abs(rel)
        if p.exists():
            p.unlink()

    def list_markdown(self, folder: str = "") -> List[str]:
        """Return relative paths of all .md files under folder."""
        base = self.abs(folder) if folder else self.root
        paths = []
        for f in base.rglob("*.md"):
            paths.append(str(f.relative_to(self.root)))
        return paths

    def exists(self, rel: str) -> bool:
        return self.abs(rel).exists()


# ── Page generation helpers ───────────────────────────────────────────────────

def _today() -> str:
    return date.today().isoformat()


def _format_list(items: Optional[List[str]]) -> str:
    if not items:
        return "None"
    return ", ".join(items)


def _format_mentions(items: Optional[List[str]]) -> str:
    if not items:
        return "None"
    return "\n".join(f'- "{m}"' for m in items)


def _build_existing_pages_list(pages: List[Dict]) -> str:
    if not pages:
        return "None"
    lines = []
    for p in pages:
        path = p.get("path", "")
        title = p.get("title", path)
        lines.append(f"[[{path}|{title}]]")
    return "\n".join(lines)


def _build_existing_slugs(pages: List[Dict], wiki_folder: str) -> str:
    prefix = wiki_folder.rstrip("/") + "/"
    slugs = []
    for p in pages:
        path = p.get("path", "")
        slug = path.replace(prefix, "").replace(".md", "")
        if slug:
            slugs.append(slug)
    return "\n".join(sorted(slugs))


# ── Wiki Engine ───────────────────────────────────────────────────────────────

class WikiEngine:
    """
    Core orchestrator: ingest source files → generate wiki pages.

    Parameters
    ----------
    wiki_folder : str
        Path to the wiki directory (will be created if missing).
    client : LLMClient
        Configured LLM client.
    settings : LLMWikiSettings
        Configuration object.
    on_progress : callable, optional
        Progress callback ``(message: str) -> None``.
    """

    def __init__(
        self,
        wiki_folder: str,
        client: LLMClient,
        settings: LLMWikiSettings,
        on_progress: Optional[Callable[[str], None]] = None,
    ) -> None:
        self.wiki_folder = wiki_folder
        self._client = client
        self._settings = settings
        self._on_progress = on_progress or (lambda _: None)
        self._vault = FilesystemVault(wiki_folder)

        self._source_analyzer = SourceAnalyzer(
            client=client,
            settings=settings,
            on_progress=self._on_progress,
            get_existing_slugs=lambda: _build_existing_slugs(
                self._get_existing_wiki_pages(), wiki_folder
            ),
        )

        # Ensure folder structure
        for sub in WIKI_SUBFOLDERS.values():
            Path(wiki_folder, sub).mkdir(parents=True, exist_ok=True)

    # ── Page lookup ──────────────────────────────────────────────────────────

    def _get_existing_wiki_pages(self) -> List[Dict]:
        """Return metadata for every wiki page."""
        pages = []
        vault = FilesystemVault(self.wiki_folder)
        for rel in vault.list_markdown():
            if "/schema/" in rel:
                continue
            content = vault.try_read(rel)
            fm = parse_frontmatter(content or "")
            title = ""
            if fm:
                # Use first heading as title fallback
                body = extract_body(content or "")
                h1 = re.search(r"^# (.+)$", body, re.MULTILINE)
                title = h1.group(1).strip() if h1 else rel
            aliases = []
            if fm and isinstance(fm.get("aliases"), list):
                aliases = fm["aliases"]
            wiki_link = f"[[{rel.replace('.md', '')}|{title or rel}]]"
            pages.append({"path": rel, "title": title or rel, "wikiLink": wiki_link, "aliases": aliases})
        return pages

    # ── File I/O helpers ─────────────────────────────────────────────────────

    def _write(self, rel: str, content: str) -> None:
        self._vault.create_or_update(rel, content)
        log.debug("Wrote %s", rel)
        self._on_progress(f"Wrote {rel}")

    def _read(self, rel: str) -> Optional[str]:
        return self._vault.try_read(rel)

    # ── Slug resolution ──────────────────────────────────────────────────────

    def _resolve_page_path(self, name: str, page_type: str) -> str:
        """Convert a name to a wiki file path, checking for collisions."""
        preserve = getattr(self._settings, "slug_case", "lower") == "preserve"
        slug = slugify(name, preserve_case=preserve)
        # "entity" → "entities", "concept" → "concepts", "source" → "sources"
        plural = "entities" if page_type == "entity" else page_type + "s"
        folder = WIKI_SUBFOLDERS.get(plural, plural)
        path = f"{folder}/{slug}.md"

        # Check if already exists under different type (collision)
        for other_folder in WIKI_SUBFOLDERS.values():
            candidate = f"{other_folder}/{slug}.md"
            if candidate != path and self._vault.exists(candidate):
                return candidate  # return collision path

        return path

    # ── Entity / concept page generation ────────────────────────────────────

    async def _generate_entity_page(
        self,
        entity: EntityInfo,
        source_path: str,
        existing_pages: List[Dict],
    ) -> str:
        """Generate a wiki page for an entity and return its path."""
        page_path = self._resolve_page_path(entity.name, "entity")

        existing_content = self._read(page_path) if self._vault.exists(page_path) else None

        merge_strategy = ""
        if existing_content:
            fm = parse_frontmatter(existing_content)
            if fm and fm.get("reviewed"):
                # Use preserve-reviewed variant
                prompt = GENERATE_ENTITY_PAGE_PROMPT  # simplified; full variant in TS
                merge_strategy = "**⚠️ This page has been manually reviewed. Preserve ALL existing content. Only append new non-duplicate information.**"
            else:
                merge_strategy = (
                    "**Merge strategy:** This entity page already exists. "
                    "Intelligently merge the new information from the source into the existing page. "
                    "Preserve existing content structure, update relevant fields, and append new mentions."
                )

        mentions = _format_mentions(entity.mentions_in_source)
        related_entities = _format_list(entity.related_entities)
        related_concepts = _format_list(entity.related_concepts)
        aliases = _format_list(entity.aliases)
        existing_pages_list = _build_existing_pages_list(existing_pages)
        related_content = existing_content or "None"
        today = _today()

        prompt = (
            GENERATE_ENTITY_PAGE_PROMPT
            .replace("{{entity_name}}", entity.name)
            .replace("{{entity_type}}", entity.type)
            .replace("{{entity_summary}}", entity.summary)
            .replace("{{mentions}}", mentions)
            .replace("{{related_entities}}", related_entities)
            .replace("{{related_concepts}}", related_concepts)
            .replace("{{extraction_aliases}}", aliases)
            .replace("{{existing_pages}}", existing_pages_list)
            .replace("{{related_content}}", related_content)
            .replace("{{merge_strategy}}", merge_strategy)
            .replace("{{source_file}}", source_path.replace(".md", ""))
            .replace("{{date}}", today)
        )
        prompt = apply_section_labels(prompt, getattr(self._settings, "wiki_language", "en"))

        # Append tag vocabulary
        prompt = prompt + "\n\n" + build_active_tag_vocabulary_section(self._settings)

        system = await build_system_prompt(self._settings)

        response = await self._client.create_message_async(
            model=self._settings.model,
            max_tokens=TOKENS_PAGE_GENERATION,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )

        content = clean_markdown_response(response)
        content = enforce_frontmatter_constraints(content, "entity", self._settings)

        if existing_content:
            # Preserve the source list
            merge = merge_frontmatter(existing_content, source_path.replace(".md", ""))
            if merge["was_merged"]:
                # Re-inject merged frontmatter sources
                content = re.sub(
                    r"^sources:.*$",
                    f"sources:{merge['frontmatter'].split('sources:')[1].split('\\n')[0] if 'sources:' in merge['frontmatter'] else ''}",
                    content,
                    flags=re.MULTILINE,
                )

        self._write(page_path, content)
        return page_path

    async def _generate_concept_page(
        self,
        concept: ConceptInfo,
        source_path: str,
        existing_pages: List[Dict],
    ) -> str:
        page_path = self._resolve_page_path(concept.name, "concept")

        existing_content = self._read(page_path) if self._vault.exists(page_path) else None
        merge_strategy = ""
        if existing_content:
            merge_strategy = (
                "**Merge strategy:** This concept page already exists. "
                "Intelligently merge the new information. "
                "Preserve existing content, update relevant fields, and append new mentions."
            )

        mentions = _format_mentions(concept.mentions_in_source)
        related_concepts = _format_list(concept.related_concepts)
        related_entities = _format_list(concept.related_entities)
        aliases = _format_list(concept.aliases)
        existing_pages_list = _build_existing_pages_list(existing_pages)
        related_content = existing_content or "None"
        today = _today()

        prompt = (
            GENERATE_CONCEPT_PAGE_PROMPT
            .replace("{{concept_name}}", concept.name)
            .replace("{{concept_type}}", concept.type)
            .replace("{{concept_summary}}", concept.summary)
            .replace("{{mentions}}", mentions)
            .replace("{{related_concepts}}", related_concepts)
            .replace("{{related_entities}}", related_entities)
            .replace("{{extraction_aliases}}", aliases)
            .replace("{{existing_pages}}", existing_pages_list)
            .replace("{{related_content}}", related_content)
            .replace("{{merge_strategy}}", merge_strategy)
            .replace("{{source_file}}", source_path.replace(".md", ""))
            .replace("{{date}}", today)
        )
        prompt = apply_section_labels(prompt, getattr(self._settings, "wiki_language", "en"))
        prompt = prompt + "\n\n" + build_active_tag_vocabulary_section(self._settings)

        system = await build_system_prompt(self._settings)

        response = await self._client.create_message_async(
            model=self._settings.model,
            max_tokens=TOKENS_PAGE_GENERATION,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )

        content = clean_markdown_response(response)
        content = enforce_frontmatter_constraints(content, "concept", self._settings)
        self._write(page_path, content)
        return page_path

    async def _generate_summary_page(
        self,
        source_path: str,
        source_title: str,
        analysis: SourceAnalysis,
        created_paths: List[str],
    ) -> str:
        source_slug = source_path.replace(".md", "")
        source_content = self._read(source_path) or ""
        today = _today()

        created_list = "\n".join(
            f"[[{p.replace('.md', '')}|{p.replace('.md', '').split('/')[-1]}]]"
            for p in created_paths
        )

        from ..core.frontmatter import extract_body
        from ..types import VALID_SOURCE_TAGS, DEFAULT_SOURCE_TAG
        # Detect tags from source file frontmatter
        fm = parse_frontmatter(source_content) or {}
        tags_list = fm.get("tags", [DEFAULT_SOURCE_TAG])
        if not isinstance(tags_list, list) or not tags_list:
            tags_list = [DEFAULT_SOURCE_TAG]
        tags_str = ", ".join(str(t) for t in tags_list)

        analysis_str = (
            f"Entities: {len(analysis.entities)}, "
            f"Concepts: {len(analysis.concepts)}, "
            f"Key points: {len(analysis.key_points)}"
        )

        prompt = (
            GENERATE_SUMMARY_PAGE_PROMPT
            .replace("{{source_title}}", source_title)
            .replace("{{content}}", extract_body(source_content)[:4000])
            .replace("{{analysis}}", analysis_str)
            .replace("{{created_pages_list}}", created_list or "None")
            .replace("{{constraints}}", "Link to all created entity and concept pages")
            .replace("{{source_file}}", source_slug)
            .replace("{{date}}", today)
            .replace("{{tags}}", tags_str)
        )
        prompt = apply_section_labels(prompt, getattr(self._settings, "wiki_language", "en"))

        system = await build_system_prompt(self._settings)

        response = await self._client.create_message_async(
            model=self._settings.model,
            max_tokens=TOKENS_PAGE_GENERATION,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )

        content = clean_markdown_response(response)
        content = enforce_frontmatter_constraints(content, "source", self._settings)

        summary_folder = WIKI_SUBFOLDERS["sources"]
        preserve = getattr(self._settings, "slug_case", "lower") == "preserve"
        slug = slugify(source_title, preserve_case=preserve)
        summary_path = f"{summary_folder}/{slug}.md"
        self._write(summary_path, content)
        return summary_path

    # ── Main ingestion ────────────────────────────────────────────────────────

    async def ingest_source_async(
        self,
        source_path: str,
        content: Optional[str] = None,
        force: bool = False,
    ) -> IngestReport:
        """
        Ingest a source file into the wiki.

        Parameters
        ----------
        source_path : str
            Path to the source file (relative to wiki_folder root, or absolute).
        content : str, optional
            File content. If None, the file is read from disk.
        force : bool
            Re-ingest even if already ingested.  When False (the default), the
            file is skipped if a source summary page whose slug matches the
            source filename stem already exists in ``sources/``.
        """
        t_start = time.monotonic()

        # Resolve content
        if content is None:
            src = Path(source_path)
            if not src.is_absolute():
                src = Path(self.wiki_folder).parent / source_path
            if not src.exists():
                return IngestReport(
                    source_file=source_path,
                    success=False,
                    error_message=f"File not found: {src}",
                )
            content = src.read_text(encoding="utf-8")

        ext = Path(source_path).suffix.lstrip(".").lower()
        if ext not in COMPATIBLE_SOURCE_EXTENSIONS:
            return IngestReport(
                source_file=source_path,
                success=False,
                error_message=f"Unsupported file type: .{ext}",
            )

        if is_blank_source(content):
            return IngestReport(
                source_file=source_path,
                skipped=True,
                success=True,
                error_message="Source is blank or frontmatter-only",
            )

        # Skip if already ingested (resume support): a source summary page
        # named after the file stem signals a completed previous run.
        if not force:
            preserve = getattr(self._settings, "slug_case", "lower") == "preserve"
            stem_slug = slugify(Path(source_path).stem, preserve_case=preserve)
            candidate = f"{WIKI_SUBFOLDERS['sources']}/{stem_slug}.md"
            if self._vault.exists(candidate):
                self._on_progress(f"Skipping already-ingested: {Path(source_path).name}")
                return IngestReport(
                    source_file=source_path,
                    skipped=True,
                    success=True,
                    error_message="Already ingested (source summary page exists); use force=True to re-ingest",
                )

        self._on_progress(f"Analyzing {Path(source_path).name}...")

        try:
            analysis = await self._source_analyzer.analyze_source_async(content, source_path)
        except Exception as err:
            return IngestReport(
                source_file=source_path,
                success=False,
                error_message=str(err),
            )

        if not analysis:
            return IngestReport(
                source_file=source_path,
                success=False,
                error_message="Source analysis returned no results (blank or unparseable source)",
            )

        existing_pages = self._get_existing_wiki_pages()
        created_paths: List[str] = []
        updated_paths: List[str] = []
        failed_items: List[FailedItem] = []
        collisions: List[CollisionItem] = []
        entities_created = 0
        concepts_created = 0

        # Generate entity pages
        for entity in analysis.entities:
            self._on_progress(f"Generating entity page: {entity.name}")
            try:
                path = await self._generate_entity_page(entity, source_path, existing_pages)
                if self._vault.exists(path):
                    if path in created_paths or path in updated_paths:
                        updated_paths.append(path)
                    else:
                        created_paths.append(path)
                        entities_created += 1
                existing_pages = self._get_existing_wiki_pages()
            except Exception as err:
                log.error("Failed entity %s: %s", entity.name, err)
                failed_items.append(FailedItem(type="entity", name=entity.name, reason=str(err)))

        # Generate concept pages
        for concept in analysis.concepts:
            self._on_progress(f"Generating concept page: {concept.name}")
            try:
                path = await self._generate_concept_page(concept, source_path, existing_pages)
                if path in created_paths or path in updated_paths:
                    updated_paths.append(path)
                else:
                    created_paths.append(path)
                    concepts_created += 1
                existing_pages = self._get_existing_wiki_pages()
            except Exception as err:
                log.error("Failed concept %s: %s", concept.name, err)
                failed_items.append(FailedItem(type="concept", name=concept.name, reason=str(err)))

        # Generate source summary page
        self._on_progress("Generating source summary page...")
        try:
            summary_path = await self._generate_summary_page(
                source_path,
                analysis.source_title,
                analysis,
                created_paths,
            )
            created_paths.append(summary_path)
        except Exception as err:
            log.warning("Summary page generation failed: %s", err)

        elapsed = time.monotonic() - t_start

        return IngestReport(
            source_file=source_path,
            created_pages=list(dict.fromkeys(created_paths)),
            updated_pages=list(dict.fromkeys(updated_paths)),
            entities_created=entities_created,
            concepts_created=concepts_created,
            failed_items=failed_items,
            collisions=collisions,
            contradictions_found=len(analysis.contradictions),
            success=True,
            elapsed_seconds=round(elapsed, 1),
        )

    def ingest_source(
        self,
        source_path: str,
        content: Optional[str] = None,
        force: bool = False,
    ) -> IngestReport:
        """Synchronous wrapper around ingest_source_async."""
        return _run(self.ingest_source_async(source_path, content, force))

    def ingest_folder(
        self,
        folder_path: str,
        recursive: bool = True,
        force: bool = False,
    ) -> List[IngestReport]:
        """
        Ingest all compatible source files in a folder.

        Parameters
        ----------
        folder_path : str
            Path to the folder (may be outside the wiki directory).
        recursive : bool
            Whether to traverse subdirectories.
        force : bool
            Re-ingest already-ingested files.  When False (the default),
            files whose source summary page already exists are skipped,
            enabling automatic resume of an interrupted run.
        """
        folder = Path(folder_path).expanduser().resolve()
        pattern = "**/*" if recursive else "*"

        reports = []
        for ext in COMPATIBLE_SOURCE_EXTENSIONS:
            for src_file in folder.glob(f"{pattern}.{ext}"):
                self._on_progress(f"Ingesting {src_file.name}...")
                report = self.ingest_source(str(src_file), force=force)
                reports.append(report)

        return reports

    # ── Query (simple) ────────────────────────────────────────────────────────

    async def query_async(
        self,
        question: str,
        max_pages: int = 10,
        streaming_callback: Optional[Callable[[str], None]] = None,
    ) -> str:
        """
        Answer a question using the wiki as context.

        Parameters
        ----------
        question : str
            The question to answer.
        max_pages : int
            Maximum number of wiki pages to load as context.
        streaming_callback : callable, optional
            Called with each streamed chunk if the client supports streaming.
        """
        existing_pages = self._get_existing_wiki_pages()
        if not existing_pages:
            return "The wiki is empty. Please ingest some source files first."

        # Build a context from the most relevant pages
        # For simplicity: load all pages (capped at max_pages), send as context
        page_contents = []
        for p in existing_pages[:max_pages]:
            c = self._read(p["path"])
            if c:
                body = extract_body(c)[:2000]
                page_contents.append(f"### {p['title']}\n{body}")

        context = "\n\n---\n\n".join(page_contents) if page_contents else "No pages available."

        wiki_lang = getattr(self._settings, "wiki_language", "en")
        system = (
            f"You are a knowledgeable assistant with access to a personal wiki. "
            f"Answer the user's question using the provided wiki context. "
            f"Be concise, accurate, and cite relevant wiki pages when possible. "
            f"Answer in the wiki language: {wiki_lang}."
        )

        user_prompt = f"Wiki context:\n\n{context}\n\n---\n\nQuestion: {question}"

        if streaming_callback and hasattr(self._client, "create_message_stream_async"):
            try:
                return await self._client.create_message_stream_async(
                    model=self._settings.model,
                    max_tokens=3000,
                    system=system,
                    messages=[{"role": "user", "content": user_prompt}],
                    on_chunk=streaming_callback,
                )
            except Exception:
                pass  # Fall through to non-streaming

        return await self._client.create_message_async(
            model=self._settings.model,
            max_tokens=3000,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )

    def query(
        self,
        question: str,
        max_pages: int = 10,
        streaming_callback: Optional[Callable[[str], None]] = None,
    ) -> str:
        """Synchronous wrapper around query_async."""
        return _run(self.query_async(question, max_pages, streaming_callback))
