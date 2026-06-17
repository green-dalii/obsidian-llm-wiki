export async function parseJsonResponse(
  response: string,
  repairFn?: (malformedJson: string) => Promise<string>
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

    console.error('JSON parse completely failed (length %d)', response.length);
    console.error('first 200 chars after normalization:', normalized.substring(0, 200));
    console.error('last 200 chars after normalization:', normalized.substring(Math.max(0, normalized.length - 200)));
    return null;

  } catch (error) {
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
