/**
 * v1.24.1 PATCH Phase 5.5.1: query keyword generation.
 *
 * Stage 1.5a in the 5-stage seed selection pipeline. When Stage 1 (lex)
 * returns 0 hits, we cannot feed all 2137 pageRefs to the LLM (token
 * overflow). Instead, we ask the LLM to extract 5-10 candidate keywords
 * from the user's natural-language question, then do a local substring
 * scan against all pageRefs' title + aliases to find relevant pages.
 *
 * Per first-principles (2026-07-13, user direction): the keyword
 * generation prompt must be language-AGNOSTIC — the LLM should auto-
 * detect the query's language and produce keywords in BOTH that
 * language AND English (English is the universal cross-language
 * fallback for i18n wikis). Hardcoding "Chinese ↔ English" would
 * break users with other primary languages.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateQueryKeywords, type KeywordGenClient } from '../../../wiki/query-engine/pipeline/query-keywords';

function makeClient(createMessage: KeywordGenClient['createMessage']): KeywordGenClient {
  return { createMessage };
}

describe('generateQueryKeywords (Phase 5.5.1)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('returns parsed keywords from LLM', () => {
    it('parses valid JSON and returns the keyword array', async () => {
      const createMessage = vi.fn().mockResolvedValue('{"keywords":["对比学习","Contrastive Learning","对比表征学习"]}');

      const keywords = await generateQueryKeywords(
        '什么叫对比学习？',
        makeClient(createMessage),
        { model: 'gpt-4' },
      );

      expect(keywords).toEqual(['对比学习', 'Contrastive Learning', '对比表征学习']);
    });

    it('deduplicates keywords (case-insensitive)', async () => {
      const createMessage = vi.fn().mockResolvedValue('{"keywords":["对比学习","对比学习","Contrastive learning","contrastive learning"]}');

      const keywords = await generateQueryKeywords(
        '对比学习',
        makeClient(createMessage),
        { model: 'gpt-4' },
      );

      // Dedup by lowercased form; preserve first occurrence casing
      expect(keywords).toEqual(['对比学习', 'Contrastive learning']);
    });

    it('returns empty array on parse failure (graceful degradation)', async () => {
      const createMessage = vi.fn().mockResolvedValue('not json{');

      const keywords = await generateQueryKeywords(
        'something',
        makeClient(createMessage),
        { model: 'gpt-4' },
      );

      expect(keywords).toEqual([]);
    });

    it('returns empty array when client is undefined', async () => {
      const keywords = await generateQueryKeywords(
        'something',
        undefined,
        { model: 'gpt-4' },
      );

      expect(keywords).toEqual([]);
    });

    it('returns empty array on LLM error (no throw)', async () => {
      const createMessage = vi.fn().mockRejectedValue(new Error('network down'));

      const keywords = await generateQueryKeywords(
        'something',
        makeClient(createMessage),
        { model: 'gpt-4' },
      );

      expect(keywords).toEqual([]);
    });
  });

  describe('prompt design (language-agnostic)', () => {
    it('prompt does NOT hardcode specific languages (no "Chinese" or "English" as fixed output languages)', async () => {
      const createMessage = vi.fn().mockResolvedValue('{"keywords":["x"]}');

      await generateQueryKeywords(
        'some query',
        makeClient(createMessage),
        { model: 'gpt-4' },
      );

      const callArg = createMessage.mock.calls[0]?.[0] as { system?: string; messages: Array<{ content: string }> };
      const systemPrompt: string = callArg.system ?? '';
      const userPrompt: string = callArg.messages[0].content;

      // The system prompt must NOT say "translate to English" or
      // "output both Chinese and English" as a fixed rule. It should
      // instruct the LLM to auto-detect.
      expect(systemPrompt.toLowerCase()).not.toMatch(/translate to english/);
      expect(systemPrompt.toLowerCase()).not.toMatch(/output.*chinese.*english/);
      // It SHOULD mention "auto-detect" or "primary language" so the
      // LLM is explicitly told to observe the query's language.
      expect(systemPrompt.toLowerCase()).toMatch(/auto[- ]?detect|primary language/);
      // User prompt should contain the actual question verbatim.
      expect(userPrompt).toContain('some query');
    });

    it('prompt asks for 5-10 keywords (not 0, not 100)', async () => {
      const createMessage = vi.fn().mockResolvedValue('{"keywords":["x"]}');

      await generateQueryKeywords('q', makeClient(createMessage), { model: 'gpt-4' });

      const callArg = createMessage.mock.calls[0]?.[0] as { system?: string };
      const systemPrompt: string = callArg.system ?? '';
      // 5 ≤ count ≤ 10 should be a constraint
      expect(systemPrompt).toMatch(/5/);
      expect(systemPrompt).toMatch(/10/);
    });

    it('prompt requests English-equivalent output (universal fallback language)', async () => {
      const createMessage = vi.fn().mockResolvedValue('{"keywords":["x"]}');

      await generateQueryKeywords('q', makeClient(createMessage), { model: 'gpt-4' });

      const callArg = createMessage.mock.calls[0]?.[0] as { system?: string };
      const systemPrompt: string = callArg.system ?? '';
      // English is the universal second language — must be mentioned
      // (but as a FALLBACK / UNIVERSAL language, not as a hardcoded target).
      expect(systemPrompt.toLowerCase()).toMatch(/english/);
    });
  });

  describe('output validation', () => {
    it('rejects keywords array with more than 10 entries (truncates)', async () => {
      const createMessage = vi.fn().mockResolvedValue(
        '{"keywords":["a","b","c","d","e","f","g","h","i","j","k","l"]}',
      );

      const keywords = await generateQueryKeywords('q', makeClient(createMessage), { model: 'gpt-4' });

      expect(keywords.length).toBeLessThanOrEqual(10);
    });

    it('rejects keywords array with fewer than 1 entry after dedup (returns empty — no signal)', async () => {
      const createMessage = vi.fn().mockResolvedValue('{"keywords":[]}');

      const keywords = await generateQueryKeywords('q', makeClient(createMessage), { model: 'gpt-4' });

      // Empty array — no signal at all, caller falls back to KB answer.
      expect(keywords).toEqual([]);
    });

    it('filters out keywords that are too long (sentences, not keywords)', async () => {
      const createMessage = vi.fn().mockResolvedValue(
        '{"keywords":["对比学习", "this is a very long sentence that should not be a keyword because it is too verbose"]}',
      );

      const keywords = await generateQueryKeywords('q', makeClient(createMessage), { model: 'gpt-4' });

      // Long sentences (>5 words) are filtered out.
      expect(keywords).toContain('对比学习');
      expect(keywords.find(k => k.includes('very long sentence'))).toBeUndefined();
    });
  });
});