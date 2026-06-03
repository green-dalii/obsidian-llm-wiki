// Shared SSE event parser for streaming LLM responses.
// Extracted from llm-client.ts — used by AnthropicCompatible and OpenAICompatible clients.
// Pure function (no side effects, no LLM client dependency) — fully unit-testable.

export type SSEFormat = 'anthropic' | 'openai';

interface AnthropicDelta {
  type?: string;
  delta?: { type?: string; text?: string };
}

interface OpenAIDelta {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string;
  }>;
}

export interface SSEDelta {
  /** Text chunk extracted from this event. Empty string if no text content. */
  text: string;
  /** Provider-specific finish signal (e.g. 'stop', 'length'). */
  finishReason?: string;
}

/**
 * Parse a Server-Sent Events response body into per-event text deltas.
 *
 * Handles both `data: ` (with space, official Anthropic) and `data:` (no space,
 * some third-party proxies). Also handles `\r\n` and `\n` line endings.
 *
 * Malformed JSON in individual events is skipped silently (best-effort parsing).
 *
 * @param responseText - Raw SSE response body
 * @param format - Which provider's event format to parse
 * @returns Array of extracted deltas in order
 */
export function parseSSEEvents(responseText: string, format: SSEFormat): SSEDelta[] {
  const normalized = responseText.replace(/\r\n/g, '\n');
  const events = normalized.split('\n\n');
  const deltas: SSEDelta[] = [];

  for (const event of events) {
    if (!event.trim()) continue;

    const dataLine = event.split('\n').find(line => line.startsWith('data:'));
    if (!dataLine) continue;

    if (format === 'openai') {
      const dataContent = dataLine.substring(5).trim();
      // [DONE] is the OpenAI stream terminator — stop processing all subsequent events.
      if (dataContent === '[DONE]') break;
    }

    try {
      const jsonStart = dataLine.indexOf('{');
      if (jsonStart === -1) continue;
      const parsed = JSON.parse(dataLine.substring(jsonStart)) as AnthropicDelta | OpenAIDelta;

      if (format === 'anthropic') {
        const anth = parsed as AnthropicDelta;
        if (anth.type === 'content_block_delta' &&
            anth.delta?.type === 'text_delta' &&
            anth.delta.text) {
          deltas.push({ text: anth.delta.text });
        }
      } else {
        const oai = parsed as OpenAIDelta;
        const content = oai.choices?.[0]?.delta?.content;
        const finish = oai.choices?.[0]?.finish_reason;
        if (content) deltas.push({ text: content });
        if (finish) deltas.push({ text: '', finishReason: finish });
      }
    } catch {
      // Skip malformed JSON in SSE
    }
  }

  return deltas;
}
