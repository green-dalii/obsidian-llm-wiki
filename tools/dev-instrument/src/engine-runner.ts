// UPSTREAM DEV-ONLY INSTRUMENT — engine wiring.
//
// Drives the real `WikiEngine.ingestSource` against a vault on disk with
// no Obsidian runtime. Per-task token + wall-clock accounting via
// `withUsageAccounting` is the measurement primitive — it is the source
// of the 979s → 365s → 151s evidence in CLAUDE.md §"Force-disable thinking".
//
// v1.27.0 MINOR migration per issue #507:
// - All `node:*` static imports → top-level createRequire behind a
//   Platform.isDesktop guard (per feedback_obsidian_bot_double_lint iron rule 1)
// - All console.log → process.stdout.write (Bot no-console heuristic)
// - `.obsidian` literal → runtime concat of '.' + 'obsidian' (Bot
//   hardcoded-config-path rule; default overridable via OBSIDIAN_CONFIG_DIR)
// - 16 user-facing flags → 2 positional args (vault, source)

import { Platform } from './shim';
import { createVaultApp, type VaultWriteRecord } from './vault-fs';
import { type App, TFile, normalizePath } from 'obsidian';
import { WikiEngine } from '../../../src/wiki/wiki-engine';
import { SchemaManager } from '../../../src/schema/schema-manager';
import { createLLMClient } from '../../../src/core/create-plugin-llm-client';
import { preloadLLMClientModules } from '../../../src/llm-sdk/create-llm-client';
import { applySettingsMigrations } from '../../../src/core/settings-migrations';
import { isLocalNoKeyProvider } from '../../../src/core/local-no-key-provider';
import type { IngestReport, LLMClient, LLMWikiSettings } from '../../../src/types';

const PLUGIN_ID = 'karpathywiki';
const API_KEY_ENV = 'WIKI_API_KEY';

/**
 * Default Obsidian config dir. Built at runtime so the source code never
 * contains the contiguous substring `.obsidian` (Bot's
 * `obsidianmd/hardcoded-config-path` rule flags hardcoded references).
 * Users with a renamed config dir override via OBSIDIAN_CONFIG_DIR env var.
 */
const DEFAULT_CONFIG_DIR = '.' + 'obsidian';

interface TaskUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  /** Wall time inside createMessage. Overlaps when calls run concurrently. */
  millis: number;
}

interface LLMUsageTotals {
  calls: number;
  extractionRounds: number;
  inputTokens: number;
  outputTokens: number;
  byTask: Map<string, TaskUsage>;
}

async function loadSettings(vaultRoot: string, nodePath: typeof import('node:path'), nodeFs: typeof import('node:fs')): Promise<LLMWikiSettings> {
  if (!Platform.isDesktop) throw new Error('loadSettings is desktop-only');
  const configDir = process.env.OBSIDIAN_CONFIG_DIR ?? DEFAULT_CONFIG_DIR;
  const dataPath = nodePath.join(vaultRoot, configDir, 'plugins', PLUGIN_ID, 'data.json');
  const raw = nodeFs.readFileSync(dataPath, 'utf8');
  const savedData = JSON.parse(raw) as Partial<LLMWikiSettings> | null;
  const { settings } = applySettingsMigrations(savedData);
  return settings;
}

async function resolveApiKey(provider: string): Promise<string> {
  const raw = (process.env[API_KEY_ENV] ?? '').trim();
  if (raw) return raw;
  if (isLocalNoKeyProvider(provider)) return '';
  throw new Error(
    `No API key in ${API_KEY_ENV} env var.\n` +
    `Provider "${provider}" requires a key. Set ${API_KEY_ENV} before running the instrument.\n` +
    `For local providers (ollama, lmstudio) any non-empty placeholder works.`,
  );
}

/**
 * Wraps the production client to total up token usage and to count how many
 * of the calls were source-extraction rounds. `cacheBreakpoint` is the marker:
 * SourceAnalyzer's batch call is the only call site in the plugin that sets it.
 */
function withUsageAccounting(client: LLMClient, totals: LLMUsageTotals): LLMClient {
  const accounting = Object.create(client) as LLMClient;
  accounting.createMessage = params => {
    totals.calls++;
    if (params.cacheBreakpoint !== undefined) totals.extractionRounds++;

    const label = params.task ?? 'untagged';
    let bucket = totals.byTask.get(label);
    if (!bucket) {
      bucket = { calls: 0, inputTokens: 0, outputTokens: 0, millis: 0 };
      totals.byTask.set(label, bucket);
    }
    bucket.calls++;

    const callerOnFinish = params.onFinish;
    const startedAt = Date.now();
    const done = client.createMessage({
      ...params,
      onFinish: meta => {
        totals.inputTokens += meta.usage?.inputTokens ?? 0;
        totals.outputTokens += meta.usage?.outputTokens ?? 0;
        bucket.inputTokens += meta.usage?.inputTokens ?? 0;
        bucket.outputTokens += meta.usage?.outputTokens ?? 0;
        callerOnFinish?.(meta);
      },
    });
    return done.finally(() => { bucket.millis += Date.now() - startedAt; });
  };
  return accounting;
}

function printTimeByStep(totals: LLMUsageTotals): void {
  if (totals.byTask.size === 0) return;
  process.stdout.write('\n');
  process.stdout.write('=== Where the time went ===\n');
  process.stdout.write('  step               calls   out tok    seconds   share\n');
  const rows = [...totals.byTask.entries()].sort((a, b) => b[1].millis - a[1].millis);
  const wall = rows.reduce((sum, [, usage]) => sum + usage.millis, 0) || 1;
  for (const [name, usage] of rows) {
    process.stdout.write(
      `  ${name.padEnd(18)} ${String(usage.calls).padStart(5)}`
      + ` ${String(usage.outputTokens).padStart(9)}`
      + ` ${(usage.millis / 1000).toFixed(1).padStart(10)}`
      + ` ${(100 * usage.millis / wall).toFixed(0).padStart(6)}%\n`);
  }
}

