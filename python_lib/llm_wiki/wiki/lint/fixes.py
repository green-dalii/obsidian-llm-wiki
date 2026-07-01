"""
Lint engine — all fix operations.
Port of:
  src/wiki/lint/fix-dead-link.ts
  src/wiki/lint/link-orphan.ts
  src/wiki/lint/fill-empty-page.ts
  src/wiki/lint/merge-duplicates.ts
  src/wiki/lint/delete-empty-stubs.ts
  src/wiki/lint/fix-runners.ts (alias completion, retag violations)
"""
from __future__ import annotations

import logging
import re
from datetime import date
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from ...constants import (
    TOKENS_LINT_ALIAS_BATCH,
    TOKENS_LINT_DEDUP_LLM,
    TOKENS_LINT_ORPHAN_FIX,
    TOKENS_LINT_PAGE_FIX,
    WIKI_SUBFOLDERS,
)
from ...core.frontmatter import (
    enforce_frontmatter_constraints,
    extract_body,
    parse_frontmatter,
)
from ...core.json_parser import parse_json_response
from ...core.markdown import clean_markdown_response
from ...core.slug import slugify
from ...llm_client import LLMClient, _run
from ...types import LLMWikiSettings, VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS, VALID_SOURCE_TAGS
from ...wiki.prompts import (
    apply_section_labels,
    build_active_tag_vocabulary_section,
    build_system_prompt,
)
from .dead_link_detector import (
    build_dead_link_replacement,
    find_dead_link_target,
    replace_dead_link,
)
from .duplicate_detection import DuplicateCandidate, generate_duplicate_candidates
from .orphan_matcher import (
    build_orphan_link_prompt,
    build_orphan_link_update,
    normalize_orphan_page_path,
    validate_orphan_link_target,
)
from .prompt_builders import (
    build_empty_page_prompt,
    clean_wiki_index,
    correct_link_pollution,
    get_granularity_fix_limits,
    normalize_llm_path,
)
from .prompts import (
    FIX_DEAD_LINK_PROMPT,
    FILL_EMPTY_PAGE_PROMPT,
    GENERATE_ALIASES_PROMPT,
    LINT_DUPLICATE_DETECTION_PROMPT,
    LINT_TITLE_SCAN_PROMPT,
    LINK_ORPHAN_PAGE_PROMPT,
    MERGE_DUPLICATE_PAGES_PROMPT,
)
from .scanners import (
    STUB_MARKER,
    MIN_SUBSTANTIVE_CHARS,
    ScannerPage,
    TagViolation,
    _get_active_entity_tags,
    _get_active_concept_tags,
    _get_active_source_tags,
    build_section_labels_hint,
    normalize_frontmatter_dates,
)

log = logging.getLogger("llm_wiki.lint")


# ── Filesystem helpers ────────────────────────────────────────────────────────

def _make_rel(path: str, wiki_folder: str) -> str:
    return path.replace(wiki_folder + "/", "").replace(".md", "")


def _escape_re(s: str) -> str:
    return re.escape(s)


# ── Stub construction (#197 — honest placeholders, no LLM expansion) ──────────

def _extract_reference_context(source_content: str, target_name: str) -> str:
    """
    Extract the sentence(s) from source_content that mention [[target_name]].
    Returns a single representative sentence, or empty string if none found.
    """
    # Match the wikilink variant used in the source (with or without display text)
    pattern = re.compile(
        r"\[\[" + re.escape(target_name) + r"(?:[|#][^\]]+)?\]\]"
    )
    # Split into sentences on '. ', '! ', '? ', or newlines
    sentences = re.split(r"(?<=[.!?])\s+|\n+", source_content)
    for sentence in sentences:
        if pattern.search(sentence):
            # Strip leading markdown symbols and excess whitespace
            clean = re.sub(r"^[#>\-\*\s]+", "", sentence).strip()
            if clean:
                return clean
    return ""


