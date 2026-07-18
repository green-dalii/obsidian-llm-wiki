import { describe, it, expect, vi } from 'vitest';
import type { LLMClient, MessageContentPart } from '../../types';

// Helper to build a minimal mock LLMClient that records all createMessage calls.
const makeMockClient = (response = 'OK'): LLMClient => ({
  createMessage: vi.fn(async () => response),
});

describe('LLMClient interface — MessageContentPart extension (backward compat)', () => {
  it('accepts string content (legacy path) — no runtime change', async () => {
    const client = makeMockClient('legacy ok');
    const result = await client.createMessage({
      model: 'm',
      max_tokens: 100,
      system: 'sys',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result).toBe('legacy ok');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(client.createMessage).toHaveBeenCalledTimes(1);
  });

  it('accepts MessageContentPart[] with text part only (no PDF)', async () => {
    const client = makeMockClient('parts ok');
    const parts: MessageContentPart[] = [{ type: 'text', text: 'hello' }];
    const result = await client.createMessage({
      model: 'm',
      max_tokens: 100,
      messages: [{ role: 'user', content: parts }],
    });
    expect(result).toBe('parts ok');
  });

  it('accepts MessageContentPart[] mixing text and file (application/pdf)', async () => {
    const client = makeMockClient('pdf ok');
    const parts: MessageContentPart[] = [
      { type: 'text', text: 'Convert this PDF' },
      { type: 'file', data: 'JVBERi0xLjQK...', mediaType: 'application/pdf', filename: 'foo.pdf' },
    ];
    const result = await client.createMessage({
      model: 'm',
      max_tokens: 100,
      messages: [{ role: 'user', content: parts }],
    });
    expect(result).toBe('pdf ok');
  });

  it('file part data can be base64 string (not Buffer/Uint8Array) for portability', async () => {
    // Type-level check: a base64 string is valid for `data: string`
    const part: MessageContentPart = {
      type: 'file',
      data: 'SGVsbG8gV29ybGQ=', // base64 of "Hello World"
      mediaType: 'application/pdf',
    };
    expect(part.data).toBe('SGVsbG8gV29ybGQ=');
  });

  it('role "assistant" accepts string content (backward compat)', async () => {
    const client = makeMockClient('assistant reply');
    const result = await client.createMessage({
      model: 'm',
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello back' },
      ],
    });
    expect(result).toBe('assistant reply');
  });

  it('role "assistant" accepts MessageContentPart[] (e.g., for multi-modal reply)', async () => {
    const client = makeMockClient('multi-modal reply');
    const result = await client.createMessage({
      model: 'm',
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'show me the PDF' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Here is what I see:' },
            { type: 'file', data: '...', mediaType: 'application/pdf' },
          ],
        },
      ],
    });
    expect(result).toBe('multi-modal reply');
  });
});
