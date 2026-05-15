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
    rules: {
      // Obsidian Bot enforces window.* timers (conflicts with local plugin's prefer-active-window-timers).
      // Using window.* satisfies both local lint and bot review.
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.object.name='activeWindow'][callee.property.name=/^(setTimeout|setInterval|clearTimeout|clearInterval)$/]",
          message: "Use window.setTimeout/window.clearInterval instead of activeWindow.* — Obsidian Bot requires window.*",
        },
      ],
    },
  },
  {
    ignores: ["main.js", "node_modules/"],
  },
];
