import { describe, it, expect } from 'vitest';
import { slugify, computeSlug, parseFrontmatter, detectRateLimitFailures, formatRateLimitNotice, cleanMarkdownResponse, enforceFrontmatterConstraints, parseJsonResponse, mergeFrontmatter, preserveFrontmatterReviewTag, extractBody, getText, filterRedundantAliases, coerceToArray } from '../utils';
import { getGranularityInstruction, getGranularityFixLimits } from '../wiki/system-prompts';
import { LLMWikiSettings } from '../types';

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
    expect(slugify('机器学习 Supervised Learning')).toBe('机器学习-Supervised-Learning');
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
    expect(slugify('Karpathy, Andrej')).toBe('Karpathy-Andrej');
  });

  it('normalizes spaces to hyphens for slug-match comparison (Issue #32)', () => {
    // resolvePagePath Fast path 2: slugify(p.title) === slug
    // catches files whose stored name uses spaces instead of hyphens
    expect(slugify('Metabolisches Syndrom')).toBe('Metabolisches-Syndrom');
    expect(slugify('Machine Learning Basics')).toBe('Machine-Learning-Basics');
    expect(slugify('hello world') === slugify('hello-world')).toBe(true);
    expect(slugify('Test Page Name') === slugify('Test-Page-Name')).toBe(true);
  });

  it('slug-match handles edge cases with dots and spaces combined', () => {
    expect(slugify('Dr. Smith Report')).toBe('Dr-Smith-Report');
    expect(slugify('v1.0 Release Notes')).toBe('v1-0-Release-Notes');
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
    // Entity valid tags: person, organization, project, product, event, location, other
    const input = '---\ntype: entity\ntags: [person, project]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('tags:');
    expect(result).toContain('person');
  });

  it('collects and preserves concept tags from inline array', () => {
    // Concept valid tags: theory, method, technology, term, other
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

  it('preserves created and updated dates', () => {
    const input = '---\ntype: entity\ncreated: 2026-01-01\nupdated: 2026-05-18\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('created: 2026-01-01');
    expect(result).toContain('updated: 2026-05-18');
  });

  it('ensures blank line before body', () => {
    const input = '---\ntype: entity\n---\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('---\n\nBody');
  });

  it('filters tags to valid subtypes only', () => {
    const input = '---\ntype: entity\ntags: [person, invalid_tag]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('person');
    expect(result).not.toContain('invalid_tag');
  });

  it('provides fallback tag when all tags are invalid', () => {
    const input = '---\ntype: entity\ntags: [invalid_tag]\n---\n\nBody';
    const result = enforceFrontmatterConstraints(input, 'entity');
    expect(result).toContain('tags: [other]');
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
    startupCheck: false, pageGenerationConcurrency: 3, batchDelayMs: 500,
    llmReady: false,
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

describe('getGranularityFixLimits', () => {
  const baseSettings: LLMWikiSettings = {
    provider: 'anthropic', apiKey: '', baseUrl: '', model: 'claude-sonnet-4-6',
    wikiFolder: 'wiki', language: 'en', wikiLanguage: 'en',
    maxConversationHistory: 30, extractionGranularity: 'standard',
    enableSchema: true, autoWatchSources: false, autoWatchMode: 'notify',
    autoWatchDebounceMs: 5000, watchedFolders: [], periodicLint: 'off',
    startupCheck: false, pageGenerationConcurrency: 3, batchDelayMs: 500,
    llmReady: false,
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
} from '../wiki/source-analyzer';

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
