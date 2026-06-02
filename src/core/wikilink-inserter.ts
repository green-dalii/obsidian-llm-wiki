type WikiPageEntry = { title: string; wikiLink: string; aliases?: string[] };

/** Splits content into frontmatter + body. Frontmatter is the YAML block between leading `---` fences. */
function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  if (!content.startsWith('---')) {
    return { frontmatter: '', body: content };
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return { frontmatter: '', body: content };
  }
  // Include the closing `---` (3 chars) but not the newline after it
  const fenceEnd = end + 4; // '\n' + '---' = 4 chars
  return { frontmatter: content.slice(0, fenceEnd), body: content.slice(fenceEnd) };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitOnLinks(text: string): { plain: string[]; links: string[] } {
  const WIKILINK_RE = /\[\[.*?\]\]/g;
  const plain: string[] = [];
  const links: string[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    plain.push(text.slice(lastIdx, m.index));
    links.push(m[0]);
    lastIdx = m.index + m[0].length;
  }
  plain.push(text.slice(lastIdx));
  return { plain, links };
}

/**
 * Inserts Obsidian wiki links for every mention of a known wiki page (title or alias).
 * Frontmatter is preserved unchanged. Existing [[...]] links are not modified.
 * All occurrences are linked (case-insensitive); display text matches the source casing.
 * Candidates are processed longest-first so "Alan Turing" wins over alias "Turing".
 */
export function insertWikiLinks(content: string, wikiPages: WikiPageEntry[]): string {
  if (wikiPages.length === 0) return content;

  const { frontmatter, body } = splitFrontmatter(content);

  // Build (matchText → linkBase) list sorted by length descending
  const candidates: Array<{ text: string; linkBase: string }> = [];
  for (const page of wikiPages) {
    // Extract path from wikiLink: [[entities/foo|Bar]] → "entities/foo"
    const linkPath = page.wikiLink.replace(/^\[\[/, '').replace(/\|.*$/, '').replace(/\]\]$/, '');
    candidates.push({ text: page.title, linkBase: linkPath });
    for (const alias of page.aliases ?? []) {
      candidates.push({ text: alias, linkBase: linkPath });
    }
  }
  candidates.sort((a, b) => b.text.length - a.text.length);

  // Pipeline: process one candidate at a time, re-splitting on [[...]] each iteration
  // so already-inserted links are never re-processed.
  let processedBody = body;

  for (const { text, linkBase } of candidates) {
    const { plain, links } = splitOnLinks(processedBody);
    const pattern = new RegExp('\\b' + escapeRegex(text) + '\\b', 'gi');
    const newPlain = plain.map(seg => seg.replace(pattern, match => `[[${linkBase}|${match}]]`));
    processedBody = newPlain.reduce((acc, seg, i) => acc + seg + (links[i] ?? ''), '');
  }

  return frontmatter + processedBody;
}
