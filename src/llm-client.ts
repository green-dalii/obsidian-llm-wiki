import { requestUrl } from 'obsidian';
import { LLMClient } from './types';
import { MAX_RETRIES, RETRY_BASE_DELAY_MS, MAX_TOKENS_BATCH } from './constants';
import { parseSSEEvents, SSEDelta } from './core/sse-parser';
import { withTruncationRetry } from './core/truncation-retry';

// Shared retry helper — eliminates duplicated retry loops across all client classes.
const RETRYABLE = /status 5\d{2}|status 429|overload|network|fetch|econnrefused|etimedout|timeout|abort/i;

// Issue #248: tighter detection — must be a 400-class response AND mention a
// rejected field/parameter. This avoids false positives from generic errors
// that happen to contain the word "thinking" (e.g. a model that says
// "I was thinking about..." in its error string), and avoids triggering
// the fallback path for non-400 errors (5xx, 429) where the field might
// not be the actual problem.
const isThinkingControlError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : '';
  if (!/status 400|HTTP 400|Bad Request/i.test(msg)) return false;
  return /unknown field|unsupported field|invalid parameter|not supported|reasoning_effort|thinking/i.test(msg);
};

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = MAX_RETRIES,
  label = 'API'
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const msg = errMsg(error);
      if (RETRYABLE.test(msg) && attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * RETRY_BASE_DELAY_MS + Math.random() * RETRY_BASE_DELAY_MS;
        console.warn(`${label} error on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms: ${msg}`);
        await new Promise(resolve => window.setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Re-export for tests
export { parseSSEEvents };
export type { SSEDelta };

export class AnthropicCompatibleClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    // Normalize: strip trailing /v1 and trailing slashes
    this.baseUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '') + '/v1';
    this.apiVersion = '2023-06-01';
  }

  private extractText(content: Array<{ type: string; text?: string }>): string {
    const textBlock = content.find(c => c.type === 'text');
    return textBlock?.text || '';
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    response_format?: { type: 'json_object' };
    maxTokensPerCall?: number;
    disableThinking?: boolean;
  }): Promise<string> {
    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages: params.response_format?.type === 'json_object'
        ? [...params.messages, { role: 'assistant', content: '{' }]
        : params.messages
    };
    if (params.system) body.system = params.system;
    // ROADMAP P3 #12: explicit thinking disable for thinking-capable models
    // (Anthropic format: thinking.type = 'disabled').
    if (params.disableThinking) {
      body.thinking = { type: 'disabled' };
    }

    return withRetry(async () => {
      const response = await requestUrl({
        url: this.baseUrl + '/messages',
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Anthropic-Version': this.apiVersion,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = response.json as {
        content?: Array<{ type: string; text?: string }>;
        stop_reason?: string;
        error?: { message: string };
      };

      if (data.error) throw new Error(`status ${response.status}: ${data.error.message}`);
      console.debug('Anthropic API response:', {
        stop_reason: data.stop_reason,
        content_length: data.content?.length || 0,
        content_types: data.content?.map(c => c.type) || []
      });

      type AnthropicCompatData = typeof data;
      const initialData: AnthropicCompatData = data;
      const text = await withTruncationRetry<AnthropicCompatData>({
        initialFn: async () => initialData,
        retryFn: async (retryTokens) => {
          const retryResponse = await requestUrl({
            url: this.baseUrl + '/messages',
            method: 'POST',
            headers: {
              'x-api-key': this.apiKey,
              'Anthropic-Version': this.apiVersion,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...body, max_tokens: retryTokens })
          });
          const retryData = retryResponse.json as AnthropicCompatData;
          if (retryData.error) throw new Error(`status ${retryResponse.status}: ${retryData.error.message}`);
          return retryData;
        },
        isTruncated: (r) => r.stop_reason === 'max_tokens',
        extractText: (r) => this.extractText(r.content || []),
        getMaxTokens: () => params.max_tokens,
        getStopReason: (r) => r.stop_reason,
        maxCap: params.maxTokensPerCall || MAX_TOKENS_BATCH,
        label: 'Anthropic-compatible API',
      });
      console.debug('Extracted text length:', text.length);

      // Safety: if prefill { was stripped by the provider, restore it
      if (params.response_format?.type === 'json_object' && text.length > 0 && text[0] !== '{') {
        return '{' + text;
      }
      return text;
    }, 3, 'Anthropic-compatible API');
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    onChunk: (chunk: string) => void;
    disableThinking?: boolean;
  }): Promise<string> {
    const messages = params.system ? params.messages : [
      ...params.messages,
      {
        role: 'user',
        content: 'Please respond in the same language as the user\'s question. If the user asks in Chinese, reply in Chinese. If the user asks in English, reply in English. Keep the response language consistent with the user\'s input language.'
      }
    ];

    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages,
      stream: true
    };
    if (params.system) body.system = params.system;
    if (params.disableThinking) {
      body.thinking = { type: 'disabled' };
    }

    console.debug('[AnthropicCompat SSE] sending stream request, model:', params.model, 'max_tokens:', params.max_tokens,
      'system length:', params.system?.length || 0, 'messages count:', messages.length);

    let response;
    try {
      response = await requestUrl({
        url: this.baseUrl + '/messages',
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Anthropic-Version': this.apiVersion,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error('[AnthropicCompat SSE] requestUrl request failed:', err);
      throw err;
    }

    const responseText = response.text;
    console.debug('[AnthropicCompat SSE] response received, length:', responseText.length,
      'first 200 chars:', responseText.substring(0, 200));

    // Parse SSE events using shared parser
    const deltas = parseSSEEvents(responseText, 'anthropic');
    let fullText = '';
    for (const delta of deltas) {
      if (delta.text) {
        fullText += delta.text;
        params.onChunk(delta.text);
      }
    }

    // Fallback: if SSE parsing yielded nothing, try non-streaming JSON format.
    if (!fullText) {
      console.debug('[AnthropicCompat SSE] SSE parsing empty, trying non-streaming JSON fallback');
      try {
        const data = JSON.parse(responseText) as {
          content?: Array<{ type: string; text?: string }>;
          error?: { message: string };
        };
        if (data.error) throw new Error(data.error.message);
        fullText = this.extractText(data.content || []);
        if (fullText) {
          console.debug('[AnthropicCompat SSE] non-streaming fallback successful, length:', fullText.length);
          params.onChunk(fullText);
        }
      } catch (parseErr) {
        console.debug('[AnthropicCompat SSE] non-streaming JSON parse also failed:', parseErr);
      }
    }

    if (!fullText) {
      throw new Error(
        'Anthropic-compatible endpoint returned neither SSE events nor a standard JSON response. ' +
        'The provider may not support the Messages API streaming format. ' +
        'Response preview: ' + responseText.substring(0, 300)
      );
    }

    console.debug('[AnthropicCompat SSE] success, response length:', fullText.length);
    return fullText;
  }

  listModels(): Promise<string[]> {
    return Promise.resolve([]);
  }
}
export class AnthropicClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion = '2023-06-01';

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.anthropic.com';
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
    cacheBreakpoint?: number;
    maxTokensPerCall?: number;
    disableThinking?: boolean;
  }): Promise<string> {
    const messages: Array<Record<string, unknown>> = params.response_format?.type === 'json_object'
      ? [...params.messages, { role: 'assistant', content: '{' }]
      : [...params.messages];

    if (params.cacheBreakpoint && params.cacheBreakpoint > 0 && messages.length > 0) {
      const first = messages[0];
      if (first.role === 'user' && typeof first.content === 'string' &&
          params.cacheBreakpoint < first.content.length) {
        const text = first.content;
        first.content = [
          { type: 'text', text: text.substring(0, params.cacheBreakpoint), cache_control: { type: 'ephemeral' } },
          { type: 'text', text: text.substring(params.cacheBreakpoint) },
        ];
      }
    }

    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages,
    };
    if (params.system) body.system = params.system;
    // ROADMAP P3 #12: explicit thinking disable for thinking-capable models.
    if (params.disableThinking) {
      body.thinking = { type: 'disabled' };
    }

    return withRetry(async () => {
      const response = await requestUrl({
        url: `${this.baseUrl}/messages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'Anthropic-Version': this.apiVersion,
        },
        body: JSON.stringify(body),
      });

      const data = response.json as {
        content?: Array<{ type: string; text?: string }>;
        stop_reason?: string;
        error?: { message: string };
      };

      if (data.error) throw new Error(`status ${response.status}: ${data.error.message}`);

      const text = await withTruncationRetry({
        initialFn: async () => data,
        retryFn: async (retryTokens) => {
          const retryResponse = await requestUrl({
            url: `${this.baseUrl}/messages`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
              'Anthropic-Version': this.apiVersion,
            },
            body: JSON.stringify({ ...body, max_tokens: retryTokens }),
          });
          const retryData = retryResponse.json as {
            content?: Array<{ type: string; text?: string }>;
            stop_reason?: string;
            error?: { message: string };
          };
          if (retryData.error) throw new Error(`status ${retryResponse.status}: ${retryData.error.message}`);
          return retryData;
        },
        isTruncated: (r) => r.stop_reason === 'max_tokens',
        extractText: (r) => {
          const block = r.content?.find(c => c.type === 'text');
          return block && 'text' in block ? block.text || '' : '';
        },
        getMaxTokens: () => params.max_tokens,
        getStopReason: (r) => r.stop_reason,
        maxCap: params.maxTokensPerCall || MAX_TOKENS_BATCH,
        label: 'Anthropic API',
      });

      if (params.response_format?.type === 'json_object' && text.length > 0 && text[0] !== '{') {
        return '{' + text;
      }
      return text;
    }, 3, 'Anthropic API');
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    onChunk: (chunk: string) => void;
    disableThinking?: boolean;
  }): Promise<string> {
    const messagesWithLanguageHint = params.system
      ? params.messages
      : [
          ...params.messages,
          {
            role: 'user',
            content: 'Please respond in the same language as the user\'s question. If the user asks in Chinese, reply in Chinese. If the user asks in English, reply in English. Keep the response language consistent with the user\'s input language.'
          }
        ];

    const streamBody: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages: messagesWithLanguageHint,
      stream: true,
    };
    if (params.system) streamBody.system = params.system;
    if (params.disableThinking) {
      streamBody.thinking = { type: 'disabled' };
    }

    const responseText = await requestUrl({
      url: `${this.baseUrl}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Anthropic-Version': this.apiVersion,
      },
      body: JSON.stringify(streamBody),
    }).then(r => r.text);

    const deltas = parseSSEEvents(responseText, 'anthropic');
    let fullResponse = '';
    for (const d of deltas) {
      if (d.text) {
        fullResponse += d.text;
        params.onChunk(d.text);
      }
    }
    return fullResponse;
  }

  async listModels(): Promise<string[]> {
    const response = await requestUrl({
      url: 'https://api.anthropic.com/v1/models',
      headers: {
        'x-api-key': this.apiKey,
        'Anthropic-Version': '2023-06-01'
      }
    });
    const data = response.json as { data?: Array<{ id: string }> };
    if (!data.data?.length) return [];
    return data.data.map(m => m.id).filter(id => !id.includes(':') && !id.includes('/')).sort();
  }
}

