import { CODEX_OAUTH_CLIENT_ID, CODEX_OAUTH_ISSUER, CODEX_REDIRECT_URI } from './constants';
import type { CodexTokenResponse } from './types';

export interface PkcePair {
  verifier: string;
  challenge: string;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function requiredString(value: Record<string, unknown>, field: string): string {
  const candidate = value[field];
  if (typeof candidate !== 'string' || candidate.length === 0) throw new Error(`Invalid token response: missing ${field}`);
  return candidate;
}

function validateEntropy(entropy: Uint8Array): void {
  if (entropy.byteLength < 32) throw new Error('OAuth entropy must contain at least 32 bytes');
}

export async function generatePkce(entropy: Uint8Array = randomBytes(32)): Promise<PkcePair> {
  validateEntropy(entropy);
  const verifier = base64Url(entropy);
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

export function generateOAuthState(entropy: Uint8Array = randomBytes(32)): string {
  validateEntropy(entropy);
  return base64Url(entropy);
}

export function buildAuthorizationUrl(state: string, pkce: PkcePair): string {
  const url = new URL('/oauth/authorize', CODEX_OAUTH_ISSUER);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CODEX_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', CODEX_REDIRECT_URI);
  url.searchParams.set('scope', 'openid profile email offline_access');
  url.searchParams.set('code_challenge', pkce.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('originator', 'karpathywiki');
  url.searchParams.set('id_token_add_organizations', 'true');
  url.searchParams.set('codex_cli_simplified_flow', 'true');
  return url.toString();
}

export function parseTokenResponse(input: unknown): CodexTokenResponse {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error('Invalid token response: missing access_token');
  const value = input as Record<string, unknown>;
  const accessToken = requiredString(value, 'access_token');
  const refreshToken = requiredString(value, 'refresh_token');
  const expiresIn = value.expires_in;
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('Invalid token response: missing expires_in');
  const idToken = value.id_token;
  if (idToken !== undefined && (typeof idToken !== 'string' || idToken.length === 0)) throw new Error('Invalid token response: invalid id_token');
  return idToken === undefined ? { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } : { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, id_token: idToken };
}

function tokenClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const payload: unknown = JSON.parse(decodeBase64Url(parts[1]));
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function explicitAccountId(token: string): string | null {
  const claims = tokenClaims(token);
  if (!claims) return null;
  const topLevel = claims.chatgpt_account_id;
  if (typeof topLevel === 'string' && topLevel.length > 0) return topLevel;
  const auth = claims['https://api.openai.com/auth'];
  if (typeof auth !== 'object' || auth === null || Array.isArray(auth)) return null;
  const nested = (auth as Record<string, unknown>).chatgpt_account_id;
  return typeof nested === 'string' && nested.length > 0 ? nested : null;
}

function organizationAccountId(token: string): string | null {
  const claims = tokenClaims(token);
  if (!claims) return null;
  try {
    const organizations = claims.organizations;
    if (!Array.isArray(organizations) || organizations.length === 0) return null;
    const first = (organizations as unknown[])[0];
    if (typeof first !== 'object' || first === null || Array.isArray(first)) return null;
    const organizationId = (first as Record<string, unknown>).id;
    return typeof organizationId === 'string' && organizationId.length > 0 ? organizationId : null;
  } catch {
    return null;
  }
}

export function extractAccountId(token: string): string | null {
  return explicitAccountId(token) ?? organizationAccountId(token);
}

export function extractTokenResponseAccountId(token: CodexTokenResponse): string | null {
  const idExplicit = token.id_token ? explicitAccountId(token.id_token) : null;
  const accessExplicit = explicitAccountId(token.access_token);
  if (idExplicit && accessExplicit && idExplicit !== accessExplicit) throw new Error('Token response contains conflicting account claims');
  return idExplicit ?? accessExplicit ?? (token.id_token ? organizationAccountId(token.id_token) : null) ?? organizationAccountId(token.access_token);
}
