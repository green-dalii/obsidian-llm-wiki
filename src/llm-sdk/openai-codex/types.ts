export interface CodexTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token?: string;
}

export interface CodexCredential {
  accessToken: string;
  refreshToken: string;
  accountId: string;
  expiresAt: number;
  idToken?: string;
}

export interface CodexAccess {
  accessToken: string;
  accountId: string;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface SecretStorageLike {
  getSecret(id: string): string | null;
  setSecret(id: string, secret: string): void;
}

export interface CodexCredentialStoreLike {
  load(): CodexCredential | null;
  save(credential: CodexCredential): void;
  clear(): void;
  hasCredential(): boolean;
}
