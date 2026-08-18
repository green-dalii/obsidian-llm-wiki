// clamp-page-sections.ts — bound a page for a prompt without cutting it blind.
//
// Two call sites clamp a wiki page before sending it to the model, and both do
// it with `String.prototype.substring`. That has three properties nobody wants
// from a payload decision:
//
//   1. it lands mid-sentence, so the model reads a fragment as if it were the
//      end of the page,
//   2. it leaves no marker, so nothing in the prompt says content is missing —
//      the model cannot account for what it did not receive, and
//   3. on a path that writes the model's answer back over the page, whatever
//      was cut is gone from disk, because the model was told to output the
//      complete page and did so from what it saw.
//
// This clamps in `##` sections instead, drops from the end, and returns what it
// withheld so the caller can put it back. Below the budget nothing happens at
// all — the return is the input, byte for byte.

/** What the clamp did, so the caller can both prompt and restore. */
export interface ClampedPage {
  /** The text to put in the prompt. Identical to the input when nothing was dropped. */
  text: string;
  /** Whole `## …` blocks withheld, in document order, verbatim including their heading. */
  withheld: string[];
  /**
   * True when the budget forced a cut that is not section-shaped — a page whose
   * preamble alone exceeds it, or one with no `##` heading to cut at. Then
   * `withheld` is empty and the loss is not restorable, which a caller that
   * writes back must treat as a reason not to.
   */
  hardCut: boolean;
}

/** Rendered into the prompt in place of what was dropped. */
function marker(headings: string[]): string {
  return `\n\n[${headings.length} section(s) omitted here for length: `
    + `${headings.join(', ')}. They are unchanged and will be restored after your answer — `
    + `do not attempt to reproduce them.]`;
}

/**
 * Split into the part before the first `## ` heading and the `## ` blocks.
 * Frontmatter and the lead paragraph stay in the preamble, which is never
 * dropped: it carries the page's identity.
 */
function splitSections(content: string): { preamble: string; sections: string[] } {
  const lines = content.split('\n');
  const preamble: string[] = [];
  const sections: string[] = [];
  let current: string[] | null = null;
  let inFrontmatter = lines[0]?.trim() === '---';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inFrontmatter && i > 0 && line.trim() === '---') {
      inFrontmatter = false;
      (current ?? preamble).push(line);
      continue;
    }
    if (!inFrontmatter && /^##\s+\S/.test(line)) {
      if (current) sections.push(current.join('\n'));
      current = [line];
      continue;
    }
    (current ?? preamble).push(line);
  }
  if (current) sections.push(current.join('\n'));
  return { preamble: preamble.join('\n'), sections };
}

function headingOf(section: string): string {
  return section.split('\n', 1)[0].replace(/^##\s+/, '').trim();
}

/**
 * Clamp `content` to roughly `budget` characters by dropping whole trailing
 * sections. A budget of 0 or less means no clamp, matching how the rest of the
 * codebase reads an unset numeric limit.
 */
export function clampPageSections(content: string, budget: number): ClampedPage {
  if (budget <= 0 || content.length <= budget) {
    return { text: content, withheld: [], hardCut: false };
  }

  const { preamble, sections } = splitSections(content);

  // No section boundary to cut at, or the preamble alone busts the budget:
  // there is no honest section-shaped answer, so cut and say so.
  if (sections.length === 0 || preamble.length >= budget) {
    const note = '\n\n[content truncated here for length — the remainder was not sent]';
    const room = Math.max(0, budget - note.length);
    return { text: content.slice(0, room) + note, withheld: [], hardCut: true };
  }

  const kept: string[] = [];
  const dropped: string[] = [];
  let used = preamble.length;
  for (const section of sections) {
    const cost = section.length + 1;
    // Once one section has been dropped, every later one goes too — keeping a
    // short tail section after dropping a long middle one would reorder the
    // page as the model sees it.
    if (dropped.length === 0 && used + cost <= budget) {
      kept.push(section);
      used += cost;
    } else {
      dropped.push(section);
    }
  }

  // Every section dropped and the preamble fits: still section-shaped, still
  // restorable — the marker carries the whole list.
  const text = [preamble, ...kept].join('\n') + marker(dropped.map(headingOf));
  return { text, withheld: dropped, hardCut: false };
}

/**
 * Put withheld sections back on the end of a rewritten page. No-op when
 * nothing was withheld, which is the ordinary case.
 */
export function restoreWithheldSections(rewritten: string, withheld: string[]): string {
  if (withheld.length === 0) return rewritten;
  const body = rewritten.replace(/\s+$/, '');
  return `${body}\n\n${withheld.join('\n\n')}\n`;
}
