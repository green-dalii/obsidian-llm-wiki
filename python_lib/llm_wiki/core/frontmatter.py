"""
Frontmatter parser and writer — port of src/core/frontmatter.ts
"""
from __future__ import annotations

import re
from datetime import date
from typing import Any, Dict, List, Optional


FrontmatterData = Dict[str, Any]

ARRAY_FIELDS = ["aliases", "sources", "tags"]


def parse_frontmatter(content: str) -> Optional[FrontmatterData]:
    match = re.match(r"^---\n([\s\S]*?)\n---", content)
    if not match:
        return None

    result: FrontmatterData = {}
    fm_text = match.group(1)
    lines = fm_text.split("\n")
    current_key: Optional[str] = None
    array_values: List[str] = []

    for i, line in enumerate(lines):
        trimmed = line.strip()

        if not trimmed:
            if current_key and array_values:
                result[current_key] = array_values[:]
                array_values.clear()
                current_key = None
            continue

        if trimmed.startswith("- ") and current_key is not None:
            value = trimmed[2:].strip().strip("\"'")
            array_values.append(value)
            continue

        if current_key and array_values and not trimmed.startswith("- "):
            result[current_key] = array_values[:]
            array_values.clear()
            current_key = None

        colon_idx = line.find(":")
        if colon_idx == -1:
            continue

        key = line[:colon_idx].strip()
        value = line[colon_idx + 1:].strip()

        next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
        if next_line.startswith("- "):
            current_key = key
            array_values = []
            continue

        if key == "reviewed":
            result["reviewed"] = value == "true"
        elif key in ("type", "created", "updated"):
            result[key] = value
        elif value.startswith("[") and value.endswith("]"):
            try:
                inner = value[1:-1]
                result[key] = [
                    v.strip().strip("\"'") for v in inner.split(",") if v.strip()
                ]
            except Exception:
                result[key] = value
        else:
            result[key] = value.strip("\"'")

    if current_key and array_values:
        result[current_key] = array_values[:]

    for f in ARRAY_FIELDS:
        val = result.get(f)
        if isinstance(val, str):
            result[f] = [val]
        elif val is not None and not isinstance(val, list):
            del result[f]

    return result


def _yaml_stringify(value: Any) -> str:
    if isinstance(value, list):
        if not value:
            return "[]"
        return "\n" + "\n".join(f'  - "{v}"' for v in value)
    if isinstance(value, str):
        if re.search(r'[":[\]{}\n]', value):
            return f'"{value.replace(chr(34), chr(92) + chr(34))}"'
        return value
    if isinstance(value, bool):
        return str(value).lower()
    if value is None:
        return ""
    return str(value)


def extract_body(content: str) -> str:
    if not content.startswith("---"):
        return content
    end_idx = content.find("\n---", 3)
    if end_idx == -1:
        return content
    return content[end_idx + 4:].strip()


def is_blank_source(content: str) -> bool:
    """True when a source file has no extractable body."""
    return len(extract_body(content).strip()) == 0


def upsert_frontmatter_field(content: str, key: str, value: str) -> str:
    """Add or replace a single key: value in the frontmatter block."""
    line = f"{key}: {value}"
    key_re = re.compile(rf"^{re.escape(key)}:.*$", re.MULTILINE)

    if content.startswith("---"):
        end_idx = content.find("\n---", 3)
        if end_idx != -1:
            fm_block = content[:end_idx]
            rest = content[end_idx:]
            if key_re.search(fm_block):
                return key_re.sub(line, fm_block) + rest
            return f"{fm_block}\n{line}{rest}"

    return f"---\n{line}\n---\n\n{content}"


def merge_frontmatter(
    existing_content: str, new_source_path: str
) -> Dict[str, Any]:
    """Merge a new source into an existing page's frontmatter."""
    fm = parse_frontmatter(existing_content)
    body = extract_body(existing_content)

    if not fm:
        return {"frontmatter": "", "body": existing_content, "was_merged": False}

    def normalize_source(s: str) -> str:
        t = s.strip()
        if t.startswith("[[") and t.endswith("]]"):
            return t[2:-2].strip()
        return t

    existing_sources = fm.get("sources", []) if isinstance(fm.get("sources"), list) else []
    source_set: dict = {}
    for s in existing_sources:
        source_set[normalize_source(str(s))] = True
    source_set[new_source_path] = True
    merged_sources = [f"[[{s}]]" for s in source_set]

    today = date.today().isoformat()
    created = fm.get("created") or today
    updated = today

    lines = ["---"]
    if fm.get("type"):
        lines.append(f"type: {fm['type']}")
    lines.append(f"created: {created}")
    lines.append(f"updated: {updated}")

    if merged_sources:
        lines.append(f"sources:{_yaml_stringify(merged_sources)}")

    tags = fm.get("tags", [])
    if isinstance(tags, list) and tags:
        lines.append(f"tags:{_yaml_stringify(tags)}")
    else:
        lines.append("tags:")

    if fm.get("reviewed"):
        lines.append("reviewed: true")

    aliases = fm.get("aliases", [])
    if isinstance(aliases, list) and aliases:
        deduped = list(dict.fromkeys(a for a in aliases if a))
        if deduped:
            lines.append(f"aliases:{_yaml_stringify(deduped)}")

    lines.append("---")

    return {
        "frontmatter": "\n".join(lines),
        "body": body,
        "was_merged": True,
    }


