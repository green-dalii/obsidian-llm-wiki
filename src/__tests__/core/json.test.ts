import { describe, it, expect } from 'vitest';
import { parseJsonResponse, extractBalancedJson } from '../../core/json';
describe('parseJsonResponse', () => {
  it('parses valid JSON directly', async () => {
    const result = await parseJsonResponse('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses JSON wrapped in ```json code fence', async () => {
    const result = await parseJsonResponse('```json\n{"key": "value"}\n```');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses JSON wrapped in ```markdown code fence', async () => {
    const result = await parseJsonResponse('```markdown\n{"key": "value"}\n```');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses JSON wrapped in ``` without language tag', async () => {
    const result = await parseJsonResponse('```\n{"key": "value"}\n```');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles double-brace prefill echo ({{)', async () => {
    const result = await parseJsonResponse('{{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles newline-separated loose prefill ({)|n)', async () => {
    const result = await parseJsonResponse('{\n{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles missing opening brace (prefill stripped)', async () => {
    const result = await parseJsonResponse('"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('extracts valid prefix from content with trailing text', async () => {
    const result = await parseJsonResponse('{"key": "value"} extra words here');
    expect(result).toEqual({ key: 'value' });
  });

  it('extracts braced JSON content from surrounding text', async () => {
    const result = await parseJsonResponse('Some preamble text {"key": "value"} and more after');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles trailing comma in objects', async () => {
    const result = await parseJsonResponse('{"a": 1, "b": 2,}');
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('handles trailing comma in arrays', async () => {
    const result = await parseJsonResponse('{"items": [1, 2, 3,]}');
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  // ROADMAP P3 #11: thinking models can output pseudocode JSON inside <think>
  // blocks. extractBalancedJson otherwise grabs the first '{' inside the think
  // block, ignoring the real JSON after </think>.
  it('strips <think> blocks before extracting JSON', async () => {
    const input = '<think>{ "pseudocode": "ignore me" }</think>\n{"real": "json"}';
    const result = await parseJsonResponse(input);
    expect(result).toEqual({ real: 'json' });
  });

  it('strips <thinking> blocks before extracting JSON', async () => {
    const input = '<thinking>{ "pseudocode": "ignore me" }</thinking>\n{"real": "json"}';
    const result = await parseJsonResponse(input);
    expect(result).toEqual({ real: 'json' });
  });

  it('strips multiline <think> blocks with embedded nested braces', async () => {
    const input = `<think>
Let me analyze this carefully.
{ "step": 1, "options": [{ "a": 1 }, { "b": 2 }] }
The answer should be...
</think>
{"answer": "real"}`;
    const result = await parseJsonResponse(input);
    expect(result).toEqual({ answer: 'real' });
  });

  it('returns null for completely invalid input', async () => {
    const result = await parseJsonResponse('not json at all');
    expect(result).toBeNull();
  });

  it('returns null for empty string', async () => {
    const result = await parseJsonResponse('');
    expect(result).toBeNull();
  });

  it('handles nested objects correctly', async () => {
    const result = await parseJsonResponse('{"outer": {"inner": [1, 2, 3]}}');
    expect(result).toEqual({ outer: { inner: [1, 2, 3] } });
  });

  it('uses repairFn callback for malformed but brace-balanced JSON', async () => {
    const repairFn = async (_malformed: string) => '{"repaired": true}';
    const result = await parseJsonResponse('{"a": invalid}', repairFn);
    expect(result).toEqual({ repaired: true });
  });

  it('falls back to null when repairFn returns invalid JSON', async () => {
    const repairFn = async (_malformed: string) => 'still not json';
    const result = await parseJsonResponse('{"a": invalid}', repairFn);
    expect(result).toBeNull();
  });

  it('handles repairFn returning JSON in code fence', async () => {
    const repairFn = async (_malformed: string) => '```json\n{"from_fence": true}\n```';
    const result = await parseJsonResponse('{"a": invalid}', repairFn);
    expect(result).toEqual({ from_fence: true });
  });

  it('parses empty object', async () => {
    const result = await parseJsonResponse('{}');
    expect(result).toEqual({});
  });

  it('handles escaped backslash followed by quote in extractBalancedJson (regression)', () => {
    // Regression: the state machine had `ch === '\\\\'` (a 2-char literal
    // compared against the 1-char iterator value), so the escape flag
    // never engaged. A `"` following a `\\` was treated as a string
    // terminator and the depth counter misbehaved.
    const text = '{"a": "x\\\\\\"y", "b": 1}';
    const firstBrace = text.indexOf('{');
    const result = extractBalancedJson(text, firstBrace);
    expect(result).toBe(text);
  });
});

