/**
 * Hand-written AWS SigV4 signer (#425 Bedrock Stage 2).
 *
 * Zero-dependency by design: Web Crypto (`crypto.subtle`) + TextEncoder
 * only — no Node builtins, so the same code runs in Obsidian desktop and
 * mobile webviews. Conformance is pinned against the official AWS SigV4
 * test-suite vectors in `src/__tests__/llm-sdk/bedrock-sigv4.test.ts`;
 * never adjust expected signatures without re-checking a vector source.
 *
 * Signed-header policy (deliberately minimal): host;x-amz-date plus
 * content-type when present plus x-amz-security-token when the caller
 * has one. AWS requires only host + x-amz-date (+ security token); the
 * conformance vector post-x-www-form-urlencoded proves content-type
 * participates correctly when we do sign it.
 *
 * Path canonicalization: `url.pathname` is used verbatim (the non-S3
 * rule — no per-segment double-encoding). Correct for today's static
 * bedrock-mantle paths; revisit if a path ever carries a `:`-style
 * escaped segment.
 */

export interface SigV4SigningInput {
  method: string;
  /** Full request URL (host, path and query are parsed from it). */
  url: string;
  /** Caller headers; keys normalized to lowercase internally. */
  headers: Record<string, string>;
  body?: string | Uint8Array;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  service: string;
  /**
   * When true, adds x-amz-content-sha256 to the outgoing headers AND to
   * SignedHeaders atomically. Mandatory only for S3; kept optional so
   * the E2E toggle (BEDROCK_INCLUDE_CONTENT_SHA_HEADER) is one flag.
   */
  includeContentShaHeader?: boolean;
  /** Injectable clock (tests pin vectors to 20150830T123600Z). */
  now?: Date;
}

export interface SigV4Result {
  authorization: string;
  amzDate: string;
  signedHeaders: string;
  payloadHash: string;
  /**
   * Headers the caller must add before sending: always x-amz-date,
   * plus x-amz-security-token when a session token was provided.
   */
  headersToAdd: Record<string, string>;
}

const encoder = new TextEncoder();

function assertCryptoSubtle(): SubtleCrypto {
  // Bare `crypto` resolves to the current realm's Web Crypto — the same
  // access shape the openai-codex module ships (auth-core.ts).
  const subtle = crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto subtle is unavailable in this environment');
  }
  return subtle;
}

export async function hashSha256Hex(data: Uint8Array): Promise<string> {
  // subtle.digest resolves to an ArrayBuffer — wrap before hex-encoding.
  const digest = await assertCryptoSubtle().digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, data: string | Uint8Array): Promise<Uint8Array> {
  const subtle = assertCryptoSubtle();
  const cryptoKey = await subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  return new Uint8Array(await subtle.sign('HMAC', cryptoKey, bytes as BufferSource));
}

/** RFC 3986 strict encoding: unreserved = A-Za-z0-9 - _ . ~ */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** AWS amzDate format: YYYYMMDD'T'HHMMSS'Z' (UTC). */
export function formatAmzDate(now: Date): string {
  return (
    `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}` +
    `T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`
  );
}

async function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<Uint8Array> {
  const kSecret = encoder.encode(`AWS4${secretAccessKey}`);
  const kDate = await hmacSha256(kSecret, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

/**
 * Compute the SigV4 signature pieces for one request. Pure aside from
 * Web Crypto calls — the fetch-wrapper layer owns header surgery.
 */
export async function signRequest(input: SigV4SigningInput): Promise<SigV4Result> {
  const now = input.now ?? new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);

  const url = new URL(input.url);
  // Canonical host: caller header wins, URL hostname is the fallback.
  // Fetch APIs forbid setting a Host header, so wrapper callers never
  // pass one — without this fallback the canonical request would carry
  // an empty `host:` line and every real-world signature would mismatch.
  const host = (input.headers['host'] ?? url.hostname).toLowerCase();
  const canonicalUri = url.pathname === '' ? '/' : url.pathname;

  // Canonical query: sort by key, then value; RFC3986-encode both.
  const pairs: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => {
    pairs.push([uriEncode(key), uriEncode(value)]);
  });
  pairs.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  const canonicalQuery = pairs.map(([k, v]) => `${k}=${v}`).join('&');

  // Headers to sign: lowercase-normalized caller headers that belong to
  // the minimal signed set, plus the ones we add ourselves.
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.headers)) {
    normalized[key.toLowerCase()] = value.trim();
  }
  normalized['host'] = host;

  const headersToAdd: Record<string, string> = { 'x-amz-date': amzDate };
  if (input.sessionToken) {
    headersToAdd['x-amz-security-token'] = input.sessionToken;
  }

  // Payload hash first: the optional x-amz-content-sha256 toggle needs
  // it before the signed set is frozen into strings below.
  const payloadBytes =
    input.body === undefined
      ? new Uint8Array(0)
      : typeof input.body === 'string'
        ? encoder.encode(input.body)
        : input.body;
  const payloadHash = await hashSha256Hex(payloadBytes);

  if (input.includeContentShaHeader === true) {
    headersToAdd['x-amz-content-sha256'] = payloadHash;
  }
  Object.assign(normalized, headersToAdd);

  const signedSet = new Set<string>(['host', 'x-amz-date']);
  if (normalized['content-type'] !== undefined) signedSet.add('content-type');
  if (input.includeContentShaHeader === true) signedSet.add('x-amz-content-sha256');
  // AWS requires signing x-amz-security-token whenever it is sent.
  if (input.sessionToken) signedSet.add('x-amz-security-token');
  const signedHeaders = Array.from(signedSet).sort().join(';');

  const canonicalHeaders = Array.from(signedSet)
    .sort()
    .map(name => `${name}:${normalized[name] ?? ''}\n`)
    .join('');

  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    await hashSha256Hex(encoder.encode(canonicalRequest)),
  ].join('\n');

  const signingKey = await deriveSigningKey(input.secretAccessKey, dateStamp, input.region, input.service);
  const signature = Array.from(await hmacSha256(signingKey, stringToSign), b =>
    b.toString(16).padStart(2, '0'),
  ).join('');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, amzDate, signedHeaders, payloadHash, headersToAdd };
}
