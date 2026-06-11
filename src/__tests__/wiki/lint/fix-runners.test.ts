import { describe, it, expect, vi } from 'vitest';
import { Notice, TFile } from 'obsidian';
import { runAliasCompletion, runDeadLinkFixes, runEmptyPageFixes, runOrphanFixes, runDuplicateMerges, runRetagViolations } from '../../../wiki/lint/fix-runners';
import type { LintContext } from '../../../wiki/lint-controller';

// NoticeMock in setup.ts adds a static `instances` array. Cast the imported
// Notice to access the mock-side field for test introspection.
const NoticeMock = Notice as unknown as {
  instances: Array<{ message: string; hidden: boolean }>;
};

// Minimal LintContext mock — only the fields used by the cancellation check.
// Returns LintContext via a single final cast to avoid sprinkling `as any` everywhere.
const makeCtx = (overrides: Partial<LintContext> = {}): LintContext => {
  const base: Partial<LintContext> = {
    app: { vault: { adapter: { write: vi.fn().mockResolvedValue(undefined) } } } as unknown as LintContext['app'],
    settings: {
      wikiFolder: 'wiki',
      language: 'en',
      pageGenerationConcurrency: 1,
      batchDelayMs: 0,
      model: 'test-model',
    } as unknown as LintContext['settings'],
    llmClient: { createMessage: vi.fn() } as unknown as LintContext['llmClient'], // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
    wikiEngine: {
      fixDeadLink: vi.fn().mockResolvedValue('ok'),
      fillEmptyPage: vi.fn().mockResolvedValue('expanded'),
      linkOrphanPage: vi.fn().mockResolvedValue(['wiki/OtherPage']),
      mergeDuplicatePages: vi.fn().mockResolvedValue('merged'),
      updateStatusBar: vi.fn(),
    } as unknown as LintContext['wikiEngine'],
    onAnalyzeSchema: vi.fn(),
  };
  return { ...base, ...overrides } as unknown as LintContext;
};

// ── Cancellation propagation (Issue #94) ──────────────────────────
// Status bar "click to cancel" already exists, but the fix-runner
// functions in this module never received the AbortSignal. Each
// runner must check `signal.aborted` at entry AND inside its loop.

describe('fix-runners — AbortSignal propagation', () => {
  const expectAbort = (promise: Promise<unknown>) =>
    expect(promise).rejects.toMatchObject({ name: 'AbortError' });

  it('runAliasCompletion aborts when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeCtx();
    await expectAbort(
      runAliasCompletion(ctx, controller.signal, [
        { path: 'wiki/a.md', content: '---\n---\nbody', basename: 'a' },
      ])
    );
  });

  it('runDeadLinkFixes aborts when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeCtx();
    await expectAbort(
      runDeadLinkFixes(ctx, controller.signal, [{ source: 'a', target: 'missing' }])
    );
  });

  it('runEmptyPageFixes aborts when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeCtx();
    await expectAbort(
      runEmptyPageFixes(ctx, controller.signal, [{ path: 'wiki/a.md', content: '' }])
    );
  });

  it('runOrphanFixes aborts when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeCtx();
    await expectAbort(
      runOrphanFixes(ctx, controller.signal, ['wiki/a.md'])
    );
  });

  it('runDuplicateMerges aborts when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeCtx();
    await expectAbort(
      runDuplicateMerges(ctx, controller.signal, [{ target: 'a', source: 'b', reason: 'dup' }])
    );
  });

  it('runDeadLinkFixes stops mid-loop when signal aborts', async () => {
    const ctx = makeCtx();
    const controller = new AbortController();
    let callCount = 0;
    const wikiEngine = ctx.wikiEngine as unknown as {
      fixDeadLink: (sourcePath: string, target: string) => Promise<string>;
    };
    wikiEngine.fixDeadLink = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) controller.abort();
      return 'ok';
    });
    const links = Array.from({ length: 10 }, (_, i) => ({ source: `s${i}`, target: `t${i}` }));
    await expectAbort(runDeadLinkFixes(ctx, controller.signal, links));
    // Should have stopped after first call (which triggered abort)
    expect(callCount).toBeLessThan(10);
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  it('fix-runners work normally when no signal provided (backward compat)', async () => {
    const ctx = makeCtx();
    const result = await runDeadLinkFixes(ctx, undefined, [
      { source: 'a', target: 'missing' },
    ]);
    expect(result.fixed).toBeGreaterThanOrEqual(0);
  });

  // Simplify Phase 1.3: fixNotice.hide() must run even on AbortError,
  // otherwise a permanent Notice('', 0) is left on the status bar.
  it('runDeadLinkFixes hides the fixNotice when signal aborts mid-loop', async () => {
    const ctx = makeCtx();
    const controller = new AbortController();
    NoticeMock.instances.length = 0;
    let callCount = 0;
    const wikiEngine = ctx.wikiEngine as unknown as {
      fixDeadLink: (sourcePath: string, target: string) => Promise<string>;
    };
    wikiEngine.fixDeadLink = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) controller.abort();
      return 'ok';
    });
    const links = Array.from({ length: 10 }, (_, i) => ({ source: `s${i}`, target: `t${i}` }));
    await expectAbort(runDeadLinkFixes(ctx, controller.signal, links));
    // The most recently created Notice should have been hidden
    const lastNotice = NoticeMock.instances[NoticeMock.instances.length - 1];
    expect(lastNotice?.hidden).toBe(true);
  });

  it('runEmptyPageFixes does not create a fixNotice when signal aborts at entry', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeCtx();
    NoticeMock.instances.length = 0;
    await expectAbort(
      runEmptyPageFixes(ctx, controller.signal, [{ path: 'wiki/a.md', content: '' }])
    );
    // Entry-aborted means no work — no fixNotice should have been created
    // (avoids a stuck persistent Notice on the status bar).
    expect(NoticeMock.instances).toHaveLength(0);
  });
});

