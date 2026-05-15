import Anthropic from '@anthropic-ai/sdk';
import { requestUrl } from 'obsidian';
import { LLMClient } from './types';

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
  }): Promise<string> {
    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages: params.response_format?.type === 'json_object'
        ? [...params.messages, { role: 'assistant', content: '{' }]
        : params.messages
    };
    if (params.system) body.system = params.system;

    // Retry loop for 5xx / network errors (max 2 retries, exponential backoff)
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
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

        if (data.error) throw new Error(data.error.message);
        console.debug('Anthropic API response:', {
          stop_reason: data.stop_reason,
          content_length: data.content?.length || 0,
          content_types: data.content?.map(c => c.type) || []
        });
        let text = this.extractText(data.content || []);
        console.debug('Extracted text length:', text.length);

        // Detect truncation: retry once with double the token limit.
        if (data.stop_reason === 'max_tokens') {
          const retryTokens = Math.min(params.max_tokens * 2, 16000);
          console.warn(
            `Anthropic-compatible response truncated at ${params.max_tokens} tokens (stop_reason=max_tokens). ` +
            `Retrying with ${retryTokens} tokens.`
          );
          const retryBody: Record<string, unknown> = {
            ...body,
            max_tokens: retryTokens
          };
          // Truncation retry also needs 5xx handling
          let retryResponse;
          for (let retryAttempt = 0; retryAttempt < 2; retryAttempt++) {
            try {
              retryResponse = await requestUrl({
                url: this.baseUrl + '/messages',
                method: 'POST',
                headers: {
                  'x-api-key': this.apiKey,
                  'Anthropic-Version': this.apiVersion,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(retryBody)
              });
              break;
            } catch (retryErr) {
              const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              if (/status 5\d{2}|network|fetch|timeout/i.test(msg) && retryAttempt < 1) {
                const delay = Math.pow(2, retryAttempt) * 1000 + Math.random() * 500;
                console.warn(`Truncation retry error, reattempting in ${Math.round(delay)}ms: ${msg}`);
                await new Promise(resolve => window.setTimeout(resolve, delay));
                continue;
              }
              throw retryErr;
            }
          }
          if (!retryResponse) throw new Error('Truncation retry failed: no response after retries');
          const retryData = retryResponse.json as {
            content?: Array<{ type: string; text?: string }>;
            error?: { message: string };
          };
          if (retryData.error) throw new Error(retryData.error.message);
          text = this.extractText(retryData.content || []);
        }

        // Safety: if prefill { was stripped by the provider, restore it
        if (params.response_format?.type === 'json_object' && text.length > 0 && text[0] !== '{') {
          text = '{' + text;
        }
        return text;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        const isRetryable = /status 5\d{2}|status 429|network|fetch|econnrefused|etimedout|timeout|abort/i.test(msg);
        if (isRetryable && attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`Anthropic-compatible API error on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms: ${msg}`);
          await new Promise(resolve => window.setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
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

    console.debug('[AnthropicCompat SSE] 发送流式请求, model:', params.model, 'max_tokens:', params.max_tokens,
      'system长度:', params.system?.length || 0, 'messages数:', messages.length);

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
      console.error('[AnthropicCompat SSE] requestUrl 请求失败:', err);
      throw err;
    }

    const responseText = response.text;
    console.debug('[AnthropicCompat SSE] 收到响应, 长度:', responseText.length,
      '前200字符:', responseText.substring(0, 200));

    // Parse SSE events from response body.
    // Handles both "data: " (with space, Anthropic official) and "data:" (no space,
    // some third-party proxies). Also handles \r\n and \n line endings.
    let fullText = '';
    const normalizedText = responseText.replace(/\r\n/g, '\n');
    const events = normalizedText.split('\n\n');
    for (const event of events) {
      if (!event.trim()) continue;
      const dataLine = event.split('\n')
        .find(line => line.startsWith('data:'));
      if (!dataLine) continue;
      try {
        // Extract JSON from data line: skip "data:" prefix (with or without space)
        const jsonStart = dataLine.indexOf('{');
        if (jsonStart === -1) continue;
        const parsed = JSON.parse(dataLine.substring(jsonStart)) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta' &&
            parsed.delta.text) {
          fullText += parsed.delta.text;
          params.onChunk(parsed.delta.text);
        }
      } catch {
        // Skip malformed JSON in SSE
      }
    }

    // Fallback: if SSE parsing yielded nothing, try non-streaming JSON format.
    // Many Anthropic-compatible providers ignore stream:true and return a
    // standard JSON response instead of SSE events.
    if (!fullText) {
      console.debug('[AnthropicCompat SSE] SSE 解析为空, 尝试非流式JSON回退');
      try {
        const data = JSON.parse(responseText) as {
          content?: Array<{ type: string; text?: string }>;
          error?: { message: string };
        };
        if (data.error) throw new Error(data.error.message);
        fullText = this.extractText(data.content || []);
        if (fullText) {
          console.debug('[AnthropicCompat SSE] 非流式回退成功, 长度:', fullText.length);
          params.onChunk(fullText);
        }
      } catch (parseErr) {
        console.debug('[AnthropicCompat SSE] 非流式JSON解析也失败:', parseErr);
      }
    }

    if (!fullText) {
      throw new Error(
        'Anthropic-compatible endpoint returned neither SSE events nor a standard JSON response. ' +
        'The provider may not support the Messages API streaming format. ' +
        'Response preview: ' + responseText.substring(0, 300)
      );
    }

    console.debug('[AnthropicCompat SSE] 成功, 响应长度:', fullText.length);
    return fullText;
  }

  listModels(): Promise<string[]> {
    return Promise.resolve([]);
  }
}
export class AnthropicClient implements LLMClient {
  private client: Anthropic;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new Anthropic({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {})
    });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
    cacheBreakpoint?: number;
  }): Promise<string> {
    // Support prompt caching: split first user message at cacheBreakpoint
    const messages = params.messages.map((msg, idx) => {
      if (idx === 0 && msg.role === 'user' && params.cacheBreakpoint &&
          params.cacheBreakpoint > 0 && params.cacheBreakpoint < msg.content.length) {
        const cached = msg.content.substring(0, params.cacheBreakpoint);
        const rest = msg.content.substring(params.cacheBreakpoint);
        return {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: cached, cache_control: { type: 'ephemeral' as const } },
            { type: 'text' as const, text: rest }
          ]
        };
      }
      return msg;
    });

    const finalMessages = params.response_format?.type === 'json_object'
      ? [...messages, { role: 'assistant' as const, content: '{' }]
      : messages;

    // Retry loop for 5xx / network errors (max 2 retries, exponential backoff)
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: params.model,
          max_tokens: params.max_tokens,
          system: params.system || undefined,
          messages: finalMessages
        });
        const textBlock = response.content.find(c => c.type === 'text');
        let text = textBlock && 'text' in textBlock ? textBlock.text : '';

        // Detect truncation: if the API stopped because it hit max_tokens,
        // retry once with double the limit so the response completes.
        if (response.stop_reason === 'max_tokens') {
          const retryTokens = Math.min(params.max_tokens * 2, 16000);
          console.warn(
            `Anthropic response truncated at ${params.max_tokens} tokens (stop_reason=max_tokens). ` +
            `Retrying with ${retryTokens} tokens.`
          );
          const retryResponse = await this.client.messages.create({
            model: params.model,
            max_tokens: retryTokens,
            system: params.system || undefined,
            messages: finalMessages
          });
          const retryBlock = retryResponse.content.find(c => c.type === 'text');
          text = retryBlock && 'text' in retryBlock ? retryBlock.text : '';
        }

        // Safety: if prefill { was stripped by the provider, restore it
        if (params.response_format?.type === 'json_object' && text.length > 0 && text[0] !== '{') {
          text = '{' + text;
        }
        return text;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        const isRetryable = /status 5\d{2}|status 429|network|fetch|econnrefused|etimedout|timeout|abort/i.test(msg);
        if (isRetryable && attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`Anthropic API error on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms: ${msg}`);
          await new Promise(resolve => window.setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
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

    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: params.max_tokens,
      system: params.system || undefined,
      messages: messagesWithLanguageHint as Anthropic.MessageParam[]
    });

    let fullResponse = '';

    stream.on('text', (text) => {
      fullResponse += text;
      params.onChunk(text);
    });

    await stream.finalMessage();
    return fullResponse;
  }

  listModels(): Promise<string[]> {
    // Anthropic SDK v0.24.x has no models.list(); return curated defaults
    return Promise.resolve([
      'claude-sonnet-4-6',
      'claude-opus-4-7',
      'claude-haiku-4-5-20251001'
    ]);
  }
}

