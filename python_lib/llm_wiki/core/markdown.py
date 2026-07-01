"""
Markdown utilities — port of src/core/markdown.ts
"""
from __future__ import annotations

import re


def clean_markdown_response(response: str) -> str:
    """Strip LLM artifacts from a generated markdown page."""
    cleaned = response.strip()

    # Remove thinking blocks
    cleaned = re.sub(r"<think\b[^>]*>[\s\S]*?</think>", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<thinking\b[^>]*>[\s\S]*?</thinking>", "", cleaned, flags=re.IGNORECASE)

    # Try to find the real frontmatter / header start
    if "\n---\n" not in cleaned:
        header_match = re.search(r"\n#{1,2} \S", cleaned)
        if header_match:
            cut_idx = cleaned.index(header_match.group())
            if cut_idx > 0:
                cleaned = cleaned[cut_idx + 1:].lstrip()

    # Strip code-block wrappers
    code_block_patterns = [
        r"^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$",
        r"^```(?:markdown|md)?\s*([\s\S]*?)```$",
        r"^```(?:markdown|md)?\s*\n([\s\S]*)$",
        r"^```(?:markdown|md)?\s*([\s\S]*)$",
    ]
    for pattern in code_block_patterns:
        m = re.match(pattern, cleaned, re.MULTILINE)
        if m:
            cleaned = m.group(1).strip()
            break

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:markdown|md)?\s*\n?", "", cleaned)
    if cleaned.endswith("```"):
        cleaned = re.sub(r"\n?```$", "", cleaned)

    # Fix missing opening ---
    if not cleaned.startswith("---"):
        fm_end = cleaned.find("\n---\n")
        if fm_end != -1:
            before_fm = cleaned[:fm_end]
            looks_like_fm = (
                ":" in before_fm
                and not before_fm.startswith("#")
                and not before_fm.startswith("```")
                and all(l.strip() == "" or ":" in l for l in before_fm.split("\n") if l.strip())
            )
            if looks_like_fm:
                cleaned = "---\n" + cleaned
            else:
                cleaned = cleaned[fm_end + 1:]

    return cleaned.strip()


def extract_thinking_blocks(content: str) -> dict:
    """
    Extract reasoning blocks from LLM response content.
    Returns dict with 'thinking_blocks' (list) and 'visible_content' (str).
    """
    if not content:
        return {"thinking_blocks": [], "visible_content": ""}

    block_regex = re.compile(
        r"<think(?:ing)?\b[^>]*>[\s\S]*?</think(?:ing)?>\s*",
        re.IGNORECASE,
    )
    visible_content = block_regex.sub("", content)

    inner_regex = re.compile(
        r"<think(?:ing)?\b[^>]*>([\s\S]*?)</think(?:ing)?>",
        re.IGNORECASE,
    )
    thinking_blocks = [
        unescape_thinking_tag(m.group(1).strip())
        for m in inner_regex.finditer(content)
    ]

    return {
        "thinking_blocks": thinking_blocks,
        "visible_content": visible_content.lstrip(),
    }


def wrap_reasoning_content(reasoning: str, text: str) -> str:
    """Encode reasoning_content into a <think> block prepended to text."""
    if not reasoning:
        return text
    safe_reasoning = re.sub(r"</think", r"<\\/think", reasoning, flags=re.IGNORECASE)
    return f"<think>{safe_reasoning}</think>\n\n{text}"


def unescape_thinking_tag(s: str) -> str:
    return re.sub(r"<\\/think", "</think", s, flags=re.IGNORECASE)
