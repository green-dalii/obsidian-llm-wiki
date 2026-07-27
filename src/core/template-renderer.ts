/**
 * Template placeholder renderer.
 *
 * Background: GH #361 Theme 3 — the prompt layer has 5+ sites that call
 * `String.replace('{{placeholder}}', value)` without the `/g` flag,
 * silently skipping every occurrence after the first. This utility
 * replaces all occurrences in one pass with `/g`, and warns on unknown
 * placeholders (which the silent sites also failed silently on — the
 * warning is strictly additive).
 *
 * Conservative regex: `\w+` only. Placeholders containing `.` or `-`
 * (e.g. `{{a.b}}`, `{{a-b}}`) are intentionally left untouched —
 * ambiguous syntax and the existing sites use only word-char placeholders.
 *
 * Read-only and pure: no IO, no async.
 *
 * @param template string containing `{{placeholder}}` tokens
 * @param vars     map of placeholder name -> substituted value
 * @returns        template with all known placeholders substituted;
 *                 unknown placeholders left as-is (with a console.warn)
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key];
    }
    console.warn(`[renderTemplate] unknown placeholder: ${match}`);
    return match;
  });
}