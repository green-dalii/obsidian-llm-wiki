![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> AI駆動の構造化知識ベース — ノートを自動的にWikiに変換。[Andrej KarpathyのLLM Wiki概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)に基づく実装。
>
> **Obsidian公式評価95/100** | 10言語ネイティブ対応 | 活発に維持、継続進化

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | **日本語** | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[公式サイト](https://llmwiki.greenerai.top/) | [Obsidian マーケットプレース](https://community.obsidian.md/plugins/karpathywiki) | [ブログ](https://llmwiki.greenerai.top/blog/) | [フィードバック](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 DeepWiki でコードベースを探索](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD)

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
  - [⚡ v1.23.0 更新のポイント](#-v1230-更新のポイント)
    - [⭐ ハイライト](#-ハイライト)
    - [✨ 新機能](#-新機能)
    - [🔧 改善](#-改善)
    - [🐛 修正](#-修正)
    - [📊 テスト](#-テスト)
  - [✨ 特徴](#-特徴)
    - [📊 ナレッジ品質](#-ナレッジ品質)
    - [🛠️ メンテナンス](#️-メンテナンス)
    - [💬 クエリとフィードバック](#-クエリとフィードバック)
    - [🌐 LLMと言語](#-llmと言語)
    - [🏗️ アーキテクチャとパフォーマンス](#️-アーキテクチャとパフォーマンス)
    - [🔒 プライバシーとセキュリティ](#-プライバシーとセキュリティ)
  - [⌨️ コマンド](#️-コマンド)
  - [📖 例](#-例)
  - [🤖 モデル推奨](#-モデル推奨)
  - [🏗️ アーキテクチャ](#️-アーキテクチャ)
  - [❓ FAQ](#-faq)
    - [💡 一般](#-一般)
    - [🏷️ エイリアスと重複](#️-エイリアスと重複)
    - [⚡ パフォーマンスとコスト管理](#-パフォーマンスとコスト管理)
    - [🧹 メンテナンス](#-メンテナンス)
    - [🔍 トラブルシューティング](#-トラブルシューティング)
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

**📚 図書館員の役割は終わり。** 何をページにするか決める必要も、相互リンクを維持する必要も、情報が古くなったか心配する必要もありません。ノートを`sources/`に置けば、LLMが読み取り、抽出、書き込み、リンク作成、矛盾のフラグ付けを行い — あなたは作業の流れに集中できます。

**🤖 これは単なるチャットボットではない。** ChatGPTはインターネットを知っています。LLM-Wikiは*あなた*を知っている — 正確には、あなたが教えた内容を。すべての回答は`[[wiki-links]]`を伴って知識グラフに戻ります。すべてのレスポンスは道の始点であり、終点ではありません。

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
| **📑 複数ファイルを取り込み** | `Cmd+P` → "複数ファイルを取り込み" — 2 ペイン選択モーダル（再帰フォルダツリー + ファイル別チェックボックス）で特定のノートを選び、選択分を一括取り込み |
| **🔍 Wikiに問い合わせ** | `Cmd+P` → "Query wiki" — 質問し、ストリーミング回答を取得 |
| **🛠️ WikiのLint** | `Cmd+P` → "Lint wiki" — ヘルススキャン：重複、リンク切れ、空ページ、孤立ページ |
| **📋 インデックスの再生成** | `Cmd+P` → "Regenerate index" — `wiki/index.md` を再構築 |
| **🎯 ワンクリック取り込み** | サイドバーのアイコンをクリック、または `Cmd+P` → "Ingest current file" |

![コマンドパレット — "karpa"で検索してKarpathy LLM Wikiの全コマンドを表示](assets/command-panel.png)

### ⚠️ 旧バージョンからのアップグレード

**本リリースは完全に後方互換性があります。** v1.0.0以降、破壊的変更はありません。

**v1.20.3へアップグレードする場合**：ソースページのスラッグにフィンガープリントが付与されます（すべての `sources/<slug>.md` が `sources/<ベース名>_<6桁hex>.md` になります）。次回の取り込み時に、既存の `sources/` ページはその場でリネームされ、すべての `[[sources/<slug>]]` バックリンクが自動更新されます。操作は不要ですが、Obsidian のファイルエクスプローラーで一瞬リネームが表示されることがあります。`sources/<slug>.md` パスを直接参照する外部スクリプトやブックマークがある場合は、新しいフィンガープリント付きパスに更新してください。

**v1.16.0以前のバージョンからアップグレードする場合**、一度 **Lint Wiki** を実行して過去の問題を自動修正してください。

**複数バージョンにわたって構築されたWikiの場合：**

**1️⃣ インデックスを再構築** — `Cmd+P` → "Regenerate index"

**2️⃣ Lint Wikiを実行** — `Cmd+P` → "Lint wiki" — 欠落エイリアス、重複、リンク切れ、孤立ページをスキャン

**3️⃣ Smart Fix Allを使用** — Lintレポートでワンクリック修復

**4️⃣ 並列ページ生成を有効化** — 設定 → Page Generation Concurrency: 3、Batch Delay: 300ms

**5️⃣ 現在の設定を確認** — Wiki Output Language、Extraction Granularity、Auto-Maintenance

---
## ⚡ v1.23.0 更新のポイント

v1.23.0 は **MINOR リリース** —— 1.0 以降最大のアーキテクチャ変更です。二つの主要テーマが同時にリリースされます：**Vercel AI-SDK v6 への移行**（手書きの 1625 行クライアントを安定しベンダーサポートされたトランスポートに置き換え）と **Graph Engine**（`[[wiki-link]]` グラフ上の Personalized PageRank）。これにより embedding コストゼロで embedding 相当の検索品質を実現、全プロバイダで動作し、新たな依存関係も追加されません。

本リリースには v1.22.6 hotfix シリーズ（GPT-5.x Pro バリアントの Test Connection リグレッション修正 + LM Studio API-key ゲート）、knn ベースライン評価ゲート、Sponsor セクションも統合されています。

### ⭐ ハイライト

- **🤖 Vercel AI-SDK v6 移行。** 手書きの `OpenAICompatibleClient` / `AnthropicClient` / `AnthropicCompatibleClient`（1625 LOC、v1.20.0 以降蓄積された 30+ のプロバイダバージョンワークアラウンド）を `@ai-sdk/openai@3` / `@ai-sdk/anthropic@3` / `@ai-sdk/openai-compatible@2` に置き換え。新規 `src/llm-sdk/`（5 ファイル、1421 LOC）+ `src/core/obsidian-fetch-bridge.ts`（326 LOC）が安定しベンダーサポートされたトランスポートを提供。プロバイダバージョンリグレッションのクラス全体（#137 / #141 / #143 / #147 / #207）を排除。
- **🕸️ `[[wiki-link]]` グラフ上の Personalized PageRank（Issue #198, #117, #157, #175）。** 新規 Monte-Carlo PPR エンジンが既存の wiki-link 構造を辿り、外向きリンク構造でソースページを回復 —— embedding コストゼロで embedding 相当の R@k、オフライン動作、新たな依存なし、全プロバイダ対応。三層パイプライン（lex 高速パス → LLM シード → PPR ウォーク）+ ハイブリッドガード（グラフが小さすぎる場合は lex フォールバック）。Hub-link 識別度スキャナを lint パスとして同梱。
- **🛡️ プロバイダエラー UX 強化。** 推論モデル（`gpt-5.1+`、`gpt-5.5`、`o1`/`o3`/`o4-mini`）を OpenAI Responses API にルーティング。Token-key probe-then-retry（`max_tokens` ↔ `max_completion_tokens`）を **あらゆる** HTTP 400 で実行 —— 正規表現なし、モデル名ハードコードなし、`if 400 → retry with alt key` のみ。LM Studio API-key ゲート（Issue #223）でローカルプロバイダが API キーなしで接続テスト可能。URL フォールバックでカスタム baseURL の `/v1` 欠落を自動修正（Kimi Coding Plan）。

### ✨ 新機能

- **🔍 Personalized PageRank（PPR）エンジン。** `core/monte-carlo-ppr.ts`（Fogaras 2005 MC-PPR）がクエリページごとに K 回の短いランダムウォークを実行、O(K×L) コストで |V| に依存しない。2142 ページのリアル vault で調整：`damping=0.05, numWalks=3000, walkLength=20` で R@5 を 21.5% → 23.8% に改善（+11% 相対）。詳細は `REAL_VAULT_EVAL.md`。
- **🎯 ハイブリッド検索カスケード（PPR + LLM シード + lex 高速パス）。** `core/ppr-cascade.ts`（213 LOC）が三層 Query Wiki パイプラインを編成。`core/section-extractor.ts`（Tier B zero-LLM）が従来の LLM ベースシード選択を置換。
- **🔗 Hub-link 識別度スキャナ（#157, #175）。** 外向きリンクが主に低識別度ハブを指すページをマークする新規 lint パス。229 LOC + 15 テスト。@DocTpoint 寄稿。
- **🏷️ Hub 退役結晶化シグナル（#215, @DocTpoint）。** `core/hub-retirement.ts`（175 LOC + 12 ユニットテスト + 136 LOC 統合テスト）。純粋な百分位ベースの判定 + 二重絶対ガード。lint 統合は v1.24.0 で予定。
- **🤖 AI-SDK v6 クライアントセット。** `openai-sdk-client.ts`（455 LOC、推論モデルの自動 Responses API ルーティング）、`anthropic-sdk-client.ts`（300 LOC、Coding Plan / z.ai / GLM-Antropic baseURL サポート）、`openai-compat-sdk-client.ts`（449 LOC、8 つの OpenAI 形式 baseURL）。`create-llm-client.ts`（151 LOC）が async + sync shim + preload パターンを提供。
- **🌐 カスタム baseURL の統一 URL フォールバック。** `core/url-fallback.ts`（395 LOC）がユーザー入力 baseURL の `/v1` 欠落を自動解決。モジュールレベル静的キャッシュが `createLLMClient` 再作成を生き延び、Ingest / Lint / Query 全てが恩恵を受ける。
- **🔁 Token-key probe-then-retry（KISS、正規表現なし）。** `src/llm-sdk/token-key-probe.ts`（70 LOC）が初回失敗時に動作する `max_tokens` ↔ `max_completion_tokens` キーを baseURL ごとにキャッシュ。
- **🎬 全プロバイダ向けリアルタイムストリーミング。** `result.textStream` の真のチャンク毎ストリーミングが 3 つの `llm-sdk` クライアントで動作。「Restore true streaming for 3rd-party providers」バックログ項目は **完了**。
- **🎉 ウェルカムノート（Phase 5.1.5）。** 初回起動時の三層ウェルカムノート（Tier A 空 / Tier B 既存 / Tier C アップグレード）。`type: welcome` フロントマター、`createWelcomeNote` トグル、`Recreate Welcome Note` コマンド。
- **📥 マルチファイル提案モーダル（Issue #130）。** 再帰的フォルダツリー、右ペインライブ進捗、ファイル毎キャンセル、「キューに追加」二段階フロー。

![マルチファイル取り込みモーダル — 左：ファイル毎チェックボックス付き再帰フォルダツリー、右：ライブ取り込みキューとステータス](assets/multi-file-ingest.png)
- **🔑 LM Studio API-key ゲート（Issue #223）。** `main.ts:962` が `ollama` と `lmstudio` を API キー検証から除外。
- **🛡️ GPT-5.x Pro バリアントルーティング（Issue #207 follow-up、v1.22.6 hotfix）。** `gpt-5.1-pro` / `gpt-5.2-pro` / `gpt-5.5-pro` を `/v1/responses` に正しくルーティング。
- **🛡️ Auto Ingest 完了パス（Issue #204 follow-up、v1.22.6 hotfix）。** `IngestReport` / `IngestOptions` の `trigger='auto'|'manual'` フィールド。
- **📊 knn ベースライン分析（P2-3 eval acceptance gate）。** DocTpoint が同じ `sample-50page` フィクスチャで knn ベースライン（bge-m3、グラフなし）を実行：cascade R@5 27.1% vs knn 24.1%（3pp 差）。2026-06-22 の #175 拒否を強化 —— embedding は恒久的に拒否、グラフ信号で全 PPR ユースケースに十分。
- **🌍 i18n 設定書き直し（10 言語）。** 全箇所でユーザーファースト言語（「思考を無効化」）。
- **💖 Sponsor セクション。** Ko-fi ボタン + 💖 プロジェクトサポートセクションを 10 READMEs 全てに。

### 🔧 改善

- **📜 プロバイダエラーボディが Test Connection UI に到達。**
- **♻️ Lint パフォーマンス調整値を一元化（`src/constants.ts`）。**
- **⏱️ Responses API パスで 429/5xx 指数バックオフ。**
- **🧹 `thinkingControlCache` 廃止。** 3 方言プローブ削除；AI-SDK が thinking を内部処理。
- **⚡ バンドルサイズ 1.24 MB → 3.17 MB**（2026-06-29 ユーザー承認）。

### 🐛 修正

- **GPT-5.x モデルが 400 で Test Connection を失敗しなくなった**（#207）—— `-pro` バリアントを含む完全カバレッジ。
- **LM Studio Test Connection が API キーを要求しなくなった**（#223）。
- **#204 Auto Ingest がブロッキングモーダルを開かなくなった** —— Notice パスを正しく配線。
- **リアルタイムストリーミングがバッチ処理だった** —— macrotask yield + `result.textStream` のみ消費で修正。
- **`generation_complete` が `log.md` / `index.md` / `schema/` にスタンプされなくなった**（v1.22.3）。
- **デッドリンクスタブ捏造クラスバグ閉鎖**（#197）。

### 📊 テスト

- **1376 テスト合格**、100 ファイル（v1.22.0 以降 +272）。
- 新規テストファイルは CHANGELOG.md に記載。

アップグレードを推奨 —— AI-SDK 移行はプロバイダバージョンリグレッションのクラス（#137 / #141 / #143 / #147 / #207）を排除し、Graph Engine は embedding コストゼロで embedding 相当の検索品質を提供します。カスタム baseURL を持つ OpenAI 互換ゲートウェイを使用している場合、URL フォールバック + token-key probe-then-retry の修正により設定変更なしで接続問題を解決できるはずです。

### v1.23.1 — 2026-07-02 (PATCH)

v1.23.0 のコミュニティプラグイン提出をブロックしていた Obsidian レビューボットの 3 つの指摘を解決。ユーザーに見える変更はありません。

- **TypeScript 厳格モードのアライメント。** `tsconfig.json` に `strictBindCallApply: true` を追加し、`.bind()` 呼び出しが正しい型を推論するように —— ローカル開発環境を Obsidian のレビュー環境に合わせ、ボットが不要と指摘した型アサーションを削除。
- **未使用コードの削除。** 非推奨の `getThinkingControlCacheKey` 関数を削除（v1.23.0 AI-SDK 移行以降呼び出し元なし）。
- **ビルドの再現性。** タグ付け前に lockfile を再生成し、CI ビルドされた `main.js` が Obsidian のビルド検証ステップでソースコードと一致するように。

## ✨ 特徴

### 📊 ナレッジ品質

- **🔍 エンティティ・概念の抽出** — LLMがノートからエンティティ（人物、組織、製品、イベントなど）と概念（理論、方法、用語など）を抽出します。抽出粒度（最小〜5項目、粗め〜10、標準〜50、詳細〜100、カスタム1〜300）を柔軟に調整でき、分析の深さとAPIコストを両立できます。
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
- **🌐 Wiki出力言語** — UI言語と独立した9言語（英語・中文・日本語・韓国語・ドイツ語・フランス語・スペイン語・ポルトガル語・イタリア語）、カスタム入力オプション対応。
- **🌍 UI完全国際化** — プラグインUIは9言語対応（EN/ZH/JA/KO/DE/FR/ES/PT/IT）、269以上のUI項目を自然な現地表現で完全翻訳。
- **⚡ レート制限ガード** — 並列生成でレート制限が発生した場合、自動的に検出し並列度の低下・バッチ遅延の増加・プロバイダー切り替えを提案。
- **🦙 Web Clipper互換** — 公式Obsidian Web Clipperの`Clippings/`フォルダをワンクリックで監視リストに追加し、クリップしたWebページを自動的にWikiに取り込み。

### 🏗️ アーキテクチャとパフォーマンス

- **⚡ 並列ページ生成** — 1〜5の同時ページをカスタマイズ可能（デフォルト3、並列）、大容量ソースで2〜3倍高速化、ページ単位のエラー分離。
- **📚 反復バッチ抽出** — 適応的バッチサイジングにより、長文ドキュメントの最大トークンボトルネックを解消。
- **🏛️ 3層アーキテクチャ** — `sources/`（読み取り専用）→ `wiki/`（LLM生成）→ `schema/`（共進化設定）。
- **🧩 モジュール化されたコードベース** — `src/`内に20以上の特化モジュール。

### 🔒 プライバシーとセキュリティ

- **バックエンドなし、テレメトリなし。** プラグインは完全にObsidian内部で動作します——外部サーバー、分析、データ収集は一切ありません。LLMプロバイダーを明示的に設定しない限り、ノートがVaultから出ることはありません。
- **データはデフォルトでローカルに保存。** プラグインは、選択したLLM API以外の場所にコンテンツを保存、キャッシュ、送信することはありません。取り込みやクエリのために送信するテキストのみがデバイスを離れます——それも設定したプロバイダーのみです。
- **Ollama、LM Studio、またはローカルプロバイダーによる完全ローカルモード。** 完全なデータ主権のために、ローカルで動作するLLMを使用してください。ノートは完全にあなたのマシン上で処理され——インターネットに触れることはありません。
- **最小限の権限。** VaultファイルアクセスはWiki管理に必要です（ノートの読み取り、ページの生成、リンク切れの検出）。ネットワークアクセスは設定したプロバイダーへのLLM API呼び出しのみに使用されます。クリップボードアクセスはQueryモーダルの「コピー」ボタンのみ——クリックした時だけです。

---
## ⌨️ コマンド

| コマンド | 説明 |
|---------|------|
| **📥 単一ソースの取り込み** | 単一ノートを選択 → エンティティ、概念、サマリーを含むWikiページを生成 |
| **📂 フォルダーからの取り込み** | 任意のフォルダを選択 → 既存ノートからWikiを一括生成 |
| **📑 複数ファイルを取り込み** | 2 ペイン選択モーダルを開く → ファイル別チェックボックスで特定のノートを選択 → 選択分を一括取り込み（ライブキュー + ファイル別キャンセル付き） |
| **🔍 Wikiに問い合わせ** | ストリーミング出力と`[[wiki-links]]`を伴う対話式Q&A |
| **🛠️ WikiのLint** | 包括的健康スキャン：重複、リンク切れ、空ページ、孤立ページ、欠落エイリアス、矛盾 |
| **📋 インデックスの再生成** | `wiki/index.md`を手動で再構築 |
| **⏹️ 操作キャンセル** | `Cmd+P` → "Cancel current ingestion" またはステータスバークリック — バッチ境界で安全に停止し、完了済みの作業を保持 |
| **📊 操作履歴を表示 (v1.21.0)** | 過去のインゲスト、lintレポート、メンテナンス実行を検索・フィルタリング可能なUIで閲覧 |

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
sources/     # 📄 ソースドキュメント（read-only）
  ↓ ingest
wiki/        # 🧠 LLM生成のWikiページ
  ↓ query / maintain
schema/      # 📋 Wiki構造設定（命名規則、ページテンプレート、分類ルール）
```

**コード構造** (`src/`):

```
main.ts              # 🔌 プラグインエントリ
wiki/                # Wikiエンジンモジュール
  wiki-engine.ts     # 🎯 オーケストレータ
  query-engine.ts    # 💬 対話クエリ
  source-analyzer.ts # 📊 イテレーティブバッチ抽出
  page-factory.ts    # 🏗️ Entity/Concept CRUD + マージ
  conversation-ingest.ts # 📥 チャット → Wikiナレッジ
  contradictions.ts  # ⚠️ 矛盾検出
  system-prompts.ts  # 🗣️ 言語ディレクティブ + セクションラベル
  lint/              # Lintサブモジュール
    controller.ts        # 🔍 Lintオーケストレーション
    fix-runners.ts       # ⚡ バッチ修正実行ヘルパー
    scanners.ts          # 🔍 Scanners (dead links, orphans, aliases, quote grounding)
    duplicate-detection.ts # 🔄 プログラムによる候補生成
    report-builder.ts    # 📋 純粋関数レポートビルダー
    phases/              # 段階的Lint実行
  prompts/           # ドメイン別LLMプロンプトテンプレート
schema/              # Schema共進化
  manager.ts         # 📋 Schema CRUD + 提案
  auto-maintain.ts   # 🔄 ファイルウォッチャ + 定期Lint + 起動時クイック修正
  analyze.ts         # 📊 キャンセル配線付きSchema分析
ui/                  # ユーザーインターフェース
  settings.ts        # ⚙️ 設定パネル
  modals.ts          # 📦 Lint / Ingest / Query / Historyモーダル
core/                # 🧩 純粋関数モジュール (IOなし、独立テスト可能)
  i18n, slug, json, frontmatter, tag-vocab, sources-normalizer, ...
+ 共有: llm-client.ts, llm-client-wrapper.ts, texts.ts, prompts.ts, types.ts
```

**生成されるページ:**
- `wiki/sources/filename.md` — 📄 ソース要約
- `wiki/entities/entity-name.md` — 👤 エンティティページ（人物、組織、プロジェクトなど）
- `wiki/concepts/concept-name.md` — 💡 概念ページ（理論、方法、用語など）
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

**どのモデルを選ぶべきですか？**
上記の[モデル推奨](#-モデル推奨)を参照。長いコンテキストウィンドウを持つモデルを推奨 — Wikiが大きいほど、LLMはより多くのコンテキストを必要とします。

### 🏷️ エイリアスと重複

**Lintでほとんどのページに「missing aliases」と表示されるのはなぜ？**
v1.7.11より前に生成されたページにはエイリアスが含まれていません。これは無害です — エイリアスは必須ではなく機能強化です。Lintレポートの **Complete Aliases** をクリックすると、LLMが翻訳、略語、別名を一括生成します。エイリアスが揃うと、重複検出とエイリアスを考慮した検索がはるかに効果的になります。

**類似した名前の重複ページが表示されるのはなぜ？**
v1.7.10より前のバージョンにはエイリアスを考慮した重複検出がありませんでした。**Lint Wiki** を実行 → **Merge Duplicates** をクリックして統合します。統合後のページは両方のエイリアスを保持し、将来の重複を防止します。

**重複検出はどのように機能しますか？（v1.7.10+）**
2層のセマンティック検出：第1層（常にLLM検証）は言語間マッチ、略語、高類似度タイトルを取得します。第2層は残りのトークン予算を中程度類似度の候補で埋めます。エイリアスは第1層にとって重要です — ページがv1.7.11より前の場合は **Complete Aliases** を実行してください。

**「汚染ページ」とは？（v1.9.0）**
フォルダプレフィックスが誤ってファイル名に含まれたページ（例：`concepts/conceptsレイアウト最適化.md`）。**Lint Wiki** → **🧹 Fix Polluted Pages** で名前を変更し、すべての入リンクを更新します。

### ⚡ パフォーマンスとコスト管理

**取り込みを高速化するには？**
**設定 → LLM Configuration** で：**Page Generation Concurrency** を3～5に増やし（並列ページ作成）、**Batch Delay** を100～300msに下げます（レート制限に注意）。「最小」「粗め」または「標準」の**抽出粒度**を選択すると、生成ページ数が減りAPIコストを節約できます。

**HTTP 429エラーが発生するのはなぜ？**
プラグインは自動的にレート制限を検出し、提案します：同時実行数を1～2に下げる、Batch Delayを500～800msに増やす、またはより高い制限のプロバイダーに切り替える。

**APIコストをコントロールするには？**
- Auto-MaintenanceはデフォルトでOFF（必要な場合のみ有効化）
- Smart Batch Skipは既取り込みファイルを自動スキップ
- 「Standard」または「Coarse」粒度 = より少ないLLM呼び出し
- Batch Delay > 500msは呼び出しを分散するだけでトークン消費は増えない
- Lintレポートは修正実行前にカウントを表示し、コストに見合うか判断可能

### 🧹 メンテナンス

**Smart Fix Allは何をしますか？**
因果関係の順序で修正を実行（v1.9.0+）：
1. 🧹 汚染ページ修正 → 2. 🏷️ エイリアス補完 → 3. 🔄 重複統合 → 4. 🔗 デッドリンク修正 → 5. 🔗 孤立ページリンク → 6. 📝 空ページ拡充

**大きなWikiでLintがフリーズする？**
v1.7.17+にアップグレード — Lintは50ページごとにObsidianのUIスレッドに制御を戻し、1200+ページのWikiでもフリーズを防止します。

### 🔍 トラブルシューティング

**インストール後、機能が使えないのはなぜですか？**
設定 → Karpathy LLM Wiki → プロバイダー選択 → APIキー入力 → Fetch Models → モデル選択 → Test Connection。緑の「LLM Ready」表示が出れば全機能が利用可能になります。設定の誤りによる静かな失敗を防ぐための仕様です。

**実行中の取り込み/Lintをキャンセルするには？**
ステータスバークリックまたは Ctrl+P → "Cancel current ingestion"。現在のバッチ完了後に安全に停止します。

**編集中のファイルをワンクリックで取り込むには？**
リボン左の `sticker` アイコンをクリック、または `Ctrl+P` → "Ingest current file"。ファイルピッカーをスキップし、現在のエディタタブを直接取り込みます。

**log.mdの二重括弧 `[[[[...]]]]` を修正するには？**
**Lint Wiki** を実行してください。スキャナがwikiディレクトリ全体（log.mdを含む）の二重入れ子wikiリンクをLLMコストゼロで自動検出・修正します。手動でのクリーンアップは不要です。

**"Overloaded" エラーが発生するのは？**
プラグインはAnthropicの 529 オーバーロードエラーを再試行可能と認識します。すべてのプロバイダで指数バックオフにより自動再試行されます。

**entities/ や concepts/ に既にページがあるのに重複スタブが作成されるのは？**
プラグインはスラッグベースのマッチングを使用します — 同じ名前の異なる書式は、重複スタブを作成する代わりに既存ページに解決されます。

**Queryが存在を知っているページを見つけられない？**
3つの原因：（1）インデックスが古い → **Regenerate index**。（2）エイリアス不足 → **Complete Aliases**。（3）言い回しを変える — LLMはセマンティックマッチングを行い、キーワード検索ではありません。

**Wikiページを手動で編集できますか？**
はい。frontmatterに `reviewed: true` を設定すると上書きから保護されます。手動で追加したエイリアス、タグ、ソースはマージ時にも保持されます。

**安全なアップグレード方法は？**
プラグインはソースファイルを変更しません。`wiki/` をバックアップ → プラグイン更新 → **Regenerate index** → **Lint Wiki** → 選択的に修正。

**ローカルモデル（Ollama、LM Studio）が空白や frontmatter のみのノートから奇妙なエンティティ名を捏造する。（v1.21.0）**
v1.21.0 のインゲスト前要件ゲートで修正済み：空/空白/frontmatterのみのノートは LLM 呼び出し*前*に拒否され、コンテンツハッシュによる重複排除でパス間の同一ファイルを検出します。v1.21.0+ にアップグレードすれば、「空ファイル幻覚」クラスのバグ（ローカルモデルが空白プロンプトでエンティティ名を捏造する）を完全に止められます。

**v1.20.3 へのアップグレード後、`sources/` ファイル名が変更されました。問題ですか？（v1.20.3+）**
いいえ — 新しい衝突回避のためのソースページスラッグフィンガープリントが機能しています。すべての `sources/<slug>.md` が `sources/<ベース名>_<6桁hex>.md` になります（hex はファイルのフルパスの FNV-1a ハッシュ）。別フォルダで同じベース名のファイル（例：Academy コースの 11 個の `About this course.md`）が衝突しなくなります。再取り込み時に既存の `sources/` ページはその場でリネームされ、すべての `[[sources/<slug>]]` バックリンクが自動更新されます。`sources/<古いslug>.md` を指す外部スクリプトやブックマークがある場合は、新しいフィンガープリント付きパスに更新してください。

**無関係なソースを再取り込みすると、`reviewed: true` でロックしたページを上書きしますか？（v1.20.3+）**
いいえ — Stage 4（`updateRelatedPage`）も `reviewed: true` を尊重し、追記専用パスにルーティングされます。取り込みパスと同じ動作です。編集済みの本文はそのまま保持され、本当に新しいコンテンツのみが追加されます。

**ヘルプを得るには？**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — バグ報告
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 質問とフィードバック

**トラブルシューティング用のデバッグログを収集するには？**

1. 開発者ツールを開く（`Ctrl+Shift+I` / `Cmd+Option+I`）
2. **Console** タブを開く
3. 目的の操作（インゲスト、クエリ、Lint）を実行
4. `[Step]`、`[LLM]`、モジュール名などのモジュール名プレフィックス付きメッセージを探す
5. ローカルテストでは `pnpm build` の代わりに `pnpm build:dev` を使い、完全なデバッグ出力を保持する
6. 関連するログ行をコピーして GitHub Issue に添付する — バグ診断が大幅に速くなります

---

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

## 📜 ライセンス

Apache License 2.0 — [LICENSE](LICENSE) と [NOTICE](NOTICE) を参照

---

## 🙏 謝辞

- **💡 Concept:** [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Original LLM Wiki concept
- **🛠️ Platform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM transport:** [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)

---

**公式サイト:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)
