"""
Source Analyzer — port of src/wiki/source-analyzer.ts

Iterative batch extraction of entities/concepts from source text.
No Obsidian dependencies — all I/O is done via plain strings.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Callable, Dict, List, Optional, Set

from ..constants import (
    MAX_TOKENS_BATCH,
    SOURCE_ANALYZER_RETRY_MULTIPLIER,
    TOKENS_PER_ITEM_BUDGET,
)
from ..core.batch_processing import (
    BatchAccumulation,
    BatchLimits,
    adjust_batch_size_for_response,
    build_source_analysis,
    calculate_batch_limits,
    check_cumulative_limits,
    check_empty_batch,
    create_empty_accumulation,
    detect_convergence,
    get_custom_type_caps,
    merge_batch_results,
)
from ..core.json_parser import parse_json_response
from ..types import (
    ConceptInfo,
    EntityInfo,
    SourceAnalysis,
    WIKI_LANGUAGES,
)
from .prompts import (
    ANALYZE_SOURCE_PROMPT,
    build_active_tag_vocabulary_section,
    build_system_prompt,
    get_granularity_instruction,
)

log = logging.getLogger("llm_wiki.source_analyzer")


# ── Batch response normalization ──────────────────────────────────────────────

def _coerce_to_list(value: Any) -> List:
    if isinstance(value, list):
        return value
    if value is None or value is True or value is False:
        return []
    if isinstance(value, dict):
        return []
    return []


def normalize_batch_response(raw: Optional[Dict]) -> Dict:
    """Normalize a raw LLM batch response to a well-formed dict."""
    if not raw:
        return {"validity": "unusable", "entities": [], "concepts": [],
                "source_title": None, "summary": None,
                "contradictions": [], "related_pages": [], "key_points": []}

    entities_raw = _coerce_to_list(raw.get("entities"))
    concepts_raw = _coerce_to_list(raw.get("concepts"))

    entities = [e for e in entities_raw if isinstance(e, dict) and e.get("name", "").strip()]
    concepts = [c for c in concepts_raw if isinstance(c, dict) and c.get("name", "").strip()]

    # Strip wiki-link formatting from related_pages
    related_pages_raw = _coerce_to_list(raw.get("related_pages"))
    related_pages = []
    for p in related_pages_raw:
        s = str(p)
        import re
        m = re.match(r"^\[\[(?:[^\]|]+\|)?([^\]]+)\]\]$", s)
        related_pages.append(m.group(1) if m else s)

    result = {
        "entities": entities,
        "concepts": concepts,
        "source_title": raw.get("source_title") if isinstance(raw.get("source_title"), str) else None,
        "summary": raw.get("summary") if isinstance(raw.get("summary"), str) else None,
        "contradictions": _coerce_to_list(raw.get("contradictions")),
        "related_pages": related_pages,
        "key_points": _coerce_to_list(raw.get("key_points")),
    }

    if not entities and not concepts:
        if raw.get("entities") is None and raw.get("concepts") is None:
            result["validity"] = "unusable"
        else:
            result["validity"] = "empty"
    else:
        result["validity"] = "valid"

    return result


def _dict_to_entity(d: Dict) -> EntityInfo:
    return EntityInfo(
        name=d.get("name", ""),
        type=d.get("type", "other"),
        summary=d.get("summary", ""),
        mentions_in_source=_coerce_to_list(d.get("mentions_in_source")),
        aliases=_coerce_to_list(d.get("aliases")) or None,
        related_entities=_coerce_to_list(d.get("related_entities")) or None,
        related_concepts=_coerce_to_list(d.get("related_concepts")) or None,
    )


def _dict_to_concept(d: Dict) -> ConceptInfo:
    return ConceptInfo(
        name=d.get("name", ""),
        type=d.get("type", "other"),
        summary=d.get("summary", ""),
        mentions_in_source=_coerce_to_list(d.get("mentions_in_source")),
        related_concepts=_coerce_to_list(d.get("related_concepts")),
        aliases=_coerce_to_list(d.get("aliases")) or None,
        related_entities=_coerce_to_list(d.get("related_entities")) or None,
    )


class SourceAnalyzer:
    """
    Iterative batch extractor of entities/concepts from markdown/text sources.

    Parameters
    ----------
    client : LLMClient
        Any llm_wiki LLMClient (Anthropic, OpenAI-compatible, etc.).
    settings : LLMWikiSettings
        Configuration (model name, granularity, language, etc.).
    on_progress : callable, optional
        Called with status messages during extraction.
    """

    def __init__(
        self,
        client: Any,
        settings: Any,
        on_progress: Optional[Callable[[str], None]] = None,
        get_existing_slugs: Optional[Callable[[], str]] = None,
    ) -> None:
        self._client = client
        self._settings = settings
        self._on_progress = on_progress or (lambda _: None)
        self._get_existing_slugs = get_existing_slugs or (lambda: "")

    async def analyze_source_async(
        self,
        content: str,
        source_path: str = "unknown",
    ) -> Optional[SourceAnalysis]:
        """
        Analyze a source document asynchronously.
        Returns None if the source is blank or the LLM fails on the first batch.
        """
        from ..core.frontmatter import is_blank_source

        if is_blank_source(content):
            log.debug("Blank source — skipping LLM call")
            return None

        settings = self._settings
        granularity = getattr(settings, "extraction_granularity", "standard") or "standard"
        custom_caps_cfg = get_custom_type_caps(settings)
        limits = calculate_batch_limits(
            len(content),
            granularity,
            custom_limits={
                "entity_cap": custom_caps_cfg.get("entity_cap"),
                "concept_cap": custom_caps_cfg.get("concept_cap"),
            } if granularity == "custom" else None,
        )

        base_max_tokens = max(MAX_TOKENS_BATCH, limits.initial_batch_size * TOKENS_PER_ITEM_BUDGET)
        retry_cap = base_max_tokens * SOURCE_ANALYZER_RETRY_MULTIPLIER

        accumulation = create_empty_accumulation()
        first_batch_norm: Optional[Dict] = None

        # Build static part of prompt (before {{batch_context}})
        existing_slugs = self._get_existing_slugs()
        granularity_instruction = get_granularity_instruction(settings)
        tag_vocab_section = build_active_tag_vocabulary_section(settings)

        lang_code = getattr(settings, "wiki_language", "en") or "en"
        lang_name = WIKI_LANGUAGES.get(lang_code, lang_code)
        lang_hint = (
            f"\n\nCRITICAL LANGUAGE REQUIREMENT: Summaries, descriptions, source_title, and key_points "
            f"in your JSON output MUST be written in {lang_name}. "
            "HOWEVER: entity names and concept names MUST be preserved in their original source language — "
            "NEVER translate names. mentions_in_source MUST be verbatim quotes from the source."
        )

        template = (
            ANALYZE_SOURCE_PROMPT
            .replace("{{content}}", content)
            .replace("{{existing_slugs}}", existing_slugs)
        )
        marker = "{{batch_context}}"
        marker_idx = template.find(marker)
        static_prefix = template[:marker_idx]
        suffix_template = template[marker_idx + len(marker):]

        current_batch_size = limits.initial_batch_size
        batch_size_halved = False
        retrying_batch = False

        file_basename = os.path.basename(source_path)
        file_basename = os.path.splitext(file_basename)[0]

        for batch_num in range(limits.max_batches):
            is_first = batch_num == 0

            if is_first:
                batch_context = (
                    "This is the first extraction round. "
                    "Extract the most important entities and concepts from the source."
                )
            else:
                ctx_lines = []
                for e in accumulation.entities:
                    if e.aliases:
                        ctx_lines.append(f"{e.name} (aliases: {', '.join(e.aliases)})")
                    else:
                        ctx_lines.append(e.name)
                for c in accumulation.concepts:
                    if c.aliases:
                        ctx_lines.append(f"{c.name} (aliases: {', '.join(c.aliases)})")
                    else:
                        ctx_lines.append(c.name)

                already = (
                    f"\n\nAlready extracted from this source:\n  [{'; '.join(ctx_lines)}]\n"
                    "  (including abbreviations, synonyms, and translations of these names)\n"
                    "Do NOT extract them again."
                ) if ctx_lines else ""

                batch_context = (
                    f"This is round {batch_num + 1} of extraction. "
                    "Extract the next batch of most important entities and concepts from the remaining content. "
                    "If no more items are worth extracting, return empty arrays [] for entities and concepts."
                    + already
                )

            prompt = (
                static_prefix + batch_context
                + suffix_template
                .replace("{{granularity_instruction}}", granularity_instruction)
                .replace("{{batch_size}}", str(current_batch_size))
            )
            final_prompt = prompt + lang_hint + "\n\n" + tag_vocab_section

            batch_max_tokens = max(base_max_tokens, current_batch_size * TOKENS_PER_ITEM_BUDGET)

            self._on_progress(
                f"Analyzing batch {batch_num + 1}/{limits.max_batches}..."
                if is_first
                else f"Analyzing batch {batch_num + 1}/{limits.max_batches} "
                     f"({len(accumulation.entities)} entities, {len(accumulation.concepts)} concepts so far)..."
            )

            try:
                system_prompt = await build_system_prompt(settings)

                response = await self._client.create_message_async(
                    model=settings.model,
                    max_tokens=batch_max_tokens,
                    system=system_prompt,
                    messages=[{"role": "user", "content": final_prompt}],
                    response_format={"type": "json_object"},
                    max_tokens_per_call=retry_cap,
                )

                self._on_progress(f"Analyzed batch {batch_num + 1}, processing...")

                async def repair_fn(malformed: str) -> str:
                    repair_prompt = (
                        "Fix the following malformed JSON. Only fix JSON syntax errors "
                        "(unescaped quotes, trailing commas, missing brackets). "
                        "Do NOT change any values or content. Output ONLY the fixed JSON, no other text.\n\n"
                        + malformed
                    )
                    return await self._client.create_message_async(
                        model=settings.model,
                        max_tokens=retry_cap,
                        system=await build_system_prompt(settings),
                        messages=[{"role": "user", "content": repair_prompt}],
                        response_format={"type": "json_object"},
                        max_tokens_per_call=retry_cap,
                    )

                analysis_data = await parse_json_response(response, repair_fn)

                if analysis_data is None:
                    log.error("Batch %d: JSON parse failed", batch_num + 1)
                    if is_first:
                        return None
                    break

                norm = normalize_batch_response(analysis_data)
                validity = norm.get("validity", "unusable")

                if is_first:
                    if validity == "unusable":
                        log.error("Round 1 unusable — no entities or concepts")
                        return None

                    first_batch_norm = norm
                    accumulation.contradictions = norm.get("contradictions", [])
                    accumulation.related_pages = norm.get("related_pages", [])
                    accumulation.key_points = norm.get("key_points", [])

                    entities = [_dict_to_entity(e) for e in norm["entities"]]
                    concepts = [_dict_to_concept(c) for c in norm["concepts"]]
                    merge = merge_batch_results(accumulation, entities, concepts)
                    accumulation.entities = merge["all_entities"]
                    accumulation.concepts = merge["all_concepts"]
                    accumulation.extracted_names = merge["extracted_names"]

                if validity == "empty":
                    log.debug("Batch %d: LLM returned empty arrays, stopping", batch_num + 1)
                    break

                if not is_first:
                    entities = [_dict_to_entity(e) for e in norm["entities"]]
                    concepts = [_dict_to_concept(c) for c in norm["concepts"]]
                    merge = merge_batch_results(
                        accumulation, entities, concepts,
                        custom_caps=custom_caps_cfg if granularity == "custom" else None,
                    )
                    raw_total = len(norm["entities"]) + len(norm["concepts"])
                    new_total = len(merge["new_entities"]) + len(merge["new_concepts"])

                    accumulation.entities = merge["all_entities"]
                    accumulation.concepts = merge["all_concepts"]
                    accumulation.extracted_names = merge["extracted_names"]

                    current_batch_size = adjust_batch_size_for_response(
                        current_batch_size, len(response), limits.response_fullness_threshold
                    )

                    empty_check = check_empty_batch(raw_total, new_total)
                    if empty_check["should_stop"]:
                        log.debug("Batch %d: %s", batch_num + 1, empty_check["reason"])
                        break

                    conv = detect_convergence(raw_total, current_batch_size, batch_size_halved, limits.min_batch_size)
                    if conv.should_stop:
                        log.debug("Batch %d: %s", batch_num + 1, conv.reason)
                        break
                    if conv.new_batch_size_halved:
                        batch_size_halved = True
                        current_batch_size = conv.new_batch_size

                    cum = check_cumulative_limits(
                        len(accumulation.entities), len(accumulation.concepts),
                        custom_caps_cfg.get("entity_cap"), custom_caps_cfg.get("concept_cap"),
                        limits.max_total_items,
                    )
                    if cum["should_stop"]:
                        log.debug("Batch %d: %s", batch_num + 1, cum["reason"])
                        break

                retrying_batch = False

            except Exception as err:
                log.error("Batch %d failed: %s", batch_num + 1, err)
                if is_first:
                    raise
                err_msg = str(err).lower()
                is_truncation = "truncated" in err_msg or "max_tokens" in err_msg
                if not retrying_batch and is_truncation and current_batch_size > limits.min_batch_size:
                    current_batch_size = max(limits.min_batch_size, current_batch_size // 2)
                    log.warning("Truncation — halving batch size to %d and retrying", current_batch_size)
                    retrying_batch = True
                    batch_num -= 1
                    continue
                retrying_batch = False
                break

        if not first_batch_norm and not accumulation.entities and not accumulation.concepts:
            return None

        # Hard-cap for custom granularity
        if granularity == "custom":
            e_cap = getattr(settings, "custom_entity_limit", 5) or 5
            c_cap = getattr(settings, "custom_concept_limit", 5) or 5
            accumulation.entities = accumulation.entities[:e_cap]
            accumulation.concepts = accumulation.concepts[:c_cap]

        return build_source_analysis(
            source_path,
            file_basename,
            accumulation,
            source_title=first_batch_norm.get("source_title") if first_batch_norm else None,
            summary=first_batch_norm.get("summary") if first_batch_norm else None,
        )

    def analyze_source(self, content: str, source_path: str = "unknown") -> Optional[SourceAnalysis]:
        """Synchronous wrapper around analyze_source_async."""
        from ..llm_client import _run
        return _run(self.analyze_source_async(content, source_path))
