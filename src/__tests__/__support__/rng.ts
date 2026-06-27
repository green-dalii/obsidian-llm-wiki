// Test support: deterministic PRNG helpers.
//
// Mulberry32 — small, fast, deterministic. Same seed → same sequence.
// Used by tests that need reproducible stochastic behavior
// (e.g. personalizedPageRank sampling, fuzzy-match tests).
//
// This file is test-only. Do NOT import from production code.

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}