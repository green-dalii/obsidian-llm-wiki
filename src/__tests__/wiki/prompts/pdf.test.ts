// Tests for src/wiki/prompts/pdf.ts.
//
// Two responsibilities:
//   1. Lock in the system prompt's anti-hallucination and anti-fence
//      invariants so future rewrites can't silently drop them.
//   2. Pin the unwrapFencedMarkdown helper's behavior for every
//      common LLM output shape we observed in production (e2e
//      2026-07-17 user logs).

import { describe, it, expect } from 'vitest';
import {
  PDF_CONVERSION_SYSTEM_PROMPT,
  PDF_PROMPTS,
  unwrapFencedMarkdown,
} from '../../../wiki/prompts/pdf';

describe('PDF_CONVERSION_SYSTEM_PROMPT — anti-hallucination invariants', () => {
  it('forbids markdown fence wrappers (verbatim "no surrounding markdown fences" rule)', () => {
    // Pre-fix versions had the rule weakly expressed as
    // "Output the converted Markdown directly, with no surrounding
    // markdown fences." — small models still wrapped in ```markdown.
    // The rewrite names each wrapper explicitly.
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/Do NOT wrap/i);
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toContain('```markdown');
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toContain('<output>');
  });

  it('instructs verbatim reproduction (anti-modernization)', () => {
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/verbatim/i);
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toContain('OCR-style');
  });

  it('promotes [illegible] marker over hallucination', () => {
    // The single most important anti-hallucination rule: when input is
    // unclear, prefer a marker over a best-guess.
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toContain('[illegible]');
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toContain('[figure:');
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toContain('[equation:');
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/prefer.*illegible.*guessing|illegible.*guess/i);
  });

  it('forbids inventing content the source lacks', () => {
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/Do NOT invent/i);
    // Pre-fix version said "Preserve the document structure" — the
    // rewrite keeps verbatim guidance instead. We assert the
    // anti-invention invariant through the explicit Do NOT invent rule
    // and the verbatim-fidelity block.
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/VERBATIM/);
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/Do not invent paragraph breaks/i);
  });

  it('instructs no preamble / no postscript', () => {
    // Pre-fix: small models added "Here is the converted Markdown:" or
    // "```markdown" preamble that contaminated downstream wiki
    // generation.
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/no preamble|No preamble/i);
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/no postscript|No postscript/i);
  });

  it('preserves source language exactly (no translation)', () => {
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/Preserve the source PDF language/i);
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/Do NOT translate/i);
  });

  it('instructs YAML frontmatter is OPTIONAL (omit if uncertain)', () => {
    // Pre-fix version made the frontmatter block sound mandatory —
    // some models then hallucinated title/author. The rewrite says
    // "omit... if you cannot determine confidently".
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toMatch(/Omit.*confidently|omit fields/i);
  });

  it('forbids emitting a `tags:` field in the frontmatter', () => {
    // PR3 follow-up #5 (Bug H4): LLM-accentuated `tags:` polluted the
    // wiki's tag vocabulary. The rewrite tells the model to skip it.
    expect(PDF_CONVERSION_SYSTEM_PROMPT).toContain('OMIT the `tags` field');
  });
});

describe('unwrapFencedMarkdown — output cleanup for small-model responses', () => {
  it('passes clean markdown through untouched', () => {
    const input = '# Creative Thinking\n\nThe human brain, if it is below the critical lap...';
    const out = unwrapFencedMarkdown(input);
    expect(out).toBe(input);
  });

  it('strips single ```markdown ... ``` outer fence', () => {
    const input = '```markdown\n# Body\n\nSome text\n```';
    const out = unwrapFencedMarkdown(input);
    expect(out).toBe('# Body\n\nSome text');
  });

  it('strips single ``` ... ``` (no language tag) outer fence', () => {
    const input = '```\n# Title\n\nBody\n```';
    const out = unwrapFencedMarkdown(input);
    expect(out).toBe('# Title\n\nBody');
  });

  it('strips <output>...</output> wrapper (multiline)', () => {
    const input = '<output>\n# X\n\nY\n</output>';
    const out = unwrapFencedMarkdown(input);
    expect(out).toBe('# X\n\nY');
  });

  it('strips leading conversational preamble ("Here is the converted Markdown:")', () => {
    const input = 'Here is the converted Markdown:\n\n# Title\n\nBody.';
    const out = unwrapFencedMarkdown(input);
    expect(out).toBe('# Title\n\nBody.');
  });

  it('strips BOM at file start', () => {
    const input = '﻿# Title\n\nBody';
    const out = unwrapFencedMarkdown(input);
    expect(out).toBe('# Title\n\nBody');
  });

  it('does NOT touch content mid-document that legitimately uses inline code fences', () => {
    // The cleanup only strips OUTERMOST wrapping fences. Internal
    // ```python\nprint("x")\n``` blocks must survive.
    const input = [
      '# The Law of Large Numbers',
      '',
      'Here is how to verify:',
      '',
      '```python',
      'print("hello")',
      '```',
      '',
      'Followed by more prose.',
    ].join('\n');
    const out = unwrapFencedMarkdown(input);
    expect(out).toBe(input);
  });

  it('returns input unchanged when identity is critical (no recognizable wrapper)', () => {
    const input = 'Some prose with a markdown mention but no fence.';
    expect(unwrapFencedMarkdown(input)).toBe(input);
  });

  it('returns empty string unchanged', () => {
    expect(unwrapFencedMarkdown('')).toBe('');
  });

  it('does NOT strip prose-style code fence references (inline backticks)', () => {
    // Inline backticks like `this is code` are NOT a wrapping fence.
    const input = 'The `pdf` part is just text in backticks, not a fence.';
    expect(unwrapFencedMarkdown(input)).toBe(input);
  });
});

describe('PDF_PROMPTS barrel — coherent shape', () => {
  it('exposes systemPrompt identical to the named export', () => {
    expect(PDF_PROMPTS.systemPrompt).toBe(PDF_CONVERSION_SYSTEM_PROMPT);
  });

  it('exposes unwrapFencedMarkdown identical to the named export', () => {
    expect(PDF_PROMPTS.unwrapFencedMarkdown).toBe(unwrapFencedMarkdown);
  });
});
