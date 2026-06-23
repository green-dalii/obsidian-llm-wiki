// v1.22.0 #97: parse the LLM's JSON response for Schema suggestions.
//
// The v1.22.0 prompt asks the LLM to return:
//   { changes_needed: true,  new_schema_body: "<full markdown>", suggestions: "..." }
//   { changes_needed: false, suggestions: "..." }
//
// We accept legacy responses (v1.21.x: no new_schema_body) for back-compat.
// We strip ``` fences and YAML frontmatter so applySchemaSuggestion can
// splice the result directly.
//
// Synchronous (no LLM call, no I/O). The async layer above us is the
// LLM call; the response is in-memory by the time we parse it.

export interface ParsedSchemaSuggestion {
  changes_needed: boolean;
  /** The full new body (frontmatter-free). Undefined when the LLM did not
   *  provide one — the UI should fall back to "suggestions only" mode. */
  newSchemaBody?: string;
  /** Human-readable rationale (kept for the suggestions.md audit trail). */
  suggestions: string;
}

interface LLMSchemaResponse {
  changes_needed?: boolean;
  new_schema_body?: string;
  suggestions?: string;
}

export function parseSchemaSuggestion(raw: string): ParsedSchemaSuggestion {
  if (!raw || raw.trim() === '') {
    return { changes_needed: false, suggestions: '' };
  }
  // Synchronous parse with defensive JSON extraction. The full async
  // repair path in core/json.ts is overkill here because (a) we control
  // the prompt and (b) the suggestions field is the only human-visible
  // fallback when parse fails.
  let parsed: LLMSchemaResponse | null = null;
  try {
    const stripped = stripCodeFence(raw);
    const intermediate: unknown = JSON.parse(stripped);
    if (intermediate && typeof intermediate === 'object') {
      parsed = intermediate;
    }
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return { changes_needed: false, suggestions: '' };
  }

  const newSchemaBody = parsed.new_schema_body
    ? extractBodyFromFull(stripCodeFence(parsed.new_schema_body))
    : undefined;

  // Default changes_needed to true if the LLM provided a non-empty body
  // (the Modal gating wants "yes" when there's something to show). If
  // the LLM explicitly says false, honor that.
  const changesNeeded =
    typeof parsed.changes_needed === 'boolean'
      ? parsed.changes_needed
      : Boolean(newSchemaBody) || Boolean(parsed.suggestions);

  return {
    changes_needed: changesNeeded,
    newSchemaBody,
    suggestions: parsed.suggestions ?? '',
  };
}

/**
 * Strip leading/trailing ``` fences if the LLM accidentally wrapped the
 * body in a code block. This is defensive: the prompt forbids the
 * pattern, but local 7B/13B models often emit it anyway.
 */
function stripCodeFence(s: string): string {
  // Only strip leading whitespace (LLM may add an extra leading newline)
  // and an explicit leading ``` fence. Preserve trailing whitespace
  // and content — a body that ends with \n must stay ending with \n
  // so spliceBody() produces a byte-identical result for no-op applies.
  let result = s.replace(/^\s+/, '');
  const open = result.match(/^```[a-zA-Z0-9_-]*\n/);
  if (open) result = result.slice(open[0].length);
  if (result.endsWith('```')) result = result.slice(0, -3);
  return result;
}

/**
 * Strip YAML frontmatter (the leading `--- ... ---` block) from a schema
 * file's full content. Returns the body (markdown) only.
 *
 * If there's no frontmatter (or it's malformed), returns the input
 * unchanged so the user can see the raw content in the diff Modal and
 * decide what to do.
 */
export function extractBodyFromFull(fullContent: string): string {
  if (!fullContent.startsWith('---')) return fullContent;
  const end = fullContent.indexOf('---', 3);
  if (end <= 0) return fullContent;
  // Skip past the closing `---` and any leading blank line. YAML
  // frontmatter is conventionally followed by exactly one blank line
  // before the body. We do NOT trimEnd — the body's trailing newline
  // is meaningful when splicing into a schema file.
  let body = fullContent.substring(end + 3);
  // Strip up to one leading blank line (\r\n, \n, \r) to land on body start
  if (body.startsWith('\r\n\r\n')) body = body.slice(4);
  else if (body.startsWith('\n\n')) body = body.slice(2);
  else if (body.startsWith('\r\n')) body = body.slice(2);
  else if (body.startsWith('\n')) body = body.slice(1);
  return body;
}
