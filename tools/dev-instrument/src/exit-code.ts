// Exit contract of the UPSTREAM DEV-ONLY INSTRUMENT (Issue #417 secondary,
// split out of PR #418 as its own decision).
//
// Before this module the process exit code was whatever the last throw
// decided: a failed ingest exited 1 only because `WikiEngine.ingestSource`
// rethrows after it has already handed `onDone` a `success: false` report,
// while a run that ended without a report, or was started without
// arguments, exited 0. The report's own `success` field — the signal the
// summary prints — was never consulted. A script that branches on `$?`
// needs the report to decide, not the accident of a rethrow.
import type { IngestReport } from '../../../src/types';

/** The engine reported `success: true`. A requirements-gate skip (empty,
 *  unsupported type, duplicate) is reported by the engine as success +
 *  `skipped` and stays 0 — the summary names the skip. */
export const EXIT_OK = 0;
/** The engine reported `success: false`, returned without a report, or the
 *  run threw (before or inside the engine). */
export const EXIT_INGEST_FAILED = 1;
/** `<vault> <source>` not given. */
export const EXIT_USAGE = 2;

export function exitCodeForReport(report: IngestReport | null): number {
  return report !== null && report.success ? EXIT_OK : EXIT_INGEST_FAILED;
}
