/**
 * v1.24.1 PATCH Phase 5.5.0: seed-selector must feed LLM TITLE + ALIASES
 * (not path + summary). User vault pages frequently lack summary
 * frontmatter but have rich aliases — summary-only input was the root
 * cause of the persistent empty-seed bug.
 *
 * Why this test file is separate from seed-selector.test.ts:
 * - The legacy file uses a `makePageRef` that sets `summary` on the
 *   page; the new pagesList format must NOT contain the literal
 *   string "summary" as the per-page key.
 * - Keeping it isolated makes the new contract explicit and avoids
 *   coupling to legacy fixture shape.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectSeedsWithLLM, type SeedLLMClient } from '../../wiki/query-engine/pipeline/seed-selector';
import type { PageRef } from '../../core/ppr-cascade';

function makeAliasPage(
  path: string,
  title: string,
  aliases: string[],
  summary = '', // intentionally present but should NOT be sent to LLM
): PageRef {
  return { path, title, aliases, summary };
}

function makeClient(createMessage: SeedLLMClient['createMessage']): SeedLLMClient {
  return { createMessage };
}

describe('selectSeedsWithLLM — pagesList uses title+aliases (Phase 5.5.0)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('emits title + aliases for each candidate (not path + summary)', async () => {
    const createMessage = vi.fn();
    createMessage.mockResolvedValue('{"seeds":["entities/Janus.md"]}');

    const pageRefs: PageRef[] = [
      makeAliasPage(
        'entities/Janus.md',
        'Janus',
        ['DeepSeek Janus', 'Janus model', 'Multimodal model'],
        'this summary should NOT be sent to LLM',
      ),
    ];

    await selectSeedsWithLLM('multimodal model', pageRefs, makeClient(createMessage), { model: 'gpt-4' });

    const callArg = createMessage.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const promptContent: string = callArg.messages[0].content;

    // Must contain path (so LLM knows which file to return)
    expect(promptContent).toContain('entities/Janus.md');
    // Must contain title
    expect(promptContent).toContain('Janus');
    // Must contain aliases — they are the curated signal that summary
    // lacks on user pages.
    expect(promptContent).toContain('DeepSeek Janus');
    expect(promptContent).toContain('Janus model');
    expect(promptContent).toContain('Multimodal model');
    // Must NOT include summary text — summary frontmatter is missing
    // on user pages (entities/Janus.md has no `summary:` field).
    expect(promptContent).not.toContain('this summary should NOT be sent to LLM');
  });

  it('uses the same alias-only input for pages with no summary at all', async () => {
    // Exact e2e shape: entities/Janus.md has aliases but NO summary.
    const createMessage = vi.fn();
    createMessage.mockResolvedValue('{"seeds":[]}');

    const pageRefs: PageRef[] = [
      makeAliasPage('entities/Janus.md', 'Janus', ['DeepSeek Janus']),
      makeAliasPage('entities/InternVL3.md', 'InternVL3', ['InternVL 3', 'OpenGVLab']),
    ];

    await selectSeedsWithLLM('InternVL和Janus', pageRefs, makeClient(createMessage), { model: 'gpt-4' });

    const callArg = createMessage.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const promptContent: string = callArg.messages[0].content;

    // Both pages' title + aliases appear
    expect(promptContent).toContain('InternVL3');
    expect(promptContent).toContain('InternVL 3');
    expect(promptContent).toContain('OpenGVLab');
    expect(promptContent).toContain('DeepSeek Janus');
  });

  it('handles page with empty aliases (only title available)', async () => {
    const createMessage = vi.fn();
    createMessage.mockResolvedValue('{"seeds":[]}');

    const pageRefs: PageRef[] = [
      makeAliasPage('entities/Foo.md', 'Foo', []),
    ];

    await selectSeedsWithLLM('foo', pageRefs, makeClient(createMessage), { model: 'gpt-4' });

    const callArg = createMessage.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const promptContent: string = callArg.messages[0].content;
    // Path + title present (no aliases section when aliases is empty)
    expect(promptContent).toContain('entities/Foo.md');
    expect(promptContent).toContain('Foo');
  });
});