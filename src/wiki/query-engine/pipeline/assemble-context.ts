// PR #3 split: Phase 4 of buildWikiContext — assemble the final system
// prompt. Extracted from query-engine.ts (1192-1252).
//
// Pure: takes the index content + loaded page bodies + arm info + lang
// settings → returns the system prompt string sent to the LLM.

import { WIKI_LANGUAGES } from '../../../types';
import { WIKI_FOLDER_PLACEHOLDER } from '../../../core/prompt-builders';

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
 *
 * v1.24.0 (Bug C 3.0): the prompt uses the literal placeholder
 * `__WIKI_FOLDER__` instead of `${input.wikiFolder}` for every wiki-link.
 * Why: the LLM's responses persist to chat history, and history is replayed
 * as few-shot context for every subsequent query. If the real wikiFolder
 * were baked into the prompt, then into history, then into subsequent
 * prompts, the LLM would follow that established folder even after the
 * user changed the setting. The placeholder makes the LLM-folder
 * relationship transparent; render-time substitution (in
 * `thinking-extract.ts`) replaces the placeholder with the current
 * `settings.wikiFolder` for the user-facing display only.
 *
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

  // Bug C 3.0: use the placeholder constant, never the real wikiFolder.
  const wf = WIKI_FOLDER_PLACEHOLDER;

  const wikiContext = `${langDirective}

You are a Wiki assistant with access to a structured knowledge base.

Wiki Index:
${input.indexContent}

Relevant Wiki Pages (loaded with full content):
${input.pageBodies.length > 0 ? input.pageBodies.join('\n\n---\n\n') : 'No directly relevant pages found in Wiki.'}

${retrievalNote}

Instructions:
- Answer based on the Wiki pages above (not general knowledge)
- Use ONLY Obsidian's wiki-link syntax: [[${wf}/entities/page-name]] (NOT HTML links)
- Link format MUST include wiki folder: [[${wf}/entities/page-name]]

CRITICAL RULES:
✅ CORRECT: [[${wf}/entities/example-page]], [[${wf}/concepts/example-concept]]
❌ WRONG: <a href="...">, [link text](url), [[example-page]], [[entities/example-page]]
- Obsidian wiki-links use DOUBLE brackets: [[path]]
- NO HTML: Never use <a href="...">text</a>
- NO Markdown external links: Never use [text](url)
- Include ${wf}/ prefix: Links must start with [[${wf}/...

CITATION REQUIREMENTS:
- When referencing specific information from a Wiki page, include an inline wiki-link
- At the end of your answer, add a "## References" section (or "## 参考文献" for Chinese) listing all wiki pages you cited
- Format each reference as: [[${wf}/path/page-name|Display Name]] — brief description
- Example:
  ## References
  1. [[${wf}/concepts/example-concept|Example Concept]] — Core mechanism explanation
  2. [[${wf}/entities/example-entity|Example Entity]] — Background and history

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
