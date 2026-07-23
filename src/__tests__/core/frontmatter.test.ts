import { describe, it, expect } from 'vitest';
import { LLMWikiSettings } from '../../types';
import { enforceFrontmatterConstraints, isBlankSource, mergeFrontmatter, parseFrontmatter, preserveFrontmatterReviewTag, serializeFrontmatter, upsertFrontmatterField } from '../../core/frontmatter';

describe('isBlankSource', () => {
  it('is true for empty or whitespace-only content', () => {
    expect(isBlankSource('')).toBe(true);
    expect(isBlankSource('   \n\t\n  ')).toBe(true);
  });

  it('is true for frontmatter-only content (no body)', () => {
    expect(isBlankSource('---\ntags: [x]\n---')).toBe(true);
    expect(isBlankSource('---\ntags: [x]\n---\n   \n')).toBe(true);
  });

  it('is false when a real body exists', () => {
    expect(isBlankSource('# Note\nText')).toBe(false);
    expect(isBlankSource('---\ntags: [x]\n---\nBody here.')).toBe(false);
    expect(isBlankSource('![[image.png]]')).toBe(false);
  });
});

describe('upsertFrontmatterField', () => {
  it('adds a new field to existing frontmatter, preserving the body', () => {
    const input = '---\ntype: source\ncreated: 2026-01-01\n---\n\nBody text';
    const result = upsertFrontmatterField(input, 'contentHash', '5-1a2b3c4d');
    expect(result).toContain('contentHash: 5-1a2b3c4d');
    expect(result).toContain('type: source');
    expect(result).toContain('\n\nBody text');
    // The metadata block must still close exactly once.
    expect(result.match(/^---$/gm)?.length).toBe(2);
  });

  it('replaces an existing field rather than duplicating it', () => {
    const input = '---\ntype: source\ncontentHash: old-value\n---\n\nBody';
    const result = upsertFrontmatterField(input, 'contentHash', 'new-value');
    expect(result).toContain('contentHash: new-value');
    expect(result).not.toContain('old-value');
    expect(result.match(/contentHash:/g)?.length).toBe(1);
  });

  it('prepends a frontmatter block when none exists', () => {
    const result = upsertFrontmatterField('Just a body', 'contentHash', '3-deadbeef');
    expect(result).toBe('---\ncontentHash: 3-deadbeef\n---\n\nJust a body');
  });

  it('round-trips through parseFrontmatter', () => {
    const input = '---\ntype: source\n---\n\nBody';
    const result = upsertFrontmatterField(input, 'contentHash', '5-1a2b3c4d');
    expect(parseFrontmatter(result)?.contentHash).toBe('5-1a2b3c4d');
  });
});
describe('parseFrontmatter', () => {
  it('returns null for content without frontmatter', () => {
    expect(parseFrontmatter('# Just a heading\nSome content')).toBeNull();
    expect(parseFrontmatter('')).toBeNull();
  });

  it('parses simple key-value frontmatter', () => {
    const result = parseFrontmatter('---\ntype: entity\n---\nBody content');
    expect(result).toEqual({ type: 'entity' });
  });

  it('parses inline array fields', () => {
    const result = parseFrontmatter('---\naliases: ["监督学习", "Supervised Learning"]\n---\nBody');
    expect(result?.aliases).toEqual(['监督学习', 'Supervised Learning']);
  });

  it('wraps single-value aliases in array', () => {
    const result = parseFrontmatter('---\naliases: CoT\n---\nBody');
    expect(result?.aliases).toEqual(['CoT']);
  });

  it('wraps single-value sources in array', () => {
    const result = parseFrontmatter('---\nsources: "[[machine-learning]]"\n---\nBody');
    expect(result?.sources).toEqual(['[[machine-learning]]']);
  });

  it('wraps single-value tags in array', () => {
    const result = parseFrontmatter('---\ntags: method\n---\nBody');
    expect(result?.tags).toEqual(['method']);
  });

  it('parses multi-line array values', () => {
    const content = '---\ntags:\n  - method\n  - theory\n---\nBody';
    const result = parseFrontmatter(content);
    expect(result?.tags).toEqual(['method', 'theory']);
  });

  it('deletes non-array/non-string value for array-typed fields', () => {
    // "123" is parsed as a string from YAML, so it gets wrapped in array
    // This tests that deletion only happens for truly incompatible types
    const result = parseFrontmatter('---\naliases: 123\n---\nBody');
    expect(result?.aliases).toEqual(['123']);
  });

  it('parses boolean reviewed field', () => {
    const t = parseFrontmatter('---\nreviewed: true\n---\nBody');
    const f = parseFrontmatter('---\nreviewed: false\n---\nBody');
    expect(t?.reviewed).toBe(true);
    expect(f?.reviewed).toBe(false);
  });
});

