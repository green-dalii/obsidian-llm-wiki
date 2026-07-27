![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 外掛

> 基於 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 實現的知識庫生成系統，自動從筆記中提取實體與概念，構建互聯的 Wiki 頁面。

> **Obsidian 官方市集滿分評分 • 零嵌入圖譜檢索 • 10 種語言原生支援 • 相容所有 LLM 供應商**
> **本機優先 • 無後端 • GDPR 友善**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/README.md) | [简体中文](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_CN.md) | **繁體中文** | [日本語](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_JA.md) | [한국어](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_KO.md) | [Deutsch](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_DE.md) | [Français](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_FR.md) | [Español](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_ES.md) | [Português](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_PT.md) | [Italiano](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_IT.md)

[官網](https://llmwiki.greenerai.top/) | [Obsidian 插件市集](https://community.obsidian.md/plugins/karpathywiki) | [部落格](https://llmwiki.greenerai.top/zh/blog/) | [討論區](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

> **MinerU fork 說明（僅本地構建）：** 此分支構建獨立外掛 `karpathywiki-mineru` / **Karpathy LLM Wiki MinerU**，可與上游外掛 `karpathywiki` 共存。請將本地構建產物安裝到 `.obsidian/plugins/karpathywiki-mineru/`；上方插件市集/更新連結仍指向上游版本，除非明確發布 MinerU 版本。

🤔 [爲什麼選擇這個外掛？](#-爲什麼選擇這個外掛) | 🚀 [快速開始](#-快速開始) | ✨ [核心特性](#-核心特性) | 🌐 [生態](#-生態) | 🔍 [檢索原理](#-檢索原理) | 🤖 [模型](#-模型) | ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← 如果你覺得這個專案幫到你，歡迎請我喝杯咖啡♥️，或為專案點亮一顆星🌟↗

---

## 📑 目錄

- [🤔 爲什麼選擇這個外掛？](#-爲什麼選擇這個外掛)
- [🎯 適合我嗎？](#-適合我嗎)
- [🚀 快速開始](#-快速開始)
- [✨ 核心特性](#-核心特性)
- [🌐 生態](#-生態)
- [🛠️ 工具](#-工具)
- [🔍 檢索原理](#-檢索原理)
- [🤖 模型](#-模型)
- [❓ 常見問題 (FAQ)](#-常見問題-faq)
- [🔒 隱私](#-隱私)
- [💖 支持專案](#-支持專案)
- [📜 許可證與致謝](#-許可證與致謝)

---

## 🤔 爲什麼選擇這個外掛？

你寫筆記，它們躺在資料夾裡。要找出哪些內容彼此相關，你得回憶幾個月前已經忘記的線索。

**Karpathy 的 LLM Wiki 概念有其他開源實作，但沒有一個是一鍵安裝的 Obsidian 外掛。** 大部分是 CLI 工具、Claude Code 技能或獨立桌面應用。我們是唯一一個擁有原生 UI、vault 內儲存和 Obsidian 圖譜檢視的選擇。

### 同類比較

|  | **Karpathy LLM Wiki**（此外掛） | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **交付與安裝** | ✅ **5 分鐘** — 一鍵 Obsidian 外掛：社群外掛市集 → 安裝 → 選 Provider → 攝入 | ❌ 30 分鐘以上 — 編譯/下載 Tauri 二進位檔，設定 CLI | ❌ 15 分鐘 — 需要 Claude Code 訂閱 + 安裝技能 | ❌ 10 分鐘 — 需要 Claude Code/Codex 訂閱 + 設定 | ❌ 30 分鐘以上 — pip 安裝 + Python SDK + 本地伺服器 |
| **架構與依賴** | ✅ **零依賴** — 無向量 DB、無嵌入模型、無外部程序（刻意設計，採用 PPR 檢索 `[[wiki-link]]` 圖譜） | 🟡 內建 Python 執行環境 + sigma.js + sqlite；嵌入模型可選，預設關閉 | 🟡 依賴 Claude Code 環境 — 非自包含；無嵌入 | 🟡 需要獨立的平台執行環境；無嵌入 | ❌ 需要 Python + 嵌入模型 + 向量 DB（強制） |
| **國際化（UI + Wiki 輸出）** | ✅ 10 種語言（UI/Wiki 互相獨立） | 🟡 2 種（EN / 中文） | ❌ 僅英文 | ❌ 僅英文 | ❌ 僅英文 |
| **LLM Provider** | ✅ 12 種以上（含 Codex OAuth、Bedrock、LM Studio、Ollama、Anthropic 相容、Kimi、GLM、MiniMax、DeepSeek） | 🟡 OpenAI 相容 | 🟡 透過 Claude Code 訂閱 | 🟡 透過 Claude Code / Codex 訂閱 | 🟡 OpenAI 相容 |
| **檢索與查詢管線** | ✅ **5 階段級聯** — Lex → LLM 關鍵詞 → 子字串掃描 → LLM KB 回退 → PPR 擴展（在第一個足夠信號處截斷）。Personalized PageRank（Haveliwala 2002）+ Monte Carlo（Fogaras 2005） | 🟡 僅 2 跳衰減（4 信號啟發式：Adamic-Adar + 2 跳） | ❌ 僅 Louvain 社群偵測 | ❌ 僅 k-hop 預覽（無 LLM 增強） | ❌ 基於區塊的 BM25 + 語義（無圖譜） |
| **圖譜視覺化** | ✅ Obsidian 原生圖譜檢視（內建，零額外體積） | ❌ 桌面應用中自訂 sigma.js + graphology | 🟡 vis.js graph.html（獨立檔案） | ❌ 自訂 sigma.js 離線 HTML | ❌ 唯讀瀏覽器檢視器 |
| **Wiki 誠實度** | ✅ 當查詢沒有匹配的 Wiki 來源時顯示「Stage FALLBACK」提示 | ❌ 無對應功能 | ❌ 無對應功能 | ❌ 無對應功能 | ❌ 無對應功能 |
| **公開檢索基準** | ✅ PPR @5 = 27.1% vs 純 kNN 24.1%（此領域唯一公開的數字） | ❌ 58% → 71% *僅在有嵌入時*，格式不可直接比較 | ❌ 未公開 | ❌ 未公開 | ❌ 未公開 |

### 我們刻意選擇的三件事

- **🪟 Obsidian 就是執行環境。** 不需要終端機、獨立應用、Docker 或 Python。從社群外掛市集安裝，按一下「攝入」，Wiki 從第一秒就存在你的 vault 中。Obsidian 原生的圖譜檢視會呈現你的 `[[wiki-link]]` 圖譜——內建功能，完全不增加套件體積。
- **🧭 簡潔且自包含。** 零依賴。不需要嵌入模型、向量資料庫或 pip 套件——單一外掛就能讀取筆記、與 LLM 溝通、並寫入 Wiki 頁面。一切都在 Obsidian 內部運作。
- **🔌 任何你已付費的模型都能用。** Anthropic、Bedrock、OpenAI、ChatGPT Plan (Codex OAuth)、DeepSeek、Kimi、GLM、MiniMax、LM Studio、Ollama、OpenRouter、Anthropic 相容、自訂端點——十二種以上的 Provider，沒有一個需要嵌入端點。

---

## 🎯 適合我嗎？

**✅ 適合，如果你：**

- **想要 5 分鐘設定，而不是 5 小時的專案。** 從社群外掛安裝 → 選擇 Provider → 攝入一則筆記。不需要 CLI、Python、獨立執行環境或向量 DB。幾秒內就能在 `wiki/` 中看到 Wiki 頁面。
- **想要簡潔且自包含的解決方案。** 此外掛完全零外部依賴：沒有嵌入模型、向量資料庫、pip 套件或 Docker 容器。它就是一個讀取筆記、與 LLM 溝通、並將 Wiki 頁面寫入 vault 的單一 Obsidian 外掛。一切都在 Obsidian 內部運作。
- **想要一個能從*你的筆記*中回答問題的對話式查詢**——而不是網際網路——每個回答都附帶 `[[wiki-links]]` 引回你的知識圖譜。
- **重視資料主權**——搭配 Ollama、LM Studio 等本地 Provider，並選擇 **Native model** PDF 後端時，筆記與 PDF 都留在本機；選擇 **MinerU Official API** 會把所選 PDF 上傳至 MinerU 外部雲端服務。
- **使用或閱讀 10 種支援語言中的任何一種**——UI 和 Wiki 輸出語言互相獨立（你的 Wiki 可以用中文，介面用英文）。
- **透過編寫 `[[wiki-links]]` 來維護圖譜**——你寫的每個連結都在增強檢索；不需要額外的標籤/嵌入/索引步驟。
- **想要一鍵維護**——Lint 健康掃描 + 一鍵智慧修復讓重複、斷鏈和孤立頁面保持整潔，無需手動整理。

**❌ 不適合，如果你：**

- **想要一個通用 ChatGPT 替代品**——此外掛只從*你的知識庫*回答問題。
- **需要對 PDF/網頁/外部語料庫進行 RAG 管線處理**——我們專注於 vault 內路徑（v1.25.0 起支援 PDF）。
- **正在尋找託管式 SaaS**——沒有後端、沒有伺服器、沒有帳號。

---

## 🚀 快速開始

1. **選擇一個版本安裝。**
   - **本 MinerU fork（僅本地構建）：** 在本分支完成本地構建，再將 `main.js`、`manifest.json` 和 `styles.css` 複製到 `.obsidian/plugins/karpathywiki-mineru/`，然後啟用 **Karpathy LLM Wiki MinerU**。只有這條安裝路徑包含 **MinerU Official API** 後端。
   - **上游 `karpathywiki`：** Obsidian → 設定 → 社群外掛 → 瀏覽 → 搜尋「Karpathy LLM Wiki」→ 安裝 → 啟用，或使用 [社群外掛頁面](https://community.obsidian.md/plugins/karpathywiki)。外掛市集/社群外掛安裝的是上游 `karpathywiki`，不包含 MinerU 後端。
2. **設定 Provider。** 開啟設定 → Karpathy LLM Wiki → 選擇 Provider（OpenAI、Anthropic、Ollama、ChatGPT Plan (Codex OAuth) 等）→ 輸入 API Key（本地模型不需要）→ 點選 **測試連線** → 儲存。
3. **攝入一則筆記。** 兩種方式：
   - **⌨️ 鍵盤：** `Cmd+P/Ctrl+P` →「攝入單個源文件」→ 選擇任意 Markdown（或 PDF，v1.25.0+）檔案。
   - **🖱️ 工具列圖示：** 點擊 Obsidian 左側 ribbon 中的 **貼紙圖示**，即可一鍵攝入當前開啟的筆記——無需翻找選單。
   
   幾秒內你的第一篇 Wiki 頁面就會出現在 `wiki/sources/`、`wiki/entities/` 和 `wiki/concepts/` 中。
4. **查詢你的 Wiki。** 兩種方式：
   - **⌨️ 鍵盤：** `Cmd+P/Ctrl+P` →「查詢 Wiki」。
   - **🖱️ 工具列圖示：** 點擊 Obsidian 左側 ribbon 中的 **訊息圓形圖示**。
   
   一個右側停靠的側邊面板（類 Copilot 風格）會開啟，你可以在其中與 Wiki 對話。回答附帶 `[[wiki-links]]` 回鏈到你的知識圖譜。

![查詢側邊面板](/docs/assets/query-side-panel.png)

就是這麼簡單。外掛不會修改你原本的筆記——只會在 `wiki/` 下建立新頁面。**攝入** 與 **查詢 Wiki** 都已固定在左側 ribbon 上，可隨時一鍵存取。（macOS 使用 `Cmd`，Windows/Linux 使用 `Ctrl`。）

### 核心指令

| 指令 | 功能說明 |
|------|----------|
| **📥 攝入單個源文件** | `Cmd+P/Ctrl+P` →「攝入單個源文件」— 選擇 Markdown 或 **PDF (v1.25.0+)** 檔案，產生實體/概念/Wiki 頁面。*也可：🖱️ 在當前筆記上點擊左側 ribbon 貼紙圖示。* |
| **📂 從文件夾攝入** | `Cmd+P/Ctrl+P` →「從文件夾攝入」— 批次處理資料夾內所有筆記，含智慧批次跳過 |
| **📑 多選文件攝入** | `Cmd+P/Ctrl+P` →「多選文件攝入」— 透過雙面板檔案樹選擇子集（含即時佇列 + 按檔案取消） |
| **🔍 查詢 Wiki** | `Cmd+P/Ctrl+P` →「查詢 Wiki」— 在右側停靠側邊欄與你的 Wiki 對話；回答附帶 `[[wiki-links]]`。*也可：🖱️ 點擊左側 ribbon 訊息圓形圖示。* |
| **🛠️ 維護 Wiki** | `Cmd+P/Ctrl+P` →「維護 Wiki」— 全面健康掃描：重複頁面、斷鏈、空頁面、孤立頁面、缺失別名、矛盾 |
| **⚡ 一鍵智慧修復** | 在 Lint Modal 內部 — 一鍵按因果順序修復，附各階段執行報告 |
| **📋 重新生成索引** | `Cmd+P/Ctrl+P` →「重新生成索引」— 以目前頁面和別名重建 `wiki/index.md` |
| **⏹ 取消** | `Cmd+P/Ctrl+P` →「取消目前提取」或點擊狀態列 — 在下一批次邊界安全停止 |
| **📊 檢視攝入歷史** | `Cmd+P/Ctrl+P` →「檢視攝入歷史」— 可搜尋 UI，瀏覽歷史攝入、Lint 報告和維護記錄 |

![命令面板 — 所有 LLM Wiki 指令都位於 Obsidian 的命令面板中](/docs/assets/command-panel.png)

| 之前 | 之後 |
|------|------|
| `notes/machine-learning.md`（一個平面檔案） | `wiki/concepts/supervised-learning.md` 含 `[[雙向鏈接]]`、別名、來源引用，以及 `wiki/index.md` 中的條目 |

> 💡 **保持更新。** 新功能、修復和效能改善會頻繁推出。請前往設定 → 社群外掛 → 檢查更新，或開啟自動外掛更新。
> 📖 詳細操作指南（安裝、PDF 設定、多 Provider 注意事項、升級）請見 [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides)。

> 🌟 **如果這個外掛幫你省下設定時間，歡迎到 [GitHub](https://github.com/green-dalii/obsidian-llm-wiki) 點個 Star**，讓更多人能看見。

---

## ✨ 核心特性

### 📚 知識品質

- **🔍 實體與概念提取** — LLM 從筆記中提取實體（人物、組織、產品、事件等）和概念（理論、方法、術語等），生成獨立頁面。粒度可設定（極簡 → 精細，外加自訂），讓你在成本與深度之間取得平衡。
- **🏷️ 強制頁面別名** — 每個頁面至少包含一個別名（翻譯、縮寫、變體名），讓跨語言重複檢測能夠運作。
- **🔄 分級重複檢測** — Tier 1（直接名稱匹配：跨語言、縮寫、高相似度標題）全部驗證；Tier 2（共享鏈接、中等相似度）填補剩餘 token 預算。
- **🧩 智慧合併與矛盾狀態** — 重複頁面合併時保留別名；矛盾標記來源歸屬；`reviewed: true` 頁面受保護不被覆蓋。
- **🎨 自訂標籤詞彙** — 在設定 → Wiki → 標籤詞彙模式 → *自訂* 中定義自己的實體類型和概念類型標籤清單。詞彙表是注入 LLM 的提示（schema injection hint），不是寫入時的強制閘門——小型/本地模型仍可能漂移，Lint 會報告這些頁面以便修復。(Schema 強制校驗在 v1.26.0+ 設計中。)

### 📄 PDF 擷取 (v1.25.0+)

- **🔌 Provider 准入** — Anthropic、OpenAI 和 Bedrock 原生支援 PDF。對於其他任何 OpenAI/Anthropic 相容端點，請在設定 → LLM Configuration → Advanced 中開啟 **Force PDF Support**，讓外掛嘗試呼叫。關於 Apple Silicon 上的本地 OCR、第三方提取器（MinerU、Docling、Mathpix、Adobe）以及完整的 PDF 攝入指南，請參閱下方 [PDF OCR 路徑](#-pdf-ocr-路徑) 和 [docs/PDF-OCR-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/PDF-OCR-GUIDE.md)。
- **🗄️ 有界快取** — 此 fork 將轉換後 Markdown 存在 `.obsidian/plugins/karpathywiki-mineru/pdf-cache/`，與上游 `karpathywiki` 快取分離；鍵值仍為內容雜湊 + 模型 + converterVersion。三層防禦清理機制：總計 100 MB / 1000 條 / 單條 10 MB 上限，搭配 LRU-by-mtime 淘汰。
- **📝 可選 vault sidecar** — 設定 → Wiki Configuration → Wiki Folder → *Write PDF Markdown to Vault* 在來源 PDF 旁寫入 `<basename>.pdf.md`（預設關閉 — 僅快取是預設行為）。
- **⛏️ MinerU Official API 後端** — 此 fork 在設定 → Wiki Configuration → PDF conversion backend 中提供 **Native model**（預設，上游 v1.25.6 行為）和 **MinerU Official API**。MinerU 僅桌面端可用，使用你提供的 MinerU API Token，會把所選 PDF 上傳到 MinerU 外部雲端 API；失敗時不會靜默回退到 Native。成功後會在 PDF 旁發布受管理的 `<basename>.mineru/`，包含 `document.md`、圖片和 `.mineru-manifest.json`。**Clear PDF conversion cache** 只清理內部快取，不刪除 vault 可見的 `.mineru/` 產物。
- **🛡️ 逐字轉錄 Prompt** — OCR 風格的轉換，搭配 `[illegible]` / `[figure: ...]` 反幻覺標記；來自小型本地模型的 markdown 圍欄包裹會在寫入快取前自動清洗。

### 📄 PDF OCR 路徑

三種路徑，根據你的環境選擇：

1. **☁️ 雲端 Provider 原生 PDF 支援** — Anthropic、OpenAI 或 AWS Bedrock 直接讀取 PDF。直接攝入即可，無需額外設定。對於其他任何 OpenAI/Anthropic 相容端點，請在設定 → LLM Configuration → Advanced 中開啟 **Force PDF Support**。
2. **🖥️ Apple Silicon 本地 OCR** — [oMLX](https://github.com/jundot/omlx) 整合了 Microsoft Markitdown 作為內建 PDF→Markdown 後端。在 oMLX 中啟用 Markitdown，載入 [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR)（3B / 570M 活躍參數，2026-06 開源）作為視覺模型，將外掛指向 oMLX 作為 Custom OpenAI-Compatible Provider，開啟 **Force PDF Support**，然後選擇 oMLX 正在服務的多模態模型。PDF 全程不離開你的機器。
3. **🛠️ 第三方提取器（MinerU、Docling、Mathpix、Adobe）** — 上游使用者可先用獨立工具將 PDF 轉成 `.md`，再作為一般 Markdown 筆記攝入。此 MinerU fork 的桌面端也可直接選擇內建 **MinerU Official API** 後端；它只上傳所選 PDF，Token 存在 Obsidian SecretStorage，並在 PDF 旁寫入受管理的 `<basename>.mineru/` 產物。

📖 **三種路徑的完整設定指南**（雲端 Provider、oMLX 硬體分級、MinerU 安裝、快取維護）→ [docs/PDF-OCR-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/PDF-OCR-GUIDE.md)

### 💬 查詢與維護

- **🧭 5 階段 PPR 級聯** — 參閱 [檢索原理](#-檢索原理)。在 `[[wiki-link]]` 圖譜上執行 Personalized PageRank，提供圖感知的多跳上下文。
- **🪟 右側停靠側邊欄** — 查詢 Wiki 以 Copilot 風格的右側 sidebar leaf 開啟（v1.22.1+），取代置中彈窗。
- **🔍 Lint 健康掃描** — 單一指令即可檢測：重複頁面、斷鏈、空頁面、孤立頁面、缺失別名、矛盾。
- **⚡ 一鍵智慧修復** — 按因果順序一鍵修復：補全別名 → 合併重複 → 修復斷鏈 → 鏈接孤立頁 → 擴充空頁面，附各階段執行報告。
- **📊 操作歷史面板** — 可搜尋、可篩選的 UI，瀏覽歷史攝入、Lint 報告和維護記錄。
- **🛡️ 攝入前置檢查** — 空檔案/純空白/僅含 frontmatter 的筆記會在 LLM 呼叫前被拒絕；內容雜湊去重可識別跨路徑的相同檔案。

### 🔒 隱私

- **🚫 無專案後端、無追蹤、無分析。** 在 Obsidian 內部執行。網路僅用於與你設定的 LLM Provider 通訊；若選擇 MinerU，則還用於 PDF 轉換時存取 MinerU Official API。
- **📁 來源檔案為唯讀。** 外掛從不修改你原始的 vault 筆記——只會在 `wiki/` 下建立新頁面。
- **🦙 以本地方式設定時可完全本地執行。** 使用 Ollama、LM Studio 或其他本地 Provider，並選擇 Native PDF 後端時，筆記與 PDF 都留在本機；選擇 MinerU 會把所選 PDF 上傳至 MinerU 外部雲端服務。
- **🔐 最小化權限。** Vault 檔案存取用於 Wiki 管理。剪貼簿存取僅在你於查詢 Modal 中點選「複製」按鈕時使用。

### 🦙 本地優先

- **🖥️ Ollama、LM Studio、OpenRouter、自訂端點** — 開箱即用。本地模型可用於查詢（較小的上下文窗口）；2000 頁 vault 的攝入通常需要長上下文雲端模型。
- **📄 Apple Silicon 上 PDF OCR 路徑完全本地** — 請參閱上方 [PDF OCR 路徑](#-pdf-ocr-路徑)。
- **🔐 ChatGPT Plan (Codex OAuth)** — 桌面端透過 `127.0.0.1:1455` 的迴圈回呼；行動端透過裝置代碼。憑證僅存在 Obsidian SecretStorage 中；登出會清除憑證。第三方 Codex 相容功能，並非 OpenAI 合作項目。

### 🌐 語言

- **🌍 10 種 UI 語言** — 英文、簡體中文、繁體中文、日文、韓文、德文、法文、西班牙文、葡萄牙文、義大利文。UI 和 Wiki 輸出語言互相獨立——你的 Wiki 可以是中文而介面是英文。
- **📚 10 種 Wiki 輸出語言** — 同上；在設定 → Wiki Configuration 中選擇。*自訂輸入* 選項用於臨時提示。
- **🈶 269+ 個翻譯 UI 字串** — 每個標籤、彈窗和通知。新增第 11 種語言由貢獻者驅動（PR #159 模式）。

---

## 🔍 檢索原理

大多數「AI 搜尋」外掛會將你的筆記切成區塊並嵌入向量資料庫。我們不這麼做。Karpathy 反對 RAG 的理由是：區塊化破壞了 LLM 在整個知識圖譜上推理的能力——而這個論點在實務上是成立的。我們的做法是：在你透過編寫 `[[wiki-links]]` 已經維護的圖譜上直接走訪。

### 5 階段種子選擇級聯

當你問「誰創辦了 Microsoft？」時，查詢 Wiki 在生成任何答案之前會執行五個階段：

1. **Lex 快速路徑** — 直接對每個實體/概念標題與別名做 token 重疊匹配。免費、即時，且為後續階段的把關步驟。
2. **LLM 關鍵詞生成** — LLM 從你的查詢中提出 8–12 個跨語言關鍵詞（一次 LLM 呼叫即可處理同義詞、縮寫和 token 重疊不敏感的術語）。
3. **本地子字串掃描** — 每個生成的關鍵詞在本地對頁面標題、別名與正文片段重新匹配。無額外 LLM 呼叫；補滿雜訊容忍的召回。
4. **LLM KB 回退** — 當 lex + 關鍵詞掃描信號不足時，LLM 對 top-N 候選針對完整 wiki 重新做一次語義篩選。
5. **PPR 圖擴展** — 從候選種子集開始，在 `[[wiki-link]]` 圖譜上執行 Personalized PageRank（Haveliwala 2002）。這就是提供圖感知多跳上下文的機制：「比爾蓋茲」→「Microsoft」→「競爭對手」，而非僅靠字面標題重疊。

級聯會在第一個提供足夠信號的步驟處截斷——沒有固定的 5 步開銷，lex 足夠時無需 LLM 呼叫，需要 LLM 增強時也不會損失精度。

### 規模化的 Personalized PageRank

我們使用 Monte Carlo PPR（Fogaras 2005）——3,000 條隨機漫步 × 每條 50 步——搭配 Haveliwala 2002 的 dead-end 規則。成本為 **O(K × L)**，與頁面數量無關，因此 2000 頁的 vault 與 200 頁的 vault 有相同的擴展延遲。

**PPR @5 = 27.1% vs 純 kNN 基線 24.1%**——以專案自有基準語料庫測試（此開源 LLM-Wiki 領域唯一公開的檢索基準）。

### 爲什麼不使用嵌入

我們在 [Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175) 中刻意拒絕了嵌入路徑。圖譜訊號已經存在——每個 `[[wiki-link]]` 都是一條手工維護的「這些內容相關」的邊，而且我們支援的大多數 Provider（Ollama、LM Studio、Anthropic、Bedrock、Kimi、GLM、MiniMax）根本沒有 `/v1/embeddings` 端點。加入嵌入模型意味著每次頁面下載、每個 Provider 適配器，而檢索品質上沒有任何提升。

---

## 🤖 模型

**支援的 Provider（12 種以上，2026-07 經 models.dev 交叉驗證）：**

| Provider | 系列 | 備註 |
|----------|------|------|
| **Anthropic** | Claude 5 系列 | 原生 PDF；`/v1/messages` 協定 |
| **OpenAI** | GPT-5.6 系列（Sol / Terra / Luna） | 原生 PDF；Platform API Key |
| **Google Gemini** | Gemini 3.6 系列 | 原生 PDF（自 1.5 起支援檔案部分）；OpenAI 相容端點 |
| **DeepSeek** | DeepSeek V4 系列 | OpenAI 相容；最低成本 |
| **Alibaba Qwen** | Qwen3.7/3.8 系列 | OpenAI 相容（DashScope） |
| **xAI Grok** | Grok 4 系列 | OpenAI 相容；長上下文 |
| **Moonshot Kimi** | Kimi K3 系列 | OpenAI 相容；2.8T MoE 前沿模型 |
| **Zhipu GLM** | GLM-5 系列 | OpenAI 相容；雙語能力強 |
| **MiniMax** | MiniMax M3 系列 | OpenAI 相容；1M 上下文 |
| **Step（階躍星辰）** | Step 3 系列（Flash） | OpenAI 相容；推理速度快 |
| **Tencent Hunyuan** | Hy3 系列 | OpenAI 相容；開源權重 MoE |
| **Xiaomi MiMo** | MiMo V2.5 系列 | MIT 開源；平價方案 |
| **Google Gemma** | Gemma 4 系列 | 開源權重；262K 上下文 |
| **AWS Bedrock** | Anthropic + OpenAI 變體 | VPC / 合規路徑 |
| **ChatGPT Plan (Codex OAuth)** | Codex Responses API | 瀏覽器/裝置代碼登入；SecretStorage |
| **本地：Ollama、LM Studio、OpenRouter、Anthropic 相容** | 任何 OpenAI/Anthropic 協定模型 | Custom OpenAI-Compatible + Anthropic-Compatible（Token Plan / Coding Plan） |

此外掛在每次查詢時會將完整的 Wiki 上下文餵給 LLM——所以**長上下文模型勝出**。完整的分級表（雲端 + 本地）請見 [docs/MODEL-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/MODEL-GUIDE.md)，已與 [models.dev](https://models.dev/) 交叉驗證以確保建議保持最新。

### 什麼才重要

- **🧠 上下文窗口 ≥ 200K tokens**——適用於超過 ~500 頁的 vault。低於 200K 時，級聯組合的上下文會開始被截斷。
- **⚖️ 指令遵循品質比原始 IQ 更重要**——提取任務選擇能正確遵循 schema 模板的模型，而不是排行榜上最大的數字。
- **🔌 嵌入端點無關緊要**——我們不使用嵌入。沒有 `/v1/embeddings` 的 Provider 完全沒問題（我們 12 種以上的 Provider 大多如此）。
- **🦙 本地用於查詢，雲端用於攝入**——2000 頁 vault 的攝入通常需要長上下文雲端模型；262K 的本地模型可涵蓋大多數查詢。

### Anthropic vs OpenAI vs Codex OAuth——三者是不同的 Provider

- **Anthropic**（及其 Bedrock 變體）——單獨計費的 Anthropic Platform API Key。
- **OpenAI**——單獨計費的 OpenAI Platform API Key。
- **ChatGPT Plan (Codex OAuth)**——實驗性的獨立 Provider，在瀏覽器或裝置代碼登入後使用符合資格的 Codex 方案額度；可用性取決於 OpenAI Codex 的驗證和額度政策，而非僅憑方案名稱。這是第三方 Codex 相容功能，並非 OpenAI 合作項目或通用 ChatGPT API。

> 📖 **完整選擇表**（雲端 + 本地 + PDF OCR + Codex OAuth + 量化 + 硬體分級）→ [docs/MODEL-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/MODEL-GUIDE.md)

---

## 🌐 生態

本外掛與你的其他 Obsidian 工具無縫協作——以下工具皆可直接接入 `[[wiki-link]]` 圖譜，無需任何程式碼改動。

- **📄 [MinerU 線上轉換](https://mineru.net/OpenSourceTools/Extractor)** —— 上海 AI Lab OpenDataLab 團隊推出的免費 PDF/Word/PPT/Excel/HTML/圖片 → Markdown 轉換器。上傳文件、下載 `.md`、放入 vault 內 wiki 資料夾之外的任意位置，然後執行「攝入單一來源」。是科學論文、掃描文件、含公式/表格的複雜多模態 PDF 的最佳路徑。需要嚴格隱私保護的使用者可 [自行部署 MinerU](https://github.com/opendatalab/mineru)；未來版本可能原生整合，詳見 [#376](https://github.com/green-dalii/obsidian-llm-wiki/issues/376)。
- **🕸️ Obsidian 原生關係圖譜** —— 在任何 Wiki 頁面開啟原生圖譜視圖；每個 `[[wiki-link]]` 成為節點，每條反向連結成為邊。內建功能，零額外體積。
- **✂️ [Obsidian Web Clipper](https://obsidian.md/clipper)** —— 官方瀏覽器擴充功能。將網頁（文章、部落格文章、Reddit 串文、Hacker News、食譜、研究論文、YouTube 字幕（透過 Interpreter 取得））儲存到 vault 內任一資料夾，然後執行外掛的「從資料夾攝入」指令以批次萃取實體與概念。
- **📊 [Dataview](https://github.com/blacksmithgu/obsidian-dataview)** —— 使用 DQL（`LIST FROM "wiki/entities" WHERE contains(tags, "person")`）或 JS API 像查詢資料庫一樣檢索 Wiki。外掛會在每個頁面寫入標準 frontmatter（`tags:`、`type:`、`aliases:`），Dataview 查詢開箱即可使用。
- **🌿 Git** —— 用任何 Git 客戶端對 vault 進行版本控制。外掛絕不重寫來源檔案，僅在 `wiki/` 下建立新頁面，因此 `git diff` 能清晰區分你的手動編輯與 LLM 生成內容。
- **🎞️ [Marp Slides](https://github.com/samuele-cozzi/obsidian-marp)** —— 透過 Marp frontmatter（`marp: true`）將任何 Obsidian 筆記轉為投影片。Wiki 頁面為純 Markdown，無需額外轉換即可直接渲染為投影片。
- **🖼️ Canvas** —— Obsidian 原生無限畫布。把 Wiki 卡片拖到 Canvas 上，無需離開 vault 即可拼裝學習指南、心智圖或研究概覽，所有內容均透過 `[[wiki-links]]` 互聯。
- **🎤 [Obsidian Nous](https://github.com/AndyMDH/obsidian-nous)** —— 本地語音備忘錄與會議錄製（macOS 上使用 whisper.cpp，音訊資料不出本機）的配套外掛。產生帶說話者標記的轉錄檔案與自有 wiki 中心頁面。與本外掛相互獨立——可在同一 vault 共存而無需耦合。

## 🛠️ 工具

此外掛在本倉庫隨附一個無頭 CLI，可在磁碟上的 vault 上執行同一攝入管線——無需 Obsidian、無需 Electron、無需介面。引擎、分析器、頁面工廠、Schema 管理器與 LLM 客戶端均直接從 `src/` 匯入；僅宿主（`obsidian`、即時 vault、metadataCache）被替換為 shim。適用於 CI、腳本化執行、跨臂比較採樣參數，以及在單一來源上分析萃取迴圈。

```bash
pnpm llm-wiki ingest --vault /path/to/vault --source "notes/foo.md" --dry-run
```

完整 flag 參考、環境需求與 shim 注意事項見 [`tools/llm-wiki-cli/README.md`](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/tools/llm-wiki-cli/README.md)。

---

## ❓ 常見問題 (FAQ)

### 此外掛到底能做什麼？

選擇任意筆記、資料夾或選取範圍；LLM 提取實體和概念，生成帶有 `[[雙向鏈接]]` 的互聯 Wiki。提出問題，獲得基於*你的*筆記的對話式答案——而非網際網路。你的原始 vault 筆記永遠不會被修改。

### 如何開始使用？

從 Obsidian 社群外掛安裝 → 選擇 Provider → **測試連線** → 在任何筆記上執行 **攝入單個源文件**。第一篇 Wiki 頁面在幾秒內就會出現。請見 [快速開始](#-快速開始)。

### 我現有的 Wiki 安全嗎？

✅ 自 v1.0.0 起向後相容。在任何頁面設定 `reviewed: true` 以保護不被覆蓋。從 v1.24.x 升級不會改寫你的 vault；Native PDF 攝入預設為僅快取。MinerU 成功轉換後會寫入受管理的 `<basename>.mineru/` 產物，但不會覆蓋原始 PDF 或來源筆記。

### 我的資料會被傳送到任何地方嗎？

🚫 沒有專案後端、沒有分析——此外掛在 Obsidian 內部執行。你明確用於攝入/查詢的文字只會發往你設定的 LLM Provider。若選擇 **MinerU Official API** 進行 PDF 轉換，所選 PDF 會使用你的 Token 上傳到 MinerU 外部雲端 API；如需本地 PDF 路徑，請選 Native 後端並搭配 Ollama 或 LM Studio。

### 可以用我的語言使用嗎？

🌍 **10 種語言**支援介面和 Wiki 輸出。介面語言和 Wiki 語言互相獨立。新增第 11 種語言由貢獻者驅動（PR #159 模式）。

### 這和 RAG 聊天機器人有何不同？

🚫 不切分區塊。🚫 不使用嵌入。🚫 不需要向量 DB。✅ 在你現有的 `[[wiki-link]]` 圖譜上執行 Personalized PageRank——圖感知的多跳上下文，零嵌入成本，完全支援本地模型。

### 該選哪個 LLM？

長上下文模型（≥200K tokens）效果最佳。[模型](#-模型) 章節涵蓋了選擇原則；完整的分級表請見 [docs/MODEL-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/MODEL-GUIDE.md)。

### 有公開的基準測試嗎？

有——PPR @5 = 27.1% vs 純 kNN 基線 24.1%，基於專案自有語料庫。完整的管線和基準測試腳本請見 [檢索原理](#-檢索原理)。

### 如何控制 API 成本？

批次攝入時使用粗略或極簡提取粒度。智慧批次跳過自動偵測已處理的檔案。自動維護預設關閉。Lint 在執行修復前會顯示計數——不經你確認不會產生費用。

### 如何取消正在執行的操作？

點擊狀態列文字（顯示「攝入中… 點選取消」），或 `Cmd+P/Ctrl+P` →「取消目前提取」。在下一批次邊界安全停止，保留已完成的工作。

### 在哪裡獲得幫助？

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) 用於回報錯誤 · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) 用於提問和功能請求 · 開發者主控台（`Ctrl+Shift+I` / `Cmd+Option+I`）用於檢視外掛日誌。

---

## 🔒 隱私

上游 `karpathywiki` 外掛已上架 Obsidian 社群外掛市集，並接受安全與權限的自動化審查；此 MinerU fork 在明確發布前僅為本地構建。

- **🚫 無專案後端、無伺服器、無資料收集。** 純粹在 Obsidian 內部運行的本地軟體。本專案不營運自己的服務，因此無法收集你的資料。
- **🔐 網路存取為選擇性加入。** 僅用於與你設定的 LLM Provider 通訊；若選擇 MinerU，則用於將你轉換的 PDF 傳送到 MinerU Official API。你選擇 Provider/後端、輸入所需 Key 或 Token，並決定資料前往何處。
- **📁 Vault 檔案存取**用於 Wiki 管理（讀取筆記、生成頁面、掃描斷鏈、檢測重複）。外掛從不修改你的來源檔案。
- **📋 剪貼簿存取**僅由查詢 Modal 中的「複製」按鈕使用——且僅在你點擊時使用。

如需完全資料本地化，請使用 Native PDF 後端並搭配 Ollama 或 LM Studio。即使 LLM Provider 是本地的，選擇 MinerU 仍會把所選 PDF 上傳到 MinerU 外部雲端服務。

---

## 💖 支持專案

如果 LLM-Wiki 已成為你知識工作流程中重要的一部分：

- ☕ **[在 Ko-fi 上請我喝杯咖啡](https://ko-fi.com/greenerdalii)** — 一次性或月度支持
- 💳 **[透過 PayPal 打賞](https://paypal.me/greenerdalii)** — 一次性打賞

贊助完全自願。外掛始終保持 Apache-2.0 授權且功能完整。

感謝 [@jameses-cyber](https://github.com/jameses-cyber) 和 [@issaqua](https://github.com/issaqua) 對專案的支持。

---

## 📜 許可證與致謝

Apache License, Version 2.0 — 詳見 [LICENSE](../LICENSE) 與 [NOTICE](../NOTICE)。

**基於以下專案建構：**
- 💡 [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 原始概念
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）via Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) 與 [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — 檢索演算法

**維護者：** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