// ── runRetagViolations (Issue #85 v7) ───────────────────────────

import type { TagViolation } from '../../../wiki/lint/scanners';

describe('runRetagViolations (Issue #85 v7)', () => {
  const baseViolation: TagViolation = {
    path: 'wiki/entities/Alice.md',
    pageType: 'entity',
    title: 'Alice',
    currentTags: ['person', 'bogus', 'Medical_Arzneimittel'],
    invalidTags: ['bogus', 'Medical_Arzneimittel'],
  };

  function makeRetagCtx(opts: {
    fileContent?: string | null;
    llmResponse?: string;
  }): LintContext {
    const content = opts.fileContent !== undefined
      ? opts.fileContent
      : '---\ntype: entity\ntitle: Alice\ntags: [person, bogus, Medical_Arzneimittel]\n---\n\nBody of Alice.';
    // The mock below must mirror the real Obsidian TFile + Vault
    // shape: TFile does NOT have a `.read()` method — content is read
    // via `vault.read(file: TFile)`. Earlier versions of this test
    // mocked the wrong shape (a `{ path, read }` object) and the
    // production code at the time called `tfile.read()` — both sides
    // were wrong together, a textbook shell test. The fix below
    // uses `vault.read(file)` so the test exercises the same call
    // pattern the production code now uses (which is also the
    // correct Obsidian API). The regression guard in 'TFile mock
    // matches real Obsidian shape' below ensures this cannot
    // regress by checking that the mock has a `path` and that
    // `vault.read` is wired to return the file content.
    const realTFileMock = Object.assign(new TFile(), {
      path: baseViolation.path,
      basename: baseViolation.path.split('/').pop() || '',
      extension: 'md',
      stat: { ctime: 0, mtime: 0, size: (content ?? '').length },
    });
    return makeCtx({
      app: {
        vault: {
          adapter: { write: vi.fn().mockResolvedValue(undefined) },
          getAbstractFileByPath: vi.fn().mockReturnValue(
            opts.fileContent === null ? null : realTFileMock
          ),
          read: vi.fn().mockImplementation(async (f: { path: string }) => {
            // Reject any caller that passes a TFile-look-alike with
            // its own .read() — the API surface is `vault.read(file)`.
            if (typeof (f as { read?: unknown }).read === 'function') {
              throw new Error('TFile.read is not a function (real Obsidian API)');
            }
            return f.path === realTFileMock.path ? content : null;
          }),
        },
      } as unknown as LintContext['app'],
      llmClient: { createMessage: vi.fn().mockResolvedValue(opts.llmResponse ?? '{"tags":["person","organization"]}') } as unknown as LintContext['llmClient'],
    });
  }

  it('throws DOMException when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeRetagCtx({});
    await expect(
      runRetagViolations(ctx, controller.signal, [baseViolation])
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns 0 fixed when LLM client is null', async () => {
    const ctx = makeCtx({ llmClient: null });
    const result = await runRetagViolations(ctx, undefined, [baseViolation]);
    expect(result.fixed).toBe(0);
    expect(result.results[0]).toContain('LLM client not initialized');
  });

  it('rewrites frontmatter tags via LLM response (happy path)', async () => {
    const ctx = makeRetagCtx({});
    const writeSpy = (ctx.app.vault.adapter as unknown as { write: ReturnType<typeof vi.fn> }).write;
    const result = await runRetagViolations(ctx, undefined, [baseViolation]);
    expect(result.fixed).toBe(1);
    expect(result.results[0]).toContain('Alice.md');
    // Verify write was called with updated tags: line
    const writtenContent = writeSpy.mock.calls[0][1] as string;
    expect(writtenContent).toContain('tags: [person, organization]');
    // body is preserved
    expect(writtenContent).toContain('Body of Alice.');
  });

  it('filters LLM-returned tags not in active vocabulary (defensive)', async () => {
    // LLM hallucinates "bogus" and "Medical_Arzneimittel" — both are
    // out-of-vocab, so they must be filtered out. The runner
    // explicitly re-validates against validVocab before writing.
    const ctx = makeRetagCtx({
      llmResponse: '{"tags":["person","bogus","Medical_Arzneimittel"]}',
    });
    const writeSpy = (ctx.app.vault.adapter as unknown as { write: ReturnType<typeof vi.fn> }).write;
    const result = await runRetagViolations(ctx, undefined, [baseViolation]);
    expect(result.fixed).toBe(1);
    const writtenContent = writeSpy.mock.calls[0][1] as string;
    // Only the in-vocab tag survives the filter.
    expect(writtenContent).toContain('tags: [person]');
    expect(writtenContent).not.toContain('bogus');
  });

  it('does not write when LLM returns empty tags (safety)', async () => {
    const ctx = makeRetagCtx({ llmResponse: '{"tags":[]}' });
    const writeSpy = (ctx.app.vault.adapter as unknown as { write: ReturnType<typeof vi.fn> }).write;
    const result = await runRetagViolations(ctx, undefined, [baseViolation]);
    expect(result.fixed).toBe(0);
    expect(writeSpy).not.toHaveBeenCalled();
    expect(result.results[0]).toContain('LLM kept no tags');
  });

  // ── Regression guard (Issue #85 v7.7) ─────────────────────────
  // Earlier commit (ebf58f2) shipped with a SHELL TEST: the mock
  // provided `{ path, read }` and the production code called
  // `tfile.read()`. Both sides were wrong together — neither
  // matched the real Obsidian TFile + Vault API. The user's "Retag"
  // button blew up at runtime with "tfile.read is not a function"
  // because TFile extends TAbstractFile which has NO read() method.
  // The fix (vault.read(file)) is exercised below. If a future PR
  // reverts the production call OR the mock, this test fails loudly.

  it('reads via vault.read(file), NOT tfile.read() (TFile has no read method)', async () => {
    // Spy on vault.read to confirm the production code calls it
    // with the TFile, not the legacy tfile.read() pattern.
    const readSpy = vi.fn().mockImplementation(async (f: { path: string }) => f.path);
    const ctx = makeRetagCtx({});
    // Replace the makeRetagCtx mock's vault.read with our spy so we
    // can assert how the production code called it.
    (ctx.app.vault as unknown as { read: typeof readSpy }).read = readSpy;
    await runRetagViolations(ctx, undefined, [baseViolation]);
    expect(readSpy).toHaveBeenCalled();
    // The argument must be a TFile-shaped object, NOT a TFile with
    // its own read method (TFile has no read method).
    const arg = readSpy.mock.calls[0][0] as { path: string; read?: unknown };
    expect(arg.path).toBe(baseViolation.path);
    expect(arg.read).toBeUndefined(); // TFile has no read method
  });

  it('emits console.error with full error context on per-page failure', async () => {
    // Earlier commit only emitted a Notice with the message, no
    // console.error, so the user had no DevTools diagnostics when
    // retag failed. v7.7 fixes this: every per-page error must
    // log to console.error with the full Error object (including
    // stack) AND a path/pageType prefix.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ctx = makeRetagCtx({ llmResponse: '{not valid json' });
    // Force an error: make vault.read throw
    (ctx.app.vault as unknown as { read: () => Promise<string> }).read = vi
      .fn()
      .mockRejectedValue(new Error('simulated vault failure'));
    const result = await runRetagViolations(ctx, undefined, [baseViolation]);
    expect(result.fixed).toBe(0);
    // console.error must have been called with the path + pageType
    // and the Error object (so DevTools shows the full stack).
    expect(errSpy).toHaveBeenCalled();
    const firstCallArgs = errSpy.mock.calls[0];
    // The first arg is the formatted log string containing the
    // path + pageType for context.
    expect(String(firstCallArgs[0])).toContain(baseViolation.path);
    expect(String(firstCallArgs[0])).toContain(baseViolation.pageType);
    // The second arg is the Error object itself.
    expect(firstCallArgs[1]).toBeInstanceOf(Error);
    errSpy.mockRestore();
  });
});
