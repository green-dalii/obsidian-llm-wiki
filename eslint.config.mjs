import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
  // Test environment override (v1.25.2 PATCH, 0.4.1 upgrade).
  // Goal: in test-supporting files, relax the eslint-comments meta-rules
  // so existing per-file `eslint-disable` directives continue to work
  // without adding `-- 描述` to every one. We also turn off
  // `reportUnusedInlineConfigs` so historical disable lines that have
  // been neutralized by our flat-config overrides do not raise
  // 'unused eslint-disable' errors. Production code outside this
  // override is unaffected.
  {
    files: [
      "src/**/__tests__/**",
      "src/**/__support__/**",
      "src/**/fixtures/**",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
    ],
    rules: {
      // Permits disabling rules that the obsidianmd recommended config
      // otherwise forbids via no-restricted-disable.
      "eslint-comments/no-restricted-disable": "off",
      // Permits `eslint-disable` directives without an inline `-- 描述`.
      "eslint-comments/require-description": "off",
      // Permit dangling `/* eslint-disable ... */` without a matching
      // `eslint-enable` (common in standalone eval scripts).
      "eslint-comments/disable-enable-pair": "off",
      // Silence 'unused eslint-disable' for directives that are no longer
      // suppressing the rule they reference (rule has been turned off or
      // the violation no longer reproduces). These are documentation
      // archaeology; treating them as errors is unnecessary friction.
      "eslint-comments/no-unused-disable": "off",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    ignores: ["main.js", "node_modules/"],
  },
];
