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
  {
    ignores: [
      "main.js",
      "node_modules/",
      // Test files are excluded from local lint to mirror the Obsidian
      // Bot review pipeline — Bot inspects only `main.js` (the bundled
      // production code path), which is built from `src/` excluding test
      // files. Test-side lint warnings therefore do not block release.
      // Each entry below has a documented user direction:
      //   - src/**/__tests__/** — test files (Direction v1.25.4)
      //   - src/**/__support__/** — test polyfills (Direction v1.25.4)
      //   - src/**/fixtures/** — fixture wikis (Direction v1.25.4)
      //   - src/**/*.test.ts / src/**/*.spec.ts — top-level test files (Direction v1.25.4)
      "src/**/__tests__/**",
      "src/**/__support__/**",
      "src/**/fixtures/**",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
    ],
  },
];