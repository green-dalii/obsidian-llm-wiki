/**
 * #425 Bedrock Stage 2 — shared contracts for the SSO/SigV4 path.
 * Mirrors the openai-codex module shape so stores and managers stay
 * structurally interchangeable where it makes sense.
 */

/** Temporary IAM credentials (from GetRoleCredentials or manual entry). */
export interface BedrockCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

/** Async credential source injected into the SigV4 signing wrapper. */
export type BedrockCredentialsProvider = () => Promise<BedrockCredentials>;

/** Persisted SSO token blob (`karpathywiki-bedrock-sso`). */
export interface BedrockSsoToken {
  accessToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  region: string;
  startUrl: string;
}

/** Manually entered static IAM keys (`karpathywiki-bedrock-iam`). */
export interface BedrockIamKeys {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

/**
 * Thrown when the SSO token has lapsed (8 h window over) or was
 * rejected by the portal. Callers surface a "run AWS SSO sign-in
 * again" message — never a silent retry storm.
 */
export class BedrockSsoExpiredError extends Error {
  constructor(message = 'AWS SSO session has expired — run AWS SSO sign-in again') {
    super(message);
    this.name = 'BedrockSsoExpiredError';
  }
}
