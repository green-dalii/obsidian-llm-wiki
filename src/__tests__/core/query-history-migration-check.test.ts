// Tests for the gradual-migration detection (Bug C 3.4 / plan C).
//
// Pre-v1.24.0 history entries contain real wikiFolder prefixes in
// `[[folder/...]]` wiki-links. detectStaleWikiFolders should report them
// so main.onload can prompt the user to Clear history.

import { describe, it, expect } from 'vitest';
import { detectStaleWikiFolders } from '../../core/query-history-migration-check';
import { WIKI_FOLDER_PLACEHOLDER } from '../../core/prompt-builders';

// We use a minimal `{ role, content }` shape rather than the full
// QueryHistoryMessage because detectStaleWikiFolders only reads .content
// — keeping the fixtures trim means a future schema addition (timestamp,
// retrieval, etc.) won't force test updates.
type MinimalMessage = { role: 'user' | 'assistant'; content: string };

describe('detectStaleWikiFolders', () => {
  it('returns null for empty history', () => {
    expect(detectStaleWikiFolders([], 'wiki')).toBeNull();
  });

  it('returns null when history has no wiki-links', () => {
    const history: MinimalMessage[] = [
      { role: 'user', content: 'What is LLM?' },
      { role: 'assistant', content: 'A large language model is...' },
    ];
    expect(detectStaleWikiFolders(history, 'wiki')).toBeNull();
  });

  it('returns null when history contains only the placeholder', () => {
    const history: MinimalMessage[] = [
      {
        role: 'assistant',
        content: `See [[${WIKI_FOLDER_PLACEHOLDER}/entities/llm|LLM]] for details.`,
      },
    ];
    expect(detectStaleWikiFolders(history, 'wiki')).toBeNull();
  });

  it('returns folders + hasStale=true when old folder differs from current', () => {
    const history: MinimalMessage[] = [
      { role: 'assistant', content: 'See [[test3/entities/foo|Foo]] for context.' },
      { role: 'assistant', content: 'And [[test3/concepts/bar|Bar]] is relevant.' },
    ];
    const result = detectStaleWikiFolders(history, 'mywiki');
    expect(result).toEqual({ folders: ['test3'], hasStale: true });
  });

  it('returns hasStale=false when detected folder matches current wikiFolder', () => {
    const history: MinimalMessage[] = [
      { role: 'assistant', content: 'See [[mywiki/entities/foo|Foo]].' },
    ];
    const result = detectStaleWikiFolders(history, 'mywiki');
    // The user's current folder is reflected in the link (e.g. LLM echoed
    // the prompt template). This is "current" not "stale" — no notice.
    expect(result).toEqual({ folders: ['mywiki'], hasStale: false });
  });

  it('detects the default wiki folder as NOT stale when wikiFolder is also wiki', () => {
    const history: MinimalMessage[] = [
      { role: 'assistant', content: 'See [[wiki/entities/foo|Foo]].' },
    ];
    const result = detectStaleWikiFolders(history, 'wiki');
    expect(result).toEqual({ folders: ['wiki'], hasStale: false });
  });

  it('detects multiple distinct old folders', () => {
    const history: MinimalMessage[] = [
      { role: 'assistant', content: '[[test3/entities/a]]' },
      { role: 'assistant', content: '[[oldfolder/concepts/b]]' },
    ];
    const result = detectStaleWikiFolders(history, 'mywiki');
    expect(result?.hasStale).toBe(true);
    expect(result?.folders.sort()).toEqual(['oldfolder', 'test3']);
  });

  it('ignores links without a folder prefix (e.g. [[entities/foo]])', () => {
    const history: MinimalMessage[] = [
      { role: 'assistant', content: 'See [[entities/foo|Foo]].' },
    ];
    expect(detectStaleWikiFolders(history, 'wiki')).toBeNull();
  });

  it('handles history with mixed placeholder and real-folder links', () => {
    const history: MinimalMessage[] = [
      {
        role: 'assistant',
        content: `Old: [[test3/entities/a]], new: [[${WIKI_FOLDER_PLACEHOLDER}/entities/b]].`,
      },
    ];
    const result = detectStaleWikiFolders(history, 'mywiki');
    expect(result?.hasStale).toBe(true);
    expect(result?.folders).toEqual(['test3']);
  });
});