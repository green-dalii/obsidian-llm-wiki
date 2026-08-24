/**
 * #425 Bedrock Stage 2 — SigV4 signing fetch wrapper.
 *
 * Sits between the AI-SDK clients and obsidianFetchBridge: requests to
 * bedrock-mantle hosts are signed with temporary credentials (bearer
 * headers the SDKs set are stripped first), every other host passes
 * through byte-identical. The same wrapper instance is injected as both
 * `fetch` and `streamFetch` so non-streaming and streaming paths sign
 * identically.
 */

import { headersToObject, type ObsidianFetchInit } from '../../core/obsidian-fetch-bridge';
import {
  BEDROCK_INCLUDE_CONTENT_SHA_HEADER,
  BEDROCK_MANTLE_HOST_PATTERN,
  BEDROCK_MANTLE_SIGNING_SERVICE,
} from './constants';
import { signRequest } from './sigv4';
import type { BedrockCredentialsProvider } from './types';

export interface SigV4SigningFetchOptions {
  /** The unwrapped fetch seam (usually obsidianFetchBridge). */
  delegate: (url: string, init?: ObsidianFetchInit) => Promise<Response>;
  getCredentials: BedrockCredentialsProvider;
  /** Injectable clock (tests). Defaults to wall clock. */
  now?: () => Date;
}

/** Headers that must never survive into a signed request. */
const STRIP_BEFORE_SIGNING = new Set([
  'authorization',
  'x-api-key',
  'x-amz-date',
  'x-amz-content-sha256',
]);

/**
 * Build the signing fetch function. Credential resolution happens at
 * REQUEST time (lazy) — constructing the wrapper is synchronous, which
 * is what lets both the sync and async client factories share it.
 */
export function createSigV4SigningFetch(
  options: SigV4SigningFetchOptions,
): (url: string, init?: ObsidianFetchInit) => Promise<Response> {
  const now = options.now ?? (() => new Date());
  return async (url: string, init?: ObsidianFetchInit): Promise<Response> => {
    const host = new URL(url).hostname;
    const regionMatch = BEDROCK_MANTLE_HOST_PATTERN.exec(host);
    if (!regionMatch) {
      return options.delegate(url, init);
    }

    // Normalize → strip SDK auth leftovers → sign → attach AWS headers.
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headersToObject(init?.headers))) {
      normalized[key.toLowerCase()] = value;
    }
    for (const name of STRIP_BEFORE_SIGNING) {
      delete normalized[name];
    }
    // Host is a forbidden header in fetch APIs — it participates in the
    // canonical request but is supplied by the HTTP layer, not by us.

    const credentials = await options.getCredentials();
    const { authorization, amzDate, headersToAdd } = await signRequest({
      method: init?.method ?? 'GET',
      url,
      headers: normalized,
      body: init?.body,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region: regionMatch[1],
      service: BEDROCK_MANTLE_SIGNING_SERVICE,
      // E2E toggle: if the endpoint demands x-amz-content-sha256, flip
      // the constant — the header AND its SignedHeaders entry move
      // atomically (see constants.ts).
      includeContentShaHeader: BEDROCK_INCLUDE_CONTENT_SHA_HEADER,
      now: now(),
    });

    console.debug('[SIGV4]', host, `region=${regionMatch[1]}`, `service=${BEDROCK_MANTLE_SIGNING_SERVICE}`, `date=${amzDate}`);

    const finalHeaders: Record<string, string> = {
      ...normalized,
      ...headersToAdd,
      authorization,
    };
    return options.delegate(url, { ...init, headers: finalHeaders });
  };
}
