![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> AI駆動の構造化知識ベース — ノートを自動的にWikiに変換。[Andrej KarpathyのLLM Wiki概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)に基づく実装。

> **Obsidian公式評価95/100 | 10言語ネイティブ対応 | 埋め込み不要のグラフ検索 | 完全なデータ主権 | あらゆるLLMプロバイダー対応**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | **日本語** | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[公式サイト](https://llmwiki.greenerai.top/) | [Obsidian マーケットプレース](https://community.obsidian.md/plugins/karpathywiki) | [ブログ](https://llmwiki.greenerai.top/blog/) | [フィードバック](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 DeepWiki でコードベースを探索](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← このプラグインが役に立ったら、コーヒー一杯♥️を奢ってくれたら嬉しいです、またはスター🌟を付けてね↗

---

> **⚡ 素早い更新のお知らせ：** 本プロジェクトは急速に進化しており、バグ修正、パフォーマンス改善、新機能、UX の最適化を頻繁に行っています。Obsidian で常に最新バージョンに更新することをお勧めします（**設定 → コミュニティプラグイン → 更新を確認**）。プラグインの自動更新を有効にすることもできます。
## 📑 Contents

- [🧠 Karpathy LLM Wiki Plugin for Obsidian](#-karpathy-llm-wiki-plugin-for-obsidian)
  - [📑 Contents](#-contents)
  - [💡 LLM-Wikiとは？](#-llm-wikiとは)
  - [⚡ なぜ Obsidian + LLM-Wiki？](#-なぜ-obsidian--llm-wiki)
  - [🚀 クイックスタート](#-クイックスタート)
    - [📦 インストール](#-インストール)
    - [🔄 アップデート](#-アップデート)
    - [🔑 LLMプロバイダーの設定](#-llmプロバイダーの設定)
    - [🎮 使い方](#-使い方)
    - [⚠️ 旧バージョンからのアップグレード](#️-旧バージョンからのアップグレード)
  - [⚡ v1.24.0 更新のポイント](#-v1240-更新のポイント)
  - [✨ 特徴](#-特徴)
    - [📊 ナレッジ品質](#-ナレッジ品質)
    - [🛠️ メンテナンス](#️-メンテナンス)
    - [💬 クエリとフィードバック](#-クエリとフィードバック)
    - [🌐 LLMと言語](#-llmと言語)
    - [🏗️ アーキテクチャとパフォーマンス](#️-アーキテクチャとパフォーマンス)
    - [🔒 プライバシーとセキュリティ](#-プライバシーとセキュリティ)
  - [📖 例](#-例)
  - [🤖 モデル推奨](#-モデル推奨)
  - [🏗️ アーキテクチャ](#️-アーキテクチャ)
  - [❓ FAQ](#-faq)
  - [🔒 透明性とコンプライアンス](#-透明性とコンプライアンス)
  - [💖 プロジェクトを支援する](#-プロジェクトを支援する)
    - [スポンサー](#スポンサー)
  - [📜 ライセンス](#-ライセンス)
  - [🙏 謝辞](#-謝辞)
  - [Star History](#star-history)

## 💡 LLM-Wikiとは？

書くのはあなた。整理するのはAI。質問するだけ。それがすべて。

**🎯 問題点。** ノートは宝の山です — 人物、概念、アイデア、その関連性。しかし今は、フォルダ内の単なるファイルに過ぎません。何が何に関連しているかを見つけるには、検索、タグ付け、そして記憶を頼りにする必要があります。

**✨ 解決策。** [Andrej Karpathyが提案した](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)エレガントなアプローチ：ノートを原材料として扱い、LLMがアーキテクトの役割を担う。LLMがあなたの書いたものを読み、エンティティと概念を抽出し、構造化されたWikiを構築する — `[[双方向リンク]]`、自動生成インデックス、そしてあなたの知識ベースに質問できるチャットインターフェースを備えたWikiです。

**📚 図書館員の役割は終わり。** 何をページにするか決める必要も、相互リンクを維持する必要も、情報が古くなったか心配する必要もありません。vault 内の任意のノート（またはフォルダ、複数選択）を選べば、LLM が読み取り、抽出、書き込み、リンク作成、矛盾のフラグ付けを行い — あなたは作業の流れに集中できます。

**🤖 これは単なるチャットボットではない。** ChatGPTはインターネットを知っています。LLM-Wikiは*あなた*を知っている — 正確には、あなたが教えた内容を。すべての回答は`[[wiki-links]]`を伴って知識グラフに戻ります。すべてのレスポンスは道の始点であり、終点ではありません。

**🏆 主な差別化 — ゼロ埋込コストのグラフ駆動検索。** 多くのナレッジベースプラグインはベクトル埋込（高コスト、プロバイダ依存、インターネット必須）を使います。LLM-Wikiは既存の`[[wiki-link]]`グラフ上でPersonalized PageRankを実行 — API呼び出しゼロ、新しい依存関係なし、ローカルモデル完全対応で、埋込並みの検索品質を実現します。i18n対応の**ゼロLLM Tier Bセクション抽出**（10言語）を加えることで、あらゆるプロバイダで動作するナレッジエンジンが完成します。

---

## ⚡ なぜ Obsidian + LLM-Wiki？

Obsidianはリンク思考において卓越しています。しかし、すべてのリンクを自分で作らなければならないという課題があります。

LLM-Wikiはその構造を反転させます。あなたが手作業でグラフを構築する代わりに、AIが一緒にグラフを育ててくれます。新しい概念についてノートを追加すれば、見落としていたつながりを見つけてくれます。質問をすれば、あなた自身の知識グラフを辿り、引用付きの回答を返してくれます。

- **🔗 グラフビューが動き出す。** 新しいノートはただ置かれるだけでなく、エンティティ、概念、ソースへのリンクを芽吹かせます。グラフは有機的に成長し、プラグインがそれを維持します——重複の検出、リンク切れの修正、エイリアスによる言語間の橋渡し。
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
| **📥 単一ソースの取り込み** | `Cmd+P` → "Ingest single source" — ノートを選択し、エンティティと概念を抽出 |
| **📂 フォルダーからの取り込み** | `Cmd+P` → "Ingest from folder" — フォルダを選択し、Wikiを一括生成 |
| **📑 複数ファイルの取り込み** | `Cmd+P` → "Ingest multiple files" — 再帰的フォルダツリー + ファイル別チェックボックスの2ペイン選択モーダルでノートを選び、ライブキュー付きで一括取り込み |
| **🎯 現在のファイルを取り込み** | 左リボンの`sticker`アイコンをクリック、または `Cmd+P` → "Ingest current file" — 編集中のファイルを取り込み |
| **🔍 Wikiに問い合わせ** | `Cmd+P` → "Query wiki" — 会話型Q&A、ストリーミング回答、`[[wiki-links]]`付き |
| **🛠️ WikiのLint** | `Cmd+P` → "Lint wiki" — 重複、リンク切れ、空ページ、孤立ページ、欠落エイリアス、矛盾のフルヘルススキャン |
| **📋 インデックスの再生成** | `Cmd+P` → "Regenerate index" — `wiki/index.md` を現在のページとエイリアスで再構築 |
| **📊 取り込み履歴の表示 (v1.21.0)** | `Cmd+P` → "View Ingestion History" — 過去の取り込み、Lintレポート、メンテナンス実行を検索・フィルタ可能なUIで閲覧 |
| **⏹ 現在の操作をキャンセル** | `Cmd+P` → "Cancel current ingestion" — 進行中の操作を次のバッチ境界でクリーンに停止 |
| **🎉 ウェルカムノートを再作成 (v1.23.0)** | `Cmd+P` → "Recreate Wiki Welcome Note" — 初回起動時のウェルカムノートを再生成 |

同じソースを再取り込みすると、エンティティ・概念ページに増分更新が行われ（新情報がマージ）、概要ページは再生成されます。

> 💡 **スマートバッチスキップ:** フォルダ取り込み時、処理済みファイルを自動検出してスキップし、時間とAPIコストを削減します。バッチレポートにスキップ数が表示されます。

### ⚠️ 旧バージョンからのアップグレード

**後方互換性があります。** v1.0.0以降、破壊的変更はありません — 既存のWikiページ、設定、ワークフローは再設定なしで保持されます。

**アップグレード後**、**Lint Wiki** → **Smart Fix All** でワンクリックの因果順修復を実行してください：
1. 🏷️ エイリアス補完（翻訳、略語、別名をLLMがバッチ生成）
2. 🔄 重複マージ（言語間、略語、高類似度マッチ）
3. 🔗 リンク切れ / 孤立ページリンク / 空ページ拡張の修正

その後 **Regenerate Index** で `wiki/index.md` を再構築し、すべてのページのエイリアスエントリーを有効にします — エイリアス対応検索が可能になります（例：「DSA」で「DeepSeek-Sparse-Attention」を検出）。

> 📖 特定のバージョン間アップグレードの詳細な手順（v1.20.3 slug fingerprint、v1.16.0 二重ネストリンクなど）は [GitHub Discussions / Upgrading](https://github.com/green-dalii/obsidian-llm-wiki/discussions) で管理されています。

**確認すべき設定:** Wiki Output Language（UIとは独立）、Extraction Granularity（Minimal–Fine、+ Custom）、Page Generation Concurrency（デフォルト3）、Batch Delay（デフォルト300ms）。

---
## ⚡ v1.24.0 更新のポイント

5 つの主要テーマ：タスク別モデル選択、カスタムクエリ指示、4 つのモノリス分割、ソースノート別名伝播、ユーザー報告の frontmatter 修正。v1.23.x ユーザー全員にアップグレードを推奨します。

- **🎛️ タスク別モデル (#208)。** **取り込み / 校正 / クエリ** で異なるモデルを選択、または統一を維持。設定 → Wiki → *モデルスコープ* をワンクリックで切り替え。**接続テスト** ボタンは設定された各モデルを順番にチェックし、ひとつでも失敗したら即停止——すべてのタスクモデルがテストを通過してはじめて接続成功とみなされます。
- **📝 カスタムクエリ指示 (#251, `jameses-cyber`)。** Query Wiki パネル内に折りたたみ可能なパネルが追加され、すべてのシステムプロンプトに永続的な指示（リサーチモード、引用スタイル、「捏造禁止」ルールなど）を追加できます。5000 文字の防御的上限付き。Query Wiki チャットのみに厳密にスコープ；取り込み / 校正 / ページ生成は意図的に影響を受けません。モードドロップダウンは v1.25.0+ で計画中。
- **🧱 4 つのモノリス分割（v1.23.0 シリーズ P0 フォローアップ）。** `controller.ts`（PR #248）、`history-modal.ts`（PR #249、1579 → 14 ファイル、93 テスト）、`query-engine.ts`（PR #250、1373 → 15 ファイル）、`modals.ts`（PR #257、1008 → 7 ファイル）——各 god 関数 / god クラスをフォーカスモジュールに分解。次期機能に向けた構造的準備が完了。
- **🏷️ ソースノート別名伝播 (#185)。** ソースノートの frontmatter `aliases:` が生成される `sources/<slug>` ページに流れ込み、下流の `[[wiki-link]]` マッチと別名認識検索がすべての引用に届くようになります。"DSA ≠ DeepSeek-Sparse-Attention" のような取りこぼしを削減。
- **🔀 Tier-1 + Tier-2 マージトリアージ (#216, `DocTpoint`)。** 分類してからルートを決める重複バイパス戦略：偽の Tier-1 候補を即座にスキップし、残りにだけ Tier-2 を実行。高精度マッチを犠牲にせず Lint マージバッチサイズを縮小。
- **🐛 Frontmatter 書き込み修復（ユーザー報告 4 バグ）。** `aliases:[]` が誤って別名不足と判定されなくなる；書き込み時に重複別名を自動折りたたみ；ブロックスタイル frontmatter を保持（インライン化しない）；失敗時は問題フィールド付きでログ記録。Smart Fix とマージパスに影響。
- **🚀 Query Wiki 初回クエリ PPR ウォームアップ。** エンジンレベル PPR グラフキャッシュ（`wikiFolder` 変更時に無効化 + `invalidatePageCaches` 時にクリア）——初回クエリがコールドスタートの lex-only フォールバックではなく Personalized PageRank を使用。
- **🌐 i18n 完全性** — タスク別モデルピッカー、モデルスコープドロップダウン、接続テストラベル用に各ロケールで 7 つの新キー。

**見直すべき設定：** モデルスコープ（統一 / タスク別、設定 → Wiki）、タスク別モデルフィールド（タスク別モードでのみ表示）、Query Wiki → ⚙ カスタム指示折りたたみパネル（パネル内のみ）。

## ✨ 特徴

### 📊 ナレッジ品質

- **🔍 エンティティ・概念の抽出** — LLMがノートからエンティティ（人物、組織、製品、イベントなど）と概念（理論、方法、用語など）を抽出します。抽出粒度（最小〜5項目、粗め〜10、標準〜50、詳細〜100、カスタム1〜500）を柔軟に調整でき、分析の深さとAPIコストを両立できます。
- **🏷️ 必須ページエイリアス** — 生成される各ページに最低1つのエイリアス（翻訳、略語、別名）が含まれ、言語をまたいだ重複検出が有効になります。
- **🔄 重複検出とマージ** — セマンティック階層化により真の重複（言語間の翻訳、略語、表記ゆれ）を発見。LLMによる知的なマージが内容を統合し、エイリアスを保持します。
- **🧩 スマート知識融合** — 複数ソースからの更新で冗長性なく新情報をマージ。矛盾は出典を伴って保持され、`reviewed: true` ページは上書きから保護されます。
- **📏 コンテンツ切り詰め保護** — 最大8000トークン、自動停止理由検出、全プロバイダで2倍トークン再試行。
- **📝 原文引用の保持** — 元の言語で引用を保持し、オプションの翻訳で完全なトレーサビリティを確保。

- **🎨 カスタマイズ可能なタグ語彙 (v1.18.0)。** 設定 → Wiki → タグ語彙モード → *カスタム* で、エンティティタイプ・概念タイプのタグリストを独自に定義できます（例：`Medical_Arzneimittel`、`法规`）。プラグインは抽出プロンプトとフロントマター検証の両方であなたの語彙を尊重します；既存の Lint 監査 (#85 v7) はアクティブな語彙から外れたタグを持つページを報告します。

### 🛠️ メンテナンス

- **🔍 Lintヘルススキャン** — 重複、リンク切れ、空ページ、孤立ページ、欠落エイリアス、矛盾を検出する単一の包括的レポート。
- **🎯 セマンティック階層化重複検出** — 階層1（常時LLM検証）は言語間マッチ・略語・類似度の高いタイトルを取得。階層2が残りのトークン予算を中程度の類似度の候補で埋めます。
- **⚡ スマート全自動修復 (Smart Fix All)** — 因果関係順に一括修復：エイリアス補完 → 重複マージ → リンク切れ修正 → 孤立ページリンク → 空ページ拡張。
- **🏷️ エイリアス補完** — ワンクリックで欠落エイリアスを並列バッチ生成し、今後の重複検出の精度を向上。
- **🔄 自動メンテナンス** — 複数フォルダ監視、定期Lint、起動時ヘルスチェック（すべて任意）。
- **⚠️ 矛盾状態機械** — `検出 → レビュー済み → 解決`（AI修復）または`検出 → 未対応`（手動）。
- **🛡️ インゲスト前要件ゲート (v1.21.0)** — すべてのLLM呼び出しの前にソースファイルを検証：空・空白・frontmatterのみのノートは拒否され、コンテンツハッシュによる重複排除でパス間の同一ファイルを検出。ローカルモデルが空白入力でエンティティ名を幻覚するのを防止します。
- **📊 操作履歴パネル (v1.21.0)** — 過去のインゲスト、Lintレポート、メンテナンス実行を、検索・フィルタ可能なUIで確認。インサイト駆動のKPIカードとクリッカブルなページリンク付き。
- **🧹 未完了ページクリーナー (v1.21.0)** — 中断されたインゲストで未完成のまま残ったページを起動時に自動アーカイブ（Obsidianの`.trash`から復元可能）。

### 💬 クエリとフィードバック

- **🤖 会話型クエリ** — ChatGPTスタイルのダイアログ、ストリーミングMarkdown出力、自動的に`[[wiki-links]]`が付き、複数ターンの履歴を保持。
- **🪟 右側ドッキングサイドパネル (v1.22.1, PR #196)。** Query Wiki は中央ポップアップではなく、Copilot スタイルの右サイドバー leaf（既存 leaf を再利用）で開きます。`message-circle` リボンアイコンと `Query Wiki` コマンドでパネルを起動/表示。ノートは会話の横に常時表示。すべての機能は変更なし。
- **📤 クエリ→Wikiフィードバック** — 価値ある会話をWikiに保存し、エンティティ・概念の抽出、保存前のセマンティック重複排除を実行。
- **🔒 重複保存防止** — ハッシュ追跡により変更のない会話の再評価を防止。

### 🌐 LLMと言語

- **🔌 マルチプロバイダー対応** — Anthropic、Anthropic互換（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、MiniMax、LM Studio、OpenRouter、Ollama、カスタムエンドポイント。
- **🔄 5xx自動再試行** — 全クライアントでHTTP 5xx/429/529エラー時に指数バックオフで再試行（最大2回）。
- **📋 動的モデル一覧** — プロバイダーAPIからリアルタイム取得。
- **🌐 Wiki出力言語** — UI言語と独立した10言語（English / 简体中文 / 繁體中文 / 日本語 / 한국어 / Deutsch / Français / Español / Português / Italiano）、カスタム入力オプション対応。
- **🌍 UI完全国際化** — プラグインUIは10言語対応（EN / ZH / ZH-Hant / JA / KO / DE / FR / ES / PT / IT）、277以上のUI項目を自然な現地表現で完全翻訳。
- **⚡ レート制限ガード** — 並列生成でレート制限が発生した場合、自動的に検出し並列度の低下・バッチ遅延の増加・プロバイダー切り替えを提案。
- **🦙 Web Clipper互換** — 公式Obsidian Web Clipperの`Clippings/`フォルダをワンクリックで監視リストに追加し、クリップしたWebページを自動的にWikiに取り込み。

### 🏗️ アーキテクチャとパフォーマンス

- **⚡ 並列ページ生成** — 1〜5の同時ページをカスタマイズ可能（デフォルト3、並列）、大容量ソースで2〜3倍高速化、ページ単位のエラー分離。
- **📚 反復バッチ抽出** — 適応的バッチサイジングにより、長文ドキュメントの最大トークンボトルネックを解消。
- **🏛️ 3層アーキテクチャ** — vault 内のノート（読み取り専用）→ `wiki/`（LLM 生成ページ。`wiki/sources/`、`wiki/entities/`、`wiki/concepts/` に分類）→ `schema/`（共進化設定）。
- **🧩 モジュール化されたコードベース** — `src/`内に20以上の特化モジュール。

### 🔒 プライバシーとセキュリティ

- **バックエンドなし、テレメトリなし。** プラグインは完全にObsidian内部で動作します——外部サーバー、分析、データ収集は一切ありません。LLMプロバイダーを明示的に設定しない限り、ノートがVaultから出ることはありません。
- **データはデフォルトでローカルに保存。** プラグインは、選択したLLM API以外の場所にコンテンツを保存、キャッシュ、送信することはありません。取り込みやクエリのために送信するテキストのみがデバイスを離れます——それも設定したプロバイダーのみです。
- **Ollama、LM Studio、またはローカルプロバイダーによる完全ローカルモード。** 完全なデータ主権のために、ローカルで動作するLLMを使用してください。ノートは完全にあなたのマシン上で処理され——インターネットに触れることはありません。
- **最小限の権限。** VaultファイルアクセスはWiki管理に必要です（ノートの読み取り、ページの生成、リンク切れの検出）。ネットワークアクセスは設定したプロバイダーへのLLM API呼び出しのみに使用されます。クリップボードアクセスはQueryモーダルの「コピー」ボタンのみ——クリックした時だけです。

---
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

## 🤖 モデル推奨

本プラグインはKarpathyの核となる理念に従う：**Wikiの完全なコンテキストをLLMに直接渡し、RAG検索の断片化は行わない**。長いコンテキストウィンドウを持つモデルを強く推奨します。Wikiが大きくなるほど、LLMはページ間の整合性を維持するためにより多くのコンテキストを必要とするためです。

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

ローカルモデル（Ollama）向け：コンテキストウィンドウは通常小さめ（8K〜128K）です。取り込みにはクラウドプロバイダーの使用を検討し、クエリにはローカルモデルを使用することをお勧めします。

**🔌 Anthropic Compatible（Coding Plan）:** ProviderがAnthropic互換APIエンドポイントを提供している場合、「Anthropic Compatible」を選択し、ProviderのBase URLとAPI Keyを入力してください。

**🦙 Ollama（ローカル、API キー不要）：** [Ollama](https://ollama.com) をインストールし、モデルを pull（`ollama pull gemma4` または `ollama pull qwen3.5:27b`）、プロバイダードロップダウンで「Ollama (Local)」を選択。

**🎛️ LM Studio（ローカル、API キー不要）：** [LM Studio](https://lmstudio.ai) をインストールし、ローカルサーバーを起動（デフォルト `http://localhost:1234/v1`）、プロバイダードロップダウンで「LM Studio (Local)」を選択。LM Studio は OpenAI 互換のサーバーを内蔵しており、API キーフィールドは任意。

> 💡 **サブスクリプションプラン：** Coding Plan、OpenAI Pro、Anthropic Proなどのサブスクリプションプランは、頻繁に使用する場合のコスト制御に最適です。本プラグインはこれらのサービスをサポートしています。

---

## 🏗️ アーキテクチャ

Karpathyの3層分離設計に基づく：

```
📄 vault 内のノート（任意のフォルダ）  # 📖 取り込むノートをユーザーが選択
  ↓ ingest
wiki/                                  # 🧠 LLM生成のWikiページ（wiki/sources/、wiki/entities/、wiki/concepts/）
  ↓ query / maintain
schema/                                # 📋 Wiki構造設定（命名規則、ページテンプレート、分類ルール）
```

> 📖 完全なコード構造は[CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure)をご覧ください。

**生成されるページ:**
- `wiki/sources/filename.md` — 📄 ソース要約
- `wiki/entities/entity-name.md` — 👤 エンティティページ（人物、組織、プロジェクトなど）
- `wiki/concepts/concept-name.md` — 💡 概念ページ（理論、方法、用語など）
- `wiki/index.md` — 📑 自動生成インデックス
- `wiki/log.md` — 📝 操作ログ

---

## ❓ FAQ

> **プラグインを最新に保ってください。** 新機能と修正が頻繁にリリースされます。**設定 → コミュニティプラグイン → 更新を確認** を定期的に実行してください。
>
> 📖 その他のFAQは [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28) をご覧ください。

**このプラグインは実際に何をしますか？**
vault 内の任意のノート、フォルダ、複数選択を選ぶと、LLM がエンティティと概念を抽出し、`[[双方向リンク]]`で接続されたWikiを生成します。質問すると、インターネット検索ではなく*あなたのノート*に基づいた会話型の回答が得られます。生成された要約は `wiki/sources/`、エンティティは `wiki/entities/`、概念は `wiki/concepts/` に配置され、元の vault ノートは一切変更されません。

**データは第三者に送信されますか？**
🔒 **プライバシー最重視。** バックエンドなし、トラッキングなし、分析なし — プラグインは完全にObsidian内部で動作します。取り込み/クエリのために明示的に送信したテキストのみがデバイスを離れ、それも設定したLLMプロバイダーにのみ送られます。完全なデータローカリティにはローカルプロバイダー（OllamaまたはLM Studio、APIキー不要）を使用してください — データはインターネットに触れません。

**RAGチャットボットとは何が違いますか？**
チャンク化されたRAGがコンテキストを断片化するのに対し、LLM-Wikiは既存の`[[wiki-link]]`グラフ上で**Personalized PageRank**エンジンを実行 — リンク構造で関連ページを見つけます。これにより、埋込コストゼロ、新しい依存関係なし、ローカル/オフラインモデルでも完全に動作します。

**どのLLMを使うべきですか？**
長いコンテキストウィンドウ（≥200Kトークン）のモデルが最適です。コスパ重視: DeepSeek V4-Flash（$0.14/M）、Gemini 3.5 Flash、Qwen3.6-Plus。Ollama/LM Studioのローカルモデルはクエリに使えますが、コンテキストウィンドウは小さめ（8K–128K）です。詳細は[モデル推奨](#-モデル推奨)を参照。

**始め方は？**
Obsidianコミュニティプラグインからインストール → LLMプロバイダーを選択 → **Test Connection** → vault 内の任意のノートに対して **Ingest single source**（または **Ingest from folder**）を実行 → 最初のWikiページが数秒で生成されます。詳細は上記の[クイックスタート](#-クイックスタート)を参照。

**APIコストをどう管理できますか？**
バッチ取り込みには粗い/最小の抽出粒度を使用（LLM呼び出しを削減）。スマートバッチスキップが既に取り込んだファイルを自動検出。自動メンテナンスはデフォルトでOFF（必要な場合のみ有効化）。Lintは実行前に件数を表示 — 承認なしでは課金されません。

**既存のWikiは安全ですか？**
✅ v1.0.0以降後方互換性があります。上書きから保護するには任意のページに`reviewed: true`を設定してください。プラグインは元の vault ノートを決して変更しません — `wiki/` フォルダ内に新しいページを生成するだけです。

**自分の言語で使えますか？**
🌐 UIとWiki出力の両方で**10言語**対応：English、简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español、Português、Italiano。UI言語とWiki言語は独立 — インターフェースは英語のまま、Wikiを日本語で出力できます。11言語目はコントリビューター主導（Italian PR #159のパターンに従う）。

**必要な最小セットアップは？**
Obsidian v1.11.0+（デスクトップ：Windows/macOS/Linux）。LLMプロバイダーのAPIキー（またはローカルのOllama/LM Studio、APIキー不要）。コア機能のロックを解除するには、プラグインの**llmReadyガード**が成功した接続テストを要求 — これにより、設定ミスのプロバイダーからの静かな失敗を防止します。

**実行中の操作をキャンセルするには？**
ステータスバーのテキスト（「取り込み中… クリックでキャンセル」と表示）をクリックするか、`Cmd+P` → "Cancel current ingestion"を実行。次のバッチ境界でクリーンに停止し、完了した作業は保持されます。

**ヘルプはどこで得られますか？**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — バグ報告
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 質問、機能リクエスト、アップグレードヘルプ
- 開発者コンソール（`Ctrl+Shift+I` / `Cmd+Option+I`）— モジュール名プレフィックス付きのログをコピーして、より高速な診断に

## 🔒 透明性とコンプライアンス

このプラグインはObsidianコミュニティプラグインマーケットに掲載されており、セキュリティと権限の自動レビューを受けています。

**このプラグインにはバックエンドもサーバーインフラもなく、いかなるデータ収集も行いません。** Obsidian内で動作する純粋なローカルソフトウェアです。プラグインはいかなる方法でもデータを収集、保存、送信することはできません——そのようなサーバーは存在しないからです。

**ネットワークアクセス**は設定したLLMプロバイダーとの通信のみに使用され、他のネットワーク呼び出しは行われません。これは完全にあなたの管理下にあります：どのプロバイダーを選ぶか、APIキーを入力するか、データの送信先を決めるのはあなたです。

**ファイルシステムアクセス**（Vault列挙）はWikiの構築と保守に必要です：ソースノートの読み取り、ページの生成、リンク切れのスキャン、重複ページの検出。プラグインがソースファイルを変更することは決してありません——wikiフォルダ内のファイルのみです。

**クリップボードアクセス**はQueryモーダルの「コピー」ボタンのみに使用され、クリックした時だけです。

完全なデータローカリティを希望する場合は、OllamaやLM StudioなどのローカルLLMプロバイダーを使用してください。ローカルプロバイダーでは、データがマシンから出ることは決してありません。

## 💖 プロジェクトを支援する

LLM-Wikiがあなたのナレッジワークフローの重要な一部になっているなら、継続的な開発を以下の方法で支援できます：

- ☕ **[Ko-fiでコーヒー一杯](https://ko-fi.com/greenerdalii)** — Ko-fiで単発または月額サポート
- 💳 **[PayPalでチップを送る](https://paypal.me/greenerdalii)** — PayPalで単発チップ

スポンサーシップは完全に任意です。プラグインは引き続きApache-2.0ライセンスで、機能完備を維持します。

### スポンサー

以下の皆様にプロジェクトの支援を感謝します：

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 ライセンス

Apache License 2.0 — [LICENSE](LICENSE) と [NOTICE](NOTICE) を参照

---

## 🙏 謝辞

- **💡 Concept:** [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Original LLM Wiki concept
- **🛠️ Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM transport:** [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)


---

**公式サイト:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)
