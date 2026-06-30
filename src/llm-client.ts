import { requestUrl, Notice } from 'obsidian';
import { LLMClient } from './types';
import { MAX_RETRIES, RETRY_BASE_DELAY_MS, MAX_TOKENS_BATCH } from './constants';
import { getText } from './core/i18n';
import { parseSSEEvents, SSEDelta } from './core/sse-parser';
import { withTruncationRetry } from './core/truncation-retry';
import { wrapReasoningContent } from './core/markdown';

// Issue #137: thinking-control dialect state. Each OpenAI-compatible
// backend uses a different field name for the same "disable thinking"
// directive. We probe at Test Connection time and cache the result on
// the client + in data.json so subsequent calls avoid the 400 round-trip.
//   'anthropic' → thinking.type='disabled' (OpenAI, DeepSeek, xAI, OpenRouter)
//   'openai'    → reasoning_effort='none'   (Gemini OpenAI-compat endpoint)
//   'none'      → skip thinking control entirely (backend rejects both)
export type ThinkingControlDialect = 'anthropic' | 'openai' | 'none';

// #137: per-request fallback notices. Each fallback event is queued here;
// emitted via Obsidian Notice once at the end of a request cycle so users
// see one consolidated message instead of a stream of warnings.
interface FallbackNotice {
  level: 'info' | 'warn';
  message: string;
}
const fallbackNoticesThisRequest: FallbackNotice[] = [];

function flushFallbackNotices(): void {
  if (fallbackNoticesThisRequest.length === 0) return;
  // Take the highest-priority notice (last warn > first info) and show once.
  // Multiple notices are joined for transparency; we don't aggregate into one
  // to preserve the "what changed" semantics of each fallback event.
  const summary = fallbackNoticesThisRequest.map(n => n.message).join(' / ');
  fallbackNoticesThisRequest.length = 0;
  try {
    new Notice(summary, 5000);
  } catch {
    // Notice may not be available in non-Obsidian contexts (tests). Console
    // already has the same message from logFallback.
  }
}

// Shared retry helper — eliminates duplicated retry loops across all client classes.
const RETRYABLE = /status 5\d{2}|status 429|overload|network|fetch|econnrefused|etimedout|timeout|abort/i;

// Issue #137: hoisted 400-status detector. Used by both the 400-catch path
// in createMessage / createMessageStream and by isThinkingControlError.
const IS_400 = /status 400|HTTP 400|Bad Request/i;

// Issue #248: tighter detection — must be a 400-class response AND mention a
// rejected field/parameter. This avoids false positives from generic errors
// that happen to contain the word "thinking" (e.g. a model that says
// "I was thinking about..." in its error string), and avoids triggering
// the fallback path for non-400 errors (5xx, 429) where the field might
// not be the actual problem.
const isThinkingControlError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : '';
  if (!IS_400.test(msg)) return false;
  return /unknown field|unsupported field|invalid parameter|not supported|reasoning_effort|thinking/i.test(msg);
};

// Issue #207: which `max_*_tokens` key this baseUrl/model accepts.
// Newer OpenAI gpt-5.x models (5.1, 5.2, 5.4-mini, 5.5) reject `max_tokens`.
// Older gpt-4 / gpt-3.5 reject `max_completion_tokens`. We probe at runtime
// instead of predicting from model name — proven wrong by #143 → #207 (twice).
export type MaxTokenKey = 'max_tokens' | 'max_completion_tokens';

const MAX_TOKEN_KEY_REGEX = /\bmax_(?:completion_)?tokens\b/i;

// Issue #207 follow-up (v1.22.5): OpenAI's reasoning model family
// (gpt-5.1+, gpt-5.5, o1/o3/o4) "works best in the Responses API" per
// OpenAI's official GPT-5.5 migration guide. Chat Completions has
// compatibility issues for reasoning models. We route the reasoning family
// to /v1/responses with `reasoning: {effort: 'low'}` and parse the
// output_text response shape.
//
// Detection rule: model name matches the OpenAI reasoning family prefix,
// AND baseUrl is the OpenAI official endpoint (custom baseUrl providers
// like Ollama / LM Studio / DeepSeek may not implement /v1/responses).
//
// v1.23.0 P1-7 replaces this whole hand-rolled block with @ai-sdk/openai v5
// (which defaults openai('gpt-5.5') to Responses API).
//
// v1.22.6 #207 follow-up: broadened to also match `-pro` variants.
// OpenAI's GPT-5 Pro models (gpt-5-pro, gpt-5.4-pro, gpt-5.5-pro) are
// "available in the Responses API only" per OpenAI's official model
// docs (developers.openai.com/api/docs/models/gpt-5-pro). The previous
// regex matched `gpt-5.x` but missed the trailing `-pro` suffix,
// so v1.22.5 silently routed Pro requests to /v1/chat/completions
// where Pro models don't exist → 404.
//
// Note: `gpt-5` (no suffix) stays on Chat Completions — its dash-suffixed
// variants (`gpt-5-mini`, `gpt-5-nano`) are also Chat Completions
// models. The dot-versioned reasoning family (`gpt-5.1`+ / `gpt-5.5`)
// is what OpenAI's migration guide actually calls Responses-only.
// `-chat-latest` is still explicitly excluded below in
// isResponsesApiModel: chat-latest models are designed for Chat
// Completions (per OpenAI's chat-latest model page), so they should
// stay on /v1/chat/completions.
const RESPONSES_API_MODEL_RE =
  /^(gpt-5\.[1-9]\d*(?:-pro)?|o1(?:-mini|-preview)?|o3(?:-mini|-pro)?|o4-mini)$/;
const OPENAI_OFFICIAL_BASEURL = /^https:\/\/api\.openai\.com\/v1\/?$/;

/**
 * Decide whether to route this model/baseUrl to /v1/responses.
 *
 * Pure function. Exported for testability.
 *
 * @param model — the OpenAI model id (e.g. "gpt-5.5", "gpt-5-chat-latest").
 * @param baseUrl — the resolved base URL of the LLM endpoint.
 * @returns true if the request should go to /v1/responses, false otherwise.
 *
 * Rules:
 * - Only routes when baseUrl is OpenAI official (custom providers stay on
 *   /chat/completions for backward compatibility — they may not implement
 *   /v1/responses).
 * - Matches the OpenAI reasoning model family (gpt-5.1+ dot-naming,
 *   o1/o3/o4 reasoning families).
 * - Explicitly excludes *-chat-latest variants (gpt-5-chat-latest is a
 *   non-reasoning chat model and works on /chat/completions).
 */
export function isResponsesApiModel(model: string, baseUrl: string): boolean {
  if (!OPENAI_OFFICIAL_BASEURL.test(baseUrl)) return false;
  // Exclude *-chat-latest explicitly: chat models are not reasoning, even
  // if their major version would otherwise match.
  if (/chat-latest$/.test(model)) return false;
  return RESPONSES_API_MODEL_RE.test(model);
}

