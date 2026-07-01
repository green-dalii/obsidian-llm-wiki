"""
Slug utilities — port of src/core/slug.ts
Pure functions, no IO.
"""
from __future__ import annotations

import re
import time
from typing import List


def compute_slug(text: str, preserve_case: bool = False) -> str:
    """Compute a filesystem-safe slug from text."""
    if not text or not text.strip():
        return "untitled"

    trimmed = text.strip()

    # Remove control characters and filesystem-unsafe symbols
    after_remove = re.sub(r"[\x00-\x1f]", "", trimmed)
    after_remove = re.sub(r"""[/\\:*?"<>,()'!?、，。；：！？（）【】《》]""", "", after_remove)

    if not after_remove:
        return f"untitled-{int(time.time() * 1000)}"

    # Convert spaces and dots to dashes
    after_dash = re.sub(r"[\s.]+", "-", after_remove)

    # Merge multiple dashes
    after_merge = re.sub(r"-+", "-", after_dash)

    # Remove leading and trailing dashes
    final = after_merge.strip("-").strip()

    if not final:
        return f"untitled-{int(time.time() * 1000)}"

    return final if preserve_case else final.lower()


def slugify(text: str, preserve_case: bool = False) -> str:
    """Public alias for compute_slug with empty-guard."""
    if not text or not text.strip():
        return "untitled"
    return compute_slug(text, preserve_case)


def filter_redundant_aliases(page_path: str, candidate_aliases: List[str]) -> List[str]:
    """
    Drop aliases that are redundant against the page's own filename.
    Pure function (no IO).
    """
    file_name = page_path.split("/")[-1]
    file_key = re.sub(r"\.md$", "", file_name, flags=re.IGNORECASE).strip().lower()
    seen: set = set()
    result = []
    for alias in candidate_aliases:
        if not alias or not alias.strip():
            continue
        key = alias.strip().lower()
        if key == file_key:
            continue
        if key in seen:
            continue
        seen.add(key)
        result.append(alias)
    return result
