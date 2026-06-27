// Integration tests for ensure-welcome-note.ts
//
// The orchestrator that decides whether to create the Welcome note
// and writes it to the vault. Combines:
//   - tier-detection (decide tier + onboarding action)
//   - smoke-test (LLM smoke check)
//   - welcome-note-template (render English markdown body)
//   - localize-welcome-note (D8: LLM-translate to user language)
//
// Dependency-inverted: instead of touching the Obsidian vault
// directly, the function takes a VaultAdapter interface that the
// caller (main.ts onload) implements with the real app.vault. Tests
// fake the adapter to assert behavior across the 3 tiers.

import { describe, it, expect, vi } from 'vitest';
import { ensureWelcomeNote } from '../../core/ensure-welcome-note';
import type { VaultAdapter } from '../../core/ensure-welcome-note';
import type { VaultCandidate } from '../../core/welcome-note-template';

// Test vault adapter — records what was written.
function makeFakeVault(initialFiles: Record<string, string> = {}): VaultAdapter & { written: Map<string, string> } {
  const files = new Map<string, string>(Object.entries(initialFiles));
  const adapter: VaultAdapter & { written: Map<string, string> } = {
    written: files,
    async exists(path: string): Promise<boolean> {
      return files.has(path);
    },
    async listMarkdown(): Promise<VaultCandidate[]> {
      return [];
    },
    async create(path: string, content: string): Promise<void> {
      files.set(path, content);
    },
  };
  return adapter;
}

// Helper: returns a fake LLM client that always "translates" by
// prepending a marker. Tests can inspect the marker to confirm
// the translation was actually invoked.
function makeTranslatingClient(marker = '[ZH]') {
  return {
    createMessage: vi.fn().mockImplementation(async (params: { messages: Array<{role: string; content: string}> }) => {
      const userMsg = params.messages.find(m => m.role === 'user')?.content ?? '';
      return JSON.stringify({ translated: marker + userMsg });
    }),
  };
}

describe('ensureWelcomeNote — Tier A (empty vault)', () => {
  it('does NOT create welcome note when LLM is not configured', async () => {
    // Brand-new vault + no LLM → no useful Welcome content (the
    // "Initial Source Suggestions" section would be empty anyway).
    // Show Notice only, point user at "create your first source note".
    const vault = makeFakeVault();
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: false, error: 'no API key' }),
    });
    expect(vault.written.has('wiki/Welcome.md')).toBe(false);
  });

  it('CREATES welcome note when LLM is configured (Tier A with-LLM path, v1.23.0 follow-up)', async () => {
    // New behavior: even in Tier A, if LLM is configured we create a
    // Welcome note so the LLM-only-onboarding user has a guided entry
    // point instead of just a "go create a source note" Notice.
    // tier-detection learns "LLM is available" from the llmClient arg
    // (which is the v1.23.0 simplification: no extra smoke test probe
    // call for the tier decision).
    const vault = makeFakeVault();
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      llmClient: { createMessage: vi.fn().mockResolvedValue(JSON.stringify({ translated: 'TRANSLATED' })) },
      model: 'gpt-4o-mini',
    });
    expect(vault.written.has('wiki/Welcome.md')).toBe(true);
  });
});

describe('ensureWelcomeNote — Tier B (existing vault, no wiki)', () => {
  it('creates welcome note at <wikiFolder>/Welcome.md with seed suggestions', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
      { path: 'notes/b.md', title: 'B', size: 3000 },
    ];
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: candidates,
    });
    expect(vault.written.has('wiki/Welcome.md')).toBe(true);
    const content = vault.written.get('wiki/Welcome.md')!;
    expect(content).toMatch(/type:\s*welcome/);
    expect(content).toMatch(/notes\/a\.md/);  // seed candidate 1
    expect(content).toMatch(/notes\/b\.md/);  // seed candidate 2
    expect(content).toMatch(/OpenAI/);
  });

  it('skips creation if Welcome note already exists (idempotent)', async () => {
    const vault = makeFakeVault({ 'wiki/Welcome.md': 'existing content' });
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: candidates,
    });
    // File should NOT be overwritten — content unchanged.
    expect(vault.written.get('wiki/Welcome.md')).toBe('existing content');
  });

  it('honors createWelcomeNote=false setting (skips creation)', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: false },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: candidates,
    });
    expect(vault.written.has('wiki/Welcome.md')).toBe(false);
  });

  it('surfaces LLM smoke test failure in the note body', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: false, error: 'API key not configured' }),
      vaultCandidates: candidates,
    });
    const content = vault.written.get('wiki/Welcome.md')!;
    expect(content).toMatch(/Failed/);
    expect(content).toMatch(/API key not configured/);
  });
});

