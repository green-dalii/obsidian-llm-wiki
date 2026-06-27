# Eval Ground Truth — sample-50page

10 hand-crafted queries for the v1.23.0 PPR eval. Each query lists
the **expected relevant pages** (PageMatch outputs that count as
"true positives"). Ground truth is hand-labeled against the synthetic
fixture — we know which pages exist and what they describe.

The eval measures recall@k for three retrieval strategies (per #198
Q3 cascade):
  - lex: pure keyword match (current v1.22.x behavior)
  - lex-seeded-PPR: PPR seeded from lex hit, expanded via random walks
  - graph-first-PPR: pure PPR from a generic seed (requires mature graph)

## Queries

| # | Query | Expected relevant pages | Tier |
|---|-------|--------------------------|------|
| 1 | "heart failure" | concepts/Heart Failure, entities/Aria Vasquez, entities/Gemma Rosenthal, entities/Selwyn Ainsley, entities/Octavian Hume, entities/Dax Emberlin, entities/Wendell Marsh, entities/Julianna Thorne, sources/Service Overview, sources/Quality Dashboard, sources/Clinical Guidelines | broad (10) |
| 2 | "atrial fibrillation" | concepts/Atrial Fibrillation, concepts/Cardioversion, concepts/Rate Control, concepts/Anticoagulation, concepts/Antiplatelet Therapy, entities/Bram Holloway, entities/Elara Whitfield, entities/Isadora Lockhart, entities/Magnus Hadley, entities/Quillon Vesper, entities/Urien Caldwell, entities/Cosima Falk, entities/Yseult Penrose, sources/Clinical Guidelines | broad (14) |
| 3 | "acute coronary syndrome" | concepts/Acute Coronary Syndrome, concepts/Myocardial Infarction, concepts/Coronary Artery Disease, sources/Clinical Guidelines | narrow (4) |
| 4 | "stent implant" | entities/Stent Implant, concepts/Coronary Artery Disease, concepts/Antiplatelet Therapy, concepts/Statin Pharmacology, entities/Hadrian Voss, entities/Rosalind Decker, entities/Nereida Stone, entities/Aerith Solberg | narrow (8) |
| 5 | "antiplatelet therapy" | concepts/Antiplatelet Therapy, concepts/Myocardial Infarction, concepts/Coronary Artery Disease, entities/Stent Implant, entities/Hadrian Voss, entities/Dorian Ashford, entities/Rosalind Decker, entities/Aerith Solberg, entities/Leocadia Voss, sources/Clinical Guidelines | narrow (10) |
| 6 | "echocardiography" | concepts/Echocardiography, entities/Aria Vasquez, entities/Bellamy Crane, entities/Julianna Thorne, sources/Note Templates | narrow (5) |
| 7 | "AF rate control" | concepts/Atrial Fibrillation, concepts/Rate Control, concepts/Beta Blocker, entities/Bram Holloway, entities/Isadora Lockhart, entities/Elara Whitfield, sources/Clinical Guidelines | narrow (6) |
| 8 | "cardiology hypertension" | concepts/Hypertension, concepts/Coronary Artery Disease, concepts/ACE Inhibitor, concepts/Beta Blocker, entities/Cyra Pemberton, entities/Persephone Locke, entities/Finneus Caldwell, entities/Thessaly Frost, entities/Zephyr Aldridge, entities/Kestrel Marchetti | broad (10) |
| 9 | "statins" | concepts/Statin Pharmacology, entities/Lipid Panel Result, concepts/Coronary Artery Disease, entities/Dorian Ashford, entities/Verity Lockwood, entities/Leocadia Voss, entities/Xandra Quill, entities/Kestrel Marchetti, sources/Quality Dashboard | narrow (9) |
| 10 | "Pinewood Heart Center" | sources/Service Overview, sources/Clinical Guidelines, sources/Note Templates, sources/Quality Dashboard, sources/Research Note | narrow (5) |

## Test cases by intent type

- **Single-domain broad** (queries 1, 2, 8): Hub term → should retrieve many related pages including the hub concept and consumers
- **Specific procedure / drug** (queries 3, 4, 5, 9): Niche term → expected 4-10 related pages with clear graph locality
- **Cross-concept short** (queries 6, 7): Multi-word query spanning two concepts → tests cascade
- **Source-anchored** (query 10): Institutional name → expected 5 source pages, no entities

## How to use this ground truth

```ts
const query = "heart failure";
const expected = ["concepts/Heart Failure", "entities/Aria Vasquez", ...];
const results = pprCascade(query, allPages, { graph, topN: 5 });
const hits = results.filter(r => expected.includes(r.page.path));
const recallAt5 = hits.length / expected.length;  // proportion of ground truth in top-5
```

Recall@k is the fraction of expected pages that appear in the top-k
results. Precision@k is k / (number of returned relevant results in
top-k). For this eval we measure **recall@k** because the
ground truth is finite and the candidate set is small (53 pages);
precision on a small candidate set is less informative.

## Expected baselines (EVAL.md targets)

| Strategy | Recall@5 target | Recall@10 target |
|----------|-----------------|------------------|
| lex-only | ≥ 0.30 | ≥ 0.50 |
| lex-seeded-PPR | ≥ 0.55 | ≥ 0.75 |
| graph-first-PPR | ≥ 0.55 | ≥ 0.75 |

PPR strategies should both beat lex by ≥ 0.15 absolute recall@5
improvement. If they don't, v1.23.0 release value is questionable
and we should revisit the cascade design.
