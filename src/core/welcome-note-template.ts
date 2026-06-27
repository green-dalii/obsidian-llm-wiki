// welcome-note-template.ts — Tier-B first-run Welcome note generator
//
// Pure function. Renders the English-template body of the v1.23.0
// Welcome note (frontmatter + 4 sections + closing auto-generated
// marker). The caller passes vault candidates and LLM smoke-test
// result. No I/O. No i18n — D8 decision: 1 English template, LLM
// translates to user language at write time via localize-welcome-note.ts.
//
// The Welcome note is the Tier-B onboarding artifact (per the
// v1.23.0 three-tier design, refined 2026-06-27). Tier A users
// don't get one; Tier C users don't get one either. This function
// assumes "create Welcome note" is the desired behavior — the caller
// has already decided via tier-detection.ts.
//
// Section structure:
//   1. Frontmatter (type: welcome, created: ISO date)
//   2. H1 title
//   3. ## Domains (user fills — one per line, becomes tag vocab)
//   4. ## Initial Source Suggestions (plugin pre-fills with vault
//      candidates sorted by size descending; user checks 2-3)
//   5. ## Wiki Scope (user fills — LLM ingest context)
//   6. ## Configuration Test (plugin auto-maintains — LLM smoke test)
//   7. Closing <!-- end auto-generated --> marker
//
// Why size-descending order: heuristic for the seed suggestion list.
// Bigger notes likely have more substantive content, so they're
// better candidates for "ingest first to give the link graph
// structure". This is intentionally simple — the user can rearrange.
//
// D8 NOTE: All section headers and descriptions are English hardcoded
// here. Do NOT extract these into per-locale files. The LLM translator
// (localize-welcome-note.ts) will produce the localized version.

export interface VaultCandidate {
  /** Vault-relative path. Becomes the wikilink target in the suggestion. */
  path: string;
  /** Page title or filename without extension. */
  title: string;
  /** File size in bytes. Used for sort order (largest first). */
  size: number;
}

export interface LlmConfigStatus {
  ok: boolean;
  provider?: string;
  model?: string;
  /** Set when ok=false. Human-readable reason (e.g. "API key not configured"). */
  error?: string;
}

export interface BuildWelcomeNoteArgs {
  candidates: VaultCandidate[];
  llmConfig: LlmConfigStatus;
  /** ISO date for the frontmatter `created` field. */
  createdAt: string;
}

const CANDIDATE_LIMIT = 10;

export function buildWelcomeNote(args: BuildWelcomeNoteArgs): string {
  const { candidates, llmConfig, createdAt } = args;

  const frontmatter = renderFrontmatter(createdAt);
  const title = 'Welcome to your Wiki';
  const intro = 'This note is the **founding declaration** for your wiki. ' +
    'Edit it freely to define your domain scope and seed the link graph. ' +
    'After saving, run Ingest on 2-3 source notes to bootstrap the wiki.';
  const domainsSection = renderDomainsSection();
  const candidatesSection = renderCandidatesSection(candidates);
  const scopeSection = renderScopeSection();
  const configSection = renderConfigSection(llmConfig);
  const closing = '<!-- end auto-generated -->';

  const parts = [
    frontmatter,
    `# ${title}`,
    intro,
    domainsSection,
    candidatesSection,
    scopeSection,
    configSection,
    closing,
  ];

  return parts.filter(p => p.length > 0).join('\n\n') + '\n';
}

function renderFrontmatter(createdAt: string): string {
  return [
    '---',
    'title: Wiki Founding Note',
    'type: welcome',
    `created: ${createdAt}`,
    '---',
  ].join('\n');
}

function renderDomainsSection(): string {
  return [
    '## Domains',
    '',
    'List the domains this wiki should cover, one per line. ' +
      'Each becomes a tag category and a query-time retrieval basin.',
    '',
    `- (your domain 1)`,
    `- (your domain 2)`,
    `- (your domain 3)`,
  ].join('\n');
}

function renderCandidatesSection(candidates: VaultCandidate[]): string {
  const header = '## Initial Source Suggestions';
  const description =
    'Pick 2-3 of these to ingest first — they give the link graph enough ' +
    'structure for PPR retrieval to outperform pure keyword match.';

  // Sort by size descending — bigger notes likely have more content.
  const sorted = [...candidates]
    .sort((a, b) => b.size - a.size)
    .slice(0, CANDIDATE_LIMIT);

  if (sorted.length === 0) {
    // Degenerate Tier B: vault claimed to have notes but candidate
    // list is empty. Show section header with instruction, no list.
    return [
      header,
      '',
      description,
    ].join('\n');
  }

  const list = sorted.map(c => `- [ ] [[${c.path}]] — ${c.title}`).join('\n');
  return [header, '', description, '', list].join('\n');
}

function renderScopeSection(): string {
  return [
    '## Wiki Scope',
    '',
    'Describe in 1-2 sentences what this wiki covers. ' +
      'The LLM reads this when ingesting to understand context.',
    '',
    '> (your wiki scope — 1-2 sentences)',
  ].join('\n');
}

function renderConfigSection(llmConfig: LlmConfigStatus): string {
  const header = '## Configuration Test';
  const openMarker = '<!-- auto-generated by plugin: do not edit -->';

  let body: string;
  if (llmConfig.ok) {
    const status = '✅ LLM Configuration: OK';
    const provider = `Provider: ${llmConfig.provider ?? 'unknown'}`;
    const model = `Model: ${llmConfig.model ?? 'unknown'}`;
    body = [status, provider, model].join('\n');
  } else {
    const status = '⚠️ LLM Configuration: Failed';
    const error = `Error: ${llmConfig.error ?? 'unknown'}`;
    body = [status, error].join('\n');
  }

  return [header, '', openMarker, body].join('\n');
}