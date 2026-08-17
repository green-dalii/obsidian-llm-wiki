// markdown.test.ts — prependReasoningForParse contract
//
// v1.26.x PATCH follow-up (LMStudio + Qwen3.5 — Issue #443 follow-up).
// The SDK's openai-compat client prepends `reasoning_content` to the
// visible response text. The previous contract wrapped reasoning in a
// `<think>...</think>` block, which caused `parseJsonResponse`'s block
// strip to discard the JSON-shaped reasoning payload before the
// balanced-JSON finder could reach it.
//
// `prependReasoningForParse` is the smart variant: keep the wrap only
// when reasoning already contains `<think>` tags (DeepSeek R1 / o-series
// contract), otherwise prepend raw so the structured payload survives
// parsing.
//
// Test matrix covers:
//   1. Empty reasoning → returns text unchanged
//   2. Reasoning already contains `<think>` → wrap with `<think>...</think>`
//      (preserves the DeepSeek-R1 / o-series contract that
//      extractThinkingBlocks in Query UI depends on).
//   3. Reasoning contains `<thinking>` → wrap (alternate XML form).
//   4. Reasoning with raw JSON, empty text → prepend raw (JSON survives).
//   5. Reasoning with raw JSON, non-empty text → prepend raw with
//      blank-line separator.
//   6. Literal `</think>` inside reasoning → escaped to prevent
//      premature block close by extractThinkingBlocks.

import { describe, it, expect } from 'vitest';
import { prependReasoningForParse } from '../../core/markdown';

