/**
 * v1.24.1 PATCH Phase 5.5.0 (quiet path) — distinguishes "LLM returned 0 bytes"
 * from "LLM gave garbage".
 *
 * Thrown by `parseJsonResponse` when the raw LLM response length is 0
 * (optionally after stripping thinking/think tags and code fences).
 *
 * Why an exception instead of returning null:
 *  - Returning null is ambiguous: callers historically treated null as
 *    "JSON parse failed" and triggered noisy `console.error` chains.
 *  - Empty body is a distinct, recoverable condition (thinking model
 *    ran out of token budget before emitting JSON). Callers in
 *    retry-helper flows (`withTransientRetry`) want to retry; callers
 *    in alert flows want to silently skip.
 *
 * `rawLength` is the LENGTH OF THE RAW RESPONSE (before normalization).
 * It tells callers exactly how many bytes the LLM SDK returned.
 */
export class EmptyResponseError extends Error {
  readonly rawLength: number;
  constructor(rawLength: number) {
    super(`LLM returned empty response (length ${rawLength})`);
    this.name = 'EmptyResponseError';
    this.rawLength = rawLength;
  }
}

/**
 * v1.24.1 PATCH Phase 5.5.0 (quiet path) — quiet-path options for
 * `parseJsonResponse`. Both options are empty-body-only — malformed
 * non-empty JSON keeps the legacy noisy `console.error` path (operators
 * need that signal).
 *
 * Backward-compat: omitting this argument preserves v1.24.0 behavior
 * exactly. All existing callers (and the 21 tests in `json.test.ts`)
 * continue to pass without modification.
 */
export interface ParseJsonOptions {
  /**
   * Suppress `console.error` when the raw response length is 0.
   * Default: `false` (legacy noisy).
   *
   * Rationale: when the LLM returns 0 bytes, that is NOT a parse
   * failure — there is nothing to parse. Three lines of console.error
   * ("JSON parse completely failed / first 200 chars / last 200 chars")
   * are pure noise that pollutes devtools during Lint runs. Set `true`
   * for source-analyzer / seed-selector / lint-fix call sites where
   * empty body is an expected condition (thinking-model budget
   * exhaustion).
   */
  silentOnEmpty?: boolean;

  /**
   * Throw `EmptyResponseError` instead of returning `null` when the
   * raw response length is 0. Default: `false` (return `null` for
   * backward compat).
   *
   * Use this when the caller wants to distinguish "empty" (LLM ran
   * out of budget) from "malformed" (LLM gave bad JSON) — e.g., for
   * `withTransientRetry` flows where empty is retriable.
   */
  throwOnEmpty?: boolean;
}

