// page-factory/mentions-integration.ts — assemble the final entity/concept page
// content with the Mentions section re-injected.
//
// `assembleFinalContent` was lifted out of the PageFactory class so the
// Issue #244 / #267 / D8 mention-union logic is independently testable.
//
// Behavior (v1.24.1 Phase 2 refactor — preserved verbatim):
//   - Conversation sources emit a single synthetic citation line (Issue #244),
//     with no cross-source accumulation of verbatim quotes.
//   - Non-conversation sources union the page's accumulated mentions (parsed
//     from `existingBody`) with this source's new mentions, then re-inject
//     the section. The helper `computeReingestMentions` owns the
//     source_path normalization (fill blanks, strip `.md`).
//   - When the existing page has hand-edited / linter-reflowed lines that
//     can't be parsed, the section is preserved verbatim via the
//     `preserveRaw` fallback (fail-safe against #267 — dropping curated
//     quotes is worse than skipping the merge).

import type { EntityInfo, ConceptInfo, MentionWithProvenance, LLMWikiSettings } from '../../types';
import { TFile } from 'obsidian';
import { getSectionLabels } from '../system-prompts';
import { injectMentionsSection } from '../../core/mentions-injector';
import { stripMentionsSection, computeReingestMentions } from '../../core/mentions-parser';
import { isConversationSource } from './contextualize';

/**
 * Minimal context contract required by `assembleFinalContent`. The real
 * `EngineContext` (defined in `src/types.ts`) satisfies this; tests inject
 * a mock with the same shape (the section labels are derived from
 * `ctx.settings`, mirroring the god-class behavior).
 */
export interface MentionsContext {
  /**
   * Full settings object (mirrors `EngineContext.settings`). We type it
   * as `LLMWikiSettings` because `getSectionLabels` requires the full
   * shape; tests cast a minimal stub with `as unknown as LLMWikiSettings`.
   */
  settings: LLMWikiSettings;
}

/**
 * Build the final entity/concept page content (frontmatter + body + Mentions
 * section), respecting Issue #244 (conversation-mode citation) and
 * Issue #267 (non-lossy re-ingest that unions accumulated mentions).
 *
 * @param ctx           Engine context; `ctx.settings` supplies the wiki folder
 *                      and the language used to look up section labels.
 * @param frontmatter   Pre-rendered frontmatter (ends without trailing newline).
 * @param body          Body text (the merge/create artifact) WITHOUT the
 *                      Mentions section.
 * @param info          The LLM-produced entity/concept info; supplies the
 *                      new mentions to union in.
 * @param sourceFile    The source file the new mentions came from.
 * @param existingBody  The full existing page body, used to recover the
 *                      accumulated Mentions across every prior source.
 *                      Merge callers pass this; the create path never
 *                      reaches this method (new pages have no existing body).
 */
export async function assembleFinalContent(
  ctx: MentionsContext,
  frontmatter: string,
  body: string,
  info: EntityInfo | ConceptInfo,
  sourceFile: TFile | { path: string; basename: string },
  existingBody: string,
): Promise<string> {
  const labels = getSectionLabels(ctx.settings);
  const isConv = isConversationSource(sourceFile, ctx.settings.wikiFolder);

  if (isConv) {
    // Conversation sources emit a single citation line (Issue #244); no
    // cross-source accumulation of verbatim quotes, so nothing to union.
    const bodyWithMentions = injectMentionsSection(body, [], sourceFile.path, {
      sectionLabel: labels.mentions_in_source,
      conversationMode: true,
      conversationLabel: `Conversation: ${sourceFile.basename}`,
    });
    return `${frontmatter}\n\n${bodyWithMentions}`;
  }

  // Issue #267 — injectMentionsSection re-emits the section from the array we
  // hand it, so passing only this source's mentions would drop every earlier
  // source's. Recover the accumulated mentions from the existing page and
  // union them with the new source's before injecting. The helper owns
  // source_path normalization (fill blanks from `sourceFile.path`, strip `.md`).
  const newMentions: MentionWithProvenance[] = info.mentions_with_provenance?.length
    ? info.mentions_with_provenance
    : (info.mentions_in_source ?? []).map(quote => ({
        quote,
        source_path: sourceFile.path,
        source_slug: '',
        extracted_at: '',
      }));

  const { mentions: unioned, preserveRaw } = computeReingestMentions(
    existingBody,
    newMentions,
    labels.mentions_in_source,
    sourceFile.path,
  );
  if (preserveRaw !== null) {
    // Fail-safe: the existing section has hand-edited or linter-reflowed
    // lines we cannot structurally parse. Preserve it verbatim rather than
    // risk dropping curated quotes (the very failure mode #267 is about);
    // skip this source's mentions merge for this pass.
    console.warn(
      `[assembleFinalContent] Mentions section on the existing page for "${info.name}" has hand-edited or unrecognized lines — preserving it verbatim and skipping the mentions merge for ${sourceFile.path} to avoid dropping curated quotes (#267).`,
    );
    const stripped = stripMentionsSection(body, labels.mentions_in_source);
    const preserved = stripped ? `${stripped}\n\n${preserveRaw}` : preserveRaw;
    return `${frontmatter}\n\n${preserved}`;
  }

  const bodyWithMentions = injectMentionsSection(body, unioned, sourceFile.path, {
    sectionLabel: labels.mentions_in_source,
    conversationMode: false,
    conversationLabel: `Conversation: ${sourceFile.basename}`,
  });
  return `${frontmatter}\n\n${bodyWithMentions}`;
}