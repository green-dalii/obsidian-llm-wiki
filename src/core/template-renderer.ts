/**
 * Replace all `{{placeholder}}` tokens in a string with values from a vars map.
 *
 * Supported syntax: `{{name}}` where `name` matches `\w+` (letters, digits,
 * underscore). Unknown placeholders are left as-is AND emit `console.warn`
 * — this is strictly additive over the previous `.replace()` chains, which
 * silently left later occurrences unrendered.
 *
 * `key in vars` is sufficient: prompt site callers always pass inline object
 * literals, so prototype-pollution from `__proto__` / `constructor` is not
 * a concern in practice.
 *
 * Read-only and pure: no IO, no async.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (key in vars) {
      return vars[key];
    }
    console.warn(`[renderTemplate] unknown placeholder: ${match}`);
    return match;
  });
}