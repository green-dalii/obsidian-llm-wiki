// Regression guard for the instrument's `requestUrl` shim (#417 / PR #418),
// ported from the deleted `src/__tests__/tools/llm-wiki-cli/obsidian-shim.test.ts`
// during the v1.27.0 MINOR migration (PR #511 review, DocTpoint finding 2 —
// the deleted tests were not all parser-contract tests).
//
// The shim stands in for Obsidian's `requestUrl`, which goes through Electron's
// `net` and imposes no ceiling on how long a server may take before it sends
// its first header. Built on Node's global `fetch` it inherited undici's
// default `headersTimeout` of 300 s instead, and a non-streamed completion
// sends no headers until the whole answer is ready — so every local-model call
// over five minutes died with a bare `fetch failed`.
//
// A unit test cannot sit out the real ceiling, and undici's default is not
// reachable to be shortened from a plain Node install. So the guard is placed
// on the property that caused it: the shim must serve its request without
// touching global `fetch` at all. A refactor that reads `fetch` off the global
// fails the first test here regardless of any timeout, which is what makes it
// cheap.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import { requestUrl } from '../../../../tools/dev-instrument/src/shim';

let server: Server | undefined;

/** Start a throwaway loopback server on a free port; returns its base URL. */
async function serve(
  handler: (respond: (status: number, body: string) => void) => void,
): Promise<string> {
  server = createServer((_req, res) => {
    handler((status, body) => {
      res.writeHead(status);
      res.end(body);
    });
  });
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no port');
  return `http://127.0.0.1:${addr.port}`;
}

describe('dev-instrument requestUrl shim — no global fetch, no header ceiling', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    if (server !== undefined) {
      await new Promise<void>(resolve => server!.close(() => resolve()));
      server = undefined;
    }
  });

  it('serves a request without calling global fetch', async () => {
    const base = await serve(respond => respond(200, JSON.stringify({ ok: true })));
    // Any call to global fetch from the shim now throws. The stub covers
    // `fetch(url)` and `globalThis.fetch(url)` (both read off globalThis);
    // refactors that bypass it are unlikely but would land here as an
    // uncaught success rather than a thrown error.
    const fetchMock = vi.fn(() => {
      throw new Error('global fetch must not be used by the requestUrl shim');
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await requestUrl({ url: `${base}/v1/models` });

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for a server that withholds its headers before answering', async () => {
    // 100 ms stands in for the five minutes a 12B model takes on one call:
    // same shape — nothing at all on the socket, then the whole response.
    // The property under test is that no ceiling is imposed synchronously, so
    // any delay comfortably above the loopback handshake pins it.
    const base = await serve(respond => {
      setTimeout(() => respond(200, JSON.stringify({ slow: true })), 100);
    });

    const res = await requestUrl({ url: `${base}/v1/chat/completions`, method: 'POST', body: '{}' });

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ slow: true });
  });
});
