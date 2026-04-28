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
  console.debug('parseJsonResponse 开始解析...');
  console.debug('响应长度:', response.length);

  try {
    // Step 1: Clean possible markdown wrapping
    let cleaned = response.trim();

    // Remove opening ```json or ``` markers
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json|markdown|md)?\s*\n?/, '');
      console.debug('移除开头的代码块标记');
    }

    // Remove closing ``` markers
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/\n?```$/, '');
      console.debug('移除结尾的代码块标记');
    }

    cleaned = cleaned.trim();
    console.debug('清理后长度:', cleaned.length);
    console.debug('前100字符:', cleaned.substring(0, 100));

    // Step 2: Try direct parsing
    try {
      const result = JSON.parse(cleaned);
      console.debug('✅ 直接解析成功');
      return result;
    } catch {
      console.warn('直接解析失败，尝试提取 JSON 对象');
    }

    // Step 3: Extract JSON object (may be surrounded by other text)
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.debug('找到 JSON 对象，长度:', jsonMatch[0].length);
      try {
        const result = JSON.parse(jsonMatch[0]);
        console.debug('✅ 提取后解析成功');
        return result;
      } catch (extractError) {
        console.error('提取后解析失败:', extractError);
        console.debug('提取的 JSON 前200字符:', jsonMatch[0].substring(0, 200));

        // Step 4: Try to fix common JSON format issues
        // Remove trailing commas
        let fixedJson = jsonMatch[0].replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
        try {
          const result = JSON.parse(fixedJson);
          console.debug('✅ 修复后解析成功');
          return result;
        } catch (fixError) {
          console.error('修复后解析失败:', fixError);
        }
      }
    }

    // Step 5: Try LLM-based repair if available
    if (repairFn) {
      const brokenJson = jsonMatch ? jsonMatch[0] : cleaned;
      console.debug('尝试 LLM 修复 JSON，长度:', brokenJson.length);
      try {
        const repaired = await repairFn(brokenJson);
        const result = JSON.parse(repaired.trim());
        console.debug('✅ LLM 修复后解析成功');
        return result;
      } catch (repairError) {
        console.error('LLM 修复后解析仍失败:', repairError);
      }
    }

    // Step 6: If all attempts fail, return null
    console.error('❌ JSON 解析完全失败');
    console.debug('完整响应内容:', response);
    return null;

  } catch (error) {
    console.error('parseJsonResponse 异常:', error);
    console.debug('原始响应:', response);
    return null;
  }
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

  // Ensure frontmatter starts at position 0 for Obsidian to parse it
  // LLM may preface content with explanatory text before the --- delimiter
  if (!cleaned.startsWith('---')) {
    const fmStart = cleaned.indexOf('\n---\n');
    if (fmStart !== -1) {
      cleaned = cleaned.substring(fmStart + 1);
      console.debug('已移除前置文本，frontmatter 现在从位置0开始');
    }
  }

  return cleaned.trim();
}