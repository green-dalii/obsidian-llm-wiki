import { VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS, VALID_SOURCE_TAGS, LLMWikiSettings } from '../types';

export function getActiveEntityTags(settings: LLMWikiSettings): string[] {
  const custom = (settings.customEntityTags ?? '').trim();
  if (settings.tagVocabularyMode === 'custom' && custom.length > 0) {
    const userTags = custom.split(',').map(t => t.trim()).filter(t => t.length > 0);
    return Array.from(new Set(userTags));
  }
  return [...VALID_ENTITY_TAGS];
}

export function getActiveConceptTags(settings: LLMWikiSettings): string[] {
  const custom = (settings.customConceptTags ?? '').trim();
  if (settings.tagVocabularyMode === 'custom' && custom.length > 0) {
    const userTags = custom.split(',').map(t => t.trim()).filter(t => t.length > 0);
    return Array.from(new Set(userTags));
  }
  return [...VALID_CONCEPT_TAGS];
}

/**
 * The type a source extracted, as a tag that may be merged into an existing
 * page — or nothing, when the active vocabulary does not admit it.
 *
 * With the default vocabulary the two coincide: `VALID_ENTITY_TAGS` IS the
 * `EntityInfo['type']` enum, so the extracted type is always a member. With a
 * custom vocabulary it is not, and writing it into `tags:` anyway would put a
 * value there that `runRetagViolations` exists to remove.
 */
export function incomingTypeTag(
  settings: LLMWikiSettings,
  kind: 'entity' | 'concept',
  type: string | undefined
): string[] | undefined {
  if (!type) return undefined;
  const active = kind === 'entity' ? getActiveEntityTags(settings) : getActiveConceptTags(settings);
  return active.includes(type) ? [type] : undefined;
}

export function getActiveSourceTags(settings: LLMWikiSettings): string[] {
  return [...VALID_SOURCE_TAGS];
}

export function normalizeVocabularyCsv(csv: string): string {
  if (!csv) return '';
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of csv.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.join(', ');
}
