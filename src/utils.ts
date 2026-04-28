// Utility functions for Wiki processing

export function slugify(text: string): string {
  console.debug('slugify 输入:', text, '长度:', text?.length);

  if (!text || text.trim().length === 0) {
    console.warn('slugify: 输入文本为空');
    return 'untitled';
  }

  const trimmed = text.trim();
  console.debug('trim 后:', trimmed, '长度:', trimmed.length);

  // Step 1: Remove ASCII control characters (char code < 32) and filesystem-unsafe symbols
  const afterRemoveInvalid = trimmed
    .split('')
    .filter(c => c.charCodeAt(0) >= 32)
    .join('')
    .replace(/[/\\:*?"<>|、，。；：！？（）【】《》]/g, '');
  console.debug('移除无效字符和特殊符号后:', afterRemoveInvalid, '长度:', afterRemoveInvalid.length);

  if (afterRemoveInvalid.length === 0) {
    console.warn('slugify: 移除无效字符后为空，使用备用名称');
    console.debug('原始输入字符编码:', trimmed.split('').map(c => c.charCodeAt(0)));
    return 'untitled-' + Date.now();
  }

  // Step 2: Convert spaces and dots to dashes
  const afterSpaceToDash = afterRemoveInvalid.replace(/[\s.]+/g, '-');
  console.debug('空格转连字符后:', afterSpaceToDash, '长度:', afterSpaceToDash.length);

  // Step 3: Merge multiple dashes
  const afterMergeDash = afterSpaceToDash.replace(/-+/g, '-');
  console.debug('合并连字符后:', afterMergeDash, '长度:', afterMergeDash.length);

  // Step 4: Remove leading and trailing dashes
  const finalSlug = afterMergeDash.replace(/^-|-$/g, '').trim();
  console.debug('最终 slug:', finalSlug, '长度:', finalSlug.length);

  if (finalSlug.length === 0) {
    console.warn('slugify: 最终结果为空，使用备用名称');
    console.debug('=== 调试信息 ===');
    console.debug('原始输入字符编码:', trimmed.split('').map(c => c.charCodeAt(0)));
    console.debug('处理后字符编码:', afterRemoveInvalid.split('').map(c => c.charCodeAt(0)));
    return 'untitled-' + Date.now();
  }

  return finalSlug;
}

export async function parseJsonResponse(
  response: string,
  repairFn?: (malformedJson: string) => Promise<string>
): Promise<Record<string, unknown> | null> {
  console.debug('parseJsonResponse 开始解析... 响应长度:', response.length);

  try {
    // Step 1: Strip markdown code fences (regex — handles standard wrapping)
    let cleaned = response.trim();
    cleaned = cleaned.replace(/^```(?:json|markdown|md)?\s*\n?/, '');
    cleaned = cleaned.replace(/\n?```$/, '');
    cleaned = cleaned.trim();

    // Step 2: Fast path — direct parse
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      // fall through
    }

    // Step 3: Extract the outermost { … } object (regex)
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const candidate = jsonMatch ? jsonMatch[0] : cleaned;

    // Step 4: Deterministic fixes for common, unambiguous patterns
    const deterministic = fixCommonJsonIssues(candidate);
    try {
      return JSON.parse(deterministic) as Record<string, unknown>;
    } catch (detError) {
      console.debug('标准修复未成功，交由 LLM 处理:', String(detError).slice(0, 80));
    }

    // Step 5: LLM repair — handles structural / ambiguous issues
    if (repairFn) {
      try {
        const repaired = await repairFn(candidate);
        const cleanedLlm = repaired.trim()
          .replace(/^```(?:json)?\s*\n?/, '')
          .replace(/\n?```$/, '')
          .trim();
        // Run deterministic fixes on LLM output as well (belt and suspenders)
        const final = fixCommonJsonIssues(cleanedLlm);
        return JSON.parse(final) as Record<string, unknown>;
      } catch (llmError) {
        console.error('LLM 修复也未成功:', String(llmError).slice(0, 80));
      }
    }

    console.error('❌ JSON 解析完全失败 (长度 %d)', response.length);
    return null;
  } catch (error) {
    console.error('parseJsonResponse 异常:', error);
    return null;
  }
}

// ---------- deterministic repair helpers ----------

function fixCommonJsonIssues(json: string): string {
  // (a) trailing commas before } or ]
  let fixed = json.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');

  // (b) unescaped content-quotes via state machine (fast, deterministic)
  fixed = escapeContentQuotes(fixed);

  // (c) missing comma between adjacent strings on separate lines
  //     "..." \n "..."  →  "...,\n"..."
  fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');

  // (a) again in case the above fixes introduced trailing commas
  fixed = fixed.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');

  return fixed;
}

function escapeContentQuotes(json: string): string {
  // State machine: track whether we're inside a string.
  // When we encounter " inside a string, peek ahead.
  //  - followed by : , } ] or end-of-input → structural close
  //  - otherwise → content quote → escape as \"
  const out: string[] = [];
  let inString = false;
  let i = 0;

  while (i < json.length) {
    const ch = json[i];

    // backslash inside string → copy the escape sequence literally
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
      // peek at the next significant character
      let peek = i + 1;
      while (peek < json.length && isJsonWhitespace(json[peek])) peek++;
      const nextCh = peek < json.length ? json[peek] : '';

      if (
        nextCh === ':' || nextCh === ',' || nextCh === '}' || nextCh === ']' ||
        peek >= json.length
      ) {
        // structural close
        inString = false;
        out.push(ch);
      } else {
        // content quote
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

export function cleanMarkdownResponse(response: string): string {
  console.debug('cleanMarkdownResponse 输入长度:', response.length);

  // Remove markdown code block wrapping
  // Pattern 1: ```markdown ... ```
  // Pattern 2: ``` ... ```
  // Pattern 3: ```md ... ```

  let cleaned = response.trim();

  // Try matching code block patterns
  const codeBlockPatterns = [
    /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/gm,  // Complete code block (multiline)
    /^```(?:markdown|md)?\s*([\s\S]*?)```$/gm,       // Complete code block (no newline)
    /^```(?:markdown|md)?\s*\n([\s\S]*)$/gm,         // Opening code block, no closing
    /^```(?:markdown|md)?\s*([\s\S]*)$/gm,           // Opening code block marker
  ];

  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // Extract code block content (remove ``` markers)
      cleaned = cleaned.replace(pattern, '$1').trim();
      console.debug('检测到代码块包裹，已移除');
      break;
    }
  }

  // If still has residual ````, manually remove opening and closing
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/, '');
    console.debug('移除开头的代码块标记');
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
    console.debug('移除结尾的代码块标记');
  }

  console.debug('cleanMarkdownResponse 输出长度:', cleaned.length);
  console.debug('前50字符:', cleaned.substring(0, 50));

  // Ensure frontmatter starts at position 0 for Obsidian to parse it.
  // LLM may omit the opening --- or preface content with explanatory text.
  if (!cleaned.startsWith('---')) {
    const fmEnd = cleaned.indexOf('\n---\n');
    if (fmEnd !== -1) {
      const beforeFm = cleaned.substring(0, fmEnd);
      // Check if it looks like frontmatter: key:value lines, no markdown headings
      const looksLikeFrontmatter =
        beforeFm.includes(':') &&
        !beforeFm.startsWith('#') &&
        !beforeFm.startsWith('```') &&
        beforeFm.split('\n').filter(l => l.trim()).every(l => l.includes(':') || l.trim() === '');
      if (looksLikeFrontmatter) {
        cleaned = '---\n' + cleaned;
        console.debug('已添加缺失的开头 ---');
      } else {
        cleaned = cleaned.substring(fmEnd + 1);
        console.debug('已移除 frontmatter 前的前置文本');
      }
    }
  }

  return cleaned.trim();
}