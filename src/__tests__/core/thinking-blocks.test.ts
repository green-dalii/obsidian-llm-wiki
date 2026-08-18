// v1.20.0: extractThinkingBlocks — pure function that separates the
// reasoning content from the visible response, so the Query Wiki can show
// the reasoning inside a <details> collapsible block (default collapsed)
// while the visible markdown renders normally.
//
// Background: When thinking-capable models (Claude Sonnet 4.5+, OpenAI o1/o3)
// run with the plugin's default "no explicit thinking control" behavior, the
// provider itself decides whether to emit reasoning. Some emit
// <think>...</think> XML blocks; some emit <thinking>...</thinking>; some
// return an `analysis` field separately (OpenAI o1). This extractor
// normalizes all three forms into a single shape so the UI layer can render
// uniformly.

import { describe, it, expect } from 'vitest';
import { extractThinkingBlocks } from '../../core/markdown';

describe('extractThinkingBlocks', () => {
  it('returns empty array and original content when no thinking blocks present', () => {
    const input = '# Page Title\n\nSome content here.';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toEqual([]);
    expect(result.visibleContent).toBe(input);
  });

  it('extracts single <think>...</think> block', () => {
    const input = '<think>Let me analyze this carefully.</think>\n\n# Visible Content';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toHaveLength(1);
    expect(result.thinkingBlocks[0]).toBe('Let me analyze this carefully.');
    expect(result.visibleContent).toBe('# Visible Content');
  });

  it('extracts multiple <think>...</think> blocks in order', () => {
    const input = '<think>Step 1: research.</think>\n\n# Heading\n\n<think>Step 2: write.</think>\n\nBody.';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toHaveLength(2);
    expect(result.thinkingBlocks[0]).toBe('Step 1: research.');
    expect(result.thinkingBlocks[1]).toBe('Step 2: write.');
    expect(result.visibleContent).toContain('# Heading');
    expect(result.visibleContent).not.toContain('<think>');
  });

  it('extracts <thinking>...</thinking> blocks (alternate XML)', () => {
    const input = '<thinking>Internal reasoning here.</thinking>\n\n# Visible';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toHaveLength(1);
    expect(result.thinkingBlocks[0]).toBe('Internal reasoning here.');
    expect(result.visibleContent).toBe('# Visible');
  });

  it('handles mixed <think> and <thinking> blocks together', () => {
    const input = '<think>First.</think>\n\n# Mid\n\n<thinking>Second.</thinking>\n\n# End';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toEqual(['First.', 'Second.']);
    expect(result.visibleContent).toContain('# Mid');
    expect(result.visibleContent).toContain('# End');
  });

  // v1.26.4 PATCH #473 — LM Studio / DeepSeek reasoning models emit
  // chain-of-thought into the visible content channel wrapped only in the
  // bare ` thinking… response` delimiter (no XML tags). This used to
  // leak straight into MarkdownRenderer.
  it('strips bare thinking...response text form (no XML)', () => {
    const input = ' thinking\n我需要分析这个 Wiki 的健康状况。\n response\n\n## LLM 分析\n\n- 矛盾: A';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toEqual(['我需要分析这个 Wiki 的健康状况。']);
    expect(result.visibleContent).not.toContain('我需要分析');
    expect(result.visibleContent).toContain('## LLM 分析');
    expect(result.visibleContent).toContain('- 矛盾: A');
  });

  it('strips multiple bare thinking blocks in one response', () => {
    const input = ' thinking\nfirst\n response\n\n- item 1\n\n thinking\nsecond\n response\n\n- item 2';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toEqual(['first', 'second']);
    expect(result.visibleContent).not.toContain('first');
    expect(result.visibleContent).not.toContain('second');
  });

  it('leaves bare thinking block incomplete (no response) intact in visible', () => {
    // Defensive: if the model emits ` thinking\n…` without a closing
    // ` response`, leave the body visible rather than swallowing the rest.
    const input = ' thinking\nnever closes\n\n- item 1';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toEqual([]);
    expect(result.visibleContent).toContain('never closes');
    expect(result.visibleContent).toContain('- item 1');
  });

  it('preserves inline <think> in visible content if block is incomplete (no closing tag)', () => {
    // Defensive: if the model emitted <think> without a closing tag, leave it
    // visible (rather than swallowing everything after).
    const input = '# Visible\n\n<think>this never closes\n\nMore visible content';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toEqual([]);
    expect(result.visibleContent).toBe(input);
  });

  it('handles <think> spanning multiple lines', () => {
    const input = '<think>Line 1\nLine 2\nLine 3</think>\n\n# Visible';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toHaveLength(1);
    expect(result.thinkingBlocks[0]).toBe('Line 1\nLine 2\nLine 3');
  });

  it('handles <think> with attributes on opening tag (e.g. role=assistant)', () => {
    // Some implementations emit: <think role="assistant">...</think>
    const input = '<think role="assistant">Reasoning here.</think>\n\n# Visible';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks).toEqual(['Reasoning here.']);
    expect(result.visibleContent).toBe('# Visible');
  });

  it('trims whitespace around extracted thinking block content', () => {
    const input = '<think>   \n  Reasoning text.  \n  </think>\n\n# Visible';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks[0]).toBe('Reasoning text.');
  });

  it('preserves internal whitespace within thinking block (except leading/trailing)', () => {
    const input = '<think>Step 1:\n  - detail A\n  - detail B\nStep 2: conclusion</think>\n\n# Visible';
    const result = extractThinkingBlocks(input);
    expect(result.thinkingBlocks[0]).toBe('Step 1:\n  - detail A\n  - detail B\nStep 2: conclusion');
  });
});
