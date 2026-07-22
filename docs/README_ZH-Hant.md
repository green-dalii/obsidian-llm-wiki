![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 插件

> 基於 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 實現的知識庫生成系統，自動從筆記中提取實體與概念，構建互聯的 Wiki 頁面。

> **Obsidian 官方評分 95/100 | 原生支持 10 種語言 | 零嵌入圖譜檢索 | 完全資料主權 | 相容所有 LLM 供應商**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | **繁體中文** | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[官網](https://llmwiki.greenerai.top/) | [Obsidian 插件市集](https://community.obsidian.md/plugins/karpathywiki) | [博客](https://llmwiki.greenerai.top/zh/blog/) | [反饋討論](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

🚀 [快速開始](#-快速開始) | ✨ [核心特性](#-核心特性) | 🤖 [模型選擇建議](#-模型選擇建議) | 🔒 [透明度與合規性](#-透明度與合規性) | ❓ [常見問題 (FAQ)](#-常見問題-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← 如果你覺得這個專案幫到你，歡迎請我喝杯咖啡♥️，或為專案點亮🌟↗

---

> **⚡ 快速更新提醒：** 本項目迭代速度快，會經常進行 Bug 修復、性能提升或新功能、體驗優化等。建議經常在 Obsidian 中更新到最新版本（**設置 → 社區插件 → 檢查更新**），或開啓插件的自動更新功能以確保獲得最佳體驗。

## 📑 目錄

- [🧠 Karpathy LLM Wiki — Obsidian 插件](#-karpathy-llm-wiki--obsidian-插件)
  - [📑 目錄](#-目錄)
  - [💡 什麼是 LLM-Wiki？](#-什麼是-llm-wiki)
  - [⚡ 爲什麼選擇 Obsidian + LLM-Wiki？](#-爲什麼選擇-obsidian--llm-wiki)
  - [🚀 快速開始](#-快速開始)
    - [📦 安裝](#-安裝)
    - [🔄 更新插件](#-更新插件)
    - [🔑 配置 LLM Provider](#-配置-llm-provider)
    - [🎮 使用方式](#-使用方式)
    - [⚠️ 從舊版本升級？](#️-從舊版本升級)
  - [⚡ 最新動態 v1.25.x](#-最新動態-v125x)
  - [✨ 核心特性](#-核心特性)
    - [📊 知識質量](#-知識質量)
    - [📄 PDF 擷取 (v1.25.0)](#-pdf-擷取-v1250)
    - [💬 查詢與反饋](#-查詢與反饋)
    - [🛠️ 維護能力](#️-維護能力)
    - [🌐 LLM 與語言](#-llm-與語言)
    - [🏗️ 架構與性能](#️-架構與性能)
    - [🔒 隱私與安全](#-隱私與安全)
  - [📖 使用示例](#-使用示例)
  - [🤖 模型選擇建議](#-模型選擇建議)
    - [☁️ 雲端模型推薦](#️-雲端模型推薦)
    - [🦙 本地模型推薦 (Ollama / LM Studio)](#-本地模型推薦-ollama--lm-studio)
    - [📄 本地 PDF OCR 路徑 (v1.25.0+)](#-本地-pdf-ocr-路徑-v1250)
  - [🏗️ 架構](#️-架構)
  - [❓ 常見問題 (FAQ)](#-常見問題-faq)
  - [🔒 透明度與合規性](#-透明度與合規性)
  - [💖 支持專案](#-支持專案)
    - [贊助者](#贊助者)
  - [📜 許可證](#-許可證)
  - [🙏 致謝](#-致謝)
  - [Star History](#star-history)
---

## 💡 什麼是 LLM-Wiki？

你寫筆記，AI 來整理，你開口問。就這麼簡單。

**🎯 痛點。** 你的筆記是個金礦——人物、概念、觀點、關聯。但現在它們只是文件夾裏的一堆文檔。找到誰跟誰有關，只能靠搜索、打標籤，以及祈禱自己還記得那條線索。

**✨ 思路。** [Andrej Karpathy 提出了](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)一個優雅的方案：把筆記當原材料，讓 LLM 來做架構師。它讀你寫的東西，提取實體和概念，編織成一個結構化的 Wiki——帶 `[[雙向鏈接]]`、自動索引，還能用自然語言對你的知識庫提問。

**📚 你不再是圖書管理員。** 不用糾結該給誰建頁面，不用手工維護交叉鏈接，不用擔心信息過時。從你的 vault 中任意選擇一篇筆記（或整個資料夾、或多選檔案），LLM 自動閱讀、提取、撰寫、鏈接，甚至標記矛盾——你只管繼續寫。

**🤖 也不是另一個聊天機器人。** ChatGPT 瞭解互聯網，LLM-Wiki 瞭解*你*——準確說，是你教給它的東西。每個回答都帶着 `[[wiki-links]]` 回到你的知識圖譜。每條回覆都是一條探索路徑的起點，而不是終點。

**🏆 核心差異化 —— 零嵌入成本、圖譜驅動的檢索。** 大多數知識庫外掛用向量嵌入（成本高、相依廠商、需要連線）。LLM-Wiki 在你既有的 `[[wiki-link]]` 圖譜上跑 Personalized PageRank —— 零 API 呼叫、無新依賴、本地模型完全支援，檢索品質對標嵌入級。再加上 i18n 感知的**零 LLM Tier B 章節抽取**（10 種語言），無論用什麼供應商，每個使用者都能用上同一個知識引擎。

---

## ⚡ 爲什麼選擇 Obsidian + LLM-Wiki？

Obsidian 是鏈接思考的利器。但有個問題：連線的那個人一直是你自己。

LLM-Wiki 把這個關係翻轉了。不是你手工構建圖譜，而是 AI 隨着你的筆記一起成長。你寫一篇新筆記——它幫你找出你可能會錯過的關聯。你提一個問題——它在你自己的知識圖譜裏穿行，帶着引用回來見你。

- **🔗 你的圖譜視圖活起來了。** 新筆記不再靜靜躺在文件夾裏——它們自動生長出指向實體、概念和來源的鏈接。圖譜有機生長，插件持續維護：檢測重複、修復斷鏈、用別名橋接不同語言。
- **💬 你的筆記學會了對話。** 搜索變成了聊天。"我之前寫過什麼關於 X 的內容？"變成了對話，流式回答帶着 `[[wiki-links]]` 作爲路標。每個回答都是深入你自己知識的一條路徑。
- **🧠 Obsidian 成爲你的思考夥伴。** 它不再只是裝筆記的櫃子，而是幫你*思考*的東西——浮現隱藏的關聯、標記矛盾、記起你忘了自己知道的事。

---

## 🚀 快速開始

### 📦 安裝

**🌟 推薦 — Obsidian 社區插件市場：**

1. 在 Obsidian 中打開 **設置 → 第三方插件**
2. 點擊 **瀏覽**，搜索 "Karpathy LLM Wiki"
3. 點擊 **安裝**，然後 **啓用**

**🌐 或從社區插件網站安裝 —** 訪問 [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki)，點擊 **Add to Obsidian** 即可直接安裝。

**⚙️ 手動安裝（備用）：**

1. 從 [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) 下載 `main.js`、`manifest.json`、`styles.css`
2. 在 Obsidian 中打開 設置 → 第三方插件，在 **已安裝插件** 標籤頁點擊文件夾圖標，打開插件目錄
3. 新建一個 `karpathywiki` 文件夾，將三個文件放入其中
4. 回到 Obsidian，點擊刷新圖標 — **Karpathy LLM Wiki** 會出現在已安裝插件列表中
5. 打開開關啓用

**🔨 開發構建：** `git clone` 後執行 `pnpm install` 和 `pnpm build`。

### 🔄 更新插件

本項目迭代迅速，新功能、修復和改進會頻繁發佈。建議保持更新：

**方式一 — 手動更新（推薦）：**
1. 打開 **設置 → 第三方插件**
2. 點擊 **檢查更新**
3. 在列表中找到 **Karpathy LLM Wiki**，點擊 **更新**

**方式二 — 開啓自動更新：**
1. 打開 **設置 → 第三方插件**
2. 開啓 **自動檢查插件更新**
3. 新版本會被自動檢測，你可以擇機手動更新

> 💡 **爲什麼要保持更新？** 每次發佈都可能包含新功能、性能優化和重要修復。我們會積極維護此插件——錯過更新意味着錯過更好的體驗。

### 🔑 配置 LLM Provider

1. 打開 設置 → Karpathy LLM Wiki
2. 從下拉菜單選擇 Provider（包括 OpenAI 或 ChatGPT Plan (Codex OAuth)）
3. API Provider 需填入 API Key（Ollama、LM Studio 和 ChatGPT Plan (Codex OAuth) 不需要）
4. 非 Codex Provider 可點擊**獲取模型列表**或手動輸入模型名；ChatGPT Plan (Codex OAuth) 登入後會同步帳戶模型目錄，並提供**重新整理帳戶模型**按鈕
5. 點擊 **測試連接**，然後 **保存設置**

**Ollama 本地模型（無需 API Key）：** 安裝 [Ollama](https://ollama.com)，拉取模型（如 `ollama pull gemma4` 或 `ollama pull qwen3.5:27b`），在 Provider 下拉選擇 "Ollama (本地)"。

**LM Studio 本地模型（無需 API Key）：** 安裝 [LM Studio](https://lmstudio.ai)，啓動其本地服務（默認 `http://localhost:1234/v1`），在 Provider 下拉選擇 "LM Studio（本地）"。LM Studio 內置 OpenAI 兼容服務，API Key 字段可選。

**Anthropic 兼容（Coding Plan）：** 如果你的服務商提供 Anthropic 兼容的 API 端點（常見於 Coding Plan 訂閱），選擇 "Anthropic 兼容"，填入服務商提供的 Base URL 和 API Key。

**ChatGPT Plan (Codex OAuth)（實驗性）：** 這與使用 OpenAI Platform API Key 並另行計費的 **OpenAI** Provider 相互獨立。選擇該 Provider 後，桌面端可點擊**使用瀏覽器登入**（localhost 回呼），桌面端和行動端均可點擊**使用裝置代碼**並在 OpenAI 頁面完成授權。外掛會從目前登入的 Codex 帳戶同步可選模型，只快取清理後的模型中繼資料；可用**重新整理帳戶模型**手動更新。目錄暫時無法使用時會保留上次成功快取或最小內建回退清單。之後測試連線並儲存。OAuth 憑據只存入 Obsidian SecretStorage，**登出**會清除憑據。可用性取決於 OpenAI Codex 的驗證、模型和額度政策；這是第三方相容功能，並非 OpenAI 合作項目或通用 ChatGPT API。

### 🎮 使用方式

| 方式 | 操作 |
|------|------|
| **📥 攝入單個源文件** | `Cmd+P` → "攝入單個源文件" — 選擇筆記（Markdown 或 **PDF，v1.25.0+**），提取實體和概念生成 Wiki 頁面 |
| **📂 從文件夾攝入** | `Cmd+P` → "從文件夾攝入" — 選擇文件夾，批量處理其中所有筆記 |
| **📑 多選文件攝入** | `Cmd+P` → "多選文件攝入" — 通過遞迴文件夾樹 + 每文件複選框精確選擇筆記，批次攝取（帶實時佇列 + 按文件取消）|
| **🎯 攝入當前文件** | 點擊左側 ribbon 的 `sticker` 圖示，或 `Cmd+P` → "攝入當前文件" — 直接攝入目前開啟的筆記 |
| **🔍 查詢 Wiki** | `Cmd+P` → "查詢 Wiki" — 對話式提問，串流回答中自帶 `[[wiki-links]]` |
| **🛠️ 維護 Wiki** | `Cmd+P` → "維護 Wiki" — 全面健康掃描：重複頁、斷鏈、空頁面、孤頁、缺失別名、矛盾。Schema 建議顯示在 Lint Modal 內 |
| **📋 重新生成索引** | `Cmd+P` → "重新生成索引" — 重建 `wiki/index.md`，包含別名資訊 |
| **📊 檢視攝入歷史 (v1.21.0)** | `Cmd+P` → "檢視攝入歷史" — 可搜尋、可篩選的介面瀏覽歷史攝入、Lint 報告和維護執行 |
| **⏹ 取消目前操作** | `Cmd+P` → "取消目前提取" — 安全停止進行中的操作，保留已完成工作 |
| **🎉 重建歡迎筆記 (v1.23.0)** | `Cmd+P` → "重建 Wiki 歡迎筆記" — 重新生成首次執行的歡迎筆記 |

重複攝入同一來源文件時，實體/概念頁以增量方式合併新資訊，摘要頁會重新生成。

> 💡 **批次智慧跳過：** 文件夾攝入時，外掛自動偵測已處理文件並跳過，節省時間和 API 成本。

![命令面板 — 搜尋 "karpa" 檢視所有 Karpathy LLM Wiki 命令](assets/command-panel.png)

### ⚠️ 從舊版本升級？

> 🔧 **從 v1.24.x 升級。** PDF 擷取（v1.25.0）將快取寫入 `.obsidian/plugins/karpathywiki/pdf-cache/`（上限 100 MB / 1000 條 / 單條 10 MB；啟動時與每次批次擷取開始時按 LRU-by-mtime 淘汰）。你的 vault **預設不會被修改** —— 僅當在 Settings → Wiki Configuration → Wiki Folder 中開啟 **Write PDF Markdown to Vault** 時，才會於來源 PDF 旁寫一份 `<basename>.pdf.md` sidecar。兩個新設定 —— **Force PDF Support**（進階，預設關閉）與 **Write PDF Markdown to Vault**（預設關閉）—— 完全向後相容：舊 `data.json` 不帶這兩個欄位時會預設為 `false`。

> 🔧 **從 v1.24.0 升級。** 此前僅保護頁面*來源提及*章節的內部註解標記 `<!-- reviewed: keep -->`（v1.24.0，#244）已移除。如需保留手動整理的來源提及章節，請在頁面 frontmatter 中設定 `reviewed: true`——它保護整個頁面（含來源提及），且不同於隱藏的註解標記，會顯示在屬性面板中、也不會被 Markdown linter 破壞。

**向後相容。** 自 v1.0.0 起無破壞性變更——現有 Wiki 頁面、設定和工作流全部保留，無需重新配置。

**升級後**，執行 **維護 Wiki** → **一鍵智慧修復** 按因果關係自動處理：
1. 🏷️ 補全別名（LLM 批次產生翻譯、縮寫、變體名）
2. 🔄 合併重複頁面（跨語言、縮寫、高相似度匹配）
3. 🔗 修復斷鏈 / 連結孤頁 / 擴充空頁面

然後**重建索引**，為每個頁面附加別名條目，啟用別名感知搜尋。

> 📖 特定版本跳躍的詳細升級指南見 [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)。

**建議檢查的設定項：** Force PDF Support（Settings → LLM Configuration → Advanced，預設關閉 —— 僅對非 NATIVE provider 有意義）、Write PDF Markdown to Vault（Settings → Wiki Configuration → Wiki Folder，預設關閉）、Wiki 輸出語言（獨立於介面）、提取粒度（極簡–精細 + 自訂）、頁面生成並行度（預設 3）、批次延遲（預設 300ms）。

## ⚡ 最新動態 v1.25.x

- **v1.25.2 (2026-07-22).** 標籤詞表 Phase 1（消除雙重來源）、Codex OAuth（ChatGPT Plan）、關聯連結資料夾前綴修復、頁面模板裸 `---` 修復、ESLint 0.4.1 路線 A。2515 個測試通過。
- **v1.25.1 (2026-07-20).** 8 個靜默丟失修復（關聯頁面、Schema 章節、舊版 Mentions）、3 個大檔案拆分、DiskCache&lt;T&gt;、LM Studio 無需 API 金鑰攝入、建置驗證根因。2274 個測試通過。
- **v1.25.0 (2026-07-18).** 僅快取 PDF 攝入（Level 1）、有界快取增長、可選的 Vault sidecar、Force PDF 通用開關、逐字提示詞、可取消攝入、本地模型指導、i18n 完整。2182 個測試通過。

📋 [完整版本歷史 → CHANGELOG.md](../CHANGELOG.md)
## ✨ 核心特性

### 📊 知識質量

- **🔍 實體/概念提取** — LLM 從筆記中提取實體（人物、組織、產品、事件等）和概念（理論、方法、術語等），生成獨立 Wiki 頁面，支持靈活提取粒度（極簡~5個、粗略~10、標準~50、精細~100、自定義1–500）平衡分析深度與 API 成本
- **🏷️ 強制頁面別名** — 每個生成的頁面至少包含 1 個別名（翻譯、縮寫、變體名），支持跨語言重複檢測
- **🔄 重複檢測與合併** — 語義分級捕獲真正的重複頁面（跨語言翻譯、縮寫、拼寫變體）；智能 LLM 融合合併內容並保留別名
- **🧩 智能知識融合** — 多源更新時智能合併新信息不重複；矛盾保留並註明歸屬；`reviewed: true` 頁面受保護不被覆蓋
- **📏 內容截斷保護** — API Key 與本機 Provider 使用 8000 max_tokens、自動檢測 stop_reason 並以 2× token 重試。實驗性的 ChatGPT Plan（Codex OAuth）路徑遵循 Codex 後端的輸出策略，不接受用戶端 max_output_tokens 上限。
- **📝 原文引用保留** — 來源提及章節保留原語言引用，可選翻譯，確保可追溯性

- **🎨 自訂標籤詞彙 (v1.18.0)。** 設定 → Wiki → 標籤詞彙模式 → *自訂* 可定義自己的實體類型和概念類型標籤清單（例如 `Medical_Arzneimittel`、`法规`）。外掛在提取 prompt 和 frontmatter 校驗中都會尊重你的詞彙表；現有的 Lint 稽核 (#85 v7) 會報告任何使用了不在活動詞彙表內標籤的頁面。

![自訂標籤詞彙晶片輸入](assets/custom-tags.png)

### 📄 PDF 擷取 (v1.25.0)

從 vault 裡挑一份 PDF — 外掛透過你的 LLM Provider 原生檔案輸入讀取它，轉成 Markdown，再回到標準的 Markdown 擷取流程。所有既有的實體/概念/別名/`[[wiki-link]]` 工作流程保持不變。

- **🔌 Provider 准入** — Anthropic、OpenAI、Bedrock Anthropic 和 Bedrock OpenAI 原生支援 PDF。其他任何 OpenAI/Anthropic 相容端點，請在 Settings → LLM Configuration → Advanced 中開啟 **Force PDF Support**，讓外掛嘗試呼叫（你的端點做最終判斷；失敗時會以本地化 Notice 引導使用者關閉該開關）。本地推薦設定請見 [本地 PDF OCR 路徑](#-本地-pdf-ocr-路徑-v1250)。
- **🗄️ 內容雜湊快取** — 相同的 PDF + 相同模型 + 相同 converter version 直接回傳快取的 Markdown，無需 LLM 呼叫。快取位於 `.obsidian/plugins/karpathywiki/pdf-cache/`；快取鍵內嵌 `converterVersion`，prompt 升級時自動失效舊條目。
- **📏 有界增長** — 三層防禦快取治理（總計 100 MB / 1000 條 / 單條 10 MB 上限）+ LRU-by-mtime 淘汰；啟動時與每次批次擷取開始時清理舊條目。預設僅快取 — 不會修改你的 vault。
- **📝 可選 vault sidecar** — Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** 在轉換完成後於來源 PDF 旁寫一份 `<basename>.pdf.md`。預設關閉（僅快取）。
- **🛡️ 逐字轉錄 Prompt** — PDF→Markdown prompt 重寫為 OCR 風格的逐字轉換，搭配 `[illegible]` / `[figure: ...]` / `[equation: ...]` 反幻覺標記；小模型/本地模型把輸出包在 ```markdown 圍欄裡的，會在寫入快取前自動清洗。
- **⏹ 可取消** — 轉換過程中點擊狀態列可中斷正在進行的 LLM 呼叫（經由 Vercel AI SDK v6）。

### 💬 查詢與反饋

- **🔍 5 級 PPR 種子選擇級聯（v1.24.1 PATCH）** — 當你提出多跳問題時，Query Wiki 在任何生成啓動之前會通過五個互補階段組合答案：
  1. **Lex 快速路徑** — 直接對每個實體/概念標題與別名做 token 重疊匹配（免費、即時；爲後續階段把關）
  2. **LLM 關鍵詞生成** — LLM 從你的查詢中提出 8–12 個跨語言關鍵詞（處理同義詞、縮寫、對 token 重疊不敏感的術語）
  3. **本地子串掃描** — 每個生成的關鍵詞在本地對頁面標題、別名與正文片段重新匹配（無額外 LLM 呼叫；補滿噪聲容忍的召回）
  4. **LLM KB 回退** — 當 lex + 關鍵詞掃描信號不足時，LLM 對 top-N 候選重新針對完整 wiki 做一次語義篩選
  5. **PPR 圖擴展** — 在 `[[wiki-link]]` 圖上從候選種子集運行 Personalized PageRank（Haveliwala 2002）；爲 LLM 提供圖感知的多跳上下文，線性檢索無法達到

  級聯會自動截斷到給出足夠信號的步驟 —— 沒有固定的 5 步開銷，lex 足夠時無 LLM 呼叫，需要 LLM 增強時精度不丟失。端到端相關性（專案自有基準語料上 PPR @5 = 27.1%）超過純 knn 基線（24.1%），無需嵌入。Stage 1.5（步驟 2–3）處理純 lex 漏掉的多跳問題；Stage 1.7（步驟 4）在 LLM 注入關鍵詞信號不足時回補；Stage 1.9（步驟 5）保證 LLM 看到的是鄰居上下文而非扁平 top-N 列表。取代了舊的二分 tier 級聯。

- **🤖 對話式查詢** — ChatGPT 風格對話框，流式 Markdown 輸出，自帶 `[[wiki-links]]`，多輪歷史
- **🪟 右側停靠側邊欄 (v1.22.1, PR #196)。** Query Wiki 在 Copilot 風格的右側 sidebar leaf 中開啟（若已存在則複用），不再以居中彈窗出現。`message-circle` ribbon 圖示和 `Query Wiki` 指令啟動/顯示側邊欄，筆記與對話並排可見。所有功能保持不變。

![Query Wiki 側邊欄](assets/query-side-panel.png)
- **📤 查詢到 Wiki 反饋** — 將有價值的對話保存到 Wiki，含實體/概念提取，保存前語義去重
- **🔒 重複保存防護** — Hash 跟蹤阻止未變化對話的重複評估

### 🛠️ 維護能力

- **🔍 Lint 健康掃描** — 一次全面報告檢測：重複頁面、斷鏈、空洞頁面、孤立頁面、缺失別名、矛盾
- **🎯 語義分級重複檢測** — Tier 1（直接名稱匹配：跨語言、縮寫、高相似度標題）全部驗證；Tier 2（間接信號：共享鏈接、中等相似度）按 token 預算填充
- **⚡ 一鍵智能修復** — 按因果關係順序批量修復：補全別名 → 合併重複 → 修復斷鏈 → 鏈接孤立頁 → 擴充空洞頁，完成後彈窗報告各階段執行結果
- **🏷️ 別名補全** — 一鍵並行批量生成缺失別名，提升後續重複檢測準確率
- **🔄 自動維護** — 多文件夾監聽、定時 Lint、啓動健康檢查（均可選）
- **⚠️ 矛盾狀態機** — `檢測 → 審覈通過 → 已解決`（AI 修復）或 `檢測 → 待修復`（手動）
- **🛡️ 攝入前置檢查（v1.21.0）** — 在任何 LLM 調用之前驗證每個源文件：空文件/純空白/僅含 frontmatter 的筆記會被直接拒絕；通過內容哈希去重識別跨路徑的相同文件。防止小模型在空白輸入上編造實體名。
- **📊 操作歷史面板（v1.21.0）** — 可搜索、可篩選的 UI，用於查看歷史攝入、Lint 報告和維護運行記錄，含洞察驅動的 KPI 卡片和可點擊的頁面鏈接。

![歷史面板](assets/history-panel.png)
- **🧹 不完整頁面清理（v1.21.0）** — 中途中斷的攝入留下的半成品頁面會在啓動時自動歸檔至 Obsidian 的 `.trash`（可恢復）。

### 🌐 LLM 與語言

- **🔌 多 Provider 支持** — Anthropic、Anthropic 兼容（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、MiniMax、LM Studio、OpenRouter、Ollama、自定義接口
- **🔄 5xx 自動重試** — 全部客戶端在 HTTP 5xx/429/529 錯誤時指數退避重試（最多 2 次）
- **📋 動態模型列表** — 從 Provider API 實時獲取
- **🌐 Wiki 輸出語言** — 10 種語言獨立於界面（英/簡中/繁中/日/韓/德/法/西/葡/意），支持自定義輸入。
- **🌍 全界面國際化** — 插件 UI 支持 10 種語言（英/簡中/繁中/日/韓/德/法/西/葡/意），269+ UI 字段完整翻譯，自然本地表達。
- **⚡ 速率限制守護** — 並行生成觸發限流時自動檢測並提示：降低併發度、增大批次延遲、切換 Provider
- **🦙 Web Clipper 高度兼容** — 一鍵添加官方 Obsidian Web Clipper 的 `Clippings/` 文件夾到監聽列表，網頁剪藏自動攝入 Wiki

### 🏗️ 架構與性能

- **🕸️ PPR over [[wiki-link]] 圖（v1.24.0+，v1.24.1 PATCH 完善）** — Personalized PageRank（Haveliwala 2002）在你 wiki 頁面之間 `[[wiki-link]]` 邊的有向圖上運行；級聯把 PPR 種子錨定在 top-N 候選集，多跳上下文最多經過 3 層擴展環。正是這個機制讓 Query Wiki 答案具備圖感知能力（"微軟創始人"問題通過 Bill Gates → Microsoft → 競爭者 解決，而非僅靠字面標題重疊）。2,137 頁的 vault 典型情況下熱路徑 + 3 跳擴展 < 100 ms，與 vault 規模無關。被查詢與反饋區所有 4 級種子級聯使用，並在 lint 重複檢測（間接鏈接把兩個候選頁面關聯起來時）也會用到。
- **⚡ 並行頁面生成** — 可配置 1–5 併發頁面，默認 3（並行），大源文件 2–3× 加速，單頁錯誤隔離
- **📚 迭代批量提取** — 自適應批次大小，消除長文檔的 max_tokens 瓶頸
- **🏛️ 三層架構** — 你的 vault 筆記（唯讀）→ `wiki/`（LLM 生成的頁面，組織為 `wiki/sources/`、`wiki/entities/`、`wiki/concepts/`）→ `schema/`（共進化配置）
- **🧩 模塊化代碼庫** — 20+ 個聚焦模塊，位於 `src/`

### 🔒 隱私與安全

- **無後端、無追蹤。** 插件完全在 Obsidian 內部運行——沒有外部服務器、沒有數據分析、沒有任何形式的數據收集。除非你主動配置 LLM 提供商，否則你的筆記永遠不會離開你的 vault。
- **數據默認保留在本地。** 插件不會存儲、緩存或傳輸你的內容到你所選 LLM API 之外的任何地方。只有你發送用於攝入或查詢的文本會離開你的設備——且僅發往你配置的提供商。
- **通過 Ollama、LM Studio 或本地提供商實現完全本地模式。** 爲了完全的數據主權，請使用本地運行的 LLM。你的筆記完全在你的機器上處理——不觸碰互聯網。
- **最小化權限。** Vault 文件訪問用於 Wiki 管理（閱讀筆記、生成頁面、檢測死鏈）。網絡訪問僅用於與你所選提供商的 LLM API 通信。剪貼板訪問僅限於 Query 模態框中的"複製"按鈕——僅在您點擊時使用。

---
## 📖 使用示例

**輸入：** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**輸出 — 實體頁：** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2025-12-01
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["監督學習", "Supervised Learning"]
---

### Supervised Learning

### 基本信息
- 類型：method
- 來源：[[sources/machine-learning]]

### 描述
監督學習是一種機器學習範式，模型從帶標籤的訓練數據中學習，
從而對未見數據做出預測……

### 相關概念
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### 相關實體
- [[entities/Arthur-Samuel|Arthur Samuel]]

### 來源提及
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 🤖 模型選擇建議

本插件遵循 Karpathy 的核心理念：**將完整 Wiki 上下文直接餵給 LLM，而非切成碎片做 RAG 檢索**。強烈推薦選擇長上下文窗口的模型——Wiki 越大，LLM 越需要足夠的上下文來保持跨頁面一致性。

> 💡 爲什麼不使用 RAG？Karpathy 在[原始構想](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)中指出，RAG 將知識碎片化，破壞了 LLM 在完整知識圖譜上的推理能力。

**💰 性價比優先策略：** 不必追求旗艦模型。以下**經濟實惠的替代方案**能以更低成本獲得出色效果：

### ☁️ 雲端模型推薦

| 檔位 | 模型 | 上下文窗口 | 推薦理由 |
|------|------|-----------|----------|
| **🌟 性價比首選** | **DeepSeek V4-Flash** | 1M tokens | 最低價($0.14/M)，284B MoE，批量攝入首選 |
| **🌟 性價比首選** | **Gemini-3.5-Flash** | 1M tokens | 輸出速度比 GPT-5.5 快 4 倍，智能體任務出色 |
| **🌟 性價比首選** | **Qwen3.6-Plus** | 1M tokens | 編碼和智能體能力強勁，價格有競爭力 |
| **🌟 性價比首選** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **均衡型** | **Claude Sonnet 4.6** | 1M tokens | 質量與成本平衡佳，$3/$15 每百萬 token |
| **輕量型** | **Claude Haiku 4.5** | 200K tokens | 快速經濟，適合小型 Wiki |
| **經濟型** | **Xiaomi MiMo-V2.5** | 1M tokens | 小米 310B/15B MoE，2026-04 MIT 開源，Agent 與多模態 |
| **旗艦型** | Claude Opus 4.7 | 1M tokens | 極致質量，成本較高 — 選擇性使用 |
| **旗艦型** | GPT-5.5 | 1M tokens | 頂級推理，成本較高 — 選擇性使用 |

### 🦙 本地模型推薦 (Ollama / LM Studio)

本地推理的最大優勢是資料主權、離線可用、零 API 費用；代價是上下文窗口較小（多為 8K–128K，近期開源權重可達 262K）以及指令遵循能力不及旗艦雲端模型。**依硬體預算選型：** 參數越大，世界知識與指令遵循越強（抽取品質越高、幻覺越少）；參數越小，速度與顯存越省，但幻覺與長上下文推理能力會明顯下降。24 GB Apple Silicon 或單張消費級 GPU 上的甜蜜點是 27B–35B-A3B 級別。

| 模型 | 參數量 | 上下文 | 推薦理由 |
|------|--------|--------|----------|
| **Qwen3.5 27B** | 27B dense | 262K | 攝入場景下品質與體積的最佳平衡；MLX 4-bit 可裝進 24 GB |
| **Qwen3.5 35B-A3B** | 35B 總 / 3B 啟用 MoE | 262K | 速度優於 27B dense，品質相當；理想的顯存節省方案 |
| **Qwen3.5 122B-A10B** | 122B / 10B MoE | 262K | 品質上限；需要 ≥48 GB 顯存或雙卡 |
| **Qwen3.6 27B** | 27B dense | 256K+ | 2026-04 在 Qwen3.5 27B 之上的更新版，硬體能扛得住時優先選這個 |
| **Qwen3.6 35B-A3B** | 35B / 3B MoE | 262K | 與 Qwen3.5 35B-A3B 同樣的取捨，權重更新 |
| **Gemma 4 31B IT** | 31B dense | 262K | 指令遵循強，Markdown 輸出乾淨 |
| **Gemma 4 26B A4B IT** | 26B / 4B MoE | 262K | 比 31B dense 更省顯存，品質相當 |
| **Gemma 4 E2B / E4B IT** | 2B / 4B | 131K | 可純 CPU 運行；僅適合小型 Wiki 或快速預覽 |

**量化建議：** Apple Silicon 上 MLX 4-bit 通常比同等有效位元率的 GGUF Q4_K_M 快 1.5–2×。GGUF Q4_K_M 是跨平台的預設選擇；只有當顯存有富餘且發現 Q4 品質有可見回歸時再考慮 Q5/Q8。

**上下文策略：** Wiki 超過 ~500 頁時，262K 本地模型仍能覆蓋 Query 引擎組裝的大多數上下文，但 2000 頁 vault 的攝入會超出其能力。常見組合：雲端攝入 + 本地查詢。若堅持全程本地，27B/35B-A3B 級別是甜蜜點。

### 📄 本地 PDF OCR 路徑 (v1.25.0+)

v1.25.0 的 PDF 擷取支援任何接受 PDF 作為檔案部分的 Provider。要在 Apple Silicon（oMLX 目前唯一支援的平台）上搭建完全本地的管線，推薦設定如下：

1. 安裝 [oMLX](https://github.com/jundot/omlx)，啟用其內建的 **Markitdown** 後端（本地 PDF→Markdown 轉換）。
2. 載入 **百度 Unlimited-OCR**（2026-06-22 開源，3B 總參 / 0.5B 啟用，端到端 OCR，攻克長文檔「越生成越慢」的舊模型通病）作為 oMLX 的視覺模型。
3. 在本外掛中：Provider 選 **Custom OpenAI-Compatible**（oMLX 走 OpenAI 相容協議），把 Base URL 指向 oMLX 的本地服務地址，Settings → LLM Configuration → Advanced 中開啟 **Force PDF Support**，擷取總結時選用 oMLX 提供的多模態模型。

PDF 全程不離開你的機器 — Markitdown 做結構化轉換，Unlimited-OCR 做視覺識別，本地 LLM 做摘要。本外掛的快取（`.obsidian/plugins/karpathywiki/pdf-cache/`）讓重複擷取保持即時。

**回退方案：** 若 oMLX/Markitdown 不可用（Linux/Windows 或較舊的 Mac），把 **Force PDF Support** 直接指向接受 PDF 檔案部分的本地多模態 LLM — 模型足夠大時品質不錯，但顯存需求隨頁數急劇上升。

**🔌 Anthropic Compatible (Coding Plan):** 如果你的 Provider 提供 Anthropic 兼容 API 端點，選擇 "Anthropic Compatible" 並輸入 Provider 的 Base URL 和 API Key。

> 💡 **OpenAI 計費邊界：** **OpenAI** 使用另行計費的 Platform API Key；**ChatGPT Plan (Codex OAuth)** 是獨立的實驗性 Provider，透過瀏覽器或裝置代碼登入後使用符合資格的 Codex 方案額度，不能僅憑方案名稱保證可用。

---

## 🏗️ 架構

基於 Karpathy 的三層分離設計：

```
📄 你的 vault 筆記（任意資料夾）  # 📖 你選擇哪些筆記進行攝取
  ↓ ingest
wiki/                              # 🧠 LLM 生成的 Wiki 頁面（wiki/sources/、wiki/entities/、wiki/concepts/）
  ↓ query / maintain
schema/                            # 📋 Wiki 結構配置（命名規範、頁面範本、分類規則）
```

> 📖 完整程式碼結構見 [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure)。

**生成的頁面結構：**
- `wiki/sources/檔名.md` — 📄 來源文件摘要
- `wiki/entities/實體名.md` — 👤 實體頁（人物、組織、專案等）
- `wiki/concepts/概念名.md` — 💡 概念頁（理論、方法、術語等）
- `wiki/index.md` — 📑 自動生成的索引
- `wiki/log.md` — 📝 操作日誌

---

## ❓ 常見問題 (FAQ)

> **請保持外掛更新** — 新功能和修復頻繁推出。在 Obsidian 中定期前往 **設定 → 第三方外掛 → 檢查更新**。
>
> 📖 更多問答見 [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28)。

**這個外掛到底能做什麼？**
從你的 vault 中任意選擇一篇筆記、一個資料夾或一組檔案，LLM 自動提取實體與概念，生成帶 `[[雙向連結]]` 的互聯 Wiki。提問時獲得基於*你的*筆記的對話式答案——而非網際網路搜尋。生成的摘要放在 `wiki/sources/`，實體放在 `wiki/entities/`，概念放在 `wiki/concepts/`，而你原始的 vault 筆記不會被任何修改。

**我的資料會被發送給第三方嗎？**
🔒 **隱私優先。** 無後端、無追蹤、無分析——外掛完全在 Obsidian 內部執行。只有你主動發送用於攝入/查詢的文字才會離開你的裝置，且僅發往你配置的 LLM 提供商。如需完全資料本地化，使用本地 Provider（Ollama 或 LM Studio，無需 API key）——你的資料永不觸網。

**這和 RAG 聊天機器人有何不同？**
不同於碎片化上下文的 RAG，LLM-Wiki 執行**個性化 PageRank** 引擎，基於你現有的 `[[wiki-link]]` 圖結構查詢相關頁面——而非向量 embedding。這意味著零 embedding 成本、無新依賴、完全支援本地和離線模型。

**該選哪個 LLM？**
推薦長上下文模型（≥200K tokens）。價效比首選：DeepSeek V4-Flash ($0.14/M)、Gemini 3.5 Flash、Qwen3.6-Plus。本地模型（Ollama/LM Studio）可用於查詢，但上下文視窗較小（8K–128K）。詳見[模型選擇建議](#-模型選擇建議)。

**如何開始使用？**
從 Obsidian 社群外掛市場安裝 → 選擇 LLM Provider → **測試連線** → 在 vault 中任意筆記上執行 **攝取單個來源檔案**（或 **從資料夾攝取**）→ 數秒內即可生成首批 Wiki 頁面。詳見[快速開始](#-快速開始)。

**如何控制 API 成本？**
使用粗略或極簡提取粒度進行批次攝入（更少 LLM 呼叫）。批次智慧跳過自動偵測已處理檔案。自動維護預設關閉（按需開啟）。Lint 在執行修復前顯示計數——不經你確認不會產生費用。

**我的現有 Wiki 安全嗎？**
✅ 自 v1.0.0 向後相容。在任何頁面設定 `reviewed: true` 以保護不被覆蓋。外掛從不修改你原始的 vault 筆記——只會在 `wiki/` 資料夾內生成新頁面。

**可以用我的語言使用嗎？**
🌐 **10 種語言** 支援介面和 Wiki 輸出：English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano。介面語言和 Wiki 語言互相獨立。

**最低配置要求？**
Obsidian v1.11.4+（桌面端或行動端）。需要 LLM Provider API Key、Ollama/LM Studio 本地模型，或已授權的 ChatGPT Plan (Codex OAuth) 憑據。外掛的 **llmReady 守衛** 要求先通過連線測試才能使用核心功能——防止因配置錯誤導致的靜默失敗。

**如何取消正在執行的操作？**
點擊狀態列文字（顯示"攝入中… 點選取消"），或 `Cmd+P` → "取消目前提取"。安全停止於下一批次邊界，保留已完成的工作。

**如何獲得幫助？**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — 提交 Bug
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 提問與反饋
- 開發者工具（`Ctrl+Shift+I` / `Cmd+Option+I`）— 複製日誌，加速問題排查

## 🔒 透明度與合規性

本插件已上架 Obsidian 社區插件市場，並接受安全與權限的自動化審查。

**本插件沒有後端、沒有服務器基礎設施、不進行任何形式的數據收集。** 它是純粹運行在 Obsidian 內部的本地軟件。插件不能也不會有任何方式收集、存儲或傳輸你的數據到任何服務器——因爲這樣的服務器根本不存在。

**網絡訪問**僅用於與你配置的 LLM 提供商通信——不會進行其他網絡調用。這完全由你掌控：你選擇提供商、你輸入 API 密鑰、你決定數據發往何處。

**文件系統訪問**（vault 枚舉）用於構建和維護 Wiki：閱讀你的源筆記、生成頁面、掃描死鏈、檢測重複頁面。插件從不修改你的源文件——僅修改 wiki 文件夾下的文件。

**剪貼板訪問**僅用於 Query 模態框中的"複製"按鈕，且僅在你點擊時使用。

如果你希望數據完全保留在本地，請使用 Ollama 或 LM Studio 等本地 LLM 提供商。使用本地提供商時，你的數據永遠不會離開你的機器。

## 💖 支持專案

如果 LLM-Wiki 已成為你知識工作流程中重要的一部分，你可以透過以下方式支持其持續開發：

- ☕ **[在 Ko-fi 上請我喝杯咖啡](https://ko-fi.com/greenerdalii)** — 透過 Ko-fi 提供一次性或月度支持
- 💳 **[透過 PayPal 打賞](https://paypal.me/greenerdalii)** — 透過 PayPal 一次性打賞

贊助完全自願。無論是否贊助，外掛始終保持 Apache-2.0 授權且功能完整。

### 贊助者

感謝以下支持專案的人：

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 許可證

Apache License 2.0 — 詳見 [LICENSE](LICENSE) 與 [NOTICE](NOTICE)。

## 🙏 致謝

- **💡 概念來源：** [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 本插件的原始構想
- **🛠️ 開發平臺：** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM 傳輸層：** [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
