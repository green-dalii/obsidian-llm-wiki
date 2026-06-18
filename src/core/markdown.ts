export function cleanMarkdownResponse(response: string): string {
  console.debug('cleanMarkdownResponse input length:', response.length);

  let cleaned = response.trim();

  cleaned = cleaned.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, '');

  if (cleaned.indexOf('\n---\n') === -1) {
    const headerMatch = cleaned.match(/\n#{1,2} \S/);
    if (headerMatch) {
      const cutIdx = cleaned.indexOf(headerMatch[0]);
      if (cutIdx > 0) {
        cleaned = cleaned.slice(cutIdx + 1).replace(/^\s+/, '');
      }
    }
  }

  const codeBlockPatterns = [
    /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/gm,
    /^```(?:markdown|md)?\s*([\s\S]*?)```$/gm,
    /^```(?:markdown|md)?\s*\n([\s\S]*)$/gm,
    /^```(?:markdown|md)?\s*([\s\S]*)$/gm,
  ];

  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.replace(pattern, '$1').trim();
      console.debug('code block wrapping detected, removed');
      break;
    }
  }

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/, '');
    console.debug('removed opening code block marker');
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
    console.debug('removed closing code block marker');
  }

  console.debug('cleanMarkdownResponse output length:', cleaned.length);
  console.debug('first 50 chars:', cleaned.substring(0, 50));

  if (!cleaned.startsWith('---')) {
    const fmEnd = cleaned.indexOf('\n---\n');
    if (fmEnd !== -1) {
      const beforeFm = cleaned.substring(0, fmEnd);
      const looksLikeFrontmatter =
        beforeFm.includes(':') &&
        !beforeFm.startsWith('#') &&
        !beforeFm.startsWith('```') &&
        beforeFm.split('\n').filter(l => l.trim()).every(l => l.includes(':') || l.trim() === '');
      if (looksLikeFrontmatter) {
        cleaned = '---\n' + cleaned;
        console.debug('added missing opening ---');
      } else {
        cleaned = cleaned.substring(fmEnd + 1);
        console.debug('removed preamble text before frontmatter');
      }
    }
  }

  return cleaned.trim();
}

/**
 * Extract reasoning blocks from LLM response content.
 *
 * v1.20.0: When the user runs thinking-capable models with the default
 * "no explicit thinking control" mode, providers may emit reasoning as:
 *   - <think>...</think> blocks
 *   - <thinking>...</thinking> blocks (alternative XML)
 *   - <think role="assistant">...</think> (with attributes)
 *
 * The Query Wiki UI renders the visible content normally and shows the
 * reasoning inside a <details> collapsible block (default collapsed), so
 * reasoning never visually leaks into the main answer. This extractor
 * normalizes all three forms into a single shape.
 *
 * Pure function — no side effects.
 *
 * @param content - Raw LLM response text
 * @returns Object with `thinkingBlocks: string[]` (in order) and
 *          `visibleContent: string` (with the blocks removed)
 */
export function extractThinkingBlocks(content: string): {
  thinkingBlocks: string[];
  visibleContent: string;
} {
  if (!content) {
    return { thinkingBlocks: [], visibleContent: '' };
  }

  // Match both <think>...</think> and <thinking>...</thinking> with optional
  // attributes on the opening tag. Use non-greedy [\s\S]*? so multiple blocks
  // are matched individually rather than as one giant block.
  // Require a closing tag — incomplete blocks (no close) are left in the
  // visible content to avoid swallowing the rest of the response.
  const blockRegex = /<think(?:ing)?\b[^>]*>[\s\S]*?<\/think(?:ing)?>\s*/gi;
  const thinkingBlocks: string[] = [];
  let visibleContent = content.replace(blockRegex, (_match) => {
    return '';
  });

  // Re-extract the inner content of each block for the result. Doing the
  // replacement in two passes (strip with whitespace, then collect inner)
  // is simpler than passing through a callback with capture groups.
  const innerRegex = /<think(?:ing)?\b[^>]*>([\s\S]*?)<\/think(?:ing)?>/gi;
  let m: RegExpExecArray | null;
  while ((m = innerRegex.exec(content)) !== null) {
    thinkingBlocks.push(m[1].trim());
  }

  return { thinkingBlocks, visibleContent: visibleContent.trimStart() };
}

/**
 * Encode reasoning_content into a <think> block and prepend to visible text.
 * This is the encoding counterpart to extractThinkingBlocks() — the two
 * functions share the same `<think>...</think>` delimiter contract.
 *
 * @param reasoning - Raw reasoning content (e.g. DeepSeek reasoning_content)
 * @param text - Visible response text
 * @returns Combined string with reasoning wrapped in <think> tags, or just text
 */
export function wrapReasoningContent(reasoning: string, text: string): string {
  if (!reasoning) return text;
  return '<think>' + reasoning + '</think>\n\n' + text;
}
