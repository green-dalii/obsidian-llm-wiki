// v1.20.0: Query Wiki thinking-block UI behavior.
//
// Background: When thinking-capable models (Claude Sonnet 4.5+, OpenAI o1/o3)
// run with the plugin's default "no explicit thinking control" mode, the
// provider itself decides whether to emit reasoning. Reasoning that
// appears in the response must not visually intrude on the answer —
// ChatGPT/Claude.ai style — but the user may want to inspect it. The Query
// Wiki wraps extracted <think>...</think> blocks in a <details> element
// with a localized summary line; the visible content renders normally.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderThinkingBlocksUI } from '../../wiki/query-engine';

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.document = dom.window.document;
  // eslint-disable-next-line obsidianmd/no-global-this
  (globalThis as Record<string, unknown>).activeDocument = dom.window.document;
  // eslint-disable-next-line obsidianmd/no-global-this
  globalThis.HTMLElement = dom.window.HTMLElement;
});

afterEach(() => {
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).document;
  // eslint-disable-next-line obsidianmd/no-global-this
  delete (globalThis as Record<string, unknown>).HTMLElement;
  vi.restoreAllMocks();
});

describe('renderThinkingBlocksUI', () => {
  it('returns null when no thinking blocks', () => {
    const result = renderThinkingBlocksUI([], 'en');
    expect(result).toBeNull();
  });

  it('renders a <details> element with a localized summary line', () => {
    const el = renderThinkingBlocksUI(['Step 1 thinking.'], 'en') as HTMLElement;
    expect(el.tagName).toBe('DETAILS');

    const summary = el.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('Thinking');
    // English label
    expect(summary?.textContent).toMatch(/[Tt]hink/);
  });

  it('renders each thinking block as a separate <pre> element', () => {
    const el = renderThinkingBlocksUI(['Block 1 content.', 'Block 2 content.'], 'en') as HTMLElement;
    const pres = el.querySelectorAll('pre');
    expect(pres.length).toBe(2);
    expect(pres[0].textContent).toBe('Block 1 content.');
    expect(pres[1].textContent).toBe('Block 2 content.');
  });

  it('marks the <details> as collapsed by default (no `open` attribute)', () => {
    const el = renderThinkingBlocksUI(['Some thinking.'], 'en') as HTMLElement;
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('uses Chinese summary when language is zh', () => {
    const el = renderThinkingBlocksUI(['思考内容。'], 'zh') as HTMLElement;
    const summary = el.querySelector('summary');
    expect(summary?.textContent).toContain('思考');
  });

  it('uses German translation when available (no fallback to en)', () => {
    const el = renderThinkingBlocksUI(['Thinking.'], 'de') as HTMLElement;
    const summary = el.querySelector('summary');
    expect(summary?.textContent).toMatch(/[Dd]enk/);
  });

  it('does not escape HTML inside thinking blocks (preserves preformatted content)', () => {
    const el = renderThinkingBlocksUI(['<tag>code</tag>'], 'en') as HTMLElement;
    const pre = el.querySelector('pre');
    // The textContent should contain the literal <tag> — no HTML escape needed in textContent
    expect(pre?.textContent).toContain('<tag>code</tag>');
  });

  it('includes step count in summary when there are multiple blocks', () => {
    const el = renderThinkingBlocksUI(['A', 'B', 'C'], 'en') as HTMLElement;
    const summary = el.querySelector('summary');
    // Either "3 steps" or similar indicator
    expect(summary?.textContent).toMatch(/3/);
  });
});
