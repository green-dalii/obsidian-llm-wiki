import { describe, it, expect } from 'vitest';
import { cleanMarkdownResponse, stripTrailingSeparators } from '../../core/markdown';
describe('cleanMarkdownResponse', () => {
  it('strips markdown code fence (```json...```)', () => {
    // Code only recognizes markdown/md language tags; json tag text remains
    const input = '```json\n{"key": "value"}\n```';
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('{"key": "value"}');
    expect(result).not.toContain('```');
  });

  it('strips markdown code fence (```markdown...```)', () => {
    const input = '```markdown\n# Heading\nBody\n```';
    expect(cleanMarkdownResponse(input)).toBe('# Heading\nBody');
  });

  it('strips code fence without language tag', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(cleanMarkdownResponse(input)).toBe('{"key": "value"}');
  });

  it('strips opening fence without closing', () => {
    const input = '```json\n{"key": "value"}';
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('{"key": "value"}');
    expect(result).not.toContain('```');
  });

  it('strips <think>...</think> reasoning tokens', () => {
    const input = '<think>Let me analyze this entity carefully...</think>\n\n# Entity Name';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<think>');
    expect(result).toContain('# Entity Name');
  });

  it('strips <thinking>...</thinking> reasoning tokens', () => {
    const input = '<thinking>Internal reasoning here</thinking>\n\n# Concept Page';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<thinking>');
    expect(result).toContain('# Concept Page');
  });

  it('strips multiple consecutive think blocks', () => {
    const input = '<think>Step 1</think><think>Step 2</think>\n\n---\ntype: entity\n---';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<think>');
    expect(result).toContain('type: entity');
  });

  it('handles content without code fence unchanged', () => {
    const input = 'plain content no fences';
    expect(cleanMarkdownResponse(input)).toBe('plain content no fences');
  });

  it('adds missing opening --- for frontmatter-like prefix', () => {
    const input = 'type: entity\ncreated: 2026-01-01\n---\nBody content';
    const result = cleanMarkdownResponse(input);
    expect(result.startsWith('---')).toBe(true);
    expect(result).toContain('type: entity');
  });

  it('preserves preamble text when it contains colon (frontmatter-like detection)', () => {
    // Text with colons before --- is treated as frontmatter-like, so --- is prepended
    const input = 'Here is your wiki page:\n\n---\ntype: entity\n---\nBody';
    const result = cleanMarkdownResponse(input);
    expect(result.startsWith('---')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(cleanMarkdownResponse('  \n  content  \n  ')).toBe('content');
  });

  // Issue #99: Thinking-token bleeding (Layer B2: structural preamble detection)
  // Some models (e.g. Gemma 4) emit reasoning as plain text without <think>
  // wrappers. Layer 2 finds the first structural marker (frontmatter close or
  // header) and discards everything before it.

  it('strips reasoning preamble before frontmatter (Gemma 4 case)', () => {
    const input = `�-mm-im-en-en-en-A-B-C-...

Wait, I must write ALL content in Deutsch. The user provided the prompt in English but instructions state "You MUST write ALL content in Deutsch".

Plan:
1. Basic Information: Update type/sources/definition...
2. Description: Merge existing...

---
type: entity
updated: 2026-06-01
---

# Real content here
This is the actual page body.`;
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('# Real content here');
    expect(result).toContain('type: entity');
    expect(result).not.toContain('Wait, I must write');
    expect(result).not.toContain('A-B-C');
  });

  it('strips reasoning preamble before header (no frontmatter)', () => {
    const input = `Let me think about this carefully.

# Concept Name
Body content here.`;
    const result = cleanMarkdownResponse(input);
    expect(result).toContain('# Concept Name');
    expect(result).not.toContain('Let me think about this');
  });

  it('strips reasoning preamble in append mode (no structural markers)', () => {
    // No frontmatter, no header — but preamble still must go
    const input = `Some preamble text I wrote to plan my response.

This is the actual content the user wanted.`;
    const result = cleanMarkdownResponse(input);
    // No structural markers, fallback to original behavior
    expect(result).toBe(input);
  });

  it('preserves content when no preamble (regression)', () => {
    const input = '# Heading\n\nNormal content';
    expect(cleanMarkdownResponse(input)).toBe('# Heading\n\nNormal content');
  });

  it('preserves <think> token stripping behavior (regression)', () => {
    const input = '<think>reasoning</think>\n\n# Header';
    const result = cleanMarkdownResponse(input);
    expect(result).not.toContain('<think>');
    expect(result).toContain('# Header');
  });

  it('handles reasoning text that contains ## subsection markers', () => {
    // Reasoning text might mention markdown syntax; structural detection
    // should still prefer the earliest real frontmatter / header
    const input = `My reasoning: I should use ## Subsection A as a heading

# Real Page
Body`;
    const result = cleanMarkdownResponse(input);
    // Strict assertion: the entire reasoning line must be discarded, not
    // just the "My reasoning: I should use" prefix. Inline `## ` in
    // reasoning is preserved as plain text (Layer B2 only matches a `## `
    // on its own line, so it stays on the same line as the prose).
    expect(result).toBe('# Real Page\nBody');
  });

  it('handles empty input (regression)', () => {
    expect(cleanMarkdownResponse('')).toBe('');
  });

  it('handles very short input without structural markers (regression)', () => {
    expect(cleanMarkdownResponse('short')).toBe('short');
  });

  it('drops the trailing rule the page templates used to end on (#310)', () => {
    const input = '---\ntype: entity\n---\n\n# Rutosid\n\n## Description\nText.\n\n---';
    expect(cleanMarkdownResponse(input)).toBe(
      '---\ntype: entity\n---\n\n# Rutosid\n\n## Description\nText.',
    );
  });
});

describe('stripTrailingSeparators (#310)', () => {
  it('removes a trailing horizontal rule from a generated page', () => {
    const input = '---\ntype: entity\n---\n\n# Page\n\n## Description\nText.\n\n---';
    expect(stripTrailingSeparators(input)).toBe(
      '---\ntype: entity\n---\n\n# Page\n\n## Description\nText.',
    );
  });

  it('removes several rules separated by blank lines', () => {
    const input = '# Page\n\nText.\n\n---\n\n---\n\n';
    expect(stripTrailingSeparators(input)).toBe('# Page\n\nText.');
  });

  it('keeps the frontmatter terminator of a frontmatter-only document', () => {
    const input = '---\ntype: entity\naliases: ["X"]\n---';
    expect(stripTrailingSeparators(input)).toBe(input);
  });

  it('keeps a setext H2 underline, which is a heading and not a rule', () => {
    const input = '# Page\n\nSection title\n---';
    expect(stripTrailingSeparators(input)).toBe(input);
  });

  it('keeps a rule inside the body', () => {
    const input = '# Page\n\n---\n\n## Description\nText.';
    expect(stripTrailingSeparators(input)).toBe(input);
  });

  it('returns content unchanged when there is nothing to strip', () => {
    const input = '# Page\n\n## Description\nText.';
    expect(stripTrailingSeparators(input)).toBe(input);
    expect(stripTrailingSeparators('')).toBe('');
  });
});

