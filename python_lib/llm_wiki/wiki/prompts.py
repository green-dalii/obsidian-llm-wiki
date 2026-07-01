"""
Prompt templates — port of src/wiki/prompts/*.ts  and  src/wiki/system-prompts.ts
"""
from __future__ import annotations

from typing import Any, Dict, Optional

# ── Section labels (i18n) ─────────────────────────────────────────────────────

SECTION_LABELS: Dict[str, Dict[str, str]] = {
    "en": {
        "basic_information": "Basic Information", "description": "Description",
        "related_content": "Related Content", "mentions_in_source": "Mentions in Source",
        "new_information": "New Information", "definition": "Definition",
        "key_characteristics": "Key Characteristics", "applications": "Applications",
        "related_concepts": "Related Concepts", "related_entities": "Related Entities",
        "source": "Source", "core_content": "Core Content", "key_entities": "Key Entities",
        "key_concepts": "Key Concepts", "main_points": "Main Points",
        "resolved_contradictions": "Resolved Contradictions", "new_claim": "New Claim",
        "existing_knowledge": "Existing Knowledge", "resolution_suggestion": "Resolution Suggestion",
        "source_page": "Source Page", "related_pages": "Related Pages", "updated": "Updated",
    },
    "zh": {
        "basic_information": "基本信息", "description": "描述",
        "related_content": "相关内容", "mentions_in_source": "来源提及",
        "new_information": "新信息", "definition": "定义",
        "key_characteristics": "关键特征", "applications": "应用",
        "related_concepts": "相关概念", "related_entities": "相关实体",
        "source": "来源", "core_content": "核心内容", "key_entities": "关键实体",
        "key_concepts": "关键概念", "main_points": "要点",
        "resolved_contradictions": "已解决的矛盾", "new_claim": "新主张",
        "existing_knowledge": "已有知识", "resolution_suggestion": "解决建议",
        "source_page": "来源页面", "related_pages": "相关页面", "updated": "更新于",
    },
    "zh-Hant": {
        "basic_information": "基本資訊", "description": "描述",
        "related_content": "相關內容", "mentions_in_source": "來源提及",
        "new_information": "新資訊", "definition": "定義",
        "key_characteristics": "關鍵特徵", "applications": "應用",
        "related_concepts": "相關概念", "related_entities": "相關實體",
        "source": "來源", "core_content": "核心內容", "key_entities": "關鍵實體",
        "key_concepts": "關鍵概念", "main_points": "要點",
        "resolved_contradictions": "已解決的矛盾", "new_claim": "新主張",
        "existing_knowledge": "已有知識", "resolution_suggestion": "解決建議",
        "source_page": "來源頁面", "related_pages": "相關頁面", "updated": "更新於",
    },
    "ja": {
        "basic_information": "基本情報", "description": "説明",
        "related_content": "関連コンテンツ", "mentions_in_source": "ソースでの言及",
        "new_information": "新情報", "definition": "定義",
        "key_characteristics": "主な特徴", "applications": "応用",
        "related_concepts": "関連概念", "related_entities": "関連エンティティ",
        "source": "ソース", "core_content": "核心内容", "key_entities": "主要エンティティ",
        "key_concepts": "主要概念", "main_points": "要点",
        "resolved_contradictions": "解決済みの矛盾", "new_claim": "新しい主張",
        "existing_knowledge": "既存の知識", "resolution_suggestion": "解決案",
        "source_page": "ソースページ", "related_pages": "関連ページ", "updated": "更新日",
    },
    "ko": {
        "basic_information": "기본 정보", "description": "설명",
        "related_content": "관련 콘텐츠", "mentions_in_source": "출처 언급",
        "new_information": "새 정보", "definition": "정의",
        "key_characteristics": "주요 특징", "applications": "응용",
        "related_concepts": "관련 개념", "related_entities": "관련 엔티티",
        "source": "출처", "core_content": "핵심 내용", "key_entities": "주요 엔티티",
        "key_concepts": "주요 개념", "main_points": "주요 사항",
        "resolved_contradictions": "해결된 모순", "new_claim": "새 주장",
        "existing_knowledge": "기존 지식", "resolution_suggestion": "해결 제안",
        "source_page": "출처 페이지", "related_pages": "관련 페이지", "updated": "업데이트",
    },
    "de": {
        "basic_information": "Grundlegende Informationen", "description": "Beschreibung",
        "related_content": "Verwandte Inhalte", "mentions_in_source": "Erwähnungen in der Quelle",
        "new_information": "Neue Informationen", "definition": "Definition",
        "key_characteristics": "Hauptmerkmale", "applications": "Anwendungen",
        "related_concepts": "Verwandte Konzepte", "related_entities": "Verwandte Entitäten",
        "source": "Quelle", "core_content": "Kerninhalt", "key_entities": "Wichtige Entitäten",
        "key_concepts": "Wichtige Konzepte", "main_points": "Hauptpunkte",
        "resolved_contradictions": "Aufgelöste Widersprüche", "new_claim": "Neue Behauptung",
        "existing_knowledge": "Bestehendes Wissen", "resolution_suggestion": "Lösungsvorschlag",
        "source_page": "Quellseite", "related_pages": "Verwandte Seiten", "updated": "Aktualisiert",
    },
    "fr": {
        "basic_information": "Informations de base", "description": "Description",
        "related_content": "Contenu associé", "mentions_in_source": "Mentions dans la source",
        "new_information": "Nouvelles informations", "definition": "Définition",
        "key_characteristics": "Caractéristiques principales", "applications": "Applications",
        "related_concepts": "Concepts associés", "related_entities": "Entités associées",
        "source": "Source", "core_content": "Contenu principal", "key_entities": "Entités clés",
        "key_concepts": "Concepts clés", "main_points": "Points principaux",
        "resolved_contradictions": "Contradictions résolues", "new_claim": "Nouvelle affirmation",
        "existing_knowledge": "Connaissances existantes", "resolution_suggestion": "Suggestion de résolution",
        "source_page": "Page source", "related_pages": "Pages associées", "updated": "Mis à jour",
    },
    "es": {
        "basic_information": "Información básica", "description": "Descripción",
        "related_content": "Contenido relacionado", "mentions_in_source": "Menciones en la fuente",
        "new_information": "Nueva información", "definition": "Definición",
        "key_characteristics": "Características clave", "applications": "Aplicaciones",
        "related_concepts": "Conceptos relacionados", "related_entities": "Entidades relacionadas",
        "source": "Fuente", "core_content": "Contenido principal", "key_entities": "Entidades clave",
        "key_concepts": "Conceptos clave", "main_points": "Puntos principales",
        "resolved_contradictions": "Contradicciones resueltas", "new_claim": "Nueva afirmación",
        "existing_knowledge": "Conocimiento existente", "resolution_suggestion": "Sugerencia de resolución",
        "source_page": "Página de origen", "related_pages": "Páginas relacionadas", "updated": "Actualizado",
    },
    "pt": {
        "basic_information": "Informações básicas", "description": "Descrição",
        "related_content": "Conteúdo relacionado", "mentions_in_source": "Menções na fonte",
        "new_information": "Novas informações", "definition": "Definição",
        "key_characteristics": "Características principais", "applications": "Aplicações",
        "related_concepts": "Conceitos relacionados", "related_entities": "Entidades relacionadas",
        "source": "Fonte", "core_content": "Conteúdo principal", "key_entities": "Entidades principais",
        "key_concepts": "Conceitos principais", "main_points": "Pontos principais",
        "resolved_contradictions": "Contradições resolvidas", "new_claim": "Nova afirmação",
        "existing_knowledge": "Conhecimento existente", "resolution_suggestion": "Sugestão de resolução",
        "source_page": "Página de origem", "related_pages": "Páginas relacionadas", "updated": "Atualizado",
    },
    "it": {
        "basic_information": "Informazioni di base", "description": "Descrizione",
        "related_content": "Contenuti correlati", "mentions_in_source": "Menzioni nella sorgente",
        "new_information": "Nuove informazioni", "definition": "Definizione",
        "key_characteristics": "Caratteristiche principali", "applications": "Applicazioni",
        "related_concepts": "Concetti correlati", "related_entities": "Entità correlate",
        "source": "Sorgente", "core_content": "Contenuto principale", "key_entities": "Entità chiave",
        "key_concepts": "Concetti chiave", "main_points": "Punti principali",
        "resolved_contradictions": "Contraddizioni risolte", "new_claim": "Nuova affermazione",
        "existing_knowledge": "Conoscenza esistente", "resolution_suggestion": "Suggerimento di risoluzione",
        "source_page": "Pagina sorgente", "related_pages": "Pagine correlate", "updated": "Aggiornato",
    },
}


