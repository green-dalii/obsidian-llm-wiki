// PDF conversion prompts — verbatim PDF → Markdown transcription.
//
// This module owns the v1.25.0 PDF Level 1 system prompt plus the
// `unwrapFencedMarkdown` helper that cleans up model output. The
// helper lives here (rather than in core/) because the bug it solves
// is purely about LLM output shape — the moment we move to a
// provider-specific tailored prompt (e.g. PR4 Kimi Files API), the
// cleanup needs to follow the prompt, not the converter.
//
// The system prompt was redesigned (PR3 follow-up #9 prompt-rewrite)
// to favor small/local models (Qwen3.5-2B, Llama 3 8B Instruct, etc.)
// which are otherwise given to fabrication under "preserve" / "do NOT
// summarize" instructions. The new framing — "verbatim transcriber,
// OCR-style" + `[illegible]` / `[figure:...]` / `[equation:...]`
// fallback markers — gives the model an explicit alternative to
// hallucination: when input is unclear, output a marker rather than a
// best-guess.

/**
 * Verbatim PDF→Markdown system prompt (v1.25.0 PR3 follow-up #9).
 *
 * Design decisions:
 * - Frames the task as "OCR-style verbatim transcriber" rather than
 *   "preserve / do not summarize" — small models understand the former
 *   concretely; the latter is too abstract.
 * - Forbids ALL markdown fence wrappers (` ```markdown `, ` ``` `, `<output>`).
 * - Adds explicit non-fabrication markers — `[illegible]`,
 *   `[figure: ...]`, `[equation: ...]` — so the model has a way to
 *   acknowledge un-transcribable content without guessing.
 * - Forbids "modernization" of punctuation / casing — verbatim output
 *   means verbatim output, including any typos in the source.
 * - Splits the YAML frontmatter instruction into its own step so
 *   models that ignored the `---` block before still get a clear
 *   signal.
 */
export const PDF_CONVERSION_SYSTEM_PROMPT = [
  'You are a verbatim PDF-to-Markdown transcriber. Your job is OCR-style conversion, not summarization.',

  'OUTPUT RULES (strictly enforced):',
  '- Output ONLY the converted Markdown. No preamble, no postscript, no framing text.',
  '- Do NOT wrap your output in ```markdown ```, ``` ```, <output></output>, or any other code/markup fence. Emit raw Markdown directly.',
  '- Do NOT add a leading "Here is the converted Markdown:" or similar meta-text. Begin with the content immediately.',
  '- Preserve the source PDF language exactly. Do NOT translate.',

  'VERBATIM FIDELITY (anti-hallucination, critical):',
  '- Preserve original wording verbatim. Do not "modernize" punctuation, capitalize, "fix" typos, or rephrase.',
  '- Numbers, dates, names, citations — reproduce exactly as printed, character-for-character.',
  '- Do NOT invent paragraph breaks the source does not have. Do not omit paragraphs the source has.',
  '- If a paragraph, sentence, or phrase is genuinely unreadable, output exactly: [illegible]',
  '- If a figure / chart / image is present and you cannot faithfully describe it, output exactly: [figure: brief one-line description]',
  '- If a mathematical equation is present and you cannot transcribe it cleanly, output exactly: [equation: source-snippet or "unreadable"]',
  '- PREFER [illegible] over guessing. False confidence is worse than an explicit gap marker.',

  'FORMATTING:',
  '- Use standard Markdown only — # for headings (matching the source heading hierarchy), - for bullets, > for block quotes, [text](url) for links.',
  '- Use | column | syntax for tables. Preserve the source header row.',
  '- Use `backticks` only for actual code listings in the source — never for non-code content.',
  '- If the PDF has a clear title and author on its first page, prepend a YAML frontmatter at the very top:',
  '  ---',
  '  title: "..."',
  '  author: "..."',
  '  (OMIT the `tags` field entirely — the plugin handles tagging via its own pipeline).',
  '  ---',
  '  (Omit frontmatter entirely if you cannot determine title or author confidently.)',

  'Begin conversion now.',
].join('\n');

/**
 * Strip the common wrapping structures that small/local LLMs add around
 * Markdown output despite the system prompt forbidding them. This is the
 * defense-in-depth that backs the prompt rewrite — even if a model
 * (e.g. one specifically fine-tuned to wrap output in code blocks)
 * ignores instruction #1, the cache still records clean Markdown.
 *
 * Rules applied, in order:
 *  1. Trim the BOM if present.
 *  2. Strip a SINGLE outermost ` ```markdown ... ``` ` fence.
 *     Multi-block responses are passed through — only the most common
 *     wrap pattern is cleaned.
 *  3. Strip a SINGLE outermost ` ``` ... ` ` (any language tag) fence.
 *  4. Strip an `<output>...</output>` wrapper (some local UIs add this).
 *  5. Strip a leading "Here is the converted Markdown:" style preamble
 *     (regex: a sentence ending in ":" before any content).
 *
 * Returns the cleaned string. If no cleaning applies, returns the
 * input unchanged (identity comparison is NOT guaranteed — whitespace
 * trimming may produce equivalent-but-distinct strings).
 *
 * This helper is intentionally conservative — when in doubt, return
 * the input as-is so the downstream analyzer is fed whatever the
 * model wrote. We do NOT massage content into compliance.
 */
export function unwrapFencedMarkdown(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return input;

  let s = input;

  // 1. BOM strip
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);

  // 2. Strip outermost ```markdown ... ``` fence
  //    Match only single-fence wraps; allow leading/trailing whitespace.
  s = s.replace(
    /^\s*```(?:markdown|md|markdown[a-z]*)\s*\n([\s\S]*?)\n\s*```\s*$/i,
    '$1'
  );

  // 3. Strip outermost ``` ... ``` (any tag) fence
  s = s.replace(/^\s*```[\w-]*\s*\n([\s\S]*?)\n\s*```\s*$/i, '$1');

  // 4. Strip <output>...</output> wrappers (handles multiline)
  s = s.replace(/^\s*<output[^>]*>\s*([\s\S]*?)\s*<\/output>\s*$/i, '$1');

  // 5. Strip leading conversational preamble. We match the first 1-2
  //    sentences that are immediately followed by Markdown content (H1
  //    `#`, horizontal rule, or frontmatter `---`). Conservative:
  //    only strips if the preamble ends with ":" / "." and the
  //    remainder starts with markdown syntax.
  s = s.replace(
    /^\s*(?:(?:Here|以下是|This is|Below is)[^.\n]{4,200}[.:]\s*\n+)(?=[#\s>|\-\n])/i,
    ''
  );

  return s.trim();
}

export const PDF_PROMPTS = {
  systemPrompt: PDF_CONVERSION_SYSTEM_PROMPT,
  unwrapFencedMarkdown,
};
