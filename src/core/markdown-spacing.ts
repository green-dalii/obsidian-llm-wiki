// Heading/blank-line spacing normalization for generated wiki pages.
//
// Generated pages frequently carry headings glued to their first content
// line (`## Definition\nText …`) and stray runs of blank lines (e.g.
// between the frontmatter block and the H1). Both render fine but make the
// source view inconsistent. The spacing is pure syntax — machine-checkable
// — so the write gate normalizes it instead of asking the model to:
//   1. exactly one blank line after every ATX heading, and
//   2. runs of two or more blank lines collapsed to one,
// both outside the YAML frontmatter block and fenced code blocks.

const HEADING = /^#{1,6}\s/;
const FENCE = /^(```|~~~)/;

/**
 * Normalize heading spacing and collapse blank-line runs. Idempotent;
 * content already normalized is returned unchanged (same reference, so
 * callers can cheaply detect no-ops).
 */
export function normalizeHeadingSpacing(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let i = 0;
  let changed = false;

  // Pass the frontmatter block through untouched.
  if (lines[0] === '---') {
    out.push(lines[0]);
    i = 1;
    while (i < lines.length && lines[i] !== '---') out.push(lines[i++]);
    if (i < lines.length) out.push(lines[i++]);
  }

  let inFence = false;
  while (i < lines.length) {
    const line = lines[i];
    out.push(line);

    if (FENCE.test(line)) {
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence) {
      i++;
      continue;
    }

    if (line.trim() === '') {
      // Collapse a run of blank lines to this single one.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j > i + 1) changed = true;
      i = j;
      continue;
    }

    if (HEADING.test(line) && i + 1 < lines.length && lines[i + 1].trim() !== '') {
      out.push('');
      changed = true;
    }
    i++;
  }

  return changed ? out.join('\n') : content;
}
