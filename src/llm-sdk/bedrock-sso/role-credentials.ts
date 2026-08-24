/**
 * #425 Bedrock Stage 2 — Identity Center portal API.
 *
 * GetRoleCredentials / ListAccounts / ListAccountRoles against
 * `portal.sso.{region}.amazonaws.com`. Authentication is the plain
 * `x-amz-sso_bearer_token` header (the scheme botocore uses) — no
 * SigV4 on this surface. Expiration in the response is epoch MILLISECONDS.
 */

import { bedrockPortalBaseUrl } from './constants';
import { BedrockSsoExpiredError, type BedrockCredentials } from './types';

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

function portalHeaders(ssoToken: string): Record<string, string> {
  return { 'x-amz-sso_bearer_token': ssoToken };
}

async function parsePortalResponse<T>(response: Response, operation: string): Promise<T> {
  // A rejected SSO token must always surface as a re-login error,
  // never as a generic HTTP failure.
  if (response.status === 401 || response.status === 403) {
    throw new BedrockSsoExpiredError();
  }
  if (!response.ok) {
    throw new Error(`${operation} failed: ${response.status}`);
  }
  let input: unknown;
  try {
    input = await response.json();
  } catch {
    throw new Error(`Invalid ${operation} response`);
  }
  if (typeof input !== 'object' || input === null) {
    throw new Error(`Invalid ${operation} response`);
  }
  return input as T;
}

/**
 * Exchange the SSO token for temporary IAM credentials (~1 h lifetime).
 */
export async function getRoleCredentials(
  fetchFn: FetchFn,
  region: string,
  ssoToken: string,
  accountId: string,
  roleName: string,
  signal?: AbortSignal,
): Promise<BedrockCredentials> {
  const url = `${bedrockPortalBaseUrl(region)}/federation/credentials?account_id=${encodeURIComponent(accountId)}&role_name=${encodeURIComponent(roleName)}`;
  const response = await fetchFn(url, { headers: portalHeaders(ssoToken), signal });
  const value = await parsePortalResponse<Record<string, unknown>>(response, 'GetRoleCredentials');
  const roleCredentials = value.roleCredentials;
  if (typeof roleCredentials !== 'object' || roleCredentials === null) {
    throw new Error('Invalid GetRoleCredentials response');
  }
  const rc = roleCredentials as Record<string, unknown>;
  if (typeof rc.accessKeyId !== 'string' || typeof rc.secretAccessKey !== 'string') {
    throw new Error('Invalid GetRoleCredentials response');
  }
  const creds: BedrockCredentials = { accessKeyId: rc.accessKeyId, secretAccessKey: rc.secretAccessKey };
  if (typeof rc.sessionToken === 'string') creds.sessionToken = rc.sessionToken;
  return creds;
}

export interface SsoAccount {
  accountId: string;
  accountName: string;
}

/** Single page (max_result=100) — enough for post-login prefill. */
export async function listAccounts(
  fetchFn: FetchFn,
  region: string,
  ssoToken: string,
  signal?: AbortSignal,
): Promise<SsoAccount[]> {
  const url = `${bedrockPortalBaseUrl(region)}/assignment/accounts?max_result=100`;
  const response = await fetchFn(url, { headers: portalHeaders(ssoToken), signal });
  const value = await parsePortalResponse<{ accountList?: unknown }>(response, 'ListAccounts');
  return Array.isArray(value.accountList)
    ? value.accountList.map(entry => ({
        accountId: String((entry as Record<string, unknown>).accountId),
        accountName: String((entry as Record<string, unknown>).accountName ?? ''),
      }))
    : [];
}

/** Single page of role names for one account. */
export async function listAccountRoles(
  fetchFn: FetchFn,
  region: string,
  ssoToken: string,
  accountId: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const url = `${bedrockPortalBaseUrl(region)}/assignment/roles?account_id=${encodeURIComponent(accountId)}&max_result=100`;
  const response = await fetchFn(url, { headers: portalHeaders(ssoToken), signal });
  const value = await parsePortalResponse<{ roleList?: unknown }>(response, 'ListAccountRoles');
  return Array.isArray(value.roleList)
    ? value.roleList.map(entry => String((entry as Record<string, unknown>).roleName))
    : [];
}
