import { describe, it, expect, vi } from 'vitest';
import { wrapWithAdvancedSettings, type WrapperSettings } from '../../llm-client-wrapper';
import type { LLMClient } from '../../types';
import { snapshotTaskUsage, taskUsageSince } from '../../core/llm-task-usage';

// The wrapper is where a setting becomes a request field, and every field it
// forwards is one the caller could also have set. Two rules hold for all of
// them: an unset setting sends nothing, and a caller who passed a value keeps
// it. Neither had a test, and the second is the one that silently breaks — a
// wrapper that overwrote its caller would make per-call overrides look like
// they applied while sending something else.

type SentBody = Record<string, unknown>;

function clientSpy() {
  const sentBodies: SentBody[] = [];
  const createMessage = vi.fn(async (body: SentBody) => {
    sentBodies.push(body);
    return 'ok';
  });
  const client = { createMessage } as unknown as LLMClient;
  return { client, sentBodies };
}

/** Build a client implementing createMessageWithOutput (Phase B typed path). */
function typedClientSpy() {
  const sentBodies: SentBody[] = [];
  const createMessage = vi.fn(async (body: SentBody) => {
    sentBodies.push(body);
    return 'ok';
  });
  const createMessageWithOutput = vi.fn(async (body: SentBody) => {
    sentBodies.push(body);
    return { text: 'ok', output: undefined, outputMode: 'json_schema', finishReason: 'stop' };
  });
  const client = { createMessage, createMessageWithOutput } as unknown as LLMClient;
  return { client, sentBodies, createMessageWithOutput };
}

const CALL = { model: 'm', max_tokens: 100, messages: [{ role: 'user' as const, content: 'hi' }] };

function sent(settings: Partial<WrapperSettings>, params: SentBody = {}): SentBody {
  const { client, sentBodies } = clientSpy();
  const wrapped = wrapWithAdvancedSettings(client, { maxTokensPerCall: 0, ...settings });
  void wrapped.createMessage({ ...CALL, ...params } as Parameters<LLMClient['createMessage']>[0]);
  return sentBodies[0];
}

describe('wrapWithAdvancedSettings — settings become request fields', () => {
  it('sends nothing the user has not configured', () => {
    const body = sent({});
    for (const field of ['temperature', 'top_p', 'seed', 'repetition_penalty']) {
      expect(body).not.toHaveProperty(field);
    }
  });

  // Sampling is a preset, not a set of independent knobs. Forwarding the
  // temperature while dropping top_p leaves a run on half of one preset and
  // half of whatever the server defaults to — which is how two models were
  // compared for a while without noticing they were sampled differently.
  it('forwards the whole sampling preset, not half of it', () => {
    const body = sent({ extractionTemperature: 0.7, extractionTopP: 0.8 });
    expect(body.temperature).toBe(0.7);
    expect(body.top_p).toBe(0.8);
  });

  it('forwards the seed, which is what makes two runs comparable', () => {
    expect(sent({ samplingSeed: 42 }).seed).toBe(42);
  });

  it('leaves a caller-provided value alone', () => {
    const body = sent(
      { extractionTemperature: 0.7, extractionTopP: 0.8, samplingSeed: 42 },
      { temperature: 0.1, top_p: 0.95, seed: 7 },
    );
    expect([body.temperature, body.top_p, body.seed]).toEqual([0.1, 0.95, 7]);
  });

  it('treats zero as a value, not as unset', () => {
    // `temperature: 0` is the setting that matters most for extraction and is
    // the one a truthiness check drops.
    expect(sent({ extractionTemperature: 0 }).temperature).toBe(0);
  });
});

// The wrapper is the one seam every call passes through, which is why the
// per-step accounting lives here rather than at the call sites. These two
// assert the seam itself: that the label reaches the ledger, and that a call
// which threw is still counted — its time was spent either way, and a step
// that fails is exactly the one worth seeing in the table.
describe('wrapWithAdvancedSettings — per-step accounting', () => {
  const settings = { maxTokensPerCall: 0 } as WrapperSettings;

  it('records the call under the label the caller gave', async () => {
    const { client } = clientSpy();
    const before = snapshotTaskUsage();
    await wrapWithAdvancedSettings(client, settings)
      .createMessage({ ...CALL, task: 'merge-triage' });
    expect(new Map(taskUsageSince(before)).get('merge-triage')?.calls).toBe(1);
  });

  it('records an unlabelled call under "untagged"', async () => {
    const { client } = clientSpy();
    const before = snapshotTaskUsage();
    await wrapWithAdvancedSettings(client, settings).createMessage({ ...CALL });
    expect(new Map(taskUsageSince(before)).get('untagged')?.calls).toBe(1);
  });

  it('records a call that threw, because the time was spent regardless', async () => {
    const createMessage = vi.fn(async () => { throw new Error('boom'); });
    const client = { createMessage } as unknown as LLMClient;
    const before = snapshotTaskUsage();
    await expect(
      wrapWithAdvancedSettings(client, settings).createMessage({ ...CALL, task: 'dedup' }),
    ).rejects.toThrow('boom');
    expect(new Map(taskUsageSince(before)).get('dedup')?.calls).toBe(1);
  });
});

