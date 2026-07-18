![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 插件

> 基于 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 实现的知识库生成系统，自动从笔记中提取实体与概念，构建互联的 Wiki 页面。

> **Obsidian 官方评分 95/100 | 原生支持 10 种语言 | 零嵌入图谱检索 | 完全数据主权 | 兼容所有 LLM 提供商**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | **简体中文** | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[官网](https://llmwiki.greenerai.top/) | [Obsidian 插件市场](https://community.obsidian.md/plugins/karpathywiki) | [博客](https://llmwiki.greenerai.top/zh/blog/) | [反馈讨论](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 用 DeepWiki 读懂代码库](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← 如果你觉得项目帮到你，欢迎请我杯咖啡♥️或为项目点亮🌟↗

---

> **⚡ 快速更新提醒：** 本项目迭代速度快，会经常进行 Bug 修复、性能提升或新功能、体验优化等。建议经常在 Obsidian 中更新到最新版本（**设置 → 社区插件 → 检查更新**），或开启插件的自动更新功能以确保获得最佳体验。

## 📑 目录

- [🧠 Karpathy LLM Wiki — Obsidian 插件](#-karpathy-llm-wiki--obsidian-插件)
  - [📑 目录](#-目录)
  - [💡 什么是 LLM-Wiki？](#-什么是-llm-wiki)
  - [⚡ 为什么选择 Obsidian + LLM-Wiki？](#-为什么选择-obsidian--llm-wiki)
  - [🚀 快速开始](#-快速开始)
    - [📦 安装](#-安装)
    - [🔄 更新插件](#-更新插件)
    - [🔑 配置 LLM Provider](#-配置-llm-provider)
    - [🎮 使用方式](#-使用方式)
    - [⚠️ 从旧版本升级？](#️-从旧版本升级)
  - [⚡ v1.24.0 更新内容](#-v1240-更新内容)
  - [✨ 核心特性](#-核心特性)
    - [📊 知识质量](#-知识质量)
    - [📄 PDF 摄取 (v1.25.0)](#-pdf-摄取-v1250)
    - [💬 查询与反馈](#-查询与反馈)
    - [🛠️ 维护能力](#️-维护能力)
    - [🌐 LLM 与语言](#-llm-与语言)
    - [🏗️ 架构与性能](#️-架构与性能)
    - [🔒 隐私与安全](#-隐私与安全)
  - [📖 使用示例](#-使用示例)
  - [🤖 模型选择建议](#-模型选择建议)
    - [☁️ 云端模型推荐](#️-云端模型推荐)
    - [🦙 本地模型推荐 (Ollama / LM Studio)](#-本地模型推荐-ollama--lm-studio)
    - [📄 本地 PDF OCR 路径 (v1.25.0+)](#-本地-pdf-ocr-路径-v1250)
  - [🏗️ 架构](#️-架构)
  - [❓ 常见问题 (FAQ)](#-常见问题-faq)
  - [🔒 透明度与合规性](#-透明度与合规性)
  - [💖 支持项目](#-支持项目)
    - [赞助者](#赞助者)
  - [📜 许可证](#-许可证)
  - [🙏 致谢](#-致谢)
  - [Star History](#star-history)
---

## 💡 什么是 LLM-Wiki？

你写笔记，AI 来整理，你开口问。就这么简单。

**🎯 痛点。** 你的笔记是个金矿——人物、概念、观点、关联。但现在它们只是文件夹里的一堆文档。找到谁跟谁有关，只能靠搜索、打标签，以及祈祷自己还记得那条线索。

**✨ 思路。** [Andrej Karpathy 提出了](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)一个优雅的方案：把笔记当原材料，让 LLM 来做架构师。它读你写的东西，提取实体和概念，编织成一个结构化的 Wiki——带 `[[双向链接]]`、自动索引，还能用自然语言对你的知识库提问。

**📚 你不再是图书管理员。** 不用纠结该给谁建页面，不用手工维护交叉链接，不用担心信息过时。从你的 vault 中任意选择一篇笔记（或整个文件夹、或多选文件），LLM 自动阅读、提取、撰写、链接，甚至标记矛盾——你只管继续写。

**🤖 也不是另一个聊天机器人。** ChatGPT 了解互联网，LLM-Wiki 了解*你*——准确说，是你教给它的东西。每个回答都带着 `[[wiki-links]]` 回到你的知识图谱。每条回复都是一条探索路径的起点，而不是终点。

**🏆 核心差异化 —— 零嵌入成本、图谱驱动的检索。** 大多数知识库插件用向量嵌入（成本高、依赖供应商、需要联网）。LLM-Wiki 在你已有的 `[[wiki-link]]` 图谱上跑 Personalized PageRank —— 零 API 调用、无新依赖、本地模型完全支持，检索质量对标嵌入级。再加上 i18n 感知的**零 LLM Tier B 章节抽取**（10 种语言），无论用什么提供商，每个用户都能用上同一个知识引擎。

---

## ⚡ 为什么选择 Obsidian + LLM-Wiki？

Obsidian 是链接思考的利器。但有个问题：连线的那个人一直是你自己。

LLM-Wiki 把这个关系翻转了。不是你手工构建图谱，而是 AI 随着你的笔记一起成长。你写一篇新笔记——它帮你找出你可能会错过的关联。你提一个问题——它在你自己的知识图谱里穿行，带着引用回来见你。

- **🔗 你的图谱视图活起来了。** 新笔记不再静静躺在文件夹里——它们自动生长出指向实体、概念和来源的链接。图谱有机生长，插件持续维护：检测重复、修复断链、用别名桥接不同语言。
- **💬 你的笔记学会了对话。** 搜索变成了聊天。"我之前写过什么关于 X 的内容？"变成了对话，流式回答带着 `[[wiki-links]]` 作为路标。每个回答都是深入你自己知识的一条路径。
- **🧠 Obsidian 成为你的思考伙伴。** 它不再只是装笔记的柜子，而是帮你*思考*的东西——浮现隐藏的关联、标记矛盾、记起你忘了自己知道的事。

---

## 🚀 快速开始

### 📦 安装

**🌟 推荐 — Obsidian 社区插件市场：**

1. 在 Obsidian 中打开 **设置 → 第三方插件**
2. 点击 **浏览**，搜索 "Karpathy LLM Wiki"
3. 点击 **安装**，然后 **启用**

**🌐 或从社区插件网站安装 —** 访问 [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki)，点击 **Add to Obsidian** 即可直接安装。

**⚙️ 手动安装（备用）：**

1. 从 [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 在 Obsidian 中打开 设置 → 第三方插件，在 **已安装插件** 标签页点击文件夹图标，打开插件目录
3. 新建一个 `karpathywiki` 文件夹，将三个文件放入其中
4. 回到 Obsidian，点击刷新图标 — **Karpathy LLM Wiki** 会出现在已安装插件列表中
5. 打开开关启用

**🔨 开发构建：** `git clone` 后执行 `pnpm install` 和 `pnpm build`。

### 🔄 更新插件

本项目迭代迅速，新功能、修复和改进会频繁发布。建议保持更新：

**方式一 — 手动更新（推荐）：**
1. 打开 **设置 → 第三方插件**
2. 点击 **检查更新**
3. 在列表中找到 **Karpathy LLM Wiki**，点击 **更新**

**方式二 — 开启自动更新：**
1. 打开 **设置 → 第三方插件**
2. 开启 **自动检查插件更新**
3. 新版本会被自动检测，你可以择机手动更新

> 💡 **为什么要保持更新？** 每次发布都可能包含新功能、性能优化和重要修复。我们会积极维护此插件——错过更新意味着错过更好的体验。

### 🔑 配置 LLM Provider

1. 打开 设置 → Karpathy LLM Wiki
2. 从下拉菜单选择 Provider（Anthropic、Anthropic 兼容、Google Gemini、OpenAI、DeepSeek、Kimi、GLM、MiniMax、LM Studio、Ollama、OpenRouter 或自定义）
3. 填入 API Key（Ollama 不需要）
4. 点击 **获取模型列表** 填充模型下拉框，或手动输入模型名
5. 点击 **测试连接**，然后 **保存设置**

**Ollama 本地模型（无需 API Key）：** 安装 [Ollama](https://ollama.com)，拉取模型（如 `ollama pull gemma4` 或 `ollama pull qwen3.5:27b`），在 Provider 下拉选择 "Ollama (本地)"。

**LM Studio 本地模型（无需 API Key）：** 安装 [LM Studio](https://lmstudio.ai)，启动其本地服务（默认 `http://localhost:1234/v1`），在 Provider 下拉选择 "LM Studio（本地）"。LM Studio 内置 OpenAI 兼容服务，API Key 字段可选。

**Anthropic 兼容（Coding Plan）：** 如果你的服务商提供 Anthropic 兼容的 API 端点（常见于 Coding Plan 订阅），选择 "Anthropic 兼容"，填入服务商提供的 Base URL 和 API Key。

### 🎮 使用方式

| 方式 | 操作 |
|------|------|
| **📥 摄入单个源文件** | `Cmd+P` → "摄入单个源文件" — 选择笔记文件，提取实体和概念生成 Wiki 页面 |
| **📂 从文件夹摄入** | `Cmd+P` → "从文件夹摄入" — 选择文件夹，批量处理其中所有笔记 |
| **📑 多选文件摄入** | `Cmd+P` → "多选文件摄入" — 通过递归文件夹树 + 每文件复选框精确选择笔记，批量摄取（带实时队列 + 按文件取消）|
| **🎯 摄入当前文件** | 点击左侧 ribbon 的 `sticker` 图标，或 `Cmd+P` → "摄入当前文件" — 直接摄入当前打开的笔记 |
| **🔍 查询 Wiki** | `Cmd+P` → "查询 Wiki" — 对话式提问，流式回答中自带 `[[wiki-links]]` |
| **🛠️ 维护 Wiki** | `Cmd+P` → "维护 Wiki" — 全面健康扫描：重复页、断链、空洞页、孤立页、缺失别名、矛盾。Schema 建议显示在 Lint Modal 内 |
| **📋 重新生成索引** | `Cmd+P` → "重新生成索引" — 重建 `wiki/index.md`，包含别名信息 |
| **📊 查看摄入历史 (v1.21.0)** | `Cmd+P` → "查看摄入历史" — 可搜索、可筛选的界面浏览历史摄入、Lint 报告和维护运行 |
| **⏹ 取消当前操作** | `Cmd+P` → "取消当前提取" — 安全停止进行中的操作，保留已完成工作 |
| **🎉 重建欢迎笔记 (v1.23.0)** | `Cmd+P` → "重建 Wiki 欢迎笔记" — 重新生成首次运行的欢迎笔记 |

重复摄入同一源文件时，实体/概念页以增量方式合并新信息，摘要页会重新生成。

> 💡 **批量智能跳过：** 文件夹摄入时，插件自动检测已处理文件并跳过，节省时间和 API 成本。

![命令面板 — 搜索 "karpa" 查看所有 Karpathy LLM Wiki 命令](assets/command-panel.png)

### ⚠️ 从旧版本升级？

> 🔧 **从 v1.24.0 升级。** 此前用于单独保护页面*来源提及*章节的内部注释标记 `<!-- reviewed: keep -->`（v1.24.0，#244）已移除。如需保留手动整理的来源提及章节，请在页面 frontmatter 中设置 `reviewed: true`——它保护整个页面（含来源提及），且不同于隐藏的注释标记，会显示在属性面板中、也不会被 Markdown linter 破坏。

**向后兼容。** 自 v1.0.0 起无破坏性变更——现有 Wiki 页面、设置和工作流全部保留，无需重新配置。

**升级后**，运行 **维护 Wiki** → **一键智能修复** 按因果关系自动处理：
1. 🏷️ 补全别名（LLM 批量生成翻译、缩写、变体名）
2. 🔄 合并重复页面（跨语言、缩写、高相似度匹配）
3. 🔗 修复断链 / 链接孤立页 / 扩充空洞页

然后**重建索引**，为每个页面附加别名条目，启用别名感知搜索（如 "DSA" 找到 "DeepSeek-Sparse-Attention"）。

> 📖 特定版本跳跃的详细升级指南（v1.20.3 指纹迁移、v1.16.0 双重嵌套链接）见 [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)。

**建议检查的设置项：** Wiki 输出语言（独立于界面）、提取粒度（极简–精细 + 自定义）、页面生成并发度（默认 3）、批次延迟（默认 300ms）。

## ⚡ v1.24.0 更新内容

五大主题：按任务选择模型、自定义查询指令、四个 monolith 拆分、源笔记别名传递、用户报告的 frontmatter 修复。推荐 v1.23.x 用户全部升级。

- **🎛️ 按任务选择模型 (#208)。** 为 **摄入 / 校对 / 查询** 分别选择不同模型，或保持统一。设置 → Wiki → *模型作用域* 一键切换。**测试连接** 按钮现在会按顺序探测每个已配置模型，任意一个失败即中止——所有任务模型都必须通过测试
- **📝 自定义查询指令 (#251, `jameses-cyber`)。** 查询 Wiki 面板内新增可折叠面板，允许为每次系统提示追加持久指令（研究模式、引用风格、不允许编造规则等）。5000 字符防御性上限。严格仅作用于 Query Wiki；摄入 / 校对 / 页面生成不受影响。模式选择器计划于 v1.25.0+ 上线
- **🧱 四个 monolith 拆分（v1.23.0 系列 P0 延续）。** `controller.ts`（PR #248）、`history-modal.ts`（PR #249，1579 → 14 个文件，93 个测试）、`query-engine.ts`（PR #250，1373 → 15 个文件）、`modals.ts`（PR #257，1008 → 7 个文件）——每个 god 函数 / god 类拆解为聚焦模块，为下批功能做好结构准备
- **🏷️ 源笔记别名传递 (#185)。** 源笔记 frontmatter 中的 `aliases:` 现在会传递到生成的 `sources/<slug>` 页面，下游 `[[wiki-link]]` 匹配和别名感知搜索能命中每一处引用。减少 "DSA ≠ DeepSeek-Sparse-Attention" 类型的遗漏
- **🔀 Tier-1 + Tier-2 合并分流 (#216, `DocTpoint`)。** 分类-然后-路由重复旁路决策：直接跳过伪 Tier-1 候选，仅对剩余部分运行 Tier-2。在保证高精度匹配的同时缩减 Lint 合并批大小
- **🐛 Frontmatter 写入修复（4 个用户报告 bug）。** `aliases:[]` 不再被误判为别名不足；写入时重复别名自动折叠；块格式 frontmatter 保持原样（非压平为 inline）；失败时附带出错字段记录。影响 Smart Fix 与合并路径
- **🚀 Query Wiki 首次查询 PPR 预热。** 引擎级 PPR 图缓存（`wikiFolder` 变更时失效 + `invalidatePageCaches` 时清空）——首次查询即可使用个性化 PageRank，不再回退到冷启 lex-only
- **🌐 i18n 完整性** — 每语种新增 7 个键，覆盖按任务模型选择器、模型作用域下拉与测试连接标签

**建议检查的设置项：** 模型作用域（统一 / 按任务，路径：设置 → Wiki）、按任务模型字段（仅按任务模式下可见）、Query Wiki → ⚙ 自定义指令可折叠面板（仅面板内）。

### v1.24.1 — 2026-07-14（PATCH）

建议所有 v1.24.0 用户升级。

- **🔍 5 级 PPR 种子选择级联。** Query Wiki 现在在生成答案前运行五个互补阶段（lex 快速路径 → LLM 关键词 → 本地子串扫描 → LLM KB 回退 → PPR 图扩展）。多跳问题无需 opt-in 嵌入即可获得图感知上下文。
- **🤫 空响应静默路径。** `parseJsonResponse` 在 Lint/Query 路径中遇到空 LLM 响应体时不再输出嘈杂错误，修复部分用户报告的控制台刷屏问题（#255、#274）。种子选择器在空体时也会更早抛出，便于清晰恢复（#275）。
- **🧹 更清爽的实体页面。** 生成提示与 schema 中移除了冗余的 `## 基本信息` / `## Basic Info` 块；新实体页面从 frontmatter 直达 H1 → 描述 → 相关章节（#258）。
- **☁️ Bedrock Stage 1 提供商。** 新增 `bedrock-anthropic` 与 `bedrock-openai` 选项，通过 AWS bedrock-mantle 端点路由。零新增 npm 依赖，包体仅约 +3 KB。
- **🦙 LM Studio 无 Key 摄入。** 摄入现在支持 LM Studio 留空 API Key，与连接测试行为一致。
- **🏗️ 内部清理。** `page-factory.ts` 拆分为 10 个聚焦模块（+99 个测试）；非破坏性 Mentions 再摄入在合并时保留更早来源的引用（#267）。

**升级提示：** 如果你在 v1.24.0 手动添加了 `<!-- reviewed: keep -->` 标记，请改用 frontmatter `reviewed: true` —— 它保护整个页面，且不会被 Markdown linter 破坏。

## ✨ 核心特性

### 📊 知识质量

- **🔍 实体/概念提取** — LLM 从笔记中提取实体（人物、组织、产品、事件等）和概念（理论、方法、术语等），生成独立 Wiki 页面，支持灵活提取粒度（极简~5个、粗略~10、标准~50、精细~100、自定义1–500）平衡分析深度与 API 成本
- **🏷️ 强制页面别名** — 每个生成的页面至少包含 1 个别名（翻译、缩写、变体名），支持跨语言重复检测
- **🔄 重复检测与合并** — 语义分级捕获真正的重复页面（跨语言翻译、缩写、拼写变体）；智能 LLM 融合合并内容并保留别名
- **🧩 智能知识融合** — 多源更新时智能合并新信息不重复；矛盾保留并注明归属；`reviewed: true` 页面受保护不被覆盖
- **📏 内容截断保护** — 8000 max_tokens，自动检测 stop_reason 并以 2× token 重试，覆盖所有 Provider
- **📝 原文引用保留** — 来源提及章节保留原语言引用，可选翻译，确保可追溯性

- **🎨 自定义标签词汇表 (v1.18.0)。** 设置 → Wiki → 标签词汇表模式 → *Custom* 可定义自己的实体类型和概念类型标签列表（例如 `Medical_Arzneimittel`、`法规`）。插件在提取 prompt 和 frontmatter 校验中都会尊重你的词汇表；现有的 Lint 审计 (#85 v7) 会报告任何使用了不在活动词汇表内标签的页面。

![自定义标签词汇表芯片输入](assets/custom-tags.png)

### 📄 PDF 摄取 (v1.25.0)

从 vault 里挑一个 PDF — 插件通过你的 LLM Provider 的原生文件输入读取它，转换成 Markdown，然后回到标准的 Markdown 摄取流程。所有既有的实体/概念/别名/`[[wiki-link]]` 工作流保持不变。

- **🔌 Provider 准入** — Anthropic、OpenAI、Bedrock Anthropic 和 Bedrock OpenAI 原生支持 PDF。其他任何 OpenAI/Anthropic 兼容端点，请在 Settings → LLM Configuration → Advanced 中开启 **Force PDF Support**，让插件尝试调用（你的端点做最终判断；失败时会以本地化 Notice 提示用户关闭该开关）。本地推荐配置见 [本地 PDF OCR 路径](#-本地-pdf-ocr-路径-v1250)。
- **🗄️ 内容哈希缓存** — 相同的 PDF + 相同的模型 + 相同的 converter version 直接返回缓存的 Markdown，无需 LLM 调用。缓存位于 `.obsidian/plugins/karpathywiki/pdf-cache/`；缓存键内嵌 `converterVersion`，prompt 升级时自动失效旧条目。
- **📏 有界增长** — 三层防御缓存治理（总计 100 MB / 1000 条 / 单条 10 MB 上限）+ LRU-by-mtime 淘汰；启动时与每次批量摄取开始时清理旧条目。默认仅缓存 — 不会修改你的 vault。
- **📝 可选 vault sidecar** — Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** 在转换完成后于源 PDF 旁写一份 `<basename>.pdf.md`。默认关闭（仅缓存）。
- **🛡️ 逐字转录 Prompt** — PDF→Markdown prompt 重写为 OCR 风格的逐字转换，配合 `[illegible]` / `[figure: ...]` / `[equation: ...]` 反幻觉标记；小模型/本地模型把输出包裹在 ```markdown 围栏里的，会在写入缓存前自动清洗。
- **⏹ 可取消** — 转换过程中点击状态栏可中断正在进行的 LLM 调用（经由 Vercel AI SDK v6）。

### 💬 查询与反馈

- **🔍 5 级 PPR 种子选择级联（v1.24.1 PATCH）** — 当你提出多跳问题时，Query Wiki 在任何生成启动前会通过五个互补的阶段组合答案：
  1. **Lex 快速路径** — 直接对每个实体/概念标题与别名做 token 重叠匹配（免费、即时；为后续阶段把关）
  2. **LLM 关键词生成** — LLM 从你的查询中提出 8–12 个跨语言关键词（处理同义词、缩写、对 token 重叠不敏感的术语）
  3. **本地子串扫描** — 每个生成的关键词在本地对页面标题、别名与正文片段重新匹配（无额外 LLM 调用；补足噪声容忍的召回）
  4. **LLM KB 回退** — 当 lex + 关键词扫描信号不足时，LLM 对 top-N 候选重新针对完整 wiki 做一次语义筛选
  5. **PPR 图扩展** — 在 `[[wiki-link]]` 图上从候选种子集运行 Personalized PageRank（Haveliwala 2002）；为 LLM 提供图感知的多跳上下文，线性检索无法达到

  级联会自动截断到给出足够信号的步骤 —— 没有固定的 5 步开销，lex 足够时无 LLM 调用，需要 LLM 增强时精度不丢失。端到端相关性（项目自有基准语料上 PPR @5 = 27.1%）超过纯 knn 基线（24.1%），无需嵌入。Stage 1.5（步骤 2–3）处理纯 lex 漏掉的多跳问题；Stage 1.7（步骤 4）在 LLM 注入关键词信号不足时回补；Stage 1.9（步骤 5）保证 LLM 看到的是邻居上下文而非扁平 top-N 列表。取代了旧的二分 tier 级联。

- **🤖 对话式查询** — ChatGPT 风格对话框，流式 Markdown 输出，自带 `[[wiki-links]]`，多轮历史
- **🪟 右侧停靠侧边栏 (v1.22.1, PR #196)。** Query Wiki 在 Copilot 风格的右侧 sidebar leaf 中打开（若已存在则复用），不再以居中弹窗出现。`message-circle` ribbon 图标和 `Query Wiki` 命令激活/显示侧边栏，笔记与对话并排可见。所有功能保持不变。
- **📤 查询到 Wiki 反馈** — 将有价值的对话保存到 Wiki，含实体/概念提取，保存前语义去重
- **🔒 重复保存防护** — Hash 跟踪阻止未变化对话的重复评估

### 🛠️ 维护能力

- **🔍 Lint 健康扫描** — 一次全面报告检测：重复页面、断链、空洞页面、孤立页面、缺失别名、矛盾
- **🎯 语义分级重复检测** — Tier 1（直接名称匹配：跨语言、缩写、高相似度标题）全部验证；Tier 2（间接信号：共享链接、中等相似度）按 token 预算填充
- **⚡ 一键智能修复** — 按因果关系顺序批量修复：补全别名 → 合并重复 → 修复断链 → 链接孤立页 → 扩充空洞页，完成后弹窗报告各阶段执行结果
- **🏷️ 别名补全** — 一键并行批量生成缺失别名，提升后续重复检测准确率
- **🔄 自动维护** — 多文件夹监听、定时 Lint、启动健康检查（均可选）
- **⚠️ 矛盾状态机** — `检测 → 审核通过 → 已解决`（AI 修复）或 `检测 → 待修复`（手动）
- **🛡️ 摄入前置检查（v1.21.0）** — 在任何 LLM 调用之前验证每个源文件：空文件/纯空白/仅含 frontmatter 的笔记会被直接拒绝；通过内容哈希去重识别跨路径的相同文件。防止小模型在空白输入上编造实体名。
- **📊 操作历史面板（v1.21.0）** — 可搜索、可筛选的 UI，用于查看历史摄入、Lint 报告和维护运行记录，含洞察驱动的 KPI 卡片和可点击的页面链接。
- **🧹 不完整页面清理（v1.21.0）** — 中途中断的摄入留下的半成品页面会在启动时自动归档至 Obsidian 的 `.trash`（可恢复）。

### 🌐 LLM 与语言

- **🔌 多 Provider 支持** — Anthropic、Anthropic 兼容（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、MiniMax、LM Studio、OpenRouter、Ollama、自定义接口
- **🔄 5xx 自动重试** — 全部客户端在 HTTP 5xx/429/529 错误时指数退避重试（最多 2 次）
- **📋 动态模型列表** — 从 Provider API 实时获取
- **🌐 Wiki 输出语言** — 10 种语言独立于界面（英/简中/繁中/日/韩/德/法/西/葡/意），支持自定义输入。
- **🌍 全界面国际化** — 插件 UI 支持 10 种语言（英/简中/繁中/日/韩/德/法/西/葡/意），269+ UI 字段完整翻译，自然本地表达。
- **⚡ 速率限制守护** — 并行生成触发限流时自动检测并提示：降低并发度、增大批次延迟、切换 Provider
- **🦙 Web Clipper 高度兼容** — 一键添加官方 Obsidian Web Clipper 的 `Clippings/` 文件夹到监听列表，网页剪藏自动摄入 Wiki

### 🏗️ 架构与性能

- **🕸️ PPR over [[wiki-link]] 图（v1.24.0+，v1.24.1 PATCH 完善）** — Personalized PageRank（Haveliwala 2002）在你 wiki 页面之间 `[[wiki-link]]` 边的有向图上运行；级联把 PPR 种子锚定在 top-N 候选集，多跳上下文最多经过 3 层扩展环。正是这个机制让 Query Wiki 答案具备图感知能力（"微软创始人"问题通过 Bill Gates → Microsoft → 竞争者 解决，而非仅靠字面标题重叠）。2,137 页的 vault 典型情况下热路径 + 3 跳扩展 < 100 ms，与 vault 规模无关。被查询与反馈区所有 4 级种子级联使用，并在 lint 重复检测（间接链接把两个候选页面关联起来时）也会用到。
- **⚡ 并行页面生成** — 可配置 1–5 并发页面，默认 3（并行），大源文件 2–3× 加速，单页错误隔离
- **📚 迭代批量提取** — 自适应批次大小，消除长文档的 max_tokens 瓶颈
- **🏛️ 三层架构** — 你的 vault 笔记（只读）→ `wiki/`（LLM 生成的页面，结构化为 `wiki/sources/`、`wiki/entities/`、`wiki/concepts/`）→ `schema/`（共进化配置）
- **🧩 模块化代码库** — 20+ 个聚焦模块，位于 `src/`

### 🔒 隐私与安全

- **无后端、无追踪。** 插件完全在 Obsidian 内部运行——没有外部服务器、没有数据分析、没有任何形式的数据收集。除非你主动配置 LLM 提供商，否则你的笔记永远不会离开你的 vault。
- **数据默认保留在本地。** 插件不会存储、缓存或传输你的内容到你所选 LLM API 之外的任何地方。只有你发送用于摄入或查询的文本会离开你的设备——且仅发往你配置的提供商。
- **通过 Ollama、LM Studio 或本地提供商实现完全本地模式。** 为了完全的数据主权，请使用本地运行的 LLM。你的笔记完全在你的机器上处理——不触碰互联网。
- **最小化权限。** Vault 文件访问用于 Wiki 管理（阅读笔记、生成页面、检测死链）。网络访问仅用于与你所选提供商的 LLM API 通信。剪贴板访问仅限于 Query 模态框中的"复制"按钮——仅在您点击时使用。

---
## 📖 使用示例

**输入：** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**输出 — 实体页：** `wiki/entities/supervised-learning.md`

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

### 基本信息
- 类型：method
- 来源：[[sources/machine-learning]]

### 描述
监督学习是一种机器学习范式，模型从带标签的训练数据中学习，
从而对未见数据做出预测……

### 相关概念
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### 相关实体
- [[entities/Arthur-Samuel|Arthur Samuel]]

### 来源提及
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 🤖 模型选择建议

本插件遵循 Karpathy 的核心理念：**将完整 Wiki 上下文直接喂给 LLM，而非切成碎片做 RAG 检索**。强烈推荐选择长上下文窗口的模型——Wiki 越大，LLM 越需要足够的上下文来保持跨页面一致性。

> 💡 为什么不使用 RAG？Karpathy 在[原始构想](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)中指出，RAG 将知识碎片化，破坏了 LLM 在完整知识图谱上的推理能力。

**💰 性价比优先策略：** 不必追求旗舰模型。以下**经济实惠的替代方案**能以更低成本获得出色效果：

### ☁️ 云端模型推荐

| 档位 | 模型 | 上下文窗口 | 推荐理由 |
|------|------|-----------|----------|
| **🌟 性价比首选** | **DeepSeek V4-Flash** | 1M tokens | 最低价($0.14/M)，284B MoE，批量摄入首选 |
| **🌟 性价比首选** | **Gemini-3.5-Flash** | 1M tokens | 输出速度比 GPT-5.5 快 4 倍，智能体任务出色 |
| **🌟 性价比首选** | **Qwen3.6-Plus** | 1M tokens | 编码和智能体能力强劲，价格有竞争力 |
| **🌟 性价比首选** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **均衡型** | **Claude Sonnet 4.6** | 1M tokens | 质量与成本平衡佳，$3/$15 每百万 token |
| **轻量型** | **Claude Haiku 4.5** | 200K tokens | 快速经济，适合小型 Wiki |
| **经济型** | **Xiaomi MiMo-V2.5** | 1M tokens | 小米 310B/15B MoE，2026-04 MIT 开源，Agent 与多模态 |
| **旗舰型** | Claude Opus 4.7 | 1M tokens | 极致质量，成本较高 — 选择性使用 |
| **旗舰型** | GPT-5.5 | 1M tokens | 顶级推理，成本较高 — 选择性使用 |

### 🦙 本地模型推荐 (Ollama / LM Studio)

本地推理的最大优势是数据主权、离线可用、零 API 费用；代价是上下文窗口较小（多为 8K–128K，近期开源权重可达 262K）以及指令跟随能力不及旗舰云端模型。**按硬件预算选型：** 参数越大，世界知识和指令遵循越强（抽取质量越高、幻觉越少）；参数越小，速度和显存越省，但幻觉和长上下文推理能力会明显下降。24 GB Apple Silicon 或单张消费级 GPU 上的甜点是 27B–35B-A3B 级别。

| 模型 | 参数量 | 上下文 | 推荐理由 |
|------|--------|--------|----------|
| **Qwen3.5 27B** | 27B dense | 262K | 摄入场景下质量与体积的最佳平衡；MLX 4-bit 可装进 24 GB |
| **Qwen3.5 35B-A3B** | 35B 总 / 3B 激活 MoE | 262K | 速度优于 27B dense，质量相当；理想的显存节省方案 |
| **Qwen3.5 122B-A10B** | 122B / 10B MoE | 262K | 质量上限；需要 ≥48 GB 显存或双卡 |
| **Qwen3.6 27B** | 27B dense | 256K+ | 2026-04 在 Qwen3.5 27B 之上的更新版，硬件能扛得住时优先选这个 |
| **Qwen3.6 35B-A3B** | 35B / 3B MoE | 262K | 与 Qwen3.5 35B-A3B 同样的取舍，权重更新 |
| **Gemma 4 31B IT** | 31B dense | 262K | 指令跟随强，Markdown 输出干净 |
| **Gemma 4 26B A4B IT** | 26B / 4B MoE | 262K | 比 31B dense 更省显存，质量相当 |
| **Gemma 4 E2B / E4B IT** | 2B / 4B | 131K | 可纯 CPU 运行；仅适合小型 Wiki 或快速预览 |

**量化建议：** Apple Silicon 上 MLX 4-bit 通常比同等有效比特率的 GGUF Q4_K_M 快 1.5–2×。GGUF Q4_K_M 是跨平台的默认选择；只有当显存有富余且发现 Q4 质量有可见回归时再考虑 Q5/Q8。

**上下文策略：** Wiki 超过 ~500 页时，262K 本地模型仍能覆盖 Query 引擎组装的大多数上下文，但 2000 页 vault 的摄入会超出其能力。常见组合：云端摄入 + 本地查询。如果坚持全程本地，27B/35B-A3B 级别是甜点。

### 📄 本地 PDF OCR 路径 (v1.25.0+)

v1.25.0 的 PDF 摄取支持任何接受 PDF 作为文件部分的 Provider。要在 Apple Silicon（oMLX 目前唯一支持的平台）上搭建完全本地的管线，推荐配置如下：

1. 安装 [oMLX](https://github.com/jundot/omlx)，启用其内置的 **Markitdown** 后端（本地 PDF→Markdown 转换）。
2. 加载 **百度 Unlimited-OCR**（2026-06-22 开源，3B 总参 / 0.5B 激活，端到端 OCR，攻克长文档"越生成越慢"的旧模型通病）作为 oMLX 的视觉模型。
3. 在本插件中：Provider 选择 **Custom OpenAI-Compatible**（oMLX 走 OpenAI 兼容协议），把 Base URL 指向 oMLX 的本地服务地址，Settings → LLM Configuration → Advanced 中开启 **Force PDF Support**，摄入总结时选用 oMLX 提供的多模态模型。

PDF 全程不离开你的机器 — Markitdown 做结构化转换，Unlimited-OCR 做视觉识别，本地 LLM 做摘要。本插件的缓存（`.obsidian/plugins/karpathywiki/pdf-cache/`）让重复摄取保持即时。

**回退方案：** 如果 oMLX/Markitdown 不可用（Linux/Windows 或较旧的 Mac），把 **Force PDF Support** 直接指向接受 PDF 文件部分的本地多模态 LLM — 模型足够大时质量不错，但显存需求随页数急剧上升。

**🔌 Anthropic Compatible (Coding Plan):** 如果你的 Provider 提供 Anthropic 兼容 API 端点，选择 "Anthropic Compatible" 并输入 Provider 的 Base URL 和 API Key。

> 💡 **订阅套餐：** Coding Plan、OpenAI Pro 或 Anthropic Pro 等订阅套餐是使用频繁时控制成本的绝佳选择。本插件支持这些服务。

---

## 🏗️ 架构

基于 Karpathy 的三层分离设计：

```
📄 你的 vault 笔记（任意文件夹）   # 📖 你选择哪些笔记进行摄入
  ↓ ingest
wiki/                              # 🧠 LLM 生成的 Wiki 页面（wiki/sources/、wiki/entities/、wiki/concepts/）
  ↓ query / maintain
schema/                            # 📋 Wiki 结构配置（命名规范、页面模板、分类规则）
```

> 📖 完整代码结构见 [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure)。

**生成的页面结构：**
- `wiki/sources/文件名.md` — 📄 源文件摘要
- `wiki/entities/实体名.md` — 👤 实体页（人物、组织、项目等）
- `wiki/concepts/概念名.md` — 💡 概念页（理论、方法、术语等）
- `wiki/index.md` — 📑 自动生成的索引
- `wiki/log.md` — 📝 操作日志

---

## ❓ 常见问题 (FAQ)

> **请保持插件更新** — 新功能和修复频繁推出。在 Obsidian 中定期前往 **设置 → 第三方插件 → 检查更新**。
>
> 📖 更多问答见 [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28)。

**这个插件到底能做什么？**
从你的 vault 中任意选择一篇笔记、一个文件夹或一组文件，LLM 自动提取实体与概念，生成带 `[[双向链接]]` 的互联 Wiki。提问时获得基于*你的*笔记的对话式回答——而非互联网搜索。生成的摘要放在 `wiki/sources/`，实体放在 `wiki/entities/`，概念放在 `wiki/concepts/`，而你原始的 vault 笔记不会被任何修改。

**我的数据会被发送给第三方吗？**
🔒 **隐私优先。** 无后端、无追踪、无分析——插件完全在 Obsidian 内部运行。只有你主动发送用于摄入/查询的文本才会离开你的设备，且仅发往你配置的 LLM 提供商。如需完全数据本地化，使用本地 Provider（Ollama 或 LM Studio，无需 API key）——你的数据永不触网。

**这和 RAG 聊天机器人有何不同？**
不同于碎片化上下文的 RAG，LLM-Wiki 运行**个性化 PageRank** 引擎，基于你现有的 `[[wiki-link]]` 图结构查找相关页面——而非向量 embedding。这意味着零 embedding 成本、无新依赖、完全支持本地和离线模型。

**该选哪个 LLM？**
推荐长上下文模型（≥200K tokens）。性价比首选：DeepSeek V4-Flash ($0.14/M)、Gemini 3.5 Flash、Qwen3.6-Plus。本地模型（Ollama/LM Studio）可用于查询，但上下文窗口较小（8K–128K）。详见[模型选择建议](#-模型选择建议)。

**如何开始使用？**
从 Obsidian 社区插件市场安装 → 选择 LLM Provider → **测试连接** → 在 vault 中任意笔记上运行 **摄入单个源文件**（或 **从文件夹摄入**）→ 数秒内即可生成首批 Wiki 页面。详见[快速开始](#-快速开始)。

**如何控制 API 成本？**
使用粗略或极简提取粒度进行批量摄入（更少 LLM 调用）。智能批量跳过自动检测已处理文件。自动维护默认关闭（按需开启）。Lint 在运行修复前显示计数——不经你确认不会产生费用。

**我的现有 Wiki 安全吗？**
✅ 自 v1.0.0 向后兼容。在任何页面设置 `reviewed: true` 以保护不被覆盖。插件从不修改你的原始 vault 笔记——只会在 `wiki/` 文件夹内生成新页面。

**可以用我的语言使用吗？**
🌐 **10 种语言** 支持界面和 Wiki 输出：English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano。界面语言和 Wiki 语言互相独立。

**最低配置要求？**
Obsidian v1.11.0+（桌面端：Windows/macOS/Linux）。LLM Provider API Key（或 Ollama/LM Studio 本地模型，无需 API key）。插件的 **llmReady 守卫** 要求先通过连接测试才能使用核心功能——防止因配置错误导致的静默失败。

**如何取消正在运行的操作？**
点击状态栏文字（显示"摄入中… 点击取消"），或 `Cmd+P` → "取消当前提取"。安全停止于下一批次边界，保留已完成的工作。

**如何获得帮助？**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — 提交 Bug
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 提问与反馈
- 开发者工具（`Ctrl+Shift+I` / `Cmd+Option+I`）— 复制日志，加速问题排查

## 🔒 透明度与合规性

本插件已上架 Obsidian 社区插件市场，并接受安全与权限的自动化审查。

**本插件没有后端、没有服务器基础设施、不进行任何形式的数据收集。** 它是纯粹运行在 Obsidian 内部的本地软件。插件不能也不会有任何方式收集、存储或传输你的数据到任何服务器——因为这样的服务器根本不存在。

**网络访问**仅用于与你配置的 LLM 提供商通信——不会进行其他网络调用。这完全由你掌控：你选择提供商、你输入 API 密钥、你决定数据发往何处。

**文件系统访问**（vault 枚举）用于构建和维护 Wiki：阅读你的源笔记、生成页面、扫描死链、检测重复页面。插件从不修改你的源文件——仅修改 wiki 文件夹下的文件。

**剪贴板访问**仅用于 Query 模态框中的"复制"按钮，且仅在你点击时使用。

如果你希望数据完全保留在本地，请使用 Ollama 或 LM Studio 等本地 LLM 提供商。使用本地提供商时，你的数据永远不会离开你的机器。

## 💖 支持项目

如果 LLM-Wiki 已成为你知识工作流中重要的一部分，你可以通过以下方式支持其持续开发：

- ☕ **[在 Ko-fi 上请我喝杯咖啡](https://ko-fi.com/greenerdalii)** — 通过 Ko-fi 提供一次性或月度支持
- 💳 **[通过 PayPal 打赏](https://paypal.me/greenerdalii)** — 通过 PayPal 一次性打赏

赞助完全自愿。无论是否赞助，插件始终保持 Apache-2.0 许可且功能完整。

### 赞助者

感谢以下支持项目的人：

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 许可证

Apache License 2.0 — 详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。

## 🙏 致谢

- **💡 概念来源：** [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 本插件的原始构想
- **🛠️ 开发平台：** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM 传输层：** [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
