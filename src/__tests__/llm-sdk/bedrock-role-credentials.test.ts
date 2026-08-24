// Identity Center portal API tests (#425).
//
// GetRoleCredentials / ListAccounts / ListAccountRoles authenticate with
// the `x-amz-sso_bearer_token` header (the botocore scheme) — NOT SigV4.
// Response shapes follow the AWS `sso` REST-JSON service model.

import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  getRoleCredentials,
  listAccountRoles,
  listAccounts,
} from '../../llm-sdk/bedrock-sso/role-credentials';
import { BedrockSsoExpiredError } from '../../llm-sdk/bedrock-sso/types';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  writable: true,
  value: webcrypto,
});

const REGION = 'us-east-1';
const PORTAL = `https://portal.sso.${REGION}.amazonaws.com`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('getRoleCredentials', () => {
  it('GETs federation/credentials with the SSO bearer header and parses ms expiry', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      roleCredentials: {
        accessKeyId: 'ASIA-test',
        secretAccessKey: 'sk-test',
        sessionToken: 'st-test',
        expiration: 1756100000000,
      },
    }));
    const creds = await getRoleCredentials(fetchFn, REGION, 'sso-token', '123456789012', 'PowerUserAccess');
    expect(creds).toEqual({ accessKeyId: 'ASIA-test', secretAccessKey: 'sk-test', sessionToken: 'st-test' });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${PORTAL}/federation/credentials?account_id=123456789012&role_name=PowerUserAccess`);
    expect(init.headers).toMatchObject({ 'x-amz-sso_bearer_token': 'sso-token' });
  });

  it('maps a rejected token to BedrockSsoExpiredError', async () => {
    const unauthorized = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    await expect(getRoleCredentials(unauthorized, REGION, 'dead-token', 'acct', 'role'))
      .rejects.toBeInstanceOf(BedrockSsoExpiredError);
  });

  it('rejects a malformed credentials payload', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ unexpected: true }));
    await expect(getRoleCredentials(fetchFn, REGION, 'tok', 'acct', 'role'))
      .rejects.toThrow('Invalid GetRoleCredentials response');
  });

  it('surfaces non-auth errors with their status', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ message: 'no such role' }, 400));
    await expect(getRoleCredentials(fetchFn, REGION, 'tok', 'acct', 'nope'))
      .rejects.toThrow('GetRoleCredentials failed: 400');
  });
});

describe('listAccounts / listAccountRoles (post-login prefill)', () => {
  it('parses the account list page', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      accountList: [{ accountId: '123456789012', accountName: 'prod' }],
    }));
    await expect(listAccounts(fetchFn, REGION, 'tok')).resolves.toEqual([
      { accountId: '123456789012', accountName: 'prod' },
    ]);
    const [url] = fetchFn.mock.calls[0];
    expect(String(url)).toContain(`${PORTAL}/assignment/accounts`);
  });

  it('parses the role list for one account', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      roleList: [{ roleName: 'AdministratorAccess', accountId: '123456789012' }],
    }));
    await expect(listAccountRoles(fetchFn, REGION, 'tok', '123456789012')).resolves.toEqual([
      'AdministratorAccess',
    ]);
  });

  it('propagates an expired token from discovery too', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
    await expect(listAccounts(fetchFn, REGION, 'dead')).rejects.toBeInstanceOf(BedrockSsoExpiredError);
  });
});
