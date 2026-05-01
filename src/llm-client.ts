import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
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
      error?: { message: string };
    };

    if (data.error) throw new Error(data.error.message);
    let text = this.extractText(data.content || []);
    // Safety: if prefill { was stripped by the provider, restore it
    if (params.response_format?.type === 'json_object' && text.length > 0 && text[0] !== '{') {
      text = '{' + text;
    }
    return text;
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

    // Parse SSE events from response body
    const responseText = response.text;
    let fullText = '';
    const events = responseText.split('\n\n');
    for (const event of events) {
      if (!event.trim()) continue;
      const dataLine = event.split('\n')
        .find(line => line.startsWith('data: '));
      if (!dataLine) continue;
      try {
        const parsed = JSON.parse(dataLine.slice(6)) as {
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

    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.max_tokens,
      system: params.system || undefined,
      messages: finalMessages
    });
    const textBlock = response.content.find(c => c.type === 'text');
    let text = textBlock && 'text' in textBlock ? textBlock.text : '';
    // Safety: if prefill { was stripped by the provider, restore it
    if (params.response_format?.type === 'json_object' && text.length > 0 && text[0] !== '{') {
      text = '{' + text;
    }
    return text;
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

export class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true,
      timeout: 300000,         // 5 minutes per request
      maxRetries: 3            // auto-retry on transient HTTP errors
    });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
  }): Promise<string> {
    return this.createMessageWithRetry(params);
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string> {
    return this.createMessageStreamWithRetry(params);
  }

  private async createMessageWithRetry(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
  }, attempt = 0): Promise<string> {
    const messagesWithSystem = params.system
      ? [
        { role: 'system', content: params.system } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...params.messages
      ]
      : params.messages;

    try {
      const response = await this.client.chat.completions.create({
        model: params.model,
        max_tokens: params.max_tokens,
        messages: messagesWithSystem,
        ...(params.response_format ? { response_format: params.response_format } : {})
      });
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      if (this.isNetworkError(error) && attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Network error on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => activeWindow.setTimeout(resolve, delay));
        return this.createMessageWithRetry(params, attempt + 1);
      }
      throw error;
    }
  }

  private async createMessageStreamWithRetry(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }, attempt = 0): Promise<string> {
    const messagesWithSystemAndLanguage = params.system
      ? [
        { role: 'system', content: params.system } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...params.messages
      ]
      : [
        ...params.messages,
        {
          role: 'user',
          content: 'Please respond in the same language as the user\'s question. If the user asks in Chinese, reply in Chinese. If the user asks in English, reply in English. Keep the response language consistent with the user\'s input language.'
        }
      ];

    try {
      const stream = await this.client.chat.completions.create({
        model: params.model,
        max_tokens: params.max_tokens,
        messages: messagesWithSystemAndLanguage as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        stream: true
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          fullResponse += text;
          params.onChunk(text);
        }
      }

      return fullResponse;
    } catch (error) {
      if (this.isNetworkError(error) && attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Stream network error on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => activeWindow.setTimeout(resolve, delay));
        return this.createMessageStreamWithRetry(params, attempt + 1);
      }
      throw error;
    }
  }

  private isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
    const msg = error instanceof Error ? error.message : String(error);
    return /network|fetch|econnrefused|econnreset|etimedout|abort|closed/i.test(msg);
  }

  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      const modelIds = models.data
        .map(m => m.id)
        .filter(id => !id.includes(':') && !id.includes('/'))
        .sort();
      return modelIds.slice(0, 100);
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }
}