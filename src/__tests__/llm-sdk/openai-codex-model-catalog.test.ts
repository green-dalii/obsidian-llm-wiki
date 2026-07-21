import { describe, expect, it, vi } from 'vitest';
import { fetchCodexModelCatalog } from '../../llm-sdk/openai-codex/model-catalog';

function catalogResponse(models: unknown[], status = 200): Response {
  return new Response(JSON.stringify({ models }), { status, headers: { 'Content-Type': 'application/json' } });
}

function model(slug: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { slug, display_name: slug.toUpperCase(), visibility: 'list', supported_in_api: true, priority: 1, supported_reasoning_levels: [{ effort: 'low' }, { effort: 'high' }], additional_speed_tiers: ['fast'], service_tiers: [{ id: 'fast', name: 'Fast', description: 'Priority processing' }], default_service_tier: 'default', ...overrides };
}

function auth() {
  return { getAccess: vi.fn(async () => ({ accessToken: 'access-token', accountId: 'account-id' })), refreshAfterUnauthorized: vi.fn(async () => ({ accessToken: 'new-access-token', accountId: 'account-id' })) };
}

describe('fetchCodexModelCatalog', () => {
  it('requests and sanitizes the picker-visible account catalog in server order', async () => {
    const manager = auth();
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => catalogResponse([model('gpt-new'), model('hidden', { visibility: 'hide' }), model('unsupported', { supported_in_api: false }), model('gpt-fast', { priority: 2 })]));
    const result = await fetchCodexModelCatalog({ auth: manager, fetchFn, version: '1.25.0' });
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://chatgpt.com/backend-api/codex/models?client_version=1.25.0');
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get('ChatGPT-Account-Id')).toBe('account-id');
    expect(headers.get('originator')).toBe('karpathywiki');
    expect(headers.get('User-Agent')).toBe('karpathywiki/1.25.0');
    expect(result).toEqual([
      { slug: 'gpt-new', displayName: 'GPT-NEW', supportedReasoningLevels: ['low', 'high'], additionalSpeedTiers: ['fast'], serviceTiers: [{ id: 'fast', name: 'Fast', description: 'Priority processing' }], defaultServiceTier: 'default' },
      { slug: 'gpt-fast', displayName: 'GPT-FAST', supportedReasoningLevels: ['low', 'high'], additionalSpeedTiers: ['fast'], serviceTiers: [{ id: 'fast', name: 'Fast', description: 'Priority processing' }], defaultServiceTier: 'default' },
    ]);
    expect(JSON.stringify(result)).not.toContain('access-token');
    expect(JSON.stringify(result)).not.toContain('account-id');
  });
  it('refreshes once and replays an unauthorized catalog request', async () => {
    const manager = auth();
    const seenHeaders: Headers[] = [];
    let attempt = 0;
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => { seenHeaders.push(new Headers(init?.headers)); attempt += 1; return attempt === 1 ? catalogResponse([], 401) : catalogResponse([model('gpt-new')]); });
    await expect(fetchCodexModelCatalog({ auth: manager, fetchFn, version: '1.25.0' })).resolves.toHaveLength(1);
    expect(manager.refreshAfterUnauthorized).toHaveBeenCalledWith('access-token', 401);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(seenHeaders[1]?.get('Authorization')).toBe('Bearer new-access-token');
  });
  it('refreshes a structured authentication 403 but not an entitlement 403', async () => {
    const manager = auth();
    const authFailure = new Response(JSON.stringify({ error: { code: 'token_expired' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    const fetchFn = vi.fn().mockResolvedValueOnce(authFailure).mockResolvedValueOnce(catalogResponse([model('gpt-new')]));
    await expect(fetchCodexModelCatalog({ auth: manager, fetchFn, version: '1.25.0' })).resolves.toHaveLength(1);
    expect(manager.refreshAfterUnauthorized).toHaveBeenCalledWith('access-token', 403);
    const entitlement = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'model_not_allowed' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(fetchCodexModelCatalog({ auth: auth(), fetchFn: entitlement, version: '1.25.0' })).rejects.toThrow('status 403');
  });
  it.each([
    catalogResponse([]),
    new Response(JSON.stringify({ models: 'invalid' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response('not-json', { status: 200 }),
  ])('rejects an empty or malformed catalog without accepting partial data', async (response) => {
    await expect(fetchCodexModelCatalog({ auth: auth(), fetchFn: vi.fn(async () => response), version: '1.25.0' })).rejects.toThrow('catalog');
  });
});
