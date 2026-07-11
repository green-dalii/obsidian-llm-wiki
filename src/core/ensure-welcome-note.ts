// ensure-welcome-note.ts — v1.23.0 first-run Welcome note orchestrator
//
// Async side-effectful (file I/O). Glue between tier-detection,
// smoke-test, welcome-note-template, and localize-welcome-note. The
// caller (auto-maintain.ts Phase 0 + recreate command) injects a
// real VaultAdapter over the Obsidian vault, a smoke test probe that
// calls the actual LLM client, and a target language. Tests inject
// fakes.
//
// The function does NOT show Notices — that is the caller's
// responsibility. We return the OnboardingAction + localizeResult so
// the caller can decide what UI to surface (Notice, Modal, ribbon).
//
// D8 (user-locked 2026-06-23): the Welcome note body is built in
// English by buildWelcomeNote, then translated into the user's
// wikiLanguage by localizeWelcomeNote (which uses the LLM). If the
// LLM call fails, the English body is written and the caller can
// surface a "Run Configuration Test" Notice.
//
// v1.23.0 refactor (2026-06-28): the VaultAdapter no longer needs
// `listMarkdown()` — Welcome does not consume vault notes anymore
// (the "Initial Source Suggestions" section was removed). Only
// `getMarkdownFiles()` is needed for tier detection's VaultProbe.

import { decideOnboardingAction, type VaultProbe, type OnboardingAction, type UserTier } from './tier-detection';
import { smokeTest, type LlmConfigStatus } from './smoke-test';
import { buildWelcomeNote } from './welcome-note-template';
import { localizeWelcomeNote, type LocalizeResult } from './localize-welcome-note';
import { getWelcomeFileName } from './i18n';
import type { LLMClient } from '../types';

/**
 * Minimal vault contract that ensure-welcome-note needs. The real
 * Obsidian app.vault satisfies this; tests fake it.
 *
 * v1.23.0 refactor: removed `listMarkdown()` — Welcome no longer
 * shows a vault-file list. We use `getMarkdownFiles()` directly
 * (Obsidian's standard API) to probe tier state.
 */
export interface VaultAdapter {
  exists(path: string): Promise<boolean>;
  /** Returns vault-relative paths of all .md files. Used for tier probe. */
  getMarkdownFiles(): Promise<string[]>;
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
   * Optional LLM client for D8 dynamic translation. When omitted, the
   * English body is written directly (Tier A users with no LLM get
   * an English Welcome note regardless).
   */
  llmClient?: LLMClient;
  /** Model name to use for the translation. Required if llmClient is provided. */
  model?: string;
  /** v1.24.1 #268: bypass the Tier C "wiki exists" short-circuit. recreateWelcomeNote passes true; auto-maintain Phase 0 does not. */
  forceRecreate?: boolean;
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
    llmClient, model, forceRecreate = false,
  } = args;

  // Step 1: probe vault state.
  const probe = await probeVaultState(vault, settings.wikiFolder);
  // Step 2: decide tier.
  // We don't know LLM readiness yet — pass a sentinel to tier-detection
  // (the literal llmClient reference; if it exists, the user has
  // configured the provider at the client level). The actual smoke
  // test runs ONCE at Step 7 below — reused for both tier-decision
  // and Welcome body generation. This avoids double-counted LLM
  // traffic on every onload.
  const action = decideOnboardingAction(probe, { llmAvailable: !!llmClient });
  // Step 3: short-circuit when no Welcome note is needed (Tier C, or
  // Tier A without LLM client). v1.24.1 #268: `forceRecreate` bypasses
  // the tier-based "shouldCreateWelcomeNote" decision only — it does
  // NOT bypass createWelcomeNote=false or smoke-test failure paths.
  if (!action.shouldCreateWelcomeNote && !forceRecreate) {
    return { tier: action.tier, action };
  }
  // Step 4: respect createWelcomeNote setting.
  if (!settings.createWelcomeNote) {
    return { tier: action.tier, action };
  }
  // Step 5: idempotent — skip if Welcome note already exists.
  // The filename is localized to the user's wikiLanguage (D8 + v1.23.0
  // follow-up) so "欢迎使用 Karpathy LLM Wiki.md" / "Welcome.md" etc.
  // For the legacy fallback to old single-file Welcome.md (pre-i18n),
  // we also probe that path explicitly so recreate-on-existing still
  // works for users upgrading from v1.22.x.
  const welcomePath = `${settings.wikiFolder}/${getWelcomeFileName(targetLanguage)}.md`;
  const legacyWelcomePath = `${settings.wikiFolder}/Welcome.md`;
  if (await vault.exists(welcomePath)) {
    return { tier: action.tier, action, welcomeNotePath: welcomePath };
  }
  if (await vault.exists(legacyWelcomePath)) {
    // Pre-i18n install still has Welcome.md → adopt it as the canonical
    // path. Subsequent recreates will move it to the localized name.
    return { tier: action.tier, action, welcomeNotePath: legacyWelcomePath };
  }
  // Step 6: run smoke test ONCE. Result feeds both the Configuration
  // Test section (rendered into the body) and the LLM-translation
  // gate below.
  const llmConfig = await smokeTest(smokeTestProbe);
  // Step 7: build the English Welcome note body.
  const englishBody = buildWelcomeNote({
    llmConfig,
    createdAt,
  });
  // Step 8: D8 dynamic LLM translation. If no LLM client, or LLM smoke
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
  // Step 9: write to vault.
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
): Promise<VaultProbe> {
  // Wiki folder is "present with pages" if any wiki page exists. We
  // treat a folder that exists but has no pages as Tier A (effectively
  // empty). The vault's standard `getMarkdownFiles()` walks the
  // entire vault once — cheap for normal-sized vaults.
  const allMd = await vault.getMarkdownFiles();
  const wikiPages = allMd.filter(p => p.startsWith(`${wikiFolder}/`));
  const hasWikiFolder = wikiPages.length > 0;
  return {
    hasWikiFolder,
    wikiPageCount: wikiPages.length,
    vaultMdCount: allMd.length,
  };
}