export class OpenAICompatibleClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;

  // Cached result from Test Connection probe. Read by createMessage to
  // decide whether to inject thinking.type='disabled' on first attempt.
  // true  → send thinking control (provider confirmed support)
  // false → skip thinking control (provider returned 400 during probe)
  // undefined → not yet probed; will attempt + fallback in-request
  thinkingControlSupported?: boolean;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
    maxTokensPerCall?: number;
    disableThinking?: boolean;
  }): Promise<string> {
    const messages = params.system
      ? [{ role: 'system' as const, content: params.system }, ...params.messages]
      : params.messages;

    // response_format: json_object is omitted for OpenAI-compatible endpoints (LM Studio,
    // Ollama, etc.) because many local backends reject it — the prompt instruction + prefilled
    // "{" is sufficient to enforce JSON output.
    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages
    };
    // Unified thinking control: use Anthropic-style `thinking.type` which
    // works for DeepSeek and Anthropic. Cache from Test Connection probe
    // (`thinkingControlSupported`) gates the attempt: true → send, false → skip,
    // undefined (not probed) → try anyway (fallback handles 400).
    if (params.disableThinking && this.thinkingControlSupported !== false) {
      body.thinking = { type: 'disabled' };
    }

    const doRequest = (bodyToUse: Record<string, unknown>) =>
      withRetry(async () => {
        const response = await requestUrl({
          url: this.baseUrl + '/chat/completions',
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(bodyToUse)
        });

        const data = response.json as {
          choices?: Array<{
            message?: { content?: string };
            finish_reason?: string;
          }>;
          error?: { message: string };
      };

      if (data.error) throw new Error(`status ${response.status}: ${data.error.message}`);

      const initialChoices = data.choices;
      const initialText = data.choices?.[0]?.message?.content || '';

      return withTruncationRetry<{ choices: NonNullable<typeof data.choices>; initialText: string }>({
        initialFn: async () => ({ choices: initialChoices ?? [], initialText }),
        retryFn: async (retryTokens) => {
          const retryResponse = await requestUrl({
            url: this.baseUrl + '/chat/completions',
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ ...bodyToUse, max_tokens: retryTokens })
          });
          const retryData = retryResponse.json as {
            choices?: Array<{
              message?: { content?: string };
              finish_reason?: string;
            }>;
            error?: { message: string };
          };
          if (retryData.error) throw new Error(`status ${retryResponse.status}: ${retryData.error.message}`);
          return { choices: retryData.choices ?? [], initialText };
        },
        isTruncated: (r) => r.choices[0]?.finish_reason === 'length',
        extractText: (r) => r.choices[0]?.message?.content || r.initialText,
        getMaxTokens: () => params.max_tokens,
        getStopReason: (r) => r.choices[0]?.finish_reason,
        maxCap: params.maxTokensPerCall || MAX_TOKENS_BATCH,
        label: 'OpenAI-compatible API',
      });
    }, 3, 'OpenAI-compatible API');

    try {
      return await doRequest(body);
    } catch (e) {
      if (params.disableThinking && isThinkingControlError(e)) {
        // Issue #245: remember that this baseUrl rejects thinking control
        // so subsequent calls skip the probe-and-fail round-trip.
        this.thinkingControlSupported = false;
        console.debug(`[OpenAICompat] thinking.type='disabled' not supported by ${this.baseUrl}, falling back`);
        const fallbackBody: Record<string, unknown> = {
          model: params.model,
          max_tokens: params.max_tokens,
          messages: params.system
            ? [{ role: 'system' as const, content: params.system }, ...params.messages]
            : params.messages,
        };
        return await doRequest(fallbackBody);
      }
      throw e;
    }
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    onChunk: (chunk: string) => void;
    disableThinking?: boolean;
  }): Promise<string> {
    const messages = params.system
      ? [{ role: 'system' as const, content: params.system }, ...params.messages]
      : [
          ...params.messages,
          {
            role: 'user' as const,
            content: 'Please respond in the same language as the user\'s question. If the user asks in Chinese, reply in Chinese. If the user asks in English, reply in English. Keep the response language consistent with the user\'s input language.'
          }
        ];

    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages,
      stream: true
    };
    if (params.disableThinking && this.thinkingControlSupported !== false) {
      body.thinking = { type: 'disabled' };
    }

    const doRequest = (bodyToUse: Record<string, unknown>) =>
      withRetry(async () => {
        const response = await requestUrl({
          url: this.baseUrl + '/chat/completions',
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(bodyToUse)
        });

        const responseText = response.text;

        // Parse SSE events using shared parser
        const deltas = parseSSEEvents(responseText, 'openai');
        let fullText = '';
        for (const delta of deltas) {
          if (delta.text) {
            fullText += delta.text;
            params.onChunk(delta.text);
          }
        }

        // Fallback: if SSE parsing yielded nothing, try non-streaming JSON format.
        if (!fullText) {
          console.debug('[OpenAICompat SSE] SSE parsing empty, trying non-streaming JSON fallback');
          try {
            const data = JSON.parse(responseText) as {
              choices?: Array<{ message?: { content?: string } }>;
              error?: { message: string };
            };
            if (data.error) throw new Error(data.error.message);
            const text = data.choices?.[0]?.message?.content || '';
            if (text) {
              console.debug('[OpenAICompat SSE] Non-streaming fallback successful, length:', text.length);
              fullText = text;
              params.onChunk(text);
            }
          } catch (parseErr) {
            console.debug('[OpenAICompat SSE] Non-streaming JSON parse also failed:', parseErr);
          }
        }

        if (!fullText) {
          throw new Error(
            'OpenAI-compatible endpoint returned neither SSE events nor a standard JSON response. ' +
            'The provider may not support streaming. ' +
            'Response preview: ' + responseText.substring(0, 300)
          );
        }

        return fullText;
      }, 3, 'OpenAI-compatible stream');

    try {
      return await doRequest(body);
    } catch (e) {
      if (params.disableThinking && isThinkingControlError(e)) {
        // Issue #245: cache the negative result so we don't pay the
        // 400-error round-trip on every subsequent call to this baseUrl.
        this.thinkingControlSupported = false;
        console.debug(`[OpenAICompat SSE] thinking.type='disabled' not supported by ${this.baseUrl}, falling back`);
        const fallbackBody: Record<string, unknown> = {
          model: params.model,
          max_tokens: params.max_tokens,
          messages,
          stream: true,
        };
        return await doRequest(fallbackBody);
      }
      throw e;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await requestUrl({
        url: this.baseUrl + '/models',
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = response.json as {
        data?: Array<{ id: string }>;
        error?: { message: string };
      };

      if (data.error) throw new Error(`status ${response.status}: ${data.error.message}`);

      const modelIds = (data.data || [])
        .map(m => m.id)
        .filter(id => !id.includes(':') && !id.includes('/'))
        .sort();

      return modelIds.slice(0, 100);
    } catch (error) {
      console.error('Failed to fetch model list:', error);
      return [];
    }
  }
}