export class OpenAICompatibleClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;

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
  }): Promise<string> {
    const messages = params.system
      ? [{ role: 'system' as const, content: params.system }, ...params.messages]
      : params.messages;

    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages
    };
    if (params.response_format) {
      body.response_format = params.response_format;
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await requestUrl({
          url: this.baseUrl + '/chat/completions',
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        });

        const data = response.json as {
          choices?: Array<{
            message?: { content?: string };
            finish_reason?: string;
          }>;
          error?: { message: string };
        };

        if (data.error) throw new Error(data.error.message);

        const text = data.choices?.[0]?.message?.content || '';

        // Detect truncation: retry once with double max_tokens
        if (data.choices?.[0]?.finish_reason === 'length') {
          const retryTokens = Math.min(params.max_tokens * 2, 16000);
          console.warn(
            `OpenAI-compatible response truncated at ${params.max_tokens} tokens (finish_reason=length). ` +
            `Retrying with ${retryTokens} tokens.`
          );
          const retryBody = { ...body, max_tokens: retryTokens };
          let retryResponse;
          for (let retryAttempt = 0; retryAttempt < 2; retryAttempt++) {
            try {
              retryResponse = await requestUrl({
                url: this.baseUrl + '/chat/completions',
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(retryBody)
              });
              break;
            } catch (retryErr) {
              const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              if (/status 5\d{2}|network|fetch|timeout/i.test(msg) && retryAttempt < 1) {
                const delay = Math.pow(2, retryAttempt) * 1000 + Math.random() * 500;
                console.warn(`Truncation retry error, reattempting in ${Math.round(delay)}ms: ${msg}`);
                await new Promise(resolve => window.setTimeout(resolve, delay));
                continue;
              }
              throw retryErr;
            }
          }
          if (!retryResponse) throw new Error('Truncation retry failed: no response after retries');
          const retryData = retryResponse.json as {
            choices?: Array<{ message?: { content?: string } }>;
            error?: { message: string };
          };
          if (retryData.error) throw new Error(retryData.error.message);
          return retryData.choices?.[0]?.message?.content || text;
        }

        return text;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        const isRetryable = /status 5\d{2}|status 429|network|fetch|econnrefused|etimedout|timeout|abort/i.test(msg);
        if (isRetryable && attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`OpenAI-compatible API error on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms: ${msg}`);
          await new Promise(resolve => window.setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
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

    const body = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages,
      stream: true
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await requestUrl({
          url: this.baseUrl + '/chat/completions',
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        });

        const responseText = response.text;
        let fullText = '';

        // Parse SSE events from response body.
        // Handles both "data: " (with space) and "data:" (no space).
        // Also handles \r\n and \n line endings.
        const normalizedText = responseText.replace(/\r\n/g, '\n');
        const events = normalizedText.split('\n\n');
        for (const event of events) {
          if (!event.trim()) continue;
          const dataLine = event.split('\n').find(line => line.startsWith('data:'));
          if (!dataLine) continue;

          const dataContent = dataLine.substring(5).trim();
          if (dataContent === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataContent) as {
              choices?: Array<{
                delta?: { content?: string };
                finish_reason?: string;
              }>;
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              params.onChunk(content);
            }
          } catch {
            // Skip malformed JSON in SSE
          }
        }

        // Fallback: if SSE parsing yielded nothing, try non-streaming JSON format.
        // Some providers ignore stream:true and return standard JSON instead of SSE.
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
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        const isRetryable = /status 5\d{2}|status 429|network|fetch|econnrefused|etimedout|timeout|abort/i.test(msg);
        if (isRetryable && attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`OpenAI-compatible stream error on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms: ${msg}`);
          await new Promise(resolve => window.setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
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

      if (data.error) throw new Error(data.error.message);

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