describe('enforceFrontmatterConstraints', () => {
  it('returns content unchanged if no frontmatter', () => {
    const input = '# Just a heading\nContent';
    expect(enforceFrontmatterConstraints(input, 'entity')).toBe(input);
  });

  it('enforces type for entity pages', () => {
    const input = '---\ntype: concept\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('type: entity');
  });

  it('enforces type for concept pages', () => {
    const input = '---\ntype: entity\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'concept');
    expect(result).toContain('type: concept');
  });

  it('preserves custom type as tag when enforcing entity/concept', () => {
    const input = '---\ntype: theory\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'concept');
    expect(result).toContain('type: concept');
    expect(result).toContain('theory');
  });

  it('collects and preserves existing tags from inline array', () => {
    // Entity valid tags: person, organization, project, product, event, place, other
    const input = '---\ntype: entity\ntags: [person, project]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('tags:');
    expect(result).toContain('person');
  });

  it('collects and preserves concept tags from inline array', () => {
    // Concept valid tags: theory, method, field, term, other
    const input = '---\ntype: concept\ntags: [method, theory]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'concept');
    expect(result).toContain('method');
    expect(result).toContain('theory');
  });

  it('collects and preserves aliases from inline array', () => {
    const input = '---\ntype: concept\naliases: [CoT, 思维链]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'concept');
    expect(result).toContain('aliases:');
    expect(result).toContain('CoT');
    expect(result).toContain('思维链');
  });

  it('collects aliases from YAML continuation format', () => {
    const input = '---\ntype: concept\naliases:\n  - CoT\n  - 思维链\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'concept');
    expect(result).toContain('aliases:');
    expect(result).toContain('CoT');
    expect(result).toContain('思维链');
  });

  it('preserves reviewed field', () => {
    const input = '---\ntype: entity\nreviewed: true\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('reviewed: true');
  });

  // Reviewed-guard: a user has explicitly marked this page as reviewed.
  // Their tag intent (including empty tags — silence is a choice) must be
  // honored. The function should NOT auto-fill `tags: [other]` / `[term]`
  // when reviewed. Aligns with lint-fixes.ts:439 (skip reviewed) and
  // page-factory.ts:288/308 (reviewed = minimal append).
  it('reviewed-guard: does NOT auto-fill tags fallback when fm.reviewed is true', () => {
    const input = '---\ntype: entity\nreviewed: true\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).not.toContain('tags: [other]');
    expect(result).not.toContain('tags: [term]');
    // The function short-circuits before adding a tags line, so no
    // tags field is emitted at all when the page has reviewed:true.
    expect(result).not.toMatch(/^tags:/m);
  });

  it('reviewed-guard: still strips LLM-hallucinated dates on reviewed pages', () => {
    // The reviewed-guard protects user intent (tags / type / aliases) but
    // date fields are programmatic — a hallucinated "created: 2025-13-99"
    // must still be normalized to today. Safety > user intent on dates.
    const input = '---\ntype: entity\nreviewed: true\ncreated: 2025-13-99\nupdated: 2099-99-99\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    const today = new Date().toISOString().split('T')[0];
    expect(result).toContain('reviewed: true');
    expect(result).toContain(`created: ${today}`);
    expect(result).not.toContain('2025-13-99');
    expect(result).not.toContain('2099-99-99');
  });

  it('reviewed-guard: preserves v6 out-of-vocab intent for reviewed pages', () => {
    // If the LLM previously emitted an out-of-vocab tag and the user
    // accepted it (reviewed: true), we must NOT silently drop the
    // tag in a future retag/merge call. This is the v6 promise for
    // reviewed pages specifically.
    const input = '---\ntype: entity\nreviewed: true\ntags: [Mikrobiologie]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('Mikrobiologie');
  });

  it('reviewed-guard: is a no-op for non-reviewed pages (control test)', () => {
    // No reviewed: true → existing behavior preserved.
    // v1.18.0 actual behavior: when LLM doesn't emit tags (no
    // `tags:` line in input), the function does NOT write a tags
    // line at all. The fallback `[other]` only fires when the LLM
    // explicitly emitted `tags: []` (a non-empty-but-empty array).
    const input = '---\ntype: entity\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    // No tags line emitted when LLM didn't speak.
    expect(result).not.toMatch(/^tags:/m);
  });

  it('reviewed-guard: stops fallback when user explicitly emptied tags', () => {
    // User sets reviewed: true AND tags: []. LLM might re-emit
    // tags: [] (which would normally trigger fallback to [other]).
    // The reviewed-guard suppresses the fallback — silence is the
    // user's choice, not a default-fill opportunity.
    const input = '---\ntype: entity\nreviewed: true\ntags: []\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).not.toContain('tags: [other]');
    expect(result).not.toContain('tags: [term]');
  });

  it('non-reviewed page with empty tags array emits empty tags field, not fallback', () => {
    // Fix #114: explicit `tags: []` emits `tags:` (empty) rather than
    // silently overwriting with DEFAULT_ENTITY_TAG. User intent must win.
    const input = '---\ntype: entity\ntags: []\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toMatch(/\ntags:\s*(\n|$)/);
    expect(result).not.toContain('tags: [other]');
  });

  it('preserves created but forces updated to today', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-05-18\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    const today = new Date().toISOString().split('T')[0];
    expect(result).toContain('created: 2026-01-01');
    expect(result).toContain(`updated: ${today}`);
    expect(result).not.toContain('updated: 2026-05-18');
  });

  it('ensures blank line before body', () => {
    const input = '---\ntype: entity\n---\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('---\n\nBody');
  });

  it('keeps out-of-vocab tags and logs a debug note (Issue #85 v6 preserves LLM intent)', () => {
    // v6 behavior change: we no longer silently drop tags that the
    // validator does not recognize. The LLM's output is preserved
    // (with a console.debug note) so the user can see exactly what
    // the model produced and decide whether to expand their custom
    // vocabulary.
    const input = '---\ntype: entity\ntags: [person, invalid_tag]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('person');
    expect(result).toContain('invalid_tag'); // preserved since v6
  });

  it('uses fallback tag only when no tags at all are collected', () => {
    // v6: if the LLM emitted a non-empty tags array (even with all
    // unrecognized values), we keep them instead of falling back to
    // DEFAULT_ENTITY_TAG. The fallback only kicks in when the tags
    // array is genuinely empty.
    const input = '---\ntype: entity\ntags: [invalid_tag]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('invalid_tag');
    expect(result).not.toContain('tags: [other]');
  });

  it('emits empty tags field rather than forcing a default when tags array is empty', () => {
    // When a page has tags: [] (genuinely empty), emit tags: (empty) rather than
    // silently overwriting with DEFAULT_ENTITY_TAG. User intent must win. (#114)
    const input = '---\ntype: entity\ntags: []\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toMatch(/\ntags:\s*(\n|$)/);
    expect(result).not.toContain('tags: [other]');
  });

  it('preserves existing created but forces updated to today', () => {
    const input = '---\ntype: entity\ncreated: 2025-03-20\nupdated: 2024-12-01\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    const today = new Date().toISOString().split('T')[0];
    expect(result).toContain('created: 2025-03-20');
    expect(result).toContain(`updated: ${today}`);
    expect(result).not.toContain('updated: 2024-12-01');
  });

  it('adds created/updated when missing from frontmatter', () => {
    const input = '---\ntype: entity\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    const today = new Date().toISOString().split('T')[0];
    expect(result).toContain(`created: ${today}`);
    expect(result).toContain(`updated: ${today}`);
  });
});

