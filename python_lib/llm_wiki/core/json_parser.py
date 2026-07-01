"""
JSON response parser — port of src/core/json.ts
"""
from __future__ import annotations

import json
import re
from typing import Any, Awaitable, Callable, Dict, Optional


async def parse_json_response(
    response: str,
    repair_fn: Optional[Callable[[str], Awaitable[str]]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Multi-layer JSON parser with LLM-based repair fallback.
    Mirrors the TypeScript implementation exactly.
    """
    try:
        # Layer 1: normalization
        normalized = response.strip()

        # Strip reasoning/thinking blocks
        normalized = re.sub(r"<think\b[^>]*>[\s\S]*?</think>", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"<thinking\b[^>]*>[\s\S]*?</thinking>", "", normalized, flags=re.IGNORECASE)
        normalized = normalized.strip()

        # Strip markdown code fences
        normalized = re.sub(r"^```(?:json|markdown|md)?\s*\n?", "", normalized)
        normalized = re.sub(r"\n?```$", "", normalized)
        normalized = normalized.strip()

        # Prefill artifact correction
        if normalized.startswith("{{"):
            normalized = normalized[1:]
        elif len(normalized) > 1 and normalized[0] == "{":
            after_first = normalized[1:].lstrip()
            if after_first.startswith("{") or after_first.startswith("```"):
                normalized = after_first

        # Try direct parse
        if normalized and normalized[0] != "{":
            with_brace = "{" + normalized
            try:
                return json.loads(with_brace)
            except json.JSONDecodeError:
                pass

        # Try direct parse
        try:
            return json.loads(normalized)
        except json.JSONDecodeError as e:
            pass

        # Layer 2: extraction
        first_brace = normalized.find("{")
        if first_brace != -1:
            balanced = _extract_balanced_json(normalized, first_brace)
            if balanced:
                fixed = _fix_common_json_issues(balanced)
                try:
                    return json.loads(fixed)
                except json.JSONDecodeError:
                    pass

                if repair_fn:
                    try:
                        repaired = await repair_fn(balanced)
                        cleaned = repaired.strip()
                        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
                        cleaned = re.sub(r"\n?```$", "", cleaned)
                        final = _fix_common_json_issues(cleaned.strip())
                        return json.loads(final)
                    except Exception:
                        pass

        # Greedy regex fallback
        json_match = re.search(r"\{[\s\S]*\}", normalized)
        if json_match:
            candidate = json_match.group(0)
            fixed = _fix_common_json_issues(candidate)
            try:
                return json.loads(fixed)
            except json.JSONDecodeError:
                pass

            if repair_fn:
                try:
                    repaired = await repair_fn(candidate)
                    cleaned = repaired.strip()
                    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
                    cleaned = re.sub(r"\n?```$", "", cleaned)
                    final = _fix_common_json_issues(cleaned.strip())
                    return json.loads(final)
                except Exception:
                    pass

        return None

    except Exception as e:
        return None


def _extract_balanced_json(text: str, start_pos: int) -> Optional[str]:
    """Extract the first balanced {…} JSON object via brace counting."""
    depth = 0
    in_string = False
    escape = False

    for i in range(start_pos, len(text)):
        ch = text[i]

        if escape:
            escape = False
            continue

        if ch == "\\" and in_string:
            escape = True
            continue

        if ch == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if ch == "{":
            depth += 1
        if ch == "}":
            depth -= 1
            if depth == 0:
                return text[start_pos:i + 1]

    return None


def _fix_common_json_issues(json_str: str) -> str:
    """Fix trailing commas and other common JSON issues."""
    fixed = re.sub(r",\s*\}", "}", json_str)
    fixed = re.sub(r",\s*\]", "]", fixed)
    fixed = re.sub(r'"\s*\n\s*"', '",\n"', fixed)
    fixed = re.sub(r",\s*\}", "}", fixed)
    fixed = re.sub(r",\s*\]", "]", fixed)
    return fixed
