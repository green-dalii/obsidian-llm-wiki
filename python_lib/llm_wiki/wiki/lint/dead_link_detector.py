"""
Dead-link detector helpers — port of src/core/dead-link-detector.ts
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional


def find_dead_link_target(pages: List[Dict], target_name: str) -> Optional[Dict]:
    """
    Find a matching page for a dead link target.
    Searches by title (case-insensitive) first, then by aliases.
    Each page dict should have 'path', 'title', and optionally 'aliases'.
    """
    target_basename = target_name.split("/")[-1] if "/" in target_name else target_name
    lower = target_basename.lower()

    match = next((p for p in pages if p.get("title", "").lower() == lower), None)
    if not match:
        match = next(
            (
                p for p in pages
                if any(a.lower() == lower for a in (p.get("aliases") or []))
            ),
            None,
        )
    return match


def build_dead_link_replacement(page: Dict, wiki_folder: str) -> str:
    """Build [[rel/path|Title]] replacement for a resolved dead link."""
    rel = page["path"].replace(wiki_folder + "/", "").replace(".md", "")
    return f"[[{rel}|{page['title']}]]"


def replace_dead_link(content: str, target_name: str, replacement: str) -> str:
    """Replace all [[targetName]] occurrences with the corrected link."""
    link_re = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]")

    def replacer(m: re.Match) -> str:
        if m.group(1).strip() == target_name:
            return replacement
        return m.group(0)

    return link_re.sub(replacer, content)