describe('ensureWelcomeNote — D8 LLM dynamic translation', () => {
  it('translates the body to targetLanguage when LLM client is provided', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    const llmClient = makeTranslatingClient('[TRANSLATED]');
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'zh',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: candidates,
      llmClient: llmClient,
      model: 'gpt-4o-mini',
    });
    const content = vault.written.get('wiki/Welcome.md')!;
    expect(content).toMatch(/\[TRANSLATED\]/);
    expect(llmClient.createMessage).toHaveBeenCalled();
  });

  it('skips LLM translation when targetLanguage is en (writes English directly)', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    const llmClient = makeTranslatingClient('[SHOULD_NOT_APPEAR]');
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: candidates,
      llmClient: llmClient,
      model: 'gpt-4o-mini',
    });
    expect(llmClient.createMessage).not.toHaveBeenCalled();
    const content = vault.written.get('wiki/Welcome.md')!;
    expect(content).not.toMatch(/SHOULD_NOT_APPEAR/);
  });

  it('falls back to English when LLM client throws during translation', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    const llmClient = {
      createMessage: vi.fn().mockRejectedValue(new Error('rate limit')),
    };
    const result = await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'zh',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: candidates,
      llmClient: llmClient,
      model: 'gpt-4o-mini',
    });
    const content = vault.written.get('wiki/Welcome.md')!;
    expect(content).toMatch(/Welcome to your Wiki/);  // English fallback
    expect(result.localizeResult?.localized).toBe(false);
    expect(result.localizeResult?.error).toMatch(/rate limit/);
  });

  it('skips LLM translation when smoke test failed (no wasted LLM call)', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    const llmClient = makeTranslatingClient();
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'zh',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: false, error: 'API key not configured' }),
      vaultCandidates: candidates,
      llmClient: llmClient,
      model: 'gpt-4o-mini',
    });
    expect(llmClient.createMessage).not.toHaveBeenCalled();
    const content = vault.written.get('wiki/Welcome.md')!;
    expect(content).toMatch(/Welcome to your Wiki/);  // English, not Chinese
  });

  it('writes English without LLM client when none is provided', async () => {
    const vault = makeFakeVault();
    const candidates: VaultCandidate[] = [
      { path: 'notes/a.md', title: 'A', size: 5000 },
    ];
    const result = await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'zh',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: candidates,
      // no llmClient
    });
    expect(result.localizeResult?.localized).toBe(false);
    const content = vault.written.get('wiki/Welcome.md')!;
    expect(content).toMatch(/Welcome to your Wiki/);
  });
});

describe('ensureWelcomeNote — Tier C (existing wiki)', () => {
  it('does NOT create welcome note when wiki already exists', async () => {
    const vault = makeFakeVault({ 'wiki/entities/A.md': '# Existing entity' });
    // vaultCandidates must reflect the actual vault state so probe
    // detects the existing wiki. Pass the wiki page as a candidate so
    // probeVaultState sees wikiPageCount > 0 → Tier C.
    await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
      vaultCandidates: [
        { path: 'wiki/entities/A.md', title: 'A', size: 100 },
      ],
    });
    expect(vault.written.has('wiki/Welcome.md')).toBe(false);
  });
});

describe('ensureWelcomeNote — return value', () => {
  it('returns the tier that was detected', async () => {
    const vault = makeFakeVault();
    const result = await ensureWelcomeNote({
      vault,
      settings: { wikiFolder: 'wiki', createWelcomeNote: true },
      targetLanguage: 'en',
      createdAt: '2026-06-27',
      smokeTestProbe: async () => ({ ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' }),
    });
    expect(result.tier).toBe('A-empty-vault');
  });
});