def get_section_labels(wiki_language: str = "en") -> Dict[str, str]:
    return SECTION_LABELS.get(wiki_language) or SECTION_LABELS["en"]


def apply_section_labels(prompt: str, wiki_language: str = "en") -> str:
    import re
    labels = get_section_labels(wiki_language)
    for key, label in labels.items():
        prompt = re.sub(r"\{\{section_" + key + r"\}\}", label, prompt)
    return prompt


# ── Granularity instructions ──────────────────────────────────────────────────

GRANULARITY_INSTRUCTIONS: Dict[str, str] = {
    "fine": "Extract ALL entities and concepts worth recording from the source, including those mentioned only once or tangentially.",
    "standard": "Extract important and moderately important entities and concepts from the source. Ignore minor items mentioned only in passing.",
    "coarse": "Extract only the most essential entities and concepts from the source — those without which the text cannot be understood. Quality over quantity.",
    "minimal": "Extract only the most critical entities and concepts from the source — maximum 3 total items. Extreme selectivity for cost control.",
}


def get_granularity_instruction(settings: Any) -> str:
    granularity = getattr(settings, "extraction_granularity", "standard") or "standard"
    if granularity == "custom":
        entity_limit = getattr(settings, "custom_entity_limit", 5) or 5
        concept_limit = getattr(settings, "custom_concept_limit", 5) or 5
        return f"Extract at most {entity_limit} entities and at most {concept_limit} concepts from the source. If you reach either limit, stop extracting that type."
    return GRANULARITY_INSTRUCTIONS.get(granularity, GRANULARITY_INSTRUCTIONS["standard"])


