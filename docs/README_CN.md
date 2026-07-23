![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 插件

> 一个 Obsidian 插件，把你的笔记变成互联可查的知识库——[Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 概念，直接集成在你已有的编辑器中。

> **零嵌入图谱检索 • 原生 10 种语言 • 兼容所有 LLM 提供商**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | **简体中文** | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[官网](https://llmwiki.greenerai.top/) | [Obsidian 插件市场](https://community.obsidian.md/plugins/karpathywiki) | [博客](https://llmwiki.greenerai.top/zh/blog/) | [反馈讨论](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

📑 [目录](#-目录) • 🚀 [快速开始](#-快速开始) • ✨ [核心特性](#-核心特性) • 🔍 [检索工作原理](#-检索工作原理) • 🤖 [模型推荐](#-模型推荐) • ❓ [常见问题](#-常见问题)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← 如果你觉得项目帮到了你，欢迎请我杯咖啡♥️或为项目点亮🌟↗


---

> **⚡ 更新提醒：** 本项目迭代速度快，会经常进行 Bug 修复、性能提升或新功能、体验优化等。建议经常在 Obsidian 中更新到最新版本（**设置 → 社区插件 → 检查更新**），或开启插件的自动更新功能以确保获得最佳体验。

## 📑 目录

- [🤔 为什么使用此插件？](#-为什么使用此插件)
- [🎯 适合我吗？](#-适合我吗)
- [🚀 快速开始](#-快速开始)
- [✨ 核心特性](#-核心特性)
- [🔍 检索工作原理](#-检索工作原理)
- [🤖 模型推荐](#-模型推荐)
- [❓ 常见问题](#-常见问题)
- [🔒 隐私](#-隐私)
- [💖 支持项目](#-支持项目)
- [📜 许可证与致谢](#-许可证与致谢)

---

## 🤔 为什么使用此插件？

你写笔记，它们躺在文件夹里。想找出哪些内容互相关联，只能靠回忆早已忘记的线索。

**Karpathy LLM Wiki 的其他开源实现确实存在——但没有一个是开箱即用的 Obsidian 插件。** 大多数是 CLI 工具、Claude Code 技能或独立桌面应用。我们是唯一一个拥有原生 UI、库内存储和 Obsidian 内置图谱视图的插件。

### 竞品对比

| | Karpathy LLM Wiki (本插件) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **交付形态** | ✅ 一键 Obsidian 插件 | ❌ 独立 Tauri 桌面应用 | ❌ Claude Code skill | ❌ Claude Code / Codex skill | ❌ CLI + SDK + MCP 服务 |
| **上手时间** | ✅ **5 分钟** — 社区插件市场 → 安装 → 选择 Provider → 摄入 | ❌ 30 分钟以上 — 编译/下载二进制、配置 CLI | ❌ 15 分钟 — 需要 Claude Code 订阅 + 安装技能 | ❌ 10 分钟 — 需要 Claude Code/Codex 订阅 + 配置 | ❌ 30 分钟以上 — pip install + SDK + MCP 配置 |
| **安装路径** | ✅ Obsidian → 社区插件 → 搜索 → 安装 | ❌ 编译或下载独立二进制，再配置 CLI | ❌ 需要 Claude Code 订阅 + 安装指南 | ❌ 需要 Claude Code 或 Codex 订阅 + 配置步骤 | ❌ pip install + Python SDK + 本地服务 |
| **架构复杂度** | ✅ **零依赖** — 无需向量数据库、无需嵌入模型、无需外部进程 | 🟡 自带 Python 运行时 + sigma.js + sqlite | 🟡 依赖 Claude Code 环境 — 非自包含 | 🟡 需要独立平台运行时 | ❌ 需要 Python、嵌入模型、向量数据库 |
| **国际化 (界面 + Wiki 输出)** | ✅ 10 种语言（界面/Wiki 独立设置） | 🟡 2 种（英文/中文） | ❌ 仅英文 | ❌ 仅英文 | ❌ 仅英文 |
| **LLM 提供商** | ✅ 12+（含 Codex OAuth、Bedrock、LM Studio、Ollama、Anthropic 兼容、Kimi、GLM、MiniMax、DeepSeek） | 🟡 OpenAI 兼容 | 🟡 通过 Claude Code 订阅 | 🟡 通过 Claude Code / Codex 订阅 | 🟡 OpenAI 兼容 |
| **检索算法** | ✅ Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 4 信号启发式（Adamic-Adar + 2 跳衰减） | ❌ 仅 Louvain 社区检测 | ❌ 仅 Louvain + k 跳预览 | ❌ 混合：BM25 + 语义 + wiki 链接 |
| **查询管线（5 级级联）** | ✅ Lex → LLM 关键词 → 子串扫描 → LLM KB 回退 → PPR 扩展（首个充分信号即截断） | 🟡 仅 2 跳衰减 | ❌ 仅 Louvain 聚类 | ❌ k 跳预览（无 LLM 增强） | ❌ BM25 + 语义分块（无图） |
| **需要嵌入模型** | ✅ 不需要（零嵌入成本，有意为之） | 🟡 可选，默认关闭 | ✅ 不需要 | ✅ 不需要 | ❌ **必须 — 强制要求** |
| **图谱可视化** | ✅ Obsidian 原生图谱视图（内建，零额外体积） | ❌ 桌面应用中自定义 sigma.js + graphology | 🟡 vis.js graph.html（独立文件） | ❌ 自定义 sigma.js 离线 HTML | ❌ 只读浏览器查看器 |
| **Wiki 诚实度** | ✅ 当没有 Wiki 源匹配查询时显示"阶段回退"提示 | ❌ 无等效功能 | ❌ 无等效功能 | ❌ 无等效功能 | ❌ 无等效功能 |
| **已发布检索基准** | ✅ PPR @5 = 27.1% vs 纯 knn 基线 24.1%（该领域唯一公开基准） | ❌ 58% → 71% *仅在启用嵌入时*，非同类对比 | ❌ 未公开 | ❌ 未公开 | ❌ 未公开 |

### 三个有意的设计选择

- **🪟 Obsidian 就是运行环境。** 不需要终端、不需要独立应用、不需要 Docker、不需要 Python。从社区插件市场安装，点击摄入，Wiki 从第一秒就存在于你的 vault 中。Obsidian 原生图谱视图渲染你的 `[[wiki-link]]` 图——内建，零额外体积。
- **🧭 干净、自包含。** 零依赖。没有嵌入模型、没有向量数据库、没有 pip 包——一个插件读取你的笔记，与 LLM 对话，写出 Wiki 页面。一切都在 Obsidian 内部运行。
- **🔌 任何你已付费的模型。** Anthropic、Bedrock、OpenAI、ChatGPT Plan (Codex OAuth)、DeepSeek、Kimi、GLM、MiniMax、LM Studio、Ollama、OpenRouter、Anthropic 兼容、自定义端点——十二个以上提供商，没有一个需要嵌入端点。

---

## 🎯 适合我吗？

**✅ 适合，如果你：**

- **想要 5 分钟的上手时间，而非 5 小时的项目。** 从社区插件市场安装 → 选择 Provider → 摄入一篇笔记。没有 CLI、没有 Python、没有独立运行时、没有向量数据库。几秒内就能在 `wiki/` 中看到 Wiki 页面。
- **想要干净、自包含的解决方案。** 插件有零个外部依赖：没有嵌入模型、没有向量数据库、没有 pip 包、没有 Docker 容器。它是一个单一的 Obsidian 插件，读取你的笔记、与 LLM 对话、将 Wiki 页面写入你的 vault。一切都在 Obsidian 内部运行。
- **想要一个基于*你的笔记*回答的可查询聊天**——而非互联网——每个答案都带有 `[[wiki-links]]` 回到你的知识图谱。
- **关心数据主权**——使用 Ollama 或 LM Studio 完全本地运行，永不触网。
- **使用或阅读 10 种支持语言中的任何一种**——界面和 Wiki 输出语言相互独立（你的 Wiki 可以是中文而界面是英文）。
- **通过写 `[[wiki-links]]` 来维护图谱**——你写的每个链接已经在丰富检索；无需单独的标签/嵌入/索引步骤。
- **想要一键维护**——Lint 健康扫描 + 一键智能修复自动处理重复、断链和孤立页，无需手动整理。

**❌ 不适合，如果你：**

- **想要一个通用 ChatGPT 替代品**——本插件只从*你的*知识中回答。
- **需要对 PDF/网页/外部语料库做 RAG 管线**——我们专注于 vault 内路径（PDF 自 v1.25.0 起支持）。
- **在寻找托管 SaaS**——没有后端、没有服务器、没有账号。

---

## 🚀 快速开始

1. **安装。** Obsidian → 设置 → 第三方插件 → 社区插件 → 浏览 → 搜索 "Karpathy LLM Wiki" → 安装 → 启用。或访问 [社区插件页面](https://community.obsidian.md/plugins/karpathywiki) 点击 **Add to Obsidian**。
2. **配置 Provider。** 打开 设置 → Karpathy LLM Wiki → 选择 Provider（OpenAI、Anthropic、Ollama、ChatGPT Plan (Codex OAuth) 等）→ 输入 API Key（本地模型不需要）→ 点击 **测试连接** → 保存。
3. **摄入一篇笔记。** 两种方式：
   - **⌨️ 键盘：** `Cmd+P/Ctrl+P` → 「摄入单个源文件」 → 选择任意 Markdown（或 PDF，v1.25.0+）文件。
   - **🖱️ 工具栏图标：** 点击 Obsidian 左侧 ribbon 中的 **贴纸图标**，即可一键摄入当前打开的笔记——无需翻菜单。
   
   几秒内你的首批 Wiki 页面就出现在 `wiki/sources/`、`wiki/entities/`、`wiki/concepts/` 中。
4. **查询你的 Wiki。** 两种方式：
   - **⌨️ 键盘：** `Cmd+P/Ctrl+P` → 「查询 Wiki」。
   - **🖱️ 工具栏图标：** 点击 Obsidian 左侧 ribbon 中的 **消息圆形图标**。
   
   一个右侧停靠的侧边面板（类 Copilot 风格）会打开，你可以在其中与 Wiki 对话。答案带 `[[wiki-links]]` 回链到你的知识图谱。

![查询侧边面板](/docs/assets/query-side-panel.png)

仅此而已。插件不会修改你的原始笔记——只在 `wiki/` 下创建新页面。**摄入** 和 **查询 Wiki** 都已固定在左侧 ribbon 上，可随时一键访问。（macOS 上使用 `Cmd`，Windows/Linux 上使用 `Ctrl`。）

### 核心命令

| 命令 | 功能 |
|------|------|
| **📥 摄入单个源文件** | `Cmd+P/Ctrl+P` → "摄入单个源文件" — 选择 Markdown 或 **PDF (v1.25.0+)** 文件，生成实体/概念/Wiki 页面。*也可：🖱️ 在当前笔记上点击左侧 ribbon 贴纸图标。* |
| **📂 从文件夹摄入** | `Cmd+P/Ctrl+P` → "从文件夹摄入" — 批量处理文件夹中所有笔记，含智能批量跳过 |
| **📑 多选文件摄入** | `Cmd+P/Ctrl+P` → "多选文件摄入" — 通过双栏文件树选择子集（带实时队列 + 按文件取消）|
| **🔍 查询 Wiki** | `Cmd+P/Ctrl+P` → "查询 Wiki" — 在右侧停靠面板中与 Wiki 对话；答案带有 `[[wiki-links]]`。*也可：🖱️ 点击左侧 ribbon 消息圆形图标。* |
| **🛠️ Lint Wiki** | `Cmd+P/Ctrl+P` → "Lint Wiki" — 全面健康扫描：重复页、断链、空洞页、孤立页、缺失别名、矛盾 |
| **⚡ 一键智能修复** | 在 Lint 弹窗内 — 按因果关系顺序修复，含各阶段执行报告 |
| **📋 重新生成索引** | `Cmd+P/Ctrl+P` → "重新生成索引" — 用当前页面和别名重建 `wiki/index.md` |
| **⏹ 取消** | `Cmd+P/Ctrl+P` → "取消当前摄入" 或点击状态栏 — 在下一个批次边界干净停止 |
| **📊 摄入历史** | `Cmd+P/Ctrl+P` → "查看摄入历史" — 可搜索的 UI，浏览历史摄入、Lint 报告和维护运行 |

![命令面板 — 所有 LLM Wiki 命令都在 Obsidian 的命令面板中](/docs/assets/command-panel.png)

**从一篇笔记到互联 Wiki：**

| 之前 | 之后 |
|------|------|
| `notes/machine-learning.md`（一个扁平文件） | `wiki/concepts/supervised-learning.md` 带 `[[双向链接]]`、别名、来源归属，以及 `wiki/index.md` 中的索引条目 |

> 💡 **保持更新。** 新功能、修复和性能改进频繁发布。设置 → 第三方插件 → 检查更新，或开启自动插件更新。
> 📖 详细教程（安装、PDF 配置、多 Provider 说明、升级指南）见 [GitHub Discussions → 指南](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides)。

---

## ✨ 核心特性

### 📚 知识质量

- **🔍 实体与概念提取** — LLM 从笔记中提取实体（人物、组织、产品、事件）和概念（理论、方法、术语），生成独立页面。提取粒度可配置（极简 → 精细，外加自定义），让你在成本与深度之间取舍。
- **🏷️ 强制别名** — 每个页面至少包含一个别名（翻译、缩写、变体名），使跨语言重复检测得以工作。
- **🔄 分级重复检测** — 第 1 级（直接名称匹配：跨语言、缩写、高相似度标题）全部验证；第 2 级（共享链接、中等相似度）填充剩余 token 预算。
- **🧩 智能合并与矛盾状态** — 重复页面合并时保留别名；矛盾被标记并注明来源归属；`reviewed: true` 的页面受保护不被覆盖。
- **🎨 自定义标签词汇表** — 在设置 → Wiki → 标签词汇表 → *自定义* 中定义自己的实体类型和概念类型标签列表；Lint 会报告任何使用活动词汇表之外标签的页面。

### 📄 PDF 摄入 (v1.25.0+)

- **🔌 Provider 准入** — Anthropic、OpenAI 和 Bedrock 原生支持 PDF。对于任何其他 OpenAI/Anthropic 兼容端点，在设置 → LLM 配置 → 高级中开启 **Force PDF Support** 让插件尝试调用。关于 Apple Silicon 上的本地 OCR、第三方提取工具（MinerU、Docling、Mathpix、Adobe）及完整 PDF 摄入教程，见下方的 [PDF OCR 路径](#-pdf-ocr-路径) 和 [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)。
- **🗄️ 有界缓存** — `.obsidian/plugins/karpathywiki/pdf-cache/` 按内容哈希 + 模型 + 转换器版本为键存储转换后的 Markdown。三层防御治理：总计 100 MB / 1000 条 / 单条 10 MB 上限，LRU-by-mtime 淘汰。
- **📝 可选 vault sidecar** — 设置 → Wiki 配置 → Wiki 文件夹 → *将 PDF Markdown 写入 Vault* 在源 PDF 旁写入 `<basename>.pdf.md`（默认关闭——仅缓存模式）。
- **🛡️ 逐字转录提示** — 带 `[illegible]` / `[figure: ...]` 反幻觉标记的 OCR 风格转换；小型本地模型的 markdown 围栏包裹在写入缓存前自动清洗。

### 📄 PDF OCR 路径

三条路径，选择适合你配置的：

1. **☁️ 云端 Provider 原生 PDF 支持** — Anthropic、OpenAI 或 AWS Bedrock 开箱即用。直接摄入，无需额外设置。对于任何其他 OpenAI/Anthropic 兼容端点，在设置 → LLM 配置 → 高级中开启 **Force PDF Support** 让插件尝试调用。
2. **🖥️ Apple Silicon 本地 OCR** — [oMLX](https://github.com/jundot/omlx) 将 Microsoft Markitdown 集成为其内置的 PDF→Markdown 后端。在 oMLX 中启用 Markitdown，加载 [百度 Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR)（3B / 570M 活跃参数，2026-06 开源）作为视觉模型，将插件指向 oMLX 作为自定义 OpenAI 兼容 Provider，开启 **Force PDF Support**，选择 oMLX 服务的多模态模型。PDF 全程不离开你的机器。
3. **🛠️ 第三方提取工具（MinerU、Docling、Mathpix、Adobe）** — 在你的 PDF 上运行独立提取工具生成 `.md` 文件，然后通过插件的标准管线将其作为普通 Markdown 笔记摄入。对于科学论文、扫描文档、数学密集型 PDF 最为可靠。

📖 **所有三条路径的完整设置教程**（云端 Provider、oMLX 硬件等级、MinerU 安装、缓存管理）→ [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)

### 💬 查询与维护

- **🧭 5 级 PPR 级联** — 见 [检索工作原理](#-检索工作原理)。`[[wiki-link]]` 图上的 Personalized PageRank 提供图感知的多跳上下文。
- **🪟 右侧停靠侧边栏** — 查询 Wiki 在 Copilot 风格的右侧侧边栏（v1.22.1+）中打开，而非居中弹窗。
- **🔍 Lint 健康扫描** — 一条命令检测：重复页、断链、空洞页、孤立页、缺失别名、矛盾。
- **⚡ 一键智能修复** — 按因果关系顺序修复：补全别名 → 合并重复 → 修复断链 → 链接孤立页 → 扩充空洞页，附带各阶段报告。
- **📊 操作历史面板** — 可搜索、可筛选的 UI，查看历史摄入、Lint 报告和维护运行。
- **🛡️ 摄入前置检查** — 空/空白/仅 frontmatter 的笔记在任何 LLM 调用前被拒绝；内容哈希去重捕获跨路径的相同文件。

### 🔒 隐私

- **🚫 无后端、无追踪、无分析。** 完全在 Obsidian 内部运行。网络仅用于与你配置的 LLM 提供商通信。
- **📁 源文件只读。** 插件永不修改你的原始 vault 笔记——仅在 `wiki/` 下创建新页面。
- **🦙 完全本地模式。** Ollama、LM Studio 或任何本地 OpenAI 兼容端点——你的笔记永不离开你的机器。
- **🔐 最小化权限。** Vault 文件访问用于 Wiki 管理。剪贴板访问仅在你在查询弹窗中点击"复制"按钮时。

### 🦙 本地优先

- **🖥️ Ollama、LM Studio、OpenRouter、自定义端点** — 开箱即用。本地模型可用于查询（上下文窗口较小）；2000 页 vault 的摄入通常需要长上下文云端模型。
- **📄 Apple Silicon 上 PDF OCR 路径完全本地** — 见上方的 [PDF OCR 路径](#-pdf-ocr-路径)。
- **🔐 ChatGPT Plan (Codex OAuth)** — 桌面端通过 `127.0.0.1:1455` 的回环回调；移动端通过设备代码。凭据仅存在于 Obsidian SecretStorage 中；退出登录清除。第三方 Codex 兼容功能，非 OpenAI 合作项目。

### 🌐 语言

- **🌍 10 种界面语言** — English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano。界面和 Wiki 输出语言相互独立——你的 Wiki 可以是中文而界面是英文。
- **📚 10 种 Wiki 输出语言** — 同一集合；在设置 → Wiki 配置中选择。*自定义输入* 选项用于临时提示。
- **🈶 269+ 翻译的 UI 字符串** — 每个标签、弹窗和通知。添加第 11 种语言由贡献者驱动（PR #159 模式）。

---

## 🔍 检索工作原理

大多数"AI 搜索"插件将你的笔记分块并嵌入到向量数据库中。我们不这样做。Karpathy 反对 RAG 的理由是分块破坏了 LLM 在完整知识图谱上的推理能力——这个论点在实践中成立。相反，我们遍历你通过写 `[[wiki-links]]` 已经维护的图谱。

### 5 级种子选择级联

当你在问"谁创立了微软？"时，查询 Wiki 在任何答案生成之前运行五个阶段：

1. **Lex 快速路径** — 直接对每个实体/概念的标题和别名做 token 重叠匹配。免费、即时，也是后续所有阶段的把关者。
2. **LLM 关键词生成** — LLM 从你的查询中提出 8–12 个跨语言关键词（在一次 LLM 调用中处理同义词、缩写和 token 重叠不敏感的术语）。
3. **本地子串扫描** — 每个生成的关键词在本地对页面标题、别名和正文片段重新匹配。无需额外 LLM 调用；补足噪声容忍的召回。
4. **LLM KB 回退** — 当 lex + 关键词扫描返回的信号不足时，LLM 对 top-N 候选重新针对完整 Wiki 做一次语义筛选。
5. **PPR 图扩展** — 在 `[[wiki-link]]` 图上从候选种子集运行 Personalized PageRank（Haveliwala 2002）。这是实现图感知多跳上下文的关键："比尔·盖茨" → "微软" → "竞争对手"，而不只是字面标题重叠。

级联在任一阶段返回足够信号时截断——没有固定的 5 步开销，lex 足够时无需 LLM 调用，LLM 增强时不损失精度。

### 规模化的 Personalized PageRank

我们使用 Monte Carlo PPR（Fogaras 2005）——3,000 次随机游走 × 每次 50 步——配合 Haveliwala 2002 的死端规则。开销为 **O(K × L)**，与页面数量无关，因此 2000 页 vault 的扩展延迟与 200 页 vault 相同。

**PPR @5 = 27.1% vs 纯 knn 基线 24.1%** —— 基于项目自有基准语料（该开源 LLM-Wiki 领域唯一已发布的检索基准）。

### 为什么不需要嵌入

我们在 [Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175) 中有意拒绝了嵌入路径。图谱信号已经在那里——每个 `[[wiki-link]]` 都是一条手动 curated 的"这些内容相关"边，而我们支持的大多数 Provider（Ollama、LM Studio、Anthropic、Bedrock、Kimi、GLM、MiniMax）根本没有 `/v1/embeddings` 端点。添加嵌入模型意味着每个页面一次下载、每个 Provider 一个适配器，而对检索质量没有任何提升。

---

## 🤖 模型推荐

**支持的 Provider（12+，基于 2026-07 来自 models.dev 的交叉核对）：**

| Provider | 系列 | 备注 |
|----------|------|------|
| **Anthropic** | Claude 5 系列 | 原生 PDF；`/v1/messages` 协议 |
| **OpenAI** | GPT-5.6 系列（Sol / Terra / Luna） | 原生 PDF；Platform API Key |
| **Google Gemini** | Gemini 3.6 系列 | 原生 PDF（自 1.5 开始支持文件部分）；OpenAI 兼容端点 |
| **DeepSeek** | DeepSeek V4 系列 | OpenAI 兼容；最低成本档 |
| **Alibaba Qwen** | Qwen3.7/3.8 系列 | OpenAI 兼容（DashScope）|
| **xAI Grok** | Grok 4 系列 | OpenAI 兼容；长上下文 |
| **Moonshot Kimi** | Kimi K3 系列 | OpenAI 兼容；2.8T MoE 前沿 |
| **Zhipu GLM** | GLM-5 系列 | OpenAI 兼容；双语言能力强 |
| **MiniMax** | MiniMax M3 系列 | OpenAI 兼容；1M 上下文 |
| **Step（阶跃星辰）** | Step 3 系列（Flash） | OpenAI 兼容；快速推理 |
| **Tencent Hunyuan** | Hy3 系列 | OpenAI 兼容；开放权重 MoE |
| **Xiaomi MiMo** | MiMo V2.5 系列 | MIT 开源；统一低价 |
| **Google Gemma** | Gemma 4 系列 | 开放权重；262K 上下文 |
| **AWS Bedrock** | Anthropic + OpenAI 变种 | VPC / 合规路径 |
| **ChatGPT Plan (Codex OAuth)** | Codex Responses API | 浏览器/设备代码登录；SecretStorage |
| **本地：Ollama, LM Studio, OpenRouter, Anthropic 兼容** | 任何 OpenAI/Anthropic 协议模型 | 自定义 OpenAI 兼容 + Anthropic 兼容（Token Plan / Coding Plan）|

本插件每次查询向 LLM 提供完整的 Wiki 上下文——因此 **长上下文模型胜出**。完整的分级表格（云端 + 本地）见 [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)，来自 [models.dev](https://models.dev/) 交叉核对以确保推荐持续有效。

### 什么更重要

- **🧠 上下文窗口 ≥ 200K tokens**，对于超过 ~500 页的 vault。低于 200K 时，级联组装的上下文会开始被截断。
- **⚖️ 指令遵循质量** 对提取任务比原始 IQ 更重要——选择一个能遵循 Schema 模板的模型，而非排行榜上最大的数字。
- **🔌 嵌入端点无关紧要**——我们不使用嵌入。缺乏 `/v1/embeddings` 的 Provider 完全没问题（我们 12+ 个 Provider 中大部分都没有）。
- **🦙 本地用于查询，云端用于摄入**——2000 页 vault 的摄入通常需要长上下文云端模型；262K 的本地模型覆盖大部分查询。

### Anthropic vs OpenAI vs Codex OAuth —— 它们是不同的 Provider

- **Anthropic**（及其 Bedrock 变种）—— 单独计费的 Anthropic Platform API Key。
- **OpenAI** —— 单独计费的 OpenAI Platform API Key。
- **ChatGPT Plan (Codex OAuth)** —— 实验性、独立的 Provider，在浏览器或设备代码登录后使用符合条件的 Codex 额度；可用性遵循 OpenAI Codex 身份验证和额度政策，而非计划名称。第三方 Codex 兼容功能，非 OpenAI 合作项目或通用 ChatGPT API。

> 📖 **完整选择表格**（云端 + 本地 + PDF OCR + Codex OAuth + 量化 + 硬件等级）→ [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)

---

## ❓ 常见问题

### 这个插件到底能做什么？

选择任意笔记、文件夹或文件组；LLM 提取实体和概念，生成带有 `[[双向链接]]` 的互联 Wiki。提问时获得基于*你的*笔记的对话式回答，而非互联网。你的原始 vault 笔记永不修改。

### 如何开始使用？

从 Obsidian 社区插件市场安装 → 选择 Provider → **测试连接** → 在任意笔记上运行 **摄入单个源文件**。首条 Wiki 页面在几秒内出现。见 [快速开始](#-快速开始)。

### 我现有的 Wiki 安全吗？

✅ 自 v1.0.0 向后兼容。在任何页面设置 `reviewed: true` 以保护不被覆盖。从 v1.24.x 升级不会重写你的 vault；v1.25.0 的 PDF 摄入默认仅缓存。

### 我的数据会被发送给第三方吗？

🚫 无后端、无分析——插件完全在 Obsidian 内部运行。只有你明确发送用于摄入/查询的文本离开你的设备，且仅发往你配置的 LLM 提供商。如需完全数据本地化，使用 Ollama 或 LM Studio。

### 能用我的语言使用吗？

🌍 界面和 Wiki 输出均为 10 种语言。界面语言和 Wiki 语言相互独立。添加第 11 种语言由贡献者驱动（PR #159 模式）。

### 这和 RAG 聊天机器人有何不同？

🚫 无分块。🚫 无嵌入。🚫 无向量数据库。✅ 在你现有的 `[[wiki-link]]` 图上运行 Personalized PageRank——图感知的多跳上下文、零嵌入成本、完全本地模型支持。

### 该选哪个 LLM？

长上下文模型（≥200K tokens）效果最佳。[模型推荐](#-模型推荐) 一节涵盖了原则；完整分级表格见 [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)。

### 有公开的基准测试吗？

有——PPR @5 = 27.1% vs 纯 knn 基线 24.1%，基于项目自有语料。完整的管线及基准脚本在 [检索工作原理](#-检索工作原理) 中描述。

### 如何控制 API 成本？

使用粗略或极简提取粒度进行批量摄入。智能批量跳过自动检测已处理文件。自动维护默认关闭。Lint 在运行修复前显示计数——不经你确认不产生费用。

### 如何取消正在运行的操作？

点击状态栏（显示"摄入中… 点击取消"）或 `Cmd+P/Ctrl+P` → "取消当前摄入"。在下一个批次边界干净停止。

### 哪里可以获得帮助？

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) 提交 Bug · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) 提问与反馈 · 开发者控制台（`Ctrl+Shift+I` / `Cmd+Option+I`）查看插件日志。

---

## 🔒 隐私

本插件已上架 Obsidian 社区插件市场，并接受安全与权限的自动化审核。

- **🚫 无后端、无服务器、无数据收集。** 纯本地软件，运行于 Obsidian 内部。插件不能也不会以任何方式收集、存储或传输你的数据到任何服务器——因为这样的服务器根本不存在。
- **🔐 网络访问是自愿的。** 仅用于与你配置的 LLM 提供商通信。你选择提供商、你输入 API Key、你决定数据去向。
- **📁 Vault 文件访问** 用于 Wiki 管理（阅读笔记、生成页面、扫描死链、检测重复）。插件永不修改你的源文件。
- **📋 剪贴板访问** 仅用于查询弹窗中的"复制"按钮——且仅在你点击时使用。

如需完全数据本地化，使用 Ollama 或 LM Studio。使用本地 Provider 时，你的数据永不离开你的机器。

---

## 💖 支持项目

如果 LLM-Wiki 已成为你知识工作流中重要的一部分，你可以通过以下方式支持其持续开发：

- ☕ **[在 Ko-fi 上请我喝杯咖啡](https://ko-fi.com/greenerdalii)** — 一次性或月度支持
- 💳 **[通过 PayPal 打赏](https://paypal.me/greenerdalii)** — 一次性打赏

赞助完全自愿。插件始终保留 Apache-2.0 许可且功能完整。

感谢 [@jameses-cyber](https://github.com/jameses-cyber) 和 [@issaqua](https://github.com/issaqua) 对项目的支持。

---

## 📜 许可证与致谢

Apache License, Version 2.0 — 详见 [LICENSE](../LICENSE) 和 [NOTICE](../NOTICE)。

**构建于：**
- 💡 [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 原始概念
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）通过 Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) 和 [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — 检索算法

**维护者：** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
