/**
 * #425 Bedrock Stage 2 — constants for the SSO/SigV4 path.
 *
 * Every value that needs empirical confirmation against a real AWS
 * account is an isolated named constant: a wrong guess discovered at
 * E2E is a one-line fix, not a refactor.
 */

/** SecretStorage ids (structured JSON blobs, never in data.json). */
export const BEDROCK_SSO_SECRET_ID = 'karpathywiki-bedrock-sso';
export const BEDROCK_IAM_SECRET_ID = 'karpathywiki-bedrock-iam';

/**
 * IAM Identity Center OIDC endpoints (device flow). These calls are
 * UNSIGNED HTTPS POSTs — plain OAuth endpoints, no SigV4 involved.
 */
export function bedrockOidcBaseUrl(region: string): string {
  return `https://oidc.${region}.amazonaws.com`;
}

/**
 * Identity Center portal host for GetRoleCredentials / ListAccounts.
 * Modern AWS SDKs use `portal.sso.`; the legacy `sso.` host still
 * resolves. If E2E proves otherwise, change this one function.
 * GetRoleCredentials authenticates with the `x-amz-sso_bearer_token`
 * header (same scheme as botocore), not with SigV4.
 */
export function bedrockPortalBaseUrl(region: string): string {
  return `https://portal.sso.${region}.amazonaws.com`;
}

/**
 * Matches bedrock-mantle data-plane hosts and captures the region:
 * `bedrock-mantle.eu-central-1.api.aws` → `eu-central-1`. The signing
 * region is derived from the HOST so probe/override URLs sign with the
 * region they actually address.
 */
export const BEDROCK_MANTLE_HOST_PATTERN = /^bedrock-mantle\.([a-z0-9-]+)\.api\.aws$/;

/**
 * SigV4 service sign-name for the bedrock-mantle api.aws endpoints.
 * TO VERIFY at first real-account E2E: if the endpoint answers
 * SignatureDoesNotMatch, this is the first knob to turn.
 */
export const BEDROCK_MANTLE_SIGNING_SERVICE = 'bedrock';

/**
 * x-amz-content-sha256 is mandatory only for S3; omitted by default to
 * keep the signed set minimal. If the endpoint demands it, flip this —
 * signRequest adds the header AND includes it in SignedHeaders atomically.
 */
export const BEDROCK_INCLUDE_CONTENT_SHA_HEADER = false;

/** Device-flow overall deadline (AWS allows up to 15 min; we cap lower). */
export const BEDROCK_DEVICE_FLOW_TIMEOUT_MS = 10 * 60_000;

/** Refresh temp credentials this long before their stated expiry. */
export const BEDROCK_TEMP_CRED_SKEW_MS = 120_000;
