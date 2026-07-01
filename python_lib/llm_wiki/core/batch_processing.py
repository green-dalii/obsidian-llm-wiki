"""
Batch processing helpers — port of src/core/batch-limits.ts,
src/core/convergence-detector.ts, src/core/batch-merger.ts
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from ..types import EntityInfo, ConceptInfo, ContradictionInfo, SourceAnalysis
from ..constants import CUSTOM_BATCH_SIZE_MAX

# ── Batch limits ──────────────────────────────────────────────────────────────

GRANULARITY_CONFIG: Dict[str, Dict] = {
    "fine":     {"initial_batch_size": 30, "max_batches_base": 12, "max_total_items": 100},
    "standard": {"initial_batch_size": 20, "max_batches_base": 6,  "max_total_items": 50},
    "coarse":   {"initial_batch_size": 10, "max_batches_base": 3,  "max_total_items": 10},
    "minimal":  {"initial_batch_size": 5,  "max_batches_base": 1,  "max_total_items": 5},
    "custom":   {"initial_batch_size": 5,  "max_batches_base": 1,  "max_total_items": None},
}

_MIN_BATCH_SIZE = 5
_MAX_TOKENS = 16000
_SHORT_CONTENT_THRESHOLD = 20000
_CHARS_PER_ITEM = 600


@dataclass
class BatchLimits:
    initial_batch_size: int
    max_batches: int
    max_total_items: Optional[int]
    min_batch_size: int
    response_fullness_threshold: float


def calculate_batch_limits(
    content_length: int,
    granularity: str = "standard",
    custom_limits: Optional[Dict] = None,
) -> BatchLimits:
    cfg = dict(GRANULARITY_CONFIG.get(granularity) or GRANULARITY_CONFIG["standard"])

    if granularity == "custom" and custom_limits:
        entity_cap = custom_limits.get("entity_cap") or _MIN_BATCH_SIZE
        concept_cap = custom_limits.get("concept_cap") or _MIN_BATCH_SIZE
        total_cap = entity_cap + concept_cap
        if total_cap > 10:
            cfg["initial_batch_size"] = min(CUSTOM_BATCH_SIZE_MAX, max(_MIN_BATCH_SIZE, total_cap))
            cfg["max_batches_base"] = max(1, -(-total_cap // cfg["initial_batch_size"]))

    if content_length < _SHORT_CONTENT_THRESHOLD and cfg["max_total_items"] is not None:
        reasonable = max(5, -(-content_length // _CHARS_PER_ITEM))
        if cfg["max_total_items"] > reasonable:
            cfg["max_total_items"] = reasonable

    max_batches = min(
        cfg["max_batches_base"] * 3,
        max(2, -(-content_length // 2000) + 2),
    )

    return BatchLimits(
        initial_batch_size=cfg["initial_batch_size"],
        max_batches=max_batches,
        max_total_items=cfg["max_total_items"],
        min_batch_size=_MIN_BATCH_SIZE,
        response_fullness_threshold=_MAX_TOKENS * 0.7,
    )


def adjust_batch_size_for_response(
    current_batch_size: int,
    response_length: int,
    threshold: float = _MAX_TOKENS * 0.7,
) -> int:
    if response_length > threshold and current_batch_size > _MIN_BATCH_SIZE:
        return max(_MIN_BATCH_SIZE, int(current_batch_size * 0.75))
    return current_batch_size


def get_custom_type_caps(settings: Any) -> Dict:
    if getattr(settings, "extraction_granularity", "standard") != "custom":
        return {"entity_cap": None, "concept_cap": None}
    return {
        "entity_cap": getattr(settings, "custom_entity_limit", None) or 5,
        "concept_cap": getattr(settings, "custom_concept_limit", None) or 5,
    }


# ── Convergence detector ─────────────────────────────────────────────────────

@dataclass
class ConvergenceResult:
    should_stop: bool
    reason: Optional[str]
    new_batch_size: int
    new_batch_size_halved: bool


def detect_convergence(
    raw_total: int,
    current_batch_size: int,
    batch_size_halved: bool,
    min_batch_size: int = 5,
) -> ConvergenceResult:
    yield_ratio = raw_total / current_batch_size if current_batch_size else 0

    if yield_ratio < 0.5 and current_batch_size > min_batch_size:
        if batch_size_halved:
            return ConvergenceResult(
                should_stop=True,
                reason=f"Low yield persists after halving ({raw_total}/{current_batch_size}), converged",
                new_batch_size=current_batch_size,
                new_batch_size_halved=batch_size_halved,
            )
        new_size = max(min_batch_size, current_batch_size // 2)
        return ConvergenceResult(
            should_stop=False,
            reason=f"Low yield ({raw_total}/{current_batch_size}), halving batch size",
            new_batch_size=new_size,
            new_batch_size_halved=True,
        )

    return ConvergenceResult(
        should_stop=False,
        reason=None,
        new_batch_size=current_batch_size,
        new_batch_size_halved=batch_size_halved,
    )


def check_cumulative_limits(
    total_entities: int,
    total_concepts: int,
    entity_cap: Optional[int],
    concept_cap: Optional[int],
    max_total_items: Optional[int],
) -> Dict:
    if entity_cap is not None and concept_cap is not None:
        if total_entities >= entity_cap and total_concepts >= concept_cap:
            return {"should_stop": True, "reason": f"Per-type limits reached"}
        return {"should_stop": False, "reason": None}

    cumulative = total_entities + total_concepts
    if max_total_items is not None and cumulative >= max_total_items:
        return {"should_stop": True, "reason": f"Cumulative total {cumulative} reached limit {max_total_items}"}
    return {"should_stop": False, "reason": None}


def check_empty_batch(raw_total: int, new_total: int) -> Dict:
    if raw_total == 0:
        return {"should_stop": True, "reason": "LLM returned empty array"}
    if new_total == 0:
        return {"should_stop": True, "reason": "All items duplicate, extraction exhausted"}
    return {"should_stop": False, "reason": None}


# ── Batch merger ─────────────────────────────────────────────────────────────

@dataclass
class BatchAccumulation:
    entities: List[EntityInfo] = field(default_factory=list)
    concepts: List[ConceptInfo] = field(default_factory=list)
    contradictions: List[ContradictionInfo] = field(default_factory=list)
    related_pages: List[str] = field(default_factory=list)
    key_points: List[str] = field(default_factory=list)
    extracted_names: Set[str] = field(default_factory=set)


def create_empty_accumulation() -> BatchAccumulation:
    return BatchAccumulation()


def merge_batch_results(
    current: BatchAccumulation,
    new_entities: List[EntityInfo],
    new_concepts: List[ConceptInfo],
    custom_caps: Optional[Dict] = None,
) -> Dict:
    def filter_new(items: List, is_entity: bool) -> List:
        result = []
        for item in items:
            if item.name.strip().lower() not in current.extracted_names:
                result.append(item)
        return result

    filtered_entities = filter_new(new_entities, True)
    filtered_concepts = filter_new(new_concepts, False)

    capped_entities = filtered_entities
    capped_concepts = filtered_concepts

    if custom_caps:
        ec = custom_caps.get("entity_cap")
        cc = custom_caps.get("concept_cap")
        if ec is not None:
            remaining = max(0, ec - len(current.entities))
            capped_entities = filtered_entities[:remaining]
        if cc is not None:
            remaining = max(0, cc - len(current.concepts))
            capped_concepts = filtered_concepts[:remaining]

    updated_names = set(current.extracted_names)
    for e in capped_entities:
        updated_names.add(e.name.strip().lower())
        for alias in (e.aliases or []):
            updated_names.add(alias.strip().lower())
    for c in capped_concepts:
        updated_names.add(c.name.strip().lower())
        for alias in (c.aliases or []):
            updated_names.add(alias.strip().lower())

    return {
        "new_entities": capped_entities,
        "new_concepts": capped_concepts,
        "all_entities": current.entities + capped_entities,
        "all_concepts": current.concepts + capped_concepts,
        "extracted_names": updated_names,
    }


def build_source_analysis(
    file_path: str,
    file_basename: str,
    accumulation: BatchAccumulation,
    source_title: Optional[str] = None,
    summary: Optional[str] = None,
) -> SourceAnalysis:
    return SourceAnalysis(
        source_file=file_path,
        source_title=source_title or file_basename,
        summary=summary or "",
        entities=accumulation.entities,
        concepts=accumulation.concepts,
        contradictions=accumulation.contradictions,
        related_pages=accumulation.related_pages,
        key_points=accumulation.key_points,
        created_pages=[],
        updated_pages=[],
    )
