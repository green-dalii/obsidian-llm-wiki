import { describe, it, expect } from 'vitest';
import { generateDuplicateCandidates } from '../wiki/lint/duplicate-detection';

function makePage(path: string, body: string, links: string[] = []) {
  const linksText = links.map(l => `[[${l}]]`).join('\n');
  return {
    path,
    content: `# Title\n\n${body}\n\n${linksText}`,
    title: path.split('/').pop()!.replace('.md', ''),
  };
}

describe('generateDuplicateCandidates — sharedLinks signal with body similarity gate', () => {
  it('should not flag pages with 1 shared link but different content as duplicates', async () => {
    // Regression: log-md, Query, Ingest all link only to [[concepts/Persistent-Wiki]],
    // causing 100% link Jaccard despite completely different content.
    const pages = [
      makePage(
        'concepts/log-md',
        'A log file is a chronological append-only record of wiki events and system operations.',
        ['concepts/Persistent-Wiki'],
      ),
      makePage(
        'concepts/Query',
        'Query is an advanced knowledge synthesis process using LLM retrieval and citation tracking.',
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
        'A completely different concept about topic one with unique specialized terminology.',
        ['concepts/Common1', 'concepts/Common2'],
      ),
      makePage(
        'concepts/Topic2',
        'An entirely distinct subject discussing topic two with separate unrelated ideas.',
        ['concepts/Common1', 'concepts/Common2'],
      ),
    ];
    const candidates = await generateDuplicateCandidates(pages);
    expect(candidates.find(c => c.signal === 'sharedLinks')).toBeUndefined();
  });

  it('should flag pages with shared links AND similar body content as duplicates', async () => {
    const sharedPrefix =
      'A persistent wiki is a structured compounding artifact maintained by an LLM system.';
    const pages = [
      makePage(
        'concepts/WikiA',
        sharedPrefix + ' It stores knowledge in interlinked persistent markdown files.',
        ['concepts/LLM', 'concepts/Markdown'],
      ),
      makePage(
        'concepts/WikiB',
        sharedPrefix + ' It stores compounded knowledge across interlinked persistent markdown pages.',
        ['concepts/LLM', 'concepts/Markdown'],
      ),
    ];
    const candidates = await generateDuplicateCandidates(pages);
    expect(candidates.find(c => c.signal === 'sharedLinks')).toBeDefined();
  });
});
