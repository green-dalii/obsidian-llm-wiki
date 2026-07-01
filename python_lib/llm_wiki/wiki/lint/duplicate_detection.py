"""
Duplicate detection — port of src/wiki/lint/duplicate-detection.ts
"""
from __future__ import annotations

import re
from typing import Dict, List, Set

from ...core.frontmatter import parse_frontmatter


# ── Pure helpers ──────────────────────────────────────────────────────────────

def bigrams(s: str) -> Set[str]:
    normalized = re.sub(r"[^a-z0-9\u4e00-\u9fff]", "", s.lower())
    result: Set[str] = set()
    for i in range(len(normalized) - 1):
        result.add(normalized[i:i+2])
    return result


def normalize_for_match(s: str) -> str:
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]", "", re.sub(r"[\s\-_]+", "", s.lower()))


_STOPWORDS = {
    "also", "are", "been", "being", "both", "but", "can", "could", "did",
    "does", "each", "from", "had", "has", "have", "into", "its", "may",
    "might", "must", "not", "only", "other", "our", "shall", "should",
    "than", "that", "the", "their", "them", "then", "there", "these",
    "they", "this", "those", "through", "was", "were", "what", "when",
    "where", "which", "while", "will", "with", "would", "your",
}


def body_word_set(text: str) -> Set[str]:
    words = re.sub(r"[^\w\s\u4e00-\u9fff]", " ", text.lower()).split()
    return {w for w in words if len(w) > 3 and w not in _STOPWORDS}


def compute_jaccard(set_a: Set, set_b: Set) -> float:
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a) + len(set_b) - intersection
    return intersection / union if union > 0 else 0.0


# ── Candidate generation ──────────────────────────────────────────────────────

class DuplicateCandidate:
    def __init__(self, target: str, source: str, reason: str, signal: str, score: float) -> None:
        self.target = target
        self.source = source
        self.reason = reason
        self.signal = signal  # 'crossLang' | 'bigram' | 'sharedLinks' | 'caseVariant'
        self.score = score


def generate_duplicate_candidates(
    pages: List[Dict],  # [{"path": str, "content": str, "title": str}]
) -> List[DuplicateCandidate]:
    """
    Programmatic duplicate candidate detection using three signals:
      1. Cross-language / alias overlap (crossLang)
      2. Bigram title similarity (bigram)
      3. Shared outgoing wiki-links (sharedLinks)
      4. Case-variant title collision (caseVariant)
    """
    link_re = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]")

    class PageMeta:
        def __init__(self, path: str, title: str, aliases: List[str],
                     links: Set[str], body_words: Set[str]) -> None:
            self.path = path
            self.title = title
            self.aliases = aliases
            self.links = links
            self.body_words = body_words

    metas: List[PageMeta] = []
    for page in pages:
        fm = parse_frontmatter(page["content"]) or {}
        aliases = fm.get("aliases", []) if isinstance(fm.get("aliases"), list) else []
        body = re.sub(r"---[\s\S]*?---", "", page["content"])
        links = {m.group(1).strip().lower() for m in link_re.finditer(body)}
        body_text = re.sub(r"\[\[[^\]]+\]\]", "", body)
        metas.append(PageMeta(page["path"], page["title"], aliases, links, body_word_set(body_text)))

    candidates: Dict[str, DuplicateCandidate] = {}

    def add(path_a: str, path_b: str, reason: str, signal: str, score: float) -> None:
        key = "|||".join(sorted([path_a, path_b]))
        if key not in candidates or score > candidates[key].score:
            candidates[key] = DuplicateCandidate(path_a, path_b, reason, signal, score)

    # Signal 1: Shared outgoing wiki-links (Jaccard >= 0.4, body sim >= 0.2)
    for i in range(len(metas)):
        for j in range(i + 1, len(metas)):
            a, b = metas[i], metas[j]
            if not a.links or not b.links:
                continue
            jaccard = compute_jaccard(a.links, b.links)
            if jaccard >= 0.4:
                body_sim = compute_jaccard(a.body_words, b.body_words)
                if body_sim >= 0.2:
                    add(a.path, b.path, f"Shared wiki-links ({round(jaccard * 100)}% overlap)", "sharedLinks", jaccard)

    # Signal 2: Bigram + cross-language on titles/aliases
    for i in range(len(metas)):
        for j in range(i + 1, len(metas)):
            a, b = metas[i], metas[j]
            names_a = [a.title] + a.aliases
            names_b = [b.title] + b.aliases

            # 2a: bigram similarity
            max_sim = 0.0
            for na in names_a:
                for nb in names_b:
                    sim = compute_jaccard(bigrams(na), bigrams(nb))
                    if sim > max_sim:
                        max_sim = sim
            if max_sim >= 0.4:
                add(a.path, b.path, f"Title/alias similarity ({round(max_sim * 100)}% match)", "bigram", max_sim)

            # 2b: cross-language normalized match
            norm_a = [normalize_for_match(n) for n in names_a]
            norm_b_aliases = [normalize_for_match(n) for n in b.aliases]
            norm_b_title = normalize_for_match(b.title)
            cross = False
            for na in norm_a:
                if na and (na in norm_b_aliases or na == norm_b_title):
                    add(a.path, b.path, "Cross-language match (alias or title overlap)", "crossLang", 1.0)
                    cross = True
                    break
            if not cross:
                norm_b = [normalize_for_match(n) for n in names_b]
                norm_a_aliases = [normalize_for_match(n) for n in a.aliases]
                norm_a_title = normalize_for_match(a.title)
                for nb in norm_b:
                    if nb and (nb in norm_a_aliases or nb == norm_a_title):
                        add(a.path, b.path, "Cross-language match (alias or title overlap)", "crossLang", 1.0)
                        break

    # Signal 3: Case-variant title collision
    for i in range(len(metas)):
        for j in range(i + 1, len(metas)):
            a, b = metas[i], metas[j]
            if a.title.lower() == b.title.lower() and a.title != b.title:
                canonical, variant = (a, b) if a.title < b.title else (b, a)
                add(canonical.path, variant.path,
                    f'Case-variant duplicate: "{a.title}" ↔ "{b.title}"',
                    "caseVariant", 0.9)

    return list(candidates.values())