describe('serializeFrontmatter', () => {
  it('emits fields in canonical order: type, created, updated, passthrough, sources, tags, reviewed, aliases', () => {
    const block = serializeFrontmatter(
      {
        type: 'entity',
        created: '2026-01-01',
        updated: '2026-07-04',
        sources: ['[[sources/a]]'],
        tags: ['person'],
        reviewed: true,
        aliases: ['Alt'],
      },
      { passthroughLines: ['supersedes: "[[sources/old]]"'], tagStyle: 'block' }
    );
    const order = ['type:', 'created:', 'updated:', 'supersedes:', 'sources:', 'tags:', 'reviewed:', 'aliases:']
      .map(k => block.indexOf(k));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every(i => i !== -1)).toBe(true);
  });

  it('block vs inline tag style', () => {
    const fm = { created: '2026-01-01', updated: '2026-07-04', tags: ['method', 'theory'] };
    expect(serializeFrontmatter(fm, { tagStyle: 'block' })).toContain('tags:\n  - "method"\n  - "theory"');
    expect(serializeFrontmatter(fm, { tagStyle: 'inline' })).toContain('tags: [method, theory]');
  });

  it('emits a bare tags: line only when emitEmptyTags is set', () => {
    const fm = { created: '2026-01-01', updated: '2026-07-04', tags: [] as string[] };
    expect(serializeFrontmatter(fm, { emitEmptyTags: true })).toContain('\ntags:\n');
    expect(serializeFrontmatter(fm, { emitEmptyTags: false })).not.toMatch(/\ntags:/);
  });

  it('dedups aliases, keeping first occurrence and dropping empties', () => {
    const block = serializeFrontmatter({
      created: '2026-01-01', updated: '2026-07-04', aliases: ['A', 'A', '', 'B'],
    });
    expect(block.match(/- "A"/g)?.length).toBe(1);
    expect(block).toContain('- "B"');
  });

  it('omits sources/tags/aliases when absent, and omits type when undefined', () => {
    const block = serializeFrontmatter({ created: '2026-01-01', updated: '2026-07-04' });
    expect(block).toBe('---\ncreated: 2026-01-01\nupdated: 2026-07-04\n---');
  });
});

