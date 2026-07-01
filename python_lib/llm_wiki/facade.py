"""
LLMWiki — top-level facade class.
The entry point for all library users.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable, List, Optional

from .llm_client import LLMClient, create_llm_client
from .types import (
    HierarchyReport,
    IngestReport,
    Language,
    LevelReport,
    LLMWikiSettings,
    SourceAnalysis,
)
from .wiki.engine import WikiEngine
from .wiki.lint.controller import LintController, LintReport
from .wiki.source_analyzer import SourceAnalyzer

log = logging.getLogger("llm_wiki")

# Granularity ladder for build_hierarchy(): index = level, clamped at index 3
_GRANULARITY_LADDER = ["fine", "standard", "coarse", "minimal"]

# Coarseness order — higher index = coarser (fewer items extracted)
_GRANULARITY_ORDER = {"fine": 0, "standard": 1, "coarse": 2, "minimal": 3}


class LLMWiki:
    """
    High-level Python interface to the LLM Wiki system.

    Supports all providers: OpenAI, Anthropic, Gemini, DeepSeek, Ollama,
    LM Studio, RITS (vLLM), OpenRouter, and any Anthropic/OpenAI-compatible
    endpoint.

    Parameters
    ----------
    wiki_folder : str
        Directory where wiki pages will be stored (created if absent).
    provider : str
        Provider name: "openai", "anthropic", "anthropic-compatible",
        "gemini", "deepseek", "ollama", "lmstudio", "rits", "openrouter",
        or any other registered provider.
    api_key : str
        API key (may be empty for local models like Ollama).
    model : str
        Model name, e.g. "gpt-4o", "claude-opus-4-5", "gemini-2.0-flash".
    base_url : str, optional
        Override the provider's default base URL.
    language : str, optional
        UI language for the plugin ("en", "zh", "ja", "ko", "de", "fr",
        "es", "pt", "it").  Defaults to "en".
    wiki_language : str, optional
        Language in which wiki page content is written.  Defaults to "en".
    extraction_granularity : str, optional
        How many entities/concepts to extract per source:
        "fine", "standard" (default), "coarse", "minimal", or "custom".
    on_progress : callable, optional
        Called with status messages during ingestion: ``(msg: str) -> None``.
    rits_api_key : str, optional
        Secondary API key for RITS (vLLM) endpoints.
    max_tokens_per_call : int, optional
        Hard cap on max_tokens per LLM call (0 = no cap).
    extraction_temperature : float, optional
        Temperature for extraction calls (None = provider default).
    chat_temperature : float, optional
        Temperature for chat/query calls (None = provider default).
    settings : LLMWikiSettings, optional
        Pre-built settings object (overrides individual keyword arguments).

    Examples
    --------
    Basic usage::

        from llm_wiki import LLMWiki

        wiki = LLMWiki(
            wiki_folder="./my-wiki",
            provider="openai",
            api_key="sk-...",
            model="gpt-4o",
        )

        # Ingest a markdown or text file
        report = wiki.ingest_file("research-notes.md")
        print(f"Created {report.entities_created} entities, {report.concepts_created} concepts")

        # Ask a question about the wiki
        answer = wiki.query("What are the main themes in my notes?")
        print(answer)

    Streaming query::

        def on_chunk(text):
            print(text, end="", flush=True)

        wiki.query("Summarize what I know about transformers.", streaming_callback=on_chunk)

    Ingest an entire folder::

        reports = wiki.ingest_folder("./my-research-papers/")
        total = sum(r.entities_created + r.concepts_created for r in reports)
        print(f"Total wiki pages created: {total}")
    """

    def __init__(
        self,
        wiki_folder: str,
        provider: str = "openai",
        api_key: str = "",
        model: str = "gpt-4o",
        base_url: str = "",
        language: Language = "en",
        wiki_language: str = "en",
        extraction_granularity: str = "standard",
        on_progress: Optional[Callable[[str], None]] = None,
        rits_api_key: str = "",
        max_tokens_per_call: int = 0,
        extraction_temperature: Optional[float] = None,
        chat_temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
        custom_entity_limit: Optional[int] = None,
        custom_concept_limit: Optional[int] = None,
        settings: Optional[LLMWikiSettings] = None,
        slug_case: str = "lower",
        tag_vocabulary_mode: str = "default",
        custom_entity_tags: str = "",
        custom_concept_tags: str = "",
    ) -> None:
        if settings is not None:
            self.settings = settings
        else:
            self.settings = LLMWikiSettings(
                provider=provider,
                api_key=api_key,
                base_url=base_url,
                model=model,
                rits_api_key=rits_api_key,
                wiki_folder=wiki_folder,
                language=language,
                wiki_language=wiki_language,
                extraction_granularity=extraction_granularity,
                custom_entity_limit=custom_entity_limit,
                custom_concept_limit=custom_concept_limit,
                max_tokens_per_call=max_tokens_per_call,
                extraction_temperature=extraction_temperature,
                chat_temperature=chat_temperature,
                repetition_penalty=repetition_penalty,
                slug_case=slug_case,
                tag_vocabulary_mode=tag_vocabulary_mode,
                custom_entity_tags=custom_entity_tags,
                custom_concept_tags=custom_concept_tags,
            )

        self._on_progress = on_progress or (lambda _: None)
        self.client: LLMClient = create_llm_client(self.settings)
        self._engine = WikiEngine(
            wiki_folder=wiki_folder,
            client=self.client,
            settings=self.settings,
            on_progress=self._on_progress,
        )

    # ── Ingestion ─────────────────────────────────────────────────────────────

    def ingest_file(
        self,
        path: str,
        content: Optional[str] = None,
        force: bool = False,
    ) -> IngestReport:
        """
        Ingest a single source file into the wiki.

        Parameters
        ----------
        path : str
            Path to the source file (`.md`, `.txt`, `.markdown`, `.text`).
        content : str, optional
            File content string. If provided, the file is not read from disk.
        force : bool
            Force re-ingestion even if the file was already ingested.
            When False (the default), the file is skipped if a source
            summary page matching the filename stem already exists —
            enabling automatic resume of interrupted runs.

        Returns
        -------
        IngestReport
            Detailed report with counts of created/updated pages.
        """
        return self._engine.ingest_source(path, content, force)

    def ingest_text(
        self,
        text: str,
        title: str = "untitled",
    ) -> IngestReport:
        """
        Ingest raw text directly (no file needed).

        Parameters
        ----------
        text : str
            The source text to analyze and ingest.
        title : str
            A title used as the source name in wiki pages.

        Returns
        -------
        IngestReport
        """
        return self._engine.ingest_source(f"{title}.md", content=text)

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
            Path to the folder.
        recursive : bool
            If True, traverse subdirectories.
        force : bool
            Re-ingest already-ingested files.  When False (the default),
            files whose source summary page already exists are skipped,
            enabling automatic resume of an interrupted run.

        Returns
        -------
        list of IngestReport
        """
        return self._engine.ingest_folder(folder_path, recursive, force)

    # ── Query ─────────────────────────────────────────────────────────────────

    def query(
        self,
        question: str,
        max_pages: int = 10,
        streaming_callback: Optional[Callable[[str], None]] = None,
    ) -> str:
        """
        Ask a question and get an answer grounded in your wiki.

        Parameters
        ----------
        question : str
            Natural-language question.
        max_pages : int
            Maximum number of wiki pages to load as context (default 10).
        streaming_callback : callable, optional
            If provided, called with each text chunk as it streams in.

        Returns
        -------
        str
            The LLM's answer.
        """
        return self._engine.query(question, max_pages, streaming_callback)

    # ── Lint ──────────────────────────────────────────────────────────────────

    def lint(
        self,
        fix_aliases: bool = True,
        fix_dead_links: bool = True,
        fix_empty_pages: bool = True,
        fix_orphans: bool = True,
        fix_duplicates: bool = True,
        fix_tag_violations: bool = True,
        delete_stubs: bool = False,
    ) -> LintReport:
        """
        Run the full wiki health-check and repair pipeline.

        This is a direct port of the Obsidian plugin's "Lint Wiki" command.
        It operates in four phases:

        1. **Preparation** — reads all wiki pages, fixes double-nested
           ``[[[[links]]]]``, normalises ``sources:`` frontmatter fields.
        2. **Programmatic scans** (no LLM, instant) — detects dead links,
           orphan pages, alias-deficient pages, tag vocabulary violations,
           empty/stub pages, ungrounded verbatim quotes, and polluted page
           titles.
        3. **Duplicate detection** — programmatic candidate generation
           (shared links, bigram similarity, cross-language alias overlap,
           case variants) followed by LLM verification.
        4. **LLM fixes** — alias completion, dead-link repair (4-stage:
           title/alias pre-check → LLM semantic match → stub creation →
           deterministic fallback), empty-page expansion, orphan linking,
           duplicate merging, tag retagging.

        Parameters
        ----------
        fix_aliases : bool
            Generate aliases for entity/concept pages that have none.
        fix_dead_links : bool
            Repair ``[[wikilinks]]`` that point to non-existent pages.
            Uses a 4-stage pipeline: deterministic pre-check, LLM semantic
            match, honest placeholder stub, deterministic slug fallback.
        fix_empty_pages : bool
            Expand stub/empty pages using the wiki index as context.
        fix_orphans : bool
            Inject backlinks from related pages into orphan pages (pages
            with no incoming links).
        fix_duplicates : bool
            Detect and merge semantically equivalent pages (translations,
            abbreviations, case variants).
        fix_tag_violations : bool
            Retag pages whose ``tags:`` frontmatter values fall outside
            the active tag vocabulary.
        delete_stubs : bool
            Delete stub pages created by dead-link repair that are still
            empty (``generation_complete: false``). Opt-in, default False.

        Returns
        -------
        LintReport
            Summary of findings and fix counts.

        Examples
        --------
        Full repair::

            report = wiki.lint()
            print(f"Dead links fixed: {report.dead_links_fixed}")
            print(f"Duplicates merged: {report.duplicates_merged}")

        Scan only (no LLM fixes)::

            report = wiki.lint(
                fix_aliases=False,
                fix_dead_links=False,
                fix_empty_pages=False,
                fix_orphans=False,
                fix_duplicates=False,
                fix_tag_violations=False,
            )
            print(f"Dead links found: {report.dead_links_found}")
            print(f"Orphans found: {report.orphans_found}")
        """
        controller = LintController(
            wiki_folder=self.wiki_folder,
            client=self.client,
            settings=self.settings,
            on_progress=self._on_progress,
        )
        return controller.run(
            fix_aliases=fix_aliases,
            fix_dead_links=fix_dead_links,
            fix_empty_pages=fix_empty_pages,
            fix_orphans=fix_orphans,
            fix_duplicates=fix_duplicates,
            fix_tag_violations=fix_tag_violations,
            delete_stubs=delete_stubs,
        )

    # ── Analysis only (no page generation) ───────────────────────────────────

    def analyze(
        self,
        text: str,
        source_path: str = "unknown.md",
    ) -> Optional[SourceAnalysis]:
        """
        Analyze source text and return structured extraction results
        WITHOUT writing any wiki pages.

        Parameters
        ----------
        text : str
            The source text.
        source_path : str
            Logical path used as ``source_file`` in the result.

        Returns
        -------
        SourceAnalysis or None
        """
        analyzer = SourceAnalyzer(
            client=self.client,
            settings=self.settings,
            on_progress=self._on_progress,
        )
        return analyzer.analyze_source(text, source_path)

    # ── LLM client helpers ────────────────────────────────────────────────────

    def list_models(self) -> List[str]:
        """Return available models for the configured provider."""
        return self.client.list_models()

    def test_connection(self) -> dict:
        """
        Send a minimal test message to verify the connection works.

        Returns
        -------
        dict with ``{"success": bool, "message": str}``
        """
        try:
            response = self.client.create_message(
                model=self.settings.model,
                max_tokens=50,
                messages=[{"role": "user", "content": "Say 'OK' and nothing else."}],
            )
            return {"success": True, "message": f"Connection OK. Response: {response[:80]}"}
        except Exception as err:
            return {"success": False, "message": str(err)}

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def wiki_folder(self) -> str:
        return self._engine.wiki_folder

    @property
    def model(self) -> str:
        return self.settings.model

    @model.setter
    def model(self, value: str) -> None:
        self.settings.model = value

    # ── Recursive hierarchy ───────────────────────────────────────────────────

    def build_hierarchy(
        self,
        source_folder: str,
        k: int,
        wiki_root: str,
        granularity_ladder: Optional[List[str]] = None,
    ) -> HierarchyReport:
        """
        Build a k-level concept hierarchy wiki.

        Starting from ``source_folder``, each level ingests the previous
        level's ``concepts/`` subfolder at a progressively coarser granularity,
        then runs lint.  Each level writes into its own subfolder under
        ``wiki_root``.

        Parameters
        ----------
        source_folder : str
            Path to the initial ``.md`` source files (input for level 0).
        k : int
            Total number of levels to build (e.g. k=3 → level_0, level_1,
            level_2).
        wiki_root : str
            Root directory under which ``level_0/``, ``level_1/``, … are
            created.
        granularity_ladder : list of str, optional
            Explicit granularity for each level, e.g. ``["standard", "coarse",
            "minimal"]``.  Valid values: ``"fine"``, ``"standard"``,
            ``"coarse"``, ``"minimal"``.  If shorter than ``k``, the last
            entry is repeated for any remaining levels.  If omitted, the
            default ladder ``["fine", "standard", "coarse", "minimal"]`` is
            used (clamped at ``"minimal"`` for levels ≥ 3).

            A warning is emitted whenever a level's granularity is *finer*
            than the previous level's (i.e. would extract *more* items from
            an already-abstracted source).

        Returns
        -------
        HierarchyReport
            Aggregated report with one ``LevelReport`` per completed level.

        Granularity ladder (default)
        ----------------------------
        ======= =========== ================
        Level   Granularity Max items/page
        ======= =========== ================
        0       fine        ~100
        1       standard    ~50
        2       coarse      ~10
        ≥ 3     minimal     ~5
        ======= =========== ================

        Examples
        --------
        Default ladder::

            from llm_wiki import LLMWiki

            wiki = LLMWiki(
                wiki_folder="./unused",
                provider="openai",
                api_key="sk-...",
                model="gpt-4o",
                on_progress=print,
            )
            report = wiki.build_hierarchy(
                source_folder="./my-papers",
                k=3,
                wiki_root="./hierarchy-wiki",
            )
            for lvl in report.levels:
                total = sum(r.concepts_created for r in lvl.ingest_reports)
                print(f"Level {lvl.level} ({lvl.granularity}): {total} concepts")

        Custom ladder starting at standard::

            report = wiki.build_hierarchy(
                source_folder="./my-papers",
                k=3,
                wiki_root="./hierarchy-wiki",
                granularity_ladder=["standard", "coarse", "minimal"],
            )
        """
        import warnings

        valid = set(_GRANULARITY_ORDER)

        # Build the resolved ladder (one entry per level)
        if granularity_ladder is not None:
            invalid = [g for g in granularity_ladder if g not in valid]
            if invalid:
                raise ValueError(
                    f"Invalid granularity value(s): {invalid}. "
                    f"Must be one of {sorted(valid)}."
                )
            # Pad to length k by repeating the last entry
            resolved: List[str] = [
                granularity_ladder[min(i, len(granularity_ladder) - 1)]
                for i in range(k)
            ]
        else:
            resolved = [
                _GRANULARITY_LADDER[min(i, len(_GRANULARITY_LADDER) - 1)]
                for i in range(k)
            ]

        # Warn on any level that is finer than the one before it
        for i in range(1, len(resolved)):
            prev, curr = resolved[i - 1], resolved[i]
            if _GRANULARITY_ORDER[curr] < _GRANULARITY_ORDER[prev]:
                warnings.warn(
                    f"Level {i} granularity '{curr}' is finer than level {i - 1} "
                    f"granularity '{prev}'. This means level {i} will try to extract "
                    f"more items from an already-abstracted source, which is usually "
                    f"not useful. Consider using '{prev}' or coarser.",
                    UserWarning,
                    stacklevel=2,
                )

        levels: List[LevelReport] = []
        current_source = str(Path(source_folder).expanduser().resolve())

        for level_index in range(k):
            granularity = resolved[level_index]
            level_folder = Path(wiki_root).expanduser().resolve() / f"level_{level_index}"

            self._on_progress(
                f"[Hierarchy] Level {level_index} — granularity={granularity}, "
                f"source={current_source}"
            )

            # Create a new LLMWiki instance for this level
            level_wiki = LLMWiki(
                wiki_folder=str(level_folder),
                settings=LLMWikiSettings(
                    provider=self.settings.provider,
                    api_key=self.settings.api_key,
                    base_url=self.settings.base_url,
                    model=self.settings.model,
                    rits_api_key=self.settings.rits_api_key,
                    wiki_folder=str(level_folder),
                    language=self.settings.language,
                    wiki_language=self.settings.wiki_language,
                    extraction_granularity=granularity,
                    max_tokens_per_call=self.settings.max_tokens_per_call,
                    extraction_temperature=self.settings.extraction_temperature,
                    chat_temperature=self.settings.chat_temperature,
                    repetition_penalty=self.settings.repetition_penalty,
                    disable_thinking=self.settings.disable_thinking,
                    page_generation_concurrency=self.settings.page_generation_concurrency,
                    batch_delay_ms=self.settings.batch_delay_ms,
                    slug_case=self.settings.slug_case,
                    tag_vocabulary_mode=self.settings.tag_vocabulary_mode,
                    custom_entity_tags=self.settings.custom_entity_tags,
                    custom_concept_tags=self.settings.custom_concept_tags,
                ),
                on_progress=self._on_progress,
            )

            # Ingest the current source folder
            ingest_reports = level_wiki.ingest_folder(current_source)

            # Lint this level's wiki
            self._on_progress(f"[Hierarchy] Level {level_index} — running lint...")
            lint_report = level_wiki.lint()

            self._on_progress(
                f"[Hierarchy] Level {level_index} complete — "
                f"{sum(r.concepts_created for r in ingest_reports)} concepts created"
            )

            levels.append(LevelReport(
                level=level_index,
                wiki_folder=str(level_folder),
                granularity=granularity,
                ingest_reports=ingest_reports,
                lint_report=lint_report,
            ))

            # Next level's source is this level's concepts/ subfolder
            next_source = level_folder / "concepts"
            if not next_source.exists() or not any(next_source.glob("*.md")):
                self._on_progress(
                    f"[Hierarchy] Level {level_index} produced no concepts — stopping early."
                )
                break
            current_source = str(next_source)

        return HierarchyReport(
            levels=levels,
            total_levels=len(levels),
            root_folder=str(Path(wiki_root).expanduser().resolve()),
        )

    def __repr__(self) -> str:
        return (
            f"LLMWiki(provider={self.settings.provider!r}, "
            f"model={self.settings.model!r}, "
            f"wiki_folder={self.wiki_folder!r})"
        )
