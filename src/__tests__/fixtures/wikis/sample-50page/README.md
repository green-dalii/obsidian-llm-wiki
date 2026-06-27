# Sample 50-Page Wiki Fixture (v1.23.0 Graph Engine Eval)

**License:** CC0 1.0 Universal (public domain dedication).
All persons, institutions, conditions, treatments, and data referenced in this fixture are entirely fictional. No real patient data, no real medical claims, no real clinical recommendations. The "Pinewood Heart Center" and all associated names are invented for the express purpose of PPR retrieval baseline measurement.

**Why this exists:** The v1.23.0 Graph Engine (Personalized PageRank over the [[wiki-link]] graph) needs a deterministic, CC0-clean fixture to measure recall@k vs. lex-only baseline. Per #198 consensus, the real-vault data (German medical knowledge base) is off-limits to the public repo — even anonymized — so this synthetic fixture is the only public ground truth for PPR behavior.

**Topology (target):**
- 50 pages total: 5 sources, 30 entities, 15 concepts
- ~80-100 wiki-links (target edges/nodes ≈ 1.6-2.0)
- Largest weak component > 95% (no fragmentation)
- 4 concept hubs each with degree ≥ 5 (hub-detection test coverage)
- 1 isolated-page pair (per-seed fallback test)

**Coverage:**
- 4 cross-domain links (for cross-language / cross-domain retrieval)
- 2 forward-reference dead links (for #197 dead-link hub check)
- 1 alias variant (for #157 link-distinctiveness)

**Validation:** see `src/__tests__/fixtures/wikis/sample-50page/EVAL.md` for the
expected graph statistics and recall@k targets after the v1.23.0
PPR engine is implemented. The fixture is the regression oracle —
re-running the eval script against the live engine should reproduce
the baseline numbers in EVAL.md.
