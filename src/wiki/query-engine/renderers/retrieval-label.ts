// PR #3 split: addRetrievalLabel extracted from query-engine.ts (963-997).
//
// Renders a persistent retrieval-arm label below the message body plus an
// inline detail panel listing the top-K retrieved pages. The label is
// clickable — toggling reveals/hides the detail list (no Notice).
//
// Surfaces the PPR cascade arm choice so users (and devs reading the
// rendered chat) can see which retrieval method was used. Skipped silently
// if no retrieval metadata was captured.

import type { RetrievalLabelData } from '../types';

/** Translate the internal arm identifier to a user-facing glyph + text segment.
 *
 * v1.24.0 (legibility pass):
 * - 'lex' was previously rendered as '📇 index' — misleading, since 'lex'
 *   is the **lexical fallback** (PPR cascade found no graph match and
 *   fell back to keyword scoring), not a reference to the wiki index
 *   file. The new label 'Lexical' tells the user "this came from word
 *   matching, not from the link graph".
 * - 'none' / empty arm was previously rendered as '—' (em-dash) — looks
 *   like an error. The new label 'No specific source' tells the user
 *   the LLM ran without a defined retrieval arm.
 * - Unknown arm values are no longer hidden behind '📇 index' — the raw
 *   identifier is shown with a 🔎 prefix so future arms surface
 *   visibly rather than masquerading as a default.
 */
function armDisplay(arm: string): string {
  if (arm === 'none' || arm === '') {
    return '🚫 No specific source';
  }
  return arm
    .split('/')
    .map(a => {
      if (a === 'PPR+LLM') return '🔗 PPR + LLM';
      if (a === 'PPR') return '🔗 PPR';
      if (a === 'PPR+') return '🔗 PPR+';
      if (a === 'lex') return '📖 Lexical';
      // Unknown arm: surface the raw identifier so it's never hidden
      // behind a misleading default.
      return `🔎 ${a}`;
    })
    .join(' · ');
}

/**
 * Render the retrieval label + detail panel inside `messageWrapper`.
 * Pure DOM construction — caller decides which message div to attach to.
 */
export function renderRetrievalLabel(
  messageWrapper: HTMLElement,
  retrieval: RetrievalLabelData,
  wikiFolder: string,
  onClick?: (label: HTMLElement, detail: HTMLElement) => void,
): void {
  const r = retrieval;
  const label = messageWrapper.createDiv({
    cls: 'llm-wiki-query-retrieval-label',
  });
  // v1.24.0: pluralize correctly — "1 page" vs "3 pages" — instead of
  // the previous "N page(s)" placeholder which read as jargon.
  const pageWord = r.count === 1 ? 'page' : 'pages';
  label.setText(`🔍 ${r.count} ${pageWord} · ${armDisplay(r.arm)}`);

  // v1.23.2: click to expand/collapse the list of retrieved pages inline
  // below the label (no Notice).
  const detail = messageWrapper.createDiv({
    cls: 'llm-wiki-query-retrieval-detail',
  });
  r.topPaths.forEach(p => {
    const rel = p.replace(wikiFolder + '/', '').replace('.md', '');
    const pageDiv = detail.createDiv({ cls: 'llm-wiki-query-retrieval-page' });
    pageDiv.setText(`📄 [[${rel}]]`);
  });

  label.addClass('llm-wiki-query-retrieval-label-clickable');
  label.addEventListener('click', (evt) => {
    evt.stopPropagation();
    if (onClick) {
      onClick(label, detail);
    } else {
      detail.classList.toggle('llm-wiki-query-retrieval-detail-open');
    }
  });
}
