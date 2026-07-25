export function slugify(text: string, preserveCase = false): string {
  // v1.22.2 D2: console.debug removed from slugify hot-path (called thousands
  // of times per batch — every debug log is I/O that slows ingest).
  if (!text || text.trim().length === 0) {
    console.warn('slugify: input text is empty');
    return 'untitled';
  }

  return computeSlug(text, preserveCase);
}

// Pure slug computation — no debug logs on normal path. Used for batch operations
// where thousands of silent calls are needed (e.g. matching 2141 existing pages).
// preserveCase skips the final toLowerCase() for file creation (Issue #111).
// All comparison/matching callers must NOT pass preserveCase so slugs stay
// case-insensitively comparable regardless of the user's slugCase setting.
export function computeSlug(text: string, preserveCase = false): string {
  if (!text || text.trim().length === 0) return 'untitled';

  const trimmed = text.trim();

  // Step 1: Remove ASCII control characters and filesystem-unsafe symbols
  const afterRemoveInvalid = trimmed
    // eslint-disable-next-line no-control-regex -- deliberate control-char strip for filename safety
    .replace(/[\x00-\x1f]/g, '')
    .replace(/[/\\:*?"<>|,()'!?、，。；：！？（）【】《》]/g, '');

  if (afterRemoveInvalid.length === 0) return 'untitled-' + Date.now();

  // Step 2: Convert spaces and dots to dashes
  const afterSpaceToDash = afterRemoveInvalid.replace(/[\s.]+/g, '-');

  // Step 3: Merge multiple dashes
  const afterMergeDash = afterSpaceToDash.replace(/-+/g, '-');

  // Step 4: Remove leading and trailing dashes
  const finalSlug = afterMergeDash.replace(/^-|-$/g, '').trim();

  if (finalSlug.length === 0) return 'untitled-' + Date.now();

  return preserveCase ? finalSlug : finalSlug.toLowerCase();
}

// Issue #312 — comparison keys for "do these two names denote the same thing".
// Returns the slugified forms of a name plus its aliases in the case-insensitive
// comparison form (never preserveCase, per the rule above), so a caller can test
// two naming sets for overlap with a set intersection.
//
// Pure and allocation-cheap: the merge path calls it once per page write.
export function slugKeys(name: string, aliases: readonly string[] = []): Set<string> {
  const keys = new Set<string>();
  for (const raw of [name, ...aliases]) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    keys.add(computeSlug(trimmed));
  }
  return keys;
}

// Filter out aliases that are redundant against a page's own filename.
// Obsidian resolves `[[X]]` to a file whose basename equals X (case-insensitive),
// so an alias that already equals the filename is a self-pointing no-op that only
// clutters frontmatter. This commonly happens on cross-type collisions where the
// colliding name is identical to the existing page's name (e.g. adding "Vigilanz"
// to vigilanz.md). Comparison is exact case-insensitive basename match — NOT slug
// based — because Obsidian does not collapse spaces/symbols when resolving links,
// so a space-variant like "Deep Learning" on deep-learning.md IS a useful alias
// and must be kept.
// Pure function (no IO) so the dedup rule can be unit-tested in isolation.
export function filterRedundantAliases(
  pagePath: string,
  candidateAliases: string[]
): string[] {
  const fileName = pagePath.split('/').pop() || '';
  const fileKey = fileName.replace(/\.md$/i, '').trim().toLowerCase();
  const seen = new Set<string>();
  return candidateAliases.filter(alias => {
    if (!alias || alias.trim().length === 0) return false;
    const key = alias.trim().toLowerCase();
    if (key === fileKey) return false; // already resolves to this file — redundant
    if (seen.has(key)) return false; // duplicate within the batch (case-insensitive)
    seen.add(key);
    return true;
  });
}