describe('mergeFrontmatter', () => {
  const today = new Date().toISOString().split('T')[0];

  it('returns body as-is when no frontmatter exists', () => {
    const input = '# Just content\nNo frontmatter';
    const result = mergeFrontmatter(input, 'sources/test.md');
    expect(result.wasMerged).toBe(false);
    expect(result.frontmatter).toBe('');
    expect(result.body).toBe(input);
  });

  it('preserves type and adds source', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test.md');
    expect(result.frontmatter).toContain('type: entity');
    expect(result.frontmatter).toContain('[[sources/test.md]]');
    expect(result.wasMerged).toBe(true);
  });

  it('preserves created date', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test.md');
    expect(result.frontmatter).toContain('created: 2026-01-01');
  });

  it('updates updated date to today', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test.md');
    expect(result.frontmatter).toContain(`updated: ${today}`);
  });

  it('merges sources with deduplication', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\nsources: ["[[sources/test]]"]\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test');
    expect(result.frontmatter).toContain('[[sources/test]]');
    expect(result.frontmatter).toContain('sources:');
  });

  it('preserves existing tags', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\ntags: [method, theory]\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test.md');
    expect(result.frontmatter).toContain('method');
    expect(result.frontmatter).toContain('theory');
  });

  it('preserves existing aliases', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\naliases: ["CoT", "思维链"]\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test.md');
    expect(result.frontmatter).toContain('CoT');
    expect(result.frontmatter).toContain('思维链');
  });

  it('preserves reviewed flag', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\nreviewed: true\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test.md');
    expect(result.frontmatter).toContain('reviewed: true');
  });

  it('normalizes wiki-link format in sources', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\nsources: ["[[sources/old]]"]\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/new');
    expect(result.frontmatter).toContain('[[sources/old]]');
    expect(result.frontmatter).toContain('[[sources/new]]');
  });

  it('deduplicates when new source matches existing plain path source', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\nsources: ["sources/test"]\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/test');
    const count = (result.frontmatter.match(/- "\[\[sources\/test\]\]"/g) || []).length;
    expect(count).toBe(1);
  });

  it('deduplicates when new source matches existing wikilink source', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\nsources: ["[[sources/existing]]"]\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/existing');
    const count = (result.frontmatter.match(/sources\/existing/g) || []).length;
    expect(count).toBe(1);
  });

  it('handles empty sources array gracefully', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-01-01\nsources: []\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/new');
    expect(result.frontmatter).toContain('[[sources/new]]');
  });

  it('deduplicates repeated aliases (parity with enforceFrontmatterConstraints)', () => {
    const input = '---\ntype: concept\ncreated: 2026-01-01\nupdated: 2026-01-01\naliases:\n  - "UPF"\n  - "Ultra-processed food"\n  - "UPF"\n  - "Ultra-processed food"\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/new');
    expect((result.frontmatter.match(/- "UPF"/g) || []).length).toBe(1);
    expect((result.frontmatter.match(/- "Ultra-processed food"/g) || []).length).toBe(1);
  });

  it('drops empty-string aliases', () => {
    const input = '---\ntype: concept\ncreated: 2026-01-01\nupdated: 2026-01-01\naliases:\n  - "Foo"\n  - ""\n---\n\nBody';
    const result = mergeFrontmatter(input, 'sources/new');
    expect(result.frontmatter).toContain('- "Foo"');
    expect(result.frontmatter).not.toContain('- ""');
  });
});

