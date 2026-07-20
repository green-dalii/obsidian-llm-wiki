import { describe, it, expect, vi } from 'vitest';
import { createMockContext, createMockFile } from '../__support__/engine-context';
import { SourceAnalyzer } from '../../wiki/source-analyzer';
import { normalizeFinishReason } from '../../llm-sdk/finish-reason';
import type { LLMClient, LLMFinishReason } from '../../types';
import { TFile } from 'obsidian';

// Issue #305 — a truncated batch response is not an error.
//
// An OpenAI-compatible provider that hits the token limit returns HTTP 200
// with a body that stops mid-token. The call does not throw, so the halving
// retry that lived in the `catch` block never ran: `parseJsonResponse`
// returned null and the batch was dropped silently (`break`), or the whole
// ingest failed (`return null` on the first batch).
//
// These tests drive the analyzer through a client that reports
// `finishReason: 'length'`, which is what the SDK normalizes the provider's
// `finish_reason` field into.

const TEST_PATH = 'sources/truncation.md';

/** A response body cut off mid-token: valid JSON prefix, no closing braces. */
const TRUNCATED = '{"source_title": "Protein misfolding", "entities": [{"name": "Amyloid", "summary": "Aggregation occurs spontane';

const VALID = JSON.stringify({
  source_title: 'Protein misfolding',
  summary: 'A note about protein misfolding.',
  entities: [{ name: 'Amyloid', type: 'other', summary: 'An aggregate', mentions_in_source: [] }],
});

interface ScriptedReply {
  text: string;
  /** Omitted for clients/paths that report nothing — the pre-#305 situation. */
  finishReason?: LLMFinishReason;
}

/**
 * Client that replays a script of *extraction* replies and reports
 * `finishReason` through the optional `onFinish` out-channel, the way the
 * SDK-backed clients do.
 *
 * `parseJsonResponse` may issue a JSON-repair call on the same client. Those
 * are identified by their prompt and answered by echoing the broken text
 * back unchanged — a repair cannot reconstruct content that was never
 * emitted (that is the point of #305), and they carry no finish reason
 * because the repair call site does not pass `onFinish`. Keeping them out of
 * the script means the script indexes extraction attempts only.
 */
function scriptedClient(replies: ScriptedReply[]): {
  client: LLMClient;
  prompts: string[];
} {
  const prompts: string[] = [];
  let idx = 0;
  let lastText = '';
  const client: LLMClient = {
    createMessage: async (params) => {
      const first = params.messages[0];
      const prompt = typeof first.content === 'string' ? first.content : '';
      if (prompt.startsWith('Fix the following malformed JSON')) return lastText;
      prompts.push(prompt);
      const reply = replies[idx++];
      if (!reply) throw new Error(`unscripted extraction call #${idx}`);
      if (reply.finishReason) params.onFinish?.({ finishReason: reply.finishReason });
      lastText = reply.text;
      return reply.text;
    },
  };
  return { client, prompts };
}

function analyzerWith(client: LLMClient): SourceAnalyzer {
  const { ctx } = createMockContext({
    vaultFiles: { [TEST_PATH]: '# Protein misfolding\nA note with content to extract.' },
  });
  ctx.getClient = () => client;
  return new SourceAnalyzer(ctx);
}

function run(analyzer: SourceAnalyzer) {
  // The SourceAnalyzer only reads file.path and file.basename.
  // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
  return analyzer.analyzeSource(createMockFile(TEST_PATH) as unknown as TFile);
}

/** `Output at most N items` — how the batch size reaches the model. */
function batchSizeOf(prompt: string): number | null {
  const m = prompt.match(/at most (\d+) items/);
  return m ? Number(m[1]) : null;
}

describe('SourceAnalyzer truncation retry (#305)', () => {
  it('retries with a halved batch instead of dropping a truncated first batch', async () => {
    // 1st extraction: truncated + finish_reason=length
    // 2nd extraction: succeeds, after the batch was halved
    const { client, prompts } = scriptedClient([
      { text: TRUNCATED, finishReason: 'length' },
      { text: VALID, finishReason: 'stop' },
    ]);

    const result = await run(analyzerWith(client));

    // Before the fix this returned null: the parse failure hit `return null`
    // on the first batch and the halving retry was never reached.
    expect(result).not.toBeNull();
    expect(result!.entities.map(e => e.name)).toEqual(['Amyloid']);

    const mainPrompts = prompts.filter(p => batchSizeOf(p) !== null);
    expect(mainPrompts.length).toBeGreaterThanOrEqual(2);
    expect(batchSizeOf(mainPrompts[1])!).toBeLessThan(batchSizeOf(mainPrompts[0])!);
  });

  it('does not retry when the parse failed for a reason other than truncation', async () => {
    // Malformed but complete: halving the batch would not help, so the
    // pre-#305 behavior (give up on this batch) must be preserved.
    const { client, prompts } = scriptedClient([
      { text: '{"entities": [oops]}', finishReason: 'stop' },
    ]);

    const result = await run(analyzerWith(client));

    expect(result).toBeNull();
    expect(prompts.filter(p => batchSizeOf(p) !== null)).toHaveLength(1);
  });

  it('does not retry when the client reports no finish reason (pre-#305 clients)', async () => {
    // A client that never calls `onFinish` must behave exactly as before:
    // no signal, no retry.
    const { client, prompts } = scriptedClient([
      { text: TRUNCATED },
    ]);

    const result = await run(analyzerWith(client));

    expect(result).toBeNull();
    expect(prompts.filter(p => batchSizeOf(p) !== null)).toHaveLength(1);
  });

  it('halves only once — a second truncation is not retried again', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { client, prompts } = scriptedClient([
      { text: TRUNCATED, finishReason: 'length' },
      { text: TRUNCATED, finishReason: 'length' },
    ]);

    const result = await run(analyzerWith(client));

    expect(result).toBeNull();
    expect(prompts.filter(p => batchSizeOf(p) !== null)).toHaveLength(2);
    expect(warn.mock.calls.filter(c => String(c[0]).includes('halving batch size'))).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('normalizeFinishReason (#305)', () => {
  it.each([
    ['stop', 'stop'],
    ['length', 'length'],
    ['content-filter', 'content-filter'],
    ['tool-calls', 'tool-calls'],
    ['error', 'error'],
    ['other', 'other'],
  ] as const)('passes through the known reason %s', (raw, expected) => {
    expect(normalizeFinishReason(raw)).toBe(expected);
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['LENGTH'],
    ['max_tokens'],
    [42],
    [{}],
  ])('maps unrecognized input %o to unknown', (raw) => {
    // Total on purpose: an unrecognized value must not be mistaken for
    // 'length', so the worst case is "no signal", i.e. pre-#305 behavior.
    expect(normalizeFinishReason(raw)).toBe('unknown');
  });
});
