// ensure-welcome-note.ts — v1.23.0 first-run Welcome note orchestrator
//
// Async side-effectful (file I/O). Glue between tier-detection,
// smoke-test, welcome-note-template, and localize-welcome-note. The
// caller (main.ts onload) injects a real VaultAdapter over the
// Obsidian vault, a smoke test probe that calls the actual LLM
// client, and a language string. Tests inject fakes.
//
// The function does NOT show Notices — that is the caller's
// responsibility (main.ts hooks into the Obsidian Notice system).
// We return the OnboardingAction so the caller can decide what UI
// to surface (Notice, Modal, ribbon, etc.).
//
// D8 (user-locked 2026-06-23): the Welcome note body is built in
// English by buildWelcomeNote, then translated into the user's
// wikiLanguage by localizeWelcomeNote (which uses the LLM). If the
// LLM call fails, the English body is written and the caller can
// surface a "Run Configuration Test" Notice.

import { decideOnboardingAction, type VaultProbe, type OnboardingAction, type UserTier } from './tier-detection';
import { smokeTest, type LlmConfigStatus } from './smoke-test';
import { buildWelcomeNote, type VaultCandidate } from './welcome-note-template';

// Re-export VaultCandidate so callers (main.ts wiring, tests) can name
// the candidate type alongside the adapter without importing from
// welcome-note-template directly.
export type { VaultCandidate } from './welcome-note-template';
import { localizeWelcomeNote, type LocalizeResult } from './localize-welcome-note';
import type { LLMClient } from '../types';

/**
 * Minimal vault contract that ensure-welcome-note needs. The real
 * Obsidian app.vault satisfies this; tests fake it.
 */
export interface VaultAdapter {
  exists(path: string): Promise<boolean>;
  listMarkdown(): Promise<VaultCandidate[]>;
  create(path: string, content: string): Promise<void>;
}

export interface EnsureWelcomeNoteArgs {
  vault: VaultAdapter;
  settings: {
    wikiFolder: string;
    createWelcomeNote: boolean;
  };
  /** Language to translate the Welcome body into. Pass settings.wikiLanguage. */
  targetLanguage: string;
  createdAt: string;
  /** Probe function passed to smokeTest. Production: minimal LLM call. */
  smokeTestProbe: () => Promise<LlmConfigStatus>;
  /**
   * Optional override for vault candidate list. If omitted, ensure-
   * welcome-note calls vault.listMarkdown(). Production callers
   * usually pass an explicit list (cached from a prior scan) for
   * performance; tests pass explicit fixtures.
   */
  vaultCandidates?: VaultCandidate[];
  /**
   * Optional LLM client for D8 dynamic translation. When omitted, the
   * English body is written directly (Tier A users with no LLM get
   * an English Welcome note regardless).
   */
  llmClient?: LLMClient;
  /** Model name to use for the translation. Required if llmClient is provided. */
  model?: string;
}

export interface EnsureResult {
  tier: UserTier;
  action: OnboardingAction;
  /** Path to the Welcome note if it was created. Undefined otherwise. */
  welcomeNotePath?: string;
  /**
   * Set when a Welcome note was written. `localized=true` means the body
   * was LLM-translated to targetLanguage; `false` means the English
   * fallback was used (LLM not configured, or translation failed).
   * Caller can use this to decide whether to show a "Run Configuration
   * Test" Notice.
   */
  localizeResult?: LocalizeResult;
}

export async function ensureWelcomeNote(args: EnsureWelcomeNoteArgs): Promise<EnsureResult> {
  const {
    vault, settings, targetLanguage, createdAt, smokeTestProbe,
    vaultCandidates, llmClient, model,
  } = args;

  // Step 1: probe vault state.
  const probe = await probeVaultState(vault, settings.wikiFolder, vaultCandidates);
  // Step 1.5: probe LLM readiness first so tier-detection knows whether
  // the user can benefit from a Tier-A Welcome (the "LLM is configured
  // but vault is empty" path is the v1.23.0 follow-up improvement).
  // We pass the smokeTest probe but catch here too — if the LLM check
  // throws, we treat LLM as unavailable.
  let llmAvailable = false;
  try {
    const llmProbe = await smokeTest(smokeTestProbe);
    llmAvailable = llmProbe.ok;
  } catch {
    llmAvailable = false;
  }
  // Step 2: decide tier (with LLM-availability awareness).
  const action = decideOnboardingAction(probe, { llmAvailable });
  // Step 3: short-circuit when no Welcome note is needed (Tier C, or
  // Tier A without LLM).
  if (!action.shouldCreateWelcomeNote) {
    return { tier: action.tier, action };
  }
  // Step 4: respect createWelcomeNote setting.
  if (!settings.createWelcomeNote) {
    return { tier: action.tier, action };
  }
  // Step 5: idempotent — skip if Welcome note already exists.
  const welcomePath = `${settings.wikiFolder}/Welcome.md`;
  if (await vault.exists(welcomePath)) {
    return { tier: action.tier, action, welcomeNotePath: welcomePath };
  }
  // Step 6: list vault candidates (if not provided).
  const candidates = vaultCandidates ?? await vault.listMarkdown();
  // Step 7: re-run smoke test (we did it once for tier-decision, but
  // the actual configuration check happens here so the localized
  // Welcome body can surface the result).
  const llmConfig = await smokeTest(smokeTestProbe);
  // Step 8: build the English Welcome note body.
  const englishBody = buildWelcomeNote({
    candidates,
    llmConfig,
    createdAt,
  });
  // Step 9: D8 dynamic LLM translation. If no LLM client, or LLM smoke
  // test failed, fall back to English. We pass `llmConfig.ok` as a
  // pre-check so we don't waste an LLM call on a clearly-broken config.
  let bodyToWrite: string;
  let localizeResult: LocalizeResult | undefined;
  if (llmClient && model && llmConfig.ok) {
    localizeResult = await localizeWelcomeNote({
      englishBody,
      targetLanguage,
      llmClient,
      model,
    });
    bodyToWrite = localizeResult.body;
  } else {
    // No LLM client, no model, or smoke test failed — write English.
    bodyToWrite = englishBody;
    localizeResult = {
      ok: false,
      body: englishBody,
      localized: false,
      error: llmConfig.ok ? undefined : (llmConfig.error ?? 'LLM not configured'),
    };
  }
  // Step 10: write to vault.
  await vault.create(welcomePath, bodyToWrite);
  return {
    tier: action.tier,
    action,
    welcomeNotePath: welcomePath,
    localizeResult,
  };
}

async function probeVaultState(
  vault: VaultAdapter,
  wikiFolder: string,
  vaultCandidates: VaultCandidate[] | undefined,
): Promise<VaultProbe> {
  // Wiki folder is "present with pages" if any wiki page exists. We
  // treat a folder that exists but has no pages as Tier A (effectively
  // empty). Implementation: use the candidates list if provided, else
  // ask the vault. Wiki pages are a subset of all vault .md files
  // (those inside settings.wikiFolder).
  const allMd = vaultCandidates ?? await vault.listMarkdown();
  const wikiPages = allMd.filter(c => c.path.startsWith(`${wikiFolder}/`));
  const hasWikiFolder = wikiPages.length > 0;
  return {
    hasWikiFolder,
    wikiPageCount: wikiPages.length,
    vaultMdCount: allMd.length,
  };
}