describe('preserveFrontmatterReviewTag', () => {
  it('returns newContent as-is when original is not reviewed', () => {
    const orig = '---\ntype: entity\n---\n\nBody';
    const newC = '---\ntype: entity\n---\n\nUpdated body';
    expect(preserveFrontmatterReviewTag(orig, newC)).toBe(newC);
  });

  it('injects reviewed: true when original has reviewed flag but new lacks it', () => {
    const orig = '---\ntype: entity\nreviewed: true\n---\n\nBody';
    const newC = '---\ntype: entity\n---\n\nUpdated body';
    const result = preserveFrontmatterReviewTag(orig, newC);
    expect(result).toContain('reviewed: true');
    expect(result).toContain('Updated body');
  });

  it('does not duplicate reviewed when new already has it', () => {
    const orig = '---\ntype: entity\nreviewed: true\n---\n\nBody';
    const newC = '---\ntype: entity\nreviewed: true\n---\n\nUpdated body';
    const result = preserveFrontmatterReviewTag(orig, newC);
    // Should only appear once
    expect(result.match(/reviewed: true/g)?.length).toBe(1);
  });

  it('returns newContent as-is when it has no frontmatter', () => {
    const orig = '---\ntype: entity\nreviewed: true\n---\n\nBody';
    const newC = '# Just markdown\nNo frontmatter';
    expect(preserveFrontmatterReviewTag(orig, newC)).toBe(newC);
  });
});

describe('enforceFrontmatterConstraints: custom tag vocabulary (Issue #85)', () => {
  const entityContentWithCustomTag = `---
type: entity
tags: [person, Medical_Arzneimittel, bogus]
---

Body content`;

  it('accepts tags from custom vocabulary AND keeps out-of-vocab ones (Issue #85 v6)', () => {
    // v6 behavior change: in-vocab tags are accepted; out-of-vocab
    // tags are ALSO preserved (with a console.debug note) so the
    // user sees the LLM's full intent. Previously the validator
    // silently dropped out-of-vocab tags.
    const customSettings: Partial<LLMWikiSettings> = {
      tagVocabularyMode: 'custom',
      customEntityTags: 'person, organization, Medical_Arzneimittel'
    };
    const result = enforceFrontmatterConstraints(entityContentWithCustomTag, 'entity', customSettings as LLMWikiSettings);
    expect(result).toContain('Medical_Arzneimittel');
    expect(result).toContain('person');
    // "bogus" is also kept (v6 preserve-intent)
    expect(result).toContain('bogus');
  });

  it('falls back to default vocabulary when settings is omitted (backward compat)', () => {
    const content = `---
type: entity
tags: [person, bogus]
---

Body`;
    // No settings → default VALID_ENTITY_TAGS. v6 keeps both tags.
    const result = enforceFrontmatterConstraints(content, 'entity');
    expect(result).toContain('person');
    expect(result).toContain('bogus'); // preserved since v6
  });

  it('respects concept custom vocabulary (in-vocab kept; out-of-vocab also kept in v6)', () => {
    const content = `---
type: concept
tags: [theory, Arzneimittel/Neurologie, nonsense]
---

Body`;
    const customSettings: Partial<LLMWikiSettings> = {
      tagVocabularyMode: 'custom',
      customConceptTags: 'theory, Arzneimittel/Neurologie'
    };
    const result = enforceFrontmatterConstraints(content, 'concept', customSettings as LLMWikiSettings);
    expect(result).toContain('Arzneimittel/Neurologie');
    // v6: nonsense is also kept (preserve LLM intent)
    expect(result).toContain('nonsense');
  });
});

