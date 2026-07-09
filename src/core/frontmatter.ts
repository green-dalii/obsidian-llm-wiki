import { VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS, VALID_SOURCE_TAGS, LLMWikiSettings } from '../types';
import { getActiveEntityTags, getActiveConceptTags, getActiveSourceTags } from './tag-vocab';

export interface FrontmatterData {
  reviewed?: boolean;
  type?: string;
  created?: string;
  updated?: string;
  sources?: string[];
  tags?: string[];
  aliases?: string[];
  [key: string]: unknown;
}

export function parseFrontmatter(content: string): FrontmatterData | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const result: FrontmatterData = {};
  const fmText = match[1];
  const lines = fmText.split('\n');
  let currentKey: string | null = null;
  let arrayValues: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentKey && arrayValues.length > 0) {
        result[currentKey] = arrayValues;
        arrayValues = [];
        currentKey = null;
      }
      continue;
    }

    if (trimmed.startsWith('- ') && currentKey) {
      const value = trimmed.substring(2).trim();
      arrayValues.push(value.replace(/^["']|["']$/g, ''));
      continue;
    }

    if (currentKey && arrayValues.length > 0 && !trimmed.startsWith('- ')) {
      result[currentKey] = arrayValues;
      arrayValues = [];
      currentKey = null;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();

    const nextLine = lines[i + 1]?.trim();
    if (nextLine && nextLine.startsWith('- ')) {
      currentKey = key;
      arrayValues = [];
      continue;
    }

    if (key === 'reviewed') {
      result.reviewed = value === 'true';
    } else if (key === 'type') {
      result.type = value;
    } else if (key === 'created') {
      result.created = value;
    } else if (key === 'updated') {
      result.updated = value;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      try {
        result[key] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/^["']|["']$/g, ''))
          .filter(v => v);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  if (currentKey && arrayValues.length > 0) {
    result[currentKey] = arrayValues;
  }

  const ARRAY_FIELDS = ['aliases', 'sources', 'tags'];
  for (const field of ARRAY_FIELDS) {
    const val = result[field];
    if (typeof val === 'string') {
      result[field] = [val];
    } else if (!Array.isArray(val)) {
      delete result[field];
    }
  }

  return result;
}

/** Serialize value to YAML format for frontmatter */
function yamlStringify(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '\n' + value.map(v => `  - "${v}"`).join('\n');
  }
  if (typeof value === 'string') {
    if (/[":[\]{}\n]/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  return '';
}

export function extractBody(content: string): string {
  if (!content.startsWith('---')) return content;
  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return content;
  return content.substring(endIdx + 4).trim();
}

/**
 * True when a source file has no extractable body — empty, whitespace-only, or
 * frontmatter-only (e.g. a tags-only stub). Used to gate ingestion before any
 * LLM call: small/local models hallucinate entities from a blank prompt (#164).
 */
export function isBlankSource(content: string): boolean {
  return extractBody(content).trim().length === 0;
}

/**
 * Add or replace a single `key: value` line in a document's frontmatter block,
 * returning the updated content. Used to programmatically stamp fields the LLM
 * can't be trusted to emit (e.g. the #164 content hash). If the document has no
 * frontmatter, a new block is prepended. The value is written verbatim, so the
 * caller is responsible for YAML safety.
 */
export function upsertFrontmatterField(content: string, key: string, value: string): string {
  const line = `${key}: ${value}`;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRe = new RegExp(`^${escapedKey}:.*$`, 'm');

  if (content.startsWith('---')) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const fmBlock = content.substring(0, endIdx); // '---\n<fields>'
      const rest = content.substring(endIdx);       // '\n---<body>'
      if (keyRe.test(fmBlock)) {
        return fmBlock.replace(keyRe, line) + rest;
      }
      return `${fmBlock}\n${line}${rest}`;
    }
  }

  // No frontmatter — prepend a fresh block.
  return `---\n${line}\n---\n\n${content}`;
}

/**
 * v1.24.0: parse-aware merge helper for array-valued frontmatter fields
 * (`aliases`, `tags`, `sources`, ...). Unlike `upsertFrontmatterField` which
 * string-splices the value (and can produce duplicate `aliases:` lines if
 * the key already exists), this function:
 *
 *   1. parses the existing frontmatter via `parseFrontmatter`
 *   2. merges new items into the existing array, deduped (preserving order)
 *   3. re-serializes via `serializeFrontmatter` (canonical field order + shape)
 *   4. preserves all other frontmatter fields verbatim
 *
 * Handles every frontmatter style:
 *   - `aliases: [a, b]`  (inline)
 *   - `aliases:\n  - a\n  - b`  (block)
 *   - `aliases: []` (empty placeholder — treated as "appending")
 *   - field entirely missing — appended
 *
 * If the page has no frontmatter, prepends a fresh `---\n---\n` block.
 * Returns the original content unchanged when the merge would be a no-op.
 */
export function mergeFrontmatterArrayField(
  content: string,
  field: string,
  newItems: readonly string[],
): string {
  if (newItems.length === 0) return content;

  const fm = parseFrontmatter(content);
  const existingRaw: unknown = fm?.[field];
  const existing: string[] = Array.isArray(existingRaw) ? (existingRaw as string[]) : [];

  // Dedup new items against existing; preserve original order.
  const existingSet = new Set(existing);
  const additions: string[] = [];
  for (const item of newItems) {
    if (!existingSet.has(item)) {
      additions.push(item);
      existingSet.add(item);
    }
  }
  if (additions.length === 0) return content;
  const merged = [...existing, ...additions];

  // Build a fresh frontmatter block via the canonical writer.
  // Merge keeps everything we knew about, plus the new array.
  const next: FrontmatterData = {
    ...(fm ?? {}),
    [field]: merged,
  };
  const fmBlock = serializeFrontmatter(next);

  // Splice the new block in place of the existing frontmatter.
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const body = content.substring(endIdx + 4); // '\n---<body>' → skip '---'
      return `${fmBlock}\n${body}`;
    }
  }

  // No existing frontmatter — prepend a fresh block.
  return `${fmBlock}\n\n${content}`;
}

/**
 * v1.24.0: replace (overwrite) the array-valued frontmatter field with
 * a brand-new array. Unlike `mergeFrontmatterArrayField` which appends,
 * this is the "full replacement" semantic used by `runRetagViolations`:
 * the LLM returns the full new tag set (already filtered to vocab),
 * and we replace whatever was on disk.
 *
 * Same handling for inline/block/missing/empty cases as the merge helper.
 */
export function replaceFrontmatterArrayField(
  content: string,
  field: string,
  newItems: readonly string[],
): string {
  const fm = parseFrontmatter(content);

  // Build a fresh frontmatter block. Keep everything we knew, drop the
  // array field (we'll re-emit it with new items).
  const next: FrontmatterData = { ...(fm ?? {}) };
  if (newItems.length === 0) {
    delete next[field];
  } else {
    next[field] = [...newItems];
  }
  const fmBlock = serializeFrontmatter(next);

  if (content.startsWith('---')) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const body = content.substring(endIdx + 4);
      return `${fmBlock}\n${body}`;
    }
  }
  return `${fmBlock}\n\n${content}`;
}

export interface SerializeFrontmatterOptions {
  /**
   * Verbatim frontmatter lines for non-canonical fields (e.g. a future
   * `supersedes:` flag), emitted after `updated:` and before `sources:`.
   * Callers that intentionally drop unknown fields pass none; callers that
   * preserve them (enforceFrontmatterConstraints) pass their collected lines.
   */
  passthroughLines?: string[];
  /** `'block'` → `tags:\n  - x`; `'inline'` → `tags: [x, y]`. Default `'block'`. */
  tagStyle?: 'inline' | 'block';
  /** When there are no tags, emit a bare `tags:` line instead of omitting the field. */
  emitEmptyTags?: boolean;
}

/**
 * Canonical v6 frontmatter serializer — the single source of truth for the
 * field ORDER and YAML SHAPE of type/created/updated/sources/tags/reviewed/aliases.
 * mergeFrontmatter, enforceFrontmatterConstraints, and mergeDuplicatePages all
 * delegate here, so a new field (or a fix) is added in exactly one place rather
 * than three divergent hand-rolled writers. Returns the frontmatter block only
 * (`---\n…\n---`), without the body; the caller joins body as needed.
 *
 * The tag STYLE is parameterized rather than unified: `fix-runners.ts` rewrites
 * tags with an inline-only regex, so enforce must keep emitting inline tags while
 * merge keeps block tags. Only the duplicated ordering/serialization logic is
 * consolidated; observable output is unchanged.
 */
export function serializeFrontmatter(
  fm: FrontmatterData,
  opts: SerializeFrontmatterOptions = {}
): string {
  const { passthroughLines = [], tagStyle = 'block', emitEmptyTags = false } = opts;
  const lines: string[] = ['---'];

  if (fm.type) lines.push(`type: ${fm.type}`);
  if (fm.created) lines.push(`created: ${fm.created}`);
  if (fm.updated) lines.push(`updated: ${fm.updated}`);

  for (const line of passthroughLines) lines.push(line);

  if (Array.isArray(fm.sources) && fm.sources.length > 0) {
    lines.push(`sources:${yamlStringify(fm.sources)}`);
  }

  if (Array.isArray(fm.tags) && fm.tags.length > 0) {
    lines.push(tagStyle === 'inline'
      ? `tags: [${fm.tags.join(', ')}]`
      : `tags:${yamlStringify(fm.tags)}`);
  } else if (emitEmptyTags) {
    lines.push('tags:');
  }

  if (fm.reviewed) lines.push('reviewed: true');

  if (Array.isArray(fm.aliases)) {
    // Dedup: keep first occurrence, drop empties (parity across all writers).
    const dedupedAliases = fm.aliases.filter((v, i, a) => a.indexOf(v) === i && v);
    if (dedupedAliases.length > 0) {
      lines.push(`aliases:${yamlStringify(dedupedAliases)}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

export function mergeFrontmatter(
  existingContent: string,
  newSourcePath: string
): { frontmatter: string; body: string; wasMerged: boolean } {
  const fm = parseFrontmatter(existingContent);
  const body = extractBody(existingContent);

  if (!fm) {
    return {
      frontmatter: '',
      body: existingContent,
      wasMerged: false
    };
  }

  const normalizeSourcePath = (s: string): string => {
    const trimmed = s.trim();
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      return trimmed.slice(2, -2).trim();
    }
    return trimmed;
  };
  const existingSources = Array.isArray(fm.sources) ? fm.sources : [];
  const sourceSet = new Set<string>();
  for (const s of existingSources) {
    sourceSet.add(normalizeSourcePath(String(s)));
  }
  sourceSet.add(newSourcePath);
  const mergedSources = Array.from(sourceSet).map(s => `[[${s}]]`);

  const created = fm.created || new Date().toISOString().split('T')[0];
  const updated = new Date().toISOString().split('T')[0];

  // Always emit a `tags:` line (bare when empty) to preserve prior behavior.
  const frontmatter = serializeFrontmatter(
    {
      type: fm.type,
      created,
      updated,
      sources: mergedSources,
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      reviewed: fm.reviewed,
      aliases: Array.isArray(fm.aliases) ? fm.aliases : undefined,
    },
    { tagStyle: 'block', emitEmptyTags: true }
  );

  return { frontmatter, body, wasMerged: true };
}

export function preserveFrontmatterReviewTag(originalContent: string, newContent: string): string {
  const origFm = parseFrontmatter(originalContent);
  if (!origFm?.reviewed) return newContent;

  if (newContent.startsWith('---')) {
    const endIdx = newContent.indexOf('\n---', 3);
    if (endIdx !== -1 && !newContent.substring(0, endIdx).includes('reviewed:')) {
      return newContent.substring(0, endIdx) + '\nreviewed: true' + newContent.substring(endIdx);
    }
  }
  return newContent;
}

export function enforceFrontmatterConstraints(
  content: string,
  pageType: 'entity' | 'concept' | 'source',
  settings?: LLMWikiSettings
): string {
  if (!content.startsWith('---')) return content;

  const fmEnd = content.indexOf('\n---\n', 3);
  if (fmEnd === -1) return content;

  const fmText = content.substring(3, fmEnd);

  if (/^reviewed:\s*true\s*$/m.test(fmText)) {
    const today = new Date().toISOString().split('T')[0];
    return content
      .replace(/^created:\s*\d{4}-\d{2}-\d{2}\s*$/m, `created: ${today}`)
      .replace(/^updated:\s*\d{4}-\d{2}-\d{2}\s*$/m, `updated: ${today}`);
  }

  let body = content.substring(fmEnd + 5);
  const today = new Date().toISOString().split('T')[0];

  const lines = fmText.split('\n');
  const newLines: string[] = [];
  let collectedTags: string[] = [];
  let foundType = false;
  let foundTags = false;
  let foundAliases = false;
  let collectedAliases: string[] = [];
  let createdValue = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('created:')) {
      createdValue = line.substring(8).trim();
      continue;
    }
    if (line.startsWith('updated:')) {
      continue;
    }

    if (line.startsWith('type:')) {
      foundType = true;
      const currentType = line.substring(5).trim();
      if ((pageType === 'entity' || pageType === 'concept') && currentType && currentType !== 'entity' && currentType !== 'concept' && currentType !== pageType) {
        collectedTags.push(currentType);
      }
    } else if (line.startsWith('tags:')) {
      foundTags = true;
      const tagsValue = line.substring(5).trim();
      if (tagsValue.startsWith('[') && tagsValue.endsWith(']')) {
        const inner = tagsValue.slice(1, -1).trim();
        if (inner) {
          collectedTags.push(...inner.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')));
        }
      }
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('- ')) {
        const tagVal = lines[j].trim().substring(2).trim().replace(/^["']|["']$/g, '');
        if (tagVal) collectedTags.push(tagVal);
        j++;
      }
      if (j > i + 1) i = j - 1;
    } else if (line.startsWith('aliases:')) {
      foundAliases = true;
      const aliasesValue = line.substring(8).trim();
      if (aliasesValue.startsWith('[') && aliasesValue.endsWith(']')) {
        const inner = aliasesValue.slice(1, -1).trim();
        if (inner) {
          collectedAliases.push(...inner.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')));
        }
      }
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('- ')) {
        const aliasVal = lines[j].trim().substring(2).trim().replace(/^["']|["']$/g, '');
        if (aliasVal) collectedAliases.push(aliasVal);
        j++;
      }
      if (j > i + 1) i = j - 1;
    } else if (!line.startsWith('- ')) {
      newLines.push(line);
    }
  }

  // Non-canonical fields (unknown keys) are passed through verbatim, preserving
  // prior enforce behavior. newLines already excludes type/tags/aliases/created/
  // updated and list items by construction; the filter is defensive.
  const passthroughLines = newLines.filter(line =>
    !line.startsWith('type:') && !line.startsWith('tags:') && !line.startsWith('aliases:') &&
    !line.startsWith('created:') && !line.startsWith('updated:'));

  const hasTags = foundTags || collectedTags.length > 0;
  const dedupedTags: string[] = [];
  if (hasTags) {
    const validSubtypes: readonly string[] = pageType === 'entity'
      ? (settings ? getActiveEntityTags(settings) : VALID_ENTITY_TAGS)
      : pageType === 'concept'
        ? (settings ? getActiveConceptTags(settings) : VALID_CONCEPT_TAGS)
        : pageType === 'source'
          ? (settings ? getActiveSourceTags(settings) : VALID_SOURCE_TAGS)
          : [];
    const outOfVocab: string[] = [];
    for (const tag of collectedTags) {
      if (!tag || tag === pageType) continue;
      if (dedupedTags.includes(tag)) continue;
      dedupedTags.push(tag);
      if (!validSubtypes.includes(tag)) outOfVocab.push(tag);
    }
    if (outOfVocab.length > 0) {
      console.debug(
        `[enforceFrontmatterConstraints] ${pageType} page retained ${outOfVocab.length} tag(s) not in active vocabulary (${validSubtypes.length} entries):`,
        outOfVocab
      );
    }
  }

  const frontmatter = serializeFrontmatter(
    {
      type: foundType ? pageType : undefined,
      created: createdValue || today,
      updated: today,
      tags: dedupedTags,
      aliases: (foundAliases || collectedAliases.length > 0) ? collectedAliases : undefined,
    },
    { passthroughLines, tagStyle: 'inline', emitEmptyTags: hasTags }
  );

  return frontmatter + '\n\n' + body;
}
