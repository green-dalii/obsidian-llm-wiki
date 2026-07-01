"""
Core type definitions — Python port of src/types.ts
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Set


# ---------------------------------------------------------------------------
# Extraction types
# ---------------------------------------------------------------------------

@dataclass
class EntityInfo:
    name: str
    type: Literal["person", "organization", "project", "product", "event", "place", "other"]
    summary: str
    mentions_in_source: List[str] = field(default_factory=list)
    aliases: Optional[List[str]] = None
    related_entities: Optional[List[str]] = None
    related_concepts: Optional[List[str]] = None


@dataclass
class ConceptInfo:
    name: str
    type: Literal["theory", "method", "field", "phenomenon", "standard", "term", "other"]
    summary: str
    mentions_in_source: List[str] = field(default_factory=list)
    related_concepts: List[str] = field(default_factory=list)
    aliases: Optional[List[str]] = None
    related_entities: Optional[List[str]] = None


@dataclass
class ContradictionInfo:
    claim: str
    source_page: str
    contradicted_by: str
    resolution: str


@dataclass
class SourceAnalysis:
    source_file: str
    source_title: str
    summary: str
    entities: List[EntityInfo] = field(default_factory=list)
    concepts: List[ConceptInfo] = field(default_factory=list)
    contradictions: List[ContradictionInfo] = field(default_factory=list)
    related_pages: List[str] = field(default_factory=list)
    key_points: List[str] = field(default_factory=list)
    created_pages: List[str] = field(default_factory=list)
    updated_pages: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Report types
# ---------------------------------------------------------------------------

@dataclass
class FailedItem:
    type: Literal["entity", "concept"]
    name: str
    reason: str


@dataclass
class CollisionItem:
    name: str
    source_type: Literal["entity", "concept"]
    target_type: Literal["entity", "concept"]
    target_path: str


@dataclass
class RejectedFile:
    path: str
    reason: str
    detail: Optional[str] = None


@dataclass
class IngestReport:
    source_file: str
    created_pages: List[str] = field(default_factory=list)
    updated_pages: List[str] = field(default_factory=list)
    entities_created: int = 0
    concepts_created: int = 0
    failed_items: List[FailedItem] = field(default_factory=list)
    collisions: List[CollisionItem] = field(default_factory=list)
    contradictions_found: int = 0
    success: bool = True
    error_message: Optional[str] = None
    elapsed_seconds: Optional[float] = None
    skipped_files: Optional[int] = None
    total_files_in_folder: Optional[int] = None
    cancelled: bool = False
    skipped: bool = False
    rejected_files: Optional[List[RejectedFile]] = None


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

ExtractionGranularity = Literal["fine", "standard", "coarse", "minimal", "custom"]
ThinkingControlDialect = Literal["anthropic", "openai", "none"]
Language = Literal["en", "zh", "zh-Hant", "ja", "ko", "de", "fr", "es", "pt", "it"]


@dataclass
class LLMWikiSettings:
    # Provider / model
    provider: str = "openai"
    api_key: str = ""
    base_url: str = ""
    model: str = "gpt-4o"
    rits_api_key: str = ""

    # Wiki location
    wiki_folder: str = "wiki"

    # Language
    language: Language = "en"
    wiki_language: str = "en"
    use_custom_wiki_language: bool = False

    # Extraction
    extraction_granularity: ExtractionGranularity = "standard"
    custom_entity_limit: Optional[int] = None
    custom_concept_limit: Optional[int] = None

    # Tag vocabulary
    tag_vocabulary_mode: Literal["default", "custom"] = "default"
    custom_entity_tags: str = ""
    custom_concept_tags: str = ""

    # Advanced LLM settings
    max_tokens_per_call: int = 0  # 0 = no cap
    extraction_temperature: Optional[float] = None
    chat_temperature: Optional[float] = None
    repetition_penalty: Optional[float] = None
    disable_thinking: bool = False
    thinking_control_cache: Optional[Dict[str, Any]] = None

    # Performance
    page_generation_concurrency: int = 3
    batch_delay_ms: int = 0

    # Schema
    enable_schema: bool = False

    # Slug case
    slug_case: Literal["lower", "preserve"] = "lower"

    # Internal
    llm_ready: bool = True
    max_conversation_history: int = 20


# ---------------------------------------------------------------------------
# Provider config
# ---------------------------------------------------------------------------

@dataclass
class ProviderConfig:
    id: str
    name: str
    name_en: str
    name_zh: str
    base_url: str
    api_key_placeholder: str
    requires_base_url: bool


# ---------------------------------------------------------------------------
# Constants  (mirrors types.ts)
# ---------------------------------------------------------------------------

VALID_ENTITY_TAGS = ["person", "organization", "project", "product", "event", "place", "other"]
VALID_CONCEPT_TAGS = ["theory", "method", "field", "phenomenon", "standard", "term", "other"]
DEFAULT_ENTITY_TAG = "other"
DEFAULT_CONCEPT_TAG = "term"

VALID_SOURCE_TAGS = [
    "book", "article", "paper", "video", "podcast", "talk", "blog",
    "documentation", "note", "conversation", "other",
]
DEFAULT_SOURCE_TAG = "other"

WIKI_LANGUAGES: Dict[str, str] = {
    "en": "English", "zh": "Chinese (Simplified)",
    "zh-Hant": "Chinese (Traditional)", "ja": "Japanese",
    "ko": "Korean", "de": "German", "fr": "French",
    "es": "Spanish", "pt": "Portuguese", "it": "Italian",
}

PREDEFINED_PROVIDERS: Dict[str, ProviderConfig] = {
    "openai": ProviderConfig(
        id="openai", name="OpenAI", name_en="OpenAI", name_zh="OpenAI",
        base_url="https://api.openai.com/v1",
        api_key_placeholder="sk-...", requires_base_url=False,
    ),
    "anthropic": ProviderConfig(
        id="anthropic", name="Anthropic", name_en="Anthropic", name_zh="Anthropic",
        base_url="https://api.anthropic.com/v1",
        api_key_placeholder="sk-ant-...", requires_base_url=False,
    ),
    "anthropic-compatible": ProviderConfig(
        id="anthropic-compatible", name="Anthropic-compatible", name_en="Anthropic-compatible",
        name_zh="Anthropic兼容",
        base_url="", api_key_placeholder="sk-...", requires_base_url=True,
    ),
    "gemini": ProviderConfig(
        id="gemini", name="Google Gemini", name_en="Google Gemini", name_zh="Google Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        api_key_placeholder="AIza...", requires_base_url=False,
    ),
    "deepseek": ProviderConfig(
        id="deepseek", name="DeepSeek", name_en="DeepSeek", name_zh="DeepSeek",
        base_url="https://api.deepseek.com/v1",
        api_key_placeholder="sk-...", requires_base_url=False,
    ),
    "ollama": ProviderConfig(
        id="ollama", name="Ollama", name_en="Ollama", name_zh="Ollama",
        base_url="http://localhost:11434/v1",
        api_key_placeholder="ollama", requires_base_url=False,
    ),
    "lmstudio": ProviderConfig(
        id="lmstudio", name="LM Studio", name_en="LM Studio", name_zh="LM Studio",
        base_url="http://localhost:1234/v1",
        api_key_placeholder="lmstudio", requires_base_url=False,
    ),
    "rits": ProviderConfig(
        id="rits", name="RITS (vLLM)", name_en="RITS (vLLM)", name_zh="RITS (vLLM)",
        base_url="",
        api_key_placeholder="", requires_base_url=True,
    ),
    "openrouter": ProviderConfig(
        id="openrouter", name="OpenRouter", name_en="OpenRouter", name_zh="OpenRouter",
        base_url="https://openrouter.ai/api/v1",
        api_key_placeholder="sk-or-...", requires_base_url=False,
    ),
}

DEFAULT_SETTINGS = LLMWikiSettings()


# ---------------------------------------------------------------------------
# Hierarchy report types
# ---------------------------------------------------------------------------

@dataclass
class LevelReport:
    """Result of a single level in a build_hierarchy() run."""
    level: int
    wiki_folder: str
    granularity: str
    ingest_reports: List["IngestReport"] = field(default_factory=list)
    lint_report: Optional["LintReport"] = None


@dataclass
class HierarchyReport:
    """Aggregated result of a full build_hierarchy() run."""
    levels: List["LevelReport"] = field(default_factory=list)
    total_levels: int = 0
    root_folder: str = ""
