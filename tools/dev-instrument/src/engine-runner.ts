// UPSTREAM DEV-ONLY INSTRUMENT — engine wiring.
//
// Drives the real `WikiEngine.ingestSource` against a vault on disk with
// no Obsidian runtime. The measurement primitive is the shared
// `recordTaskUsage` accumulator at `src/core/llm-task-usage.ts` (wired
// by `wrapWithAdvancedSettings` in `src/llm-client-wrapper.ts` for every
// LLMClient returned by `createLLMClient`). The dev-instrument snapshots
// before the run and diffs after — `taskUsageSince(before)` returns the
// per-step breakdown.
//
// v1.27.0 MINOR migration per issue #507 + simplify findings:
// - All `node:*` access via vault-fs's exported `loadNodeModules` (single
//   source for the Platform.isDesktop-guarded `await import('node:module')`
//   + `createRequire` chain).
// - `withUsageAccounting` removed; per-step calls/millis now come from the
//   shared module-level accumulator (the old wrapper double-recorded the
//   same data with `wrapWithAdvancedSettings`).
// - Per-task tokens still tracked here (the shared accumulator only counts
//   calls and millis, not tokens). Wrapper is now a thin onFinish hook.
// - printSummary collapsed from 18 process.stdout.write calls to one.
import { Platform } from './shim';
import { DEFAULT_CONFIG_DIR, PLUGIN_ID } from './shim';
import { loadNodeModules, createVaultApp, type VaultWriteRecord } from './vault-fs';
import { type App, TFile, normalizePath } from 'obsidian';
import { WikiEngine } from '../../../src/wiki/wiki-engine';
import { SchemaManager } from '../../../src/schema/schema-manager';
import { createLLMClient } from '../../../src/core/create-plugin-llm-client';
import { preloadLLMClientModules } from '../../../src/llm-sdk/create-llm-client';
import { applySettingsMigrations } from '../../../src/core/settings-migrations';
import { isLocalNoKeyProvider } from '../../../src/core/local-no-key-provider';
import type { IngestReport, LLMClient, LLMWikiSettings } from '../../../src/types';
import {
  snapshotTaskUsage,
  taskUsageSince,
  type TaskUsage,
} from '../../../src/core/llm-task-usage';

const API_KEY_ENV = 'WIKI_API_KEY';

async function loadSettings(vaultRoot: string): Promise<LLMWikiSettings> {
  const { nodePath, nodeFs } = await loadNodeModules();
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
 * Wraps the LLMClient to total up input/output tokens. Call counts and
 * millis come from the shared `recordTaskUsage` accumulator
 * (`src/core/llm-task-usage.ts`, wired by `wrapWithAdvancedSettings`), so
 * this wrapper only needs to read `meta.usage` from the onFinish hook.
 */
function withTokenTracking(client: LLMClient, totals: { in: number; out: number }): LLMClient {
  const w = Object.create(client) as LLMClient;
  w.createMessage = params => {
    const done = client.createMessage({
      ...params,
      onFinish: meta => {
        totals.in += meta.usage?.inputTokens ?? 0;
        totals.out += meta.usage?.outputTokens ?? 0;
        params.onFinish?.(meta);
      },
    });
    return done;
  };
  return w;
}

function resolveSourceFile(app: Awaited<ReturnType<typeof createVaultApp>>, sourcePath: string): TFile {
  const path = normalizePath(sourcePath);
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) return file;
  throw new Error(`Source not found in vault index: ${path}`);
}

interface PrintSummaryInput {
  byTask: Array<[string, TaskUsage]>;
  tokens: { in: number; out: number };
  report: IngestReport | null;
  writes: VaultWriteRecord[];
  elapsedMs: number;
}

function printSummary(input: PrintSummaryInput): void {
  const { byTask, tokens, report, writes, elapsedMs } = input;
  const lines: string[] = [];

  lines.push('', '=== Writes ===');
  const pageWrites = writes.filter(w => w.action !== 'mkdir');
  if (pageWrites.length === 0) {
    lines.push('  (no file writes)');
  } else {
    for (const w of pageWrites) {
      lines.push(`  ${w.action.padEnd(6)} ${w.path}`);
    }
  }

  lines.push('', '=== Summary ===');
  if (!report) {
    lines.push('  no ingest report was emitted (the engine returned before onDone)');
  } else {
    const fields: Array<[string, string | number | boolean]> = [];
    fields.push(['source', report.sourceFile]);
    fields.push(['success', report.success]);
    if (report.skipped) fields.push(['skipped', JSON.stringify(report.rejectedFiles ?? [])]);
    if (report.errorMessage) fields.push(['error', report.errorMessage]);
    fields.push(['new entity pages', report.entitiesCreated]);
    fields.push(['new concept pages', report.conceptsCreated]);
    fields.push(['pages created', report.createdPages.length]);
    fields.push(['pages updated', report.updatedPages.length]);
    fields.push(['contradictions', report.contradictionsFound]);
    fields.push(['failed items', report.failedItems.length]);
    for (const [key, value] of fields) {
      lines.push(`  ${key.padEnd(18)} ${value}`);
    }
  }

  const totalCalls = byTask.reduce((sum, [, u]) => sum + u.calls, 0);
  lines.push(
    `  llm calls         ${totalCalls}`,
    `  tokens in         ${tokens.in}`,
    `  tokens out        ${tokens.out}`,
  );

  lines.push('', '=== Where the time went ===');
  lines.push('  step               calls   seconds   share');
  const wall = byTask.reduce((sum, [, u]) => sum + u.millis, 0) || 1;
  for (const [name, usage] of byTask) {
    lines.push(
      `  ${name.padEnd(18)} ${String(usage.calls).padStart(5)}`
      + ` ${(usage.millis / 1000).toFixed(1).padStart(10)}`
      + ` ${(100 * usage.millis / wall).toFixed(0).padStart(6)}%`,
    );
  }
  lines.push(`  elapsed           ${(elapsedMs / 1000).toFixed(1)}s`);

  process.stdout.write(lines.join('\n') + '\n');
}

export async function runIngest(vaultRoot: string, sourcePath: string): Promise<void> {
  if (!Platform.isDesktop) throw new Error('runIngest is desktop-only');
  const { nodeFs } = await loadNodeModules();

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

  const settings = await loadSettings(vaultRoot);
  settings.apiKey = await resolveApiKey(settings.provider);

  const app = await createVaultApp(vaultRoot);
  const sourceFile = resolveSourceFile(app, sourcePath);

  await preloadLLMClientModules();
  const tokens = { in: 0, out: 0 };
  const client = withTokenTracking(createLLMClient(settings), tokens);
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

  process.stdout.write(
    `[cli] vault=${vaultRoot}\n` +
    `[cli] source=${sourceFile.path}\n` +
    `[cli] provider=${settings.provider} model=${settings.model} baseUrl=${settings.baseUrl}\n`,
  );

  const taskUsageBefore = snapshotTaskUsage();
  const startedAt = Date.now();
  try {
    await engine.ingestSource(sourceFile, { interactive: false });
  } finally {
    printSummary({
      byTask: taskUsageSince(taskUsageBefore),
      tokens,
      report,
      writes: app.vault.writes,
      elapsedMs: Date.now() - startedAt,
    });
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