// v1.26.3 PATCH Phase B (Issue #443): the typed-output variant must pass
// through the same seam — task accounting + advanced settings injection
// — or Phase B callers (seed-selector / query-keywords / merge-triage /
// link-orphan / fix-dead-link / QueryView) would bypass the wrapper and
// record under 'untagged' with no temperature/top_p/seed override.
describe('wrapWithAdvancedSettings — typed-output path (createMessageWithOutput)', () => {
  const settings = { maxTokensPerCall: 0 } as WrapperSettings;

  it('forwards advanced settings to the typed call', async () => {
    const { client, sentBodies, createMessageWithOutput } = typedClientSpy();
    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 0,
      extractionTemperature: 0.7,
      extractionTopP: 0.8,
      samplingSeed: 42,
    });
    await wrapped.createMessageWithOutput!({ ...CALL } as Parameters<NonNullable<LLMClient['createMessageWithOutput']>>[0]);
    expect(createMessageWithOutput).toHaveBeenCalledTimes(1);
    expect(sentBodies[0].temperature).toBe(0.7);
    expect(sentBodies[0].top_p).toBe(0.8);
    expect(sentBodies[0].seed).toBe(42);
  });

  it('records typed call under the label the caller gave', async () => {
    const { client, createMessageWithOutput } = typedClientSpy();
    const before = snapshotTaskUsage();
    await wrapWithAdvancedSettings(client, settings)
      .createMessageWithOutput!({ ...CALL, task: 'merge-triage' } as Parameters<NonNullable<LLMClient['createMessageWithOutput']>>[0]);
    expect(createMessageWithOutput).toHaveBeenCalledTimes(1);
    expect(new Map(taskUsageSince(before)).get('merge-triage')?.calls).toBe(1);
  });

  it('leaves a caller-provided value alone on the typed path', async () => {
    const { client, sentBodies, createMessageWithOutput } = typedClientSpy();
    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 0,
      extractionTemperature: 0.7,
    });
    await wrapped.createMessageWithOutput!({
      ...CALL,
      temperature: 0.1,
    } as Parameters<NonNullable<LLMClient['createMessageWithOutput']>>[0]);
    expect(createMessageWithOutput).toHaveBeenCalledTimes(1);
    expect(sentBodies[0].temperature).toBe(0.1);
  });

  it('does NOT add createMessageWithOutput when the client lacks it', async () => {
    const { client } = clientSpy();
    const wrapped = wrapWithAdvancedSettings(client, settings);
    expect(wrapped.createMessageWithOutput).toBeUndefined();
  });
});

// Issue #481 follow-up: the per-step policy is applied here, at the one seam
// every call passes through. Two properties matter — an unset policy must not
// add a single field (otherwise both arms of a comparison have moved before
// it starts), and a named step must win over the call site, because the call
// site passes `disableThinking` unconditionally while the policy names one
// step deliberately.
describe('wrapWithAdvancedSettings — per-task policy (#481)', () => {
  it('adds nothing when no policy is configured — for the steps without a built-in baseline', () => {
    for (const task of ['page-generate', 'merge-triage', 'lemma-classify', undefined]) {
      const body = sent({}, task === undefined ? {} : { task });
      expect(body).not.toHaveProperty('outputModeOverride');
      expect(body).not.toHaveProperty('enableThinking');
    }
  });

  // Issue #524: the built-in baseline reaches the wire through the same seam.
  // Only the output mode moves; the thinking axis is left to the call site.
  it('pins extract and extract-retry to text_prompt with no policy configured (#524)', () => {
    for (const task of ['extract', 'extract-retry']) {
      const body = sent({}, { task });
      expect(body.outputModeOverride).toBe('text_prompt');
      expect(body).not.toHaveProperty('enableThinking');
    }
  });

  it('lets a configured policy move extract back onto the schema (#524)', () => {
    const body = sent(
      { taskPolicies: { extract: { outputMode: 'json_schema', thinking: 'default' } } },
      { task: 'extract' },
    );
    expect(body.outputModeOverride).toBe('json_schema');
  });

  it('adds nothing to a step the policy does not name', () => {
    const body = sent(
      { taskPolicies: { extract: { outputMode: 'text_prompt', thinking: 'on' } } },
      { task: 'page-generate' },
    );
    expect(body).not.toHaveProperty('outputModeOverride');
    expect(body).not.toHaveProperty('enableThinking');
  });

  it('pins the output mode and thinking for the step it names', () => {
    const body = sent(
      { taskPolicies: { extract: { outputMode: 'text_prompt', thinking: 'on' } } },
      { task: 'extract' },
    );
    expect(body.outputModeOverride).toBe('text_prompt');
    expect(body.enableThinking).toBe(true);
  });

  it('overrides the call site, which passes disableThinking unconditionally', () => {
    const body = sent(
      { taskPolicies: { extract: { outputMode: 'default', thinking: 'on' } } },
      { task: 'extract', enableThinking: false },
    );
    expect(body.enableThinking).toBe(true);
    expect(body).not.toHaveProperty('outputModeOverride');
  });

  it('applies on the typed path too — the schema callers live there', () => {
    const { client, sentBodies } = typedClientSpy();
    const wrapped = wrapWithAdvancedSettings(client, {
      maxTokensPerCall: 0,
      taskPolicies: { 'merge-triage': { outputMode: 'text_prompt', thinking: 'on' } },
    });
    void wrapped.createMessageWithOutput!({
      ...CALL, task: 'merge-triage',
    } as Parameters<NonNullable<LLMClient['createMessageWithOutput']>>[0]);
    expect(sentBodies[0].outputModeOverride).toBe('text_prompt');
    expect(sentBodies[0].enableThinking).toBe(true);
  });
});
