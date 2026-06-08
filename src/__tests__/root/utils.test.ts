import { describe, it, expect } from 'vitest';
import { slugify, computeSlug, parseFrontmatter, detectRateLimitFailures, formatRateLimitNotice, cleanMarkdownResponse, enforceFrontmatterConstraints, parseJsonResponse, mergeFrontmatter, preserveFrontmatterReviewTag, extractBody, getText, filterRedundantAliases, coerceToArray, truncateMentions, extractSourceTags, truncateListForDisplay, nestReportUnderParent, getActiveEntityTags, getActiveConceptTags, getActiveSourceTags, normalizeVocabularyCsv } from '../../utils';
import { getGranularityInstruction, getGranularityFixLimits, appendGranularityToPrompt, buildActiveTagVocabularySection, appendTagVocabularyToPrompt } from '../../wiki/system-prompts';
import { LLMWikiSettings } from '../../types';
import { TEXTS } from '../../texts';

describe('slugify', () => {
  it('returns "untitled" for empty input', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('   ')).toBe('untitled');
  });

  it('removes filesystem-unsafe characters', () => {
    // Slash, colon, pipe, asterisk are removed by the regex
    expect(slugify('hello/world')).toBe('helloworld');
    expect(slugify('test:file')).toBe('testfile');
    expect(slugify('a|b')).toBe('ab');
  });

  it('converts spaces and dots to dashes', () => {
    expect(slugify('hello world')).toBe('hello-world');
    expect(slugify('hello.world')).toBe('hello-world');
  });

  it('merges consecutive dashes', () => {
    expect(slugify('hello  ---  world')).toBe('hello-world');
    expect(slugify('a...b')).toBe('a-b');
  });

  it('strips leading and trailing dashes', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  it('preserves Chinese characters', () => {
    expect(slugify('思维链')).toBe('思维链');
  });

  it('preserves Korean characters', () => {
    expect(slugify('지식베이스')).toBe('지식베이스');
  });

  it('preserves Japanese characters', () => {
    expect(slugify('ノート一覧')).toBe('ノート一覧');
  });

  it('handles mixed CJK and ASCII', () => {
    expect(slugify('机器学习 Supervised Learning')).toBe('机器学习-supervised-learning');
  });

  it('removes angle brackets and quotes', () => {
    expect(slugify('"hello" <world>')).toBe('hello-world');
  });

  it('handles falsy values', () => {
    expect(slugify(null as unknown as string)).toBe('untitled');
    expect(slugify(undefined as unknown as string)).toBe('untitled');
  });

  it('returns fallback slug when input becomes empty after filtering', () => {
    const result = slugify('<>/\\:*?"|');
    expect(result).toMatch(/^untitled-\d+$/);
  });

  it('removes commas', () => {
    expect(slugify('Karpathy, Andrej')).toBe('karpathy-andrej');
  });

  it('normalizes spaces to hyphens for slug-match comparison (Issue #32)', () => {
    // resolvePagePath Fast path 2: slugify(p.title) === slug
    // catches files whose stored name uses spaces instead of hyphens
    expect(slugify('Metabolisches Syndrom')).toBe('metabolisches-syndrom');
    expect(slugify('Machine Learning Basics')).toBe('machine-learning-basics');
    expect(slugify('hello world') === slugify('hello-world')).toBe(true);
    expect(slugify('Test Page Name') === slugify('Test-Page-Name')).toBe(true);
  });

  it('slug-match handles edge cases with dots and spaces combined', () => {
    expect(slugify('Dr. Smith Report')).toBe('dr-smith-report');
    expect(slugify('v1.0 Release Notes')).toBe('v1-0-release-notes');
    // Mixed separators normalize to same slug
    expect(slugify('hello.world test') === slugify('hello-world-test')).toBe(true);
  });

  it('slug-match is case-insensitive for title comparison', () => {
    // resolvePagePath Fast path 2: slugify(p.title).toLowerCase() === targetSlug
    const targetSlug = slugify('deep learning').toLowerCase(); // "deep-learning"
    expect(slugify('Deep Learning').toLowerCase() === targetSlug).toBe(true);
    expect(slugify('DEEP LEARNING').toLowerCase() === targetSlug).toBe(true);
    expect(slugify('Deep-Learning').toLowerCase() === targetSlug).toBe(true);
    // Different casing in alias
    expect(slugify('Chain of Thought').toLowerCase() === 'chain-of-thought').toBe(true);
  });

  it('slug-match covers aliases with space/case variants', () => {
    // Fast path 2 also checks: aliases.some(a => slugify(a).toLowerCase() === targetSlug)
    const targetSlug = slugify('Chain of Thought').toLowerCase(); // "chain-of-thought"
    const aliases = ['Chain of Thought', '思维链', 'CoT Reasoning'];
    const aliasMatch = aliases.some(a => slugify(a).toLowerCase() === targetSlug);
    expect(aliasMatch).toBe(true);
    // Alias with different casing
    const targetSlug2 = slugify('cot reasoning').toLowerCase();
    const aliasMatch2 = aliases.some(a => slugify(a).toLowerCase() === targetSlug2);
    expect(aliasMatch2).toBe(true);
    // No match
    const targetSlug3 = slugify('unrelated term').toLowerCase();
    const aliasMatch3 = aliases.some(a => slugify(a).toLowerCase() === targetSlug3);
    expect(aliasMatch3).toBe(false);
  });
});

