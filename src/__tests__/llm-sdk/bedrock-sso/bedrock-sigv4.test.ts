// SigV4 signer tests against OFFICIAL AWS test vectors (#425).
//
// Vectors are transcribed byte-exact from the AWS SigV4 conformance
// suite as vendored in boto/botocore `tests/unit/auth/aws4_testsuite/`
// (branch develop, fetched 2026-08-25). Credentials used by that suite:
//   access key: AKIDEXAMPLE
//   secret key: wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY
// Never fabricate expected signatures — every expected value below is
// copied from the corresponding `.authz` file of the suite.
//
// The session-token path has no vector in the public suite; its wire
// shape (header presence + membership in SignedHeaders) is asserted in
// bedrock-signing-fetch.test.ts, while the signing MATH it reuses is
// what these vectors prove.

import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { signRequest, hashSha256Hex } from '../../../llm-sdk/bedrock-sso/sigv4';

// The shared setup installs a minimal deterministic crypto.subtle stub
// (digest-only, NOT SHA-256). SigV4 conformance needs REAL primitives:
// swap in Node's Web Crypto for this file only — production code stays
// pure Web Crypto and runs on Obsidian's native subtle.
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  writable: true,
  value: webcrypto,
});

const AK = 'AKIDEXAMPLE';
const SK = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
// 20150830T123600Z
const VECTOR_NOW = new Date(Date.UTC(2015, 7, 30, 12, 36, 0));

describe('SigV4 signer — AWS conformance vectors', () => {
  it('get-vanilla reproduces the official Authorization header', async () => {
    const result = await signRequest({
      method: 'GET',
      url: 'https://example.amazonaws.com/',
      headers: { host: 'example.amazonaws.com' },
      accessKeyId: AK,
      secretAccessKey: SK,
      region: 'us-east-1',
      service: 'service',
      now: VECTOR_NOW,
    });
    expect(result.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, ' +
      'SignedHeaders=host;x-amz-date, ' +
      'Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
    expect(result.amzDate).toBe('20150830T123600Z');
    expect(result.headersToAdd['x-amz-date']).toBe('20150830T123600Z');
  });

  it('post-vanilla reproduces the official Authorization header (POST method)', async () => {
    const result = await signRequest({
      method: 'POST',
      url: 'https://example.amazonaws.com/',
      headers: { host: 'example.amazonaws.com' },
      accessKeyId: AK,
      secretAccessKey: SK,
      region: 'us-east-1',
      service: 'service',
      now: VECTOR_NOW,
    });
    expect(result.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, ' +
      'SignedHeaders=host;x-amz-date, ' +
      'Signature=5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b',
    );
  });

  it('post-x-www-form-urlencoded signs the real body and content-type', async () => {
    const result = await signRequest({
      method: 'POST',
      url: 'https://example.amazonaws.com/',
      headers: {
        host: 'example.amazonaws.com',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'Param1=value1',
      accessKeyId: AK,
      secretAccessKey: SK,
      region: 'us-east-1',
      service: 'service',
      now: VECTOR_NOW,
    });
    // Suite's .creq pins the payload hash of "Param1=value1".
    expect(result.payloadHash).toBe(
      '9095672bbd1f56dfc5b65f3e153adc8731a4a654192329106275f4c7b24d0b6e',
    );
    expect(result.signedHeaders).toBe('content-type;host;x-amz-date');
    expect(result.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, ' +
      'SignedHeaders=content-type;host;x-amz-date, ' +
      'Signature=ff11897932ad3f4e8b18135d722051e5ac45fc38421b1da7b9d196a0fe09473a',
    );
  });
});

describe('SigV4 primitives', () => {
  it('hashSha256Hex matches the FIPS-known digest of "abc"', async () => {
    const data = new TextEncoder().encode('abc');
    expect(await hashSha256Hex(data)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashSha256Hex of the empty string equals the SigV4 empty-payload sentinel', async () => {
    expect(await hashSha256Hex(new Uint8Array(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});
