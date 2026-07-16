// page-factory/contextualize.ts — error wrappers + section classification helpers.
//
// Pure helpers extracted from the original page-factory.ts god-class. They have
// no `this` dependencies — they only touch the args handed in. Module-level
// functions keep them trivially unit-testable and free of the class-instance
// surface area that the v1.19.0 LintFixer split established as the canonical
// pattern in this codebase.
//
// Split history (v1.24.1 Phase 2 refactor):
//   - contextualizeError / mergeError — wrap raw errors with entity/concept name
//     context so vault-side failures surface a useful diagnostic.
//   - isListSection — autodetect list-typed vs paragraph-typed sections so the
//     complementary-append path can pick the right separator (#185 follow-up).
//   - firstQuotesForPrompt — pick the first 2 quote strings for the
//     {{key_details}} prompt injection; structured provenance preferred over
//     legacy `mentions_in_source` (Issue #244 + W5).
//   - isConversationSource — Issue #244: conversation ingest uses a synthetic
//     citation rather than verbatim quotes. Detected conservatively by path.

import type { EntityInfo, ConceptInfo } from '../../types';
import { TFile } from 'obsidian';

/**
 * Wrap an error with the entity/concept page context for clearer diagnostics.
 * The original `Failed to create X page` shape is preserved so existing log
 * scrapers and tests still match.
 */
export function contextualizeError(error: unknown, name: string, pageType: string): Error {
  const msg = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to create ${pageType} page "${name}": ${msg}`);
}

/**
 * Symmetric wrapper for the merge path. Same shape as `contextualizeError`
 * but with "merge" in the message so callers can distinguish the two paths
 * when triaging a failure.
 */
export function mergeError(error: unknown, name: string, pageType: string): Error {
  const msg = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to merge ${pageType} page "${name}": ${msg}`);
}

/**
 * Autodetect whether a section body is list-typed. A section is list-typed
 * if **any** non-blank line begins with a markdown list marker (`-`, `*`,
 * `+`, or a digit followed by `.`). The section may end with a closing
 * paragraph — a hand-edited `## 相关概念` block ending with a summary line
 * after its bullets still classifies as list-typed so the appended bullet
 * stays visually contiguous with the existing list.
 *
 * Returns `false` (paragraph mode) only when the section has NO list
 * markers anywhere — typical `## 描述` / `## 定义` blocks. Appended
 * content uses a SINGLE `\n` separator for list-typed sections (no blank
 * line) and a `\n\n` separator (blank line) for paragraph sections.
 */
export function isListSection(body: string): boolean {
  if (!body) return false;
  const lines = body.split('\n');
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (/^[-*+] |^\d+\. /.test(trimmed)) return true;
  }
  return false;
}

/**
 * Issue #244 + W5: Pick the first 2 quote strings for the merge/append
 * `{{key_details}}` prompt injection. Prefers the new structured
 * `mentions_with_provenance` over legacy `mentions_in_source` so an LLM
 * that returns structured provenance still gets verbatim quotes as context.
 */
export function firstQuotesForPrompt(info: EntityInfo | ConceptInfo): string {
  const fromProvenance = info.mentions_with_provenance?.slice(0, 2).map(m => m.quote);
  if (fromProvenance?.length) return fromProvenance.join('; ');
  return info.mentions_in_source?.slice(0, 2).join('; ') || '';
}

/**
 * Issue #244 — conversation ingest uses a synthetic "from <conversation>"
 * citation rather than verbatim quotes. Detect by checking whether the
 * sourceFile.path lives under `${wikiFolder}/sources/` (the conversation
 * summary path) AND basename ends with a conversation-style slug. The
 * detection is conservative: anything else uses the normal multi-quote path.
 */
export function isConversationSource(
  sourceFile: TFile | { path: string; basename: string },
  wikiFolder: string,
): boolean {
  const summaryPrefix = `${wikiFolder}/sources/`;
  return sourceFile.path.startsWith(summaryPrefix);
}