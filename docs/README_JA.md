![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> AI駆動の構造化知識ベース — ノートを自動的にWikiに変換。[Andrej KarpathyのLLM Wiki概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)に基づく実装。
>
> **Obsidian公式評価95/100** | 8言語ネイティブ対応 | 活発に維持、継続進化

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[公式サイト](https://llmwiki.greenerai.top/) | [ブログ](https://llmwiki.greenerai.top/blog/) | [フィードバック](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 DeepWiki でコードベースを探索](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

## 📑 Contents

- [💡 LLM-Wikiとは？](#-llm-wikiとは)
- [⚡ Obsidian + LLM-Wikiを選ぶ理由](#-obsidian--llm-wikiを選ぶ理由)
- [🚀 クイックスタート](#-クイックスタート)
  - [📦 インストール](#-インストール)
  - [🔄 プラグインの更新](#-プラグインの更新)
  - [🔑 LLM Providerを設定](#-llm-providerを設定)
  - [🎮 使用方法](#-使用方法)
  - [⚠️ 旧バージョンからアップグレードする場合](#️-旧バージョンからアップグレードする場合)
- [⚡ v1.15.0 更新のポイント](#-v1150-更新のポイント)
- [✨ 特徴](#-特徴)
  - [📊 Knowledge Quality](#-knowledge-quality)
  - [🛠️ Maintenance](#️-maintenance)
  - [💬 Query & Feedback](#-query--feedback)
  - [🌐 LLM & Language](#-llm--language)
  - [🏗️ Architecture & Performance](#️-architecture--performance)
  - [🔒 プライバシーとセキュリティ](#-プライバシーとセキュリティ)
- [⌨️ コマンド](#️-コマンド)
- [📖 例](#-例)
- [🤖 Model推奨](#-model推奨)
- [🏗️ アーキテクチャ](#️-アーキテクチャ)
- [❓ FAQ](#-faq)
  - [💡 一般](#-一般)
  - [🏷️ エイリアスと重複](#️-エイリアスと重複)
  - [⚡ パフォーマンスとコスト管理](#-パフォーマンスとコスト管理)
  - [🧹 メンテナンス](#-メンテナンス)
  - [🔍 トラブルシューティング](#-トラブルシューティング)
  - [🔒 透明性とコンプライアンス](#-透明性とコンプライアンス)
- [📜 ライセンス](#-ライセンス)
- [🙏 謝辞](#-謝辞)
## 💡 LLM-Wikiとは？

書くのはあなた。整理するのはAI。質問するだけ。それがすべて。

**🎯 問題点。** ノートは宝の山です — 人物、概念、アイデア、その関連性。しかし今は、フォルダ内の単なるファイルに過ぎません。何が何に関連しているかを見つけるには、検索、タグ付け、そして記憶を頼りにする必要があります。

**✨ 解決策。** [Andrej Karpathyが提案した](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)エレガントなアプローチ：ノートを原材料として扱い、LLMがアーキテクトの役割を担う。LLMがあなたの書いたものを読み、EntityとConceptを抽出し、構造化されたWikiを構築する — `[[双方向リンク]]`、自動生成インデックス、そしてあなたの知識ベースに質問できるチャットインターフェースを備えたWikiです。

**📚 図書館員の役割は終わり。** 何をページにするか決める必要も、相互リンクを維持する必要も、情報が古くなったか心配する必要もありません。ノートを`sources/`に置けば、LLMが読み取り、抽出、書き込み、リンク作成、矛盾のフラグ付けを行い — あなたは作業の流れに集中できます。

**🤖 これは単なるチャットボットではない。** ChatGPTはインターネットを知っています。LLM-Wikiは*あなた*を知っている — 正確には、あなたが教えた内容を。すべての回答は`[[wiki-links]]`を伴って知識グラフに戻ります。すべてのレスポンスは道の始点であり、終点ではありません。

---

## ⚡ Obsidian + LLM-Wikiを選ぶ理由

Obsidianはリンク思考に最適なツールです。しかし一つ落とし穴があります：リンクを作成しているのはあなた自身です。

LLM-Wikiはこれを逆転させます。あなたが手作業でグラフを構築する代わりに、AIがあなたと共に成長します。新しい概念についてノートを追加すると、あなたが見逃す関連性を見つけます。質問をすると、あなた自身の知識グラフを探索し、引用を伴った回答をもたらします。

- **🔗 Graph Viewが生きて動く。** 新しいノートはただ存在するだけでなく — Entity、Concept、Sourceへのリンクが芽生えます。グラフは有機的に成長し、プラグインが維持管理します：重複検出、dead link修正、aliasで言語間の架け橋を作成。
- **💬 ノートが応答を学ぶ。** 検索が会話になります。「Xについて何を書いた？」が対話となり、ストリーミングレスポンスと`[[wiki-links]]`が breadcrumb（道しるべ）となります。すべての回答はあなた自身の知識への道です。
- **🧠 Obsidianが思考パートナーになる。** ノートの保管庫を止め、*思考*を助けるツールになります — 隠れた関連性を表面化、矛盾をフラグ付け、忘れていたことを思い出させます。

---

## 🚀 クイックスタート

### 📦 インストール

**🌟 推奨 — Obsidian Community Plugin Market:**

1. Obsidianで、**Settings → Community plugins**に移動
2. **Browse**をクリックし、「Karpathy LLM Wiki」を検索
3. **Install**をクリック、その後**Enable**

**🌐 または Community Pluginウェブサイトから —** [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki)を訪れ、**Add to Obsidian**をクリックして直接インストール。

**⚙️ 手動（代替）:**

1. [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)から`main.js`、`manifest.json`、`styles.css`をダウンロード
2. Obsidianで、Settings → Community pluginsに移動。**Installed plugins**タブで、フォルダアイコンをクリックしてプラグインディレクトリを開く
3. `karpathywiki`というフォルダを作成、三つのファイルを内部にドロップ
4. Obsidianに戻り、refreshアイコンをクリック — **Karpathy LLM Wiki**がInstalled pluginsに表示される
5. Toggle onしてenable

**🔨 開発:** `git clone`、`pnpm install`、`pnpm build`

### 🔄 プラグインの更新

このプロジェクトは急速に発展しており、新機能、修正、の改善が頻繁にリリースされます。常に最新の状態を保つことをお勧めします：

**方法A — 手動更新（推奨）:**
1. **設定 → コミュニティプラグイン**を開く
2. **更新を確認**をクリック
3. リストで **Karpathy LLM Wiki** を見つけ、**更新**をクリック

**方法B — 自動更新を有効にする:**
1. **設定 → コミュニティプラグイン**を開く
2. **プラグインの更新を自動的に確認**をオンにする
3. 新しいバージョンが検出されると、手動で更新できます

> 💡 **なぜ更新を続けるべきなのか？** 各リリースには、新機能、パフォーマンスの改善、重要なバグ修正が含まれる可能性があります。私たちはこのプラグインを積極的にメンテナンスしています — 更新を逃すことは、より良い体験を逃すことを意味します。

### 🔑 LLM Providerを設定

1. Settings → Karpathy LLM Wikiを開く
2. ドロップダウンからProviderを選択（Anthropic、Anthropic Compatible、Google Gemini、OpenAI、DeepSeek、Kimi、GLM、Ollama、OpenRouter、またはcustom）
3. API keyを入力（Ollamaは不要）
4. **Fetch Models**をクリックしてmodelドロップダウンをpopulate、またはmodel名を手動で入力
5. **Test Connection**をクリック、その後**Save Settings**

**🦙 Ollama（ローカル、API key不要）:** [Ollama](https://ollama.com)をインストール、modelをpull（`ollama pull gemma4`）、Providerドロップダウンで「Ollama (Local)」を選択。

> 詳細は[Model推奨](#-model推奨)を参照してください。

### 🎮 使用方法

| 方法 | 操作 |
|------|------|
| **📥 単一ソースの取り込み** | `Cmd+P` → "単一ソースの取り込み" — 特定のノートを選択し、エンティティとコンセプトをWikiページとして抽出 |
| **📂 フォルダーからの取り込み** | `Cmd+P` → "フォルダーからの取り込み" — フォルダを選択し、全ノートをバッチ処理 |
| **🔍 Wikiに問い合わせ** | `Cmd+P` → "Wikiに問い合わせ" — 質問し、`[[wiki-links]]`付きのストリーミング回答を取得 |
| **🛠️ WikiのLint** | `Cmd+P` → "WikiのLint" — 重複検出、dead links、orphans、空ページ、不足エイリアスの健全性スキャン |
| **📋 インデックスの再生成** | `Cmd+P` → "インデックスの再生成" — `wiki/index.md`をエイリアス情報付きで再構築 |
| **⏹️ 操作キャンセル** | `Cmd+P` → "Cancel current ingestion" またはステータスバークリック — バッチ境界で安全に停止し、完了済みの作業を保持 |
| **🎯 ワンクリック取込** | 左サイドバーの `sticker` アイコンまたは `Cmd+P` → "Ingest current file" — 現在開いているファイルを直接取込 |
| **💡 スキーマ更新の提案** | `Cmd+P` → "スキーマ更新の提案" — LLMがWikiを分析しスキーマ改善を提案 |

同じSourceを再ingestすると、Entity/Conceptページは増分更新（新情報がmerge）。Summaryページはregenerateされる。

**💡 Smart Batch Skip:** フォルダingest時、プラグインは既処理ファイルを自動検出・skipし、時間とAPI costを節約。Batch reportにskip countが表示される。

### ⚠️ 旧バージョンからアップグレードする場合

**本リリースは完全な後方互換性があります。** v1.14.0には破壊的変更は含まれていません — 既存のWikiページ、設定、ワークフローはすべて保持されます。再設定やデータ移行は不要です。

**複数バージョンにわたって構築された既存のWiki**をお使いの場合、一部のページに最近の機能（aliases、alias-aware dedup、モダン化されたプロンプト）が欠けている可能性があります。**Lint Wiki** を実行して注意が必要な箇所を確認してください。**Smart Fix All** を使えば、最も一般的なクリーンアップをワンクリックで完了できます。

**v1.14.0より前のバージョン**からアップグレードする場合は、**Lint Wiki** を1回実行して、過去の蓄積された問題を自動修正してください：
- **二重入れ子リンク** `[[[[entities/Foo|Foo]]]]` がlog.mdに存在する場合 — LintがゼロLLMコストで検出・修正します
- **クロスディレクトリスタブ重複** — `entities/` と `concepts/` の両方に同じslugで存在するページが、正しく照合・マージされます

**複数バージョンにわたって構築されたWiki**の場合、以下の手順でWikiを最新基準に更新してください：

**1️⃣ インデックスを再構築**
`Cmd+P` → **"インデックスの再生成"** — これにより`wiki/index.md`が全ページのaliasエントリを含む形で再構築され、alias-aware検索が有効になります（例：「DSA」の検索で「DeepSeek-Sparse-Attention」が見つかる）。以前のインデックス形式はページタイトルしか表示していませんでした。

**2️⃣ WikiのLintを実行**
`Cmd+P` → **"WikiのLint"** — Wiki全体をスキャンし、以下を表示します：
- **🏷️ Missing aliases**: Aliasがないページ（**Complete Aliases** を一度も実行していないすべてのバージョンが対象）。**"Complete Aliases"** をクリックすると、LLMが翻訳、acronym、別名を一括生成。重複検出に不可欠です。
- **🔄 Duplicate pages**: 重複コンテンツを持つページ（例：alias-aware dedupがない旧バージョンで作成された「CoT」と「Chain of Thought」）。**"Merge Duplicates"** をクリックして統合し、すべてのaliasを保持します。
- **Dead links / Empty pages / Orphans**: 標準的なWikiメンテナンス項目。

**3️⃣ Smart Fix Allを使用**
Lintレポートの **"Smart Fix All"** をクリックすると、因果関係順にワンクリック修復：aliases完了 → duplicates統合 → dead links修正 → orphansリンク → empty pages拡充。複数バージョンにわたって構築されたWikiをクリーンアップする最速の方法です。

**4️⃣ 並列ページ生成を有効化**
Settings → **Ingestion Acceleration**:
- **⚡ Page Generation Concurrency**: ほとんどのProviderでは3に設定。10以上のEntityがあるSourceでingestionが2〜3倍高速化。
- **⏱️ Batch Delay**: 300msから開始。rate limitに達した場合は500〜800msに増加。

**5️⃣ 現在の設定を確認:**
- **🌐 Wiki Output Language**: UI言語から独立 — Wikiを日本語で書きながらプラグインUIは英語のまま、またはその逆も可能。
- **📊 抽出粒度**：5つのオプションでLLMがSourceからEntityを抽出する深さを制御：
  - **精细**（約100項目）— 深層分析、端の言及も含む。高トークンコスト、重要Source向け。
  - **標準**（約50項目）— バランス型抽出。日常ノートの推奨デフォルト。
  - **粗め**（約10項目）— 簡易概要、核心Entityのみ。低コスト、高速インジェスト。
  - **最小**（約5項目）— 本質項目のみ。100+ファイルのバッチ処理や新Sourceテストに最適。
  - **カスタム**（1～300項目）— ユーザー定義Entity/Concept上限、特殊ワークフロー向け。
  > 💡 **推奨**：大規模フォルダのバッチ処理では最小/粗めを使用し時間とAPIコストを節約。精细は選択的に深層分析に値する重要ドキュメントのみに使用。
- **🔄 Auto-Maintenance**: オプションのファイル監視、定期Lint、起動時ヘルスチェック。すべてデフォルトOFF — 自動バックグラウンド処理が必要な場合のみ有効化。

> **🛡️ Safety**: Parallel generationは`Promise.allSettled`を使用 — 一ページが失敗しても他は継続。失敗ページはexponential backoffで個別retry。Smart Batch Skipは既に取り込んだファイルを自動検出して時間とAPIコストを節約します。

---
---

## ⚡ v1.15.0 更新のポイント

今回は **Wiki 初期化 UX とアーキテクチャ最適化** のリリースです。初回使用時のスムーズなセットアップと、テスト基盤の継続的な拡張に焦点を当てています。

**主な改善点：**

- **Wiki 自動初期化（Issue #80）。** 初回の LLM 接続テストが成功すると、プラグインが自動的に Wiki フォルダ構造（entities、concepts、sources、schema）を作成します。設定パネルのステータスインジケータ（✅/⚠️）で Wiki の健全性をリアルタイムに表示。新規 Vault で「デフォルト Schema を再生成」ボタンが反応しない問題が解消されます。

- **SSE パーサーの抽出。** ストリーミングレスポンスの解析ロジック（Anthropic + OpenAI 形式）を `src/core/sse-parser.ts` に共有純関数として抽出。両フォーマット、CRLF 正規化、不正 JSON の許容、`[DONE]` 終端記号をカバーする 11 のテストを追加。

- **トランケーションリトライの抽出。** トークン切り捨てリトライポリシー（`stop_reason=max_tokens` または `finish_reason=length` の検出、max_tokens の 2 倍でリトライ）を `src/core/truncation-retry.ts` に統一。LLM クライアント間の重複コード 3 箇所を削除。上限動作、エラー伝播、警告ログをカバーする 7 のテスト。

- **テスト基盤の拡張。** +37 テスト（合計 446、21 ファイル）。AnthropicClient 切り捨てリトライテスト（9 テスト、prefill 中括弧復元、MAX_TOKENS_BATCH 上限、cacheBreakpoint 透過を含む）。Wiki 初期化テスト（10 テスト、純粋モック、Obsidian ランタイム不要）。

- **開発品質の閉塞。** TDD + プランニングループを CLAUDE.md に正式に記載し、実際の違反事例（2026-06-02）を追加。すべての新しいコード変更は 9 ステップの閉塞に従います：深い思考 → 計画 → テスト作成 → RED 確認 → 実装 → GREEN 確認 → リファクタリング → 4-Gate 検証 → 3-No レビュー。

**古いバージョンからのアップグレード？** そのままインストールして使用可能——破壊的変更はゼロ。既存の Wiki ページ、設定、ワークフローはすべて保持されます。再設定は不要です。

**すべてのユーザーにこのバージョンへのアップグレードを強く推奨します。**

---

## ✨ 特徴

### 📊 Knowledge Quality

- **🔍 Entity/Concept Extraction** — LLMがノートからEntity（人物、組織、製品、イベント）とConcept（理論、方法、用語）を抽出、flexible extraction granularity（最小~5項目、粗め~10、標準~50、精细~100、カスタム1～300）でanalysis depthとAPI costをbalance
- **🏷️ Mandatory Page Aliases** — 生成された各ページに少なくとも1 alias（翻訳、acronym、別名）を含み、cross-language重複検出を有効化
- **🔄 Duplicate Detection & Merge** — Semantic tieringでtrue duplicates（cross-language翻訳、abbreviations、spelling variants）をcatch；intelligent LLM mergeがcontentをfuseしaliasesをpreserve
- **🧩 Smart Knowledge Fusion** — Multi-source updateが新情報をredundancyなくmerge、contradictionsはattributionを伴ってpreserve、`reviewed: true`ページはoverwriteから保護
- **📏 Content Truncation Protection** — 8000 max_tokens、automatic stop_reason detection、全Providerで2× tokens retry
- **📝 Verbatim Source Mentions** — 原文のquoteをpreserve、optional translationでtraceability

### 🛠️ Maintenance

- **🔍 Lint Health Scan** — 包括的なcomprehensive reportでduplicates、dead links、empty pages、orphans、missing aliases、contradictionsを検出
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1（direct name matches: cross-language、abbreviations、高similarity titles）常にverified；Tier 2（indirect signals: shared links、moderate similarity）token budgetでfill
- **⚡ Smart Fix All** — Causality-ordered batch fix: duplicates merged → dead links resolved → orphans linked → empty pages expanded
- **🏷️ Alias Completion** — ワンクリックで欠落aliasを並列バッチ生成、今後の重複検出を改善
- **🔄 Auto-Maintenance** — Multi-folder file watcher、periodic lint、startup health check（すべてoptional）
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved`（AI fix）または`detected → pending_fix`（manual）

### 💬 Query & Feedback

- **🤖 Conversational Query** — ChatGPT-style dialog、streaming Markdown output、`[[wiki-links]]`、multi-turn history
- **📤 Query-to-Wiki Feedback** — 価値あるconversationをWikiにsave、Entity/Concept extraction、save前にsemantic dedup
- **🔒 Duplicate Save Prevention** — Hash trackingでunchanged conversationsのre-evaluationを阻止

### 🌐 LLM & Language

- **🔌 Multi-Provider Support** — Anthropic、Anthropic Compatible（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、OpenRouter、Ollama、custom endpoint
- **🔄 5xx Auto Retry** — 全clientsでHTTP 5xx/429/529/529エラー時exponential backoff retry（max 2）
- **📋 Dynamic Model List** — Provider APIからreal-time fetch
- **🌐 Wiki Output Language** — Interface独立の8言語（English/Chinese/Japanese/Korean/German/French/Spanish/Portuguese）、custom inputサポート
- **🌍 Full UI Internationalization** — プラグインUIが8言語対応（EN/ZH/JA/KO/DE/FR/ES/PT）、269+ UIフィールド完全翻訳、自然なローカル表現
- **⚡ Rate Limit Guardian** — 並列生成でレート制限発生時自動検出し提案：並列度を下げる、バッチ遅延を増やす、Providerを切り替える
- **🦙 Web Clipper Compatible** — Obsidian Web Clipperの`Clippings/`フォルダを1クリックで監視リストに追加、Webクリップを自動Wiki化

### 🏗️ Architecture & Performance

- **⚡ Parallel Page Generation** — Configurable 1–5 concurrent pages、default 3（parallel）、large sourcesで2–3× speedup、per-page error isolation
- **📚 Iterative Batch Extraction** — Adaptive batch sizing、long documentsのmax_tokens bottleneckを解消
- **🏛️ Three-Layer Architecture** — `sources/`（read-only）→ `wiki/`（LLM-generated）→ `schema/`（co-evolved config）
- **🧩 Modular Codebase** — 13 focused modules in `src/`

### 🔒 プライバシーとセキュリティ

- **バックエンドなし、テレメトリなし。** プラグインは完全にObsidian内部で動作します——外部サーバー、分析、データ収集は一切ありません。LLMプロバイダーを明示的に設定しない限り、ノートがVaultから出ることはありません。
- **データはデフォルトでローカルに保存。** プラグインは、選択したLLM API以外の場所にコンテンツを保存、キャッシュ、送信することはありません。取り込みやクエリのために送信するテキストのみがデバイスを離れます——それも設定したプロバイダーのみです。
- **Ollama、LM Studio、またはローカルプロバイダーによる完全ローカルモード。** 完全なデータ主権のために、ローカルで動作するLLMを使用してください。ノートは完全にあなたのマシン上で処理され——インターネットに触れることはありません。
- **最小限の権限。** VaultファイルアクセスはWiki管理に必要です（ノートの読み取り、ページの生成、リンク切れの検出）。ネットワークアクセスは設定したプロバイダーへのLLM API呼び出しのみに使用されます。クリップボードアクセスはQueryモーダルの「コピー」ボタンのみ——クリックした時だけです。

---


---

## ⌨️ コマンド

| コマンド | 説明 |
|---------|------|
| **📥 単一ソースの取り込み** | 単一ノートを選択 → Entity、Concept、Summaryを含むWikiページを生成 |
| **📂 フォルダーからの取り込み** | 任意のフォルダを選択 → 既存ノートからWikiを一括生成 |
| **🔍 Wikiに問い合わせ** | ストリーミング出力と`[[wiki-links]]`を伴う対話式Q&A |
| **🛠️ WikiのLint** | 包括的健康スキャン：重複、dead links、empty pages、orphans、missing aliases、矛盾 |
| **📋 インデックスの再生成** | `wiki/index.md`を手動で再構築 |
| **⏹️ 操作キャンセル** | `Cmd+P` → "Cancel current ingestion" またはステータスバークリック — バッチ境界で安全に停止し、完了済みの作業を保持 |
| **💡 スキーマ更新の提案** | LLMがWikiを分析しSchema改善を提案 |

---

## 📖 例

**入力:** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**出力 — Entityページ:** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2026-05-15
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["监督学习", "Supervised Learning"]
---

### Supervised Learning

### 基本情報
- タイプ: method
- ソース: [[sources/machine-learning]]

### 説明
Supervised learning（教師あり学習）は、ラベル付き訓練データから学習し、
未知のデータに対して予測を行う機械学習パラダイムです...

### 関連概念
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### 関連Entity
- [[entities/Arthur-Samuel|Arthur Samuel]]

### ソース内の記述
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 🤖 Model推奨

本プラグインはKarpathyの核となる理念に従う：**Wikiの完全なコンテキストをLLMに直接渡し、RAG検索の断片化は行わない**。長いコンテキストウィンドウを持つmodelを強く推奨 — Wikiが大きくなるほど、LLMはクロスページ整合性を維持するためにより多くのコンテキストを必要とする。

> 💡 なぜRAGを使わないのか？Karpathyは[オリジナルコンセプト](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)で、RAGは知識を断片化し、完全な知識グラフにわたるLLMの推論能力を損なうと指摘した。

**💰 コスパ優先戦略：** フラッグシップモデルは不要。以下の**経済的な代替案**で低コストで優れた結果を得られる：

| ティア | モデル | コンテキスト | 理由 |
|-------|--------|-------------|------|
| **🌟 コスパ最高** | **DeepSeek V4-Flash** | 1M tokens | 最安($0.14/M)、284B MoE、バッチ処理に最適 |
| **🌟 コスパ最高** | **Gemini-3.5-Flash** | 1M tokens | GPT-5.5の4倍速、エージェントタスク優秀 |
| **🌟 コスパ最高** | **Qwen3.6-Plus** | 1M tokens | コーディング・エージェント能力強、競争力価格 |
| **🌟 コスパ最高** | **Grok-4** | 2M tokens | 2M超長コンテキスト、超大型Wiki向け |
| **バランス型** | **Claude Sonnet 4.6** | 1M tokens | 品質とコストの良いバランス、$3/$15 per 1M tokens |
| **軽量型** | **Claude Haiku 4.5** | 200K tokens | 高速経済、小型Wiki向け |
| **エコノミー型** | **MiMo-V2.5-Flash** | 1M tokens | Xiaomiの高コスパ選択、309B MoEアーキテクチャ |
| **フラッグシップ型** | Claude Opus 4.7 | 1M tokens | 最高品質、高コスト — 選択的に使用 |
| **フラッグシップ型** | GPT-5.5 | 1M tokens | トップ推論、高コスト — 選択的に使用 |

ローカルmodel（Ollama）向け：context windowは通常small（8K–128K）。ingestionにはcloud providerの使用を検討し、queryにはローカルmodelを使用する。

**🔌 Anthropic Compatible（Coding Plan）:** ProviderがAnthropic互換APIエンドポイントを提供している場合、「Anthropic Compatible」を選択し、ProviderのBase URLとAPI Keyを入力してください。

> 💡 **サブスクリプションプラン：** Coding Plan、OpenAI Pro、Anthropic Proなどのサブスクリプションプランは、頻繁に使用する場合のコスト制御に最適です。本プラグインはこれらのサービスをサポートしています。

---

## 🏗️ アーキテクチャ

Karpathyの3層分離設計に基づく：

```
sources/     # 📄 ソースドキュメント（read-only）
  ↓ ingest
wiki/        # 🧠 LLM生成のWikiページ
  ↓ query / maintain
schema/      # 📋 Wiki構造設定（命名規則、ページテンプレート、分類ルール）
```

**コード構造** (`src/`):

```
wiki/               # Wikiエンジンモジュール
  wiki-engine.ts    # 🎯 オーケストレータ
  query-engine.ts   # 💬 対話クエリ
  source-analyzer.ts # 📊 イテレーティブバッチ抽出
  page-factory.ts   # 🏗️ Entity/Concept CRUD + マージ
  lint-controller.ts # 🔍 Lint オーケストレーション
  lint-fixes.ts     # 🛠️ 修正ロジック（dead links, empty pages, orphans）
  lint/             # Lint サブモジュール
    duplicate-detection.ts  # 🔄 プログラムによる候補生成
    fix-runners.ts          # ⚡ バッチ修正実行ヘルパー
  contradictions.ts # ⚠️ 矛盾検出
  system-prompts.ts # 🗣️ 言語ディレクティブ + セクションラベル
schema/             # Schema 共進化
  schema-manager.ts # 📋 Schema CRUD + 提案
  auto-maintain.ts  # 🔄 ファイルウォッチャ + 定期Lint
ui/                 # ユーザーインターフェース
  settings.ts       # ⚙️ 設定パネル
  modals.ts         # 📦 Lint/Ingest/Query モーダル
+ 共有モジュール: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**生成されるページ:**
- `wiki/sources/filename.md` — 📄 ソース要約
- `wiki/entities/entity-name.md` — 👤 Entityページ（人物、組織、プロジェクトなど）
- `wiki/concepts/concept-name.md` — 💡 Conceptページ（理論、方法、用語など）
- `wiki/index.md` — 📑 自動生成インデックス
- `wiki/log.md` — 📝 操作ログ

---

## ❓ FAQ

> **プラグインを最新に保ってください。** このプロジェクトは頻繁に更新され、数日ごとに新機能や修正が追加されます。Obsidianで **設定 → コミュニティプラグイン → 更新を確認** を定期的に実行してください。
>
> その他の質問は [GitHub FAQ Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28) をご覧ください。

### 💡 一般

**このプラグインは実際に何をするのですか？**
ノートを入れると、人物、概念、理論を抽出し、`[[双方向リンク]]` 付きの相互リンクされたWikiを生成します。*あなたの*ノートに基づいた回答が得られます — インターネットの幻覚ではありません。

**最低要件は？**
Obsidian v1.6.6+、デスクトップ（Windows/macOS/Linux）、LLM ProviderのAPI key。Ollamaはローカルで動作し、API keyは不要です。

**インストール後、機能が使えないのはなぜですか？**
設定 → Karpathy LLM Wiki → プロバイダー選択 → APIキー入力 → Fetch Models → モデル選択 → Test Connection。緑の「LLM Ready」表示が出れば全機能が利用可能になります。設定の誤りによる silent failure を防ぐための仕様です。

**実行中の取り込み/Lintをキャンセルするには？**
ステータスバークリックまたは Ctrl+P → "Cancel current ingestion"。現在のバッチ完了後に安全に停止します。

**log.mdの二重括弧 `[[[[...]]]]` を修正するには？**
**Lint Wiki** を実行してください。スキャナがwikiディレクトリ全体（log.mdを含む）の二重入れ子wikiリンクをゼロLLMコストで自動検出・修正します。手動でのクリーンアップは不要です。

**どのモデルを選ぶべきですか？**
上記の[Model推奨](#-model推奨)を参照。長いコンテキストウィンドウを持つモデルを推奨 — Wikiが大きいほど、LLMはより多くのコンテキストを必要とします。

### 🏷️ エイリアスと重複

**Lintでほとんどのページに「missing aliases」と表示されるのはなぜ？**
v1.7.11より前に生成されたページにはaliasが含まれていません。これは無害です — aliasは必須ではなく機能強化です。Lintレポートの **Complete Aliases** をクリックすると、LLMが翻訳、acronym、別名を一括生成します。Aliasが揃うと、重複検出とalias-aware検索がはるかに効果的になります。

**類似した名前の重複ページが表示されるのはなぜ？**
v1.7.10より前のバージョンにはalias-aware重複検出がありませんでした。**Lint Wiki** を実行 → **Merge Duplicates** をクリックして統合します。統合後のページは両方のaliasを保持し、将来の重複を防止します。

**重複検出はどのように機能しますか？（v1.7.10+）**
2層のセマンティック検出：第1層（常にLLM検証）は言語間マッチ、略語、高類似度タイトルをキャッチ。第2層は残りのトークン予算を中程度類似度の候補で埋めます。Aliasは第1層にとって重要です — ページがv1.7.11より前の場合は **Complete Aliases** を実行してください。

**「汚染ページ」とは？（v1.9.0）**
フォルダプレフィックスが誤ってファイル名に含まれたページ（例：`concepts/conceptsレイアウト最適化.md`）。**Lint Wiki** → **🧹 Fix Polluted Pages** で名前を変更し、すべての入リンクを更新します。

### ⚡ パフォーマンスとコスト管理

**取り込みを高速化するには？**
**設定 → Ingestion Acceleration** で：**Page Generation Concurrency** を3～5に増やし（並列ページ作成）、**Batch Delay** を100～300msに下げます（レート制限に注意）。「最小」「粗め」または「標準」の**抽出粒度**を選択すると、生成ページ数が減りAPIコストを節約できます。

**HTTP 429エラーが発生するのはなぜ？**
プラグインは自動的にレート制限を検出し、提案します：同時実行数を1～2に下げる、Batch Delayを500～800msに増やす、またはより高い制限のProviderに切り替える。

**APIコストをコントロールするには？**
- Auto-MaintenanceはデフォルトでOFF（必要な場合のみ有効化）
- Smart Batch Skipは既取り込みファイルを自動スキップ
- 「Standard」または「Coarse」粒度 = より少ないLLM呼び出し
- Batch Delay > 500msは呼び出しを分散するだけでトークン消費は増えない
- Lintレポートは修正実行前にカウントを表示し、コストに見合うか判断可能

### 🧹 メンテナンス

**Smart Fix Allは何をしますか？**
因果関係の順序で修正を実行（v1.9.0+）：
1. 🧹 汚染ページ修正 → 2. 🏷️ Alias補完 → 3. 🔄 重複統合 → 4. 🔗 デッドリンク修正 → 5. 🔗 孤立ページリンク → 6. 📝 空ページ拡充

**大きなWikiでLintがフリーズする？**
v1.7.17+にアップグレード — Lintは50ページごとにObsidianのUIスレッドに制御を戻し、1200+ページのWikiでもフリーズを防止します。

### 🔍 トラブルシューティング

**Queryが存在を知っているページを見つけられない？**
3つの原因：（1）インデックスが古い → **Regenerate index**。（2）Alias不足 → **Complete Aliases**。（3）言い回しを変える — LLMはセマンティックマッチングを行い、キーワード検索ではない。

**Wikiページを手動で編集できますか？**
はい。frontmatterに `reviewed: true` を設定すると上書きから保護されます。手動で追加したalias、tags、sourcesはマージ時にも保持されます。

**安全なアップグレード方法は？**
プラグインはソースファイルを変更しません。`wiki/` をバックアップ → プラグイン更新 → **Regenerate index** → **Lint Wiki** → 選択的に修正。

**ヘルプを得るには？**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — バグ報告
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 質問とフィードバック

---

## 🔒 透明性とコンプライアンス

このプラグインはObsidianコミュニティプラグインマーケットに掲載されており、セキュリティと権限の自動レビューを受けています。

**このプラグインにはバックエンドもサーバーインフラもなく、いかなるデータ収集も行いません。** Obsidian内で動作する純粋なローカルソフトウェアです。プラグインはいかなる方法でもデータを収集、保存、送信することはできません——そのようなサーバーは存在しないからです。

**ネットワークアクセス**は設定したLLMプロバイダーとの通信のみに使用され、他のネットワーク呼び出しは行われません。これは完全にあなたの管理下にあります：どのプロバイダーを選ぶか、APIキーを入力するか、データの送信先を決めるのはあなたです。

**ファイルシステムアクセス**（Vault列挙）はWikiの構築と保守に必要です：ソースノートの読み取り、ページの生成、リンク切れのスキャン、重複ページの検出。プラグインがソースファイルを変更することは決してありません——wikiフォルダ内のファイルのみです。

**クリップボードアクセス**はQueryモーダルの「コピー」ボタンのみに使用され、クリックした時だけです。

完全なデータローカリティを希望する場合は、OllamaやLM StudioなどのローカルLLMプロバイダーを使用してください。ローカルプロバイダーでは、データがマシンから出ることは決してありません。
## 📜 ライセンス

MIT License — [LICENSE](LICENSE)を参照

---

## 🙏 謝辞

- **💡 Concept:** [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Original LLM Wiki concept
- **🛠️ Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM SDKs:** Anthropic, OpenAI, Google, DeepSeek, Kimi, GLM, OpenRouter, Ollama — LLM Provider

---

**公式サイト:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)