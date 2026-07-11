/**
 * Local OpenAI-compatible providers that accept an empty/missing API key.
 * Kept in one place so Test Connection, client init, and ingest gates
 * cannot drift (regression class: #223 / LM Studio ingest still blocked).
 */
export const LOCAL_NO_KEY_PROVIDERS = ['ollama', 'lmstudio'] as const;

export type LocalNoKeyProvider = (typeof LOCAL_NO_KEY_PROVIDERS)[number];

export function isLocalNoKeyProvider(provider: string): boolean {
  return (LOCAL_NO_KEY_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * True when the provider may initialize / run without a configured API key.
 * Cloud providers still require a non-empty trimmed key.
 */
export function allowsEmptyApiKey(provider: string, apiKey: string | undefined | null): boolean {
  if (isLocalNoKeyProvider(provider)) return true;
  return Boolean(apiKey?.trim());
}
