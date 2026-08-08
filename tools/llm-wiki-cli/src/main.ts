// Runs the plugin's real WikiEngine.ingestSource against a vault on disk,
// with no Obsidian and no display. Everything Obsidian-specific comes from
// the shim modules next to this file; the engine, the analyzer, the page
// factory, the schema manager and the LLM client are the production ones.
//
// `node:*` static imports below survive the Obsidian review bot's
// `obsidianmd/no-nodejs-modules` rule because the CLI is a Node program, not
// a plugin — node:* are not "mobile-incompatible" APIs in this build target.
// The `parseArgs` call inside `parseCliOptionsInner` is sync, so the
// `node:util` import has to stay static; making the surrounding function
// async would break 14 tests that pin the sync contract (see
// `src/__tests__/tools/llm-wiki-cli/main.test.ts`). Only the runtime-loaded
// modules (e.g. `node:http` in `obsidian.ts`, `node:console` in
// `node-globals.ts`) can convert to dynamic form.

import { parseArgs } from 'node:util';
import { readFileSync, statSync, type Stats } from 'node:fs';
import * as nodePath from 'node:path';
import { normalizePath, TFile, type App } from 'obsidian';

import { WikiEngine } from '../../../src/wiki/wiki-engine';
import { SchemaManager } from '../../../src/schema/schema-manager';
import { createLLMClient } from '../../../src/core/create-plugin-llm-client';
import { preloadLLMClientModules } from '../../../src/llm-sdk/create-llm-client';
import { applySettingsMigrations } from '../../../src/core/settings-migrations';
import { isLocalNoKeyProvider } from '../../../src/core/local-no-key-provider';
import { GRANULARITY_CONFIG } from '../../../src/core/batch-limits';
import type { ExtractionGranularity, IngestReport, LLMClient, LLMWikiSettings } from '../../../src/types';

import { createVaultApp, type VaultWriteRecord } from './vault';
import { installObsidianGlobals } from './node-globals';

const PLUGIN_ID = 'karpathywiki';
const API_KEY_ENV = 'WIKI_API_KEY';

const TOOL_USAGE = `Usage:
  llm-wiki <command> [flags]

Commands:
  ingest   Run the real ingest pipeline against a vault on disk.

Run \`llm-wiki <command> --help\` for command-specific flags.`;

const INGEST_USAGE = `Usage:
  node tools/llm-wiki-cli/run-llm-wiki.mjs ingest --vault <path> --source <path-in-vault> [flags]

  --vault         Path to the Obsidian vault. Required.
  --source        Source file path relative to the vault. Required.
  --dry-run       Run the full ingest but keep every write in memory.
  --force         Ignore the duplicate-content gate and re-ingest anyway.
  --extract-only  Stop after extraction; write no pages. Implies --dry-run.
  --seed          Fix the sampling seed. Without it the provider picks one per
                  request. Some local servers honour it, not all: LM Studio
                  accepts and type-validates the field and then ignores it
                  (#423), so there only --temperature 0 makes two runs of one
                  source comparable. Anthropic has no such parameter, and the
                  openai provider drops it: that path builds the Responses
                  model, which reports seed unsupported and omits it.
                  Best-effort seed is a Chat Completions feature.
  --max-tokens-per-call  Cap max_tokens for every call. 0 removes the cap and
                  leaves whatever the call site asks for — for extraction that
                  is at least 16000, not "unlimited".
  --batch-size    How many items a round asks for. Comparing sizes through this
                  flag keeps every arm on one build, which a code edit between
                  arms does not. Under --granularity custom it survives unless
                  the per-type caps sum above 10, where the batch size is
                  derived from them instead; an unset cap counts as 5, so plain
                  --granularity custom sums to exactly 10 and this still applies.
  --round-base    Sets the granularity's round base, not the ceiling: the
                  ceiling is min(base * 3, ceil(source_chars / 2000) + 2), so 6
                  allows 18 — and on a short source the length term wins and
                  this changes nothing. Under --granularity custom the same
                  caps-above-10 rule can overwrite it.
  --max-rounds    Deprecated; throws. Use --round-base. Removal in v1.26.0.
  --model         Override the model, so two arms differ only by which one
                  answered. Otherwise every run takes the model from data.json.
  --temperature   Set the extraction sampling temperature. Unset, the server's
                  own preset applies — which differs per model, so comparing two
                  models without this compares their presets as well.
  --top-p         Set nucleus sampling. Pass it with --temperature: a preset is
                  the pair, and overriding one alone runs on half of each.
  --granularity   fine | standard | coarse | minimal | custom. Decides the batch
                  size, the item limit and the round ceiling together.
  --thinking-mode  data-json | plugin-off | server-default.
                  data-json keeps whatever data.json says (no override);
                  plugin-off forces reasoning off; server-default asks
                  for the server's own preset — the only state the
                  plugin can actually express. Omitting the flag leaves
                  data.json in force.
  --thinking       Deprecated; throws. Use --thinking-mode.
                  Removal in v1.26.0.

Environment:
  ${API_KEY_ENV}  Provider API key. The CLI reuses the plugin's provider,
                model, baseUrl, granularity, and other settings from
                <vault>/.obsidian/plugins/karpathywiki/data.json — only
                the API key has to come from outside, because the plugin
                stores it in the OS keychain (SecretStorage) which Node
                cannot read.

                When the key is missing, the error message prints the
                OS-specific commands to extract it from the keychain.`;

