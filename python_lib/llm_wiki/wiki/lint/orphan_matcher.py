"""
Orphan-matcher helpers — port of src/core/orphan-matcher.ts
"""
from __future__ import annotations

from typing import Dict, Optional


def build_orphan_link_prompt(template: str, orphan_content: str, wiki_index: str, wiki_folder: str) -> str:
    return (
        template
        .replace("{{orphan_content}}", orphan_content[:2000])
        .replace("{{wiki_index}}", wiki_index[:3000])
        .replace("{{wikiFolder}}", wiki_folder)
    )


def validate_orphan_link_target(related_content: str, link_target: str) -> bool:
    return link_target in related_content


def build_orphan_link_update(
    related_content: str,
    page_path: str,
    link_text: str,
    link_target: str,
    section_header: str,
) -> str:
    header = f"## {section_header}"
    section = "" if header in related_content else f"\n\n{header}"
    return f"{related_content}{section}\n- {link_text} {link_target}"


def normalize_orphan_page_path(page_path: str, wiki_folder: str) -> str:
    return page_path if page_path.startswith(wiki_folder) else f"{wiki_folder}/{page_path}"