def build_stub_content(
    title: str,
    stub_type: str,
    referring_page_rel: str,
    source_content: str = "",
    target_name: str = "",
) -> str:
    today = date.today().isoformat()
    default_tag = "other" if stub_type == "entity" else "term"

    context = ""
    if source_content and target_name:
        snippet = _extract_reference_context(source_content, target_name)
        if snippet:
            context = f'\n> **Referenced in [[{referring_page_rel}]] as:** "{snippet}"\n'

    return (
        f"---\n"
        f"type: {stub_type}\n"
        f"created: {today}\n"
        f"sources: [\"[[{referring_page_rel}]]\"]\n"
        f"tags: [{default_tag}]\n"
        f"generation_complete: false\n"
        f"---\n"
        f"# {title}\n\n"
        f"> {STUB_MARKER} — referenced by [[{referring_page_rel}]]."
        f" Will be filled by next ingest of an actual source that defines this entity.\n"
        f"{context}"
    )


# ── fix_dead_link ─────────────────────────────────────────────────────────────

async def fix_dead_link_async(
    vault_read: Callable[[str], Optional[str]],
    vault_write: Callable[[str, str], None],
    existing_pages: List[Dict],
    wiki_folder: str,
    settings: LLMWikiSettings,
    client: LLMClient,
    source_path: str,
    target_name: str,
) -> str:
    """
    Four-stage dead-link resolution (port of fix-dead-link.ts):
      1. Deterministic title/alias pre-check (no LLM)
      2. LLM semantic matching
      3. Stub creation if LLM says create_stub
      4. Deterministic fallback + stub if LLM fails entirely
    """
    source_content = vault_read(source_path) or "(empty)"
    target_basename = target_name.split("/")[-1] if "/" in target_name else target_name

    # Stage 1 — deterministic pre-check
    pre_match = find_dead_link_target(existing_pages, target_basename)
    if pre_match:
        new_link = build_dead_link_replacement(pre_match, wiki_folder)
        updated = replace_dead_link(source_content, target_name, new_link)
        vault_write(source_path, updated)
        return f"pre-check corrected (alias match): {new_link}"

    # Build pages list for LLM prompt
    pages_list_lines = []
    for p in existing_pages:
        alias_suffix = ""
        if p.get("aliases"):
            alias_suffix = f" `aliases: {', '.join(p['aliases'])}`"
        pages_list_lines.append(f"- {p.get('wikiLink', p['path'])}{alias_suffix}")
    pages_list = "\n".join(pages_list_lines)

    prompt = (
        FIX_DEAD_LINK_PROMPT
        .replace("{{source_content}}", source_content[:2000])
        .replace("{{target_name}}", target_name)
        .replace("{{existing_pages}}", pages_list[:3000])
    )

    system = await build_system_prompt(settings, task="lint")

    # Stage 2 — LLM semantic match
    response = await client.create_message_async(
        model=settings.model,
        max_tokens=TOKENS_LINT_PAGE_FIX,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    async def _repair(malformed: str) -> str:
        return await client.create_message_async(
            model=settings.model, max_tokens=TOKENS_LINT_PAGE_FIX,
            messages=[{"role": "user", "content":
                "Fix the following malformed JSON. Output ONLY the fixed JSON.\n\n" + malformed}],
            response_format={"type": "json_object"},
        )

    result = await parse_json_response(response, _repair)

    if result and result.get("action") == "correct" and result.get("correct_link"):
        new_link = result["correct_link"].strip()
        if not new_link.startswith("[["):
            new_link = f"[[{new_link}]]"
        updated = _replace_target_link(source_content, target_name, new_link)
        vault_write(source_path, updated)
        return f"corrected: {new_link}"

    if result and result.get("action") == "create_stub" and result.get("stub_title"):
        sanitized = re.sub(r"^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])", r"\2", result["stub_title"])
        # Safety net: alias re-check before creating stub
        preserve = getattr(settings, "slug_case", "lower") == "preserve"
        safety_slug = slugify(sanitized, preserve_case=preserve).lower()
        alias_match = next(
            (p for p in existing_pages
             if p.get("title", "").lower() == sanitized.lower()
             or any(a.lower() == sanitized.lower() for a in (p.get("aliases") or []))
             or slugify(p.get("title", ""), preserve_case=preserve).lower() == safety_slug
             or any(slugify(a, preserve_case=preserve).lower() == safety_slug
                    for a in (p.get("aliases") or []))),
            None,
        )
        if alias_match:
            new_link = f"[[{_make_rel(alias_match['path'], wiki_folder)}|{alias_match['title']}]]"
            updated = _replace_target_link(source_content, target_name, new_link)
            vault_write(source_path, updated)
            return f"safety-net corrected (alias match for stub): {new_link}"

        stub_type = result.get("stub_type", "entity") or "entity"
        stub_dir = WIKI_SUBFOLDERS.get(stub_type + "s", stub_type + "s")
        stub_slug = slugify(sanitized, preserve_case=preserve)
        stub_path = f"{wiki_folder}/{stub_dir}/{stub_slug}.md"
        source_rel = _make_rel(source_path, wiki_folder)
        stub_content = build_stub_content(sanitized, stub_type, source_rel, source_content, target_name)
        vault_write(stub_path, stub_content)

        new_link = f"[[{stub_dir}/{stub_slug}|{sanitized}]]"
        updated = _replace_target_link(source_content, target_name, new_link)
        vault_write(source_path, updated)
        return f"stub created (unfilled): {stub_path} — will be filled by next ingest"

    # Stage 4 — deterministic fallback + final stub
    preserve = getattr(settings, "slug_case", "lower") == "preserve"
    lower_target = target_basename.lower()
    target_slug = slugify(target_basename, preserve_case=preserve).lower()
    match = next(
        (p for p in existing_pages
         if p.get("title", "").lower() == lower_target
         or slugify(p.get("title", ""), preserve_case=preserve).lower() == target_slug),
        None,
    )
    if not match:
        match = next(
            (p for p in existing_pages
             if any(a.lower() == lower_target or
                    slugify(a, preserve_case=preserve).lower() == target_slug
                    for a in (p.get("aliases") or []))),
            None,
        )
    if match:
        new_link = f"[[{_make_rel(match['path'], wiki_folder)}|{match['title']}]]"
        updated = _replace_target_link(source_content, target_name, new_link)
        vault_write(source_path, updated)
        return f"fallback corrected: {new_link}"

    # No match anywhere — create an honest placeholder stub
    clean_basename = re.sub(r"^(entities|concepts|sources)([^\s\-_a-zA-Z0-9])", r"\2", target_basename)
    stub_type_fb: str = "entity" if "/entities/" in target_name else "concept"
    stub_dir_fb = WIKI_SUBFOLDERS.get(stub_type_fb + "s", stub_type_fb + "s")
    stub_slug_fb = slugify(clean_basename, preserve_case=preserve)
    stub_path_fb = f"{wiki_folder}/{stub_dir_fb}/{stub_slug_fb}.md"
    source_rel_fb = _make_rel(source_path, wiki_folder)
    vault_write(stub_path_fb, build_stub_content(clean_basename, stub_type_fb, source_rel_fb, source_content, target_name))

    new_link_fb = f"[[{stub_dir_fb}/{stub_slug_fb}|{clean_basename}]]"
    updated_fb = _replace_target_link(source_content, target_name, new_link_fb)
    vault_write(source_path, updated_fb)
    return f"fallback stub created (unfilled): {stub_path_fb}"


def _replace_target_link(content: str, target_name: str, new_link: str) -> str:
    link_re = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]")
    return link_re.sub(
        lambda m: new_link if m.group(1).strip() == target_name else m.group(0),
        content,
    )


