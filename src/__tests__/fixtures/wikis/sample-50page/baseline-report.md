# v1.23.0 PPR Baseline Report

**Generated:** 2026-06-27T15:12:51.171Z
**Fixture:** sample-50page (53 pages, 177 wiki-links)

## Summary

| Strategy | Recall@5 | Recall@10 | Target@5 | Target@10 |
|----------|----------|-----------|----------|-----------|
| lex | 0.251 | 0.260 | 0.30 ❌ | 0.50 ❌ |
| lex-seeded-ppr | 0.404 | 0.502 | 0.55 ❌ | 0.75 ❌ |
| graph-first-ppr | 0.088 | 0.273 | 0.55 ❌ | 0.75 ❌ |

## Per-query detail

### lex

| Query | Expected | Hits@5 | R@5 | R@10 | Arm |
|-------|----------|--------|-----|------|-----|
| heart failure | 11 | 3 | 0.27 | 0.36 | lex |
| atrial fibrillation | 14 | 1 | 0.07 | 0.07 | lex |
| acute coronary syndrome | 4 | 2 | 0.50 | 0.50 | lex |
| stent implant | 8 | 1 | 0.13 | 0.13 | lex |
| antiplatelet therapy | 10 | 1 | 0.10 | 0.10 | lex |
| echocardiography | 5 | 1 | 0.20 | 0.20 | lex |
| AF rate control | 7 | 1 | 0.14 | 0.14 | lex |
| cardiology hypertension | 10 | 1 | 0.10 | 0.10 | lex |
| statins | 9 | 0 | 0.00 | 0.00 | lex |
| Pinewood Heart Center | 5 | 5 | 1.00 | 1.00 | lex |

### lex-seeded-ppr

| Query | Expected | Hits@5 | R@5 | R@10 | Arm |
|-------|----------|--------|-----|------|-----|
| heart failure | 11 | 3 | 0.27 | 0.36 | lex-seeded-ppr |
| atrial fibrillation | 14 | 2 | 0.14 | 0.43 | lex-seeded-ppr |
| acute coronary syndrome | 4 | 4 | 1.00 | 1.00 | lex-seeded-ppr |
| stent implant | 8 | 4 | 0.50 | 0.50 | lex-seeded-ppr |
| antiplatelet therapy | 10 | 1 | 0.10 | 0.50 | lex-seeded-ppr |
| echocardiography | 5 | 2 | 0.40 | 0.40 | lex-seeded-ppr |
| AF rate control | 7 | 3 | 0.43 | 0.43 | lex-seeded-ppr |
| cardiology hypertension | 10 | 2 | 0.20 | 0.40 | lex-seeded-ppr |
| statins | 9 | 0 | 0.00 | 0.00 | lex |
| Pinewood Heart Center | 5 | 5 | 1.00 | 1.00 | lex-seeded-ppr |

### graph-first-ppr

| Query | Expected | Hits@5 | R@5 | R@10 | Arm |
|-------|----------|--------|-----|------|-----|
| heart failure | 11 | 1 | 0.09 | 0.18 | lex |
| atrial fibrillation | 14 | 0 | 0.00 | 0.07 | lex |
| acute coronary syndrome | 4 | 1 | 0.25 | 0.50 | lex |
| stent implant | 8 | 0 | 0.00 | 0.50 | lex |
| antiplatelet therapy | 10 | 1 | 0.10 | 0.40 | lex |
| echocardiography | 5 | 0 | 0.00 | 0.00 | lex |
| AF rate control | 7 | 1 | 0.14 | 0.14 | lex |
| cardiology hypertension | 10 | 3 | 0.30 | 0.40 | lex |
| statins | 9 | 0 | 0.00 | 0.33 | lex |
| Pinewood Heart Center | 5 | 0 | 0.00 | 0.20 | lex |

## Interpretation

See EVAL.md for the targets and methodology. The cascade decision is encoded in ppr-cascade.ts (3-arm hybrid: lex / lex-seeded-ppr / graph-first-ppr).
