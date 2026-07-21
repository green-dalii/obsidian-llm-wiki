import { CODEX_MODELS_URL } from './constants';
import type { CodexAccess, FetchLike } from './types';
import type { OpenAICodexModelCatalogEntry } from '../../types';

type CatalogAuth = { getAccess(): Promise<CodexAccess>; refreshAfterUnauthorized(failedBearer: string, status: number): Promise<CodexAccess> };

export type CodexModelCatalogEntry = OpenAICodexModelCatalogEntry;

export interface FetchCodexModelCatalogInput {
  auth: CatalogAuth;
  fetchFn: FetchLike;
  version: string;
}

const AUTH_FORBIDDEN_CODES = new Set(['authentication_error', 'expired_token', 'invalid_authentication', 'invalid_token', 'token_expired', 'unauthorized']);

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function reasoningLevels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => objectValue(item)?.effort).filter((effort): effort is string => typeof effort === 'string');
}

function serviceTiers(value: unknown): OpenAICodexModelCatalogEntry['serviceTiers'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => objectValue(item)).filter((item): item is Record<string, unknown> => item !== null && typeof item.id === 'string').map((item) => ({ id: item.id as string, name: typeof item.name === 'string' ? item.name : item.id as string, description: typeof item.description === 'string' ? item.description : '' }));
}

function parseEntry(value: unknown): CodexModelCatalogEntry | null {
  const item = objectValue(value);
  if (!item || typeof item.slug !== 'string' || item.slug.trim() === '' || item.visibility !== 'list' || item.supported_in_api !== true) return null;
  const entry: CodexModelCatalogEntry = { slug: item.slug, displayName: typeof item.display_name === 'string' && item.display_name.trim() !== '' ? item.display_name : item.slug, supportedReasoningLevels: reasoningLevels(item.supported_reasoning_levels), additionalSpeedTiers: stringArray(item.additional_speed_tiers), serviceTiers: serviceTiers(item.service_tiers) };
  if (typeof item.default_service_tier === 'string') entry.defaultServiceTier = item.default_service_tier;
  return entry;
}

async function isAuthenticationForbidden(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  if (response.headers.has('www-authenticate')) return true;
  try {
    const payload = objectValue(await response.clone().json());
    const nested = objectValue(payload?.error);
    const code = nested?.code ?? nested?.type ?? payload?.code ?? payload?.type;
    return typeof code === 'string' && AUTH_FORBIDDEN_CODES.has(code.toLowerCase());
  } catch {
    return false;
  }
}

function requestUrl(version: string): string {
  return `${CODEX_MODELS_URL}?client_version=${encodeURIComponent(version)}`;
}

function requestHeaders(access: CodexAccess, version: string): Headers {
  return new Headers({ Authorization: `Bearer ${access.accessToken}`, 'ChatGPT-Account-Id': access.accountId, originator: 'karpathywiki', 'User-Agent': `karpathywiki/${version}` });
}

async function parseCatalog(response: Response): Promise<CodexModelCatalogEntry[]> {
  if (!response.ok) throw new Error(`Codex model catalog request failed: status ${response.status}`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Invalid Codex model catalog response');
  }
  const models = objectValue(payload)?.models;
  if (!Array.isArray(models)) throw new Error('Invalid Codex model catalog response');
  const entries = models.map(parseEntry).filter((entry): entry is CodexModelCatalogEntry => entry !== null);
  if (entries.length === 0) throw new Error('Codex model catalog contains no picker-visible models');
  return entries;
}

export async function fetchCodexModelCatalog(input: FetchCodexModelCatalogInput): Promise<CodexModelCatalogEntry[]> {
  const initial = await input.auth.getAccess();
  const execute = (access: CodexAccess): Promise<Response> => input.fetchFn(requestUrl(input.version), { method: 'GET', headers: requestHeaders(access, input.version) });
  const response = await execute(initial);
  const authenticationFailure = response.status === 401 || await isAuthenticationForbidden(response);
  if (!authenticationFailure) return parseCatalog(response);
  const refreshed = await input.auth.refreshAfterUnauthorized(initial.accessToken, response.status);
  return parseCatalog(await execute(refreshed));
}
