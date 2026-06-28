import { TEXTS } from '../texts';

// Type-safe i18n accessor. Falls back to EN_TEXTS when key is missing in target language.
export function getText<K extends keyof typeof TEXTS.en>(
  language: string,
  key: K,
  replacements?: Record<string, string>
): string {
  const texts = TEXTS[language as keyof typeof TEXTS] || TEXTS.en;
  let text = texts[key] as unknown as string;
  if (!text) {
    text = TEXTS.en[key] as unknown as string;
  }
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

/**
 * Resolve the localized Welcome note filename for a given wikiLanguage
 * code. Used by ensure-welcome-note and the Recreate command so the file
 * is named in the user's own language — they recognize "欢迎使用 Karpathy
 * LLM Wiki.md" at a glance, vs an English "Welcome.md" that requires
 * context to identify.
 *
 * Filename sanitization: filesystem-illegal characters are stripped. The
 * base string is a translated human-readable label (not a translation
 * artifact), so this should rarely fire in practice.
 */
export function getWelcomeFileName(language: string): string {
  const raw = getText(language, 'welcomeNoteFileName');
  // Sanitize: remove characters Obsidian / Windows / macOS filesystems
  // reject in filenames. Keep Unicode letters/numbers and whitespace.
  const sanitized = raw.replace(/[\\/:*?"<>|]/g, '').trim();
  // Fall back to a safe default if translation produced an empty string.
  return sanitized.length > 0 ? sanitized : 'Welcome';
}
