// The extraction prompt asks for a `translation` field alongside each verbatim
// quote. That only makes sense when the source and the wiki speak different
// languages — translating a Russian quote into a Russian wiki is wasteful and
// bloats the batch JSON toward truncation.
//
// The source note's frontmatter `language:` is the explicit signal; the legacy
// `wikiLanguage !== 'en'` proxy stays in place for untagged sources.

import { describe, it, expect, vi } from 'vitest';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { SourceAnalyzer } from '../../wiki/source-analyzer';
import { TFile } from 'obsidian';

const SOURCE_PATH = 'sources/lecture.md';
const TRANSLATION_MARKER = 'TRANSLATION (cross-language wikis)';

const EXTRACTION_RESPONSE = JSON.stringify({
  source_title: 'Lecture',
  summary: 'A lecture.',
  entities: [{ name: 'Foo', type: 'other', summary: 'bar', mentions_in_source: [] }],
  concepts: [],
});

/** Run one extraction and return the user prompt handed to the LLM. */
async function promptFor(body: string, wikiLanguage: string): Promise<string> {
  const { ctx } = createMockContext({
    vaultFiles: { [SOURCE_PATH]: body },
    llmResponses: [EXTRACTION_RESPONSE],
    settings: { wikiLanguage },
  });
  const spy = vi.spyOn(ctx.getClient()!, 'createMessage');
  const analyzer = new SourceAnalyzer(ctx);
  // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
  await analyzer.analyzeSource(createMockFile(SOURCE_PATH) as unknown as TFile);
  expect(spy).toHaveBeenCalled();
  return spy.mock.calls[0][0].messages[0].content as string;
}

function withLanguage(language: string): string {
  return `---\nlanguage: ${language}\n---\n\n# Лекция\n\nСодержание лекции.\n`;
}

const NO_FRONTMATTER = '# Лекция\n\nСодержание лекции.\n';

describe('SourceAnalyzer — translation hint gating', () => {
  it('omits the translation instruction when the source declares the wiki language', async () => {
    expect(await promptFor(withLanguage('ru'), 'ru')).not.toContain(TRANSLATION_MARKER);
  });

  it('matches the language name as well as the code', async () => {
    // wikiLanguage 'de' resolves to the display name 'Deutsch' via WIKI_LANGUAGES.
    expect(await promptFor(withLanguage('Deutsch'), 'de')).not.toContain(TRANSLATION_MARKER);
  });

  it('ignores case and surrounding whitespace in the declared language', async () => {
    expect(await promptFor(withLanguage('"  RU  "'), 'ru')).not.toContain(TRANSLATION_MARKER);
  });

  it('keeps the translation instruction when the source is in a different language', async () => {
    expect(await promptFor(withLanguage('en'), 'de')).toContain(TRANSLATION_MARKER);
  });

  it('falls back to the legacy proxy for an untagged source in a non-English wiki', async () => {
    expect(await promptFor(NO_FRONTMATTER, 'de')).toContain(TRANSLATION_MARKER);
  });

  it('falls back to the legacy proxy for an untagged source in an English wiki', async () => {
    expect(await promptFor(NO_FRONTMATTER, 'en')).not.toContain(TRANSLATION_MARKER);
  });

  it('asks for a translation in an English wiki when the source declares a foreign language', async () => {
    // Behaviour change: the legacy proxy suppressed the instruction for every
    // English wiki, so quotes from a foreign source arrived untranslated. An
    // explicit `language:` now makes the cross-language case detectable.
    expect(await promptFor(withLanguage('ru'), 'en')).toContain(TRANSLATION_MARKER);
  });
});
