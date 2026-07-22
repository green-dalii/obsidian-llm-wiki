import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../wiki/system-prompts';
import type { LLMWikiSettings } from '../../types';

// Issue #85 v6 / Phase 1.3: buildSystemPrompt should inject the active tag
// vocabulary section so user-defined Custom tags are respected by all
// ingestion paths, not just lint paths.

function makeSettings(overrides: Partial<LLMWikiSettings> = {}): LLMWikiSettings {
  return {
    wikiFolder: 'wiki',
    wikiLanguage: 'en',
    extractionGranularity: 'standard',
    customEntityTags: '',
    customConceptTags: '',
    tagVocabularyMode: 'default',
    ...overrides,
  } as LLMWikiSettings;
}

describe('buildSystemPrompt — tag vocabulary injection (Phase 1.3)', () => {
  it('includes tag vocabulary section in default mode', async () => {
    const settings = makeSettings();
    const prompt = await buildSystemPrompt(settings, async () => undefined, 'entity');
    expect(prompt).toBeDefined();
    expect(prompt).toContain('Active Tag Vocabulary');
    expect(prompt).toContain('Entity types');
    expect(prompt).toContain('Concept types');
    // Default mode should include built-in tags
    expect(prompt).toContain('person');
    expect(prompt).toContain('theory');
  });

  it('includes user-defined custom tags when tagVocabularyMode=custom', async () => {
    const settings = makeSettings({
      tagVocabularyMode: 'custom',
      customEntityTags: 'Kardiologie, Immunologie, Neurologie',
      customConceptTags: 'Medizin, Diagnostik',
    });
    const prompt = await buildSystemPrompt(settings, async () => undefined, 'entity');
    expect(prompt).toBeDefined();
    expect(prompt).toContain('Kardiologie');
    expect(prompt).toContain('Immunologie');
    expect(prompt).toContain('Neurologie');
    expect(prompt).toContain('Medizin');
  });

  it('runtime injection always appends the tag vocab section, even when schema context already contains the literal (#328 Phase 1)', async () => {
    // Issue #328 Phase 1 reverses the v1.21.0 contract. The defensive
    // `schemaHasTagVocab` branch in buildSystemPrompt used to GUARD against
    // a duplicate by string-matching "Active Tag Vocabulary" in the schema
    // context. Phase 1 makes the runtime layer the SOLE source of truth —
    // the schema body no longer contains that literal (verified in
    // src/__tests__/schema/runtime-injection.test.ts), and the runtime
    // injection layer always appends regardless of what schema content
    // happens to contain.
    //
    // Test: feed a schema context that DOES contain the literal string
    // (artificial, but the defensive branch would have suppressed runtime
    // here). Phase 1 expects the runtime section to still be appended.
    const settings = makeSettings();
    const prompt = await buildSystemPrompt(
      settings,
      async () => 'some prior content -- ## Active Tag Vocabulary (fake) -- more content',
      'entity'
    );
    const matches = (prompt ?? '').match(/Active Tag Vocabulary/g);
    // The runtime section is always appended, so we expect >= 2
    // (1 from the fake schema context + 1 from runtime injection).
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });

  it('returns prompt even when schemaContext is undefined', async () => {
    const settings = makeSettings();
    // No schema context — but tag vocab section should still appear
    const prompt = await buildSystemPrompt(settings, async () => undefined, 'entity');
    expect(prompt).toBeDefined();
    expect(prompt).toContain('Active Tag Vocabulary');
  });
});