def enforce_frontmatter_constraints(
    content: str,
    page_type: str,  # "entity" | "concept" | "source"
    settings: Any = None,
) -> str:
    """Validate and normalise the frontmatter of a generated wiki page."""
    if not content.startswith("---"):
        return content

    fm_end = content.find("\n---\n", 3)
    if fm_end == -1:
        return content

    fm_text = content[3:fm_end]

    # If page is reviewed, just refresh dates
    if re.search(r"^reviewed:\s*true\s*$", fm_text, re.MULTILINE):
        today = date.today().isoformat()
        content = re.sub(r"^created:\s*\d{4}-\d{2}-\d{2}\s*$", f"created: {today}", content, flags=re.MULTILINE)
        content = re.sub(r"^updated:\s*\d{4}-\d{2}-\d{2}\s*$", f"updated: {today}", content, flags=re.MULTILINE)
        return content

    body = content[fm_end + 5:]
    today = date.today().isoformat()

    lines = fm_text.split("\n")
    new_lines: List[str] = []
    type_line = ""
    collected_tags: List[str] = []
    collected_aliases: List[str] = []
    found_type = False
    found_tags = False
    found_aliases = False
    created_value = ""

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        if line.startswith("created:"):
            created_value = line[8:].strip()
            i += 1
            continue
        if line.startswith("updated:"):
            i += 1
            continue

        if line.startswith("type:"):
            found_type = True
            current_type = line[5:].strip()
            type_line = f"type: {page_type}"
            if page_type in ("entity", "concept") and current_type and current_type not in ("entity", "concept", page_type):
                collected_tags.append(current_type)
            i += 1
            continue

        if line.startswith("tags:"):
            found_tags = True
            tags_value = line[5:].strip()
            if tags_value.startswith("[") and tags_value.endswith("]"):
                inner = tags_value[1:-1].strip()
                if inner:
                    collected_tags.extend(t.strip().strip("\"'") for t in inner.split(","))
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith("- "):
                tag_val = lines[j].strip()[2:].strip().strip("\"'")
                if tag_val:
                    collected_tags.append(tag_val)
                j += 1
            if j > i + 1:
                i = j
            else:
                i += 1
            continue

        if line.startswith("aliases:"):
            found_aliases = True
            aliases_value = line[8:].strip()
            if aliases_value.startswith("[") and aliases_value.endswith("]"):
                inner = aliases_value[1:-1].strip()
                if inner:
                    collected_aliases.extend(t.strip().strip("\"'") for t in inner.split(","))
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith("- "):
                alias_val = lines[j].strip()[2:].strip().strip("\"'")
                if alias_val:
                    collected_aliases.append(alias_val)
                j += 1
            if j > i + 1:
                i = j
            else:
                i += 1
            continue

        if not line.startswith("- "):
            new_lines.append(line)
        i += 1

    result = ["---"]

    if found_type:
        result.append(type_line)

    result.append(f"created: {created_value or today}")
    result.append(f"updated: {today}")

    for line in new_lines:
        if not any(line.startswith(k + ":") for k in ("type", "tags", "aliases", "created", "updated")):
            result.append(line)

    if found_tags or collected_tags:
        deduped_tags = list(dict.fromkeys(t for t in collected_tags if t and t != page_type))
        if deduped_tags:
            result.append(f"tags: [{', '.join(deduped_tags)}]")
        else:
            result.append("tags:")

    if found_aliases or collected_aliases:
        valid_aliases = list(dict.fromkeys(a for a in collected_aliases if a))
        if valid_aliases:
            result.append(f"aliases:{_yaml_stringify(valid_aliases)}")

    result.append("---")

    return "\n".join(result) + "\n\n" + body
