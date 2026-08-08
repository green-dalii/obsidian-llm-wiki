// Reports the warnings the Obsidian review bot will surface on `tools/` —
// the local Gate 1 (`pnpm lint` = `eslint src/`) is blind to `tools/` while
// the bot scans the whole repo `.ts` tree. This is an **informational** scan:
// it does not gate anything (`pnpm lint:tools-bot` always exits 0 via
// `|| true` in the package script). Run it during development / pre-release
// to see what the bot will flag BEFORE submitting.
//
// Background: the v1.26.1 release shipped a blocking `unsafe-call` Error in
// `tools/llm-wiki-cli/src/obsidian.ts` that local lint could not see (root
// tsconfig includes only `src/**`, so even `parserOptions.project` had no type
// context for tools/). This config closes that blind spot for the CLI tree.
//
// Design notes:
// - Uses `tools/llm-wiki-cli/tsconfig.json` as the type context (the root
//   tsconfig includes only `src/**`).
// - Reuses the project's `obsidianmd` recommended ruleset so the output
//   matches the bot's `obsidianmd/no-nodejs-modules`, `no-global-this`,
//   `hardcoded-config-path` and `rule-custom-message` checks.
// - Declares Node globals (process, Buffer, __filename, console) so the scan
//   is noise-free on `no-undef` — those are real Node globals, not defects.
// - Known structural warnings on tools/ are ACCEPTED (the CLI is a Node
//   program): static `node:*` imports, the `console.log` output interface,
//   the `globalThis` shim, the `.obsidian` literal. See CLAUDE.md "Bot
//   compliance invariant" + [[feedback_obsidian_bot_tools_cli_warnings]].
import tsparser from "@typescript-eslint/parser";
import tsplugin from "@typescript-eslint/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";

// Node globals the CLI actually references. Avoids `no-undef` noise so the
// report surfaces the Bot-relevant rules instead of missing-global churn.
const NODE_GLOBALS = {
  process: "readonly",
  Buffer: "readonly",
  __filename: "readonly",
  __dirname: "readonly",
  console: "readonly",
  globalThis: "readonly",
  URL: "readonly",
  TextDecoder: "readonly",
  crypto: "readonly",
  fetch: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  queueMicrotask: "readonly",
  setImmediate: "readonly",
  AbortController: "readonly",
  MessageChannel: "readonly",
  // `NodeJS.ErrnoException` — the @types/node global namespace; TS resolves
  // it via `types: ["node"]` in tools/tsconfig.json, ESLint's no-undef does
  // not. Declaring it keeps the scan noise-free (Bot has it in its env).
  NodeJS: "readonly",
};

export default [
  ...obsidianmd.configs.recommended,
  {
    files: ["tools/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tools/llm-wiki-cli/tsconfig.json",
      },
      globals: NODE_GLOBALS,
    },
    plugins: {
      "@typescript-eslint": tsplugin,
    },
    rules: {
      ...tsplugin.configs.recommended.rules,
    },
  },
];
