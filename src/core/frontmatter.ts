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

  const lines: string[] = ['---'];

  if (fm.type) lines.push(`type: ${fm.type}`);
  lines.push(`created: ${created}`);
  lines.push(`updated: ${updated}`);

  if (mergedSources.length > 0) {
    lines.push(`sources:${yamlStringify(mergedSources)}`);
  }

  if (Array.isArray(fm.tags) && fm.tags.length > 0) {
    lines.push(`tags:${yamlStringify(fm.tags)}`);
  } else {
    lines.push('tags:');
  }

  if (fm.reviewed) {
    lines.push('reviewed: true');
  }

  if (Array.isArray(fm.aliases) && fm.aliases.length > 0) {
    lines.push(`aliases:${yamlStringify(fm.aliases)}`);
  }

  lines.push('---');

  return {
    frontmatter: lines.join('\n'),
    body,
    wasMerged: true
  };
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
  let typeLine = '';
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
      typeLine = `type: ${pageType}`;
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

  const result: string[] = ['---'];

  if (foundType) {
    result.push(typeLine);
  }

  result.push(`created: ${createdValue || today}`);
  result.push(`updated: ${today}`);

  for (const line of newLines) {
    if (!line.startsWith('type:') && !line.startsWith('tags:') && !line.startsWith('aliases:') &&
        !line.startsWith('created:') && !line.startsWith('updated:')) {
      result.push(line);
    }
  }

  if (foundTags || collectedTags.length > 0) {
    const validSubtypes: readonly string[] = pageType === 'entity'
      ? (settings ? getActiveEntityTags(settings) : VALID_ENTITY_TAGS)
      : pageType === 'concept'
        ? (settings ? getActiveConceptTags(settings) : VALID_CONCEPT_TAGS)
        : pageType === 'source'
          ? (settings ? getActiveSourceTags(settings) : VALID_SOURCE_TAGS)
          : [];
    const dedupedTags: string[] = [];
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
    if (dedupedTags.length > 0) {
      result.push(`tags: [${dedupedTags.join(', ')}]`);
    } else {
      result.push('tags:');
    }
  }

  if (foundAliases || collectedAliases.length > 0) {
    const validAliases = collectedAliases.filter((v, i, a) => a.indexOf(v) === i && v);
    if (validAliases.length > 0) {
      result.push(`aliases:${yamlStringify(validAliases)}`);
    }
  }

  result.push('---');

  return result.join('\n') + '\n\n' + body;
}
