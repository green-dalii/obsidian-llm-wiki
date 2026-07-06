// PR #3 split: Phase 4 of buildWikiContext — assemble the final system
// prompt. Extracted from query-engine.ts (1192-1252).
//
// Pure: takes the index content + loaded page bodies + arm info + lang
// settings → returns the system prompt string sent to the LLM.

import { WIKI_LANGUAGES } from '../../../types';

export interface AssembleContextInput {
  indexContent: string;
  /** Bodies produced by load-pages (already formatted with `## ${title}\n\n${body}`). */
  pageBodies: string[];
  /** PPR arm label, e.g. "PPR+LLM". */
  armLabel: string;
  llmAugmented: boolean;
  matchesCount: number;
  wikiFolder: string;
  wikiLanguage: string;
}

/**
 * Build the wiki-context system prompt for the query LLM.
 * Identical wording to the original inline code (regression-tested by
 * existing manual e2e — prompts are not unit-tested to keep the
 * canonical template under one author's editorial control).
 */
export function assembleWikiContext(input: AssembleContextInput): string {
  const lang = input.wikiLanguage || 'en';
  const langName = WIKI_LANGUAGES[lang] || lang;
  const langDirective = `IMPORTANT: You MUST write ALL responses in ${langName}. Every answer, explanation, and label must be in ${langName}.`;

  // Build a shorter note for the context: which arm was used.
  const armInfo = input.armLabel.replace(/\+LLM$/, '');
  const retrievalNote = input.matchesCount > 0
    ? `(Pages selected via ${armInfo} retrieval.)`
    : '(No relevant pages found. The LLM should answer from general knowledge.)';

  const wikiContext = `${langDirective}

You are a Wiki assistant with access to a structured knowledge base.

Wiki Index:
${input.indexContent}

Relevant Wiki Pages (loaded with full content):
${input.pageBodies.length > 0 ? input.pageBodies.join('\n\n---\n\n') : 'No directly relevant pages found in Wiki.'}

${retrievalNote}

Instructions:
- Answer based on the Wiki pages above (not general knowledge)
- Use ONLY Obsidian's wiki-link syntax: [[${input.wikiFolder}/entities/page-name]] (NOT HTML links)
- Link format MUST include wiki folder: [[${input.wikiFolder}/entities/page-name]]

CRITICAL RULES:
✅ CORRECT: [[${input.wikiFolder}/entities/example-page]], [[${input.wikiFolder}/concepts/example-concept]]
❌ WRONG: <a href="...">, [link text](url), [[example-page]], [[entities/example-page]]
- Obsidian wiki-links use DOUBLE brackets: [[path]]
- NO HTML: Never use <a href="...">text</a>
- NO Markdown external links: Never use [text](url)
- Include ${input.wikiFolder}/ prefix: Links must start with [[${input.wikiFolder}/...

CITATION REQUIREMENTS:
- When referencing specific information from a Wiki page, include an inline wiki-link
- At the end of your answer, add a "## References" section (or "## 参考文献" for Chinese) listing all wiki pages you cited
- Format each reference as: [[${input.wikiFolder}/path/page-name|Display Name]] — brief description
- Example:
  ## References
  1. [[${input.wikiFolder}/concepts/example-concept|Example Concept]] — Core mechanism explanation
  2. [[${input.wikiFolder}/entities/example-entity|Example Entity]] — Background and history

If Wiki lacks relevant information:
- Acknowledge it and suggest ingesting more sources
- Do NOT make up information outside Wiki

Respond in ${langName}`;

  return wikiContext;
}

/**
 * Build the fallback hint when the wiki index is empty / missing.
 * Extracted as a sibling function so callers don't have to inline the
 * canonical wording into their flow.
 */
export function emptyWikiHint(wikiLanguage: string): string {
  const lang = wikiLanguage || 'en';
  const langName = WIKI_LANGUAGES[lang] || lang;
  return `IMPORTANT: You MUST write ALL responses in ${langName}.\n\nYou are a Wiki assistant. The Wiki is empty. Please answer based on your knowledge and suggest the user ingest sources first.`;
}

/** Build the fallback error hint when context loading fails. */
export function wikiContextErrorHint(wikiLanguage: string): string {
  const lang = wikiLanguage || 'en';
  const langName = WIKI_LANGUAGES[lang] || lang;
  return `IMPORTANT: You MUST write ALL responses in ${langName}.\n\nYou are a Wiki assistant. Failed to load Wiki context. Please answer based on your knowledge.`;
}