def build_wiki_language_directive(settings: Any) -> str:
    from ..types import WIKI_LANGUAGES
    lang = getattr(settings, "wiki_language", "en") or "en"
    lang_name = WIKI_LANGUAGES.get(lang, lang)
    return (
        f"IMPORTANT: You MUST write ALL content in {lang_name}. "
        f"Every page title, summary, description, and label must be in {lang_name}. "
        "Do NOT output any content in other languages."
    )


def build_active_tag_vocabulary_section(settings: Any) -> str:
    from ..types import VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS
    mode = getattr(settings, "tag_vocabulary_mode", "default")

    if mode == "custom":
        raw_entity = getattr(settings, "custom_entity_tags", "") or ""
        raw_concept = getattr(settings, "custom_concept_tags", "") or ""
        entity_tags = [t.strip() for t in raw_entity.split(",") if t.strip()] or VALID_ENTITY_TAGS
        concept_tags = [t.strip() for t in raw_concept.split(",") if t.strip()] or VALID_CONCEPT_TAGS
    else:
        entity_tags = list(VALID_ENTITY_TAGS)
        concept_tags = list(VALID_CONCEPT_TAGS)

    return (
        "Active Tag Vocabulary (MUST use these exact tag values in frontmatter):\n"
        f"  Entity types (tags): {', '.join(entity_tags)}\n"
        f"  Concept types (tags): {', '.join(concept_tags)}\n"
        "Do not use any other tag values. If unsure, use 'other'."
    )