interface CliOptions {
  vault: string;
  source: string;
  dryRun: boolean;
  force: boolean;
  extractOnly: boolean;
  seed?: number;
  maxTokensPerCall?: number;
  batchSize?: number;
  roundBase?: number;
  model?: string;
  temperature?: number;
  topP?: number;
  granularity?: string;
  thinkingMode?: ThinkingModeValue;
  help: boolean;
}

/**
 * `--thinking-mode` replaces `--thinking` (deprecated, removal in v1.26.0).
 * `data-json` keeps whatever the plugin's data.json says (no override);
 * `plugin-off` forces reasoning off; `server-default` asks for the server's
 * own preset. The three states match the three outcomes the plugin can
 * actually express, where the old `on|off` made `on` look like "enable
 * reasoning" while it really meant "defer to server default".
 */
export type ThinkingModeValue = 'data-json' | 'plugin-off' | 'server-default';

/**
 * Apply a `--thinking-mode <value>` override to the settings object. Pure —
 * mutates only `settings.disableThinking` and only for the two modes that
 * actually express an opinion. `data-json` is a deliberate no-op (the user
 * is saying "use whatever data.json says"), so the previous value is
 * preserved. Without this branch the three-state enum would collapse to a
 * single boolean assignment and silently contradict data.json.
 *
 * The parameter is typed as `{ disableThinking: boolean }` rather than the
 * full `LLMWikiSettings` so callers and tests can pass a minimal stub
 * without rest of the settings surface — applyThinkingMode genuinely only
 * touches this one field.
 */
export function applyThinkingMode(
  settings: { disableThinking?: boolean | undefined },
  mode: ThinkingModeValue,
): void {
  if (mode === 'plugin-off') settings.disableThinking = true;
  if (mode === 'server-default') settings.disableThinking = false;
}

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
  /** The same numbers split by `params.task`, so a run says where its time went. */
  byTask: Map<string, TaskUsage>;
}

/**
 * Subcommand dispatch. Pure function — no I/O, no logging, no side effects.
 *
 * Returning a tagged union rather than a string keeps `main()` honest: adding
 * a new command means adding a `case` here and the compiler will refuse to
 * forget it. The `unknown` case for flag-shaped first arguments is deliberate
 * — it catches `llm-wiki --vault /path` (user forgot `ingest`) and turns it
 * into a helpful error rather than letting parseArgs swallow it as ingest flags.
 */
