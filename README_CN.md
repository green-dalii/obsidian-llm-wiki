![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki — Obsidian 插件

> 基于 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 实现的知识库生成系统，自动从笔记中提取实体与概念，构建互联的 Wiki 页面。

**作者:** Greener-Dalii | **版本:** 1.7.11

[English](README.md) | [中文文档](README_CN.md) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## 什么是 LLM-Wiki？

你写笔记，AI 来整理，你开口问。就这么简单。

**痛点。** 你的笔记是个金矿——人物、概念、观点、关联。但现在它们只是文件夹里的一堆文档。找到谁跟谁有关，只能靠搜索、打标签，以及祈祷自己还记得那条线索。

**思路。** [Andrej Karpathy 提出了](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)一个优雅的方案：把笔记当原材料，让 LLM 来做架构师。它读你写的东西，提取实体和概念，编织成一个结构化的 Wiki——带 `[[双向链接]]`、自动索引，还能用自然语言对你的知识库提问。

**你不再是图书管理员。** 不用纠结该给谁建页面，不用手工维护交叉链接，不用担心信息过时。笔记丢进 `sources/`，LLM 自动阅读、提取、撰写、链接，甚至标记矛盾——你只管继续写。

**也不是另一个聊天机器人。** ChatGPT 了解互联网，LLM-Wiki 了解*你*——准确说，是你教给它的东西。每个回答都带着 `[[wiki-links]]` 回到你的知识图谱。每条回复都是一条探索路径的起点，而不是终点。

---

## 为什么选择 Obsidian + LLM-Wiki？

Obsidian 是链接思考的利器。但有个问题：连线的那个人一直是你自己。

LLM-Wiki 把这个关系翻转了。不是你手工构建图谱，而是 AI 随着你的笔记一起成长。你写一篇新笔记——它帮你找出你可能会错过的关联。你提一个问题——它在你自己的知识图谱里穿行，带着引用回来见你。

- **你的图谱视图活起来了。** 新笔记不再静静躺在文件夹里——它们自动生长出指向实体、概念和来源的链接。图谱有机生长，插件持续维护：检测重复、修复断链、用别名桥接不同语言。
- **你的笔记学会了对话。** 搜索变成了聊天。"我之前写过什么关于 X 的内容？"变成了对话，流式回答带着 `[[wiki-links]]` 作为路标。每个回答都是深入你自己知识的一条路径。
- **Obsidian 成为你的思考伙伴。** 它不再只是装笔记的柜子，而是帮你*思考*的东西——浮现隐藏的关联、标记矛盾、记起你忘了自己知道的事。

---

## 快速开始

### 安装

**推荐 — Obsidian 社区插件市场：**

1. 在 Obsidian 中打开 **设置 → 第三方插件**
2. 点击 **浏览**，搜索 "Karpathy LLM Wiki"
3. 点击 **安装**，然后 **启用**

**或从社区插件网站安装 —** 访问 [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki)，点击 **Add to Obsidian** 即可直接安装。

**手动安装（备用）：**

1. 从 [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 在 Obsidian 中打开 设置 → 第三方插件，在 **已安装插件** 标签页点击文件夹图标，打开插件目录
3. 新建一个 `karpathywiki` 文件夹，将三个文件放入其中
4. 回到 Obsidian，点击刷新图标 — **Karpathy LLM Wiki** 会出现在已安装插件列表中
5. 打开开关启用

**开发构建：** `git clone` 后执行 `pnpm install` 和 `pnpm build`。

### 配置 LLM Provider

1. 打开 设置 → Karpathy LLM Wiki
2. 从下拉菜单选择 Provider（Anthropic、Anthropic 兼容、Google Gemini、OpenAI、DeepSeek、Kimi、GLM、Ollama、OpenRouter 或自定义）
3. 填入 API Key（Ollama 不需要）
4. 点击 **获取模型列表** 填充模型下拉框，或手动输入模型名
5. 点击 **测试连接**，然后 **保存设置**

**Ollama 本地模型（无需 API Key）：** 安装 [Ollama](https://ollama.com)，拉取模型（如 `ollama pull qwen3.5:latest`），在 Provider 下拉选择 "Ollama (本地)"。

**Anthropic 兼容（Coding Plan）：** 如果你的服务商提供 Anthropic 兼容的 API 端点（常见于 Coding Plan 订阅），选择 "Anthropic 兼容"，填入服务商提供的 Base URL 和 API Key。

### 使用方式

| 方式 | 操作 |
|------|------|
| **从 sources/ 摄入** | `Cmd+P` → "Ingest Sources"，处理整个 `sources/` 文件夹 |
| **从任意文件夹摄入** | `Cmd+P` → "Ingest from Folder"，选择文件夹从现有笔记生成 Wiki |
| **对话查询** | `Cmd+P` → "Query Wiki"，提问并获取流式回答，回答中自带 `[[wiki-links]]` |
| **Lint 维护** | `Cmd+P` → "Lint Wiki"，健康扫描含重复检测、断链、孤立页面 |

重复摄入同一源文件时，实体/概念页以增量方式合并新信息，摘要页会重新生成。

**批量智能跳过：** 文件夹摄入时，插件自动检测已处理文件并跳过，节省时间和 API 成本。批量报告显示跳过计数。

**摄入加速：** 对于包含大量实体（20+）的源文件，可在设置 → 摄入加速中启用并行页面生成：
- **页面生成并发度**：1（串行，最安全）到 5（并行，最快）。大多数 Provider 建议从 3 开始
- **批次延迟**：并行批次间的延迟，100–2000ms。如遇限流请增大

> **安全说明**：并行生成使用 `Promise.allSettled` —— 如某页失败，其他页面继续生成。失败页面会自动单独重试并指数退避。

---

## 核心特性

### 知识质量

- **实体/概念提取** — LLM 从笔记中提取实体（人物、组织、产品、事件等）和概念（理论、方法、术语等），生成独立 Wiki 页面
- **强制页面别名** — 每个生成的页面至少包含 1 个别名（翻译、缩写、变体名），支持跨语言重复检测
- **重复检测与合并** — 语义分级捕获真正的重复页面（跨语言翻译、缩写、拼写变体）；智能 LLM 融合合并内容并保留别名
- **智能知识融合** — 多源更新时智能合并新信息不重复；矛盾保留并注明归属；`reviewed: true` 页面受保护不被覆盖
- **内容截断保护** — 8000 max_tokens，自动检测 stop_reason 并以 2× token 重试，覆盖所有 Provider
- **原文引用保留** — 来源提及章节保留原语言引用，可选翻译，确保可追溯性

### 维护能力

- **Lint 健康扫描** — 一次全面报告检测：重复页面、断链、空洞页面、孤立页面、缺失别名、矛盾
- **语义分级重复检测** — Tier 1（直接名称匹配：跨语言、缩写、高相似度标题）全部验证；Tier 2（间接信号：共享链接、中等相似度）按 token 预算填充
- **一键智能修复** — 按因果关系顺序批量修复：合并重复 → 修复断链 → 链接孤立页 → 扩充空洞页
- **别名补全** — 一键并行批量生成缺失别名，提升后续重复检测准确率
- **自动维护** — 多文件夹监听、定时 Lint、启动健康检查（均可选）
- **矛盾状态机** — `检测 → 审核通过 → 已解决`（AI 修复）或 `检测 → 待修复`（手动）

### 查询与反馈

- **对话式查询** — ChatGPT 风格对话框，流式 Markdown 输出，自带 `[[wiki-links]]`，多轮历史
- **查询到 Wiki 反馈** — 将有价值的对话保存到 Wiki，含实体/概念提取，保存前语义去重
- **重复保存防护** — Hash 跟踪阻止未变化对话的重复评估

### LLM 与语言

- **多 Provider 支持** — Anthropic、Anthropic 兼容（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、OpenRouter、Ollama、自定义接口
- **5xx 自动重试** — 全部客户端在 HTTP 5xx/429 错误时指数退避重试（最多 2 次）
- **动态模型列表** — 从 Provider API 实时获取
- **Wiki 输出语言** — 8 种语言独立于界面（英/中/日/韩/德/法/西/葡），支持自定义输入
- **国际化** — 中英文界面切换（默认英文），所有提示遵循语言设置

### 架构与性能

- **并行页面生成** — 可配置 1–5 并发页面，大源文件 3× 加速，单页错误隔离
- **迭代批量提取** — 自适应批次大小，消除长文档的 max_tokens 瓶颈
- **三层架构** — `sources/`（只读）→ `wiki/`（LLM 生成）→ `schema/`（共进化配置）
- **模块化代码库** — 13 个聚焦模块，位于 `src/`

---

## 命令列表

| 命令 | 说明 |
|------|------|
| **Ingest single source** | 选择单个笔记 → 生成含实体、概念和摘要的 Wiki 页面 |
| **Ingest from folder** | 选择任意文件夹 → 从现有笔记批量生成 Wiki |
| **Query wiki** | 对话式问答，流式输出带 `[[wiki-links]]` |
| **Lint wiki** | 全面健康扫描：重复页、断链、空洞页、孤立页、缺失别名、矛盾 |
| **Regenerate index** | 手动重建 `wiki/index.md` |
| **Suggest schema updates** | LLM 分析 Wiki 并建议 Schema 改进 |

---

## 使用示例

**输入：** `sources/machine-learning.md`

```markdown
# Machine Learning
Machine learning uses algorithms to learn from data.

## Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**输出 — 实体页：** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2026-05-15
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["监督学习", "Supervised Learning"]
---

# Supervised Learning

## 基本信息
- 类型：method
- 来源：[[sources/machine-learning]]

## 描述
监督学习是一种机器学习范式，模型从带标签的训练数据中学习，
从而对未见数据做出预测……

## 相关概念
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

## 相关实体
- [[entities/Arthur-Samuel|Arthur Samuel]]

## 来源提及
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 模型选择建议

本插件遵循 Karpathy 的核心理念：**将完整 Wiki 上下文直接喂给 LLM，而非切成碎片做 RAG 检索**。强烈推荐选择长上下文窗口的模型——Wiki 越大，LLM 越需要足够的上下文来保持跨页面一致性。

> 为什么不使用 RAG？Karpathy 在[原始构想](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)中指出，RAG 将知识碎片化，破坏了 LLM 在完整知识图谱上的推理能力。

**重点推荐：**

| 模型 | 上下文窗口 | 推荐理由 |
|------|-----------|----------|
| **DeepSeek V4** | 1M tokens | 首选推荐 — 极低价格，中文能力出色 |
| **Gemini 3.1 Pro** | 1M+ tokens | 最大上下文窗口，推理能力强 |
| **Claude Opus 4.7** | 1M tokens | 最强智能体编程和推理能力 |
| **GPT-5.5** | 1M tokens | OpenAI 最新旗舰，AI 智能指数榜首 |
| **Claude Sonnet 4.6** | 1M tokens | 速度、成本与质量的良好平衡 |

对于本地模型（Ollama）：上下文窗口通常较小（8K–128K），建议使用云端 Provider 做摄入 + 本地模型做查询。

---

## 架构

基于 Karpathy 的三层分离设计：

```
sources/     # 你的源文档（只读）
  ↓ ingest
wiki/        # LLM 生成的 Wiki 页面
  ↓ query / maintain
schema/      # Wiki 结构配置（命名规范、页面模板、分类规则）
```

**代码结构** (`src/`)：

```
wiki/               # Wiki 引擎模块
  wiki-engine.ts    # 编排器
  query-engine.ts   # 对话查询
  source-analyzer.ts # 迭代批量提取
  page-factory.ts   # 实体/概念 CRUD + 合并
  lint-controller.ts # Lint 编排
  lint-fixes.ts     # 修复逻辑 + 重复候选生成
  contradictions.ts # 矛盾检测
  system-prompts.ts # 语言指令 + 章节标签
schema/             # Schema 共进化
  schema-manager.ts # Schema CRUD + 建议
  auto-maintain.ts  # 文件监听 + 定时 Lint
ui/                 # 用户界面
  settings.ts       # 设置面板
  modals.ts         # Lint/Ingest/Query 弹窗
+ 共享模块: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**生成的页面结构：**
- `wiki/sources/文件名.md` — 源文件摘要
- `wiki/entities/实体名.md` — 实体页（人物、组织、项目等）
- `wiki/concepts/概念名.md` — 概念页（理论、方法、术语等）
- `wiki/index.md` — 自动生成的索引
- `wiki/log.md` — 操作日志

---

## 许可证

MIT License — 详见 [LICENSE](LICENSE)。

## 致谢

- **概念来源：** [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 本插件的原始构想
- **开发平台：** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDK：** Anthropic SDK、OpenAI SDK
