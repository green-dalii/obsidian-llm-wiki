// Pure-function tests for welcome-note-template.ts
//
// buildWelcomeNote is a pure function that produces the full
// English-template markdown body of the Welcome note (frontmatter +
// 5 sections). The caller passes candidates (vault notes to suggest
// as seeds) and LLM smoke-test result.
//
// This is a Tier-B-only artifact: Tier A users don't get a Welcome
// note, Tier C users don't get one either. The function assumes
// "Tier B: create Welcome note" is the desired behavior.
//
// D8: output is always English. Localization is the caller's
// responsibility (see core/localize-welcome-note.ts).

import { describe, it, expect } from 'vitest';
import { buildWelcomeNote, type VaultCandidate } from '../../core/welcome-note-template';

describe('buildWelcomeNote — frontmatter', () => {
  it('always sets type: welcome in frontmatter', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/^---/);
    expect(body).toMatch(/type:\s*welcome/);
  });

  it('includes createdAt in frontmatter', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/created:\s*2026-06-27/);
  });

  it('starts with a single H1 title', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/^---[\s\S]*?---\n\n#\s+Welcome/);
  });
});

describe('buildWelcomeNote — ## Domains section', () => {
  it('includes a ## Domains section with a placeholder list', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/##\s+Domains/);
    expect(body).toMatch(/-\s*\(your domain 1\)/);
    expect(body).toMatch(/-\s*\(your domain 3\)/);
  });
});

describe('buildWelcomeNote — ## Initial Source Suggestions section', () => {
  it('lists up to 10 candidates as markdown checkboxes', () => {
    const candidates: VaultCandidate[] = Array.from({ length: 12 }, (_, i) => ({
      path: `notes/note-${i}.md`,
      title: `Note ${i}`,
      size: 1024 * (i + 1),
    }));
    const body = buildWelcomeNote({
      candidates,
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    // Cap at 10.
    const matches = body.match(/- \[[ ]\] \[\[/g) ?? [];
    expect(matches.length).toBe(10);
  });

  it('uses wikilink syntax [[path]] for candidates', () => {
    const candidates: VaultCandidate[] = [
      { path: 'notes/cardiology.md', title: 'Cardiology', size: 5000 },
    ];
    const body = buildWelcomeNote({
      candidates,
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/- \[[ ]\] \[\[notes\/cardiology\.md\]\]/);
  });

  it('orders candidates by size (largest first — heuristic: bigger notes = more content)', () => {
    const candidates: VaultCandidate[] = [
      { path: 'small.md', title: 'Small', size: 100 },
      { path: 'big.md', title: 'Big', size: 10000 },
      { path: 'medium.md', title: 'Medium', size: 1000 },
    ];
    const body = buildWelcomeNote({
      candidates,
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    const bigIdx = body.indexOf('big.md');
    const mediumIdx = body.indexOf('medium.md');
    const smallIdx = body.indexOf('small.md');
    expect(bigIdx).toBeGreaterThan(-1);
    expect(bigIdx).toBeLessThan(mediumIdx);
    expect(mediumIdx).toBeLessThan(smallIdx);
  });

  it('omits the section entirely when candidates is empty (degenerate Tier B)', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    // Section may still be present (as instruction-only), but it
    // should not list zero items as candidates.
    const candidateSection = body.match(/##[\s\S]*?Initial Source Suggestions[\s\S]*?(?=\n##|\n<!--)/);
    if (candidateSection) {
      expect(candidateSection[0]).not.toMatch(/- \[[ ]\]/);
    }
  });
});

describe('buildWelcomeNote — ## Wiki Scope section', () => {
  it('includes a ## Wiki Scope section with placeholder', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/##\s+Wiki Scope/);
    expect(body).toMatch(/Describe.*wiki/i);
  });
});

describe('buildWelcomeNote — ## Configuration Test section', () => {
  it('shows OK status when LLM config is valid', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/##\s+Configuration Test/);
    expect(body).toMatch(/OK|✅/);
    expect(body).toMatch(/OpenAI/);
    expect(body).toMatch(/gpt-4o-mini/);
  });

  it('shows warning status when LLM config is invalid', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: false, error: 'API key not configured' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/⚠/);
    expect(body).toMatch(/API key not configured/);
  });

  it('marks the section as auto-generated with HTML comment markers', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/<!--\s*auto-generated[\s\S]*?-->/);
    expect(body).toMatch(/end auto-generated/);
  });
});

describe('buildWelcomeNote — structural invariants', () => {
  it('ends with the closing auto-generated marker', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    expect(body).toMatch(/end auto-generated -->/);
  });

  it('contains exactly ONE closing `<!-- end auto-generated -->` marker (regression: 2026-06-28 had 2)', () => {
    // Earlier bug: the ## Configuration Test section emitted its own
    // closing marker AND the document also appended a closing marker,
    // producing 2 consecutive `<!-- end auto-generated -->` lines. The
    // 1-marker invariant is what downstream consumers (log-header parser
    // etc.) rely on.
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    const matches = body.match(/<!--\s*end auto-generated\s*-->/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('contains all 4 expected section headers in order', () => {
    const body = buildWelcomeNote({
      candidates: [],
      llmConfig: { ok: true, provider: 'OpenAI', model: 'gpt-4o-mini' },
      createdAt: '2026-06-27',
    });
    const domainsIdx = body.indexOf('## Domains');
    const initialIdx = body.indexOf('## Initial Source Suggestions');
    const scopeIdx = body.indexOf('## Wiki Scope');
    const configIdx = body.indexOf('## Configuration Test');
    expect(domainsIdx).toBeGreaterThan(-1);
    expect(initialIdx).toBeGreaterThan(domainsIdx);
    expect(scopeIdx).toBeGreaterThan(initialIdx);
    expect(configIdx).toBeGreaterThan(scopeIdx);
  });
});