export type Dispatch =
  | { kind: 'tool-help' }
  | { kind: 'ingest'; rest: string[] }
  | { kind: 'unknown'; command: string };

export function dispatchCli(argv: string[]): Dispatch {
  const [first] = argv;
  if (first === undefined || first === '--help' || first === '-h') return { kind: 'tool-help' };
  if (first === 'ingest') return { kind: 'ingest', rest: argv.slice(1) };
  return { kind: 'unknown', command: first };
}

// Substring used by the boundary catch in `parseCliOptions` to detect
// whether an escaping Error already carries the ingest USAGE block.
// Stable across INGEST_USAGE reformatting because it lives in the help
// text the user types.
const INGEST_USAGE_MARKER = 'llm-wiki-cli/run-llm-wiki.mjs ingest';

/**
 * Single number parser. Returns `Number(raw)` when finite and the
 * predicate accepts; otherwise throws with a flag-prefixed message that
 * uses the predicate's returned string as the reason (e.g. "must be a
 * positive integer"). The four domain-specific helpers below are
 * one-line wrappers around this — they exist only to attach the right
 * predicate and the right user-facing reason at the call site.
 */
export function parseNumber(
  raw: string,
  flagName: string,
  predicate: (n: number) => true | string,
): number {
  // Number('') and Number('  ') are both 0, so an empty or whitespace-only
  // value would silently coerce to 0 — for --max-tokens-per-call that means
  // "no cap". Reject it before coercion; JSON.stringify keeps the empty
  // value visible in the `got:` clause.
  if (!raw.trim()) throw new Error(`${flagName} must be a number, got: ${JSON.stringify(raw)}`);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${flagName} must be a number, got: ${raw}`);
  const ok = predicate(n);
  if (ok !== true) throw new Error(`${flagName} ${ok}, got: ${raw}`);
  return n;
}

function parseInteger(raw: string, flagName: string): number {
  return parseNumber(raw, flagName, n => Number.isSafeInteger(n) || 'must be an integer');
}

function parsePositiveInteger(raw: string, flagName: string): number {
  return parseNumber(raw, flagName, n => (Number.isSafeInteger(n) && n >= 1) || 'must be a positive integer');
}

function parseNonNegativeNumber(raw: string, flagName: string): number {
  return parseNumber(raw, flagName, n => (n >= 0) || 'must be a non-negative number');
}

function parseProbability(raw: string, flagName: string): number {
  return parseNumber(raw, flagName, n => (n > 0 && n <= 1) || 'must be within (0, 1]');
}

/**
 * Apply the parsed CLI overrides to the settings object and the shared
 * GRANULARITY_CONFIG table. Pure modulo the `GRANULARITY_CONFIG` write —
 * the engine itself only ever reads a copy of that table (batch-limits.ts),
 * so replacing the entry rather than mutating keeps the write local to
 * this row.
 *
 * Exported so the overrides matrix can be unit-tested without touching
 * the vault or the engine — the bulk of `runIngest`'s settings
 * hydration used to be untestable for that reason.
 */
export function applyOverrides(
  settings: LLMWikiSettings,
  options: CliOptions,
): void {
  if (options.seed !== undefined) settings.samplingSeed = options.seed;
  if (options.thinkingMode !== undefined) applyThinkingMode(settings, options.thinkingMode);
  if (options.granularity !== undefined) settings.extractionGranularity = options.granularity as ExtractionGranularity;
  if (options.temperature !== undefined) settings.extractionTemperature = options.temperature;
  if (options.topP !== undefined) settings.extractionTopP = options.topP;
  if (options.model !== undefined) settings.model = options.model;
  if (options.maxTokensPerCall !== undefined) settings.maxTokensPerCall = options.maxTokensPerCall;

  if (options.batchSize === undefined && options.roundBase === undefined) return;

  const name = settings.extractionGranularity || 'standard';
  // Same prototype-key guard as the --granularity flag path. The name here
  // comes from data.json, not the CLI, so it bypasses parseCliOptions'
  // hasOwnProperty check; a bare `GRANULARITY_CONFIG[name]` lookup would
  // accept `constructor`/`__proto__` (inherited, truthy) and shadow the
  // shared table's prototype with the patch.
  if (!Object.prototype.hasOwnProperty.call(GRANULARITY_CONFIG, name)) {
    throw new Error(`Unknown granularity in settings: ${name}`);
  }
  const config = GRANULARITY_CONFIG[name];
  const patch: Partial<typeof GRANULARITY_CONFIG[string]> = {};
  if (options.batchSize !== undefined) patch.initialBatchSize = options.batchSize;
  if (options.roundBase !== undefined) patch.maxBatchesBase = options.roundBase;
  GRANULARITY_CONFIG[name] = { ...config, ...patch };
}

export function parseCliOptions(argv: string[]): CliOptions {
  try {
    return parseCliOptionsInner(argv);
  } catch (err) {
    // Single append site for the ingest USAGE block. Anything escaping
    // parseArgs, the numeric helpers, or the inline validation throws
    // lands here; if its message does not already include INGEST_USAGE
    // — e.g. parseArgs's "Unknown option '--x'" — attach the flag list
    // so the user lands somewhere useful. The marker substring is
    // stable across INGEST_USAGE reformatting because it's the exact
    // path the user types.
    if (err instanceof Error && !err.message.includes(INGEST_USAGE_MARKER)) {
      throw new Error(`${err.message}\n\n${INGEST_USAGE}`);
    }
    throw err;
  }
}

function parseCliOptionsInner(argv: string[]): CliOptions {
  const { values } = parseArgs({
    args: argv,
    options: {
      vault: { type: 'string' },
      source: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      'extract-only': { type: 'boolean', default: false },
      seed: { type: 'string' },
      'max-tokens-per-call': { type: 'string' },
      'batch-size': { type: 'string' },
      'round-base': { type: 'string' },
      'max-rounds': { type: 'string' },
      model: { type: 'string' },
      temperature: { type: 'string' },
      'top-p': { type: 'string' },
      granularity: { type: 'string' },
      'thinking-mode': { type: 'string' },
      thinking: { type: 'string' },
      help: { type: 'boolean', default: false, short: 'h' },
    },
    allowPositionals: false,
  });

  const help = values.help === true;

  // `--help` short-circuits before the required-flag checks so a bare
  // `llm-wiki ingest --help` prints USAGE without demanding --vault/--source.
  if (help) {
    return {
      vault: '',
      source: '',
      dryRun: false,
      force: false,
      extractOnly: false,
      help: true,
    };
  }

  // Deprecation checks run before the required-flag checks so a migrating
  // script still using an old flag name learns that even when it also
  // omitted --vault/--source. `--help` already short-circuits above.
  if (values['max-rounds'] !== undefined) {
    // `--max-rounds` was the v1.25.x name. Throw rather than translate so
    // the user's script advertises the new flag explicitly; the old name
    // was misleading anyway (it sets the round base, not a ceiling).
    throw new Error(
      `--max-rounds is deprecated and will be removed in v1.26.0; use --round-base.`,
    );
  }

  if (values.thinking !== undefined) {
    // `--thinking` is the deprecated v1.25.x form. Throwing (rather than
    // silently translating) forces the user's script to advertise the new
    // name explicitly; a silent translation would let a typo like
    // `--thinking on` keep working long after the deprecation is forgotten.
    throw new Error(
      `--thinking is deprecated and will be removed in v1.26.0; ` +
      `use --thinking-mode data-json|plugin-off|server-default.`,
    );
  }

  // Required-flag checks throw plain errors. The boundary catch in `main()`
  // appends INGEST_USAGE to anything escaping parseCliOptions.
  if (!values.vault) throw new Error('--vault is required.');
  if (!values.source) throw new Error('--source is required.');

  const extractOnly = values['extract-only'] === true;

  // Numeric / string-flag parsing driven by a single spec table. Each entry
  // pairs the parseArgs option key with the helper that produces the typed
  // value; the loop below populates a result object with the same shape
  // the explicit `let X; if (values.X ...) X = helper(...)` blocks used
  // to spell out. Deprecation throws, enum validation, and the empty-model
  // guard stay inline because they don't fit the parse-a-string pattern.
  type NumericSpec = {
    key: string;
    flag: string;
    parse: (raw: string) => number;
  };
  const numericSpecs: NumericSpec[] = [
    { key: 'seed',                flag: '--seed',                parse: r => parseInteger(r, '--seed') },
    { key: 'max-tokens-per-call', flag: '--max-tokens-per-call', parse: r => parseNonNegativeNumber(r, '--max-tokens-per-call') },
    { key: 'batch-size',          flag: '--batch-size',          parse: r => parsePositiveInteger(r, '--batch-size') },
    { key: 'round-base',          flag: '--round-base',          parse: r => parsePositiveInteger(r, '--round-base') },
    { key: 'temperature',         flag: '--temperature',         parse: r => parseNonNegativeNumber(r, '--temperature') },
    { key: 'top-p',               flag: '--top-p',               parse: r => parseProbability(r, '--top-p') },
  ];
  const numericValues: Record<string, number> = {};
  for (const { key, parse } of numericSpecs) {
    if (values[key] !== undefined) numericValues[key] = parse(String(values[key]));
  }

  let granularity: string | undefined;
  if (values.granularity !== undefined) {
    const g = String(values.granularity);
    // Object.prototype.hasOwnProperty.call (not `g in GRANULARITY_CONFIG` or
    // bare `GRANULARITY_CONFIG[g]`) rejects prototype keys like `constructor`,
    // `toString`, `__proto__` — a plain object literal inherits all of them,
    // and bare-property lookup accepts them. The .call form avoids needing
    // ES2022's `Object.hasOwn` in the lib config (tools tsconfig extends
    // root, which only ships DOM + ES2021).
    if (!Object.prototype.hasOwnProperty.call(GRANULARITY_CONFIG, g)) {
      throw new Error(`Unknown granularity: ${g}. Known: ${Object.keys(GRANULARITY_CONFIG).join(', ')}`);
    }
    granularity = g;
  }

  let thinkingMode: ThinkingModeValue | undefined;
  if (values['thinking-mode'] !== undefined) {
    const tm = String(values['thinking-mode']) as ThinkingModeValue;
    if (tm !== 'data-json' && tm !== 'plugin-off' && tm !== 'server-default') {
      throw new Error(
        `--thinking-mode must be one of data-json, plugin-off, server-default; got: ${tm}`,
      );
    }
    thinkingMode = tm;
  }

  let model: string | undefined;
  if (values.model !== undefined) {
    const m = String(values.model);
    if (!m.trim()) throw new Error('--model must not be empty.');
    model = m.trim();
  }

  return {
    // Both are validated as present just above; `parseArgs` types every value
    // as string-or-boolean because a flag declared `string` can still appear
    // bare on the command line.
    vault: nodePath.resolve(String(values.vault)),
    source: String(values.source),
    // Extraction alone never writes, and a run that cannot write must not be
    // able to touch the vault by forgetting a second flag.
    dryRun: values['dry-run'] === true || extractOnly,
    force: values.force === true,
    extractOnly,
    ...(numericValues.seed !== undefined ? { seed: numericValues.seed } : {}),
    ...(numericValues['max-tokens-per-call'] !== undefined
      ? { maxTokensPerCall: numericValues['max-tokens-per-call'] }
      : {}),
    ...(numericValues['batch-size'] !== undefined ? { batchSize: numericValues['batch-size'] } : {}),
    ...(numericValues['round-base'] !== undefined ? { roundBase: numericValues['round-base'] } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(numericValues.temperature !== undefined ? { temperature: numericValues.temperature } : {}),
    ...(numericValues['top-p'] !== undefined ? { topP: numericValues['top-p'] } : {}),
    ...(granularity !== undefined ? { granularity } : {}),
    ...(thinkingMode !== undefined ? { thinkingMode } : {}),
    help,
  };
}

function loadSettings(vaultRoot: string): LLMWikiSettings {
  const dataPath = nodePath.join(vaultRoot, '.obsidian', 'plugins', PLUGIN_ID, 'data.json');
  const raw = readFileSync(dataPath, 'utf8');
  const savedData = JSON.parse(raw) as Partial<LLMWikiSettings> | null;
  const { settings } = applySettingsMigrations(savedData);
  return settings;
}

export function resolveApiKey(
  provider: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = (env[API_KEY_ENV] ?? '').trim();
  // Local no-key providers accept an empty key, so missing env is not an error
  // for them — it just means the client will send no Authorization header.
  if (raw) return raw;
  if (isLocalNoKeyProvider(provider)) return '';
  throw new Error(
    `No API key available for provider "${provider}".\n\n` +
    `Obsidian stores the API key in the OS keychain (SecretStorage) so the ` +
    `plugin can read it at runtime, but Node cannot reach the keychain from ` +
    `a headless process. Copy the key into the ${API_KEY_ENV} environment ` +
    `variable before running the CLI:\n\n` +
    `  macOS:   ${API_KEY_ENV}=$(security find-generic-password -s "obsidian-lw-plugin-karpathywiki" -w) llm-wiki ingest ...\n` +
    `  Windows: Open Credential Manager → Windows Credentials → find the entry ` +
    `named "obsidian-lw-plugin-karpathywiki" → Show → copy the password, ` +
    `then set ${API_KEY_ENV} in PowerShell ($env:${API_KEY_ENV} = "sk-...").\n` +
    `  Linux:   Reveal via your keyring GUI (e.g. seahorse) or via ` +
    `"secret-tool lookup service obsidian-lw-plugin-karpathywiki" (libsecret).\n\n` +
    `For local providers that do not need a real key (ollama, lmstudio) any ` +
    `non-empty placeholder works (e.g. ${API_KEY_ENV}=unused).`,
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
    // Timed around the whole call, not inside onFinish: a call that throws still
    // spent the time, and leaving it out would flatter whichever step fails.
    return done.finally(() => { bucket.millis += Date.now() - startedAt; });
  };
  return accounting;
}

/**
 * Where an ingest spent itself, per pipeline step. A single total cannot say
 * that: the ten call sites of an ingest have different shapes — extraction
 * writes long replies over a long prompt and is decode-bound, dedup answers in
 * a dozen tokens over a page list and is prefill-bound — and tuning one of them
 * against a single number is guesswork.
 *
 * Seconds are summed per call, so concurrent page generation double-counts
 * against the wall clock. The share column is the honest one; compare it.
 */
function printTimeByStep(totals: LLMUsageTotals): void {
  if (totals.byTask.size === 0) return;
  console.log('');
  console.log('=== Where the time went ===');
  console.log('  step               calls   out tok    seconds   share');
  const rows = [...totals.byTask.entries()].sort((a, b) => b[1].millis - a[1].millis);
  const wall = rows.reduce((sum, [, usage]) => sum + usage.millis, 0) || 1;
  for (const [name, usage] of rows) {
    console.log(
      `  ${name.padEnd(18)} ${String(usage.calls).padStart(5)}`
      + ` ${String(usage.outputTokens).padStart(9)}`
      + ` ${(usage.millis / 1000).toFixed(1).padStart(10)}`
      + ` ${(100 * usage.millis / wall).toFixed(0).padStart(6)}%`);
  }
}

function resolveSourceFile(app: ReturnType<typeof createVaultApp>, sourcePath: string): TFile {
  const path = normalizePath(sourcePath);
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) return file;
  throw new Error(`Source not found in vault index: ${path}`);
}

function printWriteLog(writes: VaultWriteRecord[]): void {
  const pageWrites = writes.filter(write => write.action !== 'mkdir');
  if (pageWrites.length === 0) {
    console.log('  (no file writes)');
    return;
  }
  for (const write of pageWrites) {
    console.log(`  ${write.action.padEnd(6)} ${write.path}`);
  }
}

function printSummary(
  options: CliOptions,
  report: IngestReport | null,
  totals: LLMUsageTotals,
  writes: VaultWriteRecord[],
  elapsedMs: number,
): void {
  console.log('');
  console.log(options.dryRun ? '=== Dry run: writes that were withheld ===' : '=== Writes ===');
  printWriteLog(writes);

  console.log('');
  console.log('=== Summary ===');
  if (options.extractOnly) {
    console.log('  extract-only      page generation was skipped');
  } else if (!report) {
    console.log('  no ingest report was emitted (the engine returned before onDone)');
  } else {
    console.log(`  source            ${report.sourceFile}`);
    console.log(`  success           ${report.success}`);
    if (report.skipped) console.log(`  skipped           ${JSON.stringify(report.rejectedFiles ?? [])}`);
    if (report.errorMessage) console.log(`  error             ${report.errorMessage}`);
    console.log(`  new entity pages  ${report.entitiesCreated}`);
    console.log(`  new concept pages ${report.conceptsCreated}`);
    console.log(`  pages created     ${report.createdPages.length}`);
    console.log(`  pages updated     ${report.updatedPages.length}`);
    console.log(`  contradictions    ${report.contradictionsFound}`);
    console.log(`  failed items      ${report.failedItems.length}`);
  }
  console.log(`  extraction rounds ${totals.extractionRounds}`);
  console.log(`  llm calls         ${totals.calls}`);
  console.log(`  tokens in         ${totals.inputTokens}`);
  console.log(`  tokens out        ${totals.outputTokens}`);
  printTimeByStep(totals);
  console.log(`  elapsed           ${(elapsedMs / 1000).toFixed(1)}s`);
}

async function runIngest(argv: string[]): Promise<void> {
  const options = parseCliOptions(argv);
  if (options.help) {
    console.log(INGEST_USAGE);
    return;
  }

  await installObsidianGlobals();

  // A nonexistent vault is the most common first-run mistake; surface it as a
  // CLI message instead of the raw Node ENOENT stack. The "not a directory"
  // branch below already had one.
  let vaultStat: Stats;
  try {
    vaultStat = statSync(options.vault);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`--vault does not exist: ${options.vault}`);
    }
    throw err;
  }
  if (!vaultStat.isDirectory()) {
    throw new Error(`--vault is not a directory: ${options.vault}`);
  }

  const settings = loadSettings(options.vault);
  settings.apiKey = resolveApiKey(settings.provider);
  applyOverrides(settings, options);

  const app = createVaultApp(options.vault, options.dryRun);
  const sourceFile = resolveSourceFile(app, options.source);

  await preloadLLMClientModules();
  const totals: LLMUsageTotals = {
    calls: 0, extractionRounds: 0, inputTokens: 0, outputTokens: 0, byTask: new Map(),
  };
  const client = withUsageAccounting(createLLMClient(settings), totals);
  const getClient = (): LLMClient => client;

  // The shim implements the surface the engine touches — vault, metadataCache,
  // fileManager — and nothing else. `App` also declares the workspace, the
  // keymap and six more members that only exist inside a running Obsidian, and
  // a headless run reaches none of them.
  const engineApp = app as unknown as App;
  const schemaManager = new SchemaManager(engineApp, settings, getClient);

  let report: IngestReport | null = null;
  const engine = new WikiEngine(
    engineApp,
    settings,
    getClient,
    schemaManager,
    path => console.log(`[write] ${path}`),
    message => console.log(`[progress] ${message}`),
    finished => { report = finished; },
    // Node 18+ exposes `crypto` as a global; the explicit `globalThis` prefix
    // is what trips `obsidianmd/no-global-this` in the review bot. Bare `crypto`
    // has the same runtime behaviour and dodges the rule.
    crypto.subtle,
  );

  console.log(`[cli] vault=${options.vault}`);
  console.log(`[cli] source=${sourceFile.path}`);
  console.log(`[cli] provider=${settings.provider} model=${settings.model} baseUrl=${settings.baseUrl}`);
  // Every knob that decides how the model answers, printed once per run. A log
  // that does not say what it was configured with cannot be compared against
  // another log later, and two of this session's comparisons died on exactly
  // that — arms that turned out to differ by something no line recorded.
  console.log(`[cli] dry-run=${options.dryRun} force=${options.force}`
    + ` model=${settings.model} thinking-mode=${options.thinkingMode ?? 'unset'}`
    + ` temp=${settings.extractionTemperature ?? 'server default'} top-p=${settings.extractionTopP ?? 'server default'}`
    + ` seed=${settings.samplingSeed ?? 'random'} max-tokens=${settings.maxTokensPerCall || 'uncapped'}`
    + ` batch=${options.batchSize ?? 'default'} round-base=${options.roundBase ?? 'default'}`
    + ` granularity=${settings.extractionGranularity}`);

  const startedAt = Date.now();
  try {
    if (options.extractOnly) {
      await runExtractionOnly(engine, sourceFile);
    } else {
      await engine.ingestSource(sourceFile, {
        interactive: false,
        ...(options.force ? { forceReingest: true } : {}),
      });
    }
  } finally {
    printSummary(options, report, totals, app.vault.writes, Date.now() - startedAt);
  }
}

export async function main(argv: string[]): Promise<void> {
  const d = dispatchCli(argv);
  switch (d.kind) {
    case 'tool-help':
      console.log(TOOL_USAGE);
      return;
    case 'ingest':
      return runIngest(d.rest);
    case 'unknown': {
      // First arg is flag-shaped: the user almost certainly typed a flag at
      // the tool level and forgot `ingest`. Surface a hint rather than the
      // generic "unknown command" error.
      const hint = d.command.startsWith('-')
        ? `(did you forget \`ingest\`? try \`llm-wiki ingest ${argv.join(' ')}\`)`
        : '';
      throw new Error(`Unknown command: ${d.command}${hint ? ' ' + hint : ''}\n\n${TOOL_USAGE}`);
    }
  }
}

