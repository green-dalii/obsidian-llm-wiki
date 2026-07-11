// #267 — Non-lossy Mentions re-ingest: formatter ↔ parser round-trip
//
// The fix unions the mentions already accumulated on a page with the new
// source's before re-emitting the section. That union depends on parsing the
// existing `## Mentions in Source` block back into structured mentions, which
// the code never did before. These tests pin the format ↔ parse contract so
// the two cannot drift, and exercise the fail-safe + the #267 regression.

import { describe, it, expect } from 'vitest';
import { formatMentionsSection } from '../../core/mentions-formatter';
import { parseMentionsSection, stripMentionsSection } from '../../core/mentions-parser';
import { injectMentionsSection } from '../../core/mentions-injector';
import { dedupMentionsByProvenanceKey } from '../../core/batch-merger';
import type { MentionWithProvenance } from '../../types';

const LABEL = 'Mentions in Source';

function mention(partial: Partial<MentionWithProvenance> & { quote: string; source_path: string }): MentionWithProvenance {
  return { source_slug: '', extracted_at: '', ...partial };
}

// ─── round-trip fidelity ─────────────────────────────────────────────────

describe('formatMentionsSection ↔ parseMentionsSection round-trip', () => {
  it('recovers quote and source_path from a single bullet', () => {
    const section = formatMentionsSection(['the quick brown fox'], 'notes/MyNote.md', LABEL);
    const parsed = parseMentionsSection(section, LABEL);
    expect(parsed.found).toBe(true);
    expect(parsed.fullyParsed).toBe(true);
    expect(parsed.mentions).toEqual([
      mention({ quote: 'the quick brown fox', source_path: 'notes/MyNote' }),
    ]);
  });

  it('recovers the optional translation', () => {
    const structured = [mention({ quote: '光合作用', translation: 'photosynthesis', source_path: 'notes/Bio.md' })];
    const section = formatMentionsSection(structured, 'notes/Bio.md', LABEL);
    const parsed = parseMentionsSection(section, LABEL);
    expect(parsed.fullyParsed).toBe(true);
    expect(parsed.mentions[0].quote).toBe('光合作用');
    expect(parsed.mentions[0].translation).toBe('photosynthesis');
    expect(parsed.mentions[0].source_path).toBe('notes/Bio');
  });

  it('recovers every mention across multiple sources', () => {
    const structured = [
      mention({ quote: 'quote A', source_path: 'notes/A.md', extracted_at: '2026-01-01T00:00:00Z' }),
      mention({ quote: 'quote B', source_path: 'notes/B.md', extracted_at: '2026-02-01T00:00:00Z' }),
      mention({ quote: 'quote C', source_path: 'notes/C.md', extracted_at: '2026-03-01T00:00:00Z' }),
    ];
    const section = formatMentionsSection(structured, 'notes/A.md', LABEL);
    const parsed = parseMentionsSection(section, LABEL);
    expect(parsed.fullyParsed).toBe(true);
    expect(parsed.mentions.map(m => m.quote).sort()).toEqual(['quote A', 'quote B', 'quote C']);
    expect(parsed.mentions.map(m => m.source_path).sort()).toEqual(['notes/A', 'notes/B', 'notes/C']);
  });

  it('re-formatting a parsed section preserves the quotes and links', () => {
    const original = formatMentionsSection(
      [
        mention({ quote: 'alpha', source_path: 'notes/A.md' }),
        mention({ quote: 'beta', translation: 'zwei', source_path: 'notes/B.md' }),
      ],
      'notes/A.md',
      LABEL,
    );
    const reemitted = formatMentionsSection(parseMentionsSection(original, LABEL).mentions, 'notes/A.md', LABEL);
    expect(reemitted).toContain('- "alpha" — [[notes/A|A]]');
    expect(reemitted).toContain('- "beta" (zwei) — [[notes/B|B]]');
  });
});

// ─── fail-safe on hand-edited / unparseable blocks ───────────────────────

