import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { LLMClient } from './types';

export class AnthropicClient implements LLMClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.max_tokens,
      system: params.system || undefined,
      messages: params.messages
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
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
    try {
      return Promise.resolve([
        'claude-sonnet-4-6',
        'claude-opus-4-7',
        'claude-haiku-4-5-20251001'
      ]);
    } catch (error) {
      console.error('Anthropic 模型列表获取失败:', error);
      return Promise.resolve([]);
    }
  }
}

export class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true
    });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string> {
    const messagesWithSystem = params.system
      ? [
        { role: 'system', content: params.system } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...params.messages
      ]
      : params.messages;

    const response = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: messagesWithSystem as OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    });
    return response.choices[0]?.message?.content || '';
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string> {
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