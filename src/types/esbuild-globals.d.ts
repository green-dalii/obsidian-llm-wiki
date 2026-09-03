// esbuild-globals.d.ts — declarations for build-time-injected constants.
// esbuild.config.mjs reads pdfjs-dist's worker source and injects it as
// the global `__PDFJS_WORKER_SOURCE__` via esbuild's `define` option.
// This file tells the TS type-checker that the global is a string so
// `pdf-converter.ts` compiles cleanly without a `// @ts-expect-error`.

declare const __PDFJS_WORKER_SOURCE__: string;