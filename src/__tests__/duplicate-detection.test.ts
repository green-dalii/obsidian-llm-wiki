import { describe, it, expect } from 'vitest';
import { generateDuplicateCandidates, bodyWordSet, computeJaccard } from '../wiki/lint/duplicate-detection';

function makePage(path: string, body: string, links: string[] = []) {
  const linksText = links.map(l => `[[${l}]]`).join('\n');
  return {
    path,
    content: `# Title\n\n${body}\n\n${linksText}`,
    title: path.split('/').pop()!.replace('.md', ''),
  };
}

// ── bodyWordSet ────────────────────────────────────────────────────────────────

describe('bodyWordSet', () => {
  it('returns unique meaningful words, filtering stopwords and short words', () => {
    const words = bodyWordSet('The wiki is a knowledge base that compiles information');
    expect(words.has('wiki')).toBe(true);
    expect(words.has('knowledge')).toBe(true);
    expect(words.has('compiles')).toBe(true);
    expect(words.has('information')).toBe(true);
    // Stopwords and short words filtered
    expect(words.has('the')).toBe(false);
    expect(words.has('is')).toBe(false);
    expect(words.has('a')).toBe(false);
    expect(words.has('that')).toBe(false);
  });

  it('produces low Jaccard for different-topic texts', () => {
    const wA = bodyWordSet(
      'A log file is a chronological append-only record detailing operational history of events. ' +
      'Entries track system events such as ingests queries maintenance passes providing audit timeline.',
    );
    const wB = bodyWordSet(
      'Query is an advanced knowledge interaction process where artificial intelligence is prompted ' +
      'to synthesize information from multiple source pages producing cohesive answers with citations.',
    );
    const sim = computeJaccard(wA, wB);
    expect(sim).toBeLessThan(0.2);
  });

  it('produces high Jaccard for near-identical texts', () => {
    const text = 'A persistent wiki is a structured compounding artifact maintained by an LLM system ' +
      'storing knowledge in interlinked markdown files for continuous knowledge accumulation.';
    const wA = bodyWordSet(text + ' It bridges raw sources and the user.');
    const wB = bodyWordSet(text + ' It connects raw documents to end users.');
    const sim = computeJaccard(wA, wB);
    expect(sim).toBeGreaterThan(0.5);
  });

  it('returns non-empty set for CJK text', () => {
    // Regression: [^a-z0-9\s] stripped all CJK chars, producing empty sets
    // that made computeJaccard return 0 and silently blocked CJK duplicate detection.
    const words = bodyWordSet('深度学习是人工智能的核心技术之一 机器学习是基础');
    expect(words.size).toBeGreaterThan(0);
  });

  it('produces high Jaccard for similar CJK texts', () => {
    const shared = '深度学习是人工智能的核心技术之一 机器学习是深度学习的基础 神经网络架构';
    const wA = bodyWordSet(shared + ' 图像识别卷积网络');
    const wB = bodyWordSet(shared + ' 自然语言处理变换器');
    const sim = computeJaccard(wA, wB);
    expect(sim).toBeGreaterThanOrEqual(0.2);
  });

  it('produces low Jaccard for different-topic CJK texts', () => {
    const wA = bodyWordSet('深度学习是人工智能的核心技术 神经网络用于图像识别任务');
    const wB = bodyWordSet('历史是人类文明的记录 古代文化与现代社会的联系');
    const sim = computeJaccard(wA, wB);
    expect(sim).toBeLessThan(0.2);
  });
});

// ── generateDuplicateCandidates — sharedLinks signal ──────────────────────────

describe('generateDuplicateCandidates — sharedLinks signal with body word-set gate', () => {
  it('should not flag pages with 1 shared link but different content as duplicates', async () => {
    // Regression: log-md, Query, Ingest all link only to [[concepts/Persistent-Wiki]],
    // causing 100% link Jaccard despite completely different content.
    const pages = [
      makePage(
        'concepts/log-md',
        'A log file is a chronological append-only record detailing operational history of the wiki. ' +
        'Entries track system events such as ingests queries and maintenance passes providing audit trail.',
        ['concepts/Persistent-Wiki'],
      ),
      makePage(
        'concepts/Query',
        'Query is an advanced knowledge interaction process where an LLM is prompted to synthesize ' +
        'information from multiple source pages producing cohesive answers complete with citations.',
        ['concepts/Persistent-Wiki'],
      ),
    ];
    const candidates = await generateDuplicateCandidates(pages);
    expect(candidates.find(c => c.signal === 'sharedLinks')).toBeUndefined();
  });

  it('should not flag pages with 2+ shared links but different content as duplicates', async () => {
    const pages = [
      makePage(
        'concepts/Topic1',
        'A chronological auditing mechanism tracks operational events and system ingestion history ' +
        'providing debugging capabilities and immutable append-only timeline reconstruction.',
        ['concepts/Common1', 'concepts/Common2'],
      ),
      makePage(
        'concepts/Topic2',
        'Synthesis process where intelligence queries multiple sources to produce cohesive citations ' +
        'enabling compounding knowledge retrieval and answer generation from disparate information.',
        ['concepts/Common1', 'concepts/Common2'],
      ),
    ];
    const candidates = await generateDuplicateCandidates(pages);
    expect(candidates.find(c => c.signal === 'sharedLinks')).toBeUndefined();
  });

  it('should flag pages with shared links AND similar body vocabulary as duplicates', async () => {
    const sharedPrefix =
      'A persistent wiki is a structured compounding artifact maintained by an LLM system ' +
      'storing knowledge in interlinked markdown files for continuous knowledge accumulation.';
    const pages = [
      makePage(
        'concepts/WikiA',
        sharedPrefix + ' It bridges raw sources and provides structured knowledge to users.',
        ['concepts/LLM', 'concepts/Markdown'],
      ),
      makePage(
        'concepts/WikiB',
        sharedPrefix + ' It connects raw documents to end users through structured knowledge layers.',
        ['concepts/LLM', 'concepts/Markdown'],
      ),
    ];
    const candidates = await generateDuplicateCandidates(pages);
    expect(candidates.find(c => c.signal === 'sharedLinks')).toBeDefined();
  });
});
