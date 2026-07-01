"""
Lint scanners — pure, no-LLM, no-IO functions.
Port of src/wiki/lint/scanners.ts and src/wiki/lint/utils.ts
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional, Set, Tuple

from ...core.frontmatter import parse_frontmatter
from ...types import LLMWikiSettings, VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS, VALID_SOURCE_TAGS


# ── Types ─────────────────────────────────────────────────────────────────────

class ScannerPage:
    def __init__(self, path: str, content: str, basename: str) -> None:
        self.path = path
        self.content = content
        self.basename = basename


# ── Utils ─────────────────────────────────────────────────────────────────────

EMPTY_CONTENT_STRIP = re.compile(r'[#*\-_>\s\n\[\]|—]')
MIN_SUBSTANTIVE_CHARS = 50
STUB_MARKER = "Stub created by Fix Dead Links"


def is_page_empty(content: str) -> bool:
    if STUB_MARKER in content:
        return True
    text_body = re.sub(r"---[\s\S]*?---", "", content)
    text_body = EMPTY_CONTENT_STRIP.sub("", text_body).strip()
    return len(text_body) < MIN_SUBSTANTIVE_CHARS


def fix_double_nested_wiki_links(content: str) -> Tuple[int, str]:
    """Collapse [[[[target|display]]]] → [[target|display]]."""
    fixed = 0

    def replacer(m: re.Match) -> str:
        nonlocal fixed
        fixed += 1
        target = m.group(1)
        display = m.group(2)
        return f"[[{target}|{display}]]" if display else f"[[{target}]]"

    result = re.sub(
        r"\[\[\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]\]\]",
        replacer,
        content,
    )
    return fixed, result


def detect_polluted_pages(
    pages: List[Dict],
) -> List[Dict]:
    """Detect pages whose title/basename starts with a folder prefix."""
    polluted = []
    for p in pages:
        title = p.get("title", "")
        m = re.match(r"^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])", title)
        if m:
            clean_title = re.sub(r"^(entities|concepts|sources)", "", title)
            polluted.append({"path": p["path"], "title": title, "cleanTitle": clean_title})
    return polluted


def normalize_frontmatter_dates(content: str, date_str: str) -> str:
    fm_match = re.match(r"^---\n([\s\S]*?)\n---", content)
    if not fm_match:
        return content
    fm_content = fm_match.group(1)
    if re.search(r"^updated:\s*.+$", fm_content, re.MULTILINE):
        new_fm = re.sub(r"^updated:\s*.+$", f"updated: {date_str}", fm_content, flags=re.MULTILINE)
    else:
        new_fm = fm_content + f"\nupdated: {date_str}"
    return re.sub(r"^---\n[\s\S]*?\n---", f"---\n{new_fm}\n---", content, count=1)


def build_section_labels_hint(settings: LLMWikiSettings) -> str:
    from ...wiki.prompts import get_section_labels
    labels = get_section_labels(getattr(settings, "wiki_language", "en"))
    entity_labels = "\n".join([
        f"- {labels['basic_information']}",
        f"- {labels['description']}",
        f"- {labels['related_entities']}",
        f"- {labels['related_concepts']}",
        f"- {labels['mentions_in_source']}",
    ])
    concept_labels = "\n".join([
        f"- {labels['definition']}",
        f"- {labels['key_characteristics']}",
        f"- {labels['applications']}",
        f"- {labels['related_concepts']}",
        f"- {labels['related_entities']}",
        f"- {labels['mentions_in_source']}",
    ])
    source_labels = "\n".join([
        f"- {labels['source']}",
        f"- {labels['core_content']}",
        f"- {labels['key_entities']}",
        f"- {labels['key_concepts']}",
        f"- {labels['main_points']}",
    ])
    return (
        f"Entity pages use:\n{entity_labels}\n\n"
        f"Concept pages use:\n{concept_labels}\n\n"
        f"Source pages use:\n{source_labels}"
    )


def escape_regex(s: str) -> str:
    return re.escape(s)


# ── Known-targets set ─────────────────────────────────────────────────────────

def build_known_targets(
    all_files: List[Dict],  # [{"basename": str, "path": str}]
) -> Tuple[Set[str], Set[str]]:
    known: Set[str] = set()
    known_lower: Set[str] = set()

    def add(t: str) -> None:
        known.add(t)
        known_lower.add(t.lower())

    for f in all_files:
        basename = f.get("basename", "")
        path = f.get("path", "")
        name_no_ext = basename.replace(".md", "")
        add(basename)
        add(name_no_ext)
        rel_path = path.replace(".md", "")
        add(rel_path)
        add(path)
        parts = rel_path.split("/")
        for i in range(1, len(parts)):
            sub = "/".join(parts[i:])
            add(sub)
            add(sub + ".md")

    return known, known_lower


# ── Dead-link scanner ─────────────────────────────────────────────────────────

LINK_RE = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]")


def scan_dead_links(
    page_map: Dict[str, ScannerPage],
    known_targets: Set[str],
    known_targets_lower: Set[str],
    wiki_folder: str,
) -> List[Dict]:
    """Return list of {source, target} for every dead [[wikilink]]."""
    dead: List[Dict] = []
    seen: Set[str] = set()

    for page in page_map.values():
        for m in LINK_RE.finditer(page.content):
            target = m.group(1).strip()
            target_lower = target.lower()
            if target in known_targets or target_lower in known_targets_lower:
                continue
            # Slug-normalised fallback: spaces → hyphens
            parts = target.split("/")
            slugged_basename = parts[-1].replace(" ", "-")
            slugged = "/".join(parts[:-1] + [slugged_basename])
            if (
                slugged != target
                and (slugged in known_targets or slugged.lower() in known_targets_lower)
            ):
                continue
            source = page.path.replace(wiki_folder + "/", "").replace(".md", "")
            key = f"{source}::{target}"
            if key not in seen:
                seen.add(key)
                dead.append({"source": source, "target": target})

    return dead


# ── Orphan scanner ────────────────────────────────────────────────────────────

def scan_orphans(
    page_map: Dict[str, ScannerPage],
    wiki_folder: str,
) -> List[str]:
    """Return paths of pages with no incoming wiki-links (alias-aware)."""
    incoming: Dict[str, List[str]] = {}

    for page in page_map.values():
        source_rel = page.path.replace(wiki_folder + "/", "").replace(".md", "")
        for m in LINK_RE.finditer(page.content):
            target = m.group(1).strip()
            incoming.setdefault(target, []).append(source_rel)

    orphans: List[str] = []
    for page in page_map.values():
        fm = parse_frontmatter(page.content) or {}
        aliases = fm.get("aliases", []) if isinstance(fm.get("aliases"), list) else []
        rel_path = page.path.replace(wiki_folder + "/", "").replace(".md", "")
        name_no_ext = page.basename.replace(".md", "")
        forms = [page.basename, name_no_ext, rel_path] + list(aliases)
        parts = rel_path.split("/")
        for i in range(1, len(parts)):
            sub = "/".join(parts[i:])
            forms.append(sub)
            forms.append(sub + ".md")

        has_incoming = any(
            f in incoming or f.lower() in {k.lower() for k in incoming}
            for f in forms
        )
        if not has_incoming:
            orphans.append(page.path)

    return orphans


# ── Alias-deficiency scanner ──────────────────────────────────────────────────

def detect_alias_deficiency(
    wiki_files: List[Dict],
    page_map: Dict[str, ScannerPage],
) -> List[ScannerPage]:
    """Return entity/concept pages that have no aliases in their frontmatter."""
    result: List[ScannerPage] = []
    for f in wiki_files:
        path = f.get("path", "")
        if "/entities/" in path or "/concepts/" in path:
            info = page_map.get(path)
            if info:
                fm_match = re.match(r"^---\n([\s\S]*?)\n---", info.content)
                if fm_match and "aliases:" not in fm_match.group(1):
                    result.append(info)
    return result


# ── Quote grounding scanner ───────────────────────────────────────────────────

class QuoteGroundingIssue:
    def __init__(
        self,
        page_path: str,
        quote: str,
        has_source_link: bool,
        source_path: Optional[str] = None,
    ) -> None:
        self.page_path = page_path
        self.quote = quote
        self.has_source_link = has_source_link
        self.source_path = source_path


def _normalize_quote(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def _extract_mentions_section(content: str) -> Optional[str]:
    m = re.search(
        r"##\s+Mentions\s+in\s+Source\s*\n([\s\S]*?)(?=\n##\s|\n*$)",
        content,
        re.IGNORECASE,
    )
    return m.group(1) if m else None


def _extract_source_body(content: str) -> str:
    return re.sub(r"^---\n[\s\S]*?\n---\n?", "", content)


def _is_quote_grounded(quote: str, source_body: str) -> bool:
    if quote in source_body:
        return True
    return _normalize_quote(quote) in _normalize_quote(source_body)


def scan_quote_grounding(
    page_map: Dict[str, ScannerPage],
    source_map: Dict[str, ScannerPage],
    wiki_folder: str,
) -> List[QuoteGroundingIssue]:
    issues: List[QuoteGroundingIssue] = []
    source_bodies = [_extract_source_body(s.content) for s in source_map.values()]

    line_re = re.compile(
        r'^[-*]\s+"([^"]+)"(?:\s*[—\-]\s*\[\[([^\]]+)\]\])?\s*$',
        re.MULTILINE,
    )

    for path, page in page_map.items():
        if not path.startswith(wiki_folder + "/"):
            continue
        mentions_block = _extract_mentions_section(page.content)
        if not mentions_block:
            continue

        for m in line_re.finditer(mentions_block):
            quote = m.group(1).strip()
            link_target = m.group(2).strip() if m.group(2) else None

            if link_target:
                src_path = link_target if link_target.endswith(".md") else link_target + ".md"
                resolved = src_path if src_path.startswith(wiki_folder + "/") else f"{wiki_folder}/{src_path}"
                source = source_map.get(resolved)
                body = _extract_source_body(source.content) if source else ""
                if not (source and _is_quote_grounded(quote, body)):
                    issues.append(QuoteGroundingIssue(path, quote, True, resolved))
            else:
                grounded = any(_is_quote_grounded(quote, b) for b in source_bodies)
                if not grounded:
                    issues.append(QuoteGroundingIssue(path, quote, False))

    issues.sort(key=lambda i: (i.page_path, i.quote))
    return issues


# ── Tag-violation scanner ─────────────────────────────────────────────────────

class TagViolation:
    def __init__(
        self,
        path: str,
        page_type: str,
        title: str,
        current_tags: List[str],
        invalid_tags: List[str],
    ) -> None:
        self.path = path
        self.page_type = page_type
        self.title = title
        self.current_tags = current_tags
        self.invalid_tags = invalid_tags


def _get_active_entity_tags(settings: LLMWikiSettings) -> List[str]:
    mode = getattr(settings, "tag_vocabulary_mode", "default")
    if mode == "custom":
        raw = getattr(settings, "custom_entity_tags", "") or ""
        tags = [t.strip() for t in raw.split(",") if t.strip()]
        return tags if tags else list(VALID_ENTITY_TAGS)
    return list(VALID_ENTITY_TAGS)


def _get_active_concept_tags(settings: LLMWikiSettings) -> List[str]:
    mode = getattr(settings, "tag_vocabulary_mode", "default")
    if mode == "custom":
        raw = getattr(settings, "custom_concept_tags", "") or ""
        tags = [t.strip() for t in raw.split(",") if t.strip()]
        return tags if tags else list(VALID_CONCEPT_TAGS)
    return list(VALID_CONCEPT_TAGS)


def _get_active_source_tags(settings: LLMWikiSettings) -> List[str]:
    return list(VALID_SOURCE_TAGS)


def scan_tag_violations(
    page_map: Dict[str, ScannerPage],
    settings: LLMWikiSettings,
) -> List[TagViolation]:
    valid_entity = set(_get_active_entity_tags(settings))
    valid_concept = set(_get_active_concept_tags(settings))
    valid_source = set(_get_active_source_tags(settings))

    violations: List[TagViolation] = []
    for path, page in page_map.items():
        fm = parse_frontmatter(page.content)
        if not fm:
            continue
        page_type = fm.get("type", "")
        if page_type not in ("entity", "concept", "source"):
            continue

        valid_set = (
            valid_entity if page_type == "entity"
            else valid_concept if page_type == "concept"
            else valid_source
        )

        raw_tags = fm.get("tags", [])
        if isinstance(raw_tags, list):
            current_tags = [str(t).strip() for t in raw_tags if str(t).strip()]
        elif isinstance(raw_tags, str) and raw_tags.strip():
            current_tags = [raw_tags.strip()]
        else:
            continue

        invalid = [t for t in current_tags if t not in valid_set]
        if invalid:
            title = page.basename.replace(".md", "")
            violations.append(TagViolation(path, page_type, title, current_tags, invalid))

    violations.sort(key=lambda v: v.path)
    return violations
