// Issue #185: propagate source-note frontmatter `aliases:` to the
// generated sources/<slug> page. Step 1 — extract.
//
// Reading source frontmatter is the responsibility of SourceAnalyzer
// (it owns the vault read + parse logic). Step 1 verifies that the
// analyzer pulls `aliases:` out of the source note's frontmatter and
// exposes it on the returned SourceAnalysis as `source_note_aliases`.
//
// Scope guard: Step 1 ONLY adds extraction. Propagation into the
// `sources/<slug>` page frontmatter is Step 2.

import { describe, it, expect } from 'vitest';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { SourceAnalyzer } from '../../wiki/source-analyzer';
import { TFile } from 'obsidian';

const NOTE_WITH_ALIASES_YAML = 'sources/exekutive-funktionen.md';
const NOTE_WITHOUT_FRONTMATTER = 'sources/plain.md';
const NOTE_WITH_EMPTY_ALIASES = 'sources/empty-aliases.md';
const NOTE_BLANK = 'sources/blank.md';

function makeAnalyzer(
  vaultFiles: Record<string, string>,
  llmResponses: string[]
): SourceAnalyzer {
  const { ctx } = createMockContext({ vaultFiles, llmResponses });
  return new SourceAnalyzer(ctx);
}

// The SourceAnalyzer only reads file.path and file.basename from the TFile.
// Our mock provides both fields, so the cast is safe for testing.
async function runAnalyzer(analyzer: SourceAnalyzer, path: string) {
  // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
  return analyzer.analyzeSource(createMockFile(path) as unknown as TFile);
}

describe('SourceAnalyzer — Issue #185 source-note aliases extraction', () => {
  it('extracts a 5-item YAML aliases array from the source note frontmatter (#185)', async () => {
    const a = makeAnalyzer(
      {
        // The repro from the issue: German inflectional variants curated
        // by the note author. After ingest, the generated sources/<slug>
        // page currently misses all of these — this test only verifies
        // extraction; propagation is Step 2.
        [NOTE_WITH_ALIASES_YAML]: `---
aliases: [Exekutive Funktionen, Executive Function, Exekutiv Funktionen, Exekutiven Funktionen, exekutive Funktionen]
tags: [concept]
---

# Exekutive Funktionen

Some body content.
`,
      },
      [JSON.stringify({
        source_title: 'Exekutive Funktionen',
        summary: 'Cognitive control processes.',
        entities: [{ name: 'Prefrontal Cortex', type: 'place', summary: 'brain region', mentions_in_source: [] }],
        concepts: [],
      })]
    );
    const result = await runAnalyzer(a, NOTE_WITH_ALIASES_YAML);
    expect(result).not.toBeNull();
    expect(result!.source_note_aliases).toEqual([
      'Exekutive Funktionen',
      'Executive Function',
      'Exekutiv Funktionen',
      'Exekutiven Funktionen',
      'exekutive Funktionen',
    ]);
  });

  it('returns an empty array when the source has no frontmatter block', async () => {
    const a = makeAnalyzer(
      { [NOTE_WITHOUT_FRONTMATTER]: '# Plain Note\nJust text, no frontmatter.' },
      [JSON.stringify({
        source_title: 'Plain Note',
        summary: 'No FM.',
        entities: [{ name: 'X', type: 'other', summary: 'x', mentions_in_source: [] }],
      })]
    );
    const result = await runAnalyzer(a, NOTE_WITHOUT_FRONTMATTER);
    expect(result).not.toBeNull();
    expect(result!.source_note_aliases).toEqual([]);
  });

  it('returns an empty array when the frontmatter has no aliases key', async () => {
    const a = makeAnalyzer(
      {
        // tags only — the analyzer must not synthesize aliases from other fields
        [NOTE_WITHOUT_FRONTMATTER]: `---
tags: [concept]
---

# Tag-only Note

Body.
`,
      },
      [JSON.stringify({
        source_title: 'Tag-only Note',
        summary: 'No aliases.',
        entities: [{ name: 'X', type: 'other', summary: 'x', mentions_in_source: [] }],
      })]
    );
    const result = await runAnalyzer(a, NOTE_WITHOUT_FRONTMATTER);
    expect(result).not.toBeNull();
    expect(result!.source_note_aliases).toEqual([]);
  });

  it('returns an empty array when aliases: is present but empty', async () => {
    const a = makeAnalyzer(
      { [NOTE_WITH_EMPTY_ALIASES]: `---
aliases: []
---

# Empty Aliases

Body.
` },
      [JSON.stringify({
        source_title: 'Empty Aliases',
        summary: 'Empty alias list.',
        entities: [{ name: 'X', type: 'other', summary: 'x', mentions_in_source: [] }],
      })]
    );
    const result = await runAnalyzer(a, NOTE_WITH_EMPTY_ALIASES);
    expect(result).not.toBeNull();
    expect(result!.source_note_aliases).toEqual([]);
  });

  it('returns null for blank sources without ever extracting aliases (#164 + #185)', async () => {
    // #164 guards blank inputs; #185 extraction must run inside the
    // post-FM-guard window — never trigger parsing on blank content.
    const a = makeAnalyzer(
      { [NOTE_BLANK]: '' },
      // No LLM call should happen — the analyzer must short-circuit.
      ['__unused__']
    );
    const result = await runAnalyzer(a, NOTE_BLANK);
    expect(result).toBeNull();
  });

  it('extracts a block-style `aliases:` array (the most common Obsidian format) (#185)', async () => {
    // Obsidian's frontmatter UI defaults to block-style
    // `aliases:\n  - a\n  - b` rather than inline `[a, b]`. The mock's
    // delegated parseFrontmatter must surface both shapes as a string array,
    // matching Obsidian's real metadataCache.getFileCache behavior.
    const a = makeAnalyzer(
      {
        ['sources/block-style-aliases.md']: `---
aliases:
  - "Exekutive Funktionen"
  - "Executive Function"
  - "Exekutiv Funktionen"
tags: [concept]
---

Body.
`,
      },
      [JSON.stringify({
        source_title: 'Block Aliases',
        summary: 'Block-style check.',
        entities: [{ name: 'X', type: 'other', summary: 'x', mentions_in_source: [] }],
      })]
    );
    const result = await runAnalyzer(a, 'sources/block-style-aliases.md');
    expect(result).not.toBeNull();
    expect(result!.source_note_aliases).toEqual([
      'Exekutive Funktionen',
      'Executive Function',
      'Exekutiv Funktionen',
    ]);
  });
});
