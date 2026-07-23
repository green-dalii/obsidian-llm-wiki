# 🤖 Model Guide

This page expands on the [README → Models](../README.md#-models) overview with a **pick-by-tier table** (cloud + local) and a **last-verified** date so the recommendations stay traceable. For live pricing and per-model capability flags (function calling, structured output, multimodal, PDF), check [models.dev](https://models.dev/) — it's the canonical open-source catalog the AI SDK and this plugin both use.

**Last verified:** 2026-07-23 · **Source:** [models.dev](https://models.dev/) cross-checked with the v1.25.2 README pick tables.

---

## Why this page exists

The plugin feeds the LLM your full Wiki context per query — so **long-context models win**. The recommendations below are tiered by *quality / cost / hardware* so you can pick by what you actually need, not by what's trending on a leaderboard. Two principles govern the picks:

- **🧠 Context window ≥ 200K tokens** for vaults over ~500 pages. Below 200K the cascade's assembled context starts getting truncated.
- **⚖️ Instruction-following quality** matters more than raw IQ for the extraction task — pick a model that follows the schema template, not the biggest leaderboard number.

**Embedding endpoints are irrelevant** — we don't use embeddings. A provider that lacks `/v1/embeddings` is fine (most of our 12+ providers do).

---

## ☁️ Cloud Model Picks

> Pricing and availability are verified against [models.dev](https://models.dev/) at the time of writing. Always re-check on the provider's pricing page before relying on the numbers.

| Tier | Model | Context | Why |
|------|-------|---------|-----|
| **Flagship** | **Claude Fable 5** | 1M tokens | Anthropic's most capable model (2026-06-09); best instruction-following and extraction quality |
| **Flagship** | Claude Opus 4.8 | 1M tokens | Anthropic flagship reasoning tier (2026-05-28) |
| **Flagship** | GPT-5.6 Sol | 1.05M tokens | OpenAI deep-reasoning flagship (2026-07-09); $5/$30 per MTok |
| **Flagship** | **Moonshot Kimi K3** | 1M tokens | 2.8T MoE open-weight frontier (2026-07); best-in-class coding benchmarks, $3/$15 per MTok |
| **Balanced** | **Claude Sonnet 5** | 1M tokens | Latest Anthropic balanced tier (2026-06-30) |
| **🌟 Value** | **DeepSeek V4 Flash** | 1M tokens | Lowest-cost tier — $0.14/$0.28 per MTok; ideal for batch ingestion |
| **🌟 Value** | **Gemini 3.6 Flash** | 1M tokens | Latest Gemini flash (2026-07-21); strong speed/cost |
| **🌟 Value** | **Qwen3.7 Plus** | 1M tokens | Alibaba DashScope API; strong agent/coding |
| **🌟 Value** | **Grok 4.5** | 500K tokens | Latest xAI flagship (2026-07-08) |
| **Lightweight** | **Gemini 3.5 Flash Lite** | 1M tokens | Cheapest Gemini tier; ideal for small wikis and smoke tests |
| **Lightweight** | **laguna-s-2.1** (Poolside) | 1M tokens | 118B MoE open-weight coding model; speed champion |
| **Lightweight** | **Gemma 4** (26B A4B / 31B) | 256K tokens | Google's open-weight series; strong instruction following |
| **Lightweight** | **Step 3.7 Flash** (StepFun) | 256K tokens | $0.20/$1.15 per MTok; fast inference, strong agent performance |
| **Lightweight** | **MiniMax M3** | 1M tokens | $0.30/$1.20 per MTok (3rd-party); 1M in/out context |
| **Lightweight** | **Tencent Hy3** | 256K tokens | ¥1-2/¥4-8 per MTok; Tencent Cloud billing, open-weight |
| **Budget** | **DeepSeek V4-Pro** | 128K tokens | $0.435/$0.87 per MTok; best quality/cost for output-heavy work |
| **Budget** | **Xiaomi MiMo V2.5** | 1M tokens | $1/$3 per MTok, flat pricing since 2026-05; strong 1M-context option |
| **Budget** | **Zhipu GLM-5.2** | 1M tokens | $0.90/$2.84 per MTok; latest GLM series, strong bilingual support |

**Data source:** Pricing and context windows verified against [models.dev](https://models.dev/) and provider API docs (2026-07-23). DeepSeek, MiMo, Kimi, and GLM billing tiers change often; re-check before committing.

The four flagships are all premium-tier models:

- **Claude Fable 5** — Anthropic's best model. Best instruction-following, cleanest Markdown output, largest effective context for multi-shot schema templates.
- **Claude Opus 4.8** — Anthropic's reasoning flagship. Strong alternative when Fable 5 is at capacity.
- **GPT-5.6 Sol** — OpenAI's deep-reasoning flagship ($5/$30 per MTok). Best for agentic coding and multi-step tool orchestration. Terra ($2.50/$15) is the production default; Luna ($1/$6) is the budget tier.
- **Moonshot Kimi K3** — China's best open-weight model (2.8T MoE). Top-tier coding benchmarks at a fraction of the per-token cost ($3/$15 vs ~$15/M for other flagships).

For *ingest* of a 2,000-page vault where each note is 5K tokens, the cost difference between flagships is dominated by the ingest rate-limit guardian, not the per-token price.

### Picking a value pick

The four 🌟 value picks are interchangeable for batch ingest. Choose by:

- **DeepSeek V4 Flash** — if you have DeepSeek API access and the lowest per-token cost matters (subject to DeepSeek's rate limits at peak hours).
- **Gemini 3.6 Flash** — if you want the newest Gemini flash and Google Cloud billing (1.05M context).
- **Qwen3.7 Plus** — if you want Alibaba Cloud billing and strong agent/coding performance.
- **Grok 4.5** — if you want xAI billing (500K context — smaller than the rest, plan accordingly).

### Budget picks

For cost-sensitive workloads, three models stand out below the $1/MTok output line:

- **DeepSeek V4-Pro** ($0.87/MTok output) — the best quality/cost ratio for output-heavy extraction work at 128K context.
- **Xiaomi MiMo V2.5** ($1/$3) — flat-priced 1M-context model since 2026-05. Good balance of context and cost.
- **Zhipu GLM-5.2** ($0.90/$2.84) — latest GLM series with 1M context; strong bilingual support.

---

## 🦙 Local Model Recommendations (Ollama / LM Studio)

Local inference wins on data sovereignty, offline use, and zero API cost. The trade-off is context window (most sit between 8K–128K; recent open-weight families reach 262K) and instruction following vs. flagship cloud models. **Pick by your hardware budget:** larger parameter counts buy world knowledge and instruction fidelity (better extraction quality, fewer hallucinations); smaller counts buy speed and memory headroom but pay for it in hallucinations and weaker long-context reasoning. The sweet spot on a 24 GB Apple Silicon or single consumer GPU is the 26B-31B class (Gemma 4) or equivalent.

| Model | Params | Context | Why |
|-------|--------|---------|-----|
| **Qwen3.6 (open-weight)** | multiple sizes | 128K–1M | Open-source series (Apache-2.0); available via Ollama / LM Studio / llama.cpp |
| **Gemma 4 31B IT** | 31B dense | 262K | Strong instruction following, clean Markdown output |
| **Gemma 4 26B A4B IT** | 26B / 4B MoE | 262K | Lower memory than 31B dense at comparable quality |

### Quantization

MLX 4-bit on Apple Silicon is typically 1.5–2× faster than GGUF Q4_K_M at the same effective bitrate. GGUF Q4_K_M is the default cross-platform choice; reach for Q5/Q8 only if you have the VRAM headroom and notice quality regression at Q4.

### Context strategy

When your Wiki grows past ~500 pages, a 262K local model still sees most of the context the Query engine assembles, but ingest on a 2000-page vault will outrun it. Common pattern: cloud for ingest + local for query. For full local setups, the 27B/35B-A3B class is the sweet spot.

### Hardware tiers

| Hardware | Recommended class | Why |
|----------|--------------------|-----|
| 16 GB Mac (M1/M2 base) | Gemma 4 E2B / E4B IT (CPU), Qwen3.6 GGUF Q4 | E2B/E4B runs comfortably on CPU; Qwen3.6 fits with moderate quantization |
| 24 GB Mac (M1 Pro / M2 Pro / M3 Pro) | Qwen3.6 @ MLX 4-bit or Gemma 4 31B IT @ Q4 | The sweet spot — full quality, fits in unified memory |
| 48 GB Mac (M1/M2/M3/M4 Max) | Qwen3.6 (larger size) or Gemma 4 31B IT @ 8-bit | Quality ceiling on Apple Silicon |
| Single 24 GB consumer GPU | Qwen3.6 @ GGUF Q4_K_M or Gemma 4 31B IT @ Q4 | Cross-platform default |
| Dual 24 GB GPUs (NVLink not required) | Qwen3.6 (larger size) @ GGUF Q4_K_M | Splits the weights across two cards |

---

## 🔌 Anthropic-Compatible (Token Plan / Coding Plan)

If your provider offers an Anthropic-compatible API endpoint (Anthropic's `/v1/messages` protocol), select "Anthropic Compatible" in the plugin and enter your provider's Base URL and API Key. The plugin uses the Anthropic provider adapter transparently. Common Anthropic-compatible plans:

- **Token Plan** — providers that resell Anthropic API access with token-based pricing (no Claude Code subscription required).
- **Coding Plan** — providers that bundle Anthropic API access with a coding-tool subscription (e.g. Claude Code, Cursor, Zed).

No model-table pick is needed if your provider has a fixed catalog. The plugin talks the standard `/v1/messages` protocol regardless of how the provider bills.

---

## 💳 OpenAI vs ChatGPT Plan (Codex OAuth) — they are distinct

- **OpenAI** — separately billed OpenAI Platform API key.
- **ChatGPT Plan (Codex OAuth)** — experimental, distinct provider that uses eligible Codex allowance after browser or device-code sign-in; availability follows OpenAI Codex authentication and allowance policies, not plan name. Third-party Codex compatibility, not an OpenAI partnership or a general ChatGPT API.

OAuth credentials live only in Obsidian SecretStorage. Sign-out clears the secret.

---

## 🔍 Verifying picks yourself

For any model you're evaluating:

1. **Pricing & capability flags** — [models.dev](https://models.dev/) is the canonical open-source catalog. The [JSON API](https://models.dev/api.json) returns the full database.
2. **Multimodal / PDF support** — check the model's `modalities` and `attachment` fields on models.dev before assuming it can read a PDF file part.
3. **Effective context vs. nominal context** — long-context models often degrade past 60-70% of nominal; a 1M-context model may be reliable only to ~700K for complex schema extraction. Run your own quick test.
4. **Rate limits & cost** — provider pricing pages. DeepSeek and OpenRouter change tier structures often; cross-check before committing.
**Last updated:** 2026-07-23 — verify picks at [models.dev](https://models.dev/) and provider pricing pages.
