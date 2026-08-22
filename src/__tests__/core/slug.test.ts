import { describe, it, expect } from 'vitest';
import { computeSlug, filterRedundantAliases, slugify, slugKeys, turkishCaseFold } from '../../core/slug';
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

describe('filterRedundantAliases', () => {
  it('drops an alias identical to the page filename (case-insensitive)', () => {
    const result = filterRedundantAliases('wiki/entities/vigilanz.md', ['Vigilanz']);
    expect(result).toEqual([]);
  });

  it('keeps a genuine alias that differs from the filename', () => {
    // 3-character floor (v1.25.10 PATCH): use a multi-char CJK alias so it
    // clears the floor; the previous single-codepoint CJK alias "监测"
    // is now correctly rejected by MIN_ALIAS_LENGTH below.
    const result = filterRedundantAliases('wiki/entities/vigilanz.md', ['监测系统']);
    expect(result).toEqual(['监测系统']);
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

  it('drops aliases shorter than the 2-character floor (v1.25.10 PATCH alias hardening)', () => {
    // Single-character aliases are dropped: they carry no dedup value
    // above the page basename and clutter the wikilink graph. The 2-char
    // floor intentionally leaves common technical abbreviations (ML,
    // HD, CD, AI, UI, ...) usable. Tunable via MIN_ALIAS_LENGTH in
    // src/constants.ts.
    const result = filterRedundantAliases('wiki/entities/vigilanz.md', ['A', 'ML', 'Überwachung']);
    expect(result).toEqual(['ML', 'Überwachung']);
  });

  it('accepts a 2-character boundary alias (>= 2 chars)', () => {
    // "ML" is exactly 2 chars — at the floor. Must survive.
    const result = filterRedundantAliases('wiki/entities/openai.md', ['ML']);
    expect(result).toEqual(['ML']);
  });

  it('drops aliases that already exist on other pages (cross-page uniqueness)', () => {
    // "Vigilanz" is already an alias on another page — adding it to this
    // page would create a wikilink ambiguity. Pass them via the third arg.
    const result = filterRedundantAliases(
      'wiki/entities/new-page.md',
      ['Vigilanz', 'Surveillance'],
      ['Vigilanz'],
    );
    expect(result).toEqual(['Surveillance']);
  });

  it('cross-page uniqueness is case-insensitive (whitespace stripped)', () => {
    // Even with whitespace/case variations, the existing alias rejects the candidate.
    const result = filterRedundantAliases(
      'wiki/entities/new-page.md',
      ['VIGILANZ'],
      ['  vigilanz  '],
    );
    expect(result).toEqual([]);
  });

  it('compares NFC-normalised: a decomposed basename from disk and a composed alias are the same name', () => {
    // macOS hands out NFD filenames ("A" + COMBINING DIAERESIS); the model writes
    // the composed "Ä". Bare toLowerCase() keeps them apart and the alias would
    // be kept as if it were new.
    const decomposedPath = 'wiki/entities/' + 'A\u0308rzte'.normalize('NFD') + '.md';
    const result = filterRedundantAliases(decomposedPath, ['Ärzte', 'Mediziner']);
    expect(result).toEqual(['Mediziner']);
  });

  it('cross-page uniqueness folds İ/i the same way slugKeys does', () => {
    // toLowerCase() maps İ to i + COMBINING DOT ABOVE, so "İstanbul" and
    // "istanbul" would pass the gate as two aliases.
    const result = filterRedundantAliases('wiki/entities/new-page.md', ['istanbul'], ['İstanbul']);
    expect(result).toEqual([]);
  });

  it('omitting the cross-page argument preserves v1.25.9 behaviour (backward-compat)', () => {
    // No third argument — should not throw, must still apply filename + batch dedup.
    const result = filterRedundantAliases('wiki/entities/vigilanz.md', ['Vigilanz']);
    expect(result).toEqual([]);
  });
});

// v1.25.10 PATCH Issue #366 — Turkish-aware case folding for slug
// comparison keys. The default ASCII fold stays untouched; the new
// path is opt-in via `slugKeys({ turkishFold: true })` so non-Turkish
// vaults pay nothing.
describe('turkishCaseFold', () => {
  it('lowercases ASCII to lowercase ASCII', () => {
    expect(turkishCaseFold('HELLO')).toBe('hello');
    expect(turkishCaseFold('World')).toBe('world');
  });

  it('passes ASCII lowercase through unchanged', () => {
    expect(turkishCaseFold('hello')).toBe('hello');
  });

  it('maps İ (capital Turkish I-with-dot) to i', () => {
    expect(turkishCaseFold('İSTANBUL')).toBe('istanbul');
  });

  it('leaves ASCII I untouched here (lowercase applied later by computeSlug)', () => {
    // turkishCaseFold only handles the four Turkish-specific letters
    // (and the case they carry). ASCII I is left for the downstream
    // `.toLowerCase()` step — the comparison-key pipeline folds
    // BEFORE computeSlug, so the lowercase there is what normalises
    // ASCII. The helper's job is the Turkish-case delta only.
    expect(turkishCaseFold('ISIM')).toBe('isim');
  });

  it('lowercases Ş → ş, Ğ → ğ, ASCII I via the lowercase step', () => {
    // turkishCaseFold handles Ş/Ğ/İ/Ö/Ü/Ç. The Turkish rule for ASCII
    // I is locale-dependent: standard .toLowerCase() in the host
    // locale is what we use here (the comparison-key pipeline runs
    // the fold BEFORE computeSlug, which lowercases ASCII anyway).
    expect(turkishCaseFold('ŞEHIR')).toBe('şehir');
    expect(turkishCaseFold('DOĞA')).toBe('doğa');
  });

  it('passes already-folded Turkish lowercase through unchanged', () => {
    expect(turkishCaseFold('doğa')).toBe('doğa');
    expect(turkishCaseFold('ırmak')).toBe('ırmak');
  });

  it('round-trips ç, ö, ü through plain toLowerCase', () => {
    expect(turkishCaseFold('ÇAY')).toBe('çay');
    expect(turkishCaseFold('ÖRNEK')).toBe('örnek');
    expect(turkishCaseFold('ÜLKE')).toBe('ülke');
  });

  it('leaves diacritics on Turkish dotted letters untouched (downstream slug strips them)', () => {
    // The fold is character-class level. Diacritic stripping belongs to
    // the slug stage (computeSlug). The fold just normalises case.
    expect(turkishCaseFold('DOĞRU')).toBe('doğru');
    expect(turkishCaseFold('KÜÇÜK')).toBe('küçük');
  });
});

describe('slugKeys with turkishFold (Issue #366)', () => {
  it('ASCII path: turkishFold=false returns slug exactly as computeSlug does', () => {
    const keys = slugKeys('Doga Demir', ['doga demir'], { turkishFold: false });
    // computeSlug lowercases by default — no further fold.
    expect([...keys]).toEqual(['doga-demir']);
  });

  it('Turkish path: turkishFold=true unifies casing variants of the same name', () => {
    // 'Doğa' and 'doğa' both fold + lowercase to the same slug.
    const a = slugKeys('Doğa', [], { turkishFold: true });
    const b = slugKeys('doğa', [], { turkishFold: true });
    expect([...a][0]).toBe([...b][0]);
    expect([...a][0]).toBe('doğa');
  });

  it('Turkish path: Ş/ş/G/ğ/ç/ö/ü cross-page dedup', () => {
    // 'ŞEHIR' and 'şehir' should both yield 'şehir'.
    const a = slugKeys('ŞEHIR', [], { turkishFold: true });
    const b = slugKeys('şehir', [], { turkishFold: true });
    expect([...a][0]).toBe('şehir');
    expect([...b][0]).toBe('şehir');
  });

  it('NFC-normalises before keying, with and without the fold', () => {
    const nfc = 'Doğa'.normalize('NFC');
    const nfd = 'Doğa'.normalize('NFD');
    expect(nfc).not.toBe(nfd); // the inputs really differ
    expect([...slugKeys(nfd)]).toEqual([...slugKeys(nfc)]);
    expect([...slugKeys(nfd, [], { turkishFold: true })]).toEqual([...slugKeys(nfc, [], { turkishFold: true })]);
  });

  it('omitting opts preserves the v1.25.9 behaviour (backward-compat)', () => {
    expect([...slugKeys('Test', ['Test'])]).toEqual(['test']);
  });

  it('skipping empty / whitespace-only inputs is unchanged', () => {
    const keys = slugKeys('', ['   ', 'Real'], { turkishFold: true });
    expect([...keys]).toEqual(['real']);
  });
});
