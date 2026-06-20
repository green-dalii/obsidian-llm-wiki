![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> AI駆動の構造化知識ベース — ノートを自動的にWikiに変換。[Andrej KarpathyのLLM Wiki概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)に基づく実装。
>
> **Obsidian公式評価95/100** | 8言語ネイティブ対応 | 活発に維持、継続進化

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-9-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | **日本語** | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[公式サイト](https://llmwiki.greenerai.top/) | [ブログ](https://llmwiki.greenerai.top/blog/) | [フィードバック](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 DeepWiki でコードベースを探索](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ 素早い更新のお知らせ：** 本プロジェクトは急速に進化しており、バグ修正、パフォーマンス改善、新機能、UX の最適化を頻繁に行っています。Obsidian で常に最新バージョンに更新することをお勧めします（**設定 → コミュニティプラグイン → 更新を確認**）。プラグインの自動更新を有効にすることもできます。

## 📑 Contents

- [💡 LLM-Wikiとは？](#-llm-wikiとは)
- [⚡ なぜ Obsidian + LLM-Wiki？](#-なぜ-obsidian--llm-wiki)
- [🚀 クイックスタート](#-クイックスタート)
  - [📦 インストール](#-インストール)
  - [🔄 アップデート](#-アップデート)
  - [🔑 LLMプロバイダーの設定](#-llmプロバイダーの設定)
  - [🎮 使い方](#-使い方)
  - [⚠️ 旧バージョンからのアップグレード](#️-旧バージョンからのアップグレード)
- [⚡ v1.20.3 更新のポイント](#-v1203-更新のポイント)
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

## ⚡ なぜ Obsidian + LLM-Wiki？

Obsidianはリンク思考において卓越しています。しかし、すべてのリンクを自分で作らなければならないという課題があります。

LLM-Wikiはその構造を反転させます。あなたが手作業でグラフを構築する代わりに、AIが一緒にグラフを育ててくれます。新しい概念についてノートを追加すれば、見落としていたつながりを見つけてくれます。質問をすれば、あなた自身の知識グラフを辿り、引用付きの回答を返してくれます。

- **🔗 グラフビューが動き出す。** 新しいノートはただ置かれるだけでなく、Entity、Concept、ソースへのリンクを芽吹かせます。グラフは有機的に成長し、プラグインがそれを維持します——重複の検出、リンク切れの修正、エイリアスによる言語間の橋渡し。
- **💬 ノートが会話できるように。** 検索が対話になります。「Xについて何を書いた？」がダイアログになり、ストリーミングレスポンスと`[[wiki-links]]`がパンくずリストとなります。すべての回答は、あなた自身の知識へと深く踏み込む道です。
- **🧠 Obsidianが思考パートナーに。** ノートの保管庫から、あなたが*考える*のを助けるものへと変わります——隠れたつながりを浮き彫りにし、矛盾を指摘し、自分が忘れていたことを思い出させてくれます。

---

## 🚀 クイックスタート

### 📦 インストール

**🌟 推奨 — Obsidianコミュニティプラグインマーケット：**

1. Obsidianで **設定 → コミュニティプラグイン** を開く
2. **ブラウズ** をクリックして「Karpathy LLM Wiki」を検索
3. **インストール** をクリックし、**有効化** する

**🌐 コミュニティプラグインのWebサイトから —** [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) にアクセスし、**Obsidianに追加** をクリックして直接インストールできます。

**⚙️ 手動インストール（代替方法）：**

1. [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) から `main.js`、`manifest.json`、`styles.css` をダウンロード
2. Obsidianで 設定 → コミュニティプラグイン を開く。**インストール済みプラグイン** タブでフォルダアイコンをクリックし、プラグインディレクトリを開く
3. `karpathywiki` という名前のフォルダを作成し、3つのファイルを配置
4. Obsidianに戻り、更新アイコンをクリック — **Karpathy LLM Wiki** がインストール済みプラグインに表示される
5. トグルをオンにして有効化

**🔨 開発用：** `git clone`、`pnpm install`、`pnpm build`

### 🔄 アップデート

本プロジェクトは急速に進化しており、新機能、バグ修正、改善が頻繁にリリースされます。最新の状態に保つことをお勧めします：

**オプションA — 手動アップデート（推奨）：**
1. **設定 → コミュニティプラグイン** を開く
2. **更新を確認** をクリック
3. **Karpathy LLM Wiki** を見つけ、**更新** をクリック

**オプションB — 自動更新を有効にする：**
1. **設定 → コミュニティプラグイン** を開く
2. **プラグインの自動更新を確認** をオンにする
3. 新しいバージョンが自動的に検出されます。都合の良いタイミングで手動で更新してください

> 💡 **なぜ最新版を保つべき？** 各リリースには新機能、パフォーマンス改善、重要なバグ修正が含まれている場合があります。

### 🔑 LLMプロバイダーの設定

1. 設定 → Karpathy LLM Wiki を開く
2. ドロップダウンからプロバイダーを選択（Anthropic、Anthropic Compatible、Google Gemini、OpenAI、DeepSeek、Kimi、GLM、MiniMax、LM Studio、Ollama、OpenRouter、またはカスタム）
3. APIキーを入力（Ollamaは不要）
4. **Fetch Models** をクリックしてモデルリストを取得するか、モデル名を手動入力
5. **Test Connection** をクリックし、**Save Settings** を保存

**🦙 Ollama（ローカル、APIキー不要）：** [Ollama](https://ollama.com) をインストールし、モデルをpull（`ollama pull gemma4` または `ollama pull qwen3.5:27b`）、プロバイダードロップダウンで「Ollama (Local)」を選択。

**🎛️ LM Studio（ローカル、APIキー不要）：** [LM Studio](https://lmstudio.ai) をインストールし、ローカルサーバーを起動（デフォルト `http://localhost:1234/v1`）、プロバイダードロップダウンで「LM Studio (Local)」を選択。

### 🎮 使い方

| 方法 | 使い方 |
|------|--------|
| **📥 単一ソースの取り込み** | `Cmd+P` → "Ingest single source" — ノートを選択してEntityとConceptを抽出 |
| **📂 フォルダーからの取り込み** | `Cmd+P` → "Ingest from folder" — フォルダを選択し、Wikiを一括生成 |
| **🔍 Wikiに問い合わせ** | `Cmd+P` → "Query wiki" — 質問をし、ストリーミング回答を取得 |
| **🛠️ WikiのLint** | `Cmd+P` → "Lint wiki" — 健康スキャン：重複、dead links、空ページ、孤立ページ |
| **📋 インデックスの再生成** | `Cmd+P` → "Regenerate index" — `wiki/index.md` を再構築 |
| **💡 スキーマ更新の提案** | `Cmd+P` → "Suggest schema updates" — LLMがスキーマの改善を提案 |
| **🎯 ワンクリック取り込み** | サイドバーのアイコンをクリック、または `Cmd+P` → "Ingest current file" |

### ⚠️ 旧バージョンからのアップグレード

**本リリースは完全に後方互換性があります。** v1.0.0以降、破壊的変更はありません。

**v1.20.3へアップグレードする場合**：ソースページのスラッグにフィンガープリントが付与されます（すべての `sources/<slug>.md` が `sources/<ベース名>_<6桁hex>.md` になります）。次回の取り込み時に、既存の `sources/` ページはその場でリネームされ、すべての `[[sources/<slug>]]` バックリンクが自動更新されます。操作は不要ですが、Obsidian のファイルエクスプローラーで一瞬リネームが表示されることがあります。`sources/<slug>.md` パスを直接参照する外部スクリプトやブックマークがある場合は、新しいフィンガープリント付きパスに更新してください。

**v1.16.0以前のバージョンからアップグレードする場合**、一度 **Lint Wiki** を実行して過去の問題を自動修正してください。

**複数バージョンにわたって構築されたWikiの場合：**

**1️⃣ インデックスを再構築** — `Cmd+P` → "Regenerate index"

**2️⃣ Lint Wikiを実行** — `Cmd+P` → "Lint wiki" — 欠落alias、重複、dead links、孤立ページをスキャン

**3️⃣ Smart Fix Allを使用** — Lintレポートでワンクリック修復

**4️⃣ 並列ページ生成を有効化** — 設定 → Page Generation Concurrency: 3、Batch Delay: 300ms

**5️⃣ 現在の設定を確認** — Wiki Output Language、Extraction Granularity、Auto-Maintenance

---

## ⚡ v1.20.3 更新のポイント

v1.20.3は、wiki書き込みパスの3つの潜在バグを修正する**パッチホットフィックス**です。新機能はありません——3つの修正はすべて、最初から存在するべきだった動作を復元する「整合性／潜在バグ」修正です。

- **🔧 ソースページslug衝突修正（Issue #155, PR #156）。** 2つのソースファイルがフォルダをまたいでファイル名を共有している場合（例：11個の Academy コースの `About this course.md`）、`slugify(basename)` が両方に同じ slug を生成し、2回目の取り込みが**静かに上書き**し、すべての `[[sources/<slug>]]` バックリンクが誤ったソースに解決されていました。修正：各ソース slug は `<basename>_<6桁全パス FNV-1a ハッシュ>` 形式に。既存 vault の再取り込みで `sources/` ページがリネームされ、バックリンクは即座に更新されます。@Indexed-Apogrypha による貢献。
- **🔧 `mergeFrontmatter` alias 重複排除（PR #154）。** 繰り返しの取り込みで `aliases` 配列が無制限に増加する可能性がありました——実環境のあるページでは同じ alias ブロックが~15回（86行の重複）累積していました。`mergeFrontmatter` は `enforceFrontmatterConstraints` と整合して `fm.aliases` を重複排除します。@DocTpoint による貢献。
- **🔧 Stage-4 `reviewed: true` ガード（PR #158）。** 関係のないノートを取り込むと、LLM が `reviewed: true` ページの本文を書き換える可能性がありました——reviewed ロックは `createOrUpdatePage` パスでのみ機能し、Stage-4 パスでは機能していませんでした。修正：`updateRelatedPage` は `reviewed: true` ページを `appendToReviewedPage` にルーティングします。@DocTpoint による貢献。
- **🛠 tsconfig 整理。** `lib` を ES2021 に更新；不要な `baseUrl` を削除。

フォルダをまたいで同名ファイルを多数取り込むユーザーや、`reviewed: true` ページロックを使用するユーザーは、特に本バージョンへのアップグレードを強く推奨します。

詳細は [CHANGELOG.md](../CHANGELOG.md) を参照。

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
- **🔄 Auto-Maintenance** — Multi-folder file watcher、periodic lint、startup health check（Startup Quick Fixes デフォルトON、File Watcher と Periodic Lint デフォルトOFF）
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved`（AI fix）または`detected → pending_fix`（manual）

### 💬 Query & Feedback

- **🤖 Conversational Query** — ChatGPT-style dialog、streaming Markdown output、`[[wiki-links]]`、multi-turn history
- **📤 Query-to-Wiki Feedback** — 価値あるconversationをWikiにsave、Entity/Concept extraction、save前にsemantic dedup
- **🔒 Duplicate Save Prevention** — Hash trackingでunchanged conversationsのre-evaluationを阻止

### 🌐 LLM & Language

- **🔌 Multi-Provider Support** — Anthropic、Anthropic Compatible（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、MiniMax、LM Studio、OpenRouter、Ollama、custom endpoint
- **🔄 5xx Auto Retry** — 全clientsでHTTP 5xx/429/529エラー時exponential backoff retry（max 2）
- **📋 Dynamic Model List** — Provider APIからreal-time fetch
- **🌐 Wiki Output Language** — Interface独立の8言語（English/Chinese/Japanese/Korean/German/French/Spanish/Portuguese）、custom inputサポート
- **🌍 Full UI Internationalization** — プラグインUIが9言語対応（EN/ZH/JA/KO/DE/FR/ES/PT/IT）、269+ UIフィールド完全翻訳、自然なローカル表現
- **⚡ Rate Limit Guardian** — 並列生成でレート制限発生時自動検出し提案：並列度を下げる、バッチ遅延を増やす、Providerを切り替える
- **🦙 Web Clipper Compatible** — Obsidian Web Clipperの`Clippings/`フォルダを1クリックで監視リストに追加、Webクリップを自動Wiki化

### 🏗️ Architecture & Performance

- **⚡ Parallel Page Generation** — Configurable 1–5 concurrent pages、default 3（parallel）、large sourcesで2–3× speedup、per-page error isolation
- **📚 Iterative Batch Extraction** — Adaptive batch sizing、long documentsのmax_tokens bottleneckを解消
- **🏛️ Three-Layer Architecture** — `sources/`（read-only）→ `wiki/`（LLM-generated）→ `schema/`（co-evolved config）
- **🧩 Modular Codebase** — 20+ focused modules in `src/`

### 🔒 プライバシーとセキュリティ

- **バックエンドなし、テレメトリなし。** プラグインは完全にObsidian内部で動作します——外部サーバー、分析、データ収集は一切ありません。LLMプロバイダーを明示的に設定しない限り、ノートがVaultから出ることはありません。
- **データはデフォルトでローカルに保存。** プラグインは、選択したLLM API以外の場所にコンテンツを保存、キャッシュ、送信することはありません。取り込みやクエリのために送信するテキストのみがデバイスを離れます——それも設定したプロバイダーのみです。
- **Ollama、LM Studio、またはローカルプロバイダーによる完全ローカルモード。** 完全なデータ主権のために、ローカルで動作するLLMを使用してください。ノートは完全にあなたのマシン上で処理され——インターネットに触れることはありません。
- **最小限の権限。** VaultファイルアクセスはWiki管理に必要です（ノートの読み取り、ページの生成、リンク切れの検出）。ネットワークアクセスは設定したプロバイダーへのLLM API呼び出しのみに使用されます。クリップボードアクセスはQueryモーダルの「コピー」ボタンのみ——クリックした時だけです。

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
created: 2025-12-01
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
| **🌟 コスパ最高** | **Grok-4** | 2M tokens | xAI 2025-07 フラッグシップ、2M コンテキスト、推論・コードタスクに強力 |
| **バランス型** | **Claude Sonnet 4.6** | 1M tokens | 品質とコストの良いバランス、$3/$15 per 1M tokens |
| **軽量型** | **Claude Haiku 4.5** | 200K tokens | 高速経済、小型Wiki向け |
| **エコノミー型** | **Xiaomi MiMo-V2.5** | 1M tokens | Xiaomi 310B/15B MoE、2026-04 MIT オープンソース、エージェント・マルチモーダル |
| **フラッグシップ型** | Claude Opus 4.7 | 1M tokens | 最高品質、高コスト — 選択的に使用 |
| **フラッグシップ型** | GPT-5.5 | 1M tokens | トップ推論、高コスト — 選択的に使用 |

ローカルmodel（Ollama）向け：context windowは通常small（8K–128K）。ingestionにはcloud providerの使用を検討し、queryにはローカルmodelを使用する。

**🔌 Anthropic Compatible（Coding Plan）:** ProviderがAnthropic互換APIエンドポイントを提供している場合、「Anthropic Compatible」を選択し、ProviderのBase URLとAPI Keyを入力してください。

**🦙 Ollama（ローカル、API キー不要）：** [Ollama](https://ollama.com) をインストールし、モデルを pull（`ollama pull gemma4` または `ollama pull qwen3.5:27b`）、プロバイダードロップダウンで「Ollama (Local)」を選択。

**🎛️ LM Studio（ローカル、API キー不要）：** [LM Studio](https://lmstudio.ai) をインストールし、ローカルサーバーを起動（デフォルト `http://localhost:1234/v1`）、プロバイダードロップダウンで「LM Studio (Local)」を選択。LM Studio は OpenAI 互換のサーバーを内蔵しており、API キーフィールドは任意。

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
    scanners.ts            # 🔍 Scanners (dead links, orphans, aliases)
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
Obsidian v1.11.0+、デスクトップ（Windows/macOS/Linux）、LLM ProviderのAPI key。Ollamaはローカルで動作し、API keyは不要です。

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
**設定 → LLM Configuration** で：**Page Generation Concurrency** を3～5に増やし（並列ページ作成）、**Batch Delay** を100～300msに下げます（レート制限に注意）。「最小」「粗め」または「標準」の**抽出粒度**を選択すると、生成ページ数が減りAPIコストを節約できます。

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

**v1.20.3 へのアップグレード後、`sources/` ファイル名が変更されました。問題ですか？（v1.20.3+）**
いいえ — 新しい衝突回避のためのソースページスラッグフィンガープリントが機能しています。すべての `sources/<slug>.md` が `sources/<ベース名>_<6桁hex>.md` になります（hex はファイルのフルパスの FNV-1a ハッシュ）。別フォルダで同じベース名のファイル（例：Academy コースの 11 個の `About this course.md`）が衝突しなくなります。再取り込み時に既存の `sources/` ページはその場でリネームされ、すべての `[[sources/<slug>]]` バックリンクが自動更新されます。`sources/<古いslug>.md` を指す外部スクリプトやブックマークがある場合は、新しいフィンガープリント付きパスに更新してください。

**無関係なソースを再取り込みすると、`reviewed: true` でロックしたページを上書きしますか？（v1.20.3+）**
いいえ — Stage 4（`updateRelatedPage`）も `reviewed: true` を尊重し、append-only パスにルーティングされます。取り込みパスと同じ動作です。編集済みの本文はそのまま保持され、本当に新しいコンテンツのみが追加されます。

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
- **🔌 LLM transport:** Obsidian `requestUrl` (Anthropic) + 手書きの OpenAI 互換 HTTP クライアント（サードパーティ OpenAI 互換 Provider）

---

**公式サイト:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)

**Closes:** #90 — Source ページは LLM 生成のコンセプト名ではなく、ソースノートの frontmatter から tags を継承するようになりました。
