# Sample 50-Page Wiki — Expected Graph Statistics

This file documents the **target** graph statistics for the synthetic
fixture. These numbers are the regression baseline: after v1.23.0 PPR
engine is implemented, the eval script should produce these stats
within ±5% tolerance. The values were computed by hand from the
fixture's `[[wiki-link]]` graph.

## Top-level

| Metric | Target | Notes |
|--------|--------|-------|
| Total pages | 53 | 5 sources + 15 concepts + 33 entities |
| Wiki-links (deduped) | 90–110 | Target ≈ 100 (edges/nodes ≈ 1.9) |
| Mean total degree | ~3.8 | Includes cross-folder aliases |
| Isolated (degree 0) | 1 | `entities/Isolated Note` (control case) |
| Largest weak component | 52/53 = 98% | One isolated pair to test cascade fallback |

## By folder

| Folder | Count | Mean out-degree | Mean in-degree |
|--------|-------|-----------------|-----------------|
| sources/ | 5 | 8.0 | 0.4 |
| concepts/ | 15 | 5.5 | 4.7 |
| entities/ | 33 | 3.2 | 3.0 |

## Top-5 hubs (by total degree)

These must score above the hub-detection threshold when
v1.23.0 hub detection ships. Names are fictional.

1. `concepts/Coronary Artery Disease` — degree 9 (5 out, 4 in)
2. `concepts/Myocardial Infarction` — degree 8 (4 out, 4 in)
3. `concepts/Heart Failure` — degree 7 (3 out, 4 in)
4. `concepts/Atrial Fibrillation` — degree 7 (3 out, 4 in)
5. `concepts/Antiplatelet Therapy` — degree 6 (2 out, 4 in)

## Forward-reference dead links (test of #197 dead-link hub check)

These wiki-links resolve to **entities that don't exist in the
fixture** (intentional). The dead-link hub check consumer should
classify them by target:

- `[[Future Trial 2027]]` — target would be a hub, so the dead
  link is likely an honest forward reference (low priority for
  retarget)
- `[[Legacy Protocol XYZ]]` — target is leaf-shaped (no related
  links), so the dead link is more likely a typo (high priority for
  retarget)

## Cross-domain links (4 of them)

These cross the conceptual boundary between (a) cardiovascular and
(b) related-but-distinct domains, to test cross-domain retrieval
without crossing the link-sparse boundary:

- `entities/Stent Implant` → `concepts/Antiplatelet Therapy` (cardio)
- `entities/Patient Case Aria Vasquez` → `concepts/Heart Failure` (cardio)
- `entities/Patient Case Bram Holloway` → `concepts/Atrial Fibrillation` (cardio)
- `entities/Lipid Panel Result` → `concepts/Statin Pharmacology` (cardio-adjacent)

## Eval targets (P0-2 script will measure these)

| Metric | Target | Algorithm |
|--------|--------|-----------|
| Recall@5 (lex-only baseline) | ≥ 0.30 | Title + body lex match |
| Recall@5 (lex-seeded-PPR) | ≥ 0.55 | Seed from lex hit, expand via PPR |
| Recall@5 (graph-first-PPR) | ≥ 0.55 | Pure PPR for mature graph |
| Cascade fallback rate | ~10% | 5/50 pages fall below min_pages |
| Per-seed `seed_degree >= 1` failures | 1 | The isolated forward-reference page |
