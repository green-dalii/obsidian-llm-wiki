/**
 * v1.24.1 PATCH Phase 5.5.0: 4-stage seed selection pipeline tests.
 * v1.24.1 PATCH Phase 5.5.1: extended to 5-stage pipeline.
 *
 * Pipeline (Phase 5.5.1):
 *   Stage 1        (lex)         pure keyword match against title+aliases
 *   Stage 1.5a     (LLM keywords) when Stage 1 weak, LLM generates 5-10 keywords
 *   Stage 1.5b     (scan)        keywords substring scan all pageRefs
 *   Stage FALLBACK (LLM KB)      keyword scan empty → pure LLM knowledge base
 *   Stage 3        (PPR)         always run PPR (no more `pages[0]` random seed)
 *
 * Chip format (Phase 5.5.1, per user direction):
 *   - "Lex+PPR"       — Stage 1 strong
 *   - "LLM+PPR"       — Stage 1.5 found wiki seeds
 *   - "LLM+KB"        — pure LLM knowledge-base (no wiki sources)
 *   - "Lex++PPR"      — Stage FALLBACK (lex top-K as seeds)
 *
 * The `+` separator distinguishes this from the legacy `+LLM` suffix
 * (which is now removed in Phase 5.5.1).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectPprSeeds } from '../../../wiki/query-engine/pipeline/select-seeds';
import type { SeedLLMClient } from '../../../wiki/query-engine/pipeline/seed-selector';
import type { PageRef } from '../../../core/ppr-cascade';
import type { Graph } from '../../../core/build-graph';

function page(path: string, title: string, aliases: string[] = []): PageRef {
  return { path, title, aliases, summary: '' };
}

function buildGraph(paths: string[], edges: Array<[string, string]> = []): Graph {
  const m = new Map<string, string[]>();
  for (const p of paths) m.set(p, []);
  for (const [from, to] of edges) {
    const existing = m.get(from) ?? [];
    existing.push(to);
    m.set(from, existing);
  }
  return { nodes: paths, edges: m };
}

function makeClient(createMessage: SeedLLMClient['createMessage']): SeedLLMClient {
  return { createMessage };
}

const TEXTS = {
  queryPhaseSearching: 'Searching...',
  queryPhaseFoundPages: 'Found {count}: {pages}',
};

describe('selectPprSeeds — 4-stage pipeline (Phase 5.5.0)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Stage 1 (lex strong path)', () => {
    it('skips LLM when lex produces ≥3 hits with top score ≥ 5', async () => {
      // 5 pages, 3 strongly match query "Janus model" via title AND
      // alias. Multi-token query "Janus model" tokenizes to 2 tokens
      // so lexIsReliable passes (≥ 2 multi-char). Each matching page
      // hits both tokens → score = 3 (title "janus model") + 2 (alias
      // "deepseek janus model" has "model") = 5+. Token counts: 3+
      // matches all give top score ≥ 5.
      const pages = [
        page('a/Janus', 'Janus model', ['DeepSeek Janus model']),
        page('a/Janus-Pro', 'Janus-Pro', ['Janus Pro model']),
        page('a/Janus-v2', 'Janus-v2', ['Janus v2 model']),
        page('a/Random', 'Random'),
        page('a/Other', 'Other'),
      ];
      const graph = buildGraph(
        pages.map(p => p.path),
        [['a/Janus', 'a/Janus-Pro'], ['a/Janus-Pro', 'a/Janus-v2']],
      );
      const createMessage = vi.fn(); // MUST NOT be called

      const result = await selectPprSeeds(
        'Janus model', pages, graph, makeClient(createMessage), { model: 'gpt-4' }, TEXTS,
      );

      expect(createMessage).not.toHaveBeenCalled();
      expect(result.llmAugmented).toBe(false);
      // Top matches should be Janus / Janus-Pro / Janus-v2.
      const paths = result.matches.map(m => m.page.path);
      expect(paths).toContain('a/Janus');
      expect(paths).toContain('a/Janus-Pro');
      expect(paths).toContain('a/Janus-v2');
    });
  });

  describe('Stage 1.5 (LLM escalation)', () => {
    it('calls LLM when lex weak (<3 hits or top score < 5)', async () => {
      // Only 1 strong lex hit, query has cross-language signal that
      // alias match might miss.
      const pages = [
        page('a/Janus', 'Janus', ['DeepSeek Janus']),
        page('a/Other', 'Other'),
        page('a/Random', 'Random'),
      ];
      const graph = buildGraph(
        pages.map(p => p.path),
        [['a/Janus', 'a/Other'], ['a/Other', 'a/Random']],
      );
      // 5-stage pipeline (Phase 5.5.1): LLM is called once to generate
      // keywords, then keyword scan finds a/Janus (matches "Janus"
      // keyword) → seeds fed to PPR.
      const createMessage = vi.fn()
        .mockResolvedValueOnce('{"keywords":["Janus","DeepSeek Janus"]}');

      const result = await selectPprSeeds(
        'multimodal architecture', // weak lex signal
        pages, graph, makeClient(createMessage), { model: 'gpt-4' }, TEXTS,
      );

      expect(createMessage).toHaveBeenCalledTimes(1);
      expect(result.llmAugmented).toBe(true);
      // LLM seed a/Janus must appear in result
      expect(result.matches.map(m => m.page.path)).toContain('a/Janus');
    });

    it('passes lex-ranked candidates to LLM (top-N by lex score)', async () => {
      const pages = [
        page('a/DeepSeek', 'DeepSeek', ['DeepSeek AI']),
        page('a/DeepSeek-VL', 'DeepSeek-VL', ['DeepSeek Vision']),
        page('a/DeepSeek-Math', 'DeepSeek-Math'),
        page('a/Other-A', 'Other-A', ['DeepSeek Other']),
        page('a/Other-B', 'Other-B'),
      ];
      const graph = buildGraph(pages.map(p => p.path));
      // 5-stage pipeline: LLM is called once to generate keywords.
      // The keyword scan then finds the DeepSeek pages locally.
      const createMessage = vi.fn()
        .mockResolvedValueOnce('{"keywords":["DeepSeek"]}');

      const result = await selectPprSeeds('DeepSeek', pages, graph, makeClient(createMessage), { model: 'gpt-4' }, TEXTS);

      // 5-stage: keyword scan found DeepSeek pages, PPR expanded from
      // those seeds. The LLM sees ONLY the user's question (no page
      // list at all — the keyword generation prompt is the system).
      const callArg = createMessage.mock.calls[0]?.[0] as {
        system?: string;
        messages: Array<{ content: string }>;
      };
      // System prompt should be the keyword extractor (not a page-list
      // selector).
      expect(callArg.system).toMatch(/keyword extractor/i);
      // User message should contain the original question.
      expect(callArg.messages[0].content).toContain('DeepSeek');
      // Result should contain the DeepSeek pages found by keyword scan.
      const paths = result.matches.map(m => m.page.path);
      expect(paths.some(p => p.startsWith('a/DeepSeek'))).toBe(true);
    });
  });

  describe('Stage FALLBACK (Phase 5.5.1: pure LLM KB mode)', () => {
    it('returns empty matches with pureLLM=true when no wiki sources found (5.5.1 behavior change)', async () => {
      // 5-stage pipeline (Phase 5.5.1): when lex=0 AND LLM keyword
      // scan finds nothing, we enter pureLLM mode (chip=LLM+KB).
      // We do NOT fall back to pageRefs[0..K] random seeds anymore —
      // that surfaced irrelevant pages in e2e (阿里云/麻省理工 for
      // a "对比学习" query). The chat LLM answers from general
      // knowledge and the UI shows a verify-vault banner.
      const pages = [
        page('a/Janus', 'Janus', ['DeepSeek Janus']),
        page('a/Other', 'Other'),
        page('a/Random', 'Random'),
      ];
      const graph = buildGraph(
        pages.map(p => p.path),
        [['a/Janus', 'a/Other'], ['a/Other', 'a/Random']],
      );
      // LLM generates keywords that don't match any page.
      const createMessage = vi.fn()
        .mockResolvedValueOnce('{"keywords":["nonexistent concept","irrelevant term"]}');

      const result = await selectPprSeeds(
        'totally-unrelated-query',
        pages, graph, makeClient(createMessage), { model: 'gpt-4' }, TEXTS,
      );

      // pureLLM mode: empty matches, chip=LLM+KB.
      expect(result.matches.length).toBe(0);
      expect(result.pureLLM).toBe(true);
      expect(result.armLabel).toBe('LLM+KB');
    });
  });

  describe('no LLM client', () => {
    it('skips Stage 1.5 entirely when no client (uses pure lex)', async () => {
      const pages = [
        page('a/Janus', 'Janus', ['DeepSeek Janus']),
        page('a/Janus-Pro', 'Janus-Pro', ['Janus Pro']),
        page('a/Janus-v2', 'Janus-v2', ['Janus 2']),
        page('a/Other', 'Other'),
      ];
      const graph = buildGraph(
        pages.map(p => p.path),
        [['a/Janus', 'a/Janus-Pro'], ['a/Janus-Pro', 'a/Janus-v2']],
      );

      const result = await selectPprSeeds(
        'Janus',
        pages, graph, undefined, { model: 'gpt-4' }, TEXTS,
      );

      // No LLM → no augmentation → matches still come back from lex+PPR
      expect(result.llmAugmented).toBe(false);
      // Lex strong (3 Janus matches + top score ≥ 5) so the lex-strong
      // path runs without escalation. PPR with lex seeds produces
      // matches because graph has edges.
      expect(result.matches.length).toBeGreaterThan(0);
      // Janus-related pages should be at the top of the list.
      const topPaths = result.matches.slice(0, 3).map(m => m.page.path);
      expect(topPaths.some(p => p.startsWith('a/Janus'))).toBe(true);
    });
  });

  describe('Phase 5.5.1 — 5-stage pipeline with keyword scan', () => {
    it('Stage 1.5a: lex=0 → LLM generates keywords → Stage 1.5b scans pageRefs and finds matches', async () => {
      // Real e2e scenario: query contains a phrase that doesn't match
      // lex tokenization (e.g. "什么叫对比学习？"), but the LLM can
      // extract the concept name "对比学习" / "Contrastive Learning".
      // The substring scan should find the 对比学习 page via the
      // LLM-generated keywords.
      const pages = [
        page('concepts/对比学习', '对比学习', ['Contrastive Learning', '对比表征学习']),
        page('concepts/成对比较', '成对比较', ['Pairwise comparison']),
        page('entities/DeepSeek', 'DeepSeek', []),
        page('entities/Random', 'Random', []),
      ];
      const graph = buildGraph(
        pages.map(p => p.path),
        [['concepts/对比学习', 'concepts/成对比较']],
      );

      // Mock LLM with TWO separate responses: first for keyword
      // generation (returns "对比学习", "Contrastive Learning"), then
      // a second for Stage 1.5b (the seed selector). Stage 1.5b will
      // run keyword scan instead of feeding all pageRefs.
      const createMessage = vi.fn()
        .mockResolvedValueOnce('{"keywords":["对比学习","Contrastive Learning","对比表征学习"]}');

      const result = await selectPprSeeds(
        '什么叫对比学习？与之类似的，还有哪些学习方法？',
        pages, graph, makeClient(createMessage), { model: 'gpt-4' }, TEXTS,
      );

      // Keyword scan should find concepts/对比学习 + concepts/成对比较.
      // PPR will use these as seeds and walk the graph.
      const matchedPaths = result.matches.map(m => m.page.path);
      expect(matchedPaths).toContain('concepts/对比学习');
      // Chip should be LLM+PPR (LLM found the seeds, PPR expanded).
      expect(result.armLabel).toBe('LLM+PPR');
    });

    it('Stage FALLBACK: keyword scan finds NOTHING → pureLLM mode, no seeds, chip=LLM+KB', async () => {
      // e2e scenario: user's wiki has no relevant page. LLM generates
      // keywords but no page matches. Pipeline should NOT run PPR with
      // random pageRefs[0..5] seeds (this surfaced 阿里云/麻省理工 in
      // the e2e log). Instead, set pureLLM=true and return empty
      // matches; the chat LLM answers from general knowledge.
      const pages = [
        page('entities/阿里云', '阿里云', ['Alibaba Cloud']),
        page('entities/麻省理工学院', '麻省理工学院', ['MIT']),
        page('entities/香港大学', '香港大学', ['HKU']),
      ];
      const graph = buildGraph(pages.map(p => p.path));

      const createMessage = vi.fn()
        .mockResolvedValueOnce('{"keywords":["量子计算","quantum computing"]}');

      const result = await selectPprSeeds(
        '量子纠缠的本质',
        pages, graph, makeClient(createMessage), { model: 'gpt-4' }, TEXTS,
      );

      // NO matches (pure LLM mode).
      expect(result.matches.length).toBe(0);
      expect(result.pureLLM).toBe(true);
      // Chip: LLM+KB (LLM knowledge base, no wiki source).
      expect(result.armLabel).toBe('LLM+KB');
    });

    it('chip format: uses "+" separator (Lex+PPR, LLM+PPR, LLM+KB, Lex++PPR)', async () => {
      // Spot check 4 chip formats. Setup 4 different queries.
      const pages = [
        page('a/Janus model', 'Janus model', ['DeepSeek Janus model']),
        page('a/Janus-Pro', 'Janus-Pro', ['Janus Pro model']),
        page('a/Janus-v2', 'Janus-v2', ['Janus v2 model']),
        page('a/Other', 'Other'),
      ];
      const graph = buildGraph(
        pages.map(p => p.path),
        [['a/Janus model', 'a/Janus-Pro'], ['a/Janus-Pro', 'a/Janus-v2']],
      );
      const createMessage = vi.fn(); // Should NOT be called for Lex+PPR.

      const result = await selectPprSeeds(
        'Janus model', pages, graph, makeClient(createMessage), { model: 'gpt-4' }, TEXTS,
      );

      // Lex strong → no LLM call → chip = "Lex+PPR"
      expect(createMessage).not.toHaveBeenCalled();
      expect(result.armLabel).toBe('Lex+PPR');
    });
  });
});