"""
Prompt-builder helpers — port of src/core/prompt-builders.ts
"""
from __future__ import annotations

import re
from typing import Any


def build_empty_page_prompt(
    template: str,
    page_type: str,
    existing_content: str,
    wiki_index: str,
    section_labels_hint: str,
    max_entities: int,
    max_concepts: int,
) -> str:
    return (
        template
        .replace("{{page_type}}", page_type)
        .replace("{{existing_content}}", existing_content)
        .replace("{{wiki_index}}", wiki_index[:2000])
        .replace("{{section_labels}}", section_labels_hint)
        .replace("{{max_entities}}", str(max_entities))
        .replace("{{max_concepts}}", str(max_concepts))
    )


def clean_wiki_index(index_content: str) -> str:
    """Remove polluted link lines from a wiki index."""
    lines = []
    for line in index_content.split("\n"):
        # Drop lines with duplicate folder patterns in path
        if re.search(r"\[\[(entities|concepts|sources)/[^\]]*/(entities|concepts|sources)[^\s\-_|\]]", line):
            continue
        # Drop lines with folder prefix in display text
        if re.search(r"\[\[(entities|concepts|sources)/[^|\]]+\|(entities|concepts|sources)/", line):
            continue
        lines.append(line)
    return "\n".join(lines)


def correct_link_pollution(content: str) -> str:
    """Fix [[path|folder/display]] and [[folder/folderName]] patterns from LLM output."""
    # Fix display-text pollution: [[entities/x|entities/x]] → [[entities/x|x]]
    display_re = re.compile(
        r"\[\[(entities|concepts|sources)/[^|\]]+\|(entities|concepts|sources)/[^|\]]+\]\]"
    )

    def fix_display(m: re.Match) -> str:
        inner = re.match(r"\[\[([^|\]]+)\|([^|\]]+)\]\]", m.group(0))
        if inner:
            path = inner.group(1)
            clean_display = re.sub(r"^(entities|concepts|sources)/", "", inner.group(2))
            return f"[[{path}|{clean_display}]]"
        return m.group(0)

    cleaned = display_re.sub(fix_display, content)

    # Fix path duplication: [[entities/entitiesRest]] → [[entities/Rest]]
    path_dup_re = re.compile(
        r"\[\[(entities|concepts|sources)/(entities|concepts|sources)([^\s\-_|\]]+)(\|[^\]]+)?\]\]"
    )

    def fix_path(m: re.Match) -> str:
        folder = m.group(1)
        rest = m.group(3)
        display = m.group(4) or ""
        return f"[[{folder}/{rest}{display}]]"

    cleaned = path_dup_re.sub(fix_path, cleaned)
    return cleaned


def normalize_llm_path(path: str, wiki_folder: str) -> str:
    """Normalize a path returned by LLM to use the configured wikiFolder."""
    if not path:
        return path
    if path.startswith(wiki_folder + "/") or path == wiki_folder:
        return path
    if path.startswith("wiki/"):
        return wiki_folder + "/" + path[5:]
    return wiki_folder + "/" + path


def get_granularity_fix_limits(settings: Any) -> dict:
    """Return max_entities/max_concepts for fill-empty-page calls."""
    granularity = getattr(settings, "extraction_granularity", "standard") or "standard"
    if granularity == "fine":
        return {"maxEntities": 10, "maxConcepts": 10}
    if granularity == "coarse":
        return {"maxEntities": 3, "maxConcepts": 3}
    if granularity == "minimal":
        return {"maxEntities": 2, "maxConcepts": 2}
    if granularity == "custom":
        e = getattr(settings, "custom_entity_limit", 5) or 5
        c = getattr(settings, "custom_concept_limit", 5) or 5
        return {"maxEntities": min(e, 5), "maxConcepts": min(c, 5)}
    return {"maxEntities": 5, "maxConcepts": 5}
