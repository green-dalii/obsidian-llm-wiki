"""
llm_wiki — Python library for LLM-powered knowledge wiki generation.

Port of the Obsidian LLM Wiki plugin (karpathywiki) for standalone Python use.
Supports Anthropic, Anthropic-compatible, OpenAI-compatible, RITS (vLLM),
Ollama, LM Studio, Gemini, DeepSeek, and more.

Quick start:
    from llm_wiki import LLMWiki

    wiki = LLMWiki(
        wiki_folder="./my-wiki",
        provider="openai",
        api_key="sk-...",
        model="gpt-4o",
    )
    report = wiki.ingest_file("my-notes.md")
    print(f"Created {report.entities_created} entities, {report.concepts_created} concepts")
"""

from .facade import LLMWiki
from .types import (
    LLMWikiSettings,
    IngestReport,
    SourceAnalysis,
    EntityInfo,
    ConceptInfo,
    ContradictionInfo,
    LevelReport,
    HierarchyReport,
)
from .wiki.lint.controller import LintReport
from .llm_client import (
    AnthropicClient,
    AnthropicCompatibleClient,
    OpenAICompatibleClient,
    create_llm_client,
)

__version__ = "1.22.1"
__all__ = [
    "LLMWiki",
    "LLMWikiSettings",
    "IngestReport",
    "LintReport",
    "SourceAnalysis",
    "EntityInfo",
    "ConceptInfo",
    "ContradictionInfo",
    "LevelReport",
    "HierarchyReport",
    "AnthropicClient",
    "AnthropicCompatibleClient",
    "OpenAICompatibleClient",
    "create_llm_client",
]
