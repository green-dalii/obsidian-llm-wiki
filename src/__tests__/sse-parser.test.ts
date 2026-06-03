import { describe, it, expect } from 'vitest';
import { parseSSEEvents } from '../core/sse-parser';

describe('parseSSEEvents — Anthropic format', () => {
  it('extracts text from content_block_delta events', () => {
    const sse = [
      'event: content_block_start',
      'data: {"type":"content_block_start","index":0}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}',
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'anthropic');
    expect(deltas.map(d => d.text)).toEqual(['Hello', ' world']);
  });

  it('skips non-text events (content_block_start, content_block_stop, message_start)', () => {
    const sse = [
      'data: {"type":"message_start","message":{"id":"msg_01"}}',
      '',
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
      '',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}',
      '',
      'data: {"type":"content_block_stop","index":0}',
      '',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'anthropic');
    expect(deltas).toHaveLength(1);
    expect(deltas[0].text).toBe('Hi');
  });

  it('handles \\r\\n line endings (CRLF normalization)', () => {
    const sse = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"A"}}\r\n\r\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"B"}}\r\n\r\n';
    const deltas = parseSSEEvents(sse, 'anthropic');
    expect(deltas.map(d => d.text)).toEqual(['A', 'B']);
  });

  it('skips malformed JSON events silently (best-effort parsing)', () => {
    const sse = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"OK"}}',
      '',
      'data: {malformed json{{{',
      '',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"After"}}',
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'anthropic');
    expect(deltas.map(d => d.text)).toEqual(['OK', 'After']);
  });

  it('returns empty array for empty input', () => {
    expect(parseSSEEvents('', 'anthropic')).toEqual([]);
  });
});

describe('parseSSEEvents — OpenAI format', () => {
  it('extracts text from chat.completion.chunk deltas', () => {
    const sse = [
      'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}',
      '',
      'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":" there"},"finish_reason":null}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'openai');
    expect(deltas.map(d => d.text)).toEqual(['Hello', ' there']);
  });

  it('stops at [DONE] sentinel', () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"text"}}]}',
      '',
      'data: [DONE]',
      '',
      'data: {"choices":[{"delta":{"content":"should not appear"}}]}',
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'openai');
    expect(deltas.map(d => d.text)).toEqual(['text']);
  });

  it('emits finishReason when present', () => {
    const sse = [
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'openai');
    expect(deltas).toHaveLength(1);
    expect(deltas[0].finishReason).toBe('stop');
    expect(deltas[0].text).toBe('');
  });

  it('handles events without content (e.g. role-only first chunk)', () => {
    const sse = [
      'data: {"choices":[{"delta":{"role":"assistant"},"finish_reason":null}]}',
      '',
      'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}',
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'openai');
    expect(deltas).toHaveLength(1);
    expect(deltas[0].text).toBe('Hi');
  });
});

describe('parseSSEEvents — format dispatch', () => {
  it('uses anthropic parsing when format="anthropic" (ignores [DONE])', () => {
    const sse = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"A"}}',
      '',
      'data: [DONE]',  // OpenAI-style sentinel, should NOT skip for Anthropic
      '',
    ].join('\n');

    const deltas = parseSSEEvents(sse, 'anthropic');
    // Anthropic parser sees no { in "[DONE]" line and skips it silently
    expect(deltas).toHaveLength(1);
  });

  it('uses openai parsing when format="openai"', () => {
    const sse = 'data: {"choices":[{"delta":{"content":"X"},"finish_reason":null}]}\n\n';
    const deltas = parseSSEEvents(sse, 'openai');
    expect(deltas).toHaveLength(1);
    expect(deltas[0].text).toBe('X');
  });
});