describe('prependReasoningForParse — Issue #443 follow-up', () => {
  it('returns text unchanged when reasoning is empty', () => {
    expect(prependReasoningForParse('', 'visible body')).toBe('visible body');
    expect(prependReasoningForParse('', '')).toBe('');
  });

  it('wraps with <think> when reasoning already contains a <think> tag', () => {
    const reasoning = '<think>step 1: think</think>step 2: answer';
    const text = 'visible';
    const out = prependReasoningForParse(reasoning, text);
    expect(out).toMatch(/<think>/);
    expect(out).toMatch(/<\/think>/);
    // The wrap-format must still include the visible text after the block.
    expect(out).toContain('visible');
  });

  it('wraps reasoning when it contains any <think>/<thinking> opening tag', () => {
    // Once a tag is present, the function delegates to wrapReasoningContent
    // (which always uses `<think>...</think>`) so the existing Query UI
    // contract holds. The internal `<thinking>` opens are still safely
    // escaped so they do not close the outer wrap prematurely.
    const reasoning = '<thinking>alt reasoning</thinking>rest';
    const out = prependReasoningForParse(reasoning, 'visible');
    // wrapReasoningContent always emits `<think>...</think>` as the outer pair.
    expect(out.startsWith('<think>')).toBe(true);
    expect(out).toContain('<\/think>'); // outer block close
    // Inner `<thinking>` opener is preserved verbatim (not re-wrapped).
    expect(out).toContain('<thinking>alt reasoning');
    expect(out).toContain('visible');
  });

  it('prepends raw JSON-shaped reasoning without wrapping when no tags present', () => {
    const reasoning = '{"entities": [{"name": "X"}]}';
    const out = prependReasoningForParse(reasoning, '');
    // Must NOT be wrapped — JSON must be parseable by the balanced-JSON
    // finder downstream.
    expect(out).not.toMatch(/^<think>/);
    expect(out).toContain('"entities"');
    // Ends with blank-line separator so visible text follows cleanly if any.
    expect(out.endsWith('\n\n')).toBe(true);
  });

  it('drops reasoning when visible text is non-empty, regardless of reasoning shape (Issue #474 — Layer 1 contract change)', () => {
    // v1.26.4 PATCH (Issue #474) deliberately changed the contract:
    // when reasoning has NO <think> wrapper AND visible text is non-empty,
    // the reasoning is dropped. The visible text is the LLM's canonical
    // output channel — the prose/json in reasoning is auxiliary.
    //
    // Previous behavior: prepended reasoning + "\n\n" + text, then
    // parseJsonResult's balanced-JSON finder walked into the reasoning
    // first. For reasoning=JSON+text=JSON, parseJsonResult picked the
    // LAST balanced JSON (the visible one) — worked. For
    // reasoning=prose+text=JSON (deepseek-v4-flash case), the
    // balanced-JSON finder walked into the prose and either crashed on
    // `Unexpected token 'T'` or matched an `{...}` substring inside the
    // prose — the visible JSON never parsed.
    //
    // New behavior: text non-empty → return text only. Reasoning is
    // preserved ONLY when text is empty (Qwen3.5 case) or when the
    // reasoning already has <think> wrappers (R1 / o-series case, see
    // the wrap branch in markdown.ts).
    const jsonReasoning = '{"entities": [{"name": "X"}]}';
    const text = 'visible answer';
    const out = prependReasoningForParse(jsonReasoning, text);
    expect(out).toBe(text);
    expect(out).not.toContain('"entities"');
    expect(out).not.toContain('\n\n');
  });

  it('escapes literal </think inside reasoning to prevent premature block close', () => {
    const reasoning = 'hello </think> world';
    const out = prependReasoningForParse(reasoning, '');
    // The escape prevents extractThinkingBlocks regex from mis-splitting.
    expect(out).toContain('<\\/think');
  });

  // v1.26.4 PATCH (Issue #474 — Layer 1): prose-reasoning pollution regression.
  //
  // Background: deepseek-v4-flash is a reasoning model. Its chat template
  // emits:
  //   - reasoning_content = "The user is asking me to extract entities.
  //                          Let me think about which entities are
  //                          relevant..."  (English prose)
  //   - content           = '{"entities":[{"name":"X"}]}'            (the JSON)
  //
  // The previous contract prepended the reasoning verbatim before the
  // visible text, so parseJsonResponse received prose + JSON. Every
  // parse layer (captureThinkingBlocks prefix-{ filler, balanced-JSON
  // finder, greedy regex) walked into the prose first and either
  // crashed on `Unexpected token 'T'` or matched an `{...}` substring
  // inside the prose. The visible JSON never parsed.
  //
  // Fix: when reasoning has NO <think> wrapper (i.e. it's prose, not a
  // structured R1/o-series reasoning block) AND visible text is non-empty,
  // the visible text already contains the LLM's canonical JSON. Drop the
  // prose — do NOT pollute the parse target.
  //
  // Qwen3.5 (Issue #443) case: reasoning IS JSON-shaped, text='' — must
  // still prepend (this is the recovery path). Preserved.
  // R1 / o-series case: reasoning has <think> wrapper — wrap branch, preserved.
  it('drops raw prose reasoning when visible text is non-empty (Issue #474 — DeepSeek v4-flash)', () => {
    const proseReasoning =
      'The user is asking me to extract entities from the source. Let me ' +
      'think about which entities are relevant. I see references to ' +
      'Biochemie, so NO2 is probably one. Let me format my answer.';
    const visibleJson = '{"entities":[{"name":"NO2"}]}';

    const out = prependReasoningForParse(proseReasoning, visibleJson);

    // The fix: prose must NOT appear in the output when text is present.
    // The visible JSON is the canonical output — preserve it verbatim.
    expect(out).toBe(visibleJson);
    expect(out).not.toContain('The user is asking');
    expect(out).not.toContain('Let me think');
  });

  it('still prepends raw JSON-shaped reasoning when text is empty (Qwen3.5 case preserved)', () => {
    // This is the Qwen3.5 / LMStudio recovery path. reasoning IS the
    // JSON; text is empty. The balanced-JSON finder needs the JSON to
    // survive intact.
    const jsonInReasoning = '{"entities":[{"name":"X"}]}';
    const out = prependReasoningForParse(jsonInReasoning, '');
    expect(out).toContain(jsonInReasoning);
    expect(out.endsWith('\n\n')).toBe(true);
  });

  it('still wraps <think>-tagged reasoning when text is non-empty (R1 / o-series case preserved)', () => {
    // R1 and o-series emit reasoning with explicit <think>...</think>
    // tags. The Query UI relies on extractThinkingBlocks to find those
    // blocks. Wrapping them again keeps the contract.
    const r1Reasoning = '<think>step 1: think</think>step 2: reason';
    const text = 'answer';
    const out = prependReasoningForParse(r1Reasoning, text);
    expect(out).toMatch(/<think>/);
    expect(out).toMatch(/<\/think>/);
    expect(out).toContain('answer');
  });
});