// v1.22.4 — pure-function tests for #207 maxTokenKey detection and
// provider-error enrichment. These cover the heuristic edge cases
// independently of the OpenAICompatibleClient lifecycle.

import { describe, it, expect } from 'vitest';
import { detectRejectedMaxTokenKey } from '../../llm-client';

describe('detectRejectedMaxTokenKey', () => {
  it('returns max_completion_tokens when OpenAI error.param is max_tokens', () => {
    const err = {
      status: 400,
      json: { error: { message: "Invalid parameter: 'max_tokens' is not supported", param: 'max_tokens' } },
    };
    expect(detectRejectedMaxTokenKey(err)).toBe('max_completion_tokens');
  });

  it('returns max_tokens when OpenAI error.param is max_completion_tokens (rare proxy)', () => {
    const err = {
      status: 400,
      json: { error: { message: 'Unknown field', param: 'max_completion_tokens' } },
    };
    expect(detectRejectedMaxTokenKey(err)).toBe('max_tokens');
  });

  it('returns max_completion_tokens when text mentions max_tokens + status 400', () => {
    const err = {
      status: 400,
      text: 'status 400: max_tokens not supported on this model, use max_completion_tokens',
    };
    expect(detectRejectedMaxTokenKey(err)).toBe('max_completion_tokens');
  });

  it('returns null when message mentions max_tokens but is not a 400 error', () => {
    // Avoid false positives: e.g. an info log that happens to mention max_tokens.
    const err = {
      status: 200,
      text: 'request used max_tokens=100',
    };
    expect(detectRejectedMaxTokenKey(err)).toBeNull();
  });

  it('returns null when 400 error has nothing to do with token keys', () => {
    const err = {
      status: 400,
      json: { error: { message: 'Invalid API key', code: 'invalid_api_key' } },
    };
    expect(detectRejectedMaxTokenKey(err)).toBeNull();
  });

  it('returns null when error object is empty', () => {
    expect(detectRejectedMaxTokenKey(new Error('boom'))).toBeNull();
    expect(detectRejectedMaxTokenKey(null)).toBeNull();
    expect(detectRejectedMaxTokenKey(undefined)).toBeNull();
  });

  it('falls back to err.message when json/text are missing', () => {
    const err = Object.assign(new Error('Bad Request: max_tokens not supported'), { status: 400 });
    expect(detectRejectedMaxTokenKey(err)).toBe('max_completion_tokens');
  });

  it('does NOT confuse completion_tokens-only mentions with max_completion_tokens', () => {
    // Provider error mentioning only "completion_tokens" (not the param name)
    // should not trigger switching.
    const err = {
      status: 400,
      text: 'Bad Request: completion_tokens must be a positive integer',
    };
    expect(detectRejectedMaxTokenKey(err)).toBeNull();
  });
});