export async function parseJsonResponse(
  response: string,
  repairFn?: (malformedJson: string) => Promise<string>,
  options?: ParseJsonOptions,
): Promise<Record<string, unknown> | null> {
  console.debug('parseJsonResponse parsing started... response length:', response.length);

  try {
    // ===== Layer 1: Response Normalization =====
    let normalized = response.trim();

    // Step 1.0: Strip reasoning/thinking blocks
    normalized = normalized.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '');
    normalized = normalized.replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, '');
    normalized = normalized.trim();

    // Step 1.1: Strip markdown code fences
    normalized = normalized.replace(/^```(?:json|markdown|md)?\s*\n?/, '');
    normalized = normalized.replace(/\n?```$/, '');
    normalized = normalized.trim();

    // Step 1.2: Prefill artifact correction
    if (normalized.startsWith('{{')) {
      normalized = normalized.substring(1);
      console.debug('Prefill echo "{{" detected, removing leading {');
    } else if (normalized.length > 1 && normalized[0] === '{') {
      const afterFirst = normalized.substring(1).trimStart();
      if (afterFirst.startsWith('{') || afterFirst.startsWith('```')) {
        normalized = afterFirst;
        console.debug('Newline-separated "{\\n{" detected {\\n{，removing leading {');
      }
    }

    if (normalized.length > 0 && normalized[0] !== '{') {
      const withBrace = '{' + normalized;
      try {
        console.debug("first char not '{', prepended '{' and parsed successfully");
        return JSON.parse(withBrace) as Record<string, unknown>;
      } catch {
        console.debug("prepending '{' still failed, continuing");
      }
    }

    // Step 1.3: Trailing content detection
    try {
      return JSON.parse(normalized) as Record<string, unknown>;
    } catch (directError) {
      const msg = directError instanceof SyntaxError ? directError.message : '';
      const afterMatch = msg.match(/after JSON at position (\d+)/);
      if (afterMatch) {
        const endPos = parseInt(afterMatch[1], 10);
        const prefix = normalized.substring(0, endPos);
        console.debug('extra content after JSON detected (position %d)，prefix extracted (length %d)', endPos, prefix.length);
        try {
          console.debug('prefix parsed successfully');
          return JSON.parse(prefix) as Record<string, unknown>;
        } catch {
          console.debug('prefix parse failed, continuing');
        }
      }
    }

    // ===== Layer 2: JSON Extraction =====
    const firstBrace = normalized.indexOf('{');
    if (firstBrace !== -1) {
      const balanced = extractBalancedJson(normalized, firstBrace);
      if (balanced) {
        const fixed = fixCommonJsonIssues(balanced);
        try {
          return JSON.parse(fixed) as Record<string, unknown>;
        } catch (braceError) {
          console.debug('brace-count extraction failed:', String(braceError).slice(0, 80));
        }

        if (repairFn) {
          try {
            const repaired = await repairFn(balanced);
            const cleanedLlm = repaired.trim()
              .replace(/^```(?:json)?\s*\n?/, '')
              .replace(/\n?```$/, '')
              .trim();
            const final = fixCommonJsonIssues(cleanedLlm);
            return JSON.parse(final) as Record<string, unknown>;
          } catch (llmError) {
            console.error('LLM repair also failed (brace-count):', String(llmError).slice(0, 80));
          }
        }
      }
    }

    // Step 2.2: Greedy regex fallback
    const jsonMatch = normalized.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const candidate = jsonMatch[0];
      const fixed = fixCommonJsonIssues(candidate);
      try {
        return JSON.parse(fixed) as Record<string, unknown>;
      } catch (regexError) {
        console.debug('greedy regex extraction failed:', String(regexError).slice(0, 80));
      }

      if (repairFn) {
        try {
          const repaired = await repairFn(candidate);
          const cleanedLlm = repaired.trim()
            .replace(/^```(?:json)?\s*\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
          const final = fixCommonJsonIssues(cleanedLlm);
          return JSON.parse(final) as Record<string, unknown>;
        } catch (llmError) {
          console.error('LLM repair also failed (greedy regex):', String(llmError).slice(0, 80));
        }
      }
    }

    // v1.24.1 PATCH Phase 5.5.0 (quiet path): detect empty-body SPECIFICALLY
    // (raw bytes trim to nothing after Layer-1 normalization — no `{` found
    // means no parseable payload). Empty body is "LLM returned nothing" —
    // distinct from "LLM gave unparseable text". The legacy noisy 3-line
    // console.error was good for malformed JSON (operators need signal)
    // but pure noise for empty (the response is "I called and got nothing
    // back" — it's right in the user's mental model).
    //
    // We use `normalized === ''` (post-trim, post-thinking-block-strip,
    // post-code-fence-strip) rather than `response.length === 0` so
    // whitespace-only responses are also classified as empty.
    if (normalized === '') {
      if (options?.silentOnEmpty) {
        console.debug('parseJsonResponse: empty body (raw length %d) — silent path', response.length);
      } else {
        console.error('JSON parse completely failed (raw length %d) — empty response from LLM', response.length);
      }
      if (options?.throwOnEmpty) {
        throw new EmptyResponseError(response.length);
      }
      return null;
    }

    // Non-empty + unparseable: legacy noisy default (operators need signal).
    console.error('JSON parse completely failed (length %d)', response.length);
    console.error('first 200 chars after normalization:', normalized.substring(0, 200));
    console.error('last 200 chars after normalization:', normalized.substring(Math.max(0, normalized.length - 200)));
    return null;

  } catch (error) {
    // v1.24.1 PATCH Phase 5.5.0 (quiet path): EmptyResponseError is a
    // domain signal we deliberately throw — must propagate to caller
    // (re-throw without logging). Only UNEXPECTED exceptions get the
    // generic catch log.
    if (error instanceof EmptyResponseError) {
      throw error;
    }
    console.error('parseJsonResponse exception:', error);
    return null;
  }
}

/** Extract the first balanced {…} JSON object via brace counting. */
function extractBalancedJson(text: string, startPos: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startPos; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.substring(startPos, i + 1);
      }
    }
  }

  return null;
}

function fixCommonJsonIssues(json: string): string {
  let fixed = json.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
  fixed = escapeContentQuotes(fixed);
  fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');
  fixed = fixed.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
  return fixed;
}

function escapeContentQuotes(json: string): string {
  const out: string[] = [];
  let inString = false;
  let i = 0;

  while (i < json.length) {
    const ch = json[i];

    if (ch === '\\' && inString) {
      out.push(ch);
      i++;
      if (i < json.length) out.push(json[i]);
      i++;
      continue;
    }

    if (!inString && ch === '"') {
      inString = true;
      out.push(ch);
      i++;
      continue;
    }

    if (inString && ch === '"') {
      let peek = i + 1;
      while (peek < json.length && isJsonWhitespace(json[peek])) peek++;
      const nextCh = peek < json.length ? json[peek] : '';

      if (
        nextCh === ':' || nextCh === ',' || nextCh === '}' || nextCh === ']' ||
        peek >= json.length
      ) {
        inString = false;
        out.push(ch);
      } else {
        out.push('\\"');
      }
      i++;
      continue;
    }

    out.push(ch);
    i++;
  }

  return out.join('');
}

function isJsonWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}
