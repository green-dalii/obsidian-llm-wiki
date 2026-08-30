// v1.25.10 PATCH DocTpoint §4 — `merge` vs `contradictory` route split.
// The merge router marks pages whose rewrite was triggered by a
// conflict so Lint can surface them for editorial review.

import { describe, it, expect } from 'vitest';
import {
  appendContradictedByMarker,
  appendContradictionNotes,
  CONTRADICTIONS_KEY,
} from '../../core/contradicted-marker';

const FM_BASE = `---
type: concept
tags: [theory]
sources:
  - "[[sources/origin]]"
---

`;

const SOURCE = 'notes/new-evidence.md';

describe('appendContradictedByMarker', () => {
  it('adds a contradictions block on first contradictory merge', () => {
    const result = appendContradictedByMarker(FM_BASE, SOURCE);
    expect(result).toContain(`${CONTRADICTIONS_KEY}:`);
    expect(result).toContain(`- "${SOURCE}"`);
    // Existing fields survive.
    expect(result).toContain('type: concept');
    expect(result).toContain('tags: [theory]');
    expect(result).toContain('sources:');
  });

  it('is idempotent against the same source being marked twice', () => {
    const once = appendContradictedByMarker(FM_BASE, SOURCE);
    const twice = appendContradictedByMarker(once, SOURCE);
    const matches = twice.match(new RegExp(`- "${SOURCE.replace(/\./g, '\\.')}"`, 'g'));
    expect(matches?.length).toBe(1);
  });

  it('accumulates distinct sources across re-touches (history is preserved)', () => {
    const once = appendContradictedByMarker(FM_BASE, 'notes/a.md');
    const twice = appendContradictedByMarker(once, 'notes/b.md');
    const thrice = appendContradictedByMarker(twice, 'notes/c.md');
    expect(thrice).toContain('- "notes/a.md"');
    expect(thrice).toContain('- "notes/b.md"');
    expect(thrice).toContain('- "notes/c.md"');
  });

  it('treats bracketed [[sources/X]] and bare sources/X as the same source', () => {
    const once = appendContradictedByMarker(FM_BASE, 'sources/origin.md');
    const twice = appendContradictedByMarker(once, '[[sources/origin.md]]');
    // Only one entry should remain after dedup.
    const all = twice.split('\n').filter(l => l.includes('sources/origin'));
    expect(all.length).toBeGreaterThan(0);
    // The original sources: block is unchanged; the contradictions
    // block carries one logical entry.
    expect(twice.split(CONTRADICTIONS_KEY)[1].match(/^\s+- /gm)?.length).toBe(1);
  });

  it('survives a re-pass with extra unknown fields (PR A passthrough invariant)', () => {
    // The marker is user-layer metadata. Whatever the rest of the
    // frontmatter looks like (extra unknown fields), the marker must
    // be inserted cleanly and the body preserved.
    const fm = `---
type: concept
redirect_to: "[[canonical]]"
sources:
  - "[[notes/origin]]"
---

# Body
Body.
`;
    const result = appendContradictedByMarker(fm, 'notes/new.md');
    expect(result).toContain('redirect_to: "[[canonical]]"');
    expect(result).toContain('# Body');
    expect(result).toContain('- "notes/new.md"');
  });

  it('returns the input unchanged when no frontmatter delimiters exist', () => {
    const noFm = 'just body text, no frontmatter';
    expect(appendContradictedByMarker(noFm, SOURCE)).toBe(noFm);
  });

  it('returns the input unchanged for an empty sourcePath (defensive)', () => {
    const result = appendContradictedByMarker(FM_BASE, '   ');
    // No marker emitted; the rest of the frontmatter survives intact.
    expect(result).toContain('type: concept');
    expect(result).not.toContain(`${CONTRADICTIONS_KEY}:`);
  });
});


describe('appendContradictionNotes', () => {
  const item = { content: 'Dose is 10mg', target_section: '## Dosage', reason: 'page states 5mg' };

  it('returns the body unchanged for an empty item list', () => {
    expect(appendContradictionNotes('# Page\n\nBody.', [], 'note')).toBe('# Page\n\nBody.');
  });

  it('appends an attributed conflict block with the manager heading', () => {
    const out = appendContradictionNotes('# Page\n\nBody.', [item], 'my-note');
    expect(out).toContain('## ⚠️ Potential Contradiction');
    expect(out).toContain('**Source claim** (from my-note): Dose is 10mg');
    expect(out).toContain('**Conflicts with** (## Dosage): page states 5mg');
    expect(out.startsWith('# Page\n\nBody.')).toBe(true);
  });

  it('renders one block per item under a single heading', () => {
    const out = appendContradictionNotes('B', [item, { content: 'X', target_section: '## A' }], 'n');
    expect(out.match(/## ⚠️ Potential Contradiction/g)?.length).toBe(1);
    expect(out.match(/\*\*Source claim\*\*/g)?.length).toBe(2);
    expect(out).toContain('**Conflicts with**: ## A');
  });
});
