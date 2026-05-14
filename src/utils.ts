// Utility functions for Wiki processing

import { VALID_ENTITY_TAGS, VALID_CONCEPT_TAGS } from './types';

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
    .replace(/[/\\:*?"<>|,()'、，。；：！？（）【】《》]/g, '');
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
    // ===== Layer 1: Response Normalization =====
    // Normalize the raw response text before attempting JSON extraction.
    // Handles: markdown fences, prefill artifacts ({{ or missing {), trailing content.

    let normalized = response.trim();

    // Step 1.1: Strip markdown code fences
    normalized = normalized.replace(/^```(?:json|markdown|md)?\s*\n?/, '');
    normalized = normalized.replace(/\n?```$/, '');
    normalized = normalized.trim();

    // Step 1.2: Prefill artifact correction
    // Prefill technique may result in:
    //   (a) {{...}   → model echoed the prefill { and also started with { → adjacent double brace
    //   (b) {\n{...} → same but with whitespace/newline between braces → call it "loose prefill"
    //   (c) "...}"   → provider stripped the prefill → missing opening brace

    if (normalized.startsWith('{{')) {
      // Remove the first { (prefill echo)
      normalized = normalized.substring(1);
      console.debug('检测到双括号 {{，去除多余的前导 {');
    } else if (normalized.length > 1 && normalized[0] === '{') {
      // Check for "loose prefill": lone { on first line, then actual JSON starting with {
      // OR the LLM wrapped output in a code fence after echoing the prefill {
      const afterFirst = normalized.substring(1).trimStart();
      if (afterFirst.startsWith('{') || afterFirst.startsWith('```')) {
        normalized = afterFirst;
        console.debug('检测到换行分隔的双括号 {\\n{，去除多余的前导 {');
      }
    }

    if (normalized.length > 0 && normalized[0] !== '{') {
      // Try prepending { and parse (prefill stripped by provider)
      const withBrace = '{' + normalized;
      try {
        console.debug('首字符非 {，补回前导 { 后解析成功');
        return JSON.parse(withBrace) as Record<string, unknown>;
      } catch {
        // Not a simple missing brace issue, continue normal flow
        console.debug('补回前导 { 后仍失败，继续后续流程');
      }
    }

    // Step 1.3: Trailing content detection via "after JSON at position N"
    // If JSON.parse reports position N, the prefix 0..N-1 is valid JSON.
    try {
      return JSON.parse(normalized) as Record<string, unknown>;
    } catch (directError) {
      const msg = directError instanceof SyntaxError ? directError.message : '';
      const afterMatch = msg.match(/after JSON at position (\d+)/);
      if (afterMatch) {
        const endPos = parseInt(afterMatch[1], 10);
        const prefix = normalized.substring(0, endPos);
        console.debug('检测到 JSON 后有额外内容 (position %d)，提取前缀 (长度 %d)', endPos, prefix.length);
        try {
          console.debug('前缀解析成功');
          return JSON.parse(prefix) as Record<string, unknown>;
        } catch {
          console.debug('前缀解析失败，继续后续步骤');
        }
      }
    }

    // ===== Layer 2: JSON Extraction =====
    // Extract JSON from normalized text using multiple strategies.

    // Step 2.1: Brace counting (precise extraction)
    const firstBrace = normalized.indexOf('{');
    if (firstBrace !== -1) {
      const balanced = extractBalancedJson(normalized, firstBrace);
      if (balanced) {
        const fixed = fixCommonJsonIssues(balanced);
        try {
          return JSON.parse(fixed) as Record<string, unknown>;
        } catch (braceError) {
          console.debug('括号计数提取修复未成功:', String(braceError).slice(0, 80));
        }

        // LLM repair on balanced extraction
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
            console.error('LLM 修复也未成功 (括号计数):', String(llmError).slice(0, 80));
          }
        }
      }
    }

    // Step 2.2: Greedy regex fallback (handles trailing text without embedded braces)
    const jsonMatch = normalized.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const candidate = jsonMatch[0];
      const fixed = fixCommonJsonIssues(candidate);
      try {
        return JSON.parse(fixed) as Record<string, unknown>;
      } catch (regexError) {
        console.debug('贪婪正则提取修复未成功:', String(regexError).slice(0, 80));
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
          console.error('LLM 修复也未成功 (贪婪正则):', String(llmError).slice(0, 80));
        }
      }
    }

    // Step 2.3: Diagnostic logging on total failure
    console.error('❌ JSON 解析完全失败 (长度 %d)', response.length);
    console.error('规范化后开头200字符:', normalized.substring(0, 200));
    console.error('规范化后结尾200字符:', normalized.substring(Math.max(0, normalized.length - 200)));
    return null;

  } catch (error) {
    console.error('parseJsonResponse 异常:', error);
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

export interface FrontmatterData {
  reviewed?: boolean;
  type?: string;
  created?: string;
  updated?: string;
  sources?: string[];
  tags?: string[];
  aliases?: string[];
  [key: string]: unknown;
}

export function parseFrontmatter(content: string): FrontmatterData | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const result: FrontmatterData = {};
  const fmText = match[1];

  // Parse simple key-value pairs and arrays
  const lines = fmText.split('\n');
  let currentKey: string | null = null;
  let arrayValues: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      if (currentKey && arrayValues.length > 0) {
        result[currentKey] = arrayValues;
        arrayValues = [];
        currentKey = null;
      }
      continue;
    }

    // Check for array continuation (lines starting with - in YAML array)
    if (trimmed.startsWith('- ') && currentKey) {
      const value = trimmed.substring(2).trim();
      // Remove surrounding quotes if present
      arrayValues.push(value.replace(/^["']|["']$/g, ''));
      continue;
    }

    // If we were parsing an array and hit a non-array line, save it
    if (currentKey && arrayValues.length > 0 && !trimmed.startsWith('-')) {
      result[currentKey] = arrayValues;
      arrayValues = [];
      currentKey = null;
    }

    // Parse key: value
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();

    // Check if next line starts a YAML array
    const nextLine = lines[i + 1]?.trim();
    if (nextLine && nextLine.startsWith('- ')) {
      currentKey = key;
      arrayValues = [];
      continue;
    }

    // Simple value parsing
    if (key === 'reviewed') {
      result.reviewed = value === 'true';
    } else if (key === 'type') {
      result.type = value;
    } else if (key === 'created') {
      result.created = value;
    } else if (key === 'updated') {
      result.updated = value;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Inline array like ["a", "b"]
      try {
        result[key] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/^["']|["']$/g, ''))
          .filter(v => v);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  // Handle array at end of frontmatter
  if (currentKey && arrayValues.length > 0) {
    result[currentKey] = arrayValues;
  }

  return result;
}

/** Serialize value to YAML format for frontmatter */
function yamlStringify(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '\n' + value.map(v => `  - "${v}"`).join('\n');
  }
  if (typeof value === 'string') {
    // If string contains special chars, quote it
    // Note: [ and ] don't need escaping inside character class
    if (/[":[\]{}\n]/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  // For objects or any other unexpected type, return empty string
  // This should not happen with valid frontmatter data
  return '';
}

/** Extract body content after frontmatter */
export function extractBody(content: string): string {
  if (!content.startsWith('---')) return content;
  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return content;
  return content.substring(endIdx + 4).trim();
}

/** Merge frontmatter deterministically: preserve created, update sources (append), update date */
export function mergeFrontmatter(
  existingContent: string,
  newSourcePath: string
): { frontmatter: string; body: string; wasMerged: boolean } {
  const fm = parseFrontmatter(existingContent);
  const body = extractBody(existingContent);

  if (!fm) {
    // No existing frontmatter, treat as new
    return {
      frontmatter: '',
      body: existingContent,
      wasMerged: false
    };
  }

  // Merge sources array deterministically (programmatic, not LLM)
  const normalizeSourcePath = (s: string): string => {
    const trimmed = s.trim();
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      return trimmed.slice(2, -2).trim();
    }
    return trimmed;
  };
  const existingSources = Array.isArray(fm.sources) ? fm.sources : [];
  const sourceSet = new Set<string>();
  for (const s of existingSources) {
    sourceSet.add(normalizeSourcePath(String(s)));
  }
  sourceSet.add(newSourcePath);
  const mergedSources = Array.from(sourceSet).map(s => `[[${s}]]`);

  // Preserve created, update updated
  const created = fm.created || new Date().toISOString().split('T')[0];
  const updated = new Date().toISOString().split('T')[0];

  // Build new frontmatter programmatically
  const lines: string[] = ['---'];

  if (fm.type) lines.push(`type: ${fm.type}`);
  lines.push(`created: ${created}`);
  lines.push(`updated: ${updated}`);

  if (mergedSources.length > 0) {
    lines.push(`sources:${yamlStringify(mergedSources)}`);
  }

  if (Array.isArray(fm.tags) && fm.tags.length > 0) {
    lines.push(`tags:${yamlStringify(fm.tags)}`);
  }

  if (fm.reviewed) {
    lines.push('reviewed: true');
  }

  if (Array.isArray(fm.aliases) && fm.aliases.length > 0) {
    lines.push(`aliases:${yamlStringify(fm.aliases)}`);
  }

  lines.push('---');

  return {
    frontmatter: lines.join('\n'),
    body,
    wasMerged: true
  };
}

export function preserveFrontmatterReviewTag(originalContent: string, newContent: string): string {
  const origFm = parseFrontmatter(originalContent);
  if (!origFm?.reviewed) return newContent;

  // If the new content does not already have reviewed: true, inject it
  if (newContent.startsWith('---')) {
    const endIdx = newContent.indexOf('\n---', 3);
    if (endIdx !== -1 && !newContent.substring(0, endIdx).includes('reviewed:')) {
      return newContent.substring(0, endIdx) + '\nreviewed: true' + newContent.substring(endIdx);
    }
  }
  return newContent;
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

/**
 * Enforce frontmatter type and tags constraints.
 * - type: MUST be exactly "entity" or "concept" (based on page path)
 * - tags: MUST be an array of valid subtypes (entity_type or concept_type)
 *
 * This is a safety net in case LLM doesn't follow the prompt instructions.
 */
export function enforceFrontmatterConstraints(content: string, pageType: 'entity' | 'concept' | 'source'): string {
  if (!content.startsWith('---')) return content;

  const fmEnd = content.indexOf('\n---\n', 3);
  if (fmEnd === -1) return content;

  const fmText = content.substring(3, fmEnd);
  let body = content.substring(fmEnd + 5);

  // Parse existing frontmatter
  const lines = fmText.split('\n');
  const newLines: string[] = [];
  let typeLine = '';
  let collectedTags: string[] = [];
  let foundType = false;
  let foundTags = false;
  let foundAliases = false;
  let collectedAliases: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('type:')) {
      foundType = true;
      const currentType = line.substring(5).trim();
      // Force type to be entity/concept/source only
      if (pageType === 'entity' || pageType === 'concept') {
        typeLine = `type: ${pageType}`;
        // Collect original type as a tag if it was a valid subtype
        if (currentType && currentType !== 'entity' && currentType !== 'concept' && currentType !== pageType) {
          collectedTags.push(currentType);
        }
      } else {
        typeLine = `type: ${pageType}`;
      }
    } else if (line.startsWith('tags:')) {
      foundTags = true;
      // Collect existing tags from inline array format
      const tagsValue = line.substring(5).trim();
      if (tagsValue.startsWith('[') && tagsValue.endsWith(']')) {
        const inner = tagsValue.slice(1, -1).trim();
        if (inner) {
          collectedTags.push(...inner.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')));
        }
      }
      // Handle YAML array continuation on next lines
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('- ')) {
        const tagVal = lines[j].trim().substring(2).trim().replace(/^["']|["']$/g, '');
        if (tagVal) collectedTags.push(tagVal);
        j++;
      }
      if (j > i + 1) i = j - 1; // Skip processed lines
    } else if (line.startsWith('aliases:')) {
      foundAliases = true;
      // Collect aliases from inline or continuation format
      const aliasesValue = line.substring(8).trim();
      if (aliasesValue.startsWith('[') && aliasesValue.endsWith(']')) {
        const inner = aliasesValue.slice(1, -1).trim();
        if (inner) {
          collectedAliases.push(...inner.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')));
        }
      }
      // Handle YAML array continuation on next lines
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('- ')) {
        const aliasVal = lines[j].trim().substring(2).trim().replace(/^["']|["']$/g, '');
        if (aliasVal) collectedAliases.push(aliasVal);
        j++;
      }
      if (j > i + 1) i = j - 1;
    } else if (!line.startsWith('- ')) {
      newLines.push(line);
    }
  }

  // Rebuild frontmatter
  const result: string[] = ['---'];

  if (foundType) {
    result.push(typeLine);
  }

  // Add other fields (preserving order)
  for (const line of newLines) {
    if (!line.startsWith('type:') && !line.startsWith('tags:') && !line.startsWith('aliases:')) {
      result.push(line);
    }
  }

  // Add tags line
  if (foundTags || collectedTags.length > 0) {
    // Validate against schema-defined subtype ranges
    const validSubtypes = pageType === 'entity'
      ? VALID_ENTITY_TAGS
      : pageType === 'concept'
        ? VALID_CONCEPT_TAGS
        : [];
    const validTags = collectedTags.filter((v, i, a) =>
      a.indexOf(v) === i && v && v !== pageType && validSubtypes.includes(v)
    );
    if (validTags.length > 0) {
      result.push(`tags: [${validTags.join(', ')}]`);
    } else {
      const fallback = pageType === 'entity' ? 'other' : pageType === 'concept' ? 'term' : '';
      result.push(`tags: [${fallback}]`);
    }
  }

  // Add aliases line
  if (foundAliases || collectedAliases.length > 0) {
    const validAliases = collectedAliases.filter((v, i, a) => a.indexOf(v) === i && v);
    if (validAliases.length > 0) {
      result.push(`aliases:${yamlStringify(validAliases)}`);
    }
  }

  result.push('---');

  // CRITICAL: frontmatter closing delimiter MUST have blank line before body
  // Format: ---\n...\n---\n\n<body> (double newline after closing ---)
  return result.join('\n') + '\n\n' + body;
}