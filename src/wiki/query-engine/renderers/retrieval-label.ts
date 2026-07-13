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

/**
 * Translate the internal arm identifier to a user-facing glyph + text segment.
 *
 * v1.24.1 PATCH Phase 5.5.1: arm identifiers are now "seed source + retrieval
 * method" joined by '+'. Format:
 *   - "Lex+PPR"  → "🔍 Lexical + PPR"  (lex strong, PPR expansion)
 *   - "LLM+PPR"  → "🔗 LLM + PPR"      (LLM keywords found seeds, PPR expansion)
 *   - "LLM+KB"   → "🌐 LLM Knowledge Base" (no wiki sources, pure LLM answer)
 *   - "Lex++PPR" → "📖 Lexical + PPR (fallback)" (weak lex, used as fallback)
 *
 * The old "arm" values (PPR, PPR+LLM, PPR+, lex, index) are no longer emitted
 * by selectPprSeeds but are kept as backwards-compatible fallbacks.
 */
function armDisplay(arm: string): string {
  if (arm === 'none' || arm === '') {
    return '🚫 No specific source';
  }

  // Phase 5.5.1 format: SeedSource+RetrievalMethod
  if (arm === 'Lex+PPR') return '🔍 Lexical + PPR';
  if (arm === 'LLM+PPR') return '🔗 LLM + PPR';
  if (arm === 'LLM+KB') return '🌐 LLM Knowledge Base';
  if (arm === 'Lex++PPR') return '📖 Lexical + PPR (fallback)';

  // Backwards-compatible handling for old arm values and joined arms.
  return arm
    .split('/')
    .map(a => {
      if (a === 'PPR+LLM') return '🔗 PPR + LLM';
      if (a === 'PPR') return '🔗 PPR';
      if (a === 'PPR+') return '🔗 PPR+';
      if (a === 'lex') return '📖 Lexical';
      if (a === 'index') return '📋 Index';
      // Unknown arm: surface the raw identifier so it's never hidden.
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
    // topPaths are vault-real paths (e.g. "wiki/entities/foo.md") populated
    // by selectPprSeeds from PPR matches — not LLM-generated strings. So no
    // placeholder substitution is needed here; strip the user's current
    // wikiFolder prefix + .md suffix to produce the relative form shown.
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
