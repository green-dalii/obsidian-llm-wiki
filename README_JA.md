![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki Plugin for Obsidian

> AI駆動の構造化知識ベース — ノートを自動的にWikiに変換。[Andrej KarpathyのLLM Wiki概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)に基づく実装。

**作者:** Greener-Dalii | **バージョン:** 1.7.16

[English](README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md) | [公式サイト](https://llmwiki.greenerai.top/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## LLM-Wikiとは？

あなたが書く。AIが整理する。あなたが問う。それだけ。

**問題。** ノートは金脈です — 人物、概念、アイデア、関連。しかし現在、それらはフォルダ内のファイルにすぎません。何が何に関連しているかを見つけるには、検索、タグ付け、そして記憶を頼りにする必要があります。

**解決策。** [Andrej Karpathyが提案した](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)エレガントな方法：ノートを原材料として扱い、LLMがアーキテクトの仕事をする。LLMがあなたの書いたものを読み、EntityとConceptを抽出し、構造化されたWikiを構築する — `[[双方向リンク]]`、自動生成インデックス、そしてあなたの知識ベースに質問できるチャットインターフェースを備えて。

**あなたは図書館員ではなくなる。** 何をページにするか決める必要も、交差リンクを維持する必要も、何かが古くなったか心配する必要もない。ノートを`sources/`にドロップすれば、LLMが読み、抽出、書き込み、リンク、矛盾をフラグ付け — あなたは流れの中に留まれる。

**そしてこれは単なるチャットボットではない。** ChatGPTはインターネットを知っている。LLM-Wikiは*あなた*を知っている — 正確には、あなたが教えたものを。すべての回答は`[[wiki-links]]`を伴って知識グラフに戻る。すべてのレスポンスは trailheadであり、dead endではない。

---

## Obsidian + LLM-Wikiを選ぶ理由？

Obsidianはリンク思考に最適だ。しかし落とし穴がある：リンクしているのはあなた自身だ。

LLM-Wikiはそれを反転する。あなたが手でグラフを構築する代わりに、AIがあなたと共に成長する。新しい概念についてノートを追加 — あなたが見逃す関連を見つける。質問をする — あなた自身の知識グラフを歩き、引用を伴って回答をもたらす。

- **Graph Viewが生きる。** 新しいノートはただそこにあるだけでなく — Entity、Concept、Sourceへのリンクが芽生える。グラフは有機的に成長し、プラグインが維持する：重複検出、dead link修正、aliasで言語を橋渡し。
- **ノートが話し返すことを学ぶ。** 検索が会話になる。「Xについて何を書いた？」が対話になり、ストリーミングレスポンスと`[[wiki-links]]`が breadcrumbとして。すべての回答はあなた自身の知識への道である。
- **Obsidianが思考パートナーになる。** ノートのキャビネットを止め、*思考*を助けるものになる — 隠れた関連を表面化、矛盾をフラグ付け、忘れたことを思い出す。

---

## クイックスタート

### インストール

**推奨 — Obsidian Community Plugin Market:**

1. Obsidianで、**Settings → Community plugins**に移動
2. **Browse**をクリックし、「Karpathy LLM Wiki」を検索
3. **Install**をクリック、その後**Enable**

**または Community Pluginウェブサイトから —** [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki)を訪れ、**Add to Obsidian**をクリックして直接インストール。

**手動（代替）:**

1. [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)から`main.js`、`manifest.json`、`styles.css`をダウンロード
2. Obsidianで、Settings → Community pluginsに移動。**Installed plugins**タブで、フォルダアイコンをクリックしてプラグインディレクトリを開く
3. `karpathywiki`というフォルダを作成、三つのファイルを内部にドロップ
4. Obsidianに戻り、refreshアイコンをクリック — **Karpathy LLM Wiki**がInstalled pluginsに表示される
5. Toggle onしてenable

**開発:** `git clone`、`pnpm install`、`pnpm build`

### LLM Providerを設定

1. Settings → Karpathy LLM Wikiを開く
2. ドロップダウンからProviderを選択（Anthropic、Anthropic Compatible、Google Gemini、OpenAI、DeepSeek、Kimi、GLM、Ollama、OpenRouter、またはcustom）
3. API keyを入力（Ollamaは不要）
4. **Fetch Models**をクリックしてmodelドロップダウンをpopulate、またはmodel名を手動で入力
5. **Test Connection**をクリック、その後**Save Settings**

**Ollama（ローカル、API key不要）:** [Ollama](https://ollama.com)をインストール、modelをpull（`ollama pull gemma4`）、Providerドロップダウンで「Ollama (Local)」を選択。

### 使用方法

| 方法 | 操作 |
|------|------|
| **`sources/`からIngest** | `Cmd+P` → "Ingest Sources" — `sources/`フォルダ全体を処理 |
| **任意のフォルダからIngest** | `Cmd+P` → "Ingest from Folder" — フォルダを選択し、既存ノートからWikiを生成 |
| **WikiをQuery** | `Cmd+P` → "Query Wiki" — 質問し、`[[wiki-links]]`を伴うストリーミング回答を取得 |
| **WikiをLint** | `Cmd+P` → "Lint Wiki" — 重複検出、dead links、orphansの健康スキャン |

同じSourceを再ingestすると、Entity/Conceptページは増分更新（新情報がmerge）。Summaryページはregenerateされる。

**Smart Batch Skip:** フォルダingest時、プラグインは既処理ファイルを自動検出・skipし、時間とAPI costを節約。Batch reportにskip countが表示される。

> **旧バージョンからアップグレード？** `Cmd+P` → "Regenerate index"を実行してaliasを含むWiki indexをrebuild — Queryでalias-aware searchが有効化（例：「DSA」検索で「DeepSeek-Sparse-Attention」が見つかる）。

**Ingestion Acceleration:** 多数のEntity（20+）を持つSourceでは、Settings → Ingestion Accelerationでparallel page generationを有効化:
- **Page Generation Concurrency**: 1（serial、safest）から5（parallel、fastest）。多くのProviderで3から開始。
- **Batch Delay**: parallel batch間の100–2000ms delay。rate-limited Providerで500ms+に増加。

> **Safety**: Parallel generationは`Promise.allSettled`を使用 — 一ページが失敗しても他は継続。失敗ページはexponential backoffで個別retry。

---

## 特徴

### Knowledge Quality

- **Entity/Concept Extraction** — LLMがノートからEntity（人物、組織、製品、イベント）とConcept（理論、方法、用語）を抽出
- **Mandatory Page Aliases** — 生成された各ページに少なくとも1 alias（翻訳、acronym、別名）を含み、cross-language重複検出を有効化
- **Duplicate Detection & Merge** — Semantic tieringでtrue duplicates（cross-language翻訳、abbreviations、spelling variants）をcatch；intelligent LLM mergeがcontentをfuseしaliasesをpreserve
- **Smart Knowledge Fusion** — Multi-source updateが新情報をredundancyなくmerge、contradictionsはattributionを伴ってpreserve、`reviewed: true`ページはoverwriteから保護
- **Content Truncation Protection** — 8000 max_tokens、automatic stop_reason detection、全Providerで2× tokens retry
- **Verbatim Source Mentions** — 原文のquoteをpreserve、optional translationでtraceability

### Maintenance

- **Lint Health Scan** — 包括的なcomprehensive reportでduplicates、dead links、empty pages、orphans、missing aliases、contradictionsを検出
- **Semantic-Tier Duplicate Detection** — Tier 1（direct name matches: cross-language、abbreviations、高similarity titles）常にverified；Tier 2（indirect signals: shared links、moderate similarity）token budgetでfill
- **Smart Fix All** — Causality-ordered batch fix: duplicates merged → dead links resolved → orphans linked → empty pages expanded
- **Alias Completion** — ワンクリックで欠落aliasを並列バッチ生成、今後の重複検出を改善
- **Auto-Maintenance** — Multi-folder file watcher、periodic lint、startup health check（すべてoptional）
- **Contradiction State Machine** — `detected → review_ok → resolved`（AI fix）または`detected → pending_fix`（manual）

### Query & Feedback

- **Conversational Query** — ChatGPT-style dialog、streaming Markdown output、`[[wiki-links]]`、multi-turn history
- **Query-to-Wiki Feedback** — 価値あるconversationをWikiにsave、Entity/Concept extraction、save前にsemantic dedup
- **Duplicate Save Prevention** — Hash trackingでunchanged conversationsのre-evaluationを阻止

### LLM & Language

- **Multi-Provider Support** — Anthropic、Anthropic Compatible（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、OpenRouter、Ollama、custom endpoint
- **5xx Auto Retry** — 全clientsでHTTP 5xx/429エラー時exponential backoff retry（max 2）
- **Dynamic Model List** — Provider APIからreal-time fetch
- **Wiki Output Language** — Interface独立の8言語（English/Chinese/Japanese/Korean/German/French/Spanish/Portuguese）、custom inputサポート
- **Internationalization** — English/Chinese Interface toggle（default English）、全promptsがlanguage settingに従う

### Architecture & Performance

- **Parallel Page Generation** — Configurable 1–5 concurrent pages、large sourcesで3× speedup、per-page error isolation
- **Iterative Batch Extraction** — Adaptive batch sizing、long documentsのmax_tokens bottleneckを解消
- **Three-Layer Architecture** — `sources/`（read-only）→ `wiki/`（LLM-generated）→ `schema/`（co-evolved config）
- **Modular Codebase** — 13 focused modules in `src/`

---

## コマンド

| コマンド | 説明 |
|---------|------|
| **Ingest single source** | 単一ノートを選択 → Entity、Concept、Summaryを含むWikiページを生成 |
| **Ingest from folder** | 任意のフォルダを選択 → 既存ノートからWikiを一括生成 |
| **Query wiki** | ストリーミング出力と`[[wiki-links]]`を伴う対話式Q&A |
| **Lint wiki** | 包括的健康スキャン：重複、dead links、empty pages、orphans、missing aliases、矛盾 |
| **Regenerate index** | `wiki/index.md`を手動で再構築 |
| **Suggest schema updates** | LLMがWikiを分析しSchema改善を提案 |

---

## Model推奨

本プラグインはKarpathyの核となる理念に従う：**Wikiの完全なコンテキストをLLMに直接渡し、RAG検索の断片化は行わない**。長いコンテキストウィンドウを持つmodelを強く推奨 — Wikiが大きくなるほど、LLMはクロスページ整合性を維持するためにより多くのコンテキストを必要とする。

> なぜRAGを使わないのか？Karpathyは[オリジナルコンセプト](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)で、RAGは知識を断片化し、完全な知識グラフにわたるLLMの推論能力を損なうと指摘した。

**トップ推奨：**

| Model | Context Window | 理由 |
|-------|----------------|------|
| **DeepSeek V4** | 1M tokens | トップピック — 極めて低価格、優れた中国語能力 |
| **Gemini 3.1 Pro** | 1M+ tokens | 最大のコンテキストウィンドウ、強力な推論 |
| **Claude Opus 4.7** | 1M tokens | 最強のagent programmingと推論能力 |
| **GPT-5.5** | 1M tokens | OpenAI最新フラッグシップ、AI知能指数トップ |
| **Claude Sonnet 4.6** | 1M tokens | 速度、コスト、品質の良好なバランス |

ローカルmodel（Ollama）向け：context windowは通常small（8K–128K）。ingestionにはcloud providerの使用を検討し、queryにはローカルmodelを使用する。

---

## アーキテクチャ

Karpathyの3層分離設計に基づく：

```
sources/     # ソースドキュメント（read-only）
  ↓ ingest
wiki/        # LLM生成のWikiページ
  ↓ query / maintain
schema/      # Wiki構造設定（命名規則、ページテンプレート、分類ルール）
```

**コード構造** (`src/`):

```
wiki/               # Wikiエンジンモジュール
  wiki-engine.ts    # オーケストレータ
  query-engine.ts   # 対話クエリ
  source-analyzer.ts # イテレーティブバッチ抽出
  page-factory.ts   # Entity/Concept CRUD + マージ
  lint-controller.ts # Lint オーケストレーション
  lint-fixes.ts     # 修正ロジック + 重複候補生成
  contradictions.ts # 矛盾検出
  system-prompts.ts # 言語ディレクティブ + セクションラベル
schema/             # Schema 共進化
  schema-manager.ts # Schema CRUD + 提案
  auto-maintain.ts  # ファイルウォッチャ + 定期Lint
ui/                 # ユーザーインターフェース
  settings.ts       # 設定パネル
  modals.ts         # Lint/Ingest/Query モーダル
+ 共有モジュール: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

---

## トラブルシューティング

**「Content truncated」エラー？**
- max_tokensを増やす（Settings → Advanced → Max Tokens）
- より大きなcontext windowを持つmodelを使用
- ローカルmodelの場合、Ollamaのcontext window設定を確認

**重複ページが検出されない？**
- aliasを含めて再構築するため「Regenerate index」を実行
- ページにaliasが欠けていないか確認（Lint → Alias Completion）

**ingestion中に5xxエラー？**
- プラグインは自動的にexponential backoffでリトライ
- 継続する場合はProvider API statusを確認
- rate limitの場合、Ingestion AccelerationでBatch Delayを増やす

**Query結果が関連性を欠いている？**
- Wiki indexをregenerate（aliasにより検索精度が向上）
- Wiki Output Languageがコンテンツ言語と一致しているか確認

**手動編集後にdead links？**
- Lint → Fix Dead Linksを実行
- Wikiページをlink更新なしで手動renameしない

---

## 貢献

**Issues & Bugs:** [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues)

**Feature Requests:** [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

**Pull Requests:** 歓迎！以下に従ってください：
- `pnpm lint` が通る（0エラー）
- `pnpm build` が成功する
- 英語のcommit message（conventional format）
- 機能変更時はドキュメントを更新

---

## ライセンス

MIT License — [LICENSE](LICENSE)を参照

---

## 謝辞

- [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Original LLM Wiki concept
- Obsidian Team — Plugin platform and API
- Anthropic, OpenAI, Google, DeepSeek, Kimi, GLM, OpenRouter, Ollama — LLM Provider

---

**公式サイト:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)