describe('enforceFrontmatterConstraints (Issue #85 v6 — preserve LLM intent)', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', openAICodexSecretId: '', providerApiKeySecretId: 'karpathywiki-provider-api-key', baseUrl: '', model: 'claude-sonnet-4-6',
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

  it('retains out-of-vocab tags (does NOT silently drop them)', () => {
    // User has default vocabulary (person/organization/…), LLM emits
    // an extra tag "Medical_Arzneimittel" that is not in the default
    // list. v6: keep it so the user can see what the LLM produced and
    // decide whether to expand their vocabulary.
    const content = `---
type: entity
tags: [person, organization, Medical_Arzneimittel]
---

Body`;
    const result = enforceFrontmatterConstraints(content, 'entity', baseSettings);
    expect(result).toContain('person');
    expect(result).toContain('organization');
    expect(result).toContain('Medical_Arzneimittel'); // previously dropped
  });

  it('retains out-of-vocab tags when mode=custom with a narrow vocabulary', () => {
    const customSettings: LLMWikiSettings = { ...baseSettings,
      tagVocabularyMode: 'custom',
      customEntityTags: 'person, organization',
    };
    const content = `---
type: entity
tags: [person, project, company]
---

Body`;
    const result = enforceFrontmatterConstraints(content, 'entity', customSettings);
    // All 3 tags kept (project + company are not in custom vocab but
    // we still preserve them so the user sees the LLM's full intent).
    expect(result).toContain('person');
    expect(result).toContain('project');
    expect(result).toContain('company');
  });

  it('dedupes repeated tags across LLM output', () => {
    const content = `---
type: entity
tags: [person, person, person, organization]
---

Body`;
    const result = enforceFrontmatterConstraints(content, 'entity', baseSettings);
    const tagLine = result.split('\n').find(l => l.startsWith('tags:'))!;
    // Should be exactly one occurrence per unique tag
    expect(tagLine).toBe('tags: [person, organization]');
  });

  it('strips the pageType literal if LLM emitted it as a tag (e.g. tags: [entity, person])', () => {
    const content = `---
type: entity
tags: [entity, person]
---

Body`;
    const result = enforceFrontmatterConstraints(content, 'entity', baseSettings);
    const tagLine = result.split('\n').find(l => l.startsWith('tags:'))!;
    expect(tagLine).toBe('tags: [person]');
  });

  it('preserves nested-tag syntax (Arzneimittel/Neurologie) without splitting', () => {
    const customSettings: LLMWikiSettings = { ...baseSettings,
      tagVocabularyMode: 'custom',
      customEntityTags: 'person, Arzneimittel/Neurologie',
    };
    const content = `---
type: entity
tags: [person, Arzneimittel/Neurologie, organization]
---

Body`;
    const result = enforceFrontmatterConstraints(content, 'entity', customSettings);
    expect(result).toContain('Arzneimittel/Neurologie');
    // The out-of-vocab "organization" is still kept (v6 preserve LLM intent)
    expect(result).toContain('organization');
  });

  it('emits empty tags field when collectedTags is empty, not fallback tag', () => {
    // Fix #114: empty tags array → tags: (empty), not DEFAULT_ENTITY_TAG.
    const content = `---
type: entity
tags: []
---

Body`;
    const result = enforceFrontmatterConstraints(content, 'entity', baseSettings);
    expect(result).toMatch(/\ntags:\s*(\n|$)/);
    expect(result).not.toContain('tags: [other]');
  });
});