describe('parseMentionsSection fail-safe', () => {
  it('flags a hand-edited section as not fully parsed and keeps raw', () => {
    const body = [
      '## Mentions in Source',
      '',
      '- "a real quote" — [[notes/A|A]]',
      "- a user's freehand note that isn't a bullet link",
      '',
    ].join('\n');
    const parsed = parseMentionsSection(body, LABEL);
    expect(parsed.found).toBe(true);
    expect(parsed.fullyParsed).toBe(false);
    // The one well-formed bullet still parses…
    expect(parsed.mentions).toEqual([mention({ quote: 'a real quote', source_path: 'notes/A' })]);
    // …and the raw block is available verbatim for the caller to preserve.
    expect(parsed.raw).toContain("user's freehand note");
  });

  it('reports found:false when there is no section', () => {
    const parsed = parseMentionsSection('# Title\n\n## Summary\n\nbody', LABEL);
    expect(parsed.found).toBe(false);
    expect(parsed.fullyParsed).toBe(true);
    expect(parsed.mentions).toEqual([]);
  });

  it('stripMentionsSection removes the block and leaves other sections intact', () => {
    const body = [
      '# Foo',
      '',
      '## Summary',
      'text',
      '',
      '## Mentions in Source',
      '- "q" — [[notes/A|A]]',
    ].join('\n');
    const stripped = stripMentionsSection(body, LABEL);
    expect(stripped).toContain('## Summary');
    expect(stripped).not.toContain('## Mentions in Source');
    expect(stripped).not.toContain('[[notes/A|A]]');
  });
});

// ─── composite-key dedup ─────────────────────────────────────────────────

describe('dedupMentionsByProvenanceKey', () => {
  it('drops a mention identical in quote AND source', () => {
    const a = [mention({ quote: 'same', source_path: 'notes/A' })];
    const b = [mention({ quote: 'same', source_path: 'notes/A' })];
    expect(dedupMentionsByProvenanceKey(a, b)).toHaveLength(1);
  });

  it('keeps the same quote when it comes from a different source', () => {
    const a = [mention({ quote: 'same', source_path: 'notes/A' })];
    const b = [mention({ quote: 'same', source_path: 'notes/B' })];
    const out = dedupMentionsByProvenanceKey(a, b)!;
    expect(out).toHaveLength(2);
    expect(out.map(m => m.source_path).sort()).toEqual(['notes/A', 'notes/B']);
  });

  it('preserves insertion order, existing first', () => {
    const a = [mention({ quote: 'x', source_path: 'notes/A' })];
    const b = [mention({ quote: 'y', source_path: 'notes/B' })];
    expect(dedupMentionsByProvenanceKey(a, b)!.map(m => m.quote)).toEqual(['x', 'y']);
  });
});

// ─── #267 regression: union preserves cross-source mentions ──────────────

describe('#267 — non-lossy re-ingest (parse ∪ new → inject)', () => {
  it('preserves all prior sources when a new source is merged in', () => {
    // A page that already accumulated mentions from source A and source B.
    const existingBody = [
      '# Oxidative Stress',
      '',
      '## Summary',
      'An accumulated page.',
      '',
      formatMentionsSection(
        [
          mention({ quote: 'quote from A', source_path: 'notes/A.md', extracted_at: '2026-01-01T00:00:00Z' }),
          mention({ quote: 'quote from B', source_path: 'notes/B.md', extracted_at: '2026-02-01T00:00:00Z' }),
        ],
        'notes/A.md',
        LABEL,
      ),
    ].join('\n');

    // New source C arrives. This mirrors assembleFinalContent's union step.
    const newMentions = [mention({ quote: 'quote from C', source_path: 'notes/C.md', extracted_at: '2026-03-01T00:00:00Z' })];
    const parsed = parseMentionsSection(existingBody, LABEL);
    expect(parsed.fullyParsed).toBe(true);
    const unioned = dedupMentionsByProvenanceKey(parsed.mentions, newMentions)!;
    const merged = injectMentionsSection(existingBody, unioned, 'notes/C.md', { sectionLabel: LABEL });

    // Before the fix, A and B were dropped; now all three survive.
    expect(merged).toContain('quote from A');
    expect(merged).toContain('quote from B');
    expect(merged).toContain('quote from C');
    // Exactly one Mentions section — no duplication.
    expect((merged.match(/## Mentions in Source/g) || []).length).toBe(1);
  });

  it('does not accumulate a duplicate when the same source is re-ingested unchanged', () => {
    const existingBody = [
      '## Mentions in Source',
      '',
      '- "stable quote" — [[notes/A|A]]',
    ].join('\n');
    const sameAgain = [mention({ quote: 'stable quote', source_path: 'notes/A' })];
    const parsed = parseMentionsSection(existingBody, LABEL);
    const unioned = dedupMentionsByProvenanceKey(parsed.mentions, sameAgain)!;
    expect(unioned).toHaveLength(1);
  });
});