async def build_system_prompt(settings: Any, get_schema_context=None, task: str = "general") -> Optional[str]:
    parts = []
    lang_directive = build_wiki_language_directive(settings)
    if lang_directive:
        parts.append(lang_directive)

    if get_schema_context:
        try:
            schema_ctx = await get_schema_context(task)
            if schema_ctx:
                parts.append(schema_ctx)
                if "Active Tag Vocabulary" not in schema_ctx:
                    parts.append(build_active_tag_vocabulary_section(settings))
            else:
                parts.append(build_active_tag_vocabulary_section(settings))
        except Exception:
            parts.append(build_active_tag_vocabulary_section(settings))
    else:
        parts.append(build_active_tag_vocabulary_section(settings))

    return "\n\n".join(parts) if parts else None


# ── Prompt templates (verbatim from TypeScript) ───────────────────────────────

ANALYZE_SOURCE_PROMPT = """You are a Wiki knowledge base maintainer. Analyze the following source file and output structured JSON.

**Existing Wiki pages — use ONLY these exact paths when creating [[links]]:**
{{existing_slugs}}

**Source File Content:**
{{content}}

{{batch_context}}

**Extraction Scope:**
{{granularity_instruction}}

**Task Requirements:**
0. [FIRST ROUND ONLY] Write a 100-200 word source summary (field: summary) and extract the source title (field: source_title). These fields must NOT appear in later rounds.
1. In EVERY round (including the first), output both "entities" and "concepts" arrays. Use [] when a category has no items. Never omit either array.
2. Optionally generate 1-2 aliases per entity/concept — alternative names, acronyms, translations, or common phrasings. Aliases serve as seeds for page generation and help the model avoid duplicate extractions in later rounds. The aliases field is OPTIONAL in extraction; skip it when no natural alias exists.
3. Output at most {{batch_size}} items (entities + concepts total) this round
3. Write a detailed, informative summary for each item (target 4-6 sentences). Include concrete information: what the entity/concept is, its role/significance in the source, key factual details, and how it relates to other items. Provide enough substance that the summary alone can seed a quality Wiki page
4. For mentions_in_source: quote 2-4 verbatim sentences from the source where this entity/concept appears or is discussed. These quotes are critical — they provide the downstream page generator with source-grounded evidence. Include surrounding context, not just the name mention
5. For related_entities and related_concepts: identify entities/concepts mentioned in the same context as this item. These should be other items extracted from this same source file
6. Identify contradictions or conflicts with the existing Wiki (only output contradictions in the first round)
7. Identify related existing Wiki pages (only output related_pages in the first round)
8. Generate key points from the source file (only output key_points in the first round)

**Output Format (strict JSON, output only JSON, no explanatory text):**
{
  "source_title": "Source file title",
  "summary": "150-250 word source summary (first round only, omitted thereafter)",
  "entities": [
    {
      "name": "Entity name — MUST be in the source's original language, NEVER translate",
      "type": "person|organization|project|product|event|place|other",
      "aliases": ["Optional: 1-2 alternative names"],
      "summary": "Detailed 4-6 sentence description with concrete facts",
      "mentions_in_source": ["Verbatim sentence from source: '...'."],
      "related_entities": ["Related entity names from this source"],
      "related_concepts": ["Related concept names from this source"]
    }
  ],
  "concepts": [
    {
      "name": "Concept name — MUST be in the source's original language, NEVER translate",
      "type": "theory|method|field|phenomenon|standard|term|other",
      "aliases": ["Optional: 1-2 alternative names"],
      "summary": "Detailed 4-6 sentence description",
      "mentions_in_source": ["Verbatim sentence from source: '...'."],
      "related_concepts": ["Related concept names from this source"],
      "related_entities": ["Related entity names from this source"]
    }
  ],
  "contradictions": [],
  "related_pages": ["Existing wiki page paths that are related"],
  "key_points": ["Key point 1", "Key point 2"]
}"""

