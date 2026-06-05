// Categorize fetch-model errors so the Notice can give specific guidance
// (check API Key, check BaseURL, try again, or enter model ID manually).
// Pure function — extracted from settings.ts to enable unit testing without
// the heavy Obsidian module graph.
export type FetchErrorCategory = 'Auth' | 'Endpoint' | 'Server' | 'Empty' | 'Network';

export function classifyFetchError(msg: string): FetchErrorCategory {
  if (msg === 'empty model list') return 'Empty';

  // Auth: any 401/403, or keywords like "unauthorized"/"forbidden"/"invalid key".
  // Case-insensitive to match varying server error formats.
  // \b word boundaries prevent partial matches inside other identifiers.
  if (/\b(401|403)\b/.test(msg)
      || /\bunauthor\w*|\bforbidden\b|\binvalid[_\s-]?(api[_\s-]?)?key\b|\binvalid[_\s-]?token\b|\bauth(entication|orization)?[_\s-]?fail/i.test(msg)) {
    return 'Auth';
  }

  // Endpoint: 404/405/410/421, or "not found"/"method not allowed".
  // The "not found" pattern uses a word boundary on both sides to avoid
  // false-positive matches like "ENOTFOUND" (DNS error code).
  if (/\b(404|405|410|421)\b/.test(msg)
      || /\bnot[_\s-]?found\b|\bmethod[_\s-]?not[_\s-]?allowed\b/i.test(msg)) {
    return 'Endpoint';
  }

  // Server: any 5xx status code, or server error keywords.
  if (/\b5\d\d\b/.test(msg)
      || /\bserver[_\s-]?error\b|\bbad[_\s-]?gateway\b|\bservice[_\s-]?unavailable\b|\brate[_\s-]?limit/i.test(msg)) {
    return 'Server';
  }

  return 'Network';
}
