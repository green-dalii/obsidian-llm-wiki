// #267 hardening — exercise the REAL union path (`computeReingestMentions`),
// building `newMentions` exactly as `PageFactory.assembleFinalContent`
// does (both the structured-branch and the legacy-branch shapes) and
// unioning against a parsed existing page body. This replaces the hand-mirrored
// union in `mentions-formatter-roundtrip.test.ts` so the #267 logic
// is covered through its real function, not a copy.

import { describe, it, expect } from 'vitest';
import { computeReingestMentions } from '../../core/mentions-parser';
import type { MentionWithProvenance } from '../../types';

const LABEL = 'Mentions in Source';

function mention(partial: Partial<MentionWithProvenance> & { quote: string; source_path: string }): MentionWithProvenance {
  return { source_slug: '', extracted_at: '', ...partial };
}

describe('computeReingestMentions — real #267 union', () => {
  it('collapses a re-ingested same-source quote (structured branch, empty source_path filled)', () => {
    // Page already accumulated a mention from notes/A.md (on-page form: notes/A).
    const existingBody = [
      '## Mentions in Source',
      '',
      '- "shared quote" — [[notes/A|A]]',
    ].join('\n');

    // New source analysis: structured provenance with EMPTY source_path
    // (the LLM-returned form; page-factory fills it at write time).
    const newMentions: MentionWithProvenance[] = [
      mention({ quote: 'shared quote', source_path: '' }),
    ];
    // Caller fills empty source_path from sourceFile.path (mirrors the
    // legacy branch in assembleFinalContent).
    const filled = newMentions.map(m => (m.source_path ? m : { ...m, source_path: 'notes/A.md' }));

    const { mentions } = computeReingestMentions(existingBody, filled, LABEL);
    // Re-ingesting the same source must NOT duplicate the quote.
    expect(mentions).toHaveLength(1);
    // Existing-first contract: the surviving entry is the one already on the page.
    expect(mentions[0].source_path).toBe('notes/A');
  });

  it('collapses a re-ingested same-source quote (legacy branch, .md suffix)', () => {
    const existingBody = [
      '## Mentions in Source',
      '',
      '- "shared quote" — [[notes/A|A]]',
    ].join('\n');

    // Legacy branch builds source_path from sourceFile.path (WITH .md).
    const newMentions: MentionWithProvenance[] = [
      mention({ quote: 'shared quote', source_path: 'notes/A.md' }),
    ];

    const { mentions } = computeReingestMentions(existingBody, newMentions, LABEL);
    expect(mentions).toHaveLength(1);
    expect(mentions[0].source_path).toBe('notes/A');
  });

  it('preserves all prior sources when a new source merges in', () => {
    const existingBody = [
      '# Oxidative Stress',
      '',
      '## Summary',
      'An accumulated page.',
      '',
      '## Mentions in Source',
      '',
      '- "quote from A" — [[notes/A|A]]',
      '- "quote from B" — [[notes/B|B]]',
    ].join('\n');

    const newMentions: MentionWithProvenance[] = [
      mention({ quote: 'quote from C', source_path: 'notes/C.md' }),
    ];

    const { mentions } = computeReingestMentions(existingBody, newMentions, LABEL);
    // Before the fix, A and B were dropped; now all three survive.
    expect(mentions.map(m => m.quote).sort()).toEqual(['quote from A', 'quote from B', 'quote from C']);
    // Existing-first: A and B must precede C (insertion order from parseMentionsSection).
    expect(mentions.map(m => m.source_path).slice(0, 2)).toEqual(['notes/A', 'notes/B']);
    expect(mentions[2].source_path).toBe('notes/C');
  });

  it('returns preserveRaw when the existing section is hand-edited', () => {
    const existingBody = [
      '## Mentions in Source',
      '',
      '- "a real quote" — [[notes/A|A]]',
      "- a user's freehand note that isn't a bullet link",
      '',
    ].join('\n');

    const newMentions: MentionWithProvenance[] = [
      mention({ quote: 'quote from C', source_path: 'notes/C.md' }),
    ];

    const { mentions, preserveRaw } = computeReingestMentions(existingBody, newMentions, LABEL);
    expect(preserveRaw).not.toBeNull();
    expect(preserveRaw).toContain("user's freehand note");
    expect(mentions).toHaveLength(0);
  });
});

// ── defaultSourcePath fill (helper self-contained normalization) ─────────────

describe('computeReingestMentions — defaultSourcePath fills blank source_path', () => {
  it('fills blank source_path from defaultSourcePath and strips .md', () => {
    const existingBody = '## Summary\nno mentions section\n';
    const newMentions: MentionWithProvenance[] = [
      mention({ quote: 'q', source_path: '' }),
    ];
    const { mentions } = computeReingestMentions(existingBody, newMentions, LABEL, 'notes/A.md');
    expect(mentions).toHaveLength(1);
    expect(mentions[0].source_path).toBe('notes/A');
  });

  it('preserves existing source_path even when defaultSourcePath is provided', () => {
    const existingBody = '## Summary\nno mentions section\n';
    const newMentions: MentionWithProvenance[] = [
      mention({ quote: 'q', source_path: 'notes/Z.md' }),
    ];
    const { mentions } = computeReingestMentions(existingBody, newMentions, LABEL, 'notes/A.md');
    // Caller-provided source_path wins over default.
    expect(mentions[0].source_path).toBe('notes/Z');
  });

  it('produces empty source_path when neither mention.path nor defaultSourcePath is provided', () => {
    const existingBody = '## Summary\nno mentions section\n';
    const newMentions: MentionWithProvenance[] = [
      mention({ quote: 'q', source_path: '' }),
    ];
    const { mentions } = computeReingestMentions(existingBody, newMentions, LABEL);
    // Defense-in-depth: no default provided ⇒ empty path, future caller must guard.
    expect(mentions[0].source_path).toBe('');
  });
});
