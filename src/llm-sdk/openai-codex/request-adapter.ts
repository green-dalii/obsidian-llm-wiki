import { CODEX_RESPONSES_URL } from './constants';
import type { CodexAccess } from './types';

export interface CodexRequestInput {
  url: string;
  init: RequestInit;
  access: CodexAccess;
  sessionId: string;
  version: string;
}

export interface CodexRequestOutput {
  url: string;
  init: RequestInit;
}

function normalizeResponsesBody(body: BodyInit | null | undefined): string {
  if (typeof body !== 'string') throw new Error('Codex Responses request body must be a JSON string');
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('Invalid Codex Responses request JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid Codex Responses request JSON');
  const normalized: Record<string, unknown> = { ...(parsed as Record<string, unknown>), store: false };
  delete normalized.max_output_tokens;
  delete normalized.temperature;
  delete normalized.top_p;
  return JSON.stringify(normalized);
}

export function normalizeCodexRequest(input: CodexRequestInput): CodexRequestOutput {
  const headers = new Headers(input.init.headers);
  headers.delete('authorization');
  headers.set('Authorization', `Bearer ${input.access.accessToken}`);
  headers.set('ChatGPT-Account-Id', input.access.accountId);
  headers.set('originator', 'karpathywiki');
  headers.set('User-Agent', `karpathywiki/${input.version}`);
  headers.set('session-id', input.sessionId);
  const body = normalizeResponsesBody(input.init.body);
  return { url: CODEX_RESPONSES_URL, init: { ...input.init, headers, body } };
}