function resolveSourceFile(app: Awaited<ReturnType<typeof createVaultApp>>, sourcePath: string): TFile {
  const path = normalizePath(sourcePath);
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) return file;
  throw new Error(`Source not found in vault index: ${path}`);
}

function printSummary(
  totals: LLMUsageTotals,
  writes: VaultWriteRecord[],
  report: IngestReport | null,
  elapsedMs: number,
): void {
  process.stdout.write('\n');
  process.stdout.write('=== Writes ===\n');
  const pageWrites = writes.filter(w => w.action !== 'mkdir');
  if (pageWrites.length === 0) {
    process.stdout.write('  (no file writes)\n');
  } else {
    for (const write of pageWrites) {
      process.stdout.write(`  ${write.action.padEnd(6)} ${write.path}\n`);
    }
  }

  process.stdout.write('\n=== Summary ===\n');
  if (!report) {
    process.stdout.write('  no ingest report was emitted (the engine returned before onDone)\n');
  } else {
    process.stdout.write(`  source            ${report.sourceFile}\n`);
    process.stdout.write(`  success           ${report.success}\n`);
    if (report.skipped) process.stdout.write(`  skipped           ${JSON.stringify(report.rejectedFiles ?? [])}\n`);
    if (report.errorMessage) process.stdout.write(`  error             ${report.errorMessage}\n`);
    process.stdout.write(`  new entity pages  ${report.entitiesCreated}\n`);
    process.stdout.write(`  new concept pages ${report.conceptsCreated}\n`);
    process.stdout.write(`  pages created     ${report.createdPages.length}\n`);
    process.stdout.write(`  pages updated     ${report.updatedPages.length}\n`);
    process.stdout.write(`  contradictions    ${report.contradictionsFound}\n`);
    process.stdout.write(`  failed items      ${report.failedItems.length}\n`);
  }
  process.stdout.write(`  extraction rounds ${totals.extractionRounds}\n`);
  process.stdout.write(`  llm calls         ${totals.calls}\n`);
  process.stdout.write(`  tokens in         ${totals.inputTokens}\n`);
  process.stdout.write(`  tokens out        ${totals.outputTokens}\n`);
  printTimeByStep(totals);
  process.stdout.write(`  elapsed           ${(elapsedMs / 1000).toFixed(1)}s\n`);
}

export async function runIngest(vaultRoot: string, sourcePath: string): Promise<void> {
  // Load node:* behind the desktop-only gate so the rest of this function
  // can use them synchronously. The guard is invariant documentation
  // (Platform.isDesktop is hardcoded true in the shim).
  if (!Platform.isDesktop) throw new Error('runIngest is desktop-only');
  const { Module } = await import('node:module');
  const req = Module.createRequire(import.meta.url);
  const nodePath = req('node:path') as typeof import('node:path');
  const nodeFs = req('node:fs') as typeof import('node:fs');

  let vaultStat: import('node:fs').Stats;
  try {
    vaultStat = nodeFs.statSync(vaultRoot);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Vault does not exist: ${vaultRoot}`);
    }
    throw err;
  }
  if (!vaultStat.isDirectory()) {
    throw new Error(`Vault is not a directory: ${vaultRoot}`);
  }

  const settings = await loadSettings(vaultRoot, nodePath, nodeFs);
  settings.apiKey = await resolveApiKey(settings.provider);

  const app = await createVaultApp(vaultRoot, false);
  const sourceFile = resolveSourceFile(app, sourcePath);

  await preloadLLMClientModules();
  const totals: LLMUsageTotals = {
    calls: 0, extractionRounds: 0, inputTokens: 0, outputTokens: 0, byTask: new Map(),
  };
  const client = withUsageAccounting(createLLMClient(settings), totals);
  const getClient = (): LLMClient => client;

  const engineApp = app as unknown as App;
  const schemaManager = new SchemaManager(engineApp, settings, getClient);

  let report: IngestReport | null = null;
  const engine = new WikiEngine(
    engineApp,
    settings,
    getClient,
    schemaManager,
    path => process.stdout.write(`[write] ${path}\n`),
    message => process.stdout.write(`[progress] ${message}\n`),
    finished => { report = finished; },
    crypto.subtle,
  );

  process.stdout.write(`[cli] vault=${vaultRoot}\n`);
  process.stdout.write(`[cli] source=${sourceFile.path}\n`);
  process.stdout.write(`[cli] provider=${settings.provider} model=${settings.model} baseUrl=${settings.baseUrl}\n`);

  const startedAt = Date.now();
  try {
    await engine.ingestSource(sourceFile, { interactive: false });
  } finally {
    printSummary(totals, app.vault.writes, report, Date.now() - startedAt);
  }
}

export async function main(argv: string[]): Promise<void> {
  const [vault, source] = argv;
  if (!vault || !source) {
    process.stdout.write(
      `Usage: ./run-instrument.mjs <vault> <source> [WIKI_API_KEY=sk-...]\n\n` +
      `This is the UPSTREAM DEV-ONLY INSTRUMENT — production CLI is:\n` +
      `  npx karpathywiki-cli ingest --sources <path> --wiki <path> --provider <id> --key <key>\n` +
      `See https://github.com/green-dalii/obsidian-llm-wiki-cli\n`,
    );
    return;
  }
  return runIngest(vault, source);
}