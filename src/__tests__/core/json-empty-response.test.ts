/**
 * v1.24.1 PATCH Phase 5 — parseJsonResponse quiet-path options.
 *
 * Three empty-body fixes land here:
 *  1. `silentOnEmpty: true` — suppress the 3-line console.error spam
 *     when the LLM returns a 0-byte body. Drop to console.debug instead.
 *  2. `throwOnEmpty: true` — throw `EmptyResponseError` instead of
 *     returning null. Lets callers distinguish "empty" (LLM truncated
 *     itself out of tokens) from "malformed" (LLM gave garbage).
 *  3. Backward-compat — omitting options keeps the OLD noisy default,
 *     so all 9 un-migrated callers behave exactly as before.
 *
 * Existing imports + behavior from `__tests__/core/json.test.ts` are
 * intentionally NOT modified — this suite is additive.
 */
import { describe, it, expect, vi } from 'vitest';
import { parseJsonResponse, EmptyResponseError } from '../../core/json';

describe('parseJsonResponse — v1.24.1 quiet path (Phase 5)', () => {
  it('default behavior (no options): empty body returns null AND logs console.error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await parseJsonResponse('');
      expect(result).toBeNull();
      // Old noisy default: at least one console.error with parse-fail msg.
      expect(errorSpy).toHaveBeenCalled();
      const errMsgs = errorSpy.mock.calls.map((args) => String(args[0]));
      expect(errMsgs.some((m) => m.includes('JSON parse completely failed'))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('silentOnEmpty: true — empty body returns null AND logs console.debug (no error)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    try {
      const result = await parseJsonResponse('', undefined, { silentOnEmpty: true });
      expect(result).toBeNull();
      // Quiet path: NO console.error emitted for empty body.
      const errMsgs = errorSpy.mock.calls.map((args) => String(args[0]));
      expect(errMsgs.some((m) => m.includes('JSON parse completely failed'))).toBe(false);
      // console.debug path: should fire at least once mentioning 'empty'.
      const debugMsgs = debugSpy.mock.calls.map((args) =>
        args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ')
      );
      expect(debugMsgs.some((m) => m.toLowerCase().includes('empty'))).toBe(true);
    } finally {
      errorSpy.mockRestore();
      debugSpy.mockRestore();
    }
  });

  it('silentOnEmpty: true — non-empty malformed JSON STILL logs console.error (scope is empty only)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await parseJsonResponse(
        '{not valid json at all',
        undefined,
        { silentOnEmpty: true },
      );
      expect(result).toBeNull();
      // Malformed (non-empty) is NOT silenced — still logs.
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('throwOnEmpty: true — empty body throws EmptyResponseError (no return)', async () => {
    await expect(
      parseJsonResponse('', undefined, { throwOnEmpty: true }),
    ).rejects.toBeInstanceOf(EmptyResponseError);
  });

  it('throwOnEmpty: true — empty body throws with rawLength === 0', async () => {
    try {
      await parseJsonResponse('', undefined, { throwOnEmpty: true });
      throw new Error('expected parseJsonResponse to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(EmptyResponseError);
      const err = e as EmptyResponseError;
      expect(err.rawLength).toBe(0);
      expect(err.name).toBe('EmptyResponseError');
      expect(err.message).toMatch(/empty response/i);
    }
  });

  it('throwOnEmpty: true — empty body with spaces counts as empty (rawLength === 4 after trim is irrelevant — length is pre-trim)', async () => {
    // rawLength is the LENGTH OF THE RAW RESPONSE (before normalization),
    // regardless of whitespace. It tells the caller how much the LLM
    // actually returned in total bytes.
    try {
      await parseJsonResponse('    ', undefined, { throwOnEmpty: true });
      throw new Error('expected parseJsonResponse to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(EmptyResponseError);
      const err = e as EmptyResponseError;
      expect(err.rawLength).toBe(4);
    }
  });

  it('silentOnEmpty + throwOnEmpty together — empty body throws EmptyResponseError AND stays quiet on console.error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        parseJsonResponse('', undefined, {
          silentOnEmpty: true,
          throwOnEmpty: true,
        }),
      ).rejects.toBeInstanceOf(EmptyResponseError);
      const errMsgs = errorSpy.mock.calls.map((args) => String(args[0]));
      // Even though we throw, the silent flag still suppresses console.error.
      expect(errMsgs.some((m) => m.includes('JSON parse completely failed'))).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('throwOnEmpty: true — non-empty malformed JSON does NOT throw (only empty throws); returns null + logs error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await parseJsonResponse('{garbage', undefined, { throwOnEmpty: true });
      expect(result).toBeNull();
      // still noisy because malformed != empty
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('valid JSON with empty-options omitted: returns parsed object (backward-compat baseline)', async () => {
    const result = await parseJsonResponse('{"x": 1}');
    expect(result).toEqual({ x: 1 });
  });

  it('valid JSON with silentOnEmpty: true: returns parsed object (silent flag is empty-only)', async () => {
    const result = await parseJsonResponse('{"x": 1}', undefined, { silentOnEmpty: true });
    expect(result).toEqual({ x: 1 });
  });

  it('EmptyResponseError is exported and is a subclass of Error', () => {
    const err = new EmptyResponseError(0);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('EmptyResponseError');
    expect(err.rawLength).toBe(0);
  });

  it('existing 2-arg call signature `(response, repairFn)` still works (backward-compat)', async () => {
    const result = await parseJsonResponse('```json\n{"k":"v"}\n```');
    expect(result).toEqual({ k: 'v' });
  });
});

describe('parseJsonResponse — empty body path + repairFn interaction', () => {
  it('silentOnEmpty: true with a repairFn: throws BEFORE invoking repairFn when raw is empty', async () => {
    const repairFn = vi.fn(async (_: string) => '{"x":1}');
    // Empty input → repairFn is not called because there's nothing to
    // repair; throwOnEmpty takes precedence over silent.
    await expect(
      parseJsonResponse('', repairFn, { silentOnEmpty: true, throwOnEmpty: true }),
    ).rejects.toBeInstanceOf(EmptyResponseError);
    expect(repairFn).not.toHaveBeenCalled();
  });
});
