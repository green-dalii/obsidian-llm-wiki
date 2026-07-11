import { describe, it, expect } from 'vitest';
import {
  getActiveEntityTags,
  getActiveConceptTags,
  getActiveSourceTags,
  normalizeVocabularyCsv,
} from '../../core/tag-vocab';
import { LLMWikiSettings } from '../../types';

describe('getActiveEntityTags / getActiveConceptTags', () => {
  it('returns hardcoded defaults when tagVocabularyMode is "default"', () => {
    const settings: Partial<LLMWikiSettings> = { tagVocabularyMode: 'default' };
    expect(getActiveEntityTags(settings as LLMWikiSettings)).toEqual([
      'person', 'organization', 'project', 'product', 'event', 'place', 'other'
    ]);
    expect(getActiveConceptTags(settings as LLMWikiSettings)).toEqual([
      'theory', 'method', 'field', 'phenomenon', 'standard', 'term', 'other'
    ]);
  });

  it('returns user-customized tags when tagVocabularyMode is "custom" (entity only)', () => {
    const settings: Partial<LLMWikiSettings> = {
      tagVocabularyMode: 'custom',
      customEntityTags: 'person, organization, Medical_Arzneimittel'
    };
    expect(getActiveEntityTags(settings as LLMWikiSettings)).toEqual([
      'person', 'organization', 'Medical_Arzneimittel'
    ]);
  });

  it('trims whitespace and filters empty entries from custom tags', () => {
    const settings: Partial<LLMWikiSettings> = {
      tagVocabularyMode: 'custom',
      customEntityTags: ' person , , organization , Medical_Arzneimittel '
    };
    expect(getActiveEntityTags(settings as LLMWikiSettings)).toEqual([
      'person', 'organization', 'Medical_Arzneimittel'
    ]);
  });

  it('preserves nested-tag syntax (slashes preserved in custom vocabulary)', () => {
    const settings: Partial<LLMWikiSettings> = {
      tagVocabularyMode: 'custom',
      customConceptTags: 'Kardiologie, Arzneimittel/Neurologie'
    };
    expect(getActiveConceptTags(settings as LLMWikiSettings)).toEqual([
      'Kardiologie', 'Arzneimittel/Neurologie'
    ]);
  });

  it('falls back to defaults when tagVocabularyMode is "custom" but custom field is empty', () => {
    const settings: Partial<LLMWikiSettings> = { tagVocabularyMode: 'custom', customEntityTags: '', customConceptTags: '' };
    expect(getActiveEntityTags(settings as LLMWikiSettings)).toEqual([
      'person', 'organization', 'project', 'product', 'event', 'place', 'other'
    ]);
    expect(getActiveConceptTags(settings as LLMWikiSettings)).toEqual([
      'theory', 'method', 'field', 'phenomenon', 'standard', 'term', 'other'
    ]);
  });

  it('deduplicates user custom tags against defaults (no duplicates in result)', () => {
    const settings: Partial<LLMWikiSettings> = {
      tagVocabularyMode: 'custom',
      customEntityTags: 'person, organization, person, organization'
    };
    expect(getActiveEntityTags(settings as LLMWikiSettings)).toEqual(['person', 'organization']);
  });

  it('returns defaults for undefined tagVocabularyMode (backward compat with old settings)', () => {
    const settings: Partial<LLMWikiSettings> = {};
    expect(getActiveEntityTags(settings as LLMWikiSettings)).toEqual([
      'person', 'organization', 'project', 'product', 'event', 'place', 'other'
    ]);
  });
});

describe('normalizeVocabularyCsv (Issue #85 v2 migration)', () => {
  it('trims whitespace and drops empty entries', () => {
    expect(normalizeVocabularyCsv(' person , , organization ')).toBe('person, organization');
  });

  it('dedupes case-insensitively, keeping first casing', () => {
    expect(normalizeVocabularyCsv('Person, person, PERSON')).toBe('Person');
  });

  it('preserves nested tag syntax with /', () => {
    expect(normalizeVocabularyCsv('Arzneimittel/Neurologie')).toBe('Arzneimittel/Neurologie');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeVocabularyCsv('')).toBe('');
  });

  it('returns empty string for only commas/whitespace', () => {
    expect(normalizeVocabularyCsv(',,,')).toBe('');
    expect(normalizeVocabularyCsv('  ,  ,  ')).toBe('');
  });

  it('is idempotent on canonical input', () => {
    const canonical = 'alpha, beta, gamma';
    expect(normalizeVocabularyCsv(canonical)).toBe(canonical);
  });

  it('handles v1 leftover CSV (migrated from textarea input)', () => {
    expect(normalizeVocabularyCsv(' person , person , organization ')).toBe('person, organization');
  });
});

describe('getActiveSourceTags (Issue #85 v7)', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', openAICodexSecretId: '', baseUrl: '', model: 'claude-sonnet-4-6',
    wikiFolder: 'wiki', language: 'en', wikiLanguage: 'en',
    maxConversationHistory: 30, extractionGranularity: 'standard',
    enableSchema: true, autoWatchSources: false, autoWatchMode: 'notify',
    autoWatchDebounceMs: 5000, watchedFolders: [], periodicLint: 'off',
    startupCheck: false, pageGenerationConcurrency: 3, batchDelayMs: 500,
    llmReady: false,
    maxTokensPerCall: 0,
    tagVocabularyMode: 'default',
    customEntityTags: '',
    customConceptTags: '',
    autoSmartFix: false,
    autoIngestNotificationLevel: 'notice',
    slugCase: 'lower' as const,
    createWelcomeNote: true,
    startupCheckNoticeLevel: 'visible' as const,
  };

  it('returns the hardcoded VALID_SOURCE_TAGS list', () => {
    const tags = getActiveSourceTags(baseSettings);
    expect(tags).toEqual([
      'paper', 'article', 'book', 'transcript', 'clippings',
      'notes', 'other',
    ]);
  });

  it('does NOT honor customEntityTags / customConceptTags (source vocab is static)', () => {
    const customSettings: LLMWikiSettings = { ...baseSettings,
      tagVocabularyMode: 'custom',
      customEntityTags: 'Medical_Arzneimittel, Kardiologie',
    };
    const tags = getActiveSourceTags(customSettings);
    expect(tags).not.toContain('Medical_Arzneimittel');
    expect(tags).not.toContain('Kardiologie');
    expect(tags).toContain('paper');
  });
});