# ── link_orphan_page ──────────────────────────────────────────────────────────

async def link_orphan_page_async(
    vault_read: Callable[[str], Optional[str]],
    vault_write: Callable[[str, str], None],
    wiki_folder: str,
    settings: LLMWikiSettings,
    client: LLMClient,
    orphan_path: str,
) -> List[str]:
    orphan_content = vault_read(orphan_path)
    if not orphan_content:
        return []

    index_path = f"{wiki_folder}/index.md"
    raw_index = vault_read(index_path) or ""
    wiki_index = clean_wiki_index(raw_index)

    prompt = build_orphan_link_prompt(
        LINK_ORPHAN_PAGE_PROMPT,
        orphan_content,
        wiki_index,
        wiki_folder,
    )

    system = await build_system_prompt(settings, task="lint")
    response = await client.create_message_async(
        model=settings.model,
        max_tokens=TOKENS_LINT_ORPHAN_FIX,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    async def _repair(malformed: str) -> str:
        return await client.create_message_async(
            model=settings.model, max_tokens=TOKENS_LINT_ORPHAN_FIX,
            messages=[{"role": "user", "content":
                "Fix the following malformed JSON. Output ONLY the fixed JSON.\n\n" + malformed}],
            response_format={"type": "json_object"},
        )

    result = await parse_json_response(response, _repair)
    if not result or not result.get("related_pages"):
        return []

    from ...wiki.prompts import get_section_labels
    labels = get_section_labels(getattr(settings, "wiki_language", "en"))
    linked: List[str] = []

    for related in result["related_pages"]:
        page_path = normalize_llm_path(related.get("page_path", ""), wiki_folder)
        full_path = normalize_orphan_page_path(page_path, wiki_folder)
        related_content = vault_read(full_path)
        if not related_content:
            continue
        link_target = related.get("link_target", "")
        link_text = related.get("link_text", "")
        if not validate_orphan_link_target(related_content, link_target):
            updated = build_orphan_link_update(
                related_content,
                full_path,
                link_text,
                link_target,
                labels["related_pages"],
            )
            vault_write(full_path, updated)
            linked.append(page_path)

    return linked


# ── fill_empty_page ───────────────────────────────────────────────────────────

async def fill_empty_page_async(
    vault_read: Callable[[str], Optional[str]],
    vault_write: Callable[[str, str], None],
    wiki_folder: str,
    settings: LLMWikiSettings,
    client: LLMClient,
    page_path: str,
    existing_content: Optional[str] = None,
) -> str:
    content = existing_content if existing_content is not None else vault_read(page_path)
    if content is None:
        raise FileNotFoundError(f"Cannot expand empty page: not found at '{page_path}'")

    before_len = len(content)

    if f"/{WIKI_SUBFOLDERS['entities']}/" in page_path:
        page_type = WIKI_SUBFOLDERS["entities"]
    elif f"/{WIKI_SUBFOLDERS['concepts']}/" in page_path:
        page_type = WIKI_SUBFOLDERS["concepts"]
    else:
        page_type = WIKI_SUBFOLDERS["sources"]

    index_path = f"{wiki_folder}/index.md"
    raw_index = vault_read(index_path) or ""
    wiki_index = clean_wiki_index(raw_index)
    limits = get_granularity_fix_limits(settings)

    prompt = build_empty_page_prompt(
        FILL_EMPTY_PAGE_PROMPT,
        page_type,
        content,
        wiki_index,
        build_section_labels_hint(settings),
        limits["maxEntities"],
        limits["maxConcepts"],
    )
    final_prompt = apply_section_labels(prompt, getattr(settings, "wiki_language", "en"))

    system = await build_system_prompt(settings, task="full")
    filled = await client.create_message_async(
        model=settings.model,
        max_tokens=TOKENS_LINT_PAGE_FIX,
        system=system,
        messages=[{"role": "user", "content": final_prompt}],
    )

    cleaned = clean_markdown_response(filled)
    pollution_free = correct_link_pollution(cleaned)

    # Strip stub marker lines
    if STUB_MARKER in pollution_free:
        pollution_free = "\n".join(
            line for line in pollution_free.split("\n") if STUB_MARKER not in line
        ).strip()

    today = date.today().isoformat()
    with_dates = normalize_frontmatter_dates(pollution_free, today)
    page_type_singular = (
        "entity" if page_type == WIKI_SUBFOLDERS["entities"]
        else "concept" if page_type == WIKI_SUBFOLDERS["concepts"]
        else "source"
    )
    enforced = enforce_frontmatter_constraints(with_dates, page_type_singular, settings)
    vault_write(page_path, enforced)

    page_rel = _make_rel(page_path, wiki_folder)
    return f"{page_rel} ({before_len} → {len(enforced)} chars)"


# ── merge_duplicate_pages ─────────────────────────────────────────────────────

async def merge_duplicate_pages_async(
    vault_read: Callable[[str], Optional[str]],
    vault_write: Callable[[str, str], None],
    vault_delete: Callable[[str], None],
    vault_list_markdown: Callable[[], List[str]],
    wiki_folder: str,
    settings: LLMWikiSettings,
    client: LLMClient,
    target_path: str,
    source_path: str,
) -> str:
    target_content = vault_read(target_path)
    source_content = vault_read(source_path)
    if not target_content or not source_content:
        raise FileNotFoundError(
            f"Cannot merge: target or source page not found "
            f"(target={target_path}, source={source_path})"
        )

    target_fm = parse_frontmatter(target_content) or {}
    source_fm = parse_frontmatter(source_content) or {}
    source_title = source_path.split("/")[-1].replace(".md", "")

    # Merge sources lists
    target_sources = target_fm.get("sources", []) if isinstance(target_fm.get("sources"), list) else []
    source_sources = source_fm.get("sources", []) if isinstance(source_fm.get("sources"), list) else []
    merged_sources_set: dict = {}
    merged_sources: List[str] = []
    for s in target_sources + source_sources:
        key = str(s).strip().lower()
        if key not in merged_sources_set:
            merged_sources_set[key] = True
            merged_sources.append(str(s))

    # Collect aliases
    target_aliases = target_fm.get("aliases", []) if isinstance(target_fm.get("aliases"), list) else []
    source_aliases = source_fm.get("aliases", []) if isinstance(source_fm.get("aliases"), list) else []

    def extract_h1(c: str) -> Optional[str]:
        body_m = re.match(r"^---[\s\S]*?\n---\n?([\s\S]*)", c)
        if not body_m:
            return None
        h1_m = re.match(r"^#\s+(.+?)(?:\n|$)", body_m.group(1).strip())
        return h1_m.group(1).strip() if h1_m else None

    source_h1 = extract_h1(source_content)
    target_h1 = extract_h1(target_content)
    target_filename = target_path.split("/")[-1].replace(".md", "")

    all_aliases = list(target_aliases) + [source_title] + list(source_aliases)
    if source_h1 and source_h1 != source_title:
        all_aliases.append(source_h1)
    if target_h1 and target_h1 != target_filename and target_h1 not in target_aliases:
        all_aliases.insert(0, target_h1)

    subfolders = list(WIKI_SUBFOLDERS.values())
    target_title = str(target_fm.get("title", target_filename))
    deduped_aliases = []
    seen_aliases: set = set()
    for a in all_aliases:
        if not a:
            continue
        skip = any(a.startswith(f) and len(a) > len(f) for f in subfolders)
        if skip or a == target_title or a in seen_aliases:
            continue
        seen_aliases.add(a)
        deduped_aliases.append(a)

    # Extract body text
    target_body_m = re.match(r"^---[\s\S]*?\n---\n?([\s\S]*)", target_content)
    source_body_m = re.match(r"^---[\s\S]*?\n---\n?([\s\S]*)", source_content)
    target_body = target_body_m.group(1).strip() if target_body_m else target_content
    source_body = source_body_m.group(1).strip() if source_body_m else source_content

    # LLM merge
    merged_body = ""
    llm_succeeded = False
    try:
        prompt = (
            MERGE_DUPLICATE_PAGES_PROMPT
            .replace("{{target_content}}", target_body)
            .replace("{{source_content}}", source_body)
        )
        system = await build_system_prompt(settings, task="merge")
        merged_resp = await client.create_message_async(
            model=settings.model,
            max_tokens=TOKENS_LINT_PAGE_FIX,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        cleaned = clean_markdown_response(merged_resp)
        if cleaned and len(cleaned) > 100:

            async def _repair(malformed: str) -> str:
                return await client.create_message_async(
                    model=settings.model, max_tokens=TOKENS_LINT_PAGE_FIX,
                    messages=[{"role": "user", "content":
                        "Fix the following malformed JSON. Output ONLY the fixed JSON.\n\n" + malformed}],
                )

            parsed = await parse_json_response(cleaned, _repair)
            if parsed and parsed.get("body"):
                merged_body = parsed["body"].strip()
                llm_succeeded = True
            if parsed and isinstance(parsed.get("aliases"), list):
                for a in parsed["aliases"]:
                    if a and a != target_title and a not in deduped_aliases:
                        deduped_aliases.append(a)
    except Exception as e:
        log.error("LLM merge failed for %s → %s: %s. Using programmatic merge.", source_path, target_path, e)

    if not merged_body:
        merged_body = target_body
        if source_body:
            merged_body += f"\n\n## From {source_title}\n\n{source_body}"

    # Rebuild frontmatter
    today = date.today().isoformat()
    fm_lines = ["---"]
    if target_fm.get("type"):
        fm_lines.append(f"type: {target_fm['type']}")
    fm_lines.append(f"created: {target_fm.get('created', today)}")
    fm_lines.append(f"updated: {today}")
    if merged_sources:
        fm_lines.append("sources:")
        for s in merged_sources:
            fm_lines.append(f'  - "{s}"')
    tags = target_fm.get("tags", [])
    if isinstance(tags, list) and tags:
        fm_lines.append("tags:")
        for t in tags:
            fm_lines.append(f"  - {t}")
    if target_fm.get("reviewed"):
        fm_lines.append("reviewed: true")
    if deduped_aliases:
        fm_lines.append("aliases:")
        for a in deduped_aliases:
            fm_lines.append(f'  - "{a}"')
    fm_lines.append("---")

    new_content = "\n".join(fm_lines) + "\n\n" + merged_body
    page_type = (
        "entity" if f"/{WIKI_SUBFOLDERS['entities']}/" in target_path
        else "concept" if f"/{WIKI_SUBFOLDERS['concepts']}/" in target_path
        else "source"
    )
    enforced = enforce_frontmatter_constraints(new_content, page_type, settings)
    vault_write(target_path, enforced)

    # Rewrite links pointing to source → target across the wiki
    source_rel = _make_rel(source_path, wiki_folder)
    target_rel = _make_rel(target_path, wiki_folder)
    for rel_path in vault_list_markdown():
        full = f"{wiki_folder}/{rel_path}" if not rel_path.startswith(wiki_folder) else rel_path
        if full == source_path:
            continue
        content = vault_read(full)
        if not content:
            continue
        if f"[[{source_rel}]]" in content or f"[[{source_rel}|" in content:
            updated = (
                content
                .replace(f"[[{source_rel}]]", f"[[{target_rel}]]")
            )
            updated = re.sub(
                rf"\[\[{_escape_re(source_rel)}\|",
                f"[[{target_rel}|",
                updated,
            )
            if updated != content:
                vault_write(full, updated)

    vault_delete(source_path)
    return f"merged {source_rel} → {target_rel}"


def _escape_re(s: str) -> str:
    return re.escape(s)


# ── delete_empty_stubs ────────────────────────────────────────────────────────

def delete_empty_stubs(
    vault_read: Callable[[str], Optional[str]],
    vault_delete: Callable[[str], None],
    vault_list_markdown: Callable[[], List[str]],
    wiki_folder: str,
) -> Dict:
    from .scanners import is_page_empty

    deleted = 0
    failed = 0
    errors: List[str] = []

    for rel in vault_list_markdown():
        full = f"{wiki_folder}/{rel}" if not rel.startswith(wiki_folder) else rel
        if any(x in full for x in ["/sources/", "/schema/", "/contradictions/", "index.md", "log.md"]):
            continue
        try:
            content = vault_read(full)
            if not content or not is_page_empty(content):
                continue
            fm = parse_frontmatter(content) or {}
            if fm.get("reviewed") is True:
                continue
            vault_delete(full)
            deleted += 1
        except Exception as e:
            failed += 1
            errors.append(f"{full}: {e}")

    return {"deleted": deleted, "failed": failed, "errors": errors}


# ── Alias completion ──────────────────────────────────────────────────────────

async def run_alias_completion_async(
    vault_write: Callable[[str, str], None],
    wiki_folder: str,
    settings: LLMWikiSettings,
    client: LLMClient,
    alias_deficient_pages: List[ScannerPage],
    on_progress: Optional[Callable[[str], None]] = None,
) -> Dict:
    _prog = on_progress or (lambda _: None)
    filled = 0
    results: List[str] = []

    for i, page in enumerate(alias_deficient_pages):
        _prog(f"Generating aliases for {page.basename} ({i+1}/{len(alias_deficient_pages)})...")
        try:
            body_m = re.match(r"^---[\s\S]*?\n---\n?([\s\S]*)", page.content)
            body = body_m.group(1).strip() if body_m else ""

            prompt = (
                GENERATE_ALIASES_PROMPT
                .replace("{{title}}", page.basename.replace(".md", ""))
                .replace("{{body}}", body[:2000])
            )

            response = await client.create_message_async(
                model=settings.model,
                max_tokens=TOKENS_LINT_ALIAS_BATCH,
                system=getattr(settings, "wiki_language", "en"),
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )

            async def _repair(malformed: str) -> str:
                return await client.create_message_async(
                    model=settings.model, max_tokens=TOKENS_LINT_ALIAS_BATCH,
                    messages=[{"role": "user", "content":
                        "Fix the following malformed JSON. Output ONLY the fixed JSON.\n\n" + malformed}],
                    response_format={"type": "json_object"},
                )

            parsed = await parse_json_response(response, _repair)
            if parsed and isinstance(parsed.get("aliases"), list) and parsed["aliases"]:
                aliases = parsed["aliases"]
                fm_end = page.content.find("\n---", 3)
                if fm_end != -1:
                    aliases_yaml = "aliases:\n" + "\n".join(f'  - "{a}"' for a in aliases)
                    updated = page.content[:fm_end] + "\n" + aliases_yaml + page.content[fm_end:]
                    vault_write(page.path, updated)
                    page_rel = _make_rel(page.path, wiki_folder)
                    results.append(f"- [[{page_rel}]]: added {len(aliases)} aliases")
                    filled += 1
        except Exception as e:
            log.error("Alias completion failed for %s: %s", page.basename, e)

    return {"filled": filled, "results": results}


# ── Tag retag ────────────────────────────────────────────────────────────────

async def run_retag_violations_async(
    vault_read: Callable[[str], Optional[str]],
    vault_write: Callable[[str, str], None],
    wiki_folder: str,
    settings: LLMWikiSettings,
    client: LLMClient,
    violations: List[TagViolation],
    on_progress: Optional[Callable[[str], None]] = None,
) -> Dict:
    _prog = on_progress or (lambda _: None)
    fixed = 0
    results: List[str] = []

    for i, v in enumerate(violations):
        _prog(f"Retagging {v.path} ({i+1}/{len(violations)})...")
        try:
            content = vault_read(v.path)
            if not content:
                results.append(f"{v.path}: file not found")
                continue

            fm_end = content.find("\n---\n", 3)
            body = content[fm_end + 5:] if fm_end != -1 else content
            body_preview = " ".join(body[:400].split())

            valid_vocab = (
                _get_active_entity_tags(settings) if v.page_type == "entity"
                else _get_active_concept_tags(settings) if v.page_type == "concept"
                else _get_active_source_tags(settings)
            )

            tag_vocab = build_active_tag_vocabulary_section(settings)
            prompt = (
                f"You are retagging a wiki page whose current tags fall outside the active vocabulary.\n\n"
                f"Page name: {v.title}\n"
                f"Page type: {v.page_type}\n"
                f"Current tags (some are invalid): [{', '.join(v.current_tags)}]\n"
                f"Invalid tags: [{', '.join(v.invalid_tags)}]\n\n"
                f"Page summary (first 400 chars of body):\n{body_preview}\n\n"
                f"Task: Return a JSON object with a single field \"tags\" that is an array of strings.\n"
                f"- Each value MUST be one of the allowed values listed below.\n"
                f"- Do NOT include any other fields. Do NOT include any explanatory text.\n"
                f"- If the page is genuinely about nothing in the vocabulary, return an empty array.\n\n"
                + tag_vocab
            )

            response = await client.create_message_async(
                model=settings.model,
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )

            async def _repair(malformed: str) -> str:
                return await client.create_message_async(
                    model=settings.model, max_tokens=256,
                    messages=[{"role": "user", "content":
                        "Fix the following malformed JSON. Output ONLY the fixed JSON.\n\n" + malformed}],
                    response_format={"type": "json_object"},
                )

            parsed = await parse_json_response(response, _repair)
            new_tags = [str(t).strip() for t in (parsed or {}).get("tags", []) if str(t).strip()]
            safe_tags = [t for t in new_tags if t in valid_vocab]

            if not safe_tags:
                results.append(f"{v.path}: LLM kept no tags (no valid match)")
                continue

            # Rewrite tags in frontmatter via enforce
            from ...types import LLMWikiSettings as _S
            fake_content = re.sub(
                r"^tags:.*$",
                f"tags: [{', '.join(safe_tags)}]",
                content,
                flags=re.MULTILINE,
            )
            enforced = enforce_frontmatter_constraints(fake_content, v.page_type, settings)
            vault_write(v.path, enforced)
            page_rel = _make_rel(v.path, wiki_folder)
            results.append(f"- [[{page_rel}]]: retagged → [{', '.join(safe_tags)}]")
            fixed += 1

        except Exception as e:
            log.error("Retag failed for %s: %s", v.path, e)
            results.append(f"{v.path}: error — {e}")

    return {"fixed": fixed, "results": results}


# ── LLM duplicate verification ────────────────────────────────────────────────

async def verify_duplicate_candidates_async(
    settings: LLMWikiSettings,
    client: LLMClient,
    candidates: List[DuplicateCandidate],
    total_pages: int,
    on_progress: Optional[Callable[[str], None]] = None,
) -> List[Dict]:
    _prog = on_progress or (lambda _: None)
    BATCH_SIZE = 100
    batches = [candidates[i:i + BATCH_SIZE] for i in range(0, len(candidates), BATCH_SIZE)]
    all_duplicates: List[Dict] = []

    for i, batch in enumerate(batches):
        _prog(f"Verifying duplicates: batch {i+1}/{len(batches)}...")
        candidate_list = "\n".join(
            f"- Candidate A: {c.target}\n  Candidate B: {c.source}\n  Signal: {c.reason}"
            for c in batch
        )
        prompt = (
            LINT_DUPLICATE_DETECTION_PROMPT
            .replace("{{candidates}}", candidate_list)
            .replace("{{total}}", str(total_pages))
            .replace("{{wikiFolder}}", getattr(settings, "wiki_folder", "wiki"))
        )
        try:
            response = await client.create_message_async(
                model=settings.model,
                max_tokens=TOKENS_LINT_DEDUP_LLM,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )

            async def _repair(malformed: str) -> str:
                return await client.create_message_async(
                    model=settings.model, max_tokens=TOKENS_LINT_DEDUP_LLM,
                    messages=[{"role": "user", "content":
                        "Fix the following malformed JSON. Output ONLY the fixed JSON.\n\n" + malformed}],
                    response_format={"type": "json_object"},
                )

            result = await parse_json_response(response, _repair)
            raw_dups = (result or {}).get("duplicates", [])
            if isinstance(raw_dups, list):
                wiki_folder = getattr(settings, "wiki_folder", "wiki")
                for d in raw_dups:
                    if isinstance(d, dict) and d.get("target") and d.get("source"):
                        all_duplicates.append({
                            "target": normalize_llm_path(d["target"], wiki_folder),
                            "source": normalize_llm_path(d["source"], wiki_folder),
                            "reason": d.get("reason", ""),
                        })
        except Exception as e:
            log.error("Duplicate verification batch %d failed: %s", i + 1, e)

    return all_duplicates


# ── Sync wrappers ─────────────────────────────────────────────────────────────

def fix_dead_link(
    vault_read, vault_write, existing_pages, wiki_folder, settings, client, source_path, target_name
) -> str:
    return _run(fix_dead_link_async(
        vault_read, vault_write, existing_pages, wiki_folder, settings, client, source_path, target_name
    ))


def link_orphan_page(
    vault_read, vault_write, wiki_folder, settings, client, orphan_path
) -> List[str]:
    return _run(link_orphan_page_async(
        vault_read, vault_write, wiki_folder, settings, client, orphan_path
    ))


def fill_empty_page(
    vault_read, vault_write, wiki_folder, settings, client, page_path, existing_content=None
) -> str:
    return _run(fill_empty_page_async(
        vault_read, vault_write, wiki_folder, settings, client, page_path, existing_content
    ))


def merge_duplicate_pages(
    vault_read, vault_write, vault_delete, vault_list_markdown,
    wiki_folder, settings, client, target_path, source_path
) -> str:
    return _run(merge_duplicate_pages_async(
        vault_read, vault_write, vault_delete, vault_list_markdown,
        wiki_folder, settings, client, target_path, source_path
    ))