GENERATE_ENTITY_PAGE_PROMPT = """You are a Wiki knowledge base maintainer. Create a Wiki page for the following entity.

**Entity Information:**
- Name: {{entity_name}}
- Type: {{entity_type}}
- Summary: {{entity_summary}}
- Mentions in source (VERBATIM — preserve original language): {{mentions}}
- Related entities: {{related_entities}}
- Related concepts: {{related_concepts}}
- Extraction aliases (seeds): {{extraction_aliases}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**Existing Related Content in Wiki:**
{{related_content}}

{{merge_strategy}}

**Task Requirements:**
1. Create an entity page with basic and key information
2. When referencing other pages, copy the wiki-link format EXACTLY from the "Existing Wiki Pages" list
3. All related entities and concepts MUST be formatted as wiki-links using the [[path|display]] format
4. Be objective, accurate, and concise
5. Generate aliases for this page — provide 1-3 alternative names (REQUIRED, must not be empty)
6. In "Mentions in Source" section: preserve VERBATIM quotes in ORIGINAL language

**Output Format:**
---
type: entity
created: {{date}}
updated: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{entity_type}}]
aliases: ["Alternative name or translation"]
---

# {{entity_name}}

## {{section_basic_information}}
- Type: {{entity_type}}
- Source: [[{{source_file}}]]

## {{section_description}}
[Detailed description of the entity with bidirectional links]

## {{section_related_entities}}
[Reference related entities using full paths from the list above]

## {{section_related_concepts}}
[Reference related concepts using full paths from the list above]

## {{section_mentions_in_source}}
[Each verbatim quote as an academic-footnote style entry]

---"""

GENERATE_CONCEPT_PAGE_PROMPT = """You are a Wiki knowledge base maintainer. Create a Wiki page for the following concept.

**Concept Information:**
- Name: {{concept_name}}
- Type: {{concept_type}}
- Summary: {{concept_summary}}
- Mentions in source (VERBATIM — preserve original language): {{mentions}}
- Related concepts: {{related_concepts}}
- Related entities: {{related_entities}}
- Extraction aliases (seeds): {{extraction_aliases}}

**Existing Wiki Pages (use these exact full paths when referencing):**
{{existing_pages}}

**Existing Related Content in Wiki:**
{{related_content}}

{{merge_strategy}}

**Task Requirements:**
1. Create a concept page including definition, characteristics, and applications
2. All related entities and concepts MUST use [[wiki-link]] format
3. Be objective, accurate, and concise
4. Generate aliases (REQUIRED, must not be empty)

**Output Format:**
---
type: concept
created: {{date}}
updated: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{concept_type}}]
aliases: ["Alternative name or translation"]
---

# {{concept_name}}

## {{section_definition}}
[Clear definition of the concept]

## {{section_key_characteristics}}
- Characteristic 1

## {{section_applications}}
[Application scenarios for the concept]

## {{section_related_concepts}}
[Reference related concepts]

## {{section_related_entities}}
[Reference related entities]

## {{section_mentions_in_source}}
[Each verbatim quote]

---"""

GENERATE_SUMMARY_PAGE_PROMPT = """You are a Wiki knowledge base maintainer. Create a summary page for the following source file.

**Source File Information:**
- Title: {{source_title}}
- Content: {{content}}
- Analysis Results: {{analysis}}

**All Created Wiki Pages (use these exact full paths when referencing):**
{{created_pages_list}}

**Task Requirements:**
1. Create a concise summary page
2. Use the exact full path format from the "All Created Wiki Pages" list
3. {{constraints}}
4. Highlight key points
5. Generate aliases (REQUIRED)

**Output Format:**
---
type: source
created: {{date}}
updated: {{date}}
source_file: "[[{{source_file}}]]"
tags: [{{tags}}]
aliases: ["Alternative title or translation"]
---

# {{source_title}} - Summary

## {{section_source}}
- Original file: [[{{source_file}}]]
- Ingested: {{date}}

## {{section_core_content}}
[100-200 word summary with bidirectional links]

## {{section_key_entities}}
[Reference entities]

## {{section_key_concepts}}
[Reference concepts]

## {{section_main_points}}
- Point 1

---"""