/**
 * Run the extraction loop and stop, skipping page generation.
 *
 * Page generation is one LLM call per page and dominates a full ingest — on a
 * 135K-character source, 3 extraction rounds against 226 page calls. Tuning the
 * extraction loop paid for all of that on every measurement.
 *
 * The analyzer is reached through the engine rather than constructed here so it
 * runs with the engine's own EngineContext — the same schema context, system
 * prompt and tag vocabulary a real ingest would use. Reproducing that context in
 * the CLI would make the measurement describe the CLI instead of the plugin.
 */
async function runExtractionOnly(engine: WikiEngine, sourceFile: TFile): Promise<void> {
  const analysis = await engine.runExtractionOnly(sourceFile);

  console.log('');
  console.log('=== Extraction ===');
  if (!analysis) {
    console.log('  the analyzer returned nothing (blank source, or round 1 was unusable)');
    return;
  }
  console.log(`  title             ${analysis.source_title}`);
  console.log(`  entities          ${analysis.entities.length}`);
  console.log(`  concepts          ${analysis.concepts.length}`);
  console.log(`  key points        ${analysis.key_points.length}`);
  console.log(`  contradictions    ${analysis.contradictions.length}`);
  console.log(`  entity names      ${analysis.entities.map(e => e.name).join(', ')}`);
  console.log(`  concept names     ${analysis.concepts.map(c => c.name).join(', ')}`);
}
