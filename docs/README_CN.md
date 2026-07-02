![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 插件

> 基于 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 实现的知识库生成系统，自动从笔记中提取实体与概念，构建互联的 Wiki 页面。
>
> **Obsidian 官方评分 95/100** | 原生支持 10 种语言 | 活跃维护，持续进化

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

[English](../README.md) | **简体中文** | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[官网](https://llmwiki.greenerai.top/) | [博客](https://llmwiki.greenerai.top/zh/blog/) | [反馈讨论](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 用 DeepWiki 读懂代码库](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD)

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
  - [⚡ v1.23.0 更新内容](#-v1230-更新内容)
    - [⭐ 亮点](#-亮点)
    - [✨ 新增功能](#-新增功能)
    - [🔧 改进](#-改进)
    - [🐛 修复](#-修复)
    - [📊 测试](#-测试)
  - [✨ 核心特性](#-核心特性)
    - [📊 知识质量](#-知识质量)
    - [🛠️ 维护能力](#️-维护能力)
    - [💬 查询与反馈](#-查询与反馈)
    - [🌐 LLM 与语言](#-llm-与语言)
    - [🏗️ 架构与性能](#️-架构与性能)
    - [🔒 隐私与安全](#-隐私与安全)
  - [⌨️ 命令列表](#️-命令列表)
  - [📖 使用示例](#-使用示例)
  - [🤖 模型选择建议](#-模型选择建议)
  - [🏗️ 架构](#️-架构)
  - [❓ 常见问题 (FAQ)](#-常见问题-faq)
    - [💡 通用](#-通用)
    - [🏷️ 别名与重复](#️-别名与重复)
    - [⚡ 性能与成本](#-性能与成本)
    - [🧹 维护](#-维护)
    - [🔍 故障排查](#-故障排查)
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

**📚 你不再是图书管理员。** 不用纠结该给谁建页面，不用手工维护交叉链接，不用担心信息过时。笔记丢进 `sources/`，LLM 自动阅读、提取、撰写、链接，甚至标记矛盾——你只管继续写。

**🤖 也不是另一个聊天机器人。** ChatGPT 了解互联网，LLM-Wiki 了解*你*——准确说，是你教给它的东西。每个回答都带着 `[[wiki-links]]` 回到你的知识图谱。每条回复都是一条探索路径的起点，而不是终点。

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
| **📥 摄入单个源文件** | `Cmd+P` → "摄入单个源文件" — 选择特定笔记文件，提取实体和概念生成 Wiki 页面 |
| **📂 从文件夹摄入** | `Cmd+P` → "从文件夹摄入" — 选择文件夹，批量处理其中所有笔记 |
| **📑 多选文件摄入** | `Cmd+P` → "多选文件摄入" — 通过双栏 Modal（递归文件夹树 + 每文件复选框）精确选择笔记，再批量摄取所选文件 |
| **🔍 查询 Wiki** | `Cmd+P` → "查询 Wiki" — 对话式提问，流式回答中自带 `[[wiki-links]]` |
| **🛠️ 维护 Wiki** | `Cmd+P` → "维护 Wiki" — 健康扫描：重复页面、断链、孤立页面、空洞页面、缺失别名、双重嵌套链接自动修复 |
| **📋 重新生成索引** | `Cmd+P` → "重新生成索引" — 重新构建 `wiki/index.md`，包含别名信息 |
| **⏹️ 取消当前操作** | `Cmd+P` → "取消当前提取" 或点击状态栏 — 在批次边界安全停止提取或 Lint，保留已完成的工作 |
| **🎯 ribbon 一键摄入** | 点击左侧边栏 `sticker` 图标或 `Cmd+P` → "摄入当前文件" — 直接摄入当前打开的文件 |

重复摄入同一源文件时，实体/概念页以增量方式合并新信息，摘要页会重新生成。

**批量智能跳过：** 文件夹摄入时，插件自动检测已处理文件并跳过，节省时间和 API 成本。批量报告显示跳过计数。

![命令面板 — 搜索 "karpa" 查看所有 Karpathy LLM Wiki 命令](assets/command-panel.png)

### ⚠️ 从旧版本升级？

**本次发布完全向后兼容。** 自 v1.0.0 起无任何破坏性变更——你现有的 Wiki 页面、设置和工作流全部保留，无需重新配置或数据迁移。

**从任意早期版本升级到 v1.20.3**：源页面 slug 现在会带指纹（每个 `sources/<slug>.md` 变为 `sources/<基名>_<6位hex>.md`）。在你下次摄入时，已有的 `sources/` 页面会原地重命名，所有 `[[sources/<slug>]]` 反向链接会自动更新——无需任何操作，但 Obsidian 文件浏览器中可能会短暂显示文件重命名。如果你有外部脚本或书签直接引用 `sources/<slug>.md` 路径，请更新为新的带指纹路径。

**如果你的现有 Wiki 跨多个版本构建而成**，部分页面可能缺少近期新增的能力（别名、别名感知去重、提示词现代化）。运行 **维护 Wiki (Lint Wiki)** 查看需要处理的项目。**一键智能修复 (Smart Fix All)** 可一站式处理最常见的清理任务。

**如果从 v1.16.0 之前的版本升级**，建议运行一次 **维护 Wiki (Lint Wiki)** 以自动修复以下历史遗留问题：
- **双重嵌套链接 `[[[[entities/Foo|Foo]]]]`**：log.md 中可能存在格式异常的链接，Lint 会自动检测并修复，零 LLM 成本
- **对侧目录重复 stub**：entities/ 和 concepts/ 中同名的重复页面现在能被正确识别并匹配

**如果你的 Wiki 跨多个旧版本构建**，请按以下步骤将其更新到当前标准：

**1️⃣ 重建索引**
`Cmd+P` → **"重新生成索引"** — 重新构建 `wiki/index.md`，为每个页面附加别名条目，启用别名感知搜索（如搜索"DSA"能找到"DeepSeek-Sparse-Attention"）。旧版索引格式只列出页面标题。

**2️⃣ 运行维护 Wiki**
`Cmd+P` → **"维护 Wiki"** — 扫描整个 Wiki，显示：
- **🏷️ 缺失别名**：没有别名的页面（任何未运行过"Complete Aliases"的版本）。点击 **"Complete Aliases"** 让 LLM 批量生成翻译、缩写、变体名。这对后续重复检测至关重要。
- **🔄 重复页面**：内容重叠的页面（如"CoT"与"思维链"，旧版没有别名感知去重机制）。点击 **"Merge Duplicates"** 合并并保留所有别名。
- **💀 断链 / 空洞页面 / 孤立页面**：常规 Wiki 维护问题。

**3️⃣ 使用一键智能修复**
在 Lint 报告中点击 **"Smart Fix All"**，按因果关系顺序自动修复：补全别名 → 合并重复 → 修复断链 → 链接孤立页 → 扩充空洞页。这是清理跨版本遗留问题的最快方式。

**4️⃣ 启用并行页面生成**
设置 → **LLM 配置（LLM Configuration）**：
- **⚡ 页面生成并发度**：大多 Provider 建议设置为 3。含 10+ 实体的源文件可加速 2–3 倍。
- **⏱️ 批次延迟**：从 300ms 开始。如遇限流请增大至 500–800ms。

**5️⃣ 检查当前设置项：**
- **🌐 Wiki 输出语言**：独立于界面语言——Wiki 可以用中文撰写而插件界面保持英文，反之亦然。
- **📊 提取粒度**：五种选项控制 LLM 从源文件提取实体的深度：
  - **精细**（约100个）— 深度分析，边缘提及也包含。高 token 成本，适合关键源文件。
  - **标准**（约50个）— 平衡提取。日常笔记的良好默认。
  - **粗略**（约10个）— 快速概览，仅核心实体。低成本，快速摄入。
  - **极简**（约5个）— 仅核心条目。批量处理 100+ 文件或测试新源文件的首选。
  - **自定义**（1–300个）— 用户自定义实体/概念上限，适配特殊工作流。
  > 💡 **推荐**：批量处理大文件夹时使用极简或粗略以节省时间和 API 成本。精细选项仅选择性用于值得深度分析的关键文档。
- **🔄 自动维护**：可选的文件监听、定时 Lint、启动健康检查。Startup Quick Fixes 默认开启（一次性启动健康检查）；File Watcher 与 Periodic Lint 默认关闭——仅在需要后台自动处理时启用。

> **🛡️ 安全说明**：并行生成使用 `Promise.allSettled` —— 某页失败不影响其他页面继续。失败页面会自动重试并指数退避。智能批量跳过自动检测已摄入文件，节省时间和 API 成本。

---
## ⚡ v1.23.0 更新内容

v1.23.0 是一个**次要功能版本** —— 自 1.0 以来最大的架构变更。两个核心主题同时发布：**Vercel AI-SDK v6 迁移**（替代手写的 1625 行客户端，使用稳定、厂商支持的传输层），以及**图引擎**（基于 `[[wiki-link]]` 图的个性化 PageRank），无需 embedding 即可实现 embedding 级别的检索质量，适用于每个 Provider，且不引入新依赖。

本版本还合并了 v1.22.6 hotfix 系列（GPT-5.x Pro 变体 Test Connection 回归修复 + LM Studio API-key gate）、knn 基线评估 gate，以及 Sponsor 区。

### ⭐ 亮点

- **🤖 Vercel AI-SDK v6 迁移。** 手写的 `OpenAICompatibleClient` / `AnthropicClient` / `AnthropicCompatibleClient`（1625 LOC，自 v1.20.0 累积 30+ Provider 版本兼容方案）已替换为 `@ai-sdk/openai@3` / `@ai-sdk/anthropic@3` / `@ai-sdk/openai-compatible@2`。新增 `src/llm-sdk/`（5 个文件，1421 LOC）+ `src/core/obsidian-fetch-bridge.ts`（326 LOC），提供稳定、厂商支持的传输层。彻底消除整个 Provider 版本回归类别（#137 / #141 / #143 / #147 / #207）。
- **🕸️ 基于 `[[wiki-link]]` 图的个性化 PageRank（Issue #198, #117, #157, #175）。** 新的 Monte-Carlo PPR 引擎沿现有 wiki-link 结构游走，通过外向链接结构恢复 source 页面 —— 零 embedding 成本的 embedding 级别 R@k，离线工作，无新依赖，适用于每个 Provider。三层流水线（lex 快路径 → LLM 种子 → PPR 游走）+ 混合守卫（图太小时 lex 回退）。Hub 链接区分度扫描作为 lint 通道发布。
- **🛡️ Provider 错误 UX 加固。** 推理模型（`gpt-5.1+`、`gpt-5.5`、`o1`/`o3`/`o4-mini`）路由到 OpenAI Responses API。Token-key 探针重试（`max_tokens` ↔ `max_completion_tokens`）针对**任何** HTTP 400 —— 无正则、无模型名硬编码，仅 `if 400 → retry with alt key`。LM Studio API-key gate（Issue #223）让本地 Provider 在无 API key 时也能测试连接。URL fallback 自动修复自定义 baseURL 中缺失的 `/v1`（Kimi Coding Plan）。

### ✨ 新增功能

- **🔍 个性化 PageRank（PPR）引擎。** `core/monte-carlo-ppr.ts`（Fogaras 2005 MC-PPR）对每个查询页面执行 K 次短随机游走，O(K×L) 成本与 |V| 无关 —— 高度可并行。在 2142 页真实 vault 上调参：`damping=0.05, numWalks=3000, walkLength=20` 将 R@5 从 21.5% 提升至 23.8%（相对 +11%）。详见 `REAL_VAULT_EVAL.md`。
- **🎯 混合检索级联（PPR + LLM 种子 + lex 快路径）。** `core/ppr-cascade.ts`（213 LOC）编排三层 Query Wiki 流水线。`core/section-extractor.ts`（Tier B zero-LLM）替代原先基于 LLM 的种子选择。
- **🔗 Hub 链接区分度扫描器（#157, #175）。** 新 lint 通道，标记外向链接大多指向低区分度 hub 的页面（例如每页都链接到 `[[Index]]`）。229 LOC + 15 测试。@DocTpoint 贡献。
- **🏷️ Hub 退役结晶信号（#215, @DocTpoint）。** `core/hub-retirement.ts`（175 LOC + 12 单元测试 + 136 LOC 集成测试）。基于百分位的纯函数判断 + 双重绝对守卫。lint 集成计划在 v1.24.0。
- **🤖 AI-SDK v6 客户端集。** `openai-sdk-client.ts`（455 LOC，推理模型自动路由 Responses API）、`anthropic-sdk-client.ts`（300 LOC，支持 Coding Plan / z.ai / GLM-Antropic baseURL）、`openai-compat-sdk-client.ts`（449 LOC，8 个 OpenAI 格式 baseURL）。`create-llm-client.ts`（151 LOC）提供异步 + 同步 shim + 预加载模式。
- **🌐 自定义 baseURL 统一 URL 回退。** `core/url-fallback.ts`（395 LOC）自动解析用户输入的 baseURL 中缺失的 `/v1`（Kimi Coding Plan、GLM、z.ai）。模块级静态缓存在 `createLLMClient` 重新创建后保留，Ingest / Lint / Query 都受益于首次请求的解析结果。
- **🔁 Token-key 探针重试（KISS，无正则）。** `src/llm-sdk/token-key-probe.ts`（70 LOC）在首次失败时按 baseURL 缓存有效的 `max_tokens` ↔ `max_completion_tokens` 键。触发条件 `if (statusCode === 400 && !cached) → retry`。解决所有 OpenAI 兼容网关 #207 根因。
- **🎬 所有 Provider 实时流式输出。** `result.textStream` 真实逐块流式输出现已在三个 `llm-sdk` 客户端工作。"Restore true streaming for 3rd-party providers" 待办项 **已完成**。chunk 间 macrotask yield 强制每块独立 paint 帧（告别批量到达 UX）。
- **🎉 欢迎笔记（Phase 5.1.5）。** 首次运行三级欢迎笔记（Tier A 空 / Tier B 已存在 / Tier C 升级）。`type: welcome` frontmatter、`createWelcomeNote` 开关、`Recreate Welcome Note` 命令。D8 LLM 动态翻译在写入时按用户 wiki 语言生成 —— 无硬编码 i18n。
- **📥 多选文件摄入（Issue #130）。** 双栏选择器：左侧为带每文件复选框的递归文件夹树，右侧为带状态的实时摄取队列。"加入队列"两步流程、按文件取消、对待处理/运行中作业"全部取消"。复用 `runBatchIngest`，每文件循环、去重和报告 Modal 与文件夹摄入共享。新的 `IngestQueue` pub/sub 存储是会话内摄取生命周期的唯一事实来源。

![多选文件摄入 Modal —— 左侧：带每文件复选框的递归文件夹树；右侧：带状态的实时摄取队列](assets/multi-file-ingest.png)
- **🔑 LM Studio API-key gate（Issue #223）。** `main.ts:962` 现在将 `ollama` 和 `lmstudio` 都排除在 API-key 验证之外。本地 Provider 可无 API key 测试连接。
- **🛡️ GPT-5.x Pro 变体路由（Issue #207 follow-up，v1.22.6 hotfix）。** `gpt-5.1-pro` / `gpt-5.2-pro` / `gpt-5.5-pro` 正确路由到 `/v1/responses` —— 扩展的正则匹配尾部 `-pro` 后缀。
- **🛡️ Auto Ingest 完成路径（Issue #204 follow-up，v1.22.6 hotfix）。** `IngestReport` / `IngestOptions` 上的 `trigger='auto'|'manual'` 字段将自动摄取完成路由到 `onAutoIngestDone`（Notice），而非阻塞的 `IngestReportModal`。
- **📊 knn 基线分析（P2-3 eval acceptance gate）。** @DocTpoint 在同一 `sample-50page` 基准上跑了 knn 基线（bge-m3，无图）：cascade R@5 27.1% vs knn 24.1%（3pp 差距）。cascade 的提升主要是 *语义-超-关键词*，而非 *图-超-语义*。强化 2026-06-22 #175 拒绝 —— embedding 永久拒绝；图信号足以覆盖所有 PPR 用例。
- **🌍 i18n 设置重写（10 语言）。** 全程用户优先语言（「禁用思考」），不再透露实现细节（「3 方言回退链」）。Welcome 笔记 + Ingest Modal UI 每语言新增 14 个键。
- **💖 Sponsor 区。** Ko-fi 按钮 + 💖 支持项目 区，10 个 README 全部同步。

### 🔧 改进

- **📜 Provider 错误主体现可到达 Test Connection UI。** `window.fetch` 重新拉取（5s 超时）将 Provider 诊断（如 "insufficient_quota"）捕获到 Notice。
- **♻️ Lint 性能参数集中。** `src/constants.ts` 集中所有 yield 节奏、批量大小和阈值 —— 单文件调整，无需 4 文件漂移。
- **⏱️ Responses API 路径 429/5xx 指数退避。** 之前只有 Chat Completions 路径有重试；现在两条路径共享同一 `withRetry`。
- **🧹 `thinkingControlCache` 已弃用。** 移除 3 方言探针；AI-SDK 内部处理思考。缓存保留在磁盘上以保持向后兼容（如果 v1.24.0 仍无使用场景将移除）。
- **⚡ 包大小 1.24 MB → 3.17 MB**（用户于 2026-06-29 接受）。Obsidian manifest 无大小限制；AI-SDK 包的 `await import()` 懒加载未减少 bundle（esbuild CJS inline）；未来 ESM bundle / 动态 chunk 可重新审视。

### 🐛 修复

- **GPT-5.x 模型不再因 400 失败 Test Connection**（#207）—— 全面覆盖包括 `-pro` 变体。
- **LM Studio Test Connection 不再要求 API key**（#223）—— 本地 Provider 排除在 API-key gate 之外。
- **#204 Auto Ingest 不再打开阻塞 Modal** —— Notice 路径正确连接。
- **实时流式输出曾是批处理** —— 通过 macrotask yield + 仅消费 `result.textStream`（而非 `fullStream` 后 `textStream`，后者会缓冲所有事件）修复。
- **`generation_complete` 不再盖印到 `log.md` / `index.md` / `schema/`**（v1.22.3）—— `isInWikiContentFolder()` 守卫限制为 `wiki/{entities,concepts,sources}/...`。
- **死链接 stub 虚构类 Bug 已关闭**（#197）—— `fixDeadLink` 不再创建 AI 扩展的 stub 页面。

### 📊 测试

- **1376 个测试通过**，跨 100 个文件（自 v1.22.0 以来 +272）。

强烈建议升级 —— AI-SDK 迁移消除了 Provider 版本回归类别（#137 / #141 / #143 / #147 / #207），图引擎以零 embedding 成本提供 embedding 级别检索质量。如果您使用带自定义 baseURL 的 OpenAI 兼容网关，URL fallback + token-key 探针重试应在无需配置的情况下解决连接问题。

### v1.23.1 — 2026-07-02 (PATCH)

解决了阻止 v1.23.0 社区插件提交的三项 Obsidian 审核机器人发现。无用户可见行为变更。

- **TypeScript 严格模式对齐。** 在 `tsconfig.json` 中加入 `strictBindCallApply: true`，使 `.bind()` 调用推断正确类型 —— 对齐本地开发与 Obsidian 审核环境，移除审核机器人标记为多余的类型断言。
- **删除废弃代码。** 删除已弃用的 `getThinkingControlCacheKey` 函数（v1.23.0 AI-SDK 迁移后无调用者）。关联的 `eslint-disable` 注释一并移除。
- **构建可重现性。** 打 tag 前重新生成 lockfile，确保 CI 构建的 `main.js` 产物与源代码一致，通过 Obsidian 的构建验证。

## ✨ 核心特性

### 📊 知识质量

- **🔍 实体/概念提取** — LLM 从笔记中提取实体（人物、组织、产品、事件等）和概念（理论、方法、术语等），生成独立 Wiki 页面，支持灵活提取粒度（极简~5个、粗略~10、标准~50、精细~100、自定义1–300）平衡分析深度与 API 成本
- **🏷️ 强制页面别名** — 每个生成的页面至少包含 1 个别名（翻译、缩写、变体名），支持跨语言重复检测
- **🔄 重复检测与合并** — 语义分级捕获真正的重复页面（跨语言翻译、缩写、拼写变体）；智能 LLM 融合合并内容并保留别名
- **🧩 智能知识融合** — 多源更新时智能合并新信息不重复；矛盾保留并注明归属；`reviewed: true` 页面受保护不被覆盖
- **📏 内容截断保护** — 8000 max_tokens，自动检测 stop_reason 并以 2× token 重试，覆盖所有 Provider
- **📝 原文引用保留** — 来源提及章节保留原语言引用，可选翻译，确保可追溯性

- **🎨 自定义标签词汇表 (v1.18.0)。** 设置 → Wiki → 标签词汇表模式 → *Custom* 可定义自己的实体类型和概念类型标签列表（例如 `Medical_Arzneimittel`、`法规`）。插件在提取 prompt 和 frontmatter 校验中都会尊重你的词汇表；现有的 Lint 审计 (#85 v7) 会报告任何使用了不在活动词汇表内标签的页面。

![自定义标签词汇表芯片输入](assets/custom-tags.png)

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

### 💬 查询与反馈

- **🤖 对话式查询** — ChatGPT 风格对话框，流式 Markdown 输出，自带 `[[wiki-links]]`，多轮历史
- **🪟 右侧停靠侧边栏 (v1.22.1, PR #196)。** Query Wiki 在 Copilot 风格的右侧 sidebar leaf 中打开（若已存在则复用），不再以居中弹窗出现。`message-circle` ribbon 图标和 `Query Wiki` 命令激活/显示侧边栏，笔记与对话并排可见。所有功能保持不变。
- **📤 查询到 Wiki 反馈** — 将有价值的对话保存到 Wiki，含实体/概念提取，保存前语义去重
- **🔒 重复保存防护** — Hash 跟踪阻止未变化对话的重复评估

### 🌐 LLM 与语言

- **🔌 多 Provider 支持** — Anthropic、Anthropic 兼容（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、MiniMax、LM Studio、OpenRouter、Ollama、自定义接口
- **🔄 5xx 自动重试** — 全部客户端在 HTTP 5xx/429/529 错误时指数退避重试（最多 2 次）
- **📋 动态模型列表** — 从 Provider API 实时获取
- **🌐 Wiki 输出语言** — 9 种语言独立于界面（英/中/日/韩/德/法/西/葡/意），支持自定义输入
- **🌍 全界面国际化** — 插件 UI 支持 9 种语言（英/中/日/韩/德/法/西/葡/意），269+ UI 字段完整翻译，自然本地表达
- **⚡ 速率限制守护** — 并行生成触发限流时自动检测并提示：降低并发度、增大批次延迟、切换 Provider
- **🦙 Web Clipper 高度兼容** — 一键添加官方 Obsidian Web Clipper 的 `Clippings/` 文件夹到监听列表，网页剪藏自动摄入 Wiki

### 🏗️ 架构与性能

- **⚡ 并行页面生成** — 可配置 1–5 并发页面，默认 3（并行），大源文件 2–3× 加速，单页错误隔离
- **📚 迭代批量提取** — 自适应批次大小，消除长文档的 max_tokens 瓶颈
- **🏛️ 三层架构** — `sources/`（只读）→ `wiki/`（LLM 生成）→ `schema/`（共进化配置）
- **🧩 模块化代码库** — 20+ 个聚焦模块，位于 `src/`

### 🔒 隐私与安全

- **无后端、无追踪。** 插件完全在 Obsidian 内部运行——没有外部服务器、没有数据分析、没有任何形式的数据收集。除非你主动配置 LLM 提供商，否则你的笔记永远不会离开你的 vault。
- **数据默认保留在本地。** 插件不会存储、缓存或传输你的内容到你所选 LLM API 之外的任何地方。只有你发送用于摄入或查询的文本会离开你的设备——且仅发往你配置的提供商。
- **通过 Ollama、LM Studio 或本地提供商实现完全本地模式。** 为了完全的数据主权，请使用本地运行的 LLM。你的笔记完全在你的机器上处理——不触碰互联网。
- **最小化权限。** Vault 文件访问用于 Wiki 管理（阅读笔记、生成页面、检测死链）。网络访问仅用于与你所选提供商的 LLM API 通信。剪贴板访问仅限于 Query 模态框中的"复制"按钮——仅在您点击时使用。

---
## ⌨️ 命令列表

| 命令 | 说明 |
|------|------|
| **📥 摄入单个源文件** | 选择单个笔记 → 生成含实体、概念和摘要的 Wiki 页面 |
| **📂 从文件夹摄入** | 选择任意文件夹 → 从现有笔记批量生成 Wiki |
| **📑 多选文件摄入** | 打开双栏选择器 → 通过每文件复选框精确选择笔记 → 批量摄取所选文件（带实时队列 + 按文件取消） |
| **🔍 查询 Wiki** | 对话式问答，流式输出带 `[[wiki-links]]` |
| **🛠️ 维护 Wiki** | 全面健康扫描：重复页、断链、空洞页、孤立页、缺失别名、矛盾 |
| **📋 重新生成索引** | 手动重建 `wiki/index.md` |
| **📊 查看摄入历史（v1.21.0）** | 在可搜索、可筛选的 UI 中浏览历史摄入、Lint 报告和维护运行 |

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

对于本地模型（Ollama）：上下文窗口通常较小（8K–128K），建议使用云端 Provider 做摄入 + 本地模型做查询。

**🔌 Anthropic Compatible (Coding Plan):** 如果你的 Provider 提供 Anthropic 兼容 API 端点，选择 "Anthropic Compatible" 并输入 Provider 的 Base URL 和 API Key。

> 💡 **订阅套餐：** Coding Plan、OpenAI Pro 或 Anthropic Pro 等订阅套餐是使用频繁时控制成本的绝佳选择。本插件支持这些服务。

---

## 🏗️ 架构

基于 Karpathy 的三层分离设计：

```
sources/     # 📄 你的源文档（只读）
  ↓ ingest
wiki/        # 🧠 LLM 生成的 Wiki 页面
  ↓ query / maintain
schema/      # 📋 Wiki 结构配置（命名规范、页面模板、分类规则）
```

**代码结构** (`src/`)：

```
main.ts              # 🔌 插件入口
wiki/                # Wiki 引擎模块
  wiki-engine.ts     # 🎯 编排器
  query-engine.ts    # 💬 对话查询
  source-analyzer.ts # 📊 迭代批量提取
  page-factory.ts    # 🏗️ 实体/概念 CRUD + 合并
  conversation-ingest.ts # 📥 对话 → Wiki 知识
  contradictions.ts  # ⚠️ 矛盾检测
  system-prompts.ts  # 🗣️ 语言指令 + 章节标签
  lint/              # Lint 子模块
    controller.ts        # 🔍 Lint 编排
    fix-runners.ts       # ⚡ 批量修复执行
    scanners.ts          # 🔍 扫描器（死链/孤立/别名/引用核对）
    duplicate-detection.ts # 🔄 程序化候选生成
    report-builder.ts    # 📋 纯函数报告生成
    phases/              # 分阶段 Lint 执行
  prompts/           # 按域分类的 LLM 提示词模板
schema/              # Schema 共进化
  manager.ts         # 📋 Schema CRUD + 建议
  auto-maintain.ts   # 🔄 文件监听 + 定时 Lint + 启动快速修复
  analyze.ts         # 📊 可取消的 Schema 分析
ui/                  # 用户界面
  settings.ts        # ⚙️ 设置面板
  modals.ts          # 📦 Lint / Ingest / Query / History 弹窗
core/                # 🧩 纯函数模块（零 IO，可独立测试）
  i18n, slug, json, frontmatter, tag-vocab, sources-normalizer, ...
+ 共享: llm-client.ts, llm-client-wrapper.ts, texts.ts, prompts.ts, types.ts
```

**生成的页面结构：**
- `wiki/sources/文件名.md` — 📄 源文件摘要
- `wiki/entities/实体名.md` — 👤 实体页（人物、组织、项目等）
- `wiki/concepts/概念名.md` — 💡 概念页（理论、方法、术语等）
- `wiki/index.md` — 📑 自动生成的索引
- `wiki/log.md` — 📝 操作日志

---

## ❓ 常见问题 (FAQ)

> **请保持插件更新。** 本项目迭代频繁，新功能和修复每隔几天就会推送。在 Obsidian 中定期前往 **设置 → 第三方插件 → 检查更新** 以获取最新版。
>
> 更多问题请参阅 [GitHub FAQ Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28)。

### 💡 通用

**这个插件到底能做什么？**
你放入笔记，它提取人物、概念和理论，生成互联的 Wiki 页面，带 `[[双向链接]]`。你可以提问，从*你的*笔记中获取答案——而不是互联网的幻觉。

**最低要求？**
Obsidian v1.11.0+，桌面端（Windows/macOS/Linux），LLM Provider API Key。Ollama 本地运行无需 API Key。参见上方 [配置 LLM Provider](#🔑-配置-llm-provider)。

**该选哪个模型？**
参见上方的 [模型选择建议](#-模型选择建议)。推荐长上下文模型——Wiki 越大，LLM 需要更多上下文。

### 🏷️ 别名与重复

**为什么 Lint 显示大量页面"缺失别名"？**
v1.7.11 之前生成的页面不包含别名。这很正常——别名是增强功能，不是缺陷。在 Lint 报告中点击 **Complete Aliases**，LLM 会批量生成翻译、缩写和变体名。有了别名后，重复检测和别名搜索效果显著提升。

**为什么会出现重复页面（如"CoT"和"思维链"）？**
v1.7.10 之前没有别名感知的重复检测。运行 **Lint Wiki** → **Merge Duplicates** 合并。合并后的页面保留双方别名，防止未来再出现。

**重复检测如何工作？（v1.7.10+）**
两层语义检测：第一层（LLM 始终验证）捕获跨语言匹配、缩写、高相似标题。第二层填充剩余预算，匹配中等相似度候选。别名对第一层至关重要——如果页面是 v1.7.11 之前生成的，请运行 **Complete Aliases**。

**什么是"污染页面"？（v1.9.0）**
文件夹前缀被意外编入文件名的页面，如 `concepts/concepts布局优化.md`。运行 **Lint Wiki** → **🧹 Fix Polluted Pages** 即可重命名并更新所有入链。

### ⚡ 性能与成本

**如何加速摄入？**
在 **设置 → LLM 配置** 中：增加**页面生成并发度**到 3–5（并行创建页面），降低**批次延迟**到 100–300ms（注意限流风险）。选择"极简"、"粗略"或"标准"的**提取粒度**可减少产出的页面数量并节省 API 成本。

**为什么遇到 HTTP 429 错误？**
插件会自动检测限流模式并建议：降低并发度到 1–2，增大批次延迟到 500–800ms，或切换到更高限额的 Provider。

**如何控制 API 成本？**
- 自动维护默认关闭（仅在需要后台处理时启用）
- 智能批量跳过自动跳过已摄入文件
- "标准"或"粗略"粒度 = 更少 LLM 调用
- 批次延迟 > 500ms 仅间隔调用，不增加 token 消耗
- Lint 报告在运行修复前显示计数，让你判断是否值得

### 🧹 维护

**Smart Fix All 做什么？**
按因果关系顺序运行修复（v1.9.0+）：
1. 🧹 修复污染页面 → 2. 🏷️ 补全别名 → 3. 🔄 合并重复 → 4. 🔗 修复断链 → 5. 🔗 链接孤立页 → 6. 📝 扩充空洞页

**Lint 在大 Wiki 上卡死？**
升级到 v1.7.17+——Lint 现在每 50 页让出给 Obsidian UI 线程，即使在 1200+ 页的 Wiki 上也不会多秒卡死。

### 🔍 故障排查

**安装后为什么不能使用摄入/维护/查询功能？**
插件要求通过连接测试后才能使用核心功能。前往 **设置 → Karpathy LLM Wiki** → 选择提供商 → 填入 API Key → 点击 **Fetch Models** → 选择模型 → 点击 **Test Connection**。看到绿色 "LLM 已就绪" 指示后即可正常使用。这是为了防止配置错误导致的静默失败。

**如何取消正在运行的摄入或 Lint？**
摄入运行时点击状态栏的 "提取中... 点击取消" 文字，或使用 `Ctrl+P` → "取消当前提取"。操作会在当前批次完成后安全停止，保留所有已完成的工作。

**如何快速摄入当前正在编辑的文件？**
点击左侧边栏的 `sticker` 图标，或使用 `Ctrl+P` → "摄入当前文件"，无需文件选择器，直接摄入当前活动编辑器中的文件。

**log.md 中出现 `[[[[entities/Foo|Foo]]]]` 双重括号怎么办？**
运行一次 **维护 Wiki (Lint Wiki)** 即可——扫描器会自动检测并修复整个 wiki 目录（包括 log.md）中的所有双重嵌套 wiki 链接，零 LLM 成本，无需手动清理。

**为什么会出现 "Overloaded" 错误？**
插件现在能识别 Anthropic 的 529 过载错误为可重试。过载错误会自动以指数退避重试，适用于所有提供商。

**为什么 entities/ 和 concepts/ 中会出现重复的 stub 页面？**
插件现在使用 slug 匹配机制——同名的不同格式（如空格 vs 连字符）能正确匹配到已有页面，而非创建重复的 stub。

**Query 找不到我明知存在的页面？**
三个常见原因：（1）索引过期 → **重新生成索引**。（2）缺少别名 → **Complete Aliases**。（3）换个说法——LLM 做语义匹配，不是关键词搜索。

**可以手动编辑 Wiki 页面吗？**
可以。在 frontmatter 中设置 `reviewed: true` 可保护页面不被覆盖。手动添加的别名、标签和来源在合并时保留。

**如何安全升级？**
插件不会修改你的源文件。备份 `wiki/` → 更新插件 → **重新生成索引** → **Lint Wiki** → 选择性修复。

**升级到 v1.20.3 后我的 `sources/` 文件被重命名了，是出问题了吗？（v1.20.3+）**
没有 — 这是新的防冲突源页面 slug 指纹机制生效。每个 `sources/<slug>.md` 现在变为 `sources/<基名>_<6位hex>.md`（hex 是文件完整路径的 FNV-1a 哈希）。跨文件夹同名文件（如 11 份 Academy 课程的 `About this course.md`）不再冲突。重新摄入会原地重命名已有的 `sources/` 页面，所有 `[[sources/<slug>]]` 反向链接会自动更新。如果你有外部脚本或书签指向 `sources/<旧slug>.md`，请更新为新的带指纹路径。

**摄入不相关的源时，会覆盖我用 `reviewed: true` 锁定的页面吗？（v1.20.3+）**
不会 — Stage 4（`updateRelatedPage`）现在也尊重 `reviewed: true`，路由到 append-only 路径，与摄入路径一致。你审过的 body 原样保留；只有真正的新内容才会追加。

**我的本地模型（Ollama、LM Studio）在空白或仅含 frontmatter 的笔记上编造奇怪的实体名。（v1.21.0）**
v1.21.0 的摄入前置检查已修复：空白/纯空白/仅含 frontmatter 的笔记会在任何 LLM 调用之前被直接拒绝，内容哈希去重还会识别跨路径的相同文件。升级到 v1.21.0+ 即可彻底消除"空文件幻觉"这类 bug（小模型在收到空白 prompt 时编造实体名）。

**如何获得帮助？**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — 提交 Bug
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 提问与反馈

**如何收集调试日志以排查问题？**

1. 打开开发者工具（`Ctrl+Shift+I` / `Cmd+Option+I`）
2. 切换到 **Console** 选项卡
3. 运行你的操作（摄入、查询或 Lint）
4. 查找带有模块名前缀的消息，例如 `[Step]`、`[LLM]`、模块名等
5. 本地测试时，使用 `pnpm build:dev` 替代 `pnpm build` 以保留完整调试输出
6. 复制相关日志行并附在你的 GitHub Issue 中 — 这能极大加快 bug 定位

---

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

赞助完全自愿。无论是否赞助，插件始终保持 MIT 许可且功能完整。

### 赞助者

感谢以下支持项目的人：

- [@jameses-cyber](https://github.com/jameses-cyber)

## 📜 许可证

MIT License — 详见 [LICENSE](LICENSE)。

## 🙏 致谢

- **💡 概念来源：** [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 本插件的原始构想
- **🛠️ 开发平台：** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM 传输层：** [Vercel AI SDK v6](https://ai-sdk.dev/)（`@ai-sdk/openai`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`）via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)