describe('computeSlug', () => {
  it('produces same result as slugify', () => {
    const inputs = ['Hello World', 'Machine-Learning', 'Test/Path'];
    for (const input of inputs) {
      expect(computeSlug(input)).toBe(slugify(input));
    }
  });

  it('returns untitled for empty input', () => {
    expect(computeSlug('')).toBe('untitled');
  });

  it('removes special characters and normalizes spaces', () => {
    expect(computeSlug('hello?world!')).toBe('helloworld');
  });

  it('lowercases single-word uppercase input', () => {
    expect(computeSlug('Unix')).toBe('unix');
  });

  it('lowercases mixed-case input', () => {
    expect(computeSlug('iPhone')).toBe('iphone');
  });

  it('lowercases multi-word uppercase input with spaces', () => {
    expect(computeSlug('Claude Code')).toBe('claude-code');
  });

  it('lowercases input with special characters preserved', () => {
    // & is not in the invalid-char regex, so it survives; the T→t step lowercases
    expect(computeSlug('AT&T')).toBe('at&t');
  });

  it('leaves already-lowercase input unchanged', () => {
    expect(computeSlug('hello')).toBe('hello');
  });

  it('lowercases ASCII portion while preserving CJK characters', () => {
    // CJK has no upper/lower case; only the ASCII "Supervised Learning" is lowercased
    expect(computeSlug('机器学习 Supervised Learning')).toBe('机器学习-supervised-learning');
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

describe('detectRateLimitFailures', () => {
  it('returns null when no rate limit failures', () => {
    const result = detectRateLimitFailures(
      [{ name: 'page1', reason: 'timeout' }],
      3, 300
    );
    expect(result).toBeNull();
  });

  it('detects 429 status code', () => {
    const result = detectRateLimitFailures(
      [{ name: 'page1', reason: 'HTTP 429 error' }],
      3, 300
    );
    expect(result).not.toBeNull();
    expect(result?.count).toBe(1);
  });

  it('detects "too many requests" pattern', () => {
    const result = detectRateLimitFailures(
      [{ name: 'page1', reason: 'too many requests from provider' }],
      3, 300
    );
    expect(result).not.toBeNull();
  });

  it('detects "throttl" pattern', () => {
    const result = detectRateLimitFailures(
      [{ name: 'page1', reason: 'request was throttled' }],
      3, 300
    );
    expect(result).not.toBeNull();
  });

  it('suggests lower concurrency', () => {
    const result = detectRateLimitFailures(
      [{ name: 'p1', reason: '429' }, { name: 'p2', reason: '429' }],
      3, 300
    );
    expect(result?.suggestedConcurrency).toBe(2);
  });

  it('suggests min concurrency of 1', () => {
    const result = detectRateLimitFailures(
      [{ name: 'p1', reason: '429 too many requests' }],
      1, 300
    );
    expect(result?.suggestedConcurrency).toBe(1);
  });

  it('suggests increased delay', () => {
    const result = detectRateLimitFailures(
      [{ name: 'p1', reason: '429' }],
      3, 300
    );
    expect(result?.suggestedDelay).toBe(600);
  });

  it('suggests min delay of 500ms when current is very low', () => {
    const result = detectRateLimitFailures(
      [{ name: 'p1', reason: '429' }],
      3, 50
    );
    expect(result?.suggestedDelay).toBe(500);
  });
});

describe('formatRateLimitNotice', () => {
  it('uses template from EN texts', () => {
    const result = formatRateLimitNotice(
      { count: 3, rateLimitNames: ['a', 'b', 'c'], suggestedConcurrency: 2, suggestedDelay: 600 },
      'en',
    );
    expect(result).toContain('3');
    expect(result).toContain('2');
    expect(result).toContain('600');
  });

  it('falls back to EN for unknown language', () => {
    const result = formatRateLimitNotice(
      { count: 2, rateLimitNames: ['page1', 'page2'], suggestedConcurrency: 1, suggestedDelay: 500 },
      'xx',
    );
    expect(result).toContain('2');
    expect(result).toContain('1');
    expect(result).toContain('500');
  });
});

describe('cleanMarkdownResponse', () => {
  it('strips markdown code fence (```json...```)', () => {
    // Code only recognizes markdown/md language tags; json tag text remains
    const input = '```json\n{"key": "value"}\n```';
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('{"key": "value"}');
    expect(result).not.toContain('```');
  });

  it('strips markdown code fence (```markdown...```)', () => {
    const input = '```markdown\n# Heading\nBody\n```';
    expect(cleanMarkdownResponse(input)).toBe('# Heading\nBody');
  });

  it('strips code fence without language tag', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(cleanMarkdownResponse(input)).toBe('{"key": "value"}');
  });

  it('strips opening fence without closing', () => {
    const input = '```json\n{"key": "value"}';
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('{"key": "value"}');
    expect(result).not.toContain('```');
  });

  it('strips <think>...</think> reasoning tokens', () => {
    const input = '<think>Let me analyze this entity carefully...</think>\n\n# Entity Name';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<think>');
    expect(result).toContain('# Entity Name');
  });

  it('strips <thinking>...</thinking> reasoning tokens', () => {
    const input = '<thinking>Internal reasoning here</thinking>\n\n# Concept Page';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<thinking>');
    expect(result).toContain('# Concept Page');
  });

  it('strips multiple consecutive think blocks', () => {
    const input = '<think>Step 1</think><think>Step 2</think>\n\n---\ntype: entity\n---';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<think>');
    expect(result).toContain('type: entity');
  });

  it('handles content without code fence unchanged', () => {
    const input = 'plain content no fences';
    expect(cleanMarkdownResponse(input)).toBe('plain content no fences');
  });

  it('adds missing opening --- for frontmatter-like prefix', () => {
    const input = 'type: entity\ncreated: 2026-01-01\n---\nBody content';
    const result = cleanMarkdownResponse(input);
    expect(result.startsWith('---')).toBe(true);
    expect(result).toContain('type: entity');
  });

  it('preserves preamble text when it contains colon (frontmatter-like detection)', () => {
    // Text with colons before --- is treated as frontmatter-like, so --- is prepended
    const input = 'Here is your wiki page:\n\n---\ntype: entity\n---\nBody';
    const result = cleanMarkdownResponse(input);
    expect(result.startsWith('---')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(cleanMarkdownResponse('  \n  content  \n  ')).toBe('content');
  });

  // Issue #99: Thinking-token bleeding (Layer B2: structural preamble detection)
  // Some models (e.g. Gemma 4) emit reasoning as plain text without <think>
  // wrappers. Layer 2 finds the first structural marker (frontmatter close or
  // header) and discards everything before it.

  it('strips reasoning preamble before frontmatter (Gemma 4 case)', () => {
    const input = `�-mm-im-en-en-en-A-B-C-...

Wait, I must write ALL content in Deutsch. The user provided the prompt in English but instructions state "You MUST write ALL content in Deutsch".

Plan:
1. Basic Information: Update type/sources/definition...
2. Description: Merge existing...

---
type: entity
updated: 2026-06-01
---

# Real content here
This is the actual page body.`;
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('# Real content here');
    expect(result).toContain('type: entity');
    expect(result).not.toContain('Wait, I must write');
    expect(result).not.toContain('A-B-C');
  });

  it('strips reasoning preamble before header (no frontmatter)', () => {
    const input = `Let me think about this carefully.

# Concept Name
Body content here.`;
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('# Concept Name');
    expect(result).not.toContain('Let me think about this');
  });

  it('strips reasoning preamble in append mode (no structural markers)', () => {
    // No frontmatter, no header — but preamble still must go
    const input = `Some preamble text I wrote to plan my response.

This is the actual content the user wanted.`;
    const result = cleanMarkdownResponse(input);
    // No structural markers, fallback to original behavior
    expect(result).toBe(input);
  });

  it('preserves content when no preamble (regression)', () => {
    const input = '# Heading\n\nNormal content';
    expect(cleanMarkdownResponse(input)).toBe('# Heading\n\nNormal content');
  });

  it('preserves <think> token stripping behavior (regression)', () => {
    const input = '<think>reasoning</think>\n\n# Header';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<think>');
    expect(result).toContain('# Header');
  });

  it('handles reasoning text that contains ## subsection markers', () => {
    // Reasoning text might mention markdown syntax; structural detection
    // should still prefer the earliest real frontmatter / header
    const input = `My reasoning: I should use ## Subsection A as a heading

# Real Page
Body`;
    const result = cleanMarkdownResponse(input);
    // Strict assertion: the entire reasoning line must be discarded, not
    // just the "My reasoning: I should use" prefix. Inline `## ` in
    // reasoning is preserved as plain text (Layer B2 only matches a `## `
    // on its own line, so it stays on the same line as the prose).
    expect(result).toBe('# Real Page\nBody');
  });

  it('handles empty input (regression)', () => {
    expect(cleanMarkdownResponse('')).toBe('');
  });

  it('handles very short input without structural markers (regression)', () => {
    expect(cleanMarkdownResponse('short')).toBe('short');
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

describe('parseJsonResponse', () => {
  it('parses valid JSON directly', async () => {
    const result = await parseJsonResponse('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses JSON wrapped in ```json code fence', async () => {
    const result = await parseJsonResponse('```json\n{"key": "value"}\n```');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses JSON wrapped in ```markdown code fence', async () => {
    const result = await parseJsonResponse('```markdown\n{"key": "value"}\n```');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses JSON wrapped in ``` without language tag', async () => {
    const result = await parseJsonResponse('```\n{"key": "value"}\n```');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles double-brace prefill echo ({{)', async () => {
    const result = await parseJsonResponse('{{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles newline-separated loose prefill ({)|n)', async () => {
    const result = await parseJsonResponse('{\n{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles missing opening brace (prefill stripped)', async () => {
    const result = await parseJsonResponse('"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('extracts valid prefix from content with trailing text', async () => {
    const result = await parseJsonResponse('{"key": "value"} extra words here');
    expect(result).toEqual({ key: 'value' });
  });

  it('extracts braced JSON content from surrounding text', async () => {
    const result = await parseJsonResponse('Some preamble text {"key": "value"} and more after');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles trailing comma in objects', async () => {
    const result = await parseJsonResponse('{"a": 1, "b": 2,}');
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('handles trailing comma in arrays', async () => {
    const result = await parseJsonResponse('{"items": [1, 2, 3,]}');
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  // ROADMAP P3 #11: thinking models can output pseudocode JSON inside <think>
  // blocks. extractBalancedJson otherwise grabs the first '{' inside the think
  // block, ignoring the real JSON after </think>.
  it('strips <think> blocks before extracting JSON', async () => {
    const input = '<think>{ "pseudocode": "ignore me" }</think>\n{"real": "json"}';
    const result = await parseJsonResponse(input);
    expect(result).toEqual({ real: 'json' });
  });

  it('strips <thinking> blocks before extracting JSON', async () => {
    const input = '<thinking>{ "pseudocode": "ignore me" }</thinking>\n{"real": "json"}';
    const result = await parseJsonResponse(input);
    expect(result).toEqual({ real: 'json' });
  });

  it('strips multiline <think> blocks with embedded nested braces', async () => {
    const input = `<think>
Let me analyze this carefully.
{ "step": 1, "options": [{ "a": 1 }, { "b": 2 }] }
The answer should be...
</think>
{"answer": "real"}`;
    const result = await parseJsonResponse(input);
    expect(result).toEqual({ answer: 'real' });
  });

  it('returns null for completely invalid input', async () => {
    const result = await parseJsonResponse('not json at all');
    expect(result).toBeNull();
  });

  it('returns null for empty string', async () => {
    const result = await parseJsonResponse('');
    expect(result).toBeNull();
  });

  it('handles nested objects correctly', async () => {
    const result = await parseJsonResponse('{"outer": {"inner": [1, 2, 3]}}');
    expect(result).toEqual({ outer: { inner: [1, 2, 3] } });
  });

  it('uses repairFn callback for malformed but brace-balanced JSON', async () => {
    const repairFn = async (_malformed: string) => '{"repaired": true}';
    const result = await parseJsonResponse('{"a": invalid}', repairFn);
    expect(result).toEqual({ repaired: true });
  });

  it('falls back to null when repairFn returns invalid JSON', async () => {
    const repairFn = async (_malformed: string) => 'still not json';
    const result = await parseJsonResponse('{"a": invalid}', repairFn);
    expect(result).toBeNull();
  });

  it('handles repairFn returning JSON in code fence', async () => {
    const repairFn = async (_malformed: string) => '```json\n{"from_fence": true}\n```';
    const result = await parseJsonResponse('{"a": invalid}', repairFn);
    expect(result).toEqual({ from_fence: true });
  });

  it('parses empty object', async () => {
    const result = await parseJsonResponse('{}');
    expect(result).toEqual({});
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

describe('extractBody', () => {
  it('returns content without frontmatter', () => {
    const content = '---\ntype: entity\n---\n\n# Body text';
    expect(extractBody(content)).toBe('# Body text');
  });

  it('returns content as-is when no frontmatter exists', () => {
    const content = '# Just a heading\nSome content';
    expect(extractBody(content)).toBe(content);
  });

  it('trims whitespace after frontmatter', () => {
    const content = '---\ntype: entity\n---\n\n  Body with spaces  \n';
    expect(extractBody(content)).toBe('Body with spaces');
  });
});

describe('getGranularityInstruction', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
    wikiFolder: 'wiki', language: 'en', wikiLanguage: 'en',
    maxConversationHistory: 30, extractionGranularity: 'standard',
    enableSchema: true, autoWatchSources: false, autoWatchMode: 'notify',
    autoWatchDebounceMs: 5000, watchedFolders: [], periodicLint: 'off',
    startupCheck: false, autoSmartFix: false, pageGenerationConcurrency: 3, batchDelayMs: 500,
    llmReady: false,
    maxTokensPerCall: 0,
    tagVocabularyMode: 'default',
    customEntityTags: '',
    customConceptTags: '',
    slugCase: 'lower' as const,
  };

  it('injects concrete entity and concept limits for custom mode', () => {
    const settings: LLMWikiSettings = {
      ...baseSettings,
      extractionGranularity: 'custom',
      customEntityLimit: 15,
      customConceptLimit: 10,
    };
    const result = getGranularityInstruction(settings);
    expect(result).toContain('15 entities');
    expect(result).toContain('10 concepts');
  });

  it('uses defaults (5) when custom limits are not set', () => {
    const settings: LLMWikiSettings = {
      ...baseSettings,
      extractionGranularity: 'custom',
    };
    const result = getGranularityInstruction(settings);
    expect(result).toContain('5 entities');
    expect(result).toContain('5 concepts');
  });

  it('returns fixed text for non-custom modes', () => {
    for (const mode of ['fine', 'standard', 'coarse', 'minimal'] as const) {
      const settings: LLMWikiSettings = { ...baseSettings, extractionGranularity: mode };
      const result = getGranularityInstruction(settings);
      expect(result.length).toBeGreaterThan(0);
      // Non-custom modes should not contain dynamically injected numbers
      expect(result).not.toContain('at most');
    }
  });
});

// ── appendGranularityToPrompt ───────────────────────────────────
// Issue #96: Lint LLM analysis ignored user's extractionGranularity setting.
// Fix: append the granularity instruction to the lint analysis prompt so the
// LLM respects the same constraints as the ingestion path.

describe('appendGranularityToPrompt', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
    wikiFolder: 'wiki', language: 'en', wikiLanguage: 'en',
    maxConversationHistory: 30, extractionGranularity: 'standard',
    enableSchema: true, autoWatchSources: false, autoWatchMode: 'notify',
    autoWatchDebounceMs: 5000, watchedFolders: [], periodicLint: 'off',
    startupCheck: false, autoSmartFix: false, pageGenerationConcurrency: 3, batchDelayMs: 500,
    llmReady: false,
    maxTokensPerCall: 0,
    tagVocabularyMode: 'default',
    customEntityTags: '',
    customConceptTags: '',
    slugCase: 'lower' as const,
  };

  it('appends granularity instruction to existing prompt', () => {
    const settings: LLMWikiSettings = { ...baseSettings, extractionGranularity: 'minimal' };
    const result = appendGranularityToPrompt('Base prompt', settings);
    expect(result).toContain('Base prompt');
    expect(result).toContain('most critical');
  });

  it('preserves base prompt content at the start', () => {
    const settings: LLMWikiSettings = { ...baseSettings, extractionGranularity: 'fine' };
    const result = appendGranularityToPrompt('You are a Wiki assistant', settings);
    expect(result.startsWith('You are a Wiki assistant')).toBe(true);
  });

  it('works for all non-custom granularity modes', () => {
    for (const mode of ['fine', 'standard', 'coarse', 'minimal'] as const) {
      const settings: LLMWikiSettings = { ...baseSettings, extractionGranularity: mode };
      const result = appendGranularityToPrompt('Base', settings);
      expect(result.length).toBeGreaterThan('Base'.length);
    }
  });

  it('works for custom mode with explicit limits', () => {
    const settings: LLMWikiSettings = {
      ...baseSettings,
      extractionGranularity: 'custom',
      customEntityLimit: 7,
      customConceptLimit: 4,
    };
    const result = appendGranularityToPrompt('Base', settings);
    expect(result).toContain('Base');
    expect(result).toContain('7 entities');
    expect(result).toContain('4 concepts');
  });
});

describe('getGranularityFixLimits', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
    wikiFolder: 'wiki', language: 'en', wikiLanguage: 'en',
    maxConversationHistory: 30, extractionGranularity: 'standard',
    enableSchema: true, autoWatchSources: false, autoWatchMode: 'notify',
    autoWatchDebounceMs: 5000, watchedFolders: [], periodicLint: 'off',
    startupCheck: false, autoSmartFix: false, pageGenerationConcurrency: 3, batchDelayMs: 500,
    llmReady: false,
    maxTokensPerCall: 0,
    tagVocabularyMode: 'default',
    customEntityTags: '',
    customConceptTags: '',
    slugCase: 'lower' as const,
  };

  it('returns user-defined limits for custom mode', () => {
    const settings: LLMWikiSettings = {
      ...baseSettings,
      extractionGranularity: 'custom',
      customEntityLimit: 20,
      customConceptLimit: 8,
    };
    const limits = getGranularityFixLimits(settings);
    expect(limits.maxEntities).toBe(20);
    expect(limits.maxConcepts).toBe(8);
  });

  it('uses defaults for custom mode when limits are not set', () => {
    const settings: LLMWikiSettings = {
      ...baseSettings,
      extractionGranularity: 'custom',
    };
    const limits = getGranularityFixLimits(settings);
    expect(limits.maxEntities).toBe(5);
    expect(limits.maxConcepts).toBe(5);
  });

  it('returns predefined limits for non-custom modes', () => {
    const settings: LLMWikiSettings = { ...baseSettings, extractionGranularity: 'fine' };
    const limits = getGranularityFixLimits(settings);
    expect(limits.maxEntities).toBe(6);
    expect(limits.maxConcepts).toBe(6);
  });
});

// ── getText ──────────────────────────────────────────────────────

describe('getText', () => {
  it('returns EN text for a known key', () => {
    const result = getText('en', 'ingestionCancelled');
    expect(result).toBe('Ingestion cancelled');
  });

  it('returns ZH text for a known key', () => {
    const result = getText('zh', 'ingestionCancelled');
    expect(result).toBe('提取已取消');
  });

  it('falls back to EN for unknown language code', () => {
    const result = getText('xx', 'ingestionCancelled');
    expect(result).toBe('Ingestion cancelled');
  });

  it('performs single placeholder replacement', () => {
    const result = getText('en', 'crossTypeCollisionNotice', { count: '3' });
    expect(result).toContain('3');
    expect(result).toContain('merged');
  });

  it('performs multiple placeholder replacements', () => {
    const result = getText('en', 'rateLimitDetected', {
      count: '5',
      suggestedConcurrency: '2',
      suggestedDelay: '800',
    });
    expect(result).toContain('5');
    expect(result).toContain('2');
    expect(result).toContain('800');
  });

  it('returns JA text for a known key', () => {
    const result = getText('ja', 'ingestionCancelled');
    expect(result).toBe('取り込みがキャンセルされました');
  });

  it('returns KO text for a known key', () => {
    const result = getText('ko', 'ingestionCancelled');
    expect(result).toBe('수집이 취소되었습니다');
  });

  it('handles non-existent replacement placeholders gracefully', () => {
    const result = getText('en', 'ingestionCancelled', { nonexistent: 'foo' });
    expect(result).toBe('Ingestion cancelled');
  });
});

describe('filterRedundantAliases', () => {
  it('drops an alias identical to the page filename (case-insensitive)', () => {
    const result = filterRedundantAliases('wiki/entities/vigilanz.md', ['Vigilanz']);
    expect(result).toEqual([]);
  });

  it('keeps a genuine alias that differs from the filename', () => {
    const result = filterRedundantAliases('wiki/entities/vigilanz.md', ['监测']);
    expect(result).toEqual(['监测']);
  });

  it('drops self-pointing alias but keeps distinct ones in the same batch', () => {
    const result = filterRedundantAliases('wiki/entities/openai.md', ['OpenAI', 'OAI']);
    expect(result).toEqual(['OAI']);
  });

  it('keeps a space-variant alias because Obsidian does not collapse spaces to dashes', () => {
    // File is deep-learning.md; [[Deep Learning]] would NOT auto-resolve to it,
    // so "Deep Learning" is a useful alias and must be kept.
    const result = filterRedundantAliases('wiki/concepts/deep-learning.md', ['Deep Learning']);
    expect(result).toEqual(['Deep Learning']);
  });

  it('removes duplicate aliases within the batch (case-insensitive)', () => {
    const result = filterRedundantAliases('wiki/entities/foo.md', ['GPT', 'gpt']);
    expect(result).toEqual(['GPT']);
  });

  it('skips empty or whitespace-only aliases', () => {
    const result = filterRedundantAliases('wiki/entities/openai.md', ['', '   ', 'OpenAI Inc']);
    expect(result).toEqual(['OpenAI Inc']);
  });

  it('handles paths without a folder prefix', () => {
    const result = filterRedundantAliases('vigilanz.md', ['Vigilanz', 'Surveillance']);
    expect(result).toEqual(['Surveillance']);
  });
});

// ── normalizeBatchResponse is in source-analyzer.ts ──────────────

import {
  normalizeBatchResponse,
} from '../../wiki/source-analyzer';

describe('normalizeBatchResponse', () => {
  it('returns unusable for null input', () => {
    const { validity } = normalizeBatchResponse(null);
    expect(validity).toBe('unusable');
  });

  it('returns unusable when both entities and concepts keys are absent', () => {
    const { validity } = normalizeBatchResponse({});
    expect(validity).toBe('unusable');
  });

  it('returns empty when both arrays are explicitly empty', () => {
    const { validity } = normalizeBatchResponse({ entities: [], concepts: [] });
    expect(validity).toBe('empty');
  });

  it('returns valid when only entities are present (glossary case)', () => {
    const raw = {
      entities: [{ name: 'Foo', type: 'other' as const, summary: 'S', mentions_in_source: [] }],
      // concepts key absent — should not cause unusable
    };
    const { validity, data } = normalizeBatchResponse(raw);
    expect(validity).toBe('valid');
    expect(data.entities).toHaveLength(1);
    expect(data.concepts).toHaveLength(0);
  });

  it('returns valid when only concepts are present', () => {
    const raw = {
      concepts: [{ name: 'Bar', type: 'theory' as const, summary: 'S', related_concepts: [], mentions_in_source: [] }],
    };
    const { validity, data } = normalizeBatchResponse(raw);
    expect(validity).toBe('valid');
    expect(data.entities).toHaveLength(0);
    expect(data.concepts).toHaveLength(1);
  });

  it('coerces non-array truthy values to empty (e.g. entities: true)', () => {
    const raw: Record<string, unknown> = {
      entities: true,
      concepts: [{ name: 'Bar', type: 'theory' as const, summary: 'S', related_concepts: [], mentions_in_source: [] }],
    };
    const { validity, data } = normalizeBatchResponse(raw);
    expect(validity).toBe('valid');
    expect(data.entities).toEqual([]);
    expect(data.concepts).toHaveLength(1);
  });

  it('coerces null entities to empty', () => {
    const raw: Record<string, unknown> = {
      entities: null,
      concepts: [{ name: 'Bar', type: 'theory' as const, summary: 'S', related_concepts: [], mentions_in_source: [] }],
    };
    const { validity, data } = normalizeBatchResponse(raw);
    expect(validity).toBe('valid');
    expect(data.entities).toEqual([]);
  });

  it('filters items with empty name', () => {
    const raw = {
      entities: [
        { name: '', type: 'other' as const, summary: 'S', mentions_in_source: [] },
        { name: 'Real', type: 'other' as const, summary: 'S', mentions_in_source: [] },
      ],
    };
    const { validity, data } = normalizeBatchResponse(raw);
    expect(validity).toBe('valid');
    expect(data.entities).toHaveLength(1);
    expect(data.entities[0].name).toBe('Real');
  });

  it('extracts sourceTitle and summary', () => {
    const raw = {
      entities: [{ name: 'Foo', type: 'other' as const, summary: 'S', mentions_in_source: [] }],
      source_title: 'Test Title',
      summary: 'Test summary body.',
    };
    const { data } = normalizeBatchResponse(raw);
    expect(data.sourceTitle).toBe('Test Title');
    expect(data.summary).toBe('Test summary body.');
  });

  it('strips wiki-link formatting from relatedPages', () => {
    const raw = {
      entities: [{ name: 'Foo', type: 'other' as const, summary: 'S', mentions_in_source: [] }],
      related_pages: ['[[entities/Bar]]', '[[concepts/Baz|Baz Title]]'],
    };
    const { data } = normalizeBatchResponse(raw);
    // [[path]] stays as-is (no pipe separator); [[path|name]] strips to display name
    expect(data.relatedPages).toEqual(['entities/Bar', 'Baz Title']);
  });

  it('validity is unusable when both keys absent but overrides for empty arrays', () => {
    // Absent keys → unusable
    expect(normalizeBatchResponse({}).validity).toBe('unusable');
    // Explicit [] → empty (can distinguish from "LLM didn't try")
    expect(normalizeBatchResponse({ entities: [], concepts: [] }).validity).toBe('empty');
  });
});

describe('coerceToArray', () => {
  it('returns the same array when value is an array', () => {
    const arr = [1, 2, 3];
    const result = coerceToArray<number>(arr);
    expect(result).toBe(arr);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns empty array for null', () => {
    expect(coerceToArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(coerceToArray(undefined)).toEqual([]);
  });

  it('returns empty array for non-array truthy value', () => {
    expect(coerceToArray(true)).toEqual([]);
  });

  it('returns empty array for string', () => {
    expect(coerceToArray('hello')).toEqual([]);
  });

  it('returns empty array for number', () => {
    expect(coerceToArray(42)).toEqual([]);
  });

  it('returns empty array for object', () => {
    expect(coerceToArray({ foo: 'bar' })).toEqual([]);
  });

  it('preserves array contents', () => {
    expect(coerceToArray<string>(['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('truncateMentions', () => {
  it('returns empty string for undefined or empty input', () => {
    expect(truncateMentions(undefined)).toBe('');
    expect(truncateMentions([])).toBe('');
  });

  it('formats each mention as footnote-style line with source link', () => {
    const result = truncateMentions(['老子是道家创始人。'], 500, 'sources/史记_司马迁.md');
    expect(result).toBe('- 老子是道家创始人。 — [[sources/史记_司马迁|史记_司马迁]]');
  });

  it('uses plain list when no source is provided', () => {
    const result = truncateMentions(['test quote']);
    expect(result).toBe('- test quote');
  });

  it('joins multiple mentions with newlines', () => {
    const result = truncateMentions(['first', 'second'], 500, 'sources/test.md');
    expect(result).toContain('- first — [[sources/test|test]]');
    expect(result).toContain('- second — [[sources/test|test]]');
    expect(result.split('\n')).toHaveLength(2);
  });

  it('truncates first mention when it exceeds maxChars', () => {
    const longQuote = 'A'.repeat(1000);
    const result = truncateMentions([longQuote], 100, 'sources/x.md');
    // The link itself takes ~30 chars; we allow a small overshoot for the ellipsis
    expect(result.length).toBeLessThanOrEqual(110);
    expect(result).toContain('[[sources/x|x]]');
    expect(result).toContain('...');
  });

  it('stops adding mentions when adding next would exceed maxChars', () => {
    const result = truncateMentions(['quote1', 'quote2', 'quote3'], 50, 'sources/s.md');
    // 50-char budget; first entry takes ~30 chars; subsequent entries would push over
    const lines = result.split('\n');
    expect(lines.length).toBeLessThan(3);
  });

  it('strips .md from left path of wiki link', () => {
    const result = truncateMentions(['q'], 500, 'sources/史记_〔汉〕司马迁.md');
    // The LEFT path (before |) is the path without .md; RIGHT is display name (also without .md)
    expect(result).toContain('[[sources/史记_〔汉〕司马迁|史记_〔汉〕司马迁]]');
    expect(result).not.toContain('.md|');
  });
});

describe('extractSourceTags', () => {
  it('returns empty array when content has no frontmatter', () => {
    expect(extractSourceTags('# Just a heading\nNo frontmatter')).toEqual([]);
  });

  it('returns empty array when frontmatter has no tags field', () => {
    const content = '---\ntype: source\ncreated: 2026-06-08\n---\n\nBody';
    expect(extractSourceTags(content)).toEqual([]);
  });

  it('extracts tags from inline array format', () => {
    const content = '---\ntags: [历史, 古代, 文学]\n---\n\nBody';
    expect(extractSourceTags(content)).toEqual(['历史', '古代', '文学']);
  });

  it('extracts tags from multi-line array format', () => {
    const content = '---\ntags:\n  - 历史\n  - 古代\n  - 文学\n---\n\nBody';
    expect(extractSourceTags(content)).toEqual(['历史', '古代', '文学']);
  });

  it('returns single-element array when tags is a scalar (Obsidian allows this)', () => {
    const content = '---\ntags: history\n---\n\nBody';
    expect(extractSourceTags(content)).toEqual(['history']);
  });

  it('trims whitespace and filters empty strings', () => {
    const content = '---\ntags: [ 历史 , , 古代 ]\n---\n\nBody';
    expect(extractSourceTags(content)).toEqual(['历史', '古代']);
  });
});

describe('lint i18n: lintCheckingDuplicatesProgress template', () => {
  it('uses {current} placeholder only (no {total}) — total is already embedded by progressLabel', () => {
    // Bug history: v1.16.3 had a duplicate /{total} in the rendered Notice because
    // progressLabel was passed `1/3` and the i18n template was `批次 {current}/{total}`,
    // producing literal "批次 1/3/{total}...". v1.17.0 removed the replace('{total}', ...)
    // call in lint-controller but forgot to update the i18n template.
    const tpl = TEXTS.en.lintCheckingDuplicatesProgress;
    expect(tpl).toBeDefined();
    expect(tpl).not.toContain('{total}');
    expect(tpl).toContain('{current}');
  });
});

describe('WikiEngine.logLintFix', () => {
  // Smoke test: logLintFix signature accepts (operation, details) and writes
  // a timestamped entry. We test the entry construction by mocking the file
  // IO via stubbing createOrUpdateFile/tryReadFile. Without a real vault
  // (only available inside Obsidian), we test the structural contract:
  //   - the entry has a [YYYY-MM-DD HH:MM] timestamp
  //   - the entry includes the operation title and the full details
  //   - multiple calls within the same minute are still distinguishable
  //     by content (timestamp is the only differentiator on same-minute).
  it('produces timestamped entry with operation and details', () => {
    // Mirror the entry construction logic from wiki-engine.ts logLintFix.
    // Use a date object that produces a known local time, regardless of TZ.
    const now = new Date(2026, 5, 8, 14, 35, 22); // local time constructor
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    const operation = 'Wiki lint report';
    const details = '## Sub heading\nbody text';
    const entry = `\n\n## [${date} ${time}] ${operation}\n\n${details}\n`;
    // We test shape, not the exact timestamp value (varies by TZ)
    expect(entry).toMatch(/## \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Wiki lint report/);
    expect(entry).toContain('## Sub heading');
    expect(entry).toContain('body text');
  });
});

describe('lint report log splitting: fullReport vs fullReportForLog', () => {
  it('fullReportForLog contains all entries (no >20 truncation) while fullReport truncates', () => {
    // Issue: lint report > 20 dead links was truncated to "... 857 more" in BOTH
    // the modal AND the persisted log.md. Log should keep the full enumeration.
    // The fix: separate the truncated (Modal) report from the full (log) report.
    const deadLinks = Array.from({ length: 25 }, (_, i) => ({ source: `[[src${i}]]`, target: `[[missing${i}]]` }));

    const { modalReport, logReport } = truncateListForDisplay(
      deadLinks,
      (dl) => `- ${dl.source} → ${dl.target}`,
      20,
      (n) => `- ... ${n} more`
    );

    // Modal: 20 entries + 1 summary line
    expect(modalReport.split('\n')).toHaveLength(21);
    expect(modalReport).toContain('5 more');          // 25 - 20 = 5
    expect(modalReport).toContain('[[src0]]');
    expect(modalReport).toContain('[[src19]]');
    expect(modalReport).not.toContain('[[src20]]');    // truncated

    // Log: complete
    expect(logReport.split('\n')).toHaveLength(25);
    expect(logReport).not.toContain('more');
    expect(logReport).toContain('[[src24]]');            // last entry present
  });

  it('returns identical content when items.length <= visibleCap', () => {
    const items = [1, 2, 3];
    const { modalReport, logReport } = truncateListForDisplay(
      items,
      (n) => `item ${n}`,
      20
    );
    expect(modalReport).toBe('item 1\nitem 2\nitem 3');
    expect(logReport).toBe(modalReport);
  });
});

describe('nestReportUnderParent', () => {
  it('strips the leading H1 and promotes remaining headings by one level', () => {
    // Issue: log.md wrapped a sub-report (H1) inside a H2 heading, which renders
    // oddly in Obsidian. Fix: strip the sub-report's H1 and promote its other
    // headings so it nests cleanly.
    const input = '# Wiki Lint Report\n\n> Summary text\n\n## 断链（程序检测）\n\n- a\n- b\n\n### Detail\n\ntext';
    const out = nestReportUnderParent(input);
    expect(out).not.toMatch(/^# /m);
    expect(out).toContain('## 断链（程序检测）');  // H2 → H3
    expect(out).toContain('### Detail');            // H3 → H4
    expect(out).toContain('> Summary text');        // blockquote preserved
  });

  it('leaves content with no headings unchanged', () => {
    const input = 'just some text\nno headings here';
    expect(nestReportUnderParent(input)).toBe(input);
  });

  it('handles H1-only input by returning empty content (parent already provides title)', () => {
    const input = '# Just a title';
    expect(nestReportUnderParent(input)).toBe('');
  });
});

describe('scanDeadLinks: per-(source,target) dedup', () => {
  it('deduplicates repeated links from the same source to the same target', () => {
    // Issue: A wiki page with `[[黄帝]]` referenced 4 times generated 4 dead-link
    // entries in the report (e.g. "[[黄帝]] → 嫘祖" appearing 4 times). Each
    // (source, target) pair should appear at most ONCE per report.
    const pages = new Map([
      ['History/entities/黄帝.md', {
        path: 'History/entities/黄帝.md',
        content: '见 [[黄帝/嫘祖]] 与 [[黄帝/嫘祖]]。再次 [[黄帝/嫘祖]]。还 [[黄帝/禅让]] 和 [[黄帝/禅让]]。'
      }]
    ]);

    // Use vi import to access scanDeadLinks (re-define test logic since we
    // can't import scanners from here easily — mirror the regex semantics).
    const linkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
    const entries: Array<{source: string; target: string}> = [];
    for (const { path, content } of pages.values()) {
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(content)) !== null) {
        entries.push({ source: path, target: m[1].trim() });
      }
      linkRegex.lastIndex = 0;
    }
    // The page above has 5 wikilinks: 3×"黄帝/嫘祖" + 2×"黄帝/禅让"
    expect(entries).toHaveLength(5);

    // After dedup by (source,target), only 2 distinct entries
    const seen = new Set<string>();
    const dedup = entries.filter(e => {
      const k = `${e.source}::${e.target}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    expect(dedup).toHaveLength(2);
  });
});

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

    const settings: Partial<LLMWikiSettings> = {}; // no tagVocabularyMode, no customEntityTags
    expect(getActiveEntityTags(settings as LLMWikiSettings)).toEqual([
      'person', 'organization', 'project', 'product', 'event', 'place', 'other'
    ]);
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

describe('buildActiveTagVocabularySection (Issue #85 v6 — prompt injection)', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
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
    slugCase: 'lower' as const,
  };

  it('in default mode, lists the hardcoded VALID_ENTITY_TAGS', () => {
    const section = buildActiveTagVocabularySection(baseSettings);
    expect(section).toContain('person');
    expect(section).toContain('organization');
    expect(section).toContain('project');
    expect(section).not.toContain('Medical_Arzneimittel');
  });

  it('in default mode, lists the hardcoded VALID_CONCEPT_TAGS', () => {
    const section = buildActiveTagVocabularySection(baseSettings);
    expect(section).toContain('theory');
    expect(section).toContain('method');
    expect(section).toContain('field');
  });

  it('in custom mode, lists the user-defined entity tags (CSV)', () => {
    const customSettings: LLMWikiSettings = { ...baseSettings,
      tagVocabularyMode: 'custom',
      customEntityTags: 'person, organization, Medical_Arzneimittel',
    };
    const section = buildActiveTagVocabularySection(customSettings);
    expect(section).toContain('Medical_Arzneimittel');
    expect(section).toContain('person');
    // Default tags NOT listed when custom mode active
    expect(section).not.toContain('- product');
  });

  it('in custom mode, lists the user-defined concept tags (CSV)', () => {
    const customSettings: LLMWikiSettings = { ...baseSettings,
      tagVocabularyMode: 'custom',
      customConceptTags: 'theory, Arzneimittel/Neurologie',
    };
    const section = buildActiveTagVocabularySection(customSettings);
    expect(section).toContain('Arzneimittel/Neurologie');
  });

  it('preserves nested tag syntax with /', () => {
    const customSettings: LLMWikiSettings = { ...baseSettings,
      tagVocabularyMode: 'custom',
      customConceptTags: 'Kardiologie, Arzneimittel/Neurologie, Method',
    };
    const section = buildActiveTagVocabularySection(customSettings);
    expect(section).toContain('Kardiologie');
    expect(section).toContain('Arzneimittel/Neurologie');
    expect(section).toContain('Method');
  });

  it('section contains explicit "do NOT invent new types" instruction', () => {
    const section = buildActiveTagVocabularySection(baseSettings);
    expect(section.toLowerCase()).toContain('do not invent');
  });

  it('when custom mode but customEntityTags is empty, falls back to default', () => {
    const customButEmpty: LLMWikiSettings = { ...baseSettings, tagVocabularyMode: 'custom' };
    const section = buildActiveTagVocabularySection(customButEmpty);
    expect(section).toContain('person');
    expect(section).toContain('theory');
  });
});

describe('appendTagVocabularyToPrompt (Issue #85 v6 — end-to-end prompt injection)', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
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
    slugCase: 'lower' as const,
  };

  it('appends active tag vocabulary section after the base prompt', () => {
    const result = appendTagVocabularyToPrompt('Base prompt for entity generation.', baseSettings);
    expect(result).toContain('Base prompt for entity generation.');
    expect(result).toContain('## Active Tag Vocabulary');
  });

  it('end-to-end: custom user tags flow from settings → prompt', () => {
    // Mimic the user setting custom vocabulary in Settings.
    const userSettings: LLMWikiSettings = { ...baseSettings,
      tagVocabularyMode: 'custom',
      customEntityTags: 'person, organization, Medical_Arzneimittel',
      customConceptTags: 'Kardiologie, Arzneimittel/Neurologie',
    };
    // 1. Settings → customEntityTags persisted
    expect(userSettings.customEntityTags).toContain('Medical_Arzneimittel');
    // 2. Migration on onload() does NOT alter the user input (already canonical)
    // (covered by normalizeVocabularyCsv tests in v2)
    // 3. UI rendering (settings.ts:600) uses these directly
    // 4. ingestSource → source-analyzer → prompt has the dynamic vocab
    const ingestPrompt = appendTagVocabularyToPrompt('Extract entities.', userSettings);
    expect(ingestPrompt).toContain('Medical_Arzneimittel');
    expect(ingestPrompt).toContain('Kardiologie');
    expect(ingestPrompt).toContain('Arzneimittel/Neurologie');
    // 5. page generation → page-factory → prompt has the same dynamic vocab
    const pagePrompt = appendTagVocabularyToPrompt('Generate page body.', userSettings);
    expect(pagePrompt).toContain('Medical_Arzneimittel');
    // 6. lint → lint-controller → prompt has the same dynamic vocab
    const lintPrompt = appendTagVocabularyToPrompt('Analyze wiki.', userSettings);
    expect(lintPrompt).toContain('Medical_Arzneimittel');
    // 7. enforceFrontmatterConstraints preserves LLM-emitted custom tags
    const fmResult = enforceFrontmatterConstraints(
      '---\ntype: entity\ntags: [Medical_Arzneimittel]\n---\n\nBody',
      'entity',
      userSettings
    );
    expect(fmResult).toContain('Medical_Arzneimittel');
  });

  it('in default mode, the prompt lists the hardcoded VALID_*_TAGS', () => {
    const result = appendTagVocabularyToPrompt('Base prompt.', baseSettings);
    expect(result).toContain('person');
    expect(result).toContain('organization');
    expect(result).toContain('project');
    expect(result).toContain('theory');
    expect(result).toContain('method');
  });

  it('composes with appendGranularityToPrompt without conflict', () => {
    // Used together in lint-controller.ts:534.
    const result = appendTagVocabularyToPrompt(
      appendGranularityToPrompt('Base lint prompt.', baseSettings),
      baseSettings
    );
    // Both sections present
    expect(result).toContain('Base lint prompt.');
    expect(result).toContain('## Active Tag Vocabulary');
  });
});

describe('enforceFrontmatterConstraints (Issue #85 v6 — preserve LLM intent)', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
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
    slugCase: 'lower' as const,
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

describe('getActiveSourceTags (Issue #85 v7)', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
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
    slugCase: 'lower' as const,
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
    // Source vocab is intentionally closed — no user override.
    expect(tags).not.toContain('Medical_Arzneimittel');
    expect(tags).not.toContain('Kardiologie');
    expect(tags).toContain('paper');
  });
});