/**
 * Inspect a 400 error body to see whether the backend rejected our choice
 * of `max_tokens` key, and return the key it WOULD accept instead.
 *
 * Recognised error shapes:
 *   OpenAI:  "Invalid parameter: max_tokens should be max_completion_tokens"
 *   OpenAI:  "Unknown parameter: 'max_tokens'"
 *   Generic: "max_tokens not supported, use max_completion_tokens"
 *
 * Returns the alternate key if the error explicitly mentions `max_tokens`,
 * `null` otherwise.
 */
export function detectRejectedMaxTokenKey(err: unknown): MaxTokenKey | null {
  if (!err) return null;
  const e = err as { json?: unknown; text?: string; message?: string; status?: number };
  let msg = '';
  let param = '';
  if (e.json && typeof e.json === 'object') {
    const j = e.json as { error?: { message?: string; param?: string; code?: string } };
    if (j.error?.message) msg = j.error.message;
    if (j.error?.param) param = j.error.param;
  }
  msg = msg || e.text || e.message || '';
  if (!msg) return null;

  // OpenAI-style 400: the error object names the rejected parameter directly.
  if (param === 'max_tokens') return 'max_completion_tokens';
  if (param === 'max_completion_tokens') return 'max_tokens';

  // Fallback: inspect the concatenated message text. Require a 400 signal
  // because some providers include the word max_tokens in unrelated errors.
  if (!IS_400.test(msg)) return null;
  if (!MAX_TOKEN_KEY_REGEX.test(msg)) return null;
  // If message names ONLY 'max_tokens' as the culprit, switch to the other key.
  if (/\bmax_tokens\b/i.test(msg) && !/\bmax_completion_tokens\b/i.test(msg)) {
    return 'max_completion_tokens';
  }
  // If message names ONLY 'max_completion_tokens' as the culprit, switch to max_tokens.
  if (/\bmax_completion_tokens\b/i.test(msg) && !/\bmax_tokens\b/i.test(msg)) {
    return 'max_tokens';
  }
  // Both keys mentioned — provider is naming the rejected one and the
  // accepted one. Prefer "use X" / "should be X" phrasing for accuracy.
  const useOtherMatch = msg.match(/(?:use|should be)\s+(\S+)/i);
  if (useOtherMatch) {
    const candidate = useOtherMatch[1].toLowerCase().replace(/[`'"]/g, '');
    if (candidate === 'max_tokens') return 'max_tokens';
    if (candidate === 'max_completion_tokens') return 'max_completion_tokens';
  }
  return null;
}

/**
 * Extract the most useful provider-facing error message from a requestUrl
 * error object. Prefers structured json.error.message, falls back to raw text,
 * and finally to the original Error.message.
 */
function extractProviderErrorMessage(err: unknown): string | null {
  const e = err as { status?: number; json?: unknown; text?: string; message?: string };
  let msg = '';
  if (e.json && typeof e.json === 'object') {
    const j = e.json as { error?: { message?: string }; message?: string };
    msg = j.error?.message || j.message || '';
  }
  if (!msg && e.text) msg = e.text;
  if (!msg && e.message) msg = e.message;
  if (!msg) return null;
  const status = e.status;
  if (status !== undefined && status !== null) {
    return `status ${status}: ${msg}`;
  }
  return msg;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// #137: extract rejected field names from a 400 error body. Supports multiple
// provider error formats:
//   Gemini v1:  Unknown name "thinking": Cannot find field.
//   Gemini v2:  temperature must be in the range [0.0, 2.0] but was 2.5
//   Anthropic:  Unknown field: thinking
//   Generic:    invalid parameter 'temperature'
// Returns a deduplicated string[] of field names that the caller can cache
// and pre-strip on future requests.
function parseUnknownFields(err: unknown): string[] {
  const errWithBody = err as { json?: unknown; text?: string; message?: string };
  // If we have structured json, use the error.message field directly
  // (avoids JSON-escaped quote mangling when running regex on .text).
  let candidateText = '';
  if (errWithBody.json && typeof errWithBody.json === 'object') {
    const jsonObj = errWithBody.json as { error?: { message?: string } };
    if (jsonObj.error?.message) candidateText = jsonObj.error.message;
  }
  if (!candidateText) {
    candidateText = errWithBody.text
                  ?? errWithBody.message
                  ?? '';
  }
  if (!candidateText) return [];
  const fields = new Set<string>();
  // Gemini: Unknown name "thinking": Cannot find field.
  for (const m of candidateText.matchAll(/Unknown name "([^"]+)"/g)) {
    fields.add(m[1]);
  }
  // Gemini range/value errors: "temperature must be in the range ..."
  for (const m of candidateText.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s+must be in the range/g)) {
    fields.add(m[1]);
  }
  // Anthropic-style: Unknown field: thinking
  for (const m of candidateText.matchAll(/Unknown field:?\s*([A-Za-z_][A-Za-z0-9_]*)/g)) {
    fields.add(m[1]);
  }
  // Generic: invalid parameter 'temperature'
  for (const m of candidateText.matchAll(/invalid parameter\s+['"]?([A-Za-z_][A-Za-z0-9_]*)/gi)) {
    fields.add(m[1]);
  }
  return [...fields];
}

function logFallback(category: string, detail: string): void {
  console.debug(`[LLMClient Fallback] ${category}: ${detail}`);
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

  // Cached result from fallback — same semantics as OpenAICompatibleClient.
  thinkingControlSupported?: boolean;

  // v1.20.1: Cache prefill-not-supported (#141, #147).
  private prefillingNotSupported = false;

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
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
    chat_template_kwargs?: Record<string, unknown>;
  }): Promise<string> {
    const shouldPrefill = params.response_format?.type === 'json_object' && !this.prefillingNotSupported;
    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.max_tokens,
      messages: shouldPrefill
        ? [...params.messages, { role: 'assistant', content: '{' }]
        : params.messages
    };
    if (params.system) body.system = params.system;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.repetition_penalty !== undefined) body.repetition_penalty = params.repetition_penalty;
    if (params.chat_template_kwargs !== undefined) body.chat_template_kwargs = params.chat_template_kwargs;
    // ROADMAP P3 #12: explicit thinking disable for thinking-capable models
    // (Anthropic format: thinking.type = 'disabled').
    if (params.enableThinking === false) {
      body.thinking = { type: 'disabled' };
    }

    // Issue #99 v2: Anthropic-compatible fallback when the provider rejects
    // thinking.type='disabled' (e.g. Claude Fable 5 / Mythos 5 where thinking
    // is mandatory). Try with thinking disabled; on 400, retry without it.
    const anthropicDoRequest = async (requestBody: Record<string, unknown>): Promise<string> =>
      withRetry(async () => {
        const response = await requestUrl({
          url: this.baseUrl + '/messages',
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'Anthropic-Version': this.apiVersion,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        // v1.20.0 hotfix #141/#147 debug: see AnthropicClient equivalent comment.
        if (response.status >= 400) {
          const errBody = (response as { text?: string }).text?.slice(0, 2000) ?? JSON.stringify(response).slice(0, 1000);
          console.error('[AnthropicCompat DEBUG] HTTP', response.status, 'on', this.baseUrl + '/messages',
            '| model:', requestBody.model,
            '| system_len:', typeof requestBody.system === 'string' ? requestBody.system.length : 'n/a',
            '| messages:', Array.isArray(requestBody.messages) ? requestBody.messages.length : 'n/a',
            '| last_msg_role:', Array.isArray(requestBody.messages) && requestBody.messages.length > 0
              ? (requestBody.messages[requestBody.messages.length - 1] as { role?: string }).role
              : 'n/a',
            '| last_msg_content_prefix:', Array.isArray(requestBody.messages) && requestBody.messages.length > 0
              ? String((requestBody.messages[requestBody.messages.length - 1] as { content?: string }).content ?? '').slice(0, 60)
              : 'n/a',
            '| response:', errBody);
        }

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

    try {
      return await anthropicDoRequest(body);
    } catch (e) {
      // v1.20.1 hotfix #141/#147: Same approach as AnthropicClient.
      // Obsidian's requestUrl throws on 4xx WITHOUT the response body.
      // Detect "400 + we were using prefill" → single non-prefill retry.
      const errMsg = e instanceof Error ? e.message : String(e);
      if (shouldPrefill && IS_400.test(errMsg)) {
        this.prefillingNotSupported = true;
        console.debug('[AnthropicCompat] 400 with prefill — retrying without prefill');
        const noPrefillBody: Record<string, unknown> = {
          model: params.model,
          max_tokens: params.max_tokens,
          messages: [...params.messages],
        };
        if (params.system) noPrefillBody.system = params.system;
        if (params.temperature !== undefined) noPrefillBody.temperature = params.temperature;
        if (params.repetition_penalty !== undefined) noPrefillBody.repetition_penalty = params.repetition_penalty;
        if (params.chat_template_kwargs !== undefined) noPrefillBody.chat_template_kwargs = params.chat_template_kwargs;
        if (params.enableThinking === false) noPrefillBody.thinking = { type: 'disabled' };
        return await anthropicDoRequest(noPrefillBody);
      }

      if (params.enableThinking === false && isThinkingControlError(e)) {
        this.thinkingControlSupported = false;
        console.debug(`[AnthropicCompat] thinking.type='disabled' not supported by ${this.baseUrl}, falling back`);
        const fallbackBody: Record<string, unknown> = {
          model: params.model,
          max_tokens: params.max_tokens,
          messages: [...params.messages],
        };
        if (params.system) fallbackBody.system = params.system;
        if (params.response_format?.type === 'json_object') {
          fallbackBody.messages = [...(fallbackBody.messages as Array<Record<string, unknown>>), { role: 'assistant', content: '{' }];
        }
        return await anthropicDoRequest(fallbackBody);
      }
      throw e;
    }
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    onChunk: (chunk: string) => void;
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
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
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.repetition_penalty !== undefined) body.repetition_penalty = params.repetition_penalty;
    if (params.enableThinking === false) {
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

  // Cached result from fallback — same semantics as OpenAICompatibleClient.
  thinkingControlSupported?: boolean;

  // v1.20.1: Cache prefill-not-supported per client instance.
  // Newer Claude models (Opus 4.8, 4.7, 4.6, Sonnet 4.6, Fable 5,
  // Mythos 5, Mythos Preview) reject assistant prefill messages.
  // Once detected, skip prefill on all subsequent requests to avoid
  // the 400 round-trip.
  private prefillingNotSupported = false;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    // Issue #141 / #134: normalize baseUrl to include /v1 suffix. The official
    // Anthropic API path is /v1/messages (not /messages), and AnthropicCompatibleClient
    // (line ~150) already does this. Without this normalization, requests hit a 404.
    const normalized = (baseUrl || 'https://api.anthropic.com')
      .replace(/\/v1\/?$/, '')
      .replace(/\/+$/, '');
    this.baseUrl = normalized + '/v1';
    this.apiVersion = '2023-06-01';
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
    cacheBreakpoint?: number;
    maxTokensPerCall?: number;
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
    chat_template_kwargs?: Record<string, unknown>;
  }): Promise<string> {
    // v1.20.1: Skip prefill when model previously rejected it (#141, #147).
    // Newer Claude models (Opus 4.8+, Sonnet 4.6+, Fable 5, Mythos 5)
    // return 400 "Prefilling assistant messages is not supported".
    const shouldPrefill = params.response_format?.type === 'json_object' && !this.prefillingNotSupported;
    const messages: Array<Record<string, unknown>> = shouldPrefill
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
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.repetition_penalty !== undefined) body.repetition_penalty = params.repetition_penalty;
    if (params.chat_template_kwargs !== undefined) body.chat_template_kwargs = params.chat_template_kwargs;
    // ROADMAP P3 #12: explicit thinking disable for thinking-capable models.
    if (params.enableThinking === false) {
      body.thinking = { type: 'disabled' };
    }

    // Issue #99 v2: try with thinking disabled; on 400 (thinking-mandatory
    // models like Claude Fable 5 / Mythos 5), retry without thinking field.
    const anthropicDoRequest = async (requestBody: Record<string, unknown>): Promise<string> =>
      withRetry(async () => {
        const response = await requestUrl({
          url: `${this.baseUrl}/messages`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'Anthropic-Version': this.apiVersion,
          },
          body: JSON.stringify(requestBody),
        });

        // v1.20.0 hotfix #141/#147 debug: surface 4xx/5xx responses so we can
        // distinguish "wrong URL" / "wrong model" / "assistant prefill rejected"
        // / "thinking field rejected" causes. Test Connection passes, Ingestion
        // fails — this debug will reveal the actual server response.
        if (response.status >= 400) {
          const errBody = (response as { text?: string }).text?.slice(0, 2000) ?? JSON.stringify(response).slice(0, 1000);
          console.error('[AnthropicClient DEBUG] HTTP', response.status, 'on', this.baseUrl + '/messages',
            '| model:', requestBody.model,
            '| system_len:', typeof requestBody.system === 'string' ? requestBody.system.length : 'n/a',
            '| messages:', Array.isArray(requestBody.messages) ? requestBody.messages.length : 'n/a',
            '| last_msg_role:', Array.isArray(requestBody.messages) && requestBody.messages.length > 0
              ? (requestBody.messages[requestBody.messages.length - 1] as { role?: string }).role
              : 'n/a',
            '| last_msg_content_prefix:', Array.isArray(requestBody.messages) && requestBody.messages.length > 0
              ? String((requestBody.messages[requestBody.messages.length - 1] as { content?: string }).content ?? '').slice(0, 60)
              : 'n/a',
            '| response:', errBody);
        }

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
              body: JSON.stringify({ ...requestBody, max_tokens: retryTokens }),
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

    try {
      return await anthropicDoRequest(body);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);

      // v1.20.1 hotfix #141/#147: On 400 with prefill, retry without prefill.
      //
      // Root cause: Obsidian's `requestUrl` throws on HTTP 4xx WITHOUT
      // including the response body in the error. We cannot check for the
      // specific "Prefilling assistant messages is not supported" string.
      // Instead: "400 + we were using prefill" → single non-prefill retry.
      //
      // Safety:
      //   - `withRetry` already exhausted its 3 attempts (400 non-retryable)
      //   - This is one additional request, cached to prevent future 400s
      //   - If 400 was not from prefill (e.g., bad model), the retry also
      //     fails and the error propagates normally
      if (shouldPrefill && IS_400.test(errMsg)) {
        this.prefillingNotSupported = true;
        console.debug('[AnthropicClient] 400 with prefill — retrying without prefill');
        const noPrefillBody: Record<string, unknown> = {
          model: params.model,
          max_tokens: params.max_tokens,
          messages: [...params.messages],
        };
        if (params.system) noPrefillBody.system = params.system;
        if (params.temperature !== undefined) noPrefillBody.temperature = params.temperature;
        if (params.repetition_penalty !== undefined) noPrefillBody.repetition_penalty = params.repetition_penalty;
        if (params.chat_template_kwargs !== undefined) noPrefillBody.chat_template_kwargs = params.chat_template_kwargs;
        if (params.enableThinking === false) noPrefillBody.thinking = { type: 'disabled' };
        return await anthropicDoRequest(noPrefillBody);
      }

      if (params.enableThinking === false && isThinkingControlError(e)) {
        this.thinkingControlSupported = false;
        console.debug(`[AnthropicClient] thinking.type='disabled' not supported, falling back`);
        const fallbackBody: Record<string, unknown> = {
          model: params.model,
          max_tokens: params.max_tokens,
          messages: [...params.messages],
        };
        if (params.system) fallbackBody.system = params.system;
        if (params.temperature !== undefined) fallbackBody.temperature = params.temperature;
        if (params.repetition_penalty !== undefined) fallbackBody.repetition_penalty = params.repetition_penalty;
        return await anthropicDoRequest(fallbackBody);
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
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
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
    if (params.temperature !== undefined) streamBody.temperature = params.temperature;
    if (params.repetition_penalty !== undefined) streamBody.repetition_penalty = params.repetition_penalty;
    if (params.enableThinking === false) {
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
      url: `${this.baseUrl}/models`,
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

  // Issue #137: thinking-control dialect state.
  //
  //   'anthropic' → backend accepts thinking.type='disabled' (OpenAI, DeepSeek, ...)
  //   'openai'    → backend accepts reasoning_effort='none' (Gemini OpenAI-compat)
  //   'none'      → backend rejects both; skip thinking control entirely
  //   undefined   → not yet probed; will attempt with anthropic dialect first
  //
  // Maintained as a per-client cache. main.ts hydrates this from
  // settings.thinkingControlCache on client construction.
  thinkingControlDialect?: ThinkingControlDialect;

  // #137: cross-request cache of field names this baseUrl has rejected.
  // Populated lazily from 400 error bodies; pre-stripped on next request
  // so we don't pay the probe round-trip again. Replaces ad-hoc
  // chat_template_kwargs injection for the OpenAI dialect fallback.
  unsupportedFields: Set<string> = new Set();

  // #207: which max_*_tokens key this baseUrl/model accepts. Probed once
  // on the first 400, then cached for the lifetime of this client. Survives
  // the entire session — no per-request prefix matching.
  maxTokenKey?: MaxTokenKey;

  // v1.20.0: fields that must never be stripped even if a 400 error
  // mentions them (e.g., "Unknown name 'model'"). Stripping these
  // would break all subsequent requests.
  private static PROTECTED_FIELDS = new Set(['model', 'messages', 'stream']);

  // #137: language tag for localized fallback notices. Wired by
  // createLLMClient so that queueFallbackNotice can resolve templates via
  // getText() instead of hard-coding TEXTS.en (which would discard the
  // per-locale translations just added to the 8 text files).
  language: 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt' | 'it' = 'en';

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

  private detectReasoningOnlyResponse(response: {
    choices: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: {
      completion_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  }): void {
    const content = response.choices[0]?.message?.content;
    if (content && content.trim().length > 0) return;

    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason !== 'length') return;

    const reasoningTokens = response.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;
    if (completionTokens > 0 && reasoningTokens / completionTokens >= 0.5) {
      throw new Error(
        'The model returned empty content after using most tokens for reasoning. ' +
        'This happens with some thinking-capable models when the reasoning toggle does not match the runtime. ' +
        'Try disabling thinking in Settings → LLM Wiki → LLM Configuration → Advanced → "Enable thinking" (turn off), ' +
        'or enable "Use chat-template kwarg to disable thinking" if the first toggle does not help.'
      );
    }
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    response_format?: { type: 'json_object' };
    maxTokensPerCall?: number;
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
    chat_template_kwargs?: Record<string, unknown>;
  }): Promise<string> {
    const messages = params.system
      ? [{ role: 'system' as const, content: params.system }, ...params.messages]
      : params.messages;

    // v1.22.5 (Issue #207 follow-up): reasoning model family uses
    // Responses API. Pure-function detection lives in isResponsesApiModel.
    if (isResponsesApiModel(params.model, this.baseUrl)) {
      return this.createMessageViaResponses(params);
    }

    // response_format: json_object is omitted for OpenAI-compatible endpoints (LM Studio,
    // Ollama, etc.) because many local backends reject it — the prompt instruction + prefilled
    // "{" is sufficient to enforce JSON output.
    // Issue #137: body is now built by buildRequestBody which applies the
    // dialect-aware thinking field + pre-strips unsupportedFields.
    const body = this.buildRequestBody(params, messages, false);
    console.debug('[OPENAI-DEBUG] buildRequestBody result reasoning_effort:', body.reasoning_effort, 'thinking:', body.thinking !== undefined, 'dialect:', this.thinkingControlDialect, 'params.enableThinking:', params.enableThinking);

    const doRequest = (bodyToUse: Record<string, unknown>): Promise<string> =>
      withRetry(async () => {
        let response: { json: unknown; status: number; text: string };
        try {
          response = await requestUrl({
            url: this.baseUrl + '/chat/completions',
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(bodyToUse)
          });
        } catch (err: unknown) {
          const status = (err as { status?: number }).status;
          const json = (err as { json?: unknown }).json;
          const text = (err as { text?: string }).text;
          const errMessage = (err as { message?: string }).message ?? '';
          // Detect 400 either via status field or via message text (matches
          // Gemini "Bad Request: ..." or "status 400: ..." formats).
          // We restrict the DEBUG-400 capture-and-re-fetch path to 400
          // specifically: 429 is a rate-limit/quota issue where the body
          // usually contains a human-readable retry hint but the caller's
          // withRetry handles backoff automatically. Re-fetching on 429
          // would burn additional quota on a user who is already throttled.
          const is400 = status === 400
            || IS_400.test(errMessage);
          if (is400) {
            // #137 debug: full error object breakdown. Obsidian requestUrl
            // throws on 4xx without the response body. We manually re-fetch
            // to capture what Gemini actually said. Logged at debug level
            // (not error) because the in-request dialect fallback chain
            // expects one 400 per rejected tier (e.g. Gemini rejects
            // thinking.type='disabled'); only escalate to error if no
            // fallback tier succeeds — that surfaces in the outer catch.
            try {
              const errObj = err as Record<string, unknown>;
              console.debug('[DEBUG-400] full error keys:', Object.keys(errObj));
              console.debug('[DEBUG-400] status:', status, 'message:', errMessage);
              console.debug('[DEBUG-400] err.json:', json, 'err.text:', text);
            } catch { /* ok */ }
            // #137 debug: Obsidian requestUrl throws on 4xx WITHOUT the response
            // body. To see what Gemini actually returned, we use the browser's
            // native fetch() API. This is DEBUG ONLY — fire-and-forget, results
            // logged to console.debug only.
            try {
              void window.fetch(this.baseUrl + '/chat/completions', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(bodyToUse),
              }).then(async (resp) => {
                const respBody = await resp.text();
                console.debug('[DEBUG-400] Gemini raw error response (re-fetch):', resp.status, respBody.substring(0, 2000));
              }).catch((fetchErr: unknown) => {
                console.debug('[DEBUG-400] Re-fetch also failed:', String(fetchErr));
              });
            } catch { /* fire-and-forget; ok if fails */ }
            // #137: parse rejected field names from the 400 body so the
            // caller's catch can strip them and retry.
            const unknown = parseUnknownFields(err);
            if (unknown.length > 0) {
              for (const f of unknown) {
                if (!OpenAICompatibleClient.PROTECTED_FIELDS.has(f)) this.unsupportedFields.add(f);
              }
              logFallback('field-strip', `fields rejected by ${this.baseUrl}: ${unknown.join(', ')}`);
            }
            console.debug('[OpenAICompat Debug] 400 error body:', JSON.stringify(json) || text || 'no body');
            console.debug('[OpenAICompat Debug] Request body size:', JSON.stringify(bodyToUse).length);
            console.debug('[OpenAICompat Debug] Model:', params.model, '| max_tokens:', params.max_tokens);
          }
          // #207 / #137: enrich the thrown error with the provider's actual
          // error message. requestUrl's own Error.message is often generic
          // ("Request failed, status 400"); the provider detail lives in
          // err.json.error.message or err.text. We copy it onto a new Error so
          // callers (Test Connection UI, query engine notices) show something
          // actionable instead of a bare HTTP status.
          const providerMsg = extractProviderErrorMessage(err);
          if (providerMsg && providerMsg !== errMessage) {
            const enriched = new Error(providerMsg);
            Object.assign(enriched, err);
            throw enriched;
          }
          throw err;
        }

      const data = response.json as {
        choices?: Array<{
          message?: { content?: string; reasoning_content?: string };
          finish_reason?: string;
        }>;
        error?: { message: string };
        usage?: {
          completion_tokens?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        };
      };

      if (data.error) {
        const err = new Error(`status ${response.status}: ${data.error.message}`);
        // Preserve the provider's raw error body so callers (Test Connection,
        // lint notices, query-engine errors) can show the actual message instead
        // of our generic wrapper.
        (err as { json?: unknown; text?: string }).json = { error: data.error };
        (err as { rawText?: string }).rawText = response.text;

        // #207: probe the max_*_tokens key inside the 200-with-error path
        // (some backends return 200 with error JSON, some throw; we handle both).
        if (!this.maxTokenKey && response.status === 400) {
          const altKey = detectRejectedMaxTokenKey(err);
          if (altKey) {
            this.maxTokenKey = altKey;
            logFallback('max-token-key-probe',
              `${altKey === 'max_completion_tokens' ? 'max_tokens' : 'max_completion_tokens'} rejected; retrying with ${altKey}`);
            const rebuilt = this.buildRequestBody(params, messages, false);
            return await doRequest(rebuilt);
          }
        }
        throw err;
      }

      const initialChoices = data.choices;
      // v1.20.0: extract reasoning_content (DeepSeek thinking) from non-stream
      // response and prepend as <think> block so extractThinkingBlocks can find it.
      const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
      const content = data.choices?.[0]?.message?.content || '';
      const initialText = wrapReasoningContent(reasoning, content);

      return withTruncationRetry<{ choices: NonNullable<typeof data.choices>; initialText: string; usage?: typeof data.usage }>({
        initialFn: async () => {
          // #137: confirm dialect on first successful response. The body
          // that produced this 200 is the correct dialect for this baseUrl.
          this.confirmDialectOnSuccess(bodyToUse);
          return { choices: initialChoices ?? [], initialText, usage: data.usage };
        },
        retryFn: async (retryTokens) => {
          // #207: use the probed maxTokenKey, not the original request's key.
          // If the first request was a probe (max_tokens) and got a 200 OK,
          // this.maxTokenKey is now set and the retry will use the same key.
          // If the first request succeeded with max_tokens (e.g., gpt-4) and
          // got truncated, this.maxTokenKey is still undefined and we fall
          // back to the original bodyToUse's key.
          const retryTokenKey: MaxTokenKey = this.maxTokenKey
            ?? ('max_completion_tokens' in bodyToUse ? 'max_completion_tokens' : 'max_tokens');
          const retryResponse = await requestUrl({
            url: this.baseUrl + '/chat/completions',
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ ...bodyToUse, [retryTokenKey]: retryTokens }),
          });
          const retryData = retryResponse.json as typeof data;
          if (retryData.error) throw new Error(`status ${retryResponse.status}: ${retryData.error.message}`);
          return { choices: retryData.choices ?? [], initialText, usage: retryData.usage, retryReasoning: retryData.choices?.[0]?.message?.reasoning_content || '' };
        },
        isTruncated: (r) => r.choices[0]?.finish_reason === 'length',
        extractText: (r) => {
          const content = r.choices[0]?.message?.content || '';
          const retryReasoning = (r as { retryReasoning?: string }).retryReasoning || '';
          return retryReasoning
            ? wrapReasoningContent(retryReasoning, content)
            : (content || r.initialText);
        },
        getMaxTokens: () => params.max_tokens,
        getStopReason: (r) => r.choices[0]?.finish_reason,
        maxCap: params.maxTokensPerCall || MAX_TOKENS_BATCH,
        label: 'OpenAI-compatible API',
        onTruncatedResponse: (r) => this.detectReasoningOnlyResponse(r),
      });
    }, 3, 'OpenAI-compatible API');

    try {
      return await doRequest(body);
    } catch (e) {
      // #207: backend rejected our max_*_tokens key — probe, cache, retry.
      // This replaces the old prefix-matching heuristic (#143 / line 963
      // before this commit) which silently broke every time OpenAI shipped
      // a new model family. Now we let the API tell us what it wants.
      if (!this.maxTokenKey) {
        const altKey = detectRejectedMaxTokenKey(e);
        if (altKey) {
          this.maxTokenKey = altKey;
          logFallback('max-token-key-probe',
            `${altKey === 'max_completion_tokens' ? 'max_tokens' : 'max_completion_tokens'} rejected; retrying with ${altKey}`);
          const rebuilt = this.buildRequestBody(params, messages, false);
          return await doRequest(rebuilt);
        }
      }
      // #137 Tier 1: thinking-dialect 400 → fall back to next dialect.
      if (params.enableThinking === false && isThinkingControlError(e)) {
        return await this.applyThinkingDialectFallback(body, params, messages, doRequest);
      }
      // #137 generic: backend rejected one or more fields (Gemini "temperature
      // must be in the range...", "Unknown name 'repetition_penalty'"). The
      // catch inside doRequest already populated unsupportedFields; retry with
      // those fields stripped.
      const stripped = this.retryBodyWithStrippedFields(body);
      if (stripped !== null) {
        logFallback('field-strip-retry', `retrying without: ${[...this.unsupportedFields].join(', ')}`);
        this.queueFallbackNotice('paramStripped', [...this.unsupportedFields].join(', '));
        flushFallbackNotices();
        return await doRequest(stripped);
      }
      throw e;
    }
  }

  // Issue #137: build the request body with dialect-aware thinking control
  // and pre-strip any fields this baseUrl has previously rejected.
  //
  //   dialect=anthropic → thinking.type='disabled'
  //   dialect=openai    → reasoning_effort='none'
  //   dialect=none      → no thinking control field
  //   dialect=undefined → assume anthropic (probe will correct on 400)
  //
  // Note: chat_template_kwargs is no longer injected here. v1.19.0 used it
  // as the fallback path, but #137 showed that Gemini rejects it as well.
  // Local backends that accept it (Ollama MLX) still receive it from the
  // wrapper (see llm-client-wrapper.ts injection).
  private buildRequestBody(
    params: {
      model: string;
      max_tokens: number;
      temperature?: number;
      repetition_penalty?: number;
      chat_template_kwargs?: Record<string, unknown>;
      enableThinking?: boolean;
    },
    messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}>,
    streaming: boolean,
  ): Record<string, unknown> {
    // #207: probe-then-cache — first request uses `max_tokens` (the
    // OpenAI-compatible legacy), the backend tells us via 400 if it wants
    // `max_completion_tokens` instead, we cache and reuse. No more
    // prefix-matching on model names. When OpenAI ships `gpt-6` or renames
    // yet again, this code does not need to change.
    const tokenKey = this.maxTokenKey ?? 'max_tokens';

    const body: Record<string, unknown> = {
      model: params.model,
      [tokenKey]: params.max_tokens,
      messages,
    };
    if (streaming) body.stream = true;

    // v1.20.0: by default (caller does not pass these), do not inject
    // temperature / repetition_penalty / chat_template_kwargs. Each field is
    // only sent when the caller explicitly provides it (Custom Advanced mode)
    // AND this baseUrl has not previously rejected it.
    if (params.temperature !== undefined && !this.unsupportedFields.has('temperature')) {
      body.temperature = params.temperature;
    }
    if (params.repetition_penalty !== undefined && !this.unsupportedFields.has('repetition_penalty')) {
      body.repetition_penalty = params.repetition_penalty;
    }
    if (params.chat_template_kwargs !== undefined && !this.unsupportedFields.has('chat_template_kwargs')) {
      body.chat_template_kwargs = params.chat_template_kwargs;
    }

    // #137: dialect-aware thinking control field selection.
    if (params.enableThinking === false) {
      const dialect = this.thinkingControlDialect ?? 'anthropic';
      if (dialect === 'anthropic') {
        body.thinking = { type: 'disabled' };
      } else if (dialect === 'openai') {
        body.reasoning_effort = 'none';
      }
      // dialect === 'none' → no field
    }

    return body;
  }

  // #137: invoked by doRequest on successful response when thinking control
  // was sent. Confirms the dialect cache so subsequent calls skip the probe.
  private confirmDialectOnSuccess(body: Record<string, unknown>): void {
    if (body.thinking !== undefined && this.thinkingControlDialect !== 'anthropic') {
      this.thinkingControlDialect = 'anthropic';
    } else if (body.reasoning_effort !== undefined && this.thinkingControlDialect !== 'openai') {
      this.thinkingControlDialect = 'openai';
    }
  }

  // #137: shared field-strip retry helper. Returns a new body with
  // unsupportedFields removed, or null if nothing was actually stripped
  // (so the caller knows to fall through to the original error path).
  // Used by both the non-stream and stream 400 catch blocks.
  private retryBodyWithStrippedFields(body: Record<string, unknown>): Record<string, unknown> | null {
    if (this.unsupportedFields.size === 0) return null;
    const retryBody: Record<string, unknown> = { ...body };
    let changed = false;
    for (const f of this.unsupportedFields) {
      if (f in retryBody) {
        delete retryBody[f];
        changed = true;
      }
    }
    return changed ? retryBody : null;
  }

  // Issue #137: 3-tier dialect fallback chain.
  //   Tier 1: anthropic → openai (thinking.type → reasoning_effort)
  //   Tier 2: openai → none (drop thinking field entirely)
  //
  // Each tier reuses buildRequestBody with a forced dialect override so
  // the retry inherits the unsupportedFields pre-strip (a previous Tier-1
  // failure may have populated unsupportedFields via the catch in
  // doRequest). Building the retry body by hand would skip that strip
  // and risk re-sending fields the backend just rejected.
  private async applyThinkingDialectFallback(
    body: Record<string, unknown>,
    params: { model: string; max_tokens: number; temperature?: number; repetition_penalty?: number; chat_template_kwargs?: Record<string, unknown>; enableThinking?: boolean },
    messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}>,
    doRequest: (body: Record<string, unknown>) => Promise<string>,
  ): Promise<string> {
    const sentThinking = body.thinking !== undefined;
    const sentReasoning = body.reasoning_effort !== undefined;
    const startedAtDialect = this.thinkingControlDialect;
    const reachedTier2 = sentThinking
      && (startedAtDialect === undefined || startedAtDialect === 'anthropic');

    // Tier 1: anthropic → openai (swap thinking for reasoning_effort)
    if (reachedTier2) {
      this.thinkingControlDialect = 'openai';
      logFallback('thinking-dialect', `anthropic → openai (reasoning_effort) for ${this.baseUrl}`);
      this.queueFallbackNotice('thinkingDialect', 'openai (reasoning_effort)');
      try {
        return await doRequest(this.buildRequestBody(params, messages, false));
      } catch (e2) {
        if (!isThinkingControlError(e2)) throw e2;
        // fall through to tier 2
      }
    }

    // Tier 2: openai → none (drop both fields).
    // Triggered either when we just transitioned out of Tier 1, or when
    // the cached dialect is already 'openai' and the body sent
    // reasoning_effort. Set dialect='none' BEFORE buildRequestBody — the
    // body builder reads this.thinkingControlDialect to decide whether
    // to emit a thinking field.
    if (reachedTier2 || sentReasoning) {
      this.thinkingControlDialect = 'none';
      logFallback('thinking-dialect', `openai → none (no thinking control) for ${this.baseUrl}`);
      this.queueFallbackNotice('thinkingNone');
      return await doRequest(this.buildRequestBody(params, messages, false));
    }

    // Tier 3: already at none — re-throw original error (caller will surface it)
    throw new Error(
      `Thinking control rejected by ${this.baseUrl} for all known dialects (anthropic, openai, none). ` +
      'The provider may not support disabling thinking. Try a different model or disable "Enable thinking" in Advanced settings.'
    );
  }

  // #137: queue a localized fallback notice for the next flushFallbackNotices() call.
  private queueFallbackNotice(kind: 'thinkingDialect' | 'thinkingNone' | 'paramStripped', detail?: string): void {
    let msg = '';
    if (kind === 'thinkingDialect') {
      msg = getText(this.language, 'fallbackThinkingDialect').replace('{dialect}', detail ?? 'openai');
    } else if (kind === 'thinkingNone') {
      msg = getText(this.language, 'fallbackThinkingNone');
    } else if (kind === 'paramStripped') {
      msg = getText(this.language, 'fallbackParamStripped').replace('{field}', detail ?? '');
    }
    if (msg) fallbackNoticesThisRequest.push({ level: 'warn', message: msg });
  }

  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    onChunk: (chunk: string) => void;
    enableThinking?: boolean;
    temperature?: number;
    repetition_penalty?: number;
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

    // Issue #137: stream path uses the same dialect-aware body builder.
    const body = this.buildRequestBody(params, messages, /* streaming */ true);

    const doRequest = (bodyToUse: Record<string, unknown>) =>
      withRetry(async () => {
        let response: { json: unknown; status: number; text: string; headers: Record<string, string> };
        try {
          response = await requestUrl({
            url: this.baseUrl + '/chat/completions',
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(bodyToUse)
          });
        } catch (err: unknown) {
          // #137: parse rejected field names from the 400 error so
          // unsupportedFields is populated even on stream requests,
          // enabling the generic field-strip retry at line 1041.
          // (The non-stream createMessage has the same pattern.)
          const status = (err as { status?: number }).status;
          const errMessage = (err as { message?: string }).message ?? '';
          const is400 = status === 400 || IS_400.test(errMessage);
          if (is400) {
            const unknown = parseUnknownFields(err);
            if (unknown.length > 0) {
              for (const f of unknown) {
                if (!OpenAICompatibleClient.PROTECTED_FIELDS.has(f)) this.unsupportedFields.add(f);
              }
              logFallback('field-strip', `fields rejected by ${this.baseUrl}: ${unknown.join(', ')}`);
            }
          }
          // #207 / #137: enrich the thrown error with the provider's actual message.
          const providerMsg = extractProviderErrorMessage(err);
          if (providerMsg && providerMsg !== errMessage) {
            const enriched = new Error(providerMsg);
            Object.assign(enriched, err);
            throw enriched;
          }
          throw err;
        }

        const responseText = response.text;

        // Parse SSE events using shared parser
        const deltas = parseSSEEvents(responseText, 'openai');
        let fullText = '';
        let reasoningContent = '';
        for (const delta of deltas) {
          // v1.20.0: accumulate reasoning_content from DeepSeek-style providers
          // that return thinking in a separate delta field (not <think> tags).
          // Prepend as <think>...</think> so extractThinkingBlocks() can find it.
          if (delta.reasoning) {
            reasoningContent += delta.reasoning;
          }
          if (delta.text) {
            fullText += delta.text;
            params.onChunk(delta.text);
          }
        }

        // Prepend accumulated reasoning as <think> block (never sent to onChunk
        // to avoid double-render; only included in the returned string so the
        // Query Wiki's extractThinkingBlocks can find it).
        if (reasoningContent) {
          fullText = wrapReasoningContent(reasoningContent, fullText);
        }

        // Fallback: if SSE parsing yielded nothing, try non-streaming JSON format.
        if (!fullText) {
          console.debug('[OpenAICompat SSE] SSE parsing empty, trying non-streaming JSON fallback');
          try {
            const data = JSON.parse(responseText) as {
              choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              error?: { message: string };
            };
            if (data.error) throw new Error(data.error.message);
            const text = data.choices?.[0]?.message?.content || '';
            const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
            if (text || reasoning) {
              console.debug('[OpenAICompat SSE] Non-streaming fallback successful, length:', text.length);
              fullText = wrapReasoningContent(reasoning, text);
              if (text) params.onChunk(text);
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
      // #207: backend rejected our max_*_tokens key — probe, cache, retry.
      if (!this.maxTokenKey) {
        const altKey = detectRejectedMaxTokenKey(e);
        if (altKey) {
          this.maxTokenKey = altKey;
          logFallback('max-token-key-probe-stream',
            `${altKey === 'max_completion_tokens' ? 'max_tokens' : 'max_completion_tokens'} rejected; retrying with ${altKey}`);
          const rebuilt = this.buildRequestBody(params, messages, /* streaming */ true);
          return await doRequest(rebuilt);
        }
      }
      if (params.enableThinking === false && isThinkingControlError(e)) {
        // Issue #137: stream path uses the same 3-tier dialect fallback.
        return await this.applyThinkingDialectFallback(body, params, messages, doRequest);
      }
      // #137 generic: 400-field-rejection in stream path. Same pre-strip retry.
      if ((e as Error).message && IS_400.test((e as Error).message)) {
        const stripped = this.retryBodyWithStrippedFields(body);
        if (stripped !== null) {
          logFallback('field-strip-retry', `stream retrying without: ${[...this.unsupportedFields].join(', ')}`);
          this.queueFallbackNotice('paramStripped', [...this.unsupportedFields].join(', '));
          flushFallbackNotices();
          return await doRequest(stripped);
        }
      }
      throw e;
    }
  }

  // v1.22.5 (Issue #207 follow-up): Responses API code path for OpenAI
  // reasoning model family (gpt-5.1+, gpt-5.5, o1/o3/o4). Routed from
  // createMessage() when isResponsesApiModel() returns true.
  //
  // Why this is minimal: 90% of the existing OpenAICompatibleClient
  // infrastructure (probing, retry, error extraction, dialect fallback)
  // doesn't apply to /v1/responses. The Responses API has its own
  // distinct error format and doesn't need max_tokens probing. This method
  // is intentionally standalone so v1.23.0 P1-7 can replace the whole
  // OpenAICompatibleClient with @ai-sdk/openai v5.
  //
  // Reference: OpenAI's GPT-5.5 migration guide explicitly recommends
  // "Use the Responses API for any reasoning, tool-calling, or multi-turn
  // use case." (https://platform.openai.com/docs/guides/gpt-5)
  private async createMessageViaResponses(params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<string> {
    // v1.22.5 Fix 1: wrap the entire request in withRetry so 429 / 5xx /
    // network errors get the same exponential backoff as Chat Completions
    // (1s, 2s, 4s + jitter, 3 attempts). Without this, a transient 429
    // immediately aborts and the Test Connection Notice shows a bare
    // "status 429" without the provider's actual error body.
    //
    // The inner closure does NOT throw on 4xx — it throws a real Error
    // (which the existing RETRYABLE regex then matches for 429 only) so
    // that 400-class errors fail fast and the retry budget isn't spent
    // on parameter-validation failures.
    return withRetry(async () => {
      // Responses API uses `input` (array of message objects) instead of
      // `messages`. system goes as a system-role message in `input`.
      const input: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (params.system) {
        input.push({ role: 'system', content: params.system });
      }
      for (const m of params.messages) {
        input.push({ role: m.role, content: m.content });
      }

      const body: Record<string, unknown> = {
        model: params.model,
        input,
        // Per OpenAI: `reasoning.effort` defaults to `medium` if omitted,
        // but explicit `low` keeps latencies short and is the right default
        // for ingest/lint/test-connection workloads.
        reasoning: { effort: 'low' },
        // Responses API uses `max_output_tokens` (not `max_tokens`).
        max_output_tokens: params.max_tokens,
      };

      // v1.22.5 Fix 2 (real): Obsidian's requestUrl THROWS on 4xx (including
      // 429) rather than returning a response object. The thrown Error
      // carries the provider's body in .json / .text (per #137). We must
      // catch it here and merge the provider body into the thrown message
      // so the Test Connection Notice and DevTools console both surface
      // the actual diagnostic (e.g. "You exceeded your current quota")
      // instead of a bare "status 429".
      let response;
      try {
        response = await requestUrl({
          url: this.baseUrl + '/responses',
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        });
      } catch (err: unknown) {
        const errObj = err as { json?: unknown; text?: string; status?: number };
        const status = errObj.status;
        // v1.22.5 Fix 2 (real): Obsidian's requestUrl throws on 4xx
        // (including 429) WITHOUT populating err.json or err.text. So we
        // cannot surface the provider's actual diagnostic in the thrown
        // Error.message — UNLESS we re-fetch via window.fetch (which is
        // available in Obsidian's renderer context and DOES return the
        // response body). We await one re-fetch with a tight 5s timeout
        // so the user sees the real provider message ("You exceeded your
        // current quota...") in the Test Connection Notice, not just a
        // bare "status 429". The re-fetch is safe even when throttled:
        // a 429 on the re-fetch costs ~1 extra HTTP round-trip and
        // returns the same quota message we already saw.
        console.warn(
          `[OpenAICompat Responses API] HTTP ${status ?? '???'} on ${this.baseUrl}/responses | model: ${params.model} (requestUrl swallowed the body; re-fetching via window.fetch to capture the real provider diagnostic)`
        );
        let enrichedMsg: string | null = null;
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 5000);
          const resp = await window.fetch(this.baseUrl + '/responses', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          window.clearTimeout(timeoutId);
          const respBody = await resp.text();
          console.warn(
            `[OpenAICompat Responses API] raw provider response: status=${resp.status} | body=${respBody.substring(0, 2000)}`
          );
          // Try to extract a useful message from the re-fetched body.
          try {
            const parsed = JSON.parse(respBody) as {
              error?: { message?: string } | string;
            } | null;
            if (parsed?.error) {
              const candidate = typeof parsed.error === 'string'
                ? parsed.error
                : parsed.error.message;
              if (candidate) enrichedMsg = candidate;
            }
          } catch { /* not JSON; ignore */ }
          if (!enrichedMsg && respBody) enrichedMsg = respBody.slice(0, 500);
        } catch (fetchErr: unknown) {
          console.warn(`[OpenAICompat Responses API] re-fetch failed: ${String(fetchErr)}`);
        }
        if (enrichedMsg) {
          const enriched = new Error(`status ${status ?? '???'}: ${enrichedMsg}`);
          Object.assign(enriched, err);
          throw enriched;
        }
        // Re-throw original error if re-fetch didn't produce anything useful.
        throw err;
      }

      // Some Obsidian versions may return a non-2xx response object
      // without throwing. Handle that case too (defense in depth).
      if (response.status >= 400) {
        const errBody = (response as { text?: string }).text?.slice(0, 2000) ?? '<no body>';
        console.warn(
          `[OpenAICompat Responses API] HTTP ${response.status} on ${this.baseUrl}/responses | model: ${params.model} | response: ${errBody}`
        );
        const data = response.json as {
          error?: { message?: string } | string;
        } | null;
        if (data?.error) {
          const errMsg = typeof data.error === 'string'
            ? data.error
            : data.error.message;
          if (errMsg) throw new Error(`status ${response.status}: ${errMsg}`);
        }
        if (errBody && errBody !== '<no body>') {
          throw new Error(`status ${response.status}: ${errBody.slice(0, 500)}`);
        }
        throw new Error(`status ${response.status}`);
      }

      // Parse Responses API shape:
      //   { output: [{ type: 'message', content: [{ type: 'output_text', text: '...' }, ...] }] }
      const data = response.json as {
        output?: Array<{
          type?: string;
          content?: Array<{ type?: string; text?: string }>;
        }>;
      };

      const messages = data.output ?? [];
      for (const item of messages) {
        if (item.type !== 'message' || !Array.isArray(item.content)) continue;
        for (const part of item.content) {
          if (part.type === 'output_text' && typeof part.text === 'string') {
            return part.text;
          }
        }
      }
      return '';
    }, 3, 'OpenAI Responses API');
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
