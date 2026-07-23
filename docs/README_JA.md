![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin for Obsidian

> AI駆動の構造化知識ベース — ノートを自動的にWikiに変換。[Andrej KarpathyのLLM Wiki概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)に基づく実装。Obsidianプラグインとしてワンクリックインストール。

> **埋め込み不要のグラフ検索 • 10言語ネイティブ対応 • あらゆるLLMプロバイダー対応**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | **日本語** | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[公式サイト](https://llmwiki.greenerai.top/) | [Obsidianマーケットプレース](https://community.obsidian.md/plugins/karpathywiki) | [ブログ](https://llmwiki.greenerai.top/blog/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

🚀 [クイックスタート](#-クイックスタート) • ✨ [特徴](#-特徴) • 🔍 [検索の仕組み](#-検索の仕組み) • 🤖 [モデル](#-モデル) • ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← このプラグインが役に立ったら、コーヒー一杯♥️を奢ってくれたら嬉しいです、またはスター🌟を付けてね↗

---

## 📑 Contents

- [なぜこのプラグインなのか？](#-なぜこのプラグインなのか)
- [こんな方に](#-こんな方に)
- [クイックスタート](#-クイックスタート)
- [特徴](#-特徴)
- [検索の仕組み](#-検索の仕組み)
- [モデル](#-モデル)
- [FAQ](#-faq)
- [プライバシー](#-プライバシー)
- [サポート](#-サポート)
- [ライセンスとクレジット](#-ライセンスとクレジット)

---

## 🤔 なぜこのプラグインなのか？

あなたはノートを書きます。それらはフォルダに眠っています。何が何と関係しているか見つけるには、何ヶ月も前に忘れたスレッドを思い出す必要があります。

**KarpathyのLLM Wikiコンセプトを再実装したオープンソースツールは他にもありますが、ワンクリックで使えるObsidianプラグインとして提供しているものはありません。** 他の実装のほとんどはCLIツール、Claude Codeスキル、または独立したデスクトップアプリです。LLM-Wikiプラグインは、ネイティブUI、vault内ストレージ、Obsidianのグラフビューを内蔵した唯一の実装です。

### 他実装との比較

| | Karpathy LLM Wiki（本プラグイン） | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **提供形態** | ✅ ワンクリックObsidianプラグイン | ❌ 独立Tauriデスクトップアプリ | ❌ Claude Codeスキル | ❌ Claude Code / Codexスキル | ❌ CLI + SDK + MCPサーバー |
| **セットアップ時間** | ✅ **5分** — コミュニティプラグイン→インストール→プロバイダー選択→取り込み | ❌ 30分以上 — バイナリのコンパイル/ダウンロード、CLI設定 | ❌ 15分 — Claude Code契約＋スキルインストール | ❌ 10分 — Claude Code/Codex契約＋セットアップ | ❌ 30分以上 — pip install + SDK + MCP設定 |
| **インストール方法** | ✅ Obsidian→コミュニティプラグイン→検索→インストール | ❌ 別バイナリのコンパイルまたはダウンロード、CLI設定 | ❌ Claude Code契約＋インストールガイド | ❌ Claude CodeまたはCodex契約＋セットアップ手順 | ❌ pip install + Python SDK + ローカルサーバー |
| **アーキテクチャの複雑さ** | ✅ **依存関係ゼロ** — ベクトルDB不要、埋め込みモデル不要、外部プロセス不要 | 🟡 独自のPythonランタイム + sigma.js + sqliteを内蔵 | 🟡 Claude Code環境を利用 — 自己完結型ではない | 🟡 別プラットフォームのランタイムが必要 | ❌ Python、埋め込みモデル、ベクトルDBが必要 |
| **i18n（UI+Wiki出力）** | ✅ 10言語（UIと出力は独立設定） | 🟡 2言語（EN/中文） | ❌ 英語のみ | ❌ 英語のみ | ❌ 英語のみ |
| **LLMプロバイダー** | ✅ 12以上（Codex OAuth、Bedrock、LM Studio、Ollama、Anthropic互換、Kimi、GLM、MiniMax、DeepSeekなど） | 🟡 OpenAI互換 | 🟡 Claude Code契約経由 | 🟡 Claude Code / Codex契約経由 | 🟡 OpenAI互換 |
| **検索アルゴリズム** | ✅ Personalized PageRank（Haveliwala 2002）+ Monte Carlo（Fogaras 2005） | 🟡 4信号ヒューリスティック（Adamic-Adar + 2ホップ減衰） | ❌ Louvainコミュニティ検出のみ | ❌ Louvain + kホッププレビュー | ❌ ハイブリッド: BM25 + セマンティック + wikilink |
| **クエリパイプライン** | ✅ 5段階カスケード（Lex→LLMキーワード→部分文字列スキャン→LLM KBフォールバック→PPR拡張、最初の十分な信号で打ち切り） | 🟡 2ホップ減衰のみ | ❌ Louvainクラスタリングのみ | ❌ kホッププレビュー（LLM拡張なし） | ❌ BM25 + チャンク上のセマンティック検索（グラフなし） |
| **埋め込みが必要？** | ✅ いいえ（設計上ゼロコスト） | 🟡 オプション、デフォルトオフ | ✅ 不要 | ✅ 不要 | ❌ **必須** |
| **グラフ可視化** | ✅ Obsidianネイティブのグラフビュー（内蔵、サイズ増加ゼロ） | ❌ カスタムsigma.js + graphology（デスクトップアプリ） | 🟡 vis.js graph.html（別ファイル） | ❌ カスタムsigma.jsオフラインHTML | ❌ 読み取り専用ブラウザビューアー |
| **Wikiの正直さ** | ✅ Wikiソースがクエリに一致しない場合「Stage FALLBACK」バナーを表示 | ❌ 同等機能なし | ❌ 同等機能なし | ❌ 同等機能なし | ❌ 同等機能なし |
| **公開検索ベンチマーク** | ✅ PPR @5 = 27.1%（純粋kNN 24.1%を上回る、この分野で唯一の公開数値） | ❌ 埋め込み有効時のみ58%→71%（apples-to-apples比較不可） | ❌ 未公開 | ❌ 未公開 | ❌ 未公開 |

### 意図的に選んだ3つの設計判断

- **🪟 Obsidianがランタイム。** ターミナルも別アプリもDockerもPythonも不要。コミュニティプラグインからインストールして「取り込み」をクリックするだけで、最初の一秒からWikiはあなたのvaultの中に存在します。Obsidianネイティブのグラフビューが`[[wiki-link]]`グラフをレンダリング — 内蔵、バンドルサイズ増加ゼロ。
- **🧭 クリーンで自己完結。** 依存関係ゼロ。埋め込みモデルもベクトルDBもpipパッケージも不要 — ノートを読み、LLMと通信し、Wikiページを書き出す単一のプラグインです。すべてがObsidian内部で動作します。
- **🔌 すでに支払っているモデルをそのまま使える。** Anthropic、Bedrock、OpenAI、ChatGPT Plan（Codex OAuth）、DeepSeek、Kimi、GLM、MiniMax、LM Studio、Ollama、OpenRouter、Anthropic互換、カスタムエンドポイント — 12以上のプロバイダー。埋め込みエンドポイントを必要とするものは一つもありません。

---

## 🎯 こんな方に

**✅ こんな方におすすめ：**

- **5分でセットアップして、5時間かけるプロジェクトにはしたくない。** コミュニティプラグインからインストール → プロバイダーを選択 → ノートを取り込み。CLIもPythonも別ランタイムもベクトルDBも不要。数秒で`wiki/`以下にWikiページが生成されます。
- **クリーンで自己完結したものが欲しい。** 外部依存ゼロ：埋め込みモデルもベクトルDBもpipパッケージもDockerコンテナも不要。ノートを読み、LLMと通信し、Wikiページをvaultに書き出す単一のObsidianプラグインです。すべてがObsidian内部で動作します。
- **インターネットではなく*自分のノート*から答えてくれる、クエリ可能なチャットが欲しい。** すべての回答には`[[wiki-links]]`が付き、あなたの知識グラフに戻れます。
- **データ主権を重視する。** OllamaやLM Studioで完全ローカル運用 — インターネットに触れません。
- **10言語対応で読み書きしている。** UIとWiki出力言語は独立して設定可能（UIは英語のまま、Wikiは日本語で出力できます）。
- **`[[wiki-links]]`を書くことでグラフを育てている。** あなたが書くすべてのリンクが検索を強化します。別途タグ付けや埋め込み、インデックス作成は不要。
- **ワンクリックでメンテナンスしたい。** Lintヘルススキャン＋スマート全自動修復で、重複やリンク切れ、孤立ページを手作業なしで管理。

**❌ こんな方には不向き：**

- **汎用のChatGPT代替品が欲しい。** 本プラグインは*あなたの知識*だけから回答します。
- **PDFやWebページ、外部コーパスに対するRAGパイプラインが必要。** このプラグインはvault内パスに焦点を当てています（PDFはv1.25.0から対応）。
- **ホスト型SaaSを探している。** バックエンドもサーバーもアカウントもありません。

---

## 🚀 クイックスタート

1. **インストール。** Obsidian → 設定 → コミュニティプラグイン → ブラウズ → 「Karpathy LLM Wiki」を検索 → インストール → 有効化。または[コミュニティプラグインページ](https://community.obsidian.md/plugins/karpathywiki)にアクセスして「Add to Obsidian」をクリック。
2. **プロバイダーを設定。** 設定 → Karpathy LLM Wiki → プロバイダーを選択（OpenAI、Anthropic、Ollama、ChatGPT Plan（Codex OAuth）など）→ APIキーを入力（ローカルは不要）→ **Test Connection** → 保存。
3. **ノートを取り込む。** `Cmd+P/Ctrl+P` → 「Ingest single source」 → Markdown（またはPDF、v1.25.0+）ファイルを選択。数秒で最初のWikiページが`wiki/sources/`、`wiki/entities/`、`wiki/concepts/`に生成されます。

以上です。元のノートは一切変更されません — `wiki/`フォルダ以下に新しいページを作成するだけです。Wikiとチャットするには：`Cmd+P/Ctrl+P` → 「Query wiki」。（Macは`Cmd`、Windows/Linuxは`Ctrl`。）

### 基本コマンド

| コマンド | 内容 |
|---------|------|
| **📥 Ingest single source** | `Cmd+P/Ctrl+P` → 「Ingest single source」 — Markdownまたは**PDF（v1.25.0+）**ファイルを選択し、エンティティ・概念ページを生成 |
| **📂 Ingest from folder** | `Cmd+P/Ctrl+P` → 「Ingest from folder」 — フォルダ内の全ノートを一括取り込み（スマートバッチスキップ対応） |
| **📑 Ingest multiple files** | `Cmd+P/Ctrl+P` → 「Ingest multiple files」 — 2ペインファイルツリーでサブセットを選択（ライブキュー＋ファイル単位キャンセル） |
| **🔍 Query wiki** | `Cmd+P/Ctrl+P` → 「Query wiki」 — 右側サイドパネルでWikiとチャット、回答に`[[wiki-links]]`付き |
| **🛠️ Lint wiki** | `Cmd+P/Ctrl+P` → 「Lint wiki」 — 重複・リンク切れ・空ページ・孤立ページ・欠落エイリアス・矛盾をフルスキャン |
| **⚡ Smart Fix All** | Lintモーダル内 — ワンクリック因果順修復（フェーズごとにレポート表示） |
| **📋 Regenerate index** | `Cmd+P/Ctrl+P` → 「Regenerate index」 — `wiki/index.md`を現在のページとエイリアスで再構築 |
| **⏹ Cancel** | `Cmd+P/Ctrl+P` → 「Cancel current ingestion」またはステータスバーをクリック — 次のバッチ境界でクリーンに停止 |
| **📊 Ingestion history** | `Cmd+P/Ctrl+P` → 「View Ingestion History」 — 過去の取り込み・Lintレポート・メンテナンス実行を検索可能なUIで表示 |

| Before | After |
|--------|-------|
| `notes/machine-learning.md`（フラットなファイル） | `wiki/concepts/supervised-learning.md` — `[[双方向リンク]]`、エイリアス、ソース帰属、`wiki/index.md`のエントリ付き |

> 💡 **最新版を保ちましょう。** 新機能・修正・パフォーマンス改善は頻繁にリリースされます。設定 → コミュニティプラグイン → 更新を確認、または自動プラグイン更新を有効にしてください。
> 📖 詳細なチュートリアル（インストール、PDF設定、マルチプロバイダー設定、アップグレード手順）は [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides) で管理されています。

---

## ✨ 特徴

### 📚 ナレッジ品質

- **🔍 エンティティ・概念の抽出** — LLMがエンティティ（人物、組織、製品、イベントなど）と概念（理論、方法、用語など）を独立したページに抽出。粒度はMinimal〜Fine＋Customから設定可能で、コストと深さのバランスを調整できます。
- **🏷️ 必須エイリアス** — すべてのページに最低1つのエイリアス（翻訳、略語、別名）が含まれ、言語間の重複検出が機能します。
- **🔄 階層化重複検出** — Tier 1（直接名称一致：言語間、略語、高類似度タイトル）は常時LLM検証。Tier 2（リンク共有、中程度類似度）が残りのトークン予算を埋めます。
- **🧩 スマートマージと矛盾状態管理** — 重複マージ時にエイリアスを保持。矛盾は出典付きでフラグ。`reviewed: true`のページは上書きから保護。
- **🎨 カスタムタグ語彙** — 設定→Wiki→タグ語彙モード→*カスタム*で、独自のエンティティタイプ・概念タイプタグリストを定義可能。アクティブ語彙から外れたタグはLintが報告。

### 📄 PDF取り込み（v1.25.0+）

- **🔌 プロバイダーゲート** — Anthropic、OpenAI、BedrockはPDFをネイティブ処理。その他のOpenAI/Anthropic互換エンドポイントでは、設定→LLM Configuration→Advancedの **Force PDF Support** を有効にするとプラグインが呼び出しを試行します。Apple SiliconでのローカルOCR、サードパーティ抽出ツール（MinerU、Docling、Mathpix、Adobe）の詳細と完全なPDF取り込みチュートリアルは、以下の[PDF OCRパス](#-pdf-ocrパス)および[docs/PDF-OCR-GUIDE.md](PDF-OCR-GUIDE.md)を参照。
- **🗄️ 有界キャッシュ** — `.obsidian/plugins/karpathywiki/pdf-cache/`に、コンテンツハッシュ＋モデル＋コンバーターバージョンでキー付けされた変換済みMarkdownを保存。三層防御のハウスキーピング：合計100MB/1000エントリ/単一10MB上限＋LRU-by-mtimeエビクション。
- **📝 任意のVaultサイドカー** — 設定→Wiki Configuration→Wiki Folder→*Write PDF Markdown to Vault*で、ソースPDFの隣に`<basename>.pdf.md`を書き出し（デフォルトはオフ。キャッシュのみがデフォルト）。
- **🛡️ 逐語転写プロンプト** — `[illegible]`/`[figure: ...]`の反幻覚マーカー付きOCRスタイル変換。小型ローカルモデルが出力をmarkdownフェンスで囲んでしまう場合、キャッシュ書き込み前に自動クリーンアップ。

### 📄 PDF OCRパス

3つのパスから環境に合ったものを選択：

1. **☁️ クラウドプロバイダー（ネイティブPDF対応）** — Anthropic、OpenAI、またはAWS BedrockがそのままPDFを読み取り。追加設定不要で取り込み可能。その他のOpenAI/Anthropic互換エンドポイントでは、設定→LLM Configuration→Advancedの **Force PDF Support** を有効にするとプラグインが呼び出しを試行。
2. **🖥️ Apple SiliconでのローカルOCR** — [oMLX](https://github.com/jundot/omlx)はMicrosoft Markitdownを内蔵のPDF→Markdownバックエンドとして統合。oMLXでMarkitdownを有効化し、[Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR)（3B/570M-active、2026-06オープンソース）をビジョンモデルとしてロード。プラグインをカスタムOpenAI互換プロバイダーに設定し、**Force PDF Support**をオンにして、oMLXが提供するマルチモーダルモデルを選択。PDFがマシンを離れることはありません。
3. **🛠️ サードパーティ抽出ツール（MinerU、Docling、Mathpix、Adobe）** — PDFに対して別の抽出ツールを実行して`.md`ファイルを生成し、その後プラグインの標準パイプラインで通常のMarkdownノートとして取り込み。学術論文、スキャン文書、数式の多いPDFに最も信頼性の高い方法です。

📖 **3つのパスすべての完全セットアップ手順**（クラウドプロバイダー、oMLXハードウェア階層、MinerUインストール、キャッシュ管理）→ [docs/PDF-OCR-GUIDE.md](PDF-OCR-GUIDE.md)

### 💬 クエリとメンテナンス

- **🧭 5段階PPRカスケード** — [検索の仕組み](#-検索の仕組み)を参照。`[[wiki-link]]`上のPersonalized PageRankがグラフ認識のマルチホップコンテキストを提供。
- **🪟 右側ドッキングサイドパネル** — Query Wikiは中央モーダルではなく、Copilotスタイルの右サイドバーリーフで開きます（v1.22.1+）。
- **🔍 Lintヘルススキャン** — 単一コマンドで以下を検出：重複、リンク切れ、空ページ、孤立ページ、欠落エイリアス、矛盾。
- **⚡ Smart Fix All** — ワンクリック因果順修復：エイリアス補完→重複マージ→リンク切れ修正→孤立ページリンク→空ページ拡張。フェーズごとにレポート表示。
- **📊 操作履歴パネル** — 過去の取り込み・Lintレポート・メンテナンス実行を検索・フィルタ可能なUIで表示。
- **🛡️ 取り込み前ゲート** — 空・空白・frontmatterのみのノートはLLM呼び出し前に拒否。コンテンツハッシュによる重複排除でパス間の同一ファイルを検出。

### 🔒 プライバシー

- **🚫 バックエンドなし、トラッキングなし、分析なし。** Obsidian内部でのみ動作。ネットワークは設定したLLMプロバイダーとの通信のみに使用。
- **📁 ソースファイルは読み取り専用。** プラグインは元のvaultノートを決して変更せず、`wiki/`以下に新しいページを作成するのみ。
- **🦙 完全ローカルモード。** Ollama、LM Studio、または任意のローカルOpenAI互換エンドポイントで — ノートがマシンを離れることはありません。
- **🔐 最小限の権限。** VaultファイルアクセスはWiki管理用。クリップボードアクセスはQueryモーダルの「コピー」ボタンをクリックした時のみ。

### 🦙 ローカルファースト

- **🖥️ Ollama、LM Studio、OpenRouter、カスタムエンドポイント** — そのまま動作。ローカルモデルはクエリに使用可能（コンテキストウィンドウは小さめ）。2000ページのvault取り込みには通常、長コンテキストのクラウドモデルが必要。
- **📄 Apple Silicon上で完全ローカルのPDF OCRパス** — 上記[PDF OCRパス](#-pdf-ocrパス)を参照。
- **🔐 ChatGPT Plan（Codex OAuth）** — デスクトップは`127.0.0.1:1455`でのループバックコールバック、モバイルはデバイスコード経由。認証情報はObsidian SecretStorageのみに保存。サインアウトで消去。OpenAIのパートナーシップではなく、サードパーティのCodex互換機能。

### 🌐 言語

- **🌍 10のUI言語** — English、简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español、Português、Italiano。UI言語とWiki出力言語は独立して設定可能（UIは英語のまま、Wikiは日本語で出力できます）。
- **📚 10のWiki出力言語** — 同じセット。設定→Wiki Configurationで選択。*Custom input*オプションでアドホックプロンプトも可能。
- **🈶 269以上の翻訳済みUI文字列** — すべてのラベル、モーダル、通知。11言語目の追加はコントリビューター主導（PR #159パターン）。

---

## 🔍 検索の仕組み

ほとんどの「AI検索」プラグインはノートをチャンクに分割し、ベクトルDBに埋め込みます。このプラグインはそうしません。KarpathyがRAGに対して指摘した通り、チャンク化はLLMが知識グラフ全体を横断して推論する能力を損なうからです。代わりに、あなたが`[[wiki-links]]`を書くことで維持しているグラフをそのまま活用します。

### 5段階シード選択カスケード

「Microsoftの創業者は誰ですか？」と尋ねると、Query Wikiは回答生成前に5つの段階を実行します：

1. **Lex高速パス** — すべてのエンティティ・概念タイトルとエイリアスに対してストレートなトークン重複チェック。無料・即時。以降の段階のゲートとなります。
2. **LLMキーワード生成** — LLMがクエリから8〜12の多言語キーワードを生成（類義語、略語、トークン重複に弱い語を1回のLLM呼び出しで吸収）。
3. **ローカル部分文字列スキャン** — 生成された各キーワードを、ページタイトル・エイリアス・本文断片に対してローカルで再マッチ。追加LLM呼び出しなし、ノイズ許容の再現率を補完。
4. **LLM KBフォールバック** — lex＋キーワードスキャンのシグナルが弱い場合、LLMがwiki全体からトップN候補を1回だけ意味的に再シード。
5. **PPRグラフ拡張** — 候補シード集合から`[[wiki-link]]`グラフ上でPersonalized PageRank（Haveliwala 2002）を実行。これがグラフ認識のマルチホップコンテキストを提供する仕組みです：「Bill Gates」→「Microsoft」→「競合他社」というように、単なる文字面のタイトル一致ではありません。

カスケードは十分なシグナルが得られた段階で打ち切られます — 固定の5段階コストではなく、lexで十分な時はLLM呼び出しなし、LLM拡張が必要な時は精度を損なわない設計です。

### Personalized PageRankのスケーリング

Monte Carlo PPR（Fogaras 2005）を使用 — 3,000ランダムウォーク×50ステップ、Haveliwala 2002のデッドエンドルール付き。コストは**O(K×L)**でページ数に依存しないため、2,000ページのvaultでも200ページのvaultと同じ拡張レイテンシです。

**PPR @5 = 27.1%（純粋kNNベースライン24.1%を上回る）** — このオープンソースLLM-Wiki分野で唯一公開されている検索ベンチマーク数値です。

### なぜ埋め込みを使わないのか

[Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175)で埋め込みパスを意図的に却下しました。グラフ信号はすでにそこにあります — すべての`[[wiki-link]]`は手作業で作成された「これらは関連している」というエッジであり、対応するプロバイダー（Ollama、LM Studio、Anthropic、Bedrock、Kimi、GLM、MiniMax）のほとんどは`/v1/embeddings`エンドポイントすら提供していません。埋め込みモデルを追加すれば、ページごとのダウンロード、プロバイダーごとのアダプターが必要になり、検索品質への効果はゼロです。

---

## 🤖 モデル

**対応プロバイダー（12以上、2026-07月 models.dev クロスチェック済み）：**

| プロバイダー | シリーズ | 備考 |
|----------|--------|-------|
| **Anthropic** | Claude 5シリーズ | ネイティブPDF、`/v1/messages`プロトコル |
| **OpenAI** | GPT-5.6シリーズ（Sol / Terra / Luna） | ネイティブPDF、Platform APIキー |
| **Google Gemini** | Gemini 3.6シリーズ | ネイティブPDF（1.5以降ファイルパーツ対応）、OpenAI互換エンドポイント |
| **DeepSeek** | DeepSeek V4シリーズ | OpenAI互換、最安価格帯 |
| **Alibaba Qwen** | Qwen3.7/3.8シリーズ | OpenAI互換（DashScope） |
| **xAI Grok** | Grok 4シリーズ | OpenAI互換、長コンテキスト |
| **Moonshot Kimi** | Kimi K3シリーズ | OpenAI互換、2.8T MoEフロンティア |
| **Zhipu GLM** | GLM-5シリーズ | OpenAI互換、強力なバイリンガル |
| **MiniMax** | MiniMax M3シリーズ | OpenAI互換、1Mコンテキスト |
| **Step（階躍星辰）** | Step 3シリーズ（Flash） | OpenAI互換、高速推論 |
| **Tencent Hunyuan** | Hy3シリーズ | OpenAI互換、オープンウェイトMoE |
| **Xiaomi MiMo** | MiMo V2.5シリーズ | MITオープンソース、フラットプライシング |
| **Google Gemma** | Gemma 4シリーズ | オープンウェイト、262Kコンテキスト |
| **AWS Bedrock** | Anthropic + OpenAI派生 | VPC/コンプライアンスパス |
| **ChatGPT Plan（Codex OAuth）** | Codex Responses API | ブラウザ/デバイスコードサインイン、SecretStorage |
| **ローカル：Ollama、LM Studio、OpenRouter、Anthropic互換** | 任意のOpenAI-/Anthropic-プロトコルモデル | Custom OpenAI-Compatible + Anthropic-Compatible（Token Plan / Coding Plan） |

このプラグインはLLMにWikiコンテキスト全体を1回のクエリで渡すため、**長コンテキストのモデルが有利**です。完全な階層テーブル（クラウド＋ローカル）は [docs/MODEL-GUIDE.md](MODEL-GUIDE.md) にあります（[models.dev](https://models.dev/)でクロスチェック済み）。

### 重要な選択基準

- **🧠 コンテキストウィンドウ 200Kトークン以上** — 約500ページ以上のvaultに推奨。200K未満だとカスケードが組み立てるコンテキストが切り詰められる可能性があります。
- **⚖️ 指示追従の品質** — 抽出タスクでは生のIQよりも重要。スキーマテンプレートに従うモデルを選び、リーダーボードの最大値で選ばないでください。
- **🔌 埋め込みエンドポイントは無関係** — 埋め込みは使用しません。`/v1/embeddings`がないプロバイダーでも問題ありません（対応プロバイダーのほとんどにありません）。
- **🦙 ローカルはクエリ向き、クラウドは取り込み向き** — 2000ページのvault取り込みには通常、長コンテキストのクラウドモデルが必要。262Kのローカルモデルでほとんどのクエリはカバーできます。

### Anthropic vs OpenAI vs Codex OAuth — それぞれ独立したプロバイダー

- **Anthropic**（およびBedrock派生） — 別途請求されるAnthropic Platform APIキー。
- **OpenAI** — 別途請求されるOpenAI Platform APIキー。
- **ChatGPT Plan（Codex OAuth）** — 実験的かつ独立したプロバイダー。ブラウザまたはデバイスコードサインイン後、対象となるCodex利用枠を使用。提供状況はOpenAI Codexの認証・モデル・利用枠ポリシーに従い、プラン名だけで利用を保証するものではありません。OpenAIとのパートナーシップや汎用ChatGPT APIではなく、サードパーティのCodex互換機能です。

> 📖 **完全な選択肢テーブル**（クラウド＋ローカル＋PDF OCR＋Codex OAuth＋量子化＋ハードウェア階層）→ [docs/MODEL-GUIDE.md](MODEL-GUIDE.md)

---

## ❓ FAQ

### このプラグインは実際に何をするのですか？

任意のノート、フォルダ、複数選択から、LLMがエンティティと概念を抽出し、`[[双方向リンク]]`で相互リンクされたWikiを生成します。質問すると、インターネットではなく*あなたのノート*に基づいた会話型の回答が得られます。元のvaultノートは一切変更されません。

### どうやって始めるのですか？

Obsidianコミュニティプラグインからインストール → プロバイダーを選択 → **Test Connection** → 任意のノートに対して **Ingest single source** を実行。数秒で最初のWikiページが生成されます。[クイックスタート](#-クイックスタート)を参照。

### 既存のWikiは安全ですか？

✅ v1.0.0以降後方互換。任意のページに`reviewed: true`を設定すると上書きから保護。v1.24.xからのアップグレードでvaultが書き換えられることはありません。v1.25.0のPDF取り込みはデフォルトでキャッシュのみ。

### データは外部に送信されますか？

🚫 バックエンドなし、分析なし — Obsidian内部でのみ動作。取り込み/クエリのために明示的に送信したテキストだけがデバイスを離れ、設定したLLMプロバイダーにのみ送られます。完全なデータローカリティにはOllamaやLM Studioを使用してください。

### 自分の言語で使えますか？

🌍 UIとWiki出力の両方で10言語対応。UI言語とWiki言語は独立。11言語目の追加はコントリビューター主導（PR #159パターン）。

### RAGチャットボットと何が違うのですか？

🚫 チャンク化なし。🚫 埋め込みなし。🚫 ベクトルDBなし。✅ 既存の`[[wiki-link]]`グラフ上のPersonalized PageRank — グラフ認識のマルチホップコンテキスト、埋め込みコストゼロ、ローカルモデル完全対応。

### どのLLMを使うべきですか？

長コンテキストモデル（200Kトークン以上）が最適。[モデル](#-モデル)セクションで原則を解説。完全な階層テーブルは[docs/MODEL-GUIDE.md](MODEL-GUIDE.md)を参照。

### 公開ベンチマークはありますか？

はい — PPR @5 = 27.1%（純粋kNNベースライン24.1%を上回る）。完全なパイプラインとベンチマークスクリプトは[検索の仕組み](#-検索の仕組み)で解説。

### APIコストはどう管理すればよいですか？

バッチ取り込みにはCoarseまたはMinimalの抽出粒度を使用。スマートバッチスキップが既取り込みファイルを自動検出。自動メンテナンスはデフォルトでOFF。Lintは実行前に件数を表示 — 承認なしに課金されません。

### 実行中の操作をキャンセルするには？

ステータスバー（「Ingesting… click to cancel」と表示）をクリック、または`Cmd+P/Ctrl+P` → 「Cancel current ingestion」。次のバッチ境界でクリーンに停止。

### ヘルプはどこで得られますか？

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — バグ報告 · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 質問・機能リクエスト · 開発者コンソール（`Ctrl+Shift+I` / `Cmd+Option+I`）— プラグインログ。

---

## 🔒 プライバシー

このプラグインはObsidianコミュニティプラグインマーケットに掲載されており、セキュリティと権限の自動レビューを受けています。

- **🚫 バックエンドもサーバーもデータ収集もありません。** Obsidian内部で動作する純粋なローカルソフトウェアです。プラグインはあなたのデータを収集、保存、送信することはできません — そのようなサーバーは存在しないからです。
- **🔐 ネットワークアクセスはオプトイン。** 設定したLLMプロバイダーとの通信のみに使用。プロバイダーの選択、APIキーの入力、データの送信先はすべてあなたが決定します。
- **📁 Vaultファイルアクセス**はWiki管理（ノートの読み取り、ページ生成、リンク切れスキャン、重複検出）に使用。プラグインがソースファイルを変更することは決してありません。
- **📋 クリップボードアクセス**はQueryモーダルの「コピー」ボタンでのみ使用 — クリックした時だけです。

完全なデータローカリティには、OllamaやLM Studioを使用してください。ローカルプロバイダーでは、データがマシンを離れることは決してありません。

---

## 💖 サポート

LLM-Wikiがあなたのナレッジワークフローの重要な一部になっているなら：

- ☕ **[Ko-fiでコーヒーを](https://ko-fi.com/greenerdalii)** — 単発または月額サポート
- 💳 **[PayPalでチップを](https://paypal.me/greenerdalii)** — 単発チップ

スポンサーシップは完全に任意です。プラグインは引き続きApache-2.0ライセンスで、機能完備を維持します。

[@jameses-cyber](https://github.com/jameses-cyber) と [@issaqua](https://github.com/issaqua) の皆様、プロジェクトの支援をありがとうございます。

---

## 📜 ライセンスとクレジット

Apache License, Version 2.0 — [LICENSE](../LICENSE) と [NOTICE](../NOTICE) を参照。

**ベースとなったもの：**
- 💡 [Andrej KarpathyのLLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — オリジナルコンセプト
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）via Obsidian `requestUrl`
- 🧮 [Personalized PageRank（Haveliwala 2002）](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) と [Monte Carlo PPR（Fogaras 2005）](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — 検索アルゴリズム

**メンテナー：** [@green-dalii](https://github.com/green-dalii)

---


[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)


---

**公式サイト:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)
